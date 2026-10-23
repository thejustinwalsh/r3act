# Native frame DevTools CPU trace

This is one diagnostic capture for the frozen `proof-canvas-v3` Native public-frame path and compiled declarative React comparator. It does not change either product bundle on disk. The runner reads the exact proof assets, creates two byte-patched copies in its fresh evidence directory, and serves those copies from the same synthetic offline HTTPS routes. The only inserted JavaScript is a `performance.measure()` call immediately after the original `publishEnd = performance.now()` statement. The original update interval remains `updateStart..publishEnd`; no profiler hook or added operation runs inside it. The insertion adds no source line, so generated line numbers remain stable.

The browser order is `native, react, react, native`. Each fresh context runs the same 12 warm-up and 60 measured updates, checks the 256-item state and retained-tree oracles, draws and reads back all 72 frames, and checks exact one-time disposal of 512 resources. All frame counters must stay `null`. The four contexts must match on all per-frame epoch, checksum, item count, retained-identity flag, pixel checksum and lit-pixel count, and on renderer, camera and drawing-buffer settings. This order is a bounded diagnostic control, not a new qualification comparison.

## Trace collection and clock alignment

For each context the runner opens a local headless Chromium page, obtains its CDP session, verifies the required trace categories, and starts one DevTools trace before navigation. It does not start the standalone CDP `Profiler` domain at the same time. The trace requests `devtools.timeline`, `v8.execute`, `blink.user_timing`, `disabled-by-default-v8.cpu_profiler`, and `disabled-by-default-v8.cpu_profiler.hires`; tracing options request `record-as-much-as-possible,sampling-frequency=10000`. The high-resolution category listing is recorded when present, but its absence from `Tracing.getCategories` does not itself prove that tracing does not accept the requested category. The analyzer reports actual V8 `timeDeltas` (minimum, median and maximum) rather than treating the requested 100-microsecond sampling option as a guarantee. The trace is returned as a JSON stream with `Tracing.tracingComplete` and read through `IO.read` / `IO.close`. The untouched JSON stream, including normal trace metadata, is saved per context so Chrome DevTools can load it through **Performance → Load profile**.

The measure name embeds the frame epoch. Its explicit `start` and `end` are the original `performance.now()` values, and its `detail` includes mode and epoch. Chromium emits those endpoints as the User Timing span in the trace clock domain. The offline analyzer requires 72 unique epochs, checks each traced duration against the harness interval within 0.1 ms, and requires the CPU profile head and full profile span to cover all 72 windows. It independently checks sample point timestamps within update windows and requires at least one stack on each context to include the exact authored `update(epoch)` method span, matched by its frozen bundle URL, generated line and column range. The byte-exact method snippet hash and coordinates are recorded from the original served bundle; the zero-newline patch leaves its line location stable. Duration agreement or a stack from another function in the same bundle alone does not qualify the trace clock bridge.

The V8 CPU profile head event's trace `ts` is the start in the same Perfetto trace timestamp domain as User Timing. The analyzer intentionally ignores `args.data.startTime`: Chromium DevTools documents that it is CLOCK_MONOTONIC and does not match the trace timestamp domain. Each `ProfileChunk` contributes its CPU-profile nodes, sample node IDs and `timeDeltas`; those chunks are joined to the head by process and profile ID. The sample point is reconstructed from the head event's `ts` plus cumulative `timeDeltas` in microseconds. This follows DevTools' `SamplesHandler` reconstruction.

For a measured window, the analyzer reports raw point-sample counts and separate time-delta weights. It attributes a weighted sample only when its whole preceding-to-current sample interval fits inside that window. Any interval crossing a boundary is listed as boundary-unattributed, including the overlap with the window. Unsampled coverage, profiler gaps, unclassified stacks and trace GC events are separate outputs. The time-delta values are sampling weights and do not become exact CPU milliseconds or exact DevTools self time. Native source-stage tables use the frozen generated-bundle line map; the narrowest matching span classifies a leaf, while ancestor-inclusive values remain separate and must not be summed as phase costs. React stacks retain their complete function, URL and generated location.

This is a diagnostic CPU trace. Tracing and the requested sampling frequency add observer overhead, so these records do not replace the untimed parity gate or the earlier untraced timing episode. A CPU trace is not an allocation profile; no allocated-byte, retained-heap or allocation-rate claim is made. Preserve an incomplete trace and its failure receipt as-is; do not rerun this episode to seek a better profile.

## Frozen inputs and outputs

The runner binds `reviewed-source-v7.json` product rows under `src/`, `compiler/` and `packages/` (585 files), plus the proof's build/input lock, archived inputs, package/renderer source basis, installed packages, transform captures and Native/React assets. It hashes those rows before and after capture. It also hashes the resolved Vitexec entry and package, the underlying Playwright entry and package, and the actual Chromium executable before and after. The instrumented Native and React asset byte lengths, insertion offsets, inserted snippets and SHA-256 values are stored alongside exact copied files. The Native location map and cost map are separately source-bound.

Expected fresh paths:

- Evidence directory: `implementation/2026-10-22-native-devtools-profile/evidence/devtools-profile-v3/`
- Supervisor receipt: `implementation/2026-10-22-native-devtools-profile/verification/devtools-profile-v3-supervisor.json`
- Each trace: `evidence/devtools-profile-v3/traces/NN-{native|react}.trace.json`
- Offline analysis: `evidence/devtools-profile-v3/analysis.json`

The four trace files are importable DevTools Performance captures. The analysis contains one per-frame call tree and bottom-up self table, ancestor-inclusive table, Native mapped stage counts, bridge/coverage fields, profile chunk/sample counts, point ancestry, and GC events where captured. `weightedSampleUs` is a sampling estimate. Inclusive ancestors and source stages overlap their descendants and are not additive.

## Source references

- [Chrome DevTools Protocol: Tracing](https://chromedevtools.github.io/devtools-protocol/tot/Tracing/) documents trace categories, return-as-stream mode, and trace completion.
- [Chrome DevTools Protocol: IO](https://chromedevtools.github.io/devtools-protocol/tot/IO/) documents reading and closing the returned stream.
- [Chrome DevTools Protocol: Profiler](https://chromedevtools.github.io/devtools-protocol/tot/Profiler/) defines the CPU profile sample and delta representation; this runner consumes the trace-integrated profile events rather than starting the separate profiler domain.
- [DevTools SamplesHandler.ts](https://raw.githubusercontent.com/ChromeDevTools/devtools-frontend/main/front_end/models/trace/handlers/SamplesHandler.ts) joins `Profile` / `ProfileChunk` by process and profile ID, uses the Profile head event's trace timestamp for start, and accumulates chunk `timeDeltas`. Its comment explains why `args.data.startTime` must not be used for this bridge.
- [Blink performance_user_timing.cc](https://chromium.googlesource.com/chromium/src/+/c701061e45c73c8b3669811f8ae8087301ae34a3/third_party/blink/renderer/core/timing/performance_user_timing.cc) shows that explicit User Timing start/end values are carried to trace events as their interval boundaries.
- [Chrome DevTools Performance panel](https://developer.chrome.com/docs/devtools/performance/reference) documents importing and inspecting saved performance traces.

## Invocation

Primary release is required before running. Once released, use the pinned environment and bounded supervisor command from the task handoff:

```sh
env -u CARGO_TARGET_DIR -u CARGO_BUILD_TARGET -u npm_config_store_dir \
  PATH=/private/tmp/r3act-realtime-pnpm-bin:/private/tmp/radix-dialog-darwin-v1-bin:/Users/mini/.local/share/mise/installs/node/24.18.0/bin:/Users/mini/.cargo/bin:/opt/homebrew/bin:/usr/bin:/bin:/usr/sbin:/sbin \
  CI=true CARGO_HOME=/Volumes/Depot/Developer/r3act/.cache/cargo CARGO_BUILD_JOBS=1 \
  python3 implementation/2026-10-20-closed-collection-rows/run-bounded.py \
  /Volumes/Depot/Developer/r3act/implementation/2026-10-22-native-devtools-profile/verification/devtools-profile-v3-supervisor.json \
  180 /Users/mini/.local/share/mise/installs/node/24.18.0/bin/node \
  implementation/2026-10-22-native-devtools-profile/run-profile.mjs \
  --output /Volumes/Depot/Developer/r3act/implementation/2026-10-22-native-devtools-profile/evidence/devtools-profile-v3
```

After that one capture terminates, run the analyzer once against its preserved trace files:

```sh
/Users/mini/.local/share/mise/installs/node/24.18.0/bin/node \
  implementation/2026-10-22-native-devtools-profile/analyze-profile.mjs \
  /Volumes/Depot/Developer/r3act/implementation/2026-10-22-native-devtools-profile/evidence/devtools-profile-v3
```

The preserved v1 supervisor records a module-interop setup failure before Chromium launch. The v2 supervisor records category-list preflight stopping before navigation or any frame workload: the requested high-resolution CPU-profiler category was not listed by `Tracing.getCategories`. V3 treats that listing as descriptive and retains the requested category in the trace configuration. Both prior attempts are preserved and neither produced a frame trace.
