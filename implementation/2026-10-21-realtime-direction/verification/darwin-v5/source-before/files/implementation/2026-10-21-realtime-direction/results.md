# Realtime integration: verification and current limits

The integrated runtime passes the corrected Darwin correctness gate, but the actual Three workbench fails its animation no-rerender check. The single installed canvas comparison is slower for Native publication. This unit remains in progress; neither failure is a release pass or a reason to repeat timing.

## Consolidated correctness

`verification/darwin-v4` passes 63/63 phases: 1094 Deno tests, 84 Rust tests, 44 compiled fixtures, twenty Three cases, three retention checks and thirteen installed package-consumer checks. The 1462 selected input rows match before/after; ten additional context rows are archived. The input manifest SHA-256 is `31caef8cd53e9c4e6a7ba2e764ecfe4d4ffb2b5a5f2f42b4821d3eeaf738b76c`. The supervisor exits zero after 84.833 seconds.

Earlier receipts remain unchanged. Darwin-v1 fails on missing TypeScript narrowing and an incorrect quarantine assertion. Darwin-v2 passes 62/63 phases but package installation cannot open the pnpm database outside the task's writable roots. Darwin-v3 fails before any phase because its output directory already exists. A task-local wrapper then selects the ignored Depot-backed repository store for isolated package installs; the historical wrapper and manifests are unchanged. See `evidence/pnpm-adaptation` and the individual supervisor logs.

The gate predates the added actual-workbench metadata fixture and the retained-children correction now being implemented. It verifies its archived source, not later edits. The two runtime mechanisms covered are ordinary reuse of compiler-proven closed collection rows and original-order heterogeneous numeric program runs. All runs validate staged output before host writes, preserve shared sink deduplication and retain the existing generic fallback.

## Single installed canvas comparison

`proof-canvas-v1` installs fresh package tarballs and runs 256 retained Three objects with two numeric component programs, a common Canvas2D draw and identical simulation values. Twelve warmup and sixty measured RAF callbacks run per arm, in fixed Native / React Compiler / imperative order. Untimed proof precedes exclusive timing authorization; both runs match all 11,449 selected source/asset hashes and close their browser contexts cleanly. Chromium is 153.0.8010.12. No timing repeat occurs.

| Interval, milliseconds | Native median / p95 | React Compiler median / p95 | Imperative floor median / p95 |
| --- | --- | --- | --- |
| Update/publication | 1.20 / 2.30 | 0.90 / 1.00 | 0.00 / 0.10 |
| Common draw | 0.10 / 0.10 | 0.10 / 0.20 | 0.10 / 0.20 |
| Callback update through readback/checksum | 2.30 / 3.90 | 2.30 / 3.20 | 1.10 / 2.30 |
| Update start to draw start | 1.30 / 2.40 | 1.00 / 1.20 | 0.10 / 0.30 |
| RAF interval | 16.70 / 16.70 | 16.70 / 16.70 | 16.70 / 16.70 |

The untimed Native proof observes 72 numeric row batches, 18,432 row cells and no component-render increments across all 72 epochs. All arms retain the 256 object identities and pass state/pixel checksums and exposed teardown checks. Timing disables these Native proof counters. Actual AST proofs establish distinct Native programs and React Compiler transforms.

The callback interval excludes later sample bookkeeping, scheduling and teardown. Update-to-draw measures state age at draw start, not physical input or presentation. All arms have zero flags against the 60-Hz reference; that reference is not an observed display deadline. The imperative arm has fewer framework obligations and is not an executed R3F benchmark. The timer quantum is approximately 0.1 ms; dependent samples and fixed order do not establish population tails, CPU, cold/memory budgets or an independent-device result. There is no old-Native arm, so this comparison cannot attribute a benefit or regression to heterogeneous execution.

The source lock for this comparison omits the workbench application. Later workbench-only changes cannot be claimed as measured, and any compiler/runtime correction also keeps this timing bound to its earlier archived source.

## Actual Three workbench: preserved failure

The first owned headless WebGL check, through Portless HTTPS, fails: `sceneRenderCount` grows from 12 to 36 over the animation checkpoints. The script exits at its first no-rerender assertion before HMR. See `evidence/three-browser-v1/failure.json` and its supervisor logs. All owned routes, browser contexts, Vite/proxy processes and temporary TLS material are removed; cleanup is recorded under `evidence/three-portless-v1`.

Source review identifies two proof gaps. `FrameMarker` used a module constant where the closed-owner grammar requires a closed value; it now uses the literal name. `KineticForm` contains a diagnostic increment, conditional returns, pointer handlers and resource object inputs, so it cannot meet the current whole-owner numeric proof. This observation does not establish when its generic fallback began.

The correction separates structural resource/event authoring from numeric motion using a narrowly proven direct `props.children` passthrough. The numeric program may retain that child value, but may not inspect it, derive values from it or infer purity of its contents. Existing parent/child invalidation, ownership, code revision and accepted caches remain authority. Compiler/runtime changes and the actual workbench still require source review and a new consolidated gate before a fresh bounded browser correctness check. The no-rerender assertion remains.

The human's DAG direction concerns main-thread affected-work selection, batching, fusion and specialization. Async promise overlap and worker execution are separate capabilities. The current comparison establishes no speed advantage; historical narrow wins and the qualified dense loss retain their own source and workload scope.
