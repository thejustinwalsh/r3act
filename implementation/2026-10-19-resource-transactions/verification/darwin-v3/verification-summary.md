# Darwin v3 verification summary

The single consolidated Darwin native-host gate completed on 2026-10-19 with overall status **FAIL** (runner exit 1). The observed host matched the requested platform: `darwin/arm64`. The receipt contains 35 steps: **33 PASS, 2 FAIL**. No retry, browser replay, build-proof run, or performance comparison was performed.

## Source archive and integrity

Before execution, `source-v3` archived the authoritative **844** paths from `darwin-v2/source-before.json`, using current worktree bytes, plus the eight requested context and documentation files: `AGENTS.md`, `HANDOFF-PROMPT.txt`, `RESEARCH-GUIDE.md`, `final-master-plan.md`, `implementation-checkpoint.md`, `paper.md`, `docs/native-authoring-reference.md`, and `three-host-api.md`. The archive contains 852 files. Its immutable manifest SHA-256 is `cd78e45325e56a69ad0f10bf9f9c59679e6dd4f3a39d68833807dd4dc24a78fb`.

Before launch, the current runner path inventory was independently compared with the authoritative list: both contained the same 844 paths, with no additions or removals. The preflight audit verified every archived runner input against current worktree bytes and sizes, with no missing or mismatched files. After execution, `source-before.json` and `source-after.json` were identical across all 844 paths; the runner reports `sourceAudit: MATCH` with no changed source. The archive manifest was not modified after execution.

## Gate counts

- Rust compiler tests: **63 passed, 0 failed** (`cargo test --locked`).
- Native tooling check: **PASS**.
- Compiler artifact conformance: **PASS (24 checks)**.
- Compiled fixtures: **22 passed, 1 failed** out of 23.
- Three-host tests: **7 passed, 0 failed**.
- Retention checks: **2 passed** (`direct-intent-gc`, `native-candidate-gc`).
- Fresh package build and consumer verification: **PASS**. All five package tarballs were validated and the fresh consumer report was `PASS`. The packaged compiler artifact targeted `aarch64-apple-darwin`.
- Full frozen Deno suite: **FAIL during type checking**; no runtime tests executed, so there is no Deno runtime test count for this gate.

## Failures

`deno-full` reported two errors in `src/native_resource_transaction_queue_test.ts`:

- Line 357: `leftTerminal` is `unknown` when reading `.cause`.
- Line 358: `rightTerminal` is `unknown` when reading `.cause`.

`compiled-23` failed at `compiler/compiled_resource_transaction_test.mjs:184`: `work.status` was `failed`, expected `committed`. The fixture's added `inspect` diagnostic shows the actual resolution: `Candidate preparation failed`, caused by `Scoped root delta is unavailable: resource-dom-4d260c41-2352-4df1-a36b-c5637cf4b302` from `src/native_root_work_queue.ts:322` during `RootWorkQueue` commit preparation. The previous schema assertion failure is gone; the fixture now reaches grouped transaction preparation. This gate did not resolve the new preparation failure.

## Toolchain

- Node: `v24.18.0` (pinned executable under mise).
- Rust: `rustc 1.97.1`, `cargo 1.97.1`.
- pnpm: `11.25.0`.
- Deno: `2.9.7` (V8 `15.0.245.2-rusty`, TypeScript `6.0.3`).

Complete logs, step records, source locks, packaging records, preflight audit, and receipt are preserved alongside this summary in `darwin-v3/`.
