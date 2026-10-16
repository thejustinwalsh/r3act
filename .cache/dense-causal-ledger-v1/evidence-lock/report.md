# Evidence lock report

## Verification result

- The immutable headless qualification is **data verified, qualification failed**. The locked receipt records 30 pages, 15 pairs and 7,200 measured frames. Both parity and stronger-dense-win gates failed at every registered size; keep these failures intact.
- The pre-adjacent-token baseline source snapshot is recoverable. Its 397-file source/build lock matches every file in the project-root-relative confirmation archive. The archive has 944 files and matches its own 944-entry SHA-256 lock. I checked the archive member stream without extracting it.
- Compared with the live tree, exactly one of 397 baseline-locked files differs: `src/vdom_snapshot_runtime.ts`. The baseline file is `00d8516d2164d1f212e804dd3a579bc13588158eb361e756e2ebd25753b73aab` and the live file is `cdc774b77a5938ce684537dc5f026bef7622a1fbba073bf2f95a01566275a58d`. The only diff is adjacent token reuse in `#executePreparedNumericRows`: one previous-token/record pair is reused when consecutive dirty rows share a prepared program, avoiding the repeated WeakMap lookup. The qualified build predates that patch.
- The archived build04 production directory still exists. All five served assets match the hashes frozen in `frozen-config.json`; its build proof hash/status match the frozen candidate. The same build can be reproduced as an exact asset set by serving the existing `dist` at the frozen HTTPS origin. A rebuild has not been run or qualified.
- Existing profile artifacts include two whole-page diagnostics at 1,024 rows. They include initialization, warmup, measurement, inspection, disposal and stale-setter checks; they do not provide matched instrumentation-off/on control or authored-phase cost. The README's statement that the runner has not been invoked is stale. Preserve the records, but do not infer phase fractions from them.

## Frozen fixture and boundaries

Contiguous homogeneous DOM rows, all dirty, sizes 128 / 1,024 / 10,000; native TSX/OXC and React TSX/React Compiler arms; five paired fresh-page runs per size. Each page has 60 warmup and 240 measured frames. The timed interval is synchronous setter dispatch plus commit. RAF wait, selection, DOM inspection, paint and presentation are excluded. Headless Chromium 153.0.8010.12, GPU disabled, 1200×900; each pair had a 90-second deadline. The denominator floor is five times the maximum of the preregistered 0.005 ms quantum and the four adjacent calibration readings. Preserve under-floor observations as unresolved.

The exact ratio summaries are retained in `results/current-owner-kernel-headless-v1/receipt.json` and copied into `evidence-lock.json`; no new measurement was made.

## Paths and replay

- Raw canonical records: `results/current-owner-kernel-headless-v1/` (30 `sequence-*.json` page records, 15 `pair-*.json`, 60 before/after calibrations, plus registration/config/analysis/verification/receipt); every copied-file hash in the receipt matches.
- Raw archival mirror: `.cache/current-owner-kernel-headless-20261013-v1/raw/`.
- Build04 exact assets: `.cache/high-frequency-build-proof-20261013-04/dist/`; locked origin: `https://react-runtime-headless.localhost:1355`; proof: `.cache/high-frequency-build-proof-20261013-04/build-proof.json`.
- Source baseline archive: `implementation/2026-10-13-current-kernel-headless-confirmation/source-build-comparison-and-diagnostics.tar.gz`. It is rooted at project-relative paths. If a source checkout is needed, extract into a new isolated disposable directory only. Do not unpack onto the live tree.
- Tool paths observed: Node `/opt/homebrew/bin/node` (v26.7.0), Deno `/opt/homebrew/bin/deno` (deno 2.6.3 (stable, release, aarch64-apple-darwin)), pnpm `/Users/tjw/.nvm/versions/node/v24.18.0/bin/pnpm` (11.25.0). No build or run command was executed.

## Recording A control requirement

The historic uninstrumented result remains immutable and useful as the qualification decision record, but it cannot alone be the instrumentation-overhead control. The upcoming evidence run must source-lock a fresh original baseline and diagnostic-off/on controls separately, with explicit source/build distinctions. Do not merge whole-page CPU samples into phase timings; preserve every failure and keep diagnostic timings separate from qualification.

Full expected/live hashes and raw evidence hashes are in `evidence-lock.json`.
