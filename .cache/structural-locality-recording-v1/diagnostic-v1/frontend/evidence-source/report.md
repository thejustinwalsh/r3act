# Recording B frontend static and analyzer synthetic gates

## Result

All five README-authorized commands ran sequentially with pinned Node `v24.18.0`, `login:false`, and direct tool exit capture. Each returned exit code 0:

1. `--check frontend/build-gate.mjs`
2. `--check frontend/collect-once.mjs`
3. `--check frontend/receipt-analyzer.mjs`
4. `--check frontend/check-receipt-analyzer.mjs`
5. `node frontend/check-receipt-analyzer.mjs` — output: `Recording B receipt analyzer synthetic checks PASS`

Each exact command, tool result and returned output is retained in the corresponding `*.tool-result.json` receipt.

The synthetic accepts a valid 120-edit count receipt and a valid probe-off receipt. It rejects 19 mutated count cases, including missing trials, incomplete receipts, wrong units/sites, wrong per-operation or single-call values, invalid collection version/flush/pending state, reader/batch/listener errors, missing-as-zero, identity loss, timing fields, fallback route, coverage-ID mismatch, missing required sites and invented bucket statistics. This exercises analyzer rules on synthetic records; it does not exercise the browser collector or runtime.

## Preservation audit

The revised frontend lock SHA is `9e4de310288b4c342039a67b7e25fa32646dbf30f1ad2227828fc9aae99015ec` and contains 767 locked inputs. Before/after preservation covered 2,181 file/hash entries, including all locked inputs, diagnostic snapshot and manifests, source patch and coverage docs, the archived pre-protocol frontend draft, accepted model/evidence, original 413 inputs, eligibility v2 424 inputs and assets, original 126 evidence files, and prior page failure/pass receipts. All expected hashes matched and all audited files remained unchanged. See `before.json` and `after.json` for per-file records and gate outcomes.

No frontend implementation, probe snapshot, live runtime source, lockfile, compiler, build output, or prior evidence was changed. No build, server, browser, count window, timing, matrix, or performance check was run.

## Evidence limits

These commands establish frontend tooling syntax validity and receipt-analyzer behavior against synthetic inputs. They do not prove build transforms, emitted assets, source-map identity, browser behavior, runtime probe counts, 90-second page fit, performance, or correctness of the actual mounted application. A separately reviewed build gate remains unrun.
