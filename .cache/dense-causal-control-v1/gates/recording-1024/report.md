# Targeted native 1024 control — evidence report

## Outcome

All 18 preregistered fresh native pages completed with collector status `PASS`, in the six predeclared mode orders. The unchanged analyzer ran once, exited 0, and returned `DIAGNOSTIC`, `decisionGrade: false`, with no validation errors. Its result is `UNSTABLE_OR_BELOW_FLOOR_STOP_UNRESOLVED`; the next-size gate is `STOP_10000_UNRESOLVED`. No 10,000-row recording is authorized by this result.

This is a descriptive control, not a speed verdict or a removable-cost estimate. Pages are the independent units; the six blocks are not a population confidence interval. `off−original` includes diagnostic build-shape, JIT, and environment differences. `on−off` includes timestamp probes, JIT, and environment differences. Do not treat those deltas as guaranteed overhead corrections, or sum phase medians into savings.

## Execution and evidence identity

- Exact collector: pinned `/Users/tjw/.nvm/versions/node/v24.18.0/bin/node` with login disabled, one `collect-one.mjs` invocation per declared page, native arm, 1,024 rows, 60 warmup plus 240 measured frames, headless Chromium 153.0.8010.12 with GPU disabled, and the collector’s 90-second deadline. Each collector command used the approved command-scoped sandbox escalation.
- Original pages used `https://react-runtime-headless.localhost:1355`, source identity `frozen-qualified-build04`, and frozen config SHA-256 `691bf7424823e9c0b9940e33ca543b0a5a19f744c9a0aae6552ea1c4853cdef6`.
- Diagnostic pages used `https://dense-ledger.localhost:1355`, source identity `archived-source-diagnostic-snapshot`, source manifest SHA-256 `f1d274b68e6bfbbea3151aa57388bb90a9c8b6c1aa62914924aaba14e0b3e57f`, and diagnostic build-lock SHA-256 `68fefba20876c02c0e2013699c64d4b31eb4deb6d02b3abbacb2fde09f798372`.
- Every page passed output, order, identity, lifecycle, dead-setter, visibility, navigation, and cleanup checks. Its four served CSS/HTML/JS assets returned 200 and matched the build’s locked SHA-256 values. All 18 raw run files are retained in `.cache/dense-causal-ledger-v1/runs/`; exact raw-to-preregistered-receipt paths and SHA-256 values are in `preanalysis-audit.json` and per-slot audits.
- The six `on` pages each contain 6,900 phase events. Independent mark audits confirm 23 labels in exact order, monotonic timestamps, and commit-span reconciliation on all 300 frames per page. Timer quantum was about 0.005 ms. `capture`, `stage_setup`, `mirror`, and `cleanup` are below the five-tick floor on all six `on` pages; treat those intervals as unresolved, not zero-cost. Dispatch medians were above that floor on all six pages.
- Initial control preflight found all 18 slots absent. No count arm was run, and no 10,000-row receipt directory was created.
- The five frozen control-file hashes and all 287 frozen v1 inputs match both the pre-run capture and their prior v1 hashes after analysis. Source manifest and build-lock hashes also match their preregistered values. See `inputs-before.json`, `inputs-after.json`, `inputs-post-analysis.json`, and `preanalysis-audit.json`.

## Page statistics

Values are milliseconds. Each cell is the page median / page p95. These are descriptive page-level summaries.

| Block | Declared order | Original | Off | On |
| ---: | --- | ---: | ---: | ---: |
| 1 | original → off → on | 1.8200 / 2.0300 | 1.8175 / 2.0400 | 1.7900 / 2.0250 |
| 2 | on → off → original | 1.7800 / 2.0450 | 1.8650 / 2.1950 | 1.7550 / 2.0300 |
| 3 | original → on → off | 1.8400 / 2.0700 | 1.7700 / 2.1050 | 1.8100 / 1.9650 |
| 4 | off → on → original | 1.8150 / 2.0650 | 1.8100 / 2.1250 | 1.8100 / 2.0900 |
| 5 | off → original → on | 1.7825 / 1.9900 | 1.8700 / 2.0400 | 1.7950 / 2.1050 |
| 6 | on → original → off | 1.5750 / 1.8450 | 1.8475 / 2.0950 | 1.7850 / 2.0100 |

| Block | `off − original` median / p95 | `on − off` median / p95 |
| ---: | ---: | ---: |
| 1 | −0.0025 / +0.0100 | −0.0275 / −0.0150 |
| 2 | +0.0850 / +0.1500 | −0.1100 / −0.1650 |
| 3 | −0.0700 / +0.0350 | +0.0400 / −0.1400 |
| 4 | −0.0050 / +0.0600 | 0.0000 / −0.0350 |
| 5 | +0.0875 / +0.0500 | −0.0750 / +0.0650 |
| 6 | +0.2725 / +0.2500 | −0.0625 / −0.0850 |

## Control screen and phase summaries

The median reference is 1.79875 ms; its 10% screen tolerance is 0.179875 ms. Across the two controls, the largest median-difference envelope width is 0.34250 ms and the largest absolute block difference is 0.27250 ms. Both exceed the screen tolerance.

The p95 reference is 2.03750 ms; its 10% screen tolerance is 0.20375 ms. The largest p95-difference envelope width is 0.24000 ms and the largest absolute block difference is 0.25000 ms. Both exceed the screen tolerance. The descriptive control therefore fails the registered stability screen even though dispatch pages are above the five-tick floor.

| Source-marked `on` phase | Median of six page medians | Median of six page p95s | Pages below five-tick floor |
| --- | ---: | ---: | ---: |
| Dispatch | 0.4975 ms | 0.6100 ms | 0 / 6 |
| Capture | 0.0200 ms | 0.0250 ms | 6 / 6 |
| Resolution | 0.1550 ms | 0.1750 ms | 0 / 6 |
| Validation and dependency gather | 0.1250 ms | 0.1425 ms | 0 / 6 |
| Stage setup | 0.0000 ms | 0.0050 ms | 6 / 6 |
| Mirror | 0.0200 ms | 0.0250 ms | 6 / 6 |
| Kernel | 0.1300 ms | 0.1500 ms | 0 / 6 |
| Postkernel stage | 0.0750 ms | 0.0950 ms | 0 / 6 |
| Host and equality | 0.5525 ms | 0.6300 ms | 0 / 6 |
| Cleanup | 0.0050 ms | 0.0100 ms | 6 / 6 |
| Acknowledgement | 0.1925 ms | 0.2150 ms | 0 / 6 |

These are gross diagnostic intervals. In particular, “host and equality” is not an identical-output host floor. The 1,024-row registered strong-win budget is 39.5% of current total, but this recording establishes neither a semantically removable lower bound nor a new-cost upper bound. Operation-count and allocation evidence were not collected here.

## Analyzer and cleanup receipts

The single analyzer command was:

```sh
/Users/tjw/.nvm/versions/node/v24.18.0/bin/node .cache/dense-causal-control-v1/analyze.mjs --rows 1024 --out .cache/dense-causal-control-v1/gates/recording-1024/analysis-1024.json
```

Exit code was 0; stdout was `DIAGNOSTIC <absolute analysis path>`; stderr was empty. The analyzer result and hash are retained with its raw stdout, stderr, and exit file.

Ten owned Portless preview sessions were stopped with exit 130 at their scheduled mode changes or final cleanup; each owned application listener was checked down afterward. The shared Portless proxy remained on 1355 and all three unrelated aliases were present in `routes-after.txt`. `portless clean` was not used. One initial Portless launch was denied with `EPERM` on the existing shared proxy log; the exact authorized launch succeeded after command-scoped escalation. A default-sandbox route listing omitted the active app and a default-sandbox HTTPS probe failed, but escalated process inspection showed the app listener still live. This is an inconclusive sandbox-limited observation, not evidence that the route disappeared. Details are retained in `preview-cleanup.json`.

The first independent rollup had an auditor-only lock-expectation error: it looked for a nonexistent `.sha256` property on the frozen config JSON. That flawed rollup is retained as `preanalysis-audit.before-lock-correction.json`; the corrected rollup compares each original page to the SHA-256 of the frozen-config file and each diagnostic page to the SHA-256 of the build-lock file. The corrected audit passes all 18 pages. A separate read-only metadata query also assumed `modePages` was an array; its TypeError is retained in `inspection-error-1.txt`. Neither issue changed a raw record, receipt, analyzer, tool, source, or plan.

## Limits

No 10,000-row follow-up, count mode, allocation profile, source change, tooling change, build, or implementation was performed in this task. This single targeted recording remains diagnostic (`decisionGrade: false`). The control stability screen failed, so this hotspot stops unresolved at 1,024; these results do not support a physical selection, optimization claim, or speed claim.
