# Prepared-style writers product confirmation protocol

Prepared before collection, 13 October 2026. This is one named 30-page timing
confirmation for the frozen prepared-style writers candidate. It tests the
candidate under the fixed product workload and decision rules below; it does not
isolate one source change or support a historical causal claim.

## Candidate and qualification

The candidate archive is
`implementation/2026-10-13-prepared-style-writers/source-and-build.tar.gz`,
SHA-256
`093f7058977c0a1290ddcc3f27b7ee5cbda022e9e43a161be1b24b950c3c419b`. Its
status is `PREPARED_STYLE_WRITERS_CORRECTNESS_VERIFIED`: 593 runtime tests, 29
Rust tests, 12 primary integration commands, and six passing correctness pilot
pages. Its speed gate remains `UNMEASURED_FOR_THIS_CANDIDATE`.

Before preregistration, validate and lock the status file, archive, all 830
`sourceAndBuildSha256` files, all 33 `verificationSha256` artifacts, six pilot
records, pilot manifest, the unchanged schedule, this protocol, timing
configuration, collector, analyzer, verifier, and the five production assets.
Validate the prepared-style proof (`trace.factories` = 73 and `trace.writes` =
80), native numeric cell-cut execution proof, compiler proof for three numeric
program descriptors and bindings, and React Compiler row/board memo-cache
proof. The current candidate has no separate allocation result; predecessor
allocation diagnostics do not qualify this candidate. Preregistration records
the exact input lock map before any benchmark page is run.

## Fixed workload

- Sizes are 128, 512, and 1,024 rows.
- Run five pairs of fresh page loads per size, pairing React and native by pair index.
- Preserve the existing 30-page schedule in
  `src/browser/product_mixed_schedule.ts` exactly. Do not drop, replace, or
  exclude any page.
- Each page runs 60 warmup frames followed by 240 measured frames, numbered 61
  through 300. Eight measured frames perform the existing structural edit:
  remove the first eight IDs, append eight IDs, then rotate by thirteen.
- Keep authored sources, schedule, workload, and the five correctness checks
  unchanged. Require production mode, every check to pass, and no harness or
  browser errors.

Native and React use the same product data, keyed row identity expectations,
style strings, state functions, and lifecycle checks. Initial mount includes
frame-zero initialization. Each `commitMs` sample includes all synchronous work
inside that frame's `step`, including topology and inserted-row setup on
structural frames. `intervalMs` is the preceding animation-frame interval.
Report `mountMs`, 240 `commitMs` and `intervalMs` samples, and `disposeMs`
separately. Do not add per-phase timers.

## Timing environment and resolution rule

Serve the already-built `dist-product-mixed-prepared-style` through Portless at
`https://compiled-prepared-style-timing.localhost:1355`, using
`vite.product-mixed-prepared-style-timing.config.ts`. Do not rebuild assets. The
timing-only config applies `Cross-Origin-Opener-Policy: same-origin` and
`Cross-Origin-Embedder-Policy: require-corp` to the calibration page, product
page, and assets. It adds `/__clock-calibration`, a bare HTML response that does
not import product code. This measurement-environment change applies equally to
both arms and leaves product assets byte-identical.

Before preregistration, request and hash all five static production assets, then
calibrate `performance.now()` on the isolated `/__clock-calibration` page from
the same origin. Require `crossOriginIsolated === true`, matching COOP/COEP
headers, visible state, and foreground focus. Record the minimum positive clock
delta and calibration metadata. Do not use `about:blank` for clock calibration.
For every product page, check the same response headers and isolation state.
After the harness publishes its result, call its idempotent `dispose()`, then
calibrate the clock on that page outside workload timing.

For each pair, the denominator floor is five times the maximum of the
preregistration clock quantum and both paired pages' post-disposal clock
quanta. A React page median below its pair's floor makes the ratio unresolved.
Keep this rule, both thresholds, and the workload fixed after seeing results.

## Decision, records, and limits

Require the paired geometric mean of native/React page-median commit ratios to
be at most 0.80 at two or more sizes. At every size, require the median paired
p95 native/React ratio to be at most 1.10. All 30 pages, correctness checks,
lifecycle counts, isolation checks, source/build locks, and denominator
resolution rules must pass. There are no exclusions.

Write to the new directory
`results/product-mixed-prepared-style-confirmation/` with exclusive creation.
Preserve all 30 page records and raw harness results, the preregistration,
progress/final manifest, post-collection lock report, and final results. Preserve
all failure details; never rerun, replace, or omit a failed page. Report the page
load as the replication unit; frame samples are nested observations.

Measurements cover synchronous commit work, including component rendering, and exclude browser rendering, layout,
paint, GPU presentation, and perceived responsiveness. The result applies to
this named candidate and fixed isolated-clock environment. It provides no
separate allocation result, causal comparison with earlier checkpoints,
independent-device claim, or general React comparison. Preserve these limits in
the analysis.
