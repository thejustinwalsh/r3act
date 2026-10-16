# Structural runtime page: map-fetch diagnostic repair

**Prepared, not executed.** The first page reached the frozen v2 HTML and JavaScript with matching initial response hashes in Chromium `153.0.8010.12`. It failed before invoking `window.__structuralRuntimeGate.run`: the in-page Fetch `Response.status` number was called as a function during source-map verification. Its console also recorded one 404 without URL or location, so that 404 is **UNATTRIBUTED** in the preserved record. The original page, v2 build, 424-input lock, 31-file v1 build manifest, binary, and assets remain unchanged. `failed-page-preservation.json` locks the completed failed-page source, report, and evidence.

This new collector imports one self-contained `fetchServedMaps` function, calls it directly through Playwright `page.evaluate`, and exercises that same function in a dependency-free synthetic check with numeric Fetch statuses 200 and 404 plus a hash mismatch. Pinned local declarations support narrow API-surface assertions: browser Fetch `Response.status` is a number while Playwright `Response.status()` and `ConsoleMessage.location()` are methods. These assertions are not a full collector typecheck. The collector records every response URL/status and console error location/type. Before navigation, it intercepts only the exact same-origin `/favicon.ico` request with diagnostic 204 and records the interception; an unrelated 404 or console error still fails with its URL/location. The HTML, JS, and map hashes, N=128 page assertions, 90-second cap, signals, headless/GPU settings, bounded cleanup, and exclusive report behavior remain intact. This is a harness repair, not product or performance evidence.

After primary review, Luna runs the **synthetic/static gate first**, from the repository root with `login:false`. Do not launch a server for this command:

```sh
/Users/tjw/.nvm/versions/node/v24.18.0/bin/node --check .cache/structural-locality-protocol-v1/eligibility/runtime-page-v2/collect-once.mjs
/Users/tjw/.nvm/versions/node/v24.18.0/bin/node --check .cache/structural-locality-protocol-v1/eligibility/runtime-page-v2/served-map-fetch.mjs
/Users/tjw/.nvm/versions/node/v24.18.0/bin/node --check .cache/structural-locality-protocol-v1/eligibility/runtime-page-v2/check-served-map-fetch.mjs
/Users/tjw/.nvm/versions/node/v24.18.0/bin/node .cache/structural-locality-protocol-v1/eligibility/runtime-page-v2/check-served-map-fetch.mjs
```

Only after reviewing those receipts may primary authorize one corrected page. Luna then loads `portless-dev-servers` and starts the **existing v2 dist** with the actual Vite CLI so Portless injects its chosen port; preserve the exact HTTPS origin it prints (including `:1355` if present):

```sh
PATH="/Users/tjw/.nvm/versions/node/v24.18.0/bin:$PATH" portless run --name structural-locality-runtime-gate-v2 node_modules/.bin/vite preview --config .cache/structural-locality-protocol-v1/eligibility/runtime-gate-v2/vite.config.ts
```

The single later page command, `login:false`, uses that origin:

```sh
STRUCTURAL_RUNTIME_GATE_ORIGIN="<exact returned Portless HTTPS origin>" /Users/tjw/.nvm/versions/node/v24.18.0/bin/node .cache/structural-locality-protocol-v1/eligibility/runtime-page-v2/collect-once.mjs
```

The placeholder must be replaced; the runner writes only `runtime-page-v2/page-report.json`. There is no rebuild, automatic retry, latency trial, matrix, or performance conclusion.
