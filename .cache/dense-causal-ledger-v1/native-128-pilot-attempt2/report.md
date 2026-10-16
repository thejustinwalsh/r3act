# Native 128 pilot attempt 2

## Outcome

All four explicit collector pages passed under pinned Node v24.18.0 with bounded headless Chromium (version 153.0.8010.12, GPU disabled). The existing analyzer exited 0 and reports **DIAGNOSTIC**, `decisionGrade: false`, with no invalid frames. This single pilot is not a speed verdict.

| Mode | Record | Status | Median commit (ms) | p95 commit (ms) |
| --- | --- | --- | ---: | ---: |
| original | `.cache/dense-causal-ledger-v1/runs/original-native-128-1791945964756-90d662d3-1bb7-4b31-8e5c-c2d88be2edaa/record.json` | PASS | 0.4125 | 0.5800 |
| off | `.cache/dense-causal-ledger-v1/runs/off-native-128-1791945999907-9af3e35b-3c68-4a3b-af0b-1d9735c20cfb/record.json` | PASS | 0.2950 | 0.3850 |
| on | `.cache/dense-causal-ledger-v1/runs/on-native-128-1791946019146-5baa9fc1-48a3-44ee-a3f9-97c8f4bc2e3f/record.json` | PASS | 0.3350 | 0.4650 |
| count | `.cache/dense-causal-ledger-v1/runs/count-native-128-1791946039714-e64b0417-36b6-423a-94bf-9e30c4ded5cf/record.json` | PASS | separate counter mode | separate counter mode |

Every page had 60 warmup and 240 measured frames, cross-origin isolation, passing output/order/identity/lifecycle/dead-setter/visibility checks, zero page errors and zero cleanup errors. All served asset responses matched the corresponding frozen or build-locked SHA-256.

## Attribution checks

- Timer quantum was about 0.005 ms for every mode. The five-tick floor was 0.025 ms; no measured commit was below it.
- `off - original` build-shape delta: median -0.110 ms, p95 0.005 ms, min -0.960, max 0.060.
- `on - off` signed epsilon: median 0.055 ms, p95 0.210 ms, min -0.550, max 0.350.
- Unattributed `q`: median 0.010 ms, p95 0.025 ms, min 0.000, max 0.050; all measured q values are nonnegative. It remains unallocated.
- Independent mark audit checked 240 measured frames, exactly 23 marks per frame, monotonic timestamp order and 11 nonoverlapping native spans contained in commit. The analyzer also found no missing/invalid boundaries.

| Native exclusive span | Median ms | p95 ms |
| --- | ---: | ---: |
| native_dispatch | 0.090 | 0.125 |
| native_capture | 0.005 | 0.010 |
| native_resolution | 0.030 | 0.045 |
| native_validation_and_dependency_gather | 0.025 | 0.035 |
| native_stage_setup | 0.000 | 0.005 |
| native_mirror | 0.005 | 0.005 |
| native_kernel | 0.025 | 0.035 |
| native_postkernel_stage | 0.015 | 0.020 |
| native_host_and_equality | 0.100 | 0.145 |
| native_cleanup | 0.000 | 0.005 |
| native_ack | 0.030 | 0.050 |

Validation includes reached dependency gathering. Host/equality includes output selection, writer wrapper and DOM/style writes; it is not a measured host floor. None of these spans is automatically removable.

## Operation counts and cold setup

Counts cover measured frames 61–300 only. `native.setter.calls` is 30,720 per-row setter callbacks/dispatches (128 callbacks × 240 frames), not individual state setter calls. Other measured counts: 92,160 row input cells, 30,720 distinct-row visits, 92,160 staged outputs, 92,160 host writes and 92,160 acknowledged cells. Count mode is separate and contributes no phase time.

Cold mount plus frame-zero initialization was 14.810 ms original, 14.550 ms off, 15.790 ms on and 15.350 ms count. This does not isolate compiler/plan preparation.

## Source and cleanup

Source manifest SHA-256 remains `f1d274b68e6bfbbea3151aa57388bb90a9c8b6c1aa62914924aaba14e0b3e57f`; all 272 snapshot after-hashes and all 287 frozen tooling/snapshot/manifest inputs match. Diagnostic build lock remains `68fefba20876c02c0e2013699c64d4b31eb4deb6d02b3abbacb2fde09f798372`; tooling and output asset hashes match it. The original proof still matches its frozen source/build lock.

Portless previews ran sequentially after the initial overlapping registration caused the original route to return 404 while its local server still answered. The verified original preview used session 70009/app port 4629; the diagnostic preview used session 50289/app port 4087. The diagnostic session handle was already closed when cleanup was requested; post-cleanup checks confirm both owned routes return proxy 404 and their local ports refuse connections. The before/after Portless route lists are byte-identical, preserving the three prior unrelated aliases. The shared HTTPS proxy remains running. See `preview-cleanup.json`.

The earlier first attempt, which failed at Chromium launch before navigation with `kill EPERM`, remains preserved at `../native-128-pilot/report.md` and its unique FAIL record. Attempt 2 required the exact narrow escalated collector invocations; no Chromium flags or visibility mode were changed.

Full independent checks are in `independent-verification.json`; raw collector stdout/stderr/exit receipts and readiness/route receipts are alongside this report. No source, tooling, build lock, fixture or historical evidence was edited.
