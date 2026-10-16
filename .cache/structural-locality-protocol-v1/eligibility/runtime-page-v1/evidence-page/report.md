# Runtime page v1: single N=128 attempt

## Outcome

The single approved headless, GPU-disabled fresh-context page **did not reach the runtime gate**. The collector terminated with exit 1 and recorded `FAIL`. Chromium 153.0.8010.12 navigated to the exact Portless HTTPS origin and received HTTP 200 for HTML and JavaScript; both executed-response SHA-256 values matched the frozen v2 artifact inventory. Before invoking the gate, the collector's map-fetch evaluator threw `TypeError: response.status is not a function` at `collect-once.mjs:178`; browser Fetch exposes `Response.status` as a property. Thus `result` is null and `trace` is empty. No retry was run.

The collector also recorded one console error (`Failed to load resource: the server responded with a status of 404 ()`); the report does not identify its URL. `pageErrors`, `requestFailures`, `responseErrors`, and `cleanupErrors` are empty. The page report is preserved at `../page-report.json` relative to this directory (SHA-256 `18e287515a81943aded3a7b5b7f0a15c0b8ecb48fda23b27863aa4b694eeab56`).

## Preview and cleanup

The first escalated Portless launch routed to allocated port 4901 while its wrapped Vite child listened on Vite's default 4173, so the owned URL returned 502. I stopped only that owned launch, verified its route/listener were down, then restarted the same v2 preview through Portless with the Vite CLI directly and pinned Node 24 on PATH. Portless injected its allocated port 4948; the exact nested build HTML returned HTTP 200 over trusted HTTPS. No source/config/build files changed.

After the page completed, I stopped only the corrected preview. Portless route `structural-locality-runtime-gate-v2` is absent; listeners 4948, 4901, and 4173 are down. Shared proxy PID 43235 remains on 1355, and the three unrelated yacht aliases remain registered. Initial default-sandbox Portless EPERM, both preview lifecycle receipts, readiness response, and final route/listener state are retained in `portless-lifecycle.json` and `portless-default-sandbox-failure.json`.

## Preservation

- Runner-lock, collector, and README matched their reviewed hashes before/after.
- All 424 v2 inputs, all 31 v1 preservation files, the v2 build report, compiler binary, and local build assets matched before/after; original evidence files remained unchanged.
- Full receipts: `before.json`, `after.json`, `collector-invocation.json`, `portless-lifecycle.json`, `collector.stdout.log`, `collector.stderr.log`, `collector.exit-code`, and `portless-default-sandbox-failure.json`.

## Interpretation

This attempt proves the correct frozen HTML and JavaScript were served over Portless HTTPS. It establishes **no runtime correctness or delta-path result** because the collector failed before calling `window.__structuralRuntimeGate.run()`. It makes no locality or performance claim. Further work requires fixing and reviewing the collector before any new page attempt.
