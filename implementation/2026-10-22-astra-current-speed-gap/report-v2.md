# Execute a captured Store frame as a compiled batch

22 October 2026. Successor to [report.md](report.md), which proposed the now-delivered compact output representation. **Select one integrated compiler-to-capture batch migration, conditional on primary accepting the interfaces below.** Replace per-owner numeric argument gathering and function dispatch with verified same-thread batch execution; make its input and final-output ownership explicit so it also retires the surrounding adapter copies. Do not implement only shared multiplications, another cache, or another validation shortcut.

This is a source-grounded candidate, not a demonstrated explanation for the remaining milliseconds or a promise of parity. The current owned-frame transaction has completed its boundary and still loses. The requested new review therefore has a concrete next decision to make; it does not automatically authorize an unlimited chain of arithmetic backends. [orchestration-v2.md](orchestration-v2.md) defines three disjoint Sol-medium packets and one final evaluation. [source-basis-v2.json](source-basis-v2.json) records inspected files and limits. Earlier reports remain untouched.

I reviewed the worktree at initial HEAD `99dac2cf65da60f7266df4523fc7deb10079cf10` with the completed owned-frame edits; primary then committed that unchanged product source as `5b9daa048a71503f117513eef859822aad3864c1`. No product source, tests, builds, benchmarks, browser workloads, servers or agents were executed or changed by this review. The evidence-first skill governs the claims below.

## Current result and the apples/oranges question

The [owned-frame boundary](../2026-10-22-owned-frame-transaction/results.md) passes 78/78 consolidated phases, 1,270 Deno tests, 105 Rust tests, 58 actual compiled fixtures, six-context installed delivery and the owned Portless HMR lifecycle. Installed proof records 12,407 matching source checks, matching output/pixels/retained identities and 512 exactly-once disposals per context. Normal Native frames use 257 direct reader rows, zero generic reader materializations, one producer World cut, one full admitted pre-write scan and one full final target scan. The original two buckets/257 linear member/index/lookup visits remain. These are mechanism facts, not phase-time attribution.

The sole unchanged fixed-order 12-warmup/60-measured comparison is:

| Median / p95, ms | Native | Declarative React Compiler/R3F | R3F useFrame | Imperative |
| --- | ---: | ---: | ---: | ---: |
| Update | 2.40 / 2.90 | 0.95 / 1.80 | 3.60 / 4.20 | 0.10 / 0.40 |
| Through common draw/readback | 5.00 / 6.10 | 4.20 / 6.40 | 6.40 / 7.50 | 4.90 / 6.90 |

Native misses update median/p95 and through-draw median; through-draw p95 passes. The update distances are 1.45 ms median and 1.10 ms p95, or 60.4% and 37.9% of Native's respective interval if this React denominator were held fixed. These are target distances, **not removable budgets**. The roughly 0.1-ms timer quantum, dependent samples, fixed order and one device limit the inference. Native maxima of 9.9-ms update and 14-ms through-draw remain in the raw data. Different earlier episodes do not establish causal progress or regression. Through-draw includes shared inspection, draw, readback/allocation and checksum; it is not presentation or an input-to-photon measurement.

The human's comparison concern is partly right: the runtimes do not provide identical transaction contracts. Native retains chronological action cutoffs, root-specific accepted input histories, forks, resource holds, arbitrary-host reentry and failed-publication snapshots. React's clock is a frozen `{phase, epoch}` snapshot with a listener Set and `useSyncExternalStore`. The current interaction does not exercise most of Native's additional guarantees during timing. They have costs, and those costs must be made small on the ordinary path. We cannot delete them and retain the same API.

But this is **not a discovered invalid comparator**. Both declarative arms own the same scene/resources, independent local controls and 256 motion owners plus marker; both deliver the same changing scalar outputs before the common draw. Both perform declarative host updates and retain child/resource identity. React actually subscribes each motion owner; `flushSync` includes its reconciliation. The generated `_c(8)` Position/Rotation functions memoize activation closures and children but recompute all three changing expressions. The generated marker uses `_c(2)`. R3F's real `commitUpdate` validates, diffs props, replaces its prop snapshot and applies changed props. It is not a hidden imperative layout-effect adapter. Native already skips the owner component bodies and ordinary output materialization on this path. Missing React-style memoization is therefore not the current diagnosis.

The useFrame arm measures pinned R3F scheduler advance plus ref writes, not React reconciliation per callback. Imperative has still fewer obligations. Neither replaces the faster declarative comparator or proves an identical-contract floor. Keep the four arms and honest labels. Do not force Native's transaction implementation into React merely to make the totals closer.

The primary product remains normal declarative RAF/canvas/Three authoring. Independent DOM and canvas roots may publish at independent cadences. Only explicit coherent groups impose a shared accepted cut; ancestry or a shared Store must not invent visual atomicity. This proposal changes no scheduler or coherence policy. Same-thread DAG batching is appropriate here; workers would add communication and stale-result work around tiny arithmetic while the host still runs on the owning thread.

## Advice that is now obsolete

The previous compact-output report is implemented: one immutable scalar image is shared by Root and mounted VDOM, ordinary views are explicit, saved snapshots preserve historical values, and warm ordinary elements/prop objects are absent. The capture-contraction successor removes throwaway warm input records and intermediate frame copies. The architectural successor is also implemented: transaction-owned direct-reader storage promotes only when needed; World produces the authentic captured cut; the owned immediate VDOM entry removes empty composite adapters and redundant whole-target traversals while retaining full admitted/final checks and per-write guards.

Earlier fixes also remain: linear candidate bucket indexing instead of quadratic peer proofs, schema-2 verified arithmetic, bound request reuse, distinct Store/path projection reuse, no empty direct selector maps, deduplicated ancestor invalidation, one lifecycle core and generic Store progress alongside the clock. HMR now passes source invalidation/full reload/new realm/remount and disposal; it is not granular state-preserving HMR.

**Do not dispatch those changes again.** In particular, the current selected path has two complete VDOM target sweeps, not the six listed in the prior report. Two sweeps are not two total runtime passes. Root membership/code/input checks, captures, construction, equality, per-write checks, accepted history and publication still do work.

## What remains in actual source

`prepareOwnedClosedStoreOutputs` still treats the selected frame as an ordered collection of scalar invocations. Root makes an ordinary array of bound requests. The producer descriptor-copies that outer array, unwraps each request, maps World requests and flattens Store projection requests. Both World and Store wrappers descriptor-enumerate these privately assembled outer arrays again. Canonical Store capture already deduplicates Store snapshots and projection values, but returns an array with one projection-result reference for each request. The producer then walks every owner, copies shared Store values and local values into reused scalar scratch, resets numeric output scratch, invokes `Reflect.apply(proof.kernel, undefined, [values, outputs])`, and captures the results into a final immutable frame. Each row's frozen output descriptor then feeds Root and VDOM.

World's current capture correctly creates lineage, handles, cell rows and one authentic cell cut. Store's current capture correctly creates one snapshot per Store and distinct direct reader rows for accepted-history staging. **Those semantics and their authorities remain.** The new opportunity is the conversion around them and the unit of compiled evaluation, not another replacement of the histories.

Specifically, `_readOwnedClosedProjectionBatch` already caches the actual numeric projection arrays by Store and owned path identity. Its `result.push(values)` repeats references, not fresh numeric arrays per reader. This plan retires that outer result-reference array and subsequent mixed-input gather; it does not claim to remove 257 independently allocated projection-value arrays.

The current compiler in `store_numeric_kernel.rs::emit` emits schema 2 with `(inputs, outputs) => ...` for one owner. `numeric_expression_dag::lower_scalar_buffers` shares repeated expression trees within that invocation. It does not distinguish shared Store inputs from owner-local values across a batch and does not emit a batch loop. Actual Position emits:

```js
outputs[0] = inputs[0] * .01 + inputs[1];
outputs[1] = inputs[0] * .005 + inputs[1] * .5;
outputs[2] = inputs[0] * .0001 + inputs[1] * .01;
```

Rotation uses different phase coefficients with the same input layout. Each is invoked for 128 owners. The Store `phase` is identical within each program's group; local offset is independent even when every measured offset happens to be zero. Therefore phase-only subexpressions can be evaluated once per group, while offset-dependent work stays per row. Do not common local offsets by equal values or reassociate expressions to invent more sharing.

There is already a different `ClosedStoreNumericKernel.executeRange` ABI and Root `flushNumericRun`. It consumes row-major duplicated inputs, returns flat output scratch, reconstructs prop tuples and calls the generic leaf staging route. Its normalizer excludes schema 5, and it is not the selected privately verified owned-data route; Root's passive eligibility explicitly excludes legacy numeric kernels. Reusing that path as-is would revive work already removed. The proposal extends the **current owned execution ABI** with a verified batch form, reusing its normalized expressions, proof discipline, frames and publication. It is not a new interpreter or a second runtime history system.

No additional N-squared defect was found in this fixed single-clock route. Whole-reader selection/currentness scans and per-target publication remain linear work with meaningful constants. This report assigns them no phase share and proposes no fresh-status cache, global dependency registry, unchecked writer or additional traversal layout. The fixed scene requires up to 769 changed host writes; those do not disappear through compiler fusion.

## Selected end state and deletion boundary

The new path is:

`Root selection → sealed owned request batch → one canonical Store/World capture schedule → groups of shared Store inputs and varying local inputs → one verified batch call per group writing final row arrays → same frames/Root rows/VDOM targets → existing admission, ordered host writes and accepted publication`.

For the unchanged scene, source structure predicts three evaluation groups: marker, Position and Rotation. There are still 257 independent readers, frames and owner histories. There are still two key buckets, 769 changing host writes and the existing full live checks. Three calls are an expectation to prove, not a speed estimate.

### 1. Owned candidate input schedule

Root appends current bound output requests to a privately authentic sealed batch while selecting rows. It does not pass a caller array and mark it trusted. The builder accepts authentic bound capabilities; if a row cannot be bound, use the existing defensive route before any host application. Ordinary supplied-array APIs remain defensive, including descriptor/Proxy behavior. A batch is ephemeral candidate input, not a persistent plan/identity/version registry.

Unwrap each request once into one owned schedule with original ordinal, normalized execution, bound World request and ordered Store reader/path bindings. Build candidate-local evaluation groups by **exact normalized execution identity and ordered actual Store/path bindings within this one transaction/root capture**. Equal numeric values, Store head numbers, source names or component text are insufficient. Distinct roots/transactions never share a captured group. The execution identity includes module revision and layout; exact bound Store identities distinguish controls and multiple clocks.

World/Store internal capture entries consume the schedule's authentic private columns, avoiding their public outer-array descriptor adapters. Preserve all canonical instance/prototype/method audits and their callback boundaries. Do not bypass a public override that the existing path observes. A failed audit selects public-required on the same captured transaction where applicable; no partial host writes occur during preparation. Passive projection extraction remains restricted to the current runtime-owned immutable data protocol, never arbitrary frozen records or getters.

Store still captures each distinct Store once and stages each reader independently in the existing owned-direct transaction mode. It produces each group's shared numeric vector once, rather than an owner-sized result-reference array later gathered into scalar scratch. World still captures every required local cell, lineage and cut under its existing authority; fill the group's varying input columns during that capture rather than gathering the same local values into a second mixed-input scratch. Dependency reads and exact dirty acknowledgements remain distinct.

### 2. Verified compiler batch form

Execution schema 3 adds `batchKernel(sharedInputs, varyingInputs, outputs, rowCount)` to the existing owned-data identity. Derive shared count from the host program's Store projection paths and varying count from local state sites; do not trust redundant compiler-declared counts. New compiled modules emit this form alone where eligible. Old schema 1/2 and legacy range callers remain supported; a rejected/missing batch proof uses the current safe interpreted compatibility route. Do not emit both a scalar kernel and a batch kernel for every new component.

This is `closedStoreExecution.schemaVersion: 3`, whose current namespace contains 1/2. It does not renumber `closedStoreHostProgram` schemas 1–7, including its existing schema 3, or legacy `ClosedStoreNumericKernel.schemaVersion: 1`. Mixed old/new execution rows capture one cut and retain their respective verified/interpreted compatibility behavior. Empty groups execute no kernel; an empty selected batch keeps the existing no-candidate behavior. A batch-proof rejection never executes the rejected function. Preparation failure may decline before host application through the existing candidate-discard/generic fallback; it must not recapture a newer head inside an already captured transaction. After host application begins, only the existing same-cut completion/quarantine rules apply, never replay or re-evaluation.

Extend the existing numeric DAG lowering to classify expression nodes by their input dependencies. Hoist maximal nontrivial Store-only trees outside a single bounded row loop and share structurally identical trees. Preserve exact operator trees, left/right order and floating-point grouping. Inside the loop, varying slot `j` means the original input slot `sharedCount + j` for that row. Outputs address the final full prop index, including the marker's numeric slot after its constant name.

The verifier proves the actual function source, including loop shape and addressing, against the same normalized host expressions. Accept one induction variable initialized to zero, strict `< rowCount`, unit increment, fixed compile-known strides/indices and complete exactly-once numeric output assignments. Uniform declarations may use shared inputs/literals only; row declarations may additionally use that row's varying inputs. No calls, property traversal, closures, dynamic indexing, mutation of inputs, early exits, nested loops, unsupported control flow or output-dependent expressions. Keep finite source/token/node/depth/local/slot limits and a runtime row bound. Alpha renaming and specifically reviewed equivalent minifier syntax may normalize; arbitrary JavaScript equivalence is out of scope.

A proof is a privately authentic immutable capability associated with the existing normalized execution facts. Do not accept a structural `{kind:'verified'}` object or compiler boolean. No eval/new Function, WASM backend, worker or second plan registry.

### 3. Final output ownership, without another copy

The existing scalar-frame authority allocates each row's **final** private full-width value array before the verified batch call, initializing owned numeric properties and literal slots. The verified function receives only producer-owned numeric input buffers and those private row arrays. After execution, validate every required final numeric slot as finite, validate constants with Object.is, freeze the arrays and create frames by private adoption. Neither caller arrays nor reusable scratch can be adopted. The input/output capabilities must not let arbitrary callers inject accessors into the passive interval.

This removes the verified path's per-row output scratch reset and scratch-to-frame transfer. Each frame retains only its own immutable values and layout, not the outer output matrix, other owners, a previous frame, Root, a mounted handle or a callback. Once frames are produced, discard candidate scratch/groups. Retaining one old owner image must not pin every image in its batch.

NaN/nonfinite **inputs and final outputs** retain current rejection behavior. Do not newly reject nonfinite intermediate arithmetic when the exact complete expression yields a finite result, for example an overflowing intermediate used in a reciprocal. Signed zero, exponent associativity and bitwise coercions retain JavaScript semantics. Literal `undefined`/unsupported aggregate shapes remain governed by current admission; do not enlarge the scalar language while adding batching.

Return rows in original selection order even if pure computation groups noncontiguous alternating owners. Root and VDOM stage/apply in that original order. Host calls, equality decisions, per-write guards, snapshots during application, quarantine, exact acknowledgement, newer reentrant actions, fork histories, resource disposal and generic progress remain unchanged. No host calls occur inside the compiler batch loop.

## Why this is a finite architectural slice

The selected internal route must delete all of these together: Root's ordinary request-array adapter; producer outer-array descriptor normalization; copied World/projection outer-request arrays; owner-sized projection-result reference output; per-owner combined Store/local scratch gather; per-owner verified function dispatch; output scratch reset and transfer into frames. It adds one authentic candidate schedule/grouping step, column fill and verified batch dispatch. Canonical capture, live validation, distinct histories, final per-owner immutable frames and ordinary publication remain.

If an implementation only adds a batch function while retaining all gathers/copies or calls it once per owner, it has not delivered this slice. Conversely this is not permission to overhaul live-reader membership, eliminate Root phase scans, restructure retained VDOM storage or cache validation across frames. There is one proposed migration and one evaluation, not three performance subprojects.

The new costs are real: loop-proof parsing and generated source, cold group layout metadata, per-candidate grouping/row remapping, varying columns, output matrix headers, input/output capability bookkeeping and JS-engine shape/JIT effects. Small groups and heterogeneous clocks can lose. A fully heterogeneous frame may have one group per owner; it still must be correct. Uniform phase multiplication savings are tiny in this fixture, so **hoisting alone is not a credible explanation for closing a 1.45-ms median gap**. Whether retiring the integrated adapters pays for the new machinery is unknown.

The current compiler also lacks general arbitrary helper-call/Math-call/alias/effect analysis; the scalar language here is bounded arithmetic. That limits broader animation coverage but does not explain this fixture, which is already fully selected. Do not widen Math/global semantics or add another benchmark as an unmeasured rescue inside this slice.

## Acceptance and stop condition

Primary reviews the exact contracts, provenance, fallback and source deletion before implementation release. Sol medium authors three disjoint packets; Luna stays idle until the whole slice is integrated. The final boundary uses one consolidated gate, current installed baseline/minified/rebundled CSP proof, the existing HMR lifecycle and one unchanged four-arm comparison. Keep all old assertions and failure artifacts. Add only essential batch-selection and ownership checks to untimed proof; no helper timing or phase-diagnostic prerequisite.

Semantic rejection conditions include input aliasing by value, wrong root history, arbitrary/public arrays entering the passive loop, a forged proof, different floating-point grouping, row or host order changes, stale source/code admission, mutated old snapshots, retaining whole batches through frames, lost newer actions, starvation of generic work, bypassed writer checks or resource leaks. Failure of any one blocks acceptance.

Mechanism proof must observe three batch calls/257 rows on the unchanged scene, no scalar kernel calls on its selected new route, no per-row mixed-input gather and no output scratch transfer, while preserving existing history/cut/materialization/target-sweep counters and positive explicit observation controls. Static emitted-source checks prove the shared computations are outside the row loop. Counts are not milliseconds or allocated bytes.

Parity still requires all four Native update/through-draw median/p95 comparisons no worse than same-run declarative React. If semantics and batch mechanism pass but parity fails, record **compiled batch delivery PASS / realtime parity FAIL** and close this candidate. No automatic threshold tuning, alternate buffer layout, writer specialization or further helper series follows. Full master-plan structural/async UX, cold/retained-memory, independent-device, host/package and honest maintenance obligations remain open. Historical dense loss, exhausted Recording A/physical HOLD, narrow Snake wins and zero human maintenance participants retain their scope.
