# Compiled owner-row CPU attribution protocol

Prepared 13 October 2026 for one paired CPU attribution run on the frozen compiled owner-row build. This is a diagnostic, not a timing confirmation, performance verdict, or causal comparison.

## Frozen inputs and qualification

Use `implementation/2026-10-13-compiled-owner-rows/source-and-evidence.tar.gz` (SHA-256 `4aabe8b6cb3168aae50ba8474464452494d790aac60b472611fc20f54ec7a08c`) and its immutable status. The checkpoint has 694 runtime tests, 33 Rust tests, 965 source/build entries, 64 verification entries, and `candidateProductionPilotPages: 0`. Keep that pilot count unchanged.

Require the separate six-page production correctness pilot at `results/product-mixed-compiled-owner-rows-pilot/results.json`. It must bind the six 128/512/1024 pages to the five frozen production asset hashes and their HTTPS-served bytes, the same source archive, and the same CDP product, JavaScript version, and revision as the v5 Chromium diagnostic. Preserve its manifest, pages, verifier, browser UA, viewport, asset preflight, and engine epoch in the preregistration locks.

Before profiling, require the current 30-page owner-row confirmation's V4 integrity verification to pass and its speed gate to remain failed. Lock its source-linked timing archive/status, V2 summary, V4 independent verification, preregistration, manifest, postlock, final results, all raw pages, and all current input hashes. The V4 status records 30 pages, 7,200 measured frames, 1,044 verified input locks, and a 75-member archive (`f89b9ed1e96218548324478854876d2d3fde544c86c7c9207ffb91bc5a32a02f`). The confirmation remains the performance result; CPU attribution cannot change it.

Also lock all 965 source/build entries, all 64 verification entries, the status/archive, five built assets, pilot evidence and pilot verifier, owner-row authored TSX proof and emitted fixture, actual Three proof and fixture, compiler output/proof, v5 Chromium diagnostic, schedule, this protocol, collector, preview config, and independent verifier. The output directory must be new and empty. Use exclusive writes; retain failures and partial profiles.

## Fixed pair and capture

Profile exactly sequence 20 (React, 1,024 rows) followed by sequence 21 (native, 1,024 rows), from `src/browser/product_mixed_schedule.ts`. Use fresh headed contexts serially, GPU disabled, and a 1200×900 viewport. Use CDP `Profiler` with a 1,000-microsecond sampling interval. Start the profiler on `about:blank` before navigation and stop after the harness result and disposal are complete. Do not change the product harness, insert timers, rebuild, or add runtime instrumentation.

Serve the already-built `dist-product-mixed-compiled-owner-rows` via Portless using `vite.product-mixed-compiled-owner-rows-cpu.config.ts` at `https://compiled-owner-rows-cpu.localhost:1355`. The config applies COOP `same-origin` and COEP `require-corp`. Verify all five served assets match their frozen SHA-256 values. Require each page to load its selected arm and reject the opposite-arm bundle.

Require each harness result to pass all five checks and identify its scheduled sequence, arm, and size. It must report 60 warmup frames, 240 measured samples, eight structural samples, 1,024 active writers, zero writers after disposal, and no page errors. Keep the complete result, all per-frame harness samples, full CDP profile nodes/samples/time deltas, all loaded resource hashes, and any failure text.

## What the capture can attribute

For each CDP sample, preserve sampled self time, function name, URL, line and column, and its source excerpt from a locked production asset. Store offsets as UTF-16 code units; reject out-of-range locations instead of clamping. Keep built-in and unresolved frames unresolved. Report function/source-excerpt observations grouped by shared harness bundle, selected arm bundle, browser/V8 runtime, GC, idle, and unresolved frames. Treat these as sampled attribution clues, not exact instruction costs or proof of causation.

The current production build does not enable the runtime `profileCounter` callback and has no source maps. Therefore the profile cannot directly report separate CPU totals for World state dispatch, Root cut validation/capture, VDOM deduplication/projection, or host writes. Attribute those stages only when the sampled call frame and exact excerpt resolve clearly; otherwise mark the stage unresolved. Do not infer stage shares from a minified bundle's aggregate.

The harness already stores `commitMs`, `intervalMs`, and a `structural` flag for each measured frame. Report ordinary and structural commit summaries separately as existing harness wall-clock context. The CDP profile spans module import, mount, warmup, all measured work, correctness inspection, and disposal; it cannot assign its CPU samples to individual frames or structural edits. Do not describe the whole-page profile as measured-frame CPU.

## Output and limits

Write `preregistration.json`, `20-react-1024.json`, `21-native-1024.json`, `results.json`, and `source-build-post-lock.json` under `results/product-mixed-compiled-owner-rows-cpu/`. Rehash every preregistered input after both pages. Never rerun, replace, or exclude a page.

This is one two-page, one-machine, one-browser attribution sample. It makes no latency, allocation, GC-causality, independent-device, or historical causal claim. It excludes browser layout, paint, and GPU presentation, and cannot resolve internal stages when production symbols are minified.
