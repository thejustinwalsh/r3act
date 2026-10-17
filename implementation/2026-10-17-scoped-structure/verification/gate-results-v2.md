# Consolidated correctness gate v2

Source was frozen by `source-lock-v2.json` before these gates. `source-audit-after-v2.json` confirms every recorded runtime, test and compiler-fixture hash still matches after the run.

- Full browser Deno suite: `deno test --config deno.browser.json --frozen --lock=implementation/2026-10-16-publication/verification/deno-runtime.lock src` — exit 0, **788 passed, 0 failed**. Raw output and exit are in `deno-src-gate-v2.log` and `.exit`.
- Native tooling: `pnpm check:native-tooling` — exit 0. Raw output and exit are in `pnpm-native-tooling-v2.log` and `.exit`.
- Node 24.18.0, `--experimental-transform-types`: compiled scoped collection, retained transaction, DOM owner-row and Three owner-row fixtures all passed once. Each command has a separate `.log` and `.exit`.
- Rust compiler source and executable were unchanged from the prior source-identical locked Cargo receipt, so this slice reuses **42 passed, 0 failed** from `implementation/2026-10-17-retained-deltas/verification/cargo-test-v1.log` rather than rerunning Cargo.

Fixture outputs were written with unique IDs under `.cache/compiled-owner-proof/`, `.cache/compiled-owner-three-proof/`, `.cache/compiled-retained-transaction/` and `.cache/compiled-scoped-collection/`; no tracked cache file was changed. This gate contains correctness evidence only and no performance result.
