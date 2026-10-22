# Data-owned Store execution and passive capture

Base main 5fe544459e2842622064289fef8b1663ee62ca68, MIT. Primary read the complete master guide, current source and the full Astra [contract](../2026-10-22-owned-execution-review/report.md) and [orchestration](../2026-10-22-owned-execution-review/orchestration.md) before selection. The preceding four-arm unit is complete and committed, with Native parity FAIL. This is a new semantic execution capability, not another cache in the closed contraction slice or a physical redesign. No measured speed budget or benefit is approved.

## Replaced mechanism and authority

For a separately declared data-only execution arm, retire per-owner supplied executable callbacks, their output-buffer/count/extent checks, and per-reader canonical Store audits only inside one fully passive capture operation. Reuse the existing normalized expression evaluator, owned projection paths/memo, World cell identity, Store snapshots/reader history, cache records, scalar VDOM deltas and publication receipts. No new opcode graph/interpreter/JIT, physical layout/traversal, persistent canonical-status cache, identity/version/history registry, host writer or VDOM publication route.

Compiler emits an explicit closedStoreExecution marker only for its existing whole-owner-proven numeric leaf/wrapper grammar and the existing empty-child primitive group grammar. It does not emit executeRange for those owners. Raw marker fields are schemaVersion:1, kind:owned-data, componentProgramId and moduleRevision; normalization copies and associates it with the existing normalized host program. The associated expression plan is the sole data authority. Normalized immutable provenance is private, never a public trust boolean. Simultaneous data marker plus kernel metadata is invalid. Schema 7 requires exactly one supported execution arm. Public legacy kernel 1 identity, invocation order, arguments/offsets/buffers, side effects, thrown errors and finite-output guards stay unchanged.

Runtime evaluation preserves Store-path then local-site order, arithmetic grouping, finite checks and Object.is behavior. Schema 7 gains a new internal normalized-data evaluator without silently widening the existing public raw evaluator. The data path may lose emitted DAG CSE/inlining and adds batch normalization/scratch; these costs are explicit and unmeasured. Retained child bodies do not execute. Resource, aggregate, subtree/text and unsupported shapes keep their existing routes.

## Passive segment and fallback

Whole-selection eligibility is established from private registration and owned cache records without executing caller metadata. Any legacy/opaque/resource/unsupported member sends the whole selection through the established original-order route before capture, preserving callback observation order. Data owners can evaluate individually on that conservative route; they do not masquerade as synthetic legacy callbacks. Require fresh Root-created transactions and selected canonical Store inputs; unselected accepted-reader/held preservation stays conservative initially.

World capture rejects Proxy/subclass/noncanonical receivers and instance/prototype overrides before bypassing public methods. Normalize request containers before the last integrity check, then read only private committed owners/cells/lineage, runtime-created handles, exact sources/versions and finite primitive values. A canonical method that reads a caller-shaped handle is not automatically passive. Existing lane/accessor cases without passive provenance may decline.

Store capture consumes all ordered requests in one operation. Normalize/copy all external containers and prove root/options fields before auditing shared AsyncStore prototype and distinct instances. Then use only private snapshot/projection/staging helpers until return: no public beginRender/readClosedProjections recursion, selector/reducer/resource/World callbacks or escaping audit permit. Refactor common capture/staging rather than duplicate state reconstruction/history. Preserve every reader's independent membership, observations, direct history/stamps, discovery/savepoint behavior and cleanup. A failed attempt must not leak interests or replay opaque work. Integrity facts expire on return and do not authorize publication.

Existing owner/code/source/reader/hold checks, overlap rejection, final private group admission, host current-target checks, exact acknowledgements, newer reentry, forked/held history, old accepted reads and partial-failure quarantine remain. Whole-tree/cache replacements retain whole-root guards. No callback check moves across a writer.

## Frozen cross-agent interfaces

A supplies ClosedStoreDataExecution (raw marker), NormalizedClosedStoreDataExecution (private-owned immutable association to host program), normalizeClosedStoreDataExecution(raw, program), and evaluateClosedStoreDataExecution(normalizedExecution, readonlyNumericValues): ClosedStoreHostOutput|null. A may settle internal brand representation but cannot duplicate the expression graph or accept forged normalized values. Numeric leaf/wrapper outputs and empty-child primitive group props use the existing output type.

B supplies module-internal exported functions, without adding barrel APIs:

- captureOwnedClosedWorldInputs(world, requests) where each request has owner:OwnerId and sites:readonly StateSiteId[]. Return aligned readonly rows containing owner, canonical lineage and cells:readonly {handle:StateCellHandle, source:ScalarSource, version:number, value:number}[], or null. Canonical lineage matches existing ownerLineage semantics; it allows C to avoid a public lineage call within passive preparation. No new handles/identity authority.
- readOwnedClosedProjectionBatch(transaction, requests) where each request has store:AnyAsyncStore, readerId:string and paths:readonly(readonly string[])[]. Return aligned readonly numeric projection arrays or null. Only existing branded normalized paths, fresh transaction and supported canonical states qualify. No callback parameter or reusable status token.

A/B announce actual type names promptly; C consumes these functions and shared existing staging/current/publication code. If a signature change is required, agree with primary/teammates before editing another owner's files. Private implementation details are each owner's responsibility; public deep imports must still be safe under hostile receivers and containers.

## Disjoint ownership and integrated boundary

Sol A owns new src/closed_store_execution.ts, src/closed_store_host_program.ts and their tests, compiler/oxc-spike/src/main.rs, store_numeric_kernel.rs and mixed_store_numeric_program.rs as needed, new unit agent-a.md. It does not edit Root/World/Store, existing compiled JS fixtures, package manifests or benchmarks. Retire callback emitter work made unused by selection rather than preserve dead production machinery; legacy runtime compatibility does not require new compiler emission of old callbacks.

Sol B owns src/async_store_runtime.ts, src/owner_state_world.ts, their corresponding tests and new unit agent-b.md; src/owned_store_record.ts only if essential, announced before edit. It supplies a precise last-callback-to-return call graph. No Root/compiler/VDOM/host edits.

Sol C owns src/component_state_runtime.ts, src/component_state_runtime_test.ts, src/closed_store_numeric_kernel_test.ts and agent-c.md; src/native_runtime_api.ts only if essential and announced. It integrates metadata, all-eligible capture, data/legacy/mixed fallback and existing publication, without cloning an independent engine. No World/Store/compiler/VDOM/host edits.

Primary owns actual compiled cross-layer fixture, intentional current compiler-fixture expectation migrations, installed four-arm proof assertions, runner, integration/source review and maintained checkpoint. Preserve manual callback controls and all behavior/lifetime assertions; never replace real emitted-data proof with handwritten metadata. Luna executes nothing during implementation. Agents author meaningful regressions but run no tests/builds/benchmarks/browser/server/VM.

At completion, one consolidated --frozen correctness gate and fresh installed untimed four-arm proof precede one bounded fixed-order comparison under the previous workload/renderer/output/resource contract. Source review must prove actual data-only execution and enclosed passive capture first. No per-helper timings, old-source arm, Recording A resurrection, density sweep, VM/server or favorable timing repeat. Failure preserves evidence and stops publication/timing until repaired. Semantic acceptance and performance acceptance remain separate; another loss closes the slice without a rescue executor/cache. Primary separately reviews retention and unmeasured cold/memory costs. Full product scope and independent-device/HMR/maintenance limits remain.

## Astra high integration review corrections

The human requested a fresh speed-gap deep dive during integration. Source review found and assigned three concrete corrections before verification: deduplicate instance audit by Store, reuse projections by exact Store/path identity inside the batch, and reject direct unnormalized World static entry. Root preflight must also avoid `instanceof` on caller-shaped Store values, and public caller handles retain conservative preparation.

Schema-5 eligibility must describe semantics, not the benchmark's `accepted-frame` name. The amended finite scope is an existing normalized empty-child primitive group whose props are numeric expressions or allowed primitive literals. No literal name/value is privileged; no child, resource or aggregate shape enters the batch. This replaces the original marker-specific restriction above. All changes remain unverified source, with no speed claim.

## Final accepted-state bookkeeping prerequisite

Astra's source review found public World dispatch after Store history advanced in closed-input/cache publication and resource retirement. The correction makes final lineage, exact cell acknowledgement and accepted retirement an internal canonical protocol. Public preparation and validation callbacks remain observable; final private post-host cell validation permits newer versions while retaining the captured acknowledgement cutoff. No public acknowledgement runs early.

Resource retirement shares the existing World destruction body and Root retirement bookkeeping. Public recursive destruction retains its override behavior. The internal operation admits privately checked subtrees with no numeric lanes, since externally reachable NumericColumn storage can invoke callbacks during lane release. Eligibility is checked before host work and after host callbacks; a newly unsupported subtree rejects before accepted histories advance. Generic fallback retains lane retirement. No prototype-walking publication guard, cached trust permit or second lifetime engine is introduced. Source is delivered but unverified; consolidated gate release remains pending integration.
