# Product thesis: a compiled VDOM runtime for interactive UI

**Status:** product direction to test, not a performance claim\
**Updated:** 11 October 2026

## The product in one sentence

Keep JSX and the virtual DOM, but compile component data reads into an
inspectable update plan so ordinary declarative props update only the affected
work, and async changes become staged, cancellable transitions across roots and
rendering targets.

The intended user is a React developer building interaction-heavy interfaces,
especially 3D and game UI, who wants the ergonomic default to remain “describe
the next UI” rather than manually mutate renderer objects to avoid framework
cost.

## Product charter

The product is not a faster implementation of every React feature. It is a new
JSX runtime with one central promise: **the runtime knows what changed, what
that change can affect, and when the resulting state is safe to show.** The
compiler supplies stable ownership and dependency metadata; the VDOM preserves a
complete declarative description; the scheduler turns updates into versioned
work; adapters commit that work to a host.

That promise should make four common activities feel direct:

1. Update a prop from state without manually reaching for refs or preventing a
   component render.
2. Express state and subscriptions at stable source sites, including conditional
   code, without positional hook bookkeeping.
3. Start independent data work early, retain the visible interface while the
   next version is prepared, and reveal it according to an explicit policy.
4. Add a renderer or extension by implementing a public host/task interface,
   without writing a second reconciler or depending on React internals.

The required first product is therefore a pure-JavaScript kernel, an OXC TSX
compiler path, retained keyed VDOM, compiler-emitted dependencies, native event
handling, coherent versioned commits, a DOM adapter, a React island adapter, and
a Three adapter that proves the host boundary is real. The first product does
**not** require worker parallelism, work stealing, CRDT hydration, server
rendering, or a drop-in React renderer. Those are later product options gated by
evidence and user value.

### Priority order

| Priority | Capability                                                                      | Why it belongs here                                                                                                                                                                                                                     | Proof before expanding                                                                                                                                   |
| -------- | ------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Core     | Stable entity/key ownership, VDOM identity, compiler-assigned hook sites        | These define state lifetime and predictable structural updates.                                                                                                                                                                         | Conditional activation, keyed reorder/removal, effects, disposal, and extension tasks are correct and understandable.                                    |
| Core     | Typed dependency DAG, trait columns, and specialized writers                    | The graph must select work over data laid out for batched updates; a DAG alone does not make dispatch cheap. JSX remains the authoring model, so the compiler chooses the path without ref or frame-loop code from application authors. | Production interaction wins against React Compiler and selector-store baselines, including mount, dynamic structure, update CPU, allocation, and memory. |
| Core     | Versioned scheduler and transition policy                                       | Async readiness must share the same ownership/dependency model as synchronous updates.                                                                                                                                                  | Pending, cancellation, supersession, urgent rebasing, and multi-root commit preserve identity and responsiveness.                                        |
| Core     | Public host adapter; DOM and Three demonstrations                               | “React for everything” requires a single authoring/runtime model across hosts.                                                                                                                                                          | Both hosts implement props, events, ordering, lifecycle, disposal, and updates without kernel forks.                                                     |
| Adoption | React island and selected library bridges                                       | Compatibility should let applications adopt incrementally while preserving honest boundaries.                                                                                                                                           | Real examples and a published support matrix; no promise that JSX alone runs arbitrary React packages.                                                   |
| Later    | Worker pool, work stealing, streamed server state, resumable/streamed hydration | These may extend the scheduler and state protocol, but add transfer, consistency, and recovery costs.                                                                                                                                   | A named workload beats the main-thread baseline after those costs; stream recovery converges under reordered and interrupted delivery.                   |
| Explore  | Optional Wasm kernel backend; later runtime JIT and SIMD                         | WATaBoy shows block specialization to Wasm is feasible, while our SoA columns offer the typed batches it needs. This is a backend experiment; JSX, VDOM, ECS, scheduler, and host adapters stay shared. | Prove an end-to-end win after codegen/compile/warm-up, JS/Wasm crossings, memory, and host commits; require JS fallback and exact output parity.           |
| Later    | Worker pool, work stealing, streamed server state, resumable/streamed hydration | These may extend the scheduler and state protocol, but add transfer, consistency, and recovery costs.                                                                                                                                   | A named workload beats the main-thread baseline after those costs; stream recovery converges under reordered and interrupted delivery.                   |
| Later    | CRDT merge, universal pre-render cache                                          | These are domain/protocol choices, not default runtime machinery.                                                                                                                                                                        | A real concurrent-writer/server-state workload or measured cold-start need justifies the added semantics and storage.                                    |

“Concurrency” must remain precise in the design. Async I/O can overlap;
main-thread tasks can be prioritized and yielded; independent pure tasks can run
in parallel only in workers; host commits remain serialized per host. The
scheduler should expose those distinctions rather than implying that a DAG makes
JavaScript execution parallel by itself.

## The problem we are solving

The shared frustration is not that React has no good ideas or no performance
tools. It is that developers often have to understand a large set of separate
escape hatches and rules to predict what an update will do: hook call-order
rules, memoization, context fan-out, external-store consistency, Suspense
boundaries, transitions, roots, hydration, and renderer-specific conventions.

Our hypothesis is that one explicit model can make these easier to reason about
together:

- **Ownership:** which component/entity and keyed item owns a piece of state,
  effect, resource, or host node?
- **Dependencies:** which state reads can affect a derived value, VDOM region,
  or host property?
- **Work:** what can be computed now, what is waiting, what can run on a worker,
  and what must commit on the host thread?
- **Versions:** which snapshot is visible, which candidate is pending, and when
  may it replace the visible one?

The ECS is the runtime storage and query model. The dependency DAG is the
compiled relationship between reads and work. The VDOM is the declarative
structure and identity model. The scheduler coordinates versions and readiness.
These are related pieces, not interchangeable names for a single graph.

## The user-facing contract

1. **Write JSX and props declaratively.** A normal prop driven by state should
   take the efficient update path without requiring refs, manual dirty flags, or
   a frame-loop mutation.
2. **Use keys to express identity.** Keyed insert, remove, and reorder preserve
   the state and DOM/object identity that the key denotes.
3. **State belongs to a stable owner and site.** Native hooks are keyed by owner
   plus compiler-assigned site, so conditionals do not shift neighboring state.
   Repeated stateful work needs a compiler-visible keyed scope.
4. **Updates have versions and policies.** An update may be urgent or
   transitional; a pending transition keeps the committed snapshot visible until
   the declared reveal policy permits a commit. Stale work cannot overwrite a
   newer version.
5. **Commit is a host boundary.** The runtime prepares candidate work, then
   applies a coherent batch through a host adapter. DOM commits run on the main
   thread; a Three adapter maps the same declarative operations to Three objects
   and lifecycle.
6. **The graph is inspectable and extensible.** Adapters and compiler extensions
   can query dependencies, task kinds, versions, and write sets through
   supported APIs. They do not depend on private reconciler internals.
7. **Renders are not a public counter.** The contract is about state, identity,
   visibility, and commits. Optimized evaluation may run fewer functions, but
   exact function invocation counts are not promised.

`useEffect` needs an explicit compatibility decision before an API is frozen.
The user's proposed native rule—setup on mount/activation and cleanup on
committed deactivation/unmount, never on every render—is plausible for lifecycle
work, but it does not replace effects whose purpose is to synchronize with
changing values. Those should be represented as graph-derived tasks or
subscriptions. We must test and document this distinction rather than silently
changing React `useEffect` semantics under the same name.

## Compatibility is a product surface, not a slogan

“Uses JSX” is syntax compatibility. It does not make React components or
packages interchangeable. React libraries can depend on React's hook dispatcher,
context implementation, renderer host config, effects, refs, and scheduling
semantics. The adapter plan therefore has explicit levels:

| Level                             | Promise                                                                                                         | What it takes                                                                                                            |
| --------------------------------- | --------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| JSX source                        | Existing TSX syntax and common intrinsic element conventions can be compiled.                                   | OXC transform, TypeScript types, source maps, diagnostics, runtime imports.                                              |
| React-shaped authoring            | A documented subset of familiar APIs can be used in native components.                                          | Compatibility facade plus explicit semantic differences, especially hooks and effects.                                   |
| React island                      | The runtime can mount as a bounded region inside a React application and exchange props/events at the boundary. | A small React wrapper package; no claim that arbitrary React libraries can run inside the island.                        |
| React library bridge              | Selected libraries can be consumed through a reviewed bridge or adapter.                                        | Per-library compatibility work for context, hooks, portals, refs, and lifecycle.                                         |
| Full React renderer compatibility | Unmodified React components and packages run on the new renderer.                                               | A React-compatible dispatcher/reconciler contract or a maintained React host integration. This is not an MVP assumption. |

The first product should ship the JSX compiler and native runtime, a React
island adapter, and one documented library bridge. Each bridge should list
supported versions and behavior. We will not market broad ecosystem
compatibility until real packages pass compatibility tests.

## Product architecture

```text
TSX + types + compiler hints
            │
            ▼
       OXC frontend
            │ emits
            ▼
Ownership + VDOM plan ───── Dependency/task DAG
            │                         │
            └──────────┬──────────────┘
                       ▼
          JavaScript ECS + scheduler
          candidate versions / readiness
                       │
                       ▼
       keyed reconciliation + commit batch
                │                 │
                ▼                 ▼
           DOM adapter       Three adapter
```

The compiler emits stable component, hook-site, keyed-region, and binding
identities plus typed dependency edges. At mount, the runtime resolves static
edges into compact indexes and maps entity/trait slots to stable host writers.
ECS traits use columnar storage where a workload updates many entities together;
one frame should update a column or batch without allocating one source object
and dispatch record per prop. Graph propagation selects the affected columns,
tasks, and VDOM regions. Structural changes use a general keyed reconciler;
stable regions use compiler-selected specialized writers behind the same
declarative JSX. A transition commits only after freshness checks and its
readiness/reveal policy pass. Host adapters own host-specific creation,
properties, events, ordering, disposal, and optional animation behavior.

For async transitions, the compiler/runtime should expose a candidate's known
task/resource DAG before commit. Start independent resource requests from the
same frontier concurrently, propagate readiness through newly unblocked nodes,
stage resolved state and prepared VDOM, and reveal only under the transition's
boundary policy. Resource nodes carry input versions, cancellation, priority,
and speculative-start policy; pure CPU nodes can use workers only with immutable
inputs and isolated writes. Main-thread JavaScript remains serial, and
dependent task chains remain serial. React can prewarm cached promises and
Suspense can coordinate their reveal, so our distinction is built-in graph
discovery, scheduling, readiness inspection, and commit coordination—not a
claim that React must always waterfall. Existing Experiment AG prewarms both
React resources together and shows near-equal completion latency; this remains
an unproven product opportunity, not a current performance win.

The graph must keep three relationships distinct: value edges block a task
until its input exists; scheduling constraints limit reordering or concurrency;
publication groups decide which ready outputs reveal together. At each
candidate frontier, launch all known independent requests rather than waiting
for one branch before visiting another. A downstream request may also be
prefetched when its inputs are already known or when a declared speculative
policy supplies safe predicted inputs. Give speculation a budget, resource-key
deduplication, priority, and cancellation on supersession. This lets an
independent feed continue while a profile-dependent branch waits, without
pretending the profile result is known early. The proof should measure request
start gaps and critical-path completion against React with equal prewarming;
worker CPU execution is a separate, optional source of parallelism.

The VDOM storage choice is hybrid too. Keep its semantic tree and keyed identity,
store dense numeric traits and compiled prop bindings in SoA columns, and use
bounded object-backed buckets for sparse ordered edits inside marked keyed
regions. The columnar bucket prototype did not improve edit latency over the
object-backed buckets, while full scans were similar; parallel JS arrays are
therefore not the default VDOM layout. The compiler should emit keyed operation
plans when it can prove a local edit, so runtime work scales with changed keys
instead of rebuilding a full child array and rediscovering the delta. Generic
JSX still falls back to ordinary keyed reconciliation.

The current implementation is an intermediate probe, not that complete fast
path: the V3 owner path still enumerates the incoming keyed children to verify
the region, build its move plan, and refresh owner bookkeeping. Its direct VDOM
delta path is guarded away from roots with compiled/direct bindings until
binding-index removal and insertion are maintained safely. The next core gate
must remove those full-list passes and exercise structural edits alongside
compiled prop updates, while proving the same key identity, host output, and
state lifetime. Until then, the bucketed VDOM path is an implementation
candidate rather than a product performance claim.

The initial runtime is JavaScript. Worker execution is a later scheduler policy
for pure tasks with serializable immutable inputs; it cannot make arbitrary
component code thread-safe or move DOM mutations off the main thread. Multiple
roots can share state and coordinate commits without implying parallel
execution. The JavaScript kernel remains the default and correctness baseline.
The WATaBoy result justifies a bounded optional-Wasm experiment after the DAG
and SoA layout stabilize; it does not justify a Wasm-first runtime. Runtime JIT
and SIMD advance only if full-workload measurements cover compilation,
crossing, and host costs.

## What is different from React, precisely

React already has a compiler, streaming server rendering, selective hydration,
Suspense, transitions, Activity, and stable View Transitions in 19.3. Our
proposal is not to pretend those do not exist. The differentiator we want to
prove is that one public ownership/dependency/version model can:

- target only dependency-reachable values and VDOM regions for routine updates;
- make hook storage independent of call order while stating lifecycle semantics
  clearly;
- plan known async requirements before a tree reveals them serially, then commit
  ready state coherently;
- coordinate versions across roots and hosts;
- expose scheduler and host extension points without requiring a private React
  reconciler integration;
- carry one declarative model to DOM and Three-style object graphs.

Every bullet is a hypothesis until compared against current React, including
React Compiler and idiomatic external-store/selector patterns. React features
form the baseline; the product earns a place by making their combined behavior
simpler or measurably better on named workloads.

## Build a product, not an endless experiment log

### Milestone 1 — Native JSX runtime

Finish a coherent runtime slice: component/entity ownership, keyed VDOM, state
traits, native events, mount-only lifecycle tasks, compiler-emitted binding
edges, and the DOM adapter. Add a small counter/list example and make the
generated plan inspectable. The compiler must report unsupported constructs
rather than silently compiling them incorrectly.

**Exit condition:** examples work with state, conditional keyed regions, event
handlers, teardown, and deterministic host output; a bounded developer task can
add one host property and one stateful region without editing kernel internals.

### Milestone 2 — Declarative performance

The preregistered 18 Gate A pages and a supplemental nine-page Chrome 155 repeat
are complete; all 648 timed pairs pass parity and keyed-identity checks. The
Chrome repeat in the same profile closely reproduces the original 4–5×
graph-over-React result, while Chrome 154 in-app remains near parity or a small
graph loss. These collections share one physical machine. Gate B includes
keyed-structure and native-event browser differentials, compiler-assigned
owner/site state, and single-owner structural operations. In the per-frame path,
V4's fixed-plan writer bypasses VDOM dispatch and reconciliation; V5 and V6
retain JSX/VDOM and beat the measured React + Compiler update-to-commit median
on the tested fixed topologies, while paying more mount or update CPU on some
sizes. V6 covers 75 production pages and 22,500 RAF callbacks; at 1,024 segments
columnar VDOM measures 0.6 ms update CPU and 0.6 ms update-to-commit versus 1.3
ms React, but mounts at 6.3 ms versus 4.1 ms. The sparse browser study adds 288
production pages with worklist construction and DOM writes; its above-floor
sensitivity slice favors VDOM, while dense versus dirty-row/bucket dispatch
depends on change density and locality. The lifecycle-inclusive Snake V1 study
passes its fixed-topology 300-update episode gate at 512 and 1,024 segments,
including mount and teardown. A separate 45-page Snake cadence study finds
lower update CPU at 4,096 and 8,192 segments and passes its narrowly defined
missed-slot gate in four of five 8,192 pairs. However, at 8,192 all arms are
severely overloaded, RAF interval p95 is effectively unchanged, and one
columnar page has an 11.6-second callback gap. These RAF proxies do not measure
display presentation or prove smoothness. All per-frame studies still share one
physical device; sub-0.1 ms measurements also need timer calibration.

The V3 stateful structural browser comparison adds a verified React Compiler
baseline. On five pages, token-delta rotation is 4.70 ms versus 10.80 ms generic
but 3.60 ms React; edge replacement is 12.05 ms versus 11.00 ms generic and 3.50
ms React. Its overall preregistered product gate fails. This confirms the
central tradeoff: compiler-selected stable writes can be fast, while general
keyed structure remains expensive. V2's older React arm is retained but its
compiler transformation was not verified. See
[paper §8.13](./paper.md#813-preregistered-keyed-region-version-token-follow-up).

The new keyed-bucket mechanism study shows bounded local slot work and low
move times against a simple `findIndex`/`splice` array across 1,000–50,000 rows.
That control lacks a key-to-index table, however, and the structure has not been
connected to the runtime's owner graph or host reconciliation. It does not
change the failed stateful UI gate or support an end-to-end React comparison;
see [paper §8.17](./paper.md#817-keyed-region-buckets-bounded-ordered-edits).

The first preregistered mixed real-time comparison now tests per-frame prop
updates together with keyed topology churn. Correctness passed across 30
production page loads, but the performance gate failed: the retained scalar
binding path was tied with React at 128 entities and slower at 512 and 1,024;
its p95 guard also failed at the two larger sizes. This prevents treating the
fixed-topology Snake wins as evidence that the current runtime scales better
for a changing realtime scene. See [the study](./mixed-realtime-study.md) and
[paper §8.19](./paper.md#819-mixed-per-frame-and-keyed-structural-workload).

Snake lifecycle V1 recorded browser heap readings before mount, after mount,
and after teardown, but the values do not support allocation or retention
claims: 22 of 30 pages had exactly zero mount delta, and teardown deltas ranged
from about −17.5 to +17.5 MiB. The [notebook diagnostic](./research.ipynb)
shows the per-page readings. Allocation and retained-object measurement remain
open and need explicit instrumentation and GC control.

**Next gates, in order:** (1) attribute the failed mixed workload in separate
diagnostic runs: source notification, dependency selection, binding dispatch,
keyed reconciliation, and host commit. Use those measurements to choose one
implementation change, then freeze a new mixed benchmark comparing the changed
path against React Compiler. The runtime must pass the median and p95 criteria
at scale before its scalar/columnar layout is treated as a product advantage.
(2) independently replicate the fixed-topology lifecycle and cadence results
on another physical device/profile with timer calibration using the
[second-device protocol](./second-device-replication.md). (3) integrate one
bucket-backed keyed membership-delta path into the runtime.
The data-structure study now passes a flat-array control that maintains a
key-to-index table; the remaining gate is whether integration can avoid visiting
all owners and reconciling the full host region for a one-key edit. The
V3 diagnostic now shows 10,000 owner visits for that edit, with 9,999 cached
subtrees, one new owner, and one retired owner. Pair the integrated work with
tail and middle insert/remove and derived-filter cases against the fair React Compiler
baseline; verify identity and child state after each operation, and include
mount, edit, and teardown costs. Record sampled allocation profiles on separate
diagnostic pages, including objects collected by major and minor GC, then force
GC and capture retained-heap/DOM-counter snapshots after teardown; the protocol
offers sampling controls and GC-inclusive profiles in the [Chrome DevTools
Protocol HeapProfiler](https://chromedevtools.github.io/devtools-protocol/tot/HeapProfiler/)
and node/listener counters in its [Memory
domain](https://chromedevtools.github.io/devtools-protocol/tot/Memory/). These
measurements remain separate from latency runs because profiling and snapshot
work can perturb the workload. (3) freeze and run the developer
feature-authoring/comprehension study on conditional state and derived regions.
That pilot does not test adapter or compiler extension. The Long Animation
Frames follow-up is complete but inconclusive for explaining high-load gaps:
its thresholded entries and coarse timing fields do not observe presentation.
The V3 profile and browser comparison now localize the structural failure
beyond map maintenance; do not add another keyed-cache variant without evidence
that the new path avoids the measured owner scan and host reconciliation. Broad
architecture exploration should pause until these gates change the product
decision. The present evidence supports a workload-sensitive compiled VDOM
runtime, not a general React replacement. Keep V3 token-delta opt-in and retain
generic keyed reconciliation until the structural product gate passes.

**Exit condition:** a repeatable end-to-end win on a named interaction after
mount/update/setup costs, without parity or key-lifetime failures. If the gain
only exists in scalar writes, describe it that narrowly.

### Milestone 3 — Async transitions and roots

The prototype now connects OXC-emitted task plans to candidate-local results,
retained VDOM roots, cancellation/supersession, stale-result rejection, urgent
rebasing, and coordinated commits. Browser studies compare keep-previous
transitions, urgent input during pending work, and query retry against React
19 + Compiler. They pass the tested view-retention and consistency contracts,
but show no reliable transition-completion advantage. The current implementation
still lacks inline/progressive reveal policy, independent in-flight task reuse,
worker execution, and presentation-level frame evidence. Finish those semantics
only if the interaction evidence changes the design; do not expand scheduler
scope based on task-graph speed alone.

**Next async proof:** run the [DAG frontier protocol](./async-dag-frontier-protocol.md).
It compares an explicitly sequential route-loader control, React with
equivalent promise preloading, and the compiled ready-frontier scheduler on a
mixed independent/dependent resource graph. First prove start overlap, hard
edge ordering, stale-candidate rejection, and coherent reveal; then evaluate
critical-path latency against both controls. A gain over the sequential
control alone supports waterfall avoidance, not superiority to idiomatic
React. The design should also preserve the distinction between graph
concurrency and worker CPU parallelism.

That frontier study is complete. The next Gate C dependency is the
[async store action-log implementation](./async-store-transition-protocol.md),
informed by the userland store and the React `use-store-queue` fork. The runtime
store keeps chronological actions and projects what each root can show;
urgent actions replay over a root's visible state while transition actions are
pending. Explicit transition IDs now flow into candidate tree construction and
the coordinated host commit. The implementation is not yet validated. Next,
use the [async transition stress fixture](./async-transition-stress-v1-protocol.md)
to drive optimistic actions and overlapping timer transitions across one root
and forked roots. This exposes a concrete gap: the current coordinator
supersedes candidates that overlap on a root, so true concurrent same-root
candidate scheduling is not implemented yet. Port the userland/core transition
cases before expanding worker/server scheduling.

**Exit condition:** an interaction fixture shows earlier useful work or fewer
fallback flashes while preserving committed state and effect lifetimes, and does
not worsen urgent input-to-present latency beyond the declared budget compared
with current React patterns. Current tests do not meet this gate.

### Milestone 4 — Worker and server streams

Only after the scheduler is integrated, measure worker-pool scheduling and work
stealing for pure CPU tasks. Then define a versioned snapshot/patch/resource
protocol for server-to-client state and hydration. First prove reordering,
duplication, interruption, replay, and recovery. CRDT merge is used only if
concurrent writers require it; versioned patches are enough for ordinary one-way
server snapshots.

**Exit condition:** worker execution improves end-to-end latency for a
documented workload after transfer costs, or it stays out of the default
runtime. Streamed hydration converges under adversarial delivery and recovers
without a whole-root mismatch reset.

### Milestone 5 — Ecosystem adapters and usable release

Ship the React island adapter, a compatibility table, one selected React library
bridge, and a Three adapter. Keep the host interface public and typed. Provide
examples, profiling tools, migration notes, and bundle/setup measurements.

**Exit condition:** another developer can build and debug an adapter without
private imports; supported library examples work under declared semantics;
unsupported cases fail clearly.

## How we will decide if this is worth building

The success condition is the conjunction of four results:

- **Fast:** better end-to-end latency or frame behavior on interaction-heavy
  workloads, including setup, allocations, and lifecycle.
- **Understandable:** bounded implementation and comprehension tasks show the
  ownership/dependency/transition model is easier to inspect and extend than the
  equivalent React integration.
- **Composable:** one host adapter API supports both DOM and Three without a
  second reconciler design.
- **Adoptable:** TSX and the React island/bridge strategy provide a useful route
  into existing applications, with compatibility promises that match tested
  behavior.

The [developer feature-authoring/comprehension protocol](./developer-study-protocol.md)
is a pre-data plan covering conditional state/lifecycle and derived regions. It
does not test host-adapter or compiler extension. Its results can support only
the tested tasks; the broader Understandable condition remains unproven until
participants complete the study and adapter/compiler extension is evaluated.

If speed wins but extension tasks are harder, simplify the public model. If the
graph only wins on sparse fixed shapes, keep that specialization without
claiming a universal faster renderer. If compatibility requires implementing all
of React's internal behavioral contract, narrow the adapter promise. The result
should be a useful product even if it never replaces React wholesale.

## Current evidence boundary

Existing browser evidence supports specialized scalar-to-prop paths on fixed
repeated-host fixtures. V5/V6 retain the VDOM and measure lower update-to-commit
time than React + Compiler on the tested fixed-topology Snake workloads, but
columnar mount cost is higher in some scenes. The preregistered lifecycle study
adds mount, 300 frame updates, and teardown: the columnar path's paired total
JavaScript-cycle cost is 0.508× React at 512 segments and 0.513× at 1,024,
passing the gate on all ten pairs. A separate preregistered cadence study finds
columnar update CPU medians of 1.8 vs 3.9 ms at 4,096 segments and 3.9 vs 8.0
ms at 8,192. At 8,192 the late-callback rate improves only from 100% to 96.3%,
RAF p95 is 66.6 vs 66.7 ms, and the missed-slot criterion passes in four of
five pairs; an 11.6-second callback gap dominates one columnar page. This is a
narrow single-device RAF-proxy result, not proof of smoother presentation. The
follow-up Long Animation Frames study finds similar 8,192-segment RAF p95
(66.7/66.6/66.6 ms across React/scalar/columnar) despite lower update CPU, with
few thresholded >50 ms entries and no compositor or display timestamps. It
does not explain the callback gap. The lifecycle evidence closes only its
fixed-topology 300-update episode. Sparse
browser runs include worklist construction and DOM writes, but the smallest
values are timing-floor censored and dispatch winners vary by update
density/locality. All per-frame results share one device and do not measure
physical presentation. In stateful keyed structure, delta key-index
maintenance improves the runtime against its earlier rebuild algorithm, yet the
V3 production comparison shows token-delta slower than a verified React Compiler
baseline on both edge replacement and same-key rotation; only the within-runtime
rotation fast path clears its gate. The structural product gate therefore fails.
These results justify a bounded confirmatory/device replication and explicit
profiling, not another cache design by default. Dynamic topology,
page-load/compile costs, retained memory, general plan/build overhead, a
complete compiler/runtime, maintainability, broad React library compatibility,
transitions, worker parallelism, and hydration remain open. The build order
above treats those as release gates rather than claims.

The async DAG frontier study adds a bounded positive result: across 30
counterbalanced production-browser page blocks, the compiled scheduler starts
independent known-key requests together, respects dependency edges, retains the
previous keyed DOM, and matches React with explicit preloading (144.8 ms median
versus 143.6 ms; p95 151.2 versus 152.1). It cuts the deliberately sequential
loader control's median from 364.4 ms to 144.8 ms. This is evidence for automatic
dependency discovery, no-waterfall orchestration, and an inspectable schedule;
it is not a speed win over well-preloaded React or evidence of parallel
JavaScript. Worker execution, speculative reads, cancellation, and server/client
streaming remain untested. The full methods and data are in
[`empirical-appendix.md`](./empirical-appendix.md#820-preregistered-async-dag-frontier-study-v2).
