# Coherent mixed candidate implementation

12 October 2026. Working plan; implementation and verification are in progress.

## Objective

Compose compiler-certified keyed collection edits, numeric prop updates and
async store readers in one prepare/validate/host/publish/effects lifecycle.
Keep ordinary authored TSX, retained VDOM and the mandatory Rust/OXC compiler.
This is milestone M4 in `performance-implementation-plan.md`, not a new product
direction or a claim that the performance gate has passed.

## Bounded assignments

| Owner | Files | Deliverable |
| --- | --- | --- |
| Luna high: prepared keyed program | `src/vdom_snapshot_runtime.ts`, `src/vdom_prepared_delta_program_test.ts` | Prepared disjoint collection/leaf operations, one VDOM version publication, safe validation and terminal cleanup. |
| Luna high: owner replacement | `src/owner_state_world.ts`, `src/owner_preparation_replacement_test.ts` | Private same-key replacement, cancellation, retained committed-read validation and savepoint safety. |
| Completed supporting store work | `src/async_store_runtime.ts`, `src/store_reader_pruning_test.ts` | Prune canceled observations without dropping pinned validation or root cleanup. |
| Luna high: root integration | `src/component_state_runtime.ts`, `src/native_mixed_delta_candidate_test.ts` | Mixed tracked-work candidate with coherent fallback and lifecycle publication. |
| Luna high: compiled proof | `compiler/native_mixed_candidate_execution_test.mjs` | Actual Rust/OXC TSX exercises mixed work without author-written binding metadata. |
| Luna high: retention proof | `scripts/verify_mixed_candidate_retention.mjs` | Closed candidate and private setter retention checked with controlled GC. |
| Primary | Plan, production config, verification records and integration review | Review algorithms and safety contracts, correct findings, run integrated gates and archive only verified work. |

## Required contracts

1. Public `prepare(tree)` continues to evaluate the supplied full tree.
   `preparePending()` prepares tracked work and uses coherent fallback for
   unsupported footprints; null means no pending work.
2. Collection edits, all participating live store readers and approved numeric
   sources share a captured cut. Preparation does not mutate the host or live
   owner/cache state.
3. Validate root, host, owner, collection, store and numeric identities/versions
   before host work and again before publication. Pre-host staleness discards;
   failure after host mutation preserves the existing terminal policy.
4. Apply topology and changed numeric outputs before refs/effects. Publish
   owner/cache/store metadata before acknowledging captured versions. Newer
   updates remain queued.
5. Removed owners clean up through the lifecycle. Same-key reinsertion creates
   a new owner incarnation. Canceled private owners neither publish effects nor
   retain active setters.
6. Bounded edits do not scan all retained collection owners. Dense numeric
   validation is linear in captured writes, not repeated searches through them.
7. Terminal prepared handles release staged trees, closures and owner payloads.
   Public host APIs expose no version-suppression flags or private node types.

## Verification and decision

New verification lives in `.cache/mixed-candidate-milestone`. Its command
manifest preserves the prior 52 checks and adds the compiled mixed proof;
retention verification is added when its script is ready. A separate
`vite.product-mixed-mixed-candidate.config.ts` writes to
`dist-product-mixed-mixed-candidate` to preserve frozen production builds.

Run focused tests, primary review, the full correctness/integration suite and
production pilot. Archive source/build/evidence only after every required check
passes. A correctness pilot is not a speed result. Follow M3/M5 allocation and
storage work with the unchanged separately registered product confirmation;
preserve failed historical results and independent-device/maintenance gates.

The Sol full review remains held by `sol-review-prerequisites.md`. A successful
Three host demo does not establish lower comparative maintenance cost.
