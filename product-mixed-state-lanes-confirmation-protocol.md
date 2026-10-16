# Product mixed state-lanes confirmation protocol

Prepared before collection, 13 October 2026. This is one named 30-page timing
confirmation for the frozen numeric state-lanes candidate. It tests that
candidate under the fixed product workload and decision rules below. It does
not isolate one source change or support a historical causal claim.

## Candidate and qualification

The candidate archive is
`implementation/2026-10-13-numeric-state-lanes/source-and-build.tar.gz`,
SHA-256
`83c99cd500cb9462094c637014f3e8adf3cf8bc0280e5d154442141408f192c3`. Its
status is `NUMERIC_STATE_LANES_CORRECTNESS_VERIFIED`: 629 runtime tests, 32
Rust tests, 12 primary integration commands, and six passing correctness pilot
pages. Its speed gate remains unmeasured.

Before preregistration, validate and lock the status file, archive, all 853
`sourceAndBuildSha256` files, all 93 `verificationSha256` artifacts, six pilot
records, pilot manifest, unchanged schedule, this protocol, timing
configuration, collector, analyzer, verifier, and five production assets.
Validate the numeric lane proofs: Rust/OXC compiler output has three numeric
program descriptors and bindings and a separate three-slot `stateLayout`;
authored TSX shows sparse/dense lane values, stable addresses through keyed
movement, removal and dead-setter behavior, row-generation reuse, and candidate
discard isolation; instrumented cuts use `setColumnCells` with active counts
1 and 6 and make zero nonempty generic snapshots; lifecycle proof covers
captured-value host reentry, string/undefined promotion, sticky-off scalar
program fallback, ref/effect order, stale-setter cleanup, and terminal host
failure cleanup. Also validate the existing native scalar-program execution,
compiled-style proof (73 activations, 80 writes), the three-descriptor native
compiler proof, and React Compiler row/board memo-cache proof.

The native compiler proof contains both numeric program descriptors and a
`stateLayout` with `schemaVersion: 1`; count descriptors from the static
`__nativeNumericPrograms` table and check the layout's three slot entries
separately. A global count of `schemaVersion` strings is not a descriptor
count. The lane execution artifacts establish correctness and API-path
coverage; they do not imply a speed result.

Preregistration must record the exact frozen input-lock map before any product
page runs. No source or build assets are rebuilt for this confirmation.

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

Serve the already-built `dist-product-mixed-state-lanes` through Portless at
`https://compiled-state-lanes-timing.localhost:1355`, using
`vite.product-mixed-state-lanes-timing.config.ts`. Do not rebuild assets. The
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
`results/product-mixed-state-lanes-confirmation/` with exclusive creation.
Preserve all 30 page records and raw harness results, the preregistration,
progress/final manifest, post-collection lock report, and final results.
Preserve all failure details; never rerun, replace, or omit a failed page.
Report the page load as the replication unit; frame samples are nested
observations.

Measurements cover synchronous commit work, including component rendering,
and exclude browser layout, paint, GPU presentation, and perceived
responsiveness. The result applies to this named candidate under this fixed
isolated-clock environment. It provides no causal comparison with earlier
checkpoints, independent-device claim, or general React comparison.
