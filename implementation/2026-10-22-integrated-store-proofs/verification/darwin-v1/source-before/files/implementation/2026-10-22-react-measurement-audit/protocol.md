# React update-interval audit

## Question and limits

This one bounded diagnostic asks whether the installed React arm's measured update interval actually brackets the work that produces the changed Three values: does dispatch/listener work begin inside the timer, do all synchronous React/R3F commits and 769 host writes finish before it stops, and does any observable commit tail run afterward? It also compares the unchanged Compiler-on arm with a same-source/config/pin Compiler-off build and records two diagnostic-only views of the interval. The question is interval validity and likely work placement, not a new speed-qualification run.

The prior React Compiler-on timing result and the Native-versus-React failure remain immutable. This study must not relabel or replace those results, call a Compiler-off cohort a product, infer a stable causal advantage from six contexts, or turn the instrumented/manual variants into speed comparisons. No production source, frozen consumer, installed package, prior proof, profile or qualification result may be changed. Browser execution is headless, GPU-backed, local, offline and intercepts the already-built assets through synthetic HTTPS; no project server or user focus is involved.

## Required artifacts and provenance

Use a fresh research output directory. Bind the frozen v3 `build-proof.json` and `input-lock.json`; the original React, Native and shared assets; the existing authored consumer sources; reviewed-source-v7's current `src/`, `compiler/` and `packages/` hashes; the installed browser executable and Playwright/Vitexec files; and the exact new research driver, protocol and helper/build scripts. Keep a before/after manifest. Report the old v3 documentation/context delta explicitly: the v3 lock is not a whole-worktree lock.

The Compiler-off build is produced once in an isolated research output. It uses the exact same React consumer bytes, package versions, lock, compiler binary, build options and dependencies as the original Compiler-on build, changing only the Compiler plugin enabled/disabled flag. Record both complete asset manifests and all configuration/source hashes, plus generated-code evidence that Position/Rotation no longer contain Compiler `_c` cache calls. If any extra input or build setting differs, mark the comparison incomplete rather than attributing a difference to Compiler.

The ordering instrumenter operates on a disposable copy of only the frozen React JavaScript asset, with all non-target bytes retained and exact source anchors/hash checks. It records the copied asset and patch/diff hashes. It adds boundary observations around the authored update, clock dispatch/listeners, React render/commitUpdate, and R3F scalar writes. Its timings are invalid for performance comparisons. Raw event records must preserve epoch, event kind, time, source anchor, and per-epoch order. Per measured update, verify 257 listener calls, 257 updated Position/Rotation renders, 257 commits and 769 scalar writes (768 motion props plus the FrameMarker); distinguish warmups. Validate counts from the actual event stream as well as the summarized counters. Mark every event as inside or outside the original `updateStart..publishEnd` interval; capture the immediate synchronous tail, queued microtasks, and subsequent task/RAF observations where the instrumented helper exposes them. Do not infer CPU time from event counts.

The manual-timer variant is a disposable same-source Compiler-on copy that suppresses only automatic RAF scheduling. For each of 12 warmups and 60 measured updates, make one browser RPC that calls the original synchronous `arm.update(epoch)` and reads browser `performance.now()` immediately around that call. In the same RPC, after the browser update timer stops, validate the FrameMarker, all 768 motion scalar values, all 256 owner/child identities and resource references (`valuesChecked` must be 769 including the marker). Independently time this update-plus-inspection RPC from Node using `process.hrtime.bigint()`. Make a second RPC for each frame to draw/read pixels, with a separate browser draw duration and Node RPC duration. Record every individual update, validation, draw and RPC interval plus the aggregate 72-update sequence wall duration; do not subtract clocks. Do not add inspection or draw work to the browser update timer. Use the original teardown closure and verify all 512 geometry/material resources are disposed exactly once. Manual RPC latency is not comparable to the RAF interval and includes transport and outside-timer work.

## One six-context episode

Run exactly six fresh browser contexts in this order:

1. React Compiler-on original frozen assets.
2. React Compiler-off isolated build.
3. React Compiler-on ordering-instrumented disposable asset.
4. React Compiler-on manual-timer disposable consumer.
5. React Compiler-off isolated build again.
6. React Compiler-on original frozen assets again.

The original, Compiler-off and ordering contexts use the same harness: 12 warmup plus 60 measured RAF updates, the identical 256-object scene, all expected scene values and identities, same renderer/draw/readback, and exact disposal. Their standard `publishMs` is the time from `updateStart` immediately before `arm.update` to `publishEnd` immediately after it. It does not include later `inspect`, draw/readPixels, or teardown. Require all expected frames, null timing counters, same output digest and renderer, zero browser/request errors, 512/512 exactly-once disposals, context closure, and empty cleanup. Preserve every raw sample and failure.

The manual context is driven by 12 warmup and 60 measured explicit updates, each in a separate browser RPC. It must validate all 769 live values after the update interval stops and draw/read back in a separate RPC. Its browser update interval, validation, draw/readback, update-plus-inspection outer RPC, draw outer RPC and 72-call aggregate remain separate. This context tests whether the existing `updateStart..publishEnd` interval captures the synchronous update work when RAF is absent; it is not a fifth timing competitor.

Do not rerun, reorder, drop a context, or tune a variant after seeing any results. Preparation/build failures are preserved and stop the episode. The six-context execution has a 120-second internal deadline and a 180-second outer supervisor. Any failure, missing hook, incomplete event counts, incorrect exact boundary, asset/source drift, rendering/lifetime mismatch, or unclosed browser produces an incomplete result, not an automatic repair/retry.

## Required conclusions

Answer from direct source anchors and raw events whether update work started before the timer, whether all synchronous listener/render/commit/write work is bracketed by it, and whether queued tail work is observed after it. Separate expected mount/setup before timing from update work. Report Browser `performance.now()` update medians/p95 as descriptive only for the original and Compiler-off controls; report every per-arm sample summary and manual outer-RPC versus browser update intervals without cross-boundary equivalence. State whether React's 0.7 ms interval is valid for the synchronous work it is meant to measure. If the hooks fail to match exact installed source or an event lands outside the interval unexpectedly, preserve raw output and classify that question unresolved.

This is one diagnostic episode only. It cannot establish React-wide superiority, a quiet-machine qualification, Compiler's stable causal effect, phase CPU time, presentation latency, cross-device performance, or the safety/benefit of a Native implementation change. The latest Native result remains a parity FAIL and historical timing-interference disclosures remain attached to their original run.

## Preflight resolver correction and fresh episode

The first released `run-v1` invocation exited during module preflight before launching a browser because a redundant CommonJS `require.resolve('vitexec/cli')` check rejected the package's ESM-only export. Its supervisor receipt and stderr remain preserved. The runner now uses the successful `import.meta.resolve('vitexec/cli')` entry for dependency hashing and uses a fresh `run-v2` receipt/output path; this is a setup correction, not a completed or repeated browser episode. If primary releases the corrected runner, its exact command is:

```sh
python3 implementation/2026-10-20-closed-collection-rows/run-bounded.py \
  implementation/2026-10-22-react-measurement-audit/verification/run-v2-supervisor.json 180 \
  env -u CARGO_TARGET_DIR -u CARGO_BUILD_TARGET -u npm_config_store_dir \
  PATH=/private/tmp/r3act-realtime-pnpm-bin:/private/tmp/radix-dialog-darwin-v1-bin:/Users/mini/.local/share/mise/installs/node/24.18.0/bin:/Users/mini/.cargo/bin:/opt/homebrew/bin:/usr/bin:/bin:/usr/sbin:/sbin \
  CI=true CARGO_HOME=/Volumes/Depot/Developer/r3act/.cache/cargo CARGO_BUILD_JOBS=1 \
  /Users/mini/.local/share/mise/installs/node/24.18.0/bin/node \
  implementation/2026-10-22-react-measurement-audit/run-audit.mjs \
  --proof-dir /Volumes/Depot/Developer/r3act/implementation/2026-10-22-native-frame-publication/proof-canvas-v3 \
  --off-manifest /Volumes/Depot/Developer/r3act/implementation/2026-10-22-react-measurement-audit/generated/compiler-off-v2/manifest.json \
  --ordering-dir /Volumes/Depot/Developer/r3act/implementation/2026-10-22-react-measurement-audit/generated/ordering-on-v2 \
  --manual-proof-dir /Volumes/Depot/Developer/r3act/implementation/2026-10-22-react-measurement-audit/generated/manual-on-proof-v1 \
  --manual-source-manifest /Volumes/Depot/Developer/r3act/implementation/2026-10-22-react-measurement-audit/generated/manual-on-consumer-v1/manual-source-manifest.json \
  --output-dir /Volumes/Depot/Developer/r3act/implementation/2026-10-22-react-measurement-audit/evidence/run-v2
```

## Preparation commands after source review

Use new, absent destinations. Run the Compiler-off build with a 120-second supervisor. Prepare the ON manual source copy, then run the copied baseline Compiler-on build into its own fresh research proof directory. Create the ordering-only asset copy without compiling. Preserve each command and result in the new unit's verification folder. No browser work begins until primary reviews the completed runner/protocol and explicitly releases the six-context episode.

```sh
node implementation/2026-10-22-react-measurement-audit/build-react-controls.mjs \
  implementation/2026-10-22-react-measurement-audit/generated/compiler-off-v2
node implementation/2026-10-22-react-measurement-audit/make-manual-variant.mjs \
  implementation/2026-10-22-react-measurement-audit/generated/manual-on-consumer-v1
node implementation/2026-10-22-react-measurement-audit/generated/manual-on-consumer-v1/build.mjs react \
  implementation/2026-10-22-react-measurement-audit/generated/manual-on-proof-v1
node implementation/2026-10-22-react-measurement-audit/make-ordering-variant.mjs --output \
  implementation/2026-10-22-react-measurement-audit/generated/ordering-on-v2
```

Each preparation command is executed once through `implementation/2026-10-20-closed-collection-rows/run-bounded.py` with a 1200-second outer bound, the pinned Node 24.18.0 environment, and a fresh supervisor receipt under this unit's `verification/`. The preserved first OFF resolver failure, missing-generated-parent setup attempt, and ordering-anchor failure remain in their original receipts and logs; they are not browser outcomes. The actual OFF build is `compiler-off-v2`, the manual Compiler-on build is `manual-on-proof-v1`, and the ordering copy is `ordering-on-v2`.

After primary release, run the single browser episode with a fresh 180-second outer supervisor and the same pinned environment:

```sh
python3 implementation/2026-10-20-closed-collection-rows/run-bounded.py \
  implementation/2026-10-22-react-measurement-audit/verification/run-v1-supervisor.json 180 \
  env -u CARGO_TARGET_DIR -u CARGO_BUILD_TARGET -u npm_config_store_dir \
  PATH=/private/tmp/r3act-realtime-pnpm-bin:/private/tmp/radix-dialog-darwin-v1-bin:/Users/mini/.local/share/mise/installs/node/24.18.0/bin:/Users/mini/.cargo/bin:/opt/homebrew/bin:/usr/bin:/bin:/usr/sbin:/sbin \
  CI=true CARGO_HOME=/Volumes/Depot/Developer/r3act/.cache/cargo CARGO_BUILD_JOBS=1 \
  /Users/mini/.local/share/mise/installs/node/24.18.0/bin/node \
  implementation/2026-10-22-react-measurement-audit/run-audit.mjs \
  --proof-dir /Volumes/Depot/Developer/r3act/implementation/2026-10-22-native-frame-publication/proof-canvas-v3 \
  --off-manifest /Volumes/Depot/Developer/r3act/implementation/2026-10-22-react-measurement-audit/generated/compiler-off-v2/manifest.json \
  --ordering-dir /Volumes/Depot/Developer/r3act/implementation/2026-10-22-react-measurement-audit/generated/ordering-on-v2 \
  --manual-proof-dir /Volumes/Depot/Developer/r3act/implementation/2026-10-22-react-measurement-audit/generated/manual-on-proof-v1 \
  --manual-source-manifest /Volumes/Depot/Developer/r3act/implementation/2026-10-22-react-measurement-audit/generated/manual-on-consumer-v1/manual-source-manifest.json \
  --output-dir /Volumes/Depot/Developer/r3act/implementation/2026-10-22-react-measurement-audit/evidence/run-v1
```
