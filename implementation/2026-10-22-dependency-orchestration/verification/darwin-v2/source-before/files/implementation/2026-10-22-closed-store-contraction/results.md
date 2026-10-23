# Closed Store contraction: consolidated correctness passed

The first consolidated Darwin arm64 gate is preserved as FAIL: 67 phases pass, four fail and package consumer is skipped after package-build failure. Rust passes 99 tests and 51/52 numbered compiled fixtures pass. All 1654 runner input hashes match before/after. The supervisor exits 1 after 102.13 seconds with no stop reason. [Raw receipt](verification/darwin-v1/receipt.json).

Deno, native tooling and package build are blocked by one array-descriptor typing error; two newly authored tests also need explicit tuple/child types. The runtime suite does not execute. Fixture 52 passes its earlier behavior stages but fails a post-disposal mesh/geometry identity assertion: the host restores the mesh's default geometry when releasing its attachment. The corrected fixture retains pre-disposal identity checks and observes exactly-once disposal events on the captured geometry/material, plus balanced host resource counts. The descriptor boundary and test types are corrected without changing runtime logic.

Primary reviewed these corrections before releasing a fresh consolidated gate. No installed build, browser proof or timing exists for the new source. The 12 consumer and 13 renderer-source-basis files remain byte-identical to the preceding unit; prior timings are not inherited. [Astra findings](../2026-10-22-astra-realtime-gap/report.md); [source review](source-review.md); [slice contract](design.md). Full-plan scope and evidence limits remain active.


Darwin-v2 preserves a narrower FAIL: 71/72 phases pass, including all 52 compiled fixtures, 99 Rust tests, native tooling and package build/consumer. Deno executes 1146 passing tests and one failure: the new manual output-shape fixture uses unsupported Three prop `x`, causing program normalization to reject registration before its behavior assertions. The fixture now uses supported `position-x`; registration checks are unchanged. All 1655 runner hashes match. Supervisor exit 1, 119.04 seconds, no stop reason. [V2 receipt](verification/darwin-v2/receipt.json). A fresh consolidated gate is required; no installed/browser/timing stage has run.


Darwin-v3 passes all 72 phases: 1147 runtime tests, 99 Rust tests, all 52 compiled fixtures, native tooling and package build/consumer. All 1655 runner hashes match before/after. The supervisor exits 0 after 112.76 seconds with no stop reason. Both failed gates remain untouched. [V3 receipt](verification/darwin-v3/receipt.json). Source is frozen for fresh installed preparation, untimed proof and the single bounded comparison; no speed result is claimed yet.


## Installed proof and single comparison

Preparation passes in 8.54 seconds, exit 0/no stop: all three installed builds and typecheck succeed. The lock records 12 consumer inputs, 53 package sources, 13 pinned R3F source-basis files, three tarballs and 6092 installed files. Actual Position/Rotation output remains schema 7 with associated two-input kernels (Store projection then local cell), three numeric props, activation effect and retained children. React Compiler reports CompileSuccess for Position, Rotation, FrameMarker and App. [Build proof](proof-canvas-v1/build-proof.json); [input lock](proof-canvas-v1/input-lock.json).

The one-shot untimed proof passes in 10.68 seconds. Native records 256 original-order kernel runs per update and no owner component renders. Across all three arms every measured value/pixel checksum, lit-pixel count, retained identity and 256-object count agrees. Each arm disposes all 512 resources exactly once; Native has zero owners, pending actions, setters and scene children after teardown. All contexts and the headless GPU browser close, with no request/page/console/cleanup errors. Both proof and timing match all 12340 source/asset hashes before and after. [Untimed proof](proof-canvas-v1/canvas-proof-one-shot.json).

Primary reviews the proof and releases one hash-bound timing episode. It completes in 10.29 seconds, no stop/errors/repeat. Fixed Native → declarative React Compiler + R3F 10.0.0-alpha.6 → imperative order, 12 warmup and 60 measured frames each. Timing counters are disabled. Actual WebGL2/ANGLE Metal Apple M4, Chromium 153.0.8010.12, 640×480/DPR1, identical renderer/camera/draw/readback. Median averages the central two sorted samples; p95 is nearest rank ceil(0.95×60).

| Milliseconds, median / p95 | Native | React Compiler + R3F | Imperative |
| --- | ---: | ---: | ---: |
| Publication | 3.90 / 4.70 | 0.90 / 1.00 | 0.00 / 0.10 |
| Update through draw | 6.50 / 7.40 | 3.75 / 4.60 | 3.20 / 4.00 |
| State age | 3.90 / 4.80 | 0.90 / 1.00 | 0.10 / 0.20 |
| Callback | 6.50 / 7.40 | 3.75 / 4.60 | 3.20 / 4.00 |
| RAF interval | 16.70 / 16.80 | 16.70 / 16.70 | 16.70 / 16.70 |

[Raw timing](proof-canvas-v1/canvas-timing-one-shot.json); [authorization](proof-canvas-v1/canvas-timing-authorization.json). **Performance parity FAIL**: Native loses both median and p95 on publication and update-through-draw. The earlier 4.10/5.30 Native observation is a different-source, different-episode result, not a causal before arm. Source work counts do not establish which phase dominates. This comparison establishes no presentation, idiomatic useFrame, cold/memory or independent-device advantage. No second timing or rescue optimization occurs.

## Retention decision and remaining scope

Primary retains these source contractions for the concrete retirements and passing semantic conformance: linear membership audit, privately owned path/output normalization, direct-history representation and duplicate-work retirement use the existing authorities. Optional callback-crossing canonical audit reuse was omitted. Added immutable output receipt fields and transaction-local Maps/Sets have unmeasured retained/cold/allocation costs; no speed or memory budget is accepted. The optimization slice ends here with a negative comparative result. Broader computation fusion needs an execution/effect contract before public kernel callback order or validation may change. It is not implemented by this slice.

The full-plan goal remains active, including realtime speed, HMR, idiomatic useFrame baseline, lifecycle/cold/memory and independent-device evidence. Maintenance participants remain zero. Historical wins and losses, exhausted Recording A and physical HOLD remain intact. Four generated fixed-path cache files are archived at their generated bytes and restored to original HEAD bytes; all new .cache research artifacts are preserved. No VM, server, external publication or push is involved.
