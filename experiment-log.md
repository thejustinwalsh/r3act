# Experiment Log and Detailed Evidence

**Historical methods and results · 9 October 2026**

This file preserves the project’s detailed experiment-by-experiment narrative.
For the current conclusion, architecture decision, and bounded next steps, start
with the [position paper](./paper.md). Raw observations remain under `results/`,
and the executable analyses remain in [research.ipynb](./research.ipynb).

## Abstract

This project investigates whether JSX can remain the authoring model while a
compact JavaScript runtime uses explicit data dependencies to update only
affected host properties. The proposed design separates UI ownership, data
dependencies, and asynchronous task dependencies; represents runtime state with
stable entity identities and traits; and compiles static JSX structure into
templates and bindings. Its purpose is to reduce repeat-update work while
preserving declarative output and offering a small host adapter contract for
DOM, Three.js, and other targets.

The notebook contains Deno mechanism experiments and browser prototype
comparisons. The Deno track compares graph propagation, dirty-bucket scans, and
full scans across entity counts, update densities, and locality patterns. A
JSX-authored multi-trait browser sweep now covers 1,000–10,000 entities and
1%–100% change density across two page loads; generated graph paths win the
measured update-time pairs, with the expected density-dependent narrowing. The
browser track includes a React external-store baseline and a narrow OXC-compiled
repeated-host plan with multi-source bindings. Deno results show a sparse graph
advantage, a clustered-update bucket advantage, and a dense full-scan advantage.
Browser studies show workload-dependent crossovers: sparse local changes favor
graph dispatch, while a dense mixed workload favors scanning. A six-arm
follow-up isolates compiler-emitted property writers from the dense plan
interpreter: generated writers have lower median update time in all 14 runs
across two page loads, by 15.2–34.4% across condition-level mean run medians.
Experiment V now routes an OXC-emitted CSR table into the retained VDOM; a
three-way browser study finds direct-field writers substantially faster than
materializing style-object props, while runtime-discovered per-source lists are
slightly faster than the current CSR lookup. A guarded full scan that reads and
compares each property is slower than eager same-value writes in every measured
condition in the earlier five-arm study. The generated paths bypass React
component execution and reconciliation, and timing excludes paint; these are
implementation-specific results, not evidence that a new framework is generally
faster or smoother than React. Readability and maintenance remain unmeasured
hypotheses.

## 1. Motivation and research questions

React's component model is productive, its ecosystem is large, and its compiler
and runtime continue to improve. A new runtime has to beat strong React code on
meaningful workloads while retaining the authoring model people value. The
motivating hypothesis is that the renderer's ownership tree and the data's
dependency structure need not be the same graph: a UI can keep a tree for order
and lifecycle while compiling state-to-output dependencies into a separate
index.

The project emerged from experiments with entity-scoped behavior and
event-as-data patterns in Koota, interest in compiler-generated dependency
graphs, and React Nylon's small reconciler experiment. Xi Editor's Rope Science
series offers transferable ideas around incremental summaries, explicit deltas,
async snapshots, and minimal invalidation. Those sources motivate questions;
none establish the performance of this design.

**RQ1.** For the same state changes and output values, when does indexed
propagation cost less than scanning all possible outputs?

**RQ2.** Does a mechanism-level advantage survive component execution, DOM host
writes, browser scheduling, and realistic update density?

**RQ3.** Can one simple host contract support declarative JSX across DOM and
Three.js without pushing imperative per-frame mutation onto application authors?

**RQ4.** How should async computations declare their read versions, write sets,
priority, cancellation, and stale-result policy?

### Hypotheses and status

| Hypothesis             | Claim to test                                                                      | Current status                                                                                                                                                                     |
| ---------------------- | ---------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| H1: sparse work        | Indexed propagation avoids visiting unrelated bindings when few sources change.    | Mechanism evidence in Deno; not framework evidence.                                                                                                                                |
| H2: density crossover  | Queue and graph bookkeeping can make dense updates slower than a full pass.        | Supported by this prototype's Deno measurements.                                                                                                                                   |
| H3: JSX binding        | Compiler-emitted bindings preserve declarative JSX without application-level refs. | Partial evidence: OXC emits narrow repeated-host plans and browser runs exercise scalar multi-source bindings with parity; arbitrary JSX and dynamic structure remain unsupported. |
| H4: host portability   | A small adapter contract expresses equivalent DOM and Three updates.               | Untested; only a DOM prototype exists.                                                                                                                                             |
| H5: async freshness    | Versioned dependency reads can reject or rebase stale results.                     | Illustrative policy sketch only.                                                                                                                                                   |
| H6: worker parallelism | A compiler-visible DAG enables safe concurrent execution.                          | Untested; no worker scheduler exists.                                                                                                                                              |

## 2. Proposed runtime model

The model keeps three structures separate:

1. **Ownership tree:** parent/child order, keyed identity, lifecycle, and host
   nesting.
2. **Dependency graph:** trait and state sources, derived systems, and
   host-property outputs.
3. **Task graph:** async resources and computations with dependency order,
   priority, cancellation, and freshness constraints.

An entity owns traits; systems declare their component reads and writes; events
are data routed to stable entity IDs. A compiler can map static JSX into
templates plus dynamic bindings. At runtime, trait writes form a change journal,
affected systems update derived state, and a host adapter receives batched
declarative property writes. DOM, Three, and other targets can define their own
commit behavior while sharing data and scheduling primitives.

The core remains ordinary JavaScript initially. Typed arrays and indexed tables
are implementation choices to benchmark, not design axioms. The graph does not
make JavaScript parallel: main-thread tasks serialize, DOM commits have an
owning thread, and workers introduce transfer and synchronization costs. Worker
placement is a scheduler policy for independent tasks, not a property of DAG
representation.

The ownership tree should remain available for ordering and lifecycle. Replacing
it wholesale with a DAG would make parent order, host nesting, and teardown
harder. Data dependencies supplement that tree; they do not make every tree
operation unnecessary.

## 3. Relation to prior work

Xi Rope Science studies ropes and text editing, but the transferable principle
is incremental computation: cache composable summaries, propagate deltas, and do
only the invalidation work required by the current interaction. The runtime
should allow explicit summary operations where their algebra is known, while
retaining a full-pass option for dense updates. Xi's visible-first work also
motivates priority tiers for input-critical, visible, near-viewport, background,
and idle work. See [related-work.md](./related-work.md) for the series mapping
and source links.

Xi's CRDT work is relevant to async work based on old snapshots. A result should
identify its stable target, read versions, and write set. On completion, the
runtime can accept it, cancel it, reject it, recompute it, or rebase it. CRDT
merge is warranted when concurrent domain operations have valid merge semantics;
it is not required for every view patch or streamed result. Worker/server
streaming can begin with versioned snapshots and patches.

React Compiler is an important baseline because it changes the amount of
repeated component work in idiomatic React. React Nylon is relevant as a small
reconciler experiment, and Koota's behavior work provides an entity-oriented
application precedent. These are architectural references, not direct evidence
for this runtime's speed.

## 4. Experimental method

### 4.1 Deno algorithmic study

The study compares two update loops over a one-to-one source-to-output topology:

- **Full scan:** iterate changed IDs, update the source values and dirty flags,
  then inspect every entity and write dirty outputs to a `Float64Array` host
  buffer.
- **Indexed graph:** iterate the same changed IDs and update source values
  through `set`, de-duplicate them in a dirty queue, traverse compiled target
  ranges, and write the same output values to a `Float64Array` host buffer.

Both arms use the same evenly spaced changed IDs and update formula. This
matched-input accounting includes the source mutation work on both sides. After
each scenario, the notebook resets the frame and checks every output for parity.
Graph construction is excluded from the timed interval. The sweep uses 1,000,
10,000, and 50,000 entities with 1%, 10%, 15%, 20%, 25%, 50%, 75%, and 100%
changed. IDs are stratified to remain unique and evenly spaced at every density.
Each scenario records 41 paired samples with balanced randomized arm order from
a saved deterministic seed, after five warmup pairs. Each timed arm sample
targets a nominal 50,000 estimated loop operations across input and propagation
work, capped at 1,000 frames. p95 uses nearest-rank. Three separate fresh Deno
processes repeat the sweep with distinct seeds; each raw pair, order, and
environment is saved.

An earlier scan baseline pre-marked dirty flags outside the timed loop, omitting
scan-side source updates. It is preserved as
`results/deno-graph-vs-scan-pre-input-accounting-v1.json` and superseded by the
matched-input experiment. The corrected study measures stable scalar bindings
only; it excludes component execution, JSX allocation, keys and dynamic
topology, effects, real DOM/Three setters, and interop. It is mechanism
evidence, not a React comparison.

### 4.1.1 Scannable dirty-bucket follow-up

A second Deno mechanism study compares the source queue with a bucket scan. The
bucket path applies the same changed source values, records dirty entities,
queues each touched fixed-size bucket once, and scans the entity range within
those buckets. It sweeps bucket sizes 16, 64, 256, and 1,024; eight change
densities from 1% through 100%; three entity counts; and evenly spread versus
contiguous-clustered source IDs. Each row has 41 randomized paired samples and
parity checks. Three fresh processes repeat the sweep; the primary run also
retains raw pairs for all bucket sizes. The method is exploratory: bucket size
and source locality are explicit workload factors, and setup is excluded.

### 4.1.2 Integrated three-path dispatch study

The focused dispatch experiment compares graph, 64-entity bucket, and full-scan
paths in the same randomized blocks at 50,000 entities, with eight densities and
two source layouts. It uses 48 blocks per scenario, balancing all six path
orders eight times, and repeats the study in three fresh Deno processes. The
paths apply the same source IDs and values and write equal outputs; all outputs
are checked for parity. Graph setup and dirty-structure allocation are excluded.
This isolates update-path timing and does not include a runtime selector.

### 4.1.3 Shared-source fan-out and binding de-duplication

This Deno mechanism experiment models 10,000 entities with three host outputs
per entity: `left = x`, `transform = x × scale`, and `opacity = alpha`. The
local source `x[i]` affects two bindings on entity `i`; the shared `scale`
source affects every transform binding; shared `alpha` affects every opacity
binding. The graph arm queues affected binding IDs and de-duplicates a binding
when local and shared sources change together. The comparison arm updates the
same source arrays and scans all entities, recomputing each affected output
once. Both paths produce the same values and output writes for a scenario.

The sweep crosses 1%, 10%, and 100% local-source changes with three modes:
local-only, local plus shared scale, and local plus shared scale and alpha. Each
scenario uses 12 warmup pairs and 48 timed pairs, with graph-first and
scan-first orders balanced and randomized. Sparse local-only updates repeat 32
times per timing sample, 10% repeats eight times, shared-scale samples repeat
twice, and full-density or two-global-source samples repeat once. Setup is
excluded. Each process checks every output for parity. Three fresh Deno
processes use distinct seeds. This is a hand-built mechanism model with
typed-array host buffers; it does not run OXC output, the browser DOM, or a
React renderer.

### 4.2 Browser prototype study

The initial browser study used a production Vite build with React 19.3.0 and
React Compiler 1.0.0 and compared three separately mounted 10,000-element DOM
fields: (1) React with one `useSyncExternalStore` subscription per leaf, (2)
Vite-transformed TSX with mount-time binding discovery, and (3) a repeated-host
plan emitted by the OXC spike and instantiated by a small JavaScript runtime.
Each arm updates CSS transforms for the same selected source fraction. That
historical study used six warmups and 42 timed pairs per density, with all six
arm orders balanced in randomized blocks. Sparse updates repeat within a sample
to reduce timer-floor effects: 32 repeats at 1%, eight at 10%, and one at 100%.
It checks output parity across the fields and stores setup separately. Timing
includes synchronous update and host setter calls; it excludes paint and GPU
presentation.

The arms do different internal work. React executes component updates, React
Compiler output, React DOM diffing, and host commits. The custom paths skip
component execution and reconciliation. The first generic-plan path avoided
mount-time JSX binding discovery but built CSR binding edges at mount. The
follow-up specialized path in section 5.9 replaces this with a compiler-proven
identity mapping and dense dirty-ID columns. The results are therefore evidence
about this narrow vertical slice, not a fair general framework bake-off or proof
of smoother frames. Raw records and environment metadata are in
`results/browser-paired-generated-plan*.json`.

### 4.2.1 Generated repeated-host plan prototype

The browser fixture in `src/browser/jsx_binding_view.tsx` uses a static
`<div className="particle-layer">` root and repeated
`<div className="particle">` host with two style bindings projected from each
source. The compiler also checks `compiler/fixtures/basic_scene.tsx`, which uses
a `<section>` root, repeated `<span>` hosts, additional static props, and two
bindings. `compiler/fixtures/shared_source_scene.tsx` adds a shared component
input alongside an item-local input. The OXC pass resolves imported `bind`,
extracts host attributes and projector expressions, and emits a TypeScript plan;
`compiled_plan_runtime.ts` creates host nodes and applies local and shared
bindings. The supported subset remains intentionally small: one static intrinsic
root, one direct repeated intrinsic host, static string props, and scalar style
bindings from item-local fields or dotted paths rooted in a formal parameter.
Dynamic props the plan cannot represent, non-index keys, and mixed static/bound
style objects are rejected with diagnostics. This does not demonstrate general
JSX lowering, dynamic topology, keyed reconciliation, a bucketed update
scheduler, or type-aware optimization.

### 4.2.2 Shared-source five-arm browser follow-up

The follow-up at `src/browser/shared_source_benchmark.tsx` mounts five
10,000-host fields: React 19.3 with React Compiler and local/shared
external-store subscriptions, the OXC-generated CSR and dense paths, an eager
full scan, and a guarded full scan. The local source drives `left` and
`transform`; the shared alpha input drives `opacity`. Each of seven local-only,
mixed, or shared-only conditions is run on two page loads. Each run includes 24
warmup pairs and 120 timed pairs, with every one of the 120 five-arm orders
shuffled once. The timing for each arm is the average across its
condition-specific repeat count (16 at local 1%, six at local 10%, and one
otherwise); parity is checked after each timed pair. Setup is measured once on
mount and kept outside the steady-state timing. The raw records preserve the
seeds, page-load IDs, per-run repeat counts, pair timing, compiler plan
metadata, and browser environment. Notebook Experiment P recomputes quantiles
and verifies schedule completeness and parity.

### 4.2.3 Compiler-generated writer follow-up

The six-arm follow-up uses the same 10,000-host, local/shared fixture and the
same React, CSR, dense, eager-scan, and guarded-scan arms, adding OXC-emitted
direct writer functions. The generated path shares the dense interpreter's
runtime storage, source-change input, dirty collection, and flush boundary,
while replacing generic binding lookup/projector dispatch with statically
emitted property writes. Each of seven local-only, mixed, or shared-only
conditions has two runs on distinct page-load IDs. Each run has 24 warmups and
120 timed pairs; a seeded schedule selects unique cyclic six-arm blocks and
balances every arm 20 times in every timing position. Local 1% and 10%
conditions average 16 and six repetitions per pair respectively; all other
conditions use one. The timing records are normalized per repetition. Setup is
reported separately, outputs are compared after each pair, and paint is
excluded. This comparison isolates the generated update path only within the
small supported fixture; it does not compare schedulers or general JSX
compilers.

### 4.3 OXC TSX-to-IR extraction spike

The Rust spike at `compiler/oxc-spike/` uses OXC 0.153.0 to parse TSX, build
semantic scopes, resolve imported `bind`, validate the repeated-host subset, and
emit JSON IR plus generated TypeScript. Schema v5 separates item-local and
shared-source CSR adjacency. The shared fixture verifies `node.x` feeds the
transform binding while `props.alpha` feeds opacity, and the OXC semantic
resolver confirms the shared root is a formal parameter. Both the dense and CSR
JavaScript paths now accept a shared input slot and fan its update out across
repeated hosts. A Deno fake-DOM integration check covers initial values,
repeated shared writes coalescing to the latest value, and interleaved
local/shared updates; this is correctness evidence only, not a performance
measurement. The six-arm browser benchmark now exercises the emitted writers
against the same local/shared updates, with parity checked after every timed
pair and zero reported failures. Cargo dependencies are pinned by the spike's
`Cargo.lock`. The OXC frontend does not type-check; the TypeScript compiler owns
type diagnostics. The spike still does not lower general JSX, dynamic structure,
arbitrary host operations, or a precomputed scheduler graph.

### 4.4 Evidence and reporting rules

Keep raw samples and environment metadata. Separate setup from steady-state
timing. Report operation counts as well as time. Do not infer frame smoothness
from synchronous update time alone. Use “mechanism evidence” for isolated data
structure experiments, “prototype evidence” for incomplete browser paths, and
“untested” for design claims without an implementation.

## 5. Results

### 5.1 User-reported browser observation

The user reported one run at 10,000 entities and 100% changed:

| Path           |    Median |       p95 | Reported work                 |
| -------------- | --------: | --------: | ----------------------------- |
| React          | 10.700 ms | 12.800 ms | 10,000 leaf updates per batch |
| Compiled graph |  2.700 ms |  3.200 ms | 10,000 bound props per batch  |

The observed graph median and p95 were each about four times lower. This result
has no raw frame samples, environment metadata, or exact run order. It was
retained as a user-provided observation in
`results/browser-observation-user-2026-10-09.json` and must not be treated as a
validated performance claim.

### 5.2 Instrumented browser pilot

Three runs per path were collected in Chrome 155 on Apple Silicon. Each run
recorded 41 timed samples after eight warmups. The order was React three times,
then graph three times; no pairing or randomization was used.

| Path           | Run medians (ms) | Median of run medians | Run p95s (ms)     | Median of run p95s |
| -------------- | ---------------- | --------------------: | ----------------- | -----------------: |
| React          | 21.0, 20.2, 19.9 |                  20.2 | 25.2, 24.5, 205.3 |               25.2 |
| Compiled graph | 16.2, 12.8, 17.4 |                  16.2 | 44.9, 23.9, 43.3  |               43.3 |

The raw 246-frame records, including exact samples and browser metadata, are in
`results/browser-pilot-2026-10-09.json`. This pilot does not reproduce the
10.7/2.7 ms run. Its median-of-run-medians favors the graph, but its
median-of-run-p95 is worse. The 205 ms React p95 in one run is a large outlier;
the graph p95 also varies. Fixed order, browser load, and differing internal
work make causal interpretation impossible. The result justifies a better
experiment, not a speedup headline.

### 5.3 Randomized paired browser comparison with an external-store baseline

The next browser experiment strengthens the earlier comparison in two ways: each
pair updates the same DOM nodes with the same sequence of values, and React uses
a per-entity `useSyncExternalStore` subscription rather than the earlier
`useState` leaf baseline. The production build includes React 19.3, React
Compiler 1.0, and a typed-array store. The graph path retains the compiled
binding index and a ref-based style adapter.

Each density has eight warmup pairs and 41 timed pairs. React-first and
graph-first order was shuffled with a recorded seed and balanced at 21/20 among
timed pairs. To make sparse samples longer than the browser timer granularity,
the harness repeats each update 32 times at 1%, eight times at 10%, and once at
100%, then reports average time per update. It verifies identical final CSS
transform strings on up to 32 deterministic changed IDs after each pair. All 123
parity checks passed. A later rerun disables graph flush diagnostics during
timing to measure the production fast path. Its raw observations and seeds are
in `results/browser-paired-external-store-no-flush-stats-v6-2026-10-09.json`;
the notebook derives `results/browser-paired-summary-2026-10-09.json`. The
earlier balanced run is retained as historical evidence.

The `no-flush` filename refers to the graph's diagnostic flush flag, not React:
the React arm in this §5.3 harness still wraps each store update in `flushSync`.
The later Snake V6 React arm is separate and does not use `flushSync` around
timed RAF updates; see paper §8.5 and the frozen V6 source snapshot.

|     Changed per update | Repeat factor | React median / p95 (ms) | Graph median / p95 (ms) | Median paired ratio | Graph faster pairs |
| ---------------------: | ------------: | ----------------------: | ----------------------: | ------------------: | -----------------: |
|      100 / 10,000 (1%) |            32 |           2.934 / 3.331 |           0.028 / 0.031 |             106.87× |            41 / 41 |
|   1,000 / 10,000 (10%) |             8 |           6.575 / 8.412 |           0.262 / 0.363 |              24.95× |            41 / 41 |
| 10,000 / 10,000 (100%) |             1 |        26.700 / 126.100 |          3.000 / 14.400 |              11.87× |            41 / 41 |

In this browser harness, the graph path is faster at all three tested densities,
including the dense case. This does not contradict the Deno scan-versus-index
experiment below. That experiment compares a graph's own `set`/queue/flush
overhead against a low-level full scan that writes the same typed-array outputs.
This browser experiment compares the graph with React component subscriptions,
component execution, React DOM diffing, and commits. It therefore shows the cost
of the current React update path for this workload; it does not isolate graph
versus scan and does not prove that React generally has that cost.

The pairing and order balance improve the evidence, but these results still come
from one 41-pair block per density on one browser/device session. Repeated
updates within a sample are not 32 independent observations, pair-level timings
may be autocorrelated, and only sampled DOM outputs are checked. The graph still
skips JSX compilation and uses an internal ref adapter, while React retains its
normal render/commit path. These data support a strong prototype signal for this
workload, not a general framework performance claim.

### 5.4 TSX props bound to a minimal runtime

The TSX page compares React 19.3 plus React Compiler and per-leaf
`useSyncExternalStore` against Vite-transformed custom JSX that creates host
elements and binds scalar props to a minimal runtime. It uses 10,000 entities,
eight warmup pairs, 41 timed pairs per density, randomized pair order, and
sampled value parity. The repeated sparse cases report average cost per update.
The setup column below is one recorded mount measurement per arm, not a
replicated estimate.

| Changed | React median / p95 (ms) | TSX bindings median / p95 (ms) | Median paired ratio | Binding wins | Sampled parity failures | One setup measurement (React / binding ms) |
| ------: | ----------------------: | -----------------------------: | ------------------: | -----------: | ----------------------: | -----------------------------------------: |
|      1% |           1.563 / 1.822 |                  0.034 / 0.038 |              47.50× |        41/41 |                       0 |                                 115 / 18.5 |
|     10% |           3.713 / 5.800 |                  0.400 / 0.488 |               9.47× |        41/41 |                       0 |                                 115 / 18.5 |
|    100% |         21.900 / 27.900 |                  2.500 / 2.800 |               8.73× |        41/41 |                       0 |                                 115 / 18.5 |

These are strong paired differences in this prototype harness, but the binding
arm still does less framework work: it does not rerun components, perform React
reconciliation, or compile a static dependency graph. It constructs bindings at
mount and directly calls host setters; React and the binding arm own separate
equivalent DOM subtrees. The parity check samples values rather than comparing
the complete tree, and all measurements come from one Chrome 155 / Apple Silicon
session. Setup is only a single descriptive measurement. The data support the
next step—compile the TSX binding shape and compare equal declarative
semantics—not a broad React speed claim. The raw data are in
`results/browser-paired-jsx-binding-v1-2026-10-09.json`.

### 5.5 Density sweep: graph versus full scan

The matched-input experiment ran on Deno 2.6.3 / V8 14.2.231.17, macOS arm64,
with ten reported hardware threads. The table reports the median of three
fresh-process medians in microseconds per batch. The ratio is scan / graph, so
values above 1 favor graph dispatch. The final column shows graph-faster pairs
in each 41-pair process block. All 72 scenario/process output checks passed.

| Entities | Changed | Scan / graph median (µs) | Scan / graph | Graph wins per process (41 pairs) |
| -------: | ------: | -----------------------: | -----------: | --------------------------------: |
|    1,000 |      1% |            0.483 / 0.085 |        5.65× |                          41/41/40 |
|    1,000 |     10% |            1.415 / 0.903 |        1.57× |                          41/41/40 |
|    1,000 |     15% |            1.724 / 1.345 |        1.28× |                          41/40/37 |
|    1,000 |     20% |            2.033 / 1.785 |        1.14× |                          41/40/39 |
|    1,000 |     25% |            2.344 / 2.236 |        1.05× |                          39/35/37 |
|    1,000 |     50% |            3.918 / 4.458 |        0.88× |                             2/3/2 |
|    1,000 |     75% |            5.485 / 6.698 |        0.82× |                             0/6/0 |
|    1,000 |    100% |            7.042 / 8.877 |        0.79× |                             3/2/0 |
|   10,000 |      1% |            8.959 / 0.955 |        9.31× |                          41/41/41 |
|   10,000 |     10% |          14.031 / 10.465 |        1.34× |                          41/40/41 |
|   10,000 |     15% |          16.948 / 15.148 |        1.14× |                          41/40/38 |
|   10,000 |     20% |          20.073 / 19.437 |        1.04× |                          40/35/33 |
|   10,000 |     25% |          23.562 / 24.146 |        0.98× |                             6/1/2 |
|   10,000 |     50% |          38.250 / 46.267 |        0.84× |                             1/1/1 |
|   10,000 |     75% |          53.167 / 66.347 |        0.80× |                             0/2/0 |
|   10,000 |    100% |          70.105 / 89.895 |        0.77× |                             0/5/0 |
|   50,000 |      1% |           43.709 / 5.187 |        8.42× |                          41/40/41 |
|   50,000 |     10% |          70.625 / 52.942 |        1.33× |                          41/41/40 |
|   50,000 |     15% |          84.459 / 74.972 |        1.14× |                          40/35/40 |
|   50,000 |     20% |         102.250 / 98.313 |        1.04× |                          39/28/39 |
|   50,000 |     25% |        117.833 / 120.292 |        0.98× |                             4/3/4 |
|   50,000 |     50% |        195.875 / 230.541 |        0.85× |                             0/1/1 |
|   50,000 |     75% |        272.792 / 341.208 |        0.80× |                             0/0/0 |
|   50,000 |    100% |        352.416 / 456.750 |        0.77× |                             0/0/3 |

At 10,000 and 50,000 entities, graph dispatch wins consistently through 20%
changed, though its advantage narrows to about 4% at 20%. At 25%, the full scan
leads in all three processes at both sizes, by only a few percent. At 1,000
entities, graph dispatch retains a small median advantage at 25%, while the scan
wins clearly by 50%. The observed crossover is therefore around 20–25% for the
larger cases and between 25–50% for the small case on this machine and this
topology; it is not a universal threshold. At 50,000 entities and 50% changed,
the scan is about 1.18× faster; at 100%, about 1.30× faster.

The benchmark uses one scalar binding per entity, stable topology, and
`Float64Array` host outputs. Graph flush diagnostics are disabled. The earlier
pre-marked scan data remains archived as
`results/deno-graph-vs-scan-pre-input-accounting-v1.json` and must not be used
for crossover analysis. Setup is excluded; graph construction, allocation,
dynamic edge churn, and retained memory still need separate measurements. Raw
pair samples and per-process files are linked from the reproduction commands and
notebook.

### 5.6 Integrated graph, bucket, and full-scan comparison

To avoid assembling a three-way result from separate experiments, this study
compares all paths inside the same paired blocks at 50,000 entities. Each
scenario has 48 blocks with all six path orders balanced eight times, repeated
in three fresh Deno processes. It uses 64-entity buckets, eight densities, and
spread or contiguous-clustered changed IDs. The table reports the median of
process medians in microseconds per update batch. Bucket slots are the total
entity positions inspected across touched buckets. The “fastest” column is a
post-hoc median comparison; no runtime dispatcher is implemented.

| Changed | Layout  | Bucket slots scanned | Graph / bucket / full scan (µs) | Fastest median |
| ------: | ------- | -------------------: | ------------------------------: | -------------- |
|      1% | Spread  |               32,000 |         5.376 / 34.000 / 37.833 | graph          |
|      1% | Cluster |                  576 |          4.428 / 4.065 / 42.125 | bucketScan     |
|     10% | Spread  |               50,000 |        52.317 / 85.000 / 73.709 | graph          |
|     10% | Cluster |                5,056 |        45.150 / 40.000 / 73.041 | bucketScan     |
|     15% | Spread  |               50,000 |       74.083 / 102.333 / 90.875 | graph          |
|     15% | Cluster |                7,552 |        68.278 / 60.250 / 90.459 | bucketScan     |
|     20% | Spread  |               50,000 |      95.354 / 117.000 / 105.792 | graph          |
|     20% | Cluster |               10,048 |       90.396 / 80.000 / 107.375 | bucketScan     |
|     25% | Spread  |               50,000 |     120.396 / 135.250 / 125.667 | graph          |
|     25% | Cluster |               12,608 |     114.167 / 101.167 / 125.750 | bucketScan     |
|     50% | Spread  |               50,000 |     231.042 / 226.375 / 211.959 | fullScan       |
|     50% | Cluster |               25,024 |     225.334 / 200.041 / 210.250 | bucketScan     |
|     75% | Spread  |               50,000 |     340.458 / 312.459 / 296.125 | fullScan       |
|     75% | Cluster |               37,568 |     338.917 / 299.000 / 295.834 | fullScan       |
|    100% | Spread  |               50,000 |     452.292 / 401.625 / 379.375 | fullScan       |
|    100% | Cluster |               50,000 |     452.541 / 402.416 / 381.667 | fullScan       |

In this controlled three-path run, graph dispatch leads for spread updates
through 25%, while the full scan leads at 50% and above. For clustered updates,
bucket scans lead from 1% through 50%; at 75% the bucket and full scan are
close, and at 100% the full scan leads. For example, at 25% clustered changes
the bucket scan inspects 12,608 of 50,000 slots and has a 101.167 µs median,
versus 114.167 µs for graph dispatch and 125.750 µs for full scan. At 50%
spread, the full scan is fastest at 211.959 µs; buckets inspect all 50,000 slots
and take 226.375 µs.

All outputs matched across the three paths in every process. This study supports
locality and dirty coverage as routing signals, but it does not measure a
dispatcher. The bucket arm pays dirty-entity and dirty-bucket bookkeeping; the
full-scan arm pays a full entity traversal. A runtime policy must collect enough
information to choose without spending more than the path it saves. Bucket-size
tuning, selector overhead, and workloads with multiple bindings per entity
remain open.

The complete eight-density bucket sweep, four bucket sizes, two layouts, and
three entity counts is in `results/deno-bucket-scan-vs-graph.json`, with
fresh-process replications in `results/deno-bucket-scan-vs-graph-process-1.json`
through `-process-3.json`. The integrated three-way study is in
`results/deno-three-way-dispatch-process-1.json` through `-process-3.json` and
`results/deno-three-way-dispatch-replication-summary.json`.

### 5.7 Combined interpretation

The mechanism evidence supports three narrower statements: a precomputed
dependency index reduces low-level work for sparse and spread changes; a full
pass can regain the lead at higher change densities; and dirty-bucket scans can
help when changed sources cluster together. A new browser study executes an
OXC-generated repeated-host plan and finds lower update medians and p95s than
both comparison paths in one session at the three measured densities. Its
architecture and workload remain narrow, the implementation work is unequal, and
independent browser replication and frame presentation are untested; this does
not establish a general React speedup.

### 5.8 Initial generic generated-plan browser study

The OXC pass emits a narrow repeated-host plan, and the browser runs it through
a JavaScript host runtime. All records are from one Chrome 154 / MacIntel
session, with production Vite output, 10,000 entities, 42 timed pairs per
density, zero parity failures, and balanced six-order blocks. Nearest-rank p95s
and medians below use the browser's recorded summaries; times are milliseconds
per batch.

| Changed | React median / p95 | Mount-time JSX median / p95 | OXC plan median / p95 | Plan faster than React pairs | Plan faster than JSX pairs |
| ------: | -----------------: | --------------------------: | --------------------: | ---------------------------: | -------------------------: |
|      1% |      0.819 / 0.891 |               0.044 / 0.053 |         0.037 / 0.044 |                        42/42 |                      33/42 |
|     10% |      2.575 / 3.250 |               0.475 / 0.625 |         0.387 / 0.488 |                        42/42 |                      38/42 |
|    100% |    16.200 / 19.000 |               3.600 / 4.700 |         3.100 / 3.600 |                        42/42 |                      38/42 |

Separate one-shot setup measurements were React 18.2 ms, mount-time JSX 15.7 ms,
and generated plan 7.8 ms. Setup was not replicated and should be read as
diagnostic, not a stable estimate. Data files are
`results/browser-paired-generated-plan-sparse-v1-2026-10-09.json` (1%),
`results/browser-paired-generated-plan-v1-2026-10-09.json` (10%), and
`results/browser-paired-generated-plan-dense-v1-2026-10-09.json` (100%).

The generated plan path was fastest in these recorded pairs, but the benchmark
has an important asymmetry: React runs components and reconciliation while
custom paths directly propagate bindings and commit host props. This first plan
runtime still instantiates per-source graph edges at mount; section 5.9 reports
the later dense-layout specialization. One device/session, no paint/frame
measurement, no independent reproduction, and no equivalent work model limit the
conclusion to preliminary implementation-specific evidence. The next study
should compare equivalent generated host writes, measure mount/setup/teardown
and memory, add repeated browser/device replications, and include frame
presentation.

### 5.9 Specialized dense-layout browser study

The next runtime revision specializes the compiler-proven one-to-one repeated
template. It maps source `i` directly to host target `i` and uses `Float64Array`
values, `Uint8Array` dirty flags, and a `Uint32Array` dirty-ID queue. The flush
walks only changed IDs and writes directly to the indexed target. This removes
CSR edge construction, per-edge tuple objects, and one closure per target. The
update path remains ordinary JavaScript; it is not WASM/SIMD.

Valid runs used Chrome 155 on MacIntel, production Vite output, 10,000 entities,
42 timed pairs, six warmups, and 0 parity failures. One 10% run was repeated,
and a 1% run was replayed with the same randomization seed; both seed runs
produced identical 42-pair arm-order sequences. Times are milliseconds per
batch. Each cell shows `median (p95)`; repeated rows are separate browser runs,
not pooled samples.

| Changed | Run / seed               |           React | Mount-time JSX | Specialized plan | Plan faster React | Plan faster JSX |
| ------: | ------------------------ | --------------: | -------------: | ---------------: | ----------------: | --------------: |
|      1% | A / 2695417668           |   2.022 (2.184) |  0.034 (0.041) |    0.025 (0.028) |             42/42 |           41/42 |
|      1% | seed replay / 3828551373 |   2.022 (2.181) |  0.034 (0.044) |    0.025 (0.028) |             42/42 |           41/42 |
|     10% | A / 2297324060           |  4.825 (21.538) |  0.413 (2.088) |    0.275 (1.063) |             42/42 |           42/42 |
|     10% | B / 747370064            |   4.938 (5.588) |  0.388 (0.475) |    0.263 (0.325) |             42/42 |           40/42 |
|    100% | A / 33771132             | 34.300 (38.600) |  2.900 (3.300) |    2.300 (2.600) |             42/42 |           39/42 |

The first 10% run has a large p95 excursion across all arms, which is why the
second run is retained separately rather than hiding or pooling it. Pair order
was balanced across the six permutations (seven timed pairs per permutation). A
transient 1% run during browser control had 42 parity failures and implausibly
low React timings; it is preserved in the session export as a diagnostic and
excluded from the table. Replaying its seed on a fresh page produced zero parity
failures and the same arm order. Per-run raw samples are under
`results/browser-paired-specialized-plan-*-v2-*.json`; the complete export
including the excluded diagnostic is
`results/browser-paired-specialized-plan-session-v2-2026-10-09.json`.

In this earlier three-arm study, the specialized path wins in most or all paired
comparisons against React and mount-time JSX. Because the generic-plan results
are from a different browser session, those records do not isolate the speedup
from the runtime specialization itself; section 5.10 supplies the head-to-head
CSR comparison. The arms also do unequal work: React executes components and
reconciles; the generated path performs direct binding propagation and host
writes. There is only one browser/device, and setup values are one-shot
diagnostics. The result is evidence for the specialized mechanism, not a
React-wide win or smoothness claim. The next meaningful test needs shared
sources across entities, dynamic graph edits, setup/teardown and allocation
costs, and presented-frame measurements.

### 5.10 Same-session CSR versus specialized-plan comparison

To isolate runtime representation, the browser harness adds a fourth arm that
consumes the same OXC-generated plan through the generic `CompiledBindings` CSR
implementation. React, mount-time JSX, CSR, and specialized identity-layout
paths receive the same source IDs and frame values and produce the same CSS
transform strings on sampled IDs. Each run has 24 warmups (one of every order)
and 48 timed pairs (two of every order), shuffled within complete permutation
blocks. The order seed is user-settable and stored in the record. Each run
checks sampled output parity across all four fields. The study uses 10,000
entities, one binding per source, 32 repeated updates per measured pair at 1%,
eight at 10%, and one at 100%.

All runs were recorded on Chrome 155 / MacIntel from the production Vite build.
Each table entry is median (nearest-rank p95) milliseconds per batch; separate
10% rows are not pooled.

| Changed | Run / seed             |           React |     Mount JSX |   Generic CSR |   Specialized | Specialized faster than CSR |
| ------: | ---------------------- | --------------: | ------------: | ------------: | ------------: | --------------------------: |
|      1% | A / 11423321           |   1.775 (1.928) | 0.031 (0.038) | 0.025 (0.031) | 0.025 (0.028) |                       28/48 |
|     10% | A / 11423322           |   4.450 (5.050) | 0.388 (0.475) | 0.288 (0.438) | 0.263 (0.325) |                       33/48 |
|     10% | seed replay / 11423322 |   5.300 (6.738) | 0.450 (0.750) | 0.338 (0.513) | 0.275 (0.375) |                       37/48 |
|    100% | A / 11423323           | 31.200 (38.300) | 2.700 (3.100) | 2.400 (2.800) | 2.100 (2.400) |                       40/48 |

All four runs had 48/48 sampled parity checks passing, and each run had each of
the 24 arm orders exactly twice. The repeated 10% run reproduced the exact order
sequence and yields a similar median advantage for specialization over CSR
(0.263 vs 0.288 ms; 0.275 vs 0.338 ms), but p95 tails vary. At 1%, CSR and the
specialization tie at the median and differ by only a few microseconds; this is
near the timer floor and not a robust speedup claim. At 100%, specialization
beat CSR in 40 of 48 pairs. The raw dataset is
`results/browser-paired-four-way-plan-session-v3-2026-10-09.json`, with per-run
files alongside it.

This is the first same-session evidence that identity-layout specialization can
reduce the overhead of a generic CSR graph for the one-to-one repeated template.
It still does not establish the advantage for fan-out, shared sources, dynamic
topology, or multiple host operations. React performs component execution and
reconciliation that the other arms bypass, so React comparisons remain
workload-specific; no run measures paint or presented frames. Setup is measured
once per page mount and should not be treated as stable. The next compiler
experiment should emit small static fan-out graphs and compare CSR, identity,
and bucket layouts under the same four-arm harness.

### 5.11 Two-output source fan-out

The compiler fixture now binds one source to two style outputs on the same
repeated host: `transform` and `opacity`. OXC resolves both imported `bind`
calls, associates each call with its own style-property key by source span, and
emits a two-entry binding plan. At mount, the generic arm materializes two CSR
edges and closures per source; the specialized arm retains one dense dirty ID
per source and evaluates both static bindings on flush. React and mount-time JSX
perform the same two property updates. This tests fan-out from one datum into
multiple host writes without changing the source-update sequence.

The four-arm protocol remains the same: 10,000 entities, 24 warmup pairs, 48
timed pairs, each of 24 arm orders occurring twice, 32 repeats at 1%, eight at
10%, and one at 100%. Runs use Chrome 155 / MacIntel and the production Vite
build. Output parity checks compare both properties on sampled IDs; all reported
runs have zero parity failures.

| Changed | Run / seed             | Host writes per update | React median / p95 | Mount JSX median / p95 | CSR median / p95 | Specialized median / p95 | Specialized faster than CSR |
| ------: | ---------------------- | ---------------------: | -----------------: | ---------------------: | ---------------: | -----------------------: | --------------------------: |
|      1% | A / 21000001           |                    200 |      2.016 / 2.184 |          0.056 / 0.063 |    0.050 / 0.056 |            0.044 / 0.050 |                       33/48 |
|     10% | A / 21000002           |                  2,000 |      5.387 / 5.763 |          0.663 / 0.787 |    0.563 / 0.625 |            0.500 / 0.563 |                       39/48 |
|     10% | seed replay / 21000002 |                  2,000 |      5.625 / 6.587 |          0.688 / 0.925 |    0.538 / 0.625 |            0.488 / 0.563 |                       38/48 |
|    100% | A / 21000003           |                 20,000 |    37.400 / 42.700 |          5.600 / 7.100 |    4.900 / 5.300 |            4.400 / 4.700 |                       43/48 |

The specialization beat generic CSR in 68.8%, 81.3%, 79.2%, and 89.6% of pairs,
respectively. The two 10% runs used the same seed and reproduced the exact order
sequence. The direct-vs-CSR median gaps range from about 10% to 12%; unlike the
one-output study, the advantage appears in most pairs even in the sparse case.
These are still single-device runs and small sub-millisecond differences for
sparse updates, so multi-session replication is needed before treating the
effect as stable. Raw samples are in
`results/browser-paired-fanout-four-way-session-v4-2026-10-09.json` and the
matching per-run files.

This demonstrates that the compiler/runtime can represent a simple one-to-many
binding and that the specialized scheduler can apply multiple host operations
from one dirty source. It does not yet test shared sources across entities,
dynamic dependencies, keyed topology changes, or whether a generalized DAG
layout beats CSR after graph construction and lifecycle costs are included.

### 5.12 Compiler-emitted CSR template replay

The OXC plan now emits a schema-v4 dependency template alongside its binding
descriptors. The browser benchmark fixture still has one scalar source slot, CSR
offsets `[0, 2]`, and binding IDs `[0, 1]` for `opacity` and `transform`. The
generated format now supports multiple source slots; the dense runtime stores
per-entity/per-slot values and dirty IDs, and dispatches through the matching
CSR range. This makes source-to-binding adjacency explicit in compiler output
rather than reconstructing binding order from the full plan.

A replay used 10,000 entities, 10% changes, two host writes per changed entity,
Chrome 155 on MacIntel, production Vite output, seed `21000002`, 24 warmup
pairs, and 48 timed pairs. All 24 four-arm orders appeared twice, sampled output
parity passed, and the order schedule matched the earlier same-seed run. The row
is a separate run, not pooled with that replay. Times are milliseconds per
batch, median (nearest-rank p95).

| Changed |     Seed |         React | Mount-time JSX | Generated CSR | Dense specialization | Dense faster than CSR |
| ------: | -------: | ------------: | -------------: | ------------: | -------------------: | --------------------: |
|     10% | 21000002 | 5.375 (5.913) |  0.713 (0.838) | 0.638 (0.738) |        0.550 (0.625) |           42/48 pairs |

Setup was 85.7 ms for React, 25.7 ms for mount-time JSX, 14.8 ms for generated
CSR, and 9.5 ms for the dense path in this run; treat these as one-run
diagnostics. The dense path beat React in 48/48 and mount-time JSX in 45/48
pairs. The custom paths still skip React component execution and reconciliation,
so these timings do not isolate a general framework advantage. Raw data are in
`results/browser-paired-explicit-csr-template-10pct-v5-run1-2026-10-09.json`;
the full saved browser session export is
`results/browser-paired-explicit-csr-template-session-v5-2026-10-09.json`.

### 5.13 Multi-source plan browser parity

The schema-v4 compiler plan for `compiler/fixtures/multi_trait_scene.tsx` maps
`node.x` to `left` and `transform`, and `node.y` to `opacity`, using
source-binding offsets `[0, 2, 3]` and binding IDs `[0, 2, 1]`. The standalone
browser check mounts both the dense identity path and the generic CSR path from
this same emitted plan. It verifies initial output, repeated writes coalesced
before flush, independent updates to different entities and slots, and exact
agreement with expected CSS strings. Both paths produce six host bindings for
two entities and three properties, with zero parity failures. The reproducible
record is `results/browser-multi-source-runtime-parity-v1.json`; the page is
`multi-source-check.html`. This check establishes only functional routing in
Chrome. It has no timing samples and does not compare the multi-source plan with
React.

### 5.14 Multi-source React/graph timing sweep

The timed browser harness compares React 19.3 with React Compiler against two
dispatch paths instantiated from the OXC schema-v4 plan. Each entity has two
independently stored values: `x` feeds `left` and `transform`; `y` feeds
`opacity`. In each batch, both values change for the same selected entities.
React reads both traits through two `useSyncExternalStore` subscriptions in one
component and commits the batched changes through `flushSync`; graph arms
enqueue the same source values and synchronously flush the matching host writes.
Every changed entity receives the same three output values. The timed region
includes input-loop work and host commit, and excludes paint.

The benchmark used 10,000 entities, 24 warm-up pairs, 48 timed pairs per run,
and eight observations of each of the six three-arm orders. At each change
density, two seeds were run. All 288 timed pairs across six runs had output
parity, and the compiler graph metadata matched the expected two-slot adjacency.
Times are milliseconds per batch; each cell shows median (p95).

| Changed entities |     Seed | React + Compiler |    Generic CSR |          Dense | Dense wins vs CSR |
| ---------------: | -------: | ---------------: | -------------: | -------------: | ----------------: |
|         100 (1%) | 31000005 |    7.506 (7.797) |  0.072 (0.091) |  0.066 (0.084) |             41/48 |
|         100 (1%) | 31100005 |    6.556 (7.853) |  0.072 (0.078) |  0.063 (0.072) |             43/48 |
|      1,000 (10%) | 31000003 |  12.012 (14.525) |  0.813 (1.163) |  0.738 (1.275) |             39/48 |
|      1,000 (10%) | 31000004 |  12.737 (15.050) |  0.838 (1.237) |  0.738 (1.300) |             39/48 |
|    10,000 (100%) | 31000006 |  68.900 (77.200) | 8.000 (12.400) | 7.300 (15.600) |             41/48 |
|    10,000 (100%) | 31100006 |  64.600 (73.200) | 7.900 (12.700) |  7.300 (8.300) |             38/48 |

The dense path's median was lower than CSR in all six runs, but its tail was
worse in three runs, including one full-density run. This makes the small median
advantage over generic CSR uncertain; dense specialization did not uniformly
improve latency. Both graph paths beat the React baseline in every timed pair in
this single-device sample. The apparent ratio narrows as more entities change,
and the dense/CSR tail spread at 100% underscores the need for more independent
sessions. The React and graph paths perform equivalent source changes and final
host writes, but they do not execute equivalent internal work: React runs
component updates, subscription checks, and reconciliation, while graph arms use
precompiled bindings and direct style writes. Therefore this measures the cost
of these implementations, not a general React ceiling or a cross-device
framework guarantee.

Initial setup was measured once in the browser session (React 90.8 ms, CSR 30.3
ms, dense 11.0 ms) and reused across density runs; these figures are not
independent setup replications. The six raw runs, all pair timings, and browser
metadata are in `results/browser-multi-source-timing-session-v1.json`; the
standalone seed files are alongside it. React Compiler activation is visible in
the generated production bundle as compiler memo-cache calls. The reproducible
browser page is `multi-source-benchmark.html`; notebook Experiment K checks pair
counts, order balance, parity, graph shape, and recomputes summary quantiles
from raw pairs.

### 5.15 Fresh-page replications

A follow-up collected four additional runs, each after reloading the benchmark
so React, CSR, and dense host trees were reconstructed for that page load. The
records have four distinct `pageLoadId` values and seeds 32000001–32000004. The
protocol and workload match section 5.14: 10,000 entities, 24 warmups, 48 timed
pairs, balanced three-arm order, two source slots changed per selected entity,
and zero parity failures. This is fresh-page replication within the same Chrome
155 profile and MacIntel machine, not an independent browser/device session.

| Changed entities |     Seed | React + Compiler |   Generic CSR |          Dense | Dense wins vs CSR |
| ---------------: | -------: | ---------------: | ------------: | -------------: | ----------------: |
|         100 (1%) | 32000001 |    6.319 (8.472) | 0.072 (0.078) |  0.063 (0.069) |             43/48 |
|         100 (1%) | 32000002 |    6.381 (7.441) | 0.075 (0.087) |  0.063 (0.075) |             43/48 |
|      1,000 (10%) | 32000003 |  12.612 (13.088) | 0.787 (0.900) |  0.713 (0.813) |             41/48 |
|    10,000 (100%) | 32000004 |  68.500 (79.600) | 7.900 (9.000) | 7.000 (12.000) |             43/48 |

Values are median (p95) milliseconds per batch. Each graph path again beat React
in all 48 paired observations per run. Dense had a lower median than CSR in all
four fresh-page runs; its p95 exceeded CSR only in the 100% run (12.0 vs 9.0
ms). This modestly strengthens repeatability across page reconstruction, while
leaving device, browser profile, workload scope, unequal rendering work, and
excluded paint unchanged. Setup times varied between page loads and remain
descriptive rather than stable estimates. The four raw records and all paired
timings are in `results/browser-multi-source-fresh-page-session-v1.json`;
Notebook Experiment L validates unique page IDs, run shape, order balance,
parity, and summary quantiles.

### 5.16 Shared-source fan-out changes the dispatch winner

The new mechanism study compares a dirty-binding graph with a full scan for
local changes and two shared sources. Each process contains 48 randomized paired
samples. Table medians and p95s are the median of the three process-level
quantiles, in microseconds per batch. `x` affects two outputs on changed
entities, `scale` affects every transform, and `alpha` affects every opacity.

| Local changes | Shared sources updated | Unique affected bindings | Graph median / p95 (µs) | Full scan median / p95 (µs) | Graph wins per process |
| ------------: | ---------------------- | -----------------------: | ----------------------: | --------------------------: | ---------------------: |
|            1% | none                   |                      200 |           1.109 / 1.497 |               6.698 / 8.387 |           48 / 48 / 48 |
|           10% | none                   |                    2,000 |         17.260 / 21.167 |             25.651 / 29.375 |           46 / 48 / 48 |
|          100% | none                   |                   20,000 |       136.666 / 152.208 |             87.541 / 99.000 |              0 / 1 / 0 |
|            1% | scale                  |                   10,100 |         58.521 / 86.854 |             24.771 / 28.375 |              0 / 0 / 0 |
|           10% | scale                  |                   11,000 |         72.958 / 99.708 |             28.020 / 37.313 |              0 / 0 / 0 |
|          100% | scale                  |                   20,000 |       143.938 / 159.042 |             77.687 / 84.292 |              0 / 0 / 0 |
|            1% | scale + alpha          |                   20,100 |       104.916 / 175.000 |             28.542 / 45.709 |              0 / 0 / 0 |
|           10% | scale + alpha          |                   21,000 |       113.916 / 203.708 |             32.458 / 36.167 |              0 / 0 / 0 |
|          100% | scale + alpha          |                   30,000 |       169.500 / 191.083 |             80.750 / 87.750 |              0 / 0 / 0 |

All 1,296 timed pairs across the three processes had parity, and each process
balanced the two arm orders 24 times each. Sparse local-only work favors the
graph; dense local work favors the scan. Any all-entity shared dependency makes
the full scan win in this model, even when local changes are only 1%, because
the graph still queues and visits 10,000 affected bindings. The result supports
a dispatcher that considers affected binding coverage and locality, not only the
fraction of locally changed entities. It does not establish a browser or
framework speedup: the shared graph is handwritten, setup is excluded, outputs
are typed arrays, and React is not part of this experiment. The three process
records are listed in `results/deno-shared-dependency-replication-summary.json`;
the earlier one-off run remains separately labeled
`results/deno-shared-dependency-pilot-1063771009.json`; Notebook Experiment M
validates order balance, parity, and recomputed quantiles.

### 5.17 OXC shared-source plan reaches the JavaScript host runtime

Schema-v5 OXC IR now puts item-local paths and shared component inputs in
distinct CSR tables. The shared fixture compiles `node.x` to the local transform
binding and `props.alpha` to the opacity binding; semantic resolution requires
the shared path root to be a formal parameter. The runtime exposes
`setShared(slot, value)`. Its dense path keeps one shared value and dirty slot,
then writes the dependent property across repeated hosts; its CSR path adds one
graph source with edges to the repeated host targets. A Deno fake-DOM parity
check covers initial fan-out, latest-value coalescing after repeated writes, and
a local update in the same flush. This closes a correctness gap between the
compiler plan and runtime. The browser harness now has a timing study in section
5.18: it compares React Compiler subscriptions, OXC CSR, OXC dense dispatch, and
a full host scan across local, shared-only, and mixed updates. A Deno fake-DOM
parity check and the browser study cover the compiler plan and JavaScript host
paths. These are correctness and narrow timing signals, not proof of general
framework speed.

### 5.18 Browser shared-source fan-out and the density crossover

The browser study compares React 19.3 with React Compiler and per-entity
useSyncExternalStore subscriptions, OXC CSR dispatch, OXC dense dispatch, and a
full host scan. There are 10,000 hosts; local node.x drives left and transform,
while shared props.alpha drives opacity. Conditions are local-only at 1%, 10%,
and 100%; mixed local-plus-shared at those fractions; and shared-only fan-out.
Each of the seven conditions was measured once on each of two fresh page loads,
using seeds 42620001–42620006 plus 42610007 on the first load and
42630001–42630007 on the second. Each run has 24 warmup and 24 timed pairs, with
all 24 four-arm orders appearing exactly once in randomized order. This yields
14 runs and 336 timed pairs, with zero parity failures. The raw tuples,
page-load IDs, setup measurements, and browser metadata are in
results/browser-shared-source-timing-session-v2-2026-10-09.json; Notebook
Experiment O validates and summarizes them.

The table reports each page-load run as median / nearest-rank p95 milliseconds
per batch. The two entries per cell are separate replications, not pooled
observations.

| Scenario    |              React + Compiler |                     OXC CSR |                  OXC dense |                  Full scan |
| ----------- | ----------------------------: | --------------------------: | -------------------------: | -------------------------: |
| Local 1%    |     7.981/8.800 · 7.038/8.881 |   0.062/0.075 · 0.062/0.069 |  0.056/0.075 · 0.056/0.069 |  3.575/4.794 · 3.481/3.762 |
| Local 10%   | 14.617/18.617 · 12.550/14.233 |   0.733/1.400 · 0.667/0.750 |  0.575/0.783 · 0.517/0.567 |  3.842/5.233 · 3.650/3.833 |
| Local 100%  | 75.950/83.900 · 70.800/86.500 |   5.700/7.100 · 5.300/5.900 |  5.000/7.500 · 4.800/5.400 | 5.350/15.300 · 5.100/6.100 |
| Mixed 1%    | 68.250/71.900 · 71.250/82.600 |   3.300/3.900 · 3.000/3.400 |  2.800/3.400 · 2.850/5.500 |  4.700/5.700 · 4.700/6.500 |
| Mixed 10%   | 64.300/78.500 · 62.200/81.300 |   4.200/4.600 · 4.050/4.600 |  3.400/3.900 · 3.450/3.900 |  4.700/5.200 · 4.700/5.600 |
| Mixed 100%  | 77.650/86.300 · 75.900/95.500 | 7.700/13.500 · 7.800/12.600 | 7.050/8.800 · 7.250/10.700 | 5.500/5.900 · 5.450/10.600 |
| Shared only | 34.200/43.700 · 43.650/56.500 |   2.550/2.900 · 3.050/4.200 |  2.500/2.700 · 2.800/7.800 |  4.350/4.600 · 4.850/6.100 |

The result supports a workload-dependent dispatcher. Sparse and moderate
local-only updates favor graph traversal. At local 100%, scan and graph medians
converge; scan beats both graph paths by median in the second page-load run. In
mixed 100% updates, scan has the lowest median in both runs (5.50 and 5.45 ms;
dense dispatch is 7.05 and 7.25 ms). Shared-only dense dispatch has a lower
median than scan in both runs, while its second-run p95 rises to 7.8 ms. These
24-pair p95s are high-variance estimates, and two page loads cannot establish a
stable threshold.

Setup was measured once per page load: on the first load React/CSR/dense/scan
took 102.9/19.7/12.5/9.7 ms; on the second they took 111.6/21.5/11.7/6.8 ms.
These are descriptive setup observations, not per-run replications or amortized
costs. All custom arms beat React in all 336 paired observations, but the work
is not equivalent. React runs components, checks subscriptions, and reconciles,
while custom arms directly update compiled or hand-selected bindings. Setup is
one descriptive measurement per full page load and is not charged to the timed
batches. The browser uses one Chrome 155 / MacIntel profile and machine; the two
page loads are not independent browser/device replications. The timing includes
input work, synchronous update, and host commit; it excludes paint, frame
presentation, GPU time, and user-perceived input latency. Thus the study is
evidence about the prototype's dispatch crossover, not evidence that a general
React alternative is faster or smoother.

### 5.19 Guarded full-scan control

A five-arm follow-up added a guarded scan to the shared-source browser study.
Both scan arms visit every host and derive the same three style strings. The
eager scan writes all three styles on every batch; the guarded scan reads
current style values and skips setters when the derived value is unchanged. The
run schedule includes 14 runs across two fresh page loads, seven conditions,
10,000 hosts, 24 warmup pairs, and all 120 orders of five arms once per run:
1,680 timed pairs. Every pair reports matching outputs, and every run has zero
parity failures. The raw pair data and run metadata are in
`results/browser-shared-source-five-arm-session-v1-2026-10-09.json`; Notebook
Experiment P validates coverage and writes
`results/browser-shared-source-five-arm-summary-v1-2026-10-09.json`.

Each cell below is the arithmetic mean across the two page-load run summaries,
shown as median / nearest-rank p95 milliseconds per batch. The two page-load
summaries remain separate in the notebook output and raw record; this
aggregation is descriptive, not a pooled confidence estimate.

| Scenario    | React + Compiler |     OXC CSR |   OXC dense |  Eager scan |  Guarded scan |
| ----------- | ---------------: | ----------: | ----------: | ----------: | ------------: |
| Local 1%    |      6.377/7.759 | 0.056/0.066 | 0.050/0.056 | 3.223/3.413 |   4.738/4.888 |
| Local 10%   |    12.242/16.017 | 0.583/0.675 | 0.483/0.592 | 3.479/4.783 |   5.133/5.342 |
| Local 100%  |    77.850/95.900 | 5.050/5.700 | 4.550/5.150 | 4.900/5.400 |  8.900/11.250 |
| Mixed 1%    |    67.775/84.200 | 2.950/3.450 | 2.600/3.150 | 4.350/5.100 |   7.400/8.450 |
| Mixed 10%   |    70.350/89.450 | 3.950/4.400 | 3.250/3.850 | 4.575/5.350 |   7.750/8.850 |
| Mixed 100%  |    78.700/94.250 | 6.900/8.050 | 6.225/7.400 | 5.000/6.700 | 10.000/11.050 |
| Shared only |    44.625/52.500 | 2.650/3.150 | 2.350/2.750 | 4.350/5.850 |   7.250/9.250 |

The guarded scan has a higher median than the eager scan in every condition on
both page loads. The observed difference is consistent with the cost of style
reads and string comparisons exceeding the cost of repeated same-value style
assignments in this fixture; that causal explanation is an inference because
those operations were not timed independently. This is not evidence that
conditional writes are generally slower. The guarded scan still performs a full
traversal and derives every output, and a dirty-host-only scan was not measured.
The two browser page loads come from one Chrome/MacIntel profile and device.
React also performs component execution, subscription checks, and reconciliation
that the custom paths omit, so none of these timings establishes a general
framework performance win.

### 5.20 Compiler-generated property writers

OXC now emits direct property-writer functions for the supported repeated-host
fixture. Experiment Q compares that arm to the dense plan interpreter, which
uses the same runtime storage, dirty queue, changed-source inputs, and commit
boundary but dispatches through plan metadata and projector functions. The
six-arm data has 14 runs, two page loads, seven conditions, 120 timed pairs per
run (1,680 total), 24 warmups, and zero parity failures. Orders are unique
seeded cyclic blocks with each arm in every position 20 times per run. Sparse
local samples average 16 repetitions at 1% and six at 10%; other conditions use
one. Notebook Experiment Q validates the raw pairs and recomputes the statistics
in `results/browser-shared-source-six-arm-summary-v1-2026-10-09.json`.

| Scenario    | React + Compiler |     OXC CSR |   OXC dense | OXC generated writers |  Eager scan |  Guarded scan | Writer reduction vs dense median |
| ----------- | ---------------: | ----------: | ----------: | --------------------: | ----------: | ------------: | -------------------------------: |
| Local 1%    |      6.927/9.134 | 0.056/0.066 | 0.052/0.059 |           0.044/0.050 | 3.452/3.550 |   4.725/4.859 |                            15.2% |
| Local 10%   |    13.950/18.858 | 0.592/0.742 | 0.508/0.583 |           0.417/0.508 | 3.550/5.567 |   5.075/5.958 |                            18.0% |
| Local 100%  |   91.025/107.350 | 4.850/5.550 | 4.350/5.100 |           3.500/4.050 | 4.650/5.400 |   8.500/9.850 |                            19.5% |
| Mixed 1%    |    80.950/99.150 | 2.750/3.250 | 2.350/2.850 |           1.600/2.050 | 4.300/5.850 |   6.950/8.950 |                            31.9% |
| Mixed 10%   |    81.575/96.200 | 3.750/4.250 | 3.150/3.700 |           2.150/2.600 | 4.350/4.950 |   7.425/8.350 |                            31.7% |
| Mixed 100%  |   96.800/131.000 | 7.000/8.000 | 6.350/7.450 |           4.675/5.400 | 5.000/5.850 | 10.100/11.700 |                            26.4% |
| Shared only |    53.050/67.900 | 2.600/3.000 | 2.250/2.750 |           1.475/1.850 | 4.200/5.450 |   7.100/8.750 |                            34.4% |

Each timing cell is the arithmetic mean of the two run medians / p95s; these are
descriptive summaries, not pooled confidence estimates. In the
generated-versus-dense comparison, the generated per-run median is lower in all
14 runs; it wins 111–120 of the 120 paired observations per run. Condition-level
median reduction ranges from 15.2% to 34.4%. This supports the narrower claim
that direct writers reduce dispatch overhead in this plan. It does not establish
that compiler emission generally makes apps faster. Setup is separately
measured; across the 14 run mounts, mean setup was 6.45 ms for generated writers
and 11.15 ms for dense interpretation, but the harness is small and two
page-load IDs on one Chrome/MacIntel profile do not establish stable setup
savings. React continues to execute components, subscription checks, and
reconciliation; generated arms directly update bindings. All browser results
exclude paint and presented frames.

### 5.21 JSX-authored React baseline replication

A separate follow-up rebuilds the React arm from JSX in the TSX source (rather
than `React.createElement`) while retaining React Compiler 1.0.0, one component
per entity, local/shared `useSyncExternalStore` subscriptions, and `flushSync`.
It keeps the same six arms and seven conditions as Experiment Q. Two fresh page
loads contribute 14 runs and 1,680 paired samples. Each run has 24 warmups, 120
unique seeded cyclic six-arm orders with each arm appearing 20 times in every
position, and zero parity failures. Local-only 1% and 10% scenarios average 16
and six repeats per pair; other scenarios use one. Notebook Experiment R
recomputes the statistics from
`results/browser-shared-source-six-arm-jsx-react-session-v1-2026-10-09.json` and
writes
`results/browser-shared-source-six-arm-jsx-react-summary-v1-2026-10-09.json`.

| Scenario    | React JSX median/p95 ms | Generated writers median/p95 ms | Generated wins / 240 pairs | Median ratio |
| ----------- | ----------------------: | ------------------------------: | -------------------------: | -----------: |
| Local 1%    |             7.266/9.119 |                     0.044/0.053 |                        240 |       166.1× |
| Local 10%   |           15.125/20.758 |                     0.450/0.758 |                        240 |        33.6× |
| Local 100%  |          94.225/123.850 |                     3.850/5.100 |                        240 |        24.5× |
| Mixed 1%    |          77.850/101.150 |                     1.750/2.250 |                        240 |        44.5× |
| Mixed 10%   |          83.375/120.950 |                     2.450/3.250 |                        240 |        34.0× |
| Mixed 100%  |          94.050/121.700 |                     5.000/6.800 |                        240 |        18.8× |
| Shared only |           52.075/61.900 |                     1.550/2.100 |                        240 |        33.6× |

Each cell averages two page-load run medians or p95s. The generated writer path
has a lower observed time in every paired sample. This does not establish a
general React replacement speedup: React executes a component per entity,
evaluates its external-store subscriptions, and reconciles; generated writers
directly update precompiled host bindings. The experiment measures the
implementation choices and extra framework work in this fixture, not equivalent
framework semantics. It excludes paint, covers one Chrome/MacIntel profile and
device, and has only two page loads. The JSX authoring change makes the baseline
more representative, but it does not repair the internal-work asymmetry.

The source review also clarifies where a smaller kernel might come from. React's
work loop coordinates lanes and priorities, interruptible render work,
suspension/retry, hydration, commits, and effects; its size reflects product
scope as well as implementation choices. Preact's compact core is a useful
reference for keeping the synchronous VDOM kernel small, but child matching,
keys, movement, hydration, hooks, and compatibility still bring edge cases.
Neither source size nor this timing study measures maintainability. The current
maintainability claim is a hypothesis: explicit ownership, dependency, and async
graphs could make invalidation and extension easier to inspect, provided dynamic
structure, failure handling, and ecosystem adapters remain explicit rather than
recreating hidden complexity in a new runtime. The next study should compare
change-localized component work with best-practice React selectors, then measure
compiler/runtime code complexity and task-based comprehension alongside broader
correctness cases.

### 5.22 Multi-trait scale and density sweep

The multi-source browser comparison now uses JSX-authored React and covers
1,000, 5,000, and 10,000 entities at 1%, 10%, and 100% changed. Each changed
entity updates two source slots and three identical style properties in React,
OXC CSR, and OXC dense plans. The 18 runs span two page loads, with one run for
each of nine size/density conditions on each load. Every run includes 24 warmups
and 48 timed pairs. The six possible three-arm orders appear eight times each,
so each arm occurs 16 times in each position. Sparse runs repeat each order 32
times, 10% runs eight times, and full-density runs once. Each pair checks
changed-ID parity; a full-host parity check follows the final timed pair. All
864 pairs and 18 final full-host checks pass. Notebook Experiment S validates
`results/browser-multi-source-jsx-scale-session-v1-2026-10-09.json` and writes
`results/browser-multi-source-jsx-scale-summary-v1-2026-10-09.json`.

| Entities | Changed | React median/p95 ms | OXC CSR median/p95 ms | OXC dense median/p95 ms | Dense/React ratio |
| -------: | ------: | ------------------: | --------------------: | ----------------------: | ----------------: |
|    1,000 |      1% |         0.540/0.648 |           0.006/0.009 |             0.006/0.008 |             86.4× |
|    1,000 |     10% |         3.625/7.681 |           0.266/0.631 |             0.169/0.550 |             21.5× |
|    1,000 |    100% |       24.450/43.400 |           3.325/6.700 |             2.000/4.000 |             12.2× |
|    5,000 |      1% |         2.984/3.667 |           0.034/0.039 |             0.023/0.027 |            127.3× |
|    5,000 |     10% |         5.228/6.694 |           0.388/0.531 |             0.263/0.306 |             19.9× |
|    5,000 |    100% |       30.625/35.700 |           3.650/4.750 |             2.400/2.700 |             12.8× |
|   10,000 |      1% |         6.506/7.994 |           0.073/0.083 |             0.050/0.059 |            130.1× |
|   10,000 |     10% |       12.478/14.456 |           0.866/1.006 |             0.547/0.625 |             22.8× |
|   10,000 |    100% |       65.375/79.100 |          8.125/12.050 |             5.075/6.400 |             12.9× |

Table values are the arithmetic means of the two independently seeded run
medians/p95s; medians use the midpoint for the 48-sample even-sized set and p95
uses nearest rank. Dense dispatch beats React in all 864 pairs, and CSR does as
well. Ratios are highest at 1% density and narrow at 100%, consistent with graph
dispatch reducing unrelated runtime work while both paths must apply all
required host updates. The experiment remains a narrow repeated-host scene on
one Chrome/MacIntel profile and device. React runs component functions, updates
hook subscriptions, and reconciles; graph plans dispatch compiled bindings
directly. It excludes paint and does not prove comparable semantics or a general
framework-wide advantage. The lowest medians approach timer resolution, so their
ratios should be read as direction and scale signals, not precise speedup
factors.

### 5.23 Retained VDOM dispatch modes and OXC graph integration

Experiment V extends the retained keyed VDOM browser fixture with three VDOM
dispatch modes over 10,000 entities and 1,000 changed entities per batch. The
existing OXC `multi_trait_scene.tsx` fixture emits two source slots and three
binding IDs: `node.x` routes to `left` and `transform`; `node.y` routes to
`opacity`. `bindCompiled` attaches those IDs and slots to the JSX values. At
commit, `VDOMSnapshotRoot` validates each edge and resolves the generated CSR
adjacency to per-source writer arrays; updates iterate those cached lists and
use field-level style setters. The two controls runtime-discover either whole
style-object bindings or individual direct-field writers.

Each page load ran 12 warmup pairs and 36 timed pairs with six repeats per pair,
balanced order, React 19.3 + React Compiler, and full style parity. Three page
loads were collected per mode on Chrome 155/macOS Intel. Modes ran in blocks, so
small between-mode differences are provisional.

| VDOM path                        | Median page median ms | Median page p95 ms | Median mount/setup ms | Parity |
| -------------------------------- | --------------------: | -----------------: | --------------------: | -----: |
| Runtime-discovered style object  |                 1.900 |              2.183 |                  33.8 |    3/3 |
| Runtime-discovered direct fields |                 0.883 |              1.167 |                  36.2 |    3/3 |
| OXC CSR cached to direct fields  |                 0.967 |              1.217 |                  47.2 |    3/3 |

The main observed reduction comes from updating each declared style field
directly instead of allocating/materializing a whole style object and diffing
it. After mount-time resolution, the CSR path is close to the runtime-discovered
direct-field index in this two-source fixture, while adding setup cost. This
supports retaining the compiled graph as source-of-truth metadata and resolving
it once to compact per-source writer arrays at mount. The benchmark excludes
structural changes, lifecycle, async scheduling, paint, a second device, and
shared-source expansion. Full page summary and seeds are in
[`browser-vdom-dispatch-comparison-v1-2026-10-09.json`](./results/browser-vdom-dispatch-comparison-v1-2026-10-09.json).

### 5.24 Gate A state-derived keyed-list fixture and protocol corrections

The new fixture at `keyed-filter-benchmark.html` compares React 19.3 + React
Compiler with `VDOMSnapshotRoot` on the same state-derived filtered list. Each
update filters the same stable row array, constructs declarative keyed children,
applies inserts/removals/moves, and synchronously commits a DOM list. The query
sequence has seven transitions, including alternating even/odd membership and
restoration of the full list. The runtime dependency is currently handwritten;
this measures retained keyed reconciliation and does not yet validate the
OXC-emitted dependency scheduler.

The first draft had two validity bugs. Its key-retention metric compared nodes
only before and after the whole query sequence, which restored the starting list
and concealed whether identities survived individual transitions. It now
measures retained node identity at every transition, outside timing. Its parity
check also compared only the final all-rows list. The corrected path hashes
count, ID, and text for both lists after every transition, outside timing, and
rejects a mismatch. Arm order is generated as balanced 12/12 blocks among 24
timed pairs. Timing itself is the per-sequence mean across the seven update
calls; p95 is the p95 across 24 paired sequence means, not the p95 of individual
transitions. Mount is now measured separately as one descriptive sample per
arm/page load, including root creation, element construction, and initial
keyed-list commit but excluding the shared row-data creation and unmount. The v4
export includes prior corrected v3 records from browser storage while tagging
their source store, so partial isolated samples are recoverable even though they
lack the new mount field.

An exploratory three-page-load sweep at 1k, 5k, and 10k rows used the same
increasing size order within each page. All outputs and per-transition identity
checks passed, and the median runtime time was lower in all nine run medians.
However, page-load/session effects are shared across the three sizes and are
confounded with this fixed size order; these records are retained in
[`browser-keyed-filter-balanced-replications-v1-2026-10-09.json`](./results/browser-keyed-filter-balanced-replications-v1-2026-10-09.json)
for debugging only and are not the Gate A scale result. The notebook derives
[`browser-keyed-filter-exploratory-summary-v1.json`](./results/browser-keyed-filter-exploratory-summary-v1.json)
and an SVG visualization, both explicitly labeled exploratory. Early p95s also
contain large outliers. The initial correction plan was to report three
independent page IDs per size; that target is superseded by the six-page,
two-session protocol in §5.25.

### 5.25 Gate A protocol amendment: replication unit and compiler boundary

This amendment supersedes the three-page-load target in §5.24. The existing 9
records are exploratory: they share 3 page loads, each of which ran all 3 sizes
in ascending order. Do not count them toward the corrected sample because size
order and page effects are confounded. Collect six one-size page loads per size
(1k, 5k, and 10k), split across two browser sessions with three balanced blocks
per session (18 page loads total). Each block visits each row count once; rotate
the order across blocks (`1k → 5k → 10k`, `5k → 10k → 1k`, `10k → 1k → 5k`) and
record the order, session ID, page-load ID, and seed. Each page load runs one
size only. The benchmark accepts `count`, `seed`, `session`, and `autorun=1`
query parameters, validates them in a pure helper, and records the session and
page-load IDs in each result. `deno task gate-a:urls` generates the complete
deterministic page sequence. The arms remain paired within each page, with
balanced 12/12 React-first/runtime-first timed sequences.

The **page load is the replication unit**. The 24 paired sequence means within
one page estimate that page's arm difference; they are not 24 independent
replications. Report each page's React and runtime median, page p95, median
paired ratio, and mount sample. Summarize the six page-level ratios by median
and range; include a page-level bootstrap interval as descriptive uncertainty,
and do not claim general statistical significance from six pages. Keep browser
session as a grouping variable when inspecting variation. Reject a page if any
intermediate list output diverges or key retention fails. Do not blend the
earlier ascending-size records into the new estimate.

At the time of this amendment, the Gate A browser fixture still used a
handwritten query-to-list dependency. The next compiler gate must represent the
query source, derived list, and affected keyed region, then compare generated
and handwritten paths plus optimized React on the same workload. Include
compile/setup and mount costs, dynamic topology, allocations, and retained
memory before making a compiler-level performance claim. The compiler and
runtime slice now exists; see §5.26. Its timing study has not yet been
collected.

### 5.26 OXC-derived keyed region and three-arm Gate A harness

OXC now recognizes the narrow TSX form
`const visible = rows.filter((row) => predicate); visible.map((row) => <li key={row.id} />)`
and emits a keyed-region plan. For `keyed_filter_region.tsx`, the IR identifies
`rows` as the collection source, `query` as the predicate dependency, `visible`
as the derived collection, `row.id` as stable identity, and the enclosing
`ul`/repeated `li` hosts as region metadata. Its CSR dependency table maps both
source slots to region 0. This is a constrained AST/semantic frontend slice, not
general JSX or arbitrary dataflow analysis.

`DerivedRegionDispatcher` consumes the emitted CSR graph. It accumulates
invalidated region IDs in a reusable list, deduplicates shared region fan-in,
and invokes each affected region once at flush. The browser Gate A page now
compares three arms on identical rows, queries, and filter predicate: React
19.3 + React Compiler; retained keyed VDOM with direct handwritten invalidation;
and retained keyed VDOM with OXC-generated graph dispatch. All arms compare each
intermediate list outside timing, and the six arm orders rotate uniformly.
Dispatcher construction is included in the compiled arm's separate mount sample;
source compilation at build time is not included. The existing nine v4 records
remain exploratory history and are not compatible with the schema-v3 v5 records.

The new tests verify that query and rows edges deduplicate to one region per
batch, multiple regions preserve first-invalidation order, and malformed graphs
or source slots are rejected. The compiler check verifies the checked-in
generated module matches a fresh OXC run and asserts the emitted source slots,
row key, and host metadata. `deno task test`, `deno task check`,
`deno task compiler:region:check`, and the Vite production build pass. This
validates one compiler-to-runtime path and its output shape; no browser timing
result has been collected for this three-arm version yet. Do not infer a
performance win from the current implementation or from the older
handwritten-dependency records.

### 5.27 Two-region dependency selectivity and full-recompute oracle

The one-region fixture in §5.26 could test compiler/runtime wiring, but it could
not show the main proposed DAG advantage: avoiding unrelated work. The OXC
frontend now also accepts two named filtered collections rendered as separate
keyed regions. `keyed_filter_regions.tsx` emits schema v2 with three source
slots and two region IDs: `queryA → 0`, `queryB → 1`, and shared `rows → {0,1}`.
Both repeated items use the stable `row.id` key and each region has a distinct
`section` boundary.

The current benchmark page now compares three paths on that workload. React
19.3 + React Compiler uses memoized region components with stable shared rows,
so changing one query should leave the other child region untouched. The
handwritten VDOM control recomputes both lists and commits the complete tree.
The compiled VDOM arm dispatches the changed query through the OXC CSR table and
commits only the affected region. Each sequence changes one query at a time,
alternating between the two regions. The eight updates include both selective
group filters and broader score filters. All intermediate output digests and
retained keyed-node identities are checked; compiled mount timing includes
dispatcher and host-shell setup. OXC build time, paint, and presentation remain
outside the browser timing.

### 5.28 Two-region Gate A exploratory browser smoke

The new schema-v4 page ran once at each row count in one Chrome profile, with
one `pageLoadId` per size, six warmup pairs, 24 timed pairs, and eight query
transitions per pair. It used seeds 620001, 620002, and 620003. The browser was
Chrome 155 on macOS Intel (`hardwareConcurrency: 10`, DPR 2). Every intermediate
digest matched across all three arms, final output parity passed, and the
measured keyed-node identities were retained. The exact samples are in
[`browser-keyed-regions-exploratory-smoke-v1.json`](./results/browser-keyed-regions-exploratory-smoke-v1.json);
the Deno Jupyter notebook reads that file and draws an inline SVG.

|   Rows | React median / p95 | Whole-tree VDOM median / p95 | OXC graph VDOM median / p95 | Mount React / VDOM / graph |
| -----: | -----------------: | ---------------------------: | --------------------------: | -------------------------: |
|  1,000 |     2.43 / 2.99 ms |               0.71 / 1.04 ms |              0.54 / 0.65 ms |        14.7 / 5.3 / 2.7 ms |
|  5,000 |   12.58 / 19.30 ms |               3.75 / 4.35 ms |              2.67 / 3.04 ms |      85.8 / 20.8 / 15.1 ms |
| 10,000 |   28.39 / 39.48 ms |               8.14 / 9.01 ms |              6.01 / 6.92 ms |     164.6 / 27.9 / 33.6 ms |

The graph beat React in all 24 within-page pairs at every size and beat
full-tree derivation in 23/24, 24/24, and 24/24 pairs respectively. Those pairs
are repeated measurements within one page, not independent replications. The
graph mount sample exceeds whole-tree VDOM by 5.7 ms at 10k; its apparent update
advantage does not by itself establish a lower end-to-end cost for short-lived
trees. Paint/presentation, compiler build time, setup repetition, memory,
dynamic list topology, and independent browser profiles are not covered. Treat
this as a working smoke signal only. It shows the generated-region path remains
correct and has a plausible update advantage on this selective workload; the
preregistered 18-page study is still required to estimate page-level variation
and inform the design decision.

### 5.29 Gate A balanced two-region browser replication

The preregistered one-size-per-page sequence was completed with 18 page loads:
three at each of 1k, 5k, and 10k rows in each of two browser sessions. Seeds
610001–610009 were collected in Chrome 155; seeds 610010–610018 were collected
in the Codex in-app browser using Chrome 154. Both surfaces reported macOS
Intel, 10 logical processors, and DPR 2. Each page ran six warmups and 24 timed
paired sequences, rotating the three arms. The 18 records contain 432 timed
pairs. Every intermediate output, final output, and keyed-node-retention check
passed. One page load per session/size is the replication unit; timed pairs are
nested within it.

The table reports the median of three page-level medians within each session and
size. It does not pool the two browser surfaces.

| Session / browser surface  |   Rows | React median | Whole-tree VDOM median | OXC graph VDOM median | Graph / React |
| -------------------------- | -----: | -----------: | ---------------------: | --------------------: | ------------: |
| Chrome 155                 |  1,000 |      2.73 ms |                0.71 ms |               0.51 ms |         0.19× |
| Chrome 155                 |  5,000 |     14.26 ms |                4.51 ms |               3.19 ms |         0.21× |
| Chrome 155                 | 10,000 |     31.03 ms |                9.79 ms |               6.66 ms |         0.21× |
| In-app browser, Chrome 154 |  1,000 |      0.65 ms |                0.76 ms |               0.61 ms |         1.00× |
| In-app browser, Chrome 154 |  5,000 |      3.78 ms |                4.79 ms |               3.69 ms |         1.03× |
| In-app browser, Chrome 154 | 10,000 |      7.40 ms |               10.25 ms |               7.75 ms |         1.05× |

OXC graph dispatch is faster than whole-tree derivation in every session/size
cell. Its comparison with React is session-dependent: graph medians are 4.7–5.3×
lower in Chrome, while graph is roughly tied at 1k and slightly slower at 5k and
10k in the in-app browser. React's page-level median shifts by about 4× between
sessions, whereas the two VDOM paths are much closer. Session is confounded with
browser surface and major browser version, so the React difference cannot be
attributed to the framework or graph. Mount time is retained as a separate
measure in each page record; paint/presentation and build-time compilation are
excluded. The validated analysis is regenerated with
`deno task gate-a:summarize` and saved in
[`browser-keyed-regions-gate-a-summary-v1.json`](./results/browser-keyed-regions-gate-a-summary-v1.json).
Raw page records are in
[`browser-keyed-regions-gate-a-session-1.json`](./results/browser-keyed-regions-gate-a-session-1.json)
and
[`browser-keyed-regions-gate-a-session-2.json`](./results/browser-keyed-regions-gate-a-session-2.json).
This gate supports selective graph dispatch over whole-tree VDOM on this
workload; it does not support a general claim of React superiority. The next
measurement must hold browser surface/version constant across sessions and
repeat on a second physical device.

Tail outlier: in-app browser seed 610018 at 5k rows has a React page-level p95
of 1,301.8 ms versus a 6.2 ms median. This value is retained because no
exclusion rule was preregistered; its cause is unknown. Do not use the
session-level median-of-p95 summary as evidence of acceptable tails.

### 5.30 Gate A same-surface Chrome repeat

The cross-surface gap in §5.29 made it unclear whether the Chrome result
reflected a stable browser/runtime combination or page-load noise. I collected a
supplemental three-block schedule in Chrome 155 using the same extension/profile
and machine as session 1. The schedule was balanced (`1k → 5k → 10k`,
`5k → 10k → 1k`, `10k → 1k → 5k`) with seeds 610019–610027, one size per page,
six warmups, and 24 timed pairs per page. All nine page loads passed every
intermediate output check, final parity, and keyed-node identity check (216
additional timed pairs). The user agent, hardware concurrency (10), and DPR (2)
exactly match session 1. This is a repeat page-load block in the same profile,
not an independent browser-profile or device replication.

|   Rows | React median / median page p95 | Whole-tree VDOM median / median page p95 | OXC graph VDOM median / median page p95 | Mount React / whole / graph | Graph / React |
| -----: | -----------------------------: | ---------------------------------------: | --------------------------------------: | --------------------------: | ------------: |
|  1,000 |                 2.76 / 3.26 ms |                           0.75 / 1.11 ms |                          0.54 / 0.66 ms |         29.0 / 5.9 / 3.2 ms |        0.205× |
|  5,000 |               14.15 / 17.01 ms |                           4.46 / 4.96 ms |                          3.23 / 3.71 ms |       55.7 / 19.6 / 15.0 ms |        0.226× |
| 10,000 |               30.16 / 39.05 ms |                          9.62 / 10.82 ms |                          6.85 / 8.40 ms |      100.2 / 34.4 / 35.5 ms |        0.220× |

Median-of-page-median results closely match the first Chrome collection at all
three sizes. The graph is about 4.4–4.9× faster than React in this
update-plus-commit interval and faster than whole-tree derivation; the median
mount sample at 10k is 1.1 ms above whole-tree VDOM. The comparison with the
Chrome 154 in-app data remains markedly different, especially in React's update
timings. The repeat therefore weakens the hypothesis that random page-load
variation alone explains the Chrome result, but cannot identify whether browser
version, automation surface, or another execution-context difference caused the
cross-surface gap. Do not pool across surfaces. The raw records are
[`browser-keyed-regions-gate-a-chrome-repeat.json`](./results/browser-keyed-regions-gate-a-chrome-repeat.json);
`deno task gate-a:repeat-urls` regenerates its schedule, and
`deno task gate-a:summarize` includes it in the validated three-collection
summary.

### 5.31 Gate B keyed-host contract tests

Before timing broader structural churn, I added first-party contract coverage
for the retained VDOM's keyed host behavior: reordering preserves each key's
node identity without prop/text writes; removal detaches a node and later
reinsertion creates a new host node; changing an element's tag under a stable
key replaces the incompatible host node; root disposal detaches the top-level
host child; and duplicate next-sibling keys fail without mutating the previously
committed sibling list or advancing the version. The focused set passed all four
tests; the full Deno suite passed 13/13 and the project type checks passed.

This closes only a correctness slice. It does not exercise browser lifecycle
effects, event listener replacement, memory retention, graph-edge churn, or
performance under repeated insert/remove/reorder. Those remain Gate B work. The
test source is
[`src/vdom_snapshot_runtime_test.ts`](./src/vdom_snapshot_runtime_test.ts).

### 5.32 React keyed-structure differential

I added a deterministic browser fixture that runs the same keyed-list sequence
through React DOM 19.3.0 and the retained VDOM: initial mount, one prop/text
update with reorder, removal, and reinsertion of the removed key. The fixture
compares serialized DOM after every phase, checks that retained keys preserve
node identity in both renderers, verifies removed nodes detach, and verifies
reinsertion creates fresh nodes. One Chrome 155 run passed all four phases. The
browser metadata and complete phase output are saved in
[`browser-keyed-structural-differential-v1.json`](./results/browser-keyed-structural-differential-v1.json);
the reproducible fixture is
[`keyed-structural-differential.html`](./keyed-structural-differential.html).

This is an initial correctness result, not a performance result or an
independent-browser replication. It does not test hook state, events, lifecycle
effects, randomized churn, or failure recovery. The seeded structural follow-up
is recorded in §5.34; the native-event follow-up is in §5.33.

### 5.33 Native event to source update differential

A second deterministic browser fixture wires a native button click to the
retained VDOM's `ScalarSource`, then follows its source-to-prop/style index to
update a count attribute and meter width. The React arm uses
`useSyncExternalStore` on an external store and declaratively renders the same
outputs. All three click phases matched (`1 → 2px`, `2 → 3px`, `3 → 4px`) in
Chrome 155. The fixture then removes both buttons and clicks retained references
to them; neither path updates its source (`removedButtonListenerCleanup: true`).
The fixture and browser metadata are saved in
[`browser-event-source-differential-v1.json`](./results/browser-event-source-differential-v1.json);
run it at [`event-source-differential.html`](./event-source-differential.html).

This establishes that one native event can update the current source-bound host
props without rebuilding the VDOM tree, with output parity against a React
external-store subscription, and that a removed VDOM button no longer retains an
active callback. It does not establish a timing advantage: the React path
re-renders its component while the VDOM path directly writes three bound host
fields. It does not test listener replacement, hook ownership, or lifecycle
effects. Those remain correctness work before a fair event-driven performance
study.

### 5.34 Seeded structural differential

I extended the keyed browser fixture with a deterministic 128-operation trace
shared by React DOM 19.3.0 and the retained VDOM. Mulberry32 seed `1592594996`
chooses weighted insert/update/reorder/remove operations over a reusable 16-key
pool, capped at 12 rows. The resulting trace contained 45 inserts, 27 prop
updates, 18 reorders, and 38 removals; row count ranged from 0 to 12. At every
step, serialized DOM matched. Retained nodes preserved identity, removed nodes
detached, and a key that reappeared got a fresh host node. All parity and
identity checks passed in Chrome 155.

The seed and generator parameters are stored in
[`browser-keyed-structural-differential-v1.json`](./results/browser-keyed-structural-differential-v1.json),
and the executable trace is in
[`src/browser/keyed_structural_differential.ts`](./src/browser/keyed_structural_differential.ts).
This remains one browser/profile correctness run with no timings; hook state,
lifecycle, graph-edge churn, and lists above 12 remain untested.

### 5.35 Owner-addressed state substrate

I added `OwnerStateWorld` as a small JavaScript prototype for the hook-identity
question. A state cell is addressed by `(owner entity, explicit state-site ID)`,
while a component owner is interned by its parent, component site, and optional
key. The four focused tests cover conditional site activation without shifting a
later state site, keyed owner identity through reorder and fresh identity after
destruction, `Object.is`/functional updates/change coalescing, and recursive
owner destruction with stale-setter rejection. `deno task test` passes all 18
contract tests and `deno task check` passes with the new module included.

This supports the feasibility of the storage primitive only. It is not a
React-compatible hook API, has no renderer/compiler integration, does not
establish lifecycle/effect semantics, and is not performance evidence. The next
test is to emit stable component and state-site IDs from the TSX compiler,
resolve owners during component execution, and drive a conditional keyed
component through mount, update, reorder, and removal. A browser differential
should assert the declared state/lifetime contract; benchmark only after those
semantics pass.

### 5.36 VDOM-backed owner/site component execution

`ComponentStateRoot` now connects `OwnerStateWorld` to function-component
execution and the retained VDOM. `defineComponent(siteId, render)` supplies the
stable component identity a compiler pass would emit;
`useStateAt(siteId, initial)` resolves state against the active entity. A root
expands the component tree, tracks the owners present in each successful
candidate, commits the expanded tree through `VDOMSnapshotRoot`, then destroys
owners that disappeared. State writes schedule one coalesced microtask commit by
default; `flush()` remains available for deterministic tests. The current
scheduler re-executes the entire component tree and does not yet dispatch
through the dependency graph. Failed candidate rendering cleans newly allocated
candidate owners and leaves the previous host output committed.

Four new contracts verify conditional state-site skip/resume through component
calls, keyed component state and host identity through
reorder/removal/reinsertion, failed-candidate cleanup, and automatic coalescing
of repeated state writes into one commit. Together with the four store tests,
Gate B passes 22 Deno contracts. Runtime tests and the notebook now consume
OXC-emitted component and state-site IDs; the notebook records its checks in
`component-state-runtime-v1.json`. The fixture manually wires plan IDs into
`defineComponent` and `useStateAt`; the compiler does not yet rewrite source
callsites. The runtime still re-executes the whole component tree, has not been
compared against React for the same stateful component behavior, and has no
timing result. The next gate is to lower the metadata into executable TSX,
exercise native event updates and mount/unmount effects, and add a
same-interaction React differential before any performance claim.

### 5.37 OXC component and state-site metadata

The OXC spike now has a `--component-state-sites` mode. For named PascalCase
function components, it resolves imported `useState` references and emits a
stable component ID (`source path + component name`) plus ordered lexical
state-site IDs (`component ID + ordinal`) and declaration/call source spans. The
fixture covers a conditional state call followed by a later state call, a
counter, and a keyed row; a checker recompiles the fixture and compares the
emitted TypeScript module with the checked-in generated module. The
component-state Deno tests and notebook wire those generated IDs into
`ComponentStateRoot`, so runtime behavior is exercised with compiler-produced
identities.

This result established deterministic metadata only, not a performance gain or
broad compiler support. The transform support and its current limitations are
recorded in §5.38.

### 5.38 Executable TSX lowering for owner and state sites

OXC now lowers the supported fixture into executable TSX: named component
declarations are wrapped with `defineComponent`, imported `useState` calls
become `useStateAt` calls with lexical IDs, and the source import is replaced by
runtime imports. The generated module includes explicit JSX factory pragmas so
the same artifact executes under the browser type-check configuration and the
Deno Jupyter kernel. The fresh-output checker compares both metadata and
transformed TSX byte-for-byte against checked-in generated files.

The four VDOM-backed component contracts now import and execute the generated
components, rather than manually reconstructing them from the metadata plan.
They verify conditional site persistence, native click updates, keyed state/host
identity through reorder and removal, fresh state after reinsertion,
failed-candidate behavior, and coalesced scheduled writes.
`deno task compiler:state:check`, `deno task test` (22/22), `deno task check`,
and the full notebook (42 Deno cells) pass. Notebook checks are saved in
[`component-state-runtime-v1.json`](./results/component-state-runtime-v1.json).

This is a deliberately narrow source transform, not arbitrary TSX support: named
synchronous function declarations with one sole unaliased named `useState`
import are the supported shape. The compiler checker now verifies that aliased
imports and arrow components fail with explicit diagnostics. Custom hooks,
general import rewriting, source maps, type-aware diagnostics, lifecycle
effects, and control-flow validation remain unimplemented. The runtime still
re-executes the whole component tree after state writes. The notebook uses an
in-memory host and makes no performance claim. The first browser state/event and
effect-lifecycle differential now passes on one Chrome 155 profile; it has no
timings. Next test value-dependent reactions as graph tasks, then measure
lifecycle churn and allocation.

### 5.39 Browser differential for generated component state

A browser fixture now imports the OXC-generated `Counter` and `KeyedRow`
components and compares them with equivalent React 19.3.0 components through
real DOM events. Three counter clicks produce matching text and attributes.
Toggling row `b`, reordering `[a,b,c]` to `[c,a,b]`, removing it, and
reinserting it preserve state and host identity while mounted and create fresh
state/identity after removal. Clicking the detached generated-runtime row is
inert. The one Chrome 155 run passed all four checks; its browser metadata is
saved in
[`browser-component-state-differential-v1.json`](./results/browser-component-state-differential-v1.json),
and the reproducible fixture is
[`component-state-differential.html`](./component-state-differential.html).

This is correctness evidence only: one device/profile, one browser run, two
simple component types, and no timing. It does not compare conditional state
sites with React, because those semantics intentionally diverge, and it does not
test effects or lifecycle cleanup. Next add explicit mount/cleanup behavior for
generated component effect sites, then repeat stateful keyed churn across
browser profiles before timing.

### 5.40 Owner/site lifecycle effect contract

`ComponentStateRoot` now exposes the manual prototype
`useEffectAt(siteId, setup)`. During a successful candidate render, components
register effect sites under `(owner, site ID)`. The host tree commits first; new
active sites then run setup. Existing active sites do not rerun when props or
state change. A site skipped by a committed render runs its cleanup;
reactivation runs setup again. Removing an owner or disposing the root cleans up
each active site once. Failed candidate renders preserve the prior committed
effect lifetimes. Cleanup and setup exceptions are aggregated after the host
commit so one throwing callback does not prevent other lifecycle callbacks from
reconciling.

A focused Deno contract and the notebook each verify mount-only behavior across
state/prop updates, failed-candidate isolation, conditional
deactivation/reactivation, and root disposal. `deno task test` passes 23/23
contracts; the notebook executes 43 Deno cells, and its output is saved in
[`component-lifecycle-runtime-v1.json`](./results/component-lifecycle-runtime-v1.json).
This tests the runtime policy on an in-memory host. It does not yet compile
React `useEffect` calls, compare effect semantics against React, run lifecycle
callbacks in a browser, or measure scheduling/presentation timing. Next lower
the effect-site syntax through OXC and verify actual DOM listener/subscription
cleanup on owner removal.

### 5.41 OXC effect-site lowering and browser lifecycle differential

The OXC component transform now accepts one exclusive named import containing
`useState`, `useEffect`, or both. It emits ordered lexical effect IDs, rewrites
one-callback `useEffect` calls to `useEffectAt`, and rejects dependency-array
forms because this prototype defines effects as activation/deactivation
lifecycle work. The generated `EffectProbe` fixture is consumed by the runtime
tests, notebook, and browser fixture; the compiler checker validates effect
ID/arity/spans and confirms the unsupported dependency-array fixture fails
clearly.

The browser differential compares that generated effect site with a React child
using `useEffect(..., [])`: both produce the same setup/cleanup sequence across
active mount, prop and state updates, conditional deactivation, reactivation,
and root unmount/disposal. The same one-run Chrome 155 check also covers
generated counter clicks, keyed state/identity, and detached event cleanup. All
seven checks pass; observations are in
[`browser-component-state-differential-v1.json`](./results/browser-component-state-differential-v1.json).
The notebook lifecycle record now uses generated TSX and passes its four
lifecycle assertions.

This is still one browser profile and a small fixture. It does not validate
general React effect dependency semantics, Strict Mode, async cleanup,
exceptions in lifecycle callbacks, or timing. The design intentionally moves
value-dependent reactions into graph tasks; those tasks and their ownership
model remain to be specified and measured. Next test subscriptions that read
changing values as graph tasks, then profile lifecycle churn and allocations
against an equivalent React interaction.

## 6. Design implications

The prototype should keep distinct costs and identities explicit. The compiler
now emits item-local and shared-source dependency ranges, and the JavaScript
runtime has parity coverage for shared fan-out. The browser shared-source
studies now measure sparse local, all-host shared, and mixed batches through six
paths, including a guarded full scan and a compiler-generated direct-writer path
compared with the dense interpreter. Guarding unchanged setters loses to eager
writes in this fixture, so conditional writes should not be assumed to be a free
optimization. The JSX-authored baseline replication is now recorded separately;
it still has unequal internal framework work and a single device profile. The
next browser experiment should compare equivalent, change-localized component
work and independent environments, then measure presented frames and setup/churn
for interpreted and generated paths. The existing kernel experiments establish
mechanism tradeoffs but do not predict paint cost:

1. The compiler frontend parses TSX and resolves component and source
   identities; the official TypeScript compiler supplies type checking and
   source diagnostics.
2. Lowering creates a semantic IR with separate ownership/layout, reactive
   dependency, and async task graphs. JSX is not merely rewritten into a smaller
   factory call: the compiler must identify static structure, dynamic branches,
   keyed collections, effects, source reads, and host outputs.
3. Optimization validates DAG regions, propagates dependency sets, coalesces
   equivalent reads, specializes host-property writes, computes update order,
   and emits dispatch metadata. Dynamic topology remains represented by explicit
   runtime operations.
4. Code generation emits a compact template/host plan, graph tables or
   specialized update functions, lifecycle operations, and diagnostics/source
   maps. The runtime should instantiate and execute this plan rather than
   rediscover its binding graph by walking JSX objects.
5. A change journal records trait writes, source versions, and dirty binding
   ranges. A dispatcher selects per-source queues, scannable dirty buckets, or a
   full pass from compiled topology, dirty coverage, and locality metadata.
6. A host adapter accepts declarative batched writes and owns DOM, Three, or
   other target commit rules. A separate task graph represents async
   dependencies, priorities, cancellation, and source-version checks.

The runtime and generated application code should remain ordinary JavaScript
initially; that does not require the build-time compiler to be written in
JavaScript. OXC is the preferred long-term foundation for TSX parsing, semantic
analysis, AST traversal, and our custom graph passes. The official TypeScript
compiler remains responsible for type checking and compatibility diagnostics;
local command aliases such as `tsgo` or `tssc` are workflow details, not a
reason to conflate the toolchains. TypeScript 7.0 shipped as the native Go
implementation under the `typescript` package and `tsc` command, and its staging
repository was subsequently archived after the work moved back into the main
TypeScript repository. OXC is a compiler-tooling foundation, not a replacement
type checker. This split is an architecture to validate, not evidence that OXC
is faster for this compiler. The custom UI passes must own the semantic IR and
graph analysis rather than treating a generic JSX transform as the compiler.
Keep compiler passes and IR independent from the host runtime, and measure
compiler latency, memory, diagnostics, generated-code quality, bundle size, and
application runtime separately. OXC's React Compiler integration is a separate
React optimization path, not the dependency-graph compiler proposed here.

The matched-input and integrated three-way experiments suggest keeping three
candidate paths: per-source queues for sparse, spread changes; scannable dirty
buckets for locally dense changes; and full scans for dense changes. Buckets are
the useful in-between path, but “middle density” alone is not enough to choose
them: locality matters. In the 50k study, graph dispatch led for spread updates
through 25%, while 64-entity buckets led for clustered updates from 1% through
50%; the full scan led for spread updates at 50% and above. A bucket path can
therefore win at low global density when changes occupy a few contiguous
regions, while losing at the same density when changes are spread across the
whole entity range. This is the scannable middle path between following each
graph edge and scanning every entity.

A plausible implementation is a hierarchy of fixed-size ranges with a cheap
dirty marker per range and a local scan inside marked ranges. The enqueue path
should touch a bucket descriptor only on its clean-to-dirty transition, and the
flush should visit only the compact list of dirty buckets. If changes within a
bucket are themselves sparse, a local dirty bitset or short dirty-ID list can
avoid scanning the entire bucket. This keeps the choice among three measured
mechanisms: direct graph traversal, bucket-local scan, and full scan. A future
selector should estimate the union of affected bindings, not just changed-source
count: when local and shared sources overlap, the same derived output should be
recomputed once. The shared-source study also shows that complete fan-out can
make a sequential scan faster even at low local-change density. Compare
affected-binding coverage and locality with dirty-bucket and full-scan work, and
include the selector’s bookkeeping and decision cost in the next experiment.

Static graph compilation does not eliminate dynamic costs. Keyed list
insertion/removal, conditional branches, subscription changes, cleanup, and
graph compaction need explicit policies. Experiment V's first VDOM integration
uses the emitted CSR table to build compact per-source writer lists at mount;
repeated dispatch should iterate those lists directly instead of looking up
binding IDs on every update. The compiler should emit ordinary JavaScript first;
the measurements do not identify WASM/SIMD as a bottleneck. OXC is the preferred
long-term parser and compiler-building base, while TypeScript remains the
type-checking authority; neither the toolchain trend nor Rust implementation is
evidence of a runtime speedup. Parallel workers require independent tasks,
transferable or shared data, version checks, and main-thread host commits. None
has been demonstrated here.

Compatibility also needs proof. JSX syntax alone does not make React libraries
compatible. The useful surface may be a small explicit adapter API that can bind
DOM, Three, canvas, or custom objects without building a framework-specific
reconciler per target. The planned test is a declarative Three scene with props
updating through the adapter, compared to well-written React Three Fiber,
including setup, disposal, event behavior, and frame scheduling.

## 7. Validity limits

- **Unequal implementation maturity:** React is a production renderer/compiler;
  the browser graph prototype is a narrow binding kernel, while the
  shared-source graph is hand-written mechanism code.
- **Narrow workload:** the browser path uses scalar style props and omits
  structural edits, text/layout, effects, events, suspense, keyed lists, and
  Three scene behavior. Shared-source compiler/runtime behavior has fake-DOM
  parity evidence, an earlier four-arm browser study (14 runs / 336 pairs), a
  five-arm guarded-scan study, and a six-arm generated-writer study (14 runs /
  1,680 timed pairs each) across two page-load IDs; all browser evidence remains
  one device/profile and React/custom arms do unequal work.
- **Timing boundary:** browser measurements include synchronous update and
  commit calls, but not paint, presented frames, GPU time, or user-perceived
  input latency.
- **Order and environment:** the initial browser pilot was serial by mode; the
  paired browser run randomized and balanced order within one session. The Deno
  two-arm and three-arm runs randomized balanced orders across three fresh
  processes. Browser and CPU activity can create large tails.
- **Statistical strength:** the original multi-source sweep has two 48-pair
  randomized runs per density, and four follow-up runs rebuilt the trees across
  distinct page loads. All ten runs still came from one Chrome/MacIntel profile
  and device. Earlier browser studies have one balanced block per tested
  condition. The Deno studies have three fresh processes per scenario on one
  machine and Deno/V8 version, including the shared-source fan-out experiment.
  Tail quantiles and crossover estimates remain unstable.
- **Optimization baseline:** the multi-source React path uses React Compiler and
  two external-store subscriptions per entity. Additional well-tuned React
  patterns and independent browser sessions/devices are not included.
- **Setup/lifecycle:** setup is reported, but repeated graph construction,
  dynamic edge mutation, teardown, allocation, and retained memory are not
  comprehensively measured.
- **Ergonomics and ecosystem:** no equivalent feature has yet been authored in
  both systems; no React library interop is demonstrated.

## 8. Next experiment

The first fixed-topology per-frame host-update study is complete. V3 has 36
production-browser page loads (three per arm at 32, 128, 512, and 1,024
segments), 90 warmup frames and 300 measured frames per load. Every record
passed transform parity, stable node identity, and complete commit coverage. The
Deno notebook validates all records and produces SVG charts. V2 data stays
archived as a pilot because per-segment React layout effects inflated its commit
instrumentation; the V3 React path uses one root-level marker effect.

At 512 and 1,024 segments, the retained binding path lowers median
update-to-commit latency against React 19.3.0 + React Compiler (0.4 vs 0.8 ms
and 0.7 vs 1.3 ms). It spends more update-path CPU (0.4 vs 0.2 ms and 0.7 vs 0.3
ms). Direct DOM is fastest, as expected. The conclusion is limited to this
hand-authored retained binding kernel and one Chrome 154 / MacIntel profile at
estimated 60 Hz; it does not test an OXC-generated per-frame plan or prove
smoother presentation. See §8.1 in `paper.md` and the V3 raw JSON files.

An exploratory post-hoc callback-tail summary found one interval above 25 ms in
10,800 recorded callbacks (one of three React pages at 1,024 segments); the
other 35 pages had none. The notebook reports per-cell page summaries. This
threshold is not a dropped-frame or physical-presentation measure and provides
no evidence of an arm-level smoothness difference.

Reproduce the 512/1,024 workloads on a second device/profile, then route the
same component and frame trace through compiler-generated bindings. Add
paused/static and sparse-dirty controls, and measure paint/presentation
separately before making a smoothness claim. Rebuild the record list with
`deno task snake-frame:manifest`; rerun the analysis with
`deno task snake-frame:browser-notebook && deno task notebook`. The
`bindVector3`/`setSources` kernel contract remains independent; Lenis scrolling
and a real Three/R3F host are later workloads.

### V4 preregistration — OXC-generated per-frame bindings

V4 tests whether compiler-emitted item-local dependencies and host writers help
on the same 2D trail workload. It is a separate protocol from V3: all four arms
write `left` and `top` from the same per-segment x/y positions, because the OXC
repeated-host compiler currently emits those static scalar style bindings. V3's
transform-only records are not pooled with V4.

The arms are React 19.3 + React Compiler with stable leaf subscriptions; the
retained VDOM runtime with two hand-authored source-to-style bindings per
segment; the OXC-generated repeated-host plan with two item-local CSR slots and
generated static style writers; and cached direct DOM writes as a lower bound.
Every arm uses the same board, segment count, moving coordinates, food node, and
output-parity check. Coordinate derivation is computed once per segment inside
the measured update interval in every arm. The generated arm updates x and y
source slots, then flushes once per RAF. This compares steady-state update
paths; mount, compiler, parse, and bundle costs are not included.

The fixed matrix is 32, 128, 512, and 1,024 segments × four arms × four isolated
visible page loads (64 pages), with 90 warmup and 300 measured RAF callbacks per
page. Trial IDs are `s{segments}-rep{1..4}-{react|runtime|generated|direct}`.
Within each replication, arm order rotates as React/generated/runtime/direct;
runtime/direct/React/generated; direct/runtime/generated/React; and
generated/React/direct/runtime. Each arm occupies each timing position once
across the four replications. Segment-size order rotates as 32/128/512/1,024;
512/1,024/32/128; 1,024/512/128/32; and 128/32/1,024/512. The page load is the
replication unit; frames are nested observations. The primary outputs are
page-level median and p95 update CPU and update-to-commit latency, plus RAF
callback intervals. React commit time ends at one root marker's layout effect;
non-React commit time ends after the synchronous style writes return. Paint,
layout, GPU, and physical presentation are excluded.

The archive contains only the 64 exact trial IDs, with output parity, stable
segment/food identity, complete React commit coverage, visible-page state, and
SHA-256 pins required for inclusion. Interactive smoke records remain excluded.
This remains a one-device Chrome 154 / MacIntel study; it cannot establish
cross-device behavior or perceived smoothness. A generated-plan win would
validate only the narrow compiler-to-repeated-host path and not general TSX
compilation or the whole retained-VDOM architecture.

The completed matrix has 64 passing page loads and 19,200 measured callbacks.
The notebook verifies the raw-file hashes and all output/identity/commit
contracts before charting. Values below are the median page median / median page
p95 in milliseconds; RAF p95 is the median of the four page p95s.

| Segments | Update CPU: React / retained / generated / direct | Update-to-commit: React / retained / generated / direct | RAF interval p95: React / retained / generated / direct |
| -------: | ------------------------------------------------- | ------------------------------------------------------- | ------------------------------------------------------- |
|       32 | 0.20/0.30 · 0.30/0.45 · 0.20/0.35 · 0.20/0.40     | 0.55/0.90 · 0.30/0.45 · 0.20/0.35 · 0.20/0.40           | 17.90 · 18.05 · 18.15 · 18.15                           |
|      128 | 0.10/0.20 · 0.20/0.40 · 0.15/0.30 · 0.20/0.35     | 0.60/0.75 · 0.20/0.40 · 0.15/0.30 · 0.20/0.35           | 16.80 · 17.20 · 17.15 · 17.35                           |
|      512 | 0.10/0.20 · 0.45/0.55 · 0.30/0.40 · 0.35/0.50     | 1.20/1.35 · 0.45/0.55 · 0.30/0.40 · 0.35/0.50           | 16.80 · 17.10 · 17.10 · 17.15                           |
|    1,024 | 0.20/0.30 · 0.80/0.95 · 0.50/0.60 · 0.65/0.80     | 2.10/2.30 · 0.80/0.95 · 0.50/0.60 · 0.65/0.80           | 16.80 · 16.80 · 16.80 · 16.80                           |

The generated plan's median update-to-commit time is 75% lower than React at 128
and 512 segments, and 76% lower at 1,024. At 1,024 its page p95 is 0.60 ms
versus 2.30 ms for React. The generated path also has higher median update CPU
than React from 128 segments upward (0.15 vs 0.10, 0.30 vs 0.10, and 0.50 vs
0.20 ms). This reflects different timing boundaries: React's update CPU ends
after store notification/scheduling, while its update-to-commit includes leaf
render and commit. The generated arm synchronously performs its source updates
and host writes before its update call returns; update-to-commit is the more
comparable end-to-end measure. Results remain implementation-specific because
React does component execution and reconciliation that the generated plan skips.
At 32 segments timings are near the browser timer floor. Callback p95s are
similar and do not measure presented frames. This supports the value of static
host writers for this repeated two-style binding plan; it does not prove a
general React speedup, a smoother user experience, or a whole-runtime/compiler
win. Mount and bundle costs are still excluded. See §8.2 in `paper.md`, the
notebook SVG, and
[`results/browser-snake-frame-v4-manifest.json`](./results/browser-snake-frame-v4-manifest.json).

The broader graph density work remains open: replicate across independent
browser profiles and devices, compare with a React baseline that has equally
change-localized work, and include mixed clusters; measure graph construction,
teardown, allocation, and edge churn separately. For the guarded scan, time
property reads, derivation/comparison, and writes independently, then add a
dirty-host scan. Any integrated selector must include queueing and decision
overhead. Preserve matched source traces, output parity, randomized order,
warmup/sample counts, and browser/build/device/tab metadata. Measure graph setup
and teardown separately from steady state.

Report update scheduling, host commit, and presented frame time separately. Use
browser traces or frame observers for long tasks and presentation where
available; synchronous JavaScript timing alone is not a smoothness measure.
Sweep 0.1%, 1%, 5%, 10%, 15%, 20%, 25%, 35%, 50%, 75%, and 100% changes; include
no-op updates, shared dependencies, dynamic topology, and realistic host
setters. Measure allocation, retained memory, bundle size, parse/compile time,
and authoring steps. Publish raw data and an analysis script before interpreting
a winner.

The experiment should answer four acceptance questions:

1. Does the graph lower p95 update-to-commit latency after compilation and setup
   costs are counted?
2. Where is the density crossover, and can the runtime choose the right path
   cheaply?
3. Can JSX compile to the binding path without manual refs or repeated component
   execution for supported updates?
4. Can the adapter support a useful ecosystem library with equivalent lifecycle
   and event semantics?

## 9. Conclusion

The current evidence supports continued investigation of incremental updates,
not a new-framework victory. Randomized Deno studies show that graph,
dirty-bucket, and full-scan paths trade off with density, locality, and
shared-source fan-out. The OXC vertical slice emits item-local/shared-source
plans and direct property writers for its narrow repeated-host fixture. Across
the six-arm shared-source runs, generated writers beat the dense plan
interpreter in all 14 run medians; condition summaries show a 15.2–34.4% median
reduction. The separate JSX-authored replication records 14 runs and 1,680 pairs
across two page loads, with zero parity failures; generated writers beat the
React arm in every pair and have 18.8×–166.1× lower condition-level mean run
medians. A multi-trait JSX-authored sweep adds 18 runs / 864 pairs across 1k,
5k, and 10k entities and three densities; generated CSR and dense paths win all
pairs, with their relative advantage narrowing at full density. This is a scoped
signal because React executes component functions, subscription checks, and
reconciliation that direct writers skip. It is not an equivalent-work or general
framework comparison. The earlier guarded-scan study found that guarded full
scans were slower than eager full writes in every observed condition and
page-load median. All browser studies use one Chrome/MacIntel profile and device
and exclude paint. Maintainability and ease of extension remain design
hypotheses, not measured results. The size sweep still has two page-load IDs on
one Chrome/MacIntel device, unequal internal work, and no paint timing. Next
milestones are independent devices/profiles, a React baseline with equally
change-localized work, presented-frame timing, dynamic keyed structure,
realistic DOM and Three workloads, and an integrated low-overhead path selector.

## References and reproducibility

- React render and commit: <https://react.dev/learn/render-and-commit>
- React Compiler: <https://react.dev/learn/react-compiler>
- React work loop source:
  <https://github.com/facebook/react/blob/main/packages/react-reconciler/src/ReactFiberWorkLoop.js>
- React child reconciliation source:
  <https://github.com/facebook/react/blob/main/packages/react-reconciler/src/ReactChildFiber.js>
- Preact child diff source:
  <https://github.com/preactjs/preact/blob/main/src/diff/children.js>
- Preact core entry: <https://github.com/preactjs/preact/blob/main/src/index.js>
- React Nylon: <https://github.com/CodyJasonBennett/react-nylon>
- Xi Rope Science, series index and parts 1–6:
  <https://xi-editor.io/docs/rope_science_00.html>
- Xi incremental summaries, part 1:
  <https://xi-editor.io/docs/rope_science_01.html>
- Xi parallel/async word wrapping, part 6:
  <https://xi-editor.io/docs/rope_science_06.html>
- Xi CRDTs, parts 8 and 9: <https://xi-editor.io/docs/rope_science_08.html> and
  <https://xi-editor.io/docs/rope_science_09.html>
- Xi minimal invalidation, part 12:
  <https://xi-editor.io/docs/rope_science_12.html>
- Deno Jupyter kernel: <https://docs.deno.com/runtime/reference/cli/jupyter/>
- OXC toolchain overview: <https://oxc.rs/docs/guide/what-is-oxc>
- TypeScript 7.0 native compiler:
  <https://devblogs.microsoft.com/typescript/announcing-typescript-7-0/>
- TypeScript native compiler staging repository status:
  <https://github.com/microsoft/typescript-go/blob/main/README.md>
- Additional Xi mapping: [related-work.md](./related-work.md)

Run `pnpm install --frozen-lockfile`, `uv sync --locked`, `deno task check`,
`deno task bench`, `deno task notebook`, and `pnpm build` from the project
directory. The Deno notebook saves raw and derived JSON files under `results/`.

### 5.42 Value-dependent task graph kernel

The owner/site component prototype separates mount-only effect lifecycle from
value-dependent reactions, but the latter had no explicit runtime contract.
Added `src/task_graph_plan.ts` as a build-time fixture planner that packs source
and task dependencies into CSR input/adjacency arrays and emits a stable
topological order. `src/task_graph_runtime.ts` stores source and task values in
node-addressed arrays, batches source writes, schedules reachable tasks by
topological rank, and propagates only when a task output changes.

Six Deno contracts cover selective source fan-out, shared fan-in coalescing,
no-op writes, latest-value batching, unchanged intermediate suppression,
cycle/unknown-dependency rejection, and a deterministic trace compared with
fresh full topological recomputation. The Deno notebook includes the same
contract and saves the task execution trace to
[`task-graph-runtime-v1.json`](./results/task-graph-runtime-v1.json). This is
JavaScript mechanism evidence only. The plan is not yet emitted by OXC,
integrated with owner/site subscriptions, or connected to JSX/VDOM commit
selection; there is no performance result. The next experiment should integrate
an explicit compiled dependency plan with the owner/store and prove selective
VDOM updates against full-tree execution before timing it.

### 5.43 Task-graph dispatch crossover and scan comparison

The first paired task-graph sweep (1k/10k, 1%/10%/100%) showed a sparse win at
10k and dense losses, but eight repeats made the smallest cases too short to
time reliably. The expanded v2 grid exposed a non-monotonic 1k/0.1% point, so
those timings are retained as pilot data and are not used for the conclusion.

The v3 protocol increases repetitions per scenario (8–128), sweeps 1k/10k/50k
nodes and 0.1%, 0.5%, 1%, 2%, 5%, 10%, 25%, 50%, and 100% spread updates, and
runs 24 seeded randomized pairs in each of three sequential fresh Deno
processes. The graph arm includes numeric source writes, heap dispatch, per-task
input arrays, and output storage. The scan arm applies the same input values and
recomputes all outputs with a specialized loop. Plan build and runtime setup are
reported separately. Every scenario passes output parity; the summary preserves
per-process pairwise wins and computes medians from process-level medians.

The sparse/dense crossover reproduces. At 1k, graph dispatch wins from 0.5%
through 2% and loses from 5%. At 10k it wins through 2% (24/24 paired wins in
each process) and loses from 5%. At 50k, it wins through 1% (24/24 in each
process); 2% is near parity (77.3 µs graph vs 84.2 µs scan median, but mixed
pairwise wins), and it loses all pairs from 5% upward. The 50k/1% medians are
32.9 µs graph vs 78.3 µs scan (2.38×); at 50k/100%, 5.03 ms vs 305 µs (graph is
16.5× slower). This supports a density-aware graph/scan policy for this simple
topology, not a general React speed claim. The kernel still uses heap operations
and allocates a fresh input array per task. It is not connected to OXC, JSX, the
owner store, or VDOM commit selection, and this is a single machine/runtime
profile without React, host writes, or paint.

Raw runs: [`process 1`](./results/task-graph-dispatch-v3-process-1.json),
[`process 2`](./results/task-graph-dispatch-v3-process-2.json),
[`process 3`](./results/task-graph-dispatch-v3-process-3.json); validated
summary:
[`task-graph-dispatch-summary-v3.json`](./results/task-graph-dispatch-summary-v3.json).
The notebook draws the scan/graph ratio as a responsive SVG. Next test a
graph/scan selector and allocation-free task inputs, then integrate the winning
path with owner/site state and a retained VDOM fixture before comparing it with
React.

### 5.44 Task callback allocation experiment

The v3 runtime allocated a new task-input array for each task execution. A v4
attempt reused one mutable scratch array; the three-process benchmark was slower
across the tested matrix, including 48.9 µs vs 32.9 µs at 50k/1%, so that
approach was rejected.

The current v5 callback receives the flat node-value array, flat input-node ID
array, and the task's input range. It does not allocate an argument array during
propagation. Six Deno contracts still pass, including direct source-slot
updates, unchanged-output pruning, and full recomputation parity. The same
three-process, 27-scenario, 24-pair protocol passes parity. Across scenario
medians, v5 is about 2.5% faster than v3 at the median case-to-case ratio, but
the effect is workload dependent: at 50k/1%, median graph time changes from 32.9
µs to 31.3 µs; at 50k/100%, from 5.03 ms to 4.96 ms; at 1k with one changed
task, the direct-index callback is slower (0.61 µs vs 0.14 µs). This is a small
kernel-level improvement, not evidence of an overall runtime win. The
lower-level callback is appropriate for compiler-generated tasks but is less
ergonomic for hand-authored extensions; the public extension boundary still
needs design.

Latest raw runs:
[`v5 process 1`](./results/task-graph-dispatch-v5-process-1.json),
[`v5 process 2`](./results/task-graph-dispatch-v5-process-2.json),
[`v5 process 3`](./results/task-graph-dispatch-v5-process-3.json); summary:
[`task-graph-dispatch-summary-v5.json`](./results/task-graph-dispatch-summary-v5.json).
The notebook chart now reads v5. The next gate remains OXC-emitted dependencies
integrated with owner/site state and VDOM region commits, with a measured scan
fallback.

### 5.45 Owner cache and stable-order VDOM ablation

`ComponentStateRoot` caches each function component's props, raw result,
expanded result, subtree owner IDs, and own effect registrations. A state flush
re-runs the changed owner, walks only component ancestors needed to reach dirty
descendants, and reuses clean component subtrees. Explicit `update(tree)` still
forces full recomputation as the correctness oracle. To make reuse sound, the
JSX factory freezes element descriptors and child arrays; the VDOM normalizer
memoizes normalized host elements by immutable descriptor identity, and
`updateMounted` returns immediately for the same retained VNode. Stable-order
child lists update in place without key-map construction or host `place` calls.
Tests cover output parity, nested dirty descendants, retained host identity,
mount-only effects, keyed reorder, and changed host props/text.

The first paired Deno ablation showed that component-function reuse alone did
not buy enough: at 10k siblings it was about 15.8 ms vs 23.5 ms. That version
still expanded all cached component results and visited the full VDOM. After
retaining expanded subtrees and VNode identity, the same benchmark source moved
to compiler-generated components and the OXC graph, with more of the
component/VDOM work omitted. Results are recorded under §5.47; earlier v1
timings from before those changes are not a controlled baseline.

### 5.46 OXC state-site invalidation graph integration

The OXC state-site plan uses schema 3 and emits CSR source-to-region edges: each
compiler-stable state site points to its owning component site.
`ComponentStateRoot` dispatches changed state sources through
`DerivedRegionDispatcher` and selects the matching dirty owner for execution.
The compiler checker derives expected offsets and regions from all component
state sites, checks generated TSX, and rejects unsupported alias, arrow, and
dependency-array forms. A focused contract confirms a graph edge reruns the
state-owning component while an independent sibling keeps its render count and
host identity.

The graph still captures direct state ownership only. It does not represent
computed reads or prop dependencies between components, and keyed graph edges do
not yet provide direct child-index commit. The parent still scans its stable
child array to find the changed keyed component. The notebook records the
compiler graph and runtime dispatch as SVG and JSON. The next structural
contract is to connect source-to-region edges to a keyed child index and prove
only the selected region is visited/committed against a full-render oracle.

### 5.47 Replicated OXC-generated component update ablation

Added `BenchmarkItem` to `compiler/fixtures/component_state_sites.tsx`; OXC
lowers its `useState` call into a stable site and emits its
state-source-to-component-region edge. `src/component_update_experiment.ts` now
runs that generated component through `ComponentStateRoot` with the generated
invalidation graph. The comparison arm calls the same click handler and then
forces `update(tree())`, which re-executes all components. The cache arm uses
the normal graph-dispatched state flush. Each timed operation includes one state
update and synchronous commit; both paths use the same retained in-memory VDOM
host. The fixture counts component invocations and compares canonical output
across the complete final trees.

Three serialized fresh Deno processes each collected five warmups and 25
seeded-order pairs at 100, 1k, 5k, and 10k components. All processes passed
render-count contracts and full output parity. At 10k, the median of process
medians was 11.290 ms for owner caching and 27.516 ms for full component
rendering, a 2.47× ratio; the owner-cache arm won all 75/75 pairs. At 5k it won
all 75 pairs, and at 1k it won 74/75. These are Deno mechanism timings on an
in-memory host, not a React comparison, browser UI latency, or a paint result.
The initial ablation still linearly visited the parent’s child list; §5.48
measures the indexed keyed-region path that removes that scan for eligible
updates.

Raw replications are
[`process 1`](./results/component-update-ablation-v1-process-1.json),
[`process 2`](./results/component-update-ablation-v1-process-2.json), and
[`process 3`](./results/component-update-ablation-v1-process-3.json); the
median-of-process summary is
[`component-update-ablation-summary-v1.json`](./results/component-update-ablation-summary-v1.json).
The notebook reads the saved summary and renders the SVG; run
`deno task component-update:replicate` to collect fresh data.

### 5.48 Indexed single-region commit

Added a mounted-node index keyed by host VDOM keys, parent pointers, and
parent-slot indices. `ComponentStateRoot.flush()` now attempts an indexed
partial commit when one state change selects one owner whose cached output has
one uniquely keyed host root and contains no nested component owners. It
re-renders that owner once and reconciles the new host subtree in place. If the
root key/type or subtree shape is ineligible, the already-rendered candidate is
passed to the full tree path so the component does not execute twice. Local
effect reconciliation is indexed by owner, and ancestor snapshots update through
recorded child slots rather than remapping every sibling.

The new contracts check host identity, unchanged siblings, prop/text updates,
snapshot parity, ambiguous-key rejection, structural fallback, and exactly-once
component execution. The benchmark now asserts one partial commit per measured
owner-cache update and zero for forced full recomputation. Three fresh Deno
processes again collected five warmups and 25 seeded paired updates at each of
100, 1k, 5k, and 10k components. At 10k, median-of-process-medians was 0.030 ms
for the graph-selected indexed owner update and 28.032 ms for forced full
component rendering, a 932× ratio; all 75/75 paired samples favored the indexed
path, every process passed final output parity and render-count contracts, and
all reported one partial commit per update. The 100, 1k, and 5k medians were
0.013, 0.009, and 0.021 ms respectively. Raw replication files and summary were
regenerated by `deno task component-update:replicate`.

This is a deliberately favorable local-state ablation, not a React comparison or
browser responsiveness result. It establishes that the indexed path avoids
sibling traversal for this case; it does not establish an overall framework
advantage. It is limited to one dirty owner with one globally unique stable host
root and no nested component owners. Multi-owner updates, structural changes,
bindings, and broader prop dependency graphs still need their own contracts and
measurements.

### 5.49 Browser local-state update vs React Compiler

Added `component-state-react-benchmark.html` and
`src/browser/component_state_react_benchmark.tsx`, a production-build browser
comparison of one state-local keyed leaf update in trees of 100, 1k, 5k, and 10k
siblings. The React arm uses React 19.3.0, the React Compiler, local `useState`,
and React DOM's event path. The runtime arm uses the OXC-generated owner/site
component, a native leaf listener, compiler graph owner selection, and the
indexed single-key region commit. Both receive seeded-randomized programmatic
clicks. Each page performs eight warmup pairs and 40 measured pairs with 100
updates per arm per pair. Timed work includes event dispatch and DOM commit,
while mount is separate and layout/paint are excluded. Each update checks the
target output; final checks compare the complete output and stable target
identity and require one render per update and one runtime partial commit per
update.

Twelve confirmed production page loads were archived in the same Chrome 155
profile on one MacIntel device: three page loads at each of 100, 1k, 5k, and 10k
siblings. The 1k development-server run and older records with uncertain
provenance are excluded by
[the run manifest](./results/browser-component-state-react-manifest-v1.json).
All 12 production runs passed the correctness and update-count contracts. Median
page-level update latency was 0.131/0.005 ms at 100, 1.423/0.007 ms at 1k,
7.038/0.009 ms at 5k, and 14.121/0.012 ms at 10k for React/runtime respectively.
The 10k median of page-level p95s was 14.328/0.023 ms; median mount time was
61.0/63.9 ms. React won none of the 480 paired sample medians.
`deno task component-state:browser-summary` validates the manifest-listed
records and regenerates
[`browser-component-state-react-summary-v1.json`](./results/browser-component-state-react-summary-v1.json);
each page-load median remains the aggregation unit, while repeated pairs are
nested observations. The Jupyter notebook renders median and min–max page ranges
in SVG.

The trend is consistent with a size-dependent React cost in this exact flat
sibling tree, while the owner-indexed runtime update stays nearly constant. Do
not infer a specific React internal traversal from these timings alone. The run
uses one browser profile/device, programmatic clicks, one selected leaf, and no
layout/paint; it excludes structural edits, multi-owner batches, lifecycle
churn, alternate React tree shapes, trusted input, and frame presentation. The
large ratio is a targeted specialized-path comparison, not a broad React
performance result. Next add representative multi-owner and structural cases,
preserve an equivalence contract and full-recompute oracle, and repeat on a
second device.

### 5.50 Fixed-DOM component tree-shape benchmark preregistration

The flat sibling browser result leaves a key alternative explanation open:
React's observed size trend may depend on the component/Fiber topology created
by a flat list. Added `component-state-tree-shape-benchmark.html` and extended
`src/browser/component_state_react_benchmark.tsx` to hold the 10,000-span DOM
and one target leaf-local boolean update constant while varying keyed
Fragment-only groups: flat, 10 groups of 1,000 leaves, 100 groups of 100, or
1,000 groups of 10. Groups add component/Fiber boundaries but no host DOM nodes.
The React arm uses React Fragments; the runtime arm uses registered group
components returning runtime Fragments.

The protocol used eight warmup pairs and 40 measured pairs of 100 programmatic
updates per page, with three page-load replications per topology. The
predeclared
[run schedule](./results/browser-component-state-tree-shape-schedule-v1.json)
interleaves all four topologies over three rounds and assigns fixed seeds;
`deno task component-state:tree-shape-schedule` prints the 12 autorun URLs. Each
page asserts output after every update, full final DOM parity, target identity,
one leaf render per update, zero group renders per update, and one runtime
partial commit per update. Added a Deno contract proving the runtime leaf update
stays local beneath ten Fragment-only groups. The schedule and benchmark
implementation are detailed here; production results are recorded in §5.65.

### 5.51 Executable async task-plan scheduling contracts

Added `src/async_task_scheduler.ts`, a pure-JavaScript executor for a declared
async dependency DAG. It validates task IDs and dependencies and rejects cycles
before invoking task code. A min-heap ready queue uses declaration order as the
stable tie-breaker; `maxConcurrency` bounds in-flight tasks. When one task
completes, only its dependent tasks whose full prerequisite sets are ready enter
the queue. Task outputs remain candidate-local. An external abort or task
failure aborts in-flight signals and prevents late task results from entering
the cancelled candidate.

Six Deno contracts cover independent async starts, releasing a branch before an
unrelated resource completes, enforcing the concurrency limit, cancelling and
ignoring late results, rejecting cycles before execution, and aborting in-flight
sibling work after failure. The targeted suite passes 6/6 and the runtime and
tests type-check. This proves scheduling behavior using deferred promises only.
It does not measure latency, use a compiler-emitted plan, publish readiness into
`TransitionCoordinator`, update VDOM roots, implement reveal boundaries,
parallelize CPU tasks, or compare with React Suspense. This closes the gap
between a critical-path model and an executable async task scheduler, but not
the async UI/transition product path.

### 5.52 Async task-plan integration with coordinated root publication

Added `src/async_transition_runtime.ts` to connect the task executor to
`TransitionCoordinator`. A transition begins with the currently committed root
snapshots and one pending token per declared task. Results remain in the task
candidate's private value map. When all tasks complete, `buildSnapshots`
prepares every target root, `stageSnapshots` replaces the private candidate
snapshots, and resolving the task tokens causes one synchronous multi-root
commit. The previous snapshots and versions remain authoritative while tasks are
pending. A new request validates its root versions and task DAG before it
supersedes existing work, and the prepared adjacency is reused for execution.
Starting a newer valid runtime transition for an overlapping root aborts the
older task signal and cancels its coordinator generation; task failure cancels
the candidate and propagates the error.

Five integration contracts cover dependency-ready work while an unrelated task
remains pending, retained visible roots, one atomic multi-root commit containing
prepared values, cancellation of superseded work with stale-result rejection,
task failure without publication, invalid-request isolation, and the notebook
event-order fixture. The focused async scheduler/transition suite now has eleven
tests total. The full Deno suite passes 49/49 and `deno task check` passes. The
updated notebook executed all 50 Deno code cells with no errors and retains 20
SVG outputs. The new [Experiment AD notebook cell](./research.ipynb) visualizes
event order rather than timing. This is an executable JS integration prototype:
it is not connected to compiler output, VDOM/DOM/Three commits, progressive
reveal boundaries, urgent updates, worker CPU tasks, or a React comparison. No
speed conclusion follows.

### 5.53 Async task plans prepare retained VDOM roots

Added `VDOMSnapshotRoot.prepareCommit()`, which normalizes a candidate tree and
validates sibling keys plus compiled binding references before issuing host
writes. The existing `commit()` delegates through this prepare/apply path. Added
`AsyncVDOMTransitionRuntime`, which executes a task plan, prepares every
participating root, and then applies the prepared commits synchronously through
`TransitionCoordinator`. Before applying any root, the batch checks that all
host root versions still match their transition base versions; a direct urgent
root commit therefore invalidates the entire stale async batch before it can
patch a sibling root.

Four focused in-memory contracts verify retained mounted nodes while tasks are
pending, early dependency-ready derivation without an early host patch, keyed
host identity after a two-root commit, invalid duplicate-key rejection before
any root mutation, stale-batch rejection after a newer direct root update, and
the notebook fixture. Experiment AE captures the task-to-host event order and
emits an SVG diagram. Together the async scheduler, transition, and VDOM path
has fifteen Deno contracts; this slice adds four, bringing the full suite to 53.
`deno task check` passes. The notebook executed all 51 code cells, rendered 21
SVGs, and reported no errors. These tests do not measure browser DOM commit
cost, frame presentation, worker execution, progressive reveal, or
React-equivalent Suspense behavior. The async task plan also remains
hand-authored rather than emitted by OXC. Next compile a representative
resource/derive/region plan into the same runtime shape, then compare browser
DOM and React 19 under an interaction with matching output, identity, and
pending-state behavior.

### 5.54 OXC-emitted async task graph executes through the VDOM runtime

Added an OXC compiler mode, `--async-task-plan`, for the narrow authored form
`asyncTask(id, dependsOn, callback)`. The compiler confirms the helper resolves
to a named unaliased import, requires literal IDs and dependency arrays, assigns
stable `source-file#async-task:id` site IDs, validates duplicate/unknown
dependencies, and emits a stable topological order. The fixture declares
`page-model` before its prerequisites; OXC emits the order `profile`, `feed`,
`header`, `page-model`. `compiler:async:check` compares fresh JSON/module output
with the checked-in generated plan and verifies cycle, unknown-task, and
dynamic-dependency diagnostics.

`bindCompiledAsyncTasks` checks callback coverage against the emitted IDs and
applies the emitted topological order before executing. The integration test
imports the checked-in compiler plan and fixture callbacks, then runs them
through `AsyncVDOMTransitionRuntime`; the final keyed dashboard title and item
match, and the pre-existing heading node retains identity. Experiment AF saves
this compiler-to-scheduler-to-VDOM trace and an SVG dependency graph in the
notebook. Three new Deno contracts cover execution/parity, implementation
mismatch, and the notebook fixture. The focused async set is now 18 contracts,
and the full Deno suite passes 56/56. `deno task check` passes. The regenerated
notebook executes all 52 code cells, reports no cell errors, retains 22 SVG
outputs, and the AF cell reports `contractsPass: true`; its event trace matches
the compiler order `profile`, `feed`, `header`, `page-model`. The compiler
stable-output check passes, including negative fixtures for cycles, unknown
dependencies, and dynamic dependency lists. This remains compile-time extraction
of explicitly declared dependencies, not inference from arbitrary `await` or
data reads. It has no browser/React timing, progressive reveal, worker CPU
placement, or compiler lowering of callback bodies. That equivalent browser
comparison is recorded in §5.55. The next Gate C study should add cancellation,
urgent updates, multiple roots, and reveal-policy comparisons.

### 5.55 Browser pending-state comparison: compiled task graph vs React Suspense

Added `async-suspense-benchmark.html` and
`src/browser/async_suspense_benchmark.tsx`. Each pair transitions the same
one-root dashboard from version 1 to version 2. React 19 uses `startTransition`,
one Suspense boundary, and two prewarmed promises for independent profile and
feed resources; the runtime binds those callbacks to the checked-in OXC plan,
uses concurrency two, derives the header and page model through graph edges,
prepares a keyed VDOM candidate, and commits when the model is complete. Pair
order alternates. A frame-level pending check verifies that old content remains
visible and no fallback replaces it; after commit the study compares final text
and keyed DOM node identity. Twenty pairs are stored in
[`async-suspense-browser-v1-2026-10-09.json`](./results/async-suspense-browser-v1-2026-10-09.json).

On one Chrome 155 MacIntel session, all 20 pairs passed pending visibility,
keyed identity, and final output parity. Median task-to-commit latency was 118.7
ms for React and 118.0 ms for the compiled graph; p95 was 180.5 ms and 179.2 ms.
Since synthetic timers dominate the elapsed time, these small differences do not
demonstrate a speed advantage. The study covers one root and one Suspense
boundary. It excludes trusted user input, real network I/O, hydration,
layout/paint/frame presentation, partial reveal, nested boundaries,
cancellation, urgent updates, and independent-device replication. The Vite
production build passed. The notebook now executes 53/53 code cells without
errors and renders 23 SVG outputs; Experiment AG recomputes median and p95 from
the saved raw samples and verifies each pair's timer schedule. The
already-running browser server did not have the newly added result-archive route
loaded, so the successful record was copied from the page output into the saved
JSON; restart a current server through Portless before relying on the new
archive route for future runs.

### 5.56 Urgent input remains independent during a two-root transition

Added `urgent-transition-benchmark.html` and
`src/browser/urgent_transition_benchmark.tsx`. React renders its controlled
input outside a single Suspense boundary and updates the dashboard inside
`startTransition`. The graph runtime renders the input in a separate
native-event VDOM root, while a compiled OXC task plan prepares scene and HUD
roots for one coordinated commit. Across 20 alternating-order pairs, the study
dispatches an input event after a frame but before delayed resource completion.
It checks that both old views remain visible, the urgent value becomes visible
before data completes, both transition roots publish, keyed nodes retain
identity, and both outputs match. The exact timer schedule, pair timings, and
per-pair contracts are in
[`urgent-multiroot-transition-browser-v1-2026-10-09.json`](./results/urgent-multiroot-transition-browser-v1-2026-10-09.json).

All 20 pairs passed. In one Chrome 155 MacIntel session, median
dispatch-to-visible time was 2.5 ms for React and 0.7 ms for the runtime; p95
was 15.7 and 2.5 ms. Median transition completion was 252.1 and 246.3 ms; p95
was 314.5 and 312 ms. Programmatic events and synthetic timer waits in one
browser/device make these descriptive only, not a frame-responsiveness or speed
claim. This tests an urgent root outside the pending transition. It does not
test an urgent update that changes one of the pending roots, so same-root rebase
semantics remain open.

The first browser attempt failed its second pair because fresh runtime-root
objects were mounted into nonempty containers reused from the prior pair; a
stale rendered node made the pending-view probe observe the wrong sample.
Clearing each runtime container before the next mount fixed the harness, and the
complete 20-pair rerun passed. A later rerun enabled React Compiler in the
production fixture and saved schema v2 separately. All 20 v2 pairs passed.
React/runtime median and p95 urgent latencies were 2.1/0.4 and 10.7/3.1 ms;
transition completion was 215.9/213.7 and 289.9/273.6 ms. These differ from v1
because the data is from a separate browser run; neither single-session dataset
supports a performance conclusion. The production Vite build passed with React
Compiler present in the generated benchmark bundle. Experiment AH's notebook
cell validates v2 summaries from raw samples and timer schedules. The notebook
executed all 54 code cells without errors and retained 24 SVG outputs.

### 5.57 Urgent same-root writes rebase over independent async work

The prior browser fixture kept urgent input outside the transition roots,
leaving open whether an urgent write to a participating root could remain
visible without discarding useful async work. Added
`AsyncVDOMTransitionRuntime.commitUrgent`, which publishes the urgent VDOM
immediately and records the committed root version with the coordinator. When
async tasks finish, the runtime rebuilds the candidate from current application
state; if a tracked urgent version advanced, the coordinator rebases the pending
root set and candidate snapshots before the existing atomic commit.

The new deterministic fixtures in `src/async_vdom_urgent_rebase_experiment.ts`
cover same-root rebase and dependency invalidation. A deferred independent
result plus a live query value verifies five contracts: the urgent query is
visible immediately, the old result remains visible while pending, the final
candidate combines the latest query with the fresh async result, keyed
input/result nodes retain identity, and the root version advances through urgent
and transition commits. OXC accepts `$query` for explicit external inputs and
infers literal `values.get("key")` reads from the callback's first parameter.
The generated search plan infers the OXC-emitted `Counter` state-site ID while
its authored dependency list is omitted; `bindCompiledAsyncTasks` maps the
resulting input edge to the runtime.
`AsyncVDOMTransitionRuntime.watchStateWorld` observes `OwnerStateWorld` writes
and immediately invalidates pending generations whose task inputs intersect
those state-site IDs; `commitUrgent` uses the observed set to rebase independent
work. The rebase trace passes five contracts and the watched compiled
invalidation trace passes seven. Notebook Experiment AI v1 records these cases
in
[`async-vdom-urgent-rebase-v1.json`](./results/async-vdom-urgent-rebase-v1.json).
The notebook executes all 55 code cells without errors and retains 25 SVG
outputs. The full Deno suite passes 59/59; `deno task check` and
`deno task compiler:async:check` pass. This is behavior evidence only. Bounded
restart and its cost are evaluated in §5.59; broader static read analysis,
browser behavior, React comparison, and timing remain open. The build callback
must read live current state before rebasing.

### 5.58 OXC infers literal ECS reads in async task callbacks

Experiment AI initially represented a state read twice: the callback read a
generated state-site ID from its input map, and the task declaration repeated
the same ID with a `$` marker. The OXC planner now visits each task callback's
first parameter and infers its literal `values.get("key")` reads. A key matching
another task ID becomes a task edge; any other key becomes an external input
edge. The fixtures use the two-argument `asyncTask(id, callback)` form without
dependency arrays: the dashboard graph is inferred from reads of `header`,
`feed`, and `profile`, and the search task's `Counter` state-site read becomes
an input edge. The checker recompiles both fixtures and cross-checks the state
edge against the generated `Counter` site ID. Non-literal reads through the
callback input parameter fail compilation. The existing binder and
`watchStateWorld` path then abort stale work on a matching ECS write. The
deterministic invalidation contract passes without a manually duplicated marker.

This is a narrow compile-time proof, not general JavaScript dataflow analysis:
reads must use a literal key on the callback's simple first parameter, and the
graph conservatively includes reads even when control flow may skip them.
`$input` markers remain available for explicit external sources. Bounded opt-in
restart is prototyped in §5.59; §5.60 adds completed-task reuse and §5.61
measures its scheduler retry cost. Safe support for aliases or static unions and
broader compile-time costs remain open. The compiler checker emits the expected
dashboard task order and state input edge, and rejects dynamic keys and
malformed dependency arrays.

### 5.59 Bounded retry after async input invalidation

The runtime now offers opt-in bounded restart through `maxInputRestarts` and
`refreshInputs`. On a watched ECS write that invalidates a task input, the
current generation is aborted and its candidate is canceled. The urgent host
commit remains visible. The wrapper drains the changed input IDs, asks the
application for their latest values, and starts a fresh task plan against the
root's current committed version. An aborted generation's late promise
completion is ignored. Restart requires an explicit refresh callback and a
finite non-negative retry budget; without it, prior cancellation behavior
remains.

The deterministic fixture changes the compiled `Counter` input from 0 to 1 while
the search task is pending. It verifies the old attempt receives abort, the
restarted task sees 1, the old result cannot publish, the downstream model runs
only on the new result, the urgent UI remains visible, and the async result
commits over it. The graph also includes an independent completed `catalog`
task; this initial full-plan restart reruns it. That exposes the principal cost
of this policy and motivates DAG-selective restart. Nine restart contracts pass;
no timing is measured. The notebook saves schema v2 in
[`async-vdom-urgent-work-planning-v2.json`](./results/async-vdom-urgent-work-planning-v2.json)
and adds a third SVG path for the restart behavior. At this point the full suite
had 60 tests, `deno task check`, `deno task compiler:async:check`, and targeted
Deno formatting passed; the notebook executed all 55 cells without errors and
retained 25 SVG outputs. §5.60 tests reuse of completed independent work.
Browser/React comparison remains open.

### 5.60 Reuse completed async tasks across input restarts

The full-plan restart from §5.59 discarded completed independent work. Added an
opt-in `reuseCompletedTasks` policy that carries completed task outputs from an
aborted attempt into the next attempt. The scheduler computes the conservative
descendant closure of changed external inputs. A completed task is reused only
when it lies outside that closure; affected tasks and all their dependents are
recomputed. In-flight tasks are still aborted with the old candidate and are not
preserved. Reuse is explicit per transition plan, so the default behavior
remains full recomputation.

Two deterministic contracts cover the policy. The scheduler-level test changes
`query`, checks that `load` and its `derive` descendant run again, and confirms
independent `catalog` comes from the prior result without rerunning. The
compiler-backed same-root restart fixture verifies that the first search is
aborted, the retry sees the latest state-site input, the late stale result
cannot publish, the independent completed `catalog` implementation runs once
across the restart, the dependent page model uses the fresh search result, and
the urgent view remains visible until commit. Nine restart contracts pass. At
this point no restart latency, allocation cost, React comparison, or browser
presentation had been measured; the scheduler-only retry microbenchmark is in
§5.61.

Verification after this change: all 62 Deno tests pass; `deno task check`,
`deno task compiler:async:check`, and targeted Deno formatting pass. At this
point the notebook executes all 55 Deno code cells without errors and retains 25
SVG outputs. Its schema-v2 result reports all three cases passing, one restart,
independent task reuse, and `timingMeasured: false`. The remaining async
scheduling question is whether independent in-flight work can safely survive an
invalidated candidate; this needs explicit cancellation and ownership semantics.
Broader read inference, browser/React behavior, and frame-level measurement
remain open.

### 5.61 Scheduler retry cost with completed-task reuse

Added `src/async_task_reuse_benchmark.ts` and Experiment AJ to compare two
scheduler retry policies after the same controlled invalidation point. The
fixture first completes a query-dependent chain and independent leaf tasks while
an unrelated async gate keeps the initial attempt pending. It then changes
`query`, aborts that candidate, and times only the next `executeAsyncTaskPlan`
call. The changed-input policy reruns the full graph; the selective policy
receives the completed outputs and query ID and reuses only outputs outside the
query-dependent descendant closure. The chart and raw samples are written by the
notebook cell in `notebook_cells/async_task_reuse_benchmark.ts`.

The matrix uses 32 and 128 work tasks, 10%, 50%, or 90% query-dependent chain
shares, and zero or 2,000 deterministic integer iterations per task. It runs 31
paired samples per case, alternating strategy order, and validates every
changed-chain and independent output. A separate CLI task reruns all 12 cases in
a fresh Deno process. All 24 case/process combinations pass correctness checks.
Both processes show a clear tradeoff: at 10% invalidation with 2,000 iterations,
the N=32 median fell from 0.93–1.01 ms to 0.100–0.110 ms, while N=128 fell from
0.628–0.652 ms to 0.319–0.335 ms. At 90% invalidation, 3/32 or 13/128 tasks were
reusable; zero-work retry became 15–21% slower and 2,000-iteration retry
improved only 6–9%. At 128 tasks and 50% invalidation, zero-work retry was about
6% faster in both runs, while the 2,000-iteration case improved about 43–44%.

These are scheduler-only timings from one Apple Silicon machine running Deno
2.6.3/V8 14.2, not DOM/React/frame results. The timed path excludes
`prepareAsyncTaskPlan`, VDOM candidate construction, host commit, and worker
transfer; the measured task work is a synthetic integer loop. The repeated
crossover supports an investigation target rather than a universal policy:
closure discovery loses when little useful work is skipped, and is valuable when
a substantial independent portion is expensive. Files:
[`async-task-reuse-cost-v1.json`](./results/async-task-reuse-cost-v1.json) and
[`async-task-reuse-cost-replication-v1.json`](./results/async-task-reuse-cost-replication-v1.json).
Notebook verification after the primary run: all 56 code cells execute without
errors and retain 26 SVG outputs. The next study should add dependency-closure
cost to an adaptive full-restart/reuse policy, then test real async-resource and
browser commit behavior; preserving independent in-flight tasks remains a
separate cancellation-semantics question.

### 5.62 Browser retry comparison with React and selective task reuse

Added `async-task-reuse-browser.html` and
`src/browser/async_task_reuse_browser.tsx`. The fixture compares React 19 with
React Compiler, compiled-runtime full restart, and compiled-runtime reuse of
completed independent task outputs. Each arm starts with an old committed result
and a pending stale search. React updates its query input urgently and
transitions only to the newest query while leaving the stale request in flight;
the graph runtime's compiler-emitted task DAG starts the stale search and
observes the ECS state-site write that invalidates it. The runtime must abort
the stale attempt, restart once with the fresh input, ignore the released stale
result, preserve the old host view while pending, and reuse the independent
completed `catalog` task only in the selective arm. Each of 20 alternating-order
pairs runs once with zero catalog-loop iterations and once with 250,000.

The saved Chrome 155 MacIntel run contains 40 paired samples and passes all
output, pending-view, keyed-identity, stale-result, abort/restart, and
task-count contracts. At zero catalog work, medians are React 7.9 ms, full
restart 8.4 ms, and reuse 8.5 ms; p95s are 11.9, 9.4, and 11.5 ms. At 250,000
iterations, medians are 6.2, 7.7, and 8.6 ms; p95s are 9.6, 10.2, and 11.3 ms.
The median paired graph-minus-React differences are +0.6/+1.2 ms at zero work
and +0.3/+1.1 ms at 250,000 iterations for full/reuse. Full restart is faster in
9/20 or 7/20 pairs and reuse in 9/20 or 6/20; neither wins consistently. Saving
one catalog execution is not a browser timing win in this small fixture. The raw
record came from the browser's JSON export because the already-running Portless
server returned HTTP 404 from its archive route:
[`async-task-reuse-browser-v1-2026-10-10.json`](./results/async-task-reuse-browser-v1-2026-10-10.json).

This remains narrow evidence: one browser session/device, programmatic state
updates, synthetic deferred search promises, and a deterministic CPU-loop proxy.
Timing ends at host commit, excluding layout, paint, and frame presentation.
React caches the independent catalog at the application level; the graph runtime
chooses it from the compiled DAG. The test measures retry behavior, not an
equivalent Suspense rendering of the stale query. The notebook verifies medians
and p95s from raw samples and emits SVG only; this browser run rules out a speed
claim for this fixture but does not settle representative transition
performance.

### 5.63 Frame cadence for keyed-region updates

Added a frame-pacing mode to the existing two-region 10,000-row browser fixture.
Each arm applies the same eight alternating query updates, one per
animation-frame opportunity; six warmup pairs precede 24 balanced timed pairs.
The run separately records synchronous update duration and the interval from the
rAF callback before an update to the next callback. A 120-interval idle baseline
is sampled first. All paired intermediate outputs match across React 19.3 +
React Compiler, whole-tree retained VDOM, and the OXC-selected region DAG. Two
Chrome 155 collections were saved:
[`run 1`](./results/keyed-region-frame-pacing-v1-1791604332573.json) and
[`run 2`](./results/keyed-region-frame-pacing-v1-1791604513823.json). Experiment
AL in the notebook recomputes summaries from these raw records and emits
SVG-only charts.

The pair-level median rAF interval difference (candidate minus React) was +58.1
ms for whole-tree derivation and −8.3 ms for the graph in run 1; in run 2 it was
+41.5 ms and −8.6 ms. The graph had a lower per-pair rAF median than React in
18/24 and 20/24 pairs, and lower than whole-tree derivation in 23/24 and 24/24.
The pooled p95 rAF intervals were still 674–883 ms for every arm, while idle p95
was about 17 ms. Update p95s varied from 183–397 ms. All three 10,000-row panels
were connected simultaneously. These runs are exploratory rAF callback
measurements, not a smoothness or presentation result; the long tails have no
established cause.

Run 3 introduced isolated connected DOM: each sequence connected only its active
arm's lists and left equal-size placeholders for the other panels. Its 24 timed
pairs passed parity. Update p50/p95 was 17.0/418.6 ms for React + Compiler,
61.5/183.1 ms for whole-tree VDOM, and 8.9/190.5 ms for the region graph. rAF
interval p50/p95/max was 42.9/700.4/1,400.1 ms, 100.0/733.3/1,391.3 ms, and
41.7/733.3/808.6 ms, respectively. Its idle baseline was 8.4 ms median, 17 ms
p95, and 18 ms max. Connected-DOM isolation did not eliminate the long tails.
This record predates the explicit stored isolation assertion and is excluded
from the verified-isolation notebook chart.

Run 4 repeated the isolated protocol with an executable invariant: before each
arm sequence, the harness asserts exactly that arm's host field is connected and
stores the observed arm list in each timed pair. All 72 timed arm selections
passed the connection assertion; all 24 pairs passed intermediate-output parity.
The idle baseline was 8.4 ms median, 16.9 ms p95, and 55.8 ms max. Update
p50/p95: React + Compiler 18.3/485.0 ms, whole-tree VDOM 57.2/176.8 ms, region
graph 35.2/174.5 ms. rAF interval p50/p95/max: React 83.5/725.9/1,358.4 ms,
whole-tree 100.0/733.6/841.5 ms, graph 58.0/733.4/1,525.0 ms. All arms still had
177–189 of 192 intervals above 1.5× the idle median. The graph median is lower
here, but its p95 is effectively tied with both alternatives and its update
median varies substantially from Run 3; the available single-page evidence does
not support a frame smoothness or stable speed claim. Detached roots are
retained in memory; causal attribution for these long intervals remains open.
Raw record:
[`run 4`](./results/keyed-region-frame-pacing-isolated-v1-1791634209289.json).
The notebook now excludes records without stored per-sample connection checks
and verifies the exact arm before plotting.

### 5.64 Long-animation-frame attribution for keyed-region updates

Added an optional attribution mode to `keyed-filter-benchmark.html`. It observes
Chromium's `long-animation-frame` PerformanceObserver entries in separate
isolated runs; the observer is not active in uninstrumented frame-cadence
results. Two fresh 10,000-row page loads each completed 24 timed pairs with
eight transitions per arm and a 120-interval idle baseline. All 48 pairs passed
output parity and all 144 per-sequence connection assertions passed. Raw
records:
[`run 1`](./results/keyed-region-frame-pacing-attribution-v1-1791669251661.json)
and
[`run 2`](./results/keyed-region-frame-pacing-attribution-v1-1791669535757.json).

| Arm              | Update median (ms), run 1 / 2 | rAF p95 (ms), run 1 / 2 | LoAF-overlapping windows / 192, run 1 / 2 | LoAF duration p95 (ms), run 1 / 2 |
| ---------------- | ----------------------------: | ----------------------: | ----------------------------------------: | --------------------------------: |
| React + Compiler |                   10.8 / 17.6 |           224.8 / 225.2 |                                   82 / 85 |                     239.5 / 275.3 |
| Whole-tree VDOM  |                   14.5 / 14.7 |           150.0 / 158.6 |                                   72 / 73 |                     164.4 / 176.8 |
| OXC region DAG   |                    11.4 / 4.9 |           150.1 / 166.7 |                                   70 / 71 |                     169.8 / 178.3 |

Both VDOM arms had fewer overlapping LoAF windows and lower associated duration
p95 than React in both page loads. The graph and whole-tree paths were close;
the graph did not show a consistent rAF p95 advantage over whole-tree VDOM.
Update medians varied between runs, especially for the graph, while LoAF overlap
counts and duration tails were more stable. These observations come from two
page loads on one Chrome/MacIntel profile and remain nested sample summaries
rather than independent device replications. Matching is timestamp-based and
approximate; one frame can overlap multiple update windows. The only script
attribution was an opaque `FrameRequestCallback` with no source URL or function
name, so cause remains unknown. LoAF duration excludes display presentation. The
data does not establish causality or a user-visible smoothness advantage.
Experiment AM in the [notebook](./research.ipynb) recomputes both runs from raw
data and emits SVG-only charts. References:
[W3C Long Animation Frames specification](https://www.w3.org/TR/long-animation-frames/)
and
[Chrome Long Animation Frames guide](https://developer.chrome.com/docs/web-platform/long-animation-frames).

### 5.65 Component topology at fixed DOM size

Completed the preregistered 12-page production-browser schedule for four
Fragment-only component groupings over the same 10,000-span DOM. The three-page
medians were React/runtime 15.114/0.0120 ms for flat, 13.585/0.0120 ms for 10 ×
1,000, 13.601/0.0120 ms for 100 × 100, and 13.767/0.0130 ms for 1,000 × 10. All
12 records passed output parity, stable target identity, one leaf render per
update, zero group renders per update, and one runtime partial commit per
update; the runtime won all 480 paired samples. The page-load ranges are in
`results/browser-component-state-tree-shape-summary-v1.json`.

The controlled result does not show a monotonic React cost increase with
Fragment-group count. The three grouped medians are nearly equal; flat is
somewhat higher, but with only three page loads/topology and overlapping or
adjacent ranges, this is not enough to claim a component-topology effect.
Runtime measurements sit at the timer floor across all topologies, so speed
ratios are not the useful conclusion. The study weakens the hypothesis that
grouping alone accounts for the earlier sibling-count scaling. It does not
include work inside group components, multiple dirty owners, structural edits,
lifecycle churn, trusted input, layout/paint, or presentation. The production
build was served through Portless at
`react-runtime-tree-shape-prod.localhost:1355`; all runs used one Chrome 155
profile and MacIntel device. The development-server schedule previously
collected is preserved separately under `results/dev-exploratory/` and is not
mixed into this production summary. The notebook executes all 60 Deno cells
without errors and contains 30 inline SVG outputs and no PNG charts. The
validated manifest, schedule, raw records, and Experiment AN notebook chart make
the study reproducible.

### 5.66 Multi-owner keyed-region batch commit

Extended `VDOMSnapshotRoot` with a validated multi-region commit and
`ComponentStateRoot` with a multi-owner flush. It prepares dirty owner
candidates, verifies region disjointness, compatibility, and global key
uniqueness before host mutation, then publishes the changed regions in one
synchronous snapshot version. Unsafe candidates fall back to full
reconciliation. The benchmark page compares 10,000 keyed leaves in React 19.3 +
React Compiler with per-row `useSyncExternalStore` against OXC owner/site state
and this multi-region path at fanout 1/4/16/64/256.

The first production run correctly updated and committed every target but was
marked failed because the harness compared both DOMs immediately after running
only one arm of each pair; the other arm was intentionally still unchanged. This
false-negative was corrected to check parity after both arms run. That
exploratory failure is preserved as an investigation note and is not included in
the successful dataset. Three fresh production page loads then passed output
parity, stable host identity, exact changed-row render counts, one runtime batch
per event, and exact region counts. Median-of-page-medians (React/runtime,
ms/event) was 22.1/0.10 at fanout 1, 21.7/0.10 at 4, 22.2/0.20 at 16, 22.4/0.50
at 64, and 22.7/1.70 at 256. Runtime median p95 across page loads rose from 0.10
ms to 2.30 ms; React page p95 medians ranged from 39.4 to 81.8 ms. These
summaries are descriptive: 40 pairs are nested within each page, all three pages
share one Chrome 155 profile/device, the React arm's external-store subscription
design is workload-specific, and sub-millisecond runtime samples approach timer
resolution. The evidence supports correctness and expected fanout scaling for
independent stable regions, not an overall React speed ratio or frame-smoothness
claim.

Raw page records:
[`run 1`](./results/browser-multi-owner-batch-v1-82005002.json),
[`run 2`](./results/browser-multi-owner-batch-v1-82005003.json), and
[`run 3`](./results/browser-multi-owner-batch-v1-82005004.json);
[validated summary](./results/browser-multi-owner-batch-summary-v1.json). The
notebook Experiment AO cell recomputes the summary from raw records and emits an
SVG-only chart. Notebook execution completes all 61 code cells with no errors
and retains 31 SVG outputs and zero PNG outputs. Experiment AP now adds
single-owner keyed rotate/insert/remove/filter operations with local state and
incremental owner-subtree expansion. The generic keyed list diff remains, and
the v2 filter tail is unstable. The next gate should add graph-selected
structural intervals and nested/multiple owners, then compare equivalence,
allocation, lifecycle, and mount/churn costs before broadening the performance
claim.

### 5.67 Incremental structural updates for stateful keyed children

Added a focused `ComponentStateRoot` path for a single dirty structural owner
with one stable keyed host root. The runtime rerenders that owner, expands only
its child subtree, reuses cached output for keyed children whose type and props
are unchanged, and applies the result through
`VDOMSnapshotRoot.commitKeyedRegion`. It updates component caches, owner
membership, and effects only for the affected subtree. Removed keyed owners are
destroyed after commit; a reinserted key gets new state and effects. A targeted
contract verifies row-state retention and host identity through reorder, fresh
state and effect setup after reinsertion, effect cleanup on removal, a stable
outside sibling, and exactly one parent-region commit. The focused
component-state suite passes 12/12; `deno check` passes for the runtime and this
test file.

The v2 browser protocol compares that path against React 19.3 + React Compiler
on 10,000 keyed rows with local child state. It runs rotate, replace-edge, and
filter-half/restore, with eight warmups and 24 balanced pairs on each of three
fresh pages. All 216 timed operation samples pass output, keyed identity, and
local-state retention/reset checks. Median-of-page-medians (React/runtime) is
26.0/14.1 ms for rotate, 68.9/21.2 ms for edge replacement, and 80.8/31.7 ms for
filter/restore. Median page p95 is 31.1/20.2, 80.2/23.8, and 118.9/312.9 ms.
Filter runtime p95 ranges from 85.6 to 314.6 ms: two pages have a large tail and
one does not, despite page medians of 31.3–32.0 ms. Cause is unknown; the data
does not support a stable-tail claim. Mount time is separate. The timing ends at
synchronous host commit and excludes layout, paint, display presentation,
allocation, and repeated lifecycle churn. Three pages share one Chrome 155
MacIntel profile; 24 samples/page are nested observations.

Important boundary: this is owner-subtree preparation, not full DAG-selected
structural interval invalidation. The parent list's generic keyed reconciler
still processes the dynamic sibling sequence. The earlier v1 set (83001006–008)
measured the full-tree expansion fallback and remains a separate baseline. Runs
83001009–011 were collected after the code path changed but retained stale v1
strategy metadata; they are preserved and excluded. The schema-v2 records
correctly describe the incremental implementation:
[`83001012`](./results/browser-component-state-structural-v2-83001012.json),
[`83001013`](./results/browser-component-state-structural-v2-83001013.json),
[`83001014`](./results/browser-component-state-structural-v2-83001014.json), and
notebook-generated
[summary](./results/browser-component-state-structural-summary-v2.json).
Notebook execution completes all 62 Deno code cells with no errors, retains 32
inline SVGs, and produces no PNG charts.

The first compile integration run also exposed an automatic-versus-classic JSX
key ABI mismatch that made state follow slots on reorder. Vite's generated TSX
now uses the runtime's classic OXC JSX lowering, so keys arrive in props. The
fixed v2 records pass keyed state and identity contracts. Next compare
graph-selected structural intervals against this generic subtree reconciler,
then profile allocation and lifecycle churn and reproduce on a second device.

### 5.68 LIS keyed move-plan follow-up

The v2 structural reconciler's keyed diff could emit host `place` calls across
the entire next sibling list. Added a pure-JavaScript
longest-increasing-subsequence plan over matched old sibling positions. For a
structural change it now places only newly inserted nodes and retained nodes
outside the LIS. Stable sibling order returns before allocating the keyed map,
key set, and LIS buffers. Targeted contracts pass for a rotation (one retained
placement), a filter that keeps a stable subsequence (zero retained placements),
an insertion (one placement), and retained host identity.

The first v3 browser pages ran through a preview whose archive middleware was
stale, so those records were not saved and are excluded. After restarting the
production preview via Portless, three pages were rerun and each record was
saved and notebook-validated:
[`83001018`](./results/browser-component-state-structural-v3-83001018.json),
[`83001019`](./results/browser-component-state-structural-v3-83001019.json), and
[`83001020`](./results/browser-component-state-structural-v3-83001020.json). On
Chrome 154 / MacIntel, all 216 samples pass output parity, host identity, and
child-state checks. Median-of-page-medians (React/runtime) is 10.1/15.4 ms for
rotation, 9.6/15.0 ms for edge replacement, and 13.8/36.5 ms for half-list
filtering. Median page p95 is 12.3/20.7, 10.7/18.4, and 20.2/56.4 ms. The
runtime loses on every median and p95 in this collection. The v2 collection used
Chrome 155, so it is not a controlled before/after test. The data shows that
minimizing host placements did not offset the additional JavaScript work in this
fixture, but it does not isolate which part of that work dominates. The full
sibling list is still normalized and scanned; the DAG does not yet select
structural intervals. Layout, paint, display presentation, memory churn, and
lifecycle instrumentation remain excluded. The validated
[summary](./results/browser-component-state-structural-summary-v3.json) and
notebook chart are regenerated by
`deno task component-state:structural-notebook` followed by
`deno task notebook`.

### 5.69 Linear keyed move-plan follow-up

The LIS plan reduced retained host placements, but v3 was slower than React for
all three structural operations. V4 replaces the O(n log n) LIS search and
associated scratch arrays with a linear last-placed-index scan and a compact
placement flag buffer. The forward pass marks nodes that need placement; reverse
commit preserves final order. This can move more retained nodes than LIS for
complex reorder patterns, so it is a tradeoff rather than an improvement in
placement count. Existing contracts continue to verify final order and host
identity.

Three fresh Chrome 154 / MacIntel page loads each ran eight warmups and 24
measured pairs per operation. All 216 samples passed output parity, keyed host
identity, and retained/reset child-state checks. Median-of-page-medians
(React/runtime) was 9.7/14.0 ms for rotation, 9.5/13.6 ms for edge replacement,
and 13.2/32.0 ms for half-list filtering. Median page p95 was 11.9/18.9,
10.4/15.5, and 19.5/52.9 ms. Compared with v3 runtime medians (15.4, 15.0, and
36.5 ms), v4 is descriptively faster on all three operations, but remains slower
than React. Separate sequential version runs do not establish a causal speedup;
all pages are nested within one browser profile and device. Move planning alone
does not close the runtime's structural-update gap. The accepted V4 records do
not attribute time among owner expansion, VDOM normalization, sibling scans,
prop comparison, allocations, and host writes. The current harness has an
optional `?diagnostics=1` path that splits instrumented flush time into owner
render/keying, owner expansion/cache, VDOM normalization, host reconciliation,
and key/snapshot rebuilding, but this diagnostic output has not been collected
with the accepted raw records and does not count host placements or allocations.
The measured operations preserve relative child order except for moving one row
in the rotation case, so they do not isolate an LIS-adversarial reorder; move
count should not be presumed to explain their timing gap. Collect the diagnostic
profile separately, add placement/write and allocation counters where feasible,
then choose one bottleneck to optimize before trying graph-selected structural
intervals or another reconciliation algorithm. Retain identity and lifecycle
semantics. Timing excludes layout, paint, presentation, and repeated lifecycle
churn.

An exploratory Deno profile was added after V4 to separate runtime phases on the
`MemoryVDOMHost`: `deno task structural:phase-profile`. One Deno 2.6.3 / Apple
Silicon process ran 10,000 rows, two warmups, and ten measured updates per
operation. Median `root.flush` time was 15.13 ms for rotate, 14.92 ms for
replace-edge, and 49.21 ms for filter-half. In the filter case,
`vdom.reconcile-host` accounted for a 27.38 ms phase median and
`owner.expand-and-cache` 10.74 ms; rotate/replace showed 7.41/5.91 ms in owner
expansion and 3.39/3.06 ms in host reconciliation. The filter also recorded
60,000 placements, 30,000 removals, and 120,012 host writes across all 12
updates, including warmups. This is not a browser explanation: `MemoryVDOMHost`
stores children in an array and uses `indexOf`/`splice` for placement/removal,
so its filter host cost is implementation-specific and can be quadratic. The
result is preserved in
[`component-state-structural-memory-profile-v1.json`](./results/component-state-structural-memory-profile-v1.json)
and the script; it motivates browser phase attribution, not a reconciler change.
The notebook includes the phase table and an inline SVG comparison. Reproduce
the record with `deno task structural:phase-profile`; refresh the notebook with
`deno task structural:phase-profile:notebook`, then execute
`UV_CACHE_DIR=/private/tmp/uv-react-research-cache UV_OFFLINE=1 deno task
notebook`.
The latest execution completed 71 Deno code cells with zero errors, 54 SVG
outputs, and no PNG outputs.

Raw records:
[`83001024`](./results/browser-component-state-structural-v4-83001024.json),
[`83001025`](./results/browser-component-state-structural-v4-83001025.json), and
[`83001026`](./results/browser-component-state-structural-v4-83001026.json).
`deno task component-state:structural-notebook` validates and summarizes these
raw records, writes the SVG chart, and `deno task notebook` executes the
research notebook.

### 5.70 Minimum production bundle size

Added matched one-button counter fixtures: both mount a button and update its
label from native click state. The React fixture uses `createRoot` and
`useState`; the runtime fixture uses `ComponentStateRoot`, `DOMVDOMHost`, and
explicit owner/state-site IDs. The script bundles each as one ES2022 production
output using Vite 8.3.1, Oxc minification, and gzip level 9. Reproduce with
`pnpm run bundle:size`; the script writes
[`runtime-size-v1.json`](./results/runtime-size-v1.json) and disposable outputs
under `work/runtime-size-v1/`.

React + React DOM produced 297,192 raw bytes / 75,584 gzip bytes; the prototype
produced 33,528 / 8,892 bytes, an 88.2% gzip reduction for this fixture. This
supports the claim that a minimal client kernel can have a small payload. It
does not establish equal-capability size: the prototype omits much of React's
API and ecosystem, and this one-counter workload does not measure a
representative app. Next size an application suite under a shared feature
contract, include compiler metadata/runtime and representative adapters, and
report both shared dependencies and app-specific code.

### 5.71 Snake V5 collection: OXC bindings through retained VDOM

The preregistered Snake V5 matrix compares React + Compiler, runtime-discovered
retained-VDOM bindings, OXC CSR bindings through retained VDOM, OXC
repeated-host writers, and direct DOM at 32, 128, 512, and 1,024 segments. Each
cell has five isolated visible page loads; each page has 90 warmup and 300
measured RAFs. The page is the replication unit, for 100 page loads and 30,000
measured samples. The pre-data amendment `V5-AMD-1` moved the schedule URLs to
an isolated Portless hostname because the original route was owned by a live
process with old middleware. It changed no arm, workload, ordering, or analysis.
The pre-collection
[source lock](./results/browser-snake-frame-v5-source-lock.json) pins 19 source,
build-input, dependency, and archive files.

The isolated visible sequence completed all 100 scheduled pages. Every record
passed frame-count, parity, stable-node identity, visibility, and
commit-coverage contracts. The manifest contains a SHA-256 digest for each raw
file. The earlier 60-frame contract smoke is outside the schedule and excluded
from analysis. Reproduce the accepted dataset summary with
`deno task snake-frame:v5:manifest`, `deno task snake-frame:v5:notebook`, and
`deno task notebook`; the notebook rechecks raw hashes and emits SVG plots for
update-to-commit, mount, and RAF interval p95.

The matrix ran through `pnpm run dev` under Portless. The frozen schedule did
not specify build mode; the manifest records the development-server mode post
hoc. React Compiler was enabled, but React's optimized production build was not
measured. Treat these results as development-mode evidence only. The
OXC-through-VDOM path's update-to-commit medians were 0.1, 0.2, 0.5, and 0.8 ms
at increasing sizes, versus React + Compiler at 0.8, 1.9, 2.4, and 3.7 ms. Its
update CPU was higher at 512 and 1,024 segments, and runtime-discovered VDOM
bindings were slightly faster than OXC CSR there. Median page-level RAF p95s
were 16.8–17.5 ms across arms and sizes; they do not show a frame-cadence win.
The production-build repeat was frozen before its new collection; details and
results are in Experiment AT-P below. An independent device remains needed
before broadening the claim.

### 5.72 Confirmatory production build for Snake V5

The development V5 run omitted build mode in its preregistration, so its results
remain labeled development-only. To resolve that confound without rewriting the
original schedule or data, this follow-up froze
`browser-snake-frame-v5-production-preregistration.json` and a matching
production source lock before collection. It repeats V5's exact five arms, four
sizes, five balanced replications per cell, 90 warmup RAFs, 300 measured
callbacks, and arm/size order. Trial IDs are prefixed `production-`; archives
are isolated under `results/v5-production/`. Vite `pnpm run build` was followed
by `pnpm run preview` through Portless at the preregistered HTTPS hostname. Each
browser record carries `collection: production` and Vite's compiled
`buildMode: production`; the archive rejects production-tagged records from a
non-production build.

All 100 page loads passed the same DOM parity, stable-node identity, visible
tab, sample count, and commit coverage contracts, for 30,000 RAF observations.
`deno task snake-frame:v5:production-manifest` verifies every schedule cell and
pins each raw record with SHA-256. The notebook rechecks both development and
production hashes and computes the table and SVGs below from raw records.

| Segments | React + Compiler | OXC CSR through VDOM | Paired ratio to React |
| -------: | ---------------: | -------------------: | --------------------: |
|       32 |     0.6 / 0.9 ms |         0.3 / 0.5 ms |                 0.50× |
|      128 |     0.4 / 0.6 ms |         0.3 / 0.5 ms |                 0.75× |
|      512 |     0.8 / 1.1 ms |         0.6 / 0.8 ms |                0.625× |
|    1,024 |     1.3 / 1.5 ms |         0.9 / 1.1 ms |                0.692× |

The first two numeric columns are median / p95 update-to-commit milliseconds,
each calculated from five page-level summaries. The ratio is the median of five
paired page-median ratios; OXC CSR was faster in all five paired pages at each
size. The production result is materially less dramatic than the development
result: React's 1,024-segment median falls from 3.7 to 1.3 ms. OXC CSR still has
higher update CPU at 512/1,024 segments (0.6/0.9 ms versus React's 0.2/0.2 ms)
and higher mount medians at those sizes (4.3/6.4 ms versus 2.9/4.1 ms).
Runtime-discovered VDOM bindings beat OXC CSR at both larger sizes. Median RAF
interval p95s remain similar at 16.8–18.2 ms, so the result does not establish
smoother presentation. Both runs use one device and a fixed-topology DOM
workload, and exclude layout, paint, GPU work, and physical presentation. A
second-device replication and end-to-end dynamic workload remain open.

Reproduce analysis with `deno task snake-frame:v5:production-manifest`,
`deno run --allow-read=research.ipynb,notebook_cells/snake_frame_v5_production_comparison.ts --allow-write=research.ipynb scripts/update_research_notebook_snake_v5_production.ts`,
then
`UV_CACHE_DIR=/private/tmp/uv-react-research-cache UV_OFFLINE=1 deno task
notebook`
(the Jupyter kernel requires loopback socket permission).

### 5.73 Columnar VDOM bindings under production frame updates: Snake V6

V6 follows the V5 production source audit. The generated scalar VDOM arm still
creates per-entity source objects, update tuples, and a generic `setSources`
batch on each frame. V6 adds compiler-bound numeric columns that map entity row
indices to stable VDOM host writers at mount. Each frame updates shared
`Float64Array` x/y columns and calls one `setColumns` batch; the implementation
skips unchanged values and does not construct per-row source tuples or generic
deduplication maps/sets. The runtime-discovered VDOM, generated scalar VDOM,
React + Compiler, and direct DOM arms all consume the same preallocated numeric
inputs.

The schedule was preregistered before collection with 128, 512, and 1,024
segments, five arms, five isolated page-load replications per cell, 90 warmup
frames, and 300 measured frames per page. The
[production preregistration](./results/browser-snake-frame-v6-production-preregistration.json),
[source lock](./results/browser-snake-frame-v6-production-source-lock.json), and
[manifest](./results/browser-snake-frame-v6-production-manifest.json) define the
frozen inputs and accepted records. The preview ran from `pnpm run build`
through Portless. The browser sequence completed all 75 pages, totaling 22,500
RAF samples. Every record passed position parity, stable host count/identity,
visibility, and complete frame coverage. One Chrome 154 profile was used at
1280×720 and device pixel ratio 2.

| Segments | Arm                   | Mount median | Update CPU median | Update-to-commit median / p95 | RAF interval p95 |
| -------: | --------------------- | -----------: | ----------------: | ----------------------------: | ---------------: |
|      128 | React + Compiler      |          1.7 |               0.1 |                     0.4 / 0.5 |             17.1 |
|      128 | Runtime VDOM          |          1.2 |               0.2 |                     0.2 / 0.3 |             17.2 |
|      128 | Generated scalar VDOM |          1.5 |               0.2 |                     0.2 / 0.3 |             17.1 |
|      128 | Columnar VDOM         |          1.7 |               0.2 |                     0.2 / 0.3 |             17.1 |
|      128 | Direct DOM            |          0.2 |               0.1 |                     0.1 / 0.2 |             17.0 |
|      512 | React + Compiler      |          2.8 |               0.1 |                     0.8 / 1.0 |             17.1 |
|      512 | Runtime VDOM          |          3.0 |               0.4 |                     0.4 / 0.6 |             17.1 |
|      512 | Generated scalar VDOM |          4.0 |               0.5 |                     0.5 / 0.6 |             17.0 |
|      512 | Columnar VDOM         |          3.9 |               0.4 |                     0.4 / 0.5 |             17.2 |
|      512 | Direct DOM            |          0.3 |               0.3 |                     0.3 / 0.5 |             17.2 |
|    1,024 | React + Compiler      |          4.1 |               0.2 |                     1.3 / 1.4 |             17.5 |
|    1,024 | Runtime VDOM          |          4.6 |               0.7 |                     0.7 / 0.9 |             17.8 |
|    1,024 | Generated scalar VDOM |          6.6 |               0.9 |                     0.9 / 1.0 |             17.4 |
|    1,024 | Columnar VDOM         |          6.3 |               0.6 |                     0.6 / 0.7 |             17.4 |
|    1,024 | Direct DOM            |          0.5 |               0.6 |                     0.6 / 0.7 |             17.6 |

All measurements are milliseconds. Across five paired replication medians,
columnar VDOM's update-to-commit ratio to React was 0.50× at 128, 512, and 1,024
segments, with 5/5 page pairs faster at each size. Its CPU median matched scalar
VDOM at the displayed precision at 128, was lower at 512 (0.4 vs 0.5 ms), and
was one-third lower at 1,024 (0.6 vs 0.9 ms). Against runtime VDOM, CPU matched
at 512 and was lower at 1,024 (0.6 vs 0.7 ms). Mount remains a material cost:
6.3 ms for columnar at 1,024 versus 4.1 ms for React. Direct DOM remains a speed
reference but does not preserve the VDOM adapter path. RAF p95 intervals
overlap; the study finds no cadence advantage and does not measure paint or
physical presentation.

**Interpretation:** V6 supports columnar compiled writers as a specialized
high-frequency path that can retain JSX and VDOM structure while reducing some
update dispatch overhead. It does not prove a universal win, nor that a
dependency DAG itself is faster. The later post-hoc notebook analysis estimates
mount-only crossover at a median of 3 updates for 512 segments and 4 for 1,024;
it excludes compile, page load, teardown, and presentation, so
teardown-inclusive lifecycle cost remains open. The sparse dirty-row browser
study and structural growth/key changes are now reported separately below; the
next V6-specific evidence is an independent-device replication with timing-floor
calibration and a teardown-inclusive cost comparison against an idiomatic React
store/selector implementation. The notebook rechecks the source lock and raw
hashes and generates SVG charts for update-to-commit, update CPU, RAF p95, and
the mount-amortization estimate.

Reproduce the manifest with
`deno run --allow-read=results --allow-write=results scripts/create_snake_frame_v6_production_manifest.ts`,
update the notebook using
`deno run --allow-read=research.ipynb,notebook_cells/snake_frame_v6_production_comparison.ts --allow-write=research.ipynb scripts/update_research_notebook_snake_v6_production.ts`,
then execute
`UV_CACHE_DIR=/private/tmp/uv-react-research-cache UV_OFFLINE=1 deno task notebook`.
Raw records are isolated in `results/v6-production/`.

### 5.74 Dirty-row density and locality mechanism sweep: Columnar Dispatch V1

The Snake V6 production matrix changed every segment every frame. V1 narrows the
next question to dispatch shape: scan all bound rows, visit an exact dirty-row
list, or scan 32-/128-row contiguous buckets. The frozen schedule covers 3 row
counts (256, 1,024, 4,096) × 6 dirty fractions (1%, 5%, 10%, 25%, 50%, 100%) × 2
locality patterns (clustered/scattered) × 4 strategies × 5 fresh Deno process
replications: 720 cases total. Each case has 30 warmup batches and 80 measured
batches. Every dirty entity changes x/y in shared `Float64Array` columns; input
mutation and synchronous retained-VDOM `MemoryVDOMHost` dispatch are timed
together. Worklist and bucket preparation are reused and excluded. This is a
runtime mechanism experiment, not a browser or React comparison.

The preregistration, source lock, raw records, source snapshot, manifest, and
replay verifier are under `results/columnar-dispatch-v1*`. The
`compiled_bindings.ts` import was omitted from the two frozen source lists, then
identified in a post-collection import audit. Its hash and pre-preregistration
modification time are captured as a supplemental dependency in the snapshot
manifests; the immutable original source locks were not rewritten.

All 720 timed cases passed final output parity, stable host identity, and exact
write-count checks. The collector did not check output after every batch,
although that check was specified in the preregistration. A separate replay
against the archived runtime therefore replayed all 79,200 warmup/measured
batches and checked every entity, host identity, and exact
two-writes-per-dirty-row contract after each. It passed 141,926,400 entity-state
checks; see `results/columnar-dispatch-v1-replay-verification.json`. This replay
does not add work to the timed measurements.

Across 180 paired process/workload cells per candidate strategy, dirty-row
dispatch had a median ratio of 0.523× against dense scanning and won 153/180.
The 32-row bucket path had a 0.857× ratio and won 118/180; the 128-row bucket
path had a 0.894× ratio and won 114/180. Exact dirty rows dominate for sparse or
scattered updates. Contiguous buckets sometimes improve clustered 25–50%
changes; at 4,096 rows and 25% clustered changes, bucket 128 measured 62.98 µs
versus 71.40 µs for exact row dispatch. Dense scans were usually best at 100%
changes; exact row lists were about 6–9% slower. The complete table and SVG
plots are in
[paper §8.6](./paper.md#86-dirty-row-density-and-locality-columnar-dispatch-v1)
and the notebook.

The important limitation is that V1 excludes worklist construction and browser
host costs. It supports a density/locality-sensitive dispatch hypothesis, not a
default scheduler policy. Next, bring exact dirty buffers and bucket scans to a
browser frame workload, include selection cost, and compare against optimized
React before deciding whether the complexity belongs in the runtime.

Reproduce by generating the schedule and source lock, running five fresh-process
replications, archiving the source snapshot and supplemental import, replaying
every batch, creating the SHA-256 manifest, and executing the Deno Jupyter
notebook. Full commands are in the README's “Reproduce the dirty column dispatch
study” section.

### 5.75 Sparse per-frame browser follow-up: Snake workload V1

The Deno mechanism study excludes worklist construction and browser DOM writes.
This preregistered production-build follow-up measures both costs against
React + Compiler. The matrix has 512 and 4,096 entities; 1%, 10%, 50%, and 100%
dirty fractions; clustered and deterministic scattered rows; and six arms:
per-entity React `useSyncExternalStore` with a synchronous commit, dense
compiled VDOM columns, exact dirty-row compiled VDOM, compiled VDOM with 32-row
or 128-row dirty buckets, and direct DOM. Three isolated visible page-load
replications per cell produce 288 pages. Each page runs 30 warmup and 60
measured `requestAnimationFrame` updates.

The measured callback includes worklist generation, changed x/y value
calculation, dispatch and host writes; React additionally includes its
synchronous commit. All arms retain a fixed DOM topology. Final coordinate
parity, node count and identity, and React commit coverage are contract checks.
The frame interval is recorded as a cadence proxy; paint and physical
presentation remain outside the measurement. The browser fixture is a
particle-like per-frame entity workload, not the full playable Snake rules.

The frozen
[preregistration](./results/snake-sparse-frame-v1-preregistration.json) defines
the schedule and analysis questions. An initial browser rehearsal exposed
duplicate expected-coordinate writes inside the timed update loop. All 69
resulting page records were rejected as a pilot and preserved under
`results/snake-sparse-frame-v1-pilot-rejected-expected-array-overhead/`; the
finding and corrective action are in
[amendment 1](./results/snake-sparse-frame-v1-amendment-1.json). The corrected
23-file [source lock](./results/snake-sparse-frame-v1-source-lock.json) was
frozen before the accepted run restarted. Earlier arm and size smoke pages
remain separately preserved in `results/snake-sparse-frame-v1-smoke/`.

The accepted serial collection completed all 288 preregistered production pages
(sequences 0–287), with 30 warmup and 60 measured RAF updates per page. The
[manifest](./results/snake-sparse-frame-v1-manifest.json) passed its schedule
balance, source snapshot/current file hashes, raw page hashes, profile
consistency, measured-frame count, and per-page contracts: 17,280 measured
callbacks total. All final output parity, stable-node identity, and React
commit-coverage checks passed. The archived source lock and rejected pilot
remain intact.

The notebook now reports both the preregistered page-median and page-p95
update-plus-commit measures, as well as RAF interval p95. Its initial analysis
showed a median paired ratio to React of 0.409× for dense VDOM, 0.453× for exact
dirty rows, 0.444× for 32-row buckets, 0.412× for 128-row buckets, and 0.333×
for direct DOM; each candidate was nominally faster in 48/48 paired pages. Those
all-workload ratios include timing values at 0 and 0.1 ms: between 7 and 592 of
the 2,880 samples per arm were exactly 0, depending on arm. The timing clock was
not separately calibrated, so these near-zero observations are censored and the
full-matrix ratios are not precise effects. An explicitly exploratory
sensitivity slice at 4,096 rows and 10–100% dirty, keeping only pairs where both
page medians exceeded 0.1 ms, retained 18 pairs per arm; candidate ratios were
0.422–0.491× and each candidate was lower in 18/18. This slice was selected
after collection and is descriptive, not the preregistered primary result.

The observed strategy reversal agrees with the Deno mechanism study but includes
browser worklist construction and real DOM writes. At 4,096 scattered entities
and 50% dirty, median update-plus-commit times were 3.8 ms for React, 1.5 ms for
dense VDOM, 2.6 ms for exact dirty rows, 1.95 ms for 32-row buckets, 1.6 ms for
128-row buckets, and 1.9 ms for direct DOM. At 100% scattered, dense VDOM
measured 2.6 ms and exact dirty rows 4.1 ms. Thus the browser follow-up rejects
exact dirty rows as a universal sparse-update policy. RAF interval p95 remained
about 33–35 ms across arms at 4,096 rows and 50–100% dirty, so lower update cost
did not produce a cadence improvement in this run.

The first notebook execution completed 70 Deno code cells; after review found
that the notebook did not display the preregistered update-p95 metric, the
analysis cell was updated to include a page-p95 table and plots, timing-floor
counts, and an explicitly labeled above-floor sensitivity slice. The notebook
was then re-executed successfully (70 cells; six SVG charts for update medians,
update p95, and RAF p95 at both sizes). A subsequent post-hoc analysis added a
fourth V6 chart for mount amortization; it estimates the number of repeated
updates needed to offset a page's mount-time difference and does not include
teardown, page load, compilation, or presentation. Only analysis code changed
after the measurement source lock; no timed harness or raw record was changed.
The next gate is a second physical device with explicit timing calibration,
followed by dynamic topology and teardown-inclusive lifecycle-cost studies.

### 5.76 Browser structural phase profile: Experiment AP diagnostic

The accepted Experiment AP v4 summary shows that the current keyed structural
path loses to React on median update time, especially for filter/restore. An
exploratory diagnostic was added to explain that result. It preserves the same
10,000-row harness and emits one raw phase-profile file separately from the
primary v4 browser record. The collector records click-to-microtask-settle time,
runtime `root.flush`, paired time outside that flush, path markers, and timers
for the keyed-owner phases and the full-reconcile fallback. Diagnostic callbacks
add overhead, so these numbers are not mixed with the accepted AP medians.

The initial visible Chrome 154 run used seed `83001046`, 24 measured pairs per
operation, and one MacIntel device (10 hardware threads, DPR 2). All output,
host identity, and child-state checks passed. It appeared to take the keyed
owner path 23/24 times per operation and fully reconcile once each. A follow-up
profile (seed `83001048`) recorded two dirty owners and two changes on each
fallback; the multi-owner partial-commit path bailed because one changed owner
had a nested subtree. Source inspection traced the extra owner to setup:
`mountScenario` clicked row 0 to establish retained local state but did not
await the runtime's queued commit before entering the shuffled structural loop.
Thus that setup update could be batched with whichever operation ran first. The
previously reported fallback latencies and phase costs remain preserved in the
raw records but are setup-contaminated and should not be interpreted as ordinary
structural fallback behavior.

The harness now awaits the initial row-state commit before timing. In corrected
profile seed `83001051`, all 72 measured operations had one dirty owner and one
change, and all 72 took the keyed structural-owner path. The diagnostic medians
for rotate / edge replacement / half filtering were 13.9 / 12.6 / 25.7 ms total,
12.0 / 11.2 / 16.7 ms in `root.flush`, 5.9 / 5.4 / 3.6 ms in owner
expansion/cache, and 2.1 / 1.8 / 7.6 ms in host reconciliation. These are
one-page Chrome 154 diagnostic timings with instrumentation overhead and
overlapping scopes. A separate uninstrumented follow-up (seed `83001050`) also
passed parity, keyed identity, and retained-state checks; its page medians were
React/runtime 26.6/13.3 ms for rotate, 27.4/13.7 ms for edge replacement, and
44.9/40.3 ms for half filtering. This single follow-up does not replace or
overturn the 216-pair AP v4 comparison; it only confirms the corrected harness
runs and the old fallback observation was caused by setup batching.

A new v7 counter profile (seed 83001052) measures work separately from phase
timing. Its 24 half-filter samples contain 14 shrinks and 10 restores because
pair order is shuffled. On shrink, key-index maintenance traversed a median of
20,004 old plus 10,004 new host-tree nodes; on restore, it traversed 10,004 old
plus 20,004 new. Rotation traversed 20,004 old and 20,004 new nodes despite one
host move. These are mechanism-level counts from one instrumented page, not
proof of the AP timing gap's cause.

The VDOM was then changed to update the key index from reconciliation's subtree
attach/detach events rather than rescanning the whole target region. VDOM tests,
including a new delta-index regression case, pass. In v8 (seed 83001053),
rotation recorded zero index visits, edge replacement recorded two detached and
two attached nodes, shrink recorded 10,000 detach visits, and restore recorded
10,000 attach visits. The sample contained 11 shrinks and 13 restores; pooled
filter timing therefore mainly reflects restore. Owner visits remain 10,000 for
rotation/restore and 5,000 for shrink. This demonstrates the intended work-count
reduction while keeping index membership correct, not a replicated performance
win.

A separate uninstrumented page (seed 83001054) passed output parity, keyed
identity, and retained-state checks. Its runtime/React medians were 10.5/25.3 ms
for rotation, 10.5/24.5 ms for edge replacement, and 28/37 ms for pooled
filtering. Direction is recoverable from the seed and deterministic shuffled
schedule, and the reconstruction matches v8's diagnostic owner-created/retired
counters. The 13 shrink samples have React/runtime medians of 19.2/24.7 ms and a
median paired difference (React−runtime) of −3.5 ms; the 11 restore samples have
medians of 38.6/38.6 ms and paired difference +3.3 ms. Thus the pooled medians
hide a directional pattern: the runtime loses on shrink and has a modest paired
advantage on restore in this one page. These retrospective estimates remain
descriptive, use only 13 and 11 updates, and cannot establish a general speedup
or replace the 216-pair AP v4 result. The next experiment must directly label
direction, compare baseline versus delta index over preregistered fresh pages,
and include mount and teardown. Reproduce diagnostics at
https://react-runtime-snake.localhost:1355/component-state-structural-phase-diagnostic.html?diagnostics=1&autorun=1&seed=83001053;
reproduce the separate primary follow-up at
https://react-runtime-snake.localhost:1355/component-state-structural-benchmark.html?autorun=1&seed=83001054.
See the
[v7 baseline profile](./results/browser-component-state-structural-profile-v7-83001052.json),
[v8 delta-index profile](./results/browser-component-state-structural-profile-v8-83001053.json),
[v8 diagnostic timing record](./results/browser-component-state-structural-v4-83001053.json),
[uninstrumented follow-up](./results/browser-component-state-structural-v4-83001054.json),
and earlier
[corrected profile](./results/browser-component-state-structural-profile-v6-83001051.json),
[initial profile](./results/browser-component-state-structural-profile-v5-83001046.json),
and
[gate-reason profile](./results/browser-component-state-structural-profile-v6-83001048.json).

### 5.77 Key-index maintenance mechanism study

**Question.** Does maintaining the global keyed VDOM index incrementally from
reconciliation attach/detach events reduce structural update time compared with
rescanning the old and new keyed subtree after each commit?

**Protocol.** The frozen schedule uses five fresh visible pages on one Chrome
154 MacIntel profile. Each page compares three arms: React + Compiler (context
only), the same VDOM reconciler with the prior subtree-rescan index algorithm,
and that reconciler with delta index maintenance. The fixture has 10,000 rows;
each operation has eight warmups and 24 measured pairs. Operations are rotate,
edge replacement, and filter, with filter direction explicitly balanced at 12
shrinks and 12 restores. The page is the replication unit. Contracts require
output parity, stable host identity, reinsertion identity, and an empty
container after teardown. No performance-based exclusions were allowed. See the
frozen
[preregistration](./results/key-index-maintenance-v1-preregistration.json).

**Result.** Across the five page medians, delta maintenance was faster on every
page for rotation (7.90 ms rebuild vs 5.95 ms delta; median paired difference
1.90 ms) and edge replacement (7.85 vs 6.05 ms; 1.85 ms), on four pages for
shrink (8.85 vs 7.80 ms; 0.80 ms), and every page for restore (12.55 vs 11.25
ms; 0.55 ms). Paired median ratios rebuild/delta were 1.32×, 1.31×, 1.10×, and
1.05×. React context medians were 25.10, 24.40, 17.95, and 31.00 ms,
respectively; React is not the causal control in this experiment.

A lifecycle-inclusive filter episode adds each arm's single mount and teardown
observation to the 24 updates. Delta's median saving across pages was 20.1 ms,
with four positive pages and one −97.5 ms page caused by a 105.8 ms delta mount
overhead. The outlier remains included. This one-observation lifecycle measure
is descriptive and not a robust break-even estimate.

**Interpretation and limits.** The within-reconciler comparison supports delta
key-index maintenance as a local structural optimization, with measured update
gains matching the reduced index traversal mechanism. It does not explain all
owner traversal/reconciliation cost and does not erase the broader stateful
keyed benchmark's losses to React. It is one device/browser profile, excludes
component-local state and presentation, and reports five page replications. The
notebook validates a SHA-256 manifest over the preregistration and all five raw
records, then emits inline SVG plots. Files:
[manifest](./results/browser-key-index-maintenance-v1-manifest.json),
[page 83002001](./results/browser-key-index-maintenance-v1-83002001.json),
[page 83002002](./results/browser-key-index-maintenance-v1-83002002.json),
[page 83002003](./results/browser-key-index-maintenance-v1-83002003.json),
[page 83002004](./results/browser-key-index-maintenance-v1-83002004.json), and
[page 83002005](./results/browser-key-index-maintenance-v1-83002005.json).
Reproduction commands are in
[README](./README.md#reproduce-the-key-index-maintenance-study).

### 5.78 Stateful keyed structural updates after delta index integration

**Question.** Does delta key-index maintenance carry its mechanism-level
improvement into a keyed list where each row owns local state, and does it close
the gap to React + Compiler?

**Protocol.** Five fresh visible production-build pages compare React 19.3 +
React Compiler, the component-state runtime with the prior keyed-subtree index
rebuild, and the same runtime with delta index maintenance. Each page uses
10,000 keyed stateful rows and runs rotate, edge replacement, and alternating
half-filter operations. Each operation has eight warmups followed by 24 measured
pairs. Pair order across the three arms is randomized, with all six arm
permutations occurring exactly four times among measured pairs. Filter samples
record direction and contain 12 shrinks and 12 restores. The page is the
replication unit.

The first draft randomized warmups together with measured updates.
Out-of-schedule smoke pages exposed interleaved warmups and an 11/13 filter
split; they were not accepted. Amendment AMD-1 fixed the phase order before any
scheduled page ran, preserved the initial protocol at
[pre-amendment snapshot](./results/component-state-structural-index-v1-preregistration-pre-amendment.json),
and recorded the correction in the
[amended preregistration](./results/component-state-structural-index-v1-preregistration.json).
A later out-of-schedule archive smoke is retained separately under
`results/component-state-structural-index-v1-pilot/`. The
[source lock](./results/component-state-structural-index-v1-source-lock.json)
pins the benchmark, runtime, generated component fixture, compiler/build
configuration, and preregistration before collection.

All five scheduled pages passed output parity, keyed identity,
removal/reinsertion identity, local-state retention, and empty teardown checks.
The collection-time manifest records source hashes, raw-page hashes, sample IDs,
balanced arm orders, and filter directions:
[manifest](./results/component-state-structural-index-v1-manifest.json). The
later
[source-drift audit](./results/component-state-structural-index-v1-source-drift-audit.json)
verifies the five accepted raw pages and reports eight of 26 inputs now differ.
An exact old `jsx_binding_runtime.ts` copy is present in another study snapshot;
exact copies of seven other changed inputs were not found in the workspace. The
notebook checks the immutable manifest and raw records, then reports this source
limitation before analysis.

| Operation        | React median | Rebuild median | Delta median | Median paired difference (rebuild − delta) | Median paired ratio | Delta faster |
| ---------------- | -----------: | -------------: | -----------: | -----------------------------------------: | ------------------: | -----------: |
| Rotation         |      5.20 ms |       13.70 ms |     12.00 ms |                                    1.90 ms |              1.166× |    5/5 pages |
| Edge replacement |      4.90 ms |       14.55 ms |     12.60 ms |                                    1.75 ms |              1.137× |    5/5 pages |
| Filter shrink    |      7.40 ms |       22.70 ms |     22.55 ms |                                    3.60 ms |              1.187× |    4/5 pages |
| Filter restore   |     11.85 ms |       41.25 ms |     39.85 ms |                                    1.75 ms |              1.045× |    5/5 pages |

Update summaries take the median of five page-level medians or paired page
summaries. The paired-difference column is computed from sample-by-sample
rebuild-minus-delta values within each page, then summarized across pages; due
to median nonlinearity, it need not equal the difference between the displayed
arm medians. React was faster than both runtime arms on every page median and
operation. Delta therefore improves the runtime's keyed structural path but does
not beat React end to end. This weakens the hypothesis that key-index rescanning
alone explains the React gap. The experiment includes component execution and
keyed VDOM reconciliation but does not phase-profile the accepted latency pages,
so broad owner discovery/expansion, reconciliation, host commits, and other
runtime costs remain unresolved.

The filter lifecycle total combines one mount and teardown observation with all
24 updates. Rebuild-minus-delta savings were +108.3, −105.4, +50.7, +112.1, and
+6.8 ms across the five pages: median +50.7 ms, four pages favoring delta. The
spread is large and lifecycle timings have one observation per arm/page, so this
is descriptive rather than a break-even claim. Direction-level p95s are also
noisy with only 12 observations per direction. One Chrome/device profile; timing
stops at DOM commit, excluding layout, paint, and display presentation.

The notebook renders page-level paired differences and React/rebuild/delta
update summaries as inline SVG. Reproduce manifest validation with
`deno run --allow-read=. --allow-write=results scripts/create_component_state_index_v1_manifest.ts`,
regenerate the notebook cells with
`deno run --allow-read=research.ipynb,notebook_cells/component_state_index_v1.ts --allow-write=research.ipynb scripts/update_research_notebook_component_state_index_v1.ts`,
then execute
`UV_CACHE_DIR=/private/tmp/uv-react-research-cache UV_OFFLINE=1 deno task notebook`.
Raw pages:
[83003001](./results/component-state-structural-index-v1/browser-component-state-structural-index-v1-83003001.json),
[83003002](./results/component-state-structural-index-v1/browser-component-state-structural-index-v1-83003002.json),
[83003003](./results/component-state-structural-index-v1/browser-component-state-structural-index-v1-83003003.json),
[83003004](./results/component-state-structural-index-v1/browser-component-state-structural-index-v1-83003004.json),
and
[83003005](./results/component-state-structural-index-v1/browser-component-state-structural-index-v1-83003005.json).

### 5.79 Exploratory V8 structural owner-expansion profile

**Question.** After delta index maintenance removed key-index scans from reorder
and reduced them for edge replacement, which remaining runtime phases and work
counts are largest in the 10,000-row stateful keyed fixture?

**Protocol.** Five visible Chrome 154 MacIntel diagnostic pages ran 8 warmups
and 24 measured pairs for rotation, edge replacement, and half-list filtering.
Diagnostic phase callbacks and host/owner work counters were enabled. Filter
directions were classified from each sample's owner creation/retirement
counters, not inferred from sample parity; page schedules contained 9–14 shrink
samples and 10–15 restore samples. The runs use the dev server and delta-index
runtime as they existed at collection; they are exploratory, have no
preregistration or independent device/profile replication, and timings include
diagnostic overhead. The immutable multi-page post-collection manifest records
hashes for the five records and 15 source inputs:
[manifest](./results/component-state-structural-profile-v8-83004001-83004005-manifest.json).

**Result.** Across five page-level medians (median [range]), rotation total
timing was 11.00 [10.30, 11.15] ms; owner expansion/cache was 5.45 [5.30, 5.55]
ms, VDOM normalization 0.40 [0.30, 0.40] ms, and host reconciliation 1.50 [1.50,
1.55] ms. Every page visited and reused 10,000 row owners to make one host move;
key-index visits were zero. Edge replacement had 11.20 [10.80, 11.35] ms total,
5.50 [5.45, 5.60] ms expansion/cache, 0.40 ms normalization, and 1.50 ms
reconciliation; every page recorded 10,000 owner visits, 9,999 cache reuses,
three host insert/remove operations, and four key-index visits. This identifies
owner expansion/cache as a broad cost remaining after key-index work is removed.

Filtering has a different shape. Shrink measured 23.90 [21.80, 24.10] ms median
total, 3.30 [3.20, 3.40] ms owner expansion/cache, and 6.90 [6.80, 8.10] ms host
reconciliation; every page retired 5,000 owners and removed 5,000 host nodes.
Restore measured 41.50 [39.10, 47.80] ms total, 9.80 [9.35, 11.00] ms
expansion/cache, and 10.50 [10.05, 11.20] ms reconciliation; every page visited
10,000 owners, created 5,000, reused 5,000, and performed 10,000 host
insertions. The outside-root-flush interval is not attributed by runtime hooks;
its page medians were 9.70 [7.80, 10.60] ms for shrink and 16.90 [11.95, 19.60]
ms for restore.

**Interpretation and limits.** A reorder/edge update still performs O(n) owner
traversal and cache propagation when the desired host change is O(1). This makes
compiled keyed-owner reuse a stronger next hypothesis than another key-index
optimization. Filter cost includes thousands of required host operations, so its
profile should be treated separately. The timing data has profiler overhead and
overlapping phase scopes; it is not compared with React and does not establish
causal phase percentages. The five pages share one browser profile and device,
and the results are pinned after collection rather than preregistered. The
[source-drift audit](./results/component-state-structural-profile-v8-source-drift-audit.json)
verifies all five raw profile hashes and preserves the original 15 source
hashes: six inputs still match and nine differ, including six runtime/build
sources, `deno.json`, and the revised analysis cell/updater. An exact old
`jsx_binding_runtime.ts` is recoverable from other study snapshots; exact copies
of the other five changed runtime/build files were not found. The summaries
reproduce from the saved records, but the measured implementation cannot be
reconstructed completely. The notebook classifies filter direction from work
counters and creates an SVG phase chart. See
[the aggregate table and limits](./paper.md#811-exploratory-owner-expansion-and-reconciliation-profile)
and raw records
[83004001](./results/browser-component-state-structural-profile-v8-83004001.json),
[83004002](./results/browser-component-state-structural-profile-v8-83004002.json),
[83004003](./results/browser-component-state-structural-profile-v8-83004003.json),
[83004004](./results/browser-component-state-structural-profile-v8-83004004.json),
and
[83004005](./results/browser-component-state-structural-profile-v8-83004005.json).
Re-run the audit with
`deno run --allow-read=. --allow-write=results scripts/audit_component_state_structural_profile_v8_sources.ts`,
regenerate the notebook cell with
`deno run --allow-read=research.ipynb,notebook_cells/component_state_structural_profile_v8.ts --allow-write=research.ipynb scripts/update_research_notebook_component_state_structural_profile_v8.ts`,
then execute
`UV_CACHE_DIR=/private/tmp/uv-react-research-cache UV_OFFLINE=1 deno task notebook`.

# 2026-10-11 — 5.80 Preregistered compiler-marked keyed-owner reuse

**Question.** Can a compiler-marked same-key-set update skip per-row component
expansion in the stateful 10,000-row fixture, without making membership changes
slower?

**Protocol and collection.** The initial preregistration and pre-latency
amendment were frozen before these five pages. The causal comparison is generic
owner expansion versus keyed-owner reuse in the same `ComponentStateRoot` and
retained VDOM; React 19.3 + React Compiler is contextual. Five fresh, visible
Chrome 154 production-preview loads on one MacIntel profile (10 hardware
threads, DPR 2) ran 8 warmup pairs and 24 measured pairs per operation. Each of
the six arm orders appeared four times. Filter shrink and restore were balanced
12/12 and analyzed separately. All five latency records passed output, host
identity, state retention, status, and archive contracts; a separate seed
83005001 diagnostic pass recorded work counters. The
[manifest](./results/component-state-owner-reuse-v1-manifest.json) pins all 21
source/build inputs and hashes the five raw latency records and diagnostic
record. Those inputs were copied before V2 work into a separately hash-verified
[historical source snapshot](./results/component-state-owner-reuse-v1-source-snapshot-manifest.json).

| Operation        | React median | Generic median | Reuse median | Paired ratio, reuse/generic | Reuse wins |
| ---------------- | -----------: | -------------: | -----------: | --------------------------: | ---------: |
| Rotation         |      5.10 ms |       10.75 ms |      6.15 ms |                       0.564 |        5/5 |
| Edge replacement |      4.20 ms |       10.70 ms |     12.70 ms |                       1.179 |        0/5 |
| Filter shrink    |      7.65 ms |       19.20 ms |     20.15 ms |                       1.041 |        2/5 |
| Filter restore   |     12.15 ms |       39.55 ms |     38.35 ms |                       0.980 |        4/5 |

Displayed arm times are medians of five page medians; paired ratios are medians
of page-level medians of paired ratios. Samples are not pooled. The frozen
primary rotation gate (≤0.80 on at least four pages) passed on 5/5 pages, with
ratios from 0.519 to 0.591. The mechanism gate passed: diagnostic rotation
records show 10,000 generic owner visits versus zero for the reuse path and
10,000 keyed-cache hits in every measured pair. The edge/filter fallback
guardrail failed because edge replacement's ratio was 1.179, above the frozen
1.10 ceiling; shrink and restore passed separately. The diagnostic pass confirms
one keyed-region fallback for each membership-changing update and the same
generic component-visit count, but does not attribute the edge penalty to one
timed phase.

**Interpretation.** Reuse delivers a substantial local gain over generic owner
expansion on same-key rotation, but it still trails React + Compiler (6.15
versus 5.10 ms), and edge replacement is slower than generic (12.70 versus 10.70
ms). This does not establish that the runtime beats React on structural updates.
It supports a shape-specific fast path only if eligibility validation does not
push invalid shapes outside the fallback budget. Next compare current key-set
validation with a compiler/runtime version token, and preserve the frozen
fallback threshold for a follow-up.

**Reproduction wrinkle.** The registered Deno manifest task lacked read
permission for two files included in the frozen lock. The manifest was created
with the same script and additional `--allow-read=scripts`; the locked
benchmark/runtime sources were not edited after collection. README records the
explicit command. This task-level permission issue should be repaired in a
future collection branch before source lock creation, not by rewriting this
study's lock.

The notebook cell verifies the source lock, protocol/manifest/raw hashes,
pair/order balance, parity, identity, and state contracts, reports each page
separately, checks diagnostic fallback/rotation counters, applies the frozen
gates, and renders SVG charts. See
[paper §8.12](./paper.md#812-preregistered-keyed-owner-reuse-study), the
[manifest](./results/component-state-owner-reuse-v1-manifest.json), and raw
records for
[latency seeds 83005001–83005005](./results/component-state-owner-reuse-v1/latency/)
plus
[diagnostic seed 83005001](./results/component-state-owner-reuse-v1/diagnostic/browser-component-state-owner-reuse-v1-83005001.json).

# 2026-10-11 — 5.81 Preregistered keyed-region version-token follow-up

**Motivation.** V1 removes 10,000 generic owner expansions on a stable-key
rotation, but its treatment still scans each row to prove uniqueness, owner
identity, cache presence, and shallow-prop equality. That path remains slower
than React + Compiler. On edge replacement, it pays the scan and then falls
back, measuring 1.179× the generic runtime and failing V1's 1.10 guardrail.

**Frozen question.** Can an opaque compiler/runtime-produced region version
token certify that keys and rendered row data are unchanged, letting the runtime
skip those per-row eligibility checks, beat React + Compiler on rotation, and
bail to ordinary generic expansion before visiting rows when membership changes?

**Protocol.** The
[V2 preregistration](./results/component-state-owner-reuse-v2-preregistration.json)
is frozen before implementation. It defines four arms: React 19.3 + React
Compiler, generic owner expansion, V1 checked reuse, and V2 token reuse. All
arms receive the same persistent keyed-sequence values and operations; the
sequence update cost is included and shared. The token persists through pure
rotation and changes for membership or rendered-row-data edits. It is opaque and
compiler/runtime-owned, not a user boolean. Token equality skips per-row
uniqueness checks, owner-world lookups, cache checks, and shallow-prop checks;
the treatment assembles the next keyed order from the retained key-to-output
directory. Mismatch should be detected before visiting region rows, then take
the generic path.

Five fresh visible production pages use 10,000 rows, eight warmups, and 24
paired samples per operation. All 24 four-arm orders appear once per
operation/page. Filter directions split 12/12. The product gate requires
V2/React paired rotation ratio ≤0.90 on at least four pages; the runtime gate
requires V2/generic ≤0.50 on at least four. Edge replacement and each filter
direction must remain within the prior 1.10 guardrail. A separate diagnostic
pass must verify fast-path hits and early mismatch behavior. Any identity,
state, effect, or output discrepancy rejects the optimization regardless of
timing. The physical-device profile, seeds 83005101–83005105, exclusions, and
interpretation rules are recorded in the frozen JSON.

**Result.** The V2 implementation, amended protocol, source lock, byte-verified
source snapshot, five latency pages, and separate diagnostic page are complete.
The source lock freezes 30 inputs before latency collection. All five visible
pages passed parity, host identity, child-state retention, archive, and
balanced-order checks; each page used 24 paired samples per operation and all 24
four-arm permutations once per operation/page. Filter directions were balanced
12/12. Amendment 04 fixed stale cached output after local child state changed
before a token-preserving reorder; amendment 05 fixed archive validation that
had sorted permutations before counting them.

| Operation        |    React |  Generic | V1 checked | V2 token | V2/React paired ratio | V2/generic paired ratio | Gate                        |
| ---------------- | -------: | -------: | ---------: | -------: | --------------------: | ----------------------: | --------------------------- |
| Rotation         |  7.50 ms | 11.50 ms |    6.50 ms |  5.05 ms |                 0.688 |                   0.450 | Both primary gates pass 5/5 |
| Edge replacement |  6.60 ms | 11.85 ms |   13.40 ms | 13.40 ms |                 2.113 |                   1.143 | **Fail**, over 1.10 ceiling |
| Filter shrink    |  9.70 ms | 21.70 ms |   21.85 ms | 23.00 ms |                 2.458 |                   1.081 | Pass                        |
| Filter restore   | 14.65 ms | 44.30 ms |   43.95 ms | 45.50 ms |                 3.068 |                   1.021 | Pass                        |

The token path clears both preregistered rotation gates, including beating
React + Compiler and reducing generic-runtime time by at least 50% on all five
pages. The edge replacement guardrail fails on all pages; the overall
preregistered result is **FAIL**. The mechanism diagnostic recorded 240,000
rotation token hits and cached-output reuses with no per-row eligibility visits.
Membership changes each produced one token mismatch, one generic fallback, and
no per-row eligibility checks before fallback. The diagnostic data do not
phase-attribute the edge penalty.

**Interpretation and limits.** The token is promising for pure key rotation, but
does not make the general structural path safe to replace: edge fallback remains
slower than generic and React is faster on edge replacement and both filter
directions. Keep the generic keyed reconciler as the correctness path; retain
token reuse as a narrow shape-gated experiment until the edge guardrail passes
and the effect replicates independently. All latency pages share one Chrome 154
MacIntel profile and stop at host commit, excluding layout, paint, and
presentation. The
[analysis](./results/component-state-owner-reuse-v2-analysis.json),
preregistration, amendments, source lock, source snapshot, and raw records are
linked in the paper's
[§8.13](./paper.md#813-preregistered-keyed-region-version-token-follow-up). The
notebook checks the archived bytes and gates and emits SVG charts.

# 2026-10-11 — 5.82 Exploratory owner-reuse fallback phase profile

**Question.** The V2 browser diagnostic verifies that a changed token mismatches
before row eligibility visits, but the latency study shows edge replacement at
1.143× generic. Which runtime phases remain larger on the fallback path?

**Protocol.** This post-collection diagnostic uses `MemoryVDOMHost` to compare
generic expansion, V1 checked reuse, and V2 token fallback for a single edge
replacement in a 10,000-row keyed stateful list. Five fresh Deno processes each
mount three independent roots, seed a child-local state value, run eight warmups
and 12 balanced paired updates per arm, and collect runtime phase
callbacks/counters. Every sample checks output parity, retained host identity,
and child state. The
[manifest](./results/component-state-owner-reuse-v2/fallback-phase-diagnostic-manifest.json)
hashes five raw records and eight harness/runtime inputs. This does not alter
V2's frozen 30-file latency source lock.

| Phase              |    Generic median (range) | Checked reuse median (range) |      Token median (range) | Paired token − generic median (range) |
| ------------------ | ------------------------: | ---------------------------: | ------------------------: | ------------------------------------: |
| Owner render/key   |    0.818 (0.807–0.838) ms |       0.817 (0.807–0.839) ms |    0.818 (0.810–0.823) ms |              −0.002 (−0.015–0.003) ms |
| Owner expand/cache |    6.377 (6.311–7.012) ms |       8.628 (8.325–9.262) ms |    8.214 (7.778–8.639) ms |             +1.796 (+1.361–+1.911) ms |
| VDOM normalize     |    0.502 (0.471–0.640) ms |       0.743 (0.702–0.796) ms |    0.769 (0.752–0.813) ms |             +0.261 (+0.173–+0.281) ms |
| Host reconcile     |    2.172 (2.131–2.548) ms |       2.600 (2.501–2.689) ms |    2.604 (2.476–2.661) ms |             +0.307 (+0.113–+0.473) ms |
| Root flush         | 11.895 (11.036–11.949) ms |    14.318 (14.060–14.945) ms | 14.158 (13.249–14.434) ms |             +2.251 (+1.988–+2.916) ms |

Values are medians/ranges of five process-level medians. The token mismatch is
cheaper than V1 checked validation in owner expansion, but remains slower than
generic. All five processes pass output, host-identity, and state-retention
checks. These phases are instrumented and not guaranteed additive; the memory
host excludes browser DOM behavior, no React arm is present, and profile
callbacks add overhead. This supports further inspection of fallback
expansion/cache work but does not prove that rebuilding
`outputsByKey`/`keysByOwner` causes the browser latency gap. The
[V3 staged delta-cache follow-up](./results/component-state-owner-reuse-v3/delta-profile-manifest.json)
tests incremental keyed-cache maintenance with a following same-key rotation and
child-local state update. Its result and limitations are reported in the next
entry. The
[notebook cell](./notebook_cells/component_state_owner_reuse_v2_fallback.ts)
verifies the source/raw hashes and plots SVG medians; reproduce using the
commands in the README's V2 fallback diagnostic section.

# 2026-10-11 — 5.83 Exploratory staged token-cache delta diagnostic

**Question.** Does staging changed keyed cache entries avoid enough work on
token fallback to matter, while preserving the next same-key rotation fast path?

**Protocol.** The preregistered
[V3 diagnostic](./results/component-state-owner-reuse-v3/delta-profile-preregistration.json)
compares generic expansion, token fallback with full keyed-map construction, and
token-delta fallback on a `MemoryVDOMHost` with 10,000 keyed stateful rows. Five
fresh Deno processes each run 8 warmup pairs and 12 balanced measured
edge-replacement-then-rotation pairs per arm. The 11-input
[source lock](./results/component-state-owner-reuse-v3/delta-profile-source-lock.json)
was verified before starting fresh processes. The post-collection
[manifest](./results/component-state-owner-reuse-v3/delta-profile-manifest.json)
verifies all five raw record hashes and per-sample correctness/counter
contracts.

**Results.** Median of five process-level medians (range): edge
`owner.expand-and-cache` is 6.170 (6.137–6.343) ms generic, 8.091 (7.760–8.412)
ms token, and 7.486 (7.333–7.840) ms token-delta. Edge `root.flush` is 10.941
(10.435–11.391), 13.730 (13.510–14.254), and 13.440 (13.056–13.792) ms,
respectively. The following rotation has total `root.flush` of 10.435
(10.095–10.809) ms generic, 3.355 (3.237–3.435) ms token, and 3.389
(3.306–3.623) ms token-delta. The median of the five paired expansion/cache
improvement shares is 26.3%, passing the preregistered 25% H1 threshold; the
paired next-rotation flush ratio is 1.021×, passing H2's 1.10 maximum. H3
passes: every edge records one owner removal and one each output/owner upsert;
the source-locked commit path deletes the corresponding output key; every
following rotation records 10,000 token hits and reuses. All measured samples
preserve output parity, surviving keyed-host identity, and the row-5000 local
state.

**Interpretation.** Delta maintenance trims some fallback work, but edge flush
remains 1.23× generic in this memory-host profile. The evidence supports
incremental map maintenance as a small contributor, not the structural fix; it
does not establish an end-to-end speedup, compare with React, or alter V2's
production **FAIL**. The profile is instrumented, phases are not additive, and
browser DOM/layout/paint are absent. The Jupyter cell checks the pre-collection
source hashes and post-collection data hashes and renders SVG. Reproduce by
verifying the lock, running
`scripts/profile_component_state_owner_reuse_v3_delta.ts` separately with
arguments 1–5, creating the manifest, regenerating the cell, and executing
`UV_CACHE_DIR=/private/tmp/uv-react-research-cache UV_OFFLINE=1 deno task notebook`;
full commands are in
[paper §8.13](./paper.md#813-preregistered-keyed-region-version-token-follow-up).

# 2026-10-11 — 5.84 Preregistered V3 production-browser follow-up

**Question.** Does staged keyed-cache delta maintenance preserve the same-key
rotation gain in a production browser, and does it beat a verified React
Compiler baseline while keeping membership-change fallback within the generic
runtime budget?

**Protocol correction.** The implementation smoke found that rotating the whole
sequence moves selected `row-0` to the tail; replacing the literal final key on
the next pair deleted the stateful sentinel, invalidating the child-state
retention check even for React. Before data collection,
[amendment 1](./results/component-state-owner-reuse-v3/browser-preregistration-amendment-1.json)
changed each edge replacement to target the final non-sentinel key. The smoke
seed 83005300 is excluded and not archived. All five production pages ran with
the corrected implementation. A dedicated Vite build selected `ReactApp` and
`ReactRow` for React Compiler target 19 and emitted compiler-runtime
import/memo-cache evidence; this addresses a comparison gap in the frozen V2
page, whose filename is not in `vite.config.ts`'s compiler selector.

The dedicated
[19-input source lock](./results/component-state-owner-reuse-v3/browser-source-lock.json)
froze the corrected harness, amendment, compiler build configuration, runtime,
dependency lockfiles, and four build assets before collection. Five fresh
visible Chrome 154 / MacIntel pages each ran 10,000 keyed rows, eight warmups,
and 24 measured edge-then-rotation pairs. Page load is the replication unit, and
all five records pass parity, host-identity, and selected-child-state gates. The
[post-collection manifest](./results/component-state-owner-reuse-v3/browser-manifest.json)
hashes all raw records and reports gate counts.

**Results.** Medians below are the median of five page-level medians; paired
ratios use page-level paired-ratio medians.

| Operation         | React + verified Compiler |  Generic |    Token | Token-delta | Delta/generic | Delta/React | Gate status                        |
| ----------------- | ------------------------: | -------: | -------: | ----------: | ------------: | ----------: | ---------------------------------- |
| Edge replacement  |                   3.50 ms | 11.00 ms | 12.50 ms |    12.05 ms |        1.077× |      3.329× | Generic ceiling passes 4/5         |
| Same-key rotation |                   3.60 ms | 10.80 ms |  4.75 ms |     4.70 ms |        0.442× |      1.343× | Runtime passes 5/5; React gate 0/5 |

The overall preregistered decision is **FAIL**: the edge fallback and
rotation-versus-generic gates pass, while rotation-versus-React Compiler fails
every page. Delta maintenance improves edge time over the token variant by only
about 3.6% at the median and remains slower than generic. The production browser
confirms that token reuse can accelerate this same-membership rotation relative
to the prototype's generic expansion, but does not beat React Compiler or make
the general structural runtime faster. This justifies an opt-in shape-specific
fast path for more study, not a default reconciler change. Timing ends at host
commit; layout, paint, display presentation, and cross-device behavior remain
unmeasured.

The notebook cell verifies the 19 frozen source inputs, four production assets,
React Compiler evidence, five raw hashes, correctness gates, and manifest
summaries before rendering SVG. Reproduce the post-collection analysis and
notebook using the commands in
[paper §8.13](./paper.md#813-preregistered-keyed-region-version-token-follow-up).
Raw browser records are under
`results/component-state-owner-reuse-v3/browser-production/`.

# 2026-10-11 — 5.85 Lifecycle-inclusive per-frame production study: Snake V1

**Question.** Does the fixed-topology per-frame update advantage persist when
mount and teardown are included with a 300-update episode?

**Preregistered design.** The study compares React 19.3 + verified React
Compiler, scalar-source retained VDOM, and OXC-plan columnar retained VDOM at
512 and 1,024 segments. Five randomized production-page blocks per size yield 30
pages. Each visible page allocates the model/store or bindings, mounts the host
tree, runs 90 warmup RAF callbacks, measures 300 update CPU samples, checks
final segment/food output and stable node identity, then unmounts or disposes
and checks for an empty container and zero remaining subscriptions/bindings. The
primary metric is mount + summed update CPU + teardown; it excludes page load,
network, parse/evaluation, compilation, paint, GPU, and presentation. The
preregistration is preserved at
`results/snake-frame-lifecycle-v1/preregistration.json`.

**Pre-collection amendment.** The first excluded smoke page found a
false-negative parity check: Chrome serializes fractional inline CSS positions
to three decimal places. The source now accepts final coordinates within 0.01
CSS px, a precision-correction tolerance only; no latency threshold, arm, sample
count, or workload changed. All smoke pages are archived separately under
`results/snake-frame-lifecycle-v1-smoke/`. The corrected
[source lock](./results/snake-frame-lifecycle-v1/source-lock.json) froze 93
source and production-bundle inputs before the scheduled collection and verified
before analysis.

**Results.** All 30 preregistered pages passed correctness, disposal,
visibility, and frame-count contracts. Median episode cost (median page-level
total; p95 is nearest-rank across five page totals) was:

| Segments | React + Compiler | Scalar retained VDOM | Columnar retained VDOM |
| -------: | ---------------: | -------------------: | ---------------------: |
|      512 | 219.1 / 241.9 ms |     123.3 / 135.7 ms |       102.5 / 113.5 ms |
|    1,024 | 333.4 / 346.3 ms |     206.2 / 206.8 ms |       171.9 / 176.7 ms |

The preregistered columnar lifecycle gate passes 5/5 paired blocks at both sizes
(threshold ≤0.90× React); median paired ratios are 0.508× at 512 and 0.513× at
1,024. The update-median non-worse gate also passes 5/5 at both sizes. Columnar
VDOM mount medians remain higher (4.3 vs 2.6 ms at 512; 6.4 vs 3.7 ms at 1,024),
while teardown medians are 0.7/1.0 ms versus React's 1.1/1.5 ms. The scalar
retained-VDOM arm also lowers median total episode cost versus React at both
sizes.

**Interpretation and limits.** This closes the teardown-inclusive question only
for a stable fixed topology and 300 measured updates. It supports both the
general scalar binding path and the columnar compiled specialization for this
workload. It does not establish smoother frame presentation, update behavior
under dynamic topology, cold-start/page-load cost, cross-device reproducibility,
developer simplicity, or a general React speedup. Update medians are 0.3–1.1 ms
on one Chrome 154/MacIntel profile and should be rechecked with timer
calibration and an independent device. The
[raw manifest](./results/snake-frame-lifecycle-v1/manifest.json) hashes all 30
accepted records; the [summary](./results/snake-frame-lifecycle-v1/summary.json)
rechecks the source lock, full preregistered matrix, correctness, and paired
thresholds. The notebook validates both hashes and renders two inline SVG
charts. Reproduce collection, analysis, notebook update, and execution using
README's “Reproduce the lifecycle-inclusive Snake V1 study” section.

## 5.86 Callback cadence under load: Snake Frame Cadence V1

**Question.** When does the lower per-frame update CPU measured in the fixed-
topology Snake studies translate into fewer missed browser animation-frame
opportunities?

**Design and integrity.** The preregistration froze 45 fresh visible
production-page runs: React 19.3 + verified React Compiler, scalar retained
VDOM, and OXC-plan columnar retained VDOM at 1,024, 4,096, and 8,192 segments,
with five randomized blocks per size. Each page calibrated 120 idle RAF
intervals, warmed up 60 callbacks, and measured 240 updates. A callback was
late above 1.5× its page's idle median; missed slots were estimated from the
interval-to-baseline ratio. All 45 pages passed output, stable-identity,
visibility, sample-count, and teardown checks. The frozen source/build lock
contains 21 source inputs and 49 production assets and verifies successfully.
The notebook contains all 83 executed code cells with no error outputs and
renders three SVG charts for the study.

**Results.** Values below are medians of five page summaries; missed slots are
summed within each arm's five-page group.

| Segments | Arm | Update CPU | RAF median / p95 | Late callbacks | Estimated missed slots |
| -------: | --- | ---------: | ---------------: | -------------: | ---------------------: |
| 1,024 | React + Compiler | 1.1 ms | 16.7 / 17.1 ms | 0% | 0 |
| 1,024 | Scalar VDOM | 0.6 ms | 16.7 / 16.8 ms | 0% | 0 |
| 1,024 | Columnar VDOM | 0.5 ms | 16.7 / 17.6 ms | 0% | 0 |
| 4,096 | React + Compiler | 3.9 ms | 16.7 / 33.7 ms | 27.5% | 76 |
| 4,096 | Scalar VDOM | 2.2 ms | 16.7 / 34.5 ms | 24.2% | 70 |
| 4,096 | Columnar VDOM | 1.8 ms | 16.7 / 33.4 ms | 22.5% | 59 |
| 8,192 | React + Compiler | 8.0 ms | 50.0 / 66.6 ms | 100% | 451 |
| 8,192 | Scalar VDOM | 4.6 ms | 49.8 / 66.7 ms | 98.8% | 422 |
| 8,192 | Columnar VDOM | 3.9 ms | 49.9 / 66.7 ms | 96.3% | 414 |

The preregistered update-CPU gate passes in all five pairs at 4,096 and 8,192
segments. At 8,192 the missed-slot criterion passes in four of five pairs, so
the preregistered combined decision is `HYPOTHESIS_PASS`. That narrow result
does not mean the scene is smooth: at 8,192 every arm misses almost every
baseline callback, with roughly 50 ms median cadence against a 16.7 ms idle
period. The columnar path reduces update CPU by about 51% but leaves RAF p95
unchanged (66.6 vs. 66.7 ms) and late-callback rate improves only 3.7 percentage
points. One columnar page had 11.6 s and 2.88 s RAF gaps; it was retained under
the frozen no-exclusion protocol and dominates its missed-slot estimate. This
shows that the missed-slot proxy is highly sensitive to external stalls.

**Conclusion and next step.** On this device, the cadence-pressure crossover
lies between 1,024 and 4,096 segments for this synthetic DOM scene. Lower runtime
CPU has not yet demonstrated a corresponding display-presentation benefit.
These data justify no claim about compositor timing, perceived smoothness,
Three.js workloads, or other hardware. The next evidence gate is independent
device/profile replication with timer calibration, followed by phase attribution
of high-load gaps (script, style/layout, paint, and external scheduling). The
source lock, raw records, manifest, summary, preregistration, analysis cell, and
reproduction steps are in
[`results/snake-frame-cadence-v1`](./results/snake-frame-cadence-v1/), the
[paper's §8.15](./paper.md#815-callback-cadence-under-load-snake-v1), and the
[README reproduction guide](./README.md#current-conclusion).

## 5.87 Long Animation Frames phase attribution: Snake Frame Phase V1

**Question.** At the observed callback-cadence crossover, can browser
diagnostics show whether long frames carry script attribution or occur after
rendering begins?

**Design and integrity.** A frozen 30-page production schedule compared React
19.3 + verified React Compiler, scalar retained VDOM, and columnar retained VDOM
at 1,024 and 8,192 fixed segments. Each page calibrated 120 idle RAF intervals,
warmed 60 callbacks, and measured 240 updates while collecting Long Animation
Frames entries. All records passed API support, output parity, stable host
identity, sample count, and teardown contracts. The 21-source/50-asset lock
verifies, and the raw manifest hashes every page.

**Results.** At 1,024 segments, no arm produced an entry. At 8,192, median LoAF
counts over 240 updates were 8 React, 3 scalar VDOM, and 6 columnar VDOM.
Median update CPU was 8.5, 4.9, and 4.1 ms; RAF p95 was 66.7, 66.6, and 66.6
ms. Among pages with entries, median script-attributed duration summed to 87.7,
32.5, and 62.1 ms. The summed interval from `styleAndLayoutStart` to LoAF entry
end was 138.7, 56.7, and 108.8 ms. These are thresholded, overlapping
diagnostics, not exclusive portions of total frame time.

**Conclusion.** This does not explain the high-load callback gaps: lower update
CPU coincides with similar RAF p95, while the sparse LoAF pages vary by arm.
Entries represent only frames longer than 50 ms; no entry does not imply zero
style, layout, or paint work. Neither these runs nor the API measure compositor
completion or physical display presentation, so they support no causal or
smoothness claim. This closes a diagnostic gate, not the independent-device
cadence replication. See the [preregistration](./results/snake-frame-phase-v1/preregistration.json),
[source lock](./results/snake-frame-phase-v1/source-lock.json),
[manifest](./results/snake-frame-phase-v1/manifest.json), and
[summary](./results/snake-frame-phase-v1/summary.json). Vite configuration was
extended after the cadence collection for this separate harness; the cadence
notebook discloses this tooling-source drift and still verifies its locked
production assets and raw records.

## 5.88 Keyed region buckets: bounded ordered edits

**Question and preregistration.** Does a map-indexed list of bounded ordered
buckets keep move-before work local as the region grows, compared with a flat
array using `findIndex` and `splice`? The frozen matrix covers 1,000, 10,000,
and 50,000 rows; head, middle, and tail edits; capacities 32, 64, 128, and 256;
64 moves per sample; two warmups; seven measured samples; and seed 247119.

**Integrity.** The implementation maintains an entry map and doubly linked
buckets. Every sample checks final order and values against the flat-array
reference; bucket runs also verify internal links, occupancy, and index
identity. A preliminary correctness run exposed a tail-neighbor merge ordering
bug; it was fixed before timing. All 315 measured cases passed these checks.
The manifest stores hashes for the preregistration, raw results, benchmark,
and implementation.

**Results.** At 50,000 rows, flat-array versus B32/B64/B128/B256 median times
were 0.874 vs. 0.028/0.031/0.037/0.076 ms for head edits, 9.217 vs.
0.022/0.019/0.018/0.019 ms for middle edits, and 17.197 vs.
0.017/0.014/0.014/0.013 ms for tail edits. In the array arm, middle edits
perform roughly 50,000 key/anchor comparisons and shift roughly 50,000 rows per
move. B128 records one bucket-slot read and 256 slot writes per middle move.
Tail array edits scan nearly 100,000 entries to find key and anchor despite
shifting only about 163 rows; B128 records one slot read and about 106 writes.

**Interpretation and next gate.** This supports bounded buckets as a promising
local-edit mechanism against a simple flat array. It does not establish a
runtime win: the baseline does not maintain a key-to-index table, no actual UI
owner/host path is measured, and per-sample p95 is only the maximum of seven
observations. The next decisive step is an indexed-array control with explicit
index-maintenance counts, then integration only if buckets retain a work and
latency advantage; the integrated path must skip both the measured full owner
visit and full host reconciliation and face the same React Compiler browser
gate. See [empirical appendix §8.17](./empirical-appendix.md#817-keyed-region-buckets-bounded-ordered-edits),
the [preregistration](./results/keyed-region-buckets-v1-preregistration.json),
and [raw results](./results/keyed-region-buckets-v1.json).

## 5.89 Bucketed regions versus an indexed flat array

**Question and preregistration.** The prior buckets experiment used an array
without a key index. Does the bucket advantage remain against an array that
maintains `Map<key, index>`? Experiment AU repeats the same deterministic
64-move head/middle/tail workload for 1,000, 10,000, and 50,000 rows, with four
bucket capacities, two warmups, and seven measured samples.

**Integrity and measurements.** The indexed-array arm finds moved rows and
anchors through the map, then rewrites every affected suffix index after each
array splice. The bucket arm does key lookups and bounded local reindexing. The
harness checks exact final order/value parity and bucket integrity. All 315
measured samples passed; the manifest hashes the preregistration, raw results,
benchmark, and implementation.

**Results.** At 50,000 rows, indexed-array versus B32/B64/B128/B256 medians
were 125.149 vs. 0.031/0.032/0.040/0.077 ms for head edits, 46.901 vs.
0.025/0.020/0.018/0.018 ms for middle edits, and 0.070 vs.
0.017/0.017/0.015/0.013 ms for tail edits. Head moves rewrite about 99,836
index entries per operation; middle moves rewrite about 49,952. Tail edits are
near-local for both structures: about 164 array index writes versus 106 bucket
slot writes for B128. Seven-sample p95 is just the observed maximum.

**Conclusion.** Bounded buckets retain a large mechanism-level advantage on
head and middle moves and a smaller provisional time advantage on tail moves
against this indexed-array implementation. This removes the key-scan weakness
of Experiment AT, but still does not prove a UI runtime win. Integrate one
bucket-backed keyed membership delta into the real JSX/VDOM path only as a
product gate: count owner visits and host rows patched, preserve local child
state and key identity, include setup/teardown, and compare with React Compiler
on the browser. See [empirical appendix §8.18](./empirical-appendix.md#818-bucketed-regions-versus-an-indexed-flat-array),
the [preregistration](./results/keyed-region-buckets-v2-preregistration.json),
and [raw results](./results/keyed-region-buckets-v2.json).

## 5.90 Async DAG frontier under equal preload knowledge

**Question and preregistration.** Can the OXC-emitted task graph start all
currently ready async branches and honor hard dependencies while keeping the
previous view mounted? Does it match React when React receives the same
explicit preloads? The v2 protocol freezes three arms, 30 fresh visible Chrome
page blocks, a counterbalanced six-order schedule, deterministic same-origin
delays, and source/build hashes.

**Integrity.** All 30 records match the frozen schedule and all frozen source
and production artifact hashes. Every block passes output parity, pending view
retention, keyed DOM identity, hard-edge order, dependent-start lag, and one
commit per arm. The DAG starts its independent requests within 16.7 ms in
30/30 blocks, and dependent tasks meet the 16.7 ms bound in 30/30; hard-edge
violations: zero. The full analysis is recomputable with
`deno run --allow-read --allow-write scripts/analyze_async_dag_frontier_v2.ts`.

**Results and conclusion.** Median/p95 completion-to-layout-commit times are
364.4/385.3 ms for the sequential loader control, 143.6/152.1 ms for explicitly
preloaded React, and 144.8/151.2 ms for the compiled DAG. The paired median
DAG/control ratio is 0.397 (60.3% lower), while the paired median DAG/React
ratio is 1.000 and DAG p95 is 0.994× React's. The graph meets the
preregistered fair-baseline ceiling and removes the waterfall, but does not
show a speed advantage over React with equal preload knowledge. This supports
automatic dependency discovery and inspectable scheduling as the product
benefit; it is not parallel JavaScript, worker evidence, or a frame-smoothness
result. V1's 30 records remain intact but are excluded because its initial
React layout-readiness race produced 20 pending-view failures. See the
[v2 protocol](./async-dag-frontier-v2-protocol.md),
[frozen results](./results/async-dag-frontier-v2/), and
[empirical appendix §8.20](./empirical-appendix.md#820-preregistered-async-dag-frontier-study-v2).

## 5.91 Async store action-log runtime prototype

**Question.** Can the runtime represent the React-store update-ordering
semantics already explored in the local userland store and React fork, instead
of relying on candidate-local task values alone?

**Implementation.** Added `src/async_store_runtime.ts`: a chronological action
log with per-root projection, hidden transition actions, reducer replay for
urgent actions that follow hidden actions, promise-valued state, read-site-local
selector history, and explicit root commit/release. Connected store transition
IDs to `AsyncVDOMTransitionRuntime`: candidate tree construction receives the
transition IDs, and the coordinator advances store roots in the same synchronous
host commit. The intended behavioral references are the local
`react-use-store` feature work and the React fork's `use-store-queue` branch.

**Status and limits.** This is an implementation milestone, not an empirical
result. A root-pinned render snapshot now ensures each read in a candidate uses
the same projected state; per-root versions validate snapshots before the
async VDOM coordinator patches any participating host root. Selector history
publishes only after host commit. Stale candidates currently reject rather
than automatically rebuilding. No test suite, type check, or browser run has
been performed for this path. It does not reproduce React Fiber lanes,
hydration, or all of the React fork's per-root scheduling. Next, port its
concrete transition cases and compare action order, urgent rebase, stale
snapshot behavior, roots, promises, selector previous values, supersession,
and late completion before measuring performance. See the
[implementation protocol](./async-store-transition-protocol.md).

## 5.92 Async transition stress target

**Question.** Can optimistic actions stay responsive while independently
timed transitions overlap on the same root and forked roots, without replacing
the revealed UI with a Suspense-style ancestor fallback?

**Fixture.** Added `async-transition-stress-v1.html` and
`src/browser/async_transition_stress_v1.tsx`. One shared action-log store feeds
a workspace root and a forked inspector. The page has urgent optimistic likes
with timer rollback, out-of-order timer-backed transition actions, fork-only
transitions, and a 520 ms auto-trigger loop. One startup placeholder is allowed;
the mounted roots remain visible after initialization. The browser records
fallback insertions after startup and input-to-next-frame samples.

**Status and limits.** This is a target fixture, not evidence. It has not been
typechecked, run in a browser, or compared with React. It exercises overlapping
store transitions and per-root snapshots through direct retained-VDOM commits;
it does not exercise concurrent async task candidates or Suspense boundaries.
The current coordinator supersedes candidates with overlapping roots, so
multiple concurrently prepared candidates on one root remain a required
capability. See the [stress protocol](./async-transition-stress-v1-protocol.md).
