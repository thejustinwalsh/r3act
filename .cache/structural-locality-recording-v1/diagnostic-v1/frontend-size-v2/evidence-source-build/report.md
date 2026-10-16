# Recording B frontend-size-v2 source and build gates

## Gate results

The five authorized source gates all passed, run sequentially with pinned Node 24.18.0 and `login:false`:

| Gate | Command | Exit |
|---|---|---:|
| 1 | `node --check .../frontend-size-v2/build-gate.mjs` | 0 |
| 2 | `node --check .../frontend-size-v2/collect-once.mjs` | 0 |
| 3 | `node --check .../frontend-size-v2/receipt-analyzer.mjs` | 0 |
| 4 | `node --check .../frontend-size-v2/check-receipt-analyzer.mjs` | 0 |
| 5 | `node .../frontend-size-v2/check-receipt-analyzer.mjs` | 0 |

The synthetic emitted `Recording B size-v2 receipt analyzer synthetic checks PASS`. It exercises valid count/off receipts at sizes 128, 1024 and 10000, including the broad filter's K=N/2 operations, and 27 rejection mutations for wrong/incomplete edit count, size/schedule, duplicate/reordered trace IDs, digest, disposal/identity/lifecycle, count/site/unit, commit/settled state, retained batches/listener errors, missing-as-zero, fallback route, and forbidden timing. This validates the synthetic analyzer cases only.

The single conditional build command also exited 0:

`/Users/tjw/.nvm/versions/node/v24.18.0/bin/node .cache/structural-locality-recording-v1/diagnostic-v1/frontend-size-v2/build-gate.mjs`

The gate report status is `BUILD_PROVENANCE_PASS_PAGE_UNVERIFIED`; its Vite command exit is 0, stderr is empty, hook capture has no build-end/close-bundle/capture errors, `errors` is empty, and `originalBuildError` is null. No server or browser page ran.

## Provenance and generated output

The size-v2 input lock is SHA-256 `aa1852e77e6d142ed94111dafcf74f8365e32f3bc48142a19be288b6e64a1724`; all 813 listed inputs matched before and after. The build report records 813 matching pre-build and 813 matching post-build source audits. All 2,181 prior v1 evidence entries, both accepted N=128 count/off reports, and 21 individually inventoried count/off report/evidence files remained unchanged. The existing v1 build report, compiler binary and built HTML/JS/map hashes remained exact. Full path-level inventories are in `before.json` and `after.json`.

All three authored fixture transforms are byte-identical to the accepted N=128 build:

- `native_collection.tsx`: `80ae32b93e897ec7d62d4add2c575e1d90aac6add7ee8bfebf6ec6fc872b5c09`
- `native_generic.tsx`: `afe671d41bf8aa1ab87716d7ad2e943d9cc9ee5e249f724f13be5bbb042fabbf`
- `react_array.tsx`: `dbc5ec9463c49d41fd2512086d03aecc8225eafe15632d644019e42a9819335e`

The copied native controller source is also unchanged from the N=128 page (`aa1fc4a78c9ebb88796620c50c44d56974a0af2a0c5faa442b3a9e744ed51730`). Its generated controller output has the expected stage-local component IDs: `.cache/structural-locality-recording-v1/diagnostic-v1/frontend-size-v2/native_controller.tsx#component:NativeCollectionMount` and `...#component:NativeGenericMount`, in place of the corresponding `/frontend/native_controller.tsx#component:...` IDs. Replacing the old stage path with the size-v2 stage path in the prior emitted controller makes the output byte-identical; all seven occurrences reflect this path change. The 56-byte output increase is exactly seven replacements of an eight-byte-longer stage prefix. This is expected provenance drift, not a fixture change.

React Compiler AST proof found `ReactRow: 8` and `ReactArrayBoard: 12` memo slots, using the installed Babel 7.29.7 parser. The source map contains 30 sources, including the 16 snapshot runtime modules and authored fixtures/controller/model/analyzer; it contains no live runtime `src/` source. The binary is the previously locked compiler at SHA-256 `74396ae694aa6203cc4d4b4900c3458ca31e25e9638c73160b51bcb4aede79c8`. New local outputs and hashes are listed in `after.json` and the gate's `build-report.json`.

## Limits and preserved audit receipt

This proves finite source/synthetic gate behavior and local build/transform provenance. It does not prove page execution, runtime correctness, count validity at new sizes, timing, or performance. No runner lock, server, browser, count page, latency page, source edit, or retry was made.

One independent bookkeeping audit attempt failed before writing its after receipt because its Python `Path.relative_to` call mixed a relative artifact path with an absolute root. The exact exception is preserved in `after-audit-attempt-1-failure.json`; it did not modify frozen files or rerun the build. The corrected independent audit is `after.json`.

## Receipts

- Commands and raw tool exits: `gate-01-build-gate-syntax.json` through `gate-06-build.json`.
- Before/after inventories and artifact checks: `before.json` and `after.json`.
- Full compiler gate output/proof: `../build-report.json`, `../proof/`, `../vite.stdout.log`, `../vite.stderr.log`.
