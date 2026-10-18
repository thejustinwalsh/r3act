# Direct-intent corrected verification results (v3)

The corrected full frozen Deno suite passed **852 tests, 0 failed** (exit 0). The v3 source lock differs from v2 only in `src/component_direct_intent_test.ts`: its expected label now matches the explicitly resolved `old-a`. The runtime source hash is unchanged.

The v1 nullable-capture typecheck failure and the v2 inverted test assertion remain preserved in `failure-v1` and `failure-v2`, with exact source locks and raw outputs.

Native tooling, all eleven compiled fixtures, the seven-case Three host test, the fresh package build, and installed consumer were reused from v2 because their production input closures are unchanged. Rust43/compiler hashes matched exactly; the notebook remained unchanged. Complete package outputs are archived at [`packaging-v2`](packaging-v2).

All 723 frozen source/configuration/harness inputs match after the v3 gate. No benchmark build or browser run was performed.

The full Deno output and process result are `deno-full-v3.log` and `deno-full-v3.exit.json`. V2 reused gate outputs remain individually recorded in `*-v2.log` and matching `.exit.json` files. Source locks and audits are `source-lock-v1.json` through `source-lock-v3.json` and `source-lock-audit-v3.json`.
