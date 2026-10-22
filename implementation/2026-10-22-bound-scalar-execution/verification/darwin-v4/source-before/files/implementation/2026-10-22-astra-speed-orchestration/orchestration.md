# Sol implementation orchestration

This plan separates the active slice's correctness completion from one subsequent ordinary scalar contraction. All implementation agents use **gpt-6-sol with medium reasoning**. Luna alone executes tests, builds, gates and benchmarks after primary release. Primary owns integration, interface decisions, source locks, evidence interpretation and checkpoint updates. No agent edits another active owner's files.

The [report](report.md) gives the evidence and limits. No phase has a measured removable-time budget. The measured target is the existing four-arm frame episode; parity requires both median and p95 on update-step and through-draw, with state-age and lifetime behavior preserved. Changes below have source retirement requirements and semantic falsifiers, not promised millisecond gains.

## 0. Complete the active slice before a new assignment

The following repairs were communicated during this review and assigned by primary. They are not assumed verified merely because source arrived:

1. **Store projection reuse:** capture each distinct Store/owned-path once within the new operation, before pinning, and seed the existing transaction memo. Stage every reader separately. No new accepted history or cross-frame cache.
2. **Semantic schema-5 eligibility:** remove the `accepted-frame` literal test. Permit the already supported empty-child group with normalized literal primitives and supported finite numeric expressions. Preserve child/resource/aggregate/opaque rejection and compiler whole-owner proof.
3. **Publication closure:** finish public preparation/validation before canonical final checks and accepted mutation. Add the post-host private cell predicate described below; canonical lineage and exact acknowledgement run as internal publication operations. Public capture, validation, APIs and manual kernel behavior remain.
4. **Resource retirement:** share one destruction implementation with private recursive internal execution. Capture retirement source references before final publication; retain existing Root cache/dirty/ancestor bookkeeping and postpublication effects. Internal retirement initially supports a privately verified no-lane subtree. Unsupported lane state declines before host writes; lane introduction during host work rejects/quarantines before any accepted pointer advances.

Do not add a blanket canonical-World guard to all candidates. Keep the existing `PublicCallbackWorld` group-revocation fixture unchanged: its public scalar-source callback must still execute during public validation, and the final private check must reject the invalidated peer. Exact receiver/prototype restrictions belong to passive **capture** where overriding public reads would otherwise be suppressed. Final canonical World operations are an explicit internal publication protocol, not overridable acknowledgement hooks. No early call to `clearCellChangesThrough` is permitted.

### Exact post-host cell predicate

For each runtime-owned captured write, use the captured canonical World source/version functions, without calling receiver methods:

- owner remains live;
- source and cell incarnation are exactly the captured ones;
- current version is at least the captured version;
- when versions are equal, the canonical own scalar value is `Object.is` equal to the captured value;
- when current version is newer, retain the captured accepted value and acknowledge only the captured cutoff, leaving the newer action pending.

Pre-host uses exact version equality. Apply the post-host form to both closed-input and resource-retained final sweeps. Keep public post-host validation before it. No arbitrary prototype-chain walk or caller descriptor normalization may occur after the last private all-member check.

### Exact retirement boundary

`OwnerStateWorld.destroyOwner` currently recurses through the public method. Factor one shared private body with two modes: public calls preserve their existing virtual child recursion; the internal operation uses private child recursion. Both execute the same owner-slot removal, incarnation revocation, state cleanup and dirty-journal retirement. The internal entry must reject forged receivers/containers and must not return a reusable trust token.

The no-lane restriction is necessary because `detachNumericLane` and `#releaseNumericLane` read publicly reachable `column.values`. Do not claim that a captured outer `destroyOwner` function fixes those accesses. Verify the entire retiring subtree privately before host application, and again after host work before acceptance. Root's final retirement deletes already captured source references from its existing history Map; it must not invoke public `scalarSource` to discover them during the swap. Ref/effect cleanup stays after successful publication as before.

Primary reviews actual corrected source, including `#retireOwnerAccepted`, resource `stage.publish`, direct-keyed refresh and all callers of `closed.publish`. Do not claim every inherited publication path is now callback-free merely because these named seams are fixed. Preserve any remaining wider audit gap explicitly.

### Active boundary release

Primary freezes the final corrected source only after combined review. Luna runs the existing consolidated `--frozen` correctness/package/compiler gate with the new regressions included, then a fresh installed untimed four-arm proof. Preserve actual failed exits and original logs; repair correctness with separately locked attempts, without timing until proof succeeds.

The untimed proof must establish emitted data metadata, no emitted kernel for selected owners, 257 data rows/one successful batch on the unchanged frame workload, unchanged legacy controls, retained owner/child/resource identity, exact values/pixels and exactly-once teardown. Route counters are source evidence, not timing. Primary then releases the **single** bounded existing fixed-order Native → declarative React → R3F useFrame → imperative comparison, 12 warmup/60 measured, same common draw/readback and renderer contract. No old-Native arm, per-helper run, density sweep, favorable repeat or restored Recording A.

If it loses, close that slice with separate semantic/performance verdicts. The next unit below requires a recorded primary decision to retain the data capability and select the named contraction; it is not an automatic retry.

## 1. Select one integrated ordinary retained-scalar contraction

Retired mechanism: repeated owner reconstruction, generic child-tree completion and deferred candidate adapter construction on an immediate scalar-only flush.

Invariant authority: unchanged World identity and chronological cells; unchanged Store snapshots/reader history; unchanged Root accepted caches; unchanged mounted VDOM handles/targets; unchanged host-publication domain and receipt state machine.

Required semantics: existing values/order, exact captured ack, newer reentry, accepted/forked/held history, owner/source/code/writer/hold liveness, retained child/resource lifetime, generic and legacy fallback, old accepted reads while applying, whole-root checks for whole replacements and quarantine after partial writes.

Budget: no measured savings allocation. At the last locked baseline, Native needs 3.30/3.90 ms update-step median/p95 reduction to match declarative React. This next unit must report its own result and may not inherit that denominator as a causal before measurement.

Falsifier: any removed adapter or loop is still constructed on the successful route; any second publication state machine or mutable identity/version registry appears; any callback moves across required live validation; or the completed boundary still fails the selected performance gate. A source contraction alone is not a speed success.

## 2. Freeze interfaces before Sol dispatch

Keep interfaces module-internal; do not expand public barrels or compiler grammar for this unit.

### A to C: canonical private input validation

Use one module-owned operation in World to validate the complete owned local-cell footprint. Proposed shape:

```ts
validateClosedWorldCut(world, orderedCapturedCells, phase)
// phase: "prepared" | "after-host"
// returns boolean; no callback argument or reusable permit
```

Concrete types reuse existing `StateCellHandle`, `ScalarSource`, version and value fields. The Root builds/copies the ordered cut during preparation and does not expose mutable storage. A public deep import remains safe: normalize external containers before the internal check and use private-brand/capability resolution, not caller-provided methods. The Root's final invocation must supply already owned containers so this operation introduces no external trap in the final region. Do not use `readonly`, a public boolean, or frozen arbitrary input as provenance.

The private loop resolves each cell once and checks identity, source, version and canonical scalar value together. It replaces the pair of independent canonical source/version lookups per cell. C can union identical explicit writes and closed-reader state inputs during preparation so a cell is checked once **within a phase**, without dropping a different captured cutoff. Conflicting captures decline. Keep distinct checks across public callbacks and host application; this is not one validation per frame.

For accepted unselected Store receipts, a separate enclosed batch can audit one shared prototype and each distinct Store once, then inspect all reader histories privately. Only implement this if the current next-unit scope includes such receipts. Root's public current-check route retains existing callback/normalization order; its private final route can use already owned receipt requests. Receipt identity, stamp, root epoch and current-versus-retained distinction remain. This is useful for held/joint scenes and **does not explain or speed the one-selected-Store benchmark by itself**. Do not add this API merely to fill an agent's schedule.

### B to C: existing scalar delta record

B should preserve `prepareScopedKeyedRetainedAndStoreDeltas` and `PreparedScopedKeyedRetainedProgram` signatures. Its direct scalar-only final assembly produces the same `StorePropDeltaRecord` targets, writer, buckets, journal and token as before. No new sink index, retained VDOM representation, host writer or eligibility flag from callers.

### C internal: one publication core, optional public adapter

Refactor `#createCandidateLifecycle` into one authoritative lifecycle core plus a public/deferred adapter. Exact internal naming is C's choice after primary review. A core holds the current phase, admitted bases, claims, candidate holds, prepared publication and release state. Public `NativeRootCandidate` methods/accessors delegate to that core; group receipts reference the same core. Ordinary immediate flush drives it without allocating the public facade or registering an unused facade in the receipt WeakMap.

Do not implement a separate `fastCommit` with copied validation/publication logic. Avoid a tag whose only effect is to leave both engines alive. Allocation retirement must be visible in code: shared core methods, no unused deferred methods rewritten on immediate release, and no duplicate candidate/receipt identity for one operation. If a public candidate escapes, preserve its existing late-call validation, single-use behavior, getters, discard semantics and failure behavior.

## 3. Disjoint Sol assignments

### Sol A — World input validation (medium)

**Own:** `src/owner_state_world.ts`, `src/owner_state_world_test.ts`. Store receipt batching, if selected by primary, additionally owns `src/async_store_runtime.ts` and its test file; announce before editing. Do not edit Root, VDOM, host, compiler or evidence tooling.

**Implement:** one enclosed private World validation operation over existing captured cells. Share existing capability resolution and primitive checks. Preserve public methods and all externally observable public validation. Support exact pre-host and newer-version-tolerant post-host semantics. Reuse the current internal retirement implementation, do not rewrite it.

**Retire:** separate canonical source and version resolutions for each cell when C adopts the operation; duplicate validation of the same captured cell within one passive phase. Keep post-callback and post-writer sweeps. No new persistent canonical cache or World-version mirror.

**New cost:** request ownership/normalization and optional cut-local dedup. C should build the footprint once during preparation, not once per validation. No retained cross-frame state.

**Required authored regressions:** forged/Proxy receiver and handle; later request normalization revokes earlier cell; same-key reincarnation; equal version but altered source scalar; newer reentrant version accepted as newer while old cutoff remains; two captures of same cell with conflicting versions decline. Preserve subclass public callback tests in Root integration.

**Falsifier:** a callback can execute after the operation starts its private validation; a stale row succeeds; or the adapter still calls both old public/canonical methods and the new batch, adding work instead of replacing it.

**Handoff:** actual function/type names, last-external-read call graph, retired lookups, lifetime and commands for Luna. No execution.

### Sol B — VDOM scalar-only assembly (medium)

**Own:** `src/vdom_snapshot_runtime.ts` and its corresponding test files. Do not edit Root, World, Store, Three or compiler.

**Implement:** after complete preparation proves all targets are owned scalar records with no child-tree/text replacement, finish the existing delta without `byNode`, `textByNode`, `completed`, recursive `nextVNode` or their completion loops. Shared target preparation still creates the required immutable next props/VNode and captures retained children. General structural/text work uses the existing assembly branch.

**Retire:** three generic assembly Maps and traversals whose only effect on this branch is to return `target.next`. Do not remove key-bucket membership records, target dedup, mounted identity checks, writer liveness, accepted journal or per-write reentry checks. Do not broaden to resource/tuple/copy-value handling.

**New cost:** one scalar-only branch over already computed facts; no new retained cache or index. Incoming owned-region provenance proves the proposed values, not arbitrary old mounted props, so leave required previous-value normalization intact.

**Required authored regressions:** original-order writes across alternating owners; same host key under distinct owners; retained child identity; ordinary scalar+tree mixed cut stays general; target removal/replacement during earlier writer; throwing second writer leaves accepted history old; no-op values and exactly-once resource disposal.

**Falsifier:** the optimized branch still allocates generic completion Maps, loses child/source provenance, or can bypass a mounted target check after a callback. Host code stays untouched.

**Handoff:** branch predicate, exact retired blocks, unchanged token/target interface and commands for Luna. No execution.

### Sol C — ordered Root rows and immediate publication adapter (medium)

**Own:** `src/component_state_runtime.ts`, `src/component_state_runtime_test.ts`, `src/closed_store_numeric_kernel_test.ts`. If extracting a module, announce its exact new path and keep it internal. Do not edit A/B files, compiler, package locks, Three, benchmarks or prior evidence.

**Dependency:** first freeze A/B interfaces; implement row staging while A/B work, integrate the validator after A's source handoff. Primary reviews the existing publication prerequisites before C starts the lifecycle-core refactor.

**Implement in this order:**

1. Build one original-order passive owner-row list during existing all-selection preflight. Retain cache/program/data-execution association, input IDs/store sources/path identities, request ranges, state sites and captured lineage. On successful capture iterate those rows directly. Do not reparse every reader ID or rebuild the same metadata from `#liveStoreReaders`. Mixed/legacy/noncanonical selections enter the old ordered route before any kernel callback. Keep `stageLeaf`, current-check and publication helpers shared.
2. Build one immutable logical validation footprint from explicit writes plus closed local inputs, preserving any differing cutoffs as a decline. Use A's private batch only within existing private validation phases. Public validation remains public. Group final admission still follows the last public callback for all participants.
3. Refactor the existing lifecycle core and lazily create its deferred facade. Route only the ordinary synchronous retained-scalar branch through the immediate core initially. Keep mixed structural/reveal/group/public prepare cases on their adapter until equivalence is source-reviewed; they still share the core implementation. Encode absent optional resource/collection work directly rather than manufacturing repeated empty containers.
4. Clear candidate-local rows, values, footprints and holds on decline, discard, failure, success and root disposal. Do not keep a cross-frame owner plan cache or duplicate Root accepted history.

**Retire:** repeated successful passive-branch discovery; metadata/reader-ID joins already resolved by preflight; unnecessary deferred facade/WeakMap association/method-rewrite work in immediate flush; repeated empty footprint construction. Kernel arrays become lazy legacy-run scratch. Maintain contiguous legacy run boundaries, exact arguments/buffers/callback identity and errors.

**Required authored regressions:** all-data, alternating data/legacy, first/last noncanonical owner, held unselected input, simultaneous local+Store action, an intervening unrelated scoped commit, stale code, newer writer-time action, public delayed candidate invoked later, grouped cross-root revocation, failure on second writer, disposal during host, and final histories observed from callbacks. Compare actual output/history/lifetime to existing generic oracle; do not merely assert internal flags.

**Falsifier:** public facade remains allocated on immediate success; two lifecycle implementations exist; a public callback is suppressed/reordered on the conservative route; stale data or newer action is acknowledged; a whole replacement drops its whole-root guards; an immediate candidate can escape without its normal public behavior.

**Handoff:** before/after path trace, exact removed structures, new per-cut data and lifetime, callback boundary table, commands for Luna. No execution.

## 4. Primary integration tasks

Primary owns actual Rust/OXC and installed cross-layer fixture changes, runner registration, proof assertions and documents. Do not alter authored workload arithmetic, scene topology, object/resource counts, camera, draw boundary, renderer flags, frame schedule or the existing comparator sources to make this unit pass.

Before release, inspect every retired block and trace the successful ordinary path through A/B/C. Require one authority for each mutable fact. Check the public/generic fallback and all final acceptance helpers rather than trusting function names containing `private` or `canonical`. Confirm prepared scalar values cannot escape into host-retained scratch. Preserve all existing hostile callback and fork/hold assertions; a guard that merely prevents a regression fixture reaching its intended boundary is not a fix.

The primary must explicitly list the semantic versus cost claims:

- private owned computation and capture prove a callback boundary, not a speedup;
- fewer lookups/maps/adapters are source facts, not measured allocation or phase time;
- all required output decisions/writes remain (769 changing scalar outputs for the existing frame trace);
- actual Three assignment, mutable-target resolution, resource lifetimes and renderer/readback cost remain;
- no same-semantics host-write floor has been measured, and the imperative reference has fewer obligations.

Do not optimize Three property writers in this unit. `createThreeHost` already caches property resolvers; it still dispatches events/material/property handling and re-resolves live targets/defaults. A prepared writer would need its own mutable-target/lifetime contract and budget. There is no evidence that it is the dominant residual and no authorization here for a new writer registry or bypass.

## 5. Luna-only consolidated boundary and finite decision

Luna stays idle during implementation. After primary freezes exact source and reviews combined changes:

1. Run one consolidated correctness gate with the existing frozen dependency/toolchain discipline; include new regressions, broad runtime tests, actual compiler fixtures, package/Three/lifetime and existing retention checks. Preserve all real exits and failed attempts. Agents do not run their commands individually first.
2. Build fresh installed packages and run one untimed four-arm proof. Confirm selected route, values, retained identity, actual compiler transformations, exact old-cut/new-action behavior and 512 exactly-once resource disposals per arm. Timing counters remain disabled in timing assets.
3. After proof review, run exactly one bounded fixed-order four-arm comparison under the existing 12/60 workload and common draw/readback. Use the required Portless skill before any project server; headless/interruptible/no focus, owned cleanup and shared-route preservation. No VM. The reviewer itself runs none of these.
4. Publish separate correctness/semantic and performance verdicts. Report median/p95 update-step, through-draw and state age; preserved failures, source lock, cleanup and limitations. No causal old/new saving from separate historical episodes, no arithmetic attribution of residuals, no population/second-device/cold/memory claim.

If the mechanism still loses, close this unit. Do not add per-row timestamps, generated JITs, new expression caches, workers, alternate containers or repeated timing until it looks favorable. Further product decisions may retain a correct capability, qualify a narrower workload, or decline a speed claim; they do not turn an unresolved removable budget into evidence.
