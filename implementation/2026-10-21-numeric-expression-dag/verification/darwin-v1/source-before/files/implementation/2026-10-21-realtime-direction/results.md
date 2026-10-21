# Realtime integration: verification and current limits

The integrated runtime passes the expanded Darwin-v6 correctness gate. Actual WebGL application checks pass through animation, controls, keyed edits and resource disposal, but HMR delivery remains **unresolved** on this setup. All failures remain preserved. The single installed canvas comparison is slower for Native publication. No timing repeat occurs.

## Consolidated correctness

`verification/darwin-v4` passes 63/63 phases: 1094 Deno tests, 84 Rust tests, 44 compiled fixtures, twenty Three cases, three retention checks and thirteen installed package-consumer checks. The 1462 selected input rows match before/after; ten additional context rows are archived. The input manifest SHA-256 is `31caef8cd53e9c4e6a7ba2e764ecfe4d4ffb2b5a5f2f42b4821d3eeaf738b76c`. The supervisor exits zero after 84.833 seconds.

Earlier receipts remain unchanged. Darwin-v1 fails on missing TypeScript narrowing and an incorrect quarantine assertion. Darwin-v2 passes 62/63 phases but package installation cannot open the pnpm database outside the task's writable roots. Darwin-v3 fails before any phase because its output directory already exists. A task-local wrapper then selects the ignored Depot-backed repository store for isolated package installs; the historical wrapper and manifests are unchanged. See `evidence/pnpm-adaptation` and the individual supervisor logs.

Darwin-v5 then passes 63/63, including 1095 Deno and 85 Rust tests, after the retained-child correction. Its 1463 input rows match. Its manifest SHA-256 is `06da508e15d1648c07f84499466584335b316d42cd9820ee752a2f494ee156c8`. The namespace fixture was archived but not executed by this older 44-fixture runner; do not attribute that new coverage to v5.

Final Darwin-v6 passes **64/64** phases, **1095 Deno**, **85 Rust**, **45 actual compiled fixtures**, twenty Three cases, three retention checks and fresh package consumers. The runner now includes the namespace fixture. All 1463 input content hashes match before/after; both manifests have SHA-256 `3a21c9857cdf97093bcef5d456a30fc256a88ca3232bb0bcdfe21bd156e4d900`. The receipt SHA-256 is `233d8110575546c37a570a11b3741e3d266e42649abe28269cf2c51c2bd7683e`. Release compiler SHA-256 is `db2d1ca1f9be541253350f8c4b118d056779deffe8196fe74c679c481683e1c0`; debug compiler is `5bea905f5765d85cba4fb1d33570a42e1d26636fa2b787e67b9420a23027a8b5`. The supervisor exits zero in 93.16 seconds and 251 fixture artifacts are archived.

This gate verifies ordinary closed collection rows, original-order heterogeneous numeric programs and retained-child motion composition, including fail-closed program schema 3. All numeric runs validate staged output before host writes, preserve shared sink deduplication and retain the existing generic fallback. Later evidence/document updates do not change the gated production source.

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

The correction separates structural resource/event authoring from numeric motion using a narrowly proven direct `props.children` passthrough. The numeric program may retain that child value, but may not inspect it, derive values from it or infer purity of its contents. Existing parent/child invalidation, ownership, code revision and accepted caches remain authority. The no-rerender assertion remains.

Browser-v2 passes the initial animation/no-rerender checks but fails an owned-resource disposal assertion. Source review identifies a test observation race: its shape list came from the Store head before the next manually scheduled scene flush. Both shape membership and order diagnostics now enumerate mounted motion groups independently. The exact disposal assertion is unchanged. All owned v2 services and TLS material are removed.

The separate namespace supplement-v1 fails before assertions on a duplicate test local. Supplement-v2 exposes a genuine generic identity gap: a changed component key with a constant explicit mesh key can reuse that mesh and its resources. The archived failure is not relabeled as an intentional contract. The final fixture explicitly changes the host key to test retained-child replacement and exact disposal, and it passes inside Darwin-v6. Constant-key cross-owner identity remains open. See [primary source review](source-review.md).

Browser-v3 fails during Chromium launch before page assertions: SIGABRT with EPERM reported while Playwright tries to kill it. Its bounded supervisor exits one after 0.546 seconds. HTTPS preflight succeeds, and all owned processes, routes and TLS material are removed. The source hashes match v6. No trust-store or hosts changes occur; an automatic trust attempt is denied before custom TLS is used.

Browser-v4 uses the approved process-permission correction and passes application checks through animation without owner rerenders, controls, keyed edits and owned-resource disposal. It then times out at the timestamp-only HMR trigger. Its supervisor exits one after 18.725 seconds; the failure and desktop screenshot remain. Production app, fixture, runner and runtime/compiler content still match v6. The primary updated this results document after the gate, explaining the documented selected-input difference. All owned services/routes/TLS material are removed.

Source review finds that the compiler plugin sends native invalidation plus full reload when a watched compiled file update reaches it; it does not ignore identical source bytes. The timestamp-only trigger does not establish that such an event occurred. The verifier was corrected to perform and restore a harmless source-byte edit, capture bounded WebSocket/console evidence and assert retirement across the documented full reload. The old page's globals cannot be used as persistent observations after that reload. This is test infrastructure work, not a compiler HMR repair or a green HMR result.

The corrected verifier executes once in browser-v5. It writes the distinct comment bytes and restores the exact original SHA-256 `2dda7f5aa74d326901b94039f63a962e900ebc635ddf0791b0fc83183526050a`, but again times out at HMR. WebSocket evidence records `open` and `connected`, with no native invalidation/full-reload message. Owned Vite logs show startup and a Three warning. The gate's production app/runtime/compiler/fixture bytes remain unchanged. The primary's later documentation and verifier changes are identified separately in the cleanup receipt.

One final deliberate machine adaptation, browser-v6, sets only the owned Vite process's `CHOKIDAR_USEPOLLING=1` and `CHOKIDAR_INTERVAL=100`, supported by the installed Vite 8.3.1 watcher. It also times out at HMR after 18.20 seconds, with only connected WebSocket evidence. It restores the same original app hash and all six listed production hashes match the gate. No further browser diagnostic runs occur. The final cleanup receipt is `evidence/three-browser-v6/cleanup-result.json`, SHA-256 `836cd4b51bdbd7d47ef5a8b5a03e092963fc8104d56cfc869f10a469673d9185`.

These failures do not locate the missing watched-update delivery or qualify current workbench HMR. The corrected verifier changes after v6 are verified by these browser attempts, not attributed to the older gate's script bytes. No VM, browser, owned project listener, proxy, route or task TLS material remains running. No hosts/trust mutation occurs. Full-plan release performance/cold/memory, independent-device and generic identity requirements remain open; no maintenance advantage is claimed.

The human's DAG direction concerns main-thread affected-work selection, batching, fusion and specialization. Async promise overlap and worker execution are separate capabilities. The current comparison establishes no speed advantage; historical narrow wins and the qualified dense loss retain their own source and workload scope.
