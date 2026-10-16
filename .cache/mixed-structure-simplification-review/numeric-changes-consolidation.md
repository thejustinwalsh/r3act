# Staged mixed numeric change-map consolidation

This incremental patch follows the previously reviewed `operatedKeys` deletion. At the start of this task, live `src/component_state_runtime.ts` still had its pre-deletion hash `2ae330dcb8f3e553277fd47432525a75155fd16ec408954dd45471965fe9b5c1`; the reviewed deletion copy was `af13606dfb0506eb786279dca60e51f38f6f9cdf1ea9d3dc30683bb98dcee402`. The primary integrated that deletion during this task, so the current live source now matches the numeric patch base (`af136...`).

The mixed candidate's `numericChanges` map is only used to recover a captured `StateChange` by `write.source` during `validateNumericWrites`. The staged patch defines a narrow `MixedCandidateNumericWrite` subtype with a required `change` field, uses it only for mixed candidate writes, and reads it directly in that candidate's validator. It retains `numericSources` and its duplicate-source rejection. Other `CandidateNumericWrite` construction paths are unchanged and do not need the field or a new guard.

Allocation delta for this mixed-candidate path: remove one `Map` allocation, one `set` per accepted numeric write, one `get` per validation write, and map cleanup on both artifact release paths; add one `change` reference field per write object. The same captured `StateChange` objects were already retained by `capturedChanges` for the candidate lifetime, so the field adds no new payload object. It preserves the source-to-change association and captured identity/version validation.

Patch: `.cache/mixed-structure-simplification-review/numeric-changes-consolidation.patch`.
Staged copy: `.cache/mixed-structure-simplification-review/numeric-changes-staged/src/component_state_runtime.ts`.
Staged copy SHA-256: `6cf1cdc113b1354aea8023f6e275cd17664108063ed9f9f66c85da0eec711fc6`.

The three approved focused suites passed against a test overlay containing the staged runtime: 34 passed, 0 failed. The saved output is `.cache/mixed-structure-simplification-review/numeric-changes-focused-tests.log` (SHA-256 `2d02d21cc025c50060c6032a83a014d50dfd4e4c32e38dc09184c0a34442abf5`). The patched shared source was not modified by this task.
