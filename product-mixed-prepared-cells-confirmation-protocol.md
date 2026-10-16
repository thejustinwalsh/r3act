# Product mixed prepared-cells confirmation protocol

Prepared before collection, 13 October 2026. This is one named 30-page timing
confirmation for the frozen prepared-cell candidate. It evaluates that
candidate under a fixed product workload and decision rule. It does not isolate
one source change or support a historical causal claim.

## Candidate and qualification

The candidate archive is
`implementation/2026-10-13-prepared-cell-programs/source-and-evidence.tar.gz`,
SHA-256
`fe0e7491dc0c9f52891f5d90aa5407679876527e4ca007bf821298fabb6e0886`. Its
status is `UNIT_AND_AUTHORED_COMPILER_CORRECTNESS_VERIFIED`: 648 runtime tests
and 32 Rust tests. The checkpoint records zero production pilot pages and an
unmeasured speed gate. Six separate correctness pilot pages are recorded under
`results/product-mixed-prepared-cells-pilot`; they do not change checkpoint
status metadata and are locked separately.

Before preregistration, validate and lock the status file, archive, all 866
`sourceAndBuildSha256` files, all 97 `verificationSha256` artifacts, the six
pilot pages and manifest, the unchanged schedule, this protocol, timing and
base-preview configurations, collector, analyzer, verifier, compiler proof
files, and five production assets. Validate the ordinary authored TSX prepared
execution proof: six prepared tokens; sparse and dense cuts with counts 1 and
6; all tokens current; no nonempty generic capture; no legacy `setColumnCells`
or scalar `executeSourceProgram` call; and the authored style, keyed identity,
removal, row reuse, and candidate-isolation assertions. Validate the authored
lifecycle proof for captured-value reentry, promotion to string/undefined and
return to numeric values, sticky lane disablement with scalar fallback,
ref/effect order, dead-setter rejection, and terminal host-failure cleanup.
Validate the current native and React compiler proof files and the six separate
production correctness pilot pages. These correctness artifacts make no
latency or allocation claim.

The checkpoint status continues to report `candidateProductionPilotPages: 0`;
the six separately recorded pilot pages are independent inputs to this
confirmation. No source or build assets are rebuilt for this confirmation.

## Fixed workload

- Sizes are 128, 512, and 1,024 rows.
- Run five pairs of fresh page loads per size, pairing React and native by pair
  index.
- Preserve the existing 30-page schedule in
  `src/browser/product_mixed_schedule.ts` exactly. Do not drop, replace, or
  exclude any page.
- Each page runs 60 warmup frames followed by 240 measured frames, numbered 61
  through 300. Eight measured frames perform the existing structural edit:
  remove the first eight IDs, append eight IDs, then rotate by thirteen.
- Keep authored sources, schedule, workload, and five correctness checks
  unchanged. Require production mode, every check to pass, and no harness or
  browser errors.

Native and React use the same product data, keyed row identity expectations,
style strings, state functions, and lifecycle checks. Initial mount includes
frame-zero initialization. Each `commitMs` sample includes all synchronous
work inside that frame's `step`, including topology and inserted-row setup on
structural frames. `intervalMs` is the preceding animation-frame interval.
Report `mountMs`, 240 `commitMs` and `intervalMs` samples, and `disposeMs`
separately. Do not add per-phase timers. Synchronous component rendering is
included; browser layout, paint, and presentation are excluded.

## Timing environment and resolution rule

Serve the already-built `dist-product-mixed-prepared-cells` through Portless at
`https://compiled-prepared-cells-timing.localhost:1355`, using
`vite.product-mixed-prepared-cells-timing.config.ts`. Do not rebuild assets. The
timing-only config applies `Cross-Origin-Opener-Policy: same-origin` and
`Cross-Origin-Embedder-Policy: require-corp` to the calibration page, product
page, and assets. It adds `/__clock-calibration`, a bare HTML response that
does not import product code. This measurement-environment change applies
equally to both arms and leaves product assets byte-identical.

Before preregistration, request and hash all five static production assets,
then calibrate `performance.now()` on the isolated `/__clock-calibration` page
from the same origin. Require `crossOriginIsolated === true`, matching COOP/COEP
headers, visible state, and foreground focus. Record the minimum positive clock
delta and calibration metadata. Do not use `about:blank` for clock
calibration. For every product page, check the same response headers and
isolation state. After the harness publishes its result, call its idempotent
`dispose()`, then calibrate the clock on that page outside workload timing.

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
`results/product-mixed-prepared-cells-confirmation/` with exclusive creation.
Preserve all 30 page records and raw harness results, the preregistration,
progress/final manifest, post-collection lock report, and final results.
Preserve all failure details; never rerun, replace, or omit a failed page.
Report the page load as the replication unit; frame samples are nested
observations.

Measurements cover synchronous commit work, including component rendering,
and exclude browser layout, paint, GPU presentation, and perceived
responsiveness. The result applies to this named candidate under this fixed
isolated timing environment. It provides no causal comparison with earlier
checkpoints, independent-device claim, or general React comparison. No
separate allocation result is part of this candidate qualification.
