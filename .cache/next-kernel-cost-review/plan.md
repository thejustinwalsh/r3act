# Next owner-kernel hot-path review

## Proposed change

Fold owner-kernel eligibility and participating-row counting into the existing dependency capture/validation pass in `VDOMSnapshotRoot.#executePreparedNumericRows` (`src/vdom_snapshot_runtime.ts`, currently around lines 3353–3372). Remove the later dedicated pass that searches `#ownerRowRecordScratch` for the first program and then scans the records again for program/sink compatibility (around lines 3374–3391).

For each distinct record encountered by the dependency pass, maintain scalar locals for the first record's `ownerUpdateProgram`, a compatibility flag, and the count of participating records. The first record establishes the candidate. Each subsequent record keeps it eligible only when its program reference matches and its sink count matches the program's `sinkIds.length`. Do not return early on a mismatch: finish checking and capturing every reached dependency as today. If any participant is incompatible, select the existing generic fallback. Use the participating-record count as `kernelRowCount` only when the candidate remains eligible.

The `#ownerRowRecordScratch` prefix is dense: records are appended once when `record.cutEpoch !== epoch`, and its count bounds each pass. A nonempty dirty input cut therefore has a first record. Preserve the current `count === 0` return before selecting an owner kernel.

## Work removed and added

- Removes the standalone O(R) record scan that searches for a kernel, plus its repeated read of the first compatible record in the following O(R) validation scan. R is the number of distinct prepared row records in this cut.
- Adds constant scalar state and program/sink compatibility comparisons to the existing O(R × slots-per-record) dependency scan. It allocates no buffers, maps, closures, or per-row records.
- Certified same-program cuts currently find a candidate immediately, then reread all R records. The proposed pass visits each record once for capture and eligibility instead. A mixed/generic-first cut can skip the old second compatibility scan entirely while remaining on the generic path.
- The existing diagnostic work-visit counter does not currently count the separate program-eligibility scan. Do not claim a measured visit-count reduction from that counter alone; if implementation instrumentation is changed, keep its historical meaning explicit.

This targets the prepared VDOM owner-row executor, which the frozen owner-row CPU profile attributed 67.439 sampled self-ms across the whole native page. That profile includes import, mount, warmup, updates, correctness inspection and disposal, and predates or does not isolate this exact pass. It only identifies the affected area; the proposed change has no demonstrated speed or allocation benefit.

## Preserved boundary

The compiler's schema-v2 owner program remains the single authority for eligible sink projection. This change only decides whether all prepared row records in this already captured VDOM cut share that exact program and compatible sink shape. It does not alter the compiler ABI, owner-row tokens, World layout identity, Root capture, or public API.

All changed-input token/provenance/conflicting-value validation remains before this pass. Every reached and untouched dependency still receives the existing source/column lease and row-length checks, and its captured value is staged in `record.inputValues`. An owner-program mismatch is not a preflight failure and does not skip dependency validation; it selects the existing generic projector route. A stale lease still returns `null` before source mirroring, projection, or host writes, so Root retains its current row retry, lane retry, and generic fallback sequence.

The source-mirroring pass stays after complete dependency validation. The compiled kernel's `executeCut` still runs once with all dirty changed slots, and all sink outputs are validated before the first host write. Its equality checks, seen-mask validation, output capacity checks, ordered staged writes, cancellation handling, reentry behavior, terminal host errors, and `finally` scratch scrubbing remain unchanged. World dispatch listener ordering, pending journal versions, exact captured-version acknowledgment, and candidate publication are outside this edit.

## Finite verification plan for a future implementation

1. Same schema-v2 program across multiple row records selects the kernel and preserves changed-slot order, duplicate same-value coalescing, changed sink IDs, and output values.
2. First record without a kernel, different programs, or mismatched sink counts select the generic fallback. Confirm later records are still dependency-validated.
3. A stale untouched dependency in any record returns `null` before any source mirror, projection, or host write, even after program compatibility has already failed.
4. Duplicate changed slots with conflicting values still decline; equal duplicates still coalesce as before.
5. Exercise kernel no-op/equal sinks, multiple sinks, reentrant writes, cancellation/disposal during projection, and a host writer that throws. Confirm all projections complete before the first host write and pending newer versions remain for the next cut.
6. Confirm the generic route keeps lazy owner-row input initialization and first-touch order, and `finally` clears every used record/input/group/output scratch prefix on success, decline, cancellation, and throw.
7. Run the focused prepared-owner-row and Root native-cell-cut suites, then the required full runtime suite before integration. A new matched performance or allocation study is required before making a benefit claim.

## Why this boundary

The archived fusion review already combined dirty-input validation/capture and reused validated records for generic fanout collection. Folding capture and source mirroring would violate the complete-preflight-before-mutation rule. Moving `lastSourceValue` mutation into generated code would change error behavior if a projector throws before the kernel returns. The current proposal removes the remaining separate program-selection scan without adding a queue, cache, token, or validation exception.
