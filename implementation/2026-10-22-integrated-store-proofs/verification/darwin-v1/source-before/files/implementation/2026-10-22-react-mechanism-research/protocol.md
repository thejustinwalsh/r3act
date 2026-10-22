# Bounded React mechanism diagnostic

This is a proposed diagnostic for primary review. It has not been executed. It reuses the exact installed v3 Native and declarative React/R3F bundles and their frozen 256-object scene. It does not edit or rebuild product/runtime sources, start a project server, or alter the prior performance result.

The existing v3 comparison remains a realtime parity failure: Native loses to declarative React/R3F on publish median/p95 and update-through-draw median/p95. Its single fixed-order episode overlapped read-only Git inventory for about 10.2 seconds, with unknown interference. It stays descriptive. This mechanism collection cannot turn it into a qualification or replace it with a more favorable result.

## One finite episode

The proposed run uses eight fresh headless GPU browser contexts, each with one 12-warmup/60-measured Native or React update sequence. The exact counterbalanced order is:

1. Block 1: Native profiling off, React profiling off, React profiling on, Native profiling on.
2. Block 2: Native profiling on, React profiling on, React profiling off, Native profiling off.

Every context runs the existing value, object identity, pixel, renderer, resource disposal and cleanup checks. All 72 frames per context have timing counters disabled. There is no early selection, no repeat if profiling overhead is large, and no second episode. Off/on update medians and p95s are diagnostic overhead controls only; they make no causal savings or qualification claim.

For profiled contexts, the CDP CPU Profiler is configured at 100 microseconds and started before navigation. It stops only after the harness has completed all frames and teardown. The full unmodified profile is preserved per profiled context. The recorded browser scene uses offline intercepted synthetic HTTPS, without a server.

## CPU sample attribution

Do not map profile timestamps to the scene's `performance.now()` intervals. That clock bridge is unproven. Instead, classify a raw CPU sample as an update-ancestry sample only when its sampled call stack contains a frame whose exact generated URL and line/column lies within the source-derived `update(epoch)` span of that arm's hash-verified served bundle. Resolve the span from the unique method text plus an arm-specific source sentinel, and save the exact span hash and coordinates. Function names are descriptive metadata, never the anchor by themselves. If no profile sample matches the frozen span, that context and the study are incomplete.

The harness calls update 72 times (12 warmup and 60 measured). Sampling cannot prove that any individual call was observed. Report matched profile sample counts and fractions, the 72 expected calls separately, and the uncertainty that short invocations can be missed. Do not claim the samples represent only the 60 measured epochs.

Report exclusive sampled leaves inside update ancestry, inclusive sampled ancestors (explicitly non-additive), profile-wide sample counts and categories for GC, idle, other runtime, outside-update JavaScript and missing frames. Preserve unmapped samples. Keep `timeDeltas` only as a profiler-resolution diagnostic; never sum them or convert them to update CPU milliseconds.

## Frozen bindings and limits

Before and after the episode, bind `build-proof.json`, `input-lock.json`, the Native/React consumer source inputs and all loaded assets to their existing v3 hashes. Record the documentation/context delta separately: current documentation has moved since the older input lock, while the product sources and built assets used here must remain exact. Also record hashes for the actual Vitexec/Playwright launcher dependencies and the Chromium executable/version. If any binding changes, preserve an incomplete receipt and stop.

The v3 built React/R3F bundles include React Compiler output, React and Three runtime code, but no emitted `.map` files. Position/Rotation/App have actual compiler-capture success, but that capture is not a map for all React, reconciler or Three internals. Their profile locations may therefore remain minified or generated offsets. Do not turn one anonymous or minified stack into a confident source-level mechanism claim.

This is a one-device sample diagnostic of synchronous sampled execution. It does not establish exact wall-clock phase cost, cause of the Native/React gap, compiler/JIT or GC savings, presentation time, population tails, quiet-machine qualification, or performance parity. No product change, profiler wrapper, or additional workload is allowed by this protocol.

## Proposed commands (not run)

Environment uses the pinned Node 24.18.0 and existing project-gate environment:

```sh
env -u CARGO_TARGET_DIR -u CARGO_BUILD_TARGET -u npm_config_store_dir \
  PATH=/private/tmp/r3act-realtime-pnpm-bin:/private/tmp/radix-dialog-darwin-v1-bin:/Users/mini/.local/share/mise/installs/node/24.18.0/bin:/Users/mini/.cargo/bin:/opt/homebrew/bin:/usr/bin:/bin:/usr/sbin:/sbin \
  CI=true CARGO_HOME=/Volumes/Depot/Developer/r3act/.cache/cargo CARGO_BUILD_JOBS=1 \
  python3 implementation/2026-10-20-closed-collection-rows/run-bounded.py \
  /Volumes/Depot/Developer/r3act/implementation/2026-10-22-react-mechanism-research/verification/diagnostic-v1-supervisor.json \
  180 /Users/mini/.local/share/mise/installs/node/24.18.0/bin/node \
  implementation/2026-10-22-react-mechanism-research/run-diagnostic.mjs \
  --proof-dir /Volumes/Depot/Developer/r3act/implementation/2026-10-22-native-frame-publication/proof-canvas-v3 \
  --output-dir /Volumes/Depot/Developer/r3act/implementation/2026-10-22-react-mechanism-research/runs-diagnostic-v1
```

After the same run reaches terminal, the raw profile analysis can be produced without another workload:

```sh
/Users/mini/.local/share/mise/installs/node/24.18.0/bin/node \
  implementation/2026-10-22-react-mechanism-research/analyze-diagnostic.mjs \
  --receipt /Volumes/Depot/Developer/r3act/implementation/2026-10-22-react-mechanism-research/runs-diagnostic-v1/receipt.json \
  --output /Volumes/Depot/Developer/r3act/implementation/2026-10-22-react-mechanism-research/runs-diagnostic-v1/analysis.json
```
