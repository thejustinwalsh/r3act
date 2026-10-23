# Bound scalar execution — selected integrated slice

Base `dce1c9e0`. Primary accepts Astra high's source-grounded design and 45-input review. Previous turn produced reviewed artifacts and local checkpoints (progress). This unit implements the exact packets below; no performance attribution is inferred. All existing product and evidence scope remains.

Implementation is active; correctness, delivery and speed are unverified for these new bytes. The previous boundary remains correctness/delivery PASS, parity FAIL.

# Executable orchestration: bound scalar execution

One integrated slice after the completed verified-arithmetic boundary. Primary creates `implementation/2026-10-22-bound-scalar-execution/` for implementation/design/evidence. This review's [report](report.md) supplies the actual source map and representation decision; no additional mapping study or Recording A is a prerequisite. Existing traversal layouts, compiler arithmetic and host writer remain.

**Replace:** repeated normalization of static owned row/World/Store request descriptions and repeated mounted scalar target/previous-prop interpretation. **Authority:** existing component cache shape, execution association, World owner/cell identities, Store snapshots/readers, MountedNode/key index, Store delta record and publication lifecycle. **Required semantics:** exact input and host order, finite scalar policy/Object.is, signed zero, retained children/effects/resources, current code and lifetime, old managed snapshots during applying, exact captured acknowledgement/newer actions, independent roots/holds/transitions, conservative callback fallback and failed-partial quarantine. **Measured budget:** unknown; previous update distance is 79.6% median/90.4% p95, not recoverable-cost evidence.

## Frozen interfaces before dispatch

No public package/barrel export, new schema, compiler change, mutable identity/version registry or extra WeakMap is required. Internal module exports are narrow integration seams; arbitrary callers must not be able to forge trust with a TypeScript cast/frozen object.

### A: immutable input description receipts

Use private classes with unexported constructors/secrets and private-field checks; exported types are opaque. Instances own frozen descriptor data only. They do not hold current values/versions/accepted reader history and do not perform callbacks when unwrapped.

```ts
// owner_state_world.ts
export type OwnedClosedWorldInputRequest = /* opaque private instance */;
export function bindOwnedClosedWorldInputRequest(
  request: { owner: OwnerId; sites: readonly StateSiteId[] },
): OwnedClosedWorldInputRequest | null;

// async_store_runtime.ts
export type BoundClosedProjectionRequest = /* opaque private instance */;
export function bindOwnedClosedProjectionRequest(
  request: OwnedClosedProjectionRequest,
): BoundClosedProjectionRequest | null;

// closed_store_execution.ts
export type BoundClosedStoreOutputRequest = /* opaque private instance */;
export function bindOwnedClosedStoreOutputRequest(
  request: OwnedClosedStoreOutputRequest,
): BoundClosedStoreOutputRequest | null;
```

Extend the existing request-array entry types of `captureOwnedClosedWorldInputs`, `readOwnedClosedProjectionBatch`, and `prepareOwnedClosedStoreOutputs` to accept either their existing record or their respective private receipt. Preserve each existing function and shared implementation. The record branch performs its existing normalization; the private branch unwraps the already normalized static description. Copy/check the outer caller array in the current observable order before capture. Do not grant ownership to a public `readonly` array or freeze it in place.

The execution receipt owns the existing association facts, owner/key, input order, and A's bound World/projection descriptions. `prepareOwnedClosedStoreOutputs` recognizes it through a private-field check and reuses these descriptions, retaining the same `ready | public-required | null` result and existing `OwnedClosedStoreOutputRow`/owned region output. It does not add a second evaluator or produce a second props list. Batch-level arrays may collect receipt references in original order; do not add a persistent batch registry or move current membership/version checks to binding.

Factory ownership is layered: World alone constructs and recognizes its private World receipt; Store alone constructs and recognizes its private projection receipt; the execution module alone constructs and recognizes its private execution receipt and calls the other two factories while binding. Root holds only the execution receipt. A module export is not trust: every factory copies and validates untrusted descriptors through the existing safe normalizers before constructing its instance. In particular, the execution factory rechecks the existing privately associated data execution and normalized metadata; it never certifies an arbitrary function/readonly record as passive. A Proxy around a genuine receipt does not possess its private fields and follows the untrusted/decline branch. All potentially observable normalization finishes before transaction capture or reader staging begins; only owned scalar descriptor data is later unwrapped.

Bind failures before capture remain conservative. Existing canonical World/Store shape audits run freshly inside capture and at their current later phases. Post-pin/staging failure must discard the candidate; it must not replay public capture on a partially populated transaction. Keep old public override and getter/Proxy behavior.

### B: immutable mounted successor recipes

```ts
// vdom_snapshot_runtime.ts
export interface MountedScalarStorePlan { readonly /* opaque brand */: never; }

// Extend existing PreparedScopedKeyedRetainedProgram:
readonly storeScalarPlans?: readonly (MountedScalarStorePlan | null)[];

// Extend existing method with optional FIFTH argument; first four stay unchanged:
prepareScopedKeyedRetainedAndStoreDeltas(
  deltas, updates, storeRegions, replacements = [],
  scalarPlans?: readonly (MountedScalarStorePlan | null)[],
): PreparedScopedKeyedRetainedProgram | null;
```

`storeScalarPlans` is indexed by `storeRegions`, not by property or arbitrary owner Map. It contains *successors* for the candidate's proposed accepted VNodes. It is preparation output, not proof of publication. Derive it in the existing Store delta record; return null entries for ineligible regions. The opaque plan is an immutable private instance or equivalent closure-owned record with authentic private-field validation; it is stored only by Root's existing shape. Do not introduce a plan lookup Map. Its private contents include this VDOM root identity, node/handle, expected accepted VNode, key/tag/component owner, scoped-source identity, ordered scalar prop names, checked bucket members/owners, and immutable retained child node/VNode identities.

Produce a plan only from an **owned scalar candidate's private `target.next`** with owned frozen scalar props, safe scoped source data and exact checked shape. Initial generic mount props are not inherently immutable; retain the current cold preparation to produce the first successor. Freeze newly created private headers/recipe arrays as needed; never mutate/freeze caller-owned props or treat arbitrary frozen Proxy metadata as proof. Any callback during initial public normalization remains before the existing fresh checks.

Warm hint use is limited to Store-only scalar programs (`deltas`, `updates`, `replacements` empty and all candidate regions privately owned scalar). Mixed/scoped structural paths continue through the existing path; this does not remove their support. A missing/stale hint simply takes cold preparation **before host mutation**. Once a candidate is prepared, stale admission still rejects it; no silent mutation-time rebind.

Warm preparation checks the private recipe's root, exact accepted VNode/node/handle, current key/owner membership and current children. Capture current placement into the one-shot target; do not permanently freeze a keyed node's rank. Check owned output prop count/names/order against the recipe. Build a final frozen next props/VNode directly from owned output, without enumerating previous descriptors, capturing previous scalar values, constructing names Set or write triples. Preserve non-projected scalar constants through a cold-proven template if permitted; otherwise require exact complete prop coverage and decline. Do not accidentally omit the marker's `name` literal.

Inside existing `StorePropDeltaRecord`, use a discriminated compact scalar target variant referencing the immutable output list and previous props. Keep the generic target variant. Existing validators and overlap tests share the same target identities. Application reads each `(name,next)` from the owned list and `previous` from the captured immutable props, preserving Object.is and order. `#isStoreTargetReady` still runs before each changed owned write; a recipe is not permission to cache the host writer across callbacks. Journal capture, post-host check, `node.vnode = next`, dirty snapshot, applied token/version and quarantine remain unchanged. No separate commit/publication core.

### C: Root cache integration

Upgrade `ClosedStoreOutputShape` in place with optional `BoundClosedStoreOutputRequest` and `MountedScalarStorePlan`. Keep the field `closedStoreOutputShape`; there must be one cache-local derived record, not a sibling registry/cache. Static binding may be reused only while program/owner/key/props/output shape and each Store/reader identity match. Mutable schema5 props retain current descriptor/source checks. Do not freeze previously mutable caller inputs to make binding convenient.

`#stageClosedStoreOutputs` uses existing passive owner order and complete live-reader coverage. For each eligible row, reuse or create A's binding; pass bindings to the existing enclosed batch. Reuse precomputed program/input-name information where safe; do not build fresh raw request records just to normalize them again. Do not remove the final live coverage scan or canonical phase checks.

Extend internal `ClosedStoreOutputCut` with:

```ts
readonly scalarPlans: readonly (MountedScalarStorePlan | null)[];
setScalarSuccessors(plans: readonly (MountedScalarStorePlan | null)[] | undefined): void;
```

`scalarPlans` aligns with `regions` and contains accepted hints. `setScalarSuccessors` stages new shape records only; it validates length/owner association and assigns recipes to candidate-private `nextShape` records. It must not mutate an existing accepted shape. Root passes hints as argument five and then passes `program.storeScalarPlans` to this setter. Successful existing `closed.publish()` installs these next shapes; discard/release drops them. Successor extraction is from the candidate-owned Store delta record, never the mutable mounted tree after a failed application. Its outward array is frozen and contains only opaque recipes. Preparing or extracting a successor does not install it. On preparation rejection, discard, failed-partial application, supersession or HMR, release the candidate's successor array and binding references through the existing artifact-release lifecycle; accepted old cache recipes survive only as accepted state until normal invalidation/disposal. HMR explicitly clears them even when accepted cache outputs remain readable. Implement the outward property as a getter backed by the existing live candidate record, rather than a closure capturing its array; after record release it returns undefined. Root drops its extracted array in artifact release. Deliberate external retention of an extracted opaque plan can retain its references; the collection obligation assumes those external references are released, as with existing retained candidate handles. Other callers that combine structural work may omit hints and remain on their current path.

Keep eager owner-local `result`/`expandedResult` construction and current keyed/ancestor publication. Keep authored child and expanded child separate. Do not reinterpret `MountedNode.vnode` as the only Root history or defer materialization behind getters. Do not delete whole-root checks for full cache/tree replacements.

Every non-scalar cache patch that changes output/props/child/effect shape must clear the derived field. Use an explicit local helper if it makes the rule easier to audit; preserve exact cache object reuse when unchanged. Cover every mutator listed in report.md, including ancestor invalidation, reveals, mixed/direct collection, structural/numeric owner commits, full-map replacement, retirement and HMR. HMR drops recipe references while retaining accepted output for current terminal-read semantics. No mass tree copy.

## Three disjoint Sol medium packets

Use only `gpt-6-sol`, reasoning `medium`, fresh bounded implementation agents. No tests/builds/benchmarks/browser/server/VM/Git mutations by implementation agents. They author regressions and hand commands to Luna. Primary reviews/integrates/checkpoints. Do not dispatch another architecture agent instead of these packets.

**Sol A — owned input bindings.** Own only `src/closed_store_execution.ts`, `src/closed_store_execution_test.ts`, `src/owner_state_world.ts`, `src/owner_state_world_test.ts`, `src/async_store_runtime.ts`, `src/async_store_runtime_test.ts`, and unit `agent-a.md`. Implement the three receipt factories and union entry paths above. Preserve private arithmetic scratch, schema1/schema2 interpretation fallback and all canonical live audits/history. No compiler, Root, VDOM or host edits. Author tests for forged/frozen/Proxy receipts; captured descriptor order/errors; source/method replacement after binding; state versions changing across reuse; same-input distinct readers and roots; stale owner/site; public-required versus post-staging failure; retained output immutability. Report precise retired descriptor-copy branches and remaining captures. No timing claim.

**Sol B — mounted scalar recipe and compact Store delta.** Own only `src/vdom_snapshot_runtime.ts`, `src/vdom_store_prop_cut_test.ts`, new `src/vdom_mounted_scalar_plan_test.ts`, and unit `agent-b.md`. Implement fifth argument/successor output and the private target variant. Preserve the existing registry and all validators/journal/writer checks. Author lifecycle and snapshot regressions listed below. Do not edit Root, compiler, World/Store, Three or property writer. Provide primary a ledger of every existing target-record consumer and both discriminant branches; no `as any` to bypass overlap/current checks.

**Sol C — Root plan lifetime and ordinary route integration.** Own only `src/component_state_runtime.ts`, new `src/native_mounted_scalar_plan_test.ts`, `src/component_retained_store_child_test.ts`, and unit `agent-c.md`. Integrate frozen A/B interfaces and all cache invalidations from report.md. Preserve the current coverage/holds/history/lifecycle. Add untimed counters at existing `#activeCounters` seam only: bound request reuse/new binding and warm/cold mounted preparation (B can expose counts through its existing profile seam). Counters must not be executed in timing configuration. Author Root-level fallback, independent-publication and retirement regressions. No new global subscription/owner/target registry.

Primary owns design/results/docs/checkpoint, `scripts/verify_native_platform.mjs` / input inventory if inclusion is needed, **new** `compiler/compiled_mounted_scalar_execution_test.mjs`, copied installed consumer tooling, proof/counter assertions and any integration edits after agents finish. Existing authored native/react/frame/imperative/scene/package files remain byte-identical. New compiled fixture uses actual ordinary TSX and no manual private-plan authoring.

### Dependency order and source-review checkpoints

1. Primary freezes these interfaces and file ownership in the unit design. Start A and B independently; C can start cache invalidation and selection integration against the frozen types. A/B notify C when signatures exist. No agent opportunistically edits another's files.
2. A handoff: primary reviews authentic ownership, copied-versus-private entry semantics, callback ordering, unchanged phase audits and stale capture. B handoff: primary reviews cold immutable successor provenance, all record consumers, journal snapshots, changed writer reentry and release. C integrates both, without per-helper runs.
3. Primary reviews the complete selected update path and confirms the cold preparation is actually bypassed after successful acceptance. Check all cache patch sites by source search; no stale `...cache`/`...live` carries a changed output with an old recipe. Confirm no new Map/WeakMap registry and no value/version cache in a static receipt.
4. Primary authors/finishes the compiled fixture and copied installed proof. Warm route must select all 257 eligible scalar rows after binding, including the literal marker, while actual arithmetic remains verified. Counters identify cold binding and reuse; no count is interpreted as phase milliseconds.
5. Freeze all product and verification inputs; release agents, then release Luna once for the combined boundary. Source repairs after a failure create a preserved new attempt, not a per-helper test loop. Do not run workloads concurrently with edits.

## Required regression matrix

These cases are behavioral obligations, not implementation-mirroring count tests. Existing suites stay intact; new tests cover the recipe-specific failure surface.

| Layer | Required cases |
| --- | --- |
| Static receipts | Reuse across different Store state/World values captures fresh data; forged object/private-class Proxy declines; accessors/prototype overrides preserve conservative route; never execute arbitrary kernel; independent readers with shared projections retain separate histories; no partially populated fallback retry. |
| Accepted snapshots | Save snapshot A, apply B with a writer reading snapshot mid-apply, verify A during application and B only after success; old saved A remains unchanged after C. Second writer mutates then throws: accepted A/history unchanged, no replay, domain quarantined, original error retained. Also read snapshot for the first time during application to exercise journal serialization. |
| Placement/identity | Same key under different owners; duplicate/ambiguous owner bucket; keyed move retaining node/state; candidate prepared before move follows existing staleness rule; fresh candidate after move succeeds. Remove/reinsert same key, replace tag/owner, scalar binding attached after recipe, wrong root/foreign plan, generic full reconciliation and changed child VNode all decline/rebind without stale write. |
| Generic bridge | Warm scalar update followed by generic render, mutable/copy prop route, resource reveal and structural edit reproduces current accepted values/children. Recipe never hides updates in `result`/`expandedResult`, HMR source scans or keyed output maps. Unsupported routes retain existing component execution/error behavior. |
| Reentry/ordering | First setter dispatches newer Store/local action; old cut acknowledges only old version and next flush publishes newer. First setter replaces writer or retires another target: later write rejects/quarantines as existing contract requires. Later public getter revokes earlier lease. Unrelated accepted delta may intervene only under existing scoped checks; overlap/source replacement rejects. |
| Holds/forks/groups | Held Store A with independent B/local progress; joint Store/local consumer; independent root accepted histories; same-root prepared forks; explicit DOM/Three group final validation; failure in later group member leaves old managed accepted views. No new implied group from common Store/ancestor. |
| Lifetime/cold | Recipe/candidate retained then discarded, HMR exact revision retirement, keyed removal and final root disposal release references/resources exactly once. Existing bounded WeakRef/GC retention test mechanism covers removed row/host payload with root alive and released candidate. This proves collection in that case, not a memory budget. First cold frame and immediate repeated warm frames match; zero-output/equal output and signed zero preserve Object.is semantics. |
| Actual compiler | Retained child/effect controls, alternating programs, scalar marker literal, two independent offsets, exact module retirement, schema1/unverifiable schema2 fallback and current actual compiled output. Installed baseline/minified/rebundled/CSP retain verified arithmetic and now demonstrate mounted reuse. |

## One Luna boundary and exact commands

Primary prepares the new unit's copied `consumer/`, `source-basis/`, updated `initial-copy.json` and harness path references **before** release. Copy authored workload bytes from `2026-10-22-verified-scalar-execution`; only proof/tooling expectations and unit locations change. Preserve the default-minified/rebundled/CSP delivery controls and existing failure receipts. The fixture is added to the consolidated platform runner; its Deno invocations use `--frozen` as the existing runner does.

Use the same pinned Node and native-host runner. The commands below are handed to Luna, not executed by Sol agents or this review. `darwin-v1` and `proof-canvas-v1` must be nonexistent. Apply the existing bounded supervisor (1200-second correctness/build deadline; proof verifier has its own 120-second browser bound) and preserve stdout/stderr, numeric exits, before/after hashes and cleanup.

```sh
/Users/mini/.local/share/mise/installs/node/24.18.0/bin/node scripts/verify_native_platform.mjs --output-dir /Volumes/Depot/Developer/r3act/implementation/2026-10-22-bound-scalar-execution/verification/darwin-v1 --expected-platform darwin --expected-arch arm64 --execution-kind native-host
```

Primary reviews the consolidated receipt before consumer preparation:

```sh
/Users/mini/.local/share/mise/installs/node/24.18.0/bin/node implementation/2026-10-22-bound-scalar-execution/consumer/prepare.mjs --proof-dir /Volumes/Depot/Developer/r3act/implementation/2026-10-22-bound-scalar-execution/proof-canvas-v1
/Users/mini/.local/share/mise/installs/node/24.18.0/bin/node implementation/2026-10-22-bound-scalar-execution/consumer/verify.mjs --phase proof --proof-dir /Volumes/Depot/Developer/r3act/implementation/2026-10-22-bound-scalar-execution/proof-canvas-v1
```

After primary source/proof review, primary writes the existing timing authorization record bound to actual `build-proof.json`, `input-lock.json` and untimed proof hashes. This is internal release sequencing under existing human authorization, not a new user-permission request. Then Luna executes exactly once:

```sh
/Users/mini/.local/share/mise/installs/node/24.18.0/bin/node implementation/2026-10-22-bound-scalar-execution/consumer/verify.mjs --phase timing --proof-dir /Volumes/Depot/Developer/r3act/implementation/2026-10-22-bound-scalar-execution/proof-canvas-v1
```

Keep Native → declarative React Compiler/R3F → useFrame → imperative order, 12 warmup/60 measured, common renderer/inspection/readback, unchanged values/resources/output, baseline unminified timing and null diagnostics. No additional instrumented timing, favorable repeat, old-source timing rerun, VM or server. Offline intercepted HTTPS is already supported; if a listening server becomes necessary, load `$portless-dev-servers` first and preserve shared routes. Browser runs remain headless, bounded and interruptible.

Report separately: (1) correctness, (2) structural delivery/compiled/minified/CSP route selection, (3) observed realtime parity. Update and through-draw median/p95 must all be at or below the same-run declarative arm to claim this bounded parity observation. `useFrame` and imperative remain separate contracts. Record misses without causal attribution; preserve all samples and failures. Setup/bundle observations retain their existing scope; matched cold/memory and independent-device qualification remain absent unless separately authorized and completed. Do not splice previous episode medians into a claimed improvement.

If the slice still loses, do not automatically dispatch another interpreter/target cache/host writer specialization. Record the finite result and retained/retired mechanisms. This plan is an exact next implementation attempt; it is not evidence that the remaining 80% budget is recoverable, nor completion of the full product plan.
