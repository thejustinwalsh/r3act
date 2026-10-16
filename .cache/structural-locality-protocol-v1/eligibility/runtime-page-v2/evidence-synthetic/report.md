# Runtime page v2 synthetic and syntax gate

## Commands and exits

All four commands ran sequentially with pinned Node v24.18.0 and `login:false`; every command completed immediately with terminal exit 0 and no live session handle. No retries were needed.

1. `/Users/tjw/.nvm/versions/node/v24.18.0/bin/node --check .cache/structural-locality-protocol-v1/eligibility/runtime-page-v2/collect-once.mjs` — exit `0`, stdout 0 B, stderr 0 B.
2. `/Users/tjw/.nvm/versions/node/v24.18.0/bin/node --check .cache/structural-locality-protocol-v1/eligibility/runtime-page-v2/served-map-fetch.mjs` — exit `0`, stdout 0 B, stderr 0 B.
3. `/Users/tjw/.nvm/versions/node/v24.18.0/bin/node --check .cache/structural-locality-protocol-v1/eligibility/runtime-page-v2/check-served-map-fetch.mjs` — exit `0`, stdout 0 B, stderr 0 B.
4. `/Users/tjw/.nvm/versions/node/v24.18.0/bin/node .cache/structural-locality-protocol-v1/eligibility/runtime-page-v2/check-served-map-fetch.mjs` — exit `0`, stdout 55 B, stderr 0 B.

The synthetic command's exact stdout was `served-map Fetch status and hash synthetic checks PASS\n`; stderr was empty. The first three syntax checks produced empty stdout and stderr.

## What passed

The one synthetic invocation exercised the same `fetchServedMaps` helper imported by the page collector with a matching HTTP 200 response, an HTTP 404 rejection, and a body hash mismatch rejection. It also checked that the collector passes the helper to `page.evaluate`, and performed narrow declaration-pattern assertions for Playwright `Response.status()` / `ConsoleMessage.location()` methods and Fetch `Response.status` numeric property.

Those declaration assertions are **not a full TypeScript typecheck**. These gates do not execute the browser page, prove product runtime correctness, locality, or performance. No server or browser was started, and the previous failed page report remains preserved unchanged.

## Preservation audit

- All six reviewed handoff hashes matched before and after: runner lock `e987002aac834c292a8d1d7b5c25880a1aefb9e7a752b365f6cd82500b24eabe`, five runner sources, including the failed-page manifest.
- Both pinned API declaration files matched before and after.
- All 13 failed-page preservation entries matched before and after.
- All 424 v2 locked inputs, all 31 v1 preservation files, the build report, compiler binary and local assets matched before and after.
- All 126 files across the qualified baseline, CPU diagnostic profiles, and archived source/build comparison matched before and after.

Full per-file manifests and raw receipts are in `before.json`, `after.json`, and `invocation.json`; raw stdout, stderr and exit files for each command are alongside them.
