# Retained-prop transaction slice — consolidated gate v1

Source snapshot: source-lock-v1.json (16 changed/added source and test files, captured before gate execution at base commit b921555). No source or dependency lock was edited by verification. Raw commands, stdout/stderr, and exact exit codes are in per-command *-v1.log and *.exit files.

| Gate | Result |
|---|---|
| deno test --config deno.browser.json --frozen --lock=implementation/2026-10-16-publication/verification/deno-runtime.lock src | FAIL, 768 passed / 1 failed; exit 1. |
| cargo test --locked --manifest-path compiler/oxc-spike/Cargo.toml | PASS, 42 passed / 0 failed; exit 0. |
| pnpm check:native-tooling | PASS, exit 0. |
| Locked debug compiler build | PASS, exit 0; required because the Vite plugin uses compiler/oxc-spike/target/debug/ui-graph-compiler-spike, whose previous binary predated the released Rust source. Binary digest is in native-compiler-binary-v1.sha256. |
| Node v24.18.0 compiler/compiled_retained_transaction_test.mjs | FAIL before runtime execution at line 47: “conditional is represented in the executable plan”; the assertion expected compact JSON while transformed output was pretty-printed. Exit 1. |
| Node v24.18.0 compiler/compiled_owner_row_execution_test.mjs | FAIL before runtime execution at line 221: expected 5 owner descriptors with explicit source lists, found 1. Exit 1. |
| Node v24.18.0 compiler/compiled_owner_row_three_execution_test.mjs | FAIL before runtime execution at line 172: expected 3 sink descriptors, found 2. Exit 1. |

The sole Deno failure is “second host failure quarantines a retained group without accepting either root” in src/component_retained_delta_test.ts:265. It fails on a subsequent prepareRetained call because ComponentStateRoot.#assertActive throws “ComponentStateRoot cannot continue after a host commit failure”; the cause is the expected “second host failed” setter error. Primary review says the test expectation should reflect terminal failed-root behavior and separately identified a likely implementation defect: retained apply stages lastValue but not unary lastSourceValue, so a later prepared cell update can be incorrectly skipped. That diagnosis is awaiting source repair/review; no repair or rerun is included here.

All logs and failures are preserved. No server, browser, benchmark, build proof, or performance comparison was run. The optional Portless setup skip remains recorded separately.
