# Current owner-kernel hot-path review

Read-only source trace against the frozen headless study. The study passed its correctness gates but failed its paired speed gate: median native/React geometric means were 1.0637 (128 rows), 1.3224 (1,024), and 1.4963 (10,000); p95 ratios were 1.0223, 1.2437, and 1.0890. This identifies a performance gap, not its cause. Source inspection cannot attribute the measured time.

## Dispatch to host

1. `OwnerStateWorld.#dispatchState` in `src/owner_state_world.ts` runs an updater, checks owner/cell identity after user code, applies `Object.is` equality, updates the cell/version, writes the numeric column lane, marks the dirty journal, and notifies dirty-cell subscribers. The compiled path avoids allocating a public `StateChange` record at notification time.
2. `ComponentStateRoot.flush` in `src/component_state_runtime.ts` takes the native-only branch before `PendingStateChanges.capture()`. `captureNative` copies the coalesced handles and versions into reusable Root arrays.
3. `#tryCommitNativeRows` resolves every handle/version through `world.numericRowForCell`, fetches the per-row cached VDOM token from `#nativeRowPrograms`, coalesces slots into reusable changed-row/slot arrays, and snapshots current column values into a reusable value array. It wraps execution in the publication barrier and acknowledges the captured versions only after accepted execution.
4. `VDOMSnapshotRoot.#executePreparedNumericRows` in `src/vdom_snapshot_runtime.ts` has an all-cut preflight. It checks each dirty item’s token, row record, slot, source/column lease, and duplicate-slot value; then walks each touched row’s used slots to revalidate leases and capture `inputValues`. It mirrors the complete captured vectors into `ScalarSource.value` before invoking the one compiler kernel for the cut.
5. The kernel stages selected primitive sink outputs. VDOM validates every staged index/sink/mask/value, updates each selected sink’s `lastSourceValue`, then iterates staged outputs and calls `#writeBoundGroup`. That uses a prepared style writer where available, otherwise `setStyleProp`/`setProp`. `DOMVDOMHost.setProp` handles attributes, properties, events, and style maps. After successful execution Root advances last-source values and clears World/journal changes through the captured versions.

## Repeated work to investigate

- **Changed-slot lease validation and column reads are repeated.** In `#executePreparedNumericRows`, the first dirty-input pass checks `sourceLease` and `columnLease` for the changed slot. The later per-row used-slot pass checks those leases again and reads `column.values[row]`, then immediately overwrites `inputValues[slot]` with `changedValues[slot]`. A bounded reduction is to prefer the changed-epoch branch first and assign `changedValues` directly; only unchanged used slots need the second-pass lease check and column read. The first pass already validated every changed slot, including changed-but-unused slots. No user callback occurs between preflight passes, so this preserves the all-cut barrier. Regressions must still prove stale changed/untouched leases and conflicting duplicate values decline before any source mirror, projector, or host write.
- **Every dirty item resolves World row identity and performs a Root WeakMap lookup.** `numericRowForCell` resolves the capability, checks exact version, row lease/layout/lane/source identity, and current lane address. Root then does `#nativeRowPrograms.get(rowIdentity)` for each dirty cell, even when several slots belong to the same row. This is correctness-sensitive validation. A lower-risk future option is an existing-buffer grouping strategy that can reuse the prior row token for adjacent identical `rowIdentity` values, but only if dirty-journal ordering guarantees adjacency; otherwise a new index would add bookkeeping and is outside the current “existing representation only” constraint. Do not remove World identity/version checks based on this source review.
- **The VDOM path has several unavoidable barrier passes.** It must finish validating the whole cut before it mutates source mirrors, run all projections before the first host write, validate compiler output before writing, and preserve cancellation/reentry semantics. The mirror pass and staged-output validation are not redundant with projection: closures may read mirrored `ScalarSource`s, and kernel output is treated as an untrusted boundary. A deletion needs a proof that preserves those boundaries, not just a lower loop count.
- **Per-sink state and publication remain real work.** The kernel stages a value per selected sink; VDOM checks the staged record, sets `lastSourceValue`, applies `sameBoundValueCanSkipWrite`, calls the generic host writer, then updates `lastValue`. The generic writer preserves custom-host and DOM semantics. No host-call removal is justified unless that output is SameValue-equal and the existing skip check establishes it. Style-map writes can still enumerate keys in `DOMVDOMHost.setProp`; the prepared style-writer path avoids that map for supported style sinks.

## Smallest review candidate and proof obligations

Start with the changed-slot branch/read reduction above. It is local to `src/vdom_snapshot_runtime.ts`, adds no map/buffer/state, and does not change the generated program or publication protocol. Prove that stale leases on changed slots still decline before *any* mirror, projector, or host write; untouched used-slot lease loss still declines; duplicate conflicting values still decline; and a later preflight failure leaves all sources and host state untouched. Compare exact lease-check and column-read counts structurally only. Then obtain a separately preregistered profile before making any performance claim.

If source diagnostics later point at Root grouping rather than VDOM validation, separately measure the per-cell `numericRowForCell` and WeakMap lookup cost. Avoid introducing another row registry or skipping identity checks without a lease/version proof. Structural edits and mixed generic paths still use their existing fallback and are outside this homogeneous all-dirty review.

## Source identity

SHA-256 values read from the current worktree:

| File | SHA-256 |
|---|---|
| `compiler/oxc-spike/src/main.rs` | `0130ca4e1f5d43ea81511c1477e5da0a72f33a2416e7d068bde0f427c609d5e7` |
| `src/owner_state_world.ts` | `e9aadf02db1e8f29f18b2999b60b93681c1458e0f18dd2891f2b36e8f43c2d34` |
| `src/component_state_runtime.ts` | `dc6ceceba93b59c6c688e250cb0cce2be3ed836296994d4101de218fada602a9` |
| `src/vdom_snapshot_runtime.ts` | `00d8516d2164d1f212e804dd3a579bc13588158eb361e756e2ebd25753b73aab` |
| `src/compiled_state_layout.ts` | `92a048e585ced4c7e74ef04bedd738b27a2ee49574c0cd11539d481937184dd1` |
| `src/jsx_binding_runtime.ts` | `d2c2a059c2abf3ec9cb88a40c10a9cfbb982074b3e0c8ade3438e8cef9101646` |
| `src/pending_state_changes.ts` | `c174f96c74b120446e3175e6501bf3a5d3e7d2af9beb93d4fc63ef437eb8da37` |
