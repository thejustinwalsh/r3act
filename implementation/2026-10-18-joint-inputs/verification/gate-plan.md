# Joint-input slice gate plan

Preparation only; no gates or benchmarks were run for this slice. Take the source lock only after primary release. Preserve Store-host receipts and failures under `implementation/2026-10-18-store-host/verification/` unchanged.

The last verified Store-host baseline is `dcbcac1`: 870 frozen Deno tests, 44 Cargo tests, 12 compiled fixtures, seven Three host tests, two bounded retention checks, and a fresh five-package build/consumer. The joint-input boundary adds two compiled cross-host fixtures and new Rust/OXC IR, so Rust must be tested and rebuilt fresh. Use a single project-local Cargo home for the entire run to prevent the default Vite plugin from silently rebuilding the debug binary under a different Cargo home:

```sh
export CARGO_HOME="$PWD/.cache/cargo"
/Users/mini/.cargo/bin/cargo test --locked --manifest-path compiler/oxc-spike/Cargo.toml
/Users/mini/.cargo/bin/cargo build --locked --manifest-path compiler/oxc-spike/Cargo.toml
```

Then run the consolidated frozen Deno suite and native tooling check once:

```sh
/opt/homebrew/bin/deno test --config deno.browser.json --frozen --lock=implementation/2026-10-16-publication/verification/deno-runtime.lock src
pnpm check:native-tooling
```

Run the **14 actual compiled fixtures** with `/Users/mini/.local/share/mise/installs/node/24.18.0/bin/node --experimental-transform-types`: the existing twelve from the Store-host gate plus `compiler/compiled_joint_store_host_test.mjs` and `compiler/compiled_joint_input_transaction_test.mjs`. The first covers joint Store host outputs; the second covers a grouped Store, local-cell and keyed collection cut across DOM and Three. Also run the seven-case Three host suite:

```sh
/Users/mini/.local/share/mise/installs/node/24.18.0/bin/node --experimental-transform-types --test compiler/three_host_capability_test.mjs
```

Capture the debug compiler SHA immediately before and after every compiled fixture, not only around the full fixture batch. The default plugin can invoke Cargo when a fixture omits an explicit binary, and fixtures may do so under project-local `CARGO_HOME`. Store each fixture's command, exit, log, and before/after SHA in its receipt; any binary change must be attributed to the fixture that first changed it. Run the existing bounded retention checks with `--expose-gc`: `scripts/verify_direct_intent_retention.mjs` and `scripts/verify_native_candidate_retention.mjs`.

Before the fresh package build, preserve the prior package build payload only: `.cache/r3act-package-build` is the **426-file** output from the prior Store-host gate. Do not copy consumer `node_modules` or unrelated temporary files. Then build and test one fresh installed consumer:

```sh
pnpm package:r3act
pnpm check:r3act-packages
```

Archive the complete fresh package payload separately and retain every raw log and actual process exit code. Continue independent checks after failures; skip only a command whose required generated artifact did not build. Do not repair or rerun without primary review.

The eventual browser comparison remains a separate gate: one hash-authorized pair from `implementation/2026-10-18-joint-inputs/benchmark/build-gate.mjs` and `run-pair.mjs`, after correctness passes and primary reviews the exact build proof. The authored test covers a two-to-eight-input closed Store consumer and a grouped Store/World/collection transaction; the matched React arm must use the same authored outputs and equivalent action. Use offline exact-asset replay, headless Chromium, GPU disabled, an interruptible 90-second limit, and no project server, external network, TLS connection or trust changes. Report the single dispatch-to-observer observation descriptively; it provides no CPU, paint, tail-latency or broad UX evidence.
