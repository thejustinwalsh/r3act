# Workbench watcher configuration results

The opt-in development watcher correction is implemented and its consolidated gate passes. Actual workbench HMR delivery remains unverified: the single proof fails before browser launch because the live TSX source is absent from the ready watcher's membership. No speculative additional root or diagnostic repeat follows.

## Source and contract

Two independent Sol source reviews found the same ordering defect in installed Vite 8.3.1 / bundled Chokidar 3.6.0: constructor useFsEvents is derived before CHOKIDAR_USEPOLLING is read, and backend selection later prefers useFsEvents. An environment-only polling request can therefore retain FSEvents on macOS. Optional fsevents is installed, but the earlier process did not record its loaded backend. The earlier six failures and their unexplained missing event remain unchanged.

The root Vite config now passes usePolling=true/useFsEvents=false during configuration construction only for an explicit nonempty CHOKIDAR_USEPOLLING value other than case-insensitive false or 0. Other/default behavior is unchanged. CHOKIDAR_INTERVAL remains Chokidar-owned. Absolute ignored globs exclude implementation, results, .cache, .pnpm-store and compiler/oxc-spike/target in that polling mode, alongside Vite's built-in ignores. No live browser source imports those roots, and no evidence file is deleted. Read-only sizes were 11 GiB of implementation archives and 2.8 GiB of Rust target data, with smaller additional caches.

No runtime, compiler, accepted-history, dependency, publication, acknowledgement, host or package surface changes. This is not a general public Vite watcher adapter or proof of a runtime performance gain. [Design](design.md), [primary review](source-review.md), [protocol](protocol.md).

## Consolidated gate

Darwin-v1 exits 0, PASS 66/66 phases: 1102 Deno tests, 90 Rust tests, all 46 actual compiled fixtures and thirteen package-consumer checks across five fresh tarballs. The new workbench-watch-config step resolves actual root Vite configuration for seven environment cases without starting a server. All 1507 runner input hashes match, plus ten archived context inputs.

[Gate receipt](verification/darwin-v1/receipt.json) SHA-256 `cb68ba2b7d7a7b633c2b8134ba96b64a9c731b8c95059a529d3f4cec32ff8c44`; [supervisor](verification/darwin-v1-supervisor.json) `a35d8bbef5a2ee6fc574d0bc73f65d064e8ad80c105e2a53039077c7f798dd8b`.

## Preserved actual watcher failure

Luna starts a task-local Portless 0.15.8 HTTPS proxy on loopback 19575 with isolated state and temporary certificate/key, registers unique static alias r3act-workbench-hmr-v1, and starts the reviewed root-config launcher on 19576. No host/trust/service/global proxy change occurs. The launcher has no inline watch override, and uses the gate-verified root config.

[Server evidence](evidence/browser-v1/server-evidence.json) reports FAILED and the launcher exits 1: usePolling=true, useFsEvents=false, interval=100, ready=true, all five ignored-root counts zero, watchedDirectoryCount=3, targetListed=false. The guard stops before any browser, source edit or HMR observation. Its exact watched directory names and resolved bundledDev/depth were not captured. Installed Vite normally watches root unless bundledDev is enabled (default false); current source review identifies no override, but the receipt does not establish the missing membership's cause. Do not loosen the guard or infer event delivery from backend selection.

Server evidence SHA-256 `dafc6b531c752151a953e029934beb924d00860a60704925e2a4f1216cddf25d`; tested launcher SHA-256 `ac236963e43e2fae0956f48ea319970dc27604df996faa142516f4d7e7509d55`.

The source stays at original gate SHA-256 `2dda7f5aa74d326901b94039f63a962e900ebc635ddf0791b0fc83183526050a`; it was never edited. Luna removes the owned alias, confirms empty routes, stops the owned foreground proxy (exit 0), verifies both ports free and no owned browser/server/proxy/VM process, then removes task-local state and TLS material. No shared service is stopped. This failed readiness proof supplies neither a green HMR result nor browser lifecycle conformance. Earlier WebGL conformance retains its old scope.

## Documentation and remaining work

The authoring reference corrects its stale component-output identity limitation to the already verified World-owner contract and describes the already verified numeric expression sharing. Its polling entry distinguishes checkout configuration from @r3act/vite package options, and explicitly records unresolved delivery. Later report/reference edits are outside the completed gate's full input lock; maintained tested config, scripts and launcher remain frozen.

No new application timing, build comparison, profiler or VM run occurs for this development-only change. Runtime/compiler are unchanged from the latest three-prop comparison: Native publication median/p95 1.60/3.00 ms, React Compiler 0.90/1.30 ms, imperative floor 0.10/0.20 ms. That loss is preserved, not repaired or generalized by a watcher correction. Full-plan realtime performance, broader main-thread batching/fusion, HMR delivery, matched cold/memory and independent-device requirements remain open. No universal speed, cross-host visual atomicity, R3F, GPU/presentation or maintenance advantage is claimed.

[attempt-receipt.json](evidence/browser-v1/attempt-receipt.json) SHA-256 `7e3f533f5b072c2f5ff9016377404d84863cb8011978817f2e06800d804ef11f`.

[final-source-check.json](evidence/browser-v1/final-source-check.json) SHA-256 `fc2104ebc59018910903bf0d8f968f8309e75e10c00b89b47e1cdcaa192f31d3`.

The attempt receipt preserves the actual combined exec-tool error output and numeric exits; separate stdout/stderr and browser supervisor logs do not exist because no browser was started. No raw logs are reconstructed or replayed. The final audit matches all five maintained config/script/app inputs to this gate, all 534 src/compiler inputs to the numeric-DAG gate, and all 52 package sources to the previous timing lock and gate archive. Both ports are free and the owned-process snapshot is empty.
