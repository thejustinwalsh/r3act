# Recording B N=1024 count page

## Outcome

The one authorized count collector invocation ended with exit code 0. Its report status is `CORRECTNESS_AND_COUNT_PROTOCOL_PASS_SINGLE_N_1024_COUNT`; the analyzer status is `PASS`. It ran the full 120-edit schedule at N=1024: 12 edit kinds, two warmups and eight measured edits per kind, plus a disposal trace. All 120 edit traces passed. All seven required count sites were present and satisfied: root flush entries and collection delta batch visits were 1; the five operation-visit sites equaled the edit's K. The count window had no timing data.

Every edit settled (apply succeeded, synchronous flush returned true, collection version matched, pending count was zero), with no render fallback or listener errors. Reader count stayed 1 and retained batches stayed 0 during edits. Disposal ended with reader count 0, owner count 0 and no remaining children. All page, console, request, response and cleanup error lists were empty. All conditional missing-authority values are null with reasons; they remain unobserved rather than zero.

The browser was Chromium 153.0.8010.12, headless with GPU disabled, at 1200×900. The exact Portless origin was `https://structural-recording-size-v2.localhost:1355`. Nested HTML, JavaScript and source-map requests returned HTTP 200 and matched the locked hashes. The pinned compiler SHA was `74396ae694aa6203cc4d4b4900c3458ca31e25e9638c73160b51bcb4aede79c8`.

## Operation counts by kind

The table compares the eight measured rows per kind at N=128 and N=1024. `K` is the number of delta operations; owner probes and bucket reindex visits are counters, not phase time or total cost. Ranges reflect the observed measured rows. `unobserved` is not a zero value.

| Kind | K at 128 | K at 1024 | Owner probes at 128 | Owner probes at 1024 | Bucket reindex visits at 128 | Bucket reindex visits at 1024 |
|---|---:|---:|---:|---:|---:|---:|
| edge-replacement | 2 | 2 | 4 | 4 | 128 | 128 |
| insert-head | 1 | 1 | 3 | 3 | 65–129 | 128 |
| insert-middle | 1 | 1 | 3 | 3 | 65 | 64–128 |
| insert-tail | 1 | 1 | 2 | 2 | 1–65 | 1 |
| move-head | 1 | 1 | 2 | 2 | 128 | 128 |
| move-middle | 1 | 1 | 2 | 2 | 192 | 190–254 |
| move-tail | 1 | 1 | 1 | 1 | 128 | 127 |
| odd-key-filter | 64 | 512 | 64 | 512 | 4032–4095 | 32768–32831 |
| remove-head | 1 | 1 | 1 | 1 | 127–190 | 126 |
| remove-middle | 1 | 1 | 1 | 1 | 63 | 126–189 |
| remove-tail | 1 | 1 | 1 | 1 | unobserved | unobserved |
| same-key-rotation | 1 | 1 | 1 | 1 | 128 | 127 |

For the eleven local edit kinds, measured owner find probes match the N=128 counts. The broad odd-key filter performs K=N/2 public removals, so its owner probes are 64 and 512 respectively; its reindex counts are broad-operation work. Changes in bucket-reindex counts across sizes also depend on retained bucket shape. These operation counts do not establish elapsed cost, asymptotic behavior, or a speed result.

## Preservation and cleanup

The independent after audit passes all 813 size-v2 inputs, all 39 runner-lock entries, all 2,181 prior v1 evidence entries, both accepted N=128 reports and their 19 evidence files, all 10 size-v2 source/build evidence files, the frozen compiler, and the size-v2 build artifacts. Collector-embedded before/after snapshots independently match 813 inputs, 21 source/API entries, 18 preserved entries and three local assets. Full path-level inventories are in `before.json` and `after.json`.

Collector session 58618 ended with exit 0. Owned preview session 67677 was stopped with Ctrl-C and ended with exit 130; its allocated Vite listener on port 4262 is down and the dynamic alias is absent after stop. Shared Portless proxy PID 43235 remains on port 1355, and the three existing yacht aliases remain.

Two initial independent audit attempts are retained. One assumed literal trace-ID/order equivalence across sizes; another compared broad-filter owner probes to the smaller-size K. The corrected `page-audit.json` validates each size's registered schedule, checks local-operation probes across sizes, and checks each filter's probes against its own K. The collector/analyzer page result passed throughout; neither audit issue caused a collector rerun.

## Receipts

- Full generated page report: `../page-report-count-n1024.json`.
- Independent page/count audit and preserved earlier audit attempts: `page-audit.json`, `page-audit-initial.json`, `page-audit-attempt-2.json`.
- Frozen-input and evidence preservation: `before.json`, `after.json`.
- Raw collector tool result, readiness and cleanup: `collector-tool-results.json`, `readiness.json`, `cleanup.json`.

No second page, N=10000 page, off-mode page, build, source edit, latency run or matrix was performed.
