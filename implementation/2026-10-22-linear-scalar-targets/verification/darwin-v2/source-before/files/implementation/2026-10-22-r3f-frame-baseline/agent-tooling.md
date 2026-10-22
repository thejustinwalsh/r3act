# Fourth-arm consumer tooling handoff

The replaced mechanism is the three-arm installed canvas comparison. Its existing Native, declarative React/R3F and imperative source bytes remain locked by `initial-copy.json`; the new `react-frame` arm has a separate source and capture. The comparison order is fixed as Native → declarative React → React `useFrame` → imperative. The declarative React arm remains the primary React Compiler baseline. This extension makes the previously open idiomatic frame-hook comparator observable without interpreting hook mutation as a React state publication.

`consumer/build.mjs` applies React Compiler to both React arms. The declarative arm still requires Position and Rotation `CompileSuccess`, generated memoization and no direct Three mutations. The new arm must import and register `useFrame` from the pinned legacy R3F API, call the configured root store's `advance` with `frameloop: 'never'`, create meshes/resources through JSX, and mutate retained Three transforms inside frame callbacks. Source checks reject React state setter or dispatch calls in those callbacks. The frame capture saves every actual compiler logger outcome, including function location, reason, detail text and success metrics, before any guard failure can abort the build. It records per-motion `CompileSuccess` booleans. A missing success is labeled `FRAME_COMPILER_DECLINE_PENDING_PRIMARY_REVIEW`; it is neither memoization nor an equal-optimization claim. An actual compiler pipeline error still fails. These static checks are supplemented by runtime counters; a source-shaped fake does not constitute scheduler proof.

`consumer/prepare.mjs` requires 14 authored consumer files, verifies every original consumer/source-basis copy except the three changed tooling files against `initial-copy.json`, and separately reports that `package.json` is byte-identical. It archives the entire recursive pinned R3F source basis, including supplemental hook/scheduler files, using relative paths. The installed package graph, transforms, captures, built assets and exact input lock cover all four modes. The distinct build and browser status strings contain `R3F_FRAME_BASELINES_CANVAS`.

`consumer/verify.mjs` keeps offline intercepted HTTPS, headless GPU, no server, one 120-second bounded proof and one separately hash-authorized timing comparison. It checks before/after source hashes, all four actual WebGL graphs, 12 warmup and 60 measured updates, 256 retained objects, camera and renderer equality, nonempty matching pixel hashes, exactly 512 once-disposed resources, and zero cleanup state from explicit telemetry. Every one of the 72 frame proof samples requires 257 actual hook callbacks (256 motion and one marker), one render takeover, zero control commits and zero draws during scheduler advance. Cleanup requires 72 explicit harness render calls, zero registered frame callbacks and setters after unmount, and a stopped root. Missing values fail. Every timing sample in all four arms must have null proof counters. `publishMs` in the unchanged shared harness is the update-step interval: Store publication for Native and declarative React, scheduler advance plus direct ref writes for `react-frame`, manual host writes for imperative. The shared `drawMs` includes WebGL render and readback. No claim is made that the R3F scheduler controls React component renders or that the setup scopes are comparable.

If the frame compiler declines either motion component, proof and timing remain blocked until primary reviews the preserved diagnostics and writes `frame-compiler-review.json` in the new proof directory. That internal receipt needs status `APPROVED_FRAME_COMPILER_FALLBACK_FOR_PROOF` and SHA-256 keys `captureSha256` for `capture-react-frame.json`, `buildProofSha256` for `build-proof.json`, and `inputLockSha256` for `input-lock.json`. Verification locks the receipt before and after each browser phase and includes the actual compiler events and per-component outcome in its browser record. A decline permits an idiomatic R3F scheduler comparison with a documented Compiler fallback; it does not establish compiled motion components or equivalent optimization. No review receipt is needed if both motion components have `CompileSuccess`.

The failed `proof-canvas-v1` artifact remains untouched. Luna may run fresh preparation to expose the compiler outcome in `proof-canvas-v2`; primary reviews that capture before releasing the browser proof. The commands are:

```sh
node implementation/2026-10-22-r3f-frame-baseline/consumer/prepare.mjs --proof-dir implementation/2026-10-22-r3f-frame-baseline/proof-canvas-v2
```

After primary reviews the v2 capture and writes the conditional fallback receipt if needed, Luna runs:

```sh
node implementation/2026-10-22-r3f-frame-baseline/consumer/verify.mjs --phase proof --proof-dir implementation/2026-10-22-r3f-frame-baseline/proof-canvas-v2
```

After an untimed proof passes, primary must create `canvas-timing-authorization.json` in that proof directory with status `APPROVED_FOR_ONE_R3F_FRAME_BASELINES_CANVAS_TIMING_COMPARISON` and SHA-256 values for `build-proof.json`, `input-lock.json` and `canvas-proof-one-shot.json` under keys `buildProofSha256`, `inputLockSha256` and `proofSha256`. Luna then runs the one timing command:

```sh
node implementation/2026-10-22-r3f-frame-baseline/consumer/verify.mjs --phase timing --proof-dir implementation/2026-10-22-r3f-frame-baseline/proof-canvas-v2
```

No gate, browser, benchmark or VM was run while implementing this tooling. The full realtime budget, cold/memory, presentation and independent-device qualification remain open.
