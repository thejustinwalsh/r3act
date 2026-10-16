# Product mixed stable-cells confirmation protocol

Prepared before collection, 13 October 2026. This is one fixed 30-page timing
confirmation for the frozen stable numeric-cell candidate. It evaluates that
candidate under a product workload and fixed decision rule. It does not isolate
a source change or support a historical causal claim.

## Candidate and qualification

The candidate archive is
`implementation/2026-10-13-stable-numeric-cells/source-and-evidence.tar.gz`,
SHA-256
`11b0c553b021e4ca96cdcc75f71babf3cdc9e7aaf19f49699c55a7b0ba7fc0d6`. Its
status is `UNIT_AUTHORED_COMPILER_AND_CHROMIUM_SHAPE_VERIFIED`: 653 runtime
tests and 32 Rust tests. The checkpoint records zero production pilot pages and
an unmeasured speed gate. Six separate correctness pilot pages are recorded in
`results/product-mixed-stable-cells-pilot`; they are locked independently and
do not change checkpoint metadata.

Before preregistration, validate and lock the status, archive, all 878
`sourceAndBuildSha256` files, and all 111 `verificationSha256` artifacts. The
`buildProofSha256` field contains exactly those 111 checkpoint verification
hashes. Separately lock the six pilot pages and manifest, four compiler proof
files, canonical prepared-cell execution and lifecycle proofs, the state-layout
execution proof, and the qualified Chromium storage diagnostic with its script,
entry, bundle, and six bundled inputs. The storage diagnostic must be `PASS`,
show unchanged World source bytes across bundling, and show actual direct and
prepared-published cells with fast properties, no own `value` descriptor, and
the shared `getLaneBackedValue`/`setLaneBackedValue` prototype accessors. It
also records promotion, reentry dispatch, destruction, and owner reuse. This is
object-shape evidence only; it makes no latency or allocation-performance
claim.

Validate the ordinary authored TSX prepared-cell execution and lifecycle
proofs: six prepared tokens; sparse and dense cut counts 1 and 6; no nonempty
generic state capture, legacy column cut, or scalar source program; and the
existing style, keyed identity, removal, row reuse, candidate isolation,
reentry, promotion/fallback, ref/effect, dead-setter, and host-failure
assertions. Validate compiler emission from the executable prefix before the
serialized `component_module`: three numeric program descriptors, three
bindings, and a separate dense three-slot `stateLayout`. Validate the six
separate correctness pilot pages. These correctness artifacts make no timing
claim.

## Fixed workload

- Sizes are 128, 512, and 1,024 rows.
- Run five paired React/native page loads per size, preserving the existing 30
  page schedule in `src/browser/product_mixed_schedule.ts` exactly.
- Use fresh serial headed browser contexts at 1200×900 with GPU disabled.
- Each page runs 60 warmup frames and 240 measured frames, numbered 61 through
  300. Eight measured frames perform the existing structural edit: remove the
  first eight IDs, append eight IDs, and rotate by thirteen.
- Keep source, schedule, workload, and five correctness checks unchanged.
  Require production mode, all checks passing, and no harness or browser errors.

Native and React use the same product data, keyed identity expectations, style
strings, state functions, and lifecycle checks. Initial mount includes
frame-zero initialization. Each `commitMs` sample includes synchronous work in
that frame's `step`, including topology and inserted-row setup on structural
frames. `intervalMs` is the preceding animation-frame interval. Record
`mountMs`, 240 `commitMs` and `intervalMs` samples, and `disposeMs` separately;
do not add per-phase timers. Synchronous component rendering is included;
browser layout, paint, and presentation are excluded.

## Timing environment and resolution rule

Serve the already-built `dist-product-mixed-stable-cells` through Portless at
`https://compiled-stable-cells-timing.localhost:1355`, using
`vite.product-mixed-stable-cells-timing.config.ts`. Do not rebuild assets. The
timing-only config applies COOP `same-origin` and COEP `require-corp` to the
bare calibration page, product page, and assets. Its `/__clock-calibration`
route does not import product code. This measurement-environment change applies
equally to both arms and leaves product assets byte-identical.

Before preregistration, request and hash all five static production assets, then
calibrate `performance.now()` on the isolated `/__clock-calibration` page from
the same origin. Use 100,000 clock reads and 48 RAF intervals. Require
`crossOriginIsolated === true`, matching COOP/COEP response headers, visible
state, and foreground focus. Record the minimum positive clock delta and
calibration metadata. Do not use `about:blank` for calibration. For each
product page, verify the same headers and isolation state. After harness
publication, call its idempotent `dispose()`, then calibrate that page outside
workload timing.

For each pair, the denominator floor is five times the maximum of the
preregistration clock quantum and both paired pages' post-disposal clock
quanta. A React page median below its pair's floor makes the ratio unresolved.
Do not change this rule, thresholds, or workload after seeing results.

## Decision, records, and limits

Require the paired geometric mean of native/React page-median commit ratios to
be at most 0.80 at two or more sizes. At every size, require the median paired
p95 native/React ratio to be at most 1.10. All 30 pages, correctness checks,
lifecycle counts, isolation checks, source/build locks, and denominator
resolution rules must pass. There are no exclusions or replacements.

Write to `results/product-mixed-stable-cells-confirmation/` with exclusive
creation. Preserve all 30 page records and raw harness results, preregistration,
progress/final manifest, post-collection lock report, and final results.
Preserve all failure details; never rerun, replace, or omit a failed page. The
page load is the replication unit; frame samples are nested observations.

The result applies to this named candidate under this fixed isolated timing
environment. It does not support a causal comparison with historical
checkpoints, an independent-device claim, or a general React comparison. The
storage-shape diagnostic is not a speed result.
