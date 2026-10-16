# Compiled owner-row product confirmation protocol

Prepared 13 October 2026. This protocol defines one fixed 30-page timing confirmation for the named compiled owner-row candidate. It measures the current candidate on the unchanged product workload; it does not estimate a historical causal effect.

## Candidate and frozen evidence

The candidate is `implementation/2026-10-13-compiled-owner-rows/source-and-evidence.tar.gz`, SHA-256 `4aabe8b6cb3168aae50ba8474464452494d790aac60b472611fc20f54ec7a08c`. The checkpoint status is `UNIT_AUTHORED_COMPILER_THREE_AND_CHROMIUM_VERIFIED`, with 694 runtime tests and 33 Rust tests. Its `candidateProductionPilotPages` remains zero. Separately, this confirmation requires the six-page correctness pilot in `results/product-mixed-compiled-owner-rows-pilot/results.json` to pass; the pilot does not modify the checkpoint status.

Before preregistration, validate and lock the status, archive, all 965 `sourceAndBuildSha256` inputs, and all 64 `verificationSha256` artifacts. `buildProofSha256` is the exact 64-entry verification map. Also lock the authored owner-row execution proof and its authored/emitted fixture bytes, actual-THREE owner-row proof, v5 Chromium storage diagnostic and its source/bundle/script artifacts, the current native/React compiler proofs, schedule, base and timing configs, protocol, collector, analyzer, and independent evidence verifier. The separate pilot manifest, its six raw pages, and the pilot verifier are locked in `extraVerificationInputLocks`. The pilot must bind each page to the five frozen production assets (including an HTTPS served-byte hash preflight), the same source archive, and the same CDP product, JavaScript version, and revision as the v5 Chromium diagnostic. It must pass all lifecycle/output checks. These are correctness and source-shape records; they do not establish speed, allocation, current packaging, or a human-completed study.

The authored TSX proof must pass its sparse one-cell and dense six-cell cuts with two prepared rows, zero eligible generic pending captures, and zero legacy cell or source-program calls. It also verifies compiler layout ownership/order, projection semantics, keyed movement identity, removal/dead-setter behavior, row reuse generation, candidate isolation, and fallback after string/undefined promotion. The actual-THREE proof must pass 240 five-cell updates with one prepared row program, no generic or legacy route, stable three-object/resource identities, and clean disposal. The native production compiler proof must identify the `ProductMixedRow` owner program, matching layout program ID, three dense state slots, three schema-v2 numeric descriptors with matching owner and unary source sites, and the three matching binding calls. The React Compiler row and board memo caches must remain present.

The v5 Chromium diagnostic must pass against the current `src/owner_state_world.ts` hash, with matching pre/post bundle hashes and all six bundled inputs covered by the frozen checkpoint. It must retain all ten fast-property cell scenarios and prove direct and prepared-published row views expose frozen data descriptors without getters, stale versions decline, and a destroyed owner's handle no longer resolves. This is object-shape evidence only.

## Fixed workload

Use the unchanged `src/browser/product_mixed_schedule.ts`: 30 serial page loads, five paired React/native loads at each of 128, 512, and 1,024 rows, alternating arm order. Use fresh headed browser contexts, GPU disabled, viewport 1200×900. Each page runs 60 warmup frames and 240 measured frames (61–300); eight measured frames perform the workload's existing topology edit. Keep the authored workload, source, schedule, and five correctness checks unchanged. Require production mode, every check, and no harness or browser errors.

Record only the harness's existing `mountMs`, per-frame `commitMs` and `intervalMs`, and `disposeMs`. Synchronous rendering and setup are included in measured frame commits. Browser layout, paint, and presentation are excluded. Do not add phase timers or change the harness.

## Isolated timing environment and decision rule

Serve the already-built `dist-product-mixed-compiled-owner-rows` through Portless at `https://compiled-owner-rows-timing.localhost:1355`, using `vite.product-mixed-compiled-owner-rows-timing.config.ts`. Do not rebuild product assets for collection. The timing config applies COOP `same-origin` and COEP `require-corp` to calibration, product pages, and assets. Its bare `/__clock-calibration` route does not load product code. The five served product assets must remain byte-identical to the frozen build.

Before preregistration, fetch and hash all five product assets, then calibrate `performance.now()` on the isolated same-origin calibration page using 100,000 reads and 48 animation-frame intervals. Require cross-origin isolation, matching response headers, visible state, and foreground focus. Calibrate each product page after the harness is disposed. For each pair, the resolution floor is five times the maximum of the preregistration quantum and both paired page quanta. A React median below this floor is unresolved. Do not change this rule after observing pages.

Require the paired geometric mean of native/React page-median commit ratios to be at most 0.80 at two or more sizes. At every size, require median paired p95 native/React ratio at most 1.10. All 30 pages, correctness checks, lifecycle checks, isolation checks, frozen-input checks, and clock-resolution checks must pass. There are no exclusions or replacements.

## Records and limits

The collector writes exclusively under `results/product-mixed-compiled-owner-rows-confirmation/`: preregistration, 30 per-page records with raw harness results, progress/final manifest, post-collection lock report, and final results. Preserve every failed or incomplete page; never rerun, replace, or omit one.

The page load is the replication unit; frame samples are nested observations. Results apply to the named candidate and isolated timing environment only. They do not establish a historical causal comparison, independent-device result, general React comparison, current package/library-size claim, or allocation claim. Correctness and Chromium shape evidence are not latency conclusions.
