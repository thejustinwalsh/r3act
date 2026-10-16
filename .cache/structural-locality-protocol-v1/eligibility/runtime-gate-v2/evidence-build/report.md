# Runtime gate v2 build-only evidence

## Invocation and result

- Exact command: `/Users/tjw/.nvm/versions/node/v24.18.0/bin/node .cache/structural-locality-protocol-v1/eligibility/runtime-gate-v2/build-gate.mjs`
- Working directory: `/Users/tjw/Documents/Codex/2026-10-09/le/outputs/react-runtime-research`; login disabled; Node `v24.18.0`.
- Tool process completed with terminal `exit_code=0` in 0.524 seconds; no session ID was returned, so no live handle remained to poll. One invocation only.
- Gate report status: `BUILD_PROVENANCE_PASS_RUNTIME_UNVERIFIED`; SHA-256 `e5b88486db67e4bff55612197a59229c65a78e86532a2682687ecef5a2cad7c6`. Vite exit `{'code': 0, 'signal': None}`; original build error `None`; no gate errors.
- Raw receipts are in this directory: `gate.stdout.log`, `gate.stderr.log`, and `gate.exit-code`. Vite logs are preserved beside the report at the stage root.

## Build provenance evidence

- Capture hook reported no `buildEndErrors`, `closeBundleErrors`, or `captureErrors`.
- The five transformed captures were produced:

- `native_collection.tsx` — SHA-256 `80ae32b93e897ec7d62d4add2c575e1d90aac6add7ee8bfebf6ec6fc872b5c09`, 5194 bytes.
- `native_generic.tsx` — SHA-256 `afe671d41bf8aa1ab87716d7ad2e943d9cc9ee5e249f724f13be5bbb042fabbf`, 5193 bytes.
- `native_controller.tsx` — SHA-256 `2df50004083cdd59edc6a145094b4678b365a8e6abcbde3af27e40ebd05f0dfc`, 8736 bytes.
- `react_array.tsx` — SHA-256 `dbc5ec9463c49d41fd2512086d03aecc8225eafe15632d644019e42a9819335e`, 1984 bytes.
- `react_controller.tsx` — SHA-256 `21db73bdca3bbe5da1d4cc14744b553b55001c659abded994fef520411f545e3`, 1366 bytes.
- `bundle` — SHA-256 `488be8145f31d197b12794b31fb3de183baa2835aa76ead3b70fc512cda37951`.

- Native proof reports `compilerDeltaEligible=true`, `requiresOwnerRender=false`, the retained collection/state/effect site IDs, and authored native JSX root components `NativeCollectionMount` / `NativeGenericMount`.
- React proof reports memo slots: row 8 and board 12. This is transformed-source evidence only.
- Bundle SHA-256: `488be8145f31d197b12794b31fb3de183baa2835aa76ead3b70fc512cda37951` at `.cache/structural-locality-protocol-v1/eligibility/runtime-gate-v2/dist/assets/index-D5faSLNy.js`; compiler/native fixture identifiers were found. The source map contains the fixture, controller, JSX binding runtime, and compiler-runtime entries required by the gate.
- Local build artifacts:

- `.cache/structural-locality-protocol-v1/eligibility/runtime-gate-v2/dist/.cache/structural-locality-protocol-v1/eligibility/runtime-gate-v2/index.html` — SHA-256 `908a2b84356bfef164e9198decad26ec8f77af0386a97ce7257c5eace965d11c`.
- `.cache/structural-locality-protocol-v1/eligibility/runtime-gate-v2/dist/assets/index-D5faSLNy.js` — SHA-256 `488be8145f31d197b12794b31fb3de183baa2835aa76ead3b70fc512cda37951`.
- `.cache/structural-locality-protocol-v1/eligibility/runtime-gate-v2/dist/assets/index-D5faSLNy.js.map` — SHA-256 `8f2e3c52d20d5f06ddc2fba32f0309835e1382840fb8bef7651213dbf3910206`.

## Independent preservation audit

- All 424 v2 lock entries matched before and after; self-lock SHA-256 remained `49f4cae4aae3801f3825e6a8ccb64edeb5749ae19b930a0022c4cd028a4033f4`.
- All 413 original source entries matched before and after.
- All 31 v1 preservation-manifest files matched before and after; manifest SHA-256 remained `ef88b1f3da26bbab4ab759dd4c052bdc221cd78838b9dae3b7840990c1322ce2`.
- The compiler binary remained SHA-256 `74396ae694aa6203cc4d4b4900c3458ca31e25e9638c73160b51bcb4aede79c8`; all listed prior artifacts remained unchanged.
- Detailed per-file hashes and raw outputs are in `before.json`, `after.json`, and `invocation.json`.

## Limits

This is a local build-provenance pass. The local HTML/JS/map were not served or opened in a browser. Runtime behavior, the hidden v1 rejection hypothesis, runtime locality, and performance remain unverified. No server, page, browser, or benchmark was run.
