# Recording B frontend isolated build gate

## Result

The single authorized pinned Node 24.18.0 invocation exited 0. The gate report status is `BUILD_PROVENANCE_PASS_PAGE_UNVERIFIED`; its Vite child exited 0 with no signal. It records 1,534 source audit rows (767 locked inputs before and after), all matching. No retry, repair, server, browser, runner lock, count page, timing, or matrix was run.

The gate's capture hooks recorded five transformed modules with no build-end, close-bundle, or capture errors. Emitted `native_collection.tsx`, `native_generic.tsx`, and `react_array.tsx` hashes matched the eligible v2 artifacts. The native controller contains generated native component and JSX bindings and both authored mount component IDs. Native collection emitted all locked site IDs. React Compiler AST proof found 8 memo slots for `ReactRow` and 12 for `ReactArrayBoard`.

The bundle contains `NativeCollectionBoard`, `NativeGenericBoard`, `ReactArrayBoard`, both count-window calls, and compiler memo-cache evidence. Its 30-entry source map includes the authored collection, generic and React fixtures; controller and entry; snapshot probe, native API, JSX binding runtime and VDOM runtime; and compiler runtime. The map contains no live runtime `src` module outside the snapshot. These are build/source provenance checks, not evidence that the page or count probe executed.

## Produced assets

- HTML: `.cache/structural-locality-recording-v1/diagnostic-v1/frontend/dist/.cache/structural-locality-recording-v1/diagnostic-v1/frontend/index.html` — SHA-256 `8067b210a00f7a269aaf42406a02a445bb16d3e0f6cbfe5823277726a9f3d71d`
- JS: `.cache/structural-locality-recording-v1/diagnostic-v1/frontend/dist/assets/index-CMf9kKCG.js` — SHA-256 `0baba8413a724a771bdf418f08353716b59170cf406949458e12962a7b58cc5e`
- Source map: `.cache/structural-locality-recording-v1/diagnostic-v1/frontend/dist/assets/index-CMf9kKCG.js.map` — SHA-256 `c659b76cbd8f2f83cf7164387909c02ab35b873fe8a623fbf3ee6f855f88d14d`

Independent after-audit matched all three bytes to `build-report.json`. Vite stdout/stderr files match the hashes recorded by the gate; stderr is empty. Compiler binary remained SHA-256 `74396ae694aa6203cc4d4b4900c3458ca31e25e9638c73160b51bcb4aede79c8`.

## Preservation and limits

The frontend input lock SHA `9e4de310288b4c342039a67b7e25fa32646dbf30f1ad2227828fc9aae99015ec` was verified. All 767 inputs matched before and after the build. The independent preservation audit rechecked 2,181 prior source/evidence entries; all stayed unchanged, including the original 413 and v2 424 inputs, prior failed and passed evidence, and archived frontend draft. See `before.json` and `after.json` for per-file hashes, process result, gate report details and independently checked assets.

The build establishes transform, output-asset and source-map provenance only. Runtime count behavior, app correctness, page fit, locality and performance remain unverified. A separate approval is required before any preview or page run.
