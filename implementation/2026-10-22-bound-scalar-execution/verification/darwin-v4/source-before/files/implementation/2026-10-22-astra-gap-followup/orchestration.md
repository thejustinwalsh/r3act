# Sol orchestration: one compiled scalar pipeline, then a separately gated compiler capability

This follows [the source assessment](report.md), not the previous report's now-active ordinary-scalar plan. Base main is `427ef917`; [source-lock.json](source-lock.json) is a mixed review snapshot. The current gate was running during this review; the primary subsequently reported a failed attempt requiring test syntax and route-scope corrections. This document neither verifies those corrections nor claims a current speed result. Finish and record that unit before selecting this candidate. Do not add changes to the running/frozen boundary.

## Unit contract

**Replace:** Root's per-owner flattened input-array construction; re-normalization of those runtime-created arrays in the public evaluator; repeated output tuple/region normalization between the owned evaluator and VDOM. Where the entire interval is passively provable, replace per-cell virtual validation with one fresh canonical instance audit and combined private cut check per phase.

**Authority:** existing normalized component program/execution association; World identity/cells; Store transaction/snapshots/reader histories; Root accepted caches and lifecycle core; the existing scalar-region ownership authority; VDOM mounted target/bucket/journal; host publication domain. Move the scalar-region authority if necessary, never duplicate it.

**Semantics retained:** exact captured acknowledgement; newer writer-time actions pending; old accepted reads during applying; independent/forked/held histories; source/owner/code/writer/hold liveness; retained children/resources and exactly-once cleanup; original callback/write ordering; conservative/manual fallback; whole-root guards for whole replacements; host-failure quarantine. Independent DOM work stays independent; declared coherence still groups required participants.

**Budget:** unknown. Last completed Native update is 3.45/3.90 ms against 0.70/0.90 ms declarative React; the missing 2.75/3.00 ms is not assigned to this mechanism. New request normalization, cut objects and scratch have unmeasured cold/memory cost.

**Falsifier:** the old array/pair copies still execute on successful batch rows; an exported trust boolean or forgeable callback proof appears; a new accepted/version/target registry is created; callbacks move or disappear on conservative inputs; histories/ack/lifetime fail; or the completed comparison still loses. Semantic retention and speed acceptance are separate decisions.

## Freeze these interfaces first

Names below are proposed internal names. Primary records actual names before consumers edit. Keep public barrels unchanged.

### Enclosed computation and owned scalar construction

```ts
prepareOwnedClosedStoreOutputs(world, transaction, orderedRequests)
  // -> readonly OwnedClosedStoreOutputRow[] | null
```

Each request contains an already associated execution, owner, scoped host key and ordered `{store, readerId}` inputs. Do not accept caller-provided state sites, expression callbacks, output names or projection paths as trusted; derive them from the associated normalized program. The entry copies/validates all external request fields and nested containers before capture. It preserves the original order.

Each result carries owner, captured cells/lineage, and a final owned scalar `StorePropDelta`; `region.props` is the one immutable output tuple list consumed by Root and VDOM. No mutable numeric scratch escapes. Retained-child authored/expanded values stay Root's responsibility. Use existing state/Store capture operations and per-reader history staging; no per-owner Store recapture or new Store reader registry.

Inside the operation, allocate one bounded numeric scratch array (the existing input limit is 32), overwrite its complete row length, evaluate through the same existing finite expression logic, and construct primitive output pairs once. A private helper skips public array descriptor normalization only for this internally created scratch. The public `evaluateClosedStoreDataExecution` continues validating arbitrary caller arrays and preserves its behavior.

After capture/evaluation failure, return null with the documented transaction-discard requirement. Root must leave through its existing `SparseCandidateIneligible` cleanup and discard; it cannot retry legacy reading inside a transaction already populated by the batch. No host work occurs in this operation. All existing pre-host/post-host freshness phases still follow.

The scalar-region WeakSet and its normalizing public constructor become one shared authority in the execution module or one approved extraction. The batch's private constructor uses normalized program names/tag and primitive outputs. VDOM imports the ownership query and delegates its existing exported normalizer; the old local WeakSet/normalization implementation disappears. If an extraction is needed, primary names it before dispatch and assigns it solely to B.

### Fresh phase validation

```ts
validateCanonicalClosedPhase(world, ownedCellCut, phase)
  // -> "current" | "stale" | "public-required"
```

It audits only exact privately branded receiver instances and known ordinary canonical prototypes/method descriptors, then uses the combined private cut. `phase` is prepared or after-host; equal-version value equality, incarnation/source identity and newer-version behavior remain exact. No lane/accessor execution; no public trust flag, reusable permit or persistent audit cache. Distinguish unsupported/noncanonical from known stale.

A corresponding enclosed Store phase operation may share the existing canonical class audit and distinct instance checks over the selected transaction snapshots; it retains stamp/root epoch/version/reader checks. Reuse existing internal validation primitives. Do not introduce accepted-unselected-reader batching into this scope.

**Critical integration rule:** this only replaces a whole interval proven passive. Root currently interleaves per-owner code/props/receipt and public World checks. Canonical World alone does not prove that interval. Eligibility needs existing runtime-owned props/rows, registered metadata, selected canonical Store inputs and no resource/unselected-receipt callback. If that cannot be proven without a new persistent provenance registry, retain original public validation. A descriptor walk on uncertain props is not an admissible hidden preflight. No callbacks may be reordered to assemble the batch.

Public-required executes the original public loop/order. Stale rejects, without a public retry. Repeat the phase operation after every public/host boundary. Final private validation remains after the last public callback. This is an operation-local decision, never admission that survives a callback.

## Disjoint implementation assignments

Use only **gpt-6-sol, medium**. Agents author regressions and hand commands to Luna; they execute no tests, builds, benchmarks, browsers, servers or VM. Primary handles review/integration/checkpoint. Do not dispatch until the current unit closes and the new interface contract is recorded.

### Sol A — World and Store phase operations

Own `src/owner_state_world.ts`, `src/owner_state_world_test.ts`, `src/async_store_runtime.ts` and its corresponding tests. Own no Root/VDOM/compiler/execution-module files.

Implement the three-result fresh canonical phase operation, private receiver checks before shape inspection, exact receiver/prototype/method checks, private combined cell validation and optional selected-transaction Store audit. Share existing audit/validation bodies; avoid a second list of canonical methods drifting from capture. Prove the last-external-read boundary. Preserve public methods and subclass/own-method observable fallback.

Required authored cases: own override; subclass override; Proxy receiver; mutated canonical prototype; lane/accessor uncertainty; stale cell/source/incarnation; equal version changed scalar; newer version after host; revoked Store epoch; another callback mutating the canonical methods between phases. No blanket canonical-only rejection of ordinary public candidates. New boxed cut eligibility must not spread to pure-local lane routes.

Retire per-cell virtual resolutions only when C invokes the enclosed operation on its proven interval. No performance claim if C cannot establish that interval. Handoff exact audited methods, fallback semantics, source-based callback trace and commands.

### Sol B — enclosed captured-input execution and single output provenance

Own `src/closed_store_execution.ts`, its tests, and any explicitly approved scalar-ownership extraction. Coordinate type-only imports with C; do not edit Root, World, Store, VDOM or compiler.

Implement the batch operation using existing World/Store capture calls and existing expression evaluation. Derive immutable input arity, paths/state sites and output names once in the existing execution association; do not emit or retain a second semantic plan. Normalize requests before capture. Reuse one local input array across rows; build immutable output pairs and owned regions once. Move the existing scalar-region ownership constructor/query from VDOM under the agreed shared authority. Preserve the general public normalizer/evaluator semantics.

Do not add a JIT, bytecode backend, DAG cache, callback kernel or cross-owner hoisting. This unit contracts the computation-to-output boundary; the larger compiler capability below is a separate selection. Exposing an internal helper that accepts an arbitrary supposedly trusted array is not sufficient.

Required authored cases: forged execution identity; late request getter mutating an earlier input; wrong arity/input order; several readers sharing one Store/path but retaining separate histories; alternating program rows; signed zero; nonfinite output/overflow rejection; mutation of caller containers after normalization; output values surviving scratch reuse; mixed/legacy input decline. Test behaviors and stored values, not just an internal flag.

Handoff the exact lost per-row allocations/descriptor-copy call sites, alias/lifetime proof, failure/discard protocol and commands.

### Sol C — Root/VDOM integration of the one batch

Own `src/component_state_runtime.ts`, its tests, `src/closed_store_numeric_kernel_test.ts`, `src/vdom_snapshot_runtime.ts` and scalar-delta tests. This deliberately owns both sides of the output handoff to avoid split edits to the same contract. Own no A/B/compiler files.

Wait for frozen interfaces, then implement in this order:

1. Reuse the ordinary slice's ordered passive rows as requests. Replace its separate passive captures/per-owner `values` allocation/public evaluator/region-normalizer chain with B's enclosed operation. Consume `region.props` for required Root accepted elements and pass the same region to VDOM. Keep general/manual/resource/unselected-reader routes in their original order.
2. Remove VDOM's duplicate scalar ownership authority and delegate the existing normalizer to B. Preserve current target discovery, previous-value capture, immutable next props/VNodes, retained children, writer checks and accepted journal. Do not bypass Three property dispatch.
3. Integrate A only where the complete replaced validation interval is demonstrably passive using existing provenance. Preserve every unsupported public sequence. Recheck after callbacks/host work; do not reuse canonicality across them. If ownership proof is missing, keep the public loop and state that this sub-contraction was not delivered rather than broadening trust.
4. Release ordered requests, results, captured cuts and scratch references on decline/discard/success/failure/disposal through the same lifecycle core. No second immediate commit engine. Keep public delayed/group facade semantics.

Required authored cases: exact alternating row/prop/write order; stale code; own/public World override invokes its callback at the old position; callback in later owner invalidates earlier input; retained child identity; local+Store reentry; held/unselected mixed route; failure on second writer; disposal during writer; public delayed candidate and group peer revocation; generic fallback after failed capture without retaining partial observations.

Retire named old calls, not their semantic obligations. Handoff before/after successful and conservative traces, callback barrier table, release paths and commands.

## Primary integration and compiler decision

Primary owns actual compiler fixtures, runner/proof assertions and documentation. Review the combined ownership move before releasing C. Inspect every callback/descriptor boundary and every old constructor that should disappear. No production/workload edits during an executing gate.

For this unit, compiler output remains the existing finite host program plus owned-data marker. Verify actual Rust/OXC transforms, renamed primitive marker controls, unsupported arithmetic/children/resource controls and stale revision behavior. Do not add duplicate emitted fields merely to call this a compiler change. The compiler already supplies the substantive whole-owner/input/sink proof; this migration finally carries that proof through the runtime output boundary.

The public source/interface contract must state that the runtime evaluator is still recursive. This unit does not fulfill all compiler execution goals or guarantee realtime superiority. If a larger compiler execution capability is explicitly selected later, use the following finite follow-on rather than another arithmetic helper loop:

- Compiler Sol owns `numeric_expression_dag.rs`, `store_numeric_kernel.rs`, relevant `main.rs` emission and Rust tests: factor shared finite structural graph construction, emit versioned topological data nodes and sink indices from that same graph, retain signed-zero/grouping/operator semantics and bounded limits.
- Runtime Sol owns `closed_store_execution.ts`, `closed_numeric_expression.ts` and tests: normalize once, prove exact correspondence to host metadata, retain in the existing association and execute normalized nodes in the existing evaluator; selected recursive route disappears. No emitted callback trust or new mutable registry.
- Integration Sol owns Root and actual compiled fixtures only: preserve ordered row/input/sink mappings and stale-revision/fallback behavior; no host changes or owner reorder. Primary reserves any overlapping fixture ownership before dispatch.

These three later assignments are not authorized to start by this document. Their prerequisites are current-unit closure, an explicit primary/human scope selection and an independently reviewed concrete data ABI. They recover CSE/prelowering, not JS inlining. Cold/bundle/normalization and runtime indexing costs must be reported. Cross-owner hoisting and arbitrary-function purity are excluded. There is no forecast that this later capability alone removes the remaining gap.

## Luna boundary and finite stopping rule

Luna remains idle during new implementation. After primary reviews and freezes exact source, run one consolidated frozen correctness gate covering runtime, actual compiler fixtures, packages, Three/lifetime and retention, including the authored regressions. Preserve actual failed attempts. Then build fresh installed packages and run the existing untimed four-arm proof. Prove actual selected route and compiler transforms, values/pixels, retained owner/child/resource identity, exact old/new action behavior and 512 exactly-once resource disposals per arm. Route counts are not phase timing.

Only after proof review run **one** bounded unchanged Native → declarative React → R3F useFrame → imperative comparison, 12 warmup / 60 measured, existing common draw/readback. Keep authored arithmetic, object/resource counts, renderer flags and comparator source bytes fixed. Use the required Portless skill before any server; headless, interruptible, no focus, owned cleanup, no VM. Timing assets omit diagnostic counters.

Record median/p95 update, through-draw and state age; source/asset identities, failures and cleanup; no causal saving from historic episodes, no phase attribution, matched cold/memory or independent-device claim. If parity fails, close the unit with that negative result. Do not automatically start the larger compiler capability, add counters, change the comparator or repeat timing until favorable. Full product/HMR/structural/reveal/lifecycle/maintenance requirements remain open.
