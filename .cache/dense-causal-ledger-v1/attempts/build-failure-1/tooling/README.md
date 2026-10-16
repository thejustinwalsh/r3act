# Recording A: dense causal ledger tooling

Status: **prepared for primary review; no build, test, server or browser collection has been run by the implementation agent.** The source snapshot was prepared under Node v24.18.0. All writes from this toolchain stay below `.cache/dense-causal-ledger-v1/`. The qualified build04, its 30 historical page records, and live postbaseline VDOM source remain untouched.

## Source basis

`prepare.mjs` verifies the immutable `source-and-verification.tar.gz` against `results/current-owner-kernel-headless-v1/frozen-config.json`, extracts only archived `src/`, `compiler/` and package lock inputs into `snapshot/`, and copies the frozen staged high frequency harness. It rejects absolute/traversal archive names and link/special members, and refuses an existing snapshot or manifest. It verifies 271 extracted source/harness files against the frozen 397-entry source/build inventory before applying the six reviewed patch files. `../source-manifest.json` has the before/after SHA-256 for each of those 271 inputs, patch hashes and the archive/lock identity. The archived `src/vdom_snapshot_runtime.ts` SHA is `00d8516d2164d1f212e804dd3a579bc13588158eb361e756e2ebd25753b73aab`; the live adjacent-token source is a distinct, unqualified source and is never copied into this snapshot. The earlier prepared snapshot and its manifest were retained at `../attempts/pre-review-1/` when the review annotations changed; do not confuse that attempt with the current manifest. Future failed attempts should likewise be kept in a labeled attempts directory.

The original reference mode replays existing locked build04 production assets **fresh** in a browser. It does not treat the historical 30-page timing as a matched overhead control. Diagnostic `off`, `on`, `count` and `allocation` modes share one separate production build from the archived source snapshot. All four modes have the same compiled bytes, differing only by a query parameter. `off` retains no-op probe calls; `on` records batch boundary timestamps; `count` records operations without timestamps; `allocation` uses a separate untimed update window. This separates original-build versus diagnostic-build shape drift from timestamp overhead. The original historical record remains the product qualification, not a causal phase denominator.

## Source marks and phase rules

| Exclusive interval | Anchored source | Scope and limit |
| --- | --- | --- |
| Native dispatch | `native_high_frequency_arm.tsx` | Per-row setter calls and World dispatch, after harness starts commit. |
| Native capture | `component_state_runtime.ts` `#tryFlushNativeCellCut` | Pending native cut capture only. |
| Native resolution | `component_state_runtime.ts` `#tryCommitNativeRows` | World row lookup, prepared token reuse/build and gather. |
| Native validation and dependency gather | `vdom_snapshot_runtime.ts` `#executePreparedNumericRows` | Packed cut validation plus reached dependency gathering and checks together. This combined interval is not pure validation cost. |
| Native stage setup/mirror | Same VDOM executor | Scratch preparation and source mirror loops as separate consecutive spans. |
| Native kernel/postkernel stage | Same VDOM executor and Rust emitted `executeCut` | Compiler generated projection call versus validation/staging of returned sinks. |
| Native host/equality | Same VDOM executor through `#writeBoundGroup` | Output selection, equality, writer wrapper and actual DOM style application remain grouped. This is **not** a measured host floor or removable fraction. |
| Native cleanup/ack | VDOM executor finally block; Root `#acknowledgeNativeCellCut` | Scratch cleanup; source history and exact captured action acknowledgement. |
| React dispatch | `react_high_frequency_arm.tsx` inside `flushSync` callback | Setter calls in the actual React Compiler production arm. |
| React internal unresolved | End of setter callback to return from `flushSync` | React render, commit, style application and scheduler internals cannot be split by these safe boundaries. |

The analyzer accepts only marks within the timed commit and checks disjoint order. It sums **exclusive** intervals and defines `q = on.commitMs - sum(exclusive intervals)` per frame; q retains all unassigned work, mark overhead and rounding, including sign. The `on-off` per-frame signed distribution is `epsilon`; `off-original` is build-shape/drift. Because each mode is a separate page, matching by frame position also contains run drift. No phase time is automatically called semantically removable. Counters run separately and never become wall time. React internals, native host wrapper versus DOM floor, GC pauses and cold plan preparation remain unresolved until targeted evidence supports them.

`lock-build.mjs` checks that the actual native transformed modules retain compiler owner-row programs and the actual React transformed modules retain React Compiler memo caches. The diagnostic Vite config uses the archived, hash-locked Rust/OXC executable through `compilerBinary`; it does not run Cargo or import the live source tree. It requires source maps for Root, VDOM, DOM writer and React arm, then writes `../build-lock.json` with hashes of build proof, compiler events and every production asset/map. The one-arm collectors recheck local snapshot/build hashes and served response hashes. If source maps or transform proof fail, no collection should proceed.

## Commands for Luna after primary review

Use the pinned Node runtime for every command. This build is a one-shot process with no listening socket. Run each command from the project root. `build/` and `build-lock.json` must be absent before the first build; preserve a failed attempt for review instead of overwriting it.

```sh
export PATH=/Users/tjw/.nvm/versions/node/v24.18.0/bin:$PATH
node .cache/dense-causal-ledger-v1/tooling/synthetic-protocol.mjs
HIGH_FREQUENCY_PROOF_DIR="$PWD/.cache/dense-causal-ledger-v1/build" ./node_modules/.bin/vite build --config .cache/dense-causal-ledger-v1/snapshot/.cache/high-frequency-harness-stage/vite.config.ts
node .cache/dense-causal-ledger-v1/tooling/lock-build.mjs
```

Before either preview, load `$portless-dev-servers`. Reuse an existing owned original route only when its served files match the frozen config. Start each missing preview with Portless; do not set an app port. Keep process sessions controllable and stop only processes created for this recording. The original collector requires the exact frozen origin `https://react-runtime-headless.localhost:1355`; if Portless prints a different URL, stop and review the route rather than bypassing the frozen identity.

```sh
portless run --name react-runtime-headless ./node_modules/.bin/vite preview --config .cache/current-owner-kernel-headless-20261013-v1/preview.config.ts
portless run --name dense-ledger ./node_modules/.bin/vite preview --config .cache/dense-causal-ledger-v1/tooling/preview.config.ts
```

Use the actual HTTPS diagnostic origin reported by Portless below. Each invocation collects exactly one arm, one size, one mode, and stops within 90 seconds or on SIGINT/SIGTERM. The output is a unique immutable run directory. Run the same four modes for `native` and `react` at each of 128, 1024 and 10000; this is a finite 24-page aggregate recording, without an automatic matrix loop. Start with a **128-row pilot** and review correctness, source/asset hashes, timer floor and mark order before wider collection. One pilot is never a speed or optimization decision.

```sh
node .cache/dense-causal-ledger-v1/tooling/collect-one.mjs --mode original --arm native --rows 128
node .cache/dense-causal-ledger-v1/tooling/collect-one.mjs --mode off --arm native --rows 128 --origin https://dense-ledger.localhost:1355
node .cache/dense-causal-ledger-v1/tooling/collect-one.mjs --mode on --arm native --rows 128 --origin https://dense-ledger.localhost:1355
node .cache/dense-causal-ledger-v1/tooling/collect-one.mjs --mode count --arm native --rows 128 --origin https://dense-ledger.localhost:1355
node .cache/dense-causal-ledger-v1/tooling/analyze.mjs --original ORIGINAL_RECORD --off OFF_RECORD --on ON_RECORD --count COUNT_RECORD --out NEW_ANALYSIS_JSON
```

The separate allocation diagnostic samples only 240 immediate, all-dirty synchronous updates after the same 60 warmup frames. The harness pauses at two CDP gates, so `HeapProfiler` begins after warmup and stops before final DOM inspection and teardown. Dirty IDs are preexisting `ids`; measured allocation contains update loop control and commit code, with no RAF or DOM inspection. It uses a different cadence from the latency workload and a 32 KiB sampling interval, including collected objects. The raw profile is **an estimate**, not exact bytes per update or a GC pause measurement. Run one explicit arm/size invocation at a time after the phase pilot; six invocations cover the matrix.

For cold setup, use a separate fresh `off` page per arm/size and retain its `mountAndFrameZeroInitializationMs` plus the same field from the aggregate modes. This interval includes controller creation, root/plan preparation, mount and frame-zero commit; it cannot isolate compiler or plan preparation from those obligations. Report that subphase unresolved. No cold measurement is amortized into the 240-update latency ledger.

```sh
node .cache/dense-causal-ledger-v1/tooling/collect-allocation-one.mjs --arm native --rows 128 --origin https://dense-ledger.localhost:1355
```

## Review criteria and stop

The analyzer outputs raw mode totals, timer quantum/floor, signed `epsilon`, build-shape delta, signed q, per-phase distributions, separate counts and invalid boundary records. Counts cover **only measured frames 61–300**; setup, frame zero and 60 warmup frames are excluded. A negative q beyond measured clock quantum marks the ledger unresolved. A failed/partial browser record, cleanup failure, mismatched build/source/served asset, wrong frame sequence, missing mark, overlapping interval or count/timestamp mode contamination must remain a failed or unresolved recording. Both collectors retain cleanup errors and give all cleanup work the remainder of the 90-second deadline; timeout makes the receipt incomplete or failed. `synthetic-protocol.mjs` provides deterministic native and React checks for those cases; Luna runs it, not this implementation agent.

This first aggregate is diagnostic. A decision-grade removable-share bound needs controlled repetition or one targeted rerun where clock/build drift matters, proof of required versus removable semantics, new overhead estimate, and an identical-output host floor where relevant. Do not derive a threshold verdict from one noisy 128-row page or from whole-page CPU samples. After the one aggregate and at most one targeted rerun per hotspot, classify each hypothesis supported, falsified or unresolved and stop. Preserve all failures and partial records.
