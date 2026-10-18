# Rerereact · r3act

**A compiler-first, React-shaped UI runtime for realtime applications.**

> **Research project / private-alpha prototype.** This repository contains active research, an experimental runtime and compiler, runnable examples, a Deno Jupyter notebook, and benchmark evidence. It is not a production-ready or drop-in React replacement. APIs, package boundaries, and supported syntax may change.

## What we are building

Rerereact explores how a UI runtime could work if it kept JSX, declarative components, and a retained virtual tree while rebuilding state ownership, dependency tracking, scheduling, and renderer extension around a compiler and a data-oriented core.

The native application runtime replaces React; React is included for comparison benchmarks and an optional migration adapter. Three.js is one rendering target, not a dependency of every application.

Our central ambition is **one application state model driving multiple renderers**: DOM interfaces, Three.js scenes, and future custom hosts. Known dependencies select affected work; explicit transactions and coordinated publication determine which managed outputs advance together. The current prototype has shared stores, Worlds, multiple roots, and an explicit joint transaction for closed primitive prop cells plus selected collection move/remove edits. One compiler-proven resource leaf can reveal independently from an accepted initial fallback; broader resource/reveal and structural transactions remain unfinished. Host setters can observe intermediate physical writes, so this is not cross-host visual atomicity.

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

The repository includes a TypeScript runtime, mandatory Rust/OXC native compilation, Vite integration, DOM and Three hosts, shared stores, async tasks, transitions and root coordination. The latest Store-host slice passes **870 runtime tests**, **44 Rust tests**, twelve actual compiled fixtures, seven Three conformance cases, retention checks and a fresh consumer of all five private-alpha packages. Compiler-proven direct numeric `use(store)` leaves now update DOM/Three props beside unrelated waiting resources; `prepareStores` / `enqueueStores` declare coherent Store cuts. Suspended direct tree intent and ordinary closed local prop updates retain their existing contracts. The single Store dispatch-to-observer comparison was slower for Native (1.7/0.5 ms). See the [checkpoint](implementation-checkpoint.md) and [source, gates and evidence limits](implementation/2026-10-18-store-host/results.md).

`prepareTransaction({ cells, collections })` and `NativeRootWorkQueue.enqueueTransaction` declare a joint cut over complete closed primitive binding inputs and selected existing-row collection move/remove operations. Independent supported cuts can publish through the shared queue. Whole-tree/cache replacements retain whole-root guards; authored collection insert/replace and opaque render callbacks take the generic path. General structural/cache changes and broader resource/reveal admission remain open. One new N=1,024 mixed browser pair passed output, identity and lifecycle checks, while native's 0.85 ms median exceeded React Compiler's 0.50 ms median (ratio 1.70). This is [one descriptive pair](implementation/2026-10-18-first-pass/benchmark/proof-v1/pair-one-shot.json), with no speed qualification or tail, heap, cold-mount replication or second-device claim. The previous local structural pair also remained unresolved near the timer floor.

The new closed-resource subset lets one accepted initial fallback reveal beside an unrelated Store-pending sibling. Its [single manual settlement diagnostic](implementation/2026-10-18-host-reveal/benchmark/proof-v1/pair-one-shot.json) observed 1.9 ms Native and 256.6 ms React to the first matching MutationObserver callback. This includes scheduling/observer delivery and excludes paint; it is no CPU, tail, network or broad async UX qualification. The subsequent [two-ready-boundary diagnostic](implementation/2026-10-18-reveal-workset/benchmark/proof-v1/pair-one-shot.json) passes with 1.4/258.2 ms intervals and the same limits. Supported ready boundaries now drain through independent receipts; complex resource shapes remain generic. The [native authoring reference](docs/native-authoring-reference.md) documents the supported subset and fallbacks.

The [single synthetic-click diagnostic](implementation/2026-10-18-urgent-retained/benchmark/proof-v1/pair-one-shot.json) observed 1.6/0.8 ms Native/React to the matching MutationObserver callback. Native was slower; scheduling and observer delivery are included, paint excluded, with one observation per arm. This is no physical-input, CPU, tail or general speed qualification. The subsequent [direct-request pair](implementation/2026-10-18-direct-intent/benchmark/proof-v2/pair-one-shot.json) preserves the latest requested props, host identity, local state and visibility across obsolete settlement; its final settlement intervals are 0.6/0.2 ms Native/React at a 0.1 ms timer quantum. Native was slower in both narrow observations. These intervals are before paint and include scheduling/delivery; broad async UX remains unqualified.

Then evaluate complete slices with consolidated correctness and bounded matched performance gates. Finish async UX, host/resource conformance, package installation, cold/memory costs, and maintainability evidence before making release claims. The [final master plan](final-master-plan.md) defines the full finish line; its latest execution-authority section supersedes historical freezes and per-patch measurement instructions.

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

Follow the [research guide](RESEARCH-GUIDE.md) and [compiler tooling notes](compiler-tooling.md) for the selected example or notebook. Native TSX requires the Rust/OXC Vite plugin; importing JSX helpers alone is insufficient. Run `pnpm package:r3act` to build the five local tarballs and `pnpm check:r3act-packages` for the fresh installed-consumer gate. The current package build and consumer check passed; earlier install and executable-mode failures remain preserved in the [verification record](implementation/2026-10-18-first-pass/verification/). See [package installation and configuration](native-package-integration.md) and [Three host documentation](three-host-api.md).

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

## Origins

This work grew from game and realtime-UI needs, Koota-based behavior experiments, and conversations around Cody Jason Bennett's [react-nylon](https://github.com/CodyJasonBennett/react-nylon). It draws on Preact's smaller-runtime precedent and Xi editor's [Rope Science](https://xi-editor.io/docs/rope_science_00.html) approach to incremental computation. Those are influences, not endorsements or a claim that this repository is their implementation.

## License

[MIT](LICENSE), copyright 2026 Justin Walsh. Existing third-party license and attribution notices remain applicable to their respective material.
