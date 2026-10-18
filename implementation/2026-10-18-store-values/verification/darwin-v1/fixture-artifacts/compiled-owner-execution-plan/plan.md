# Compiled owner update program: bounded implementation plan

## Decision context

The archived owner-row-fusion confirmation passed all 30 correctness pages and 7,200 measured frames, but failed the speed gate at every size. Its paired native/React median ratios were 1.2525, 1.3897, and 1.3833 at 128, 512, and 1,024 rows; median paired p95 ratios were 1.1385, 1.4070, and 1.4983. These are results for that candidate and workload, not a causal comparison with earlier revisions. The next change should remove repeated generic dispatch work, not add another cache/index. No speed gain is predicted here.

## Current execution path and remaining generic work

The OXC pass already recognizes a conservative set of pure JSX prop expressions. It emits one schema-v2 descriptor and one projector closure per sink. The descriptor carries `ownerProgramId`, `sinkId`, and ordered `sourceSites`; the projector is still a separately invoked function. Compiler purity is currently a lexical recognizer, so the proposal must stay within the existing accepted expression subset and must not widen eligibility to imported calls or opaque callbacks.

At activation, `bindStatePropAt` / `bindStatePropsAt` attach owner/layout/source-slot metadata. `prepareNumericRowProgram` then builds `groupsBySlot`, validates every sink’s source membership, and attaches per-group input/projector references. This is useful for lifecycle validation, but the frame path still performs generic work: Root resolves each captured handle/version with `numericRowForCell`, groups changes by row identity, and packs row/slot/value arrays; VDOM validates row records and leases, walks each row’s slots, mirrors source handles, walks changed-slot fanouts with epoch dedup, copies each reached sink’s input slots into a separate array, calls its closure, compares the result to `lastValue`, and dispatches the matching generic host writer.

World and Root checks are correctness work, not optional overhead. `numericRowForCell(handle, version)` proves exact cell identity, owner/site, current version, layout, lane, row, generation, and source. `captureNative` retains the exact dirty-handle/version cut. `clearCellChangesThrough` and `clearNativeThrough` acknowledge only that cut, so reentrant newer versions survive. The VDOM executor also supplies valuable all-cut preflight, source-mirror-before-projection ordering, all-projections-before-writes ordering, equality suppression, nested-write rejection, cancellation, and terminal host-error behavior. This plan preserves those checks and ordering.

## Proposed seam: one emitted executor per certified component

Add an owner-update-program entry to the compiler’s component metadata, separate from the state layout and the per-sink descriptor table. The compiler emits one ordinary JavaScript function per certified component at module scope. Component metadata identifies it by the same stable component program ID as the layout; each v2 sink descriptor retains its stable sink ID and ordered source sites. Use a new explicit schema version for this executable metadata. Existing v1/v2 bindings and components without the executable program continue through the current prepared-row or generic paths.

Conceptual shape:

```ts
type CompiledOwnerUpdateProgram = Readonly<{
  schemaVersion: 1;
  programId: string;
  slotCount: number;
  sinkIds: readonly string[];
  // Compiler-emitted pure function. No captured row, World, VDOM, or host refs.
  execute(
    changedMask: number,
    inputs: readonly number[],
    sinkStates: readonly OwnerRowSinkState[],
    stagedValues: unknown[],
    stagedSinkIds: Uint16Array,
  ): number;
}>;
```

The exact public type can be private to the compiler/runtime boundary. Keep `slotCount` within a conservative integer-mask limit (for example, at most 30 numeric slots) and sink count within the representable staged-index range. Larger layouts decline during preparation and retain today’s path. Do not use `eval`, `new Function`, or per-activation code generation.

For each sink, the emitted function contains a static dependency-mask branch. If no changed bit intersects that sink’s dependency mask, it does no projection work. Otherwise, it evaluates the authored expression directly from the completed input vector, applies the exact existing `sameBoundValueCanSkipWrite` semantics using the sink’s current `lastValue` and `forceWrite`, and, when required, appends the sink’s stable numeric index and projected value to caller-owned scratch. The function returns the number of staged writes. It does not call host writers, mutate `lastValue`, mutate source handles, or allocate arrays/tuples/records.

This fuses the per-slot fanout walk, epoch-based duplicate sink discovery, per-sink source-input copy, projector closure dispatch, equality decision, and writer selection into fixed code. Generated code should preserve sink declaration order, which is the current first-touch order for an owner’s changed slots. For expression outputs whose identity matters, especially arrays/objects, it must preserve the current object-identity comparison and force-write rules exactly; do not replace them with deep equality or primitive-only equality.

The runtime supplies the emitted function with a complete row input vector only after cut validation. `sinkStates` is the prepared row’s fixed sink-state array, mapping compiler sink indices to the current VDOM group state. The returned sink indices are looked up in a prepared fixed writer array; the generic host writer remains responsible for property/style semantics and host-specific behavior. No host-specific writer code is generated into the compiler function.

## Runtime integration seams

1. **OXC lowering: `compiler/oxc-spike/src/main.rs`.** Retain current purity/ownership checks and source ordering. Emit one module-scope executor per component from its already classified JSX prop candidates. Emit static dependency masks and direct expression code, plus the owner program reference in component metadata. Do not change initializer semantics, state-site identity, or the eligibility of expressions. Keep v1/v2 output unchanged when a component cannot receive the new executable form.
2. **Component/binding metadata: `src/compiled_state_layout.ts`, `src/jsx_binding_runtime.ts`, `src/component_state_runtime.ts` top metadata/binding layer.** Validate the new metadata version, owner program ID, slot count, unique sink IDs, and exact source-site-to-layout-slot correspondence once at activation. Associate a bound sink with its compiler sink index/program ID without capturing World, host, or row handles in the compiler function. Invalid or incomplete metadata must decline optimization, not reinterpret authored values.
3. **Prepared VDOM row: `src/vdom_snapshot_runtime.ts`.** During row-program preparation, build the fixed `sinkStates` and sink-writer arrays in compiler sink order. Require every sink to match the same owner program and expected source-slot order; reject a row if it contains manual/unsupported bindings or a stale/partial writer set. Keep the token tied to root, row identity, generation, layout, and binding generation. A refresh/replacement invalidates the token using existing lifecycle hooks. Structural topology remains on the existing VDOM candidate/delta path.
4. **Root cut: `src/component_state_runtime.ts` and `src/pending_state_changes.ts`.** Preserve `captureNative` and exact per-handle/version `numericRowForCell` validation. During the existing packed cut, build each row’s dirty mask and complete captured numeric input vector in reusable Root/VDOM buffers. Preflight every changed cell and every reached row token before mirroring any `ScalarSource`; then mirror all participating source values, run every emitted row program to completion, and only then begin any host write. Keep staged output values and sink indexes in high-water buffers; clear used object-valued outputs in `finally`. A null/declined program falls back before publication or acknowledgement. After accepted host publication, keep the existing exact-version acknowledgements; do not skip liveness/version/identity checks.

The generated executor removes generic per-sink loops and callback dispatch; it does not eliminate Root’s handle validation, row grouping, queue capture/acknowledgement, host writer calls, or VDOM’s full preflight. Profile those separately before considering any further change. In particular, this proposal does not claim to reduce Root’s `numericRowForCell` work or the acknowledgement passes.

## Ordering and fallback contract

For one captured flush:

1. Capture every dirty handle/version and resolve every handle to the exact live numeric row/slot. Reject conflicting duplicates and stale versions before source mutation.
2. Validate all row tokens, row generations, source/column leases, and sink-set generations before changing any source mirror or running generated code.
3. Assemble complete input vectors for every reached row from the preflighted row snapshot plus the exact captured changed values. Mirror every participating `ScalarSource` across all rows before executing any owner program.
4. Run all generated owner programs. Each visits sinks in authored order, projects each affected sink once, compares by current semantics, and records only the sink indices/values that need a write. No host write starts in this phase.
5. Apply selected writers in the same deterministic row/sink order. Update each group’s `lastValue` only after its write succeeds, preserving existing host-error behavior.
6. On success, acknowledge the captured World and pending-queue versions only. A reentrant newer update remains pending. On preflight decline, use the established fallback without acknowledging. On writer failure, retain the current terminal failure policy; do not retry through fallback after partial host writes.

Manual bindings, legacy descriptors, promoted/non-numeric state, rows with mixed or unknown sinks, unsupported program sizes, stale tokens, and structural edits continue through the existing fallback. Do not change public `useState`, store/transition behavior, keyed collection semantics, or generic host APIs in this patch.

## Eight focused acceptance cases

1. **Compiler contract:** real authored TSX emits one shared owner executor, stable owner/layout ID, dense ordered slots, unique sink IDs, exact dependency masks, and sink order matching the current v2 descriptors. Same-shaped components do not share owner programs.
2. **Sparse dependency selection:** a one-slot change invokes only sinks whose static dependency mask includes that slot; each affected projection runs exactly once, unrelated sinks do not run, and resulting host props match the authored expressions.
3. **Multi-source captured cut:** two or more slots changed in one flush yield each sink’s result from the complete captured vector. All source mirrors across rows precede the first projection; all projections across rows precede the first writer.
4. **Equality and force-write parity:** equal primitive output suppresses the same writes as today; object/function identity and `forceWrite` behavior match `sameBoundValueCanSkipWrite`, including fresh object outputs.
5. **Atomic stale preflight:** stale cell version, wrong row generation/layout, conflicting duplicate slot values, stale binding generation, or detached sink declines before source mirror, generated projector, writer, publication, or acknowledgement; the existing fallback then handles the cut coherently.
6. **Reentrant writer:** a host writer dispatches a newer value during the outer flush. The outer generated function uses only its captured values; outer acknowledgement does not clear the newer version; a following flush publishes that value.
7. **Lifecycle/structure:** keyed move preserves a valid row program; removal/disposal revokes it; same-row reuse with a new generation cannot use the old token; a writer refresh invalidates the affected row program and safely falls back/reprepares.
8. **Failure and compatibility:** a host exception follows terminal no-ack behavior and scratch cleanup; manual bindings, promoted strings/undefined, unsupported expressions, and over-limit layouts continue through existing semantics without optimization metadata.

## Review boundary and expected evidence

First stage this as a compiler/runtime prototype with counters for: captured cells, validated rows, emitted-program invocations, sink branches visited, sinks projected, sinks selected for write, actual host writes, fallback rows, and declined cuts. Report structural work reductions separately from allocations and host calls. The new executor adds per-activation metadata and retains reusable staged-value buffers; object-valued scratch requires used-prefix clearing and cancellation cleanup. It does not remove one host write per changed host sink, and dense workloads still evaluate most sinks.

Before any timing study, prove the eight cases above and show that supported compiled rows execute the emitted program with zero per-sink projector callback dispatch and no per-frame collection allocation. Then run a newly preregistered unchanged workload. A correctness pass, a lower loop counter, or fewer projector calls alone is not a speed result. No universal win or React comparison is inferred from this plan.
