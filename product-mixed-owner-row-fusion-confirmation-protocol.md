# Compiled owner-row fusion product confirmation

Prepared 13 October 2026. This protocol defines one fixed 30-page timing confirmation for the archived owner-row-fusion candidate. The run measures the named candidate on the established product workload; it does not estimate a historical causal effect.

## Candidate and frozen evidence

The candidate is `implementation/2026-10-13-owner-row-fusion/source-and-evidence.tar.gz`, SHA-256 `cbe4ce3f557314fa093ac51214a2ba5e9cf0a5f0ad67b5429ce3a95a5e59a382`. Its immutable status is `UNIT_AUTHORED_THREE_AND_PRODUCTION_BUILD_VERIFIED`, with 695 runtime and 33 Rust tests. The status retains `candidateProductionPilotPages: 0`; the independently verified pilot is a separate evidence checkpoint. The archive contains 1,093 members: 1,004 source/build, 25 current verification, and 64 historical verification entries. The historical map remains separately identified and locked; it is not folded into the current proof map.

Before preregistration, validate the status and archive bytes and lock every source/build, current verification, and historical verification hash. Also lock the authored owner-row TSX and actual-Three proofs; native/React compiler proof files; the reused v5 Chromium cell-shape diagnostic and all its bundled inputs; and the separate six-page fusion pilot. The pilot checkpoint at `implementation/2026-10-13-owner-row-fusion-pilot/` must report `PRODUCTION_CORRECTNESS_PILOT_VERIFIED`, six pages, and archive SHA-256 `925cb5eb7caf9c4e49c164666eb899c7c00f87075ef97828aba4052bc324534b`. Its independent `verification.json` must pass and bind the same 1,093-member candidate archive, five production assets, six pages, and engine epoch. Lock the pilot status, archive, verification output, pilot manifest, six raw page records, both pilot verifier scripts, and all paths in the pilot status evidence map. Do not update the frozen candidate status to count pilot or timing pages.

The authored TSX proof must pass sparse one-cell and dense six-cell cuts with two prepared row programs, zero eligible generic pending captures, and zero legacy prepared-cell, column-cell, column-row, or generic source-program calls. It must verify compiler layout ownership/order, projection semantics, keyed movement identity, removal/dead-setter behavior, owner-row reuse generation, candidate isolation, and string/undefined fallback. The actual-Three proof must pass 240 five-cell updates through one prepared row program, without generic or legacy fallback, retain object/resource identities, and dispose resources cleanly.

The native compiler proof must identify the `ProductMixedRow` owner program, matching layout program ID, three dense state slots, three matching schema-v2 numeric descriptors, and three binding calls. The React proof must retain row and board memo caches. The v5 Chromium diagnostic is reused only because its six bundled input files match the frozen candidate bytes; it supplies the engine tuple and cell-shape evidence, not fused VDOM browser coverage or timing evidence.

## Fixed workload

Use the unchanged `src/browser/product_mixed_schedule.ts`: 30 serial page loads, five paired React/native loads at each of 128, 512, and 1,024 rows, with alternating arm order. Use a fresh headed browser context per page, GPU disabled, and a 1200×900 viewport. Each page runs 60 warmup frames and 240 measured frames (61–300), including the workload's eight structural frames. Keep product source, schedule, harness, and all five correctness checks unchanged. Require production mode, every check passing, and no harness or browser errors.

Record only existing harness measurements: `mountMs`, each measured-frame `commitMs` and `intervalMs`, and `disposeMs`. Synchronous rendering and setup performed in the measured callback remain included in commit time. Browser layout, paint, and presentation are excluded. Do not add phase timers or alter the workload.

## Isolated timing environment and decision rule

Serve the already-built five-asset directory `dist-product-mixed-compiled-owner-row-fusion` through Portless at `https://owner-row-fusion-confirmation.localhost:1355`, using `vite.product-mixed-owner-row-fusion-timing.config.ts` and its frozen base preview config. Do not rebuild product assets for collection. The timing config applies COOP `same-origin` and COEP `require-corp` to the calibration route, pages, and assets. The bare `/__clock-calibration` route must not import product modules. Before preregistration, fetch and hash all five assets over HTTPS and require exact equality with the frozen build bytes.

Calibrate `performance.now()` on the isolated same-origin calibration route using 100,000 reads and 48 animation-frame intervals. Require cross-origin isolation, matching response headers, visible state, and foreground focus. Calibrate each page again after disposing the harness. For each pair, use a denominator floor of five times the maximum of the preregistration clock quantum and both paired page quanta. A React median below that floor is unresolved. Do not change this rule after observing any page.

The paired geometric mean of native/React page-median commit ratios must be at most 0.80 at two or more sizes. At every size, the median paired p95 native/React ratio must be at most 1.10. All 30 pages, correctness/lifecycle checks, isolation checks, frozen-input checks, and clock-resolution checks must pass. There are no page exclusions, replacements, or reruns.

## Records and limits

The collector writes only under `results/product-mixed-owner-row-fusion-confirmation/`: frozen preregistration, 30 sequence records, progress/final manifest, post-collection input-lock report, and final results. The analyzer writes `summary-v2.json` and `summary-v2.svg` in the same directory. Preserve every failed or incomplete page and all raw records; never replace, omit, or rerun a page.

The page load is the replication unit; frame samples are nested observations. Results apply to this candidate and timing environment. They do not establish a historical causal comparison, independent-device result, general framework comparison, package-size claim, or allocation claim. The authored/Three proofs and the reused Chromium shape diagnostic establish correctness and path coverage only; they do not establish speed.
