# Darwin v1 verification summary

The single consolidated Darwin native-host gate completed on 2026-10-19 with overall status **FAIL** (runner exit 1). The observed host matched the requested platform: `darwin/arm64`. The receipt contains 35 steps: **31 PASS, 4 FAIL**. No retry, browser replay, build-proof run, or performance comparison was performed.

## Source and archive provenance

Before execution, `source-v1/manifest.json` had 2,321 entries and SHA-256 `1d4108edf8aa34eed0ba79354f20186b63884100b852bdef2def7e39bee3a34b`. That original manifest byte stream was not retained. After execution, the runner-selected `.github/workflows/native-package-portability.yml` was added to the archive and the manifest was updated. The current archive has 2,322 entries and manifest SHA-256 `6dcb56cf28416fea4cbbe79c81465688aecf0135710f7d08dec368fc303c2521`.

This records an archive provenance exception: the workflow file was absent from the archive at gate start. Its subsequently archived bytes match the runner's pre-execution SHA-256 and size. No original manifest bytes were reconstructed. An independent comparison now finds all 844 `source-before.json` runner inputs represented in the current archive with matching paths, SHA-256 values, and sizes. `source-before.json` and `source-after.json` contain identical 844 input records; the runner reports `sourceAudit: MATCH` and no changed source files.

## Gate counts

- Rust compiler tests: **63 passed, 0 failed** (`cargo test --locked`).
- Native tooling check: **PASS**.
- Compiler artifact conformance: **PASS (24 checks)**.
- Compiled fixtures: **20 passed, 3 failed** out of 23.
- Three-host tests: **7 passed**.
- Retention checks: **2 passed** (`direct-intent-gc`, `native-candidate-gc`).
- Fresh package build and consumer verification: **PASS**. All five package tarballs were validated; the fresh consumer report was `PASS`. The packaged compiler artifact was for `aarch64-apple-darwin`.
- Full frozen Deno suite: **FAIL** during type checking.

## Failures

`deno-full` reported eight type errors:

- `src/component_state_runtime.ts:5922`: `closedStoreOutputs.owners` was inferred as unavailable on `never`.
- `src/native_resource_transaction_queue_test.ts:77` and `src/native_resource_transaction_test.ts:148,280`: host fixture tag `output` conflicts with the closed host schema's `div` tag.
- `src/vdom_resource_transaction_test.ts:42,45,48,103`: `program` may be null.

Compiled fixture failures:

- `compiled-10`, `compiler/compiled_owner_row_execution_test.mjs:320`: expected 0 generic captures; observed 2.
- `compiled-11`, `compiler/compiled_owner_row_three_execution_test.mjs:261`: expected 0 generic pending snapshots; observed 240.
- `compiled-23`, `compiler/compiled_resource_transaction_test.mjs:74`: `CDom` has an unsupported closed-program schema.

## Toolchain

- Node: `v24.18.0` (pinned executable under mise).
- Rust: `rustc 1.97.1`, `cargo 1.97.0`.
- pnpm: `11.25.0`.
- Deno: `2.9.7` (V8 `15.0.245.2-rusty`, TypeScript `6.0.3`).

The complete logs, step records, source locks, packaging records, and receipt remain alongside this summary in `darwin-v1/`.
