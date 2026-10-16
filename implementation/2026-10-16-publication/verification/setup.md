# Verification setup — 16 October 2026

No correctness test, build, benchmark, browser, or server was run during setup; source integration was still active.

## Toolchain and dependencies

- Node v26.9.0; pnpm 11.25.0; Vite 8.3.1 declares `^20.19.0 || >=22.12.0`, so this Node release meets the declared engine range.
- Deno 2.9.7 and Cargo 1.97.1 are installed. Use `--frozen` for Deno checks as required by the repository instructions.
- `pnpm install --frozen-lockfile` completed successfully. Full output: `pnpm-install.log`. `pnpm-lock.yaml` was not changed.
- No `.nvmrc`, `.node-version`, or `rust-toolchain.toml` was found. The compiler Rust crate has its own `Cargo.lock`.

## Bounded performance candidate after release

Use the existing production high-frequency fixture: contiguous 1,024 rows, all rows dirty, homogeneous row programs, one Native/React matched pair (two fresh headless contexts), 60 warmups plus 240 measured frames per page. The archived collector is `collect-one-pair.mjs` in `implementation/2026-10-13-current-kernel-headless-confirmation/source-build-comparison-and-diagnostics.tar.gz`; its old config and source locks are immutable evidence and cannot be reused as current bindings. Prepare a new source/build receipt and configuration after the integrated slice is reviewed, then run exactly one pair through the collector and preserve any failure. It is descriptive, not qualification, and cannot establish paint or frame-presentation performance.

The prior lock/config expects portless origin `https://react-runtime-headless.localhost:1355`, GPU-off headless Chromium, and a 90-second deadline. It also insists on production asset hashes, compiler output proof, exact source locks, and output/identity/lifecycle assertions.

## Server prerequisite

The `portless-dev-servers` skill was not found under `/Users/mini/.codex/skills` or `/Users/mini/.codex/plugins/cache`; no project server was launched. Any later browser run must wait until that skill is located and read, then use its Portless HTTPS workflow.

## Scoped Deno lock for the gate

The required workspace-frozen run failed because the root Deno lock's `workspace.packageJson.dependencies` no longer matched the current package metadata. The repository `deno.lock` remains untouched (SHA-256 `2fc4b3510c468662c994738deb808ec800e651650867261751b34978535f56c5`). The isolated `deno-runtime.lock` is a JSON copy with only the `workspace` field removed; JSR specifiers and integrity hashes are unchanged. The exact diff is in `deno-runtime-lock.diff` (SHA-256 `af0d0ce8499a55414d916fe5d3f81abffe907c2f904438aa8d5e62257502cf6f` for the gate lock). This scoped configuration preserves the original workspace-lock failure as a separate result.
