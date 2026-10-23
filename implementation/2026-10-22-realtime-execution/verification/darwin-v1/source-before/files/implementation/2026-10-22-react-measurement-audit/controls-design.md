# React 0.7 ms measurement controls

These scripts create disposable research assets from the installed `proof-canvas-v3` React consumer. They do not edit the frozen proof, product source, consumer or historical receipts. The question is whether React Compiler 1.0.0 is a material cause of the recorded React/R3F update time, and whether the browser's own manual update clock is of the same order as an independent Node wall clock around the RPC. Neither control proves a Native optimization or broad speed claim.

## Compiler OFF, same RAF workload

`build-react-controls.mjs <new-research-output-dir>` reads the frozen input lock to locate its still-installed pinned consumer. It checks the installed `react.tsx`, `scene.ts`, `react.html` and original `build.mjs` against their archived source bytes, and the installed manifest/lock against archived installed manifests. It uses the original Vite root, `nativeReactPlugins`, `@vitejs/plugin-react`, React JSX/Oxc settings, unminified build and `react.html` input. The **only config delta** is an empty Babel plugin list instead of the original `babel-plugin-react-compiler` entry. The emitted post-transform `react.tsx` must retain Position/Rotation but contain no Compiler `_c` memo call or `react/compiler-runtime` import. The research manifest records the transformed-source hash and every output asset hash. Failed builds retain an `INCOMPLETE` manifest and are not controls.

The frozen original Compiler-ON transform/capture remains the reference for successful Position/Rotation Compiler events and memo calls. A collector must run the original ON asset and the new OFF asset through the **same** RAF harness: 12 warmup + 60 measured frames, unchanged scene values, pixel/readback/identity checks and 512 exact resource disposals per context. The ON and OFF sample order and contexts belong in the collector protocol. A compiler-disabled result is not evidence about the manual variant, and a different asset hash is expected because compilation changed.

Proposed Luna commands after primary source review, from repository root:

```sh
node implementation/2026-10-22-react-measurement-audit/build-react-controls.mjs implementation/2026-10-22-react-measurement-audit/generated/compiler-off-v1
node implementation/2026-10-22-react-measurement-audit/make-manual-variant.mjs implementation/2026-10-22-react-measurement-audit/generated/manual-on-consumer-v1
node implementation/2026-10-22-react-measurement-audit/generated/manual-on-consumer-v1/build.mjs react implementation/2026-10-22-react-measurement-audit/generated/manual-on-proof-v1
```

The copied original build writes `dist/react`, `transforms/react`, and `capture-react.json` under `manual-on-proof-v1`. Its unmodified Compiler plugin and assertions must show Position/Rotation `CompileSuccess` and `_c` memoization. The runner should archive hashes of those generated files before browser use. Each command uses a new output directory; the scripts refuse overwrite. If the frozen input-lock consumer no longer exists, restore only the pinned install to a disposable location with its archived lock/tarballs and update the research script's consumer selection under source review; never silently rebuild from current package resolution.

## Compiler ON, manual stopwatch variant

`make-manual-variant.mjs` copies all 14 frozen consumer files, substitutes the pinned installed manifest/lock and links that installed dependency tree into a disposable research copy. It alters **only** the first `requestAnimationFrame(tick)` statement in shared `start`. `controlProof`, mount, React `flushSync` update, shared `inspect`, rendering helper and original `stop`/disposal remain. The original copied `build.mjs` still runs the Compiler-ON baseline config. The script records hashes for every copied input, original and manual `scene.ts`, original `react.tsx` and original build; reversing the exact inserted block must recover the archived scene byte-for-byte.

After `start` performs original control proof and mount inspection, no RAF begins. It exposes `window.realtimeManualHarness`:

| Member | Contract |
| --- | --- |
| `arm.update(epoch)` | Original synchronous React `flushSync` dispatch and published-marker test. |
| `inspect(epoch)` | Checks marker at the requested epoch, then shared `inspect` verifies all 256 retained identities/resources and 768 motion scalars; returns `valuesChecked: 769`, checksum and validation time. |
| `draw()` | Shared WebGL render/readback, with checksum and lit-pixel result. |
| `stop()` | Original shared teardown: unmount, wait for exactly one dispose event on each of 512 geometry/material objects, then renderer disposal. |

The collector should issue 12 warmup and 64 (or 60, recorded exactly) synchronous manual updates. In each browser evaluation, measure `performance.now()` immediately around `arm.update(epoch)`, require `published`, then call `inspect(epoch)` outside that update interval. An independent Node `hrtime.bigint` around each `page.evaluate` RPC is a coarse outer bound: it includes IPC and browser scheduling and must not be subtracted from browser time. If the collector wants output pixels, invoke `draw()` separately and retain the checksum/lit-pixel oracle; drawing is not part of `arm.update` timing. Call `stop()` and retain its exact disposal receipt even on a failed sample. The manual burst removes RAF spacing and is a diagnostic workload, never a replacement for the original ON/OFF matched RAF comparison. No React Profiler instrumentation is added.

The original RAF proof and current product timing remain immutable. Report raw distributions, first-update and p95, renderer/platform/timer quantum, ordered arm schedule, source/build/asset hashes, validation failures and all cleanup outcomes. A near-floor browser timer or a Node RPC dominated by overhead leaves the order-of-magnitude check unresolved. Compiler ON/OFF differences may reflect generated code and JIT/GC interactions; they do not by themselves isolate reconciliation or host costs.
