# Native 128 pilot — stopped at first failure

## Result

The approved original/native/128 collector invocation failed before navigation. Its immutable run record is `../runs/original-native-128-1791945769047-97cdb0d3-eb67-4932-ae3d-37fe979b3330/record.json`. The record has status `FAIL`, no browser result or samples, and no cleanup errors. Playwright attempted to launch headless Chromium PID 81041, but Chromium aborted; the launch log includes `kill EPERM`. The command exited 1. Its stdout, stderr and exit code are preserved here.

The stop-on-first-failure rule was applied. No `off`, `on`, `count`, or analyzer invocation ran. No timing measurements are reported. A later retry would require a separately reviewed run after the browser process-launch blocker is addressed.

## Route and source integrity

The original frozen preview and diagnostic preview both returned HTTP 200 with exact locked HTML/CSS/JS hashes before collection. Original session `60894` used Portless app port 4136; diagnostic session `43361` used app port 4088. Both were stopped with Ctrl-C and exited 130. The exact HTTPS preview URLs returned proxy 404 after cleanup. The shared Portless proxy remains available; pre-existing unrelated aliases are preserved. No cleanup/prune command was used.

All 287 frozen tooling/snapshot/manifest input hashes still match their pre-build snapshot, and the diagnostic build lock SHA-256 remains `68fefba20876c02c0e2013699c64d4b31eb4deb6d02b3abbacb2fde09f798372`. The pre-collection served-asset hash receipts are `original-readiness-assets.json` and `diagnostic-readiness-assets.json`; cleanup and input checks are in `cleanup-and-integrity.json`.

The failure indicates the current execution sandbox cannot complete Playwright's Chromium launch/cleanup (`kill EPERM`). The collector uses the pinned project `vitexec/cli` ESM `openBrowser` entry and had Node v24.18.0. No source, build, tooling, lock, fixture, or shared route was changed by collection.
