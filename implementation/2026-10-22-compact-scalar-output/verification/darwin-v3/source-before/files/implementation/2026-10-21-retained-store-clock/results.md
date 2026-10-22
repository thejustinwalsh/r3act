# Retained-child Store clock results

The shared-clock capability works, but its publication path remains much slower than React Compiler. Store schema 6 adds closed wrapper props around one direct retained child; ordinary closed Store flushes now work without a resource subscription. Existing Store projections, owner identity, VDOM deltas, accepted histories and publication remain authoritative. The Three workbench source uses one frame Store dispatch per RAF instead of per-owner setters. [Design](design.md), [primary review](source-review.md), [protocol](protocol.md).

## Correctness and preserved failures

- The initial environment ordering error exits 127 before Python or a product command starts. [Launch record](verification/darwin-v1-launch-attempt.json).
- [Darwin-v1](verification/darwin-v1/receipt.json) passes 63/68 phases, with four failures and one dependent skip. TS7022 blocks tooling/packages; Deno also reports TS2367 and executes no tests. Fixture 48 observes two owner renders instead of zero. Rust 93 and compiled fixtures 1–47 pass; sourceAudit MATCH.
- [Darwin-v2](verification/darwin-v2/receipt.json) has the same phase result. The test narrowing error is fixed, but annotating the resolved node does not fix its child inference. Distinct component keys alone do not enable the ordinary Store route. Deno still executes no tests; Rust 93 and compiled 1–47 pass; sourceAudit MATCH.
- Primary traces the ordinary route's unnecessary resource-subscription prerequisite and removes it while preserving other guards. The exact child local receives an explicit type. [Darwin-v3](verification/darwin-v3/receipt.json) passes 67/68: 1113 Deno tests pass and one new test has invalid legacy metadata. Rust 93, all 48 compiled fixtures and package checks pass. The test changes unsupported `x` to supported `position-x`; the normalizer stays strict.
- [Darwin-v4](verification/darwin-v4/receipt.json) exits 0 and passes 68/68 phases: **1114 runtime tests, 93 Rust tests, all 48 actual compiled fixtures**, tooling, Three/retention and fresh package consumers. All 1544 runner input hashes match. The 45 archived artifact directories and 48 actual fixture execution steps are different inventories.

Root tests cover ordinary resource-free flush, retained child state/effects, newer host-time Store actions, stale child interleaving and unsafe/nested inputs. VDOM tests cover repeated host keys under distinct owners, retained snapshots, remove/reinsert and second-writer failure. Actual fixture 48 proves emitted schema 6, no owner rerenders, child/event identity, independent child updates, separate opaque fallback, fork history and Three resource identity/teardown. Existing group, revision and quarantine gates remain necessary; no one fixture proves the entire cross-product.

The first fixture reused a component key within one native component owner scope. Distinct component keys now select separate owners while returned host keys remain the same literal. Host parents do not currently create separate component owner scopes; this separate identity/compatibility gap remains open.

## Installed interaction

Preparation v1 fails typecheck before browser launch because numeric component IDs conflict with a string key declaration. Only the Native consumer changes to `String(id)`. The failed preparation survives; product source remains v4-identical. Fresh [proof v2](proof-canvas-v2/canvas-proof-one-shot.json) verifies actual schema 6, projected clock input, React Compiler success and all values/checksums for 256 retained parent/child groups across twelve warmup and sixty measured RAF callbacks. Native requires zero owner renders. This manages Three objects and draws/readbacks Canvas2D; it is not a Three GPU or R3F comparison.

All 12 consumer files match the fresh proof archive and lock. Eleven also match the v4 archive; `native.tsx` differs by the explicit postgate key-type correction. Both browser phases match 11449 hashes before/after, remove scene children, report Native setters/owners/pending and React setters/host children as zero, and close contexts/browser without request, page, console or cleanup errors. Imperative retains its controller's 256 object references; no heap or leak-absence claim follows. The changed WebGL workbench has source/compiled-metadata verification, not a new browser/HMR delivery result.

## Sole comparison

[Primary authorization](proof-canvas-v2/canvas-timing-authorization.json) binds the successful build, lock and untimed proof to one [timing run](proof-canvas-v2/canvas-timing-one-shot.json). Counters are disabled. Fixed order is Native, React Compiler with `useSyncExternalStore` and a synchronous layout adapter, then imperative. Median / nearest-rank p95 milliseconds, n=60:

| Interval | Native | React Compiler | Imperative floor |
| --- | ---: | ---: | ---: |
| Setter through publication | 10.70 / 12.90 | 0.60 / 0.90 | 0.10 / 0.30 |
| Update through draw | 10.75 / 12.90 | 0.80 / 1.20 | 0.20 / 0.50 |
| State age at draw start | 10.70 / 12.90 | 0.70 / 1.00 | 0.10 / 0.40 |
| Callback including readback/hash | 11.10 / 13.30 | 2.00 / 3.00 | 0.95 / 1.90 |
| RAF interval | 16.70 / 16.70 | 16.70 / 16.80 | 16.70 / 16.70 |

Native is much slower. No timing repeat occurs. Each arm has zero measured callback-duration flags against a 60-Hz reference; this does not establish physical presentation or smoothness. Fixed order, dependent samples and timer granularity do not qualify population tails or causal CPU attribution. State age begins at setters, not hardware input. Setup observations are 12.5 / 3.7 / 2.9 ms with unequal construction exclusions, so no matched cold-mount claim follows.

This workload adds a shared Store clock and retained children with three linear props; the preceding local-cell workload uses a polynomial and different graph. It establishes no causal old/new saving. Component render skipping alone does not establish competitive publication cost. Full-plan performance, broader fusion, HMR, component-key scope, cold/memory and independent-device requirements remain open. Historical narrow wins, qualified dense FAIL, exhausted Recording A and physical HOLD retain scope; no maintenance advantage is claimed.

## Final source audit and exact receipts

[Final audit](proof-canvas-v2/final-evidence-audit.json) matches all 537 maintained src/compiler files and all 52 packaged sources to the v4 archive and current bytes. All 12 consumer files match their fresh lock/archive; the single postgate consumer correction remains explicit. No matching owned browser/test process remains. Final report/authoring-reference edits occur after the gate and outside its frozen source identity. Teardown observations are 2.1 / 1.1 / 0.1 ms, without matched lifecycle or heap qualification.

[verification/darwin-v4/receipt.json](verification/darwin-v4/receipt.json): `21972216e9b2d4a004ad98871ed51660acef5d7fca7508ec373351b0e06d1c77`.

[proof-canvas-v2/build-proof.json](proof-canvas-v2/build-proof.json): `77a9b771a927a117c251f1e50ba3609acc80e79b2fc4c6177354d56031f36110`.

[proof-canvas-v2/input-lock.json](proof-canvas-v2/input-lock.json): `fab72da759a25a2d2766e974b48a92aac4f46be4a7803117f73bb7f318cce0be`.

[proof-canvas-v2/canvas-proof-one-shot.json](proof-canvas-v2/canvas-proof-one-shot.json): `afdce751b3f2fcb0c6d9010c8605ae075dd7f61904ac30a64de3875de235e9c3`.

[proof-canvas-v2/canvas-timing-one-shot.json](proof-canvas-v2/canvas-timing-one-shot.json): `8761f7c73f33167d3a1dd774325a6092857e3bc956fcf947d1cf23cc12ee05fb`.

[proof-canvas-v2/final-evidence-audit.json](proof-canvas-v2/final-evidence-audit.json): `2cd62e5cf3112179f8528ae9b27a33a4687bc2a12bd64bd5f4aaf19b8510cedf`.
