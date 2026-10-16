# Owner-update kernel v2 bridge plan

## Decision boundary

This is a staged design only. The generated kernel is a candidate for homogeneous prepared-row cuts. Existing `executePreparedNumericRows` remains the semantic fallback. There is no speed claim.

Do not add a flat row-input matrix. `PreparedNumericRowProgramRecord.inputValues` is already the complete per-row cut snapshot. Do not add row wrappers, copied sink values/flags/writers, or a second registry for kernel lifetime or versions.

## Metadata bridge

The compiler emits one immutable `ownerUpdateProgram` in the existing `defineComponent(siteId, render, metadata)` options. Its minimal public shape is:

```ts
export type CompiledOwnerUpdateProgram = Readonly<{
  schemaVersion: 1;
  programId: string;
  sinkIds: readonly string[];
  executeCut(
    changedRows: Uint32Array,
    changedSlots: Uint32Array,
    changeCount: number,
    rowStates: readonly unknown[],
    stagedRows: Uint32Array,
    stagedSinkIds: Uint16Array,
    stagedValues: unknown[],
  ): number;
}>;
```

`programId` must equal both the component site ID and `stateLayout.programId`; `sinkIds` must be unique, stable, and cover only certified sinks. `executeCut` is emitted code over primitive expressions with no calls, property reads, user callbacks, host access, or World mutation.

`defineComponent` validates and associates the program with the already-normalized shared layout through the existing private `NormalizedLayoutRecord` in `compiled_state_layout.ts`. That record is the one static metadata cache; do not add another WeakMap/table or copy the program into per-component/owner wrappers. The normalized layout is already carried by World row views, so VDOM preparation resolves the static program from `spec.layout` once. No Root component-cache lookup per cut and no World-to-VDOM dependency are needed. A layout without a program remains valid and uses the old row executor.

At `prepareNumericRowProgram`, validate the static program against the existing row binding groups, then store its pointer in the existing prepared record. The record gains only kernel-required row data: `sinks` as references to existing `BoundPropGroup`s in `sinkIds` order, and `seenMask`. The existing `inputValues`, `groupsBySlot`, leases, row identity, generation, and active state remain authoritative. Do not copy `lastValue`, `forceWrite`, host handles, or writer functions into parallel sink records.

## ABI and execution phases

The staged v3 compiler/runtime ABI agreed with the implementation owner is:

```ts
executeCut(changedRows, changedSlots, changeCount, rowStates,
  stagedRows, stagedSinkIds, stagedValues): number
```

Each `rowStates[rowIndex]` is the existing prepared row record. The kernel reads `rowState.inputValues[slot]`, checks/sets `rowState.seenMask`, and reads `rowState.sinks[sinkIndex].lastValue` directly. Staged outputs use reusable VDOM-owned buffers. `changedRows` / `changedSlots` retain Root capture order; repeated row indexes are expected when several slots changed in one row.

The VDOM executor keeps this order:

1. Validate every token, lease, slot, duplicate value, sink set, and homogeneous program for the *whole* cut. Select generic fallback before source mirrors if any condition fails.
2. Capture every used column value into each record's existing `inputValues`, then overwrite changed slots from the captured cut values. Never reread World/columns after callbacks or kernel entry.
3. Mirror all changed/captured source values using those complete `inputValues`.
4. Clear each participating record's `seenMask` and call `executeCut` once. The static kernel walks the exact changed-entry order, follows the compiler's slot fanout, projects each selected sink at first touch, and stages only outputs whose primitive equality check says a write is needed.
5. Before any host call, visit each participating record's selected-sink mask and update `lastSourceValue` for every selected sink, including equality-suppressed sinks, from the same first dependency slot used by the old executor. This pass must not project or call user code.
6. Write staged outputs in their original first-touch order through the existing VDOM writer path. Read each `BoundPropGroup` through `rowState.sinks[sinkIndex]`; update `lastValue` only after its writer succeeds. Check cancellation before each writer. Clear staged reference prefixes in `finally`.
7. Return accepted `false`/`true` to Root only after the write phase. Preserve Root's current null-to-nonpublishing-false wrapper, exact World/PendingStateChanges acknowledgement, reentrant newer-version retention, and terminal host-failure/no-ack behavior.

Because the certified kernel has no callouts, a validated call cannot synchronously reenter or dispose during projection. Check cancellation before and after `executeCut` and before each writer. If execution unexpectedly throws after mirrors, propagate as terminal failure; do not retry through fallback after any mirror or partial host write. Fallback selection must happen before mirrors.

## Sink ordering and completeness

Do not assume compiler `sinkIds` order matches runtime writer order. At row preparation:

- Map every active group by its frozen schema-v2 `sinkId` to the existing group reference in `record.sinks`.
- Validate no duplicate/missing/extra sinks for the restricted first prototype. Conditional or incomplete sink sets decline to the generic row executor.
- Define generated fanout as `sinkIds` order filtered by each sink's ordered source slots. At preparation, compute that same expected sequence and validate it against `record.groupsBySlot[slot]` after resolving IDs. If it differs, leave the row generic. Do not silently reorder host writes.
- Preserve first touch across the input `changedRows`/`changedSlots` sequence, and within one slot preserve the exact current VDOM fanout order.

This intentionally allows some authored layouts to fall back. Expanding eligibility requires separate evidence that VDOM attach order and generated fanout order are identical for those shapes.

## Per-group input allocation and fallback

`BoundPropGroup.ownerRowInputs` is the per-sink copied vector used by the current generic projector loop. The kernel does not need it: it reads the prepared row's existing `inputValues` directly. Do not allocate `ownerRowInputs` for a row that is prepared with a complete eligible owner program.

The generic row path must remain available. On a cut that selects generic execution, lazily allocate a stable per-group input vector for any such group before its first generic projection, then retain it through the group's existing activation/invalidation lifetime. Do not pass one shared mutable vector to arbitrary projectors: the public projector can retain its argument. Kernel-eligible expressions are compiler-certified callout-free, so no user projector has observed this per-group vector before a generic fallback. Legacy, incomplete, unsupported, or mismatched rows continue to allocate/use the existing vectors at preparation.

## Minimal implementation boundaries

1. **Compiler:** finish the staged `ownerUpdateProgram` emission and tests. Emit complete stable sink IDs and per-slot fanout in the exact descriptor order; preserve existing binding helpers and v1/v2 metadata.
2. **Static metadata:** add the program type and one-time layout association in the existing compiled-layout cache; validate site/program/layout identity once in `defineComponent`.
3. **VDOM row preparation/execution:** attach the static pointer to the existing record, build the direct sink-reference vector, and add whole-cut preflight plus kernel execution. Keep existing generic row path byte-for-byte in behavior.
4. **Root:** do not add a strategy table. Continue using the existing prepared-row token cache and captured buffers; `numericRowForCell` / exact handle versions remain the World authority. Root's only change, if any, is passing captured values to the same executor already called today.

## Proof obligations before timing

- Single and multiple rows, sparse and dense updates: complete `inputValues` are the only expression inputs; no flat matrix or per-sink vector is touched by the kernel.
- Every selected sink's `lastSourceValue` updates even when output equality suppresses the host write.
- Compiler order and runtime `groupsBySlot` fanout order are validated; an intentionally permuted binding/host order declines to generic.
- All projections/staging complete before the first host write; writer order matches the prior executor's global first-touch order.
- Heterogeneous programs, missing/extra sinks, nonprimitive/callout expressions, stale leases, invalid slots, and conflicting duplicate inputs select fallback before mirrors.
- Host writer reentry, disposal/cancellation, writer exception, keyed move, source refresh, row reuse, promotion, and discard preserve current behavior and exact acknowledgement.
- Generic fallback still gives each arbitrary projector a stable per-group input vector; repeated generic executions preserve its identity.
- Counters account for whole-cut preflight, captured-vector reuse, fanout work, mask scans, staging, writes, and cleanup. Only a separate preregistered unchanged-workload study can establish latency.
