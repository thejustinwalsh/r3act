# Structural/cache slice verification preparation

Status: **PREPARED ONLY — no gate, build, browser, server, or benchmark run for this slice.** Wait for primary source review and explicit release. This directory is owned by verification; do not change live source, dependency locks, or prior evidence.

## Correctness gate at release

First create `source-lock-v1.json` with SHA-256 for every changed tracked source file and newly added/changed test, using the reviewed source inventory. Preserve the current frozen Deno lock at `implementation/2026-10-16-publication/verification/deno-runtime.lock`; the repository `deno.lock` remains untouched. Run each gate once and preserve combined stdout/stderr plus the exact exit code in distinct receipts:

1. `/opt/homebrew/bin/deno test --config deno.browser.json --frozen --lock=implementation/2026-10-16-publication/verification/deno-runtime.lock src` → `deno-src-gate-v1.log` and `.exit`.
2. `/Users/mini/.cargo/bin/cargo test --locked --manifest-path compiler/oxc-spike/Cargo.toml` → `cargo-test-v1.log` and `.exit`.
3. `/Users/mini/.local/share/mise/installs/node/26/bin/pnpm check:native-tooling` → `pnpm-check-native-tooling-v1.log` and `.exit`.
4. Build the compiler only if the Rust change requires the runtime fixture to use a refreshed executable; then record the exact binary path/hash and build command. Run only the released slice's actual compiled structural fixture, followed by existing compiled DOM and Three fixtures if their source/build inputs changed. Supported runtime: `/Users/mini/.local/share/mise/installs/node/24.18.0/bin/node --experimental-transform-types`. Capture one log and exit file per fixture. Do not use default Node 26 for TS parameter-property fixtures.

The full Deno gate is the consolidated runtime gate; do not add speculative per-file runs. Do not edit tests/source in response to failures, and do not rerun for a better result. Record environment/tool failures distinctly from assertion failures. Prior retained-delta receipts under `implementation/2026-10-17-retained-deltas/verification/` remain immutable and are not evidence for this new source slice.

## Matched performance comparison candidate

The existing headless high-frequency collector at `.cache/headless-high-frequency-qualification-stage/collect-one-pair.mjs` exercises numeric all-dirty rows, not keyed structural/cache edits. Reusing it would test the wrong mechanism and must not be described as structural evidence. The applicable precedent is the proposal `.cache/structural-locality-protocol-v1/preserved-proposal.md`, whose compiler-authored stateful keyed fixture and operation instrumentation are not yet an accepted executable protocol.

If the released slice includes a reviewed structural fixture/collector and its correctness/source/build proof, the bounded candidate is **one descriptive matched pair at N=1,024**: one prespecified local edge operation (prefer removal at the head if that operation is explicitly covered by the implemented delta path), Native versus React Compiler, fresh headless contexts, same keys/output/state/effect contract, timer only around native `apply+flush` versus React `flushSync(setIds)`. Keep reset, model construction, DOM/lifecycle checks and teardown outside the interval. Run with the collector's hard deadline and preserve incomplete results; no retries. This single pair cannot establish locality, p95, or a speed claim. The full Recording B matrix (all 12 operations × three sizes × five pairs plus controls) is out of scope for this one boundary comparison.

This is conditional, not authorized to run merely by this prep. The prior structural proposal requires compiler eligibility and authored stateful-row proof, an explicit path/fallback receipt, lifecycle parity and frozen candidate/asset/source hashes before any timing. If those are absent at release, report comparison **NOT RUN—no reviewed slice-appropriate collector/proof** instead of using the numeric high-frequency harness. The numeric harness's one-pair 90-second protocol remains a separate workload and is not a substitute.

## Browser and Portless status

Read-only preflight recorded in `implementation/2026-10-17-publication-comparison/preflight.md`: Chromium/Playwright is installed, but there is no Portless executable/state, proxy listener, or trusted local Portless CA. No server, route, browser, or trust change was made. The user made comparison setup optional. Therefore do not install or configure Portless for this slice; a matched browser run is skipped if a trusted HTTPS route is not already available after release. Never use TLS bypass flags. Do not invoke a project server before loading the required `$portless-dev-servers` skill.

## Toolchain observed

- Node 24.18.0: `/Users/mini/.local/share/mise/installs/node/24.18.0/bin/node`
- Deno 2.9.7: `/opt/homebrew/bin/deno`
- Cargo 1.97.1: `/Users/mini/.cargo/bin/cargo`
- pnpm 11.25.0: `/Users/mini/.local/share/mise/installs/node/26/bin/pnpm`

No correctness command, build, server, browser workload, or benchmark was run while preparing this plan.
