# Realtime gap: retire repeated proof work before adding more syntax

Read-only investigation of `ff95540a7188a4ff2f94ad9ef611b3fcc47b314a`. No product edits, tests, builds, benchmark, browser, profiler, server or VM were run. Static source inspection and arithmetic below are not allocation measurements or phase timings. The associated [orchestration plan](orchestration.md) specifies one integrated implementation boundary.

## Recommendation and ranked findings

Implement one **closed Store preparation and publication contraction** slice. Keep the current row order, buffers, retained VDOM, World, Store histories and publication coordinator. Retire repeated immutable proof, empty selector containers, repeated ancestor patches and duplicate validation inside explicitly callback-free internal steps. Do not implement numeric `props.speed` as the response to this deficit: the current comparator already reaches numeric kernels without component renders.

The first four findings are source-proven mechanisms; their ranking is engineering priority, **not measured milliseconds**.

1. **Canonical Store admission repeatedly reflects over the whole class for the same Store.** `_isClosedNumericCanonical` performs 35 prototype-descriptor comparisons, 35 linear key-membership searches, two key-array allocations and instance shadow checks on every call. The successful locked workload reaches at least **515 calls during owner preparation**, before the later validation calls. That means at least **18,025 descriptor-result objects**, **1,030 key arrays** and **324,450 key-comparison opportunities** in the straightforward unchanged-key-order execution of those `includes` loops. JIT allocation elimination and actual elapsed contribution are unmeasured. The repeated class audit is a much stronger source candidate than the single Store notification.
2. **Immutable projection and host shape are re-proved on every reader/frame.** `captureClosedProjectionValues` re-copies and reflects over already normalized path arrays, and reads the same owned `phase` record path 256 times. Retained leaf staging reflects over two frozen, runtime-owned outputs per motion owner, builds expected-name sets, and reconstructs both authored and expanded outputs. VDOM then reflects/captures the scalar props again. This is expensive-looking normalization around three small arithmetic expressions, not missing component memoization.
3. **The ordinary successful path traverses the same VDOM target footprint eight times for currency checks.** Some are required after callbacks; two are adjacent internal repetitions on a Store-only cut. Root also invokes public candidate validation immediately before `commitHost`, which invokes it again. The safe replacement is explicit internal admission using the existing receipt plus final private checks, not deleting freshness validation from public APIs.
4. **Direct Store reads allocate empty selector histories, and publication repeatedly invalidates shared ancestors.** The 257 direct readers allocate 257 empty pending Maps, then 257 empty accepted-selection Maps. Per-reader history records/stamps remain necessary. Each of 257 owners separately walks its lineage and clones overlapping ancestor caches, although an ancestor needs one invalidation for the cut.
5. **The kernel is not amortized across owners in this interaction.** The observed untimed proof has 256 rows and 256 runs because Position/Rotation alternate. Arithmetic is only three short expressions per row. Changing execution into a bulk kernel does not by itself remove the above work, and reordering public `executeRange` callbacks is not justified.
6. **Host cost exists on both sides.** Native's Three path performs lifetime checks, event/property dispatch, cached resolver lookup, live target resolution, default tracking and equality before scalar assignment. R3F also diffs props, resolves dashed paths and performs Three-specific dispatch. No measurement establishes either writer as the dominant residual. Keep the host implementation in this slice.

The likely explanation is **coordination and proof overhead exceeding the component work avoided**. That is an inference supported by concrete source multiplicities, not a causal attribution of the 4.10 ms.

## Evidence and comparator

The authoritative current evidence is [mixed-input results](../2026-10-22-mixed-numeric-inputs/results.md), [primary source review](../2026-10-22-mixed-numeric-inputs/source-review.md), [final audit](../2026-10-22-mixed-numeric-inputs/verification/final-audit.json), and the `proof-canvas-v2` archive. The corrected consolidated gate records 71/71 phases, 1,137 runtime tests, 99 Rust tests, 51 compiled fixtures and 1,614 runner hashes. That is prior evidence, not a gate run by this investigation.

The current primary is declarative Native versus actual React Compiler + R3F 10.0.0-alpha.6, React 19.3 and Three 0.186.1. Both renderers own matching JSX groups, meshes, BoxGeometry/material resources and their disposal; the harness owns the same external real WebGLRenderer, camera, draw and readPixels observation. All 256 objects retain identity; 512 resources per arm dispose once. Both browser phases match 12,340 hashes and close cleanly. Earlier layout-effect adapters over a precreated scene graph are narrower evidence and do not answer this comparison.

| Interval, median / nearest-rank p95, ms | Native | React Compiler + R3F | Imperative reference |
| --- | ---: | ---: | ---: |
| Publication | 4.10 / 5.30 | 0.60 / 0.80 | 0.10 / 0.20 |
| Update through draw/readback | 6.45 / 8.00 | 2.80 / 3.20 | 2.30 / 2.70 |
| State age at draw | 4.20 / 5.30 | 0.70 / 0.90 | 0.20 / 0.30 |
| RAF interval | 16.70 / 16.70 | 16.70 / 16.70 | 16.70 / 16.70 |

One page per arm, fixed Native → React → imperative order, 12 warmup and 60 measured frames, Chromium 153.0.8010.12 / ANGLE Metal Apple M4. Timed counters are null. These are descriptive observations; neither population tails, causal old/new savings, presentation, matched cold/memory nor independent-device qualification follows. Equal RAF intervals do not mean equal CPU headroom or state freshness. Synchronous pixel readback is included in the draw interval.

The historical qualified dense DOM FAIL and exhausted Recording A remain unchanged. No new dense causal-control recording or physical container selection is proposed. The later human cadence authorizes a semantic integrated implementation slice followed by consolidated gates; it does not supply missing phase budgets.

### What the actual React Compiler does

Read [the archived React transform](../2026-10-22-mixed-numeric-inputs/proof-canvas-v2/transforms/react/react.tsx.js): Position and Rotation each use `_c(8)`. Slots 0–2 retain the control-registration effect closure/dependency array when `id` is unchanged. Three arithmetic expressions execute from `frame.phase` and local `offset`; slots 3–7 compare `children` and the three numbers and reuse or replace the group JSX. On changing phase the three numbers change, so that group JSX is recreated. FrameMarker uses `_c(2)`. App's `_c(2)` retains its static element tree, including the authored mesh/resource children. There is no demonstrated whole-scene arithmetic fusion, vectorization, or automatic imperative useFrame conversion.

React has 257 external-store hook subscriptions. The application clock publishes one frozen snapshot and invokes those listeners inside public `flushSync`. Native's canonical Store subscription is **one per Store per Root**, installed in `#reconcileStoreSubscriptions`; dispatch is not 257 Root notifications. Native then discovers and stages 257 reader outputs. This difference directly argues against declaring fanout notification the measured bottleneck.

The actual R3F `commitUpdate` in the archived upstream source validates instance/args, computes `diffProps`, replaces its instance prop snapshot and calls `applyProps` only when changed props exist. The **served** React asset `dist/react/assets/react-DWlubxoR.js:3541` shows that `diffProps` itself has a small nested prop scan; R3F is not free of allocation or quadratic-in-prop-count work. At 3559, `applyProps` resolves targets and assigns/copies Three values. It does not perform Native's per-root Store accepted-history transaction or repeated full canonical-Store prototype audit. This workload does not exercise forks, held inputs or explicit cross-root groups in the React clock. Those extra Native contracts are real costs, but they do not require re-normalizing unchanged immutable path/host shapes per reader.

An idiomatic R3F `useFrame` mutation baseline remains separately necessary for broad realtime superiority. Do not substitute it for the fair declarative comparison, or quietly combine its different authoring obligations with this table.

## End-to-end source trace and work counts

Current line anchors refer to the SHA above. The source hashes are in [source-lock.json](source-lock.json).

| Seam | Current work and authority |
| --- | --- |
| `src/async_store_runtime.ts:527` `dispatch`; 1011–1071 notification drain | Reducer, chronological entry/root-version update, one Root notification for this clock, log compaction. Reentrant delivery captures root projections before callbacks. Preserve this ordering. |
| `src/component_state_runtime.ts:4887` `flush`; 5772 `#tryFlushClosedStores` | Enter existing host domain, classify pending work, select unheld Stores, prepare one complete cut. Native mixed-cell scratch is already reused; do not restore the regressed unconditional generic capture. |
| Root 3376 `#prepareClosedInputCandidate`; 2843 `#stageClosedStoreOutputs` | Collect owned local cells and Store read footprints, ensure complete consumer coverage, gather numeric inputs, run contiguous programs, stage StorePropDeltas and cache replacements. Root/World incarnation, source identity/version and existing membership remain authoritative. |
| `src/async_store_runtime.ts:1529` `readClosedProjections` | One pinned snapshot per Store, but repeated path capture and canonical audits, plus a Set, pending empty Map and observation record per reader. Root history is not Store head state. |
| Root 3083 `flushNumericRun`; 2978 `stageLeaf` | Fill numeric output slots with NaN; run callback; check returned count, array extent, own slots and finite outputs; allocate frozen prop tuples; reflect/copy retained output elements. Generated kernel association is validated at registration, but the function is still a public callback. |
| `src/vdom_snapshot_runtime.ts:3998` `prepareStorePropDelta` | Resolve a key bucket once per cut, map owner-qualified nodes, validate retained topology, copy props, create writes and next VNodes, capture exact mounted handles/parents/children. Repeated raw-key lookup was already fixed; do not claim per-target bucket construction is quadratic. |
| VDOM 3456 scoped program; Root 3572 lifecycle | Public preparation/admission, private live admission for groups, serialized host application, post-host public preparation, final private checks, accepted publication and effects. Arbitrary writer effects require the checks around callback boundaries. |
| `src/async_store_runtime.ts:1657` / 904 / 1689 | Prepare per-reader history, validate again after fallible public preparation, then install existing accepted histories through canonical map operations. |
| Root 3333 / 3498; VDOM 4273 / 1709 | Apply scalar writes using captured writer; journal old accepted nodes; swap VNode/cache/history records; exact cell acknowledgements and version advance; release candidate artifacts/barriers after effects. No accepted history may advance on a partial host failure. |

### Defensible count model for this one workload

Let `R=257` readers/owners/targets, `M=256` motion owners, `S=1` Store, `P=35` AsyncStore public prototype keys, and `W=769` changing scalar props (three per motion owner plus the marker). The static `name` prop adds one staged unchanged prop. Counts assume the successful complete first-attempt route, no reentry and no fallback. Other workloads can have more work.

* **515 canonical audits before stage-end validation:** `M=256` Root numeric-kernel eligibility checks at 3233, `R=257` transaction checks at 1551, and two first-snapshot checks at 426/445. FrameMarker is schema 5 and has no numeric kernel, so it does not perform the Root eligibility audit. Later snapshot/lifecycle checks add more. An additional unselected-Store receipt can add still more audits in mixed/held cases; it is absent from this ordinary clock update.
* Each unchanged audit's `includes` searches visit positions 1 through 35: `35×36/2=630`; `515×630=324,450`. There are `515×35=18,025` own-descriptor results and `515×2=1,030` key arrays. This is **O(R·P²)** for that implementation, not O(R²) reader coverage. P is a fixed class-size constant today. Do not report these as measured allocations.
* **257 projection captures**, with separate normalized path identities for marker epoch, Position phase and Rotation phase. A per-transaction snapshot/normalized-plan memo needs at most **three** projection captures here. Two distinct semantic paths do not imply two pointer identities; no global interning registry is needed.
* **257 pending empty selection Maps + 257 copied accepted empty Maps**, in addition to 257 reader-history objects, reader membership Sets and observation records. Eliminate the empty Maps, not the per-reader accepted stamps and receipts.
* The 256 retained wrappers create **at least 512 runtime element copies**. Their `Object.getOwnPropertyDescriptors` calls alone create 512 descriptor maps over key/children/three values/owner symbol, before VDOM's descriptor work. Two accepted representations can legitimately differ: authored children versus expanded children. Retire reflection and intermediate props objects; do not assume the two representations can be merged.
* **Eight VDOM currency scans** on the ordinary successful Store-only route: (1) end of prepareStorePropDelta, (2) end of prepareScopedKeyedRetainedAndStoreDeltas, (3) outer complete.validate, (4) commitHost's candidate.validate, (5) scoped program.commit guard, (6) applyStorePropDelta guard, (7) post-host validation, (8) final private publication validation. Each scans key-bucket membership and targets, including retained-child checks. That is 2,056 target visits and, for this exact footprint, 2,056 bucket-member visits, plus preparation, application checks and writes. It does not mean all eight scans are removable.
* Root's closed-owner `current` is reached five times in the straightforward ordinary route: stage finish, outer validate, commitHost validate, post-host validate, final private validation. Each performs owner/input checks and one fresh live-reader coverage scan. The earlier per-owner repeated full coverage problem has already been fixed. Keep complete coverage when callbacks can change membership.
* Each owner currently requests lineage for overlap checking, direct-keyed-parent refresh and ancestor invalidation. Ancestor cache replacement repeats for shared ancestors; deduplicate **patches**, while retaining the necessary owner lineage checks and direct keyed output updates.

The arithmetic output lower bound is still 769 value decisions/writes for this changing-output trace. Eliminating all component calls does not eliminate these contracts and the intermediate work above.

## Exact proposed changes and retirement contracts

The slice is source-justified semantic factoring and removal of mechanically repeated work. **No patch below has a measured removable-time budget.** Each must retire its listed old work and pass the one boundary comparison. Cold and retained-memory costs remain unqualified unless separately measured later.

### A. Normalize projection shape once; reuse captured immutable projection values

**Files/functions:** `src/owned_store_record.ts` (`closedDataArray`, `captureClosedProjectionValues`); `src/closed_store_host_program.ts` (`inputPaths`, normalization); `src/async_store_runtime.ts` (`readClosedProjections` and transaction cleanup).

Create an opaque runtime-owned normalized projection-plan value when the existing host-program normalizer copies and validates paths. Keep the original public capture function's descriptor/getter/Proxy behavior. Add an internal capture entry that accepts only the owned plan and traverses runtime-owned `storeRecord` objects with own data properties. This removes repeated outer/path-array reflection and regex/path-segment validation from the trusted route. It does not make arbitrary frozen objects trusted.

Within the **existing StoreRenderTransaction**, memoize immutable numeric projection results by its pinned Store snapshot and normalized-plan identity. The cache is derived candidate scratch, not accepted history, dependency membership, or a second version registry. Stage every reader's existing observation and membership independently even when numeric values are shared. Reuse cannot change `snapshot.state`; nested objects are eligible only when each traversed record is runtime-owned. Retain finite-number checks. Clear scratch on discard/publication/release, and account for rollback: immutable projection results can survive rollback only while their original pinned snapshot remains authoritative; reader observations still roll back normally.

**Retire:** repeated path-array descriptor copies, path copies and identical projection traversal for each reader. Target at most three captures in this comparator, with all 257 reader observations/history stamps preserved. No compiler schema or kernel calling convention change is required; an internal owned-plan type is not a new authored API. Public arbitrary paths, selectors, resources and mutable records keep their existing route.

**Falsifiers:** getter/Proxy calls suppressed on the public API; unowned nested record admitted; different snapshots share numeric results; rollback leaks reader membership; a projection from an old root cut appears under a newer stamp.

### B. Make canonical auditing linear and explicitly scoped to passive preparation

**Files/functions:** `src/async_store_runtime.ts:462`; Root numeric-input staging and relevant private canonical helpers.

First remove the redundant `currentKeys.includes(key)` search. Equal key count plus a matching own descriptor for every unique captured key already proves equal key membership. Iterate the captured string keys for instance-shadow checks instead of allocating `Object.getOwnPropertyNames(AsyncStore.prototype)` again. Keep descriptor flags, symbol handling, exact prototype identity, own shadowing and private-brand checks. This is a direct, source-provable contraction with no stale cache.

Separate **shared prototype integrity** from **per-Store instance integrity**, so one explicitly passive internal batch can audit the shared class once and each participating instance once. A candidate-local prepared admission object may carry that fact only until the next possible public callback. It must not be cached across frames or treated as source freshness. Public `_isClosedNumericCanonical` and public reader methods continue to perform their full externally observable validation.

For the initial slice, keep kernel order and all callback boundaries. Public `executeRange`, World overrides, resource methods, Proxy descriptor inspection and host callbacks terminate any passive audit reuse. The locked alternating workload has 256 public kernel invocations, so **do not promise 515 audits become one**. Removing redundant reflection and avoiding duplicate audits within a provably passive segment can proceed; sharing an audit across a kernel callback cannot. If the agent cannot identify a clean passive segment, land only the linear audit and owned projection work. Record that limit instead of adding a global canonical-status cache.

A full gather-once/run-all-kernels phase would be valuable only with an established execution contract for callbacks. Current `normalizeClosedStoreNumericKernel` verifies a function's shape/association, not its effect freedom. Do not change callback/input observation order, infer purity from a revision string, or build a new runtime interpreter merely to claim batching. That larger choice remains outside the immediate slice.

**Retire:** O(P²) key searches and duplicate key arrays unconditionally; repeated class/instance audits only within a documented callback-free interval. Same Store/Root versions and accepted history remain authoritative. No new public flag such as `trusted: true` is allowed.

**Falsifiers:** prototype/instance override introduced by an earlier kernel or getter escapes the next required check; a proxy becomes trusted; stale input is accepted; receipt outlives its passive phase.

### C. Represent direct reads without empty selector Maps

**Files/functions:** `src/async_store_runtime.ts` pending/accepted reader types, `readClosedProjections`, `_prepareReaderValues`, `_readAtSnapshot`, `_readerValuesFor`, diagnostics and captured-reader preservation.

Add a private direct-read discriminator to the existing pending/accepted history representation. A direct read has an accepted stamp and reader identity but no selector entries. Generic selector access sees an empty read-only view, materialized lazily if the public return contract requires an actual Map. Do not expose one shared mutable empty Map that a caller can contaminate. Preserve the distinction between direct read, selector history, captured-only held cut and retirement; `null` currently means something different and must not be overloaded.

Keep one accepted record per reader with its captured root epoch/version, receipt identity, diagnostics visibility, retirement and held-reader behavior. Keep existing prepare/publish sequencing and canonical publication. No history is committed during capture.

**Retire:** 257 empty pending Maps and 257 empty copied accepted Maps in this frame, not their 257 semantic reader records. No authored API/ABI change. Generic selectors, multiple Stores and previous-value semantics retain their current Maps.

**Falsifiers:** generic selector previous values change after a direct/selector switch; direct readers disappear from diagnostics; held reader receipt is confused with current; fork retirement or exact captured acknowledgement changes.

### D. Retain immutable host-shape proof with its existing cache record

**Files/functions:** Root ComponentCache, `retainedStoreChildAdmitted`, `stageLeaf`, publication cache patching; `src/jsx_binding_runtime.ts` owned element copy helper if needed.

Produce a private closed output-shape descriptor when a frozen runtime-owned authored/expanded output is admitted. It contains the normalized program, exact authored/expanded element and props references, host key/tag, owner incarnation and retained authored/expanded child references. Store it on the **existing ComponentCache**, not a persistent owner-index map. An exact-reference match permits direct reads of the known data fields. Generic reconciliation, changed component props/program/result/expanded output or retirement invalidates the descriptor naturally; a new descriptor must be made after genuine shape work.

When the scalar cut creates its next owned elements, construct the next descriptor from those owned copies. Retain both authored and expanded children where they differ. Use one internal owned-data copy builder to avoid `Object.fromEntries` followed by an immediate object spread of the same props; preserve all owner/generated-key/adoption provenance rules. Do not mutate frozen accepted props or retain numeric scratch in accepted output.

Deduplicate ancestor invalidation in `closed.publish`: update every touched owner's cache and direct keyed output, collect ancestors in a cut-local Set, then replace each distinct ancestor cache once. Use current accepted ancestor caches at publication; do not install captured whole-cache replacements. Never invalidate a touched descendant's fresh output by processing overlapping owner cuts; existing overlap rejection remains.

**Retire:** per-frame descriptor maps, expected-name Sets and symbol/key arrays for already-certified immutable outputs; intermediate props copies; repeated ancestor cache clones. Preserve per-owner live cache/owner/code/reader checks and both required accepted element representations. No public ABI change; increased immutable proof fields are charged as bounded retained memory on existing cache lifetimes.

**Falsifiers:** a generic cache replacement inherits stale shape authority; forged frozen Proxy is admitted; children/effects/resources remount on scalar updates; snapshots lose captured child representation; same-key replacement reuses a stale owner; retained proof keeps removed subtrees alive.

### E. Contract duplicate VDOM work without weakening publication

**Files/functions:** `src/vdom_snapshot_runtime.ts` `prepareStorePropDelta`, `prepareScopedKeyedRetainedAndStoreDeltas`, `#isStorePropDeltaCurrent`, `#applyStorePropDelta`; Root `#tryFlushClosedStores` and lifecycle receipts.

Add an internal Store-only scalar preparation path over already normalized owned region data, while the public arbitrary-region route continues normalization and callback checks. Reuse the existing StorePropDelta record, mounted nodes, key buckets and publication token. Do not add a second sink registry or native-only direct-write renderer.

For scalar-only records, carry static prop-name/data-shape proof on the existing prepared/mounted records. Keep exact mounted VNode/handle/parent/owner/child and writer checks live. Build one next props object and one next VNode per target; avoid the transient VNode immediately cloned again solely to retain the same child list. Keep the accepted-mounted journal and separate next representation. Aggregate/style/tuple/text/structural cases keep current generic capture.

Retire the second Store-token check at the end of the scoped wrapper **only when** the Store-only private preparation just performed the same check and no callback-bearing operation intervened. Retire the repeated apply guard **only when** a private internal helper has just validated the exact same record and performs no retained/structural/replacement operation or callback before entering application. Keep the check for all mixed plans. A public boolean is not an admission permit; use a closure/private record scoped to that immediate call.

In Root's ordinary immediate flush, use the existing `groupPublicationReceipts` private admission/commit mechanism after one public candidate validation, rather than invoking a second public validation through `commitHost`. Keep the final private pre-host check after the public callbacks. Public `candidate.commitHost()` must still validate fresh when called later. This change primarily removes repeated public callback work; it does **not** justify claiming that a whole live-footprint scan disappeared.

Post-host public preparation, final private all-member validation, accepted-pointer swap, exact ack and callback release remain unchanged. Do not conflate standalone admission with group acceptance. The group must finish all public callbacks before any root accepts; no cross-renderer visual atomicity or rollback is added.

**Retire:** two strictly adjacent duplicate VDOM scans on the eligible ordinary Store-only path (eight becomes six under the stated trace), redundant props/VNode intermediates and repeated public validation in immediate Root dispatch. Do not remove whole-root guards on whole replacements or coverage checks after public callbacks.

**Falsifiers:** a late descriptor getter/Proxy, later root's validation, earlier host writer, removal/reinsert, HMR or shared-domain reentry permits stale writes/acceptance; second writer failure advances history; no-op cut loses exact ack; public explicit candidate loses its fresh validation.

## Why further fusion is not the first patch

The current generated Store kernel uses row-major cut buffers and a range ABI. Its short loop performs six multiplies and three adds per motion owner; there is little common arithmetic in these particular expressions. Compiler DAG reuse already exists within a program. A new numeric-prop capability, unrolling loop count one, or grouping all Position rows together does not retire prototype reflection, reader maps, copied outputs or publication checks.

Keep the 256 original-order run callbacks for this slice. A future coherent computation slice could capture one complete passive cut and execute an owned expression plan across heterogeneous rows, with stable output indices and original host write order. Before selecting it, resolve which executable is runtime-owned/effect-free and how legacy supplied functions fall back. A metadata boolean or branded revision alone does not resolve that contract. Do not turn the missing proof into a new bytecode/JIT/SoA experiment under the dense physical HOLD.

Likewise, a prepared Three scalar writer could avoid some wrapper dispatch, but its current resolver already caches parsed paths. It deliberately re-resolves mutable nested targets and tracks defaults by actual target. Bypassing it requires a writer/lifetime/copy contract and a measured residual worth targeting. It is excluded from the first slice.

## Budgets, acceptance and finite stopping

At the recorded denominator, publication parity needs **3.50 ms / 85.37%** off Native's 4.10 ms median, and **4.50 ms / 84.91%** off its 5.30 ms p95. Update-through-draw parity needs 3.65 ms / 56.59% at median and 4.80 ms / 60% at p95. These are arithmetic target gaps, not predicted savings. Do not subtract interval medians to attribute a draw phase or add percentage savings from separate hypotheses.

The imperative 0.10/0.20 ms publication and 2.30/2.70 ms draw/readback results are observed references with fewer runtime contracts, not proven attainable Native floors. Even a very large publication improvement leaves draw/readback, changed-output writes and essential history/lifetime work. The 60 Hz trace provides no 120 Hz, missed-deadline-population or presentation guarantee.

Proceed on source/semantic evidence for A–E, with each retirement visibly present in the reviewed source. Then run one consolidated correctness gate, one untimed installed proof, and **one** bounded matched performance boundary using unchanged consumer/render workload bytes. No per-helper measurements, no Recording A resurrection, no density sweep, no favorable repeats.

The selected boundary is **new-Native → declarative React/R3F → imperative**, preserving the existing 12/60 episode and renderer settings. Do not add an old-Native arm. One fixed order remains descriptive; record the order up front and do not call it population qualification. Report current comparative position and **no causal old/new saving**. Preserve the historical result without treating it as a matched before arm.

Acceptance has two labels: semantic slice accepted only when all contracts/gates pass and named work is retired; performance parity accepted only if the fresh comparison meets both median and p95 on publication and update-through-draw without worse state-age/cleanup behavior. An improvement that still loses is recorded as such. A source contraction with no credible whole-frame improvement is not a speed success. If the integrated comparison does not improve, stop this optimization slice and preserve the negative result; do not add another cache or new syntax to rescue its narrative. Source review then decides whether the semantic simplification is worth retaining, or whether to revert the optional optimization portion. Correctness failure stops timing until repaired with the failure preserved.

No new discriminator is required before these source-backed retirements. If a later physical choice truly depends on whether residual time is admission, host application or publication, permit at most one bounded diagnostic episode on the same current canvas workload with coarse nonoverlapping spans, separate from latency. It is optional, not a prerequisite or license for a diagnostic loop; unresolved attribution closes that choice. The existing exhausted dense controls must not be reopened.

The full master-plan goal remains active after this slice: broader computation fusion, installed workbench HMR, lifecycle/cold/memory budgets, idiomatic useFrame comparison and independent-device qualification are still open. Human maintenance evidence remains absent. This investigation does not narrow the product to the passing subset.
