# Dependency-scoped orchestration slice

Slice3 follows the verified realtime boundary at `331e34578`. Realtime parity still fails; this slice completes dependency orchestration rather than claiming an arithmetic or property-write speedup. The three-slice task graph remains in `../2026-10-22-architecture-slices/plan.md`.

## Replaced mechanisms and authorities

C3 binds actual compiler-emitted callbacks to the existing semantic module revision, replacing unversioned callback execution for native compiled tasks. Hard task prerequisites, input control/invalidation relations and candidate-local discovery are distinct. Narrow literal Map reads remain the supported static analysis; opaque callbacks acquire no purity guarantee. Standalone separately supplied binders remain only for real current callers until migrated.

D3 supplies explicit provider/derived definitions and a caller-owned bounded demand scope. Replace duplicate provider startups across interested executions with leases over existing AsyncResource identity/status. Provider identity, code revision, input capture identities/versions and scope determine eligibility; callback equality also prevents replacing implementation under a reused label. Provider owns startup and cancellation, aborting only after last interest. Borrowed promises remain observation-only. Pure derivation is an explicit author contract, never inferred for arbitrary task functions. Unleased entries are evicted; no eternal cache or accepted-history registry.

R3 preserves compiler provenance in static prepared task definitions, validates existing revision tokens before execution/reuse/publication and integrates demand leases with candidate lifetime. The native queue remains the sole publication authority. Explicit coherent transactions retain their accepted-view agreement; optional independent root reveal can progress without unrelated resources. Roots that replace whole trees/caches retain whole-root conflict guards. Same-root arbitrary boundary delta merge is not implemented or claimed by a reveal option. Realtime clocks do not traverse task graphs.

## Ownership and semantics

Sol C owns compiler task emission/Vite validation, async task-plan/provenance and relevant fixtures. Sol B owns demand/resource scope and adversarial tests. Sol A owns native task execution/transition/scheduler integration and tests. Primary owns public exports, current documentation, authored route integration, source review and checkpoint. Sol agents do not execute workloads. Luna remains idle until combined review/freeze.

Preserve exact captured Store acknowledgements and newer actions, separate accepted histories/forks, old accepted views while applying, live code/source/resource checks, resource ownership and partial-host-failure quarantine. Sharing transport or a pure value never merges accepted UI histories. Known keys start on the ready frontier; unknown keys wait for real parents. Dynamic resource discovery remains candidate-local and validated, never silently promoted into a static prerequisite or global invalidation edge.

## Budget, falsifiers and boundary

Historical DAG144.8ms versus equally preloaded React143.6ms is parity, not an advantage over informed React orchestration. No removable-time estimate or speed promise exists for this source. Evaluate one integrated authored route with equal preload knowledge, request start/settle timeline, critical path, independent reveal, urgent accepted progress, fork histories and cleanup. Report median+p90, raw p95/max, and distinguish host acceptance/observer delivery from physical presentation. One bounded balanced minified-production comparison follows consolidated correctness/package/installed proof, with no helper timing or favorable retry.

Hidden effectful sharing, absent control edges, stale code/result reuse, leaked leases/providers, blocked unrelated roots, changed coherent-group semantics or merged fork history falsify the design. Cold/setup/retained-memory, independent-device, quick Linux compatibility and the full host/package/product finish line remain explicit obligations.
