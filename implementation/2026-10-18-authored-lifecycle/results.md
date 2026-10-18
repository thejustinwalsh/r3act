# Authored scene lifecycle — source and results

Basis: local main `b5534eff25ef5f56b15f72badc1c4b187ee8e5f1`. See [contract](design.md), [primary review](source-review.md), [full verification](verification/results.md), [protocol](workload/README.md), [Native application](workload/native_arm.tsx), [React comparator](workload/react_arm.tsx) and [cost reference](../../docs/authored-lifecycle-costs.md).

The repository now includes a shared authored lifecycle application: 256 stateful keyed rows, shared numeric/array Stores, declarative style/text props, local input, generic array edits and two independently settled resources. The same Native application is compiled by Rust/OXC for a complete MemoryVDOMHost fixture and for the browser. Normal runtime scheduling and existing identity/version/publication authority remain; no runtime optimization or new physical layout was introduced.

Consolidated correctness passes **34/34 steps**, including **978 runtime tests**, **63 Rust tests**, **24 artifact checks**, **22 actual compiled fixtures**, **seven Three cases**, two bounded retention checks and fresh five-package consumption. All **828 correctness inputs** match the refreshed pre-execution archive. The full-scene fixture checks every row after 60 updates, generic remove/insert/move, exact local state/host identity, independent detail reveal beside waiting health,257/257 row setups/cleanups, fallback retirement and empty disposal; its callback collector quiesces after 64 schedules.

The sole fixed Native-first browser timing pair passes output/order/state/lifetime checks but is **slower for Native**. Dispatch-through-synchronous-commit median/p95 are **2.6/3.9 ms Native** and **0.5/0.8 ms React** across 60 updates, at about 0.1 ms timer quantum. Mount is 11.3/6.5 ms, array edit 3.4/1.0 ms and disposal 1.5/0.7 ms. The measured mount+updates+edit+disposal subtotal is **183.3/43.3 ms**. That subtotal excludes local click, resource waiting/reveal work, RAF waits and inspection; it is not total episode CPU. Mount occurs after modules load, not cold browser/filesystem setup. Within-page quantiles from one fixed-order pair are not replicated population tails or frozen product-gate qualification.

| Measured call / summary | Native ms | React ms |
| --- | ---: | ---: |
| First update |5.2|1.8|
| Update nearest-rank median |2.6|0.5|
| Update nearest-rank p95 |3.9|0.8|
|60-update sum |167.1|35.1|
| First application mount |11.3|6.5|
| Generic array edit |3.4|1.0|
| Disposal |1.5|0.7|
| Measured subtotal |183.3|43.3|

A separate untimed fresh-page pair preserves five forced-GC heap/DOM observations. After controller release, used heap remains **1,459,444/933,636 bytes Native/React above baseline**; DOM node deltas return to 0/0 and event-listener deltas are 0/+1. These whole-page readings include engine, module and application costs. They neither isolate allocations nor establish leak absence, ownership of the listener delta, a retained-memory budget or independent-device behavior. Both arms report zero application Store listeners; Native also reports zero readers, owners and pending changes.

| Forced-GC phase | Native used-heap delta B | React used-heap delta B |
| --- | ---: | ---: |
|mounted|1,474,176|935,584|
|updatedEditedRevealed|2,289,988|1,534,640|
|disposedControllerRetained|1,526,224|944,220|
|releasedController|1,459,444|933,636|

The disposed-controller phase intentionally retains each controller’s natural captures. Native retains the disposed root object; the React controller releases its React root during disposal. Those are different controller retention costs, not equivalent isolated root-retention tests. Raw used/total/embedder/backing-storage fields and DOM counts are retained in the heap receipt. No GC/CDP heap collection ran in the timing contexts, and heap pages record no timing summaries. Combined JavaScript is 500,092 bytes from a build containing both arms, not an equivalent-feature per-arm size comparison.

The [first gate](verification/darwin-v1/receipt.json) passed 34/34, but primary review rejected its [production proof](workload/proof-v1/primary-rejection.json): the module had React Compiler output while the hot ReactRow itself had no memo cache. Stable per-mount activation callbacks replaced counter writes through props; DOM/Store/state/lifetime semantics stayed the same. The [refreshed gate](verification/darwin-v2/receipt.json) passes 34/34 and the [v2 proof](workload/proof-v2/build-proof.json) passes nine assertions, including an actual ReactRow `_c(13)` call. Primary inspected emitted code and rehashed all 760 source/compiler/transform/asset rows before [timing authorization](workload/proof-v2/timing-authorization.json). No browser ran on the rejected proof; no timing was repeated. The separate [heap authorization](workload/proof-v2/heap-authorization.json) binds the completed timing receipt.

The [timing pair](workload/proof-v2/timing-pair-one-shot.json) and [heap pair](workload/proof-v2/heap-pair-one-shot.json) each preserve 760 before/after matching rows, exact matching actual scene output, row 0 identity/local 1 across reorder, detail reveal while health waits, later health reveal,257/257 row setup/cleanup and fallback1/1. Both end with empty hosts and zero application Store interests. There are no page, console, request, blocked-request or cleanup errors. Both runs were headless/GPU-disabled/offline,90-second bounded and interruptible. No server, network/TLS connection, route or trust change occurred. Synthetic clicks establish local state behavior, not physical input-to-present latency.

The preflight’s first runner launch failed before any steps because its output directory already contained the source archive. That launch error is preserved; preflight archives were moved to their own path before the actual gate ran. Both gate source archives are exact 828-file pre-execution snapshots. Each archives 132 fixture outputs and 488 package files. All 18,983 HEAD-tracked cache entries retain Git blob bytes/modes/symlink targets, with 0 restorations required. No full duplicate cache backup was retained. The original failed/rejected evidence remains immutable.

Current proof SHA-256 `1c0d8a3aa7bfefc452e0c74cf20069ddee2abb46cbebb48af8ffbb61b1cd183b`; timing receipt `5b2e0d0c55e16b74aee7fd13c28c3270974a16a5cd412e6e97064e7cf14d4c8b`; heap receipt `5bfb1989a8fd634a3d86b9a0a2ed99ebccff8ac5534125bd82ebc0dc2b9396ff`. Debug compiler `cee5598eaa612f76fe6b4717d3161333d30c5f4503430c3c448627e27b6d0fb0`; packaged release compiler `a8241eeaadbefa7b2ec7d34a13a74788775d96ee7554e94d403e7b6cff1288e7`, both actual Darwin ARM64 and tied to archived source. Build profiles have distinct identities.

The full-plan first-pass goal remains active. Current evidence does not qualify a general realtime speed advantage, cold/memory budgets, physical input/presentation, broad async UX or independent-device behavior. General structural/resource admission and Linux/other-platform execution remain open. Human participants remain 0 and no maintenance advantage is claimed. Historic stable-binding wins, integrated dense FAIL and exhausted Recording A retain their original source/scope; physical selection stays HOLD. Apple container service startup still awaits the existing native macOS authorization.

The additional final integrity audit remains **INCOMPLETE**. Its original report has 10 passing checks and two failed groups. The receipt group stops on Python opacity text `1.0` versus actual canonical browser CSS `1`; the document group assumes a wide table while the main report uses equivalent measure rows. A supplemental checker then stops before either group because it expects 11 original checks while the preserved report has 12. All failures remain preserved; no product gate, build, timing or heap run was repeated for these checker errors. The uncompleted audit is not relabeled PASS, and remaining assertions in those groups are not claimed as independently executed. The original product checks and source-locked browser assertions retain their stated scope. See the [preserved checker disposition](verification/final-audit-v1/primary-disposition.json).
