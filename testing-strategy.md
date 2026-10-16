# Testing strategy: contract-first, differential, data-oriented

## Recommendation

Use React's tests as a **case catalog and behavioral reference**, not as the new runtime's spec or a suite to wholesale copy. React's repository tests exercise public behavior alongside private reconciler details, feature flags, scheduler controls, and React-specific invariants. Those internals are valuable when understanding why React behaves as it does, but they do not define our deliberately different hook, ownership, transition, or host contracts.

For each pain point, start with an observable contract, write the smallest failing test, implement the behavior, and then run a differential case against a pinned React baseline wherever semantics overlap. Where semantics diverge, write a first-party test for our stated behavior and a separate React comparison that makes the difference visible.

## Test layers

### Live native numeric-state check — 12 October 2026

The Portless browser check in [`native-state-props.html`](./native-state-props.html)
passes for the current Rust/Vite native transform: numeric state updates skip
owner execution without a full source cache scan; pause/resume/nudge, keyed
drafts and reorder/remove/remount, the generic fallback branch, and pagehide
cleanup behave as expected. Conditional effect activation/cleanup and isolated
roots sharing one world are part of this native slice. The dated
[`status record`](./implementation/2026-10-12-native-state/status.json) tracks
the exact source and result. This is a correctness smoke check, not a timing
study or proof of full React semantics; custom-component props, `key`, and
event-captured reads remain outside prop-only updates.

Structural coverage is narrower: scalar keyed-delta updates incrementally
attach/detach the Set writer, while CSR/columnar compiled paths still use
fallback and compiler-visible sparse membership operations are missing. The
remaining verification gates are the shared-store/root-queue behavioral matrix,
randomized membership operations checked against full recomputation with bounded
owner/host work, integrated mixed-workload evidence, and public host/adoption
validation. No performance, maintainability, broad compatibility, or async
native-hook claim is implied by this check.

### Native store and collection contracts — 12 October 2026

The native store execution fixture passed actual authored `use(Store)` across
two roots, two simultaneous transitions with out-of-order independent root
publication (right/left projections `37/34`, then `39/36`, then both `39`),
held-transition urgent replay, failed-candidate flush/retry, and cleanup. The
browser `use(store)` check passed held `+100` plus urgent `+1` settling at `101`,
urgent replacement `0` remaining `0` after held commit, focused draft/node
preservation, and pagehide during pending work with roots/listeners/readers/
transitions all at zero. These projections do not establish an atomic host-group
commit; native rootQueue integration remains open. The authored API is
`use(store)` with `createStore` and `createStoreSelector`; compiler IDs lower it
to `useStoreAt`, while `useStore` remains temporary compatibility surface.
`use(store)` returns a Promise unchanged when that is the store's value. Direct
`use(Promise)` and automatic resource suspension are not implemented; native-root
resource Suspense and transition orchestration remain unintegrated.

Custom `StoreSource` adapters can participate through the exported
`storeDependencies` symbol by declaring every store they read. The transaction
pins that dependency graph and rejects undeclared reads and cycles. The new
contract is covered in [`store_render_transaction_test.ts`](./src/store_render_transaction_test.ts);
the normal authored API remains `use(store)` with selectors.

The standalone [`keyed_collection_test.ts`](./src/keyed_collection_test.ts)
passes 11 contracts for the versioned linked-map primitive, including
transactional operations, cursors, subscriptions, and immutable descriptors.
A narrow compiler-visible keyed-collection region now has separate compiler,
runtime, and browser correctness coverage. Broader mixed-dependency behavior
and full performance gates remain open. Store results are tracked in the planned
[`native-store status record`](./implementation/2026-10-12-native-store/status.json).

### Native keyed-collection compiler/runtime check — 12 October 2026

The Rust compiler recognizes the supported module-level
`createKeyedCollection` mapped to keyed `Row` components and lowers it to a
lexical `renderCollectionAt` site with unique row-owner regions. The compiled
Node `MemoryVDOMHost` fixture in
[`compiler/native_collection_execution_test.mjs`](./compiler/native_collection_execution_test.mjs)
passed a 1,000-row insert/move/replace/remove sequence, owner lifetime,
failed-candidate recovery, nested intrinsic state, and parent-count fallback.
The separate [32-row Portless browser check](./native-collection-props.html)
passed direct RAF updates without owner execution or source-cache scans. Targeted
CRUD lookups avoid full snapshot materialization, preserve a surviving editable
row/input identity and draft, and keep effect/writer counts at 32 → 33 → 32;
pagehide cleanup leaves collection counters, readers, and history at zero. Deno
[counter/runtime contracts](./src/native_collection_runtime_test.ts) at
1k/10k/50k include apply + flush + scalar writers; they test correctness and
work counts, not latency. A Node 24 `--expose-gc` probe in
[`compiler/native_collection_retention_test.mjs`](./compiler/native_collection_retention_test.mjs)
collected the removed row while the root stayed mounted, as it did the control.
This is narrow retention evidence, not a heap profile.

Unsupported callback/index/alias forms diagnose; ordinary arrays remain generic.
Intrinsic collection entries or nested collection regions, multiple regions,
extra parent reads, mixed local/store/collection dependencies, and expired
readers use the registered full fallback. Module-wide extra collection-read
detection is now in place: proven event-closure reads are excluded, while
additional render reads emit
`requiresOwnerRender` and select generic full-owner rendering. A terminal host
mutation exception stops retry until disposal. These checks do
not establish a universal collection fast path, latency benefit, or completed
product gate. See the planned
[`native-collection status record`](./implementation/2026-10-12-native-collection/status.json).

The final reported automated verification for this live snapshot is 180 runtime
tests, 21 Rust tests, and the native compiler smoke check passing. The result
does not close the plan's mixed-workload, async-resource, or host/adoption gates.
The production build and type-check pass as well. The native HMR browser check
disposes the old root with effects, writers, readers, and history at zero, then
performs exactly one 32-row remount. Native browser entries are excluded from
React Refresh in Vite; the explicit native HMR policy owns the remount.

The maintained Deno contract suite is scoped to `src/` by `deno task test`. Frozen files under `results/**/source-snapshot/` preserve historical implementations for replay and provenance; they are intentionally excluded from discovery because multiple snapshots declare the same ambient JSX types. Run `deno task test` from the project root to execute the live contract suite.

### 1. Public behavior contracts

Assert observable output and lifetime:

- DOM properties, text, and event results match the declared JSX.
- A keyed node keeps its identity and owned state through reorder; removal disposes it exactly once.
- A conditional native hook site keeps its own state when skipped and resumes that state when activated, under the documented native semantics.
- Mount-only lifecycle work sets up on activation and cleans up on committed deactivation/unmount. Value-dependent reactions are tested as graph tasks, not smuggled into lifecycle effects.
- A host adapter receives the same logical create/update/move/remove/dispose operations for the same VDOM plan.

Do not assert a public component-render count. Internally instrument function evaluations and graph work for diagnostics and benchmark attribution, but make user-visible state, identity, events, lifecycle, and commits the correctness contract.

### 2. Differential behavior fixtures

Run the same small scenario through React 19.3 and the new runtime for the overlapping contract: initial output, prop changes, keyed insert/remove/reorder, event handling, and final host state. Compare serialized output plus selected object identity and event traces. Pin React/compiler versions and fixture inputs in the saved result. This is a differential oracle, not a claim that React is the correct answer for every behavior.

For deliberate differences, compare the behavior explicitly rather than demanding parity. Examples include conditional hook sites and lifecycle-only effects. Record both outcomes and the product rationale so an accidental incompatibility cannot masquerade as an optimization.

### 3. Compiler and dependency-graph invariants

Treat a simple full recomputation as the correctness oracle for incremental execution:

1. Generate or hand-author a small state/trait graph and initial state.
2. Apply deterministic update sequences to both the incremental plan and a full-scan evaluator.
3. Compare derived values, VDOM output, host writes, and keyed identity after every update.
4. Include shared dependencies, cycles/rejected cycles, removed owners, dynamic keyed regions, duplicate edges, and malformed compiler metadata.

The core invariant is **no missed invalidation**: every affected output from the reference evaluator must be reached by the compiled plan. Extra work is a performance defect; missing work is a correctness failure. Once a compiler feature lands, make the fixture test parse → semantic IR → emitted plan → runtime result end to end.

### 4. Scheduler and async state-machine tests

Use a deterministic fake clock and controllable promises, not sleeps. Explore resource completion order, cancellation, supersession, retries, urgent updates during a pending transition, nested reveal policies, and multi-root commits. Assert:

- a pending candidate cannot mutate the committed snapshot;
- an older result cannot publish after a newer version;
- a coordinated group commits coherently;
- cancellation leaves the visible tree and its owner state intact;
- lifecycle cleanup occurs only for committed removal/deactivation;
- independent resources start without an artificial dependency waterfall when the compiled graph proves independence.

Add randomized state-machine sequences after the example-based contract tests exist; retain the seed and minimized failing trace for reproduction.

### 5. Performance studies

Keep timing out of unit-test pass/fail gates. Functional tests establish equal work and output; benchmark pages measure setup, mount, update, churn, memory, input latency, and eventually presented frames. A performance comparison is admissible only after parity, identity, and protocol checks pass. Page loads or fresh processes are the replication units, not repeated timings within one page.

## Maintainability evidence

A bounded two-task, within-participant developer comparison is specified in [developer-study-protocol.md](./developer-study-protocol.md). It measures correctness, time to a correct implementation, code comprehension, and traceability; it does not use line count as a proxy for simplicity. The tasks cover conditional state/lifecycle and shared-source derived regions. They do not test host-adapter or compiler extension, so the protocol cannot establish the broader extension claim. It is pre-data and requires frozen equivalent fixtures, rubric, versions, and participant order before it can produce evidence.

## How to mine React's suite

For a target behavior, search the upstream `react` repository for the nearest focused test file. Read the setup and assertions, then reduce the case to a first-party fixture that expresses only the observable contract we need. Keep a link to the upstream source and record the tested React tag/commit. Avoid importing React's internal test renderer, Scheduler mocks, feature flags, or private reconciler helpers into this project; that would couple our validation harness to the architecture we are trying to replace.

Useful starting points include the upstream [React DOM tests](https://github.com/facebook/react/tree/main/packages/react-dom/src/__tests__), [reconciler tests](https://github.com/facebook/react/tree/main/packages/react-reconciler/src/__tests__), and a focused [Fizz hydration replay regression](https://github.com/facebook/react/blob/main/packages/react-dom/src/__tests__/ReactDOMFizzHydrationReplay-test.js). The custom renderer guide also warns that `react-reconciler` is experimental and its host contract changes, which reinforces the need to own a small public adapter contract instead of treating private internals as stable API ([React reconciler README](https://github.com/facebook/react/blob/main/packages/react-reconciler/README.md)).

## Curated first-party case catalog

The case catalog maps the product claims to small scenarios. It is intentionally a selection of behaviors, not a percentage sample of React's suite. The React comparison baseline for this project is the exact `react` and `react-dom` 19.3.0 pair pinned in `package.json` and `pnpm-lock.yaml`; when that baseline changes, save the new version and rerun the overlapping fixtures.

| Priority | Scenario | Contract we own | React comparison | Current status |
| --- | --- | --- | --- | --- |
| P0 | Initial render, then scalar prop/text update | Final host properties and text match the JSX plan; only changed host fields are written on the specialized path | Require output parity; do not require equal internal evaluation or render counts | Covered across retained-VDOM and browser benchmark fixtures; needs a small browser differential fixture |
| P0 | Keyed reorder, insertion, removal, reinsertion | Retained keys keep node identity and owned state; removed owners clean up once; reinsertion creates a new owner | Require matching visible tree and key-preservation behavior; compare identity where both renderers expose it | Runtime cases plus one React browser trace and 128 seeded structural operations pass; hook state and larger-scale churn remain open |
| P0 | Native event updates state and props | Native event reaches its owner; updates settle to the declared output; listener disposal follows owner lifetime | Compare event trace and final output, not synthetic-event implementation or incidental batching details | One browser trace passes 3 clicks and confirms clicking a removed button is inert; listener replacement and broader owner teardown remain open |
| P1 | Refs and lifecycle setup/cleanup | Ref and mount-only lifecycle attach after committed mount and detach after committed removal; aborted candidates do not leak effects | Compare the common mount/unmount subset; test changed lifecycle semantics independently | Open |
| P1 | Shared state read by separated regions | Every dependent region updates and unaffected regions retain identity; a full recomputation agrees with graph-selected work | React is a timing/output baseline, while the full-scan evaluator is the correctness oracle | Compiler/graph core covered for the two-region fixture; structural churn remains open |
| P1 | Two independent async resources, then a superseding update | Independent work may start together; stale candidates cannot publish; committed UI changes atomically at the selected reveal point | Compare user-visible fallback/reveal behavior where semantics overlap; test desired scheduling guarantees directly | OXC infers task and external-input edges from literal `values.get("key")` reads; dynamic keys fail compilation. In-memory contracts cover early branch work, retained nodes, keyed identity, multi-root commit, supersession, external stale updates, failure, same-root rebase, invalidation, bounded restart, and completed-output reuse outside the changed-input closure. A replicated scheduler-only cost matrix shows a reuse win for large/effective independent branches and overhead when little task work can be reused; it does not include plan preparation or host commit. Preserving in-flight independent tasks, browser progressive reveal, and React comparison remain open |
| P2 | Conditional hook site and effect site | Hook state is keyed by owner plus compiler site ID; skipping a site does not shift neighboring state; lifecycle-only effects follow committed activation | Deliberate divergence: assert our specified behavior and record React's behavior as a contrast, never as a pass/fail oracle | OXC lowers one-callback `useEffect` sites to owner/site effects; Deno, notebook, and one browser differential cover committed setup/cleanup. Dependency arrays and broader effect semantics remain open |
| P2 | Multiple roots sharing state and a coordinated transition | One source update can prepare a consistent candidate across roots, while independent groups remain independently committable | First-party atomicity contract; compare only exposed React behavior because React has no public multi-root transaction guarantee | In-memory AsyncVDOMTransitionRuntime atomically commits prepared snapshots across roots; shared compiled state/derived work, browser measurement, and Three integration remain open |
| P2 | Server snapshot arrives while client is active | Versioned state deltas merge without replacing newer local state or producing a hydration mismatch | Compare rendered output where possible; use explicit convergence and identity invariants for the new protocol | Research hypothesis only |

React's [Rules of Hooks](https://react.dev/reference/rules/rules-of-hooks), [list rendering guidance](https://react.dev/learn/rendering-lists), [state preservation model](https://react.dev/learn/preserving-and-resetting-state), [effect lifecycle guidance](https://react.dev/learn/lifecycle-of-reactive-effects), and [`act` reference](https://react.dev/reference/react/act) help define the observable baseline. For implementation case discovery, use focused files under the [React DOM test directory](https://github.com/react/react/tree/main/packages/react-dom/src/__tests__) and [reconciler test directory](https://github.com/react/react/tree/main/packages/react-reconciler/src/__tests__). A source test is a lead; the contract written in this project is the test we maintain.

### Next TDD slice

The structural differential trace is implemented in `keyed-structural-differential.html` and `src/browser/keyed_structural_differential.ts`; its Chrome 155 result and seed are saved in `results/browser-keyed-structural-differential-v1.json`. It includes a 128-operation trace over lists of 0–12 items. A separate event trace in `event-source-differential.html` and `src/browser/event_source_differential.ts` verifies native clicks update a `ScalarSource` and bound DOM props/styles with parity against a React 19.3.0 `useSyncExternalStore` baseline, then verifies a removed button cannot change the source; its result is saved in `results/browser-event-source-differential-v1.json`. Neither trace measures time. OXC transforms the supported named-function fixture into TSX and emits a CSR graph from each stable state site to its owning component region; `ComponentStateRoot` uses the graph to select dirty owners. Deno contracts cover conditional sites, keyed identity, failed candidates, graph-selected component execution, mount-only effects, indexed partial commits, and structural fallback without double rendering. The owner cache skips clean component functions while explicit tree updates still force full recomputation. The partial path uses an index from unique host keys to mounted nodes and parent-slot links, so a single eligible owner update avoids scanning clean siblings. A three-process Deno ablation at 100, 1,000, 5,000, and 10,000 siblings compares this path with forced full component rendering. At 10,000, median-of-process-medians was 0.030 ms vs 28.032 ms (932×), with one component render and one partial commit per update, all 75 paired samples favoring the indexed path, and full output parity in every process. This favorable state-local ablation uses an in-memory host; it is not a React or browser comparison, and multi-owner or structural updates fall back to full reconciliation. One Chrome 155 differential matches generated counter events, keyed state/identity, detached-event cleanup, and effect lifecycle against React 19.3.0 `useEffect(..., [])`. A separate production-browser benchmark now compares one compiled owner-local click update against React 19.3.0 with React Compiler at 100, 1,000, 5,000, and 10,000 sibling components. Twelve confirmed production page loads pass the output, identity, render-count, and partial-commit contracts; the results show size-correlated timing in this one leaf-local fixture. They all use the same Chrome 155 profile and MacIntel device, and exclude paint. A follow-up fixture in `component-state-tree-shape-benchmark.html` keeps 10,000 flat DOM leaves and the target local-state update constant while grouping the component tree into 0, 10, 100, or 1,000 keyed Fragment-only groups. It requires three page-load replications per topology and the same correctness/render-count contracts. Browser measurements are pending, so the original flat-tree result remains the only timing evidence for this workload. After the shape study, prioritize multi-owner batches, dynamic shape changes, and lifecycle churn against an equivalently optimized React baseline, then replicate on a second device before widening the performance claim.

## TDD loop for this project

1. Pick one user-facing guarantee and name the smallest representative fixture.
2. Write the observable contract test first; for graph behavior, include the full-scan oracle.
3. Run it against the current implementation and save the expected failure.
4. Implement the narrowest compiler/runtime change that satisfies the contract without introducing a second path users must manually choose.
5. Run the contract suite and the React differential suite for overlapping semantics.
6. Add or update a reproducible benchmark only when the change could alter a product decision; never use a microbenchmark to stand in for the contract test.

The first TDD slice covered the Gate A collection protocol: deterministic URLs validate size, seed, and session before autorunning; the 18-run schedule balances size across two sessions; and saved measurements retain session and page-load identity. `src/keyed_filter_protocol_test.ts` covers URL parsing and schedule invariants, while `deno task gate-a:urls` prints the reproducible collection sequence.

A first value-dependent task graph contract now lives in `src/task_graph_plan.ts`, `src/task_graph_runtime.ts`, and `src/task_graph_runtime_test.ts`. It compiles source/task dependencies into CSR adjacency and a topological order, coalesces shared fan-in, suppresses downstream tasks when an intermediate value is unchanged, rejects cycles, and compares incremental values with a full topological recomputation over a deterministic trace. The notebook saves its affected-task trace to `results/task-graph-runtime-v1.json`. This is a standalone JavaScript kernel, not yet OXC output or JSX scheduler integration. A paired Deno study now runs three serialized fresh processes and 24 randomized pairs per scenario over 1k/10k/50k independent tasks and 0.1%–100% updates; all graph/full-scan outputs match. It finds a repeatable sparse region where graph dispatch wins and a dense region where it loses, so it supports a graph/scan hybrid hypothesis rather than a universal graph advantage. The test omits JSX, VDOM, host writes, and React. OXC now emits a CSR graph from each stable state site to its owning component region, and `ComponentStateRoot` uses that graph to select dirty owner components. This first graph only models direct state ownership; it does not capture derived data dependencies or constrain VDOM traversal yet. Next extend the compiler graph to derived component/prop dependencies and make selected regions constrain VDOM normalization and reconciliation, then compare with forced full recomputation and React in the browser.

The current end-to-end region compiler/runtime contract uses `compiler/fixtures/keyed_filter_regions.tsx`: OXC must emit separate `queryA` and `queryB` edges, shared `rows` fan-out, stable `row.id` keys, and two keyed regions. `scripts/check_derived_region_compiler.ts` checks fresh OXC output against the generated module. `src/derived_region_runtime_test.ts` compares graph-selected commits against a fresh full-tree derivation after both query and shared-row updates, and verifies the untouched region retains its host object. The Gate B contract slice in `src/vdom_snapshot_runtime_test.ts` checks keyed reorder identity, removal and fresh reinsertion, host-type replacement, root disposal, duplicate-key rejection before the affected child list changes, and native event-prop release on removal/disposal. Gate B now includes a VDOM-backed component-state bridge: eight owner/state contracts cover the standalone store and generated component execution with conditional sites, keyed state/host identity, and failed candidates. OXC transforms the supported named-function fixture into TSX; `src/component_state_runtime_test.ts` and the notebook import those generated components directly. State writes coalesce into a microtask commit; the current implementation re-executes the whole component tree rather than using graph-selected invalidation. Browser differential fixtures cover keyed structural edits and native-event-to-source updates against React 19.3.0. `deno task test` now includes five task-graph contracts alongside the existing contracts; `deno task check` type-checks the Deno runtime and generated TSX. Remaining gaps include rejection diagnostics for unsupported component syntax, browser native-event-to-component-state integration, listener replacement, lifecycle effects, transitions, more structural seeds and scale, and browser-level graph mutation.
