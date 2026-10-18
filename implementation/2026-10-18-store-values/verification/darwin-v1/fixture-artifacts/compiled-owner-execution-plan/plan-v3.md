# Compiled owner update program: bounded whole-cut plan v3

## Decision and measured boundary

The archived owner-row-fusion confirmation passed its 30-page correctness workload but failed the speed gate at every size. Paired median native/React ratios were 1.2525, 1.3897, and 1.3833 for 128, 512, and 1,024 rows; median paired p95 ratios were 1.1385, 1.4070, and 1.4983. These results apply to that candidate and workload only. This proposal is a hypothesis and predicts no speedup.

This version replaces per-dirty-cell generated dispatch with one emitted kernel call for a homogeneous cut: every participating prepared row uses the same owner program, layout shape, and primitive-only sink program. Mixed components, mixed layouts, unsupported sinks, and non-primitive results use the existing prepared-row executor for the entire cut. The fallback remains the semantic reference.

## Current generic work to remove

The compiler emits one descriptor and projector closure per certified sink. During execution, `executePreparedNumericRows` validates the full cut, captures dependency values, mirrors sources, then walks each changed `(row, slot)` in capture order. It searches that slot’s fanout, deduplicates sinks with epochs, copies each sink’s source values into `ownerRowInputs`, invokes one projector callback per sink, compares output with the last value, and records writer groups. After every projection, it performs host writes in first-touch order.

The new kernel targets only the repeated generic middle: fanout discovery, sink epoch checks, per-sink input-vector copying, projector callback dispatch, equality dispatch, and writer selection. World/Root’s exact cell-handle, version, owner/site, lane, row, generation, source/column-lease checks, dirty capture and acknowledgements remain authoritative. The VDOM’s all-cut preflight, source mirror boundary, all-projections-before-writes boundary, host writer semantics, cancellation, equality behavior, and terminal error rules remain in force.

## New whole-cut kernel interface

Add a versioned executable owner program to compiler component metadata. Keep current schema-v1/v2 binding descriptors and their execution unchanged. The new metadata identifies the function by the exact `programId`, dense source slot count, stable sink list and statically generated sink fanouts.

Conceptual pure JavaScript API:

```ts
type CompiledPrimitiveOwnerCutProgram = Readonly<{
  schemaVersion: 1;
  programId: string;
  slotCount: number;
  sinkIds: readonly string[];
  executeCut(
    changedRows: Uint32Array,
    changedSlots: Uint16Array,
    changeCount: number,
    rowInputs: Float64Array,
    rowStates: readonly OwnerRowExecutionState[],
    stagedRows: Uint32Array,
    stagedSinkIds: Uint16Array,
    stagedValues: unknown[],
  ): number;
}>;
```

`changedRows[i]` and `changedSlots[i]` retain the exact global `captureNative` order. `rowInputs` is a caller-owned flat numeric matrix with a fixed `slotCount` stride per compact row index. Each row state contains its current prepared sink states, a seen-sink bit mask reset before the call, and the exact bound writer mapping. The kernel returns a count of staged writes; staged arrays hold corresponding `(row index, sink index, primitive output)` entries. It does not allocate, mutate World/VDOM visible state, write hosts, acknowledge changes, or capture runtime objects.

The kernel loops over the ordered dirty cut, then dispatches on `changedSlots[i]`. OXC emits each switch case with that source slot’s sink fanout in the existing VDOM order. Before projecting a sink, it checks and sets that row’s seen bit. The first encountered dependency evaluates the authored expression from the row’s complete `rowInputs`; later dependencies skip it. Equality/force-write is decided in the same generated branch with the exact existing semantics. A selected sink’s row/sink IDs and result are appended to scratch in the original global first-touch order. This retains interleaved row and sink callback ordering; it does not sort by authored sink order or row order.

All vector reads use the complete cut snapshot even when the sink is first reached before another dependency’s entry in `changedSlots`. Root/VDOM fill the entire matrix before invoking `executeCut`, so sparse and dense changes share the same semantics. `seen` only suppresses duplicate projection; it never controls source values.

## Exact executable eligibility and cancellation boundary

The first prototype includes only expressions for which OXC can prove both the current numeric-input assumptions and primitive output without user-code execution. Allow numeric state identifiers, numeric/string/boolean/null/undefined literals, arithmetic and comparison operators, logical/conditional expressions with supported operands, unary operators with supported operands, and template literals whose interpolations are supported primitives. A template may allocate its resulting string; that result allocation is part of authored semantics and is not counted as runtime collection allocation.

Reject function calls, tagged templates, property/member access, computed access, getters, imported names, globals such as mutable `Math`, `this`, assignments/updates, object/array/function expressions, and any expression/result shape the checker cannot prove. In particular, do not compile `Math.sin(x)`, `object.value`, or any accessor/callback expression into this path. These use the existing v2 projector path, retaining its per-projector cancellation checks and output identity semantics. Fresh array/object outputs are not rewritten or reused: they remain on fallback.

For this restricted kernel, projection executes only closed, statically emitted expressions over internal numeric arrays and primitive row values; no callout can synchronously dispose the root or reenter a host writer during projection. Check VDOM execution-active/cancelled state immediately before the kernel and immediately after it. Preserve the existing cancellation check before each staged host writer in the later write loop. Any expression that is not provably callout-free stays in the old path, where cancellation is checked between user projectors. This is the kernel’s cancellation guard contract; do not add a generic per-sink callback to the generated hot path.

## Homogeneous cut selection and fallback scope

Root performs its existing exact per-cell handle/version resolution and groups changed entries into compact row indexes. Before any scalar-source mirror or projection, it verifies every participating row has a current prepared token, exact layout/program identity, matching source/column leases and generation, and complete primitive sink coverage. The cut uses the emitted kernel only if all rows point to the same executable owner program and compatible layout signature, and all indices fit the kernel’s fixed limits (initially at most 30 source slots and 30 sinks for bit masks). Otherwise the entire cut goes through `executePreparedNumericRows`; do not split a mixed cut into sub-cuts, since that can reorder global first-touch projections or writes.

The compiler function is attached once to component metadata and associated with bound sinks by `programId` plus stable sink IDs. At prepared-row activation, VDOM builds fixed sink-state and host-writer arrays in the exact current fanout order. Invalid/missing descriptors, manual/unknown sinks, stale generations, promoted state, or a structural refresh that invalidates a prepared token declines the fast path. Current VDOM/root generation invalidation rules stay in place. Structural candidate, collection, store, transition, and nonnumeric paths are unchanged.

## Required phase order

1. `captureNative` captures exact handles and versions. Root resolves every captured handle/version and validates row/slot identity and all World leases. Reject conflicting duplicate values before mutation.
2. Validate every prepared row token, layout/program ID, generation, sink coverage, writer mapping, and buffer bound for the whole cut.
3. Assemble complete flat row inputs from the captured columns plus captured changed values. Mirror all source handles for all rows using the same committed cut.
4. Reset per-row seen masks and call the one homogeneous `executeCut` kernel. It walks the original global changed-slot sequence and stages projected writes in the exact first-touch order. No host writes occur here.
5. Walk the staged output prefix, checking cancellation before each write, and dispatch through the existing generic VDOM host writer. Update `lastValue` only after each corresponding writer succeeds.
6. Only after accepted host publication, acknowledge the exact captured World/pending versions. Newer reentrant versions survive. A preflight decline falls back without acknowledgement. A host writer error preserves current terminal/no-ack behavior; never retry the fallback after partial host mutation.

All reusable scratch retains high-water capacity. Clear used reference prefixes in `finally`, including staged values and row token references. The restricted output values are primitives, but projected strings may be new engine strings and must be cleared from reusable scratch so they are not retained.

## Eight focused acceptance cases

1. **Compiler boundary:** actual TSX emits one shared kernel with stable program/layout/sink IDs, dense ordered source slots and exact sink fanouts. Same-shaped component sites do not share a program. Existing v1/v2 outputs remain byte/behavior compatible for unsupported fixtures.
2. **Single whole-cut invocation and operation benefit:** a multi-row homogeneous cut calls the emitted kernel exactly once, with no dynamic per-sink projector callback. Counters show eliminated generic fanout/group scans, sink epoch checks, source-slot copy iterations, projector calls, and dynamic equality selection; include the new ordered-cut loop, changed-slot switch branches, staged-scratch writes, and cleanup in total counts.
3. **Sparse dependencies:** one changed slot selects only its dependent sinks, each at most once, while unused outputs and host writes remain unchanged.
4. **Global first-touch ordering:** interleave rows and slots so sink dependency sets overlap; verify projection and writer order exactly matches the current `(row, slot)` capture order and the existing slot fanout order, not authored order.
5. **Complete cut and phase barrier:** a sink depending on multiple slots sees all final values even when first touched by the earliest changed slot. Across every row, all source mirrors precede all projections, and all projections complete before the first host write.
6. **Equality/force-write parity:** primitive equal outputs suppress exactly the current writes; force-write behavior, templates, conditionals, and primitive equality match the old projector. Array/object outputs assert use of fallback and preserve fresh identity semantics.
7. **Decline, lifecycle and fallback:** stale handle/version/layout/generation, conflicting duplicate, promoted state, stale sink set, unsupported result type, over-limit program, or heterogeneous component cut declines before mirror/projection/write/ack; existing execution remains coherent. Keyed move, remove, dispose, row reuse, and sink refresh invalidate/preserve tokens per current rules.
8. **Reentry/error/cancellation:** a host writer reenters with a newer value; staged outer values stay captured and later flush publishes newer state. Cancellation stops remaining writer calls under the existing guard. Writer failure is terminal/no-ack with reference scratch cleared; callout expressions use the old executor and retain its between-projector cancellation behavior.

## Evidence and cost accounting before timing

Expose counters for kernel calls/cuts, changed entries walked, switch branches entered, sink dependencies tested, sinks projected, equality skips, staged writes, actual host writes, rows/slots preflighted, fallback/declined cuts, peak scratch capacity, and reference cleanup count. Compare total operations against the current executor for sparse one-slot and dense multi-slot cuts, including the new ordered-cut loop and scratch write/cleanup passes. Required structural benefit is one kernel call per homogeneous cut replacing per-sink projector callback dispatch, plus fewer generic fanout/input-copy/equality dispatch operations. If counts show the kernel merely moves equivalent work into slot cases or scratch traffic, stop before claiming it is a worthwhile prototype.

The kernel does not remove exact Root/World validation, row grouping, queue acknowledgement passes, selected host writer calls, or string result allocation. Heterogeneous and fallback workloads gain nothing and may pay eligibility/preflight overhead; measure that cost separately. A structural operation reduction, correctness pass, or profile sample is not a latency result. Only a new preregistered run of the unchanged workload can establish speed for this revision.
