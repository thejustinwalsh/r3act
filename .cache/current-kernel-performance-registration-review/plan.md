# Current owner-kernel performance registration plan

Prepared 13 October 2026. Read-only preparation only: no source, build, protocol, or evidence files were changed, and no server, browser, benchmark, or profile was run.

## Frozen reference and current candidate

The previous fixed-workload confirmation is defined by `product-mixed-owner-row-fusion-confirmation-protocol.md`, collected by `scripts/collect_product_mixed_owner_row_fusion.mjs`, analyzed by `scripts/summarize_product_mixed_owner_row_fusion_v3.mjs`, and independently checked by `scripts/verify_product_mixed_owner_row_fusion_evidence_v3.mjs`. Its immutable raw data is under `results/product-mixed-owner-row-fusion-confirmation/`. The archived candidate was `implementation/2026-10-13-owner-row-fusion/source-and-evidence.tar.gz`, SHA-256 `cbe4ce3f557314fa093ac51214a2ba5e9cf0a5f0ad67b5429ce3a95a5e59a382`. The independent verification passed, but the speed gate failed at all three sizes; keep that result as historical evidence.

The current candidate is `implementation/2026-10-13-owner-update-kernel-v2/status.json` and `source-and-verification.tar.gz`, SHA-256 `3a3f465a4982e90fd4f81d4a1542810e27ff6dbecbcdcf3a19bf2fde1bbfd189`. Its status is `INTEGRATED_OWNER_UPDATE_KERNEL_V2_UNIT_AND_AUTHORED_ROOT_VERIFIED`, with 710 runtime tests and 34 Rust tests. The status freezes 366 source/tool inputs. It explicitly says performance is unmeasured, production-browser qualification is pending, and the previous fusion speed gate failed. The authored Root proof is `PASS` for two rows, no-write exact acknowledgement, newer-version reentry, terminal host failure without acknowledgement, and disposal. It also records the `const parity = value % 2` derived-local compiler gap.

The changed execution path is in current `src/component_state_runtime.ts` (`#tryFlushNativeCellCut` / `#tryCommitNativeRows`) and `src/vdom_snapshot_runtime.ts` (`#executePreparedNumericRows`). Native cell capture accepts a fully eligible cut, Root validates/gets row views and calls the prepared VDOM row executor, and homogeneous rows can call the compiled `executeCut` kernel once. The current kernel ABI is schema version 2 with six arguments and uses the existing per-change input-record scratch. The exact V2 proof source/result and compiler/VDOM inputs are already represented in the current status map; retain and relock those paths rather than relying on names alone.

This is a pure eligible owner-row numeric cut. A cut that also contains collection/store work or structural edits still follows the existing generic candidate/publication route. The product schedule's eight structural frames exercise that mixed route, so they remain necessary correctness/performance coverage and must not be removed or reclassified as kernel frames.

## Registration for the unchanged product workload

Use a new, non-overwriting output directory: `results/product-mixed-owner-update-kernel-v2-confirmation/`. Give the study, config, and Portless host distinct names, for example `compiled-product-mixed-owner-update-kernel-v2-confirmation` and `https://owner-update-kernel-v2-confirmation.localhost:1355`. Keep the old confirmation protocol, collector, results, summary, and archives byte-for-byte unchanged.

Retain the prior protocol's exact decision design:

- `src/browser/product_mixed_schedule.ts`: 30 serial fresh headed pages; five paired React/native pages at each of 128, 512, and 1,024 rows; alternating arm order.
- 1200×900 viewport, GPU disabled; 60 warmup frames and 240 measured frames (frames 61–300); eight structural frames per page, each with the existing eight-row remove/insert/move operation.
- Keep `src/browser/product_mixed_harness.ts`, both arms, CSS, source formula, and all five correctness checks unchanged. Keep the same production-mode, lifecycle, browser-error, and visibility requirements.
- Keep the existing `mountMs`, per-frame `commitMs`/`intervalMs`, and `disposeMs` measurements. Commit timing includes synchronous render/setup inside `step`; it excludes browser layout, paint, and presentation. Do not add phase timers.
- Isolated same-origin COOP `same-origin` and COEP `require-corp`, 100,000 `performance.now()` reads and 48 RAF intervals on the bare calibration route, per-page recalibration after disposal, foreground/visible checks, and the denominator floor `5 * max(preregistration quantum, both paired-page quanta)`. A below-floor React median is unresolved.
- Keep the original gates: native/React paired geometric mean of page median commits ≤0.80 at at least two sizes; median paired p95 ratio ≤1.10 at every size; all 30 pages and all lock/correctness/isolation/clock checks pass. No exclusions, replacement pages, or reruns.

Keep the existing fixed schedule and decision thresholds even though this is a new candidate. A result would qualify only the named current build and this environment; it would not repair or replace the old owner's fusion result or establish a historical causal effect.

## Required current-candidate lock changes

Do not reuse the old `dist-product-mixed-compiled-owner-row-fusion` assets, old compiler proof, old authored owner-row proof, old pilot, or old engine diagnostic as qualification for the new kernel. They bind the prior candidate. Before timing pages are opened:

1. Validate and lock the current kernel status bytes, archive bytes/hash, and all 366 `sourceAndToolsSha256` entries. In particular relock the current `src/component_state_runtime.ts`, `src/vdom_snapshot_runtime.ts`, `src/compiled_state_layout.ts`, `src/jsx_binding_runtime.ts`, `src/native_runtime_api.ts`, `src/owner_state_world.ts`, `compiler/oxc-spike/src/main.rs`, `compiler/oxc-spike/src/owner_update_program.rs`, product TSX arms, shared harness/schedule, package/build inputs, and Deno/Cargo lockfiles from the status map.
2. Rebuild the production assets in a new directory from these exact sources (suggested `dist-product-mixed-owner-update-kernel-v2`). Preserve the existing React arm and harness workload. Save and lock the five served production assets and a new compiler build proof that confirms the emitted native `ProductMixedRow` kernel metadata and schema-v2 `executeCut` code, plus the React compiler output. Build proof is required because the old product assets predate this kernel.
3. Bind the current authored TSX Root execution proof and its authored/emitted fixture/script hashes to the preregistration. Preserve its actual claims: kernel-backed homogeneous native cut, exact acknowledgement/no-op behavior, reentry/version handling, and terminal failure/disposal; it is not browser timing evidence.
4. Make a new six-page production correctness pilot against the new assets and the actual CDP engine tuple before timing registration. Bind its archive/status/verification, manifest, six raw pages, five asset hashes, and compiler proof. Do not edit the frozen candidate status to count the pilot. A pilot on the old build is not transferable.
5. Lock the new protocol, collector, analyzer, independent verifier, base and timing Vite configs, fixed schedule, and all proof inputs before collection. Hash every served asset over HTTPS before and after collection. Preserve every failure and incomplete result under the new results directory.
6. Route the preview through Portless. Do not run a fixed-port preview server directly. No run can begin until the source/build/pilot/proof locks are complete and an independent verifier is ready.

## Separate high-frequency registration proposal

If the decision target is repeated state-to-host commits between display frames, register a second, explicitly separate workload rather than changing the 30-page product confirmation. Proposed directory: `results/product-mixed-owner-update-kernel-v2-high-frequency/`; proposed study id `compiled-product-mixed-owner-update-kernel-v2-high-frequency`. Freeze a new harness/config and all hashes before opening any measured page; leave the product confirmation schedule and its result untouched.

Use the same paired React/native arms, row sizes (128, 512, 1,024), five pairs per size, arm alternation, 30 fresh headed pages, GPU/viewport/isolation requirements, five correctness checks, and lifecycle assertions. For each animation-frame window, issue eight synchronous `controller.step()` calls with successive logical frame numbers and time the entire eight-step batch once. Run 60 warmup windows and 240 measured windows. Keep exactly eight structural edits per page, on measured windows 30, 60, ..., 240; perform the existing 8-remove/8-insert/move operation on the last substep of each such window. Thus each page contains 480 warmup state commits and 1,920 measured logical updates; structural windows retain the existing extra insertion initialization flush. Inspect final DOM/output and lifecycle after each window, retain 240 batch samples, and separately record the RAF interval. Do not claim that eight commits fit into one display interval: the RAF loop will naturally expose missed/long intervals.

Use the same calibrated-clock method and unchanged denominator floor (`5 * max(preregistration quantum, both paired page quanta)`). A sample is one eight-step batch; compute per-page medians and p95 over the 240 batch durations and pair on page-level metrics. Keep the same ≤0.80 median geometric-mean gate at two or more sizes, ≤1.10 median paired p95 gate at every size, and zero-exclusion/all-pages-valid rule. Do not divide batch time by eight before applying the clock floor; ratios use observed batch durations. If a batch median denominator is below the frozen floor, mark that pair unresolved under the existing rule. Do not relax the speed gate after seeing results.

This registration can answer only whether the named native and React builds differ for eight synchronous state-to-host commits per RAF callback, including the existing structural cases. It cannot support a single-update/ordinary-frame claim, real display refresh throughput, input-to-photon latency, or a general React comparison. The unchanged product confirmation remains the evidence for the original one-step-per-RAF workload. Both registrations still include generic publication work on structural/mixed frames.

## Minimal next execution sequence

1. Have the primary reviewer approve this registration plan and choose whether the high-frequency study is worth a separate harness registration.
2. Freeze/build the current-kernel production package and compiler proof in new paths; run focused correctness and actual-authored TSX execution proof without changing the workload.
3. Collect and independently verify a six-page pilot on that exact build/engine.
4. Adapt the old confirmation toolchain into new, versioned files/output directory. Keep its schedule, measurements, clock floor, gates, and no-rerun rule unchanged; add locks for every current kernel/build/proof/pilot input.
5. Review/freeze all collection tools and inputs, launch the preview through Portless, collect once, then analyze and independently verify. Only after that should anyone register the optional high-frequency harness as its own experiment.
