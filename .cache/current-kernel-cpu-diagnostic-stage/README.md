# Current owner-kernel CPU diagnostic

This is a separate whole-page CPU attribution tool for the immutable build04
already described by `current-owner-kernel-headless-20261013-v1/frozen-config.json`.
It does not modify the frozen timing study or its records and defines no ratios,
performance gates, or qualification status.

The runner accepts one explicit arm and one fixed row count per invocation. It
does not loop across arms or sizes:

```sh
node .cache/current-kernel-cpu-diagnostic-stage/profile-one-arm.mjs \
  --arm native --rows 1024
node .cache/current-kernel-cpu-diagnostic-stage/profile-one-arm.mjs \
  --arm react --rows 1024
```

The caller is responsible for ensuring the already-approved Portless preview
serves the locked build04 at the origin in the frozen config. This preparation
does not launch that preview or either run. Each invocation creates a unique
directory under `runs/`, validates frozen source/build and production asset
hashes before opening a browser, then uses a headless browser with GPU disabled
and a 1200×900 viewport. It stops at 90 seconds or on SIGINT/SIGTERM and writes
a receipt even when the page or profile fails. The raw V8 profile is saved as
`profile.cpuprofile`; `record.json` holds the full harness result, checks,
lifecycle snapshots, response hashes, browser details, script IDs and source
hashes. Only script sources whose URLs match one of the locked production JS
assets are requested through CDP `Debugger.getScriptSource`.

The sampled interval spans page navigation through application initialization,
60 warmup frames, 240 measured frames, per-frame DOM inspection, correctness
checks, disposal, and stale-setter checks. The harness's `commitMs` values are
retained as correctness-study output only; this tool does not analyze them.
Whole-page CPU samples include harness work, layout, frame inspection, lifecycle
work, and browser runtime activity. Production bundles have no source maps, so
function names/locations and captured minified source support bundle-level
inspection only. They do not establish authored TypeScript locations, exact
phase cost, causality, or a performance verdict.

Only syntax checks were run while preparing this tool. The runner itself has not
been invoked.
