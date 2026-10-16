# Related Work: Incremental UI, Xi Editor, CRDTs, and WebAssembly

## WebAssembly code generation as an optional execution tier

The recent example that matches this idea is Seth Humphries's [WATaBoy
write-up](https://humphri.es/blog/WATaBoy/), with the [source
repository](https://github.com/EnergeticBark/WATaBoy). It builds a Game Boy
interpreter, then a dynamic recompiler that turns straight-line SM83 instruction
blocks into new WebAssembly modules. Generated modules import the emulator's
linear memory and function table; JavaScript compiles/instantiates each module,
adds its exported function to the table, and generated code dispatches through
`call_indirect`. Interrupt-sensitive or unsupported work falls back to the
interpreter. This is a hybrid baseline/JIT model, not “compile every operation
immediately.”

The headline needs a precise comparator: WATaBoy reports about 1.2× native
interpreter throughput for Pokémon Blue and about 1.5× its Wasm interpreter on
that workload. It does **not** report beating a native AOT emulator. The author
ran five 10-second title-screen trials on an M2 MacBook Air across Safari,
Chrome, and Firefox. The write-up also describes SIMD tile rendering as a
separate emulator optimization; it does not include a SIMD-on/off ablation that
attributes the JIT result to SIMD. Treat this as a useful proof of technique,
not a broad Wasm-over-native result.

Andy Wingo's [JIT code generation within
WebAssembly](https://wingolog.org/archives/2022/08/18/just-in-time-code-generation-within-webassembly)
explains the mechanism: Wasm code is not addressable data that can be jumped
into. A program emits a new module, the host instantiates it, and the new
function is made reachable through a function table/indirect call or a late-link
step. The work also frames this as asynchronous code generation: until a
specialization is available, execute the baseline implementation. In a browser,
`WebAssembly.compile()` is asynchronous; `new WebAssembly.Module(bytes)` is
synchronous and MDN warns that compiling large modules can block. A strict CSP
may disallow compilation. See the [WebAssembly `Module`
API](https://developer.mozilla.org/en-US/docs/WebAssembly/Reference/JavaScript_interface/Module/Module)
and the [wasm-encoder project](https://github.com/bytecodealliance/wasm-tools/tree/main/crates/wasm-encoder)
for the module emission surface.

WebAssembly SIMD is a separate, compatible opportunity. The [SIMD
specification](https://github.com/WebAssembly/simd) adds portable 128-bit
packed operations, including four `f32` lanes or sixteen `i8` lanes. Our SoA
trait/prop columns provide the shape SIMD wants: contiguous values with one
operation applied across many entities. But SIMD cannot make irregular graph
traversal, object-heavy VDOM reconciliation, or individual DOM calls vector
operations. The existing Snake results are evidence that compiled numeric
columns can matter in a repeated update loop; they are not evidence that Wasm
will improve those results.

### Application to this runtime

Wasm belongs as an optional backend for **pure, typed, batched DAG kernels**,
not as a replacement for the JSX, VDOM, ECS ownership model, scheduler, or host
adapters. The useful unit is a hot subgraph: read a batch of trait columns,
compute projected values and dirty slots, then return a compact write/operation
buffer for the JavaScript host adapter. One coarse Wasm call per batch can
amortize the JS/Wasm boundary. Calling across that boundary per component, prop,
or entity—and importing a JavaScript host callback for every DOM mutation—would
likely erase the advantage.

Keep two distinct compiler paths in the design:

1. **Build-time specialized Wasm:** OXC proves a pure numeric subgraph and emits
   a module alongside the ordinary JavaScript fallback. The browser compiles it
   asynchronously during warm-up. This is the lower-complexity first
   experiment; it preserves the runtime's pure-JavaScript API and core.
2. **Profile-guided JIT-to-Wasm:** after a subgraph is hot, generate a module
   specialized to its graph shape, trait layout, and stable binding IDs. Compile
   off the interaction path, cache by graph/layout generation, then atomically
   install the function for subsequent updates. If compilation is late, blocked,
   or invalidated, continue in JavaScript. Do not JIT per render or per leaf.

SIMD should be an optimization inside either module, not a separate execution
model: first prove scalar Wasm wins on the whole update path, then compare scalar
and SIMD Wasm on identical typed-column workloads. Neither Wasm nor SIMD
provides parallel scheduling by itself. Worker placement still requires
independent tasks, explicit snapshot/version semantics, transfer or shared
memory, and a serialized host commit.

The main risks map cleanly to existing product gates: module compile/instantiate
time and code-cache size; Wasm/JS ABI and buffer-view invalidation on memory
growth; code-cache invalidation when the dependency DAG or SoA layout changes;
cross-browser performance variability; CSP restrictions; and the fact that DOM
and Three object mutations remain host-side JavaScript. The graph version and
typed trait layout should therefore be part of the generated-kernel cache key,
and transitions must never await a cold specialization to reveal content.

### Proposed investigation gate

After the JavaScript DAG and column layout are stable, use the existing Snake
frame workload as the first candidate. Compare the current generated JavaScript
kernel, a build-time scalar Wasm kernel, a runtime-generated scalar Wasm kernel,
and SIMD Wasm. Use the same graph, input columns, outputs, and DOM/Three adapter
work. Report module bytes, compile/instantiate/warm-up cost, steady-state kernel
CPU, JS/Wasm crossings, end-to-end update-to-commit, allocations, and RAF
intervals. Require exact output parity and use the complete-app break-even
count—compile cost divided by per-update savings—to determine when JIT pays for
it. Include cold input responsiveness and fallback behavior; a kernel-only
speedup is not a product win. Compare against React Compiler only after the
Wasm variant beats the current JS runtime in the full workload.

The evidence changes the priority slightly: Wasm is now worth a bounded
follow-up experiment because WATaBoy shows dynamic module generation can
specialize repeated blocks in-browser. It does not justify moving Wasm/SIMD
into the first kernel or claiming a React speedup. The first deliverable remains
the JavaScript runtime and compiler; the experiment should reuse the same
compiler-emitted DAG and SoA interfaces so the backend is replaceable.

## Why Rope Science applies

The Xi editor series is about text, but its most useful contribution to this project is a general engineering pattern: represent derived work as summaries and deltas, preserve enough structure to update only affected regions, and schedule visible results ahead of background completion.

The series landing page contains an introduction plus parts 1–6; the author notes that part 7 was never written. Additional Xi posts on CRDTs and minimal invalidation extend the same exploration.

The transfer is not “a UI is a rope.” Xi has an ordered document tree whose nodes keep summaries; a UI needs a structural ownership tree plus dependency graphs for data, resources, and host outputs. The common idea is that dependencies and derived summaries are explicit enough that a change can carry a small delta through the system instead of forcing broad recomputation.

## Transferable ideas

### 1. Incremental summaries, not full recomputation

Part 1 stores composable summaries at nodes in a rope. An edit recomputes summaries only along changed paths. Part 2 develops metrics as associative summaries, enabling indexing and aggregation. Part 4 shows that even order-sensitive computations can sometimes use associative summaries when the summary carries enough state.

**UI application:** systems may declare incremental summaries for aggregates such as visible counts, layout extents, selection ranges, or resource readiness. A trait change updates the local summary and propagates only changed summaries to dependents. The compiler/runtime should support this as an opt-in algebraic primitive, not assume every system is associative.

### 2. Keep computed state when latency requires it

Part 5 chooses to store wrapping results rather than lazily recompute them during scrolling, because delayed work would show up as jank. Incremental computation is selected based on the interaction’s latency requirements, not aesthetic preference.

**UI application:** cache derived state when recomputing it on interaction or paint paths is too expensive. The graph should distinguish valid cached output from dirty output and describe how it is refreshed.

### 3. Progressive work with explicit priority

Part 6 separates parallelizable work from async interaction behavior. For expensive reflow it proposes updating the visible region first, then nearby regions, then the rest. Part 12 formalizes this as a render plan: visible output must be valid; nearby work may be retained; distant work can be discarded or deferred. It also explicitly recognizes that a game may prefer fast full-frame redraw over fine-grained invalidation.

**UI application:** graph scheduling should have demand and priority policies: input-critical, visible, near-viewport, background, and idle. “Incremental” is not automatically faster for every host or workload; DOM lists, retained Three scenes, and full-frame games may need different policies.

### 4. Model async results against snapshots

Xi’s CRDT posts treat async plugins as concurrent actors: a plugin computes from a snapshot while the user continues editing. Its result must be related back to the snapshot it used, and concurrent operations need defined merge semantics. This prevents “latest response wins” races from silently applying stale coordinates.

**UI application:** every async computation should carry a source version or causal token and declare its write set. On completion, the runtime can reject stale results, rebase them, merge them, or accept them according to the data type’s policy. A CRDT is appropriate when operations are designed to merge; version checks or cancellation are simpler for ordinary derived data.

### 5. Use CRDTs selectively for client/server state

The Xi CRDT work is directly relevant to offline collaboration and concurrent optimistic edits. It is not a reason to make all UI state a CRDT. Traits such as hover, animation phase, or a DOM binding are local derived state. Server-authoritative data may require validation or single-writer rules. Independent collaborative edits can use CRDT operations where the domain semantics support commutative merging.

For server rendering and streaming, the more general lesson is to identify each chunk’s stable identity, source snapshot, and dependencies. A client can keep rendering from a known version while server output or data arrives. CRDT merging is useful when both sides can author concurrent operations; ordinary streaming can use versioned snapshots and patches without a CRDT.

This gives us a useful design split for a worker-driven UI alternative to server components:

1. A producer (main thread, worker, or server) emits a versioned result with stable entity/template IDs and the source version it read.
2. The runtime validates dependencies and freshness before applying it. It can cancel obsolete work, reject a stale result, or recompute/rebase it.
3. Only state with genuine concurrent writers and mergeable domain operations uses a CRDT. A worker-produced view description or server-rendered chunk is usually a snapshot/patch protocol problem, not automatically a CRDT problem.

Worker execution also does not make an arbitrary dependency graph parallel by itself. The graph must identify independent tasks, data must be transferable/shareable, and host commits such as DOM writes still have an owning thread. The scheduler should expose dependency order and priorities first; worker placement is a later policy backed by measurements.

### 6. Treat incremental summaries as an explicit extension point

The rope work suggests that a runtime can make useful derived values composable. A UI system could declare a summary operation (for example, aggregate visible bounds or count enabled entities), the inputs it reads, and how an input delta changes the summary. Associative summaries can be combined hierarchically; order-sensitive summaries need richer state; some computations will not admit a cheap summary at all. The compiler must not silently assume associativity or purity.

The research prototype should compare three update strategies for the same dependency topology: scan all outputs, visit affected edges, and propagate only when a recomputed summary actually changes. This measures the trade between graph metadata/maintenance and saved work, including dense updates where a full pass may be cheaper.

## Suspense and transitions as a scheduler contract

React is a necessary current baseline, not a blank slate. Its Suspense documentation says a tree suspended before its first mount is retried from scratch; if already-visible content must be hidden, React cleans up layout effects in that content. React Transitions can keep revealed content on screen while a non-urgent candidate waits, and nested boundaries can reveal at different points. React 19.3 made `<ViewTransition>` stable for coordinating DOM animation with Transitions and Suspense.

The proposed runtime should make these decisions explicit in its versioned scheduler: which committed root remains visible, which boundary may reveal partial output, when effects and ECS disposal happen, how urgent writes rebase, and which host animation runs after commit. The research question is whether putting those choices on one typed dependency/task DAG and ECS snapshot model gives more predictable, extensible semantics and better responsiveness. It is not whether React lacks Suspense or view transitions. Compare behavior and lifecycle counts directly against the shipped APIs. See the [React Suspense reference](https://react.dev/reference/react/Suspense), [ViewTransition reference](https://react.dev/reference/react/ViewTransition), and [React 19.3 release](https://react.dev/blog/2026/09/09/react-19-3).

## Design implications

- Keep structural ownership as a tree; use a dependency graph for invalidation and scheduling.
- Treat updates as explicit deltas with stable entity/component IDs and source versions.
- Add incremental summaries only when their algebra and invalidation behavior are declared.
- Separate task priority from dependency order: independent work may run in parallel, while urgent visible output can be committed before distant work.
- Give async computations explicit read sets, write sets, source versions, cancellation rules, and stale-result policy.
- Add CRDT semantics at domain boundaries that need concurrent, mergeable writes; do not put CRDT overhead on every trait.
- Benchmark full redraw, targeted invalidation, and progressive scheduling separately by host and workload.
- Keep summary algebra and equality/change semantics explicit; measure metadata and invalidation overhead against the work avoided.
- Define worker/server result envelopes with template/entity identity, source version, dependencies, and stale-result policy before adding CRDT semantics.

## Reading list

- [Rope Science introduction](https://xi-editor.io/docs/rope_science_00.html) — series map and note about missing part 7.
- [Part 1: MapReduce for text](https://xi-editor.io/docs/rope_science_01.html) — composable summaries and incremental tree updates.
- [Part 2: Metrics](https://xi-editor.io/docs/rope_science_02.html) — associative measurements and navigation.
- [Part 3: Grapheme cluster boundaries](https://xi-editor.io/docs/rope_science_03.html) — richer summaries for stateful boundaries.
- [Part 4: Parenthesis matching](https://xi-editor.io/docs/rope_science_04.html) — ordered, non-commutative summaries.
- [Part 5: Incremental word wrapping](https://xi-editor.io/docs/rope_science_05.html) — choosing stored derived results for latency.
- [Part 6: Parallel and asynchronous word wrapping](https://xi-editor.io/docs/rope_science_06.html) — independent shards and progressive prioritization.
- [Part 8: CRDTs for concurrent editing](https://xi-editor.io/docs/rope_science_08.html) and [Part 9: CRDTs for async plugins and undo](https://xi-editor.io/docs/rope_science_09.html) — merging concurrent operations and snapshot-relative edits.
- [Part 12: Minimal invalidation](https://xi-editor.io/docs/rope_science_12.html) — explicit deltas, viewport-aware render plans, and invalidation.
- [Rope Science series index](https://xi-editor.io/docs/rope_science_00.html) — introduction and complete published series map; part 7 was not written.
