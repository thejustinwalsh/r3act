# Product mixed stable-cells CPU attribution protocol

Prepared 13 October 2026 for one paired CPU attribution run of the frozen stable
numeric-cell candidate. This is not a timing confirmation or a performance
verdict. It does not establish that the stable-cell change caused any observed
cost.

## Frozen candidate and current timing context

The candidate is
`implementation/2026-10-13-stable-numeric-cells/source-and-evidence.tar.gz`,
SHA-256
`11b0c553b021e4ca96cdcc75f71babf3cdc9e7aaf19f49699c55a7b0ba7fc0d6`. The
checkpoint status is `UNIT_AUTHORED_COMPILER_AND_CHROMIUM_SHAPE_VERIFIED`, with
653 runtime tests, 32 Rust tests, 878 source/build hashes, and 111 verification
hashes. The checkpoint still records zero production pilot pages; the six
separate correctness pilot pages are locked independently. The qualified v3
Chromium cell-shape diagnostic is part of the checkpoint evidence and is
recorded as object-shape evidence only.

The current stable-cells timing confirmation has 30 verified pages and a
passing evidence-integrity status, but its fixed speed gate is `FAIL`. Its
verified timing archive is
`implementation/2026-10-13-stable-cell-timing/evidence.tar.gz`, SHA-256
`2f99962b417a609acd5545a18eafff5677f384a2713ac2a7db1787b1bb76f925`, with 68
locked evidence members. This CPU collection attributes work for the current
candidate; it does not revise or replace that timing result.

Before preregistration, verify and lock the stable source archive, status, all
878 source/build files, all 111 verification artifacts, five production build
assets, and the six separate pilot pages and manifest. Also verify and lock the
stable timing archive and status, all 68 timing evidence files, and the complete
stable timing confirmation inputs, V2 summary, V2 verification, and 30 page
records. Require the V2 verification integrity status to be `PASS` and its
recorded speed gate to remain `FAIL`. Lock this protocol, the profiler script,
the preview config, schedule, and independent CPU verifier before any product
page is profiled. The output directory must be new and empty; use exclusive
creation and never overwrite prior evidence.

## One paired collection

Use the already-built `dist-product-mixed-stable-cells`; do not rebuild it. The
preview config applies the same COOP `same-origin` and COEP `require-corp`
headers used for the stable timing confirmation. Launch from this project
folder through Portless:

```sh
portless run --name compiled-stable-cells-cpu pnpm exec vite preview --config vite.product-mixed-stable-cells-cpu.config.ts
```

The resulting origin is
`https://compiled-stable-cells-cpu.localhost:1355`. Do not choose a fixed port
or launch Vite directly. After readiness, run the profiler in a separate shell:

```sh
node scripts/profile_product_mixed_stable_cells_cpu.mjs
```

The collector first checks CDP profiler availability on `about:blank` and fetches
the five static assets through the request context. It does not navigate to the
product or execute the harness during preflight. Each served asset must match
its frozen build hash.

Collect exactly schedule sequence 20 (React, 1,024 rows), followed by sequence
21 (native, 1,024 rows). Use fresh headed contexts serially, GPU disabled, and a
1200×900 viewport. Start CDP CPU profiling on `about:blank` before navigation
with a 1,000-microsecond sampling interval. Do not add workload steps or
per-step timers. Require each harness result to pass all five checks, identify
the expected sequence/arm/size, contain 60 warmup frames and 240 measured
samples, mark eight structural samples, report 1,024 active writers and zero
writers after teardown, and contain no uncaught page errors. Keep the complete
raw result and the complete CDP profile, including nodes, samples, and
`timeDeltas`. Verify served resource hashes, require the selected arm bundle,
and reject the opposite arm bundle.

The profiler covers the whole page from pre-navigation startup through module
loading, initial mount, warmup, measured frames, result inspection, and harness
teardown. The profile is not split into startup, ordinary-frame, structural
frame, inspection, or disposal totals. Frame samples cannot be assigned to a
particular structural edit from this capture. Preserve all profile frames and
raw harness samples. For any sampled frame that resolves to one of the five
locked production assets, record its source line and column, UTF-16 code-unit
offset, exact excerpt and bounds, and asset hash. Leave built-in and unresolved
frames without invented source locations; skip out-of-range locations instead
of clamping them.

Write `preregistration.json`, `20-react-1024.json`, `21-native-1024.json`,
`results.json`, and `source-build-post-lock.json` under
`results/product-mixed-stable-cells-cpu/`. Each page file is written even when
that page fails; retain failure details and any partial profile. Do not rerun,
replace, or exclude a page. Rehash all preregistered inputs after both pages.

## Reading the profiles

Weighted sampled self time sums each sample's corresponding CDP `timeDelta`.
It is a sampling estimate, not exact instruction time or update-only cost.
Function names and URL categories are attribution hints. The minified native
and React arm bundles combine product and runtime code and cannot cleanly
separate them without source maps. This is a two-page, one-machine, one-browser
diagnostic. It does not measure allocation counts, prove GC causality, include
layout/paint/GPU presentation, or support an independent-device claim. It is
not a latency verdict and is not a causal comparison with earlier checkpoints.
