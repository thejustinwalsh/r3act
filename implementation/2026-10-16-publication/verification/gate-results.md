# Consolidated verification receipts — 16 October 2026

All test/build commands were run once per released source lock. Failures remain preserved and were not retried for favorable outcomes.

## First gate, source-lock-v1

- `deno test --config deno.browser.json --frozen src`: **blocked before tests**, exit 1 because root `deno.lock` is stale against current package metadata. See `deno-browser-gate.log`.
- Separate `deno test --config deno.browser.json --frozen --no-lock --no-npm src`: **733 passed, 12 failed**. See `deno-browser-no-lock-no-npm.log`.
- Focused semantic set with `--frozen --no-lock --no-npm`: **81 passed, 1 failed**, `publication_lifecycle_contract_test.ts` (candidate stale after host commit). See `deno-focused-no-lock-no-npm.log`.
- `cargo test --locked --manifest-path compiler/oxc-spike/Cargo.toml`: **38 passed, 2 failed**, both expected `stateLayout` emitted strings. See `cargo-test.log`.
- `node --experimental-transform-types compiler/native_hmr_revision_test.mjs`: Node 26 rejected the removed option before startup. The supported default `node compiler/native_hmr_revision_test.mjs` then passed, exit 0; see `native-hmr-revision-test.log` and `native-hmr-revision-test-node26.log`.
- `pnpm check:native-tooling`: **passed**, exit 0; see `pnpm-check-native-tooling.log`.

## Repaired gate, source-lock-v2

- Full Deno source gate with the isolated frozen lock: **747 passed, 1 failed**. `native_root_candidate_test.ts` still expected terminal rejection after host-callback state reentry; the new contract instead accepts the captured view and preserves the later action. See `deno-browser-gate-v2.log`.
- `cargo test --locked`: **40 passed, 0 failed**. See `cargo-test-v2.log`.

## Final reviewed gate, source-lock-v3

- `deno test --config deno.browser.json --frozen --lock=implementation/2026-10-16-publication/verification/deno-runtime.lock src`: **749 passed, 0 failed**. See `deno-browser-gate-v3.log`.
- One production build of the reviewed high-frequency fixture was attempted with `HIGH_FREQUENCY_PROOF_DIR` set to `performance-build-v3`. It failed before output generation because `.cache/high-frequency-harness-stage/build_proof_plugin.ts` imports `@babel/parser`, which is not resolvable from the repo root under the current pnpm isolated install (`ERR_MODULE_NOT_FOUND`). See `high-frequency-build-v3.log`; this build was not retried.
- No benchmark server or browser session was started. The Portless skill path is still unavailable, so the matched performance comparison remains unrun.

The root `deno.lock` remains unchanged. The gate-only lock removes only the root `workspace` field; JSR specifiers and integrity values match. The original frozen-workspace failure above remains part of the record.

## Final source/build inventory and bounded integration fixtures

- The primary's reviewed source slice is the current working-tree diff across runtime/compiler sources and the associated tests, including `compiler/oxc-spike/src/main.rs`, `compiler/vite_native_module.ts`, `src/compiled_semantic_plan.ts`, `src/component_state_runtime.ts`, `src/keyed_collection.ts`, `src/native_root_work_queue.ts`, `src/native_runtime_api.ts`, `src/owner_state_world.ts`, and `src/vdom_snapshot_runtime.ts`. New focused test files are listed in `source-lock-v3.json`; the final repaired-slice hash snapshot is `source-lock-v3.json` (captured before the final package/parser and Three-fixture integration checks). The live `package.json` now includes exact `@babel/parser` 7.29.9, and `pnpm-lock.yaml` was regenerated with `pnpm install --lockfile-only` and verified by `pnpm install --frozen-lockfile`; both receipts are retained. Historical evidence/manifests were not rewritten.
- Rust test toolchain: `/Users/mini/.cargo/bin/cargo` 1.97.1 and `/Users/mini/.cargo/bin/rustc` 1.97.1, host `aarch64-apple-darwin`. The passing 40-test run used the `ui_graph_compiler_spike` Rust test target built at `compiler/oxc-spike/target/debug/deps/ui_graph_compiler_spike-45251955a0de11da`; the production compiler executable is `compiler/oxc-spike/target/debug/ui-graph-compiler-spike`. The latter is used by the live native Vite plugin. The Node fixture runtime was provisioned by `pnpm dlx node@24.18.0` (Node v24.18.0), because installed Node v26.9.0 cannot parse the fixture's TS parameter properties in strip-only mode.
- One production build of the current high-frequency fixture passed at `performance-build-v4`. It used Vite 8.3.1 with the Rust/OXC `nativeModulePlugin` and React Compiler. Preserved output includes `build-proof.json`, `react-compiler-events.json`, captured native/React transformed modules, and `dist/high-frequency.html` plus hashed JS/CSS assets. The proof checks emitted native owner layouts and schema-2 six-argument update kernels for both rows and React row-local memo-cache transforms. Build duration/plugin callback timings are diagnostic build data, not a runtime performance comparison.
- The isolated mixed-candidate runtime fixture passed under Node v24.18.0; raw output is `native-mixed-candidate-v5.log`. Its adapted runner is archived as `native_mixed_candidate_execution_test-v4.mjs`, and output was isolated under `.cache/publication-20261016-mixed-proof/`.
- The v5 Three owner-row fixture failure was a stale test regex: the emitter included the layout, but the test expected `slots` immediately after `programId` and did not account for the intervening `moduleRevision`. The maintained DOM and Three test assertions now require the revision and verify it against the registered semantic plan. The repaired DOM fixture passed once under Node v24.18.0 (`compiled-owner-row-v6.log`), and the repaired Three fixture passed once (`compiled-owner-row-three-v6.log`), including 240 batches of five numeric updates, stable Three object/resource identities, no eligible component rerenders, and clean resource disposal. The original v5 log and failure receipt/authored TSX remain preserved; no compiler emitter change was needed.
- v2's single Deno failure was an obsolete test expectation: it required a host callback action to become terminally rejected, although the intended behavior captures that acceptance and leaves the newer action pending for the scheduler. The test was revised to assert captured acceptance, pending newer action, later synchronous-scheduler publication, and root usability; the v3 full gate passed 749/749.
- Independent notebook integrity check against `git HEAD`: the prior 189 cells compare exactly to the current notebook prefix, notebook metadata and nbformat fields compare equal, and exactly one Markdown cell was appended. No notebook cells were executed. `git diff --name-only -- .cache` returned no tracked cache changes; fixture/build proof outputs were written only into new unique cache/evidence directories.
- Browser timing comparison: **NOT RUN**. The required `$portless-dev-servers` skill remains unavailable, and no project server or browser session was started. The production build and runtime fixture results do not establish speed, cold/memory, visual, or maintenance qualification.


### v6 repaired fixture receipts

- Test source hashes after the reviewed regex repair are recorded in `owner-row-test-source-lock-v6.txt`.
- DOM proof outputs are in `.cache/compiled-owner-proof/`; Three proof outputs are in `.cache/compiled-owner-three-proof/`, with unique UUID-suffixed source/module names. Both fixture summaries state correctness-only boundaries; neither includes browser RAF, GPU, visual, or latency measurements.
- Existing v5 failure artifacts were retained alongside v6 successes. No Deno/Cargo/build reruns and no server/browser launch occurred.
