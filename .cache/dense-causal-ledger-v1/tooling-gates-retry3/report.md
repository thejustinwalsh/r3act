# Approved RETRY3 tooling gates

## Gate outcomes

- Synthetic protocol: **PASS**, pinned Node v24.18.0, exit 0.
- One-shot diagnostic Vite build: **PASS**, pinned Node v24.18.0, PID 74887, exit 0.
- Build lock: **PASS, with capture caveat**. The pinned Node command printed the lock path, created the lock only after its source/identity/assets/source-map assertions, and wrote no stderr. My zsh wrapper then returned 1 because I assigned the result to zsh's reserved read-only variable `status`; therefore the Node exit code itself was not captured. The raw stdout/stderr and this caveat are preserved in `lock-process.json`. No rerun was performed.

## Identity and source integrity

The source manifest is `f1d274b68e6bfbbea3151aa57388bb90a9c8b6c1aa62914924aaba14e0b3e57f` (272 snapshot files, six reviewed patch targets). All 287 frozen tooling/snapshot/manifest input hashes match the before-build snapshot; no source/tooling input changed. The diagnostic native identity exactly matches frozen build04 across assertions (2), native registrations (3), and owner update kernels (2), identity SHA-256 `17acfbfa1e1ebbd6b44fd2594633e92daaac3af412efafcc3075f8e3182fe579`. The original build04 proof still matches its frozen source/build lock.

## Compiler and output proof

Build proof reports `PASS` and `productionBuild: true`. Three React Compiler events are present (`ReactRowA`, `ReactRowB`, `ReactBoard`). The lock SHA-256 is `68fefba20876c02c0e2013699c64d4b31eb4deb6d02b3abbacb2fde09f798372`; it binds the source manifest, original build04 proof, diagnostic build proof, React Compiler events, tooling, and eight output assets. Three source maps cover authored `component_state_runtime.ts`, `vdom_snapshot_runtime.ts`, `dom_style_writer.ts`, and `react_high_frequency_arm.tsx`. The Vite snapshot config selects the staged Rust/OXC plugin and archived prebuilt compiler binary.

No Cargo build, dependency fetch, preview, server, or browser was run. RETRY1 and RETRY2 artifacts remain preserved. Full data is in `verification.json`, with process stdout/stderr alongside it.
