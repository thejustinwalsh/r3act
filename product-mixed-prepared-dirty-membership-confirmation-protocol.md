# Prepared dirty-membership product confirmation protocol

Prepared 13 October 2026. This is one fixed, 30-page timing confirmation for the named prepared dirty-membership candidate. It evaluates this candidate under the existing product workload; it does not estimate a historical causal effect.

## Candidate and correctness qualification

The candidate is `implementation/2026-10-13-prepared-dirty-membership/source-and-evidence.tar.gz`, SHA-256 `38c9fc22b706bc9181c7de30f27e94fe937b0dc3993ed5d28642bf4779ca614d`. Its frozen status is `UNIT_AUTHORED_COMPILER_AND_CHROMIUM_VERIFIED`, with 663 runtime tests and 32 Rust tests. Its status records zero production pilot pages. Six separately collected correctness pilot pages will be locked independently under `results/product-mixed-prepared-dirty-membership-pilot`; they do not alter checkpoint metadata.

Before product pages, validate and lock the status, archive, every one of the 884 `sourceAndBuildSha256` files, and all 26 `verificationSha256` artifacts. `buildProofSha256` must equal the checkpoint's complete 26-entry verification map. Also lock the six pilot records and manifest, current compiler proofs, qualified execution and lifecycle proofs, Chromium v4 diagnostic and its artifacts, schedule, timing and base configs, collector, analyzer, independent evidence verifier, pilot verifier, and this protocol.

The authored TSX prepared-cell V2 proof must pass with six prepared tokens, zero Root `isCurrent` calls, sparse/dense cut sizes 1 and 6 with all tokens current, zero nonempty generic capture calls, and zero legacy column/source-program calls. Its inherited assertions cover compiled layout slots, sparse/dense style values, stable addresses through keyed moves, removed-owner/dead-setter behavior, row reuse, and discarded candidate isolation. The lifecycle proof must pass captured-value reentry, numeric promotion and fallback, refs/effects order, disposal, and terminal host-write cleanup. These establish correctness and path coverage, not latency.

The Chromium v4 diagnostic must pass against the current World source with matching before/after source hashes and six bundled-input hashes. It records actual cell shapes through direct activation, prepared publication, dispatch, promotion, destruction, cancellation, and reuse. This is storage-shape evidence only. Compiler proof checks apply to the executable prefix of the emitted native arm: three numeric program descriptors/bindings and a separate dense three-slot state layout. Both compiler arms must be valid and the React row and board memo caches must be present.

## Fixed workload

Use the unchanged `src/browser/product_mixed_schedule.ts`: 30 serial page loads, five paired React/native loads at each of 128, 512, and 1,024 rows, alternating arm order. Use fresh headed browser contexts, GPU disabled, viewport 1200×900. Each page runs 60 warmup frames and 240 measured frames (61–300); eight measured frames perform the existing topology edit. Keep workload, source, schedule, and the five correctness checks unchanged. Require production mode, every correctness check, and no harness or browser errors.

Record only the harness's existing `mountMs`, per-frame `commitMs` and `intervalMs`, and `disposeMs`. Synchronous rendering and setup are included in frame commits. Browser layout, paint, and presentation are excluded. Do not add phase timers or change the harness.

## Isolated timing environment and decision rule

Serve the already-built `dist-product-mixed-prepared-dirty-membership` through Portless at `https://compiled-dirty-membership-timing.localhost:1355`, using `vite.product-mixed-prepared-dirty-membership-timing.config.ts`. Do not rebuild the product assets. The timing config applies COOP `same-origin` and COEP `require-corp` to calibration, product pages, and assets. Its bare `/__clock-calibration` route does not load product code. This measurement-environment setting applies equally to both arms; the five served product assets must remain byte-identical to the frozen build.

Before preregistration, fetch and hash all five product assets, then calibrate `performance.now()` on the isolated same-origin calibration page using 100,000 reads and 48 animation-frame intervals. Require cross-origin isolation, matching response headers, visible state, and foreground focus. Calibrate each product page after the harness is disposed. For each pair, the resolution floor is five times the maximum of the preregistration quantum and both paired page quanta. A React median below that floor is unresolved. Do not change the rule after observing pages.

Require the paired geometric mean of native/React page-median commit ratios to be at most 0.80 at two or more sizes. At every size, require median paired p95 native/React ratio at most 1.10. All 30 pages, correctness checks, lifecycle checks, isolation checks, frozen-input checks, and clock-resolution checks must pass. There are no exclusions or replacements.

## Records and limits

The collector writes exclusively under `results/product-mixed-prepared-dirty-membership-confirmation/`: preregistration, 30 per-page records with raw harness results, progress/final manifest, post-collection lock report, and final results. Preserve every failure or incomplete page; never rerun, replace, or omit one.

The page load is the replication unit; frame samples are nested observations. This result applies to the named candidate and isolated timing environment only. It is not a historical causal comparison, independent-device result, or general React comparison. No separate allocation or speed conclusion is inferred from correctness or Chromium shape evidence.
