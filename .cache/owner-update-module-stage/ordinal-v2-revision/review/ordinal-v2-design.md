Schema v2 ordinal-input compiler revision — staged and verified.

This is a separate revision based on the passing strict-TS/schema-v1 stage. The prior stage remains unchanged.

The owner descriptor is schemaVersion 2 with the six-argument API:
`executeCut(changedSlots, changeCount, rowStates, stagedInputIndices, stagedSinkIds, stagedValues)`.

For each change, the kernel reads `rowStates[changeIndex]!`, selects by `changedSlots[changeIndex]`, and writes `changeIndex` into `stagedInputIndices`. It no longer accepts `changedRows`, performs a changed-row lookup, or writes a cut-token row ordinal buffer. The Node fixture models repeated row input records by aliasing the corresponding row record and explicitly asserts the staged ordinals `[0,0,1,1,1,1,1,1,2,2,2,2,2]`; expected visible rows are mapped back only for behavior comparison. It verifies interleaved first-touch order and shared-sink deduplication, the six-argument function shape, no changedRows parameter, and equality/signed-zero/NaN cases.

The public helper annotation still uses `readonly import(<same runtime helper module>).CompiledOwnerUpdateProgram[]`; the v2 metadata overlay is selected by `review/deno.json` and defines the exact schemaVersion 2/six-argument type.
