# React 128 pilot

## Outcome

All four explicit pages passed under pinned Node v24.18.0 and the same bounded headless Chromium context (v153.0.8010.12, GPU disabled). The existing analyzer exited 0 with status **DIAGNOSTIC**, `decisionGrade: false`, and zero invalid boundaries. This is a single-page-per-mode diagnostic, not a speed result or optimization budget.

| Mode | Record | Status | Median commit ms | p95 commit ms |
| --- | --- | --- | ---: | ---: |
| original | `.cache/dense-causal-ledger-v1/runs/original-react-128-1791946269638-e478d8da-6a7e-43e1-acdc-1970d4ac0335/record.json` | PASS | 0.2850 | 0.3850 |
| off | `.cache/dense-causal-ledger-v1/runs/off-react-128-1791946301393-b77496b0-b24b-4d2e-b13f-c2d1676c4d70/record.json` | PASS | 0.3750 | 0.9900 |
| on | `.cache/dense-causal-ledger-v1/runs/on-react-128-1791946319695-84f047a6-4a60-42a9-87a3-72d992f92665/record.json` | PASS | 0.2550 | 0.3250 |
| count | `.cache/dense-causal-ledger-v1/runs/count-react-128-1791946337684-d4837322-3584-44be-9068-37598327387c/record.json` | PASS | separate counter mode | separate counter mode |

Each page had 60 warmup and 240 measured frames, HTTP 200, cross-origin isolation, passing output/order/identity/lifecycle/dead-setter/visibility checks, exact served asset hashes, and no page or cleanup errors.

## React marks, phases, and floor

The `on` record contains exactly six ordered marks on each of 300 frames; all 240 measured frames passed an independent mark-order check. The analyzer checked two exclusive intervals: React setter dispatch and the remainder of `flushSync`.

- `react_dispatch`: median 0.025 ms, p95 0.040 ms, min 0.010 ms. The observed quantum is about 0.005 ms and the five-tick floor is 0.025 ms. Its median is at the floor and some observations are below it, so this phase is **unresolved at this clock floor**, not zero-cost.
- `react_internal_unresolved`: median 0.230 ms, p95 0.285 ms. This span combines React render, commit, host application and scheduler internals; this recording does not split them.
- Unattributed `q`: median 0.005 ms, p95 0.010 ms, min 0.000 ms and max 0.025 ms. All are nonnegative and retained as unassigned.

## Run drift and counters

The matched-position deltas across these separate pages show substantial run drift: `off - original` has median 0.0825 ms and p95 0.6700 ms; `on - off` epsilon has median -0.1250 ms and p95 -0.0050 ms. These signs are not probe/build savings estimates; do not allocate them to phases. Original/off/on total p95 values are 0.385/0.990/0.325 ms.

Count mode covers measured frames 61–300 and reports `30,720` React setter callbacks: 128 row callbacks × 240 frames, not individual state setter calls. Counts are not phase time. Cold mount/frame-zero initialization is 7.660/6.235/5.600/5.320 ms for original/off/on/count; compiler and plan preparation are not isolated.

## React Compiler and source integrity

The served production React arm asset matches the build lock. Build proof has successful React Compiler assertions and events for `ReactRowA`, `ReactRowB` and `ReactBoard`; the locked React source map identifies `react_high_frequency_arm.tsx` and the React Compiler runtime. All four collector records have hash-matched served responses.

Source manifest SHA-256 is `f1d274b68e6bfbbea3151aa57388bb90a9c8b6c1aa62914924aaba14e0b3e57f`. All 272 snapshot manifest after-hashes and 287 pre-build frozen tooling/snapshot/manifest hashes remain unchanged. Build lock remains `68fefba20876c02c0e2013699c64d4b31eb4deb6d02b3abbacb2fde09f798372`; its tooling, output assets and source maps verify. Original build04 proof still matches its frozen source/build lock.

## Cleanup

Original preview session 72406/app port 4143 was stopped before starting the diagnostic preview. Diagnostic preview session 99279/app port 4059 was stopped after collection. Both owned URLs now return proxy 404 and both local ports refuse connections. Before/after Portless route lists are byte-identical; the three prior aliases and shared HTTPS proxy were preserved. No source, tooling, fixture, build or lock was modified.

Full raw evidence and independent checks are alongside this report in `runs/`, `analysis.json`, `independent-verification.json`, and `preview-lifecycle.json`. The native128 pilot's material control drift is preserved; no larger sizes or allocation run was performed.
