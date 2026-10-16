# Owner-row dispatch: minimum-change review (v3)

This read-only review supersedes neither `owner-row-dispatch-plan.md` nor `owner-row-dispatch-plan-v2.md`; both remain unchanged. It narrows the next implementation choice and recommends reusing the existing Root queue rather than adding `PendingRootWork`, Root row tickets, or a second ordering structure.

## Current path

- `OwnerStateWorld.#dispatchState` owns the committed cell, checks functional-updater liveness after user code, updates cell/lane/source/version, marks `WorldDirtyJournal`, then notifies the captured dirty-listener array and public change-listener cut.
- Each `ComponentStateRoot` has one `PendingStateChanges`. Its `PendingKey` is already the Root's ordered owner/site slot, and `setCell` coalesces by identity, retains the maximum version, and does not move a queued key. This is the existing per-Root first-dirty order, including nested/grafted Roots.
- The native row path captures handles/versions from that queue, resolves each cell through `numericRowForCell`, assembles row/slot/value buffers, executes VDOM, then acknowledges the same cut with `World.clearCellChangesThrough` and `PendingStateChanges.clearNativeThrough`.
- The World and Root queues have different jobs. World preserves shared public dirty owner/site membership; `PendingStateChanges` preserves one Root's independent scheduler cut. Neither queue should be replaced by a new root-row queue in this increment.

## Recommended smallest patch

Reuse the existing `PendingStateChanges` linked nodes as cut handles. Make only two hot-path changes:

1. Extend native capture to optionally write the `PendingKey` reference for each existing handle/version in the same ordered queue walk. The output array is a reusable scratch buffer owned by the Root; it is not a second queue. Keep the current `captureNative` behavior and fallback rules intact.
2. Add an exact native acknowledgment method that consumes those captured key references and checks the live key fields directly. It verifies `alive`, `queued`, owner/site, captured handle identity, and `cellVersion <= capturedVersion` before unlinking. It avoids looking the key up again through `#keysByIdentity` / `#keyForOwnerSite` for every captured cell. If a key was dropped, replaced with a new identity, or advanced during reentry, skip it exactly as the existing method does.

Illustrative internal API:

```ts
captureNativeWithKeys(
  handles: (StateCellHandle | undefined)[],
  versions: number[],
  keys: (PendingCellKey | undefined)[],
): number | null;

clearNativeThroughKeys(
  keys: readonly (PendingCellKey | undefined)[],
  handles: readonly (StateCellHandle | undefined)[],
  versions: readonly number[],
  count: number,
): void;
```

`PendingCellKey` is an internal opaque reference to the existing node, not a public mutable key shape. `captureNativeWithKeys` must retain the current all-native/capacity behavior and scrub every partially written output prefix on fallback. `clearNativeThroughKeys` must reject absent, dead, unqueued, wrong owner/site, or changed-identity nodes and must preserve newer versions. `clearNativeThrough` remains available with its current semantics for other callers.

The direct-key ack uses captured handle identity as a generation guard. A node can be reused for a later cell at the same owner/site; comparing `key.cellIdentity` and `key.cellHandle?.cellIdentity` to the captured handle prevents an old cut from clearing the new incarnation. `dropOwner` marks existing keys dead, so a captured node reference becomes inert. Reentrant writes update the same node's version using the current max rule; the captured older version cannot unlink it.

### Root changes

Add one reusable `PendingCellKey[]` scratch buffer alongside the existing handle/version buffers. Have `#tryFlushNativeCellCut` call `captureNativeWithKeys`; after the World ack call succeeds, call `clearNativeThroughKeys` with the same captured key/handle/version arrays. Keep `PendingStateChanges.size`, `capture`, `captureNative`, `clearThrough`, `clearNativeThrough`, and `dropOwner` as the Root's one source of pending truth.

This patch removes one per-cell identity-map resolution from Root acknowledgement without changing queue shape, dirty notification count, owner/layout lifetime, or World liveness validation. It does not remove the World exact-cell/version check: `clearCellChangesThrough` still needs to prove the captured handle identifies the same live cell and that the cell did not advance past the cut.

## Bound the World row validation separately

Keep `numericRowForCell(handle, version)` as the authority for row eligibility in this cut. It resolves the revocable committed-cell capability and checks exact version, row identity/generation, source, lane, layout and current row lease. A row/column address by itself is insufficient. Removing these checks or caching an unchecked lane/view would make owner replacement and physical row reuse unsafe.

There is one narrowly removable repeat: `#tryCommitNativeRows` resolves every handle once to create the cut, then resolves every handle again if `executePreparedNumericRows` declines and Root rebuilds the row tokens. The VDOM implementation returns `null` from validation paths before mirroring sources, projecting, or writing hosts; its later cancellation path returns `false`, not `null`. If that contract remains explicit and tested, Root can reuse the already captured row views after a `null` decline and reprepare VDOM tokens without a second World resolution loop. Keep the normal initial exact World validation and post-publication World acknowledgment unchanged. If VDOM can execute user code before returning `null`, or if a decline may occur after World mutation, do not remove the retry validation.

This is a conditional, small follow-up. It only affects declined/stale VDOM retries; it does not reduce the common successful cut's `numericRowForCell` call count. The direct-key acknowledgment change is the broader per-cell lookup reduction.

## Why not add row metadata to every pending key yet

Adding `numericRowView` or a prepared cell ticket to `PendingKey` would avoid fetching the cached row view from World at flush, but the exact version/liveness/lease proof still has to run. A ticket that skips that proof needs revocation on destruction, promotion, layout replacement and row reuse; it also has to be Root-specific for grafted roots. The extra field could retain a row view/source through a stale pending entry. That adds lifecycle work without removing the required per-cell captured-version check.

First apply the direct captured-key acknowledgment and, only if its contract is accepted, the stale-retry revalidation removal. Revisit a prepared row-view field only if a later profile isolates the initial `numericRowForCell` phase as material and a token design can avoid a second lookup without adding unchecked validity assumptions.

## Compatibility and maintenance tradeoff

| Concern | Why the existing node design preserves it |
|---|---|
| Listener ordering and snapshot membership | No World listener changes. Root still uses the current subscriber at the same ordinal; the cut's membership and invocation order do not change. |
| Nested writes | `setCell` remains the only update path and already keeps `max(existingVersion, notifiedVersion)`. The outer older callback cannot regress a nested newer version. |
| Mixed generic/native work | The same queue remains authoritative. Legacy entries still make native capture decline and generic `capture()` retains original queue order. No merge step or row-vs-generic ordinal is added. |
| Numeric promotion | Existing `setCell`/legacy conversion and key linkage remain in place. If a row was captured before promotion, World exact version/liveness validation or VDOM decline rejects stale row execution; fallback uses the same pending node. |
| Prepared candidates | Candidate-private setters do not notify this Root queue. Existing candidate capture/rollback/commit paths continue using the same pending queue and versions. |
| Multiple/grafted Roots | Each Root owns a separate `PendingStateChanges` and key nodes. Captured node references are scoped to that Root's queue; ack by one Root cannot unlink another Root's key. |
| Public World behavior | The shared `WorldDirtyJournal`, `subscribeDirtyCells`, `subscribeChanges`, `clearChangesThrough`, and owner/site enumeration are untouched. |
| Failure and cleanup | Existing `finally` buffer scrubbing remains. Add key-prefix scrubbing to every native capture fallback and clear key references on queue removal/owner drop/clear. |

## Added state and work

- Persistent state: none beyond each `PendingKey`'s existing fields. The captured key reference is the existing node itself.
- Root scratch state: one reusable array of key references, grown with the existing handle/version buffers and scrubbed after every cut.
- Queue passes: no extra queue traversal; keys are emitted during the current native capture pass and read during the existing Root ack pass.
- Work removed: one `WeakMap`/owner-site fallback resolution per native Root key in `clearNativeThrough`; conditionally, one duplicate World cell/row validation per key only on a declined VDOM retry.
- Work deliberately retained: the World exact handle/version/liveness check after host publication, the initial exact `numericRowForCell` check, all public per-write notifications, all World dirty journal marks, and max-version checks. Those checks protect reentry, owner destruction and row reuse.

No per-write notifications, public callbacks, cell fields, Root registrations, per-owner Root maps, extra queue nodes, or persistent row capabilities are introduced. This is a narrower maintenance surface than v2's `PendingRootWork` plus World root-slot ticket model.

## Exact source seams

1. `src/pending_state_changes.ts`: add the optional key-reference output to a native capture method (or a new internal sibling); add direct key-reference acknowledgment; scrub key refs in capture fallback, `clear`, `dropOwner`, and `#removePending`.
2. `src/component_state_runtime.ts`: allocate/reuse/scrub `PendingCellKey[]`; use it in the native row/lane cut acknowledgment. If and only if the VDOM `null` contract is verified, remove only the second World validation loop on row-program decline and reuse the captured row views.
3. `src/owner_state_world.ts`: no required semantic change for direct-key ack. Keep `clearCellChangesThrough` authoritative. No new row subscription, cell registration, ticket class, or side queue.

## Finite correctness matrix

| Case | Required result |
|---|---|
| Native capture capacity failure after a prefix | Handles, versions and key refs written in the prefix are all scrubbed; queue order and contents are unchanged. |
| Legacy entry in native queue | Native capture returns null and scrubs all output prefixes; generic capture order and values remain unchanged. |
| Nested setter during an outer dirty notification | Queue node retains the max version; an older captured cut cannot remove the newer node. |
| Cell key reused at same owner/site with new identity | Old captured key plus old handle identity cannot remove the new key contents. |
| `dropOwner` during a captured cut | Key is marked dead/unqueued; direct ack becomes a no-op. |
| Reentrant write during host publication | World ack sees newer cell version and preserves World dirty membership; direct PendingKey ack sees newer key version and preserves Root work. |
| Two Roots queue the same cell | Each captured key belongs to its own queue and is independently cleared. |
| Numeric promotion / unsupported row | Initial World validation or row executor declines; existing generic fallback sees the same ordered key, no work is deleted. |
| Stale VDOM token returning `null` | Rebuild from the same captured row views only if all `null` returns are pre-mutation; never recapture values or versions. |
| Host failure or Root disposal | Existing terminal error/disposal handling stays; buffers including key refs are cleared in `finally`. |
| Candidate prepare, rollback, publish | No change to candidate isolation or captured Root queue semantics; only the committed successful path uses native key capture. |
| Row destruction/reuse between dispatch and flush | Initial `numericRowForCell` rejects stale identity/generation; no unchecked cached row metadata is used. |

## Gate before implementation

This is a patch proposal, not authorization to relax checks. Before applying the optional stale-retry simplification, add or point to a test that proves every `executePreparedNumericRows` `null` path returns before source mutation, projectors, host writes, or World mutation. If that proof cannot be made, retain the second validation loop. The captured-key acknowledgment can be reviewed and implemented independently because it preserves the current World validation and Root max-version check.

Any subsequent performance statement requires a new matched study. This proposal is expected to reduce one Root queue lookup per captured native cell and, conditionally, one duplicate validation in a declined row retry; savings are unmeasured and could be small relative to the whole-page profile.
