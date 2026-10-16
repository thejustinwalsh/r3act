# Sol high review request

Read the instructions, notebook, original plan, implementation and evidence directly. Do not work from a primary-agent synopsis.

## User request (verbatim)

“Send out a Sol high agent to do a full review, and tell me if we just rewrote react with no improvement. I want to know if we are on track to meet our original goals here. Hold this review until after your prove a three.js reconciler, and that implementing that reconciler is easier to maintain than a custom reconciler react-three-fiber maintains now.”

## Original product requirements from the user (verbatim)

“And to shape the product it is probably best to describe the short comings of react the things that the community collectively agrees is frustrating, while maintaining compatibility with the react ecosystem (requires adapter).

- view transitions still have not shipped
- async store updates are flawed
- order based hooks that cannot be conditional is annoying
- rendering so slow, memoization helps, but could be faster
- context is good with compiler, but updating context rerendering the whole tree is slow, primitive is good
- react doesn’t guarantee rerender count
- taking a ref to hack around skipping re-renders feels like a hoop, prop updates should be fast
- suspense waterfalls, suspense should know the whole tree, pre warm the whole tree, and preload the state as its ready, but synchronize the mount. Fingers almost get it right
- true concurrency in rendering not work stealing would be ideal
- multiple roots in react is clunky, roots grafted anywhere in the tree with any reconciler sharing state is ideal
- synchronizing work across workers as many as you want would be killer
- pre-rendering on a server, or caching a pre-rendered initial state to save on cold start time  would really help the story
- RSC is a mistake, primitives to stream state from the server is what we want
- hydration is hard to work with and fragile, it exists to add interactivity while getting a first pair faster, is there a streaming solution to hydration that isn’t so fragile, that doesn’t depot and mismatch, doesn’t this sound like CRDT hydration story?

That’s it that is what we want to solve, I want us to write about how to build that, I want to end up with that product in hand, and compilers are a proven today, so let’s get there.”

“Which is a cool concept but I think staying pure JS might be the first win.”

“The goal for the store was to have an api that looked like `use(store)` over `useStore`. Is our store api well aligned to fit that model?”

“Yes, our implementation always requires a compiler no matter what, it is how it works, we need a vite plugin for zero config that supports HMR etc.”

Treat these as product requirements and hypotheses to verify, not as established claims about current React releases.

## Read directly

- `library-implementation-plan.md`, including its original requirements, gates and later dated implementation notes.
- `research.ipynb`: actual cells, code and outputs. Follow its raw evidence/protocol links where needed; do not replace the notebook with summaries.
- `product-thesis.md`, `paper.md`, `empirical-appendix.md`, `testing-strategy.md`, `README.md`, relevant protocols and raw `results/` records.
- All production native source and compiler paths, their imports, generated plans, actual TSX demos, public adapters and tests. Separate research-only experiments from the product dependency closure yourself.
- `implementation/2026-10-12-three-host/status.json`, its manifest/source-and-build archive and all `verification/` outputs/scripts. Earlier immutable checkpoints remain available for comparisons.
- `three-host-api.md` and `three-host-maintenance-baseline.md`. Inspect the pinned R3F checkout `/Users/tjw/Developer/react-three-fiber` read-only; the baseline is a lead, not a conclusion.
- The working Three page at `https://async-transition-stress.localhost:1355/native-three-host.html`. The running project server is already through Portless. Reuse it if browser inspection is useful; do not launch another server.

## Stage 1: prerequisite gate (mandatory)

Independently check the Three implementation, compiled authoring, real browser evidence, owned/borrowed resources, events, refs, updates, keyed structure, cleanup and public extension exercise. Determine whether the evidence actually proves the requested comparison: implementing/maintaining this rendering host is easier than the R3F custom renderer on a fair matched scope.

Count displaced complexity in the native kernel, compiler, scheduler and shared VDOM. Account for R3F features that are absent. Do not infer maintenance superiority from line counts, lack of React imports, a small required interface, or one AI extension exercise alone. Distinguish a simpler integration protocol from lower total or long-term maintenance cost.

If the maintenance prerequisite is unproven or contradicted, **hold the full original-goal review**. Write `sol-review-prerequisites.md` with the exact gap, source evidence and a finite next proof. Do not silently waive the user's gate or pretend a human maintenance study took place. You may report prerequisite defects necessary to explain that decision. Do not produce a full-library verdict in this branch.

## Stage 2: full review, only after the prerequisite passes

Review the whole original product goal and current library/compiler, not just Three or green test counts. Answer whether this is merely React rebuilt with no improvement, whether the architecture is moving toward the intended product, and what evidence supports or contradicts each claimed win. Examine performance, size, memory, simplicity, extension boundaries, state/store semantics, conditional hooks, structural updates, task DAG/prewarm/Suspense, transitions, multiple roots, React interoperability, compiler correctness/diagnostics/source maps/HMR and packaging.

Inspect actual React and Preact source when making comparisons; local source is preferable when available. The implementation plan intentionally defers optional workers/streaming/hydration/Wasm behind prerequisites; evaluate that direction without claiming those backends exist. Check whether latency, maintained scope and compatibility comparisons are fair and whether improvements survive representative mixed workloads.

Write `sol-full-library-review.md` with prioritized concrete findings (file/line evidence), a requirement/evidence table, narrow demonstrated benefits, failures, uncertain claims and the next finite decisions. State what would make the project not worth continuing. Give independent judgment; do not endorse the primary agent's narrative. Do not redefine the original goal to fit the current prototype.

## Work boundaries

This is review work. Do not change implementation, historical notebooks, protocols, archives or upstream checkouts. You may run bounded existing checks or temporary browser/read-only probes; no new listening server. Use current source and external state as authority. Preserve reports as new files. Do not dispatch another reviewer in place of your own examination.
