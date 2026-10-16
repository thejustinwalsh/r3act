# Recording A — 10,000-row aggregate

## Outcome

All eight collector pages passed under pinned Node v24.18.0 and Chromium 153.0.8010.12 (headless, GPU disabled). Each page completed 60 warmup and 240 measured frames with correctness, isolation, lifecycle, response-hash and cleanup checks passing. Both analyzers exited 0 as **DIAGNOSTIC**, `decisionGrade: false`, with zero invalid intervals.

The order was original/native, original/React, diagnostic native off/on/count, diagnostic React off/on/count. The two Portless previews were sequential and owned: original session 65922 (port 4830) stopped before diagnostic session 40033 (port 4719). This is a non-counterbalanced block recording; comparisons by frame position include run and block drift. It provides no speed verdict or optimization budget.

## Timing summaries

| Arm | Original median/p95 ms | Off median/p95 ms | On median/p95 ms | Off − original median/p95 ms | On − off median/p95 ms | q median/p95 ms |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| native | 21.853/23.120 | 21.200/22.545 | 20.833/22.960 | -0.657/+0.920 | -0.377/+2.000 | 0.120/0.135 |
| react | 14.405/22.130 | 15.295/22.160 | 14.210/20.915 | +0.865/+7.295 | -1.113/+4.335 | 0.005/0.020 |

These distributions are not paired causal measurements. Native off−original is −0.657 ms median and +0.920 ms p95; on−off is −0.377 ms median and +2.000 ms p95 (epsilon ranges −9.150 to +7.065 ms). React off−original is +0.865 ms median/+7.295 ms p95; on−off is −1.113 ms median/+4.335 ms p95 (epsilon ranges −10.565 to +13.330 ms). The large spread and mode/order dependence leave build shape and probe overhead unresolved. Do not treat negative medians as savings or calculate a matched speed ratio.

Timer quantum is about 0.005 ms; the five-tick floor is 0.025 ms. No total commit sample fell below the floor. Native stage setup includes intervals at the floor or below it; measured values remain reported without interpreting sub-floor work as zero. All q values were nonnegative (native median/p95 0.120/0.135 ms; React 0.005/0.020 ms); q remains unassigned mark/timing/rounding residual.

## Phases and measured-only counts

- **native:** 6900 marks over 300 frames; 23 identical ordered marks for all 240 measured frames; zero analyzer invalid boundaries. Phase medians/p95 (ms): `native_dispatch` 6.745/7.630, `native_capture` 0.290/0.340, `native_resolution` 1.915/2.080, `native_validation_and_dependency_gather` 1.700/1.970, `native_stage_setup` 0.025/0.035, `native_mirror` 0.270/0.375, `native_kernel` 1.080/1.190, `native_postkernel_stage` 1.320/1.530, `native_host_and_equality` 4.970/5.315, `native_cleanup` 0.040/0.045, `native_ack` 2.340/2.645.
- **react:** 1800 marks over 300 frames; 6 identical ordered marks for all 240 measured frames; zero analyzer invalid boundaries. Phase medians/p95 (ms): `react_dispatch` 1.340/2.580, `react_internal_unresolved` 12.835/19.025.
- Native count mode observed `native.setter.calls=2400000`; `native.row.inputCells=7200000`; `vdom.inputCells=7200000`; `vdom.stagedOutputs=7200000`; `vdom.hostWrites=7200000`; `native.ack.cells=7200000`. These are measured frames 61–300 counts; 7,200,000 cells/output/host/ack values match the actual count, not a forced assumption.
- React count mode observed `react.setter.calls=2400000` per-row callback dispatches. This is 10,000 × 240 callback invocations, not individual state setter calls. Counts are not time.

Cold mount/frame-zero initialization was recorded separately in each aggregate mode: native 274.700/278.665/270.015/280.915 ms and React 55.095/50.695/53.655/54.045 ms (original/off/on/count). This interval includes setup and does not isolate compiler/plan preparation.

## Source identity and cleanup

Original records’ `buildLockSha256` is frozen-config SHA-256 `691bf7424823e9c0b9940e33ca543b0a5a19f744c9a0aae6552ea1c4853cdef6`; the config references the 397-entry source/build inventory at `.cache/current-owner-kernel-headless-20261013-v1/source-build-locks.json` (SHA-256 `fc0ee17f8a3432b097e71a2080446ec0b2e92c3b0b564491f34456ca910a16ec`). Diagnostic archived source manifest is `f1d274b68e6bfbbea3151aa57388bb90a9c8b6c1aa62914924aaba14e0b3e57f` and build lock is `68fefba20876c02c0e2013699c64d4b31eb4deb6d02b3abbacb2fde09f798372`. The 287-file frozen tooling/snapshot/manifest tree matches before and after; all 272 snapshot after-hashes match. All original and diagnostic served assets matched their frozen config/build lock on every page.

Every row mounted and cleaned up 10,000 owners/writers, with all check flags passing and no page/cleanup errors. Both owned preview routes return 404 after stop, their local app ports refuse connections, and Portless routes before versus after are byte-identical; the three existing aliases and shared proxy remain. No live previews remain.

## Limits

This is a single 10,000-row observation per arm and mode with a fixed block order. The analyzers correctly remain diagnostic: uncertainty and run drift prevent causal attribution. The combined native host/equality phase is not a measured DOM host floor; React internal work remains combined render/commit/host/scheduler. No allocation/GC or other sizes were run, and no implementation change is supported by this aggregate alone.

Raw records are under `runs/`; each exact collector stdout, stderr and exit code is in this directory. See `native-analysis.json`, `react-analysis.json`, `independent-verification.json`, `inputs-before.json`, `inputs-after.json`, and `preview-cleanup.json`.
