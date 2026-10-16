# Prepared numeric cell programs

13 October 2026. Implemented by bounded Luna high agents and reviewed and integrated by the primary agent. This follows the failed numeric-state-lanes timing study and its independently verified CPU attribution. It is a correctness milestone, with no new latency verdict.

## Integrated change

- VDOM numeric source slots cache unary eligibility when bindings activate or refresh. `prepareNumericCellProgram(source, column, row)` produces an opaque token for the existing packed writer fanout. `executePreparedNumericCells(tokens, values, count)` validates the whole cut before mutation, stages all source mirrors, projects all outputs, and then writes changed host properties.
- Structural changes invalidate only affected source tokens. Full index rebuild and disposal invalidate replaced slots. Invalidation deletes token provenance records so a retained stale token cannot keep its old writer fanout alive. The existing `setColumnCells` compatibility API remains available.
- Root caches each live lane's token and scalar compatibility source. Warm cuts avoid column/row membership and numeric descriptor scans. Stale tokens are prepared again, and declined preflight falls through without publication or acknowledgement. Captured versions and the existing commit barrier preserve reentrant newer work and coherent fallback.
- World exact committed cell identity now proves physical membership, eliminating duplicate owner/cell map checks during lane resolution. Lane generation, address, version and sticky promotion checks remain. Published candidate setters forward to the existing committed dispatch arrow.

Primary review corrected the initial proposal from a global token to per-cell tokens, caught disposal invalidation and stale-token retention, added projector-disposal and failure tests, and updated one existing buffer-observation test for the new execution API. Early partial-edit type-check failures remain in the review logs; only final qualified commands establish this milestone.

## Evidence

Final primary verification: `deno task test` passed **648/648**; Rust compiler tests passed **32/32**; a separate production Vite build passed into `dist-product-mixed-prepared-cells`.

The new authored OXC TSX execution proof uses prepared cuts of sizes `[1, 6]`, with zero nonempty generic snapshot captures, zero legacy column-cell calls and zero scalar program calls. It inherits keyed moves, removal/dead setter, row generation reuse and private candidate isolation checks. The separate authored lifecycle proof covers lazy initialization, ref/effect ordering, captured reentry followed by the newer cut, promotion and scalar fallback, terminal host error and cleanup. Instrumentation restores prototypes in `finally`.

The runtime suites additionally cover provenance, duplicate-value conflicts, unrelated-token survival through local refresh/removal, full rebuild, projection-before-write ordering, disposal during projection or host writing, scratch cleanup, preflight fallback without an extra publication, and roots sharing one World.

## Next acceptance step and limits

Freeze a new browser confirmation protocol for this exact build and run the same workload and speed targets: paired median ratio at most 0.80 at two sizes and paired p95 ratio at most 1.10 at every size, with full correctness and clock resolution. Browser pilots and matched timing have **not** been run for this candidate. No latency or allocation improvement is claimed from test counts or fewer lookups.

The previous frozen lane candidate remains a verified speed failure. Retained VDOM, compiler-required ordinary JSX, coherent stores/transitions and public host APIs remain the direction. Full compatibility, device replication, worker scheduling, streaming/hydration, and comparative human maintenance gates remain open. The Sol review stays held under its existing prerequisites. The implementation goal remains active.
