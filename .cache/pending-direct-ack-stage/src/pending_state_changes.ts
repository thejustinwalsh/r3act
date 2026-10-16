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
  #identity = Object.freeze({});
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
    key.cellHandle = undefined;
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
    key.cellHandle = handle;
    key.legacy = undefined;
    if (!key.cutKey) {
      key.cutKey = new PendingCellCutKeyToken(
        pendingCellCutAuthority,
        this.#identity,
        key,
      );
    }
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

  /**
   * Capture a snapshot-free native cut into caller-owned, pre-sized reusable
   * buffers. Capacity must cover the current queue; legacy entries or
   * insufficient capacity return null and scrub the partially written prefix.
   */
  captureNative(
    handles: (StateCellHandle | undefined)[],
    versions: number[],
  ): number | null {
    return this.#captureNativeInto(handles, versions);
  }

  /** Capture references to the existing queue nodes with the native cut. */
  captureNativeWithKeys(
    handles: (StateCellHandle | undefined)[],
    versions: number[],
    keys: (PendingCellCutKey | undefined)[],
  ): number | null {
    return this.#captureNativeInto(handles, versions, keys);
  }

  #captureNativeInto(
    handles: (StateCellHandle | undefined)[],
    versions: number[],
    keys?: (PendingCellCutKey | undefined)[],
  ): number | null {
    let count = 0;
    for (let key = this.#head; key; key = key.next) {
      if (
        key.legacy || !key.cellHandle || key.cellVersion === undefined ||
        keys && !key.cutKey
      ) {
        this.#scrubNativePrefix(handles, versions, keys, count);
        return null;
      }
      if (
        count >= handles.length || count >= versions.length ||
        keys && count >= keys.length
      ) {
        this.#scrubNativePrefix(handles, versions, keys, count);
        return null;
      }
      handles[count] = key.cellHandle;
      versions[count] = key.cellVersion;
      if (keys) keys[count] = key.cutKey;
      count++;
    }
    return count;
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
      key.cellHandle = undefined;
      key = next;
    }
    for (const keysBySite of this.#keysByOwner.values()) {
      for (const key of keysBySite.values()) {
        PendingCellCutKeyToken.revoke(key.cutKey, this.#identity);
        key.cutKey = undefined;
      }
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

  /** Acknowledge only the exact native handles and versions in a captured cut. */
  clearNativeThrough(
    handles: readonly (StateCellHandle | undefined)[],
    versions: readonly number[],
    count: number,
  ): void {
    if (
      !Number.isSafeInteger(count) || count < 0 || count > handles.length ||
      count > versions.length
    ) throw new RangeError("Invalid native state change count");
    for (let index = 0; index < count; index++) {
      const handle = handles[index];
      if (!handle || !Number.isSafeInteger(versions[index])) continue;
      let key = this.#keysByIdentity.get(handle.cellIdentity);
      if (
        !key?.alive || key.owner !== handle.owner || key.site !== handle.site
      ) {
        key = this.#keyForOwnerSite(handle.owner, handle.site, false);
      }
      if (
        !key?.alive || !key.queued || key.owner !== handle.owner ||
        key.site !== handle.site || key.cellIdentity !== handle.cellIdentity ||
        key.cellHandle?.cellIdentity !== handle.cellIdentity
      ) continue;
      if (
        key.cellVersion !== undefined && key.cellVersion <= versions[index]
      ) this.#removePending(key);
    }
  }

  /** Acknowledge native entries through the exact queue nodes captured earlier. */
  clearNativeThroughKeys(
    keys: readonly (PendingCellCutKey | undefined)[],
    handles: readonly (StateCellHandle | undefined)[],
    versions: readonly number[],
    count: number,
  ): void {
    if (
      !Number.isSafeInteger(count) || count < 0 || count > keys.length ||
      count > handles.length || count > versions.length
    ) throw new RangeError("Invalid native state change count");
    for (let index = 0; index < count; index++) {
      let handle: StateCellHandle | undefined;
      let owner: OwnerId;
      let site: StateSiteId;
      let identity: object;
      const version = versions[index];
      try {
        handle = handles[index];
        if (!handle || !Number.isSafeInteger(version)) continue;
        owner = handle.owner;
        site = handle.site;
        identity = handle.cellIdentity;
      } catch {
        continue;
      }
      const key = PendingCellCutKeyToken.resolve(keys[index], this.#identity);
      if (
        !key?.alive || !key.queued || key.owner !== owner || key.site !== site ||
        key.cellIdentity !== identity ||
        key.cellHandle?.cellIdentity !== identity
      ) continue;
      if (key.cellVersion !== undefined && key.cellVersion <= version) {
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
      PendingCellCutKeyToken.revoke(key.cutKey, this.#identity);
      key.cutKey = undefined;
      key.legacy = undefined;
      key.cellVersion = undefined;
      key.cellIdentity = undefined;
      key.cellHandle = undefined;
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
    key.cellHandle = undefined;
  }

  #scrubNativePrefix(
    handles: (StateCellHandle | undefined)[],
    versions: number[],
    keys: (PendingCellCutKey | undefined)[] | undefined,
    count: number,
  ): void {
    for (let index = 0; index < count; index++) {
      handles[index] = undefined;
      versions[index] = 0;
      if (keys) keys[index] = undefined;
    }
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
  cellHandle?: StateCellHandle;
  cellVersion?: number;
  legacy?: StateChange;
  cutKey?: PendingCellCutKey;
};

declare const pendingCellCutKeyBrand: unique symbol;
export interface PendingCellCutKey {
  readonly [pendingCellCutKeyBrand]: never;
}

const pendingCellCutAuthority = {};

/** Opaque queue-scoped reference; private fields never expose PendingKey. */
class PendingCellCutKeyToken implements PendingCellCutKey {
  declare readonly [pendingCellCutKeyBrand]: never;

  #queueIdentity: object | null;
  #key: PendingKey | null;

  constructor(authority: object, queueIdentity: object, key: PendingKey) {
    if (authority !== pendingCellCutAuthority) {
      throw new TypeError("Pending cell cut keys are not constructible");
    }
    this.#queueIdentity = queueIdentity;
    this.#key = key;
    Object.setPrototypeOf(this, null);
    Object.freeze(this);
  }

  static resolve(value: unknown, queueIdentity: object): PendingKey | null {
    if (
      (typeof value !== "object" && typeof value !== "function") ||
      value === null || !(#key in value)
    ) return null;
    const token = value as PendingCellCutKeyToken;
    return token.#queueIdentity === queueIdentity ? token.#key : null;
  }

  static revoke(value: PendingCellCutKey | undefined, queueIdentity: object): void {
    if (
      (typeof value !== "object" && typeof value !== "function") ||
      value === null || !(#key in value)
    ) return;
    const token = value as PendingCellCutKeyToken;
    if (token.#queueIdentity !== queueIdentity) return;
    token.#queueIdentity = null;
    token.#key = null;
  }
}
