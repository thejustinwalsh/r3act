/**
 * Ordered, owner/site-coalesced dirty state journal.
 *
 * Keys live in the owner/site cache and are linked only while pending. That
 * keeps the per-frame hot path to field updates and pointer changes, while
 * allowing an acknowledged key to re-enter at the end of the queue.
 */
export class PendingStateChanges {
    #keysByOwner = new Map();
    #keysByIdentity = new WeakMap();
    #head;
    #tail;
    #size = 0;
    get size() {
        return this.#size;
    }
    /** Keep the public journal's historical latest-arrival/reference semantics. */
    set(change) {
        let key = change.cellIdentity
            ? this.#keysByIdentity.get(change.cellIdentity)
            : undefined;
        if (!key?.alive || key.owner !== change.owner || key.site !== change.site) {
            key = this.#keyForOwnerSite(change.owner, change.site, true);
            if (change.cellIdentity) {
                this.#keysByIdentity.set(change.cellIdentity, key);
            }
        }
        if (change.cellIdentity)
            key.cellIdentity = change.cellIdentity;
        key.legacy = change;
        key.cellVersion = undefined;
        key.cellHandle = undefined;
        this.#enqueue(key);
    }
    /** Store native dirty-cell notifications without allocating StateChange records. */
    setCell(handle, version) {
        let key = this.#keysByIdentity.get(handle.cellIdentity);
        if (!key?.alive || key.owner !== handle.owner || key.site !== handle.site) {
            key = this.#keyForOwnerSite(handle.owner, handle.site, true);
            this.#keysByIdentity.set(handle.cellIdentity, key);
        }
        if (key.cellIdentity !== handle.cellIdentity)
            key.cellVersion = undefined;
        key.cellIdentity = handle.cellIdentity;
        key.cellHandle = handle;
        key.legacy = undefined;
        if (key.cellVersion === undefined || version > key.cellVersion) {
            key.cellVersion = version;
        }
        this.#enqueue(key);
    }
    /** Capture an independent array; native records are fresh snapshots. */
    capture() {
        const captured = [];
        for (let key = this.#head; key; key = key.next) {
            if (key.legacy) {
                captured.push(key.legacy);
            }
            else if (key.cellVersion !== undefined && key.cellIdentity) {
                captured.push({
                    owner: key.owner,
                    site: key.site,
                    version: key.cellVersion,
                    cellIdentity: key.cellIdentity,
                });
            }
        }
        return captured;
    }
    /**
     * Capture a snapshot-free native cut into caller-owned, pre-sized reusable
     * buffers. Capacity must cover the current queue; legacy entries or
     * insufficient capacity return null and scrub the partially written prefix.
     */
    captureNative(handles, versions) {
        let count = 0;
        for (let key = this.#head; key; key = key.next) {
            if (key.legacy || !key.cellHandle || key.cellVersion === undefined) {
                this.#scrubNativePrefix(handles, versions, count);
                return null;
            }
            if (count >= handles.length || count >= versions.length) {
                this.#scrubNativePrefix(handles, versions, count);
                return null;
            }
            handles[count] = key.cellHandle;
            versions[count] = key.cellVersion;
            count++;
        }
        return count;
    }
    values() {
        return this.capture().values();
    }
    clear() {
        for (let key = this.#head; key;) {
            const next = key.next;
            this.#unlink(key);
            key.legacy = undefined;
            key.cellVersion = undefined;
            key.cellIdentity = undefined;
            key.cellHandle = undefined;
            key = next;
        }
        this.#keysByOwner.clear();
        this.#keysByIdentity = new WeakMap();
    }
    /** Remove captured entries that have not advanced past their captured version. */
    clearThrough(captured) {
        for (const change of captured) {
            let key = change.cellIdentity
                ? this.#keysByIdentity.get(change.cellIdentity)
                : undefined;
            if (!key?.alive || key.owner !== change.owner || key.site !== change.site) {
                key = this.#keyForOwnerSite(change.owner, change.site, false);
                if (key && change.cellIdentity) {
                    this.#keysByIdentity.set(change.cellIdentity, key);
                }
            }
            if (!key?.queued)
                continue;
            const version = key.cellVersion ?? key.legacy?.version;
            if (version !== undefined && version <= change.version) {
                this.#removePending(key);
            }
        }
    }
    /** Acknowledge only the exact native handles and versions in a captured cut. */
    clearNativeThrough(handles, versions, count) {
        if (!Number.isSafeInteger(count) || count < 0 || count > handles.length ||
            count > versions.length)
            throw new RangeError("Invalid native state change count");
        for (let index = 0; index < count; index++) {
            const handle = handles[index];
            if (!handle || !Number.isSafeInteger(versions[index]))
                continue;
            let key = this.#keysByIdentity.get(handle.cellIdentity);
            if (!key?.alive || key.owner !== handle.owner || key.site !== handle.site) {
                key = this.#keyForOwnerSite(handle.owner, handle.site, false);
            }
            if (!key?.alive || !key.queued || key.owner !== handle.owner ||
                key.site !== handle.site || key.cellIdentity !== handle.cellIdentity ||
                key.cellHandle?.cellIdentity !== handle.cellIdentity)
                continue;
            if (key.cellVersion !== undefined && key.cellVersion <= versions[index])
                this.#removePending(key);
        }
    }
    /** Remove an owner's pending entries and cached identities. */
    dropOwner(owner) {
        const keysBySite = this.#keysByOwner.get(owner);
        if (!keysBySite)
            return;
        for (const key of keysBySite.values()) {
            key.alive = false;
            this.#removePending(key);
            key.legacy = undefined;
            key.cellVersion = undefined;
            key.cellIdentity = undefined;
            key.cellHandle = undefined;
        }
        this.#keysByOwner.delete(owner);
    }
    #enqueue(key) {
        if (key.queued)
            return;
        key.queued = true;
        key.prev = this.#tail;
        key.next = undefined;
        if (this.#tail)
            this.#tail.next = key;
        else
            this.#head = key;
        this.#tail = key;
        this.#size++;
    }
    #unlink(key) {
        if (!key.queued)
            return;
        if (key.prev)
            key.prev.next = key.next;
        else
            this.#head = key.next;
        if (key.next)
            key.next.prev = key.prev;
        else
            this.#tail = key.prev;
        key.prev = undefined;
        key.next = undefined;
        key.queued = false;
        this.#size--;
    }
    #removePending(key) {
        this.#unlink(key);
        key.legacy = undefined;
        key.cellVersion = undefined;
        key.cellHandle = undefined;
    }
    #scrubNativePrefix(handles, versions, count) {
        for (let index = 0; index < count; index++) {
            handles[index] = undefined;
            versions[index] = 0;
        }
    }
    #keyForOwnerSite(owner, site, create) {
        let keysBySite = this.#keysByOwner.get(owner);
        if (!keysBySite) {
            if (!create)
                return undefined;
            keysBySite = new Map();
            this.#keysByOwner.set(owner, keysBySite);
        }
        let key = keysBySite.get(site);
        if (!key && create) {
            key = { alive: true, owner, site, queued: false };
            keysBySite.set(site, key);
        }
        return key;
    }
}
//# sourceMappingURL=pending_state_changes.js.map