# Radix Dialog proof build v2 review

The one authorized untimed build completed with outer command exit code 0. Vite built successfully in 315 ms. The runner recorded `BUILD_CAPTURED_PENDING_PRIMARY_REVIEW`; all 13 proof assertions are true. This is an untimed transform/build capture, not a browser or timing result.

## Actual compiler output

The repaired public adapter is now an ordinary React JSX function in the compiler input. Its actual transformed output imports `c as _c` from `react/compiler-runtime`; `ReactRadixDialog` contains `_c(26)` and compiler-generated memo slots around its Radix Trigger, Overlay, Title, Description, Close, Content, Portal, and Root elements. `react-compiler-events.json` records `CompileSuccess` for `ReactRadixDialog` from `src/react_radix_dialog_adapter.tsx`, `ReactApp` from the React workload arm, and `DialogBody` from the workload body.

The captured actual React transforms also contain `ReactApp` with `_c(22)` and `DialogBody` with `_c(17)`. The proof assertions for public core/bridge imports, native app/bootstrap registration, pending gate, opaque native dialog metadata, native Store/state lowering, retained Radix component, compiler runtime, React body memo and Radix adapter transform are all true. The native assertions establish this fixture's source lowering and registration; they do not imply a universal closed-purity guarantee.

## Locked inputs, dependencies, and compiler

The pre-build source lock has SHA-256 `db352dcc4b8e03b76d16ca6e908206e39be9e0f30b466680599f9514cdf3caf3` and locks 1,289 source, compiler, selected workload and runtime dependency files. All 1,289 raw archived inputs independently match their locked SHA-256 values; the runner's expected/current/archived audit also has zero mismatches.

The captured runtime graph contains 28 packages, including `@radix-ui/react-dialog` 1.3.1, React 19.3.0, and React DOM 19.3.0. The compiler hash before and after Vite is unchanged: `cee5598eaa612f76fe6b4717d3161333d30c5f4503430c3c448627e27b6d0fb0`.

## Captured transforms and assets

| Output | Bytes | SHA-256 |
|---|---:|---|
| Native Radix dialog transform | 13,292 | `e7a0620d3cee5995047a13b3f2165b464d3a25998efd601028f9f5d008738438` |
| Native arm transform | 9,954 | `55c2bf5e17f67ebb2268af3847b153f3f2852237388ce553c7acaa86b85c7d7c` |
| React dialog body transform | 2,187 | `05aad025c5e694b42d44b73980394e0a8f82e2c8721da1031c8596b8631e3e2f` |
| React arm transform | 5,118 | `1df26194af03cc3d3bb7983779dce788a7e4d9197da010f45c2b953e7f662798` |
| React Radix adapter transform | 2,597 | `a6eabb830a9be363ce4356258ea427af06e9672d9e5b46e616b70ef92ff5cfb0` |
| React compiler events | 1,303 | `ec63493720e2cf0e1310f74678cf41cf42d5b935faac40370e08507d16fe1f0a` |
| Emitted JavaScript | 579,238 | `132d8a537533b793602a824940a25af71504271c2dc3a99282cd9a9309df736c` |
| Emitted source map | 2,728,894 | `053adaa45e353cf67e4eb0dbff7dc70a17eaa828f559abec9b189ac3ad6f8f03` |
| Emitted workload HTML | 242 | `073d5508146a9e434409fdad2aa1086f9c195f47753befabe07c6469bb6a6da5` |

All nine captured transform, event and asset files independently match their recorded hashes and byte lengths. The earlier proof-v1 `build-proof.json` and `source-lock.json` remain byte-for-byte unchanged, with SHA-256 `884f5640941669e54300e26a5bb26e82b13bea38e82af5a4d6cbd1c8eabac8a1` and `6c7ff66f6ded455147a3234641a379da02ccac78a35f07e2e4b024bd81425f70` respectively.

## Evidence index

- [Build proof and all 13 assertions](../workload/proof-v2/build-proof.json)
- [Pre-build source lock](../workload/proof-v2/source-lock.json)
- [Archived source and dependency inputs](../workload/proof-v2/source-inputs/files/)
- [Actual compiler events](../workload/proof-v2/react-compiler-events.json)
- [Actual transformed modules](../workload/proof-v2/transforms/)
- [Vite stdout](../workload/proof-v2/vite.stdout.log)
- [Vite stderr](../workload/proof-v2/vite.stderr.log)
- [Passing repaired-source correctness gate](gate-review-v2.md)
- [Preserved proof-v1 failure](workload-proof-v1-review.md)

This capture is ready for primary review. No browser, pair, or timing run was performed or authorized by this build result.
