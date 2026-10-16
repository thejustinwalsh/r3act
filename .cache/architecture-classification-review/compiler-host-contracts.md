# Compiler and host contract review

**Scope.** Research-only classification and proposal against the current native compiler/runtime sources, product thesis and implementation plan. This is not a claim that a new design has been measured. The project-level frozen-analysis failure remains the decision context; this review does not convert that failure into a success. The reported 723-test count and adjacent-token lookup remain inputs from the active review, not independent measurements made here.

## Recommendation

Keep the retained keyed VDOM as the semantic structure and correctness path; make the Rust/OXC compiler a required part of native TSX builds. Describe the current compiler honestly as a set of narrow, opt-in program recognizers and lowerers with a few partial-evaluation kernels, rather than as a complete whole-program compiler. Its useful direction is to make stable owners, state sites and dependencies explicit. Its current proof strength is limited to recognized syntax and closed expression subsets.

The core CS classification is **staged programming / partial evaluation over source-known structure**, paired with **static dependency analysis for a restricted language** and **dynamic dependency capture / conservative reconciliation at opaque boundaries**. The proposed “semantic IR vs physical execution IR” split is needed: one normalized semantic plan should express owners, state and store sources, keyed regions, dependencies, host operations, capabilities, and lifecycle. Runtime strategies should be replaceable execution plans (generic VDOM traversal, sparse dependency dispatch, prepared writer batches, dense batch kernel) over that meaning. Today, several compiler modes directly emit/source-edit into runtime calls, so the distinction is more aspiration than enforced architecture.

The highest-value next decision is not another fast-path. It is a versioned semantic contract that says which facts are compiler proofs, which are author/extension declarations, what runtime validates, and which operations remain opaque. The frozen speed failure means performance work should stop until the thesis and this contract are reviewed. A lookup-count reduction alone does not establish a win.

## What the sources implement today

### Classification

1. **Build integration:** `vite_native_module.ts` selects opt-in TSX through import text scanning, runs a persistent Rust process and sends responses back to Vite. OXC parses and resolves symbols; TypeScript/JSX lowering remains Vite's job. See `compiler/vite_native_module.ts` around `componentModuleFromSource` and `nativeModuleCompilerPlugin`, and `compiler/vite_native_plugin.ts` around `nativeModulePlugin`.
2. **AST recognizers and source transformations:** `main.rs` parses native component modules with OXC and builds semantic symbol data, then collectors recognize a limited family of hook, collection, binding and task patterns. It emits metadata plus textual source-span edits. OXC is not a general source-to-source compiler here: comments in `compile_native_component_module` state that Vite performs TS/JSX lowering after this narrow transform (`compiler/oxc-spike/src/main.rs:3306-3313`). The library plan accurately notes that OXC codegen/transformer is not used and source-map-safe general lowering is not present (`library-implementation-plan.md:212`).
3. **Static dependency analysis:** compiler collectors build source-to-sink relationships when references fit supported patterns. Unknown/computed/destructured reads and hidden helper reads remain a trust boundary. The implementation plan says current async task inference can classify unknown inferred reads as external `$input`, which can hide a typo (`library-implementation-plan.md:219`). Treat this as an explicit uncertainty, never as proof of no dependency.
4. **Partial evaluation / specialized execution:** `owner_update_program.rs` accepts a deliberately closed expression grammar (literals, known identifiers, templates, selected unary/binary/logical/conditional expressions; arrays only under a selected policy). It rewrites known state references into row slots and emits a cut evaluator. Numeric expressions outside the closed grammar should bail out. `main.rs:4084-4095, 4097-4135` assembles kernels only where owner layouts and recognized sinks match. This is a plausible code-generation optimization, not an independent runtime compiler/JIT.
5. **Runtime plan execution:** runtime storage mixes stable owner/site cells, store transactions, VDOM snapshots, keyed collection delta paths, numeric columns, writer registrations, and scheduler/candidate machinery. Those are distinct semantic/execution representations already, but there is not yet one authoritative IR envelope describing all paths. Product thesis correctly distinguishes ECS storage, dependency DAG, VDOM, and scheduler as related but non-interchangeable concepts (`product-thesis.md`, “The problem we are solving”).

### Semantic IR versus physical execution IR

A semantic plan should not say “invoke writer 7 in branch 4”; it should say “this keyed owner output reads source sites A/B; property capability `transform.position` receives a 3-number value; its update occurs only after candidate validation and commits through host H.” A backend plan can then map that to direct-writer, sparse, bucketed or dense execution. This division prevents optimization flags from changing ownership, key identity, observable output, effect timing or error semantics.

Current `CompiledStateLayout` and `CompiledOwnerUpdateProgram` are already small pieces of this separation (`src/compiled_state_layout.ts:3-43`), and the runtime validates/normalizes the layout and associates a program (`:71-196`). They are too narrow to be the global plan: other compiler outputs and runtime registries have parallel schemas and identity rules. Avoid replacing them with a single huge class. Keep several small typed tables under one versioned envelope, with normalized IDs and explicit foreign-key relationships.

## Contract boundaries and check placement

| Phase | Establish and check | What must remain opaque / deferred |
| --- | --- | --- |
| **Build / compile** | Parse/type syntax as configured; resolve imported runtime symbols by module and export identity; assign deterministic component/site/region IDs; validate uniqueness and scope; build owner/read/write/effect edges; classify recognized pure expressions; reject unsupported native-owned semantics with span diagnostics or label them dynamic fallback. Build a semantic plan and a separately selected execution plan. Emit source maps and ABI/schema version. | Do not infer purity from TypeScript annotations, names, comments, or “looks numeric.” A callback body calling unknown code is opaque. Getter access and Proxy traps can execute code. A compiler should avoid invoking arbitrary accessors merely to discover metadata. |
| **Registration / load** | Check plan envelope version, IDs, table references, required host capabilities, extension ABI version, slot density/uniqueness, callback/function shape where executable closures are unavoidable, supported purity/effect declaration, and compatibility of selected backend with runtime. Snapshot trusted metadata once. | A structurally well-formed closure is not proved pure because `typeof f === 'function'`. Never let public plugin-provided JS metadata masquerade as compiler-authenticated proof. Separate provenance (`compiler`, `author`, `extension`) and allowed privilege. |
| **Preparation** | Validate current owner/key/generation, captured source/store versions, collection base version, VDOM identity and host-operation preconditions. Evaluate opaque/user component code only under the runtime's documented speculative contract; stage state/store/effects and host writes. If a callback can mutate externally, it cannot be safely re-run or speculated. | Do not mutate committed owner lifetimes, host references, effects, or shared-store publication while preparing a candidate. Do not “trust the compiler” about live row generations, current base versions, or host liveness. |
| **Commit** | Recheck only race-sensitive versions/generations and operation ownership if time can pass between preparation and commit; publish one candidate/host batch; then run lifecycle callbacks and notifications at their declared boundary. Any stale prepared token fails before writes. Preserve terminal/controlled recovery semantics after partial host side effects. | Do not rerun static schema validation or derive dependencies again here. Host custom setters/writers can throw or re-enter, so commit is a side-effect boundary, not a pure atomic transaction. Do not claim rollback of external effects. |
| **Hot update / invalidation** | Version semantic component identity separately from file location. Preserve owner/site identity only when a compiler-produced compatibility map proves it; otherwise dispose/remount affected component subtree. Invalidate execution caches and source maps with the module revision. | Never treat a source offset, nearby token, generated ordinal, or unchanged site string alone as durable identity after edits. Avoid preserving state across a changed initializer/type/meaning without a compatibility rule. |

Checks are genuinely redundant only when an immutable normalized value, owned by a trusted boundary and keyed to a specific schema/version, has already been validated and no mutator can change it. For example, a frozen snapshot of site-to-slot metadata can skip revalidation in every hot-loop invocation; it cannot skip owner generation validation or current store-version validation. A TS declaration or public object can be forged, mutated, proxied, or provide a hostile getter, so one-time validation is not inherently enough until copied using controlled reads and ownership is clear.

### Effects, conditional sites, stores, callbacks

Compiler-assigned static lexical hook sites make a useful semantic difference: each state/effect/store site is addressed by `(owner, site)` instead of hook call order. Conditional state calls can then retain identity without shifting later slots, as long as activation/deactivation and repeated keyed scopes are defined. Existing runtime APIs use explicit site IDs (`src/component_state_runtime.ts:568-637`). This is React-shaped syntax, not React's dispatcher/behavior.

`useEffectAt` currently describes activation lifecycle: render records registrations; effects reconcile after commits; a site that remains present is not set up again, while removed sites clean up (`src/component_state_runtime.ts:584-593, 2395-2447, 3049-3090`). That is a defensible native `useEffect` contract only if prominently named/documented as mount/activation synchronization. React `useEffect` models synchronization with external systems and dependency changes; React docs explicitly recommend effects for external systems. Keep effect-like “update when these reads change” tasks as a separate dependency-tracked subscription/task API. Either accept and teach the semantic difference for native `useEffect`, or choose a distinct name (`useMountEffect`/`useActivation`) and provide an explicit compatibility adapter. Never imply arbitrary React effect equivalence.

`use(store)` is a good surface for read semantics only if its boundaries are crisp: stable site registration for stores; resource/thenable reads unwrap/suspend; a store whose value happens to be a promise requires a second `use` (the native API documents this distinction, `src/native_runtime_api.ts:107-118`). Validate the store capability once at registration and capture snapshots/version in the transaction. Avoid repeatedly probing user-provided `.read` getters during preparation; accessors can run code. Source-level detection of store vs thenable is not a purity proof. Store reads must record dynamic dependencies unless a trusted compiler proof supplies exact static edges.

Ordinary React-looking JSX props should remain declarative and efficient per frame. On recognized expressions, compile reads into property bindings or a typed value/task edge; emit direct column/writer kernels only for closed/pure forms; retain generic VDOM recomputation for opaque props and structural changes. The example author should not need refs or manual frame-loop writes. Do not call arbitrary prop callbacks in a pre-commit “purity check”; either run them in documented non-speculative compute, require explicit opt-in/purity contracts, or carry them as commit-only host work.

## Host, store, scheduler and kernel boundaries

Recommended internal boundaries (not necessarily npm packages):

- **Compiler frontend (Rust/OXC):** module selection; symbol-aware parsing; diagnostics; stable logical sites; semantic plan; host JSX type generation input; source maps. Keep Vite as integration/lowering partner until Rust codegen is deliberately adopted.
- **Plan/ABI layer:** versioned, inspectable, immutable descriptors for owners, sites, edges, keyed regions, effects, sources, host properties/capabilities, and execution-plan references. IDs scoped to module + compiler ABI; no process pointers/host handles in the serialized plan.
- **Kernel/world:** owner generations, state cells, trait/column storage, dependency index, keyed identity registry. This owns mutation and lifetime invariants.
- **VDOM semantics:** complete current declaration and key identity; generic reconciler remains oracle/fallback. Specialized paths must preserve same output and host identity.
- **Store/resource layer:** versioned input snapshots, transactional candidate reads, subscriptions, resource readiness/error. Store and local-state physical storage need not match; their causal events need shared version/ownership semantics.
- **Scheduler/candidate layer:** preparation, cancellation, stale detection, priority/reveal and commit coordination. It accepts validated task descriptors/capabilities instead of arbitrary edits to its internal mutable queues.
- **Host interface:** declarative create/text/property/event/place/remove/dispose operations plus optional typed property writer and lifecycle capability registry. Host owns mapping property IDs to DOM property/attribute/style or Three constructors/writers. It does not own component identity or store policy.
- **Adapters:** DOM/Three and React boundary adapters. A React wrapper owns a bounded container; props/events cross explicitly; context, refs, effects, portals and scheduler semantics do not magically cross.

Three's current host already demonstrates a useful dynamic namespace shape: `ThreeHostOptions` accepts a constructor namespace plus explicit factory and property-writer registries (`src/three_host.ts:42-88`); runtime constructor lookup turns exported names into factories (`:144-208`). Keep that runtime lookup simple and dynamic. Compile-time JSX declarations can derive `IntrinsicElements` from a host-supplied type map (`compiler/host_jsx_declarations.ts:1-90`); generated types tell editors what is valid but do not establish runtime constructor existence, resource ownership, purity, or commit safety. Runtime capability resolution still validates at registration/mount. One host should be able to graft into a root/parent, with the host declaring supported parent/child relations and disposal ownership.

EC-style traits can describe typed component data, while host capabilities describe executable operations. A user-defined trait does not automatically become transferable, serializable, pure, or thread-safe. A graph query can expose read-only dependency relationships, versions and plan explanations; it must not grant mutation access to scheduler maps. Safe compiler hints should be capability-scoped, versioned declarations that can cause optimization only after runtime validation; unknown or unverifiable hints select the general VDOM path.

## Extension ABI and downstream protocols

An extension should register a small manifest: ABI/schema version; stable namespaced capability IDs; value encodings; allowed input/output types; declared reads/writes; lifecycle and disposal policy; purity/speculation/thread/serialization claims; host/property ownership. The core can validate shape and conflicts and query dependencies. A declaration is not mathematical proof of purity; untrusted extensions should be treated as effectful and main-thread/commit-only unless sandboxed or otherwise verified. Do not expose private owner maps, reconciler objects, direct queue mutation, or arbitrary callbacks labeled “pure.”

If a later worker/stream/Wasm backend is considered, the plan boundary should already exclude runtime closures and live handles. Define canonical IDs, schema negotiation, module hash/revision, source revision, owner/key generation, base/target version, chunk identity/order, cancellation, replay/idempotency, capability requirements and deterministic failure/fallback. Streams need duplicate, gap, out-of-order and stale-revision rules. Wasm needs explicit numeric value layout, memory ownership, JS/Wasm boundary costs and exact semantic parity. This is protocol design only; it is not justification to build either feature now. The product thesis already gates worker/stream and Wasm on named workload evidence (`product-thesis.md:50-57`).

## Identity, incremental recompilation and HMR

Lexical site identity is good within an unchanged module, but edit stability is a separate feature. Current implementation-plan inventory explicitly says there is no edit-stable HMR site identity (`library-implementation-plan.md:218`). Do not make adjacency tokens/offsets an identity source without repeatable measurements and collision/edit proofs. Preferred staged design: compiler emits site IDs derived from module identity + AST role/path and a source map; a revision-to-revision compatibility table matches prior/new component and site identities only when structure and semantic type/initializer remain compatible; otherwise remount only the smallest affected owner subtree. Keep runtime owners keyed by `(component identity, keyed instance identity, generation)`. Changing key intentionally creates a new owner; HMR mapping may preserve state only under an explicit compatibility rule. Recompilation invalidates module-level execution tables but should not force all roots to remount when compatibility is proven.

## Product/claim review and old-path policy

Do not claim “React is slow because VDOM.” React has a build-time React Compiler that automatically memoizes values/components, analyzes data flow and mutability, and can skip unnecessary work. Official React docs describe component/hook compilation and say the compiler can retain only relevant render work; they also recommend pure rendering. Preact offers both VDOM/hooks and Signals/fine-grained updates; its official docs establish a valid alternative design, not a universal benchmark. The project must compare the same product workload and current React Compiler/selector-store baseline, including mount, structure, update CPU, allocation, memory and input responsiveness. No conclusion about comparative speed follows from architecture labels alone.

What is genuinely differentiated to test: lexical owner/site identity across conditional activation; shared semantics for native DOM and object-graph hosts; direct dependency-reachable host updates while preserving a full VDOM and ordinary JSX; versioned candidate preparation and coherent host/store publication. These are hypotheses. The repository's product thesis calls them gates, and the existing registered mixed timing comparison is recorded as failing in `numeric-state-lanes-cpu-findings.md`; sampled profiles or fewer lookups cannot reverse that failure.

Compatibility should be an explicit ladder: (1) TSX syntax; (2) documented React-shaped authoring subset; (3) bounded React island; (4) per-library bridge; (5) full React renderer compatibility only if separately funded. The React adapter itself documents the bounded div and context/ref/portal/lifecycle limits (`src/react_native_adapter.ts:14-86`). The library plan similarly treats arbitrary React packages as out of scope (`library-implementation-plan.md:198-204`). Keep React island as an adoption path if users need it; retire aliases such as `useStore` only after migration guidance and compatibility window, not because it is aesthetically redundant. Retire failed prototypes, duplicated executors, and pre-plan APIs only after proving the general VDOM path covers their users and retaining test/benchmark evidence.

Avoid feature-policy sprawl. Do not add N independent boolean fast-path modes. Use capability selection from one semantic plan: each region advertises `generic`, `sparse`, `prepared`, or `dense` eligibility and one policy chooses an execution plan from declared constraints and measured batch facts. Record one selected backend and one fallback reason for diagnostics. Maintain one semantic oracle; do not maintain separate VDOM/binding worlds.

A literal monolithic class is not the only alternative to fragmentation. The maintainability metric is invariant fanout: how many modules can mutate ownership, site identity, source versions, prepared-row validity, host identity, or lifecycle state? Move each invariant behind one owner even if it coordinates several private tables. Evaluate change cost, state duplication, transitions, fallback correctness and debug visibility, not line count. The compiler's 7,652-line `main.rs` and numerous runtime modules suggest an extraction opportunity by coherent pass/data model, not proof that the architecture is bad solely because of LOC.

## Review verdict and finite next decision

**Continue only as a bounded compiler/VDOM product experiment with a contract-first pause.** Preserve the VDOM as semantic oracle. Make Rust/OXC mandatory for native authoring, with a clearly documented syntax subset and hard failures for unsupported native ownership. Turn generated metadata into one versioned semantic plan plus a separately selected execution plan. Define `useEffect` native semantics, use/store distinction and extension trust levels before advertising compatibility. Then require a new frozen product comparison to pass the pre-registered user-facing gates before expanding fast paths, workers, streams or Wasm.

The project is not worth continuing as a performance product if, after the contract is stable and the workload includes structure/mount as well as hot updates, the native path still fails the published comparison gates or needs users to leave declarative JSX and manually micromanage frame updates. It may still have value as a host/runtime research library, but that is a different product decision and should not be smuggled in as proof of the current thesis.

### Finite decisions for the owner review

1. Approve or reject the semantic-plan / execution-plan separation and the staged compilation classification.
2. Choose native lifecycle-only `useEffect` vs a separate `useActivation`/compatibility facade; add a distinct read-driven task/subscription API either way.
3. Decide whether native component/store dependencies are statically proven, dynamically captured, or mixed with explicit opaque fallback; never treat unknown reads as empty edges.
4. Freeze the extension provenance/capability/serialization ABI before allowing third-party executable hints.
5. Decide the smallest HMR-compatible state-preservation rule; default to remount on uncertainty.
6. Keep React island and Three host as bounded adapters; no drop-in React claim.
7. Require a passing new frozen benchmark/product gate before more execution strategies; adjacent-token lookup remains unmeasured until run under the same protocol.

## Sources

### Repository evidence

- `compiler/oxc-spike/src/main.rs:3130-3348, 4084-4195, 4396-4449`
- `compiler/oxc-spike/src/owner_update_program.rs:1-199`
- `compiler/vite_native_module.ts:1-260`; `compiler/vite_native_plugin.ts:1-110`; `compiler/host_jsx_declarations.ts:1-90`
- `src/compiled_state_layout.ts:1-203`; `src/jsx_binding_runtime.ts:1-310`; `src/native_runtime_api.ts:1-149`
- `src/component_state_runtime.ts:272-320, 568-639, 2395-2480, 3049-3090`
- `src/three_host.ts:42-208, 291-330`; `src/react_native_adapter.ts:14-86`
- `product-thesis.md:1-145, 236-335`; `library-implementation-plan.md:156-220`
- `numeric-state-lanes-cpu-findings.md:1-15`

### Primary external references

- React Compiler introduction and current scope: https://react.dev/learn/react-compiler/introduction
- React Compiler 1.0 and its HIR/data-flow/mutability analysis: https://react.dev/blog/2025/10/07/react-compiler-1
- React `useEffect` reference: https://react.dev/reference/react/useEffect
- Preact Signals guide: https://preactjs.com/guide/v10/signals/
- Preact hooks/effects guide: https://preactjs.com/guide/v10/hooks/

These sources support claims about the competing architecture's current capabilities and semantics; they do not substitute for a controlled benchmark against this project.
