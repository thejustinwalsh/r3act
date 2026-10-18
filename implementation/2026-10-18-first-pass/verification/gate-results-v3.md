# Consolidated gate receipt v3

Status: **DENO PASS; PACKAGE CONSUMER RETRY PENDING PRIMARY REVIEW.** Source inventory: `source-lock-v3.json` (`FROZEN_BEFORE_DENO_GATE`, 37 code/config inputs).

The full frozen Deno suite passed: 813 tests, 0 failures (`deno-full-v3.log`). The two v2 test-only failures were corrected by primary; v2 receipts remain preserved. Native-tooling, Cargo test/build, and all five compiled fixtures are reused from v2 after primary confirmed their implementation inputs did not change. Their logs are `native-tooling-v2.log`, `cargo-test-v1.log`, `cargo-build-v1.log`, and the five `compiled-*-v2.log` files.

The package build passed once and its complete artifacts are archived at `packaging-v1/`. The first fresh-consumer check failed because the verifier’s pnpm 11 configuration used the ignored `package.json` `pnpm.overrides` field, causing private `@r3act/core` to be fetched from npm and return 404. Primary is reviewing a verifier-only correction that writes the required temporary workspace override config. The build artifacts remain unchanged; one consumer-only retry is pending that review. The original logs are `package-build-v1.log` and `package-consumer-v1.log`.

No benchmark build or browser comparison has run. It remains gated on the reviewed consumer retry and primary review of the exact build proof.
