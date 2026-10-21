# Ranged owner kernel results

New compiler schemas 4/5 execute heterogeneous owner ranges directly over existing whole-cut staging buffers, retiring per-run arrays, subarray views and output remapping for those programs. Schemas 2/3 retain the legacy adapter. Source order, live validation, exact acknowledgements, accepted histories, generic fallback and resource lifetime remain. [Design](design.md), [primary review](source-review.md), [protocol](protocol.md).

## Consolidated correctness

The first invocation fails before any product command because primary supplied a stray positional dot. Its [supervisor](verification/darwin-v1-supervisor.json) and stderr remain preserved. No v1 gate receipt exists.

The corrected [Darwin-v2 receipt](verification/darwin-v2/receipt.json) passes 67/67 phases with supervisor exit 0: 1108 frozen Deno tests, 90 Rust tests, all 47 actual compiled fixtures, Three/retention checks and fresh package consumers. All 1525 runner input hashes match; 10 context inputs are separately archived. Fixture 47 executes actual emitted ranged functions with typed buffers and nonzero offsets; namespace fixture 45 executes ordinary schema 4 and retained-child schema 5. Existing legacy compatibility and host failure/reentry tests remain in the gate.

## Installed interaction and single comparison

The fresh [build proof](proof-canvas-v1/build-proof.json) finds actual ranged schema 4 kernels for Position/Rotation, default-zero offsets and absolute input writes, preserving the shared numeric DAG. React Compiler succeeds. The nine authoring/HTML/manifest/config files remain byte-identical to the preceding numeric-expression unit. The workload keeps 256 retained Three groups with three polynomial-derived props, alternating owner programs, twelve warmup and sixty measured RAFs. This inspects Three objects then draws/readbacks Canvas2D; it is not a Three GPU or R3F comparison.

The [untimed proof](proof-canvas-v1/canvas-proof-one-shot.json) verifies common values/checksums/identities and 72 Native batches, 18432 rows/cells without owner rerenders. [Primary authorization](proof-canvas-v1/canvas-timing-authorization.json) binds the successful build, input lock and untimed receipt to one [timing run](proof-canvas-v1/canvas-timing-one-shot.json). Timing has no counters. Both phases match 11449 input hashes before/after, remove scene children/setters/owners/pending work as applicable and close contexts/browser with no request, page, console or cleanup errors.

Median / nearest-rank p95 milliseconds, n=60, fixed Native/React Compiler/imperative order:

| Interval | Native | React Compiler | Imperative floor |
| --- | ---: | ---: | ---: |
| Setter through publication | 1.50 / 3.00 | 0.80 / 1.10 | 0.10 / 0.10 |
| Update through draw | 1.60 / 3.10 | 0.85 / 1.30 | 0.20 / 0.40 |
| State age at draw start | 1.55 / 3.00 | 0.80 / 1.20 | 0.10 / 0.20 |
| Callback including readback/hash | 2.50 / 4.50 | 2.00 / 3.10 | 2.10 / 2.30 |
| RAF interval | 16.70 / 16.70 | 16.70 / 16.70 | 16.70 / 16.80 |

Native remains slower. There is no favorable repeat. All arms have zero measured 60-Hz-reference deadline flags; RAF timestamps/flags do not prove physical presentation or smoothness. Timer granularity, dependent observations and fixed order do not qualify population tails or CPU cost. State age begins at setters, not hardware input. Setup observations are 46.0/4.4/1.0 ms and teardown 5.3/1.3/0.2 ms. Setup construction exclusions differ, so these do not qualify matched cold mount or lifecycle superiority. Same authoring across separately run source versions supplies no causal old/new saving.

Broader main-thread fusion, realtime performance, HMR delivery, cold/memory and independent-device requirements remain open under the full-plan goal. No R3F/GPU/CPU/presentation or maintenance advantage is claimed. Historical narrow wins, qualified dense FAIL, exhausted Recording A and physical HOLD retain scope. Later report edits are outside the gate lock; maintained product/consumer source stays frozen.

## Exact receipts

[verification/darwin-v2/receipt.json](verification/darwin-v2/receipt.json): `371bb31308bd300f205082049a4195440bf0f607babc526d79284f9475a8e030`.

[verification/darwin-v2-supervisor.json](verification/darwin-v2-supervisor.json): `fc34f33924bdd89dee88752b7622a62551062aeed57e75a9d81ec44f64ef9324`.

[proof-canvas-v1/build-proof.json](proof-canvas-v1/build-proof.json): `d2e34a4c6462a9977e8779110b49989a6537fa6ed9409c80500c9fb8e413faa4`.

[proof-canvas-v1/input-lock.json](proof-canvas-v1/input-lock.json): `d8ff79ff1ff03294b3bf4c2d9382dc7a4b64ea34883225f6aa02b0bc4df26a1d`.

[proof-canvas-v1/canvas-proof-one-shot.json](proof-canvas-v1/canvas-proof-one-shot.json): `56c88ae3ffd69b9b2b8c3b8afec58eff31b8a89fcead2fcf2dadd62f0cd191b5`.

[proof-canvas-v1/canvas-timing-one-shot.json](proof-canvas-v1/canvas-timing-one-shot.json): `ca179c0cca6583925239fce43b14facb7d36ffd03e4acc01b7a9dc4f7d8a7628`.

Final [source/package/consumer/process audit](proof-canvas-v1/evidence-audit.json): `f5af8e4290d8c4e515408bafc23b89418781dae90bd3db612cad457b8d868b1a`. All 535 maintained src/compiler files and 52 packaged sources match the gate archive, and all 12 consumer files match their lock/archive. Expected postgate documentation edits are separate; no owned browser/test process remains.
