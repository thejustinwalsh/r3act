# Executable slice: linear scalar target preparation

Use [report.md](report.md) and [source-basis.json](source-basis.json) as the reviewed basis. Suggested implementation unit: `implementation/2026-10-22-linear-scalar-targets/`. This is one integrated algorithm/contract slice followed by one consolidated correctness gate and one bounded matched four-arm comparison. No helper-by-helper timing, new causal recording or third design review is a prerequisite.

**Replace:** per-target shared-key peer proof and per-target cold peer WeakRef construction in mounted scalar recipes. **Authority:** existing VDOM `#nodesByKey`, MountedNode/componentOwner identity, candidate `StorePropDeltaRecord.buckets`, immutable accepted VNodes and the existing Root publication lifecycle. **Semantics:** unique current target resolution, output order/Object.is, constants/children, fresh placement/writer/ownership, immutable saved and applying snapshots, exact captured acknowledgement/newer reentry, per-root Store history, resource lifetime, generic fallback and failed-partial quarantine. **Measured budget:** unknown; source gate is O(B + T + P + C) preparation and no retained peer WeakRefs. **Falsifier:** per-target bucket walk remains, candidate uniqueness is bypassed, callback checks disappear, output/history/lifetime changes, or the same-run declarative performance gate still fails.

## 0. Primary preparation and frozen interfaces

1. Confirm runtime/compiler source hashes against this review and inspect the current diff. Pending `compiler/vite_native_module.ts`, `compiler/native_hmr_revision_test.mjs` and `implementation/2026-10-22-hmr-source-delivery/` belong to the separate HMR packet. Do not overwrite them. They may enter the consolidated gate after primary review; their development watch change is excluded from runtime performance causal claims.
2. Create the implementation unit, design receipt and exact before-source record. Copy the prior consumer/source-basis/initial-copy manifest into this new unit with updated path bookkeeping. Never edit the old evidence or consumer directory. Keep authored `native.tsx`, `react.tsx`, `react-frame.tsx`, `imperative.ts`, `scene.ts`, HTML, package versions, renderer settings and build-mode choices byte-identical. Only copied proof tooling/path/diagnostic expectations may change.
3. No public API change. `MountedScalarStorePlan`, `PreparedScopedKeyedRetainedProgram.storeScalarPlans`, Root `closedStoreOutputShape.scalarPlan`, and the existing fifth argument remain. No Root, Store, World, host writer or Rust product file needs modification. `ScalarPlanFields` is internal; delete only `members` and its consumers.
4. Freeze diagnostic names before dispatch:
   - `store.scalar-target.bucket-builds`: distinct key snapshots built in this call.
   - `store.scalar-target.member-visits`: actual member iterations while taking those snapshots, once per selected key bucket.
   - `store.scalar-target.owner-index-visits`: actual member iterations building an owner uniqueness Map, at most once per bucket.
   - `store.scalar-target.owner-lookups`: one indexed lookup per owner-qualified region.
   Existing `store.mounted-scalar.{cold,warm}-rows` remain. Increment local counters at the actual loops; report one aggregate batch at the existing end-of-preparation profiling boundary. Do not call profiling callbacks inside snapshot/index/target loops. Timing keeps diagnostics disabled. Counters prove named loop work only; source review must also establish that no uncounted peer loop remains.

## 1. Dispatch two disjoint Sol-medium packets

Use `gpt-6-sol` with `medium` reasoning and fresh bounded context. Two workers plus primary use three slots; Luna remains idle. Sol authors tests but does not run tests, typechecks, builds, benchmarks, browsers, servers or Git mutations. Supply the common contract above to both agents before work starts.

### Packet A — algorithm and VDOM contract

**Own only:** `src/vdom_snapshot_runtime.ts`, `src/vdom_mounted_scalar_plan_test.ts`, and the new unit's `agent-a.md`. Do not edit Root, compiler, Store, World, other tests or consumer tooling.

**Function-level instructions:**

1. Remove `members` from `ScalarPlanFields` (current line 233). Remove every recipe peer WeakRef construction at successor minting (4369–4370), every hint `.members` traversal and first-bucket reconstruction from hint peers (4135–4144, 4157–4159). Do not replace them with a shared persistent proof, generation map, node registry or key renaming.
2. Refactor `prepareStorePropDelta` around the existing local `buckets` Map. On first key, read current `#nodesByKey` and capture `[node, node.vnode.componentOwner]` once. Keep the current lazy `owners` Map: when the first owner-qualified region for that key appears, index each member once; duplicate owner entries become `null`. An unqualified region requires exactly one member. Preserve current order and decline behavior for malformed regions/duplicates.
3. Resolve `node` using this live candidate snapshot before any warm-hint decision. Check `seen` and the current node shape as today. Only then set warm eligibility from genuine `readMountedScalarRecipe`, `hinted.node === node`, exact own VNode/handle/root/key/tag/owner/source/children/output layout guards. No recipe may supply the target when the owner index is missing or ambiguous. A stale hint triggers cold prop normalization of that already-resolved node.
4. Preserve the warm props/VNode construction and successor prop slots/constants/child proof. Remove the now-unused successor lookup of `buckets.get(target.vnode.key!)`; successor minting no longer needs peers. Keep output alignment and candidate-backed `storeScalarPlans` release behavior.
5. Preserve `StorePropDeltaRecord.buckets` construction and `#isStorePropDeltaCurrent`, `#applyCheckedStorePropDelta`, `#isStoreTargetReady`, accepted journal and publication assignment behavior. No admission/host/post-host/final checks are removed or coalesced. No callback is assumed passive. Do not alter whole-root replacement guards or group APIs.
6. Add the four counters at the existing profiling boundary. No timers or new public debug APIs. Counting must not change iteration order or invoke a callback in the indexed interval.

**VDOM regressions to author:**

- For 1, 32, 256 and 1,024 distinct owners under distinct structural parents, all motion hosts use the identical raw `key="motion"`, with retained child identity. Cold then two warm updates in reversed/nontrivial region order produce exact values and stable identities. Per preparation, assert bucket builds=1, member visits=N, owner-index visits=N, owner-lookups=N, warm rows=N after acceptance. These are bounded correctness/count fixtures, not latency benchmarks.
- Multiple raw keys with unequal bucket sizes: visits equal the sum of distinct selected bucket sizes, not targets times bucket sizes. Include a singleton unqualified marker and an untargeted peer inside a selected bucket.
- Two same-key nodes with the **same** componentOwner: cold and warm-hinted preparation both decline. Keep different-owner same-key nodes valid. A hint for owner A attached to region B cannot redirect the write; it takes cold B preparation or declines under existing rules.
- Missing/foreign/forged/proxied/previous-VNode recipes retain cold fallback and no implicit trust. Exact genuine warm reuse still bypasses previous-prop descriptor normalization, preserving constants and signed zero.
- Peer insertion/removal/replacement before a new preparation: correct current target selection and preserved own layout reuse when the target is unchanged; no old peer list retained. If an available public mutation also replaces the target's VNode, assert cold fallback instead of demanding warm reuse. Prepared candidate followed by a same-key membership change still fails currency. Move with stable node/key/owner validates only under current placement rules; remove/reinsert cannot reuse old target identity.
- Host writer replacement/reentry/second-writer throw, retained child replacement, and applying/saved snapshot regressions continue unchanged. Add a targeted first-writer mutation case using supported public operations: newer Store action is covered by Packet B; at VDOM level writer replacement must stop the next changed scalar write and preserve failure behavior. Do not mutate private fields or weaken quarantine to make a test pass.
- Discard releases successor array getter; old externally retained recipes hold only own target/children. Keep existing same-key peer GC regression in Packet B as the runtime lifetime check.

**Deliver:** patch plus concise `agent-a.md` with deleted mechanisms, current member/owner selection proof, all callback boundaries preserved, authored test names and commands for Luna. No performance claim.

### Packet B — actual compiler and installed proof

**Own only:** `compiler/compiled_mounted_scalar_execution_test.mjs`, `src/native_mounted_scalar_plan_test.ts`, the new unit's copied `consumer/prepare.mjs` and `consumer/verify.mjs`, and `agent-b.md`. The primary owns copied static files, `initial-copy.json`, design/evidence/checkpoint documents and any runner edit. Do not edit A's runtime/test files, HMR files or old archives.

**Instructions:**

1. Extend the already registered actual Rust/OXC compiled fixture with a bounded many-owner case (256 motion owners plus one marker) using the existing compiled Motion/Alternate functions, ordinary declarative state, independent local offsets and retained authored children. Put each owner under a structural parent as in the installed scene; keep raw local `motion` keys. Do not hand-construct optimized metadata for this compiler proof.
2. Verify emitted schema-2 functions, zero owner body rerenders on the selected closed path, stable targets/children, literal marker, cold then all-warm frames, and exact bucket/index counter expectations. The existing runner already includes this file under `--expose-gc`; extending it avoids a new command surface. Author no timing loop.
3. Preserve existing saved snapshot, applying snapshot, newer reentrant Store action, local offsets, fork history, exact code retirement, removed-target and same-key peer GC checks. Add an accepted same-key peer churn case through public Root update followed by warm-up/current-target verification; no assumptions that a generic tree update preserves the target VNode. Existing generic fallback is an acceptable intermediate result, never a wrong target write.
4. In the copied installed verifier, keep every old output/pixel/resource/CSP/transform/reuse assertion. For Native baseline/minified/rebundled proof contexts, compute per-frame counter **deltas** from cumulative counters. In the unchanged scene, require 257 member visits, 257 owner-index visits and 257 owner lookups for the complete successful Store preparation; exactly two selected raw-key bucket builds (`motion` and `frame-marker`). The schema-5 marker is owner-qualified too (`closed_store_execution.ts:125,305–315`). Confirm the fixture really has those raw keys through the already captured transform and source; do not change the workload to satisfy counts. The first frame may have mixed warm/cold layout reuse after control proof, but target indexing remains current and linear. Later frames retain all 257 warm rows.
5. Keep four baseline timing contexts only, null counters, Native → declarative React → useFrame → imperative, 12 warmup/60 measured, baseline unminified timing and current shared draw/readback. Preserve default-minified/rebundled/CSP as untimed delivery controls. Do not add a fifth timing arm, repeat favorable pages, or change React's external clock.
6. If new counters or route expectations do not match, preserve failure and hand the discrepancy to primary. No counter-based assertion may replace behavior or served-source equality. Do not claim loop counts are measured allocation or phase cost.

**Deliver:** test/proof patch and `agent-b.md` with exact scope, expected counters and commands. No execution.

## 2. Primary integration review before release

1. Review A's core diff first. The target must come from current bucket uniqueness, not a hint. Prove zero recipe peer loops/WeakRefs; one member snapshot and at most one owner index per key. Cold and warm use that same resolution. Prop layout and retained children remain target-local immutable facts.
2. Review freshness separately from layout trust: candidate record buckets still exact at admission/post-host; per-write current writer/node/parent checks remain; generic region callbacks may revoke earlier facts and are still caught by existing later validation. No proof is reused across a callback merely because it was true at capture.
3. Review B's assertions against actual compiler output, not labels. A count fixture must fail the former O(N²) design by a bounded peer-work/representation assertion plus source deletion review; warm-row count alone is insufficient. Do not add invasive monkey-patches that change canonical-path selection. Ensure diagnostic aggregation occurs only after preparation's existing callback boundary.
4. Read the full changed source in context, including release/discard and installed manifest handling. Review the pending HMR packet independently and include its actual compiler fixture in this same correctness gate if ready. Do not attribute a runtime timing change to that development-only watch correction.
5. Reconfirm no product changes outside A's VDOM file are needed. If an actual interface contradiction appears, primary resolves it before dispatching additional ownership; do not let two agents edit Root/Store speculatively. Keep comments to two lines or public TSDoc.
6. Freeze a fresh source identity. Keep original failures, historical evidence and source archives immutable. Primary now releases Luna; no additional human approval is required for this already authorized implementation/gate scope.

## 3. One consolidated boundary, executed by Luna

Use the pinned Node, existing bounded supervisor and Deno `--frozen` behavior in the platform runner. `darwin-v1` and `proof-canvas-v1` below must not exist. Preserve stdout/stderr, numeric exits, before/after input hashes and cleanup; correctness/build deadline remains the existing 1,200-second supervision bound. Sol remains idle during execution.

```sh
/Users/mini/.local/share/mise/installs/node/24.18.0/bin/node scripts/verify_native_platform.mjs --output-dir /Volumes/Depot/Developer/r3act/implementation/2026-10-22-linear-scalar-targets/verification/darwin-v1 --expected-platform darwin --expected-arch arm64 --execution-kind native-host
```

Primary inspects the consolidated receipt. A real correctness failure can be repaired and the required consolidated gate rerun with the failure preserved; that is not permission to sample benchmark variants. No performance collection before correctness/delivery admission.

```sh
/Users/mini/.local/share/mise/installs/node/24.18.0/bin/node implementation/2026-10-22-linear-scalar-targets/consumer/prepare.mjs --proof-dir /Volumes/Depot/Developer/r3act/implementation/2026-10-22-linear-scalar-targets/proof-canvas-v1
/Users/mini/.local/share/mise/installs/node/24.18.0/bin/node implementation/2026-10-22-linear-scalar-targets/consumer/verify.mjs --phase proof --proof-dir /Volumes/Depot/Developer/r3act/implementation/2026-10-22-linear-scalar-targets/proof-canvas-v1
```

After source/untimed proof review, primary writes the existing `canvas-timing-authorization.json` bound to the actual build-proof, input-lock and proof hashes. This is internal release sequencing. Then Luna executes **once**:

```sh
/Users/mini/.local/share/mise/installs/node/24.18.0/bin/node implementation/2026-10-22-linear-scalar-targets/consumer/verify.mjs --phase timing --proof-dir /Volumes/Depot/Developer/r3act/implementation/2026-10-22-linear-scalar-targets/proof-canvas-v1
```

Browser execution remains headless, bounded and interruptible, using the existing intercepted HTTPS harness. Do not launch a server for this proof. Any separately required HMR server proof first loads `$portless-dev-servers`, uses Portless HTTPS, preserves shared routes and stops only owned processes. Missing skill/access is reported as the specific lifecycle proof limit, not worked around with an unapproved server. The HMR browser proof is a separate correctness/lifecycle observation, not another performance comparison.

## 4. Decision and stop

- **Algorithm PASS:** exact output/identity/history/failure semantics, ordinary compiled and installed route, one candidate bucket snapshot/index per key, no cross-frame peer proofs. Report operation counts separately from time.
- **Parity PASS:** same-run Native update median/p95 and through-draw median/p95 each at or below declarative React. One 12/60 fixed-order episode remains descriptive, not release qualification or a causal old/new estimate. Do not compare its improvement numerically to 7.35ms as if source/control/device conditions were paired.
- **Parity FAIL:** retain and report all observations. The algorithm repair may stand as removal of source-proven quadratic work if correctness passes, but do not call realtime competitive or automatically launch another cache, arithmetic backend, prototype-audit rewrite, worker or layout. This plan supplies no measured budget for the remaining cost. Primary must record that limit before selecting any further work.
- **Unsupported forms:** cold/scalar/general VDOM fallback and all existing callback, selector, aggregate, lane, mixed structural/resource and full-tree rules stay. Ambiguous key/owner resolution declines before host mutation. Any stale/throwing host after entry retains old accepted state and quarantines; no rollback/replay promise.

Primary updates the checkpoint/handoff/research conclusions only from actual receipts. Retain the original full finish line and prior FAIL evidence. No current cold/heap/allocation/GC, second-device, presentation or human-maintenance advantage is implied by deleting peer WeakRefs or by a positive bounded comparison.
