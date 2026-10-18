# First-pass consolidated verification

Status: **PREPARED; NOT RUN.** The primary agent releases this gate only after source review and a frozen slice boundary. Luna runs each gate once, preserves its complete stdout/stderr and exit status, and does not repair or retry failures.

Before the first command, write `source-lock-v1.json` with SHA-256 for the finite source closure: all changed `src/**/*.{ts,tsx}`, the relevant and new `src/*_test.ts`; all `compiler/**/*.{ts,tsx,mjs,rs}` excluding `target` and `node_modules`; every `packages/**` source and manifest; `scripts/build_r3act_packages.mjs`, `scripts/verify_r3act_packages.mjs`; root `package.json`, `pnpm-lock.yaml`, `pnpm-workspace.yaml`, `tsconfig.r3act-packages.json`; `implementation/2026-10-16-publication/verification/deno-runtime.lock`; the gate/fixture files named below; and `compiler/oxc-spike/target/debug/ui-graph-compiler-spike` after the authorized Rust build. Keep the existing gate-only Deno lock; do not change the root lock or historical receipts.

Use Node `/Users/mini/.local/share/mise/installs/node/24.18.0/bin/node` (`v24.18.0`) and Cargo `/Users/mini/.cargo/bin/cargo`. For package scripts, put `/Users/mini/.local/share/mise/installs/node/24.18.0/bin`, `/Users/mini/.local/share/mise/installs/node/26/bin`, and `/Users/mini/.cargo/bin` on `PATH` in that order so Node 24 runs the gate while `pnpm` and Cargo resolve from their installed toolchain paths. The exact sequence at release is:

1. `deno test --config deno.browser.json --frozen --lock=implementation/2026-10-16-publication/verification/deno-runtime.lock src`
2. `/Users/mini/.cargo/bin/cargo test --locked --manifest-path compiler/oxc-spike/Cargo.toml`
3. `/Users/mini/.cargo/bin/cargo build --locked --manifest-path compiler/oxc-spike/Cargo.toml --bin ui-graph-compiler-spike`
4. `pnpm check:native-tooling`
5. With the Node 24 executable, run each once: `compiler/compiled_joint_transaction_test.mjs`, `compiler/compiled_scoped_collection_test.mjs`, `compiler/compiled_retained_transaction_test.mjs`, `compiler/compiled_owner_row_execution_test.mjs`, and `compiler/compiled_owner_row_three_execution_test.mjs`, each with `--experimental-transform-types`.
6. Before packaging, preserve any pre-existing `.cache/r3act-package-build` directory under a unique `verification/preexisting-package-build/` snapshot. Run `pnpm package:r3act`; preserve its complete fresh `.cache/r3act-package-build` output under a new `verification/packaging-v1/` archive before any later command can replace it. Then run `pnpm check:r3act-packages` once and preserve its logs and exit status.

Do not let independent failures suppress later gates. The Cargo build is required because this slice changes compiler import aliases; the five compiled fixtures must use that exact rebuilt executable. Packaging is a separate product gate and must retain generated package contents and tarballs, not just terminal output. No browser or performance result substitutes for these correctness gates.
