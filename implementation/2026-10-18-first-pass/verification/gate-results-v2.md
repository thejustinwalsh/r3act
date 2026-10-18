# Consolidated gate receipt v2

Status: **INCOMPLETE.** Source inventory: `source-lock-v2.json` (`FROZEN_BEFORE_GATES`, 51 inputs). This records one v2 attempt; v1 receipts remain intact.

The full frozen Deno run executed 813 tests: 811 passed and two failed. `pending resource work retains its view while a joint interaction publishes then rebases` failed when its test setter returned false at `src/native_mixed_transaction_test.ts:166`. `scoped removal detaches the current writer after an intervening prop cut` failed because a scoped primitive insertion prepared where the old test expected `null` at `src/vdom_scoped_structure_test.ts:299`. Raw output: `deno-full-v2.log`.

`pnpm check:native-tooling` passed (`native-tooling-v2.log`). All five Node 24.18.0 compiled fixtures passed: `compiled_joint_transaction_test-v2.log`, `compiled_scoped_collection_test-v2.log`, `compiled_retained_transaction_test-v2.log`, `compiled_owner_row_execution_test-v2.log`, and `compiled_owner_row_three_execution_test-v2.log`. The Cargo test and debug compiler build reuse v1 results because the Rust sources and manifest were unchanged; the package builder also compiled its release compiler successfully.

`pnpm package:r3act` passed and the complete output was copied to `packaging-v1/` before verification. `pnpm check:r3act-packages` failed once: isolated `pnpm install --ignore-scripts` attempted to fetch private `@r3act/core` from npm and received HTTP 404. Raw outputs: `package-build-v1.log` and `package-consumer-v1.log`.

No benchmark build or browser comparison was run. The two test failures are under primary review, and the consumer resolution failure needs an implementation decision before any package retry.
