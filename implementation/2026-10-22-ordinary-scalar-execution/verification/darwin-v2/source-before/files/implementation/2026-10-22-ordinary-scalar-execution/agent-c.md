# Root integration handoff

Base `427ef917`. Owned files: `src/component_state_runtime.ts`, `src/component_state_runtime_test.ts`, `src/closed_store_numeric_kernel_test.ts`, this note. No new module. No test, build, benchmark, browser, server or VM was run by this implementation agent.

## Replaced path and authority

Before: all-data preflight identified owners and requests; successful capture rebuilt each owner from live reader IDs, cache metadata, input paths and a reader-index join. Kernel input/output arrays were allocated even for data execution. Closed local-cell private phases resolved canonical source and version separately for each input. Ordinary flush created a public candidate with getters, frozen lists and group receipt, then immediately called it and rewrote its methods during release.

After: preflight retains one original-order `passiveRows` list with cache, program, data execution and indexed input associations. Successful passive capture iterates these rows directly; any failed/mixed/legacy eligibility uses the existing live-reader loop before executing a kernel callback. Legacy input/output arrays are created only on the first numeric run. Stage/current/publish remain shared. Explicit writes and closed local inputs form one candidate-local World cut using A's copied opaque factory; private prepared and after-host phases call A's validator once for that union. The public World checks still run at their original phases. Closed staging builds its own cut for conservative reveal/structural callers; their separate explicit retained-write helper is unchanged. Uncertain lane/accessor storage declines before host application on the closed cut; its final validator does not fall back to callback-bearing World methods.

`#createCandidateLifecycle` retains one phase machine, claims, Store holds, barriers, prepared-candidate tracking, accepted swap, failure quarantine and cleanup. The public facade delegates to that core and is still registered with the group receipt when a candidate can escape. Only an internally prepared passive retained scalar cut with selected Store input, owned scalar deltas, no resource/collection footprint and every explicit write covered by the closed owners uses the core directly. That core remains in the existing prepared-candidate Map and publication barrier. `publication.immediate.runs` increments after successful immediate publication; `publication.deferred-adapters` increments only when a public facade is constructed while profiling. They are route observations, not speed or allocation measurements.

Candidate release clears rows, request joins, staged values, cut references, footprints, legacy arrays, Store holds and publication lineage scratch. The operation is not cached across frames. Root, World, Store, mounted VDOM, host-domain and accepted-history authorities are unchanged.

## Callback boundaries

| Boundary | Behavior |
| --- | --- |
| Public capture and `validatePrepared` | Original World/Store/resource callbacks and order remain. Conservative owner selection reaches this route before any kernel callback. |
| Private pre-host admission | World copied cut checks local cells; existing code, Root live-owner, Store, hold, writer and VDOM checks remain. No public World cell method is invoked by the new cut. |
| Host application | Existing VDOM admitted commit and per-writer reentry checks remain; Root publication barrier and host claim use the same core object. |
| Public post-host validation | Existing public World/Store/VDOM checks remain observable. |
| Final private admission and accepted swap | World cut permits newer versions but requires the same incarnation/source; the old cutoff is acknowledged after accepted publication. Existing final Store, resource, code, Root live-owner and VDOM checks remain. |
| Public release and delayed calls | The facade retains its former getters, late-call behavior and closed-method rewrites. Immediate operations have no facade to rewrite. |

## Added regressions and Luna commands

`src/closed_store_numeric_kernel_test.ts` now checks immediate scalar output, retained identity, one successful batch, public candidate late getters/validation, no ordinary deferred facade, and original two-owner writer order with accepted values. Existing tests in this file cover mixed data/legacy callback order, old-cut/newer-action behavior, public preparation and late publication overrides; the consolidated Root/VDOM/World suites cover group revocation, holds, failure and disposal. The primary should review exact retained coverage and add a cross-layer fixture if the gate needs one.

Suggested focused command for Luna after primary review: `deno test --frozen src/owner_state_world_test.ts src/vdom_snapshot_runtime_test.ts src/component_state_runtime_test.ts src/closed_store_numeric_kernel_test.ts`. Run the repository's consolidated frozen gate only when primary releases the integrated slice. No performance inference is made from these source changes.

## Source review limits

This handoff is source-only. The World cut and core/facade add candidate-local objects whose cold and memory costs are unmeasured. The previously recorded four-arm gap has no causal phase budget. A successful correctness gate and installed proof are prerequisites to the single bounded comparison; performance parity may still fail.
