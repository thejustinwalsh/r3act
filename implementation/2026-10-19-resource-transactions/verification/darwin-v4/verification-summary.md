# Darwin v4 verification summary

The single consolidated Darwin native-host gate completed on 2026-10-19 with overall status **PASS**. The observed host matched the requested platform: `darwin/arm64`. All **35 of 35 steps passed**. No retry, browser replay, build-proof run, or performance comparison was performed.

## Source archive and integrity

Before execution, `source-v4` archived the authoritative **844** runner inputs from `darwin-v3/source-before.json`, using current worktree bytes, plus the eight requested context and documentation files: `AGENTS.md`, `HANDOFF-PROMPT.txt`, `RESEARCH-GUIDE.md`, `final-master-plan.md`, `implementation-checkpoint.md`, `paper.md`, `docs/native-authoring-reference.md`, and `three-host-api.md`. The archive contains 852 files. Its manifest SHA-256 is `81106b52f3e95625b9d63005dbd5829668159a40b570a1fcdaf3eb18df3c6a81`.

The current runner path inventory matched the authoritative 844 paths exactly, with no additions or removals. Preflight verified every archived runner input against current worktree bytes and sizes; there were no missing or mismatched files. After execution, `source-before.json` and `source-after.json` were identical across all 844 inputs. The runner reports `sourceAudit: MATCH` with no changed paths. The source-v4 manifest remains unchanged after execution.

## Gate counts

- Frozen Deno suite: **994 passed, 0 failed**.
- Rust compiler tests: **63 passed, 0 failed**.
- Native tooling check: **PASS**.
- Compiler artifact conformance: **PASS (24 checks)**.
- Compiled fixtures: **23 passed, 0 failed**.
- Three-host tests: **7 passed, 0 failed**.
- Retention checks: **2 passed** (`direct-intent-gc`, `native-candidate-gc`).
- Fresh package build and consumer verification: **PASS**. All five package tarballs were validated and the fresh consumer report was `PASS`. The packaged compiler artifact targeted `aarch64-apple-darwin`.

The compiled resource transaction fixture, which failed in v3 during root preparation because its value-capturing click handler was not eligible for a closed cut, now passes. The revised fixture checks the functional-setter closed-cell path and keeps a captured-handler generic negative case; the gate reports `PASS compiled resource transaction`.

## Toolchain

- Node: `v24.18.0` (pinned executable under mise).
- Rust: `rustc 1.97.1`, `cargo 1.97.1`.
- pnpm: `11.25.0`.
- Deno: `2.9.7` (V8 `15.0.245.2-rusty`, TypeScript `6.0.3`).

Complete logs, step records, source locks, packaging records, preflight audit, and receipt are preserved alongside this summary in `darwin-v4/`.
