# Recording B deterministic model source gates

## Result

All four authorized Node 24.18.0 commands returned tool-reported exit code 0:

1. `node --check .../model/schedule.mjs`
2. `node --check .../model/model.mjs`
3. `node --check .../model/check-model.mjs`
4. `node .../model/check-model.mjs` — output: `Recording B deterministic schedule/model synthetic checks PASS`

Each command was issued separately as a raw process invocation, without a shell status wrapper. Exact command, tool result, exit code, stdout/stderr, and process metadata are retained in the four `*.tool-result.json` receipts.

The synthetic is a model/source gate only. Its documented scope covers the independent array oracle for the 12 operation kinds at sizes 128, 1024, and 10000; five paired schedules; and 120 lifecycle trials at size 128, including reset deselection/preselection and incarnation expectations. These are deterministic model assertions, not browser observations. No build, server, browser, timing, benchmark, count-page, instrumentation, or product runtime check was run.

## Preservation

The before/after audit covered 644 protected files. All remained unchanged, all expected hashes matched, and the model self-lock matched `0f50718e3b6d86ba86784dc4fcc1193c4dcbbb34d5220b324ae60efd0078096f`. This included both preserved pre-review attempts and manifests, immutable context copies and provenance, the original 413-input evidence, v2's 424 inputs, prior compiler/build/assets, runtime-page-v1 failure evidence, runtime-page-v2 pass evidence, synthetic receipts, and original 126 evidence files. The prior wrapper-failure receipts under `model/evidence/` were unchanged. See `before.json` and `after.json` for per-file hashes and exact gate outputs.

## Capture history and limits

The prior attempt in `model/evidence/` remains preserved: a shell wrapper failed on zsh's read-only `status` variable, so that attempt's Node exit is unknown. This corrected sequence is separate and passed.

The capture-only post-audit first looked for the model-source receipt at the wrong evidence path and returned ENOENT. The receipt had been written under a nested directory by a path-construction typo; it was moved into the intended owned evidence directory, then the post-audit completed. No gate was rerun and no protected file changed.

These gates establish syntax validity and that the deterministic model checks passed for their documented cases. They do not establish runtime correctness, actual host/DOM lifecycle behavior, optimized-path execution, locality, latency, full-matrix fit, or a physical selection.
