# Read-only correction for the retained eligibility build

This verifier evaluates the **existing failed build artifacts**. It does not build, run a browser, change the original gate result, or claim runtime delta execution. The original `build-gate-report.json` remains `FAIL`: its sole false assertion searched bundled JavaScript for literal `_c(`, while Vite emitted `(0, import_compiler_runtime.c)(8)` in `ReactRow` and `(0, import_compiler_runtime.c)(12)` in `ReactArrayBoard`.

The verifier parses the exact emitted React source and exact bundled JS with Babel Core's parser already installed through `@vitejs/plugin-react`. It requires one direct cache initializer inside each named component, positive integer slots matching emitted source (8 and 12), a callee bound to `import_compiler_runtime.c`, a binding to `require_compiler_runtime`, and that module's `exports.c` implementation calling React's `useMemoCache`. It rejects five synthetic alterations: missing row cache, wrong callee, wrong slot count, changed runtime module binding, and unrelated string text in place of the row call. It also checks the exact failed report/lock/binary/bundle/emitted-source hashes, all 413 current locked inputs and both recorded phases, command and Rust response receipts, the native/generic/negative proof fields, all local build file hashes, and source-map provenance. Any changed artifact or extra false predicate fails.

After primary review, Luna can run **one** read-only verification command from the repository root with `login:false`:

```sh
/Users/tjw/.nvm/versions/node/v24.18.0/bin/node .cache/structural-locality-protocol-v1/eligibility/artifact-verifier-v1/verify.mjs
```

The command writes only `artifact-verifier-v1/verification-report.json` with exclusive creation; an existing report prevents overwrite. Success means `CORRECTED_ARTIFACT_CHECK_PASS_BUILD_PROVENANCE_ONLY`. The old gate stays failed, the local assets are unserved, and runtime structural delta remains **UNVERIFIED**. No new build or favorable rerun is part of this correction.
