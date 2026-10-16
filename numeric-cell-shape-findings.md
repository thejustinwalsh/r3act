# Numeric cell representation: engine evidence and implementation contract

13 October 2026. The qualified Chromium diagnostic is `results/numeric-cell-shapes-v2/diagnostic.json`. Its exact script snapshot and bundled actual World source are preserved beside it. Primary hash checks confirmed both recorded hashes.

In Chrome 153.0.8010.12 / V8 15.3.76.4, three actual World activation routes changed `%HasFastProperties` from true to false when `Object.defineProperty` converted the own `value` data property to the shared lane accessor: direct `useState`, keyed-owner reuse, and private-preparation publication. Direct and private cells remained in dictionary property storage after promotion. A separately constructed prototype-accessor control retained fast properties.

The diagnostic runs headless, with GPU disabled and the native-syntax flag needed for the engine inspection. It bundles the actual World module and intercepts `Object.defineProperty` only for its named lane getter. The interceptor is restored in `finally`. It verifies state values, publication, promotion and disposal as well as object layout. This is engine-layout evidence, **not** a measured explanation of the latency gap, an allocation result, or proof that a replacement will meet the speed target.

V1 is preserved as exploratory: its matching script snapshot was not recovered. V2 has a matching script hash and is the qualified evidence.

## Next bounded implementation

Create compiler-eligible numeric cells with a shared value accessor on their prototype from birth. Before publication, values remain privately boxed. Once a lane is published, its Float64Array row is the only logical value storage. Attaching and detaching a lane must update storage fields without redefining an own property. Preserve exact cell objects, handles and versions across publication; do not replace a live cell merely to change its representation.

Keep ordinary generic cells as ordinary writable objects. Existing cells that acquire layout metadata late still need the existing semantic compatibility path; do not silently deny a lane or invalidate a retained setter. Eligibility must be known from the declared compiler slot and runtime initial value. Promotion remains sticky. Private writes and discard cannot change committed columns.

The source change is limited to World cell construction and lane attach/detach, with focused tests for direct and private activation, publication/discard/rollback, late metadata, row reuse, reentrant writes, boxed cleanup and promotion. Root, VDOM, compiler, adapters, scheduler and public APIs retain their current contracts. Primary review must check every internal cell-copy path before integration.

After correctness passes, independently inspect actual replacement cells in Chromium, then freeze and run the unchanged matched product gate. A fast-properties flag alone is not acceptance. The prepared-cell timing failure remains authoritative until another named candidate is measured; historical records and thresholds remain immutable.
