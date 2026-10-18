# Direct-intent corrected-source gate results (v2)

The corrected source passed type checking and every independent compiled/package gate, but the full frozen Deno suite has one new regression failure. It ran **851 passed, 1 failed**: `failed pending intent restores accepted settled-boundary retry work` observed `old-a` but expected `old` at `src/component_direct_intent_test.ts:495`. The raw diff shows the test assertion is inverted: it explicitly resolves `old-a` at line 484, and runtime correctly retains that value. This result is preserved; no source change or retry was made.

`pnpm check:native-tooling` passed. All eleven Node 24 actual compiled fixtures passed, including the new direct-intent fixture; the separate Three host test passed **7/7**. The exact Rust source and compiler hashes still match the prior 43-test receipt, so that result was reused. The notebook audit was reused because the notebook is unchanged.

The fresh package build and installed consumer both passed. Their complete build outputs are archived at [`packaging-v2`](packaging-v2). Before replacing the partial v1 cache, its 152 files were verified identical to `packaging-v1-failed`; the v1 failure archive remains intact.

All **723** v2 source/configuration/harness inputs still match their pre-gate hashes. No benchmark build or browser run was performed; those remain held for primary review of the Deno failure.

Raw logs and exit receipts are `deno-full-v2.log`, `native-tooling-v2.log`, `compiled-1-v2.log` through `compiled-11-v2.log`, `three-host-node-v2.log`, `package-build-v2.log`, and `package-consumer-v2.log`. The v1 TS18047 failure and exact sources remain in [`failure-v1`](failure-v1).
