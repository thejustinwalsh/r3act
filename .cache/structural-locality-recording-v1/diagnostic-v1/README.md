# Isolated Recording B structural count snapshot

**Prepared for primary review. No test, typecheck, build, server, browser, or workload has been run for this snapshot.** This directory contains a copied 258-file locked `src` basis, one new diagnostic module, and five patched runtime files. Live `src`, compiler, fixtures, all qualified archives, prior 413/424 locks, dense evidence, and eligibility v2 assets remain unchanged. `source-live.sha256`, `source-before.sha256`, and `source-patched.sha256` list every file; `probe-manifest.json` records the lock identity and changed-file before/after hashes; `snapshot.patch` is the review diff. All 258 copied prepatch hash values matched current live `src` and both eligibility source locks in a read-only SHA audit. The VDOM baseline is the live `cdc774...` adjacent-token version, explicitly separate from the old dense qualified build.

## Frontend interface and boundaries

Import `configureStructuralCountProbe`, `beginStructuralCountWindow`, `endStructuralCountWindow` from **this snapshot** `src/structural_count_probe.ts`. Import `createDOMRoot` from the same snapshot `src/native_runtime_api.ts`; it returns the public root object accepted by begin/end. The root constructor binds that object to its root ID. API:

```ts
configureStructuralCountProbe(true); // or false for diagnostic-off shape/correctness control
beginStructuralCountWindow(root, `${size}/${editKind}/${trial}`);
try {
  collection.apply(collection.version, preparedOperations);
  root.flush();
} finally {
  const receipt = endStructuralCountWindow(root);
  // Preserve receipt and any original operation error separately.
}
```

The actual frontend must record `apply` result and thrown error, read public collection stats before/after, verify semantics, and keep canonical same-root reset, sentinel preparation, mount, inspection, and disposal outside the edit window. Retained VDOM bucket stats have no public accessor in this patch and must be `null` with a reason. It must not use the illustrative `finally` if `begin` failed. `end` resets the singleton gate even on an incomplete edit and returns `completed:false` for a bail, error, missing/excess flush, extra root, or reentrant flush. The caller must fail the edit when `completed:false`; raw `bails` and `errors` remain in the receipt. If a user callback throws, the snapshot records a constant marker and rethrows the original value without coercing it. The frontend preserves that original separately. `configure(false)` uses the same source with inactive probes; it checks semantic/build shape but cannot correct latency for probe overhead. Invalid negative, noninteger, nonnumeric or overflowing count amounts mark the receipt incomplete without recording a fake zero.

One active root is required. The probe tracks root registration and unregisters in `dispose`'s `finally` after disposal begins; another root created or flushed inside the window is recorded as an error even if quickly disposed. Importing a live module beside a snapshot module would make two registries and invalid receipts. A future Vite config must alias **all** authored native controller/fixture and root imports to one canonical snapshot `src` resolution, including `native_runtime_api.ts` and `jsx_binding_runtime.ts`; preserve authored TSX, Rust/OXC compiler binary and component/site IDs, and React Compiler proof. Bundle and source map review must establish that runtime identity before a count page. This directory does not contain a Vite frontend or compiled assets.

The count bag is diagnostic-only. It changes no owner, collection, bucket, VDOM or host algorithm and exposes no production API. `CountReceipt` has `coverageId`, `label`, `rootId`, `phase:'edit'`, `completed`, `route`, `bails`, `errors`, `counts`, `missing`. Each count has `{value, unit, site}`. Units are `iteration` (actual JS visit), `lookup` (Map-backed probe invocation), `event` (invocation/transition), `length` (array length), `estimate` (splice-shift estimate), and `gauge` (instantaneous state). `counter-coverage.json` is the exact static name/unit/site registry. Do not sum all units as work or substitute existing profileCounter length values for iterations. `missing` entries are explicit `{value:null,reason}`; an absent count key is *not* automatically a measured zero. Frontend analysis must require its named route coverage set and reject an absent universal site for a qualifying collection delta edit. Conditional sites remain absent/unreached, never inferred zero.

## Counter coverage and open seams

| Source | Added count authority |
| --- | --- |
| `keyed_collection.ts` | Public operation-copy callback, preflight operation, virtual/key-overlay publication, linked snapshot entry, history reader/prune/cap, listener event, key lookup; snapshot during edit bails. Existing `stats()` remain cumulative and require before/after deltas. |
| `owner_state_world.ts` | `findOwner`/`resolveOwner` lookup calls, actual lineage parent steps, recursive destroy and child-edge visits. |
| `component_state_runtime.ts` | Exclusive root route and flush/reentry status; delta guard/bail codes, read batch/operation/overlay loops, row-for/prepare calls, delta row component execution, ancestor membership/retirement, generic component encounter/execution, token output loops, effect key/registration visits and setup/cleanup events. Existing `owner.component-visits`, `owner.created/retired`, `collection.rows-prepared` remain independent events/partial coverage. |
| `vdom_snapshot_runtime.ts` | Recursive normalization and unique-key visits, prepared candidate/old-subtree/ancestor/operation visits, delta candidate/ancestor/validation/commit visits, full reconcile loops, binding subtree and full index rebuild visits, full key rebuild visits, actual mounted release subtree visits, ref pending and callback events, DOM place attempts/no-ops/successful inserts and successful removals. Optional host disposal is a **request** before the original optional call, without an extra getter read or success claim. `released-child-array-length` remains length; dropping its reference is not a traversal count. |
| `keyed_region_buckets.ts` | Key probe calls, explicit iterator/forEach and reindex loops, split/merge events, and separately labeled estimated splice shifts. Existing `bucketSlotWrites` aggregates estimates and explicit writes, so use the separated diagnostic counts for mechanism analysis. Bucket count is a gauge, not work. |

Uninstrumented internals remain `null`/unresolved in the analysis: JS engine internal splice shifts, deferred GC, layout/paint, user callback work, actual optional host `dispose` invocation/success, retained VDOM bucket stats without an accessor, and any requested count with no named probe on the exercised route. The separated bucket probes are available; do not invent before/after bucket gauges. The patch does not certify all reads/writes inside scalar binding projections or host property setters. Exact VDOM preparer early-return reason coverage is narrower than the root delta bailout; a VDOM decline must not be assigned to an unsupported specific cause. `Map.clear` and array-length fields are not counted as iterations. Root fallback/failed host repair must be retained as an ineligible receipt, never silently excluded. No perf or asymptotic inference follows from this snapshot.

## Commands for Luna only, after primary review

The workspace Deno lock has a previously observed stale package dependency failure before typechecking. The dependency-free probe leaf can be checked without loading that workspace config or lock. These commands verify **only** the probe module and synthetic API harness, not the full runtime snapshot. From the project root (`outputs/react-runtime-research`) with **no server**:

```sh
deno check --frozen --no-config --no-lock --no-npm .cache/structural-locality-recording-v1/diagnostic-v1/snapshot/src/structural_count_probe.ts .cache/structural-locality-recording-v1/diagnostic-v1/self-check.ts
deno test --frozen --no-config --no-lock --no-npm .cache/structural-locality-recording-v1/diagnostic-v1/self-check.ts
```

Luna should independently verify the 258 prepatch source hashes against both existing locks, all patched source hashes against `probe-manifest.json`, and that only the five named copies plus the new probe differ. Full runtime TypeScript soundness remains unverified until a reviewed locked typecheck path works; do not change workspace lock/dependencies to hide the stale-lock failure. A Vite build of the separately reviewed frontend proves transforms/syntax and served asset identity, not full TypeScript soundness; use its explicit pinned compiler binary and source-map/asset lock, then check original authored component/program/site IDs against the eligibility proof. No browser count run is authorized by this handoff. The first later page, if approved, is the finite N=128 count protocol and separate diagnostic-off correctness control, not the three-size matrix or latency qualification.
