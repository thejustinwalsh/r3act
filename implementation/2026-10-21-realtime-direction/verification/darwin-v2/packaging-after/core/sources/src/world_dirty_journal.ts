import type { OwnerId, StateSiteId } from "./owner_state_world.ts";

type DirtySiteEntry = {
  readonly site: StateSiteId;
  readonly bucket: DirtyOwnerBucket;
  active: boolean;
  prepared?: PreparedDirtyMembership;
  previous?: DirtySiteEntry;
  next?: DirtySiteEntry;
};

type DirtyOwnerBucket = {
  readonly owner: OwnerId;
  /** Retained for reuse until removeOwner; values contain identifiers and links only. */
  readonly sites: Map<StateSiteId, DirtySiteEntry>;
  /** Set permanently when this bucket is removed; prepared tokens then go stale. */
  retired: boolean;
  active: boolean;
  firstSite?: DirtySiteEntry;
  lastSite?: DirtySiteEntry;
  previous?: DirtyOwnerBucket;
  next?: DirtyOwnerBucket;
};

/** Opaque payload-free owner/site node reference prepared by one journal. */
declare const preparedDirtyMembershipType: unique symbol;
export interface PreparedDirtyMembership {
  readonly [preparedDirtyMembershipType]: never;
}

const preparedMembershipAuthority = {};

/** Runtime-opaque token; private data retains one bucket/node, never the journal. */
class PreparedDirtyMembershipToken implements PreparedDirtyMembership {
  declare readonly [preparedDirtyMembershipType]: never;

  #journalIdentity: object | undefined;
  #entry: DirtySiteEntry | undefined;

  constructor(
    authority: object,
    journalIdentity: object,
    entry: DirtySiteEntry,
  ) {
    if (authority !== preparedMembershipAuthority) {
      throw new TypeError("Prepared dirty membership is not constructible");
    }
    this.#journalIdentity = journalIdentity;
    this.#entry = entry;
    Object.freeze(this);
  }

  static resolve(
    value: unknown,
    journalIdentity: object,
  ): DirtySiteEntry | null {
    if (
      (typeof value !== "object" && typeof value !== "function") ||
      value === null || !(#entry in value)
    ) return null;
    const token = value as PreparedDirtyMembershipToken;
    const entry = token.#entry;
    return token.#journalIdentity === journalIdentity && entry &&
        !entry.bucket.retired
      ? entry
      : null;
  }

  static retire(
    value: PreparedDirtyMembership | undefined,
    journalIdentity: object,
  ): void {
    if (
      (typeof value !== "object" && typeof value !== "function") ||
      value === null || !(#entry in value)
    ) return;
    const token = value as PreparedDirtyMembershipToken;
    if (token.#journalIdentity !== journalIdentity) return;
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
  #owners = new Map<OwnerId, DirtyOwnerBucket>();
  #firstOwner: DirtyOwnerBucket | undefined;
  #lastOwner: DirtyOwnerBucket | undefined;
  #activeOwnerCount = 0;

  /** Number of owners with at least one active dirty site. */
  get size(): number {
    return this.#activeOwnerCount;
  }

  /** Test active membership without traversing the pending journal. */
  has(owner: OwnerId, site: StateSiteId): boolean {
    return this.#owners.get(owner)?.sites.get(site)?.active === true;
  }

  /** Mark an owner/site dirty, coalescing repeated writes without reordering. */
  mark(owner: OwnerId, site: StateSiteId): void {
    const entry = this.#entryFor(owner, site);
    this.#markEntry(entry.bucket, entry);
  }

  /** Prepare one reusable node; subsequent marks/deletes avoid owner/site Maps. */
  prepareMembership(
    owner: OwnerId,
    site: StateSiteId,
  ): PreparedDirtyMembership {
    const entry = this.#entryFor(owner, site);
    if (!entry.prepared) {
      entry.prepared = new PreparedDirtyMembershipToken(
        preparedMembershipAuthority,
        this.#identity,
        entry,
      );
    }
    return entry.prepared;
  }

  /** Mark a previously prepared node in O(1); foreign or retired nodes decline. */
  markPrepared(token: PreparedDirtyMembership): boolean {
    const data = PreparedDirtyMembershipToken.resolve(token, this.#identity);
    if (!data) return false;
    this.#markEntry(data.bucket, data);
    return true;
  }

  /** Delete a previously prepared node in O(1); foreign or retired nodes decline. */
  deletePrepared(token: PreparedDirtyMembership): boolean {
    const data = PreparedDirtyMembershipToken.resolve(token, this.#identity);
    if (!data) return false;
    this.#deleteEntry(data.bucket, data);
    return true;
  }

  #entryFor(owner: OwnerId, site: StateSiteId): DirtySiteEntry {
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

  #markEntry(bucket: DirtyOwnerBucket, entry: DirtySiteEntry): void {
    if (entry.active) return;

    entry.active = true;
    entry.previous = bucket.lastSite;
    entry.next = undefined;
    if (bucket.lastSite) bucket.lastSite.next = entry;
    else bucket.firstSite = entry;
    bucket.lastSite = entry;

    if (!bucket.active) this.#activateOwner(bucket);
  }

  /** Remove one dirty site; a later mark re-enters at the tail. */
  delete(owner: OwnerId, site: StateSiteId): void {
    const bucket = this.#owners.get(owner);
    const entry = bucket?.sites.get(site);
    if (!bucket || !entry?.active) return;

    this.#deleteEntry(bucket, entry);
  }

  #deleteEntry(bucket: DirtyOwnerBucket, entry: DirtySiteEntry): void {
    if (!entry.active) return;

    this.#unlinkSite(bucket, entry);
    if (!bucket.firstSite) this.#deactivateOwner(bucket);
  }

  /** Remove all dirty and reusable journal metadata for a destroyed owner. */
  removeOwner(owner: OwnerId): void {
    const bucket = this.#owners.get(owner);
    if (!bucket) return;
    if (bucket.active) this.#deactivateOwner(bucket);
    bucket.retired = true;
    for (const entry of bucket.sites.values()) {
      entry.active = false;
      entry.previous = undefined;
      entry.next = undefined;
      PreparedDirtyMembershipToken.retire(
        entry.prepared,
        this.#identity,
      );
      entry.prepared = undefined;
    }
    bucket.firstSite = undefined;
    bucket.lastSite = undefined;
    bucket.sites.clear();
    this.#owners.delete(owner);
  }

  /** Clear active work while retaining buckets and site nodes for reuse. */
  clear(): void {
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
  *entries(): IterableIterator<readonly [OwnerId, StateSiteId]> {
    for (let bucket = this.#firstOwner; bucket; bucket = bucket.next) {
      for (let entry = bucket.firstSite; entry; entry = entry.next) {
        yield [bucket.owner, entry.site] as const;
      }
    }
  }

  #activateOwner(bucket: DirtyOwnerBucket): void {
    bucket.active = true;
    bucket.previous = this.#lastOwner;
    bucket.next = undefined;
    if (this.#lastOwner) this.#lastOwner.next = bucket;
    else this.#firstOwner = bucket;
    this.#lastOwner = bucket;
    this.#activeOwnerCount++;
  }

  #deactivateOwner(bucket: DirtyOwnerBucket): void {
    if (bucket.previous) bucket.previous.next = bucket.next;
    else this.#firstOwner = bucket.next;
    if (bucket.next) bucket.next.previous = bucket.previous;
    else this.#lastOwner = bucket.previous;
    bucket.previous = undefined;
    bucket.next = undefined;
    bucket.active = false;
    this.#activeOwnerCount--;
  }

  #unlinkSite(bucket: DirtyOwnerBucket, entry: DirtySiteEntry): void {
    if (entry.previous) entry.previous.next = entry.next;
    else bucket.firstSite = entry.next;
    if (entry.next) entry.next.previous = entry.previous;
    else bucket.lastSite = entry.previous;
    entry.previous = undefined;
    entry.next = undefined;
    entry.active = false;
  }
}
