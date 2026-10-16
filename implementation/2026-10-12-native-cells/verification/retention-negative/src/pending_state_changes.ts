import type {
  OwnerId,
  StateCellHandle,
  StateChange,
  StateSiteId,
} from "./owner_state_world.ts";

/**
 * Ordered, owner/site-coalesced dirty state journal.
 *
 * Keys live in the owner/site cache and are linked only while pending. That
 * keeps the per-frame hot path to field updates and pointer changes, while
 * allowing an acknowledged key to re-enter at the end of the queue.
 */
export class PendingStateChanges {
  #keysByOwner = new Map<OwnerId, Map<StateSiteId, PendingKey>>();
  #keysByIdentity = new WeakMap<object, PendingKey>();
  #head: PendingKey | undefined;
  #tail: PendingKey | undefined;
  #size = 0;

  get size(): number {
    return this.#size;
  }

  /** Keep the public journal's historical latest-arrival/reference semantics. */
  set(change: StateChange): void {
    let key = change.cellIdentity
      ? this.#keysByIdentity.get(change.cellIdentity)
      : undefined;
    if (!key?.alive || key.owner !== change.owner || key.site !== change.site) {
      key = this.#keyForOwnerSite(change.owner, change.site, true)!;
      if (change.cellIdentity) {
        this.#keysByIdentity.set(change.cellIdentity, key);
      }
    }
    if (change.cellIdentity) key.cellIdentity = change.cellIdentity;
    key.legacy = change;
    key.cellVersion = undefined;
    this.#enqueue(key);
  }

  /** Store native dirty-cell notifications without allocating StateChange records. */
  setCell(handle: StateCellHandle, version: number): void {
    let key = this.#keysByIdentity.get(handle.cellIdentity);
    if (!key?.alive || key.owner !== handle.owner || key.site !== handle.site) {
      key = this.#keyForOwnerSite(handle.owner, handle.site, true)!;
      this.#keysByIdentity.set(handle.cellIdentity, key);
    }
    if (key.cellIdentity !== handle.cellIdentity) key.cellVersion = undefined;
    key.cellIdentity = handle.cellIdentity;
    key.legacy = undefined;
    if (key.cellVersion === undefined || version > key.cellVersion) {
      key.cellVersion = version;
    }
    this.#enqueue(key);
  }

  /** Capture an independent array; native records are fresh snapshots. */
  capture(): StateChange[] {
    const captured: StateChange[] = [];
    for (let key = this.#head; key; key = key.next) {
      if (key.legacy) {
        captured.push(key.legacy);
      } else if (key.cellVersion !== undefined && key.cellIdentity) {
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

  values(): IterableIterator<StateChange> {
    return this.capture().values();
  }

  clear(): void {
    for (let key = this.#head; key;) {
      const next = key.next;
      this.#unlink(key);
      key.legacy = undefined;
      key.cellVersion = undefined;
      key.cellIdentity = undefined;
      key = next;
    }
    this.#keysByOwner.clear();
    this.#keysByIdentity = new WeakMap();
  }

  /** Remove captured entries that have not advanced past their captured version. */
  clearThrough(captured: readonly StateChange[]): void {
    for (const change of captured) {
      let key = change.cellIdentity
        ? this.#keysByIdentity.get(change.cellIdentity)
        : undefined;
      if (
        !key?.alive || key.owner !== change.owner || key.site !== change.site
      ) {
        key = this.#keyForOwnerSite(change.owner, change.site, false);
        if (key && change.cellIdentity) {
          this.#keysByIdentity.set(change.cellIdentity, key);
        }
      }
      if (!key?.queued) continue;
      const version = key.cellVersion ?? key.legacy?.version;
      if (version !== undefined && version <= change.version) {
        this.#removePending(key);
      }
    }
  }

  /** Remove an owner's pending entries and cached identities. */
  dropOwner(owner: OwnerId): void {
    const keysBySite = this.#keysByOwner.get(owner);
    if (!keysBySite) return;
    for (const key of keysBySite.values()) {
      key.alive = false;
      this.#removePending(key);
      key.legacy = undefined;
      key.cellVersion = undefined;
      key.cellIdentity = undefined;
    }
    this.#keysByOwner.delete(owner);
  }

  #enqueue(key: PendingKey): void {
    if (key.queued) return;
    key.queued = true;
    key.prev = this.#tail;
    key.next = undefined;
    if (this.#tail) this.#tail.next = key;
    else this.#head = key;
    this.#tail = key;
    this.#size++;
  }

  #unlink(key: PendingKey): void {
    if (!key.queued) return;
    if (key.prev) key.prev.next = key.next;
    else this.#head = key.next;
    if (key.next) key.next.prev = key.prev;
    else this.#tail = key.prev;
    key.prev = undefined;
    key.next = undefined;
    key.queued = false;
    this.#size--;
  }

  #removePending(key: PendingKey): void {
    this.#unlink(key);
    key.legacy = undefined;
    key.cellVersion = undefined;
  }

  #keyForOwnerSite(
    owner: OwnerId,
    site: StateSiteId,
    create: boolean,
  ): PendingKey | undefined {
    let keysBySite = this.#keysByOwner.get(owner);
    if (!keysBySite) {
      if (!create) return undefined;
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

type PendingKey = {
  alive: boolean;
  readonly owner: OwnerId;
  readonly site: StateSiteId;
  queued: boolean;
  prev?: PendingKey;
  next?: PendingKey;
  cellIdentity?: object;
  cellVersion?: number;
  legacy?: StateChange;
};
