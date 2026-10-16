# Prepared root path consolidation compatibility review

## Finding

`#tryCommitNativeRows` cannot replace the unary lane path by itself. Owner-row preparation requires a layout `programId` and owner-scoped V2 numeric binding metadata. The unary cell path accepts a broader, still compiler-described case: one-source numeric bindings with schema-version-1 descriptors, and V2 descriptors where owner-layout association is unavailable. The row path is broader in a different direction: it handles V2 owner-bound multi-source sinks and coalesces changed slots by owner row.

The existing generic source-program route is a semantic fallback for some lane and row declines, subject to stricter Root checks (`cache`, compiled prop-site membership, last source value, VDOM source program, and exact current version). It is not guaranteed to cover every lane-accepted component shape. The concrete lane fixtures use explicit `propOnlySites`, so they appear eligible for generic fallback, but deleting the lane route without verifying less conventional manual metadata and timing would be a compatibility and performance change.

## Path coverage

| Dirty numeric state shape | Owner-row prepared path | Unary lane prepared path | Generic source-program fallback |
| --- | --- | --- | --- |
| Layout absent or dirty cell has no numeric lane | Declines: no row view | Declines: no lane address | Can run when Root cache/site/source/version and `hasSourceProgram` checks pass; otherwise existing ordinary work path must retain the update |
| Layout has slots but no `programId` (legacy layout metadata) | Declines before row preparation | Can accept a single-source V1 or V2 numeric descriptor with an eligible unary writer | Can serve the current tested `propOnlySites` fixtures when its gates pass |
| Layout has `programId`, but descriptor is V1 or has no matching V2 `numericOwner` proof | Declines while validating owner-row fanout | Can accept single-source unary bindings with valid V1/V2 numeric descriptor | Can serve when generic Root gates pass |
| Matching layout `programId` + V2 owner metadata + one-source sinks | Can accept; row attempt runs first | Also capable, but normally not reached after row acceptance | Fallback after prepared-path decline when gates pass |
| Matching layout `programId` + V2 owner metadata + multi-source sink(s) | Can accept if every source/slot/group validates | Declines: `unaryEligible` requires exactly one source per group | Fallback after row decline when gates pass |
| Missing/invalid numeric descriptor, unsupported writer, compiled-graph mode, or unsupported binding group | Declines | Declines | May run only if the existing compiled source-program gate still recognizes the site; otherwise the ordinary render/update route owns compatibility |

The “V1” distinction above refers to the numeric binding descriptor, not the `CompiledStateLayout.schemaVersion` (currently 1). A layout's optional `programId` is the row-program discriminator.

## Concrete compatibility evidence

- [`native_numeric_lane_cut_test.ts`](/Users/tjw/Documents/Codex/2026-10-09/le/outputs/react-runtime-research/src/native_numeric_lane_cut_test.ts) uses layout metadata with slots but no `programId`, plus a schema-version-1 unary descriptor. It covers reentrant captured writes, promotion, shared World storage, host failure, and disposal. These cases are not served by the row path's `programId` gate.
- [`native_prepared_cell_cut_test.ts`](/Users/tjw/Documents/Codex/2026-10-09/le/outputs/react-runtime-research/src/native_prepared_cell_cut_test.ts) covers unary prepared tokens, stale-token refresh and retry, generic fallback after repeated decline, captured values, root isolation, host failure, and disposal.
- [`native_prepared_row_cut_test.ts`](/Users/tjw/Documents/Codex/2026-10-09/le/outputs/react-runtime-research/src/native_prepared_row_cut_test.ts) uses matching owner-program metadata and V2 descriptors, including a three-source projector and repeated unary sink. It proves the row path's distinct multi-source capability.
- [`compiled_layout_activation_test.ts`](/Users/tjw/Documents/Codex/2026-10-09/le/outputs/react-runtime-research/src/compiled_layout_activation_test.ts) keeps components without compiler layout on the general state path.
- Direct VDOM tests call `prepareNumericCellProgram` and `executePreparedNumericCells` themselves. These methods are public on `VDOMSnapshotRoot`; removing the Root call path does not justify deleting this VDOM API or its tested behavior.

## Root-local state and branches a Root-only removal would delete

If a later compatibility and timing decision removes Root's unary lane attempt, the directly removable Root pieces are:

- `#nativeLanePrograms`, the lane-address-to-token/source cache;
- `#nativeLaneTokens`, including capacity growth, cut scrubbing, disposal clearing, and active-cut cleanup;
- `#tryCommitNativeLanes`, including its one-time stale-token rebuild/retry and lane profile counters;
- the call and success branch for `#tryCommitNativeLanes` between row attempt and generic source-program fallback.

The row buffers, lane-independent `#nativeCellHandles` / `#nativeCellVersions`, `#numericProgramSources` / value scratch, World dirty acknowledgement, pending cut barrier, and generic fallback remain needed. The generic fallback must continue to verify and acknowledge only the exact captured versions; row success must keep updating `#lastSourceValues` so a later generic fallback has the same source baseline.

This is only a Root-level removal list. `World.numericLaneForCell`, `World.numericLane`, `VDOMSnapshotRoot.prepareNumericCellProgram`, `executePreparedNumericCells`, `bindSourceColumn`, `hasColumnCell`, `NumericProgramSourceSlot.unaryEligible`, and VDOM's cell-program lifecycle have separate public or direct-test uses. They cannot be removed as incidental cleanup. In particular, prepared cell VDOM tests exercise opaque-token provenance, duplicate-value preflight, projection failures, disposal, and stale invalidation without `ComponentStateRoot`.

## Correctness obligations before any removal

1. Show every lane-accepted Root cut either reaches generic `executeSourceProgram` with equivalent output and captured value, or is intentionally excluded by a documented public eligibility contract. Include missing `programId`, V1 descriptors, manual V2 descriptors without owner association, and both explicit and absent `propOnlySites`.
2. Preserve reentrant writes: the outer captured cut may commit its captured value, the nested newer version stays queued, and later generic processing must not clear or overwrite it.
3. Preserve host-throw terminal state: no dirty acknowledgement or false success, retained setters remain subject to existing terminal/disposal semantics.
4. Preserve stale-preflight behavior: row declines/rebuilds once, then generic fallback runs with the original captured values only after no host/source mutation occurred.
5. Preserve promotion, row reuse, and owner destruction: a cell that leaves numeric storage must decline row/lane capture, and stale captured versions must never clear a newer or reused row.
6. Preserve multi-root independence when roots share a World, and the store/candidate barrier when native work is mixed with structural or asynchronous work.
7. Keep VDOM's public prepared-cell API behavior unchanged unless separately reviewed as an API change.

## Performance questions that need measurement

The owner-row route is not a free substitute for the lane route on legacy layouts: a row attempt first resolves a `NumericCellRowView`, then declines immediately when `layout.programId` is absent. If the lane attempt is removed, these cuts do more generic Root checks and stage prior/current scalar values around `executeSourceProgram`. That may add identity/version/source lookups and projection work compared with the current cached lane token.

For modern matching V2 owner layouts, the row route already precedes the lane route and ordinarily accepts unary groups too, so the lane branch may contribute little to that workload. The relevant measurement is therefore a matched legacy/manual unary workload and a matched V2 owner-row workload, comparing current Root routing with row-then-generic routing. Measure capture-to-ack time and end-to-end commit latency, including the null-row probe and fallback; do not infer a win from deleting fields or branches.

## Recommendation

Do not remove the lane route in the current cleanup. The row path does not cover its legacy/manual unary acceptance domain, while the generic fallback's gates are narrower and its work is likely heavier. A Root-only removal is a plausible future experiment if the product is willing to rely on generic fallback for those descriptors, but first add explicit parity cases for layout-without-`programId`, V1 descriptor, missing `propOnlySites`, and reentrant/stale/host-failure behavior. Then measure that exact fallback route against the current lane path. Preserve VDOM's direct cell-program API either way.
