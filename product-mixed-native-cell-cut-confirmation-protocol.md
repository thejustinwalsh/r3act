# Native cell-cut product confirmation protocol

This is one named 30-page confirmation of the archived native cell-cut
candidate on the existing product mixed workload. Freeze the protocol and all
inputs before registration or collection. Do not start the preview server or
register this study until the collector and protocol receive primary review.

## Question and candidate

Evaluate the archived native cell-cut candidate against the React arm on the
same production product assets and schedule. This confirms the named candidate
against the existing speed thresholds; it does not isolate a single source
change or support a historical causal claim.

The immutable source/build archive is
`implementation/2026-10-13-native-cell-cut/source-and-build.tar.gz`, SHA-256
`1687915fd6d6ba51d457a4265100e0c72eed5e2641af230257fd29185ec3ac45`. Its
qualification is `NATIVE_CELL_CUT_CORRECTNESS_VERIFIED`: 573 runtime tests, 29
Rust tests, 58 integration commands, and six correctness pilot pages. Verify
the archived native three-binding/delta/prop-only proof, React Compiler row
and board memo-cache proof, the snapshot-free native numeric execution proof,
and the emitted three-descriptor compiler proof. The separately archived
allocation diagnostic was independently verified in 109 checks and reports
native/react ratios of 0.817, 0.718, and 0.736 for the three sizes. Those are
allocation estimates, not speed evidence.

## Fixed workload and schedule

- Sizes: 128, 512, and 1,024 rows.
- Five paired fresh page loads per size, alternating React/native order by pair.
- Use the unchanged 30-page `src/browser/product_mixed_schedule.ts` schedule.
  Preserve sequence, pair, size, and arm exactly; no page may be dropped,
  replaced, or excluded.
- Each page runs 60 warmup frames and 240 measured frames, one update per
  `requestAnimationFrame`. The measured frames are 61 through 300.
- Every 30th measured frame performs the existing structural edit: remove the
  first eight IDs, append eight new IDs, then rotate the order by thirteen.
- Keep the authored sources, schedule, application workload, and all five
  correctness checks unchanged. Each page must be production mode and must
  report no harness or browser errors.

For each row, the workload uses the existing shared x/y/rotation state
function. Native and React use the same data, exact style strings, keyed row
identity expectations, and lifecycle checks. Initial mount includes frame-zero
initialization. Each measured `commitMs` includes all synchronous work inside
that frame's `step`, including the existing topology and inserted-row setup
phases on structural frames. `intervalMs` is the preceding animation-frame
interval. `mountMs`, 240 `commitMs`/`intervalMs` samples, and `disposeMs` are
reported separately; no separate structural subphase is timed.

## Timing environment and clock rule

Serve the existing production output without rebuilding it, through Portless
at `https://compiled-native-cell-cut-timing.localhost:1355`, using
`vite.product-mixed-native-cell-cut-timing.config.ts`. This timing-only preview
configuration adds `Cross-Origin-Opener-Policy: same-origin` and
`Cross-Origin-Embedder-Policy: require-corp` to the empty calibration page,
product page, and served assets. It adds `/__clock-calibration`, a bare HTML
middleware response with no product module or workload import. The timing
configuration does not change any built asset bytes. Verify all five static
production assets byte-for-byte against the archived build before and after
collection.

Before registration, calibrate `performance.now()` on the isolated
`/__clock-calibration` page served from the same origin. Require
`crossOriginIsolated === true`, the exact isolation response headers, visible
page state, and foreground focus. Do not calibrate on `about:blank`. Record the
minimum positive `performance.now()` delta, observation count, and clock
metadata as the preregistration calibration. On each benchmark page, validate
the same isolation response headers and `crossOriginIsolated` state. After the
harness result is published, explicitly call its idempotent `dispose()`, then
record the same clock calibration fields. Clock reads happen outside the
workload timer.

For each paired ratio, freeze the denominator resolution floor as five times
the maximum of the preregistration calibration quantum, the React page's
post-disposal quantum, and the paired native page's post-disposal quantum. A
React page median below that pair's floor makes its ratio unresolved. Do not
lower or revise the quantum, threshold, or rule after seeing results. The
isolation change is only a measurement-environment change: both arms use the
same source/build bytes and same headers.

## Collection, locks, and decision

Before the collector writes a new preregistration, freeze the archive and
status, all `sourceAndBuildSha256` inputs, schedule, six pilot records, native
numeric execution and compiler-emission proofs, allocation diagnostic status
and independent verification, this protocol, timing preview configuration,
collector, analyzer, verifier, and all five production asset hashes. Store the
preregistration, all 30 page records, progress manifest, post-collection lock
check, and final result under the new directory
`results/product-mixed-native-cell-cut-confirmation/`. Use exclusive creation;
preserve every failed, incomplete, or invalid page and all errors. A nonempty
output directory must never be reused for another run.

The page load is the replication unit; frame samples are nested observations.
Pair React and native by pair index at each size. Require the paired geometric
mean of page-median native/React commit ratios to be at most 0.80 at two or more
sizes. Require the median paired p95 native/React ratio to be at most 1.10 at
every size. Every scheduled page, correctness check, lifecycle count, source
and build lock, isolation check, and denominator-resolution rule must pass;
there are no exclusions. Report all page results and unresolved ratios. Do not
infer performance from rounded chart labels.

## Interpretation limits

The measurements cover synchronous commit work; they exclude rendering,
layout, paint, GPU presentation, and the perception of responsiveness. Clock
isolation is applied equally to both arms and may change timer precision; the
result applies to this named candidate under this fixed environment. The
allocation diagnostic is separate and cannot substitute for timing results.
This confirmation cannot establish that the candidate is faster than an
earlier checkpoint for a causal reason, prove independent-device performance,
or establish a general React comparison. Preserve those limits in the
summary.
