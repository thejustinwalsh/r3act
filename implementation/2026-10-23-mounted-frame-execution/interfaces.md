# P0: shared implementation contract

Human authorized the Astra wave on23October. Read the complete [Astra orchestration](../2026-10-23-astra-realtime-next-wave/orchestration.md); this file fixes the shared seams before parallel production edits. Primary owns interface decisions; an author reports a necessary change before consumers invent another version. B owns concrete class internals and canonical capture authority; the following exported symbols and semantics are fixed.

## B-owned plan and cut API

Keep `MountedClosedStoreExecution` as the one retained composition in `closed_store_execution.ts`. Export `prepareMountedClosedStoreExecution(orderedRequests, previousPlan?, planCounts?)` to normalize/authenticate/build or repair on selection change. Root supplies its retained request vector on warm frames; do not unwrap/copy it on each capture. Existing chunk repair/prune APIs remain the one implementation. Add stable row metadata accessors to the plan as necessary; metadata is mount-owned, not copied into output rows.

Change `prepareOwnedClosedStoreOutputs(world, transaction, mountedPlan, counts?)` to return `{kind:"ready", cut:OwnedClosedFrameCut}` / `{kind:"public-required"}` / `null`. No rows/regions transport result and no previous-plan construction inside this capture function. Move existing schedule state into the authentic candidate-private cut rather than wrapping an old Schedule plus duplicating its arrays. `OwnedClosedFrameCut` is defined/exported by `closed_store_execution.ts` so the canonical result producer keeps private construction authority. Root and VDOM import it directly there. It does not import Root or VDOM runtime/private types. A narrow distinct input-buffer helper may remain internal, without duplicated row/output transport or parallel owned paths.

Cut consumer surface (canonical frozen class accessors, with safe private-brand ownership check rejecting proxies):

```ts
OwnedClosedFrameCut.owns(value: unknown): value is OwnedClosedFrameCut
cut.mounted: MountedClosedStoreExecution // canonical retained execution identity
cut.rowCount: number
cut.cellCut: ClosedWorldCellCut
cut.ownerAt(i): number
cut.keyAt(i): string
cut.tagAt(i): string
cut.retainedChildrenAt(i): boolean
cut.layoutAt(i): OwnedScalarLayout
cut.cellsAt(i): readonly OwnedClosedWorldInputCell[]
cut.lineageAt(i): readonly number[]
cut.valueAt(i, prop): OwnedScalarValue
cut.imageAt(i): OwnedScalarImage
```

Metadata/coordinates come from authenticated mounted/batch plans. Fresh buffers/capture stamps/world rows/result pages belong to this cut. `imageAt` returns one immutable accepted-image view per row, lazily if useful; this is the minimal actual accepted value used by both Root and VDOM, not an object carrying owner/tag/key/lineage/cell transport fields. VDOM consumes layout/value accessors directly. Required immutable accepted VNode/output identities remain per-update. The only sealed-result producer is the existing canonical bound-plan capture/evaluation pipeline; no public flag/frozen structural wrapper proves authenticity. B must use genuine private construction/production authority and avoid exposing a result-injection method. Constructor internals and input-fill canonical accessors remain B-owned; coordinate with C if this exact surface needs a justified change.

B changes Store owned-direct reader storage to plan ordinals + current transaction snapshots throughout validation, generic promotion and publication. Capture/publication reuse one plan reader partition. Generic promotion uses captured state, not latest head. No new identity/version registry, mutable accepted mirror, unbounded subset cache or second owned-direct representation. Fresh canonicality checks and exact World/Store history remain. All current owned-output callers/tests migrate to the new plan→cut contract; obsolete output-row builder symbols disappear when no genuine generic caller requires them.

## A-owned Root regions and lifecycle

A keeps Root-only immutable region metadata on existing accepted output shapes; current ComponentCache base references remain candidate-local. Keep one bounded selected composition: plan, retained Root regions, retained request vector and retained opaque VDOM bindings vector belong together under the existing Root mounted slot/authority. No parallel cache keyed by publication/version. Selection reads current live membership; static owner/site/program/effect/shape assembly is done at bind/repair, not duplicated in immediate preflight and passive staging.

Root consumes cut ordinals for currentness, staging/publication and mixed cells. Remove owned warm PassiveRow/owners-as-transport/regions/stagedByRegion/scalar-successor-array construction. A generic ClosedStoreOutputCut may retain generic regions for genuinely non-owned cases; the owned variant carries the cut instead. Keep all live coverage, holds, newer actions/notification semantics, ancestors, immutable output identities and existing candidate publication order. No replay after writes.

## C-owned VDOM API

Change `prepareOwnedScalarStoreDeltas(cut, mountedBindings?)` in place, with the cut above and a retained readonly vector of existing `MountedScalarStorePlan|null` opaque tokens. On warm selection this vector is retained with Root composition; do not rebuild/map/copy it per frame. Cold prepare authenticates cut and resolves/proposes bindings without installing anything. Add `mountedBindingAt(index): MountedScalarStorePlan|null` to the returned existing prepared program. Root reads it on cold/changed acceptance to install bindings; warm frames do not shuttle successor arrays back and forth.

The existing scoped composite preparation receives an optional owned cut (append an optional argument rather than create another public publisher) so combined supported Store/cell/keyed cuts can use the same owned record representation. Coordinate its exact trailing parameter with A. Both composite and immediate programs expose `mountedBindingAt` where applicable. Generic public delta parsing remains defensive; private owned cut enters the same prepared record/liveness/application machinery without parsing structural region/image descriptors.

C keeps VDOM private nodes/current VNode bases in existing prepared records, not in B's cut. Mounted geometry belongs to existing node/key authority. Per-cut storage contains only current/next accepted references/stamps, not another copied geometry/target descriptor. Required bucket/member and target-child live sweeps, host reflection, per-write and final guards remain. Reuse genuinely private immutable child arrays; never reuse a caller's arbitrary frozen/proxy children as a proof.

## Cold order and release

Root derives unbound region/request metadata → B captures/evaluates → C proposes opaque bindings in the candidate → checked application installs VDOM bindings → successful Root publication installs complete Root composition. Discard installs neither; postwrite failure quarantines. A/B/C do not import private ComponentCache/MountedNode types across ownership boundaries. Root and VDOM stamps stay in their current candidate/prepared records; cut contains only canonical input/result data. Public getter/proxy/override boundaries preserve callback order and recheck live state afterward. Generic/opaque fallback may decline only before host mutation.

## Ownership / acceptance

A: component_state_runtime.ts + Root-specific tests. B: closed_store_execution.ts, owned_closed_frame_input.ts, closed_scalar_output.ts, async_store_runtime.ts, owner_state_world.ts + capture/helper tests. C: vdom_snapshot_runtime.ts + VDOM tests. Primary: driver/queue integration as needed, compiler fixtures, runner/delivery/harness/docs. No implementation agent executes tests/builds/benchmarks. Primary source reviews integration, then Luna runs one consolidated boundary. Existing verified dirty source/tarballs were preserved before edits in prechange-source/prechange-packages; HEAD alone is not the baseline. One balanced production episode evaluates the complete migration; no helper timing or favorable rerun.

Exact scoped composite seam agreed by A/C: `prepareScopedKeyedRetainedAndStoreDeltas(deltas, updates, storeRegions, replacements = [], scalarPlans?, ownedCut?: OwnedClosedFrameCut)`. Owned caller supplies empty generic storeRegions, retained bindings at5 and authentic cut at6.
