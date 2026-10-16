# N=10,000 count page evidence

Status: **CORRECTNESS_AND_COUNT_PROTOCOL_PASS_SINGLE_N_10000_COUNT**. One approved `MODE=count`, `SIZE=10000` page ran; no timing or allocation page was run.

## Execution

- Collector: pinned Node v24.18.0, Chromium 153.0.8010.12, headless `True`, GPU `False`; collector process handle 6292, terminal exit 0, stdout/stderr empty.
- Origin: `https://structural-recording-size-v2.localhost:1355` via the existing Portless HTTPS proxy. The exact nested HTML route returned 200, 209 bytes, SHA-256 `30a25d62dff3f9b96c01926226ec39b63ffc0094d752547e362e416e8ac8fbf4`. Executed JS returned 200 with SHA-256 `2b259157881fd7adc4b275b08c74f7a0c43c19f2414810f43a95910bfce243d8`; source map fetch returned 200 with SHA-256 `ff962d95b4d7583bfb139807de631940fca9fc3bff887b25d0abab4bfbe9f119`.
- Protocol: 120 edits across 12 kinds, two warmups and eight measured edits per kind; 120 PASS trace rows plus final disposal. `analysis.status=PASS`; timing fields are ABSENT.
- Browser, console, failed-request, response, and cleanup error counts are all zero. Final disposal recorded readerCount 0, ownerCount 0, and zero remaining children.

## Observed counters

Every measured edit had `root.flush.entries=1` and `collection.delta.batch-visits=1`. The other required copy/preflight/delta-operation/VDOM validate+commit iteration counts matched `changedKeys`: K=1 for one-key edits, K=2 for edge replacement, and K=5,000 for `odd-key-filter` (the registered N/2 public removals). The latter therefore measures a broad filter workload, not a local-edit falsifier. The per-kind observed count details are in [`page-audit.json`](page-audit.json); all rows and raw receipts remain in the page report.

Across the accepted count pages, local `owner.slot.find-probes` remained 1–4 by kind at N=128, 1–4 at N=1,024, and 1–4 at N=10,000. Measured move reindex visits were 127–192, 127–254, and 127–246 respectively. For `odd-key-filter`, K and bucket reindex visits were 64 and 4,032–4,095 (N=128), 512 and 32,768–32,831 (N=1,024), then 5,000 and 319,864–319,927 (N=10,000). These are observed operation counts for these fixtures; they do not establish elapsed phase cost or an asymptotic guarantee. The filter's own broad K work is expected by the protocol. Conditional counters labeled absent remain unobserved, not zero. `vdom.delta.released-child-array-length` is an array-length observation before reference assignment, not a count of child visits.

## Preservation and cleanup

The frozen input lock remained `aa1852e77e6d142ed94111dafcf74f8365e32f3bc48142a19be288b6e64a1724` (813 entries); all before/after entries matched. Runner lock remained `3893a2d8709c68d8fa036d6a554e11051448d535c89f38c9bd44c961aae5fbe6` (39 entries, including 19 sources, 2 API declarations, and 18 preserved files). The pre-run independent audit covered 2181 prior V1 evidence references, 21 accepted N=128 count/off evidence files, the pinned compiler and original assets, plus frozen size-v2 inputs. All 1034 unique protected files remained present and hash-identical. See [`before.json`](before.json) and [`after.json`](after.json).

The default-sandbox Portless launch failure (EPERM opening the shared proxy log, exit 1) is preserved in `preview-launch-sandbox-failure.json`. The same approved launch succeeded with command-scoped escalation; no route override was used. Owned preview session 77150 was stopped (exit 130); listener 4840 was absent afterward. The shared proxy PID 43235 remained on 1355 with all three yacht aliases intact; the owned route was absent. Cleanup receipt: [`cleanup.json`](cleanup.json).

This is count/correctness evidence for one diagnostic page at N=10,000. It is not latency evidence, a speed verdict, or proof that all collection/VDOM iteration classes are bounded.
