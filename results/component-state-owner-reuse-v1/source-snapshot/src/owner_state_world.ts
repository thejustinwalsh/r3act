/** A component instance in the owner graph. IDs are allocated once and never reused. */
export type OwnerId = number;
export type OwnerKey = string | number | null;
export type StateSiteId = string;
export type StateAction<T> = T | ((previous: T) => T);

type StateCell<T> = {
  value: T;
  version: number;
  dispatch: (action: StateAction<T>) => boolean;
};

type OwnerRecord = {
  id: OwnerId;
  parent: OwnerId | null;
  componentSiteId: string;
  key: OwnerKey;
  children: Set<OwnerId>;
};

export type StateChange = {
  owner: OwnerId;
  site: StateSiteId;
  version: number;
};

/**
 * Experimental owner-addressed hook storage.
 *
 * State is indexed by (owner entity, compiler site ID), never by call position.
 * `resolveOwner` interns a component instance by its parent, lexical component
 * site, and optional keyed-item identity. The compiler is expected to emit
 * stable site IDs; the string is explicit here so the runtime can be evaluated
 * before JSX lowering produces them.
 */
export class OwnerStateWorld {
  #nextOwner = 1;
  #owners = new Map<OwnerId, OwnerRecord>();
  #childrenBySlot = new Map<
    OwnerId | null,
    Map<string, Map<OwnerKey, OwnerId>>
  >();
  #stateByOwner = new Map<OwnerId, Map<StateSiteId, StateCell<unknown>>>();
  #dirtyByOwner = new Map<OwnerId, Set<StateSiteId>>();
  #changeListeners = new Set<(change: StateChange) => void>();

  resolveOwner(
    parent: OwnerId | null,
    componentSiteId: string,
    key: OwnerKey = null,
  ): OwnerId {
    if (componentSiteId.length === 0) {
      throw new Error("Component site ID must not be empty");
    }
    if (parent !== null) this.#assertOwner(parent);

    let bySite = this.#childrenBySlot.get(parent);
    if (!bySite) this.#childrenBySlot.set(parent, bySite = new Map());
    let byKey = bySite.get(componentSiteId);
    if (!byKey) bySite.set(componentSiteId, byKey = new Map());
    const existing = byKey.get(key);
    if (existing !== undefined) return existing;

    const id = this.#nextOwner++;
    this.#owners.set(id, {
      id,
      parent,
      componentSiteId,
      key,
      children: new Set(),
    });
    if (parent !== null) this.#owners.get(parent)!.children.add(id);
    byKey.set(key, id);
    return id;
  }

  findOwner(
    parent: OwnerId | null,
    componentSiteId: string,
    key: OwnerKey = null,
  ): OwnerId | undefined {
    if (parent !== null) this.#assertOwner(parent);
    return this.#childrenBySlot.get(parent)?.get(componentSiteId)?.get(key);
  }

  /** React-like state API with an explicit, compiler-addressable site ID. */
  useState<T>(
    owner: OwnerId,
    site: StateSiteId,
    initial: T | (() => T),
  ): readonly [T, (action: StateAction<T>) => boolean] {
    this.#assertOwner(owner);
    if (site.length === 0) throw new Error("State site ID must not be empty");
    let sites = this.#stateByOwner.get(owner);
    if (!sites) this.#stateByOwner.set(owner, sites = new Map());
    let cell = sites.get(site) as StateCell<T> | undefined;
    if (!cell) {
      const value = typeof initial === "function"
        ? (initial as () => T)()
        : initial;
      cell = { value, version: 0, dispatch: () => false };
      cell.dispatch = (action) => {
        this.#assertOwner(owner);
        const previous = cell!.value;
        const next = typeof action === "function"
          ? (action as (previous: T) => T)(previous)
          : action;
        if (Object.is(previous, next)) return false;
        cell!.value = next;
        cell!.version++;
        let dirtySites = this.#dirtyByOwner.get(owner);
        if (!dirtySites) this.#dirtyByOwner.set(owner, dirtySites = new Set());
        dirtySites.add(site);
        const change = { owner, site, version: cell!.version };
        for (const listener of [...this.#changeListeners]) listener(change);
        return true;
      };
      sites.set(site, cell as StateCell<unknown>);
    }
    return [cell.value, cell.dispatch] as const;
  }

  version(owner: OwnerId, site: StateSiteId): number {
    this.#assertOwner(owner);
    return this.#stateByOwner.get(owner)?.get(site)?.version ?? 0;
  }

  /** Coalesce repeated writes to the same owner/site until a scheduler consumes them. */
  pendingChanges(): StateChange[] {
    const changes: StateChange[] = [];
    for (const [owner, sites] of this.#dirtyByOwner) {
      for (const site of sites) {
        changes.push({ owner, site, version: this.version(owner, site) });
      }
    }
    return changes;
  }

  drainChanges(): StateChange[] {
    const changes = this.pendingChanges();
    this.#dirtyByOwner.clear();
    return changes;
  }

  /** Return the changed owner and its component ancestors up to the root entity. */
  ownerLineage(owner: OwnerId): OwnerId[] {
    this.#assertOwner(owner);
    const lineage: OwnerId[] = [];
    let current: OwnerId | null = owner;
    while (current !== null) {
      lineage.push(current);
      current = this.#owners.get(current)!.parent;
    }
    return lineage;
  }

  isAlive(owner: OwnerId): boolean {
    return this.#owners.has(owner);
  }

  hasPendingChanges(): boolean {
    return this.#dirtyByOwner.size !== 0;
  }

  subscribeChanges(listener: (change: StateChange) => void): () => void {
    this.#changeListeners.add(listener);
    return () => this.#changeListeners.delete(listener);
  }

  /** Destroy an owner and all nested keyed/component owners, including state traits. */
  destroyOwner(owner: OwnerId): boolean {
    const record = this.#owners.get(owner);
    if (!record) return false;
    for (const child of [...record.children]) this.destroyOwner(child);

    const bySite = this.#childrenBySlot.get(record.parent);
    const byKey = bySite?.get(record.componentSiteId);
    byKey?.delete(record.key);
    if (byKey?.size === 0) bySite?.delete(record.componentSiteId);
    if (bySite?.size === 0) this.#childrenBySlot.delete(record.parent);
    if (record.parent !== null) {
      this.#owners.get(record.parent)?.children.delete(owner);
    }

    this.#owners.delete(owner);
    this.#stateByOwner.delete(owner);
    this.#dirtyByOwner.delete(owner);
    return true;
  }

  #assertOwner(owner: OwnerId) {
    if (!this.#owners.has(owner)) {
      throw new Error(`Owner ${owner} is not alive`);
    }
  }
}
