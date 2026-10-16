# Rerereact · r3act

**A compiler-first, React-shaped UI runtime for realtime applications.**

> **Research project / private-alpha prototype.** This repository contains active research, an experimental runtime and compiler, runnable examples, a Deno Jupyter notebook, and benchmark evidence. It is not a production-ready or drop-in React replacement. APIs, package boundaries, and supported syntax may change.

## What we are building

Rerereact explores how a UI runtime could work if it kept JSX, declarative components, and a retained virtual tree while rebuilding state ownership, dependency tracking, scheduling, and renderer extension around a compiler and a data-oriented core.

The native application runtime replaces React; React is included for comparison benchmarks and an optional migration adapter. Three.js is one rendering target, not a dependency of every application.

Our central ambition is **one application state model driving multiple renderers**: DOM interfaces, Three.js scenes, and future custom hosts. Known dependencies select affected work; explicit transactions and coordinated publication determine which outputs must become visible together. The existing prototype has shared stores, Worlds, multiple roots, and grouped publication machinery. Fine-grained dependency-scoped admission and complete cross-host consistency are unfinished.

### Design goals

- **Fast declarative realtime props.** Animate transforms, materials, and UI through ordinary props without requiring per-frame ref mutation. Use sparse, clustered, or dense execution over shared identities as the workload requires.
- **A substantive compiler.** Rust/OXC transforms authored TSX, identifies ownership and supported dependencies, and emits executable update plans. Compilation is required for native components.
- **A retained VDOM and stable identities.** Preserve keyed ownership, local state, refs, events, resource lifetime, and an inspectable tree while avoiding unnecessary component execution on eligible paths.
- **Predictable async UI.** Model hard data dependencies explicitly, start independent work early, retain accepted views during transitions, and coordinate Suspense, stores, and forked roots.
- **Simple renderer extension.** Hosts implement object creation, property updates, placement, removal, and lifetime policies. They share the runtime rather than implementing another scheduler or reconciler.
- **A smaller conceptual surface.** Site-identified hooks, `use(store)`, clear public boundaries, and one identity/version/publication model. Maintainability is a goal, not an established comparative result.

## What the evidence says

There are real workload-specific wins, and real losses. Earlier stable-tree binding studies substantially reduced update CPU versus their React baselines. The later integrated dense owner-kernel benchmark loses to React Compiler at all three tested sizes. Async DAG work demonstrates waterfall avoidance versus a sequential control, but no completion-latency advantage over equally preloaded React. Frame presentation, broader compatibility, and maintenance superiority remain unproven.

Read the [paper](paper.md), [empirical appendix](empirical-appendix.md), and [research notebook](research.ipynb) for methods, baselines, limitations, and raw-result references. Do not interpret an isolated microbenchmark as a framework-wide performance claim.

## Current implementation and next steps

The repository includes a JavaScript/TypeScript runtime, a Rust/OXC compiler prototype, Vite integration, DOM and Three hosts, shared stores, async task plans, transitions, root coordination, and examples. The newest compiler/publication/store integration slice has **not passed consolidated verification**.

The immediate work is to finish the shared publication contract: preserve accepted snapshots during structural updates, finalize numeric storage before callbacks, keep dispatch dirty tracking safe on specialization failure, and remove ordinary fallible work from accepted grouped publication. Compiler revision/HMR integration, dependency-scoped admission, and public package portability also remain open.

Then evaluate complete slices with consolidated correctness and bounded matched performance gates. Finish async UX, host/resource conformance, package installation, cold/memory costs, and maintainability evidence before making release claims. The [final master plan](final-master-plan.md) defines the full finish line; its latest execution-authority section supersedes historical freezes and per-patch measurement instructions.

## Repository map

| Path | Contents |
| --- | --- |
| `src/` | Runtime, hosts, stores, scheduling, examples, and contract tests |
| `compiler/` | Rust/OXC compiler, Vite integration, and compiler fixtures |
| `scripts/`, `notebook_cells/` | Research tooling, evidence collection, and notebook support |
| `research.ipynb` | Deno Jupyter research notebook; charts use SVG |
| `paper.md`, `empirical-appendix.md`, `experiment-log.md` | Findings, evidence, and experiment history |
| `results/`, `implementation/`, `.cache/` | Raw results, implementation checkpoints, archived source/build evidence and reviews; reconstructible caches are excluded |
| [RESEARCH-GUIDE.md](RESEARCH-GUIDE.md) | Original detailed authoring, example, and research instructions |
| [HANDOFF-PROMPT.txt](HANDOFF-PROMPT.txt) | Agent handoff, known integration blockers, and evidence limits |

## Working with the prototype

Use the pinned versions in `package.json`, `pnpm-lock.yaml`, and the Cargo manifest/lock. The current package tooling requires Node.js 24 or newer, pnpm, Deno, and Rust/Cargo. Historical evidence was collected on a specific macOS toolchain; portability and package binaries for other platforms remain work in progress.

```sh
pnpm install --frozen-lockfile
```

Follow the [research guide](RESEARCH-GUIDE.md) and [compiler tooling notes](compiler-tooling.md) for the selected example or notebook. Native TSX requires the Vite compiler plugin; importing JSX helpers alone is insufficient. See [Three host documentation](three-host-api.md) for the actual renderer extension contract.

Project development and verification servers use Portless HTTPS. Read [AGENTS.md](AGENTS.md) before running automation. Do not launch focus-stealing browser benchmarks; implement coherent slices before measuring. Existing archived locks and absolute paths describe their original machines and must not be silently rewritten to make a new run appear equivalent.

## Planned monorepo and packages

The long-term distribution is a monorepo with packages such as:

- `@r3act/core`: shared runtime, state model, and public host interfaces.
- `@r3act/vite`: mandatory compiler integration and development tooling.
- `@r3act/dom`: DOM host integration.
- `@r3act/three`: Three host, resource policies, and JSX types.
- An optional React migration adapter, isolated from native applications.

**These are planned names and boundaries, not published packages or a reserved npm scope.** The current checkout is still the research layout. Private packaging experiments use the historical `@compiled-ui/runtime` name; imports have not been cosmetically renamed without completing that migration.

## Origins

This work grew from game and realtime-UI needs, Koota-based behavior experiments, and conversations around Cody Jason Bennett's [react-nylon](https://github.com/CodyJasonBennett/react-nylon). It draws on Preact's smaller-runtime precedent and Xi editor's [Rope Science](https://xi-editor.io/docs/rope_science_00.html) approach to incremental computation. Those are influences, not endorsements or a claim that this repository is their implementation.

## License

[MIT](LICENSE), copyright 2026 Justin Walsh. Existing third-party license and attribution notices remain applicable to their respective material.
