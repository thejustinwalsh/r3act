# Store-host slice verification plan

Preparation only. This file records the previous slice's working gate commands and identifies the Store-host-specific checks to include after primary release. No commands below were run for this slice. Capture a new source lock only after release; preserve existing receipts under `implementation/2026-10-18-direct-intent/verification/` unchanged.

## Consolidated correctness boundary

Run the full frozen Deno suite once, with the established gate-only lock:

```sh
deno test --config deno.browser.json --frozen --lock=implementation/2026-10-16-publication/verification/deno-runtime.lock src
```

Run native tooling once:

```sh
pnpm check:native-tooling
```

The Store compiler work changes Rust/OXC inputs, so test and rebuild the debug compiler before executing compiler-backed fixtures:

```sh
cargo test --locked --manifest-path compiler/oxc-spike/Cargo.toml
cargo build --locked --manifest-path compiler/oxc-spike/Cargo.toml
```

Use `/Users/mini/.local/share/mise/installs/node/24.18.0/bin/node --experimental-transform-types` for compiled fixtures. The current direct-intent suite has eleven fixtures: `compiled_direct_intent_test.mjs`, `compiled_urgent_retained_test.mjs`, `compiled_urgent_retained_three_test.mjs`, `compiled_boundary_workset_test.mjs`, `compiled_boundary_reveal_test.mjs`, `native_resource_execution_test.mjs`, `compiled_joint_transaction_test.mjs`, `compiled_scoped_collection_test.mjs`, `compiled_retained_transaction_test.mjs`, `compiled_owner_row_execution_test.mjs`, and `compiled_owner_row_three_execution_test.mjs`. Add the new Store-host fixture once its reviewed filename is known. Keep the separate Three capability suite:

```sh
/Users/mini/.local/share/mise/installs/node/24.18.0/bin/node --experimental-transform-types --test compiler/three_host_capability_test.mjs
```

For each compiled fixture, invoke Node 24 with `--experimental-transform-types` and the fixture path, preserving its own stdout/stderr and exit code. Run the new Store-host fixture against the freshly built compiler, not an old package or binary. Include any new Deno Store-host test in the full `src` suite; do not substitute a focused test run for that gate.

The package consumer should exercise all five private packages after a fresh build:

```sh
pnpm package:r3act
pnpm check:r3act-packages
```

Before the build replaces ignored package outputs, compare the current payload against its archived manifest and preserve the consumer receipt. Archive the complete fresh output separately for this slice. Use Node 24 first in `PATH`, with the established pnpm 11 and Cargo paths also available; preserve exact per-command logs and exits.

## Store-host behavioral proof

The new compiled case should execute the reviewed direct Store subset from `implementation/2026-10-18-store-host/design.md`: finite numeric `use(props.store)` input to a keyed intrinsic leaf's primitive props, using the actual Rust/OXC closed data program and live Store/root/owner identities. The integrated test should cover all accepted readers of a selected Store, retained unrelated histories, newer host-time writes, stale/overlapping leaves, and grouped partial host failure/quarantine. Opaque readers, projections requiring reducer replay, events, effects, refs, style objects, children, and unsupported callbacks must demonstrate conservative fallback. A metadata-only proof is insufficient; run the transformed authored TSX through the real compiler and runtime.

Existing benchmark harness candidates are `implementation/2026-10-18-direct-intent/benchmark/build-gate.mjs` and `run-pair.mjs`; their proof and offline exact-asset replay pattern are reusable, but their direct-root-intent workload is not a Store-host comparison. Author a new Store-specific native/React authored interaction and proof checks for actual closed Store input lowering before the slice build. Compare equal initial Store values and the same primitive host output/identity. Reuse offline exact-asset replay, headless Chromium, GPU disabled, 90-second interruptible limit, no project server, no network/TLS/trust operations. One bounded pair only after all correctness gates pass, the primary reviews the build proof, and a hash-bound run authorization exists. Treat it as one descriptive observation; do not claim CPU, paint, tail, network, or general UX effects.

## Evidence handling

Record command arrays, executable paths/versions, proper subprocess return codes, source hashes, compiler binary hash, transformed fixture output, package artifact manifest, and all raw logs. Continue independent gates after a failure, but do not repair or rerun without primary review. Keep prior direct-intent and earlier slice failures and measurements immutable. The final report should state the Store subset proved and list remaining projections, opacity, host rollback, performance, and general UX limits.
