# Root-local compiled owner-row dispatch plan

## Scope and evidence

This is a design proposal only. It does not change runtime behavior and makes no speed claim.

The CPU attribution used here is the verified archive `implementation/2026-10-13-compiled-owner-row-cpu/evidence.tar.gz`, SHA-256 `3b8801d3d95bc21b314151ada7360375abf0860c5a367d8f4f4c6542e61ba59c`. Its status says two pages, 480 measured harness frames, 1,116 verified input locks, and whole-page sampled self time from navigation through disposal. The separate timing gate remains `FAIL`. The reported locations include Root row capture/publication 62.041 ms, World dispatch 24.801 ms, `PendingStateChanges.setCell` 19.616 ms, setter forwarding 17.969 ms, World acknowledgement 15.082 ms, and Root acknowledgement 13.232 ms. These are whole-page sampled locations, not per-update costs; they neither establish causality nor predict savings. VDOM loop fusion is being handled separately and should not be combined with this change.

## Current path and repeated work

1. A committed setter runs `OwnerStateWorld.#dispatchState`. Functional updaters are evaluated first, then the exact owner/site/cell is checked again so an updater that destroys its owner cannot dirty or recreate a dead cell. The dispatch mutates the cell, increments its version, updates numeric source/lane state, and marks the shared `WorldDirtyJournal` through the cell's prepared membership.
2. The World emits the existing dirty-cell notification for every accepted write. Each Root filters it with `isWithin`, then `PendingStateChanges.setCell` performs identity/owner/site lookup and updates that Root's ordered per-cell queue. Every Root needs independent pending work: roots can cover nested or grafted owner subtrees in the same World.
3. At flush, store notifications, collection work, resource retries, and structural candidates are checked before the numeric-only cut. `captureNative` copies each queued handle and captured version to reusable Root buffers. Compiler owner-row execution then calls `numericRowForCell(handle, version)` for each entry, gathers the row/slot/value arrays, executes prepared row programs, and on success calls `clearCellChangesThrough` and `clearNativeThrough` over the same per-cell cut.
4. The World journal remains observable through its generic owner/site APIs. The Root queue supplies a separate, Root-scoped scheduling and exact-cut record. Replacing either with a process-global or World-global row queue would merge independent Root work and could let one Root hide another's pending commit.

The compiled layout already supplies `programId` and dense slot numbers. A committed numeric row lease has an opaque row identity, generation, columns and source slots. A native setter already has the concrete `StateCell` in hand. This gives a bounded opportunity to aggregate Root scheduling and cut data at committed owner-row slots, without changing generic state APIs or treating a reused physical row as the same logical owner.

## Proposed next increment

Add an internal, Root-scoped dirty-row registration and cut protocol for cells that have a published compiler layout, a live numeric row lease, and a current numeric source. Leave all other cells on the current `subscribeDirtyCells` plus `PendingStateChanges` path. Keep the public dirty-cell and public change listener calls and the shared `WorldDirtyJournal` semantics unchanged.

### Ownership and storage

- A committed Root owns an ordered `PendingOwnerRows` queue. Its entries are keyed by opaque row-lease identity and carry the owning `programId`, owner, lease generation, and slot registrations. Each dirty slot has a captured-version field and a queue link/order ordinal. The row groups cells for execution; the slot links preserve the existing clean-to-dirty insertion order across different rows.
- The World keeps an internal registration per `(Root, committed cell)` only while that Root is active for the cell. The registration binds the exact committed cell identity, owner/site, compiled slot, row identity and generation, and the Root's slot ticket. It stores no user callback closure per write; at most it points to the Root-owned row record and a single scheduling endpoint. Multiple Roots get distinct registrations for the same cell.
- Each committed cell may have a sparse list of these Root registrations. Candidate/private cells never copy or acquire them. Registration is installed only at successful publication/activation, after the candidate is committed; replacement publication retires old registrations at the same boundary that retires the old committed cell. Owner destruction, Root disposal, promotion out of numeric state, row-lease retirement, and failed publication detach registrations and scrub Root/row links.
- Reusable arrays remain Root-owned. No per-frame object, `StateChange`, handle, closure, `Map` entry or per-cell queue key is created for an already registered numeric slot. A row record may use a bitset for membership plus slot-indexed versions, but must also retain first-dirty slot order. Use compact dynamic buffers for arbitrary layout lengths; do not assume 32 slots or one application-wide row.

### Dispatch, capture and acknowledgement

1. Keep `#dispatchState`'s updater liveness recheck, mutation/version order, World dirty-journal mark, public dirty-cell notification, and public `StateChange` listener behavior. After the cell becomes dirty, visit its active Root registrations. For each registration, update its newest version. Only a clean-to-dirty transition appends its slot to that Root's ordered dirty-slot queue and schedules the Root. Repeated writes to an already queued slot update the newest version without another Root queue insertion or Root scheduler notification. The existing public per-write notifications still run.
2. At native-cut start, each Root captures its registered dirty slots into reusable arrays containing the opaque row ticket, slot, exact version, and numeric value from the current committed lane. Captured rows are preflighted against row identity/generation, exact slot-to-cell identity, source, and active Root registration before any source mirror, projection, or host write. A stale or incomplete row declines before mutation and falls back using the existing coherent path. Captured versions are immutable for that attempt; no later callback can rewrite the cut's buffers.
3. The VDOM row executor receives the same explicit token/slot/value contract as the existing Root row route. VDOM fusion remains a separate change; this design does not change projection order or host publication semantics.
4. On accepted commit, World acknowledgement consumes the opaque Root row ticket and captured slot/version arrays. It verifies the ticket's World/Root identity, active row lease and generation, slot's exact committed cell identity, and `cell.version <= capturedVersion`. It deletes the same prepared World dirty membership that backs the public journal and clears only that Root registration's queued slot. If the slot has a newer version, it remains dirty and queued for the next cut. A row's physical column/row address alone is never sufficient evidence of current owner/site occupancy.
5. Acknowledging one Root clears only that Root's registration state. Other Root registrations remain pending even though the shared World owner/site journal may become clean, matching the existing shared-journal behavior where each Root retains its own `PendingStateChanges` entry. Generic public `clearChangesThrough`, `drainChanges`, and `subscribeDirtyCells` behavior remains unchanged; generic calls do not clear Root registrations.

### Internal boundary (names illustrative)

Keep these APIs internal to `OwnerStateWorld`/`ComponentStateRoot`; do not export them as a replacement for public cell handles.

```ts
type RootDirtyRowTicket = opaque;
type RootDirtySlotTicket = opaque;

world.registerRootDirtySlot(
  rootIdentity: object,
  row: NumericCellRowView,
  slot: number,
  schedule: () => void,
): RootDirtySlotTicket | null;

world.captureRootDirtySlots(
  rootIdentity: object,
  reusableCut: RootDirtyCutBuffers,
): number | null;

world.acknowledgeRootDirtySlots(
  rootIdentity: object,
  cut: RootDirtyCutBuffers,
  count: number,
): void;

world.unregisterRootDirtySlots(rootIdentity: object): void;
```

An implementation may instead expose a Root-owned opaque ticket that binds the World privately. In either form, tokens must use private class branding and exact World/Root identity checks, not reflectable symbol payloads, public mutable fields, or per-operation `WeakMap` provenance lookups. Do not call a user-provided callback from dispatch; the scheduling endpoint is internal and must preserve current listener-cut/reentrancy semantics. A `schedule` notification occurs only when the Root slot queue transitions from empty to nonempty (or when a previously captured newer version needs another turn), not once per write.

The current `NumericCellRowView` can serve as registration input, but its public `rowIdentity`, `source`, `lane`, arrays, and physical row are descriptive data, not revocation authority. Registration must bind the private committed cell capability and lease generation inside World. A private candidate may contain equivalent row layout/source data but cannot use the committed registration path.

## Ordering and fallback rules

- Preserve `WorldDirtyJournal` owner-major/site insertion semantics exactly. Its public `mark`, `delete`, `clear`, `entries`, `has`, and `size` remain authoritative for generic World APIs.
- Preserve Root clean-to-dirty tail ordering. A slot enters the Root queue once on its first dirty write; repeated writes coalesce without reordering. A slot acknowledged through its captured version leaves the queue. A write after that removal re-enters at the tail. A write newer than the active cut stays at its existing pending position and schedules the next cut.
- Retain a global first-dirty order across slots and rows. Grouping by row must not silently reorder conflicting host writes. Row grouping is an execution index only; cut iteration derives from ordered slot records.
- Keep the fast path all-or-nothing for the captured row cut. Legacy state changes, missing/unsupported numeric sinks, stale layout/row tokens, mixed unsupported cells, or insufficient buffers decline before source mutation and route through current fallback behavior. Do not drop a row slot merely because its sibling slot is not yet activated.
- Store/reader generations, collection changes, resource retries, structural owner replacement, and disposal retain their existing barriers. A root-row cut cannot publish across an outstanding store or collection barrier.
- Do not change public dirty notifications. Other applications can subscribe to every accepted cell write; the optimization only removes redundant Root-internal queue insertion/scheduling for certified slots.

## Why this increment instead of a full rewrite

The smallest useful boundary is to replace only the Root's redundant per-cell queue and row-cut resolution for already certified committed slots. The shared World journal remains intact for public APIs and generic consumers; noncertified state and legacy `StateChange` entries remain in `PendingStateChanges`; existing candidate publication and VDOM host transaction remain the authority for structural work. This keeps fallback coverage broad and confines the new lifecycle to committed Root registrations.

A full replacement of `WorldDirtyJournal`, all World notifications, and `PendingStateChanges` would entangle public owner/site enumeration, user listeners, prepared owner publication, Root-specific subtree scope, and store/collection barriers. It would also make it harder to preserve the two-level insertion order and cross-Root acknowledgement behavior. Do not pursue that rewrite without evidence that the bounded path is insufficient.

The proposal can reduce Root internal queue/map work and repeated handle-to-row resolution for registered slots. It cannot eliminate the necessary per-slot version/value capture or version comparison: those are the proof that a captured write is still the same committed incarnation and that a reentrant newer write survives. The World shared dirty journal also still needs one mark per actual public dirty owner/site transition. Exact performance benefit remains unmeasured.

## Finite correctness matrix

| Case | Required result |
|---|---|
| Repeated setter calls to one registered slot before flush | One Root queue slot and one Root scheduling edge; capture latest version/value; World public dirty listeners still observe every accepted write. |
| Two slots in one row and slots in two rows | One Root row group per lease; first-dirty slot order is preserved across groups; all values are captured before host mutation. |
| Clean, ack, then write again | The slot re-enters at the queue tail, matching `PendingStateChanges` and World journal clean-to-dirty ordering. |
| Reentrant setter during host publication | Captured old version may be acknowledged only if still current; newer cell version and Root registration remain queued and schedule another turn. |
| Reentrant updater destroys its owner | `#dispatchState` returns false after the existing post-updater liveness check; no World mark, Root slot notification, handle resurrection, or row capture. |
| Numeric cell replaced at same owner/site | Old private cell ticket is revoked; new cell receives a new identity/registration; an old cut cannot clear or execute against the replacement. |
| Numeric row physical storage reused | Old row generation/identity fails preflight and ack; new lease remains unaffected even when column and row numbers match. |
| Two Roots cover one owner, including nested/grafted scopes | Each Root gets separate ordered slot state, capture and ack. One Root commit does not clear another Root's registration or pending render. |
| Root registration added during preparation | It remains private/inert. Install only at successful candidate publication; discard/rollback leaves no Root scheduler references or callbacks. |
| Keyed remove/reinsert or owner destruction | Retire old registrations and scrub cell, row and Root queue links before row release. New owner receives new registration; stale setters/tickets are inert. |
| Numeric promotion, unsupported sink, or partial row activation | Retire/defer the row registration safely; route the full affected cut through the existing generic/native fallback without partial host publication. |
| Legacy `PendingStateChanges.set/change` mixed with rows | Native row-only cut declines; preserve generic capture order and values and commit through current fallback. |
| Store, collection, resource retry, or structural barrier pending | Existing barrier wins; do not consume or acknowledge the Root dirty-row cut early. |
| Public World API use | `subscribeDirtyCells`, `subscribeChanges`, `pendingChanges`, `drainChanges`, `clearChangesThrough`, and World owner/site ordering retain current semantics. |
| Root/World disposal with retained tokens | Tickets are branded, stale, and scrubbed from row/root/cell links; a retained ticket cannot keep unrelated roots, rows, cells, or payloads alive. |
| Host executor declines or throws | Decline occurs before mutation or follows existing terminal host failure rules; do not ack slots that did not commit; clear reusable buffers in `finally`. |

## Failure modes to watch

- **Lost reentrant write:** clearing a Root slot based on its queued flag rather than comparing the active cell version with the captured version would erase a newer setter. Keep the captured-version test in World acknowledgement.
- **Cross-Root starvation:** using the shared World journal as Root queue state would let one Root's ack clear work another Root still needs. Store pending bits per Root registration.
- **Stale row alias:** validating only `(column,row)` lets a removed owner or replacement cell inherit the old registration. Bind row generation, opaque lease identity, and exact cell identity.
- **Updater resurrection:** moving Root dirtiness before the existing updater liveness recheck could schedule a cell whose updater destroyed its owner. Preserve dispatch ordering and regression coverage.
- **Candidate leak:** attaching registrations during render/preparation can schedule discarded candidates or retain closures after rollback. Register only at publication and scrub on rollback/discard/destroy.
- **Order drift:** collecting into row-major buffers can reorder first-dirty host operations. Keep a global first-dirty slot order even if execution groups rows.
- **Barrier bypass:** treating compiled numeric writes as an independent scheduler can publish while a store reader, collection region, resource retry, or structural replacement is pending. Retain all current Root gates.
- **Unbounded retention:** a cell-held root registration list can retain Root queues. Unregister on Root disposal and owner/cell retirement; clear list links before dropping row data, and test retained-token collection with roots otherwise alive.
- **Misleading profile attribution:** current sampled timings cover import/mount/inspection/disposal too. They justify inspection, not a per-write cost model or a speed conclusion.

## Implementation and verification sequence

1. Add the Root-owned ordered row-slot queue and internal registration lifecycle, with no route changes for legacy or private candidate cells.
2. Add World registration, exact-version capture and ack methods using private-branded tokens. Keep the existing public APIs and dirty journal untouched.
3. Route only fully registered committed numeric cuts through the new protocol. On any unsupported/stale/mixed case, decline without mutation and preserve the existing fallback cut.
4. Add deterministic unit tests for queue order/coalescing and World token lifecycle, then Root integration tests covering every matrix row above. Include two simultaneously active Roots and a grafted/nested owner case.
5. Run existing owner, preparation, numeric lane/row, native cell cut, store and collection suites. Add a bounded retained-token GC proof for Root disposal and owner destruction; keep it separate from normal Deno test discovery.
6. Only after correctness passes, profile the integrated product using a new preregistered matched study. Report sampled-attribution limits and compare the complete page result; do not infer savings from the existing archive.
