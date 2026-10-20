import type { OwnerId, StateCellHandle, StateChange } from "./owner_state_world.ts";
/**
 * Ordered, owner/site-coalesced dirty state journal.
 *
 * Keys live in the owner/site cache and are linked only while pending. That
 * keeps the per-frame hot path to field updates and pointer changes, while
 * allowing an acknowledged key to re-enter at the end of the queue.
 */
export declare class PendingStateChanges {
    #private;
    get size(): number;
    /** Keep the public journal's historical latest-arrival/reference semantics. */
    set(change: StateChange): void;
    /** Store native dirty-cell notifications without allocating StateChange records. */
    setCell(handle: StateCellHandle, version: number): void;
    /** Capture an independent array; native records are fresh snapshots. */
    capture(): StateChange[];
    /**
     * Capture a snapshot-free native cut into caller-owned, pre-sized reusable
     * buffers. Capacity must cover the current queue; legacy entries or
     * insufficient capacity return null and scrub the partially written prefix.
     */
    captureNative(handles: (StateCellHandle | undefined)[], versions: number[]): number | null;
    values(): IterableIterator<StateChange>;
    clear(): void;
    /** Remove captured entries that have not advanced past their captured version. */
    clearThrough(captured: readonly StateChange[]): void;
    /** Acknowledge only the exact native handles and versions in a captured cut. */
    clearNativeThrough(handles: readonly (StateCellHandle | undefined)[], versions: readonly number[], count: number): void;
    /** Remove an owner's pending entries and cached identities. */
    dropOwner(owner: OwnerId): void;
}
//# sourceMappingURL=pending_state_changes.d.ts.map