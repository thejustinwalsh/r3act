# Structural runtime page gate: served-path correction

**Prepared only.** The v2 build passed and its source, binary, and local artifacts are frozen; runtime behavior remains **UNVERIFIED**. Vite emitted one HTML artifact at a nested path under `runtime-gate-v2/dist/`. The v2 collector assumed `/index.html` at the origin root, so this separate page runner reads the exact HTML path from the frozen build report and navigates there. It derives the JavaScript and source-map paths from those same artifact records. It makes no build or compiler change and does not copy modules into a second runtime instance.

`runner-lock.json` pins this collector and README plus the v2 input lock and build report. The collector verifies its own source hashes, runner lock self-hash, all 424 v2 locked inputs, the 31-file v1 preservation manifest, compiler binary, local HTML/JS/map assets, and build report before and after the page. It requires the exact trusted Portless HTTPS `.localhost` origin, including the returned port. It captures and hashes the first served HTML and JS response bodies before invoking the page, fetches maps separately, records browser version and fixed viewport, and keeps the reviewed 90-second stop, signals, bounded cleanup, exclusive report, and failure trace. The page remains the single N=128 correctness/path gate with no timing or locality claim.

After primary reviews this source and authorizes one page, Luna loads the `portless-dev-servers` skill and starts the **existing v2 build** preview from the repository root, `login:false`:

```sh
portless run --name structural-locality-runtime-gate-v2 /Users/tjw/.nvm/versions/node/v24.18.0/bin/node node_modules/vite/bin/vite.js preview --config .cache/structural-locality-protocol-v1/eligibility/runtime-gate-v2/vite.config.ts
```

Luna uses the actual HTTPS origin printed by Portless, such as `https://structural-locality-runtime-gate-v2.localhost:1355` when that is what Portless returns, in exactly one collector command:

```sh
STRUCTURAL_RUNTIME_GATE_ORIGIN="<exact Portless HTTPS origin>" /Users/tjw/.nvm/versions/node/v24.18.0/bin/node .cache/structural-locality-protocol-v1/eligibility/runtime-page-v1/collect-once.mjs
```

The angle-bracket text is a placeholder to replace, not a literal origin. The collector writes only `runtime-page-v1/page-report.json`; preserve failures and stop only the preview process started for this gate. No retry, benchmark matrix, or performance conclusion is part of this stage.
