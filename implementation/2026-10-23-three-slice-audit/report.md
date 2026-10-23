# Original-plan audit of the three architecture slices

The cleanup slice is delivered. The realtime slice delivers immutable batch acceptance and immediate candidate publication, but does **not** complete the original mounted-region execution and retirement work. Dependency orchestration delivers explicit shared demand, revision provenance and independent root reveal; broader automatic dependency discovery remains incomplete. Passing consolidated semantic gates did not establish completion of every original architecture promise.

This corrects the primary's statement that all three slices were implemented and verified. The implementation pass and its gates happened; original-plan completion is partial. Existing gains and passing semantics remain useful.

## Basis and review method

Source audited: `e02135abf` on main, including cleanup `2f4c1c6f4`, realtime `331e34578` and orchestration `dd6339abd`. The original architecture proposal is fixed at `2eb59b9af`; the task plan first appears at `2f4c1c6f4`. The latter's substantive deliverable text is unchanged in current `architecture-slices/plan.md`; only graph status and execution summaries changed. Later slice designs cannot silently replace these original commitments.

A fresh independent `gpt-6-sol` agent at medium reasoning performed a read-only audit. The primary independently inspected the reported schedule, target lookup, recipe, lifecycle, compiler relation and fork-fixture call paths and reviewed the timing protocols. No tests, builds, benchmarks, browser workloads, servers or containers ran for this audit. Existing gate counts below are archived results, not fresh reruns or a new correctness certification. No new runtime defect was established by this source audit.

Contracts: [original proposal](../2026-10-22-architecture-reassessment/proposal.md), [task plan](../2026-10-22-architecture-slices/plan.md), [master guide](../../final-master-plan.md). Later scope: [realtime design](../2026-10-22-realtime-execution/design.md), [dependency design](../2026-10-22-dependency-orchestration/design.md).

## Requirement matrix

| Original commitment | Current source / evidence | Audit status |
| --- | --- | --- |
| P1: remove redundant retained/collection/resource queue wrappers; preserve Store continuation | `src/native_root_work_queue.ts:163`; cleanup commit removes wrappers and migrates callers | Delivered; `enqueueStores` intentionally retained |
| P1: remove unused publish argument and duplicate lease coverage | `2f4c1c6f4` Root/queue diff; Slice1 source review | Delivered within named cleanup |
| V1: retire execution schemas1/2, scalar proof adapters and raw normalization; keep schema3 interpreted fallback | `src/closed_store_execution.ts:50`; deleted scalar proof module and migrated fixtures | Delivered; host schemas are a separate ABI and remain |
| D1: remove standalone synchronous graph and prepare native task relations once per queued operation | Deleted `task_graph_runtime.ts`/sole runners; `src/native_task_transition.ts:220`, `src/native_task_execution.ts:112` | Delivered; later generations reuse prepared definition |
| P2: eligible ordinary one-root public frame uses immediate lifecycle | `src/native_frame_loop.ts:245`, `src/component_state_runtime.ts:2487` | Delivered; uncertain, busy, grouped and opaque work keeps coordination |
| P2: migrate numeric rows into that same publication lifecycle | `src/component_state_runtime.ts:11947`, candidate creation at `:12001` | Delivered on migrated row route; other direct paths remain explicitly unmigrated |
| V2: immutable batch-owned accepted outputs replace verified row-frame adoption | `src/closed_scalar_output.ts:154`, `:208`, `:263`; `src/closed_store_execution.ts:550` | Delivered for eligible batch rows; row arrays and metadata still allocate |
| V2: snapshots/forks pin accepted values without rotating writable buffers, manual release, finalizers or permanent version chains | Immutable page/frame references and materialization in `src/closed_scalar_output.ts:335`; installed saved-snapshot and runtime tests | Implemented within tested routes; one retained row can pin an entire page; retained-memory cost unqualified |
| B2: resolve static Store target/layout execution at mount and execute a transient cut over it | `src/closed_store_execution.ts:484` creates group trie/schedule each cut; `src/vdom_snapshot_runtime.ts:4457` rebuilds key buckets/owner maps before warm hint | **Partial: existing warm mounted hints reused, original mount-lifetime execution not completed** |
| B2: source membership/rebinding, topology, code and lifetime revoke plans; repair affected mounted regions | Narrow scalar attach/detach invalidation at `src/vdom_snapshot_runtime.ts:7390`; numeric stale-token repair at `src/component_state_runtime.ts:11956` | **Partial: no complete Store-region revocation/repair contract found** |
| Retire eligible frame-local stable schedule/facade reconstruction after replacement | Immediate path still creates `StoreRenderTransaction` at `src/component_state_runtime.ts:4610`; schedule at `closed_store_execution.ts:484`; successor recipes at `vdom_snapshot_runtime.ts:4790` | **Partial: deferred queue facade and verified row adoption retired; stable discovery/schedule construction remains** |
| Keep full reader/target sweeps until complete revocation coverage; retain per-write/final liveness | `src/vdom_snapshot_runtime.ts:4873`, `:5028`; Root candidate validation | Retained as required; deleting these checks is not the missing B2 implementation |
| Stabilize host writer identity in existing authority and explicitly state write reentry policy | `src/vdom_snapshot_runtime.ts:625` reflects writer descriptors during prep/validation; `src/host_property_contract.ts:8` exposes value/resources/throw policy | Proposal follow-up incomplete. Conservative checks remain safe. Missing a reentry field alone is not proof of incorrect behavior; no particular field representation was required |
| C3: same-revision task provenance with hard/control metadata and opaque boundaries | Rust `main.rs:535`, `:610`; `src/async_task_plan.ts:95`; execution revision guard `native_task_execution.ts:130` | Delivered for supported literal Map reads; unsupported dynamic/alias reads rejected |
| Typed invalidation/control and candidate discovery integrated with wider source→derived→sink authority | Scheduler `src/async_task_scheduler.ts:61` consumes combined `dependsOn`; hard/control fields validated/copied; discovery is a metadata marker | **Partial broader architecture**. External-input versus task scheduling already works; absence of separate algorithms is not itself a bug. Automatic dynamic read discovery/control rediscovery is not supplied by the marker |
| D3: explicit pure sharing by compatible scope/input/code and provider-owned in-flight leases/last-owner abort | `src/async_task_demand.ts:115`, `:131`, `:195`; `src/native_task_execution.ts` demand bindings | Delivered through explicit author definitions/captures; purity is an author contract, not inferred callback purity |
| R3: known-key siblings overlap, unknown keys respect hard prerequisites; completed unaffected outputs reused | Existing ready frontier `src/async_task_scheduler.ts:240`; reuse `src/native_task_transition.ts:617` plus new provenance guard | Delivered/reused; this is asynchronous overlap, not CPU worker parallelism |
| R3: unrelated ready outputs progress; explicit transactions define coherence | `src/native_task_transition.ts:223`, `:355` splits independent requests into coherent per-root children | Delivered for separate roots. General independent branches within one whole-tree root remain unsupported; safe mergeable deltas were not delivered |
| R3: forks share transport/results without merging accepted histories | Demand scope supports execution sharing; compiled route `compiler/compiled_dependency_route_test.mjs:101` creates a separate root named `fork` | Mechanisms separately covered; **integrated true fork-history + shared-demand proof not established by this fixture** |
| Clock-only updates do not traverse full loader graph | Separate NativeFrameLoop and task queue call paths; installed urgent-progress proof | Preserved; no new clock→task graph traversal introduced |
| Retire duplicate discovery/preparation and coarse supersession where replaced | Static graph reuse; independent per-root children; explicit replacement keys retained | Partly delivered on migrated paths; no claim of general same-root conflict/delta replacement |
| One consolidated correctness/delivery boundary per slice with failures preserved | Slice1: 1278 Deno /107 Rust /62 compiled; Slice2:1284/107/62; Slice3:1302/108/63, with hash-validated carry-forward | Archived boundaries pass after documented repairs; they do not certify unimplemented original obligations |
| One bounded balanced minified-production comparison per boundary | [Slice1 results](../2026-10-22-architecture-slices/results.md), [Slice2 results](../2026-10-22-realtime-execution/results.md), [Slice3 results](../2026-10-22-dependency-orchestration/results.md) | Performed; parity fails on all three. Slice3 measures a different interaction |
| Loader starts/settles/critical path, urgent progress and reveal compared with equal React knowledge | Slice3 deferred provider traces and urgent accepted-observation timing | Semantic order/reveal and urgent interval measured; no new real-network critical-path advantage established |
| Cold/setup, allocation, retained memory and lifecycle costs | Results explicitly leave matched costs open; resource teardown assertions do pass | Unqualified; passing disposal counts are not a heap/cost result |
| Quick OS compatibility, public host/package delivery | Darwin packages/consumers pass; Linux import/Store smoke passed before later script failure; corrected attempt ran no container | Partial Linux scope; current compiler/provider/host Linux smoke not passed |
| Independent-device and human maintenance evidence before broad superiority claims | Master finish line; zero human participants | Open; neither broad speed nor maintenance superiority established |

## Primary interpretation of independent findings

The highest-confidence missing implementation is B2. The original proposal separates module plans, mounted bindings and transient cuts, explicitly retiring stable schedule/target reconstruction. The later realtime design instead says existing warm plans already reuse preparation and retains per-cut owner lookup. That narrower implementation can be correct and useful while still leaving the original B2 task unfinished. The primary accepts this finding and corrects the completion status.

The compiler finding needs narrower wording than “no DAG integration.” Registered revision validation, external-input invalidation, hard prerequisites, ready scheduling and explicit sharing exist. Hard/control fields being consumed through existing `dependsOn` does not by itself violate the bounded C3 contract. What remains incomplete is the broader automatic source/derived/sink and dynamic control-discovery architecture. Conservative rejection is an honest supported-subset boundary, not unsound discovery.

The fork finding is a missing integrated proof, not proof that shared demand corrupts fork history. The new route fixture constructs independent roots; the execution test named “fork interest” likewise constructs two task executions. Their names cannot substitute for exercising actual root-specific accepted-history behavior with shared demand.

Host write stabilization is unretired proposal work. Existing documentation explicitly allows capture reentry and runtime checks defend writer validity. The audit does not prescribe deleting reflection, adding a redundant registry, or treating a declaration as callback-free proof.

## Timing claim reconciliation

The recorded trajectory improved substantially. It should not have been dismissed merely because parity remains unmet. The exact claim “closed 11ms,” however, is not established by the comparable records reviewed here:

| Record | Native interval | Comparator / qualification |
| --- | --- | --- |
| [21 Oct retained Store clock](../2026-10-21-retained-store-clock/results.md) | Publication median10.70ms, p95 12.90; full callback11.10/13.30 | Canvas2D drawing, React layout adapter over precreated Three objects; fixed order. Not the later declarative R3F/WebGL benchmark |
| [React mechanism diagnostic](../2026-10-22-react-mechanism-research/results.md) | Original Native update medians8.40/6.85ms; throughdraw11.80/9.80; throughdraw p95 13.80/13.60 | Diagnostic episode including an unsound isolated ablation and large control drift; not a product speedup baseline |
| [Before the three slices](../2026-10-22-integrated-store-proofs/results.md) | Dense minified update median2.50–2.60ms/p90 2.80 | Balanced production R3F comparison; React0.60/0.70 |
| [After Slice2](../2026-10-22-realtime-execution/results.md) | Dense minified update median2.30–2.50ms/p90 2.70–2.80 | Same interaction family; React0.60/0.70–0.80. Sole episode, not paired old/new experiment |
| [After Slice3](../2026-10-22-dependency-orchestration/results.md) | Urgent median1.00–1.10ms/p90 1.20–1.40 | Different small interaction while loaders pending, accepted DOM/Three observer included, drawing excluded; React0.20/0.20–0.30 |

10.70→approximately2.40 is an approximately8.30ms reduction in recorded publication/update medians across the broader development trajectory, with changed workloads/protocols. It is not a causal measurement of the three slices. Comparing a historical p95 or draw interval with a current median/update/urgent interval cannot establish an11ms saving. The three-slice dense baseline was already approximately2.55ms. We retain the improvement trajectory and correct the attribution/precision; no new run was necessary for this audit.

## Remaining original work, in dependency order

1. Finish B2's mounted Store execution: identify existing binding authority, define revocation for membership/rebind/topology/code/lifetime, retain necessary live sweeps, and replace per-cut stable grouping/target resolution with affected-region execution/repair. Retire the old eligible construction path rather than adding another version registry.
2. Close the scoped dependency integration/proof gaps: actual root-history sharing with demand, supported control/discovery boundaries, changed-input pruning and independent reveal at the advertised granularity. Keep whole-root guards where whole-tree/cache replacements require them.
3. Evaluate the completed integrated boundary once under the human's cadence, then report remaining parity and lifecycle/memory/conformance limits. No helper timing campaign, automatic container work or speculative physical-layout change follows this audit.

Full master-plan completion remains separate: async UX, host/resource conformance, packaging/portability and lifecycle/cold/memory evidence are still obligations. Independent-device evidence gates broad performance claims; human evidence gates a maintenance-advantage claim.
