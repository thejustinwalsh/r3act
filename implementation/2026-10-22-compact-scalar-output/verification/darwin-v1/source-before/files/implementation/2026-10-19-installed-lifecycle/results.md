# Installed authored lifecycle: source and results

Basis: local main `70df51c7582d0892decd7ef1b0bc0175288ded1f`, MIT. [Design](design.md), [source review](source-review.md), [protocol](protocol.md), [consumer](consumer/README.md). This is a Unit 9 cost-evidence continuation, with no runtime/compiler optimization or physical redesign. The replaced evaluation route used checkout aliases and co-loaded both arms. The [18 October source and Native loss](../2026-10-18-authored-lifecycle/results.md) remain unchanged.

Fresh five-package installation and separate static entries preserve the complete 256-keyed-row episode: local state, sixty ordinary numeric Store updates, declarative style/text, generic remove/insert/move, detail reveal while health waits, later health reveal and teardown. Native and the shared contract are byte-identical to the frozen workload. React's exact adaptation removes two obsolete missing-declaration suppression comments and adds its JSX pragma; actual installed ReactDOM declarations typecheck. Existing Store/World/root histories, compiler hook sites, acknowledgements and host/resource lifetime remain authoritative. There is no new mutable identity/version/publication registry.

## Consolidated correctness and preserved failures

[Darwin-v2](verification/darwin-v2/receipt.json) passes 55/55 steps: 1056 frozen Deno tests, 83 Rust tests, 36 compiled fixtures, nine Three cases, three retention checks and thirteen package-consumer checks. Its 1261 inputs match before/after; 1271 raw/context files, 222 fixture files and fresh package evidence are archived. The debug compiler is `10a3ee2e7ee846b1ba4bb472ea865aea9d445411ed70dd9b612e77cbfecbbcb2`.

The initial launcher stopped before any check because the verification parent did not exist; [launch evidence](verification/launch-disposition-v1.json) is retained. [Proof-v1](proof-v1/build-proof.json) installed successfully but failed TS5097: its bundler tsconfig omitted `allowImportingTsExtensions`. The sole consumer correction adds that option beside `noEmit`; no application/product statements changed. The source-review follow-on explains this separately locked correction, so the later consumer configuration is not claimed identical to the earlier consolidated gate. [Proof-v2](proof-v2/build-proof.json) passed preparation but its untimed browser launch exited SIGABRT/kill EPERM in the execution sandbox before any arm or asset loaded. Its [INCOMPLETE receipt](proof-v2/proof-pair-one-shot.json) remains unchanged. Fresh proof-v3 runs the same source with the headless browser authorized outside that sandbox. There is exactly one timing pair and one separate heap pair, both on v3.

[Build proof-v3](proof-v3/build-proof.json) passes all ten assertions, binding 26 source rows, five tarballs, 3163 selected installed files, 1271 staged source/context files, package report, actual compiler, transformations and per-arm assets. The selected installed graph is not an exhaustive transitive-package archive. Actual Native registration/hook lowering is present. ReactRow has a real CompileSuccess and `_c(13)` from react/compiler-runtime; its transform imports react/jsx-runtime. The installed release compiler is `458498f59bca4904718114168142a187ca2e48f85e4124bb63e08aa4e498933c`, Darwin ARM64 / aarch64-apple-darwin. The untimed build-process durations are descriptive setup records, not an additional matched build benchmark.

The [untimed proof](proof-v3/proof-pair-one-shot.json), [timing pair](proof-v3/timing-pair-one-shot.json) and [heap pair](proof-v3/heap-pair-one-shot.json) each complete 67 stages per arm and 9006 matching hash checks before and after. They check all rows at every update, row 0 local state/retained host through reorder, independent reveals, 257/257 row setup/cleanup and both fallback 1/1 lifetimes. Disposal leaves empty hosts, no application Store listeners and no Native readers/owners/pending changes. Wrong-arm mounting is rejected before DOM changes in the untimed proof. All three runs close both contexts and Chromium 153.0.8010.12, with no blocked/failed requests, page/console errors or cleanup errors. Offline synthetic HTTPS replays exact assets; no project server runs.

## One descriptive timing pair

| Call / summary | Native ms | React ms |
| --- | ---: | ---: |
| First update | 5.6 | 1.5 |
| Update nearest-rank median | 3.1 | 0.5 |
| Update nearest-rank p95 | 4.6 | 0.7 |
| Sixty-update sum | 194.5 | 29.7 |
| Application mount after modules load | 23.7 | 13.3 |
| Generic array edit | 2.8 | 0.8 |
| Disposal | 1.1 | 0.5 |
| Measured lifecycle subtotal | 222.1 | 44.3 |

Native is slower in this sole Native-first fresh-page observation. Timer quantum is about 0.1 ms for both. Dispatch-through-synchronous-commit intervals exclude DOM checks and RAF waits. The subtotal excludes local click, async waiting/reveal and harness inspection; it is not total episode CPU. Mount after modules load is not browser, OS, filesystem, network or compiler cold setup. Within-page quantiles from one fixed-order pair are not replicated population tails or release-budget qualification. Separate emitted JavaScript is 696195/578824 bytes Native/React; these graphs have different runtime features and do not establish equal-feature footprint efficiency. No favorable timing retry or warmup occurred.

## Separate untimed forced-GC observations

| Phase | Native used-heap delta B | React used-heap delta B |
| --- | ---: | ---: |
| Mounted | 1535140 | 936776 |
| Updated, edited, revealed | 2751976 | 1535420 |
| Disposed, controller retained | 2009152 | 944124 |
| Controller released | 1940900 | 933536 |

Signed deltas use each fresh page's module-loaded baseline. Raw Runtime.getHeapUsage (including total, embedder and backing storage fields) and Memory.getDOMCounters remain in the heap receipt. Released-controller DOM-node deltas are 0/0 and listener deltas 0/+1. Controller retention keeps natural captures: Native retains the disposed root while React releases its React root on disposal. These are whole-page costs including engine, modules and application; they neither attribute allocations or the listener delta nor establish leak absence, equivalent isolated root retention or a memory budget. No heap collection ran in timing pages; heap pages have no timing summaries.

## Provenance and remaining scope

- [build-proof.json](proof-v3/build-proof.json): `03b839f932d4b6c9150c0a90da884259e113273c7252f3af2d9bb4cf9b965b63`.
- [input-lock.json](proof-v3/input-lock.json): `fce6b52d6cd41dc03afd1cf38261175884b6452d9a1152f45a97fea35c8de6a1`.
- [proof-pair-one-shot.json](proof-v3/proof-pair-one-shot.json): `94652d166ff82051de6eb527b1d05bdd840b28d0d36c1118e4a3710f5de1052d`.
- [timing-pair-one-shot.json](proof-v3/timing-pair-one-shot.json): `e40e816c84232431c806ac913cdaf4bada7abad566761c8f36517d9a400fd25b`.
- [heap-pair-one-shot.json](proof-v3/heap-pair-one-shot.json): `f68f3f4f675434b68388940501b83f759b8dbe77127e6140a9bee9bf4b1d1028`.

Raw external invocation logs and numeric-exit supervisor records are preserved in [external-logs](verification/external-logs). Post-run documentation is a later summary, not a pre-execution input. The full-plan first pass remains active. Historic stable-binding wins, qualified dense FAIL, exhausted Recording A and physical HOLD retain their own scope. Current measurements do not establish release latency, cold/memory budgets, physical presentation, broad async UX, independent hardware or current Linux qualification. Human participants remain zero; no maintenance advantage is claimed.

The separate [post-run integrity note](verification/final-integrity-v1.json) records limited checks and explicitly unexecuted duplicate whole-archive checks. It does not replace the three completed browser phases' before/after hash validations or claim an additional complete independent audit. Source/control/document whitespace checks pass; broad raw-evidence whitespace checking reports preserved CRLF/generated/third-party whitespace, which is left byte-identical.

[Apple low-memory readback](verification/r3act-apple-low-memory-readback-2026-10-20.json) confirms one CPU, 256 MiB/container and 512 MiB/build in user and service configuration. Two service paths resolve to the same file. The user-owned service file required temporary owner-write permission; original read-only mode was restored. An initial write failed EACCES and a follow-on loop stopped at its already-updated second alias; independent readback confirms both paths. No service/VM started and no memory limit increased. Effective VM caps and whether 256 MiB suffices for compilation remain unverified; the Depot launchd permission prerequisite remains unresolved. No new administrator prompt or volume permission change occurred.
