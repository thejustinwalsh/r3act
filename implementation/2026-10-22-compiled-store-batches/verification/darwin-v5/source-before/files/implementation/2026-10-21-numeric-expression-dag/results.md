# Shared numeric expression DAG results

The compiler now shares repeated closed numeric arithmetic across sinks within existing source-slot cases. Source review preserves AST grouping, captured numeric provenance, topological order and per-temporary consuming-sink masks. Strings/unknown work stays guarded. No runtime registry, storage layout, accepted-history, source edge, publication or acknowledgement change is introduced. [Design](design.md), [primary review](source-review.md), [protocol](protocol.md).

## Consolidated correctness and preserved failures

- Darwin-v1 exits 1: 64/65 phases pass. Fixture 46 expects data-sign in its reverse-order write log, but its observer excludes that prop. All prior 45 fixtures, 1102 Deno tests, 90 Rust tests and package validation pass; sourceAudit MATCH. Preserve [receipt](verification/darwin-v1/receipt.json) and [failure log](verification/darwin-v1/logs/compiled-46.log).
- The reviewed correction adds sign to the observer; surrounding dense assertion still filters a/b/c. Darwin-v2 exits 0, 65/65 phases, 1102 Deno tests, 90 Rust tests and all 46 compiled fixtures pass. Five fresh packages pass validation and thirteen installed-consumer checks. All 1501 runner input hashes match. [Receipt](verification/darwin-v2/receipt.json), [supervisor](verification/darwin-v2-supervisor.json).
- Actual fixture 46 proves emitted Rust/OXC DAG kernels, masked-input skipping (zero reads of a throwing input proxy when all sinks are seen), sparse/dense/reverse-slot order, signed zero/NaN/infinity, string promotion, opaque fallback and newer reentrant actions. Its resource-containing Three owner is explicitly generic; it proves resource/transform correctness, not compiled DAG execution for that owner.
- Fresh installed proof-canvas-v1 preparation passes, but its sandboxed browser launch aborts before any arm; its INCOMPLETE record remains. A fresh proof-canvas-v2 under the required local process permission passes. No source change follows either preparation, and no timing occurs before the successful untimed proof.

## Installed interaction

The new authored workload has 256 retained Three groups, alternating Position/Rotation components, one local scalar state per owner and three transform props sharing the same polynomial. Native and React author the same local arithmetic; React Compiler succeeds and its normal layout-effect adapter writes the transforms. Native AST proof finds five guarded numeric temporaries in each of two distinct emitted kernels; one temporary reaches all three staged sinks. An imperative floor has fewer framework obligations.

The common independent oracle checks all transform values and object identities before a Canvas2D draw/readback/checksum. This is not a Three WebGL/GPU renderer or R3F comparison. Installed untimed execution proves 72 numeric batches and 18432 rows/cells with no component rerenders; timing disables counters. Both phases match 11449 source/asset hashes before and after and close browser/contexts cleanly. All arm values/checksums match; all scene children are removed, Native setters/owners/pending reach zero and React setters/host children reach zero.

The sole hash-authorized fixed-order comparison uses twelve warmup and sixty measured RAF callbacks per arm. Values below are median / nearest-rank p95 milliseconds, n=60; order is Native, React Compiler, imperative.

| Interval | Native | React Compiler | Imperative floor |
| --- | ---: | ---: | ---: |
| Setter through publication | 1.60 / 3.00 | 0.90 / 1.30 | 0.10 / 0.20 |
| Update through draw | 1.65 / 3.20 | 1.10 / 1.60 | 0.30 / 0.40 |
| State age at draw start | 1.60 / 3.00 | 1.00 / 1.40 | 0.20 / 0.30 |
| Callback including readback/hash | 2.70 / 4.20 | 2.55 / 3.50 | 1.90 / 2.50 |
| RAF interval | 16.70 / 16.70 | 16.70 / 16.70 | 16.70 / 16.80 |

Native is slower. No repeat occurs. Each arm has zero measured 60-Hz-reference deadline flags; Native has one warmup flag. These flags and RAF timestamps do not establish physical presentation or smoothness. Callback excludes later sample bookkeeping/scheduling/teardown. State age starts at the setter batch, not hardware input or presentation.

Setup observations are 46.2 / 4.0 / 1.0 ms and teardown 4.7 / 1.8 / 0.3 ms. Native setup includes host object construction during mount, while React preconstructs objects outside its interval. They do not qualify matched cold mount, startup or lifecycle superiority. This three-prop polynomial workload differs from the previous one-prop workload and supplies no causal old/new Native saving.

## Exact receipts and scope

Darwin-v2 receipt SHA-256: `ddf289bc8b118a3a73f691e36241944ba95990c7136dc929ec014a74a0bed713`; supervisor: `b5542b6e3f378581447bd44a0f7a6d31c7ddecbe6fe08f6c88a39aaadd34e2ab`.

Successful [build proof](proof-canvas-v2/build-proof.json): `37df53a3d1bc84aca3aa4ddae73b953ee87c24a1852941a2c5dead697712b660`; [input lock](proof-canvas-v2/input-lock.json): `5c1d594b9172adf998bc692276b53cbb70d49b48a3e21ffb00aae269753be76c`; [untimed proof](proof-canvas-v2/canvas-proof-one-shot.json): `cd5281b3464685b1442fcbb23a6ebb8ca8b88c54732fe40ccf26c539ebae52fc`; [sole timing](proof-canvas-v2/canvas-timing-one-shot.json): `f624256a79d1f15481513d111420f24b06c5dceebd06c4dbaf1705b2aea63f8b`.

This closes a bounded shared-computation compiler slice, not the full-plan goal. Broader main-thread batching/fusion, realtime performance, HMR delivery, matched cold/memory and independent-device requirements remain open. No R3F, GPU, CPU, presentation, population-tail, universal React superiority or maintenance advantage is claimed. Historic narrow wins, qualified dense losses, exhausted Recording A and physical HOLD remain unchanged. Later report edits are outside the completed gate source lock; maintained compiler/runtime/consumer source stays frozen.

Final evidence audit: [receipt](evidence/final-evidence-check.json) SHA-256 `6d7319dd0b1602a281ca5a8f9741000ac04157d6af3e28bcdad766223c273354`; [timing summary](proof-canvas-v2/timing-summary.json) SHA-256 `cd445eaf773b745b58349c7792535d672fe2cc8af01d82f0704b09d9ddfcfe28`. All 52 packaged source hashes match the timing lock and Darwin-v2 archive; the new Rust module and fixture separately match the gate archive. The filtered post-run process snapshot finds no owned browser, project server or VM; shared MCP workers are excluded.
