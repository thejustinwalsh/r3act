# Dense causal control v1 — gates only

## Result

The frozen handoff matched all five expected SHA-256 values. All 287 frozen v1 tooling/snapshot/manifest files matched the previous `recording-10000/inputs-after.json` receipt before and after these gates; the five handoff hashes also stayed unchanged. No new preregistered receipt directory or slot was created. No server, browser, build, or recording was run.

Pinned Node: `/Users/tjw/.nvm/versions/node/v24.18.0/bin/node` (`v24.18.0`, invoked with login disabled).

| Command | Exit | Outcome |
| --- | ---: | --- |
| `node .cache/dense-causal-control-v1/synthetic-protocol.mjs` | 0 | PASS: template acceptance and rejection cases executed |
| `node .cache/dense-causal-control-v1/analyze.mjs --rows 1024 --out .cache/dense-causal-control-v1/gates/invalid-analysis.json` | 1 | INVALID as expected for 18 absent, preregistered receipts |

The synthetic gate actually called the analyzer module’s `validatePage`, `assertOrderRun` and `phasePage` functions. It accepted the archived original/off/on template pages, then asserted rejection for wrong slot order, reused run ID, changed diagnostic build-lock hash, incomplete disposal lifecycle, nonfinite timestamp and negative dispatch span. The test mutates `buildLockSha256` for its identity-drift case; it does not independently mutate the `sourceIdentity` label. The on-page template has all 23 marks in order over all 300 frames; the analyzer checked the timestamped commit span against the archived sample on every warmup and measured frame, and collected phase spans only from measured frames.

The negative analyzer invocation read the new, absent 1024 receipt paths without creating them, wrote an `INVALID`, `decisionGrade: false` artifact, listed 18 `ENOENT` errors (one per declared slot), and exited 1. This proves missing evidence is rejected and preserved; it is not evidence that a real control block passes. Receipt directories for 1024 and 10000 remain absent.

## Protocol and archived timing contract

Protocol SHA-256: `d93a32cc78469739582c5f859625a1d5635278d30c61c32159a2705bdd4e90bd`; seed `20261013`, arm `native`. Each size declares six seeded permutations and 18 unique ordered receipt slots. The before capture confirms all declared paths are absent.

The three existing archived 1024-row template records have 60 warmup samples (frames 1–60) and 240 measured samples (frames 61–300). They share the contract: dirty-ID selection occurs before and outside the commit timer; the timed step includes per-ID setter dispatch and synchronous host commit; DOM inspection/correctness checks follow the timed step; cold initialization includes arm creation, mount and frame-zero state commit. For the archived `on` template, phase validation checks exact mark order and monotonic timestamps on all 300 frames. The marked commit duration reconciles with the recorded commit sample within the implemented timer-quantum/5-tick tolerance on all 300 frames. Phase intervals are checked only on frames 61–300. This validates the new analyzer’s declared template assumptions against the actual old receipts; it does not relabel those pages as new control evidence.

## Hashes and limits

Five frozen new-control tool hashes and 287 v1 before/after hashes are recorded in `inputs-before.json`, `inputs-after.json`, `v1-inputs-before.json` and `v1-inputs-after.json`. Exact stdout, stderr, exit codes and the invalid analyzer JSON are retained in this `gates/` directory. The synthetic gate and missing-slot rejection establish protocol behavior only. They do not establish statistical sufficiency, causal overhead stability, a removable performance budget, or a physical design choice.

An initial attempt to persist the preflight hash capture occurred before `gates/` existed and failed at output-file creation; it made no input changes. After creating the owned evidence directory, the preflight was rerun and all five tool hashes and all 287 prior v1 hashes matched.
