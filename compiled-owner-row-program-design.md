# Compiled owner-row update program: design proposal

## Scope and current evidence

The prepared dirty-membership confirmation did not pass its registered latency gate: all 30 pages and 925 locks validated, while median ratios were 1.1752, 1.2165, and 1.2596 and paired-p95 ratios were 1.4151, 1.1226, and 1.3246. This note proposes a compiler/runtime shape for review; it makes no performance claim.

The relevant implementation is split across `compiler/oxc-spike/src/main.rs`, `src/compiled_state_layout.ts`, `src/component_state_runtime.ts`, `src/owner_state_world.ts`, and `src/vdom_snapshot_runtime.ts`.

### Why the current lane path is unary

The OXC pass collects reads inside intrinsic JSX prop expressions in `NativePropCandidate`. It admits a candidate as a numeric program only when all references resolve to immutable state bindings initialized with a recognized numeric literal, there are no other references or store reads, and `numeric_expression_is_pure` accepts the expression. It then emits a descriptor with a sink ID and ordered unique `sourceSites`. A one-source candidate becomes `bindStatePropAt`; a multi-source candidate becomes `bindStatePropsAt`.

Storage layout is narrower than numeric-program emission. `unary_layout_sink` requires exactly one distinct state and exactly one reference to it. Every site in any other pure sink is put in `non_unary_layout_sites`; the final layout is `unary_layout_sites - non_unary_layout_sites`. Consequently:

- Several separate unary sinks for one state are compatible with a lane and one existing unary source slot can fan out to them.
- If that state also appears in a compound sink, the non-unary set removes the state from the layout, even if all uses are compiler-certified pure.
- A repeated read such as `data-sum={x + x}` has one distinct source but a reference count of two, so it emits a one-source program yet prevents the lane.
- A vector such as `position={[x, y, z]}` emits a three-source program, but each participating slot is excluded from the layout. Even if lanes existed, `prepareNumericCellProgram` and `executePreparedNumericCells` require unary fanouts.

The generic `executeSourceProgram` path already supports multiple sources: it mirrors captured source values, finds the union of affected groups, calls each group's `read`/projector once, stages outputs, and then writes. `bindSources` also keeps a stable input array for a compiler-described program. The gap is that this multi-source group cannot participate in the prepared lane cut.

### Current trust and semantic boundary

The purity check is a conservative lexical recognizer, not a TypeScript type or effect system. It accepts state-name/literal arithmetic, conditionals, template literals, and arrays, while rejecting unknown identifiers, calls, optional access, assignment, and several mutation forms. It does not prove arbitrary imported or user-provided functions pure. The numeric descriptor is therefore evidence emitted for recognized compiler expressions; it must not be generalized to opaque imports or arbitrary callbacks.

`numericLaneForCell(handle, version)` is the authoritative check for committed World cell identity, owner/site, exact version, lane identity, row generation, and liveness. `PendingStateChanges.captureNative` captures exact handles and versions into reusable buffers. The World cell handle and version remain the correctness basis through reentry, key removal, disposal, promotion, and row reuse. A VDOM program may validate its own binding-generation/fanout token, but must not replace these World checks.

## Proposed compiled shape

Separate *numeric storage eligibility* from *writer arity*.

1. Keep current restrictions for optimized use: a state binding must be immutable, have a recognized numeric initializer, and be used only by intrinsic prop candidates the compiler certifies. A candidate involving an outside read, store, unknown value, or rejected expression remains on the current ordinary owner/render path.
2. For a certified component, include each distinct certified numeric state site in its dense `stateLayout` regardless of whether its sinks are unary, repeat the site, or use several state sites. Layout slots describe storage, not a unary writer restriction.
3. Emit an owner-program identity tied to the component site and a stable sink identity for every certified candidate. Retain the current ordered `sourceSites` on each sink. A multi-source sink is associated with the row only if every listed site resolves to a slot of the same component owner and the exact layout.
4. Preserve per-state source identity and all existing binding helpers. Do not replace the authored expression or run it from Root/World. The generated projector remains the sole expression evaluator.

A versioned metadata shape should make the distinction explicit instead of silently widening schema v1. For example:

```ts
type CompiledOwnerProgram = Readonly<{
  schemaVersion: 1;
  programId: string; // stable component site ID
  slots: readonly Readonly<{ siteId: string; slot: number }>[];
}>;

type NumericBindingProgramDescriptorV2 = Readonly<{
  schemaVersion: 2;
  ownerProgramId: string;
  sinkId: string;
  sourceSites: readonly string[]; // unique, ordered source vector
}>;
```

The actual wire shape can differ. Required invariants are that component program IDs and slot order are stable; sink IDs are unique within the compiled module; `sourceSites` is a duplicate-free ordered dependency list; and every sink's sources belong to exactly one owner program. Keep schema v1 readable for current unary programs during migration.

## Runtime path

### Registration and prepared token

At component render/VDOM commit, index each compiler-described group once by its complete ordered source list and sink ID. On committed lane association, assemble a cached `PreparedOwnerRowProgram` for `(VDOM root, owner, programId, row, generation, binding generation)`. It contains the per-slot `ScalarSource` references and the affected unique sink groups in deterministic order. Keyed reorders preserve the token because owner, row, generation, and writers are unchanged. A writer membership change, owner removal, promotion, or row reuse invalidates it. Private candidate state receives no committed row token and cannot write World columns before publication.

Root prepares/reuses this token when the committed component row is available, not once per frame. World remains responsible for exact cell liveness and version checks. The Root must reject or fall back if a captured change lacks a current lane, is promoted/non-numeric, has a different layout/owner/generation, or has no matching prepared row program.

### Captured row cut

Use Root-owned high-water scratch arrays; no temporary arrays, closures, `Map`, or `Set` per frame. `captureNative` remains the cut source. Root resolves each captured handle/version through World and groups changed slots by `(owner, programId, row, generation)` while retaining each slot/value pair in capture order. A packed API could be:

```ts
executePreparedOwnerRows(
  tokens: readonly (PreparedOwnerRowProgram | undefined)[],
  rowOffsets: Uint32Array, // rowCount + 1
  slots: Uint32Array,      // one entry per changed cell
  values: Float64Array,    // captured values parallel to slots
  rowCount: number,
  cellCount: number,
): boolean | null;
```

`null` means preflight declined before source mutation, projection, or host writes; `false` means the supported cut was accepted with no writes (including equality suppression or guarded cancellation); `true` means at least one host write occurred. An equivalent packed representation is fine if its empty/declined/changed meaning is unambiguous.

VDOM preflight validates every row token, row generation, slot range, source/program membership, duplicate slot/value consistency, and binding generation before mutating sources. It then mirrors all captured source values for every row before projecting any sink. It collects the union of impacted groups with a reusable epoch stamp, so a vector sink reached through x, y, and z is projected once. It evaluates every impacted sink once against the complete source vector, stages all outputs, and only then begins host writes. Preserve group order using captured source order and the existing per-source fanout order, deduplicating a multi-source group on its first touched dependency. Keep equality checks, style writers, direct-writer mode guards, and retained host values unchanged.

Root applies the same host-mutation/publication wrapper used today. Only an accepted result may publish and acknowledge the exact captured versions with `clearCellChangesThrough` and `clearNativeThrough`. A decline converts to non-publishing `false` for that attempt and takes the established fallback without acknowledging. Reentrant writes with versions newer than the cut remain queued. Host errors retain the existing terminal failure and no-ack policy. No row-program route may publish candidate-private values or acknowledge merely because a token was present.

## Smallest implementation boundaries

1. **OXC metadata and eligibility — `compiler/oxc-spike/src/main.rs`.** Replace the unary-only `layout_eligible_sites` calculation with a storage eligibility calculation from distinct certified state bindings. Preserve `non_unary_layout_sites` only for diagnostics if useful, not as a storage veto. Emit program ID and owner-level metadata; retain exact sink source ordering. Prefer AST-derived identifier/assignment/call checks over expanding the text scanner. Do not mark member calls/imports pure based on names.
2. **Layout and binding descriptors — `src/compiled_state_layout.ts`, `src/jsx_binding_runtime.ts`, `src/component_state_runtime.ts`.** Add versioned owner-program metadata and descriptor validation. Keep current v1 descriptors and ordinary binding behavior working. Continue to use ordinary `ScalarSource` identities; the owner program adds a grouped execution plan rather than changing state semantics.
3. **World row identity — `src/owner_state_world.ts`.** Expose or internally resolve the existing exact row tuple `(owner, layout, row, generation, slot)` from captured committed handles. Reuse `numericLaneForCell` as the authority or introduce a bounded bulk resolver that performs the same identity/version checks. Promotion and destruction revoke the row token; row reuse increments generation. Do not infer a current owner row from column plus row alone.
4. **VDOM group plan — `src/vdom_snapshot_runtime.ts`.** Build an indexed owner-row sink fanout from compiled descriptors as writers attach/detach. Add prepared row token validation and the packed row-cut executor. No full-tree scan on numeric flush. Use reusable sink stamps for dedup and existing projection-before-write staging/error cleanup.
5. **Root orchestrator — `src/component_state_runtime.ts`, `src/pending_state_changes.ts`.** Coalesce native handle/version captures into row scratch, preflight one token per row, route decline to fallback without publication, and acknowledge only after acceptance. Keep all buffers rooted, clear object references in terminal cleanup, and preserve deferred newer writes. This step can use a separate reusable World resolver if the per-cell identity query is materially present in fresh CPU evidence.

Avoid changing keyed membership, public `useState` duplicate behavior, source identity, transition/store semantics, or generic fallback semantics as part of the first implementation. Mixed or unsupported rows should decline atomically and use existing fallback.

## Proof obligations before any timing study

- Compiler fixtures: three separate unary sinks; one state in several sinks; `x + x`; vector `[x,y,z]`; source order `[z,x,y]`; multiple reads in one vector; conditional and template expression; mutable state binding; nonnumeric initial state; numeric state used by effect/local computation; impure/imported call; setter/updater closure; and two same-shaped component sites that must not share programs.
- Metadata checks: stable program/layout/sink IDs; dense slots; exact ordered and unique source lists; no program for uncertified expressions; no layout widening for state observed outside certified props.
- Runtime values: sparse one-slot update recalculates a dependent vector from the changed value plus untouched current row values; all three same-frame changes yield the exact authored position; several independent unary style sinks still run once each; duplicate source notifications do not duplicate projection or writes.
- Atomicity: a stale token, wrong owner/layout/slot/generation, conflicting duplicate slot, promoted slot, or partially detached fanout returns `null` before all source mirrors, projectors, and host writes. Root fallback then commits once and acknowledges only accepted versions.
- Ordering: all source mirrors for all rows are installed before any projector; all projectors for all rows finish before the first host write; stable output equality still suppresses writes; host-write reentry observes the same captured outer outputs and leaves newer writes pending.
- Lifecycle: keyed moves preserve row identity; remove/dispose revokes tokens and clears source/group references; row reuse with a new generation cannot accept an old token; refresh invalidates only affected owner-row programs; retained dead setters remain rejected; host failure is terminal and does not clear captured work.
- Candidate isolation: prepared/private rendering does not mutate committed columns or host output; publication is the only point new row programs become visible; discard releases private candidate tokens and sink associations.
- Fallback compatibility: manual bindings, unsupported imported expressions, text/non-numeric state, external observers, stores, transitions, and compiled graph bindings continue through existing paths with current read/write ordering.
- Performance qualification: first prove the cut path and counters with no snapshot/generic-source fallback for eligible rows. Then collect a preregistered fresh timing study with all 30 pages and unchanged thresholds. This design alone does not predict a pass.

## Remaining uncertainty

The implementation should first confirm that `position={[x, y, z]}` is represented as one `bindStatePropsAt` group with ordered `sourceSites`, and that World has one row/generation shared by every compiled layout slot. The runtime types indicate both assumptions, but the new compiler fixture should pin them. It also needs a measured breakdown of Root lane resolution versus VDOM source/sink staging before deciding whether a bulk World resolver is worth adding. Preserve ordinary fallback until those checks and the correctness tests pass.
