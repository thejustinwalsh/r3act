const preparedMembershipAuthority = {};
/** Runtime-opaque token; private data retains one bucket/node, never the journal. */
class PreparedDirtyMembershipToken {
    #journalIdentity;
    #entry;
    constructor(authority, journalIdentity, entry) {
        if (authority !== preparedMembershipAuthority) {
            throw new TypeError("Prepared dirty membership is not constructible");
        }
        this.#journalIdentity = journalIdentity;
        this.#entry = entry;
        Object.freeze(this);
    }
    static resolve(value, journalIdentity) {
        if ((typeof value !== "object" && typeof value !== "function") ||
            value === null || !(#entry in value))
            return null;
        const token = value;
        const entry = token.#entry;
        return token.#journalIdentity === journalIdentity && entry &&
            !entry.bucket.retired
            ? entry
            : null;
    }
    static retire(value, journalIdentity) {
        if ((typeof value !== "object" && typeof value !== "function") ||
            value === null || !(#entry in value))
            return;
        const token = value;
        if (token.#journalIdentity !== journalIdentity)
            return;
        token.#journalIdentity = undefined;
        token.#entry = undefined;
    }
}
/**
 * Owner-major ordered dirty membership for OwnerStateWorld.
 *
 * Buckets and site nodes are reused after acknowledgement or clear, then
 * released by removeOwner. This class stores no cell values, handles, sources,
 * closures, or payloads.
 */
export class WorldDirtyJournal {
    #identity = {};
    #owners = new Map();
    #firstOwner;
    #lastOwner;
    #activeOwnerCount = 0;
    /** Number of owners with at least one active dirty site. */
    get size() {
        return this.#activeOwnerCount;
    }
    /** Test active membership without traversing the pending journal. */
    has(owner, site) {
        return this.#owners.get(owner)?.sites.get(site)?.active === true;
    }
    /** Mark an owner/site dirty, coalescing repeated writes without reordering. */
    mark(owner, site) {
        const entry = this.#entryFor(owner, site);
        this.#markEntry(entry.bucket, entry);
    }
    /** Prepare one reusable node; subsequent marks/deletes avoid owner/site Maps. */
    prepareMembership(owner, site) {
        const entry = this.#entryFor(owner, site);
        if (!entry.prepared) {
            entry.prepared = new PreparedDirtyMembershipToken(preparedMembershipAuthority, this.#identity, entry);
        }
        return entry.prepared;
    }
    /** Mark a previously prepared node in O(1); foreign or retired nodes decline. */
    markPrepared(token) {
        const data = PreparedDirtyMembershipToken.resolve(token, this.#identity);
        if (!data)
            return false;
        this.#markEntry(data.bucket, data);
        return true;
    }
    /** Delete a previously prepared node in O(1); foreign or retired nodes decline. */
    deletePrepared(token) {
        const data = PreparedDirtyMembershipToken.resolve(token, this.#identity);
        if (!data)
            return false;
        this.#deleteEntry(data.bucket, data);
        return true;
    }
    #entryFor(owner, site) {
        let bucket = this.#owners.get(owner);
        if (!bucket) {
            bucket = { owner, sites: new Map(), retired: false, active: false };
            this.#owners.set(owner, bucket);
        }
        let entry = bucket.sites.get(site);
        if (!entry) {
            entry = { site, bucket, active: false };
            bucket.sites.set(site, entry);
        }
        return entry;
    }
    #markEntry(bucket, entry) {
        if (entry.active)
            return;
        entry.active = true;
        entry.previous = bucket.lastSite;
        entry.next = undefined;
        if (bucket.lastSite)
            bucket.lastSite.next = entry;
        else
            bucket.firstSite = entry;
        bucket.lastSite = entry;
        if (!bucket.active)
            this.#activateOwner(bucket);
    }
    /** Remove one dirty site; a later mark re-enters at the tail. */
    delete(owner, site) {
        const bucket = this.#owners.get(owner);
        const entry = bucket?.sites.get(site);
        if (!bucket || !entry?.active)
            return;
        this.#deleteEntry(bucket, entry);
    }
    #deleteEntry(bucket, entry) {
        if (!entry.active)
            return;
        this.#unlinkSite(bucket, entry);
        if (!bucket.firstSite)
            this.#deactivateOwner(bucket);
    }
    /** Remove all dirty and reusable journal metadata for a destroyed owner. */
    removeOwner(owner) {
        const bucket = this.#owners.get(owner);
        if (!bucket)
            return;
        if (bucket.active)
            this.#deactivateOwner(bucket);
        bucket.retired = true;
        for (const entry of bucket.sites.values()) {
            entry.active = false;
            entry.previous = undefined;
            entry.next = undefined;
            PreparedDirtyMembershipToken.retire(entry.prepared, this.#identity);
            entry.prepared = undefined;
        }
        bucket.firstSite = undefined;
        bucket.lastSite = undefined;
        bucket.sites.clear();
        this.#owners.delete(owner);
    }
    /** Clear active work while retaining buckets and site nodes for reuse. */
    clear() {
        for (let bucket = this.#firstOwner; bucket;) {
            const nextBucket = bucket.next;
            for (let entry = bucket.firstSite; entry;) {
                const nextEntry = entry.next;
                entry.active = false;
                entry.previous = undefined;
                entry.next = undefined;
                entry = nextEntry;
            }
            bucket.active = false;
            bucket.firstSite = undefined;
            bucket.lastSite = undefined;
            bucket.previous = undefined;
            bucket.next = undefined;
            bucket = nextBucket;
        }
        this.#firstOwner = undefined;
        this.#lastOwner = undefined;
        this.#activeOwnerCount = 0;
    }
    /** Enumerate active pairs in owner insertion order, then site insertion order. */
    *entries() {
        for (let bucket = this.#firstOwner; bucket; bucket = bucket.next) {
            for (let entry = bucket.firstSite; entry; entry = entry.next) {
                yield [bucket.owner, entry.site];
            }
        }
    }
    #activateOwner(bucket) {
        bucket.active = true;
        bucket.previous = this.#lastOwner;
        bucket.next = undefined;
        if (this.#lastOwner)
            this.#lastOwner.next = bucket;
        else
            this.#firstOwner = bucket;
        this.#lastOwner = bucket;
        this.#activeOwnerCount++;
    }
    #deactivateOwner(bucket) {
        if (bucket.previous)
            bucket.previous.next = bucket.next;
        else
            this.#firstOwner = bucket.next;
        if (bucket.next)
            bucket.next.previous = bucket.previous;
        else
            this.#lastOwner = bucket.previous;
        bucket.previous = undefined;
        bucket.next = undefined;
        bucket.active = false;
        this.#activeOwnerCount--;
    }
    #unlinkSite(bucket, entry) {
        if (entry.previous)
            entry.previous.next = entry.next;
        else
            bucket.firstSite = entry.next;
        if (entry.next)
            entry.next.previous = entry.previous;
        else
            bucket.lastSite = entry.previous;
        entry.previous = undefined;
        entry.next = undefined;
        entry.active = false;
    }
}
//# sourceMappingURL=world_dirty_journal.js.map