# Compiled numeric Store kernels — completed slice

The compiler/runtime/fixture slice is integrated and verified. It remains slower than React Compiler on the installed shared-clock workload. Existing qualified losses and narrow historical wins retain their original scope; the full-plan goal remains active.

## Preserved first consolidated gate

Darwin-v1 executes all 70 phases and fails 68 PASS / 2 FAIL, supervisor exit 1, stop null, 146.45 seconds. Source audit matches all 1580 before/after input hashes. Rust passes 98 tests; actual compiled fixtures 01–49, package build/consumers, Three and retention phases pass.

Deno executes 1132 passing tests and one failing new mixed-range case: `root.prepareStores([clock])` declines before host writes. Source review identifies a test collision: the legacy interpreted Other host and its parent both use raw key `other`; the unowned schema-1 delta correctly declines ambiguous global lookup. The correction changes only that parent host key, retaining the mixed owner sequence and all component/kernel identities. Compiled fixture 50 completes its direct metadata/offset/oracle checks but fails its first integrated routing assertion: kernel run count is undefined instead of three for authored A,A,B,A owners. The fixture does not complete and supplies no integrated PASS. Its early closed-Store flush can precede counter initialization, so missing counters alone do not establish generic fallback. That lifecycle is under review. No assertion is weakened to accept fallback.

Source review confirms the counter lifecycle cause: the successful early closed-Store attempt can return before the old counter initialization. Counters now initialize at that eligible early attempt and survive into later paths when needed, without allocation when profiling is disabled. Neither the compiler ABI nor runtime range execution changes in this repair. The exact compiled routing assertions remain.

Raw logs and step receipts are under [darwin-v1](verification/darwin-v1/receipt.json), with the terminal [supervisor](verification/darwin-v1-supervisor.json). The failed gate remains immutable. Repaired source is evaluated in the fresh receipt below.

## Consolidated source and installed proof

Darwin-v2 passes 70/70 phases, supervisor exit 0, stop null, 104.26 seconds. Deno executes 1133 passing tests; Rust 98; all 50 actual compiled fixtures, package build/consumers, seven Three phases and retention phases pass. All 1581 before/after input hashes match. [Receipt](verification/darwin-v2/receipt.json), [supervisor](verification/darwin-v2-supervisor.json).

Fresh installed preparation typechecks and builds Native, React Compiler and imperative arms successfully. The 12-file consumer uses the same 256-object shared-clock authoring as the prior slice (Native root label changed); React, imperative and scene authoring are unchanged. Position/Rotation have actual emitted revision-associated numeric kernels, one projected numeric input and three ordered props. React reports CompileSuccess for Position, Rotation, FrameMarker and App. [Build proof](proof-canvas-v1/build-proof.json).

The separate browser proof verifies 256 retained rows and matching output/pixel checksums at each epoch. Native first update reports 256 kernel rows and 256 runs with no component renders. Consecutive same-program owners batch in the compiled fixture; alternating installed programs split into one-row runs. This is a limit of the implemented batching, not evidence of broad cross-owner fusion. All contexts close without errors. [Untimed proof](proof-canvas-v1/canvas-proof-one-shot.json).

## Sole bounded comparison

Headless Chromium 153.0.8010.12, GPU disabled, intercepted synthetic HTTPS without a project server. Fixed Native/React Compiler/imperative order, separate contexts, 12 warmup and 60 measured RAF callbacks per arm, no repeat. Table medians use the conventional average of the two central observations; p95 uses nearest rank. The executor's nearest-rank p50 for React publication is 0.50 ms; the conventional median below is 0.55 ms from the same raw samples.

| Interval, ms median/p95 | Native | React Compiler | Imperative |
| --- | --- | --- | --- |
| State publication | 4.90 / 6.00 | 0.55 / 0.90 | 0.10 / 0.20 |
| Update through draw | 4.95 / 6.00 | 0.70 / 1.10 | 0.30 / 0.50 |
| State age at draw | 4.90 / 6.00 | 0.60 / 1.00 | 0.20 / 0.40 |
| Full callback | 5.40 / 6.60 | 1.80 / 2.40 | 1.65 / 2.40 |
| RAF interval | 16.70 / 16.80 | 16.70 / 16.70 | 16.70 / 16.80 |

Native loses on this workload despite verified compiled execution without component rerenders. The result does not locate a phase bottleneck or establish that raw Store dispatch is slow. Whole-path work includes capture, reader tracking, validation, output staging, cache publication and host writes. The prior 3.10/3.80 versus 0.20/0.20 ms observation is preserved, but separate runs are not a matched causal old/new control. No saving or regression is attributed to one helper, and no favorable repeat follows. [Raw timing](proof-canvas-v1/canvas-timing-one-shot.json), [analysis and exact hashes](summary.json).

Both browser phases match 11460 hashes before and after. Timed counters are null for every measured sample. Outputs, pixel checksums and retained identity match across all arms. Native teardown reports scene/setters/owners/pending zero; React scene/setters/host children zero; imperative scene zero while retaining 256 object references. All contexts and browsers close; request/page/console/cleanup errors are zero. Setup 13.80/4.60/2.30 ms has unequal construction exclusions and is not matched cold mount; teardown is 2.00/0.60/0.10 ms. RAF reference flags are not presentation/smoothness evidence. There is no GPU/WebGL/R3F/direct-frame, CPU/allocation/heap, independent-device or release-performance qualification.

The final audit verifies 830 maintained code paths against current source and frozen copies, all 1591 archived source/context inputs, 12 consumer inputs, 53 package sources, 5668 archived installed files and three tarballs. The browser receipts independently verify current installed inputs before and after execution. Narrative documents were updated after the gate and are not asserted current-identical to all 1581 gate inputs. New raw .cache evidence is intentionally preserved: 547 entries including two symlinks. [Final audit](verification/final-audit.json), [raw evidence inventory](verification/cache-raw-inventory.json).

## Next capability and remaining scope

The Store semantics hold up; the final fast implementation is unproven. Compiler-generated arithmetic alone has not won. Mixed local-state + Store numeric expressions remain generic: the current Store proof excludes state sites, and the local-state proof excludes Store sites. Integrating those inputs is a concrete remaining authored capability, rather than another isolated helper measurement. Existing identity, source versions, accepted history and publication must remain authoritative. Broader heterogeneous computation fusion, realtime speed, workbench HMR delivery and lifecycle/independent-device finish-line requirements stay open. No maintenance advantage is claimed; participants remain zero.

Four tracked fixed-path fixture outputs regenerated during the gates were archived under [owned-generated-fixed-paths](verification/owned-generated-fixed-paths/manifest.json), then restored byte-for-byte from HEAD. Frozen historical evidence is unchanged.
