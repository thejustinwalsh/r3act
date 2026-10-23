# Production retirement and requirement review

Primary source review against `e02135abf96cf9ce451321a08531507adc4d9af0`, 23 October 2026. Implementation findings below are supported by the completed boundary in [results](results.md).

## Maintained code accounting

The uncommitted maintained-code diff has 669 added / 255 deleted production lines and 422 added / 112 deleted test/helper lines across `src`, `compiler`, `examples`, `tools` and `packages`. Generated `.cache` evidence, immutable prechange copies, installed consumer dependencies and browser artifacts are excluded. This slice adds retained group geometry and revocation coverage; it is not a net line-count reduction. The earlier cleanup slice removed substantially more production code than it added. Neither net lines nor archived evidence size proves runtime simplicity.

## One active implementation

| Replaced mechanism | Current authority and production path | Retirement finding |
| --- | --- | --- |
| `OwnedClosedFrameRequests` append/seal/consume builder | Authenticated bound requests feed `MountedClosedStoreExecution`; Root owns one accepted plan slot. | Class, constructor export and callers removed. |
| Per-frame grouping and schedule append/seal construction | Immutable group chunks and ordered remaps in `OwnedClosedFramePlan`; `OwnedClosedFrameSchedule.fromPlan` owns candidate-private buffers. | Old schedule construction API, rows/columns builder and `prepareOwnedFrameSchedule` removed. Stable frames reuse geometry; changed membership may rebuild remaps and affected groups. |
| Stable target bucket/owner discovery every frame | Existing key index owns `MountedStoreKeyBucket` membership/owner cache; mounted node owns geometry. | Stable frames consume cached membership and owner lookup. Required live sweeps remain. |
| Draft per-frame recipe rebinding registry | Existing prepared delta carries scalar plans; target node receives plan after successful writes/final checks. | `recipeBindings` and `pendingStoreRecipeBindings` absent. No additional receipt list. |
| Caller-only task input-change hints plus transition-side duplicate diff | Execution captures frozen input cut and derives exact changed keys for same-definition retry. | Transition-side `changedKeys` implementation removed. |

A scoped search of maintained source, compiler and examples found none of the retired request/schedule/rebinding symbols. The generic path remains the supported fallback for shapes outside the closed specialization. It uses the same publication/history authorities; retaining it does not justify an obsolete specialized implementation beside the current one.

## Original-plan coverage

| Requirement | Reviewed implementation / limitation |
| --- | --- |
| Mount-lifetime Store geometry and repair | Exact normalized request identities reuse the plan. World/projection chunk identities survive unrelated group insertion, removal and ordering changes. Root installs only on successful publication; code retirement clears and owner retirement batch-prunes it. Candidate buffers are private. |
| Mount-lifetime target geometry and repair | Canonical bucket invalidation covers membership change; generic refresh, detach and move clear affected node geometry. Duplicate owners remain ambiguous. Cold/discarded preparation cannot install accepted node geometry. |
| Per-root histories and shared demand | Actual Store transition test exercises divergent accepted inputs, shared provider interest, parent cancellation and late result rejection. Runtime keeps existing Root/resource authorities. |
| Supported dependency invalidation | Retry keys derive from captured inputs even when caller hint omits a change; static prerequisites and compiled literal-read provenance remain supported. |
| Runtime/test separation | Reuse assertions are untimed tests. Production counters allocate only under existing profiling. No new runtime receipt system was introduced to obtain test evidence. |
| Full automatic dependency discovery | Unfinished: arbitrary helper/dynamic-key/component-tree discovery is not established by static literal-read metadata. |
| General same-root independent tree/cache merging | Unfinished: whole-root guards remain until mergeable deltas/conflict validation exist. |
| Full product qualification | Cold/retained-memory, broader lifecycle/host conformance, current portability and independent-device/human evidence remain open under the master plan. |

## Verification boundary

The current v4 freeze has 28 exact source hashes. Primary recomputation matches every hash and the gate review hash. The repaired consolidated receipt passes all 70 steps, including full Deno, actual compiled fixtures, host/GC and rebuilt package consumer checks; unchanged Rust/compiler prerequisites are explicitly carried by hash. Earlier failures remain preserved. Browser launch failed before workload execution in the first offline/HMR attempts. Fresh identical-asset installed/HMR checks subsequently pass; the sole balanced timing episode meets all four predeclared non-regression bounds. Median update remains2.4ms versus React0.6ms, so parity and a major speedup are not established. See [results](results.md).
