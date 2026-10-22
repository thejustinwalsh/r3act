# Dispatch plan: current boundary first, one conditional contraction afterward

Read [report.md](report.md). This plan does not dispatch agents or authorize more unmeasured edits into the current compact-output slice. The primary owns review/integration/checkpoint; implementation agents use **gpt-6-sol with medium reasoning** and do not execute tests, typechecks, builds or benchmarks. Luna alone executes consolidated verification after release. No implementation agent edits another packet's files.

## Immediate work: release the already integrated slice

1. Primary reviews C's completed parked-boundary after-host changes in `component_state_runtime.ts`, `realtime_store_progress_test.ts` and `agent-c.md`. Before host, exact old input/control checks must reject stale work. After host, a newer action is allowed only for the same canonical cell/source/reader lifetime; the candidate accepts its old cut, retains newer work and retries later. Resource settlement/replacement, same-Store opaque siblings, reader removal, owner/code retirement and partial failure remain separate cases. Preserve both prior failing gates and their unchanged assertions.
2. Reconcile all A/B/C files, runner registration, installed proof and HMR runner. Freeze product/tests/scripts/consumer **and context documents** together; the previous protocol edit invalidated its own audit. The review manifest here is an observation, not the release manifest. No implementation or documentation edits during Luna's source-locked gate.
3. Release exactly the boundary already described by [compact-scalar-output/protocol.md](../2026-10-22-compact-scalar-output/protocol.md): consolidated correctness, fresh installed six-context untimed proof, full existing continuous-clock workbench/HMR lifecycle, then primary review and one unchanged four-arm comparison. Do not run a special performance experiment for either remaining source finding first.
4. Record correctness, compact mechanism, installed delivery, HMR lifecycle and parity separately. A proof failure is not a speed verdict; a speed loss is not permission to weaken semantics. Current output-source timings cannot inherit the previous 3.05/3.50 ms result.

The reviewed runner command is:

```sh
/Users/mini/.local/share/mise/installs/node/24.18.0/bin/node scripts/verify_native_platform.mjs --output-dir /Volumes/Depot/Developer/r3act/implementation/2026-10-22-compact-scalar-output/verification/darwin-v1 --expected-platform darwin --expected-arch arm64 --execution-kind native-host
```

Luna uses the existing bounded supervisor/toolchain/environment and nonexistent output directory as specified in that protocol, including Deno `--frozen`. Preserve process exits, raw failures and before/after hashes; poll the original process instead of restarting after a tool timeout. HMR requires loading the available Portless guidance first, task-owned HTTPS/process/TLS/route cleanup and exact source restoration. No VM or new architecture matrix.

## Branch decision after the current receipt

| Result | Required action |
| --- | --- |
| Correctness, compact proof or HMR fails | Fix the named semantic/integration failure under primary review, preserve the receipt, then use a fresh consolidated gate. No speculative speed work. |
| All current correctness/proofs pass and update plus through-draw median/p95 each reach same-run declarative parity | Do not dispatch the following contraction as a speed necessity. Continue full-plan lifecycle/cold/memory, broader behavior and independent-device work. |
| Correctness/proofs pass, realtime parity fails | Record compact contraction PASS / parity FAIL. Primary may select the single complete follow-up below as a source-backed deletion hypothesis. There is no speed guarantee or approved phase budget. |

No further user permission is intrinsically required for already authorized implementation; this is an engineering dependency and primary selection boundary, not a request for a new approval ceremony. Do not resurrect the old research freeze or diagnostic recording prerequisites.

## Conditional slice contract

Suggested new unit: `implementation/2026-10-22-owned-scalar-capture-contraction/`, created only after selection. Replace warm temporary Root input records and verified intermediate scalar output arrays. Keep existing input bindings, immutable output layout/frame, World/Store history, candidate and mounted target authorities. The selected mechanism is candidate-local preparation/capture fusion, not a new traversal, cache or publication model.

**Budget:** none has been measured for these passes. Use the eventual compact boundary's same-run Native/React result as the actual target context; do not substitute the old linear-target deficit. Count reductions are a mechanism condition, not milliseconds. Setup/retained-memory costs remain unqualified and must be stated.

**Falsifiers:** warm inputs are still allocated before reuse; an intermediate full output array survives the verified route; added mutable state duplicates source/history authority; a public array is treated as passive without capture; constants/signed zero/snapshots/reentry/forks/writer checks regress; the full unchanged comparison misses parity. The last falsifier closes the speed hypothesis for this candidate even if the deletions themselves are correct.

Primary freezes these seams before implementation:

- Root's `ComponentCache.output.shape.boundInputs` and bound request remain the only reusable input descriptions. Reuse is conditioned on exact current program, owner, host key, cache props, execution, source and membership. No validity flag persists across frames or callbacks.
- The existing immutable scalar layout/execution facts own the verified result mapping. Use the already available proof `numericPropIndices`; it includes numeric literals. A constant prop whose kernel result differs must decline. No second lookup registry or per-frame mapping arrays.
- A named internal frame-capture entry creates one final private array, validates every captured value/constant, freezes it and returns an authentic frame. It cannot retain or expose kernel scratch, accept an adopt-without-copy option, execute a caller callback, or weaken `OwnedScalarFrame.create` for public callers. Internal invocation receives the runtime-created dense numeric scratch only. External/raw array reads, if supported by the helper, occur during capture and never confer a callback-free capability on their caller.
- `prepareOwnedClosedStoreOutputs` keeps its public request-array normalization, bound-request authentication, finite outputs and existing capture order. No unsafe direct array trust, `as Owned` cast, getter-backed props or publication changes.
- All six VDOM validation endpoints and per-write readiness remain. VDOM, Store, World, Three, compiler emitter and lifecycle APIs are outside product edit ownership for this slice.

## Packet A — final-frame capture from verified numeric results

**Model:** gpt-6-sol, medium. **Own:** `src/closed_scalar_output.ts`, `src/closed_store_execution.ts`, `src/closed_scalar_output_test.ts`, `src/closed_store_execution_test.ts`. No other files.

1. Read `evaluateOwnedFrame`, layout creation in `normalizeClosedStoreDataExecution`, `OwnedScalarFrame.create`, and `proveClosedScalarNumericKernel`'s `numericPropIndices`. Retain emitted arithmetic and interpreter compatibility; no compiler change.
2. Normalize a result-index mapping under the existing scalar layout/execution facts at registration. Reuse/replace the currently unused slot mapping if source search confirms no live consumer; otherwise primary reviews the smallest immutable replacement. Do not silently map numeric constants as nonnumeric literals.
3. Add the internal frame capture operation in the frame module. It allocates its private destination once, fills each slot from captured numeric results or the exact literal, checks finite primitive shape/width/constants with `Object.is`, and freezes once. Use captured intrinsics and indexed own-property construction as the current code does; avoid mutable Array iterator/prototype hooks. Never take ownership of caller/scratch arrays.
4. On verified `evaluateOwnedFrame`, retain output scratch initialization and kernel execution, then call direct capture. Delete that branch's intermediate `props` construction and subsequent `OwnedScalarFrame.create` copy. Interpreted/generic callers keep the existing safe entry and tuple adapter. No per-owner callback/function allocation or frame chain.
5. Author focused regressions for 1/32 slots, numeric literals interleaved with null/string/boolean constants, signed zero, finite rejection, malformed index mapping, omitted kernel slots, arbitrary accessor/Proxy input, and old frames after later scratch reuse. Existing forged/prototype/Proxy controls remain. Add only bounded optional counts needed to demonstrate actual direct capture; no timers or reporting subsystem.

Deliver an exact deletion list, retained-graph review and proposed gate coverage. Execute nothing. A may work alongside B once primary approves the helper contract; C reads that contract before authoring integration tests.

## Packet B — warm preflight consumes existing bound records

**Model:** gpt-6-sol, medium. **Own:** `src/component_state_runtime.ts`, `src/native_compact_scalar_output_test.ts`, `src/native_mounted_scalar_plan_test.ts`. Do not edit Store-progress tests or semantics, A's files, Store/World, VDOM or compiler.

1. In `#stageClosedStoreOutputs`, move the pure `ownedShape` helper before passive preflight or extract it without adding a cache. For each eligible owner, attempt exact bound input reuse **before** creating `rowInputs`. Validate each immutable prior record against program input position, current props own descriptor, selected Store, exact live membership object/size/content and execution/binding identity. Continue fresh per-frame checks; do not use accepted cache equality as a substitute for live membership.
2. Only when that binding cannot be reused, construct/freeze the cold input records and bind the request. If cold admission fails, retain the same fallback behavior. Delete the later `priorInputs.every` comparison against newly allocated copies and the assignment that throws those copies away. The candidate row references one input description throughout staging/publication.
3. Reuse the existing `passiveByReader` set as a preparation-local remaining-coverage set: populate selected reader IDs during the initial owner selection scan, delete IDs when their exact inputs are covered, and require it empty at end. No additional persistent or candidate duplicate reader index. Use existing `seen` Store coverage to avoid the separate selected-Store × row nested search if its semantics remain identical. Root's phase-current live reader scans and `covered` meaning remain unchanged. This fusion is confined to the callback-free owned preflight; if an actual callback must intervene, keep the corresponding fresh scan.
4. Keep capture/evaluation order, partial fallback, resource holds, exact notification generation, new parked-boundary semantics, local cells, ancestor control reads, code retirement, per-root snapshots and keyed output materialization unchanged. No publication callback added by instrumentation. Reuse counters should be sourced at actual reuse/allocation sites and folded into existing opt-in counters only.
5. Author warm-reuse then source/props/membership replacement tests, duplicate/extra selected reader controls, same-Store opaque sibling progress, independent roots, generic fallback after compact updates and host-time newer action controls. Existing actual compiled proof must continue to carry ordinary authoring; manual metadata tests are supplementary.

Deliver a source-level call order and deleted allocation/scan list; execute no checks. A warm count must establish no replacement input record allocation, not merely count the final cached identity.

## Packet C — actual compiled integration and failure behavior

**Model:** gpt-6-sol, medium. **Own:** new `compiler/compiled_owned_scalar_capture_test.mjs` and new `src/native_owned_scalar_capture_contract_test.ts`. Do not edit product, prior compiled fixtures, runner, benchmark, or previous failure assertions.

Author one actual Rust/OXC public-import fixture exercising ordinary schema-2 mixed Store/local motion owners and marker with nonnumeric and numeric literal output. Require warm existing input bindings and direct frame capture, while outputs, all saved snapshots and host identities agree. Use independently mounted roots with different accepted cuts; read snapshots during first/second host writes; dispatch a newer Store and local action during application and require a later flush; make a second writer fail and require old accepted history/quarantine. Exercise keyed removal/reinsertion, source replacement, current module retirement, generic observation after multiple compact frames and bounded removed-target collection with roots alive. Reuse the repository's existing harness and bounded GC style.

The Deno fixture concentrates on independent generic Store progress beside a continuously updating closed clock and a parked resource, including unchanged blocked reader versus actionable opaque sibling. Preserve the accepted old cut on host-time changes and eventual wake. Existing Store-progress tests remain the authority and must run unchanged; do not duplicate their entire corpus or weaken assertions to fit the contraction.

Counters, if needed, are observational and disabled in timing. Prove that cold paths still allocate/normalize and explicit observers still materialize, so zero warm counts cannot be achieved by disconnected reporting. Report proposed commands and exact compile/run requirements to primary; execute none.

## Primary integration and deletion review

Primary owns the new unit's design/protocol/source lock, `scripts/verify_native_platform.mjs`, copied installed consumer proof and checkpoint updates. Add C's compiled fixture to the actual runner inventory. Review all A/B edits together against the agreed contracts, including negative paths; reject a builder/cache/fast-path facade that preserves the old arrays underneath. Reject a publicly supplied array accepted as owned because its elements are branded.

The intended deletion inventory is: verified intermediate `props` array and its fill; its second frame transfer; warm preflight `rowInputs`/frozen records subsequently discarded; the warm comparison against those temporary records; one redundant callback-free preparation coverage enumeration. Immutable final images, bound input descriptions, outer public request adapter, phase-specific coverage, candidate buckets, histories, snapshots, target guards and generic oracle remain. No new mutable authority and no dormant legacy optimized fork.

Confirm no source callback crosses the fused Root interval. Review fresh execution/props/membership invalidation and the whole private retained graph. Source review must establish the actual removal before counters can be treated as proof. Cold normalization additions and any retained layout bytes remain disclosed rather than claimed free.

## One integrated Luna boundary for the selected follow-up

There are no per-packet correctness gates or timings. After all source and context files freeze, Luna runs the current consolidated platform runner with the new fixture under the same bounded supervisor, toolchain and `--frozen` policy into the new unit's fresh `verification/darwin-v1`. Preserve failures and source drift; a repair requires source review and a new complete gate, not rewritten receipts or a smaller substitute suite.

After primary review of correctness, use a copied fresh installed consumer under that unit. Keep all four authored arms, scene, expressions, object/resource counts, package pins, timing intervals, fixed order and 12/60 cadence byte-identical except reviewed diagnostics-only proof additions. Use the current compact proof as the mechanism basis and original linear-target workload hashes as the unchanged performance basis. Six untimed contexts retain baseline/default-minified/rebundled Native CSP proof, actual compiler delivery, values/pixels/identity and 512 exact disposals. Require 257 warm frames, zero ordinary unobserved materializations, positive explicit materialization, two bucket builds/257 member/index/lookup visits, no owner rerenders, and direct capture/input-reuse deletion proof. Do not add phase timers or timed delivery variants.

Complete any correctness/HMR obligation capable of changing runtime source before the final timing release. The current full workbench lifecycle already supplies the required continuous-clock regression; repeat it for changed source only as part of this consolidated correctness boundary, with the same owned Portless route and restoration rules.

Primary then releases **one** unchanged four-baseline-arm comparison with diagnostics null. Preserve all raw samples/tails, hashes and cleanup; no favorable repeat. Native update median/p95 and through-draw median/p95 must each be no worse than same-run declarative React Compiler/R3F to report this parity gate passed. A loss is **capture contraction PASS / realtime parity FAIL**, not an invitation to append another optimization. No causal before/after saving, phase/GC/allocation attribution, matched cold/memory, presentation or independent-device qualification follows. Continue full-plan work with the actual evidence limit intact.
