# Prepared token preflight reuse patch

## Proposed change

Root currently asks `isPreparedNumericCellProgramCurrent` for every captured lane, then VDOM repeats root/slot/active/generation/group validation for every token in `executePreparedNumericCells`. The patch removes Root's per-cell freshness query. Normal cached cuts stage their existing token, source, and captured value directly; VDOM remains the sole authoritative all-token preflight.

If VDOM returns `null`, the cut has declined before any source mutation, projection, or host write. Each execution wrapper converts a VDOM `null` to `false` before returning. This is required because `#commitHostMutation` increments publication for any return other than `false`; passing `null` through would publish the first declined attempt. After the first declined attempt, Root revalidates each captured handle/version, resolves its current source/lane, prepares fresh tokens into the already allocated buffers, updates the lane-keyed WeakMap only after successful preparation, and retries the same captured values exactly once through `#commitHostMutation`. A failed recovery or second `null` preserves the current generic fallback and leaves the native cut unacknowledged. An accepted `false` is never retried; exceptions from either execution stay terminal. Preparation remains outside the host-mutation wrapper, matching its existing error boundary.

The ordinary path adds no temporary arrays, objects, or closures. `{ token, source }` allocation remains confined to first preparation or null-only recovery. The initial null result cannot advance publication; only an accepted retry can advance it. World/PendingStateChanges acknowledgement still occurs after accepted execution.

## Regression coverage in proposed test patch

- Confirms Root makes no public `isPreparedNumericCellProgramCurrent` calls while execution preflight still runs.
- Structural add/remove refresh causes one null preflight, reprepare, and successful same-flush retry with the updated writer fanout.
- Removing the final writer causes reprepare to decline, then the existing scalar fallback publishes once and acknowledges only after success.
- An injected null preflight followed by valid reprepare retries once, publishes once, and does not invoke scalar fallback.
- Two injected nulls verify publication and pending acknowledgements remain unchanged at each attempt, then the existing fallback publishes exactly once.
- Existing tests continue to cover captured values across host reentry, deferred newer writes, host exceptions, disposal, shared-World roots, promotion, row/version identity, and fallback.

## Scope and evidence

The whole-page CPU profile attributes token-current checks 3.017 ms out of 598.039 ms sampled native arm-bundle self time (about 0.5%). The latter is sampled self time, not a cell count. Treat this as a small code-path simplification only, not a standalone performance solution or latency claim.

The implementation patch has been applied to the two requested source/test files and the focused tests passed. No compiler artifacts, build outputs, or frozen study files were modified.
