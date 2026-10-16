# Selective store-reader publication — 12 October 2026

## Diagnosis and implementation

`ComponentStateRoot.flush()` previously forced every component to render when
the root had any store subscription. An unrelated subscription also vetoed the
collection delta path. Both behaviors widened a local change to the whole root.

The current implementation selects live store-reader owners from explicit
owner/site reader identities, selects parents of pending collection regions,
and follows their owner lineage through the retained tree. Unaffected owners
reuse their caches. The root still prepares, validates and publishes one coherent
candidate; it does not commit store readers independently. All live reader owners
are refreshed to retain their transaction footprints and selector history,
including readers whose store did not change. Selection of only changed readers
is a separate optimization.

Numeric-only writer batches return before reader/cache scans. Store-bearing
candidates bypass partial-owner preparation shortcuts that cannot carry store
transactions. Source switching retires old subscriptions after publication.
Store-free row deltas may coexist with unrelated store readers; changed rows
that read stores decline that path and join the coherent candidate instead.
Rejected collection deltas can fall through to the same selective candidate.

Resource retries, cached boundaries, roots that have ever read an async resource,
and missing/suspended dependency footprints retain conservative full rendering.
The sticky resource flag is deliberately conservative until resource reads can
be retained and validated per cached owner. A settled resource retry combined
with scalar and collection writes must refresh all three inputs together.

## Current evidence

The actual Rust/OXC-authored collection differential now requires exact owner
execution counts per operation: insert/replace execute one row; move/remove
execute none. Its four fixed seeds exercise 80 edits against a separate Map/order
oracle, with surviving host identity/state, filtered removal/remount, effect
lifetimes and complete reader teardown. It executes **38** row owners, compared
with **450** in the previous checkpoint's same workload. The same-root mixed
insert executes one new row and one store probe; a subsequent store-only update
executes zero rows and one probe. The former two-probe aggregate included a prior
local-state flush; the current fixture measures the mixed flush separately.

`compiler/native_store_owner_execution_test.mjs` independently compiles and
checks **1k/10k/50k** rows. At every size, store-only updates execute zero row
owners, and a store update plus insert executes only the inserted row. It checks
the actual store/collection projection, all surviving node identities, local
state, effect setup/cleanup and source/collection ownership after teardown.

This is not bounded total work: store-only component visits are
**1,002/10,002/50,002**, and VDOM key-index rebuild visits are
**4,005/40,005/200,005**. Candidate cache copying, traversal and index rebuilding
remain proportional to tree size. No comparative React latency, allocation or
mixed-workload performance gate is established by owner render counts.

## Review correction and next commit seam

Root review strengthened the coordinated store/scalar regression with a newly
mounted effect that reads the numeric host prop. Keeping that numeric owner
cached exposed the old prop to the effect: the direct writer ran after candidate
publication/effects. The final implementation preserves the safe rerender for
simultaneous store and scalar changes, while ordinary numeric-only frames still
use their no-render writer path. The stronger test asserts current props before
effects and correct selector history. This is a remaining performance seam,
not permission to let effects observe an inconsistent UI.

The next implementation must stage retained numeric writer updates inside the
candidate's host commit before publication/effects, with stale-cut validation,
removed/replaced binding handling and host-failure semantics. It must also expose
the remaining traversal/index costs before the prescribed mixed realtime
comparison. Sol's comparative maintenance prerequisite and full review remain
held; this checkpoint does not claim a generally faster React replacement.
