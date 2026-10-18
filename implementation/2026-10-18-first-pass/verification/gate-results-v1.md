# Consolidated gate receipt v1

Status: **INCOMPLETE.** Source inventory: `source-lock-v1.json` (`FROZEN_BEFORE_GATES`, 39 inputs). This receipt records the one released v1 attempt. No v1 command was repeated.

The full frozen Deno command checked the `src` test set but stopped before test execution on two type errors in `src/component_state_runtime.ts:4377`: TS18046 reports `preparedProgram.readSources` is `unknown`; TS7006 reports the callback parameter `source` has implicit `any`. Raw output: `deno-full-v1.log`. `pnpm check:native-tooling` failed with the same two diagnostics after pnpm confirmed the lockfile and workspace install were current; raw output: `native-tooling-v1.log`.

Cargo test and the debug compiler build each exited 0: `cargo-test-v1.log`, `cargo-build-v1.log`. All five Node 24.18.0 compiled runtime fixture invocations exited 0: `compiled_joint_transaction_test-v1.log`, `compiled_scoped_collection_test-v1.log`, `compiled_retained_transaction_test-v1.log`, `compiled_owner_row_execution_test-v1.log`, and `compiled_owner_row_three_execution_test-v1.log`.

The package build and fresh consumer gate were not run in v1 while the shared TypeScript type repair is pending. No benchmark build or browser pair was run. These are not v1 passes.
