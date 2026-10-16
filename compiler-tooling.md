# Compiler Tooling Decision Note

**Status:** OXC is the preferred long-term frontend/codegen direction; the narrow OXC-to-plan vertical slice runs; production suitability and comparative performance remain to validate  
**Updated:** 2026-10-12

## Current native-module integration

The custom compiler now participates in development and production through
`compiler/vite_native_module.ts`. Opted-in TSX modules with `// @native-ui` are
analyzed by one persistent Rust process using an NDJSON protocol. Dependency
metadata and executable callbacks come from the same authored source. The stress
app uses this path directly, with literal task reads inferred into dependency
arguments before standard OXC TS/JSX lowering. Rust emits dependency-only source edits
with UTF-16 offsets; the Vite plugin verifies edit/code parity and preserves
callback locations through a high-resolution source map. The native smoke check
covers both callback headers and bodies with Unicode preceding the edits.

The supported task slice is deliberately finite: direct module-level variable
initializers or direct elements of module-level array initializers, a resolved
value import of `asyncTask`, an inline callback with an identifier input
parameter, and literal `.get("task-id")`/`.get("$external")` reads. Type-only or
aliased imports, escaped helper/input references, nested/dynamic task declarations,
undeclared task reads, reserved IDs, and cycles are rejected with source locations.
This does not infer all closure reads, prove task purity, type-check TypeScript,
or lower arbitrary JSX/state ownership into one product IR.

The dated implementation status and verification artifacts live in
`implementation/2026-10-12/`. Historical repeated-host timing results below
evaluate their archived generated plans, rather than this new integration.

### Native numeric-state status — 12 October 2026

The newer product path is [`src/native_runtime_api.ts`](./src/native_runtime_api.ts)
plus the native Rust/Vite transform. It exports `createDOMRoot`,
`createNativeRoot`, and `createWorld`. The transform compiles actual TSX with
explicit state/effect site IDs, `defineComponent` metadata, and proven numeric
intrinsic prop/style expressions that bind through `bindStatePropsAt`. Direct
numeric state updates skip owner execution, and roots sharing one world are
isolated. Conditional effect sites activate and clean up; classic and automatic
JSX remain separate ABIs. Unsupported reads retain generic fallback. Custom
component props, `key`, and event-captured reads are outside the prop-only path.

The Portless check at [`native-state-props.html`](./native-state-props.html)
covers pause/resume/nudge, keyed draft/reorder/remove/remount, a generic branch,
and pagehide cleanup; the numeric update path does not scan the full source
cache. This is browser correctness evidence only, with no timing result. The
scalar keyed-delta runtime incrementally attaches/detaches its Set writer, but
CSR and columnar compiled structural paths still fall back, and compiler-visible
sparse membership operations remain absent. Remaining gates are: the shared
store/root-queue behavioral matrix; compiler-emitted membership deltas with
randomized full-recompute parity and bounded owner/host work; integrated mixed
workload evidence; and public host/adoption validation. See the dated
[`native-state status archive`](./implementation/2026-10-12-native-state/status.json)
for the milestone record. This does not establish complete React compatibility,
performance superiority, maintainability, or async native-hook integration.

### Native store and collection primitives — 12 October 2026

The primary authored store API is `use(store)` with
`createStore`/`createStoreSelector`; Rust lowers it to `useStoreAt` keyed by
compiler site IDs. `useStore` is temporary compatibility surface. Native roots
use built-in `AsyncStore` and `StoreSelection` with multiple dependencies,
candidate-history/private-subscription staging, and root-local notification
generations. `use(store)` reads ordinary values; a Promise stored as a value is
returned unchanged. Direct `use(Promise)` and automatic resource suspension are
not implemented, and resource Suspense and transition orchestration are not
connected to the native root queue.

The runtime also exports the advanced `storeDependencies` symbol for custom
`StoreSource` adapters. An adapter declares its complete source dependency
graph; render transactions pin that graph before evaluation and reject
undeclared reads or cycles. This is an explicit adapter protocol, not a change
to the ordinary `use(store)`/selector author surface.

[`compiler/native_store_execution_test.mjs`](./compiler/native_store_execution_test.mjs)
passes actual authored `use(Store)` across two roots, held-transition urgent
replay, two simultaneous transitions with out-of-order independent root
publication (right/left projections `37/34`, then `39/36`, then both `39`),
failed-candidate flush/retry, and cleanup. A browser `use(store)` check covers
held `+100` plus urgent `+1` settling at `101`, urgent replacement `0` surviving
held commit, focused draft/node preservation, and pagehide teardown with zero
roots/listeners/readers/transitions. Numeric prop updates still skip owner
execution with a stable store HUD. These projections do not prove an atomic
host-group commit; native rootQueue integration remains open.
[`src/keyed_collection.ts`](./src/keyed_collection.ts)
provides a versioned linked-map primitive with transactional operations,
cursors, subscriptions, immutable descriptors, and 11 contracts. A narrow
compiler-visible keyed-collection path now integrates mapped keyed child
components. The remaining gates are broader source-reading coverage, mixed-
workload evidence, and public host/adoption validation. See the planned
[`native-store status archive`](./implementation/2026-10-12-native-store/status.json).

### Native keyed-collection compiler/runtime — 12 October 2026

The Rust pass currently recognizes
`const rows = createKeyedCollection(...); rows.map(row => <Row key={row.id} row={row} />)`
and lowers it to a lexical `renderCollectionAt` site with unique row-owner
regions. Supported runtime scope is one pure `Row` component region per root,
rendered through a single host root with no store reads and native scalar props.
The collection runtime applies membership changes in work proportional to changed depth,
incrementally attaches/detaches scalar writers, and clears stale ancestor/VDOM
snapshots without full sibling materialization.
Staged row incarnations preserve the previous owner state on failed candidates
and give remove/reinsert a fresh lifetime. Reentrant collection-effect
notifications are retained. A terminal host mutation exception stops retry
until disposal.

[`compiler/native_collection_execution_test.mjs`](./compiler/native_collection_execution_test.mjs)
passed a 1,000-row Node `MemoryVDOMHost` sequence covering
insert/move/replace/remove, owner lifetimes, failure recovery, nested intrinsic
state, and parent-count fallback. The distinct [32-row Portless browser
check](./native-collection-props.html) passed direct RAF updates without owner
execution or source-cache scans. Targeted CRUD lookups avoid full snapshot
materialization, preserve a surviving editable row/input identity and draft,
and keep active effect/writer counts at 32 → 33 → 32. Pagehide cleanup leaves
collection counters, readers, and history at zero. Counter tests at
1k/10k/50k include apply, flush, and scalar-writer work; there is no latency
comparison or performance claim. Deno coverage is in
[`src/native_collection_runtime_test.ts`](./src/native_collection_runtime_test.ts).
[`compiler/native_collection_retention_test.mjs`](./compiler/native_collection_retention_test.mjs)
provides narrow evidence that a removed row can be collected while the root
stays mounted, matching its collected control; it is not a full heap profile.

The production build and type-check pass. A native HMR browser check confirms
the old root's effects, writers, readers, and history reach zero before exactly
one 32-row remount. Vite excludes native browser entries from React Refresh, so
the explicit native HMR policy owns that remount.

Unsupported callback/index/alias forms produce diagnostics, and ordinary arrays
remain generic. Intrinsic collection entries or nested collection regions,
multiple regions, extra parent reads, mixed local/store/collection dependencies,
and expired readers use the registered full fallback. Module-wide extra
collection-read detection is now in
place: proven event-closure reads are excluded; additional render reads emit
`requiresOwnerRender` and select generic full-owner rendering. The compiler/runtime
milestone does not close the broader mixed-workload, async-resource, or public
host/adoption gates. See the planned
[`native-collection status archive`](./implementation/2026-10-12-native-collection/status.json).

## Direction

Keep the UI runtime and generated application code in ordinary JavaScript. Build the compiler as a real source-analysis and code-generation pipeline. Prefer OXC's Rust parser, semantic analysis, traversal, and code-generation ecosystem as the foundation for our custom compiler. Keep the official TypeScript compiler on the working type-checking route, and retain the current TypeScript-based build integration as a compatibility and fallback path while we compare it with OXC. The runtime and emitted application code stay ordinary JavaScript. Local command aliases such as `tsgo` or `tssc` are workflow details: upstream, TypeScript 7.0 shipped as the native Go implementation in the `typescript` package with a `tsc` entry point, and the `typescript-go` staging repository was archived after development moved back to `microsoft/TypeScript`. OXC is not being selected as a replacement for TypeScript type checking.

This is a tooling architecture preference, not a performance conclusion. OXC's adoption, Rust implementation, and parser benchmarks do not show that our generated runtime will be faster. Before making OXC the only supported frontend, pin the OXC version and measure compiler throughput, peak memory, diagnostics, supported TSX syntax, emitted bundle size, and implementation cost against the working TypeScript route on one shared source corpus. If those checks fail, keep the UI IR language-neutral so the frontend can be replaced without redesigning runtime semantics.

The OXC spike in `compiler/oxc-spike/` parses `src/browser/jsx_binding_view.tsx`, builds semantic scopes, resolves imported `bind`, recognizes a narrow repeated-host pattern, and emits JSON IR plus generated TypeScript. The schema-v5 plan has separate CSR tables for item-local paths and shared paths whose roots resolve to formal parameters. `compiler/fixtures/shared_source_scene.tsx` verifies the local `node.x` and shared `props.alpha` tables independently. The JavaScript runtime consumes both tables: `setShared` queues a shared slot, and dense and CSR paths fan it out across repeated hosts. A deterministic Deno fake-DOM check covers local routing, shared fan-out, repeated-write coalescing, and mixed local/shared batches, with its output saved at `results/shared-source-runtime-check-v1.json`; this is functional evidence, not a timing study. The five- and six-arm browser benchmarks check output equality after every timed pair and have zero recorded parity failures; a fresh run of the standalone `multi-source-check.html` page has not been recorded. `deno task compiler:check` also compiles one- and two-source item fixtures (including field fan-out), and confirms that an unsupported dynamic `title` prop fails with a clear diagnostic rather than disappearing from output. The compiler rejects dynamic root props, unsupported dynamic item props, non-index keys, and style-object properties that are not represented by direct bindings. This remains a deliberately constrained source-to-plan vertical slice. It does not type-check, compile arbitrary JSX, generate a precomputed graph index or scheduler, support dynamic structure, or integrate as a Vite transform plugin.

The custom compiler owns the UI semantics and IR. OXC supplies language tooling. It must not be treated as if its generic JSX transform or its React Compiler integration already implements our component graph, ECS data flow, task scheduling, or host binding model.

## Why OXC fits the preferred direction

OXC documents Rust components for JavaScript/TypeScript parsing, semantic analysis, transformation, traversal, and code generation. Its Node bindings and integrations offer a route into an existing JS build pipeline, while Rust crates allow a custom pass pipeline to operate on OXC's AST directly. Its React Compiler integration demonstrates a native Rust compiler pipeline, but OXC marks that feature experimental and it optimizes React programs rather than compiling this runtime's graph.

The OXC transformer documentation describes built-in transform plugins and a fixed pass order. It does not present a general-purpose public custom AST-pass plugin API in the usage surface we reviewed. The compiler spike should therefore verify whether to compose OXC crates in a Rust driver, add a dedicated crate/pass, or use an integration seam exposed by the selected release. Do not assume a custom JSX Babel-style plugin can be inserted into the stock transform package.

The preferred split is: OXC owns TSX parsing, scopes, custom analysis/lowering, and emission; the official TypeScript compiler provides TypeScript diagnostics through its working CLI route. TypeScript 7.0 is now the native Go implementation and brings large reported checker/build speedups, but its release announcement says it does not yet expose a stable programmatic API for embedded compiler workflows. That makes it useful as a checker without making it the natural host for our custom compiler passes today. Whether TypeScript can supply usable type facts directly to Rust passes depends on the exact local route and API version, so keep that boundary out of the first vertical slice. Compare the current working TypeScript route and OXC on one shared TSX corpus for supported syntax, diagnostic quality, compile time, memory, and the semantic facts the UI IR needs. Keep the intermediate UI IR language-neutral so another frontend can feed later passes if evidence changes the choice.

## Compiler responsibilities

The compiler is expected to do meaningful work beyond JSX syntax lowering:

1. Parse TSX and resolve identifiers, components, source reads, and host targets.
2. Keep type checking in the official TypeScript compiler and report diagnostics with source locations; OXC provides parsing and custom semantic passes, not whole-program type checking.
3. Lower supported code to a semantic IR with separate ownership, reactive dependency, and asynchronous task graphs.
4. Analyze expression reads and writes, validate supported effect/lifecycle rules, detect cycles, and compute dependency/update order.
5. Specialize JSX templates, keyed/dynamic regions, selectors, host property operations, native event registration, and cleanup plans.
6. Emit compact graph tables or specialized JavaScript update functions, host adapter calls, diagnostics, and source maps.
7. Preserve explicit runtime operations where topology is dynamic or the compiler cannot prove an optimization safe.

Initial scope should be narrow enough to measure, but the IR and pass boundaries should not encode the particle benchmark as the language. The first vertical slice can compile one repeated TSX template over a source collection into a host-node template, binding program, and lifecycle plan. It should eliminate mount-time reflection and graph rediscovery, while retaining the declarative prop syntax.

## Separation of claims

- **OXC build speed** is a compiler throughput claim; measure parse/analysis/codegen wall time and memory against the current TypeScript-based build route. Do not infer the outcome from ecosystem momentum or Rust benchmarks.
- **Generated code quality** is a compiler output claim; inspect emitted bundle size, static graph metadata, and runtime allocations.
- **Runtime performance** is a framework claim; measure update-to-host-commit cost, setup/teardown, and presented-frame behavior against optimized React.
- **Compiler language choice** does not establish runtime speed. Rust can improve compile throughput or enable a more explicit IR, but only the generated program and runtime data structures affect users after build.

## Validation gates

1. A small corpus of TSX fixtures must lower to inspectable semantic IR with source spans and stable identities.
2. The graph compiler must preserve output parity for constants, scalar bindings, derived values, shared dependencies, conditional branches, and keyed collection insertion/removal.
3. Unsupported or ambiguous patterns must produce clear diagnostics or explicit dynamic fallbacks, never silently miscompile.
4. The browser benchmark must compare a compiler-generated host plan to an optimized React implementation with equivalent output, and separately report compilation, setup, steady-state update, teardown, and frame presentation.
5. A Rust/OXC implementation should be compared against a language-neutral IR or reference implementation before claiming the toolchain migration helped.

## Current research status

The generated shared-source plan is emitted from `compiler/fixtures/shared_source_scene.tsx` by `deno task compiler:plan`; it declares the repeated host template, local/shared source paths, property projectors, and CSR adjacency. The measured browser harness imports that emitted plan for both CSR and dense runtime arms. The source-to-host plan and direct property-writer functions are generated by OXC; `src/compiled_plan_runtime.ts` still owns runtime storage, dirty-source collection, scheduling, and the interpreted CSR/dense paths. A five-arm shared-source follow-up compares React 19.3 + React Compiler and subscriptions, OXC CSR, OXC dense, eager full scan, and guarded full scan. A six-arm follow-up adds OXC-generated direct writers alongside the dense interpreter and other arms. It covers seven local/shared/mixed conditions, two page loads, 14 runs, 1,680 timed pairs, 120 unique position-balanced six-arm orders per run, and zero output-parity failures. Generated writers have lower run median than dense interpretation in all 14 runs, by 15.2–34.4% across condition summaries; setup and paint are separate/excluded. The raw records are in `results/browser-shared-source-six-arm-session-v1-2026-10-09.json`; Notebook Experiment Q recomputes the summary and renders the chart as responsive inline SVG. The five-arm historical data is retained in its separate file and validated by Experiment P. This remains a single Chrome/MacIntel profile and device, and the React path executes components/subscription checks/reconciliation while generated paths dispatch bindings directly; timing excludes paint. A separate four-arm shared-source run is preserved at `results/browser-shared-source-timing-session-v2-2026-10-09.json`. Earlier two-item-source CSR/dense runs remain in `results/browser-paired-fanout-four-way-session-v4-2026-10-09.json` and the explicit-plan replay files. These measurements establish runtime behavior for a narrow repeated-host plan, not general JSX compilation. Those historical repeated-host modes do not type-check, lower arbitrary JSX/control flow, compile dynamic/keyed membership operations, or emit a scheduler. The separate native-task Vite path above now integrates the custom Rust pass with standard OXC lowering; runtime scheduling is still implemented in JavaScript. No OXC-vs-TypeScript compile throughput or compatibility comparison has been run; OXC is the chosen frontend/tooling base because it exposes layers needed for custom passes, not because speed has been demonstrated for this project. The Deno kernel experiments separately characterize graph, bucket, and scan propagation.

## Official references

- [OXC architecture](https://github.com/oxc-project/oxc/blob/main/ARCHITECTURE.md)
- [OXC transformer overview](https://oxc.rs/docs/guide/usage/transformer)
- [OXC JSX transform](https://oxc.rs/docs/guide/usage/transformer/jsx.html)
- [OXC React Compiler integration](https://oxc.rs/docs/guide/usage/transformer/react-compiler)
- [OXC transformer plugins](https://oxc.rs/docs/guide/usage/transformer/plugins.html)
- [TypeScript Go staging repository status](https://github.com/microsoft/typescript-go/blob/main/README.md)
- [TypeScript 7.0 release and native compiler CLI](https://devblogs.microsoft.com/typescript/announcing-typescript-7-0/)
- [TypeScript native compiler work moved back to the main repository](https://github.com/microsoft/typescript-go/issues/4918)


A separate JSX-authored React replication is preserved in `results/browser-shared-source-six-arm-jsx-react-session-v1-2026-10-09.json` and validated by Notebook Experiment R. It has 14 runs / 1,680 pairs over two fresh page loads and zero parity failures; generated writers beat React in all pairs, with 18.8×–166.1× condition-level median ratios. React performs per-entity component execution, subscription checks, and reconciliation while the generated writer path dispatches host bindings directly. Therefore the result is a narrow specialization signal, not an equivalent-work or framework-wide comparison. It does not establish maintainability or source comprehension. The source review treats React's large work loop as partly the cost of its broader scheduling/async/hydration feature set and Preact as evidence that a compact VDOM kernel is possible, not that edge cases disappear. The maintainability benefit of explicit ownership/dependency/async graphs remains a hypothesis requiring task-based evaluation.

- [React work loop source](https://github.com/facebook/react/blob/main/packages/react-reconciler/src/ReactFiberWorkLoop.js)
- [React child reconciliation source](https://github.com/facebook/react/blob/main/packages/react-reconciler/src/ReactChildFiber.js)
- [Preact child diff source](https://github.com/preactjs/preact/blob/main/src/diff/children.js)
- [Preact core entry](https://github.com/preactjs/preact/blob/main/src/index.js)


The JSX-authored multi-trait scale study adds 18 runs / 864 pairs across 1k, 5k, and 10k entities, three densities, and two page loads; all output parity checks pass, including a final full-host pass per run. Dense generated binding dispatch wins all pairs, and its relative advantage narrows from sparse updates to full density. This remains an implementation comparison, not equivalent framework work or broad proof: React performs per-entity component, subscription, and reconciliation work, while generated plans directly dispatch host bindings; paint is excluded and only one device/profile is measured. The derived SVG is in Notebook Experiment S; raw records are `results/browser-multi-source-jsx-scale-session-v1-2026-10-09.json`.
