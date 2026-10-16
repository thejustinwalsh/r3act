# Structural locality: one-page runtime eligibility gate

**Prepared only.** This stage uses the unchanged stateful/effectful authored native collection, native generic-array, and React array fixtures from `../`. Its native and React controllers are actual TSX modules in the **same Vite bundle** as their boards, so the native component registry and root share one runtime module instance. It reuses only the source-proven Rust/OXC binary with SHA-256 `74396ae694aa6203cc4d4b4900c3458ca31e25e9638c73160b51bcb4aede79c8`; `input-lock.json` contains the original 413 source entries plus this stage and the corrected prior verifier report. The prior failed build remains untouched. The first reviewed handoff and its 424-entry lock are preserved under `attempts/pre-collector-review/`.

The fixed N=128 page mounts each arm separately. It selects retained `row-2` and moving `row-0` through real click handlers, then moves `row-0` to the tail, inserts `fresh-head` at the head, removes that insertion, and removes old tail `row-127` while inserting `edge-new` at the head. Each committed step checks ordered `li` ID/text/selection output, retained DOM node identity and selected state, removed/inserted effect lifetimes, and matched settled output across arms. Final disposal checks empty DOM, mount/cleanup cardinality, exact setter unregistration, native owner count, and collection reader count. React owner/reader internals and generic reader count are not claimed. Native path evidence is the existing per-flush `collection.delta-operations` counter (1, 1, 1, 2), with existing render/stale/expired fallback counters required to be zero; clicks happen before each edit counter window. This single size cannot establish locality, latency, or asymptotic complexity. A compiler bail or runtime fallback is a reported failure; do not alter fixture state/effects to pass.

After primary review, Luna runs **one** build gate from the repository root, `login:false`:

```sh
/Users/tjw/.nvm/versions/node/v24.18.0/bin/node .cache/structural-locality-protocol-v1/eligibility/runtime-gate-v1/build-gate.mjs
```

It verifies the full locked source list before and after, uses the public composed `nativeModulePlugin` and explicit React Compiler allowlist, captures transformed source, records source/binary and output hashes, and writes `build-report.json` plus separate Vite stdout/stderr. It refuses previous dist/proof/report/log outputs. The build uses the same pinned binary and new output paths; it does not rebuild Rust or overwrite the old build. The report only establishes local build provenance, not execution. Primary must inspect captured controller/fixture transforms, collection/state/effect IDs, React memo calls, maps, and report before a browser page is authorized.

Only after that review, Luna loads the `portless-dev-servers` skill and starts the project preview through Portless from the repository root, retaining the server session:

```sh
portless run --name structural-locality-runtime-gate /Users/tjw/.nvm/versions/node/v24.18.0/bin/node node_modules/vite/bin/vite.js preview --config .cache/structural-locality-protocol-v1/eligibility/runtime-gate-v1/vite.config.ts
```

Then Luna runs exactly one headless, GPU-disabled, fresh-context page with a 90-second cap, `login:false`:

```sh
STRUCTURAL_RUNTIME_GATE_ORIGIN=https://structural-locality-runtime-gate.localhost /Users/tjw/.nvm/versions/node/v24.18.0/bin/node .cache/structural-locality-protocol-v1/eligibility/runtime-gate-v1/collect-once.mjs
```

The collector checks all 424 locked sources, its own script, the build report, compiler binary and local assets before and after the page. It requires a trusted Portless HTTPS `.localhost` origin and records the browser version, fixed viewport, navigation response and initially executed HTML/JS response hashes. Maps are fetched separately and labeled as such. Browser opening and work race the 90-second stop; SIGINT/SIGTERM and the deadline stop the owned browser, and bounded cleanup failures make a passing page fail. Page, console, network, trace and cleanup errors are retained in an exclusive `page-report.json`. Luna stops only this preview session afterward and preserves all receipts. No timing trials, full operation matrix, extra pages, new runtime counters, runtime optimization, or physical design choice are authorized here.
