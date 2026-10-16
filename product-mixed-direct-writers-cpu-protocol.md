# Direct-writer CPU attribution protocol

Frozen before collection, 12 October 2026. This is a diagnostic of the tested M1
checkpoint, not a speed-gate confirmation or a comparison with historical timings.

## Inputs and qualification

Use `implementation/2026-10-12-direct-writers/source-and-build.tar.gz`, SHA-256
`cc4c5370868bea0e32b5e2212c80a2fde90c2448116ec1f079a11455170cae51`.
The checkpoint has 458 runtime tests, 25 Rust tests, 47 integration checks and six
passing production correctness pilot pages. Its performance gate is UNMEASURED.
Validate the checkpoint, all six archived pilot records, their compiler proof,
and locked source/build files before collection. Do not reuse the identity-V3
latency preregistration as qualification for this candidate.

The collector is `scripts/profile_product_mixed_direct_writers_cpu.mjs`.
It records its own hash, this protocol, the checkpoint and pilot hashes, schedule,
production hashes, and preflight served-byte hashes in a separate preregistration.
Freeze that record before the two diagnostic profiles. Preserve every collected
page, raw profile and failure; refuse to overwrite the result directory.

## Collection

Use the existing Portless production preview at
`https://compiled-direct-writers.localhost:1355/product-mixed-v2.html`.
Select schedule sequences 20 and 21: React then native, both 1,024 rows. These are
the two fixed diagnostic pages, not selected after observing results. Both arms
use the existing compiled TSX workload and original correctness checks.

Run serially in two fresh browser contexts, headed with GPU disabled, viewport
1,200 by 900, bringing each page to the foreground. Use CDP's CPU profiler with
a 1,000-microsecond sampling interval, starting on about:blank before navigation.
Each page runs 60 warmup frames and 240 measured frames, including eight structural
frames. Require PASS, all five correctness checks, and no browser errors. Check
that loaded asset bytes match the archived production build. Recheck all locked
inputs after profiling. A failed record remains evidence and invalidates success.

## Analysis and limits

Report weighted sampled self time using each sample's corresponding timeDelta,
sample counts, top frames and verified emitted-source excerpts. Independently
recompute totals from the raw profile and verify asset hashes and input locks.
Rank current costs before proposing the next implementation change.

The scope includes import, mount, warmup, updates, harness inspection and disposal.
It cannot isolate steady update cost without additional markers. Sampled self time
is not exact instruction time; function names and bundle categories alone do not
prove causality. Separate authored and framework work using verified excerpts
where possible, retaining uncertainty for combined or inlined functions.
Do not turn profiled harness timings into a latency verdict, pool these records
with old studies, or infer allocation counts, GC causality, layout/paint/GPU cost,
independent-device performance or universal superiority from two CPU profiles.
Allocation profiling and the integrated release confirmation remain separate.

## Collector correction before replacement collection

The first run is preserved in `results/product-mixed-direct-writers-cpu` with
FAIL status. Both harnesses passed, but the collector mistakenly required the
unselected arm's dynamic asset to load. It also failed to retain the already
stopped raw profile before this assertion. These records cannot support CPU
attribution. The corrected collector stores raw profiles immediately on stop,
requires common assets plus the selected arm, rejects unknown/failed responses,
and writes the replacement run exclusively to
`results/product-mixed-direct-writers-cpu-v2`. Workload, selected pages and
sampling settings remain unchanged. The replacement freezes new collector and
protocol hashes before collection.

The v2 replacement passed both pages and input locks. Independent review requested
raw harness samples, which v2 did not persist (the collector asserted eight
structural frames but saved only their total sample count). Preserve v2 as a
diagnostic with that limitation. Before any optimization, collect v3 with the
same settings and saved raw harness samples plus structural-frame count, in
`results/product-mixed-direct-writers-cpu-v3`, for independent count verification.
No results are discarded or combined into a latency study.
