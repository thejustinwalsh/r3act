# Recording B finite size correctness/count gate

**Prepared, unexecuted.** This isolated stage generalizes the accepted N=128 count and probe-off page to registered sizes 128, 1024, and 10000. The original `frontend/` source, build, assets, count/off reports and evidence stay immutable. This stage reuses the unchanged authored native, generic and React fixtures, diagnostic runtime snapshot, model/schedule, and verified Rust compiler binary. The copied `native_controller.tsx` has identical source bytes to the N=128 stage; its generated component site path will differ because the module path differs. No compiler/runtime API, workload, or runtime optimization changes are made.

`entry.ts` takes an explicit size, builds the same 120-trial, 12-kind schedule (two warmups and eight measured for each kind), restores canonical order on the same root, applies explicit reset-selection/preselection actions outside each count window, and retains exact public collection apply plus one synchronous flush inside it. Every edit checks order, selected state, DOM node identity, mount/cleanup lifetimes, actual apply version, flush result, pending work, collection reader/batch/listener state, and route counts. The fixed row-2 sentinel remains selected. The odd-key filter retains K=N/2 public removes; all seven required count sites retain exact 1/1/K×5 obligations. The browser receipt analyzer checks all 120 ordered unique trace IDs, each digest/route, separate final disposal with zero children/resources, schedule/size, identity, and no timing fields. The synthetic receipt check covers all three sizes and wrong-size/schedule/trace/identity/K/commit mutations. No samples or operations are dropped.

The stage keeps the accepted public `nativeModulePlugin`, explicit eligible React Compiler allowlist, snapshot-only Vite alias, native JSX wrapper authoring, AST memo proof, source-map proof, and frozen eligible fixture transform hashes. The Vite React exclusion points to `frontend-size-v2/native_controller.tsx`. One fresh stage-local build writes exclusive `dist/`, `proof/`, logs and build report. `input-lock.json` includes all 767 prior frontend input entries and hashes for the accepted count/off page receipts, prior build assets and concise evidence receipts, plus this stage's new source and the same binary provenance. The build gate checks that all prior 767 entries remain identical, both accepted N=128 page reports retain their PASS statuses, and all new locked inputs match before/after. It does not depend on a live mutable checkpoint.

**Finite handoff, after primary source review.** Luna alone runs one source gate sequence, with pinned Node 24.18.0, and then one isolated build gate if it passes:

```sh
/Users/tjw/.nvm/versions/node/v24.18.0/bin/node --check .cache/structural-locality-recording-v1/diagnostic-v1/frontend-size-v2/build-gate.mjs
/Users/tjw/.nvm/versions/node/v24.18.0/bin/node --check .cache/structural-locality-recording-v1/diagnostic-v1/frontend-size-v2/collect-once.mjs
/Users/tjw/.nvm/versions/node/v24.18.0/bin/node --check .cache/structural-locality-recording-v1/diagnostic-v1/frontend-size-v2/receipt-analyzer.mjs
/Users/tjw/.nvm/versions/node/v24.18.0/bin/node --check .cache/structural-locality-recording-v1/diagnostic-v1/frontend-size-v2/check-receipt-analyzer.mjs
/Users/tjw/.nvm/versions/node/v24.18.0/bin/node .cache/structural-locality-recording-v1/diagnostic-v1/frontend-size-v2/check-receipt-analyzer.mjs
/Users/tjw/.nvm/versions/node/v24.18.0/bin/node .cache/structural-locality-recording-v1/diagnostic-v1/frontend-size-v2/build-gate.mjs
```

Build success proves generated assets and compiler source provenance only. After primary review, create a small stage-local `runner-lock.json` from the accepted build report and the existing finite direct runner dependency/API basis. Before any preview, load `$portless-dev-servers`; launch the actual Vite CLI through Portless with no fixed port:

```sh
PATH="/Users/tjw/.nvm/versions/node/v24.18.0/bin:$PATH" portless run --name structural-recording-size-v2 node_modules/.bin/vite preview --config .cache/structural-locality-recording-v1/diagnostic-v1/frontend-size-v2/vite.config.ts
```

Only after separate approval, one N=1024 count page may use the exact returned Portless HTTPS origin:

```sh
STRUCTURAL_DIAGNOSTIC_MODE=count STRUCTURAL_DIAGNOSTIC_SIZE=1024 STRUCTURAL_DIAGNOSTIC_ORIGIN="<exact Portless origin>" /Users/tjw/.nvm/versions/node/v24.18.0/bin/node .cache/structural-locality-recording-v1/diagnostic-v1/frontend-size-v2/collect-once.mjs
```

A single N=10000 count page requires a further review and approval after N=1024. Each page has its own exclusive `page-report-count-n<size>.json`, 90-second cap, headless GPU-off browser, exact initial HTML/JS response and map hashes, source/build/binary audits, and bounded owned cleanup. The collector stops on any timeout, unsupported route, count mismatch, correctness/lifetime failure or source drift. The 10,000-row broad filter and full untimed reset/oracle inspections may exceed the whole-page cap; if so report incomplete without dropping operations or revising counts. No latency or Θ(N) conclusion follows from whole-page duration. There is no automatic retry, N=128 rerun, or full matrix authorization.
