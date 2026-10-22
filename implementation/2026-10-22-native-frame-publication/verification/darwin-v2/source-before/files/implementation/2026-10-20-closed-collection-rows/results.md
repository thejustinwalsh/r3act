# Closed collection rows: source and results

Basis: local main `89c845ddbb7432e2ea7f07d09f736db144b49933`, MIT, origin https://github.com/thejustinwalsh/r3act.git. Remote main still points to the initial published `a694d72959970eca750d2fa09c91d0b64ae5494a`; no push or PR occurs. Immutable gate archives identify the tested dirty source. See [design](design.md), [primary review](source-review.md), [protocol](protocol.md) and [finite evidence summary](verification/final-summary.json).

## Implemented boundary

Explicit collection transactions can now insert and replace compiler-proven rows while unrelated resources remain pending. Rust emits a finite template from a preceding stable Row declaration and direct `rows.map(row => <Row row={row}/>)`. The Row returns one unkeyed intrinsic leaf using numeric paths or primitive literals. Runtime materializes that output without replaying mapper or Row bodies. It reuses existing owner preparation, keyed VDOM delta, current-cache patching, collection reader acknowledgement and group admission.

The initial arbitrary-descriptor/Reflect.get capture proposal failed primary source review: a Proxy can return equal values while hiding read effects. Integrated source uses the existing `storeRecord` ownership set and numeric projection capture. Ordinary/frozen objects, wrapped records, accessors and opaque bodies remain generic. Row metadata does not give arbitrary extension functions purity. No identity/version registry, eager whole-tree copying or physical traversal redesign is added. Canonical lineage/cell acknowledgement and omission of an empty World acknowledgement keep overridable methods out of the new scoped acceptance path.

Same-key replacement retains owner and host identity; remove/reinsert creates a new lifetime. Exact captured acknowledgement, newer actions, fork histories, live code/owner/writer checks and partial-failure quarantine remain. Whole-tree and compiled-graph guards remain. Entry points are `prepareCollections`, `prepareTransaction`, resource preparation with selected collections, and corresponding queues. **Ordinary `flush()` and `preparePending()` still use generic insert/replace rendering.** No rollback or cross-renderer visual atomicity is promised.

## Preserved verification failures

| Consolidated gate | Result | Finding |
| --- | --- | --- |
| [Darwin-v1](verification/darwin-v1/receipt.json) |61/63 phases | Three runtime cases expose an old guard rejecting every staged Row owner. Compiled fixture assumes an unaliased helper name. |
| [Darwin-v2](verification/darwin-v2/receipt.json) |62/63 phases | Runtime passes 1092 cases; fixture incorrectly interprets local-cell dirty count as pending collection history. |
| [Darwin-v3](verification/darwin-v3/receipt.json) |62/63 phases | Runtime passes 1093 cases; fixture inserts omit required `beforeKey`. |
| [Darwin-v4](verification/darwin-v4/receipt.json) |63/63 phases | Corrected final source and fixture pass. |

Numeric supervisors exit 1/1/1/0 in 85.738/51.056/51.096/50.057 seconds, with no deadline stops. V2's separate `env -u` invocation typo exits 127 before the runner and is recorded in the summary. No evidence is inferred from that command. One corrected focused compiled fixture exits 0 in 0.554 seconds before the final consolidated run. Original semantic output, identity, stale-work and failure assertions remain; invalid diagnostic/API assumptions are corrected explicitly.

Final source passes **1093 Deno tests, 84 Rust tests, 44 actual compiled fixtures, twenty Three cases and three bounded retention checks**, plus package validation and installed consumer. Every gate matches all 1413 selected runner inputs, with 1423 source/context rows archived and no missing context. V4 archives 241 fixture files. The new compiled fixture covers DOM/Three grouping beside pending Suspense, intervening auxiliary acceptance, exact fork catch-up, owner/host replacement and reincarnation, newer actions, unowned/opaque fallback, and failed-group old snapshots/quarantine.

## Fresh installed proof

Five fresh tarballs install in an isolated consumer. Build proof passes 20 assertions and four admission, four publication-domain and six resource-lifetime controls. It binds 36 authored/external rows, four frozen sources, 3173 installed files, 1413 selected source files and 1423 staged source/context rows. The actual packaged Darwin ARM64 compiler SHA-256 is `6370807ec45ce8525430e8cf485c40e33fd584bd3bdcfcc488b462e96a03ddcd`; core tarball is `0922a4de7241706d715bc947692b9b19dba5a85478a2e02c5595d2c5ca72abde`.

The unchanged async application passes its complete main/cancellation/immediate-disposal episodes in both arms, with 9370 matching before/after hash checks. The new row episode passes 25 checkpoints per arm: 64 starting rows and 24 replace/insert/remove operations beside a waiting resource, matching all text/attributes/Three positions and retained first-row identity. Native versions advance together; teardown empties both hosts, native owners/pending state and React listeners. It matches 9382 hashes before and after. All contexts/browser close, with zero request, blocked-network, page, console, proof or cleanup errors. Prepare/async/row supervisors exit 0 in 5.409/7.225/5.923 seconds.

Native row revision `native-v1-fe99c8feb0287179` matches emitted row program revisions. Actual React Row/Waiting/App memo output uses 2/2/14 slots. The Native row roots have no repeatable declaration; `enqueueCollections` throws if a scoped delta is unavailable, rather than falling back to generic rendering. Metadata-only assertions therefore do not stand alone as path proof.

## Sole bounded comparison

The exclusive primary authorization binds build, input lock and both untimed proofs. The one fixed Native-first fresh-browser pair exits 0 in 8.265 seconds, with no retry or later executable correction. It repeats the same 24 mixed operations and passes the same 9382 before/after hash checks and cleanup controls.

| Synchronous action-through-publication interval | Native ms | React Compiler ms |
| --- | ---: | ---: |
| First |6.00|1.50|
| Within-page median |1.45|0.70|
| Nearest-rank p95 |1.80|1.20|
| Sum of 24 intervals |37.20|17.20|

Native is slower in this observation. The roughly 0.1 ms clock quantum, dependent within-page samples, fixed order and differing runtime graphs prevent population-tail or general speed claims. Native includes `storeRecord` construction and explicit grouped collection publication; React uses array replacement, Compiler output and explicit Three layout effects. Inspection/frame waits occur outside the synchronous intervals; this is not CPU or paint timing. JavaScript graphs are 2734978/874035 bytes. They are useful application costs, not equivalent-feature bundle qualification or attribution of any individual helper's cost.

Key receipts:

- [Build](proof-v1/build-proof.json): `9afcf1d56645643505ab4c87fb401c504a8ff16fe9035df78cb9027e79ea0064`.
- [Input lock](proof-v1/input-lock.json): `621c1bc406ebfba7c0678e8995cbee8d0a016ab8ad0a44383b6879d669556bce`.
- [Async proof](proof-v1/proof-pair-one-shot.json): `51da296f775aadd070b2ecfccdd74871d01915a418351ba5f0fd85a24f6a4209`.
- [Row proof](proof-v1/rows-proof-pair-one-shot.json): `07f0e151ab136d69cacb35f0612d193ca657712526774178376a928fc35aee0e`.
- [Timing](proof-v1/rows-timing-pair-one-shot.json): `1bfff87d889fdcd1c48edcf7b5dfbcfb45abeeda5b4ce1e45934e1bac51c6c92`.

Reports, guide/checkpoint and notebook updates are post-run documentation. Test/compiler/application/collector bytes retain their final verified identities. Historical manifests and old timings remain unchanged. Fixed tracked generated cache outputs are restored only after their fresh outputs are archived; all 971 fresh evidence entries remain tracked (963 match gate artifact hashes, four belong to the focused compiled fixture, and four are verified negative-fixture symlinks). A post-report audit matches all 1262 selected executable inputs to the passing v4 source archive. The notebook appends one cell from 228 to 229 while retaining all prior cell objects and raw prefix/metadata bytes.

## Remaining product requirements

The full-plan first pass stays active. Automatic/general structural and resource authoring beyond the documented subset retain generic fallback. Release performance, cold/memory, current other-platform and independent-device gates remain open. Historic stable-binding wins, qualified dense FAIL, exhausted Recording A and physical HOLD keep their original source scopes. Human participants remain zero; no maintenance advantage, universal React superiority, full compatibility, smoother presentation or leak absence is established.

Apple tooling/data/logs stay on Depot with saved one CPU, 256 MiB/container and 512 MiB/build defaults. Effective limits and startup remain unverified. No VM/server, administrator prompt or memory increase occurs in this slice.
