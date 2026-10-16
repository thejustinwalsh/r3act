# Tooling gates

## Synthetic protocol

**PASS** under pinned Node v24.18.0. The synthetic protocol completed in 0.104 seconds with exit code 0. Exact stdout/stderr are in `synthetic.stdout.log` and `synthetic.stderr.log`.

## Diagnostic Vite build

**FAIL; stopped at this gate.** The README command was executed once under PATH-pinned Node v24.18.0. Process PID 62328 exited 1 (not still running). Vite failed while loading the snapshot config: `snapshot/compiler/vite_native_plugin.ts` imports `./host_jsx_declarations.ts` at lines 6 and 8, but the module could not be resolved. Raw process output is retained in `build.stdout.log` and `build.stderr.log` (stderr SHA-256 `283493b35dceb04098f4f05c176c4a4284a5a8a73208e570b80b12660730b2a5`). `build-lock.mjs` was not run. No lock was produced; build output directory exists: `False`.

No repair or retry was attempted. The failure remains available for Sol/primary review.

## Integrity

The snapshot tree, tooling tree, and source manifest had identical before/after hashes (`f60ce2109961b4be86b5ea5a290ed158f02b1ba9aa643e5a74fc755cd7b84dfb` for the manifest); no frozen inputs changed during the synthetic gate or failed build. The full per-file manifest and process records are in `before.json`, `after-synthetic.json`, `after-build.json`, and `gate-status.json`. No preview, server, network fetch, browser, or Cargo build was run.
