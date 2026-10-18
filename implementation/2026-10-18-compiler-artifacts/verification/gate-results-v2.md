# Compiler-artifacts affected fixture v2

The released fixture-only rerun passes: `compiler/native_compiler_artifact_test.mjs` exited 0 under Node v24.18.0 and reported 24 conformance checks passed. The updated fake Vite context resolves the public external import; the plugin lifecycle test now preserves an earlier transform failure while awaiting marker state.

The full 740-input correctness source audit matches before and after with no changed paths. Production/compiler/build helpers and every other v1 gate closure are unchanged and reused from their recorded receipts. V1's missing `info-started` failure remains preserved in [gate-results-v1.md](gate-results-v1.md) and `attempts/v1/`.
