# Root-local owner-row dispatch plan, version 2

This is a read-only architecture proposal. It adds listener-order, mixed-queue, fallback and promotion details to the initial note in `owner-row-dispatch-plan.md`. It makes no speed claim.

## Evidence boundary

The attribution source is the verified archive `implementation/2026-10-13-compiled-owner-row-cpu/evidence.tar.gz`, SHA-256 `3b8801d3d95bc21b314151ada7360375abf0860c5a367d8f4f4c6542e61ba59c`. It covers two whole pages and 480 measured harness frames, including navigation, import, mount, warmup, measurement, inspection and disposal. The timing gate remains `FAIL`. Sampled locations include Root row capture/publication 62.041 ms, World dispatch 24.801 ms, Root `PendingStateChanges.setCell` 19.616 ms, setter forwarding 17.969 ms, World acknowledgement 15.082 ms, and Root acknowledgement 13.232 ms. These figures motivate inspection; they are not update-only costs, per-operation measurements, or expected savings. VDOM loop fusion is a separate in-progress change.

## Smallest safe implementation seam

The bounded change is a Root-local `PendingRootWork` facade that owns one ordered queue for both ordinary pending changes and certified row slots. It replaces only `ComponentStateRoot`'s use of `PendingStateChanges`; the standalone `PendingStateChanges` API, World public APIs, and `WorldDirtyJournal` remain unchanged.

```ts
type RootDirtySlotTicket = opaque;
type RootDirtyRowCut = opaque;

interface PendingRootWork {
  readonly size: number; // generic entries plus certified dirty slots
  setCell(handle: StateCellHandle, version: number): void;
  setCertifiedSlot(ticket: RootDirtySlotTicket, version: number): void;
  promoteSlotToGeneric(ticket: RootDirtySlotTicket): void;
  capture(): StateChange[]; // merged first-dirty order, for candidates/fallback
  captureGenericNative(handles: ReusableHandles, versions: ReusableVersions): number | null;
  captureRows(cut: ReusableRootRowCut): number | null;
  clearThrough(changes: readonly StateChange[]): void;
  clearRowsThrough(cut: RootDirtyRowCut): void;
  clear(): void;
}

world.registerRootDirtySlot(rootIdentity, committedCell, rowIdentity, generation, slot)
  -> RootDirtySlotTicket | null;
world.captureRootDirtyRows(rootIdentity, reusableBuffers) -> RootDirtyRowCut | null;
world.ackRootDirtyRows(rootIdentity, cut, capturedVersions) -> void;
world.unregisterRootDirtySlots(rootIdentity) -> void;
```

Names are illustrative. The seam is concrete: Root has a unified ordered pending-work view; World supplies opaque registration/capture/ack for committed rows. There is no public `StateCellHandle` replacement. A ticket binds World identity, Root identity, the committed cell identity, owner/site, row-lease identity and generation, compiler `programId`, and dense slot. Runtime provenance uses private class brands and private fields, not reflectable mutable symbols or a per-write WeakMap lookup. The cell stores the sparse Root-registration links directly so a setter already holding that cell can reach its tickets without resolving owner/site maps.

`PendingRootWork` needs both the existing generic record and a row ticket for fallback materialization. Its linked work nodes carry a monotonically increasing first-dirty ordinal, tag (`generic` or `row-slot`), latest version, and mode-specific record. Repeated writes update the maximum version without changing the ordinal. The row queue groups slots by row for VDOM execution, while the ordered work links retain cross-row slot order. A reusable capture merges from the unified queue, so mixed generic/row work does not need sorting or per-capture record allocation.

## Listener ordering and nested writes

`OwnerStateWorld.#dispatchState` currently snapshots `#dirtyCellListeners` and the public `#changeListeners` before invoking callbacks. It then calls dirty-cell listeners in subscription order, followed by public change listeners in their captured order. A dirty listener can synchronously write again; the nested dispatch completes its own captured cuts before the outer loop resumes. A thrown dirty listener stops the rest of that dirty cut and prevents the later public change-listener loop. Subscribe/unsubscribe changes affect the next dispatch, because the current dispatch holds immutable listener arrays.

The Root optimization must stay inside that ordering:

1. Keep one ordered dirty-listener cut. Existing `subscribeDirtyCells` subscribers remain at their existing subscription ordinals. A Root's internal endpoint occupies the ordinal where that Root currently subscribes. Do not run all row registrations as a World pre-pass before user dirty listeners, and do not run them after the whole public change cut.
2. For a registered cell, the Root endpoint routes to the committed cell's directly attached Root slot ticket, updates its Root queue node, and does not call `PendingStateChanges.setCell` as a second queue. For cells without a current certified registration, the same endpoint uses the existing `isWithin`/`setCell` fallback. Public dirty-cell listeners are still called once per accepted write and in current order; public `StateChange` listeners still form the later cut.
3. Keep listener membership immutable for the duration of a dispatch. Unsubscribing or disposing a Root during an earlier callback must not remove its endpoint from the current captured cut; it affects later cuts. Destruction/revocation may mark its registration inactive, but the current endpoint still observes its captured event in order and must not resurrect the cell. Future captures reject the inactive ticket. The public listener behavior remains unchanged.
4. The dispatch listener endpoint is not allowed to throw for internal Root queue bookkeeping. If a user listener throws, exception propagation and stopping behavior remain exactly as today; no catch-and-continue behavior is added.

Nested setter order requires max-coalescing. Suppose an outer dispatch produces version `v+1`, a listener runs a nested setter to `v+2`, and the outer listener loop later reaches the Root endpoint with the older `v+1`. This is possible whether the Root endpoint precedes or follows the reentrant listener. The Root queue node must update as `max(existingVersion, notifiedVersion)`, exactly like `PendingStateChanges.setCell`, and must never overwrite `v+2` with `v+1`. The queue ordinal is assigned when the Root endpoint first receives a clean-to-dirty event, matching current Root queue insertion timing under reentrancy. Later writes coalesce without moving that node.

The World setter must retain its current post-updater exact owner/site/cell check. If a functional updater destroys the owner, dispatch returns false before dirty-journal marking, identity creation, listener cuts or Root-slot updates.

## Unified Root pending-work behavior

Every Root pending check, capture, preparation, retry, commit and clear must use `PendingRootWork.size` and the same ordered work set. This includes the checks in `#flush`, store and collection preparation, resource-retry decisions, native row-cut eligibility, and disposal. Leaving a row-only side queue invisible to any one of these checks can skip a commit or strand an entry behind a barrier.

- **Ordinary notification:** the Root endpoint chooses a registered row ticket only if World confirms that the committed numeric registration is active. Otherwise it uses generic owner/site handling. Row and generic entries occupy nodes in the same Root queue.
- **Repeated writes:** every accepted committed write still marks the shared World journal and invokes public dirty-cell listeners as today. For an already queued Root slot, update only `maxVersion`; do not reinsert or schedule another Root turn. On its first clean-to-dirty transition, append exactly one slot node and schedule if required.
- **Row-only native capture:** `captureRows` succeeds only if every queued entry is an active certified row slot and all buffers are large enough. It captures exact versions and lane values through World-validated row tickets. This path does not turn the cut back into per-cell handles or call `numericRowForCell(handle, version)` for every slot.
- **Mixed/legacy capture:** if any node is generic, legacy, unsupported, stale, or a row registration is incomplete, `captureRows` declines without mutation. `capture()` materializes one merged first-dirty `StateChange[]` view for the existing coherent generic/candidate path. The materialized records carry captured identity/version where available; stale tickets are rejected without host publication. Existing candidates then compare captured versions and clear only the captured work through their current transactional rules.
- **Barriers:** store reader generations, collection versions, resource retries, and structural candidate checks still run before consuming a numeric row cut. A barrier can capture/prepare the unified pending work through the same Root facade; it must not look only at generic `PendingStateChanges` and miss row slots. If the barrier declines or retries, row and generic nodes remain pending with their order and maximum versions intact.
- **Candidate preparation:** prepared/private owners and render candidates never receive a committed Root slot ticket or World dirty registration. The candidate may read/capture the unified Root queue as input, but only a successful publish can install new committed registrations. Rollback/discard must leave pending Root work unchanged.

## Promotion and registration lifecycle

Promotion from numeric to ordinary state is a transfer, not a delete followed by a fresh append. If a cell with a queued row ticket becomes unsupported or nonnumeric, World deactivates the ticket for future numeric capture and `PendingRootWork.promoteSlotToGeneric` changes the existing work node in place. It keeps the same first-dirty ordinal, maximum captured version and stable cell handle/identity needed for generic fallback. Only after this transfer is visible to every attached Root may World clear the row link. If the slot was not yet pending, the current dispatch inserts one generic node at the current listener endpoint.

The same in-place transfer rule applies when a layout/row registration is retired while its cell remains committed and dirty. If the owner/cell is destroyed or replaced, there is no generic transfer: revoke and scrub the token and remove its Root work node as part of the same lifecycle edge that removes the old committed cell. A new cell at the same owner/site gets a new identity and new registration only after publication.

Registration creation is publication-only. For a normal committed mount, install Root registrations after the owner row and VDOM bindings are accepted. For replacement/keyed candidates, do not attach them during preparation. On successful publish, retire old registrations and attach the new ones at the existing candidate publication boundary; on rollback/discard, attach none. Destruction, Root disposal, promotion, row release, and row-generation reuse clear cell registration links, row links and Root node links. Retained tickets must not keep a Root, row, source, or payload alive.

## Acknowledgement contract

At capture, freeze each slot's exact cell identity, row lease identity/generation, slot, captured version, and value in reusable Root buffers. Before host mutation, validate the full row cut. A stale token, a changed slot occupant, unsupported projection, or incomplete row declines before source mirroring or host writes.

After accepted host publication, World acknowledgement receives the opaque Root cut and captured versions. For each slot it verifies the private ticket brand and exact World/Root identity, active registration, exact current cell identity, row lease identity/generation, and `cell.version <= capturedVersion`. It unlinks the matching prepared dirty membership from the shared World journal and clears only this Root's pending slot through that captured version. If the cell is newer than the cut, retain the Root slot and World dirty membership, preserve its queue ordinal, and ensure a later Root turn is scheduled. A Root's ack never clears another Root's pending registration.

The shared World journal still backs `pendingChanges`, `drainChanges`, `clearChangesThrough`, `hasPendingChanges`, and generic owner/site ordering. Its owner/site membership remains shared as it is today; Root registrations are additional independent scheduling/cut state. Public generic calls do not clear Root-local queues. A first Root may clear shared World dirty membership while a second Root still has its own queued ticket; the second Root must still capture and commit from its own state, matching today's independent Root pending queues.

## Required behavior matrix

| Scenario | Required behavior |
|---|---|
| Repeated writes to a clean registered slot | First write adds one Root work node and one schedule edge. Later writes update `maxVersion`; public per-write listeners and World marks retain current behavior. |
| Outer write v+1, listener performs nested v+2 | Queue ends with v+2 regardless of whether Root endpoint executes before or after the reentrant listener. The older outer callback cannot regress version. |
| Subscribe/unsubscribe during dirty notification | Current immutable cut runs the originally captured endpoint set and order. Changes apply on the next dispatch. |
| Root dispose or cell destroy in earlier listener of same cut | Captured endpoint remains at its original position; inactive registration cannot resurrect data or enter a later cut. Remaining public callbacks retain current throw/stop semantics. |
| Two Roots listen to the same committed cell | Each has a separate work node/ticket/order and schedule. Ack by one leaves the other pending. |
| Generic and row work interleaved | A single Root queue preserves first-dirty ordinal. `capture()` materializes a merged ordered change list; row-only capture declines if generic work is present. |
| Numeric promotion while row slot pending | Transfer the existing work node to generic mode without changing ordinal or max version; no write is lost or duplicated. |
| Layout/row retirement while cell remains dirty | Transfer queued work to generic mode before removing the row ticket. Unsupported or stale row data cannot partially publish. |
| Candidate replacement preparation/rollback | Candidate writes have no committed Root registration. Rollback leaves current unified queue and old registrations intact. Successful publication switches registrations at the same commit boundary. |
| Store, collection, resource retry or structural work | Every pending check and capture observes both generic and row nodes. Existing barriers win; retry leaves all nodes pending. |
| Reentrant write during host commit | Ack compares captured version; newer version remains in the same ordered node and schedules the next pass. |
| Updater destroys owner | Existing dispatch guard returns false before mark, registration notification or capability recreation. |
| Physical row index reused for a new lease | New generation/identity prevents stale capture/ack even if column and row numbers match. |
| Listener throws | Existing throw propagation stops the rest of the current dirty cut and skips later public change notifications. Internal Root bookkeeping adds no catch-and-continue behavior. |
| Insufficient row buffers or unsupported sink | Row capture declines before mutation; unified fallback materializes the entire pending work set without dropping nodes. |
| Root/World disposal with retained tokens | Unregister and scrub all links; dead tokens cannot retain unrelated rows, Roots, sources or user payload. |

## Failure modes

- Running Root registrations in a separate pre-pass changes ordering relative to dirty listeners and nested setters.
- Replacing `maxVersion` with assignment lets an older outer callback overwrite a newer nested write.
- Keeping generic and row queues separate without a common first-dirty order can reorder mixed fallback or store candidate captures.
- Updating only the main flush path leaves store/resource/collection preparation blind to row-only pending work.
- Dropping a pending row ticket during promotion before in-place generic transfer loses its write.
- Mapping row/column coordinates without exact cell identity and row generation can acknowledge a replacement owner after row reuse.
- Reusing one World row queue for multiple Roots lets one Root starve another or violate nested/grafted boundaries.
- Installing registrations during candidate preparation schedules discarded private state and leaks Root references on rollback.
- Changing the shared World journal to per-Root semantics would change public owner/site APIs and is outside this increment.
- The profile covers the whole page. These changes may reduce repeated Root queue work and handle resolution, but their performance effect is unmeasured until a new matched study.

## Finite verification sequence

1. Unit-test `PendingRootWork` coalescing, first-dirty ordering, max-version behavior, row-to-generic in-place transfer, mixed capture, and clear-through with newer reentrant work.
2. World-test ordered listener cuts with Root endpoints interleaved before and after public listeners; nested setter v+2 followed by outer v+1; subscribe/unsubscribe during notification; owner destruction during a notification; listener throw propagation; foreign, stale and reused-row tickets.
3. Root-test two Roots and a nested/grafted owner, independent capture/ack, and dispatch to a row slot plus a generic cell in both orders. Assert store, collection, resource retry, and structural candidate paths see the same unified pending work.
4. Test numeric promotion and layout/lease retirement while pending, including fallback host publication and exact version clearing.
5. Test candidate replacement success, stale candidate, discard and rollback. Confirm private candidate setters never schedule or register, old registrations survive rollback, and successful publish switches at one boundary.
6. Run existing World, owner preparation, Root, numeric lane/row, native cell, store and collection suites. Keep GC retention proof as an explicit standalone script, not normal test discovery.
7. Only after correctness passes, preregister a new matched product profile. The current archive supports attribution of hot locations only, not a speed claim.
