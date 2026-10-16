# Preflight gates

## Results

- **Immutable dirty-selection check: PASS.** Pinned Node v24.18.0 ran the existing `.cache/high-frequency-harness-stage/selection-check.mjs` with its output directed to this owned folder. It checked 9,000 combinations across 5 sizes, three dirty shapes, two placements and 300 frames/configuration. Exit code: 0; stdout/stderr are preserved in `selection.stdout.log` and `selection.stderr.log`. Result JSON SHA-256: `b348d8adcc560fd98aab6ed3a3adec9561914715d1a8a2d0fb90e2911405cd2c`.
- **Three staged TypeScript checks: PASS.** The pinned Node invoked the installed `tsgo` CLI with each immutable config. Each config has `noEmit: true`; exits were 0 and stdout/stderr were empty. Logs are preserved individually.
  - `tsconfig.check.json` — `0`
  - `tsconfig.native-check.json` — `0`
  - `tsconfig.react-check.json` — `0`

These are **live post-baseline type gates**, not archived-baseline type verification: the native TSX config resolves imports into the live runtime. The baseline input lock has 21 relevant paths; 20 match and the sole mismatch is `src/vdom_snapshot_runtime.ts` (locked baseline `00d8516d…`, live `cdc774b7…`, the adjacent-token cache patch already recorded in the evidence lock).

## Integrity and scope

- All 26 recorded fixture/config/toolchain inputs have matching before/after SHA-256 values. Full per-path hashes and expected baseline comparisons are in `preflight-gates.json`.
- `selection.stdout.log`, `selection.stderr.log`, `typecheck-check.stdout.log`, `typecheck-check.stderr.log`, `typecheck-native-check.stdout.log`, `typecheck-native-check.stderr.log`, `typecheck-react-check.stdout.log`, and `typecheck-react-check.stderr.log` preserve exact process streams. Exit status, arguments, elapsed time and log hashes are recorded in the JSON.
- No source, tooling, fixtures or configs were edited. The selection script wrote its result only under this owned folder. No build, preview, network fetch, benchmark or browser run occurred.
