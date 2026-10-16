# Runtime simplification review: owner numeric state

## Scope and guardrails

This is an architecture plan for the live `component_state_runtime.ts`, `vdom_snapshot_runtime.ts`, `owner_state_world.ts`, `compiled_state_layout.ts`, and `compiler/oxc-spike/src/main.rs`, read alongside `.cache/compiled-owner-execution-plan/plan-v3.md`. The archived owner-row-fusion workload passed correctness and failed its speed gate; the v3 kernel remains a hypothesis. This plan makes no latency claim.

Keep the existing ownership direction:

- **OXC compiler** classifies authored source and emits immutable component/layout/sink metadata.
- **OwnerStateWorld** owns committed values, versions, owner/site identity, row allocation and generation, and dirty acknowledgement.
- **ComponentStateRoot** captures the exact dirty cut, chooses execution, guards publication, and acknowledges only accepted writes.
- **VDOMSnapshotRoot** owns mounted sink groups, projections, equality, host writes, and cancellation.

No World-to-VDOM dependency, host write from the compiler kernel, or acknowledgement from VDOM. The prepared row executor remains the semantic fallback. Candidate publication, all-capture-before-projection, all-projection-before-host-write, and no-ack-on-decline/host-failure are fixed boundaries.

## Duplication and naming findings

1. **Two prepared numeric protocols represent one owner row cut.** Root keeps `#nativeLanePrograms` / `#nativeLaneTokens` and `#nativeRowPrograms` / `#nativeRowTokens` / `#nativeRowViews` plus changed-row/slot buffers. It tries `#tryCommitNativeRows`, then `#tryCommitNativeLanes`, then the generic source program. Both prepared paths have their own token cache, retry/reprepare branch, success counters, last-source updates, World clearing, and PendingStateChanges clearing. The row path is the representation needed by the v3 whole-cut plan; the cell path is a narrower second protocol. Preserve legacy descriptors through the generic fallback, and prove that path before removing cell tokens.

2. **World row information is repeated at each boundary.** `NumericRowLease`, `NumericLaneAddress`, `NumericCellRowView`, `PreparedNumericRowProgramSpec`, and `PreparedNumericRowProgramRecord` all carry overlapping owner/layout/row/generation/source/column facts. Some duplication is purposeful: World leases and identities are authoritative, while VDOM keeps snapshots so a stale mutable lease cannot silently change a prepared fanout. Keep those validation snapshots. Avoid adding a third permanent row-state layout for the kernel: extend the prepared row record/cut scratch, and do not retain a separate `OwnerRowExecutionState` wrapper per row.

3. **Prepared row bindings cache per-group projections as well as per-row data.** `BoundPropGroup` carries `ownerRowInputs`, `ownerRowSources`, `ownerRowInputSlots`, `ownerRowProjectInputs`, and `ownerRowCutEpoch`; each prepared row record also has `usedSlots`, `groupsBySlot`, `inputValues`, and changed-value/epoch vectors. The v3 kernel specifically aims to remove per-sink input copying and dynamic projector dispatch. On the kernel path, replace the per-group input vectors with reads from the row’s captured slot values; do not keep both layouts. Keep per-group projector fields only for the fallback path and release them on fallback invalidation as today.

4. **`compiled_state_layout.ts` has three derived caches for one immutable descriptor.** `normalizedLayouts`, `layoutSignatures`, and `layoutSlotsBySite` all key the same input/normalized layout identity. This is derived metadata, not three semantic states. A single WeakMap entry can hold normalized layout, signature, and lazily built site-to-slot lookup without adding a facade or changing the serialized layout.

5. **Compiler classification keeps unused or derivable data.** `NativePropCandidate.state_ref_counts` is populated but has no reads. `CandidateClassification.site_ids` is derived from its ordered `bindings`; retain it only if a measured call site needs constant-time set membership. The local `certified` flag is followed by a broader `pure` flag that also checks cross-sink fallback sites; those names blur expression purity and owner-wide eligibility. Use explicit names such as `locallyCertified` and `ownerLayoutEligible`. The state layout `programId` and descriptor `ownerProgramId` intentionally match today; do not rename old wire fields. For v3 metadata, emit one canonical component `programId`, with sinks referencing that program and stable sink IDs rather than repeating source-site arrays when slot indices already identify the same ordered layout.

6. **Captured and previous values are easy to confuse.** Root’s `#numericProgramCurrentValues` is the value captured from World’s current column, while `#numericProgramPreviousValues` is the source value restored for the generic route. Targeted private names `#capturedValues` and `#committedSourceValues` describe those roles. Avoid broad renaming of public API or wire fields.

7. **Different undo journals are not one abstraction.** `ExpansionJournal` in ComponentStateRoot rolls back component/cache expansion. `OwnerPreparation`’s undo journal and checkpoints roll back candidate World maps/cells. Moving both into a common “transaction” helper would relocate code without removing their different invariants. Keep them separate unless a later diff deletes duplicated state, not merely lines.

## Three bounded next changes

### 1. Remove compiler bookkeeping that has no reader

**Files:** `compiler/oxc-spike/src/main.rs` and the focused OXC unit tests.

Delete `NativePropCandidate.state_ref_counts` and its increments/initializers. In a separate small hunk, derive site membership from `bindings` at the point of use or retain the set only where it avoids repeated searches; do not change purity checks or emission. Rename only the local `certified`/`pure` distinction to communicate local expression certification versus whole-owner layout eligibility. Keep Rust `PascalCase` types and `snake_case` fields/functions; keep generated TypeScript JSON keys camelCase. Existing schema-v1/v2 output and fixtures must remain byte/behavior compatible. This is actual deletion, not moving the collector into a new module.

### 2. Make owner-row the sole prepared representation for compiled owner layouts

**Files:** `src/component_state_runtime.ts`, `src/vdom_snapshot_runtime.ts`, targeted prepared-cell/row tests; World remains unchanged.

For a committed cell with a current compiled owner layout, resolve the exact handle/version to its row view and enter the row executor. Remove the parallel cell-token cache/API only if the compatibility matrix proves every current cell-path case is either covered by row execution or safely declines to the existing generic source-program path. Keep World’s `numericLaneForCell`, `numericRowForCell`, leases, and identity/version checks as the authority; do not reimplement them in Root. Consolidate the shared success/acknowledgement code only where row and generic routes truly have the same accepted-cut semantics.

Tests must cover schema-v1/legacy unary fallback, schema-v2 owner rows, missing/unsupported sinks, mixed owners, value capture during reentry, stale lease/version, moves and row reuse, promotion, disposal, host throw, second preflight decline, accepted-with-no-host-write, and exact pending-version acknowledgement. The simplification is successful only if the duplicate token map, token API, and retry protocol disappear; extracting both strategies behind a new interface does not count.

### 3. Prototype the v3 kernel inside the prepared row record, subject to an operation-count gate

**Files:** Rust compiler metadata/emission, `src/vdom_snapshot_runtime.ts`, focused compiler/runtime execution tests. Root and World APIs should not gain parallel state for this experiment.

Add the versioned owner-cut program described in `plan-v3.md`, keyed by the existing component `programId` and stable sink IDs. Keep v1/v2 descriptors as fallback. Reuse the existing prepared-row identity, layout slots, captured changed-row/slot order, root-owned cut buffers, and VDOM row record. The kernel reads the complete captured values and stages sink outputs; it cannot call hosts, mutate World, or acknowledge. All rows in a cut must match the same owner program/layout and primitive-only eligibility; otherwise use the whole-cut prepared-row fallback.

Do not add permanent per-row wrapper objects or duplicate `ownerRowInputs`; use one row-input representation and clear staged references in `finally`. Preserve source mirror, complete-cut capture, first-touch sink/write order, equality/force-write behavior, and cancellation before each host write. Before timing, compare total operations including the new loop, switch/fanout work, staging, and cleanup. If it relocates equivalent work or fails to reduce the targeted dynamic dispatch/copy work, delete the prototype. Any speed claim requires a separate preregistered measurement of the unchanged workload.

## Naming and comments

Use role names at the narrow boundaries: TypeScript types `OwnerRowCutProgram`, `PreparedOwnerRow`, `OwnerRowCut`; private values `capturedValues`, `changedSlots`, `projectedValues`. In Rust use `OwnerRowCutProgram`, `PreparedOwnerRow`, and `owner_row_cut_program` / `changed_slots`. Keep serialized camelCase keys explicit with serde rename attributes. Avoid strategy suffixes that leak historical experiments into runtime concepts. Public APIs receive concise TSDoc only where consumers need contract details; private implementation comments stay within two lines and explain an invariant that code cannot show directly.
