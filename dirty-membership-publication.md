# Prepared dirty-membership publication

13 October 2026. The reviewed dirty-membership implementation is integrated
in `src/world_dirty_journal.ts` and `src/owner_state_world.ts`; focused Deno
verification passed. The CPU archive was completed and archived before this
change was prepared: `d6021e62248df8264fa5d081f308ff9dba2fa199ecf071b1ab59a979ed0661a3`
(21 files). Its qualified native profile sampled 598.039 ms total; sampled
self-time included `clearCellChangesThrough` 61.214 ms,
`WorldDirtyJournal.delete` 30.234 ms, and `WorldDirtyJournal.mark` 14.365 ms.
Those are whole-page profile attributions, not expected savings or a speed
result. Any later timing study remains a separate gate.

## Proposal

The World already knows the owner/site identity when a committed cell first
becomes dirty. Prepare its reusable journal node once at that point, cache an
opaque token in the committed cell's fixed initial shape, and use the token for
subsequent dirty marks and native acknowledgements:

```ts
type PreparedDirtyMembership = opaque;

WorldDirtyJournal.prepareMembership(owner, site): PreparedDirtyMembership;
WorldDirtyJournal.markPrepared(token): boolean;
WorldDirtyJournal.deletePrepared(token): boolean;
```

`WorldDirtyJournal.mark`, `delete`, `clear`, `entries`, `has`, and `size` keep
their current public behavior. The prepared operations address the already
resolved owner bucket and site node directly. The token contains no World, cell,
handle, source, callback, or application payload. The journal identity and node
reference live in true JavaScript private fields on a module-private token
class; the token has no reflectable own data. A static private-class resolver
checks the class brand, journal identity, and retired bucket, then returns the
already allocated site entry. The journal itself links or unlinks that node
through its own private methods. A foreign token, forged object, throwing Proxy,
or token whose bucket was retired declines in constant time without mutating the
journal. The private-brand `#entry in value` test does not invoke Proxy traps;
no exception handler surrounds journal linking or unlinking.

The token references one owner bucket and one site entry. `removeOwner` retires
the bucket, unlinks it from the active-owner list, clears every entry's active
and previous/next links, clears prepared-token backreferences and the site map,
and removes the bucket from the journal. The token never references the journal;
a retained stale setter therefore cannot keep the journal or unrelated active
owners alive. `clear` is a drain: it clears active work and links but leaves
valid buckets and prepared nodes reusable. `deletePrepared` unlinks a node, so a
later mark re-enters at the existing owner/site tail exactly as today.

## World integration boundaries

- Add `dirtyMembership?: PreparedDirtyMembership` to `StateCell`, initializing
  it to `undefined` in the compiled-numeric factory, ordinary committed-cell
  factory, and candidate-cell factory. Keep field insertion order stable for
  compiled numeric cells.
- Candidate cells always start without a token, including copies of committed
  cell values/sources. A candidate write remains private and does not touch the
  World journal. During publish, an existing live cell keeps its authoritative
  token; a newly committed dirty cell lazily obtains its own token before being
  marked. Discard and rollback never install a committed token on a private
  cell.
- Route committed `#dispatchState` and the two candidate-publication dirty marks
  through a World helper that prepares once and calls `markPrepared`. Dirty-cell
  and public change listeners still run synchronously, in the same order, with
  the same payloads and exception behavior.
- Route `clearCellChangesThrough` to `deletePrepared` after resolving the
  identity entry and confirming the same owner/site. Preserve its existing
  captured-version rule: retain the pending node when the live version is
  greater than the captured version; otherwise unlink it. Do not change
  `clearChangesThrough` or direct `WorldDirtyJournal` API semantics.
- In `destroyOwner`, clear the cell's cached token before clearing the cell
  payload/source and call `removeOwner`. The journal also invalidates the node,
  so a stale token is harmless if a caller retained it independently.
- In `versionForCell` and `clearCellChangesThrough`, remove only the redundant
  `#owners.has(owner)` and `#stateByOwner.get(owner)?.get(site) === entry.cell`
  checks. Keep identity-map lookup and exact cell-identity, owner, and site
  comparisons. `destroyOwner` deletes the identity entry and OwnerIds are never
  reused. Because a functional updater can synchronously destroy its owner,
  `#dispatchState` must recheck owner liveness and the exact state-cell identity
  immediately after evaluating an updater and before mutating state, creating an
  identity, marking dirty, or notifying listeners. That dispatch returns
  `false`. Direct-value dispatch skips the check to avoid adding a hot-path map
  lookup. This preserves the physical-liveness invariant used by exact handle
  resolution. The pre-guard implementation allowed `set(() => {
  world.destroyOwner(owner); return 1; })` to continue after destruction and
  install a new identity for a dead cell. The regression tests now prove that
  case is rejected before dirty state or notifications. Do not alter
  `versionForChange`, generic `version`, or keyed-slot occupancy semantics.

## Ordering and lifecycle invariants

Owner-major and site-major order comes from the same linked bucket/node lists;
prepared operations call the existing link/unlink logic rather than inventing a
second ordering path. A repeated dirty mark coalesces. A clean-to-dirty mark
appends the site; activating an inactive owner appends its bucket. A captured
cut may acknowledge only its captured version. If a writer reenters and advances
the cell, the newer version and its journal membership survive. Root listener
timing and subscription snapshot semantics do not change.

Numeric promotion remains orthogonal. A nonnumeric setter first releases its
lane as it does now, then marks the same committed cell's journal node. Row
reuse continues to be guarded by `NumericLaneAddress.generation`; journal tokens
name owner/site nodes only and never contain row addresses. Dead owner identity
entries remain absent after destruction even if that numeric row is later reused
by another owner.

Async and mixed candidates retain current publication ordering: candidate
setters mutate private candidate cells; candidate validation and host commit
complete before publication; only publication can mark committed owner/site
work. Stale/discarded candidates do not borrow or leave prepared tokens. A
candidate that updates an existing cell marks that live cell; a newly published
dirty cell gets a token only after it is installed as committed.

## Reviewable artifacts

The implementation changes are limited to `src/world_dirty_journal.ts`,
`src/owner_state_world.ts`, and the new `src/prepared_dirty_membership_test.ts`.
The review patch and staged copy remain under
`.cache/prepared-dirty-membership/` for audit traceability.

The new focused tests cover prepared order/reactivation, public API parity,
clear and owner removal, foreign/stale/forged/malformed token rejection,
newer-write acknowledgement, dead-handle acknowledgement after row reuse,
future captured-version behavior, updater-triggered destruction before identity
creation and after acknowledgement, numeric-row reuse inside an updater, and
candidate writes staying private.

The integrated focused command covered the new tests plus the World journal,
owner state, owner preparation/savepoints/staging/replacement, numeric cell
shape/layout, native cell cut, native numeric lane cut, and native cell channel
suites. Deno type checking and all **83 tests passed**:

```sh
deno test --config deno.browser.json \
  src/prepared_dirty_membership_test.ts \
  src/world_dirty_journal_test.ts src/world_dirty_journal_integration_test.ts \
  src/owner_state_world_test.ts src/owner_preparation_test.ts \
  src/owner_preparation_replacement_test.ts src/owner_preparation_savepoint_test.ts \
  src/owner_state_staging_test.ts src/owner_numeric_cell_shape_test.ts \
  src/owner_numeric_layout_test.ts src/native_cell_cut_test.ts \
  src/native_numeric_lane_cut_test.ts src/native_cell_channel_test.ts
```

No benchmark or speed conclusion follows from fewer Map lookups or the CPU
profile; performance remains unverified by this implementation task.

## Primary integration checkpoint

Primary verification passes all 663 runtime tests and all 32 Rust compiler tests. Two additional publication regressions cover checkpoint rollback/private promotion followed by existing-cell publication, and a new private dirty cell obtaining membership only when it publishes. Public notification counts and forwarded setters remain covered. An initial test-harness typo used a nonexistent capture method; that type-check failure is retained, and the corrected tests use `pendingChanges()`.

The authored TSX execution V2 proof requires zero duplicate Root currentness queries while preserving valid cut tokens, sparse/dense cuts of 1/6 cells, zero generic captures, and zero legacy column/source execution. The lifecycle proof covers captured values under host reentry, refs before effects, promotion/fallback, dead setters and terminal host-write cleanup. V2 is a new verification script; the original frozen script remains unchanged.

The production product build succeeds with compiler proof artifacts in `.cache/product-mixed-prepared-dirty-membership/compiler-proof` and assets in `dist-product-mixed-prepared-dirty-membership`. Both arms use their required compilers. These are application artifacts, not library-size measurements. The qualified Chromium v4 diagnostic preserves fast properties for actual cells through publication, promotion, destruction and row reuse.

This checkpoint has no production pilot or matched timing result yet. Earlier correctness, timing, allocation and source archives remain immutable. Current candidate speed/allocation and independent-device/maintenance gates remain open.
