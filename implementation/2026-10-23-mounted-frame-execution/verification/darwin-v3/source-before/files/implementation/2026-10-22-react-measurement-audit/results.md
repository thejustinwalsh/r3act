# What the React update timer measures

The audit supports the timer as a measure of the synchronous React-to-Three **property update**. It does not measure mounting the scene, WebGL rendering, readback or presentation. The prior 0.70 ms median remains an observation from its original episode, not a fixed React cost: the unchanged Compiler-on asset measured 0.95 and 0.90 ms medians in this study.

The earlier investigation localized Native overhead without proving this React boundary. This study directly addresses that missing question. Production code and prior results remain unchanged. [Raw receipt](evidence/run-v2/receipt.json), [186,424 ordering events](evidence/run-v2/ordering-events.json), and [independent primary recomputation](primary-review.json) preserve the evidence.

## Did React start early or finish late?

In the copied, instrumented Compiler-on asset, every one of 72 frames recorded this sequence inside the original `updateStart..publishEnd` expressions:

1. Introduce the new clock snapshot, then invoke all 257 subscription callbacks.
2. Enter one synchronous root render, executing 128 Position components, 128 Rotation components and one FrameMarker. App executes zero times per frame.
3. Enter one root commit, visit 257 changing R3F hosts, and complete exactly 769 distinct scalar writes: 256 motion groups × three properties, plus the marker.

All 771 snapshot reads per frame also occurred inside the interval. For measured epoch 13 they divide into 257 before root render, 257 during render, and 257 after root-commit entry, consistent with the pinned subscription, hook and Store-instance-check paths. Raw event order places every listener return before root-render entry. Each observed property changes exactly once from its previous epoch formula to its requested epoch formula; no required write is missing, duplicated or late.

One `renderer.render` call occurs **after** `publishEnd` in every frame. Outside the update window the observed frame events are renderer entry/exit and the deliberately queued microtask/task checkpoints. No subscribed render, root render/commit, mapped host commit, snapshot read or tracked property-write tail was observed before teardown. Unmount produces two additional root-render/commit pairs, explicitly labeled teardown; the final frame's two checkpoints also run during teardown. Mount and local-control activation/reset are separately labeled setup.

These counts are observations under instrumentation, whose timings are invalid for speed comparison. The uninstrumented controls immediately validate the resulting motion values after the timer stops and before drawing. The separately compiled manual control checks the marker and all 768 motion scalars after every update. Together with the pinned synchronous `flushSync` source, these checks support the intended update boundary; they do not prove the absence of every possible uninstrumented React task.

## What is React actually doing so quickly?

The scene already exists. App owns the static 256-entry JSX tree and does not subscribe to the clock. React's runtime follows scheduled child lanes and bails out of unchanged subtrees; each leaf receives the same retained `children` reference. Updating a motion group does not reconstruct its child group, mesh, geometry or material. The changing work is 257 small hook-based leaf executions, one batched root render/commit, R3F prop diffs/path resolution and 769 scalar assignments.

The React Compiler does emit real caches: `_c(8)` in Position/Rotation, `_c(2)` in FrameMarker and App. However, every clock tick changes all three motion outputs, so the motion JSX memo guards miss each frame. Compiler also caches the id-dependent effect closure/dependency array, while the authored `[id]` dependency already prevents effect reactivation without Compiler. App's dependency-free tree cache is not exercised on normal clock updates because App is not scheduled. The runtime subscription/bailout boundary therefore matters independently of Compiler.

R3F runs with `frameloop: 'never'`, and the benchmark explicitly calls `flushSync`. React completes these updates synchronously; scheduler yielding is not hiding them after the timer. Three's scene traversal/rendering and readback happen in the subsequent shared draw. This is still linear work, Θ(N + W) for N subscribed leaves and W changing scalar properties. There is no observed sublinear algorithm, generated direct Three writer or shared numeric kernel in this React path. These mechanisms explain the bounded work being timed, not an exact millisecond decomposition or a V8 optimization claim. [Pinned runtime/source trace](../2026-10-22-react-mechanism-research/react-path.md), [Compiler passes and emitted caches](../2026-10-22-react-mechanism-research/compiler-internals.md).

## Compiler disabled and an independent stopwatch

One six-context episode ran ON → OFF → ordering probe → manual timer → OFF → ON. Each RAF context used 12 warmup and 60 measured frames. The OFF build uses the same authored source, installed dependencies, JSX/Vite configuration and production settings, removing only the Compiler Babel plugin. Captured OFF output contains neither the Compiler cache call nor compiler-runtime import. The ordering probe's durations are deliberately omitted below.

| Control | Update median / p95, ms | Through shared draw/readback median / p95, ms |
| --- | --- | --- |
| Compiler ON, first | 0.95 / 2.50 | 4.30 / 6.50 |
| Compiler OFF, first | 0.70 / 1.10 | 3.25 / 5.10 |
| Compiler OFF, second | 1.10 / 2.00 | 4.80 / 6.50 |
| Compiler ON, last | 0.90 / 2.20 | 5.15 / 6.80 |

Compiler is **not necessary** to reach a submillisecond median on this workload. These two observations per setting do not establish a stable Compiler benefit, penalty or causal percentage. They also show why treating 0.70 ms as a universal constant is wrong. Browser timer quantum was approximately 0.10 ms.

The manual control suppresses only initial RAF scheduling and retains Compiler-on, the original update, inspection, draw and disposal paths. Its browser update median/p95 is **0.60 / 0.90 ms**. An independent Node `process.hrtime.bigint()` around the complete update-plus-769-value-inspection RPC measures **1.90 / 4.52 ms**. Drawing runs in a separate RPC and measures **2.60 / 4.70 ms** in the browser. The entire 72-update/inspection/draw sequence takes 494.58 ms, including IPC and orchestration.

The outer Node clock corroborates that the observed fast updates are not secretly taking an order of magnitude longer inside the browser RPC. It includes transport, scheduling and inspection, so it is an enclosing interval rather than an interchangeable stopwatch or subtractable phase budget. The manual workload lacks RAF spacing and is not a replacement performance comparison.

## Integrity, failures and limits

The only browser episode passes in 33.57 seconds with six contexts closed and no browser, request, console or cleanup errors. All six 72-frame value/pixel digests match; outer-object and retained-child identity checks pass. The original 512 tracked geometry/material resources per context each dispose exactly once, with empty scene/setter cleanup. Shared inspection checks geometry/material classes, not every resource's `===` identity each frame; do not strengthen that oracle into an unperformed resource-identity test.

All 6,887 recorded source/input rows match before and after. Primary independently rehashed their current files and recomputed the raw event counts, timer bounds, event order, old/new scalar formulas, distinct targets, output/lifetime checks and descriptive statistics. Browser executable/tool hashes remain bound. Product runtime/compiler/host source was not edited.

Preparation failures are preserved: import-only package resolution in the OFF builder, a missing output parent, an ordering-probe tab mismatch, and a redundant CommonJS Vitexec resolution in runner v1. Runner v1 failed in preflight before opening a browser. Successful preparation used 1,200-second supervisor caps and completed in under one second per command; that cap exceeded the proposed 120 seconds. Browser v2 used the planned 120-second internal/180-second outer bounds. No actual timing episode was repeated or sample removed.

This settles the bounded measurement-boundary question and rejects Compiler as a necessary explanation for submillisecond updates here. It does not supply exact phase/JIT/allocation costs, explain every millisecond of Native's deficit, establish presentation latency or qualify a cross-device performance claim. The prior Native parity failure and historical wins/losses retain their scope. [Astra's independent review](astra-review.md) accepts the scoped timer/mechanism findings and keeps the prior cohort proposal partial, unbudgeted and dormant. Implementation remains frozen; no additional diagnostic or product repair follows automatically.
