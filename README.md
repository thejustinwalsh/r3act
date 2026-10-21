# Rerereact · r3act

**A compiler-first, React-shaped UI runtime for realtime applications.**

> **Research project / private-alpha prototype.** This repository contains active research, an experimental runtime and compiler, runnable examples, a Deno Jupyter notebook, and benchmark evidence. It is not a production-ready or drop-in React replacement. APIs, package boundaries, and supported syntax may change.

## What we are building

Rerereact explores how a UI runtime could work if it kept JSX, declarative components, and a retained virtual tree while rebuilding state ownership, dependency tracking, scheduling, and renderer extension around a compiler and a data-oriented core.

The native application runtime replaces React; React is included for comparison benchmarks and an optional migration adapter. Three.js is one rendering target, not a dependency of every application.

Our central ambition is **one application state model driving multiple renderers**: DOM interfaces, Three.js scenes, and future custom hosts. Known dependencies select affected work; explicit transactions and coordinated publication determine which managed outputs advance together. The current prototype has shared stores, Worlds, multiple roots, and an explicit joint transaction for compiler-proven numeric Store outputs, closed local prop cells and selected collection move/remove edits. A finite compiler-proven resource subtree can reveal independently from an accepted initial fallback and retire static fallback component owners; broader resource/reveal and structural transactions remain unfinished. Host setters can observe intermediate physical writes, so this is not cross-host visual atomicity.

### Design goals

- **Fast declarative realtime props.** Animate transforms, materials, and UI through ordinary props without requiring per-frame ref mutation. Use sparse, clustered, or dense execution over shared identities as the workload requires.
- **A substantive compiler.** Rust/OXC transforms authored TSX, identifies ownership and supported dependencies, and emits executable update plans. Compilation is required for native components.
- **A retained VDOM and stable identities.** Preserve keyed ownership, local state, refs, events, resource lifetime, and an inspectable tree while avoiding unnecessary component execution on eligible paths.
- **Predictable async UI.** Model hard data dependencies explicitly, start independent work early, retain accepted views during transitions, and coordinate Suspense, stores, and forked roots.
- **Simple renderer extension.** Hosts implement object creation, property updates, placement, removal, and lifetime policies. They share the runtime rather than implementing another scheduler or reconciler.
- **A smaller conceptual surface.** Site-identified hooks, `use(store)`, clear public boundaries, and one identity/version/publication model. Maintainability is a goal, not an established comparative result.

## What the evidence says

The 21 October structural-scope/shared-clock slice passes 69 consolidated phases (1129 runtime tests, 93 Rust tests and 49 compiled fixtures). Equal component keys under separate host parents retain independent state; closed Store validation scans readers once per check. The sole installed canvas comparison still loses: Native publication median/p95 3.10/3.80 ms versus React Compiler 0.20/0.20 ms. Outputs, retained identity and cleanup pass; no causal saving or release speed claim follows. [Results and preserved failures](implementation/2026-10-21-structural-owner-scope/results.md).

The 21 October retained-child Store-clock slice passes 68 consolidated phases (1114 runtime tests, 93 Rust tests and 48 compiled fixtures). One shared Store drives retained wrapper props without component rerenders. Its sole canvas comparison remains much slower than React Compiler: publication median/p95 10.70/12.90 ms versus 0.60/0.90 ms. Values, identity and exposed cleanup pass; release speed and lifecycle qualification remain open. [Results and preserved failures](implementation/2026-10-21-retained-store-clock/results.md).

The 21 October ranged owner-kernel slice passes 67 consolidated phases (1108 runtime tests, 90 Rust tests, 47 compiled fixtures). Compiled programs reuse whole-cut buffers across heterogeneous ranges. The sole current canvas comparison still favors React Compiler: Native publication median/p95 1.50/3.00 ms versus 0.80/1.10 ms. Values, identity and cleanup pass; no causal saving or release speed claim follows. [Results and preserved failure](implementation/2026-10-21-ranged-owner-kernels/results.md).

The 21 October shared numeric expression DAG slice passes 65 consolidated phases (1102 runtime tests, 90 Rust tests and 46 compiled fixtures). Its three-prop installed canvas workload still favors React Compiler: Native publication median/p95 1.60/3.00 ms versus 0.90/1.30 ms. Actual compiler sharing, values, identity and cleanup pass; this establishes no causal saving against the earlier one-prop workload. [Results and preserved failures](implementation/2026-10-21-numeric-expression-dag/results.md).

The 21 October component-output identity slice passes the consolidated gate (1102 runtime tests, 85 Rust tests and 45 compiled fixtures), including constant-host-key remounts and Suspense fallback adoption. Its one current-source canvas comparison remains slower than React Compiler: update/publication median/p95 1.60/2.40 ms versus 0.60/0.80 ms. This is a correctness milestone, with realtime performance, HMR delivery and lifecycle qualification still open. [Exact results and preserved failures](implementation/2026-10-21-component-output-identity/results.md).

There are real workload-specific wins, and real losses. Earlier stable-tree binding studies substantially reduced update CPU versus their React baselines. The later integrated dense owner-kernel benchmark loses to React Compiler at all three tested sizes. Async DAG work demonstrates waterfall avoidance versus a sequential control, but no completion-latency advantage over equally preloaded React. Frame presentation, broader compatibility, and maintenance superiority remain unproven.

Read the [paper](paper.md), [empirical appendix](empirical-appendix.md), and [research notebook](research.ipynb) for methods, baselines, limitations, and raw-result references. Do not interpret an isolated microbenchmark as a framework-wide performance claim.

## Current implementation and next steps

The earlier [const-arrow compiler boundary](implementation/2026-10-19-arrow-components/results.md) passes a 43-step Darwin gate with **1,017 runtime tests, 68 Rust tests, 27 actual compiled executions and 13 fresh-package checks**. An installed browser verifies that example's finite DOM/Three, state, resource and cleanup behavior. Earlier [compiler-artifact](implementation/2026-10-18-compiler-artifacts/results.md), [mixed transaction](implementation/2026-10-18-first-pass/benchmark/proof-v1/pair-one-shot.json), [resource reveal](implementation/2026-10-18-reveal-workset/benchmark/proof-v1/pair-one-shot.json) and [urgent-input](implementation/2026-10-18-urgent-retained/benchmark/proof-v1/pair-one-shot.json) milestones retain their own source and comparison limits; their counts and timings do not describe the latest source.

Local compiler packages have actual Darwin ARM64 and older GNU Linux ARM64 execution receipts. The latter predates recent source changes. The new native/React Vite composition passes offline package and plugin checks, while current workbench HMR delivery remains unresolved. Authored realtime median/p95, cold and retained-memory budgets, physical presentation, current other-platform execution and independent-device evidence remain open. Human maintenance study participants remain zero. See the [checkpoint](implementation-checkpoint.md) and [final master plan](final-master-plan.md) for the full status and finish line.

For a first public-package application, use [installation and Vite configuration](native-package-integration.md#install-the-local-tarballs), then the [native authoring reference](docs/native-authoring-reference.md). The [installed DOM/Three/Dialog example](examples/installed-scene/README.md), [forked-transition example](examples/forked-transitions/README.md) and [custom-host example](examples/custom-host/README.md) show bounded public imports. Look up the Three host's API and ownership rules in the [public Three host reference](docs/three-host-reference.md).

## Repository map

| Path | Contents |
| --- | --- |
| `src/` | Runtime, hosts, stores, scheduling, examples, and contract tests |
| `compiler/` | Rust/OXC compiler, Vite integration, and compiler fixtures |
| `packages/` | Private-alpha workspace manifests for one core runtime, Vite compiler, thin host packages, and React bridge |
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

Use [package installation and configuration](native-package-integration.md) for a consumer and [native authoring](docs/native-authoring-reference.md) for the supported TSX subset. Native TSX requires the Rust/OXC Vite plugin; importing JSX helpers alone is insufficient. Run `pnpm package:r3act` to build the five local tarballs and `pnpm check:r3act-packages` for the fresh installed-consumer gate. The [research guide](RESEARCH-GUIDE.md) and [compiler tooling notes](compiler-tooling.md) cover checkout experiments and historical design details; the [public Three host reference](docs/three-host-reference.md) covers current package imports.

Project development and verification servers use Portless HTTPS. Read [AGENTS.md](AGENTS.md) before running automation. Do not launch focus-stealing browser benchmarks; implement coherent slices before measuring. Existing archived locks and absolute paths describe their original machines and must not be silently rewritten to make a new run appear equivalent.

## Private-alpha workspace packages

The checkout now has five `@r3act/*` workspace packages and a local tarball builder:

| Package | Role |
| --- | --- |
| `@r3act/core` | Sole runtime module graph, state/World authority, native API and JSX runtime |
| `@r3act/vite` | Rust/OXC native TSX compiler and Vite integration |
| `@r3act/host-dom` | Thin DOM exports from core |
| `@r3act/host-three` | Thin Three host and JSX exports from core; Three is its peer dependency |
| `@r3act/react-bridge` | Optional React adapter exports from core; React is its peer dependency |

**These artifacts are unpublished; the namespace is unreserved.** The older private `@compiled-ui/runtime` package route and its dated evidence are preserved. The new host and bridge packages re-export core so they do not create additional World instances. See [package installation and configuration](native-package-integration.md) for tarball paths, setup, platform limits and the consumer gate.

The [installed DOM/Three/Dialog example](examples/installed-scene/README.md) demonstrates shared state, declared publication groups, independent resources and a bounded React island using public package imports. Its [verified scope and failures](implementation/2026-10-19-installed-scene/results.md) remain separate from performance and release qualification.

## Origins

This work grew from game and realtime-UI needs, Koota-based behavior experiments, and conversations around Cody Jason Bennett's [react-nylon](https://github.com/CodyJasonBennett/react-nylon). It draws on Preact's smaller-runtime precedent and Xi editor's [Rope Science](https://xi-editor.io/docs/rope_science_00.html) approach to incremental computation. Those are influences, not endorsements or a claim that this repository is their implementation.

## License

[MIT](LICENSE), copyright 2026 Justin Walsh. Existing third-party license and attribution notices remain applicable to their respective material.
