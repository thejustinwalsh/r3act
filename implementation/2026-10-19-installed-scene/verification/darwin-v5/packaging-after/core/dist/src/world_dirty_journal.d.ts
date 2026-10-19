import type { OwnerId, StateSiteId } from "./owner_state_world.ts";
/** Opaque payload-free owner/site node reference prepared by one journal. */
declare const preparedDirtyMembershipType: unique symbol;
export interface PreparedDirtyMembership {
    readonly [preparedDirtyMembershipType]: never;
}
/**
 * Owner-major ordered dirty membership for OwnerStateWorld.
 *
 * Buckets and site nodes are reused after acknowledgement or clear, then
 * released by removeOwner. This class stores no cell values, handles, sources,
 * closures, or payloads.
 */
export declare class WorldDirtyJournal {
    #private;
    /** Number of owners with at least one active dirty site. */
    get size(): number;
    /** Test active membership without traversing the pending journal. */
    has(owner: OwnerId, site: StateSiteId): boolean;
    /** Mark an owner/site dirty, coalescing repeated writes without reordering. */
    mark(owner: OwnerId, site: StateSiteId): void;
    /** Prepare one reusable node; subsequent marks/deletes avoid owner/site Maps. */
    prepareMembership(owner: OwnerId, site: StateSiteId): PreparedDirtyMembership;
    /** Mark a previously prepared node in O(1); foreign or retired nodes decline. */
    markPrepared(token: PreparedDirtyMembership): boolean;
    /** Delete a previously prepared node in O(1); foreign or retired nodes decline. */
    deletePrepared(token: PreparedDirtyMembership): boolean;
    /** Remove one dirty site; a later mark re-enters at the tail. */
    delete(owner: OwnerId, site: StateSiteId): void;
    /** Remove all dirty and reusable journal metadata for a destroyed owner. */
    removeOwner(owner: OwnerId): void;
    /** Clear active work while retaining buckets and site nodes for reuse. */
    clear(): void;
    /** Enumerate active pairs in owner insertion order, then site insertion order. */
    entries(): IterableIterator<readonly [OwnerId, StateSiteId]>;
}
export {};
//# sourceMappingURL=world_dirty_journal.d.ts.map