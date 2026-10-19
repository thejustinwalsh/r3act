# Radix Dialog proof build v1 review

The single authorized untimed build did not pass its proof assertions. The outer pinned-Node command returned exit code 1. The Vite child completed successfully with exit code 0 (`✓ built in 292ms`), but the runner recorded `BUILD_FAILED_OR_INCOMPLETE`: `reactRadixSourceTransformed` is false. The other 12 assertions are true, the recorded errors list is empty, and the complete input audit has zero mismatches. This is a preserved failed proof result; no build retry was run.

The failed assertion inspects the transformed `react_radix_dialog_adapter.ts.js` and requires a `ReactRadixDialog` function containing both the `react/compiler-runtime` import and an `_c` call. The output contains a `ReactRadixDialog` function, but no such compiler runtime import or `_c` memo call. Compiler events recorded successful compilation for `ReactApp` in `react_arm.tsx` and `DialogBody` in `dialog_body.tsx`; they contain no event for `ReactRadixDialog`. This means the build produced assets and transformed modules, but did not demonstrate the required compiled Radix adapter.

## Locked inputs and compiler

The proof runner wrote a pre-build source lock and copied its raw inputs before invoking Vite. `source-lock.json` has SHA-256 `6c7ff66f6ded455147a3234641a379da02ccac78a35f07e2e4b024bd81425f70` and lists 1,289 locked inputs, including the selected runtime dependency graph. The graph contains `@radix-ui/react-dialog` 1.3.1, React 19.3.0, React DOM 19.3.0, and its locked transitive packages. The post-build audit reports zero differences between expected, current, and archived hashes.

The compiler hash before and after Vite was unchanged: `cee5598eaa612f76fe6b4717d3161333d30c5f4503430c3c448627e27b6d0fb0`.

## Actual transform and asset evidence

The runner recorded these transformed module hashes:

| Module | Bytes | SHA-256 |
|---|---:|---|
| Native Radix dialog | 13,292 | `e7a0620d3cee5995047a13b3f2165b464d3a25998efd601028f9f5d008738438` |
| Native arm | 9,954 | `55c2bf5e17f67ebb2268af3847b153f3f2852237388ce553c7acaa86b85c7d7c` |
| React dialog body | 2,187 | `05aad025c5e694b42d44b73980394e0a8f82e2c8721da1031c8596b8631e3e2f` |
| React arm | 5,118 | `1df26194af03cc3d3bb7983779dce788a7e4d9197da010f45c2b953e7f662798` |
| React Radix adapter | 1,018 | `10c8d3c10bfc3b667b4ddedb1070ae55faeb419d63134315e136bc2a2eb766ab` |
| React compiler events | 884 | `c1f0e1384df5221efae4d4fe61259e289b0ebf3a9e74c991c5d2f2a6d0354be8` |

Vite emitted a JavaScript asset (578,515 bytes, SHA-256 `2284c86507c39a560050d6a98201a32497d6f59ceb22a9e9543c0b40635874b7`), a source map (2,727,464 bytes, SHA-256 `6ae0296bd8e67e0d75d9eee70c025f6b6a18a42022d31aa66718ef882b39ed3b`), and the workload HTML (242 bytes, SHA-256 `01307acde36c8adc116917b665c87185a5745b465f80a21a296e88ad40d0593f`). Their existence records a successful Vite build, not a successful proof.

## Evidence index

- [Build proof and assertions](../workload/proof-v1/build-proof.json)
- [Pre-build lock](../workload/proof-v1/source-lock.json)
- [Archived raw source inputs](../workload/proof-v1/source-inputs/files/)
- [React compiler events](../workload/proof-v1/react-compiler-events.json)
- [Captured transformed modules](../workload/proof-v1/transforms/)
- [Vite stdout](../workload/proof-v1/vite.stdout.log)
- [Vite stderr](../workload/proof-v1/vite.stderr.log)
- [Consolidated correctness gate review](gate-review-v1.md)

No browser, pair, or timing run is authorized by this result. The Radix adapter compilation requirement needs primary review before any follow-up action.
