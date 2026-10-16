# Mixed structural update: bounded reuse plan

## Scope and observed route

The production confirmation harness emits eight structural frames in the 240
measured frames. Each edit removes 8 rows, inserts 8, and moves 13 retained
rows. The native arm also updates row state on every frame. The raw harness
records correctness and frame timings, not runtime visit counts, so those
records do not establish which implementation detail caused the timing result.

With collection work pending alongside state changes, `ComponentStateRoot.flush`
does not enter the numeric-only fast path: the guard requires no pending
collection keys (`src/component_state_runtime.ts:1935-1950`). It calls
`#prepareMixedCollectionCandidate` (`:3214`) and commits its keyed-region VDOM
program. Captured numeric writes are then applied before publication through
`#applyCandidateNumericWrites` (`:4764`). If mixed preparation declines, normal
owner selection can reach `#renderAndCommit` (`:2200-2203`), which expands the
root tree. The admitted mixed route itself does **not** walk every row or
reconcile the whole tree.

## Existing representations and rediscovery

- Root already has the collection-key row map, collection-key to host-key map,
  keyed-owner output map, reverse owner-to-key map, and World owner slots:
  `CollectionRegionCache.rows`, `hostKeysByCollectionKey`,
  `KeyedRegionCache.outputsByKey`, `keysByOwner`, and `OwnerPreparation.findOwner`.
  `#prepareMixedCollectionCandidate.rowFor` (`:3351-3368`) joins these for each
  first-touched collection key, then `stage.rows` memoizes the result for later
  operations in that candidate.
- The mixed candidate keeps distinct `stage.rows` (current overlay) and
  `stage.previousRows` (committed row needed for retirement and publication),
  plus `rowsByOwner` for store-reader membership. These are not interchangeable
  without retaining both old and candidate owners across replacement/removal.
  `stage.operatedKeys` is only added to and cleared (`:3477`, `:3849`); it is
  not read and is deletable.
- For store notifications, Root parses reader owner IDs once, then for each
  reader owner searches each stage's existing `keysByOwner` reverse map
  (`:3654-3662`). That is reader-count × staged-region-count lookup work, not a
  scan over every collection row. The product fixture has no store readers;
  keep this path and its coherent transaction behavior intact.
- The numeric candidate path currently holds `numericWrites[]`,
  `numericSources`, and `numericChanges` (`:3274-3279`, `:3780-3807`). The set
  and map both index the same captured source; `numericChanges` only exists so
  validation can recover the `StateChange` from its source. Put the exact
  change on its `CandidateNumericWrite` and retain the duplicate-source set
  only as the fail-closed uniqueness check. This removes one map and keeps
  captured version/identity validation unchanged. `operatedKeys` can be
  removed separately.
- VDOM reuses its mounted indexes and `KeyedRegionBuckets`; it does not rebuild
  the keyed region from a list. `prepareKeyedRegionDeltas` (`src/vdom_snapshot_runtime.ts:1570`)
  resolves the parent/region, validates candidate keys and disjoint roots,
  prepares row VNodes, then its token validates those same mounted targets
  again before commit (`:1790-1810`). Its commit calls
  `#commitKeyedRegionDelta` (`:1353`), which applies each remove/move/insert in
  order. This repeats a parent/region-index lookup at host commit. Avoid
  weakening the checks in this cut; consider an opaque mounted-region lease
  only if the new diagnostic counters show these lookups are material.
- Root and VDOM each hold necessary keys/indexes for different ownership
  domains. Do not add a second global owner/host index. VDOM's candidate-key
  validation and removed-subtree traversal are limited to candidate/removed
  subtrees on the admitted keyed path; the generic full-tree path remains a
  fallback.

## Smallest integration seam

Route the retained, unchanged owners' numeric portion of the existing mixed
candidate through the already-existing World lane views and VDOM prepared row
program, instead of rebuilding a generic `setSources` batch. Reuse
`StateChange.cellIdentity` plus its captured version to form the exact
`StateCellHandle` accepted by `World.numericRowForCell` (`owner_state_world.ts:1739`).
For each captured change whose owner is neither rendered nor retired by the
candidate, resolve its existing row view, reuse Root's current row-token
WeakMap and VDOM `prepareNumericRowProgram`/`executePreparedNumericRows`
(`component_state_runtime.ts:4872`, `vdom_snapshot_runtime.ts:2385,2565`), and
pack captured slot/value data in a **candidate-owned** cut. Candidate-owned
storage is required because multiple prepared candidates can coexist; do not
borrow or overwrite the flush scratch while a candidate is outstanding.

The existing candidate `commitHost` order is the boundary: commit keyed
topology first, execute the captured retained-row cut next, then let candidate
publication update World/collection/store state and acknowledge the captured
versions; refs, retirements, and effects remain in the current `runEffects`
order (`component_state_runtime.ts:3883-4055`). Use explicit captured values,
never reread columns after a host callback. Leave inserted/replaced rows on the
candidate render path, where their values and bindings are already prepared.
Keep generic `setSources` for legacy/non-lane sources and keep current decline
to full fallback for stale identities, resources, unsupported boundaries, or
incoherent stores. Do not add a second queue or VDOM program family.

The first edit should be narrow: carry the exact `StateChange` on the existing
numeric-write record, remove the redundant change map and unread
`operatedKeys`, then add an internal candidate-local retained-row cut using the
existing VDOM row-program API. If lease-based parent lookup removal is later
justified, make it a follow-up against the same mounted region/bucket identity;
it must not introduce a parallel structural index.

## Required acceptance cases

1. For each frozen size (128, 512, 1,024), apply remove/insert/move plus the
   same frame's row-state writes. Assert exact row order and keys, 8 removals,
   8 insertions, 13 moves, retained DOM identity, inserted owner activation,
   removed dead setters, and no retained-row component rerenders.
2. Assert retained numeric rows use the existing prepared-row cut with captured
   versions and values, each affected sink projects once, and columns/source
   mirrors are not reread after a reentrant host callback. Prove newer writes
   survive acknowledgement.
3. Preserve host phase ordering: topology and numeric properties are visible
   before refs/effects; removed-owner cleanup precedes replacement effects;
   candidate `validate`/`discard` leaves committed rows, lane values, and
   acknowledgements untouched; a host failure retains the existing terminal
   policy.
4. Include stale/foreign captured cells, row replacement/reuse, two roots over
   one World, mixed store readers, async/resource fallback, and multiple live
   prepared candidates. Unsupported cases must decline atomically and use the
   existing coherent fallback.
5. Keep ordinary numeric-only sparse/bucket/dense tests unchanged and verify
   that the keyed VDOM fallback still handles unsupported structures. No
   latency claim follows from these structural correctness checks.

## Coordination

`prepared_keyed_program` is separately auditing shared representations and
bookkeeping across World/compiler/owner-row code. This note is restricted to
the mixed structural Root-to-VDOM route and its interaction with captured
numeric rows.

## Staged deletion-only check

I rechecked live `src/component_state_runtime.ts` before staging the proposed
change. `RegionStage.operatedKeys` has exactly four occurrences: its type,
constructor, `appendOperation` insertion, and artifact-release `clear`. There
is no read, iteration, callback, or use in validation/publication. The staged
patch removes only that private set and its bookkeeping; it leaves
`operations`, `rows`, `previousRows`, and `rowsByOwner` intact.

`numericChanges` is **not** unread: the mixed numeric-write validation loop
uses `numericChanges.get(write.source)` to recover the exact captured change
for `world.versionForChange`. It is therefore intentionally retained in this
delete-only patch. Replacing that map with a field on each write would be a
separate representation change, not a pure unused-field deletion.

- Original source SHA-256: `2ae330dcb8f3e553277fd47432525a75155fd16ec408954dd45471965fe9b5c1`.
- Staged source SHA-256: `af13606dfb0506eb786279dca60e51f38f6f9cdf1ea9d3dc30683bb98dcee402`.
- Patch: `.cache/mixed-structure-simplification-review/operated-keys-removal.patch`.
- Staged copy: `.cache/mixed-structure-simplification-review/staged/src/component_state_runtime.ts`.

If applied, focused regression suites to run are `src/native_mixed_delta_candidate_test.ts`
and `src/component_state_runtime_test.ts`; `src/vdom_scalar_keyed_delta_test.ts`
checks the unchanged keyed-delta behavior. None were run for this staged-only
review.
