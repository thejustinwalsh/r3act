# Recording B N=128 probe-off correctness control

## Outcome

The one authorized `MODE=off` collector invocation completed with exit code 0. The generated report status is `CORRECTNESS_AND_COUNT_PROTOCOL_PASS_SINGLE_N_128_OFF`; its analyzer status is `PASS`. The page ran the same N=128 schedule as the count page: 120 edits across 12 kinds (2 warmups and 8 measured per kind), followed by one disposal trace. All 120 edit trace rows passed. Probe-off behavior is confirmed by all 120 `receipt` fields being null and the analyzer's empty required-site list. Timing was absent.

Every edit settled: apply succeeded, flush returned true, the collection version matched the applied version, and pending-change count was zero. The reader remained at one and retained batches at zero during edits; listener errors and render fallback were zero. The final disposal trace reports reader count 0, owner count 0, and no remaining children. Across all 120 edit rows, the output/reset identity, selection, lifecycle, and commit fields exactly match the completed count page. Thus this control provides correctness/path matching evidence for the same frozen fixture and schedule, without counter receipts or timing evidence.

Chromium was 153.0.8010.12, headless with GPU disabled, at 1200×900. The exact origin was `https://structural-recording-diagnostic-v1.localhost:1355`. HTML and JavaScript responses were HTTP 200 and matched the frozen build hashes; the source map was HTTP 200 and matched the count page's source-map hash. There were no page, console, request, response, or cleanup errors.

## Preservation and cleanup

Before/after verification passed for all 767 frontend inputs, all 41 runner-lock entries, and 2,181 previously protected evidence entries. The completed count page report and all 10 files in its evidence directory are unchanged. The frozen runner-lock, input-lock, build report, compiler binary, and served assets match their expected hashes. Details are in `before.json` and `after.json`.

Collector session 27451 ended with exit 0. Owned Portless preview session 20513 was stopped with Ctrl-C and ended with exit 130; its Vite listener on port 4120 is down and its dynamic alias is absent from the post-stop route listing. Shared Portless proxy PID 43235 remains on port 1355, and all three existing yacht aliases remain.

An initial independent audit treated the final disposal trace as if it were an edit-status row. That audit is preserved as `page-audit.initial.json`; the corrected shape-aware audit is `page-audit.json` and verifies 120 passing edit traces plus the separate disposal trace.

## Receipts

- Full generated page report: `../page-report-off.json`.
- Corrected independent page audit: `page-audit.json`.
- Preserved first audit and correction note: `page-audit.initial.json`.
- Before/after frozen input and count-page preservation: `before.json`, `after.json`.
- Collector tool results: `collector.initial.tool-result.json`, `collector.terminal.tool-result.json`.
- Readiness and cleanup: `readiness.json`, `cleanup.json`.

No count rerun, additional page, build, source edit, or timing measurement was performed.
