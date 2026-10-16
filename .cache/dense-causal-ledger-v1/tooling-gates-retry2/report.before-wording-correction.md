# Approved retry 2: synthetic and diagnostic build gates

## Gate outcomes

- Synthetic protocol: **PASS**, pinned Node v24.18.0, exit 0. Output is preserved in `synthetic.stdout.log` and `synthetic.stderr.log`.
- Diagnostic Vite build: **PASS**, PID 67935 exited 0. It completed in the one-shot build command; no process remains running. Vite produced the frozen proof and diagnostic `dist`; stdout/stderr are preserved. The emitted “outDir is not inside project root” warning is expected for the configured isolated build location; the build completed.
- Build lock: **PASS**, pinned Node v24.18.0, exit 0. SHA-256: `d244caa769f41601cd7d0e9d20b0f87d32bfb68ede23c6f9ac58bb9578fc6486`. No preview, server, or browser was started.

## Snapshot and source integrity

The approved source manifest SHA-256 is `9a490d3855bc814daefa46c94bede2879743c3a8d1d8309833d2c449cebce43b` for the original candidate archive and `a5e71711b280429128e7b1a5c027c90b0edff5a8068c87bad701e75d4b385db7` for the complete confirmation extraction archive; these identities are recorded separately. The source-manifest SHA-256 `15ca667d0a928ea9238fe75786b3e907473f9e7006e7b38aed4ae59cf346943d` matches the primary-approved value. All 272 snapshot files match its `after` inventory. The six reviewed patch targets are the only baseline-to-diagnostic source deltas. The included prebuilt OXC binary is hash-locked; Cargo was not run and no dependencies were fetched.

Tooling, snapshot and source-manifest trees remained byte-identical across synthetic, build and lock-build (`287` frozen files; see `before.json`, `after-synthetic.json`, `after-build.json`, `after-lock-build.json`). The build proof and lock both bind the approved source-manifest SHA. Build-lock asset, map, tooling and compiler-event hashes all verify against their produced files.

## Transform and source-map proof

- Both native rows emitted schema-v2 owner update kernels, three state slots, and six-argument `executeCut` calls.
- Both React rows show React Compiler memo-cache allocation and read/write.
- The build lock contains eight hashed production outputs and three hashed source maps. Coverage includes `component_state_runtime.ts`, `vdom_snapshot_runtime.ts`, `dom_style_writer.ts` and `react_high_frequency_arm.tsx`.
- Runtime and arm source-map entries resolve to the isolated `snapshot/`; React runtime dependencies resolve to the installed package tree. Vite config selects the archived compiler binary from `snapshot/compiler/oxc-spike/target/debug/ui-graph-compiler-spike`.

## Preserved audit note

The first auxiliary post-lock audit attempt failed because my audit code looked up tooling hashes under `snapshot/` instead of the tooling directory. That failure is preserved in `post-lock-audit-attempt-1.json`. I corrected only the read-only audit path and reran the verification; `post-lock-audit.json` reports all checks passing. No source, tooling, snapshot, or manifest was edited by the audit.

The first Vite failure remains preserved at `../attempts/build-failure-1/` and in the original `../tooling-gates/`; retry 2 used the approved repaired manifest and a fresh output directory.
