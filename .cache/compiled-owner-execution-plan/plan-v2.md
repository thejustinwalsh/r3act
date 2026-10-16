# Compiled owner update program: bounded implementation plan v2

## Decision context

The archived owner-row-fusion confirmation passed all 30 correctness pages and 7,200 measured frames, but failed the speed gate at every size. Paired native/React median ratios were 1.2525, 1.3897, and 1.3833 at 128, 512, and 1,024 rows; median paired p95 ratios were 1.1385, 1.4070, and 1.4983. These numbers describe that candidate and workload, not a causal comparison to earlier revisions. This plan makes no speed prediction.

The first plan draft assumed authored sink order and implied that fresh object outputs could avoid per-frame allocation. Neither assumption is safe. The current executor’s sink order is first touch while walking the captured changed-slot sequence, including interleaving between rows. Fresh JSX array/object expressions also produce fresh identities under the current projector path. The proposed first prototype therefore preserves the captured sequence exactly and optimizes only sinks whose result is statically proven primitive. Array/object and unproven result shapes keep the existing execution path.

## Current path and remaining generic work

OXC recognizes a conservative set of pure JSX prop expressions and emits one schema-v2 descriptor and one projector closure per sink. A descriptor carries `ownerProgramId`, `sinkId`, and ordered `sourceSites`; each closure still runs separately. At activation, bindings receive owner/layout/source-slot metadata. `prepareNumericRowProgram` validates memberships, builds `groupsBySlot`, and attaches projector/source-slot metadata to each group.

For a captured native cut, Root resolves each handle/version with `numericRowForCell`, groups changes by row identity, and packs row/slot/value arrays. VDOM preflights row records and leases, captures complete row inputs, mirrors all participating `ScalarSource`s, then walks the captured changed-slot list. For each changed slot it walks that slot’s sink fanout, appending a sink only on first touch. It copies the sink’s source values into its per-group input array, invokes the projector, compares the result with `lastValue`, and stages a writer group. Only after all projections does it run the generic host writers in the accumulated first-touch order.

World/Root identity and version checks, the exact dirty cut, and acknowledgement are correctness work. Preserve `captureNative`, every `numericRowForCell(handle, version)`/equivalent proof, source and column leases, row identity/generation, all-row preflight, source mirrors before projections, all projections before the first write, cancellation, equality and force-write semantics, terminal host failure, and exact-version acknowledgement. Reentrant newer versions must remain queued.

## Smallest proposed seam: emitted per-slot dispatcher for primitive sinks

Add a versioned executable owner program to the compiler’s component metadata. It is a module-scope ordinary JavaScript function with no captured World, row, VDOM, host, or mutable component-instance references. Keep the current v1/v2 descriptor and projector path untouched. Only rows whose complete sink set has this new executable metadata may use the fused path.

Conceptual API:

```ts
type CompiledOwnerUpdateProgram = Readonly<{
  schemaVersion: 1;
  programId: string;
  slotCount: number;
  sinkIds: readonly string[];
  // Called once per item in the exact captured changed-slot order.
  projectChangedSlot(
    changedSlot: number,
    completeInputs: readonly number[],
    rowState: OwnerRowExecutionState,
  ): void;
}>;
```

`OwnerRowExecutionState` is activation-owned scratch: a sink-state table in compiler sink order (`lastValue`, `forceWrite` and stable writer binding), a per-row seen-sink bit mask, and shared high-water output arrays for staged sink indexes and projected primitive values. No arrays, tuples, records, closures, or per-sink argument vectors are created during execution. Restrict the initial form to a conservative slot/sink limit compatible with a numeric bit mask (for example, at most 30 sources and 30 sinks). Larger programs use the existing path.

OXC emits a static `switch (changedSlot)`. Each case lists that source slot’s sink fanout in the same order used by VDOM preparation. For each sink, generated code checks and sets its `seen` bit. The first time that sink is encountered, it directly evaluates the authored expression from `completeInputs`, applies exactly the current `sameBoundValueCanSkipWrite` behavior using the sink’s `lastValue` and `forceWrite`, and appends the sink index and value to shared scratch only when a host write is required. This reproduces the current first-touch behavior because Root calls the program in captured dirty-slot order and processes the changed rows in that same global sequence. It preserves cross-row writer ordering as well as within-row order.

The expression’s full source vector is already assembled from the captured cut before any invocation. Thus a sink first reached through slot A may read slot B’s final captured value even when B appears later in the changed sequence, exactly as today. `seen` suppresses duplicate projection if another dependency of that sink is later encountered. Equality only filters writes; it does not reorder the projection pass.

For this first prototype, enable the executable only when the compiler can prove each sink result is primitive: numeric, boolean, string, null, or undefined from the restricted expression grammar. Primitive templates can allocate strings internally; this plan does not claim zero allocation for them. The runtime must allocate no per-frame collections or per-sink input arrays. Array/object results, functions, unknown result shapes, manual bindings, and unsupported expressions remain on their current path. The compiler’s current lexical purity recognizer is not expanded into a broader purity or result-type claim.

## Runtime integration and exact ordering

1. **OXC: `compiler/oxc-spike/src/main.rs`.** From already certified JSX candidates, emit the shared module-scope owner function, static sink-to-source fanouts, stable sink IDs, and primitive-result eligibility metadata. Keep existing `numeric_programs` schema-v2 output and fallback unchanged. Do not certify member/import calls or opaque expressions through new heuristics.
2. **Component and binding metadata: `src/compiled_state_layout.ts`, `src/jsx_binding_runtime.ts`, top metadata/binding layer of `src/component_state_runtime.ts`.** Add an explicit new executable metadata version tied to the exact layout/program ID. Validate dense ordered slots, unique sink IDs, ordered/unique source slots, and complete sink coverage once during activation. A missing sink, mismatched descriptor, or non-primitive output declines the executable program rather than changing the binding value.
3. **Prepared VDOM row: `src/vdom_snapshot_runtime.ts`.** Build the activation-owned sink-state table and writer bindings in the same order as current `groupsBySlot` fanouts. Record row identity, generation, layout signature, source/column leases, and binding generation on the opaque token. Existing refresh/removal/disposal hooks invalidate it. No VDOM tree walk or fresh index is added to a frame.
4. **Root cut: `src/component_state_runtime.ts` and `src/pending_state_changes.ts`.** Keep `captureNative` and resolve every captured handle/version to its exact current row/slot before any source mutation. Build complete input vectors and validate all tokens/leases for the entire cut. Mirror every participating source across all rows. Reset each row’s seen mask, then walk the original captured `(row, slot)` sequence and call that row’s `projectChangedSlot`. This stages writes in global first-touch order. Check cancellation between generated sink operations. After every row program completes, walk the staged sink sequence and invoke the existing generic VDOM writer. Update `lastValue` only after its host write succeeds.

The compiler function does not replace `#writeBoundGroup`, host generation, or host-specific style/property setters. It removes the generic source-fanout, input-copy, projector-call, equality, and writer-selection work for this narrow subset. It does not remove Root’s per-cell identity/version checks, row grouping, queue capture/acknowledgement, or one host write per selected sink. The previous profile’s Root and VDOM costs therefore remain measurement targets; no attribution is inferred solely from this design.

## Atomicity, fallback, and cleanup

Before using generated code, preflight the whole cut: exact live handle/version, current row/lane/slot, matching owner program/layout/generation, unchanged source and column leases, valid dirty slots, and no conflicting duplicate slot values. Also validate that every sink in the prepared row is represented by the same executable program and still has its prepared writer. Any mismatch declines before changing mirrors, invoking generated projections, writing hosts, publishing, or acknowledging. Use the established fallback; do not retry through fallback after a writer has partially changed the host.

After preflight, read the complete per-row value vectors from the captured columns plus captured changed values, and restore/mirror scalar sources consistently with the current route. Only then execute programs. No host writer runs until every program for every row has completed. If disposal/cancellation is observed between projections, stop before writers and keep the existing cancellation result semantics. Host reentry during the later writer pass may dispatch newer values; the outer pass keeps its captured output vector and exact-version acknowledgement leaves newer values pending. Writer failure remains terminal with the existing no-ack policy.

All scratch arrays retain high-water capacity. Clear used object references in `finally`, including staged output values and row/token references. Primitive-only eligibility makes staged values number/string/boolean/null/undefined, but string objects may still be engine-allocated values; reused scratch must not retain them after a cut. No new source identity, World API, or structural collection behavior is introduced.

## Eight focused acceptance cases

1. **Compiler/association contract:** actual authored TSX emits one shared executable per owner program; IDs, dense slots, source ordering, sink IDs, and fanout order agree with existing v2 descriptors. Same-shaped components remain isolated.
2. **Sparse and first-touch order:** a sparse cut invokes only dependent sinks. A test with overlapping sink dependencies and reversed/interleaved changed-slot order proves projection and writer order match the current executor, not authored sink order.
3. **Complete multi-source cut:** a multi-source primitive sink sees every changed and unchanged value from the captured row vector. Every source mirror across all rows precedes the first projection; all projections precede the first writer.
4. **Equality parity:** unchanged primitive results suppress exactly the same writes; force-write behavior matches existing runtime. Verify templates and conditional primitive outputs against the old projector.
5. **Atomic decline:** stale handle/version, wrong generation/layout, conflicting duplicate, unsupported sink, or stale writer generation declines before mirror/project/write/ack; existing fallback publishes coherently.
6. **Reentrant writer:** reentry updates the same state during a host write. Outer projections use captured values; its acknowledgement preserves the newer dirty version; a following flush writes the newer output.
7. **Lifecycle/structure:** keyed move retains a current token; removal/disposal revokes it; row reuse with a new generation cannot use the old token; sink refresh invalidates and falls back/reprepares safely.
8. **Failure and compatibility:** a host exception follows terminal no-ack and clears scratch references. Fresh array/object JSX outputs, promoted state, manual bindings, unsupported or unknown result types, and over-limit layouts keep the current behavior through fallback.

## Evidence boundary

Before timing, prove the eight cases and add truthful counters for captured cells, validated rows, calls to `projectChangedSlot`, static sink branches tested, sink projections, equality skips, staged sink writes, host writes, fallback/declined cuts, and peak scratch capacity. Compare operation counts with the previous generic prepared-row path, including the new per-input generated-dispatch calls and scratch writes/cleanup. Separate engine-created string allocations from runtime collection allocations. A lower branch/projection count is structural evidence only, not a speed result. Run the unchanged preregistered timing workload only after correctness review; the prior 25–39% slowdown remains the measured result until a separate valid study says otherwise.
