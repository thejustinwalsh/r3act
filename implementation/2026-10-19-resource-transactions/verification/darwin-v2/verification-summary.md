# Darwin v2 verification summary

The single consolidated Darwin native-host gate completed on 2026-10-19 with overall status **FAIL** (runner exit 1). The observed host matched the requested platform: `darwin/arm64`. The receipt contains 35 steps: **33 PASS, 2 FAIL**. No retry, browser replay, build-proof run, or performance comparison was performed.

## Source archive and integrity

Before execution, `source-v2` archived all 2,322 paths in the current source-v1 manifest, reading bytes from the current worktree. It includes the current resource-transaction source review and implementation checkpoint. Its manifest SHA-256 is `768a67b64be8b892d9f74cbec904eb61fd626837cac4303cd7bfd959e072f8c5`.

The pre-execution audit independently reproduced the runner's current selected paths: all 2,314 were present in source-v2 with matching current SHA-256 values and sizes. All 844 paths from `darwin-v1/source-before.json` were present and matched current worktree bytes. The v2 runner's `source-before.json` and `source-after.json` are identical across all 844 inputs; `sourceAudit` is `MATCH` with no changed paths. The source-v2 manifest was not changed after execution.

## Gate counts

- Rust compiler tests: **63 passed, 0 failed** (`cargo test --locked`).
- Native tooling check: **PASS**.
- Compiler artifact conformance: **PASS (24 checks)**.
- Compiled fixtures: **22 passed, 1 failed** out of 23.
- Three-host tests: **7 passed, 0 failed**.
- Retention checks: **2 passed** (`direct-intent-gc`, `native-candidate-gc`).
- Fresh package build and consumer verification: **PASS**. All five package tarballs were validated and the fresh consumer report was `PASS`. The packaged compiler artifact targeted `aarch64-apple-darwin`.
- Full frozen Deno suite: **FAIL**, with **987 passed and 6 failed** runtime tests.

## Failures

`deno-full` ran the runtime suite and reported six failures:

1. `src/native_resource_transaction_queue_test.ts:323`: the second-host-failure test observed `ComponentStateRoot cannot continue after a host commit failure` when calling `prepareResources` after the root had been quarantined; the original cause was `second-host-fault` at line 324.
2. `src/native_resource_transaction_test.ts:247` (assertion at line 226): an overlapping later resource request remained `pending` where the test expected `committed`.
3. `src/native_resource_transaction_test.ts:250` (assertion at line 342): the joint position reader remained `pending` where the test expected `committed`.
4. `src/vdom_joint_store_delta_test.ts:45` (assertion at line 64): `moved Store target was falsely stale`.
5. `src/vdom_joint_store_delta_test.ts:94` (assertion at line 106): `joint post-host footprint was lost`.
6. `src/vdom_joint_store_delta_test.ts:116` (assertion at line 135): `joint post-host footprint was lost`.

The compiled resource-transaction fixture also failed at `compiler/compiled_resource_transaction_test.mjs:183`: the result was `failed` where `committed` was expected. This is the same fixture's standalone runner step, in addition to the Deno failures above.

## Toolchain

- Node: `v24.18.0` (pinned executable under mise).
- Rust: `rustc 1.97.1`, `cargo 1.97.1`.
- pnpm: `11.25.0`.
- Deno: `2.9.7` (V8 `15.0.245.2-rusty`, TypeScript `6.0.3`).

Complete logs, step records, source locks, packaging records, and the receipt are preserved alongside this summary in `darwin-v2/`.
