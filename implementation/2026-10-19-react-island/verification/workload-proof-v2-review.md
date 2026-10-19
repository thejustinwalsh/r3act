# React island workload proof v2

The single authorized untimed proof build completed successfully. The outer pinned-Node command exited `0`; the Vite child exited `0`; `build-proof.json` reports `BUILD_CAPTURED_PENDING_PRIMARY_REVIEW`. No browser run, pair, run authorization, or retry was performed.

Before execution, the proof-v1 source lock's 761 current input files were copied as raw bytes, together with workload `README.md` and the unit `source-review.md`. The immutable archive contains 763 files; its manifest SHA-256 is `8b82a8a0f3b04888967cba5dc97bab50a8b86314f342226bfa1798ba83dd7142`. All seven differences from the preceding Darwin source archive are the approved files: `compiler/fixtures/native-react-island.tsx`, `workload/build-gate.mjs`, `native_arm.tsx`, `react_arm.tsx`, `react_leaf.tsx`, `run-pair.mjs`, and `vite.config.ts`. Post-build, all 763 archived paths, sizes, and hashes still match the worktree. The proof's 761 input audit had zero mismatches.

The build used Node `v24.18.0`, `CI=true`, `CARGO_BUILD_JOBS=1`, repository `CARGO_HOME`, and truly unset `CARGO_TARGET_DIR` and `CARGO_BUILD_TARGET`. The compiler hash remained `cee5598eaa612f76fe6b4717d3161333d30c5f4503430c3c448627e27b6d0fb0` before and after. The proof source-lock SHA-256 is `89653861d73388355b83766186308304a8734b71b43c3e3cb57c05afba4baf2c`.

The actual Native transform registered `NativeIslandApp` as `compiler/fixtures/native-react-island.tsx#component:NativeIslandApp`; the bootstrap registered `NativeRootView` as `implementation/2026-10-19-react-island/workload/native_arm.tsx#component:NativeRootView`. In `NativeIslandApp`'s own function body, the store read lowers through `__nativeUseAt` at `#store:0` using `props.point`, and state lowers through `__nativeUseStateAt` at `#state:0`. Its registration metadata has `propOnlySites: []` and no closed store, resource, or component-forward program. This establishes the captured opaque metadata shape, not closed purity. The bridge adapter remains present. All corresponding Native assertions passed.

React compiler event capture reports `CompileSuccess` for both `ReactApp` and `ReactLeaf`, with no diagnostic reason. The actual `ReactLeaf` output imports `react/compiler-runtime`, calls `_c(20)`, and uses memo slots for the effects and JSX construction; both React compiler assertions passed.

The build transformed 53 modules and emitted three unique assets:

| Asset | Bytes | SHA-256 |
| --- | ---: | --- |
| JS bundle | 533,707 | `ab1c1b05e0db84f7c5f2ec52f5e976f5808734a9a3995ed90d9897a57f66e420` |
| Source map | 2,513,891 | `7ae5cc94ee5825c7d2e3170dd96130039e76710ba88f61b22eba669b1852d4c3` |
| HTML entry | 235 | `481791cff05884cb8f0c7e08be9125001233f929cd33bb985d9aa9377141e921` |

The three transform hashes and full source audit are in `workload/proof-v2/build-proof.json`. `react-compiler-events.json`, captured transforms, and raw Vite stdout/stderr are preserved alongside it. Vite emitted its advisory that the minified JS chunk exceeds 500 kB.
