# Retained-prop transaction slice — consolidated gate v2

Source snapshot: source-lock-v2.json (19 changed/added source and test files, captured before the v2 gates at base commit b921555). V1 evidence and logs remain unchanged. No verification source edits or retries occurred.

| Gate | Result |
|---|---|
| deno test --config deno.browser.json --frozen --lock=implementation/2026-10-16-publication/verification/deno-runtime.lock src | PASS, 772 passed / 0 failed; exit 0. Receipt: deno-src-gate-v2.log. |
| pnpm check:native-tooling | PASS, exit 0. Receipt: pnpm-check-native-tooling-v2.log. |
| compiler/compiled_retained_transaction_test.mjs under Node v24.18.0 | PASS. Receipt: compiled-retained-transaction-v2.log. |
| compiler/compiled_owner_row_execution_test.mjs under Node v24.18.0 | PASS. Receipt: compiled-owner-row-dom-v2.log. |
| compiler/compiled_owner_row_three_execution_test.mjs under Node v24.18.0 | FAIL before runtime execution at line 174: expected 2 closed expressions for rotation and roughness while vector position keeps fallback, found 1. Exit 1. Receipt: compiled-owner-row-three-v2.log. |

The Rust source hashes in source-lock-v2.json match source-lock-v1.json. The locked Cargo suite therefore reuses the v1 result (42 passed / 0 failed), and the standalone Vite compiler binary built after v1 matches those unchanged Rust sources; its path and SHA-256 remain recorded in native-compiler-binary-v1.sha256. No Cargo rerun/build was needed for v2.

The retained transaction fixture now passes its actual TSX closed-AST, complete joint-footprint, unrelated accepted cut, primitive output and no-rerender assertions. The DOM owner-row fixture passes its compiler/runtime checks. The Three owner-row assertion failure is preserved without retry; no claim is made that its runtime assertions passed.

All v2 logs and exact exit codes are preserved. No browser, server, benchmark, or performance comparison was run. The optional Portless setup skip remains in the separate 17 October preflight record.
