# Reveal workset verification v2

The reviewed test-only correction passed the full frozen Deno suite: **830 passed, 0 failed**. The raw output is in [`deno-full-v2.log`](deno-full-v2.log). The wrapper then failed while assigning zsh's read-only `status` variable, so it did not preserve Deno's process exit code; this is recorded in [`deno-full-v2-wrapper-exit.json`](deno-full-v2-wrapper-exit.json). The suite was not rerun.

The v2 source lock covers 708 files. Comparing it with v1 found exactly one changed input, `src/component_boundary_reveal_test.ts`, SHA-256 `fe515b5e8beed44c69ff0c5e06276f17a3353af45f0329d09d04d897b2ebc03e`; the Rust compiler binary and all runtime files remained unchanged. See [`source-lock-v2.json`](source-lock-v2.json) and [`source-lock-audit-v2.json`](source-lock-audit-v2.json).

Other correctness receipts are reused without rerun because their locked inputs were unchanged: 43 Rust tests and debug compiler, native tooling, seven compiled fixture runs, seven Three host checks, notebook append-only audit, package build, and fresh package consumer. Their raw evidence remains in the v1 receipts listed by [`gate-results-v1.md`](gate-results-v1.md).

The single authorized benchmark build completed under Node v24.18.0. [`build-proof.json`](../benchmark/proof-v1/build-proof.json) is `BUILD_CAPTURED_PENDING_PRIMARY_REVIEW`, records Vite exit 0, all eight semantic/build assertions true, matching source audit, the unchanged compiler hash, both transforms, and exact production asset hashes. The outer invocation receipt is [`benchmark-build-v1.exit.json`](benchmark-build-v1.exit.json); Vite stdout/stderr and transforms are preserved under `../benchmark/proof-v1/`. No browser pair has run. Awaiting primary proof review and hash-bound authorization.
