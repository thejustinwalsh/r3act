# Library implementation plan: compiled, data-oriented JSX with a retained VDOM

**Decision date:** 11 October 2026  
**Recommendation:** begin a bounded JavaScript-first product implementation now. Do not start every part of the long-term runtime at once, freeze a broad compatibility API, or advertise a faster React replacement. Close the compiler, shared-store, and structural-integration gates below before expanding the implementation. Workers, streaming, hydration, and Wasm remain downstream options.

This plan is an independent synthesis of the original conversation and primary artifacts. It does not change implementation source or overwrite historical protocols. Proposed APIs and acceptance thresholds are recommendations, not claims about capabilities already shipped.

## 1. What we are building, and what “ready” means

The product should be a new native JSX runtime whose compiler makes ownership and dependencies explicit, whose ECS supplies state and event data, whose retained VDOM preserves declarative structure and identity, and whose scheduler prepares fresh candidate versions for a small public host interface. Its first useful promise is: **ordinary declarative props and state remain efficient and inspectable, including while independent async work is pending.**

I read the original **React Runtime Research** chat, including its earliest design requests and subsequent steering, through `read_thread` rather than treating the handoff summary as requirements. The user explicitly wants retained VDOM, native events, ECS entities/traits as the sharing surface, conditional site-addressed hooks, mount/activation lifecycle effects, actual TSX, a substantive compiler, easy custom hosts, shared/forked roots, and eventual worker/server state coordination. The user also explicitly rejects making imperative refs and frame mutations the normal escape hatch. Relevant original turns include `01a11ff8-04b0-7fb3-b114-28d132333e38`, `01a11ffd-0fa4-7060-8188-685cc22fe466`, `01a11fff-7ae0-7e92-aee8-e425f78038f5`, `01a1210a-a0bb-75a2-bfb5-b6b9ee7f5184`, `01a1229d-e17d-7411-b05a-2be284aa21fa`, and `01a122b8-2501-7c82-828c-d5e360feff8e`. Later turns require a real shared async store and simultaneous transitions in one root and across forked roots; the latest compiler steering says the compiler is half the offering (`01a12d8a-f636-70e0-bed7-26137cc81aee`, `01a12dd8-385b-74d1-881a-449de83aa82f`, `01a12df0-4567-7133-a6e5-2d3cbbe48bfd`).

Those are product goals. Claims in that conversation about React always waterfalling, losing all state on suspension, or lacking particular APIs are hypotheses to check, not premises needed for this design. The fair async baseline in the primary results already demonstrates successful preloaded React transitions. The product can earn adoption through declarative update cost, explicit async orchestration, and extension boundaries without requiring those historical criticisms to be universally true. [Evidence: `paper.md` §§2.3–2.5; `results/async-dag-frontier-v2/summary.json`; `product-thesis.md`, “Compatibility is a product surface, not a slogan.”]

Separate three meanings of readiness:

| Readiness | Required meaning | Current assessment |
| --- | --- | --- |
| Ready to build | A bounded use case, plausible architecture, executable mechanisms, identified falsifiers, and a cheap fallback if an optimization fails | **Yes.** Fixed-topology bindings, owner/site state, generic keyed VDOM, and async frontier execution are enough to start product engineering |
| Ready to commit to broad implementation | Compiler and runtime share one sound contract; shared-state transitions pass behavioral cases; sparse structure works alongside compiled bindings; a second host validates the abstraction | **No.** These integration seams remain open, and the store has a reproduced correctness defect |
| Ready to release or claim superiority | Fresh production builds, complete lifecycle behavior, honest compatibility, measured costs, independent confirmation, and usable developer workflows | **No.** Single-device performance and pre-data comprehension work do not establish a generally faster, simpler, or compatible replacement |

### The JS-first MVP

The internal alpha should include one native TSX path, DOM rendering, retained keyed VDOM, owner/site local state, shared action-log state, native events, compiled prop/region dependencies, safe generic structural fallback, and a narrow async boundary with keep-previous reveal. One runtime instance/world must support several roots and explicit coordinated commit groups. A small Three adapter and React island wrapper should be developed during the alpha to test the host/adoption design before it hardens.

The first externally useful MVP should include the Three demonstration, React island package, inspectable plans/traces, typed public host/property registration, clean install/build/watch behavior, and an explicit syntax/compatibility matrix. A selected library bridge is an adoption milestone; it should not require emulating React's dispatcher in the native kernel. DOM custom elements/property assignments belong in the adapter; automatically putting every component in a shadow root is not justified by these measurements.

Defer worker pools/work stealing, service-worker execution, server state streams, SSR/hydration, CRDTs, runtime JIT/SIMD, Wasm kernels, universal initial-state caches, arbitrary React component compatibility, and full progressive Suspense behavior. Design version/task/host interfaces so those can be added, but do not implement their protocols speculatively. **The usable release must precede workers and hydration.** The current paper's sequence places ecosystem release after workers/streams; that ordering delays the most important adoption and host feedback. [Evidence: `product-thesis.md`, “Product charter,” “Priority order,” milestones 1–5; `paper.md` §§5–7.]

## 2. Independent evidence map

The conclusions below distinguish mechanism tests, production workload results, and untested product promises. Browser page blocks or fresh processes are the replication units; thousands of within-page RAF samples do not constitute thousands of independent replications.

| Question | Primary evidence and result | Product implication |
| --- | --- | --- |
| Can dependency metadata avoid repeated work? | Matched-input Deno graph/bucket/scan studies find different winners by size, density, and locality; shared-source generated writers reduce interpreter medians by 15.2–34.4% across 14 run blocks | Compile dependencies, but permit sparse, bucketed, and dense execution. A graph is a correctness model, not a mandatory traversal algorithm. See notebook Experiments A/A2/A3/Q, `src/task_graph_runtime.ts`, and `compiler-tooling.md`, “Current research status” |
| Can this retain JSX/VDOM? | V5 and V6 feed generated bindings through retained VDOM. V6's 75 production pages/22,500 RAF updates pass output and identity checks; at 1,024 segments columnar update CPU is 0.6 ms, while mount is 6.3 ms versus React's 4.1 ms | Retained VDOM and compiled hot-path writers are compatible. The no-VDOM direct writer is a lower-bound/control, not the shipping architecture. See appendix §§8.3–8.5, `src/vdom_snapshot_runtime.ts`, `results/browser-snake-frame-v6-production-manifest.json` |
| Do setup and disposal erase the fixed-shape win? | Lifecycle V1: 30 pages; mount + 300 measured update-CPU samples + teardown. Median paired columnar/React cycle ratios are 0.508 at 512 and 0.513 at 1,024, passing all ten episode pairs | Enough evidence for a named fixed-topology CPU advantage. It covers one episode length, one device, and excludes full cold load/compilation. See `results/snake-frame-lifecycle-v1/summary.json`, appendix §8.14, notebook tag `snake-lifecycle-v1-code` |
| Is the UI demonstrably smoother? | Cadence V1 cuts update CPU to 1.8 vs 3.9 ms at 4,096 and 3.9 vs 8.0 at 8,192. At 8,192, RAF p95 remains 66.6 vs 66.7 ms; late callbacks remain 96.3% vs 100%; one columnar page has an 11.6-second gap. The later LoAF study does not explain it | No display/presentation or perceived smoothness claim. Reduced CPU is valuable without inventing presentation evidence. See appendix §§8.15–8.16 and the cadence/phase `summary.json` files |
| Does exact dirty-row dispatch always win? | The sparse browser study includes worklist construction and DOM writes. At 4,096 scattered/50% dirty, dense is 1.5 ms versus exact rows 2.6 ms; at 100%, 2.6 vs 4.1 ms. Small results hit 0/0.1 ms timing floors | Start with compiler-selected modes and cheap explicit batch information. Do not copy a universal crossover from a Deno microbenchmark. See appendix §§8.6–8.7, `results/snake-sparse-frame-v1-manifest.json` |
| Is keyed stateful structure competitive? | V3 verifies the React Compiler build. Rotation: token-delta 4.70 ms, generic 10.80, React 3.60. Edge replacement: token-delta 12.05, generic 11.00, React 3.50. Overall preregistered product decision: FAIL | Token reuse is a narrow optimization. General membership changes must remain correct and become cheaper before structural advantage is claimed. See `results/component-state-owner-reuse-v3/browser-manifest.json`, its five `browser-production/` raw records, appendix §8.13 |
| Was the structural loss only key-map maintenance? | Delta key-index maintenance improves the earlier runtime, but V3 diagnostics still visit 10,000 owners for a one-key edit: 9,999 cached owners, one created, one retired | The next change must remove full incoming-list/owner/host rediscovery, not add another map cache. See appendix §§8.8–8.13, `results/component-state-owner-reuse-v3/delta-profile-*.json`, `src/component_state_runtime_owner_reuse_v3.ts` |
| Should all VDOM become a SoA B+ tree? | Bounded object buckets beat simple and indexed arrays on local moves. The parallel-array bucket candidate is slower for head/middle moves and has similar full scans. Its 50k full-scan medians are approximately 0.274/0.284/0.313 ms for indexed array/object buckets/parallel arrays | Use a hybrid: semantic VDOM/owners, dense numeric columns, object buckets for marked sparse ordered regions. A wholesale B+ tree or typed-column rewrite is unsupported. See appendix §§8.17–8.18 and its columnar follow-up; `results/keyed-region-columnar-layout-v1/summary.json`; notebook tag `keyed-region-columnar-v1-code` |
| Does the current runtime win a changing realtime scene? | Mixed V1: 30 production pages/7,200 frames; every 30th measured frame removes/inserts eight keys and rotates survivors. Paired geometric mean runtime/React median ratios are 0.998/1.117/1.195 at 128/512/1,024. p95 ratios are 0.921/1.145/1.148. Correctness passes; median and p95 performance gates fail | This is the central product falsifier. Fixed Snake wins must not stand in for dynamic realtime value. See `mixed-realtime-study.md`, `results/mixed-realtime-v1-summary.json`, appendix §8.19 |
| Can the async frontier eliminate an artificial waterfall? | Frontier V2: 30 counterbalanced production page blocks. Sequential control median/p95 364.35/385.3 ms; preloaded React 143.60/152.1; DAG approximately 144.75/151.2. Paired DAG/preload median ratio approximately 1.000. No hard-edge violations; old UI and keyed nodes retained | Ready-frontier execution and discovery are credible. It matches a good preload implementation; it does not beat it or execute JS CPU callbacks in parallel. See appendix §8.20; `results/async-dag-frontier-v2/summary.json` and raw `async-dag-frontier-v2-r*.json` |
| Is async correctness generally established? | Existing tests cover candidate-local work, supersession, urgent same-root rebase, invalidation, bounded restart, and completed-output reuse. They do not establish the new action-log integration or independent same-root candidates | Reuse these tests as a starting contract suite. Add store/owner/lifecycle integration, not another timer-completion contest. See `src/async_task_scheduler_test.ts`, `src/async_transition_runtime_test.ts`, `src/async_vdom_transition_runtime_test.ts`, experiment log §§5.51–5.62 and §5.91 |
| Is it easier to understand or extend? | Notebook study-status output and `results/developer-study-v1-summary.json`: zero participants, `NO_PARTICIPANT_DATA`. Prepared tasks cover conditional state/lifecycle and two derived regions, not adapter/compiler extension | Maintainability remains a hypothesis. Run the pilot once and add a bounded extension task. Small code size or fixture feasibility cannot replace this. See `developer-study-protocol.md` and `developer-study-rubric.md` |
| Is it smaller? | Minimal counter bundles: runtime 8,892 gzip bytes versus React 75,584, an 88.2% reduction, with different feature coverage | A useful modularity signal, not equal-capability size evidence. Repeat on the actual async/stateful/Three distribution. See `results/runtime-size-v1.json`, experiment log §5.70, notebook bundle-size analysis |

### What I independently checked

I inspected `research.ipynb` itself: 186 cells, 90 code cells, 82 parseable SVG outputs, and no stored error outputs. Its developer-study status explicitly contains zero participants. The older async code cells contain deterministic PASS event traces, while the appended store/stress sections are descriptive Markdown. Four appended code cells have no execution count; some include inserted SVG output. In particular, the mixed V1 analysis cell has no stored executed output. **A notebook with no error cells is not proof that the complete current notebook has been freshly executed.** Citations by metadata tag are preferable to cell number because insertion shifts numbering.

I read raw records and recomputed frontier medians/p95s and paired ratios, lifecycle cycle ratios, mixed page ratios, and V3 page-median aggregates. They agree with the reported conclusions. The mixed harness uses a nearest-rank within-page median; recomputation must retain that estimator rather than silently substituting an averaged even-sample median. I verified hashes for the five V3 browser raw records and all 30 mixed raw records against their manifests.

Read-only executable verification on this audit:

- `deno test --config deno.browser.json src` fails type checking with two `TS2345` errors in `src/async_store_runtime.ts:151` and `:225`: selector `previous` is inferred as `unknown`.
- The same suite with `--no-check` passes **79 tests**. This supports the existing narrow contracts; there is no dedicated new-store behavioral suite among these files.
- `deno check --config deno.browser.json src/browser/async_transition_stress_v1.tsx` reports the same two store errors plus `TS2488` for iterating `MutationRecord.addedNodes` at line 364 under the current DOM library configuration.
- A one-shot store probe reproduces a semantic failure: initial state 0; root `r` registered; transition `t` dispatches replacement 1; urgent replacement 1 is rejected as a head no-op; `getStateForRoot("r")` remains 0. The urgent action should change the visible projection despite matching the head. `AsyncStore.dispatch` checks only `Object.is(next, #headState)` before recording it. The React-fork inventory explicitly includes “applies an action that only changes the state on screen” in `ReactStoreTransition-test.js`. This is a real porting gap, not just a missing optimization.

I did not start a server, collect a new performance study, rebuild the compiler, or modify source. Browser results above are historical evidence. The current smoke demo is not newly validated by this audit.

## 3. The current implementation seams that must become one product

The repository contains several useful probes, not one complete runtime. Avoid concatenating them into the public API.

| Current piece | What it actually supplies | Required integration |
| --- | --- | --- |
| `src/jsx_binding_runtime.ts` | Frozen classic JSX values, `ScalarSource`, `NumericColumn`, bound props, keyed-region/version hints | A real native JSX runtime with key/ref conventions, one shared node model, and compiler-generated bindings hidden from ordinary authors |
| `src/owner_state_world.ts` + `src/component_state_runtime.ts` | Map-backed owner/site state, dirty-owner selection, component caching, activation effects | Common owner/source identities and candidate-safe lifecycle/state publication; explicit reader cleanup |
| `src/vdom_snapshot_runtime.ts` | Retained host tree, keyed reconciliation, prop writers, numeric columns, partial regions, bucketed deltas | Incremental binding-index attach/detach for structural changes and host-neutral prepared operations |
| `src/task_graph_plan.ts` + `src/task_graph_runtime.ts` | JS-built synchronous value DAG, CSR adjacency, fan-in coalescing and unchanged-value pruning | Emit this semantic shape from Rust; connect derived outputs to owner/region/prop sinks |
| `src/compiled_plan_runtime.ts` | Direct repeated DOM plan, interpreted/generated writers and local/shared dispatch | Keep as a reference/control or fold its specialization into retained VDOM; it currently embeds DOM/HTMLElement assumptions |
| `src/async_task_plan.ts` + `src/async_task_scheduler.ts` | Compiled task binder, ready-frontier async execution, abort, completed-output reuse | Typed external inputs, common read/write identities, cancellation ownership, and shared candidate/task handles |
| `src/async_store_runtime.ts` | Chronological action log, root projections, pinned snapshot validation, per-reader selection history | Behavioral parity with the intended store semantics, source invalidation, root detach, action compaction, and retry integration |
| `src/transition_coordinator.ts` + async transition runtimes | One active overlapping group per root, disjoint-group concurrency, staged snapshots, urgent rebase | A root work queue supporting independent overlapping transition IDs and explicit replacement policy |

Two limits are especially important:

1. `VDOMSnapshotRoot.commitKeyedRegionDelta` declines a root with a compiled graph, direct binding writes, or existing source binding groups. Inserted/replaced nodes with bindings are also unsafe on that path. The bucket integration therefore cannot yet deliver the desired combined topology-plus-bound-prop workload. The V3 owner path still walks incoming child arrays to discover a delta. The structural compiler fixture manually invokes `__uiKeyedOwnerChildren`; it is not evidence that arbitrary `.map()` updates are compiler-emitted sparse operations. [Source: `src/vdom_snapshot_runtime.ts`, `commitKeyedRegionDelta`; `src/component_state_runtime_owner_reuse_v3.ts`, structural preparation and keyed cache paths; `compiler/fixtures/component_state_structural.tsx`.]

2. `prepareCommit` normalizes/validates the tree, but its returned `commit()` still performs reconciliation and host operations and rebuilds indexes. It is not a precomputed, infallible transaction. Sequential commits in one JS task prevent an ordinary browser paint between roots, but a throwing host operation or reentrant callback can expose a partial operation sequence. The coordinator comments assume no-throw host commit; the API does not enforce it. Define a narrower guarantee and a failure policy before promising atomic multi-root state/effect publication. [Source: `src/vdom_snapshot_runtime.ts`, `prepareCommit`; `src/transition_coordinator.ts`, commit callback and `retryReadyCommit`; `src/async_vdom_transition_runtime.ts`, constructor commit batch.]

There are concrete retention edges to audit as part of that consolidation. `VDOMSnapshotRoot.dispose()` clears the ordinary key map but currently does not clear `#nodesByKeyedRegion`, which can retain marked mounted regions if the disposed root remains referenced. The store has `forgetReader` but no complete public root-detach operation; `#knownRoots` and unfinished transition roots need lifecycle ownership. The existing coarse heap readings cannot certify these paths are leak-free. [Source: `src/vdom_snapshot_runtime.ts`, `dispose` versus `#rebuildKeyIndex`; `src/async_store_runtime.ts`, `subscribe`, `forgetReader`, transition records; notebook lifecycle heap diagnostic.]

## 4. Recommended architecture and public surface

### 4.1 One semantic model, several execution plans

```text
Native TSX + typed source/task/host declarations
                    |
             Rust OXC compiler
                    |
       versioned UI plan + ordinary JavaScript
                    |
      runtime instance / world / source registry
         |              |                |
   owner + VDOM     value/task DAG    root work queues
         |              |                |
         +--------- prepared candidate --+
                           |
          validate read versions + commit group
                           |
             DOM host             Three host
```

Keep four concepts distinct: owner/VDOM hierarchy, dependency edges, action history, and publication policy. The DAG determines what depends on what; the tree determines key/lifetime/host structure; the action log determines the ordered state visible to each root; the publication group determines when ready work is shown. This distinction is already expressed well in the thesis and paper. Implement it consistently rather than putting all meanings into one “graph” object. [Evidence: `product-thesis.md`, “Product architecture”; `paper.md` §§1–2.5.]

Choose a small world implementation first. Owners and irregular lifecycle/resource records may remain object/Map backed. Dense numeric entity traits and prop bindings use typed columns where the compiler proves a batch layout. Sparse keyed child order uses existing bounded object buckets in marked regions. Do not turn arbitrary application objects into a generalized archetype engine before a named workload needs it. If reusing a project ECS is practical, isolate it behind the world contract; none of the current measurements establish that a particular ECS package is required.

Use stable entity handles with a generation or never-reused identity. Column row is storage, not entity identity: keyed moves must not reinterpret a row's state, and swap removal must update all row-to-host/source mappings. Key scope is parent/region plus key, not global key strings. A changed component type or committed removal creates a new lifetime even if a later item reuses the same key.

### 4.2 Native JSX and state authoring

Provide a native package import and standard `jsx-runtime`/`jsx-dev-runtime` exports. Preserve classic factory support during migration. Automatic JSX helpers must handle the separately supplied key correctly; the existing classic variadic `jsx(type, props, ...children)` is not an interchangeable implementation of the automatic helper ABI.

Ordinary authors should write named function components, JSX props, `useState`, `useStore`, and native event handlers. The compiler supplies owner/site IDs and binding/region descriptors. Do not expose `ScalarSource`, source slots, binding IDs, `keyedOwnerReuseMode`, or hand-built compiler hint tokens as the routine authoring workflow.

Illustrative target API, **not currently implemented**:

```tsx
import { useEffect, useState, useStore } from "@runtime/core";

export function Item({ id, active }: { id: string; active: boolean }) {
  const [draft, setDraft] = useState(0);
  const selected = useStore(selectionFor(id));
  if (active) {
    useEffect(() => attachPresence(id)); // returns cleanup; activation lifecycle
  }
  return <button data-selected={selected}
    onClick={() => setDraft(value => value + 1)}>{draft}</button>;
}
```

The native `useEffect` follows the user's requested lifecycle contract: setup after committed activation; cleanup on committed deactivation/removal; no setup on each render. The native import makes the difference explicit. Document that setup captures the activation-time values. Changes to values that require synchronization belong in a separate declared reaction/task/subscription surface, with dependency-triggered cleanup/setup where applicable. Reject React dependency arrays in this native slice rather than quietly changing their meaning. The React island continues to use actual React effect semantics. [Evidence: `product-thesis.md`, “The user-facing contract”; `src/component_state_runtime.ts`, `useEffectAt`; compiler negative fixture `component_state_unsupported_effect_deps.tsx`.]

State at a skipped site persists while its owner lives. Effects at a skipped site deactivate on a successful commit and reactivate if reached again. Plain loops with stateful calls are rejected; repetition needs keyed child components or an explicit keyed scope. Custom hooks require a composed caller-site/callee-site identity; they are a later compiler increment, not supported merely because a collector finds nested calls.

Expose an advanced typed world/trait API for applications and extensions that naturally operate on entity batches, such as a simulation writing a Motion trait once per frame. Native JSX reads those traits through typed selectors; the compiler chooses the writer path. That preserves ECS as the shared state/event surface without making every UI author manually manage storage. Events carry typed payloads and source/owner metadata; DOM dispatch uses platform events, while the world schedules their data writes. No synthetic browser event system is required.

### 4.3 Shared state and snapshots

The public shared-state API should be approximately `createStore(initial, reducer)`, `store.dispatch(action, { transition? })`, `store.select(...)`, and `useStore(source)`. Native components should not call `beginRender`, `commitTransition`, or `commitAfterValidatedRender`; those are scheduler/adapter machinery.

Keep chronological head, visible root projection, and candidate inclusion sets. Reducers must be deterministic and must not mutate captured state. A root render pins its declared read set once; every read site uses it, and all versions are revalidated before host mutation. Selector previous values advance only after a successful host commit and are owned by root + reader site. Independent roots can show different valid versions. A coordinated group validates all its participating roots/stores together.

Fix head-only no-op suppression before using this as the shared foundation: equality at the head does not imply equality in every projected root. Specify selection equality, late reader attachment, open-scope visibility, repeated dispatch, release, compaction, and detach through the actual userland/fork cases. A selector composing multiple stores needs a complete captured source set; either implement this from the root read transaction or explicitly reject it. The current single-store snapshot cannot support it simply because `createStoreSelector` accepts a source array. [Source: `src/async_store_runtime.ts`, `dispatch`, `getStateForRoot`, `StoreRenderSnapshot.read`, and `StoreSource.read`; `async-store-transition-protocol.md`.]

Shared stores and local state use the same source ID/version/event system, but do not need identical physical storage. Local state can use owner/site cells; shared asynchronous state needs action history. Candidate preparation stages new owners, effect registrations, subscriptions, and outputs privately. Do not mutate committed owner lifetimes or host references while evaluating a candidate. Commit/removal is the point that disposes owners.

### 4.4 Compiler plan and dispatch

Use one versioned plan envelope with ownership/region descriptors, source symbols and types, value/task adjacency and order, host-property IDs, lifecycle sites, and structural capabilities. Different internal tables can retain separate schemas during migration; the product envelope must validate compiler/runtime ABI compatibility and keep source spans/debug names out of production hot loops.

At mount, resolve plan-local numeric IDs to root-specific owners, column rows, and host handles. Cache static adjacency and writer descriptors. Repeated updates coalesce dirty sources, compute reachable work in topological order, prune unchanged derived values, and invoke the selected sparse/bucket/dense writer batch. Structural work updates those same indexes; it cannot maintain a second incompatible binding world.

Start with static compiler choices and cheap known batch facts. Add a measured runtime density switch only when its accounting overhead is included. A numeric threshold from one fixture is not part of the public API. Expose read-only plan inspection and trace hooks: which source changed, which task/region ran, why a fast path bailed, what versions were validated, and what host writes were committed. Diagnostics should be optional and off in latency runs.

### 4.5 Keyed structure and fallback

Keep the general keyed reconciler as the correctness baseline. Arbitrary arrays, dynamic branch structure, opaque functions, and global filter/sort results can legitimately require a full region evaluation. The compiler may narrow invalidation, but cannot turn an opaque `applyNext(previous)` into a proven one-key edit.

Add a versioned collection/region delta contract for operations the compiler can prove: insert/remove/move/replace with stable keys and anchors. The advanced collection API may record operations; ordinary JSX can map that collection. Emission must use a current region version and update only changed owners/subtrees, bound-writer registrations, key/region indexes, host placements, and effect records. Reject malformed deltas before mutation; fall back when a proof fails. Never trust a manually retained membership token after row data changes.

Acceptance must count owner visits, host rows inspected, writer attach/detach, and key-index writes. A one-key edit should scale with the changed subtree and bounded bucket work, not list length; a global filter is tested separately and need not pretend to be constant-time. This is the next necessary integration experiment, not a request for another standalone tree data structure.

### 4.6 Async tasks, boundaries, and overlapping transitions

Expose typed task declarations and a transition handle with explicit root/reveal policy. Suggested concepts are `task(...)`, `runtime.transition({ roots, policy: "keep-previous", key?, mode? }, scope)`, a read-only pending/result/error handle, and a boundary that reads task resources. The exact spelling should follow the first usability pass.

Known task inputs become graph edges; independent ready I/O starts together; dependent tasks start when their own prerequisites resolve. Separate value edges, ordering constraints, and publication groups. Version read sets and declared writes determine freshness. Default to no speculative guesses; resource-key deduplication and speculation are follow-ups with explicit budgets.

**Independent transitions must coexist on one root.** Maintain transition/task records separately from a root's currently prepared candidate. A root work queue can hold several transition IDs, publish a ready subset, then reconstruct/rebase the root projection over its latest committed state while other transitions remain pending. Explicit `replace` semantics under a matching operation key can supersede a previous search/navigation; root overlap alone must not cancel unrelated likes, feed updates, or inspector work.

Store actions remain in dispatch order, including after reducer replay. Task completion order may differ. Do not confuse dispatch order with click/launch order: the current stress app dispatches its publish action only when its DAG resolves, so those log entries are naturally ordered by resolution-time dispatch. If an application needs launch-order publication, its action model must represent that explicitly.

Start with keep-previous for already revealed content, a local pending indicator, a startup fallback for a never-committed region, and localized error/retry. An aborted candidate runs no effects and releases private references. Reject stale results regardless of whether an underlying I/O provider honors `AbortSignal`. Cancellation of preparation and cancellation of a dispatched domain action are different contracts: the existing store release retains actions, so optimistic rollback must be an explicit compensating action, not accidental deletion by scheduler cancellation.

Completed-output reuse outside an invalidated dependency closure is already implemented. Independent **in-flight** task reuse requires task ownership separate from one candidate controller, input-version/resource identity, and reference-counted cancellation; defer it until the queue is correct. The existing async scheduler launches synchronous callbacks serially, and has no general preemption/yield mechanism. Add cooperative task-boundary yielding where actual CPU work demands it; do not promise arbitrary component code can be interrupted or parallelized.

### 4.7 Multi-root commit, effects, and hosts

A runtime instance owns a world; roots are mount/reveal subscriptions into it. Forking shares action/source/task identity while giving the new root an independent committed projection and boundary policy. Root IDs are public opaque handles, not global DOM keys. Disposing a root releases readers, tasks, region indexes, subscriptions, and transition holds.

Host adapters should implement typed create/text/prop/event/place/remove/dispose behavior plus optional specialized property writers and commit hooks. Extend the current `VDOMHost` with explicit disposal and property descriptors; remove hardcoded `HTMLElement.style` from generated cross-host plans. The compiler targets property IDs/capabilities; the adapter resolves them to DOM style or Three object writers.

Prepare candidate operations and validate all read/host base versions before committing. Apply a coordinated DOM group in one non-yielding host task; defer user lifecycle callbacks and store notifications until all participating host/state pointers are published. The guarantee is coherent publication at this declared boundary, not rollback of arbitrary host side effects or simultaneous pixels across DOM and GPU hosts. A custom host may fail; specify terminal group error and controlled remount/recovery rather than blindly retrying an already-partial commit.

DOM adapter coverage must include listener replacement and cleanup, property-versus-attribute rules, controlled input selection/composition/focus, boolean properties, style clearing, SVG namespaces, custom-element properties/events, refs after commit, and disposal. Current tests cover a useful subset; `DOMVDOMHost.createElement` uses `document.createElement`, and generic null removal uses `removeAttribute`, so broad SVG/form semantics are not already guaranteed.

The small Three adapter must demonstrate position/rotation/material props, keyed object movement/removal, object event routing, and shared geometry/material ownership. Borrowed/shared resources must not be disposed because one entity leaves; runtime-owned resources dispose once. Its host registry can carry value types and compiler optimization hints. Prove this with a real scene before making the host API stable. [Evidence: `src/vdom_snapshot_runtime.ts`, `VDOMHost` and `DOMVDOMHost`; `src/jsx_binding_runtime.ts`, vector bindings; `product-thesis.md`, “Priority order.”]

### 4.8 React interop and extensions

Ship a React wrapper that mounts a native root into a bounded container, updates boundary props, forwards events, and disposes on React unmount. Add native-hosted React islands only if a concrete bridge needs the reverse direction. Avoid dual ownership of the same DOM subtree. React context, refs, portals, hooks, and effect semantics do not cross automatically; use explicit bridge inputs and real React providers inside the React-owned subtree.

For cross-boundary shared state, expose a committed snapshot subscription suitable for React's public APIs, and document that this does not endow ordinary React external-store readers with the native root's transition projection semantics. A fork-specific store adapter is a separate experimental integration. Version every supported library bridge and list its limits.

Expose host/property registries, typed trait/source/task definitions, read-only dependency queries, plan diagnostics, and a bounded compiler-extension registration seam. Extensions supply validated value types, dependencies, capabilities, and purity/serialization declarations; they do not reach into private reconciler maps or inject arbitrary mutable scheduler work. JSX intrinsic types derive from the chosen host registry. Treat compiler hints as checked contracts where possible; a TypeScript annotation alone cannot prove purity, thread safety, or safe speculation.

Package boundaries should be few: `core` (world/owners/state/VDOM/scheduler and JSX helpers), `dom`, `compiler` plus a Vite plugin, `react`, and `three`. Keep trace tooling optional and benchmark archive middleware out of distributable runtime packages. Preserve internal module boundaries even if package splitting changes later.

## 5. Making Rust OXC a real build-time product

### What exists today, exactly

The spike pins OXC 0.153.0 parser/AST/semantic/visitor/span/allocator crates. It does not depend on `oxc_transformer` or `oxc_codegen`; emission uses Rust strings and source-span text edits. Semantic scoping is real, but source-map-safe general lowering is not. [Source: `compiler/oxc-spike/Cargo.toml`; `compiler/oxc-spike/src/main.rs`, `transform_component_state_source`, `generated_module`, and main mode dispatch.]

| Compiler mode | Supported tested slice | Important limits |
| --- | --- | --- |
| Repeated host/binding plan | Static intrinsic root; direct `.map((item, index) => <intrinsic .../>)`; one style object of direct imported `bind` calls; static dotted item/shared parameter paths; expression-bodied one-parameter projectors; multiple fields/source slots; local/shared CSR plus DOM writers | Supplied key must use map index; dynamic root/item attributes outside represented style/key fail; arbitrary nested/dynamic JSX and style expressions are not lowered. This identity layout cannot serve changing entity membership unchanged. The collector selects a recognized pattern; it is not a whole-program exhaustive compiler |
| Derived keyed region(s) | Recognized named collection/filter/map shapes, simple item-path keys such as `row.id`, predicate-source tracking, separate query regions and shared rows | Not arbitrary control flow or incremental filter maintenance; selecting a region can still scan/derive the full region. See `compile_derived_keyed_region(s)` and the Task B/query fixtures |
| Component sites / transform | Named capitalized synchronous function declarations; direct imported `useState`/`useEffect` calls with static lexical IDs; state-site-to-owning-component graph; TSX text rewrite to `defineComponent`, `useStateAt`, `useEffectAt` | Hook imports must be named, unaliased, and exclusive in one declaration; effect accepts one callback, no deps array. Arrow/anonymous/async component lowering and unscoped hooks are rejected or outside this slice. No general custom-hook expansion, repeated-hook ownership proof, derived-read graph, or edit-stable HMR site identity |
| Async task plan | Exclusive named unaliased `asyncTask` import; literal nonempty IDs without `:`; optional literal string dependency array; inline arrow/function callback; literal `.get("key")` on the resolved first parameter; cycle/unknown explicit task validation; topological order and source spans | Aliased/computed/destructured input access and hidden helper reads are not soundly inferred. An unknown inferred read is classified as external `$input`, so typos need declared-input validation. Bodies are not emitted by this mode, and arbitrary async component reads do not become tasks |

These are separate modes, not one composer that accepts an application and emits its complete semantic plan. Some unsupported constructs produce negative-fixture diagnostics; others are simply beyond the collector's coverage. “Not supported” must not be confused with “already safely rejected in every context.” Build an exhaustive support corpus and reject/fallback explicitly at each owned semantic region. Verify helper imports by module/export symbol, not merely a familiar local name or generic `ImportSpecifier` kind.

### The stress app is meaningful integration, but still partial

`package.json` dev/build run `compiler:async:plan`; `scripts/run_async_task_plan_compiler.ts` compiles `compiler/fixtures/async_transition_stress.ts`. The emitted module contains `$request → load-content`, `$request → load-target`, and a join into `compose-update`. `src/browser/async_transition_stress_v1.tsx` binds those edges to timed implementations and calls `executeAsyncTaskPlan`. This is real Rust-generated dependency planning, not only JSX syntax lowering.

However, the timed callback implementations are separately handwritten in the browser file. The binder checks task IDs and order but cannot prove their reads still match the declaration fixture. The custom compiler does not analyze the stress TSX component tree. Vite's `oxcGeneratedClassicJsxPlugin` lowers its JSX through `transformWithOxc`; root commits bypass `AsyncVDOMTransitionRuntime`. There are now three retained roots, including progress, and the auto interval is 820 ms rather than the protocol/notebook's 520 ms. Task signal cancellation and boundary errors are not exercised; progress animation is timer-based, not readiness telemetry. No latency budget or React-equivalent overlapping-candidate trace is archived. [Source: `package.json`; `scripts/run_async_task_plan_compiler.ts`; generated stress plan; `src/browser/async_transition_stress_v1.tsx`, task binding/startTransition/renderRoot/auto loop; `vite.config.ts`, `oxcGeneratedClassicJsxPlugin`.]

### Next integration boundary

**Compile the actual authored native module once, emit its executable callbacks and plan together, and run both dev and production through the same Vite plugin.** This removes the declaration/implementation drift boundary and makes the compiler half of the offering concrete.

Recommended pipeline:

1. Select native modules by configured package/import/source marker, keeping React island files on their own build path.
2. Parse TSX and resolve semantic symbols using the pinned Rust frontend.
3. Recognize the supported owner/state, pure derived-read, task, host prop, and keyed collection slice. Emit diagnostics or explicit whole-region fallback for unproven ordinary expressions. Unsupported ownership constructs require errors, not positional-hook fallback.
4. Build a language-neutral UI IR. Validate source types/capabilities, external task inputs, cycles, write ownership, keys, and compiler/runtime schema versions. Preserve debug spans and dependency reasons.
5. Emit executable JS plus plan descriptors from the same AST/IR. Use proper AST transformations/codegen or source-map-aware edits during the transition; retire unchecked string substitutions as coverage grows.
6. Perform TS syntax removal and standard JSX lowering **after** custom analysis, with the native runtime's automatic helpers or the existing classic factory. OXC's built-in JSX transformation is useful here; it does not construct ECS ownership, dependencies, transitions, or sparse keyed operations. The official [JSX documentation](https://oxc.rs/docs/guide/usage/transformer/jsx.html) exposes classic/automatic runtime options and custom import sources. Its [built-in plugin documentation](https://oxc.rs/docs/guide/usage/transformer/plugins.html) does not establish a Babel-like arbitrary custom-pass API for this compiler. Compose the pinned Rust crates in our driver rather than assuming such a hook.
7. Return code, composed source map, diagnostics, dependency/watch files, plan ABI, and deterministic hashes through a small compiler-driver protocol. Start with a persistent Rust process behind the Vite plugin; a Node/native binding is optional after measuring process/cache cost. Do not run `cargo run` per module transform in consumer builds.
8. Run the project's supported TypeScript checker independently. Pin the actual checker/version and measure the interface; OXC parser semantics are not whole-program TS type checking. Avoid basing the plan on unverified prose about the latest TypeScript distribution.

The first integrated corpus should cover the real stress module's declared tasks plus a native counter/keyed list, conditional lifecycle, a shared selector feeding two regions, and numeric host props for DOM/Three. Initially require named functions and direct statically identifiable source reads. Arbitrary getters, unknown calls, mutable closures, `eval`, loop hooks, arbitrary promise reads, and cross-module inference can fall back for pure render work or fail where correctness/lifetime cannot be guaranteed.

A supported component may run generic VDOM evaluation without every prop being specialized. But at least the intended real-time source-to-prop path must be inferred from normal native state/trait reads rather than requiring app code to manually call `bind`. Otherwise the prototype remains a binding library with a JSX facade.

Source-site identity is stable within a compiled revision today: it uses path/component name and hook ordinal. Adding a preceding hook changes later IDs. Publish a conservative HMR contract: remount an owner when site layout changes; preserve state only where a compiler migration map proves compatibility. Do not claim persistent lexical identity across arbitrary edits.

Compiler acceptance: every positive fixture runs parse → semantic IR → emitted code/plan → full-recompute parity; every negative fixture gives a source-positioned diagnostic; native keys survive production lowering; actual imported helpers are resolved correctly; moving a source file or editing a callback invalidates cache and rebuilds the plan; generated output is deterministic; schema mismatch fails clearly. Measure clean/incremental compile time, peak memory, output size, and diagnostics against the working route on this shared corpus. This comparison is a tooling decision, not permission to infer runtime speed from Rust.

## 6. Delivery phases and measurable gates

Timeboxes below are allocation limits for one focused team, not delivery promises. Do not let one failed gate repeatedly expand its experiment matrix. Each gate produces a decision record: pass, narrow the promise, or defer the feature.

### Live implementation status — 12 October 2026

The native numeric-state/compiler slice now supplies `createDOMRoot`,
`createNativeRoot`, and `createWorld`; Rust compiles explicit state/effect site
IDs, component metadata, and proven numeric intrinsic prop/style expressions.
The browser smoke fixture passes pause/resume/nudge, keyed draft/reorder/
remove/remount, generic fallback, and pagehide cleanup. Direct numeric updates
skip owner execution without a full source-cache scan. The scalar keyed-delta
path incrementally attaches/detaches its Set writer. See
[`src/native_runtime_api.ts`](./src/native_runtime_api.ts),
[`native-state-props.html`](./native-state-props.html), and the dated
[`status archive`](./implementation/2026-10-12-native-state/status.json).

This advances the Phase 1 compiler/runtime seam and part of Phase 2B, but neither
phase passes its full acceptance gate. Phase 2A still needs the shared-store/root
queue behavioral matrix (including held-transition replay and readers, two
out-of-order transitions, cleanup/release/reentrancy, and the full log-projection
oracle). Phase 2B now has a narrow compiler-emitted keyed-collection path, plus
insert/move/replace/remove correctness at 1,000 rows and apply/flush/writer
counter tests at 1k/10k/50k. It remains short of the broad randomized,
full-fallback, and mixed-dependency gate; CSR and columnar compiled paths still
use fallback. Phase
3's mixed-workload comparison and second-device confirmation, followed by Phase
4's public Three/React host adoption and extension validation, remain gated on
those contracts. The smoke check provides no performance or compatibility
result.

### Native store/collection follow-up — 12 October 2026

The authored API now uses `use(store)`, `createStore`, and
`createStoreSelector`; Rust lowers `use(store)` to `useStoreAt` with compiler
site IDs. `useStore` is temporary compatibility surface. Built-in
`AsyncStore`/`StoreSelection` supports multiple dependencies, private
subscription and candidate-history staging, and root-local notification
generations. The native execution check passed two roots, two simultaneous
transitions with out-of-order independent root publication (right/left
projections `37/34`, then `39/36`, then both `39`), held-transition urgent
replay, failed-candidate flush/retry, and cleanup. The browser check passed
held `+100` plus urgent `+1` settling at `101`, urgent replacement `0` surviving
held commit, focused draft/node preservation, and pending pagehide cleanup with
roots/listeners/readers/transitions all zero. These projections do not prove an
atomic host-group commit, and native rootQueue integration remains open.
`use(store)` returns a Promise unchanged when the
store value is a Promise. Direct `use(Promise)` and automatic resource
suspension are not implemented; resource Suspense and transition orchestration
are not integrated with the native root queue. Numeric prop updates continue
to skip owner execution with a stable store HUD.

The advanced `storeDependencies` symbol lets a custom `StoreSource` adapter
declare its complete dependency graph. Render transactions pin the declared
stores and reject undeclared reads or cycles; the ordinary author API remains
`use(store)` and selectors. The adapter contract is covered by
[`src/store_render_transaction_test.ts`](./src/store_render_transaction_test.ts).

The versioned linked-map collection primitive passes 11 contracts for
transactional operations, cursors, subscriptions, and immutable descriptors.
The compiler now recognizes the supported `createKeyedCollection` mapped
keyed-`Row` form and lowers it to a lexical `renderCollectionAt` site with
unique row-owner regions. The current specialization requires one pure Row
region per root, a single host root, no store reads, and native scalar props.
Runtime membership updates process changed depth, attach/detach scalar writers
incrementally, and clear stale snapshots without materializing all siblings.
The compiled [Node `MemoryVDOMHost` harness](./compiler/native_collection_execution_test.mjs)
passes a 1,000-row sequence for
insert, move, replace, remove, owner lifetime, failed-candidate recovery, nested
intrinsic state, and parent-count fallback. Separately, the
[32-row Portless browser check](./native-collection-props.html) passes direct
RAF updates without owner execution or source-cache scans; targeted lookups
avoid full snapshots, preserve surviving editable row/
input identity and draft, and effect/writer counts go 32 → 33 → 32. Pagehide
cleanup leaves collection counters, readers, and history zero. Counter tests at
1k/10k/50k include apply, flush, and writers but establish no latency benefit.
A [Node 24 GC probe](./compiler/native_collection_retention_test.mjs) provides
narrow removed-row retention evidence, not a full heap profile.
The production build and type-check pass. A native HMR browser check disposes
the old root with effects, writers, readers, and history at zero, then performs
exactly one 32-row remount. Vite excludes native browser entries from React
Refresh; the explicit native HMR policy owns that remount. This is still a
partial Phase 2B result, and it does not close the mixed-workload, async-resource,
or host/adoption gates.

The compiler/runtime path remains constrained: unsupported callback/index/alias
forms diagnose, arrays remain generic, and intrinsic
collection entries or nested collection regions, multiple regions, extra parent
reads, mixed local/store/collection dependencies, and expired readers retain
full fallback. Module-wide extra collection-read detection is now in place:
proven event-closure reads are excluded, while additional render reads emit
`requiresOwnerRender` and select generic full-owner rendering. Terminal host
mutation exceptions stop retry until disposal. Phase 2A has verified scenarios but not its full
matrix: late readers/attachments, selector changes, promise state, scope and
compaction behavior, stale-snapshot retry, and complete reentrant/disposal
coverage still need the log-projection oracle. Next collection gates are
randomized parity against full recomputation and bounded owner/host work across
the supported region/fallback boundary, then the integrated mixed-workload
comparison and public Three/React host validation.
See the planned [`native-store status archive`](./implementation/2026-10-12-native-store/status.json)
and [`native-collection status archive`](./implementation/2026-10-12-native-collection/status.json).

**Async foundations checkpoint (2026-10-12):** The resource table now tracks
PromiseLike identity, recursively resolved values, pending/rejection tokens,
one-shot settlement and isolated listener delivery. Candidate-local resource
read sets record pending siblings and reject stale readiness. Owner preparation
keeps new slots and conditional state cells private, snapshots numeric reads,
validates cell revisions and slot identity, and publishes without callbacks.
Parent shape generations conservatively invalidate sibling structural changes;
removed keys leave no revision tombstones. Queue discard runs before settlement
observers; `afterCommit` sees every group version already published. Independent
integration tests cover numeric staleness without a host-version change,
group owner publication, resource completion order, rejection and detachment.
Controlled Node GC checks retained setters release discarded and old published
values. These are foundations, not native Suspense: `ComponentStateRoot` still
needs its prepare/host/pointer/effect split, snapshot-binding remapping, resource
boundary traversal and transition/store inclusion integration. Public `use`
continues to accept stores only. See the
[`async-foundations archive`](./implementation/2026-10-12-async-foundations/status.json).

**Native queue integration checkpoint (2026-10-12):** Native roots now expose
private `prepare` candidates with validation, host commit, pointer publication,
effects, discard and terminal group failure phases. `NativeRootWorkQueue` wires
these candidates to independent overlapping work and synchronizes urgent root
publication revisions. Numeric snapshot bindings remap to canonical sources
before host writes, preserving subsequent direct prop updates. Candidate store
holds prevent one discard from detaching another candidate's readers. Group
publication installs every root before cross-store notifications or effects;
a publication barrier defers reentrant flushes until lifecycle installation
finishes. Disposal during setup stops later activations and cleans returned
resources; host disposal failures still release runtime ownership.

An actual Rust/OXC-compiled TSX execution fixture checks two stores/two roots,
reverse readiness, urgent replay, preserved drafts and host identity, numeric
writers after publication, cancellation and teardown. The public
[`native-root-queue demo`](./native-root-queue.html) uses authored TSX and
`use(store)`, with elapsed timer progress, two shared groups, a separate
fork-owned update, editable drafts and explicit "Cancel wait" semantics.
Canceling a wait retains its dispatched action and explicitly finishes its
scope; it does not implement optimistic rollback. Desktop/mobile browser and
HMR checks exercise these contracts. Controlled GC probes cover retained
candidate handles releasing discarded/removed render data. This closes the
native candidate/publication seam, not Suspense or the complete store oracle
gate: automatic `use(promise)`, boundary traversal/prewarming, localized
fallback/error/retry, transitions and task-DAG binding remain required.
No latency, allocation-rate, size superiority or cross-thread claim follows
from these correctness checks. See the
[`native-root-queue archive`](./implementation/2026-10-12-native-root-queue/status.json).

**Native resource boundary checkpoint (2026-10-12):** The public `use` surface
now has store, Promise and resource overloads, with lexical Rust lowering to
`useAt`. Stores preserve Promise values; nested `use(use(store))` unwraps them.
Rust injects reserved lexical Suspense identities. Boundaries have scoped ECS
owners, separate child identities and rollback journals for owner state, store
reader staging, lifecycle registrations and expansion artifacts. Resource-free
children do not acquire sibling rollback savepoints.

Startup boundaries observe reachable pending siblings and publish local
fallback. Revealed primaries can retain their raw description and re-evaluate
local state/current pinned stores while replacement resources wait. If that
description still reads an unresolved source, publication waits rather than
mixing snapshots. Rejection routes to a local error renderer, and replacing the
resource identity retries it. Ordinary full-root renders now use private native
candidates as well. Stale input cuts rebuild before host publication.

`NativeRootWorkQueue` discovers pending resources from every declared root,
discards incomplete groups and retains only observer/dependency interests while
waiting. Settlement or source changes replace the frontier and prepare fresh
candidates. Its transition publication accounts for stores discovered in prior
waves even when the final error branch no longer reads them. Providers and
domain compensation remain caller-owned. The browser workbench checks editing,
urgent updates, grouped reveal, rejection/retry, three overlapping loads,
cancellation, HMR and teardown. Seeded chronological-store oracle traces add
projection and compaction evidence. See the
[resource archive](./implementation/2026-10-12-native-resource-boundaries/status.json).

These checks advance Phase 2A; the whole gate remains open. Compiler task-DAG
binding and hidden-descendant prewarming, the full userland/fork behavioral
matrix, optimistic compensation and input/composition stress still need finite
acceptance coverage. This slice provides no new performance, size or parallel
CPU execution result. Public Three/React hosts, packaging, maintainability and
integrated workload comparison remain required.

| Phase | Dependencies / work | Deliverables and acceptance | Decision if it fails |
| --- | --- | --- | --- |
| **0. Close the research handoff**; 1–2 focused days | No implementation dependency. Inventory accepted records, source locks, notebook cells, and current verification failures | One evidence/status ledger, reproducible verification command set, frozen baseline copy, explicit MVP exclusions. Label current store errors and no-op defect. Historical raw data remain untouched | Missing historical assets become a disclosed reproducibility limit; create a separately versioned baseline, never rewrite old hashes |
| **1. Product kernel and actual compiler seam**; roughly 1–2 iterations | Phase 0; can proceed while device/participant logistics run | Native module-to-plan Vite plugin, owner/source/host IDs, DOM counter/list, shared two-region example, pure derived task. No kernel-private calls in app source; dev/production/type checks pass. Existing 79 contracts remain and new source→plan differential cases pass. One authored task body supplies both reads and execution | Restrict supported syntax explicitly. Do not expand arbitrary TSX/custom hooks until the support corpus is sound |
| **2A. Shared-store and root-queue semantics**; one bounded iteration after source IDs exist | Phase 1 identities; existing action-log prototype and userland/fork cases | Port held-transition urgent replay, head-equal/visible-changing action, two transitions and out-of-order completion, late readers/root attachment, changed selectors, promise state, scope errors, release/compaction, stale snapshot retry, detach, reentrant notifications, and disposal. Use fake clock/controllable promises and seeded traces. Every pinned read agrees with a simple log-projection oracle; stale work/effects never publish | Withhold overlapping-transition/Suspense promise. This gate is mandatory before a transition-enabled MVP, not replaceable by a timer demo |
| **2B. Structural + compiled-binding integration**; profile then one implementation iteration | Phase 1 IDs; separate from 2A but joins before mixed benchmark | Attribute scalar notification/selection/dispatch and structural owner/VDOM/index/host costs. Implement exactly one compiler-visible collection-delta path with writer attach/detach. One-key edits at 1k/10k/50k show changed-owner/bounded-bucket work without full sibling scans. Randomized insert/remove/move/replace and full-filter fallback match a full recompute after each step; surviving state/host identity and new state lifetimes pass | Retain generic fallback and narrow performance to stable topology. No new B+ tree/cache family without a diagnosed residual cost |
| **3. Integrated product evidence**; one preregistered comparison plus one independent-device confirmation | 2A/2B for relevant arms; archive tested build before collection | Re-run mixed realtime with generated scalar/columnar + supported deltas, verified React Compiler, lifecycle-inclusive totals, and separate memory profiles. Reuse mixed V1 target: paired geometric mean median ratio ≤0.80 at ≥2 sizes, paired p95 ratio ≤1.10 at every size, all correctness contracts pass. Replicate named fixed-topology episode on second physical device with calibrated clocks. Preserve every scheduled page | Failing mixed gate blocks “dynamic realtime faster” marketing; it does not erase a replicated fixed-topology benefit. If named benefit and usability both fail, stop general renderer investment and retain compiler/binding mechanisms only |
| **4. Host/adoption validation and private alpha**; alongside late Phase 1–3 | Kernel/property contract available; stable publication before async host claims | A Three scene and React island use only public APIs. Dense prop updates plus add/remove/reorder, shared resources, events, refs/effects, urgent HUD/store updates, and teardown work without kernel forks. One independent developer adds one property/task/adapter capability with no private imports. Inspectable traces explain invalidation and fallback | Fix/narrow the host contract before API freeze. No promise of R3F/drop-in library support |
| **5. MVP and public beta** | Type/correctness/async gates; declared performance evidence; usability feedback | Installable packages, syntax/support matrix, examples, compiler diagnostics/source maps/watch, HMR policy, versioned schema, bundle/setup reports, cleanup checks, one selected bridge if useful. Pilot and extension task results inform API simplification. CI runs maintained contracts plus meaningful integrations | Ship explicit limitations only where the product remains useful; do not silently rebrand incomplete async safety or arbitrary JSX as supported |
| **6. Optional execution and delivery backends** | An actual user workload and stable task/state/host contracts | First worker prototype: immutable serializable inputs, dependency read versions, isolated writes, cancellation, transfer accounting; require end-to-end benefit after startup/transfer/commit. Only then specify server snapshot/patch/resource stream and hydration ownership/recovery. Reordering/duplication/disconnect/replay must converge and preserve newer client actions | Keep these out of the default distribution when costs or semantics fail. CRDT enters only with independent concurrent writers needing merge semantics |

### Async acceptance must measure the real promise

Upgrade the existing stress example into an actual queue/boundary consumer. Give every transition/task/action/root commit a trace identity. It must show at least three independent transitions overlapping on one root, plus fork-only and grouped-root work, while text input and optimistic rollback continue. Reverse resource completion order, cancel one task, reject one resource, change a dependency, detach a root, and dispatch during notification. Verify:

- No ancestor fallback insertion after startup for the declared keep-previous boundary.
- Surviving keyed DOM/owner state remains stable, and cleanup runs only after committed deactivation/removal.
- Independent transitions are not canceled merely because they share a root; an explicit replacement key supersedes only its own work.
- All readers in a root commit see the pinned state; a stale candidate rebuilds from fresh state and cannot publish old task output.
- A requested commit group publishes before user callbacks/notifications can observe a half-group; unrelated roots can commit independently.
- Every optimistic compensating action affects only its intended domain action; teardown leaves no readers, transition holds, task references, or marked-region index entries.

Only after a correctness pilot, freeze equal action/timer/rollback workloads against preloaded React and, for store semantics, the user's fork. A proposed responsiveness guard is p95 input-to-next-RAF no more than one calibrated idle frame worse than React, plus no input-loss/focus/composition failures; report commit latency and long-task distributions separately. This is an engineering acceptance proposal to freeze before collection, not an existing measured threshold or physical input-to-present guarantee. Do not add an async-completion speed requirement when the same I/O critical path dominates both implementations.

### Maintainability and replication are finite gates

Run the existing two-task crossover after piloting the packet/rubric and freezing final starter/build hashes. Preserve its rules: minimum six complete paired participants; at most one net additional runtime correctness failure and no unresolved runtime-only lifetime defect; median comprehension gain ≥2/10 with ≥75% favoring runtime; median correctly completed task-time ratio ≤1.10 with no extra timeouts; blinded review must not find compensating conceptual burden. It can justify “simpler on these tasks,” not universal maintainability.

Add a separate bounded extension exercise: one developer adds a host property and one task/source declaration, follows the emitted dependency to a commit, and handles cleanup without editing the kernel. Use correctness, traceability, private API dependence, time, and confusing concepts as outcomes. This checks the core extension promise missing from the current study. Poor results should simplify public APIs, not provoke another storage redesign.

Independent-device replication should reuse the exact archived artifact where possible. The current second-device protocol assumes old production bundles remain available, which is not fully true now. If a locked bundle cannot be recovered, preregister a new named replication/reimplementation, preserve the old result, and explain the distinction. Device logistics should run alongside engineering; absence of a second machine blocks generalization, not all product work.

## 7. Rebalancing the work so it converges

“Fix and update the balancing” is ambiguous. In the latest parent turn it most reasonably means rebalance the research-to-product plan and its implementation priorities. There is no explicit new request to change Snake gameplay balance, benchmark arm-order balance, or scheduler load-balancing code. This plan addresses project allocation and also defines bounded runtime dispatch/candidate scheduling decisions; it does not alter gameplay or collected schedules.

Replace the current long list of “next research” with three active tracks and a fixed decision date per iteration:

| Allocation | Track | Work allowed to enter |
| --- | --- | --- |
| **60%** | Product integration | Real module compiler, common identities, store correctness/root queues, structural-binding index integration, examples and host contract |
| **25%** | Decision-changing verification | One mixed-cost diagnosis and confirmatory gate; finite device replication; separate allocation/disposal profile; store state-machine/differential cases |
| **15%** | Adoption/comprehension | Developer-study freeze and sessions, small Three/React island work, extension exercise, documentation/trace usability |

These percentages are planning guidance, not a measured optimal staffing ratio. During the store correctness gate, prioritize correctness over timing. While a device/participant is unavailable, use that capacity for the existing product tracks; do not invent a new research branch to fill the wait.

Each remaining experiment must state its architectural decision before work starts:

| Remaining work | Decision it may change | Stop condition |
| --- | --- | --- |
| Head/visible equality, reader attachment, overlapping queue, compaction/reentrancy cases | Store visibility/dispatch semantics and queue ownership | Oracle/differential correctness passes; no need for repeated latency studies of the same contract |
| Actual module compilation and unsupported-read corpus | Compiler IR/import/read inference boundary and fallback policy | A finite supported corpus passes and unsupported semantic forms fail clearly |
| Mixed workload phase profile, then one integrated delta/columnar implementation | Sparse structure + writer indexes and dense dispatch policy | Confirmatory mixed gate passes, or restrict the product to stable topology; another change requires new attribution |
| Second-device fixed-topology episode, with replayability repaired | How widely to claim the prop-update win | One preregistered independent confirmation/failure reported; not a hardware survey |
| Controlled allocation/retained-object diagnostics | Whether writer/owner/index lifetime requires redesign | Known owners/listeners/tasks/host resources release across repeated lifecycle cycles; timing runs remain unprofiled |
| Developer and extension tasks | Whether native authoring and public host/plan boundaries need simplification | Existing pilot plus one extension exercise completes; state the narrow result |
| Actual Three scene | Whether host capability/property/disposal abstraction holds | Scene works through public interfaces, without a second reconciler or private runtime imports |

Stop or archive as complete:

- More static scalar graph-versus-scan matrices, arbitrary bucket-size sweeps, and additional direct-DOM wins. The existence of a sparse/dense/locality crossover is established.
- New owner-cache/token variants that continue the known 10,000-owner scan.
- A wholesale SoA/B+ VDOM rewrite. The parallel-array result does not justify it.
- Timer-only async completion contests or deliberately sequential React comparisons as evidence of superiority. The equal-preload question already has an answer.
- Repeating LoAF collection to assert display smoothness. Existing thresholded diagnostics did not observe presentation or identify the callback gap.
- Worker scheduling, Wasm/SIMD/JIT, streaming/hydration/CRDT design, and generalized cache work before a product workload needs them.
- Treating documentation expansion, render counts, fewer lines, or small counter bundles as maintainability proof.

A failed product gate should narrow the claim rather than restart the entire architecture. Keep the coherent JS/VDOM/compiler product if it supplies a replicated named benefit and usable async/host model. If it cannot do either, preserve the valuable compiler/binding mechanisms and stop spending as if a universal renderer is already justified.

## 8. Status corrections and provenance work

These corrections should be applied in a later documentation change. This request writes only this plan. Frozen protocol content should remain immutable; attach an outcome/status note outside its hashed contents.

| Stale or conflicting material | Correction |
| --- | --- |
| `async-dag-frontier-v2-protocol.md` header says collection pending; thesis/paper passages still call frontier the next study | V2 collection is complete, 30/30 blocks. Keep the preregistered protocol frozen and point its surrounding status/index to the result |
| README/thesis list broad exploration as paused while later runtime/async integration continues | Specify “no new architecture/backend branches”; allow the bounded product integration and decisive gates above |
| Stress protocol/log/notebook say no type check/browser work and no async scheduler use | Original parent chat records a production build/browser demo; code now invokes the generated task DAG. It still lacks an archived correctness/performance trace for the queue/boundary promise. This audit's type check fails; distinguish successful transpilation/build from checked source |
| Stress protocol/notebook describe two roots and 520 ms loop | Current code has workspace, inspector, progress roots and an 820 ms interval. Freeze the actual workload before measurement |
| `compiler-tooling.md` says no scheduler/dynamic structure/compiler Vite integration without qualifiers | Rust now emits static async task plans and component/derived-region metadata; runtime scheduling and generic structural reconciliation exist. The custom Rust application transform/plugin and compiler-emitted sparse membership operations do not. The Vite classic JSX plugin is standard lowering, not that product compiler |
| `testing-strategy.md` has old concluding statements about whole-tree component reexecution, pending tree-shape/browser work, and missing lifecycle/native-state integration | Update the live case ledger from current tests/results. Tree-shape notebook code/output and generated lifecycle/event tests exist. Keep new store/queue/ref/full-host gaps explicitly open |
| `paper.md` §4 describes teardown-inclusive amortization as unmeasured | Lifecycle V1 closes its fixed-topology 300-update episode; broader lifecycle/dynamic/cold-load costs remain open |
| Thesis priority table duplicates the later worker/streaming row, and the next-gate sequence repeats number 3 | Remove duplication and use the dependency order in §6; move adoption/host proof before backends |
| Notebook frontier Markdown uses 144.7 ms while prose uses 144.8 ms | Raw aggregate is approximately 144.75 ms with floating-point/rounding sensitivity. Choose one reporting convention; no substantive conclusion changes |
| Historical locks are described as fully reproducible from the live tree | Distinguish raw-data integrity, source-at-collection verification, archived replayability, and current-source drift. Never imply an old result evaluates the new store/hybrid implementation |

The provenance issue is material. This audit found 11/14 current frontier V2 source hashes still matching, with `src/async_vdom_transition_runtime.ts`, `vite.config.ts`, and `package.json` changed. Of 49 locked production artifacts, 43 still match, the benchmark HTML differs, and five old content-hashed JS assets are absent. Lifecycle notebook output already reports four changed/unavailable live paths and no separate V1 production source bundle. The mixed V1 manifest explicitly records loss of the original hashed protocol text while benchmark sources and raw records remain auditable. These limitations do not erase the observed raw results, but they prevent claiming complete exact-bundle replay from today's directory.

Future studies should archive source, production artifacts, manifest, schedule, environment, compiler evidence, analysis version, and raw records together before editing implementation. Preserve baseline data separately from product development. The notebook should derive concise decision/status views from this ledger instead of growing another unbounded chain of experiments.

## 9. Immediate implementation backlog and final decision

Proceed in this order:

1. Establish the reproducible product baseline and supported compiler corpus; resolve the two store type errors and stress DOM typing configuration. Carry forward the reproduced visible-state no-op failure as a first behavioral regression.
2. Integrate the actual authored native module with Rust emission and Vite, including callbacks/plan from one source; make owner/source/root/property identities common. Demonstrate native TSX state, events, conditional activation, keyed list, and a derived prop without manual binding slots.
3. Port the real store cases and build independent root work queues. Wire the stress UI to this path with pinned read validation, local boundaries, trace capture, explicit replacement semantics, and cleanup.
4. Profile the failed mixed workload, then integrate one sparse operation path that updates owner and bound-writer indexes. Measure a new frozen mixed comparison; retain generic fallback.
5. Complete the small Three/React adoption examples and extension task, while collecting the finite comprehension/device confirmations. Publish the supported/native-versus-React differences and resulting claim ledger.

**Go for a bounded library implementation; no-go for an unqualified “full better React” rollout today.** The architecture worth carrying forward is JS-first, VDOM-first, compiler-led, and workload-sensitive. The remaining research should decide specific integration boundaries and release claims. It should no longer postpone the actual compiler/runtime product behind workers, hydration, or another open-ended representation search.

### Native task-transition checkpoint — 12 October 2026

The [task-transition archive](./implementation/2026-10-12-native-task-transitions/status.json)
adds compiler-inferred task dependencies bound to native resources and coordinated
root publication. Live task inputs use coherent per-root store cuts, declared
subscriptions, freshness guards and invalidated-closure reuse. Equal cuts share
one execution; unequal cuts remain separate within a single publication group.
Compiler syntax includes top-level task arrays wrapped in `as const` or
`satisfies`; nested/spread task declarations remain rejected.

The authored TSX workbench exercises actual shared/fork-only store scopes,
urgent updates, overlapping task groups, query restarts, targeted optimistic
confirmation/compensation, localized rejection/retry and retained input drafts.
Hidden pending providers remain owned until their last interested root detaches
or the manager disposes. Task-only selector staging is discarded at publication;
these selectors must be pure and receive no committed previous-value history.

Verification covers 341 Deno contracts, 22 Rust tests, six compiled execution
fixtures, checked source and production build, existing controlled GC probes,
and Portless browser/HMR integration. Historical source/build archives and the
research notebook are unchanged. This advances Phase 2A without closing its
full fork/userland behavioral and composition matrix. Randomized structural
and mixed-dependency cases, public Three/React adapters, installable packages,
independent extension/maintainability evidence and the prescribed performance
and device gates remain required. No new throughput or parallel CPU claim follows
from timer-driven asynchronous task overlap.

### Store-contract checkpoint — 12 October 2026

The [source contract matrix](./store-contract-matrix.md) records exact local
userland/fork checkout revisions and distinguishes native verified cases from
upstream equivalence. The [checkpoint](./implementation/2026-10-12-store-contracts/status.json)
adds 360 Deno / 22 Rust test evidence, six compiled fixtures, checked production
build, controlled retention probes and Portless input/task/HMR regressions.

An independent object-state action-log oracle covers operation-specific optimistic
confirmation/compensation, late roots, reverse scope publication and Promise
identity. Invalid explicit scope operations preserve state/notifications; known
nonparticipant releases are no-ops. Combined native tests exercise three overlapping
same-root transitions, independent forks, unequal root input cuts, coherent group
effects, reentrant urgent dispatch, rejection/cancellation and detached late results.

Pending-store leases now transfer through both native frontier retries and task
execution generation replacement. Discovered store metadata survives to publication
when the final error view no longer reads it. Aggregate holds are bounded by roots
and distinct observed stores, with a twelve-restart regression; this is not a heap
or performance result. The DOM host's live form property clearing, ARIA/data false
values and unchanged-value write avoidance have actual Rust-authored browser checks.
Task publication preserves node/focus/caret through simulated composition and real
keyboard insertion; native OS IME remains unverified.

These checks advance Phase 2A, without substituting for the remaining combined
store-held Promise/selector/source/late-reader race cases and any required differential
run. Phase 2B randomized structural/mixed-dependency cases, public Three/React hosts,
installable packages, independent extension/maintainability evidence, prescribed
performance comparison and device replication remain open. Historical source/build
archives and notebook evidence remain immutable.

## Promise/store race checkpoint — 2026-10-12

The native async acceptance corpus now includes three late-reader/source tests in
`src/native_late_reader_matrix_test.ts` and an actual Rust/OXC-authored TSX fixture
in `compiler/native_promise_store_race_execution_test.mjs`. Together they cover
partial reverse root publication, reader attachment during pending work, source
replacement, urgent replay, obsolete Promise settlement, same-work retry, local
error recovery, host identity and ownership cleanup. The checkpoint passes
363 Deno tests, 22 Rust tests and all 20 verification commands, including seven
compiled execution fixtures and Portless browser/HMR checks. No kernel change
was needed for this slice. See `store-contract-matrix.md` for evidence limits.

Proceed to public DOM/Three host contracts and React interoperability. Upstream
differential parity, OS IME, structural randomized acceptance, prescribed
performance/device gates, packaging and human extension/maintainability evidence
remain incomplete. The implementation goal remains active.

## Compiler product requirement — 2026-10-12

User clarification: every authored native application requires compilation. The
compiler is a mandatory product boundary, with a zero-config Vite plugin as the
normal entry point. Runtime owner/site helpers are emitted implementation APIs;
manual JSX function calls are not the intended application authoring workflow.
Automatic module discovery, JSX lowering, diagnostics, source maps, production
builds and HMR are release requirements. HMR remount/disposal and preservation of
state across source edits are separate contracts and must have separate evidence.
React-owned modules retain their React compiler/runtime path in mixed projects.

## Public DOM, compiler entry and React bridge checkpoint — 2026-10-12

This checkpoint passes 366 Deno tests, 22 Rust tests and all 24 verification
commands. The composed `nativeModulePlugin()` is now used by the project Vite
config. The native task demo has no marker, JSX pragma or factory import; its
production build and accepted HMR cleanup pass. The focused plugin fixture
checks source maps, edited-source retransformation, separate consumer/compiler
roots and untouched React modules. `deno.native.json` provides type-only authored
JSX checking; `pnpm check:native-tooling` uses pinned tsgo with real React/Node
types to check the compiler/plugin/bridge sources.

The public DOM host receives parent context on normal and sparse creation paths,
so SVG containers, nested SVG and foreignObject HTML descendants have correct
namespaces. Authored browser checks verify attribute case, xlinkHref, ARIA/data
false values, style clearing, host identity and removal.

`createReactNativeRootAdapter` mounts a compiler-authored native component in one
React-owned container. Browser evidence observes real StrictMode effect replay,
one native root per setup, retained native state/root/host across boundary prop
commits, callback replacement and unmount cleanup. An earlier vitexec CLI harness
produced a false state-failure result; the final maintained test uses a fresh
browser context and one Vite-resolved import graph. No native kernel fix was
needed for that symptom.

This is early Phase 4 evidence, not full host/adoption completion. Host refs after
group publication, explicit resource disposal, custom-element property contracts,
a Three scene/shared-resource ownership and the committed-store React bridge
remain. Mixed React/native Refresh exclusions are still configured explicitly;
edit-stable HMR state and published compiler packaging remain unimplemented. No
new React speed/size, OS IME, worker, hydration or ecosystem-parity claim follows.

## Three host checkpoint — 2026-10-12

The public Three adapter and actual compiled WebGL workbench are implemented.
The checkpoint passes 376 Deno tests, 22 Rust tests and 27 verification commands.
Frame observations show changing Three transforms with stable scene/actor render
counts and object identities. Controls, raycast selection, keyed add/remove/reorder,
borrowed resources, owned-resource disposal, raw refs, reduced motion and accepted
HMR cleanup/remount pass. The independent AI extension uses only the public
factory/property registry and requires no kernel or adapter edit. It found an
attachment replacement bug that was fixed and retested.

Primary review fixed disposal error identity/traversal regressions, ref callbacks
that dispose their root and return cleanup, and the workbench HMR canvas lifetime.
The native ref phase runs after grouped pointer publication and before effects.
See `three-host-api.md`, `three-host-maintenance-baseline.md`, and the source and
verification archive under `implementation/2026-10-12-three-host`.

This proves a concrete rendering host and public extension seam; it does not
prove lower total maintenance cost than R3F. R3F has a mature public extension
path and broader behavior. Native kernel/compiler maintenance, unsupported host
features and the independent human study remain part of the comparison. Sol high
must assess that prerequisite before the requested full original-goal review.
The implementation goal remains active; packaging, matched performance/device
gates, human maintainability evidence and further async/interop surfaces remain.

## Private package and structural differential follow-up — 2026-10-12

The current private platform artifact exports core/DOM/Three/React/Vite and
standard automatic JSX helpers with declarations. An external consumer installs
the packed artifact with scripts disabled, typechecks authored TSX, blocks Cargo,
and uses the bundled Rust/OXC compiler through the zero-options plugin. Public
package imports and externalized Vite imports required explicit integration
fixes. `native-package-integration.md` names the supported scope and remaining
distribution/HMR/type boundaries. This advances packaging without closing beta.

The compiler-authored collection differential fixture now checks four fixed
seeds and 80 insert/remove/move/replace operations against a separate Map/order
projection; keyed host identity, local state and effect lifetime survive as
required. It also exercises same-root store plus collection invalidation,
collection-size owner fallback, and generic `.filter(...).map(...)` fallback.
Removed filtered owners clean up and remount with fresh state; retained owners
keep state. All source/collection readers release at teardown.

The same-root case is a performance limitation, not a new sparse-update win:
the mixed flush executes all six rows and two store probes; a subsequent
store-only update executes all six rows and one probe. Across the 80 operations
the fixture records 450 row executions. Existing isolated collection checks
retain their sparse assertions. Phase 2B correctness evidence is stronger, but
mixed dependency invalidation still needs diagnosis before the prescribed
integrated performance gate. Human maintenance evidence and Sol's full review
remain held under the user's prerequisite.

## Selective store-reader checkpoint — 2026-10-12

The previous same-root diagnosis now has a reviewed implementation and a
compiler-authored scale fixture. Store-only updates execute zero unrelated row
owners at 1k/10k/50k; store plus insert executes the inserted row only. Four
seeded structural sequences now execute 38 rows across 80 edits instead of the
previous 450, with stricter per-operation execution assertions and unchanged
projection/identity/lifetime checks. Reader selection preserves the complete
candidate transaction and conservative resource/boundary fallbacks. Numeric-only
frames bypass reader scans and the WebGL/HMR checks retain their no-render path.

Full candidate traversal and VDOM key-index rebuilding remain size dependent.
A stronger effects-visible regression confirmed that simultaneous store/numeric
updates still need the numeric owner rerendered until writers are staged inside
the host commit. `selective-store-publication.md` records the mechanism, measured
work counters, integration corrections and this next required seam. Phase 2B and
the integrated performance, device, human maintenance and public-beta gates are
still open. Historical notebook and checkpoint evidence remain unchanged.

## Candidate numeric writer checkpoint — 2026-10-12

The synchronous mixed store/scalar seam is now implemented. Compiler-approved
numeric owners remain cached while their changed sources join the candidate's
host phase before publication, new refs and effects. Explicit numeric source
identity/version captures supplement the read cut because cached hooks do not
execute; retries recapture current values. Removed sinks are skipped using a
binding-index query, actual writer exceptions propagate, and post-host mutations
fail terminally without overwriting newer state. Numeric-only frames keep their
existing direct path.

`numeric-commit-publication.md` records the mechanism and seven focused runtime
cases. A real compiled TSX fixture verifies current props/style before observers,
no numeric owner rerender, structural/store cases, replacement/removal and stale
setter rejection. The updated older regression retains effects-visible coherence
and selector history assertions while requiring the formerly rerendered owner to
stay cached. The tested private package is rebuilt with this kernel.

Candidate traversal/index rebuilding remain the next measured costs; public
async candidates still traverse fully and resource fallback stays conservative.
The integrated latency/allocation/device, human maintenance and beta gates remain
open. No general React superiority or full-library completion is claimed.

## Full-commit key-index checkpoint — 2026-10-12

Full VDOM publication now reuses the existing attach/detach key-index hooks,
with rebuild mode retained as a differential reference. Store-only compiled
1k/10k/50k commits perform zero key-index visits; mixed one-row inserts visit
four new nodes at every size. Five focused tests cover reference parity,
region metadata, duplicate keys and disposed handles after cleanup failure.
A two-region compiled fixture preserves sparse updates around a store full
commit, projection, local state, identity and teardown.

`full-key-index-publication.md` records the remaining linear costs explicitly:
owner traversal and binding-index reconstruction still scale with row count.
The next seam is incremental binding registration/candidate footprint work;
public async candidates and resource fallbacks retain their conservative path.
The integrated performance, independent device and matched human maintenance
gates remain open, and Sol’s full review remains held.

## Scalar binding-index checkpoint — 2026-10-12

Ordinary full commits now maintain scalar writer ownership incrementally when
the graph is null and direct-write mode is unchanged. Graph/mode changes retain
rebuild fallback. Eight new runtime cases cover differential structural/source
updates, direct styles, compound bindings, graph transitions, disposed handles
and host-plus-repair failure. The real compiled lifecycle fixture preserves
current props in new effects, host identity, source switching and exact cleanup.
A controlled Node retention probe releases both removed style projections.

The 1k/10k/50k fixtures now show zero full binding-index visits for store-only
and mixed insert commits; a one-row insert registers one writer at every size.
Owner visits still grow with rows. `binding-index-publication.md` records exact
units, fixture corrections and the attributed candidate reconstruction seam.
A sparse candidate must preserve complete store transactions and untouched
lifetimes; generic resource/structural/invalid-footprint fallback remains required.
The integrated performance, device, human maintenance and beta gates stay open.

## Compiler-guided sparse store checkpoint — 2026-10-12

Supported leaf readers now prepare disjoint host regions and update only their
reader/cache/effect and ancestor footprints. Actual Rust/OXC metadata gates the
optimization; unknown/nested/resource/changing-root syntax stays generic. Full
and sparse candidates share the publication/lease/failure/cleanup lifecycle.
All live readers refresh transactionally, including unchanged stores; owned
source switches work without a store notification. Numeric batches still precede
new refs/effects, and stale ancestor outputs are released and re-expanded safely.

The compiled 1k/10k/50k two-reader fixture performs two owner executions/cache
patches/effect reconciliations and three VDOM target-node visits at every size.
Structural nested-reader mount deliberately visits 1,004/10,004/50,004 owners.
Independent stale/disposed/error/ref/effect/numeric-removal/retention tests and
38 integration checks pass: 425 runtime and 24 Rust tests. The original selector
history regression remains unchanged; compiler eligibility prevents duplicate
probe reads. See `sparse-store-publication.md` for counters, corrections and limits.

This advances the attributed candidate seam for a declared footprint; it does
not close arbitrary nested/async traversal or the whole performance gate. The
next decision-changing work is the prescribed integrated latency/allocation
comparison, followed by device and human maintenance evidence. No new backend
or storage family is justified by this checkpoint.


## Namespace adapter and integrated pilot checkpoint — 2026-10-12

The Three host now resolves public namespace constructors and caches generic
property writers by handle lifetime. It retains explicit ownership, attachment,
projection invalidation and keyed constructor replacement policies. Inferred
constructor/data/ref types are exposed through the optional strict Three JSX
backend; installed-package type checks and namespace extension require no
hand-written per-class signatures or simple-property writers. This addresses the
user-directed adapter design correction; total code-size and easier maintenance
than R3F are not proved. Texture/BufferAttribute lifetime remains open.

Compiler-resolved native KeyedCollection traits on required destructured props,
immutable aliases and parenthesized JSX callbacks support reusable collection
components. All eligible props are observed; a compiled two-source fixture proves
second-source updates and cleanup. Runtime validation remains authoritative for
typed source claims.

433 runtime tests, 25 Rust tests and all 44 integration checks pass. The new
authored native/React mixed product fixture passes six production correctness
pilot pages with real writer/delta/React memo emission checks. The archived
production build and product-mixed-v2-protocol.md supply the next finite
comparison; collect every scheduled page, keep the existing target, and separate
memory profiles. No confirmation pages or comparative performance claims yet.
Sol's full review stays held for matched maintenance evidence; device and human
gates remain open. Do not expand storage/backend experiments before this gate.


## Integrated product confirmation decision — 2026-10-12

The frozen namespace-three production artifact has completed the single planned
30-page V2 confirmation: all 7,200 frames and page contracts pass, with no missing
or excluded page. The speed gate FAILS. Paired native/React page-median ratios
are 2.67452053 at 512 and 2.67000209 at 1024; paired p95 ratios are 2.4 and 3.0.
128-row denominators are unresolved under the preregistered five-clock-tick floor.
Ordinary frames, structural tails and measured lifecycle CPU favor React.

Six separate allocation profiles on the same locked artifact pass correctness.
Native sampled allocation-tree bytes are roughly 3.3–3.5 times React's, while
post-GC JS heap is similar. This is a diagnostic lead, not causal proof or a leak
verdict. See product-mixed-v2-study.md, raw records, protocol, lock, SVG summary
and independent recomputation script. Historical notebook/records stay immutable.

Dynamic-realtime superiority remains withheld. Phase 3 is still open for named
independent-device replication; human maintainability/adoption and the held Sol
verdict remain separate gates. The next bounded engineering action is hot-path
attribution on this archived artifact, before any justified change or new named
confirmation. Counts or the smooth three-mesh demo cannot overturn this result.
No new storage/backend family is justified by the sampled allocation evidence.

## Attributed state-change identity candidate — 2026-10-12

Independent recomputation validates both locked 1,024-row CPU profiles. Captured
production excerpts identify root subscriber and completion code with repeated
owner/site strings; this supports a bounded identity-cache candidate, not a
complete explanation of the performance gap. Full/sparse/numeric acknowledgement
now uses stable owner/site identities with global pending insertion order and
version checks. Owner/root teardown releases the cache. Numeric-only reentrant
writer cleanup now preserves newer source values, including a throwing writer.

Host JSX declaration generation is integrated into the mandatory compiler's
Vite entry and the installed private package. Explicit namespace/schema
registrations emit type-only production/development JSX augmentations. Actual
TSX and non-Three host checks pass; runtime lifecycle policy is not inferred.

443 runtime tests, 25 Rust tests and 46 integration commands pass, including the
six-page separately built production correctness pilot. See
state-change-identity-publication.md. The original V2 artifact/records/notebook
remain immutable. The new candidate has no confirmed speed advantage; freeze
its tested archive before a separately named comparison using the existing
workload and thresholds. Phase 3, independent-device, human maintenance and Sol
review gates remain open; the goal is active.

## Identity candidate confirmation decision — 2026-10-12

The separately frozen V3 comparison completes 30/30 valid pages and 7,200 frames
with no exclusions or lock changes. The speed gate FAILS: paired median ratios
are 2.49999999/2.61792571 at 512/1,024 rows and paired p95 ratios
2.25000000/3.23076922. 128-row decision ratios remain unresolved at the five-tick
clock floor. Six separate allocation profiles also pass correctness and show
native sampled tree estimates 2.66–2.88 times React; post-disposal GC heaps are
similar, which does not establish mounted memory or absence of leaks.

See product-mixed-identity-v3-study.md and the independent recomputation script.
V2/notebook/archives stay immutable. The identity cache is insufficient; lower
absolute timings in both arms are not single-change causal evidence. The next
bounded attributed implementation seam is compiler-selected direct property
writers through root preparation and incremental keyed writer maintenance,
with generic/compound/failure/coherent-publication contracts retained. Cost
attribution and correctness precede another confirmation; no new storage/backend
family is justified. Device, human maintenance, Sol and product speed gates
remain open. The active goal is not complete.

## Performance recovery track — 2026-10-12

The user explicitly renewed the goal to combine the complete library with
maximum-performance work rooted in these failures. The concrete ordering and
unchanged acceptance gates are in performance-implementation-plan.md: connect
direct writers and equality; attribute real compiled costs; emit executable
source-to-sink programs and reusable dirty slots; compose numeric/structural/store
work in one candidate; integrate sparse/dense storage only where measured.
Rope-style summaries remain a targeted structural hypothesis, not the current
dense update remedy. The baseline is React Compiler enabled. Existing raw
records, protocols, notebook and archives remain immutable.

## Automatic direct writer integration — 2026-10-12

Native root preparation selects direct scalar writers automatically. Host style
field capability controls field versus whole-style application; ordinary direct
writer ownership now composes with keyed deltas and prepared indexed regions.
Derived primitive equality suppression is shared across four update routes;
mutable object identities retain conservative behavior. CSR/column guards,
source switches, reentrancy and coherent lifecycle publication remain intact.

458 runtime tests, 25 Rust tests, 47 integration checks and six production pilot
pages pass. See direct-writers-publication.md. Existing indexed paths are
preserved through the shared prepared-region mechanism; first-empty collection
schema discovery remains a disclosed fallback. The new candidate has no measured
speed verdict. M2's attributed cost ledger precedes the next change/confirmation;
the renewed full library and performance goal stays active.

## Attributed compiler cut — 2026-10-12

M1 CPU attribution passed 32 independent checks and is preserved separately from
latency evidence. Source batching, flush planning, numeric preparation and
acknowledgement remain larger sampled costs than unary projection. Rust/OXC now
emits a direct scalar projection helper for proven unary state props. Root review
fixed candidate source canonicalization and retained mutable-object semantics.
465 runtime tests, 28 Rust tests, 47 integration commands and six production
pilots pass; see unary-bindings-publication.md. Speed remains unmeasured for this
candidate. Stable committed-cell identities are the next bounded dispatch cut;
async candidate snapshots, versions and root-local eligibility must remain safe.

## Stable notification identity and captured cut — 2026-10-12

Committed cells now provide stable opaque notification identity, allowing pending
queue cache hits to avoid nested address resolution while keeping captured versions
immutable. Root review preserves foreign-address fallback and teardown safety.
A new regression exposed mixed numeric versions when host code triggered state
changes. Scalar and column routes now capture projections before writes; native
newer state remains queued. Direct nested raw numeric mutations reject before
mutation. Batch staging adds allocations and has no new performance verdict.
482 runtime tests, 28 Rust tests, 48 integration commands and six production pilots
pass; see cell-identity-cut-publication.md. Remaining work includes root-local
eligibility, world acknowledgements, executable programs and mixed candidates.

## Canonical change resolution and eligibility reuse — 2026-10-12

World identity resolution now avoids nested source/version address lookup for
valid notifications, with canonical candidate ownership and teardown deletion.
Root eligibility interprets compiler metadata once per active committed cache;
generic owners avoid empty-cache allocations. Real compiled TSX counters and a
retention negative control establish the specific behavior. 495 runtime tests,
28 Rust tests, 49 integration commands and six production pilots pass; see
state-resolution-publication.md. Dispatch/scratch allocations, executable update
programs and common mixed candidates remain open. Current allocation profiling
precedes the next storage cut; no speed claim follows from these counters.
