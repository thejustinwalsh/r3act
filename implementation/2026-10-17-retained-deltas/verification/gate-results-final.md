# Retained-prop transaction slice — consolidated verification

The v2 source release passes the complete frozen Deno gate (772/772) and native-tooling check. Rust passed 42/42 in v1; the two Rust source hashes stayed identical through v2, so the locked test result and refreshed standalone compiler binary were reused. The retained-transaction and DOM owner-row compiler/runtime fixtures passed under Node v24.18.0 in v2. The corrected Three owner-row fixture passed once under Node v24.18.0 in v3.

## Final receipts

- Deno: 772 passed, 0 failed; deno-src-gate-v2.log, exit deno-src-gate-v2.exit.
- Cargo: 42 passed, 0 failed; cargo-test-v1.log, exit cargo-test-v1.exit.
- Native tooling: pass; pnpm-check-native-tooling-v2.log, exit pnpm-check-native-tooling-v2.exit.
- Locked debug compiler build: pass; cargo-build-native-compiler-v1.log, executable path/hash in native-compiler-binary-v1.sha256.
- Retained transaction compiler/runtime: pass; compiled-retained-transaction-v2.log.
- Compiled DOM owner-row: pass; compiled-owner-row-dom-v2.log.
- Compiled Three owner-row: pass; compiled-owner-row-three-v3.log.

The Three fixture verifies 240 distinct five-value numeric batches, stable Three vectors/geometry/material, one component render, no generic/legacy fallback during those batches, and disposal of both resources with zero live handles. This is a headless host/compiler correctness proof only; it contains no RAF, GPU, visual or latency qualification.

## Preserved earlier failures

V1 Deno had 768 passed and one failed test. The test's next prepare after a host-commit failure expected a nullable decline, while the root's documented contract throws after quarantine. The test was corrected to expect terminal failure. Primary also found and repaired a retained unary-source-history issue, with a regression for a subsequent ordinary numeric flush. V2 full Deno passed after those reviewed corrections.

The v1 retained compiler fixture's compact-JSON assertion failed on pretty-printed emitted plan text; it passed in v2 after AST-based checks. V1 DOM and Three owner-row fixtures failed emitted-descriptor count checks before runtime assertions; DOM passed in v2 after reviewing actual compiler output. V2 Three expected a closed AST for the authored aggregate rotation vector [r,0,0]; that vector correctly stays on the fallback path. The corrected assertion requires only the roughness closed expression and verifies its source site while preserving vector fallbacks. The v3 Three fixture then passed. All earlier failure logs and exit receipts remain alongside these final passes; no result was overwritten or retried for a favorable outcome.

## Source locks and limits

- source-lock-v1.json: 16 source/test files before the initial gate.
- source-lock-v2.json: 19 source/test files before the repaired full gate and runtime fixtures.
- source-lock-v3.json: 22 source/test files before the single corrected Three fixture run.

All gates were bounded to the released slice and run once at each authorized version. No server, browser page, benchmark, build proof or performance comparison was run. The optional Portless comparison setup skip is recorded in implementation/2026-10-17-publication-comparison/preflight.md.
