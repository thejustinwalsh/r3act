# Direct-intent lifetime-complete verification results (v4)

All released correctness gates passed. The full frozen Deno suite passed **852 tests, 0 failed**. Native tooling passed. All eleven actual compiled fixtures passed, and the separate Three host suite passed **7/7**. The direct-intent and native-candidate forced-GC retention checks both passed; these are narrow liveness checks and make no heap or peak-memory claim.

The fresh package build and outside-checkout consumer passed. The complete fresh package outputs are archived at [`packaging-v4`](packaging-v4). Before replacement, the existing 416-file package payload matched the v2 archive; its prior consumer receipt was preserved separately. The 43-test Cargo receipt and compiler binary were reused after exact source/manifest/lock/binary hashes matched. The notebook audit was reused because the notebook is unchanged.

All **724** frozen source, configuration, test, script, and harness inputs match after the gates. Historical v1 and v2 failures remain preserved with their source snapshots; v3 corrected the single test expectation and passed; v4 adds the reviewed lifetime cleanup and retention checks.

Raw outputs and exact exits are `deno-full-v4.log`, `native-tooling-v4.log`, `compiled-1-v4.log` through `compiled-11-v4.log`, `three-host-node-v4.log`, `direct-intent-retention-v4.log`, `native-candidate-retention-v4.log`, `package-build-v4.log`, and `package-consumer-v4.log`, each with `.exit.json`. Source integrity is recorded in `source-lock-v4.json` and `source-lock-audit-v4.json`. No benchmark build or browser run has occurred.
