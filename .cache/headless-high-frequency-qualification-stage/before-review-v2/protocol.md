# Headless current-product high-frequency qualification (draft)

Status: tooling draft only. This is not a preregistration or a run. Fill candidate-specific paths and hashes only after primary source/build freeze, review the completed config, and freeze its hash before invoking the collector.

## Fixed design

- Production app only, ordinary TSX arms, and mandatory native compiler / React Compiler outputs from the frozen build.
- Row counts: 128, 1,024, and 10,000.
- One topology and dirty shape: contiguous rows, all rows dirty, homogeneous row program.
- Five independent pairs per row count; each page gets a fresh browser context. Pair order alternates React→Native then Native→React.
- 60 warmup frames followed by 240 measured frames per page.
- Headless Chromium, GPU disabled, 1200×900 viewport. No headed/full-screen work.
- Each collector invocation takes exactly a size and pair index and records one pair only. There is no all-pairs command or auto-run loop. A failed or partial pair is preserved; the same pair cannot be rerun or replaced.

## Timed work and correctness

The existing staged high-frequency harness is used unchanged. It chooses dirty IDs before starting the per-step timer, identically for both arms. The timer covers setter dispatch and synchronous commit. RAF waiting, selection, DOM inspection, and correctness assertions stay outside that timer. This is per-frame synchronous commit timing, not whole-page CPU profiling and not a claim about paint.

Every page retains the full published result. Acceptance requires production output; the scheduled arm/row/mode; all six correctness checks true; empty errors; visible page; exact warmup/measured counts; every measured dirty count; each frame’s row order, identity, and three-property output; active and disposed lifecycle counts; no host resurrection after disposal; and arm-specific stale-setter behavior. Resource response bytes must match the frozen build assets. The independent verifier reconstructs the schedule and these conditions from raw page records.

## Timer calibration and isolation

Before and after every app page, use a separate browser context and a bare same-origin copy of the production HTML with JavaScript bundle requests blocked. This preserves the served COOP/COEP headers and crossOriginIsolated state without mounting the app. Record each HTML response, isolation headers, engine version, and the minimum positive performance.now() increment from the fixed sampling loop. Freeze a positive preregistered timer quantum in the config before collection; each pair's denominator floor uses five times the maximum of that value and all four page-adjacent calibration observations.

Require every Native and React page median and p95 to clear the fixed five-times maximum quantum floor before calculating that pair's ratios. If any statistic is below the floor, retain the records and report the affected result as unresolved; do not exclude or replace observations.

Each invocation has a fixed 90-second deadline. SIGINT, SIGTERM, or deadline expiry closes the browser, preserves already-written page/calibration records, and writes an exclusive incomplete pair receipt. An incomplete pair cannot be rerun or overwritten.

## Fixed decision rules

For each page, compute nearest-rank median and p95 from its 240 commitMs frame samples. For each pair, divide Native by React. The parity gate passes only when the geometric mean of five paired median ratios is at most 1.00 and the median paired p95 ratio is at most 1.00 at all three sizes. The stronger dense-win gate passes only when paired median geometric mean is at most 0.80 at two or more sizes. All 30 pages remain in the calculation. These thresholds cannot change after any outcomes are seen.

Five pairs provide limited tail precision; p95 is descriptive of this fixed experiment and does not establish a general tail distribution. This is one browser/build/environment and one DOM workload.

## Candidate binding

The config must bind an exact reviewed checkpoint status value and source archive hash, status/checkpoint path and SHA-256, source/build inventory hash, build proof path/hash, production dist directory, five asset hashes, expected Portless HTTPS origin, a preregistered timer quantum, and output directory. Collector and verifier require exact runtime/compiler source paths plus the staged TSX/harness source family. They inspect the build proof structure: both native rows must link schema-v2 six-argument kernels and three-slot registrations, and both React rows must have recorded successful compilation and memo-cache evidence. The collector checks every local asset before collecting, captures served response body hashes and response headers, and records schedule/decision-rule hashes. The verifier rechecks local and served hashes, config and checkpoint bindings, every pair/page/calibration record, and all gates independently.

## Invocation and retained evidence

Run the collector explicitly once for each pair, for example:

    node collect-one-pair.mjs --config frozen-config.json --size 128 --pair 0

The invocation refuses an existing raw page or pair receipt. It writes each finished page immediately using exclusive creation, so interruption does not erase completed records. The analyzer requires the exact 30-page matrix and emits no result from partial data. Do not retry failed records.
