import { ScalarSource } from "./jsx_binding_runtime.ts";

/** A component instance in the owner graph. IDs are allocated once and never reused. */
export type OwnerId = number;
export type OwnerKey = string | number | null;
export type StateSiteId = string;
export type StateAction<T> = T | ((previous: T) => T);

type StateCell<T> = {
  value: T;
  version: number;
  /** Allocated only on the first committed dispatch for this cell. */
  cellIdentity?: object;
  cellHandle?: StateCellHandle;
  source?: ScalarSource;
  dispatch: (action: StateAction<T>) => boolean;
};

type CandidateStateDispatch = {
  candidateCell: StateCell<unknown> | null;
  forward?: (action: StateAction<unknown>) => boolean;
  discarded: boolean;
  dispatch: (action: StateAction<unknown>) => boolean;
};

type CommittedCellIdentity = {
  owner: OwnerId;
  site: StateSiteId;
  cell: StateCell<unknown>;
  handle: StateCellHandle;
};

/** Stable, payload-free address for a committed state cell. */
export type StateCellHandle = Readonly<{
  owner: OwnerId;
  site: StateSiteId;
  cellIdentity: object;
}>;

type OwnerRecord = {
  id: OwnerId;
  parent: OwnerId | null;
  componentSiteId: string;
  key: OwnerKey;
  children: Set<OwnerId>;
  /** Changes for any direct child slot mutation; avoids per-key tombstones. */
  childrenVersion: number;
};

export type StateChange = {
  readonly owner: OwnerId;
  readonly site: StateSiteId;
  readonly version: number;
  /** Stable opaque identity for committed world notifications; legacy records may omit it. */
  readonly cellIdentity?: object;
};

const ownerPreparationCheckpointBrand: unique symbol = Symbol(
  "OwnerPreparationCheckpoint",
);
/** Opaque, preparation-scoped branch marker. It contains no world or journal. */
export type OwnerPreparationCheckpoint = {
  readonly [ownerPreparationCheckpointBrand]: true;
};

/** A candidate-local view of owner slots and hook cells.
 * Slot validation uses a parent's shape generation: any sibling slot edit
 * conservatively invalidates the candidate, while removed keys leave no
 * per-key tombstones behind.
 */
export type OwnerPreparation = {
  resolveOwner(
    parent: OwnerId | null,
    componentSiteId: string,
    key?: OwnerKey,
  ): OwnerId;
  /** Resolve from this candidate's slot overlay, then its pinned committed view. */
  findOwner(
    parent: OwnerId | null,
    componentSiteId: string,
    key?: OwnerKey,
  ): OwnerId | undefined;
  /** Create a fresh private incarnation that shadows the current slot until publish. */
  replaceOwner(
    parent: OwnerId | null,
    componentSiteId: string,
    key?: OwnerKey,
  ): OwnerId;
  useState<T>(
    owner: OwnerId,
    site: StateSiteId,
    initial: T | (() => T),
  ): readonly [T, (action: StateAction<T>) => boolean];
  /** Existing numeric sources are snapshot copies; their ID is stable but identity is not. */
  scalarSource(owner: OwnerId, site: StateSiteId): ScalarSource | null;
  /** True after a candidate-local setter changed a value during preparation. */
  hasStateWrites(): boolean;
  /** O(1) branch marker for work performed during this preparation. */
  checkpoint(): OwnerPreparationCheckpoint;
  /** Revert mutations after a marker while keeping the preparation open. */
  rollbackTo(checkpoint: OwnerPreparationCheckpoint): void;
  /** Consume a marker after its branch is no longer needed for rollback. */
  releaseCheckpoint(checkpoint: OwnerPreparationCheckpoint): void;
  /** Remove a private owner and its private descendants from this candidate. */
  discardPrivateOwner(owner: OwnerId): boolean;
  validate(): boolean;
  /** Publishes synchronously and never notifies change listeners. Throws if stale. */
  publish(): void;
  /** Discards private owners/cells; candidate setters subsequently return false. */
  discard(): void;
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
  static #nextSourceId = 1;
  #nextOwner = 1;
  #owners = new Map<OwnerId, OwnerRecord>();
  #childrenBySlot = new Map<
    OwnerId | null,
    Map<string, Map<OwnerKey, OwnerId>>
  >();
  #rootChildrenVersion = 0;
  #stateByOwner = new Map<OwnerId, Map<StateSiteId, StateCell<unknown>>>();
  /** Explicit deletion on owner destruction releases cells even if identities survive. */
  #committedCellsByIdentity = new WeakMap<object, CommittedCellIdentity>();
  #dirtyByOwner = new Map<OwnerId, Set<StateSiteId>>();
  #changeListeners = new Set<(change: StateChange) => void>();
  #dirtyCellListeners:
    readonly ((handle: StateCellHandle, version: number) => void)[] = [];
  #claimedRootIds = new Map<string, OwnerId>();
  #stagedOwners = new Set<OwnerId>();

  /** Begin an isolated owner/state view for one candidate preparation attempt. */
  beginPreparation(): OwnerPreparation {
    let state: "open" | "published" | "discarded" = "open";
    let hasStateWrites = false;
    const privateOwners = new Map<OwnerId, OwnerRecord>();
    const privateSlots = new Map<
      OwnerId | null,
      Map<string, Map<OwnerKey, OwnerId>>
    >();
    const expectedSlots = new Map<
      OwnerId | null,
      Map<
        string,
        Map<OwnerKey, {
          parent: OwnerId | null;
          site: string;
          key: OwnerKey;
          owner: OwnerId | undefined;
          parentVersion: number;
          retained: boolean;
        }>
      >
    >();
    const expectedCells = new Map<
      OwnerId,
      Map<StateSiteId, {
        cell: StateCell<unknown> | undefined;
        version: number;
      }>
    >();
    const candidateCells = new Map<
      OwnerId,
      Map<StateSiteId, StateCell<unknown>>
    >();
    const candidateInitialValues = new Map<
      OwnerId,
      Map<StateSiteId, unknown>
    >();
    const candidateDispatches = new Map<
      OwnerId,
      Map<StateSiteId, CandidateStateDispatch>
    >();
    const undoJournal: Array<() => void> = [];
    const preparationIdentity = {};
    type CheckpointNode = {
      previous: CheckpointNode | null;
      active: boolean;
      valid: boolean;
    };
    type CheckpointMetadata = {
      preparation: object;
      cursor: number;
      node: CheckpointNode;
    };
    let checkpointMetadata = new WeakMap<object, CheckpointMetadata>();
    let checkpointTop: CheckpointNode | null = null;
    let activeCheckpointCount = 0;
    const recordUndo = (undo: () => void) => undoJournal.push(undo);
    const setMap = <K, V>(map: Map<K, V>, key: K, value: V) => {
      if (activeCheckpointCount !== 0) {
        const existed = map.has(key);
        const previous = map.get(key);
        recordUndo(() => {
          if (existed) map.set(key, previous!);
          else map.delete(key);
        });
      }
      map.set(key, value);
    };
    const deleteMap = <K, V>(map: Map<K, V>, key: K) => {
      if (!map.has(key)) return;
      if (activeCheckpointCount !== 0) {
        const previous = map.get(key)!;
        recordUndo(() => map.set(key, previous));
      }
      map.delete(key);
    };
    const pruneCheckpointTop = () => {
      while (checkpointTop && !checkpointTop.active) {
        checkpointTop = checkpointTop.previous;
      }
    };
    const checkpointFor = (checkpoint: OwnerPreparationCheckpoint) => {
      const metadata = checkpointMetadata.get(checkpoint as object);
      if (
        !metadata || metadata.preparation !== preparationIdentity ||
        !metadata.node.valid || !metadata.node.active
      ) {
        throw new Error("Owner preparation checkpoint is invalid");
      }
      return metadata;
    };

    const assertOpen = () => {
      if (state !== "open") throw new Error(`Owner preparation is ${state}`);
    };
    const getPrivateSlot = (
      parent: OwnerId | null,
      site: string,
      key: OwnerKey,
    ) => privateSlots.get(parent)?.get(site)?.get(key);
    const putPrivateSlot = (
      parent: OwnerId | null,
      site: string,
      key: OwnerKey,
      owner: OwnerId,
    ) => {
      let bySite = privateSlots.get(parent);
      if (!bySite) {
        bySite = new Map();
        setMap(privateSlots, parent, bySite);
      }
      let byKey = bySite.get(site);
      if (!byKey) {
        byKey = new Map();
        setMap(bySite, site, byKey);
      }
      setMap(byKey, key, owner);
    };
    const captureSlot = (
      parent: OwnerId | null,
      site: string,
      key: OwnerKey,
    ) => {
      const existing = expectedSlots.get(parent)?.get(site)?.get(key);
      if (existing) return existing;
      const owner = this.#childrenBySlot.get(parent)?.get(site)?.get(key);
      const captured = {
        parent,
        site,
        key,
        owner,
        parentVersion: this.#parentChildrenVersion(parent),
        retained: false,
      };
      let bySite = expectedSlots.get(parent);
      if (!bySite) {
        bySite = new Map();
        setMap(expectedSlots, parent, bySite);
      }
      let byKey = bySite.get(site);
      if (!byKey) {
        byKey = new Map();
        setMap(bySite, site, byKey);
      }
      setMap(byKey, key, captured);
      return captured;
    };
    const retainSlot = (captured: {
      retained: boolean;
    }) => {
      if (captured.retained) return;
      if (activeCheckpointCount !== 0) {
        recordUndo(() => captured.retained = false);
      }
      captured.retained = true;
    };
    const ownerRecord = (owner: OwnerId) => {
      const record = privateOwners.get(owner) ?? this.#owners.get(owner);
      if (!record) {
        throw new Error(`Owner ${owner} is not alive in this preparation`);
      }
      if (!privateOwners.has(owner)) {
        const slot = captureSlot(
          record.parent,
          record.componentSiteId,
          record.key,
        );
        retainSlot(slot);
        if (slot.owner !== owner) {
          throw new Error(
            `Owner ${owner} no longer occupies its committed slot`,
          );
        }
      }
      return record;
    };
    const captureCell = (owner: OwnerId, site: StateSiteId) => {
      let sites = expectedCells.get(owner);
      if (!sites) {
        sites = new Map();
        setMap(expectedCells, owner, sites);
      }
      let captured = sites.get(site);
      if (!captured) {
        const cell = this.#stateByOwner.get(owner)?.get(site);
        captured = { cell, version: cell?.version ?? 0 };
        setMap(sites, site, captured);
      }
      return captured;
    };
    const installSlot = (record: OwnerRecord) => {
      let bySite = this.#childrenBySlot.get(record.parent);
      if (!bySite) this.#childrenBySlot.set(record.parent, bySite = new Map());
      let byKey = bySite.get(record.componentSiteId);
      if (!byKey) bySite.set(record.componentSiteId, byKey = new Map());
      byKey.set(record.key, record.id);
      if (record.parent !== null) {
        this.#owners.get(record.parent)!.children.add(record.id);
      }
      this.#bumpParentChildrenVersion(record.parent);
    };
    const makeCandidateCell = <T>(
      owner: OwnerId,
      site: StateSiteId,
      initial: T | (() => T),
    ) => {
      let sites = candidateCells.get(owner);
      if (!sites) {
        sites = new Map();
        setMap(candidateCells, owner, sites);
      }
      let cell = sites.get(site) as StateCell<T> | undefined;
      if (cell) return cell;
      const committed = privateOwners.has(owner)
        ? undefined
        : captureCell(owner, site).cell as StateCell<T> | undefined;
      const value = committed
        ? committed.value
        : typeof initial === "function"
        ? (initial as () => T)()
        : initial;
      cell = {
        value,
        version: committed?.version ?? 0,
        ...(committed?.source
          ? {
            source: new ScalarSource(
              committed.source.id,
              committed.source.value,
            ),
          }
          : typeof value === "number"
          ? { source: new ScalarSource(OwnerStateWorld.#nextSourceId++, value) }
          : {}),
        dispatch: () => false,
      };
      setMap(sites, site, cell as StateCell<unknown>);
      let initialBySite = candidateInitialValues.get(owner);
      if (!initialBySite) {
        initialBySite = new Map();
        setMap(candidateInitialValues, owner, initialBySite);
      }
      setMap(initialBySite, site, committed?.value);
      return cell;
    };

    const preparation: OwnerPreparation = {
      resolveOwner: (parent, componentSiteId, key = null) => {
        assertOpen();
        if (!componentSiteId) {
          throw new Error("Component site ID must not be empty");
        }
        if (parent !== null) ownerRecord(parent);
        const overlay = getPrivateSlot(parent, componentSiteId, key);
        if (overlay !== undefined) return overlay;
        if (privateOwners.has(parent as OwnerId)) {
          const id = this.#nextOwner++;
          const record: OwnerRecord = {
            id,
            parent,
            componentSiteId,
            key,
            children: new Set(),
            childrenVersion: 0,
          };
          setMap(privateOwners, id, record);
          putPrivateSlot(parent, componentSiteId, key, id);
          return id;
        }
        const expected = captureSlot(parent, componentSiteId, key);
        if (expected.owner !== undefined) retainSlot(expected);
        if (expected.owner !== undefined) return expected.owner;
        const id = this.#nextOwner++;
        setMap(privateOwners, id, {
          id,
          parent,
          componentSiteId,
          key,
          children: new Set(),
          childrenVersion: 0,
        });
        putPrivateSlot(parent, componentSiteId, key, id);
        return id;
      },
      findOwner: (parent, componentSiteId, key = null) => {
        assertOpen();
        if (!componentSiteId) {
          throw new Error("Component site ID must not be empty");
        }
        if (parent !== null) ownerRecord(parent);
        const privateOwner = getPrivateSlot(parent, componentSiteId, key);
        if (privateOwner !== undefined) return privateOwner;
        if (parent !== null && privateOwners.has(parent)) return undefined;
        const expected = captureSlot(parent, componentSiteId, key);
        retainSlot(expected);
        return expected.owner;
      },
      replaceOwner: (parent, componentSiteId, key = null) => {
        assertOpen();
        if (!componentSiteId) {
          throw new Error("Component site ID must not be empty");
        }
        if (parent !== null) ownerRecord(parent);
        if (parent === null || !privateOwners.has(parent)) {
          // Pin both the old occupant and the parent's shape generation. A
          // sibling edit or replacement before publish makes this candidate stale.
          captureSlot(parent, componentSiteId, key);
        }
        const id = this.#nextOwner++;
        const record: OwnerRecord = {
          id,
          parent,
          componentSiteId,
          key,
          children: new Set(),
          childrenVersion: 0,
        };
        setMap(privateOwners, id, record);
        putPrivateSlot(parent, componentSiteId, key, id);
        return id;
      },
      useState: <T>(
        owner: OwnerId,
        site: StateSiteId,
        initial: T | (() => T),
      ) => {
        assertOpen();
        ownerRecord(owner);
        if (!site) throw new Error("State site ID must not be empty");
        const cell = makeCandidateCell(owner, site, initial);
        let dispatches = candidateDispatches.get(owner);
        if (!dispatches) {
          dispatches = new Map();
          setMap(candidateDispatches, owner, dispatches);
        }
        let control = dispatches.get(site);
        if (!control) {
          control = {
            candidateCell: cell as StateCell<unknown>,
            discarded: false,
            dispatch: (action) => false,
          };
          control.dispatch = (action: StateAction<unknown>): boolean => {
            if (control!.discarded) return false;
            if (control!.forward) return control!.forward(action);
            const candidate = control!.candidateCell as StateCell<T> | null;
            if (!candidate) return false;
            const typedAction = action as StateAction<T>;
            const previous = candidate.value;
            const next = typeof typedAction === "function"
              ? (typedAction as (previous: T) => T)(previous)
              : typedAction;
            if (Object.is(previous, next)) return false;
            const previousVersion = candidate.version;
            const previousSource = candidate.source;
            const previousSourceValue = previousSource?.value;
            const previousHasStateWrites = hasStateWrites;
            if (activeCheckpointCount !== 0) {
              recordUndo(() => {
                candidate.value = previous;
                candidate.version = previousVersion;
                candidate.source = previousSource;
                if (previousSource && previousSourceValue !== undefined) {
                  previousSource.value = previousSourceValue;
                }
                hasStateWrites = previousHasStateWrites;
              });
            }
            candidate.value = next;
            candidate.version++;
            hasStateWrites = true;
            if (typeof next === "number") {
              candidate.source ??= new ScalarSource(
                OwnerStateWorld.#nextSourceId++,
                next,
              );
              candidate.source.value = next;
            }
            return true;
          };
          setMap(dispatches, site, control);
          if (activeCheckpointCount !== 0) {
            const newControl = control;
            recordUndo(() => {
              newControl.candidateCell = null;
              newControl.forward = undefined;
              newControl.discarded = true;
            });
          }
        }
        return [
          cell.value,
          control.dispatch as (action: StateAction<T>) => boolean,
        ] as const;
      },
      scalarSource: (owner, site) => {
        assertOpen();
        ownerRecord(owner);
        const candidate = candidateCells.get(owner)?.get(site);
        if (candidate) {
          return typeof candidate.value === "number"
            ? candidate.source ?? null
            : null;
        }
        if (privateOwners.has(owner)) return null;
        const committed = captureCell(owner, site).cell;
        if (typeof committed?.value !== "number") return null;
        const snapshot = makeCandidateCell(owner, site, committed.value);
        return snapshot.source ?? null;
      },
      hasStateWrites: () => hasStateWrites,
      checkpoint: () => {
        assertOpen();
        pruneCheckpointTop();
        const token = Object.freeze({}) as OwnerPreparationCheckpoint;
        const node: CheckpointNode = {
          previous: checkpointTop,
          active: true,
          valid: true,
        };
        checkpointTop = node;
        activeCheckpointCount++;
        checkpointMetadata.set(token, {
          preparation: preparationIdentity,
          cursor: undoJournal.length,
          node,
        });
        return token;
      },
      rollbackTo: (checkpoint) => {
        assertOpen();
        const metadata = checkpointFor(checkpoint);
        if (metadata.cursor > undoJournal.length) {
          throw new Error("Owner preparation checkpoint is invalid");
        }
        for (
          let index = undoJournal.length - 1;
          index >= metadata.cursor;
          index--
        ) {
          undoJournal[index]();
        }
        undoJournal.length = metadata.cursor;
        while (checkpointTop !== metadata.node) {
          if (!checkpointTop) {
            throw new Error("Owner preparation checkpoint is invalid");
          }
          const discarded = checkpointTop;
          checkpointTop = discarded.previous;
          discarded.valid = false;
          if (discarded.active) {
            discarded.active = false;
            activeCheckpointCount--;
          }
        }
      },
      releaseCheckpoint: (checkpoint) => {
        assertOpen();
        const metadata = checkpointFor(checkpoint);
        metadata.node.active = false;
        metadata.node.valid = false;
        activeCheckpointCount--;
        checkpointMetadata.delete(checkpoint as object);
        pruneCheckpointTop();
        if (activeCheckpointCount === 0) {
          checkpointTop = null;
          undoJournal.length = 0;
        }
      },
      discardPrivateOwner: (owner) => {
        assertOpen();
        if (!privateOwners.has(owner)) return false;
        const previousHasStateWrites = hasStateWrites;
        if (activeCheckpointCount !== 0) {
          recordUndo(() => hasStateWrites = previousHasStateWrites);
        }
        // Index private children and surviving slot owners once. Discarding a
        // deep/multi-row private tree then takes O(P) map work, where P is the
        // number of private owners in this preparation (plus removed cells).
        const privateChildren = new Map<OwnerId, OwnerId[]>();
        const fallbackSlots = new Map<
          OwnerId | null,
          Map<string, Map<OwnerKey, OwnerId>>
        >();
        for (const [candidate, record] of privateOwners) {
          if (record.parent !== null) {
            let children = privateChildren.get(record.parent);
            if (!children) privateChildren.set(record.parent, children = []);
            children.push(candidate);
          }
        }
        const subtree: OwnerId[] = [];
        const subtreeSet = new Set<OwnerId>();
        const collect = (current: OwnerId) => {
          subtreeSet.add(current);
          for (const child of privateChildren.get(current) ?? []) {
            collect(child);
          }
          subtree.push(current);
        };
        collect(owner);
        for (const [candidate, record] of privateOwners) {
          if (subtreeSet.has(candidate)) continue;
          let bySite = fallbackSlots.get(record.parent);
          if (!bySite) fallbackSlots.set(record.parent, bySite = new Map());
          let byKey = bySite.get(record.componentSiteId);
          if (!byKey) bySite.set(record.componentSiteId, byKey = new Map());
          // Insertion order makes the last surviving owner the newest overlay.
          byKey.set(record.key, candidate);
        }
        for (const current of subtree) {
          const record = privateOwners.get(current)!;
          for (
            const [site, control] of candidateDispatches.get(current) ?? []
          ) {
            const cell = control.candidateCell;
            const oldDiscarded = control.discarded;
            const oldForward = control.forward;
            if (activeCheckpointCount !== 0) {
              recordUndo(() => {
                control.candidateCell = cell;
                control.discarded = oldDiscarded;
                control.forward = oldForward;
              });
            }
            control.candidateCell = null;
            control.forward = undefined;
            control.discarded = true;
            void site;
          }
          for (const cell of candidateCells.get(current)?.values() ?? []) {
            const oldValue = cell.value;
            const oldSource = cell.source;
            const oldSourceValue = oldSource?.value;
            if (activeCheckpointCount !== 0) {
              recordUndo(() => {
                cell.value = oldValue;
                cell.source = oldSource;
                if (oldSource && oldSourceValue !== undefined) {
                  oldSource.value = oldSourceValue;
                }
              });
            }
            cell.value = undefined;
            if (oldSource) oldSource.value = 0;
            cell.source = undefined;
          }
          deleteMap(candidateDispatches, current);
          deleteMap(candidateCells, current);
          deleteMap(candidateInitialValues, current);
          deleteMap(expectedCells, current);
          deleteMap(privateOwners, current);

          const overlay = getPrivateSlot(
            record.parent,
            record.componentSiteId,
            record.key,
          );
          if (overlay === current) {
            const previousPrivate = fallbackSlots.get(record.parent)?.get(
              record.componentSiteId,
            )?.get(record.key);
            const bySite = privateSlots.get(record.parent)?.get(
              record.componentSiteId,
            );
            if (previousPrivate !== undefined) {
              setMap(bySite!, record.key, previousPrivate);
            } else if (bySite) {
              deleteMap(bySite, record.key);
              if (bySite.size === 0) {
                const parentSlots = privateSlots.get(record.parent)!;
                deleteMap(parentSlots, record.componentSiteId);
                if (parentSlots.size === 0) {
                  deleteMap(privateSlots, record.parent);
                }
              }
              // Drop a capture used only to create the now-cancelled overlay.
              const expectedByKey = expectedSlots.get(record.parent)?.get(
                record.componentSiteId,
              );
              const expected = expectedByKey?.get(record.key);
              // fallbackSlots was built from every private owner outside the
              // discarded subtree, so an absent fallback means there is no
              // surviving private owner that still depends on this capture.
              if (expectedByKey && expected && !expected.retained) {
                deleteMap(expectedByKey, record.key);
                if (expectedByKey.size === 0) {
                  const expectedBySite = expectedSlots.get(record.parent)!;
                  deleteMap(expectedBySite, record.componentSiteId);
                  if (expectedBySite.size === 0) {
                    deleteMap(expectedSlots, record.parent);
                  }
                }
              }
            }
          }
        }
        hasStateWrites = false;
        for (const [candidateOwner, sites] of candidateCells) {
          for (const [site, candidate] of sites) {
            const baseVersion = privateOwners.has(candidateOwner)
              ? 0
              : expectedCells.get(candidateOwner)?.get(site)?.version ?? 0;
            if (candidate.version !== baseVersion) hasStateWrites = true;
          }
        }
        return true;
      },
      validate: () => {
        if (state !== "open") return false;
        for (const [owner, record] of privateOwners) {
          if (
            record.parent !== null && !privateOwners.has(record.parent) &&
            this.#owners.get(record.parent) === undefined
          ) return false;
          const slot = expectedSlots.get(record.parent)?.get(
            record.componentSiteId,
          )?.get(record.key);
          if (!privateOwners.has(record.parent as OwnerId) && !slot) {
            return false;
          }
        }
        for (const bySite of expectedSlots.values()) {
          for (const byKey of bySite.values()) {
            for (const expected of byKey.values()) {
              if (
                this.#childrenBySlot.get(expected.parent)?.get(expected.site)
                  ?.get(expected.key) !== expected.owner
              ) return false;
              if (
                this.#parentChildrenVersion(expected.parent) !==
                  expected.parentVersion
              ) return false;
            }
          }
        }
        for (const [owner, sites] of expectedCells) {
          if (!this.#owners.has(owner)) return false;
          for (const [site, expected] of sites) {
            const current = this.#stateByOwner.get(owner)?.get(site);
            if (
              current !== expected.cell ||
              (current?.version ?? 0) !== expected.version
            ) return false;
          }
        }
        return true;
      },
      publish: () => {
        assertOpen();
        if (!preparation.validate()) {
          throw new Error("Owner preparation is stale");
        }
        // resolveOwner creates each parent before its private descendants.
        const records = [...privateOwners.values()];
        for (const record of records) {
          this.#owners.set(record.id, record);
          installSlot(record);
        }
        for (const [owner, sites] of candidateCells) {
          let committedSites = this.#stateByOwner.get(owner);
          if (!committedSites) {
            this.#stateByOwner.set(owner, committedSites = new Map());
          }
          for (const [site, candidate] of sites) {
            const previous = candidateInitialValues.get(owner)?.get(site);
            const existing = committedSites.get(site);
            if (existing) {
              if (candidate.version !== existing.version) {
                existing.value = candidate.value;
                existing.version = candidate.version;
                if (typeof candidate.value === "number") {
                  existing.source ??= new ScalarSource(
                    OwnerStateWorld.#nextSourceId++,
                    candidate.value,
                  );
                  existing.source.value = candidate.value;
                }
                let dirty = this.#dirtyByOwner.get(owner);
                if (!dirty) this.#dirtyByOwner.set(owner, dirty = new Set());
                dirty.add(site);
              }
              continue;
            }
            candidate.dispatch = (action) =>
              this.#dispatchState(owner, site, candidate, action);
            committedSites.set(site, candidate);
            if (candidate.version > 0) {
              let dirty = this.#dirtyByOwner.get(owner);
              if (!dirty) this.#dirtyByOwner.set(owner, dirty = new Set());
              dirty.add(site);
            }
          }
        }
        state = "published";
        for (const [owner, dispatches] of candidateDispatches) {
          for (const [site, control] of dispatches) {
            const live = this.#stateByOwner.get(owner)?.get(site);
            control.candidateCell = null;
            control.forward = live
              ? (action) => live.dispatch(action)
              : undefined;
          }
        }
        undoJournal.length = 0;
        checkpointMetadata = new WeakMap();
        checkpointTop = null;
        activeCheckpointCount = 0;
        privateOwners.clear();
        privateSlots.clear();
        expectedSlots.clear();
        expectedCells.clear();
        candidateCells.clear();
        candidateInitialValues.clear();
        candidateDispatches.clear();
      },
      discard: () => {
        if (state !== "open") return;
        state = "discarded";
        for (const dispatches of candidateDispatches.values()) {
          for (const control of dispatches.values()) {
            control.candidateCell = null;
            control.forward = undefined;
            control.discarded = true;
          }
        }
        for (const sites of candidateCells.values()) {
          for (const cell of sites.values()) {
            cell.value = undefined;
            if (cell.source) cell.source.value = 0;
            cell.source = undefined;
          }
        }
        undoJournal.length = 0;
        checkpointMetadata = new WeakMap();
        checkpointTop = null;
        activeCheckpointCount = 0;
        privateOwners.clear();
        privateSlots.clear();
        expectedSlots.clear();
        expectedCells.clear();
        candidateCells.clear();
        candidateInitialValues.clear();
        candidateDispatches.clear();
      },
    };
    return preparation;
  }

  claimRootId(rootId: string): OwnerId {
    if (!rootId) throw new Error("Component root ID must not be empty");
    if (this.#claimedRootIds.has(rootId)) {
      throw new Error(
        `Component root ID ${rootId} is already active in this world`,
      );
    }
    const owner = this.resolveOwner(null, `@component-root:${rootId}`);
    this.#claimedRootIds.set(rootId, owner);
    return owner;
  }

  releaseRootId(rootId: string, owner: OwnerId): void {
    if (this.#claimedRootIds.get(rootId) !== owner) return;
    this.#claimedRootIds.delete(rootId);
  }

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
      childrenVersion: 0,
    });
    if (parent !== null) this.#owners.get(parent)!.children.add(id);
    byKey.set(key, id);
    this.#bumpParentChildrenVersion(parent);
    return id;
  }

  /** Allocate a private incarnation without replacing a committed keyed slot. */
  createStagedOwner(
    parent: OwnerId,
    componentSiteId: string,
    key: OwnerKey,
  ): OwnerId {
    this.#assertOwner(parent);
    if (!componentSiteId) {
      throw new Error("Component site ID must not be empty");
    }
    const id = this.#nextOwner++;
    this.#owners.set(id, {
      id,
      parent,
      componentSiteId,
      key,
      children: new Set(),
      childrenVersion: 0,
    });
    this.#owners.get(parent)!.children.add(id);
    this.#stagedOwners.add(id);
    return id;
  }

  /** Publish a prepared incarnation only over its expected previous slot. */
  activateStagedOwner(owner: OwnerId, previousOwner?: OwnerId): void {
    this.#assertOwner(owner);
    if (!this.#stagedOwners.has(owner)) throw new Error("Owner is not staged");
    const record = this.#owners.get(owner)!;
    let bySite = this.#childrenBySlot.get(record.parent);
    let byKey = bySite?.get(record.componentSiteId);
    const current = byKey?.get(record.key);
    if (current !== previousOwner) {
      throw new Error("Staged owner slot changed before publication");
    }
    if (!bySite) this.#childrenBySlot.set(record.parent, bySite = new Map());
    if (!byKey) bySite.set(record.componentSiteId, byKey = new Map());
    byKey.set(record.key, owner);
    this.#stagedOwners.delete(owner);
    this.#bumpParentChildrenVersion(record.parent);
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
      if (typeof value === "number") {
        cell.source = new ScalarSource(OwnerStateWorld.#nextSourceId++, value);
      }
      cell.dispatch = (action) =>
        this.#dispatchState(owner, site, cell!, action);
      sites.set(site, cell as StateCell<unknown>);
    }
    return [cell.value, cell.dispatch] as const;
  }

  version(owner: OwnerId, site: StateSiteId): number {
    this.#assertOwner(owner);
    return this.#stateByOwner.get(owner)?.get(site)?.version ?? 0;
  }

  /** Stable scalar handle for a numeric state cell; nonnumeric sites have none. */
  scalarSource(owner: OwnerId, site: StateSiteId): ScalarSource | null {
    this.#assertOwner(owner);
    const cell = this.#stateByOwner.get(owner)?.get(site);
    return typeof cell?.value === "number" ? cell.source ?? null : null;
  }

  /** Resolve the canonical source for an identity-bearing committed change. */
  scalarSourceForChange(change: StateChange): ScalarSource | null {
    const entry = change.cellIdentity
      ? this.#committedCellsByIdentity.get(change.cellIdentity)
      : undefined;
    if (entry && entry.owner === change.owner && entry.site === change.site) {
      this.#assertOwner(change.owner);
      return typeof entry.cell.value === "number"
        ? entry.cell.source ?? null
        : null;
    }
    return this.scalarSource(change.owner, change.site);
  }

  /** Resolve the canonical numeric source for an exact committed cell handle. */
  scalarSourceForCell(handle: StateCellHandle): ScalarSource | null {
    const entry = this.#committedCellsByIdentity.get(handle.cellIdentity);
    if (
      !entry || entry.handle.cellIdentity !== handle.cellIdentity ||
      entry.owner !== handle.owner ||
      entry.site !== handle.site || !this.#owners.has(handle.owner) ||
      this.#stateByOwner.get(handle.owner)?.get(handle.site) !== entry.cell
    ) return null;
    return typeof entry.cell.value === "number"
      ? entry.cell.source ?? null
      : null;
  }

  /** Resolve the current version for an identity-bearing committed change. */
  versionForChange(change: StateChange): number {
    const entry = change.cellIdentity
      ? this.#committedCellsByIdentity.get(change.cellIdentity)
      : undefined;
    if (entry && entry.owner === change.owner && entry.site === change.site) {
      this.#assertOwner(change.owner);
      return entry.cell.version;
    }
    return this.version(change.owner, change.site);
  }

  /** Resolve the current version for an exact committed cell handle. */
  versionForCell(handle: StateCellHandle): number | null {
    const entry = this.#committedCellsByIdentity.get(handle.cellIdentity);
    if (
      !entry || entry.handle.cellIdentity !== handle.cellIdentity ||
      entry.owner !== handle.owner ||
      entry.site !== handle.site || !this.#owners.has(handle.owner) ||
      this.#stateByOwner.get(handle.owner)?.get(handle.site) !== entry.cell
    ) return null;
    return entry.cell.version;
  }

  /** Clear dirty cells only when each exact cell has not advanced past its cut. */
  clearCellChangesThrough(
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
      const entry = this.#committedCellsByIdentity.get(handle.cellIdentity);
      if (
        !entry || entry.handle.cellIdentity !== handle.cellIdentity ||
        entry.owner !== handle.owner ||
        entry.site !== handle.site || !this.#owners.has(handle.owner) ||
        this.#stateByOwner.get(handle.owner)?.get(handle.site) !== entry.cell
      ) continue;
      if (entry.cell.version > versions[index]) continue;
      const sites = this.#dirtyByOwner.get(handle.owner);
      if (!sites?.has(handle.site)) continue;
      sites.delete(handle.site);
      if (sites.size === 0) this.#dirtyByOwner.delete(handle.owner);
    }
  }

  /** Clear only changes at or below the captured versions. Reentrant writes survive. */
  clearChangesThrough(captured: readonly StateChange[]): void {
    for (const change of captured) {
      const sites = this.#dirtyByOwner.get(change.owner);
      if (!sites?.has(change.site)) continue;
      if (
        !this.#owners.has(change.owner) ||
        this.versionForChange(change) <= change.version
      ) {
        sites.delete(change.site);
        if (sites.size === 0) this.#dirtyByOwner.delete(change.owner);
      }
    }
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

  isWithin(owner: OwnerId, ancestor: OwnerId): boolean {
    if (!this.#owners.has(owner) || !this.#owners.has(ancestor)) return false;
    let current: OwnerId | null = owner;
    while (current !== null) {
      if (current === ancestor) return true;
      current = this.#owners.get(current)!.parent;
    }
    return false;
  }

  hasPendingChanges(): boolean {
    return this.#dirtyByOwner.size !== 0;
  }

  subscribeChanges(listener: (change: StateChange) => void): () => void {
    this.#changeListeners.add(listener);
    return () => this.#changeListeners.delete(listener);
  }

  /** Subscribe to committed state writes without allocating public change records. */
  subscribeDirtyCells(
    listener: (handle: StateCellHandle, version: number) => void,
  ): () => void {
    this.#dirtyCellListeners = [...this.#dirtyCellListeners, listener];
    let subscribed = true;
    return () => {
      if (!subscribed) return;
      subscribed = false;
      const index = this.#dirtyCellListeners.indexOf(listener);
      if (index < 0) return;
      this.#dirtyCellListeners = [
        ...this.#dirtyCellListeners.slice(0, index),
        ...this.#dirtyCellListeners.slice(index + 1),
      ];
    };
  }

  /** Destroy an owner and all nested keyed/component owners, including state traits. */
  destroyOwner(owner: OwnerId): boolean {
    const record = this.#owners.get(owner);
    if (!record) return false;
    for (const child of [...record.children]) this.destroyOwner(child);

    const bySite = this.#childrenBySlot.get(record.parent);
    const byKey = bySite?.get(record.componentSiteId);
    if (byKey?.get(record.key) === owner) {
      byKey.delete(record.key);
      this.#bumpParentChildrenVersion(record.parent);
    }
    if (byKey?.size === 0) bySite?.delete(record.componentSiteId);
    if (bySite?.size === 0) this.#childrenBySlot.delete(record.parent);
    if (record.parent !== null) {
      this.#owners.get(record.parent)?.children.delete(owner);
    }

    this.#stagedOwners.delete(owner);
    this.#owners.delete(owner);
    for (const cell of this.#stateByOwner.get(owner)?.values() ?? []) {
      if (cell.cellIdentity) {
        this.#committedCellsByIdentity.delete(cell.cellIdentity);
      }
      // Retained dead setters still close over the cell, so release its payload
      // and numeric source after removing the owner from the live world.
      cell.value = undefined;
      cell.source = undefined;
    }
    this.#stateByOwner.delete(owner);
    this.#dirtyByOwner.delete(owner);
    return true;
  }

  #assertOwner(owner: OwnerId) {
    if (!this.#owners.has(owner)) {
      throw new Error(`Owner ${owner} is not alive`);
    }
  }

  #parentChildrenVersion(parent: OwnerId | null): number {
    return parent === null
      ? this.#rootChildrenVersion
      : this.#owners.get(parent)?.childrenVersion ?? -1;
  }

  #bumpParentChildrenVersion(parent: OwnerId | null) {
    if (parent === null) {
      this.#rootChildrenVersion++;
      return;
    }
    const record = this.#owners.get(parent);
    if (record) record.childrenVersion++;
  }

  #dispatchState<T>(
    owner: OwnerId,
    site: StateSiteId,
    cell: StateCell<T>,
    action: StateAction<T>,
  ): boolean {
    this.#assertOwner(owner);
    const previous = cell.value;
    const next = typeof action === "function"
      ? (action as (previous: T) => T)(previous)
      : action;
    if (Object.is(previous, next)) return false;
    cell.value = next;
    cell.version++;
    if (typeof next === "number") {
      cell.source ??= new ScalarSource(OwnerStateWorld.#nextSourceId++, next);
      cell.source.value = next;
    }
    let dirtySites = this.#dirtyByOwner.get(owner);
    if (!dirtySites) this.#dirtyByOwner.set(owner, dirtySites = new Set());
    dirtySites.add(site);
    let cellIdentity = cell.cellIdentity;
    if (!cellIdentity) {
      cellIdentity = {};
      cell.cellIdentity = cellIdentity;
      const handle: StateCellHandle = Object.freeze({
        owner,
        site,
        cellIdentity,
      });
      cell.cellHandle = handle;
      this.#committedCellsByIdentity.set(cellIdentity, {
        owner,
        site,
        cell: cell as StateCell<unknown>,
        handle,
      });
    }
    const handle = cell.cellHandle;
    const version = cell.version;
    // Capture both listener cuts before callbacks run. Subscription changes
    // during a notification affect the next dispatch, including public ones.
    const dirtyCellListeners = this.#dirtyCellListeners;
    const changeListeners = this.#changeListeners.size > 0
      ? [...this.#changeListeners]
      : null;
    if (handle) {
      for (const listener of dirtyCellListeners) listener(handle, version);
    }
    if (changeListeners) {
      const change: StateChange = { owner, site, version, cellIdentity };
      for (const listener of changeListeners) listener(change);
    }
    return true;
  }
}
