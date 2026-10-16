# Recording A — 1024-row aggregate

## Outcome

All eight explicitly sequenced collector pages passed under pinned Node v24.18.0 and Chromium 153.0.8010.12 (headless, GPU disabled). Each had 60 warmup and 240 measured frames; browser correctness, cross-origin isolation, lifecycle, response hashes, and collector cleanup passed. Both existing analyzers exited 0 with status **DIAGNOSTIC**, `decisionGrade: false`, and no invalid phase boundaries. This is not a speed verdict or optimization budget.

The run order was original/native, original/React, then diagnostic native off/on/count, then diagnostic React off/on/count. Original preview session 15542 was stopped before diagnostic session 40484 started. The diagnostic block was sequential and not counterbalanced; any position-matched difference includes run and block drift.

## 1024-row timing summaries

| Arm | Original median/p95 ms | Off median/p95 ms | On median/p95 ms | Off − original median/p95 ms | On − off median/p95 ms | q median/p95 ms |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| native | 1.7500/1.9200 | 1.7125/1.9350 | 1.6775/1.8200 | -0.0325/+0.2200 | -0.0500/+0.1600 | 0.0200/0.0350 |
| react | 1.4075/1.6450 | 1.2500/1.3750 | 1.2500/1.3600 | -0.1500/+0.0200 | -0.0025/+0.1700 | 0.0050/0.0200 |

These are separate single-page blocks, not paired causal estimates. For native, off−original is negative at the median but reaches +0.220 ms p95; on−off is negative at the median and reaches +0.160 ms p95. For React, off−original is −0.150 ms median/+0.020 ms p95; on−off is −0.0025 ms median/+0.170 ms p95, with a +1.190 ms maximum. None estimates probe overhead or build benefit. Do not divide these values into a matched ratio or assign the negative differences as savings.

Observed timer quantum was about 0.005 ms in all modes; the five-tick floor is 0.025 ms. No total commit sample fell below the floor. The native capture, stage-setup and cleanup spans include measurements at or below the floor; they are retained as observed and must not be called zero-cost. `q` remained nonnegative for both arms; it is still unassigned work and includes mark/timer/rounding residual.

## Phase and count audit

- **native:** `6900` marks across `300` frames; exactly `23` ordered marks on each of 240 measured frames (61–300); analyzer invalid boundaries: `0`. Phases: `native_dispatch` median/p95 0.5150/0.5900 ms, `native_capture` median/p95 0.0150/0.0200 ms, `native_resolution` median/p95 0.1450/0.1550 ms, `native_validation_and_dependency_gather` median/p95 0.1150/0.1200 ms, `native_stage_setup` median/p95 0.0000/0.0050 ms, `native_mirror` median/p95 0.0150/0.0200 ms, `native_kernel` median/p95 0.1150/0.1300 ms, `native_postkernel_stage` median/p95 0.0750/0.0900 ms, `native_host_and_equality` median/p95 0.4850/0.5150 ms, `native_cleanup` median/p95 0.0050/0.0100 ms, `native_ack` median/p95 0.1700/0.1850 ms.
- **react:** `1800` marks across `300` frames; exactly `6` ordered marks on each of 240 measured frames (61–300); analyzer invalid boundaries: `0`. Phases: `react_dispatch` median/p95 0.1400/0.1750 ms, `react_internal_unresolved` median/p95 1.1000/1.1900 ms.
- Native measured-only count mode verified actual `native.setter.calls=245760`, `native.row.inputCells=737280`, `vdom.inputCells=737280`, `vdom.stagedOutputs=737280`, `vdom.hostWrites=737280`, and `native.ack.cells=737280` (scope frames 61–300). These counts match the fixture and are not milliseconds.
- React measured-only count mode reports `245760` per-row callback dispatches (1024 × 240), not individual React state setter calls. Counts are not phase time.

## Source, assets, lifecycle, and cleanup

The original records’ `buildLockSha256` is `691bf7424823e9c0b9940e33ca543b0a5a19f744c9a0aae6552ea1c4853cdef6`, the SHA-256 of `frozen-config.json`; that config references the 397-entry source/build inventory (`source-build-locks.json`, SHA-256 `fc0ee17f8a3432b097e71a2080446ec0b2e92c3b0b564491f34456ca910a16ec`). The diagnostic records use archived source manifest `f1d274b68e6bfbbea3151aa57388bb90a9c8b6c1aa62914924aaba14e0b3e57f` and build lock `68fefba20876c02c0e2013699c64d4b31eb4deb6d02b3abbacb2fde09f798372`. All five original served assets and the diagnostic served HTML/CSS/JS hashes matched their respective frozen configuration/build lock in every page. The diagnostic source map and compiler proofs remain those covered by the build lock. The independently captured 287-file frozen tooling/snapshot/manifest tree matched both the reviewed pre-run hashes and post-run hashes; all 272 snapshot `after` hashes also match.

Each record passed output, ordering, identity, lifecycle, dead-setter and visible checks; mounted/cleanup counts equal 1024 before/after disposal; page and cleanup error arrays are empty. Original preview 15542/port 4541 stopped before diagnostic preview 40484/port 4315. Both sessions exited 130 on our Ctrl-C; after stopping, both HTTPS URLs returned proxy 404 and local ports refused connections. Portless route list after the original preview and after the diagnostic preview is byte-identical, preserving the three pre-existing aliases and shared proxy.

## Limits

This aggregate is one observation per arm × mode at 1024, intentionally block ordered and non-counterbalanced. It supports protocol/source correctness and a diagnostic ledger only. It does not resolve causal probe overhead, native host/equality versus DOM floor, React render versus commit/host/scheduler, timer-floor spans, or allocation/GC. No 10,000-row pages, allocation captures, or optimization budget were run.

Raw records are in `runs/`; stdout, stderr, and exact shell exit codes are beside this report. See `native-analysis.json`, `react-analysis.json`, `independent-verification.json`, `inputs-before.json`, `inputs-after.json`, and `preview-cleanup.json` for full receipts.
