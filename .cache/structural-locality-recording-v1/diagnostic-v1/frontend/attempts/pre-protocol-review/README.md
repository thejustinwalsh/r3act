# Recording B count frontend: N=128 protocol gate

**Prepared, unexecuted.** This stage uses the frozen diagnostic snapshot and unchanged eligible authored `native_collection.tsx`, `native_generic.tsx`, and `react_array.tsx` fixtures. Only a native collection N=128 correctness/count page with the full proposed 120-edit schedule is prepared. A separate probe-off N=128 correctness page uses the same source and schedule. Neither page records latency; no full matrix, source optimization, or performance conclusion follows. The 90-second full-page fit is unproved.

`native_controller.tsx` uses the public composed native TSX compiler path and snapshot `createDOMRoot` plus the snapshot probe module in one Vite graph. Vite resolves every live `src/` import in the reused authored fixtures to `diagnostic-v1/snapshot/src/`; the build gate requires the emitted source map to contain the snapshot graph and no live runtime `src` module. React Compiler remains explicitly enabled for the eligible React fixture. The native controller exposes capitalized JSX wrapper components; no generated bindings are handwritten. Native/React/generic authored fixtures remain unchanged. The React/generic components are retained in the bundle for transform provenance; this first page mounts only the native collection. The pinned Rust binary is the eligibility binary SHA `74396ae694aa6203cc4d4b4900c3458ca31e25e9638c73160b51bcb4aede79c8`.

For each edit, immutable native operations and React next IDs come from the model before the window. The native controller restores canonical order on the **same root** through a public inverse batch, applies the model's explicit reset-selection and preselection clicks, settles each with a flush, and checks DOM order, selected attributes, retained nodes, new node identity, and mount/cleanup deltas. The fixed `row-2` sentinel remains selected; a removed/reinserted textual key is a new incarnation. Only after reset/preselection does the count window begin immediately before `collection.apply(rows.version, operations)`, and it ends immediately after the one synchronous `root.flush()` returns, even on edit error. Collection cumulative stats are sampled before/after and reported as deltas or gauges, not raw per-edit visits. DOM inspection and model evaluation occur after the window. Count receipts require one exclusive `collection-delta` route, no bails/errors, exact `recording-b-probe-coverage-v1` identity, explicit count unit/site, and null missing-authority entries. Seven universal route sites must be observed on every nonempty edit: root flush entry, collection operation copy/preflight, collection delta batch/operation, and VDOM delta validation/commit. Conditional site absence is never converted to zero; uninstrumented authorities remain explicit null with reason. Retained VDOM bucket before/after stats have no public accessor and are recorded as null with reason; separated bucket probes remain distinct. Length and estimate units retain their distinct meanings; released-child-vnodes length is never called a visit count.

The collector preserves the reviewed Portless HTTPS/headless 90-second safeguards: derived nested HTML path, initial HTML/JS response-body hashes, separate source-map hashes, all response URL/status and console location inventory, exact favicon-only diagnostic 204 interception, bounded owned cleanup, signals, exclusive page reports, and before/after source/binary/asset audits. `receipt-analyzer.mjs` rejects incomplete/missing/extra trials, unlabeled fallback, improper count units or missing-as-zero, absent identity evidence, and any timing field. It accepts a probe-off result only with no count receipt. Report output is concise per edit; full 10,000-row DOM snapshots are not retained.

**Build gate first, after primary source review.** Luna alone executes these from repository root with Node 24.18.0; no server is needed for the first commands:

```sh
/Users/tjw/.nvm/versions/node/v24.18.0/bin/node --check .cache/structural-locality-recording-v1/diagnostic-v1/frontend/build-gate.mjs
/Users/tjw/.nvm/versions/node/v24.18.0/bin/node --check .cache/structural-locality-recording-v1/diagnostic-v1/frontend/collect-once.mjs
/Users/tjw/.nvm/versions/node/v24.18.0/bin/node --check .cache/structural-locality-recording-v1/diagnostic-v1/frontend/receipt-analyzer.mjs
/Users/tjw/.nvm/versions/node/v24.18.0/bin/node --check .cache/structural-locality-recording-v1/diagnostic-v1/frontend/check-receipt-analyzer.mjs
/Users/tjw/.nvm/versions/node/v24.18.0/bin/node .cache/structural-locality-recording-v1/diagnostic-v1/frontend/check-receipt-analyzer.mjs
/Users/tjw/.nvm/versions/node/v24.18.0/bin/node .cache/structural-locality-recording-v1/diagnostic-v1/frontend/build-gate.mjs
```

The build gate writes exclusive `dist/`, `proof/`, logs, and `build-report.json`. It records original Vite errors separately and audits all locked sources after failure. **The page runner lock cannot be finalized until this one build succeeds and its output hashes are reviewed.** A build success proves transforms/assets only; primary then freezes `runner-lock.json` and reviews one page authorization separately. Luna loads `$portless-dev-servers` before starting the preview and uses the actual CLI executable with no fixed port:

```sh
PATH="/Users/tjw/.nvm/versions/node/v24.18.0/bin:$PATH" portless run --name structural-recording-diagnostic-v1 node_modules/.bin/vite preview --config .cache/structural-locality-recording-v1/diagnostic-v1/frontend/vite.config.ts
```

Only after that approval, one count page uses the exact returned Portless HTTPS origin (including its port if present):

```sh
STRUCTURAL_DIAGNOSTIC_MODE=count STRUCTURAL_DIAGNOSTIC_ORIGIN="<exact Portless origin>" /Users/tjw/.nvm/versions/node/v24.18.0/bin/node .cache/structural-locality-recording-v1/diagnostic-v1/frontend/collect-once.mjs
```

The separate `STRUCTURAL_DIAGNOSTIC_MODE=off` page requires its own approval after the count receipt is reviewed. It reuses the same frozen build and receives a distinct exclusive report. There is no automatic retry or operation/sample adjustment.
