# Astra: React mechanism, the native audit cost, and the remaining gap

22 October 2026. **The research identifies a real native inefficiency and a finite design that can remove its repeated work. It does not establish a complete parity solution. Keep implementation frozen.** React uses a small synchronous subscribed-leaf update path, with static subtree reuse and ordinary R3F prop application. Native also retains the static scene and executes its compiled batch, but pays substantially more preparation, validation and accepted-history coordination. One specific part—repeated canonical Store auditing during notification acknowledgement—is now localized by source, sampled stacks and an isolated removal control. Removing that audit entirely still leaves a large observed gap.

This is a research recommendation, not implementation authorization. No product code, test, build, server or browser was executed or changed by this review. Luna ran the two finite studies; primary reviewed their bindings and results. The earlier capture/batch/final-immutable-output proposal is already delivered and lost its comparison. It is not proposed again. [Source and evidence manifest](astra-source-basis.json).

## What React actually does

The pinned packages are React 19.3.0, reconciler 0.34.0, React Compiler 1.0.0 and R3F 10.0.0-alpha.6. The actual emitted transform and installed runtime establish the following chain; compiler passes alone cannot establish its cost.

1. A new frozen clock snapshot reaches 257 `useSyncExternalStore` listeners: 256 motion leaves and one marker. Each changed snapshot schedules SyncLane `2`. R3F `flushSync` batches that dispatch into one synchronous root flush; it does not perform 257 independent root commits.
2. `App` is not a clock subscriber. Its static tree need not be reconstructed on normal frames. Runtime lane/child-lane bailouts traverse paths to updated leaves and stop at unchanged subtrees. Compiler's real `_c(2)` App cache must not be credited with an established normal-frame saving.
3. Every scheduled motion leaf still runs its hooks and three scalar expressions. Compiler `_c(8)` stores the stable effect closure/dependencies and guards JSX with `children` plus the three computed scalar values. It recreates the motion element when those values change. Compiler caches are per rendering Fiber; `useMemoCache` copies alternate cache arrays when necessary. There is no cross-instance numeric cache or shared batch.
4. R3F still validates the host type, diffs the new props, replaces its prop snapshot, resolves dashed property paths and writes the changed Three values. The usual frame changes up to 769 scalar props. Static child groups, meshes, geometry and materials retain identity.
5. The required host updates are inside the timed `update` call. The pinned reconciler skips the nonblocking external-store consistency-check registration when `renderLanes & 127` is nonzero; SyncLane satisfies that condition. It still registers the Store-instance update/check effect, and `flushSpawnedWork` flushes pending effects for `pendingEffectsLanes & 3` before the synchronous commit tail completes. The advantage is not explained by required host writes escaping the interval.

The relevant direct inspections are [transform](../2026-10-22-native-frame-publication/proof-canvas-v3/transforms/react/react.tsx.js), pinned reconciler lines 2940–2973, 3110–3190, 5383–5417, 5539–5555, 10974–11060 and 12748–12760, Compiler `codegenReactiveScope` at installed dist lines 90647–90765, and delivered R3F `diffProps`/`applyProps` at bundle lines 3522–3615. [React trace](react-path.md) and [compiler internals](compiler-internals.md) contain the precise source links. No JIT, inline-cache or deoptimization advantage was measured.

Native already omits component-body rerendering and static-resource reconstruction on its eligible path. Both all-changing routes are linear in affected owners and changed writes at this fixed topology. That shared reuse and asymptotic class do not explain their different constants. Native additionally promises chronological action cutoffs, root-specific accepted histories, forks, explicit groups and arbitrary-host reentry/failure handling. These meanings cannot be removed to imitate React's simpler snapshot/listener implementation.

## What was actually localized

The Native timing route is `advance → enqueueStores → prepareStores`, with `internalCellCapture=false` and group continuation enabled. It uses the public conservative candidate checks. The immediate `flush` shortcut does not describe it. Samples beneath the exact authored public `update` span contain `prepareOwnedFrameSchedule`, `captureVerifiedOwnedScalarBatch` and `OwnedScalarBatchRows` in both Native profiles: the batch branch positively executes in profiled frames. This does not prove three groups, 257 rows or any sweep count on every frame. The old terminal counters belong to the later epoch-73 direct flush.

The first study preserves eight fresh contexts and four complete raw CPU profiles. Exact bundle URL/source-span ancestry selects update samples across 72 calls, including 12 warmups. It does not select only the 60 measured windows. Sampling cannot prove every invocation was observed; inclusive counts overlap and are not additive phase times. GC samples without update ancestry cannot be allocated to this interval. [Raw evidence and analysis](runs-diagnostic-v1/analysis.json), [primary review](primary-diagnostic-review.json).

| Native sampled location | Context 4 | Context 5 | Interpretation |
| --- | ---: | ---: | --- |
| All update-ancestry samples | 1350 | 1365 | Denominator for sampled execution only |
| `closedNumericPrototypeIsCanonical`, exclusive | 260 | 249 | Largest single exact-location leaf |
| Of those exclusive leaves, under notification acknowledgement | 250 | 245 | Independently traced in raw parent chains |
| `#acknowledgeCurrentStoreNotifications`, inclusive | 330 | 325 | Includes its audit/history work; not additional to the preceding rows |
| Root closed-output `current`, exclusive, bundle line 14872 | 132 | 143 | Coverage, owner/input/code currentness |
| `#stageClosedStoreOutputs`, exclusive | 52 | 55 | Selection and preparation |
| `OwnedScalarBatchRows`, exclusive | 50 | 64 | Final-output construction, not evidence of arithmetic dominance |

React has 211/171 update-ancestry samples. Its leading visible exclusive leaves include `applyProps` 27/19, `diffProps` 15/14, `commitUpdate` 14/9, Position 14/12 and Rotation 10/10. This positively observes the ordinary declarative host path. Small counts and minified runtime locations limit finer comparisons.

The most actionable source chain is exact:

`Root.#acknowledgeCurrentStoreNotifications → captureCanonicalStoreReaderReceipt + inspectCanonicalStoreReaderReceipt → _isClosedNumericCanonical → full AsyncStore.prototype descriptor audit + Store instance-shadow audit`.

Root lines 11357–11391 scan the root's live readers after publication. Store lines 928–960 capture a temporary frozen receipt and then inspect it; each operation independently audits canonical shape. Lines 1248–1260 enumerate all prototype keys and compare every descriptor. On the successful 257-reader single-Store path, this entails **514 same-Store prototype/instance audits and 257 temporary receipt objects per acknowledgement**. This is a source-derived successful-path count, not an instrumented frequency measurement. Checking each reader's accepted root version is necessary; repeatedly proving the unchanged same-Store shape in one passive interval is a distinct obligation that could be shared if passivity is proved.

Other sampled work remains meaningful. Root `current` repeatedly checks live owners/code/input membership and scans reader coverage. Public queue validation occurs twice before admission; native admission validates again, then the private group/commit checks run. Post-host validation runs in the queue, again inside `preparePublication`, again in the queue, and finally through private group checks. The final Root predicate ends with private VDOM validation; it must not be mistaken for an elided final scan. Host writes can reenter, descriptor reflection can invoke Proxy traps, and public candidates can be delayed. These samples do not justify copying the immediate-flush shortcut onto public candidates or deleting those checks.

## The sole removal control does not close the gap

The first study's Native profiler-off update medians were 8.35/6.95 ms; profiler-on medians were 3.90/3.90 ms. React off was 0.70/0.70 ms and on was 0.70/0.65 ms. The large negative Native on/off differences prevent a causal profiler-overhead estimate or conversion of sample fractions into milliseconds.

The one subsequent nonprofiler control changed only `closedNumericPrototypeIsCanonical` to return true in a disposable copied Native bundle, preserving outside bytes, total byte length and line breaks. This is **intentionally unsound diagnostic code**. It disables every call to that prototype audit, including calls outside acknowledgement; instance audits and the rest of the runtime remain. It is an optimistic removal control, not a rigorous upper bound on a semantics-preserving implementation. Its treatment difference includes possible JIT interactions. No product/build source changed. [Protocol](prototype-ablation-protocol.md), [raw receipt](runs-prototype-ablation-v1/receipt.json).

| Context, in executed order | Update median / p95 ms | Through common draw/readback median / p95 ms |
| --- | ---: | ---: |
| Native original | 8.40 / 10.10 | 11.80 / 13.80 |
| React | 0.70 / 1.80 | 3.50 / 5.50 |
| Native audit disabled | 3.55 / 8.00 | 6.90 / 11.70 |
| Native audit disabled | 6.05 / 7.90 | 9.55 / 11.30 |
| React | 0.70 / 1.70 | 3.60 / 5.30 |
| Native original | 6.85 / 10.30 | 9.80 / 13.60 |

Every context retains 72 matched output frames, null timing counters, exact identity/lifetime checks and 512 disposals; source/assets and cleanup pass. Both treatment medians are below both original medians, consistent with a material contribution from the removed mechanism. But the two treatment medians differ by 2.50 ms, original contexts also differ, and there are only two contexts per condition. Do not report the differences as a stable removable budget.

Even the faster treatment is 3.55 ms against React's 0.70 ms, with 8.00-ms p95 against 1.70–1.80 ms. Thus disabling the entire audit did not close the observed gap. This does not mathematically bound a different architecture, nor prove the remaining work irreducible. It does reject presenting this one duplicate-audit repair as the demonstrated full speed solution. Neither study replaces the earlier descriptive parity FAIL or qualifies cold cost, memory, presentation, other sizes or another device.

## Finite design for the identified inefficiency

The precise replacement is the **whole notification-acknowledgement validation path**, from the Root's reader membership snapshot through accepted-history checks to its existing committed-generation assignment. It is not another compiler or scalar-capture change.

The end state is a Store-owned cohort check: after all potentially observable input normalization, audit the canonical prototype and each distinct real Store instance freshly for this invocation; inspect every selected reader directly against the existing private accepted history and current root stamp in one proven callback-free scope; then let Root advance its existing committed notification generation only if its original subscription/membership/generation conditions still hold. The canonical shape audit is shared only within that scope. No global “canonical Store” cache, persistent freshness token, new reader history, version counter or publication authority is introduced.

The detailed seam must satisfy all of these requirements:

- Store retains authority over `#readerValues`, `#knownRoots`, `#rootVersions` and `#rootEpochs`. A reader qualifies only if its accepted history/stamp exists, its epoch matches the live root, and its accepted version equals the current root version. A newer root version is retained/pending work, not permission to acknowledge. Forked roots are checked independently.
- Root retains authority over live reader membership, subscribed Stores, blocked-reader conditions and `#storeNotificationGeneration`. All live readers remain covered, including unchanged opaque readers; no inference from “the clock batch published” replaces that proof. The final membership/subscription/generation checks remain before the committed-generation assignment.
- The internal operation owns or defensively normalizes its cohort before sharing any audit. A TypeScript `readonly` array, frozen object or caller Boolean is not authentication. No caller iterator, property getter, overridden Store method or Proxy trap may execute inside the shared-audit interval. Real Store private-brand validation precedes reflection on a candidate receiver. Use existing captured canonical operations for private reads and iteration, or decline the passive route when their dependencies cannot be proved.
- Preserve the current full prototype/instance shape rejection. Public overrides, subclasses, changed descriptors and unsupported shapes retain the defensive receipt path or leave the generation dirty. If ambient intrinsic replacement is currently observable, it cannot be silently converted into a trusted passive call: detect/decline or preserve the defensive behavior. Review this boundary before implementation.
- Capture and compare accepted stamps directly within the Store authority instead of allocating a receipt merely to inspect it immediately. Existing receipt APIs used across real callback boundaries remain defensive. Their histories and other callers are not migrated by this proposal.
- Every shared audit expires on return and before any callback, notification, host call or later phase. Do not reuse preparation audits during publication or postpublication acknowledgement. Newer dispatches, replacement/retirement and reentrant publication must still prevent acknowledgement of unread work.

For R memberships, S distinct Stores and P audited prototype keys, current successful acknowledgement performs O(RP) shape work plus O(R) history/membership work. The conditional design target is O(P + SP + R) for shape and reader checks, with one fresh prototype audit and one instance audit per distinct Store in a proven passive invocation. This is a work-count target, not measured complexity over varying sizes or a latency forecast. Its normalization/grouping and temporary storage costs must be counted. The only loops/allocations retired are repeated same-Store audits and the capture-then-immediate-inspect receipt objects on this selected acknowledgement path; required reader stamp checks remain.

This design preserves publication ordering because it runs after the existing accepted-state publication. It does not move acknowledgement earlier, alter captured action cutoffs, replay failed host work, change VDOM target validation, or take ownership of resources. Host partial failure still keeps accepted state old and quarantines the touched domain. A failed cohort check leaves notifications pending so the normal generic path can progress. Disposal/HMR/owner removal revoke eligibility; cohort scratch must not retain roots, histories or resources after the call.

## Ranked disposition and budget

1. **Repeated canonical Store audit in acknowledgement:** source-proven duplicate mechanism; positively localized in both profiles; removal control supports material contribution. The cohort design is the one concrete repair candidate, scoped to that inefficiency.
2. **Repeated Root currentness/coverage and public publication validation:** positively sampled and source-visible. Some checks protect callback/reentry boundaries; neither their removable portion nor a safe combined replacement is established. No shortcut selected.
3. **Preparation/capture/final-frame/history construction:** positively sampled. The previous integrated batching solution already exists. Allocation/GC, cold and retained-memory attribution remain unresolved. No representation successor selected.
4. **Host application:** real in both arms and includes required changing outputs. No identical-contract host floor or writer-specialization budget exists. No new writer selected.
5. **Arithmetic or missing React Compiler memoization:** not supported as the leading explanation. Native batch arithmetic executes; React recomputes the motion expressions. No new compiler/cache/backend work selected.

The predicted cohort latency benefit, p95 effect and total after repair are **unknown**. Roughly 24% inclusive acknowledgement samples and 19% exclusive prototype-audit samples in the profiled Native contexts are not removable fractions. The treatment has no correctness-preserving equivalent yet and its JIT/state interaction is unseparated. There is no defensible numerical parity budget. The remaining full-gap discriminator would require a trustworthy residual decomposition on representative unprofiled execution; this finite episode did not produce it. That is an evidence gap, not a new automatic experiment authorization. **Stop here: no additional ablation, profile, helper/cache/container campaign or implementation dispatch follows.**

## Dormant Sol-medium packets, only after a human chooses this narrower repair

These packets are a reviewable handoff for the diagnosed acknowledgement inefficiency. They do not constitute a full-parity plan and are not authorized for execution now. Two implementation agents use `gpt-6-sol` at medium; primary reviews and integrates. They execute no tests/builds/benchmarks.

**A — Store-owned cohort contract.** Own `src/async_store_runtime.ts` and a new `src/store_reader_cohort_test.ts`. First present the precise input normalization, private-brand/canonical-intrinsic audit and result contract to primary. Implement one fresh passive cohort operation sharing existing private history/stamp semantics. Keep public receipt capture/inspection defensive. Author cases for direct and selector histories, absent history, retained/newer stamps, epoch replacement, forks, multiple Stores with equal values, shadowed methods, prototype additions/replacements/accessors, subclasses/Proxies and malformed cohort input. No Root, compiler, World, VDOM or queue edits.

**B — complete Root acknowledgement integration.** Begin after primary freezes A's actual seam. Own the acknowledgement path in `src/component_state_runtime.ts`, a new `src/store_reader_cohort_integration_test.ts`, and a new actual-compiled `compiler/compiled_store_reader_cohort_test.mjs`. Preserve all existing guards and generic progress. Integrate the single cohort result with the existing generation assignment and retire the per-reader temporary-receipt round trip only when the passive contract succeeds. Cover an authored clock plus unchanged opaque Studio reader, later Studio work, held/blocked readers, membership changes, notification reentry/newer actions, root disposal/remount and independent forks. Prove old saved snapshots, accepted group reads, writer failure/quarantine and exact disposal remain intact. No queue/VDOM/writer/compiler-emission edits.

Primary rejects any seam that persists canonicality across callbacks or changes accepted history. Review the complete removal boundary before releasing Luna. Primary owns runner registration, source locks and delivery/HMR proof plumbing. Luna then runs one consolidated correctness/package/actual-compiled boundary with Deno `--frozen`; installed proof must exercise the public frame route and its default-scheduler/opaque-reader behavior, not reuse epoch-73 counters as frame evidence. Only a separately authorized bounded comparison evaluates the completed repair. Preserve failures. A correctness failure blocks delivery; a timing loss or unresolved effect closes this candidate without an automatic successor. Cold and retention costs remain explicit limits unless measured under the accepted release protocol.

**Decision:** the research answers what React executes and identifies one material Native duplicate. It does not yet solve the full speed gap. Keep the human freeze, preserve the failed comparisons, and present the narrower repair as an optional product decision with an unknown timing benefit—not as the missing parity solution.
