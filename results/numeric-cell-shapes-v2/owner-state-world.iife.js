(() => {
  // src/jsx_binding_runtime.ts
  var keyedOwnerRegionTag = Symbol("keyed-owner-region");
  var keyedOwnerVersionTag = Symbol("keyed-owner-version");
  var Fragment = Symbol("jsx-runtime-fragment");
  var ScalarSource = class {
    id;
    value;
    constructor(id, value) {
      this.id = id;
      this.value = value;
    }
  };
  var NumericColumn = class {
    id;
    sourceSlot;
    values;
    source;
    constructor(id, sourceSlot, values) {
      this.id = id;
      this.sourceSlot = sourceSlot;
      this.values = values;
      this.source = new ScalarSource(id, 0);
    }
    /**
     * Ensure storage for at least `minCapacity` rows. Growth doubles the current
     * capacity (using one slot as the zero-capacity seed), or uses the requested
     * capacity when that is larger. Existing values are copied and the new tail
     * is zero-filled by Float64Array. The column and its source identities stay
     * stable; callers should reserve while activating rows, not during a flush.
     */
    reserve(minCapacity) {
      if (!Number.isSafeInteger(minCapacity) || minCapacity < 0) {
        throw new RangeError("Numeric column capacity must be a nonnegative safe integer");
      }
      const current = this.values;
      if (current.length >= minCapacity) return;
      const geometricCapacity = Math.max(1, current.length * 2);
      const next = new Float64Array(Math.max(minCapacity, geometricCapacity));
      next.set(current);
      this.values = next;
    }
  };
  var bindingTag = Symbol("jsx-runtime-binding");

  // src/compiled_state_layout.ts
  var normalizedLayouts = /* @__PURE__ */ new WeakMap();
  var layoutSignatures = /* @__PURE__ */ new WeakMap();
  var layoutSlotsBySite = /* @__PURE__ */ new WeakMap();
  function normalizeCompiledStateLayout(input) {
    if (typeof input !== "object" || input === null) {
      throw new TypeError("Compiled state layout must be an object");
    }
    const cached = normalizedLayouts.get(input);
    if (cached) return cached;
    if (input.schemaVersion !== 1 || !Array.isArray(input.slots)) {
      throw new TypeError("Unsupported compiled state layout");
    }
    const sites = /* @__PURE__ */ new Set();
    const slots = input.slots.map((entry, index) => {
      if (!entry || typeof entry.siteId !== "string" || entry.siteId.length === 0 || !Number.isSafeInteger(entry.slot) || entry.slot !== index || sites.has(entry.siteId)) {
        throw new TypeError("Invalid compiled state layout slot");
      }
      sites.add(entry.siteId);
      return Object.freeze({
        siteId: entry.siteId,
        slot: entry.slot
      });
    });
    const normalized = Object.freeze({
      schemaVersion: 1,
      slots: Object.freeze(slots)
    });
    normalizedLayouts.set(input, normalized);
    normalizedLayouts.set(normalized, normalized);
    layoutSignatures.set(normalized, slots.map(({ siteId, slot }) => `${slot}:${siteId}`).join("\0"));
    return normalized;
  }
  function compiledStateLayoutSignature(layout) {
    const normalized = normalizeCompiledStateLayout(layout);
    let signature = layoutSignatures.get(normalized);
    if (signature === void 0) {
      signature = normalized.slots.map(({ siteId, slot }) => `${slot}:${siteId}`).join("\0");
      layoutSignatures.set(normalized, signature);
    }
    return signature;
  }
  function compiledStateLayoutSlot(layout, siteId) {
    const normalized = normalizeCompiledStateLayout(layout);
    let bySite = layoutSlotsBySite.get(normalized);
    if (!bySite) {
      bySite = /* @__PURE__ */ new Map();
      for (const slot of normalized.slots) bySite.set(slot.siteId, slot.slot);
      layoutSlotsBySite.set(normalized, bySite);
    }
    return bySite.get(siteId);
  }

  // src/world_dirty_journal.ts
  var WorldDirtyJournal = class {
    #owners = /* @__PURE__ */ new Map();
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
      let bucket = this.#owners.get(owner);
      if (!bucket) {
        bucket = {
          owner,
          sites: /* @__PURE__ */ new Map(),
          active: false
        };
        this.#owners.set(owner, bucket);
      }
      let entry = bucket.sites.get(site);
      if (!entry) {
        entry = {
          site,
          active: false
        };
        bucket.sites.set(site, entry);
      }
      if (entry.active) return;
      entry.active = true;
      entry.previous = bucket.lastSite;
      entry.next = void 0;
      if (bucket.lastSite) bucket.lastSite.next = entry;
      else bucket.firstSite = entry;
      bucket.lastSite = entry;
      if (!bucket.active) this.#activateOwner(bucket);
    }
    /** Remove one dirty site; a later mark re-enters at the tail. */
    delete(owner, site) {
      const bucket = this.#owners.get(owner);
      const entry = bucket?.sites.get(site);
      if (!bucket || !entry?.active) return;
      this.#unlinkSite(bucket, entry);
      if (!bucket.firstSite) this.#deactivateOwner(bucket);
    }
    /** Remove all dirty and reusable journal metadata for a destroyed owner. */
    removeOwner(owner) {
      const bucket = this.#owners.get(owner);
      if (!bucket) return;
      if (bucket.active) this.#deactivateOwner(bucket);
      bucket.firstSite = void 0;
      bucket.lastSite = void 0;
      bucket.sites.clear();
      this.#owners.delete(owner);
    }
    /** Clear active work while retaining buckets and site nodes for reuse. */
    clear() {
      for (let bucket = this.#firstOwner; bucket; ) {
        const nextBucket = bucket.next;
        for (let entry = bucket.firstSite; entry; ) {
          const nextEntry = entry.next;
          entry.active = false;
          entry.previous = void 0;
          entry.next = void 0;
          entry = nextEntry;
        }
        bucket.active = false;
        bucket.firstSite = void 0;
        bucket.lastSite = void 0;
        bucket.previous = void 0;
        bucket.next = void 0;
        bucket = nextBucket;
      }
      this.#firstOwner = void 0;
      this.#lastOwner = void 0;
      this.#activeOwnerCount = 0;
    }
    /** Enumerate active pairs in owner insertion order, then site insertion order. */
    *entries() {
      for (let bucket = this.#firstOwner; bucket; bucket = bucket.next) {
        for (let entry = bucket.firstSite; entry; entry = entry.next) {
          yield [
            bucket.owner,
            entry.site
          ];
        }
      }
    }
    #activateOwner(bucket) {
      bucket.active = true;
      bucket.previous = this.#lastOwner;
      bucket.next = void 0;
      if (this.#lastOwner) this.#lastOwner.next = bucket;
      else this.#firstOwner = bucket;
      this.#lastOwner = bucket;
      this.#activeOwnerCount++;
    }
    #deactivateOwner(bucket) {
      if (bucket.previous) bucket.previous.next = bucket.next;
      else this.#firstOwner = bucket.next;
      if (bucket.next) bucket.next.previous = bucket.previous;
      else this.#lastOwner = bucket.previous;
      bucket.previous = void 0;
      bucket.next = void 0;
      bucket.active = false;
      this.#activeOwnerCount--;
    }
    #unlinkSite(bucket, entry) {
      if (entry.previous) entry.previous.next = entry.next;
      else bucket.firstSite = entry.next;
      if (entry.next) entry.next.previous = entry.previous;
      else bucket.lastSite = entry.previous;
      entry.previous = void 0;
      entry.next = void 0;
      entry.active = false;
    }
  };

  // src/owner_state_world.ts
  function getLaneBackedValue() {
    const lane = this.lane;
    if (!lane) throw new Error("Lane-backed state cell lost its lane address");
    return lane.column.values[lane.row];
  }
  function setLaneBackedValue(next) {
    const lane = this.lane;
    if (!lane) throw new Error("Lane-backed state cell lost its lane address");
    if (typeof next !== "number") {
      throw new TypeError("Promote a numeric state cell before boxing it");
    }
    lane.column.values[lane.row] = next;
  }
  var laneBackedValueDescriptor = {
    configurable: true,
    enumerable: true,
    get: getLaneBackedValue,
    set: setLaneBackedValue
  };
  function attachNumericLane(cell, lane) {
    const current = cell.value;
    if (typeof current !== "number") {
      throw new TypeError("Only numeric state cells can use numeric lanes");
    }
    lane.column.values[lane.row] = current;
    cell.lane = lane;
    Object.defineProperty(cell, "value", laneBackedValueDescriptor);
  }
  function detachNumericLane(cell) {
    const lane = cell.lane;
    if (!lane) return null;
    const value = lane.column.values[lane.row];
    Object.defineProperty(cell, "value", {
      configurable: true,
      enumerable: true,
      writable: true,
      value
    });
    cell.lane = void 0;
    return lane;
  }
  var ownerPreparationCheckpointBrand = Symbol("OwnerPreparationCheckpoint");
  var OwnerStateWorld = class _OwnerStateWorld {
    static #nextSourceId = 1;
    #nextOwner = 1;
    #owners = /* @__PURE__ */ new Map();
    #childrenBySlot = /* @__PURE__ */ new Map();
    #rootChildrenVersion = 0;
    #stateByOwner = /* @__PURE__ */ new Map();
    #numericLayouts = /* @__PURE__ */ new WeakMap();
    /** Explicit deletion on owner destruction releases cells even if identities survive. */
    #committedCellsByIdentity = /* @__PURE__ */ new WeakMap();
    #dirtyJournal = new WorldDirtyJournal();
    #changeListeners = /* @__PURE__ */ new Set();
    #dirtyCellListeners = [];
    #claimedRootIds = /* @__PURE__ */ new Map();
    #stagedOwners = /* @__PURE__ */ new Set();
    #layoutRecord(owner, layout) {
      if (!this.#owners.has(owner)) throw new Error(`Owner ${owner} is not alive`);
      const normalized = normalizeCompiledStateLayout(layout);
      const signature = compiledStateLayoutSignature(normalized);
      let storage = this.#numericLayouts.get(normalized);
      if (storage) {
        if (storage.signature !== signature) {
          throw new Error("Compiled state layout descriptor changed");
        }
        return storage;
      }
      const slotsBySite = /* @__PURE__ */ new Map();
      const columns = normalized.slots.map(({ siteId, slot }) => {
        slotsBySite.set(siteId, slot);
        return new NumericColumn(_OwnerStateWorld.#nextSourceId++, slot, new Float64Array(0));
      });
      storage = {
        layout: normalized,
        signature,
        slotsBySite,
        columns,
        generations: [],
        freeRows: [],
        nextRow: 0,
        rowsByOwner: /* @__PURE__ */ new Map()
      };
      this.#numericLayouts.set(normalized, storage);
      return storage;
    }
    #ensureCellLayout(owner, site, cell, layout) {
      if (!layout) return;
      const normalized = normalizeCompiledStateLayout(layout);
      if (cell.stateLayout && cell.laneSlotResolved) {
        if (compiledStateLayoutSignature(cell.stateLayout) !== compiledStateLayoutSignature(normalized)) {
          throw new Error("State cell received a different compiled layout");
        }
        return;
      }
      let canonical = normalized;
      if (cell.stateLayout) {
        if (compiledStateLayoutSignature(cell.stateLayout) !== compiledStateLayoutSignature(normalized)) {
          throw new Error("State cell received a different compiled layout");
        }
        canonical = cell.stateLayout;
      }
      this.#layoutRecord(owner, canonical);
      cell.stateLayout = canonical;
      cell.numericLaneSlot = compiledStateLayoutSlot(canonical, site);
      cell.laneSlotResolved = true;
      if (cell.numericLaneSlot !== void 0 && typeof cell.value !== "number") {
        cell.promoted = true;
      }
    }
    #laneIsCurrent(owner, site, cell, lane) {
      return this.#owners.has(owner) && this.#stateByOwner.get(owner)?.get(site) === cell && this.#laneAddressIsCurrent(owner, site, cell, lane);
    }
    #laneAddressIsCurrent(owner, site, cell, lane) {
      const storage = cell.stateLayout ? this.#numericLayouts.get(cell.stateLayout) : void 0;
      const row = storage?.rowsByOwner.get(owner);
      const slot = storage?.slotsBySite.get(site);
      return !!storage && !!row && slot !== void 0 && row.row === lane.row && row.generation === lane.generation && storage.columns[slot] === lane.column && lane.owner === owner && lane.site === site && cell.lane === lane && !cell.promoted && typeof cell.value === "number";
    }
    #ensureNumericLane(owner, site, cell) {
      const layout = cell.stateLayout;
      if (!layout || cell.promoted) return null;
      const storage = this.#layoutRecord(owner, layout);
      const slot = cell.numericLaneSlot;
      if (slot === void 0) return null;
      if (typeof cell.value !== "number") {
        cell.promoted = true;
        this.#releaseNumericLane(owner, site, cell);
        return null;
      }
      const existing = cell.lane;
      if (existing && this.#laneIsCurrent(owner, site, cell, existing)) {
        return existing;
      }
      if (existing) this.#releaseNumericLane(owner, site, cell);
      let row = storage.rowsByOwner.get(owner);
      if (!row) {
        const rowIndex = storage.freeRows.pop() ?? storage.nextRow++;
        const generation = storage.generations[rowIndex] ?? 1;
        storage.generations[rowIndex] = generation;
        for (const column2 of storage.columns) column2.reserve(rowIndex + 1);
        row = {
          row: rowIndex,
          generation,
          cells: 0
        };
        storage.rowsByOwner.set(owner, row);
      }
      const column = storage.columns[slot];
      column.reserve(row.row + 1);
      const lane = Object.freeze({
        column,
        row: row.row,
        generation: row.generation,
        owner,
        site
      });
      row.cells++;
      attachNumericLane(cell, lane);
      return lane;
    }
    #releaseNumericLane(owner, site, cell) {
      const lane = cell.lane;
      if (!lane) return;
      const detached = detachNumericLane(cell);
      if (!detached) return;
      const storage = cell.stateLayout ? this.#numericLayouts.get(cell.stateLayout) : void 0;
      const row = storage?.rowsByOwner.get(owner);
      const slot = storage?.slotsBySite.get(site);
      if (!storage || !row || slot === void 0 || row.row !== lane.row) return;
      lane.column.values[lane.row] = 0;
      row.cells--;
      if (row.cells !== 0) return;
      for (const column of storage.columns) column.values[row.row] = 0;
      const nextGeneration = row.generation + 1;
      storage.generations[row.row] = nextGeneration;
      storage.freeRows.push(row.row);
      storage.rowsByOwner.delete(owner);
    }
    #readStateValue(owner, site, cell) {
      void owner;
      void site;
      return cell.value;
    }
    /** Begin an isolated owner/state view for one candidate preparation attempt. */
    beginPreparation() {
      let state = "open";
      let hasStateWrites = false;
      const privateOwners = /* @__PURE__ */ new Map();
      const privateSlots = /* @__PURE__ */ new Map();
      const expectedSlots = /* @__PURE__ */ new Map();
      const expectedCells = /* @__PURE__ */ new Map();
      const candidateCells = /* @__PURE__ */ new Map();
      const candidateInitialValues = /* @__PURE__ */ new Map();
      const candidateDispatches = /* @__PURE__ */ new Map();
      const undoJournal = [];
      const preparationIdentity = {};
      let checkpointMetadata = /* @__PURE__ */ new WeakMap();
      let checkpointTop = null;
      let activeCheckpointCount = 0;
      const recordUndo = (undo) => undoJournal.push(undo);
      const setMap = (map, key, value) => {
        if (activeCheckpointCount !== 0) {
          const existed = map.has(key);
          const previous = map.get(key);
          recordUndo(() => {
            if (existed) map.set(key, previous);
            else map.delete(key);
          });
        }
        map.set(key, value);
      };
      const deleteMap = (map, key) => {
        if (!map.has(key)) return;
        if (activeCheckpointCount !== 0) {
          const previous = map.get(key);
          recordUndo(() => map.set(key, previous));
        }
        map.delete(key);
      };
      const pruneCheckpointTop = () => {
        while (checkpointTop && !checkpointTop.active) {
          checkpointTop = checkpointTop.previous;
        }
      };
      const checkpointFor = (checkpoint) => {
        const metadata = checkpointMetadata.get(checkpoint);
        if (!metadata || metadata.preparation !== preparationIdentity || !metadata.node.valid || !metadata.node.active) {
          throw new Error("Owner preparation checkpoint is invalid");
        }
        return metadata;
      };
      const assertOpen = () => {
        if (state !== "open") throw new Error(`Owner preparation is ${state}`);
      };
      const getPrivateSlot = (parent, site, key) => privateSlots.get(parent)?.get(site)?.get(key);
      const putPrivateSlot = (parent, site, key, owner) => {
        let bySite = privateSlots.get(parent);
        if (!bySite) {
          bySite = /* @__PURE__ */ new Map();
          setMap(privateSlots, parent, bySite);
        }
        let byKey = bySite.get(site);
        if (!byKey) {
          byKey = /* @__PURE__ */ new Map();
          setMap(bySite, site, byKey);
        }
        setMap(byKey, key, owner);
      };
      const captureSlot = (parent, site, key) => {
        const existing = expectedSlots.get(parent)?.get(site)?.get(key);
        if (existing) return existing;
        const owner = this.#childrenBySlot.get(parent)?.get(site)?.get(key);
        const captured = {
          parent,
          site,
          key,
          owner,
          parentVersion: this.#parentChildrenVersion(parent),
          retained: false
        };
        let bySite = expectedSlots.get(parent);
        if (!bySite) {
          bySite = /* @__PURE__ */ new Map();
          setMap(expectedSlots, parent, bySite);
        }
        let byKey = bySite.get(site);
        if (!byKey) {
          byKey = /* @__PURE__ */ new Map();
          setMap(bySite, site, byKey);
        }
        setMap(byKey, key, captured);
        return captured;
      };
      const retainSlot = (captured) => {
        if (captured.retained) return;
        if (activeCheckpointCount !== 0) {
          recordUndo(() => captured.retained = false);
        }
        captured.retained = true;
      };
      const ownerRecord = (owner) => {
        const record = privateOwners.get(owner) ?? this.#owners.get(owner);
        if (!record) {
          throw new Error(`Owner ${owner} is not alive in this preparation`);
        }
        if (!privateOwners.has(owner)) {
          const slot = captureSlot(record.parent, record.componentSiteId, record.key);
          retainSlot(slot);
          if (slot.owner !== owner) {
            throw new Error(`Owner ${owner} no longer occupies its committed slot`);
          }
        }
        return record;
      };
      const captureCell = (owner, site) => {
        let sites = expectedCells.get(owner);
        if (!sites) {
          sites = /* @__PURE__ */ new Map();
          setMap(expectedCells, owner, sites);
        }
        let captured = sites.get(site);
        if (!captured) {
          const cell = this.#stateByOwner.get(owner)?.get(site);
          captured = {
            cell,
            version: cell?.version ?? 0
          };
          setMap(sites, site, captured);
        }
        return captured;
      };
      const installSlot = (record) => {
        let bySite = this.#childrenBySlot.get(record.parent);
        if (!bySite) this.#childrenBySlot.set(record.parent, bySite = /* @__PURE__ */ new Map());
        let byKey = bySite.get(record.componentSiteId);
        if (!byKey) bySite.set(record.componentSiteId, byKey = /* @__PURE__ */ new Map());
        byKey.set(record.key, record.id);
        if (record.parent !== null) {
          this.#owners.get(record.parent).children.add(record.id);
        }
        this.#bumpParentChildrenVersion(record.parent);
      };
      const makeCandidateCell = (owner, site, initial, layout) => {
        let sites = candidateCells.get(owner);
        if (!sites) {
          sites = /* @__PURE__ */ new Map();
          setMap(candidateCells, owner, sites);
        }
        let cell = sites.get(site);
        if (cell) {
          if (layout) {
            const normalized = normalizeCompiledStateLayout(layout);
            if (cell.stateLayout && compiledStateLayoutSignature(cell.stateLayout) !== compiledStateLayoutSignature(normalized)) {
              throw new Error("State cell received a different compiled layout");
            }
            const oldLayout = cell.stateLayout;
            const oldPromoted = cell.promoted;
            const oldNumericLaneSlot = cell.numericLaneSlot;
            const oldLaneSlotResolved = cell.laneSlotResolved;
            if (activeCheckpointCount !== 0) {
              recordUndo(() => {
                cell.stateLayout = oldLayout;
                cell.promoted = oldPromoted;
                cell.numericLaneSlot = oldNumericLaneSlot;
                cell.laneSlotResolved = oldLaneSlotResolved;
              });
            }
            if (!cell.stateLayout) cell.stateLayout = normalized;
            const slot = compiledStateLayoutSlot(normalized, site);
            cell.numericLaneSlot = slot;
            cell.laneSlotResolved = true;
            if (slot !== void 0 && typeof cell.value !== "number") {
              cell.promoted = true;
            }
          }
          return cell;
        }
        const committed = privateOwners.has(owner) ? void 0 : captureCell(owner, site).cell;
        const normalizedLayout = layout ? normalizeCompiledStateLayout(layout) : committed?.stateLayout;
        if (layout && committed?.stateLayout && compiledStateLayoutSignature(committed.stateLayout) !== compiledStateLayoutSignature(normalizedLayout)) {
          throw new Error("State cell received a different compiled layout");
        }
        const value = committed ? committed.value : typeof initial === "function" ? initial() : initial;
        const stateLayout = committed?.stateLayout ?? normalizedLayout;
        const numericLaneSlot = stateLayout ? compiledStateLayoutSlot(stateLayout, site) : void 0;
        cell = {
          value,
          version: committed?.version ?? 0,
          ...stateLayout ? {
            stateLayout
          } : {},
          ...stateLayout ? {
            numericLaneSlot,
            laneSlotResolved: true
          } : {},
          ...committed?.promoted || numericLaneSlot !== void 0 && typeof value !== "number" ? {
            promoted: true
          } : {},
          ...committed?.source ? {
            source: new ScalarSource(committed.source.id, committed.source.value)
          } : typeof value === "number" ? {
            source: new ScalarSource(_OwnerStateWorld.#nextSourceId++, value)
          } : {},
          dispatch: () => false
        };
        setMap(sites, site, cell);
        let initialBySite = candidateInitialValues.get(owner);
        if (!initialBySite) {
          initialBySite = /* @__PURE__ */ new Map();
          setMap(candidateInitialValues, owner, initialBySite);
        }
        setMap(initialBySite, site, committed?.value);
        return cell;
      };
      const preparation = {
        resolveOwner: (parent, componentSiteId, key = null) => {
          assertOpen();
          if (!componentSiteId) {
            throw new Error("Component site ID must not be empty");
          }
          if (parent !== null) ownerRecord(parent);
          const overlay = getPrivateSlot(parent, componentSiteId, key);
          if (overlay !== void 0) return overlay;
          if (privateOwners.has(parent)) {
            const id2 = this.#nextOwner++;
            const record = {
              id: id2,
              parent,
              componentSiteId,
              key,
              children: /* @__PURE__ */ new Set(),
              childrenVersion: 0
            };
            setMap(privateOwners, id2, record);
            putPrivateSlot(parent, componentSiteId, key, id2);
            return id2;
          }
          const expected = captureSlot(parent, componentSiteId, key);
          if (expected.owner !== void 0) retainSlot(expected);
          if (expected.owner !== void 0) return expected.owner;
          const id = this.#nextOwner++;
          setMap(privateOwners, id, {
            id,
            parent,
            componentSiteId,
            key,
            children: /* @__PURE__ */ new Set(),
            childrenVersion: 0
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
          if (privateOwner !== void 0) return privateOwner;
          if (parent !== null && privateOwners.has(parent)) return void 0;
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
            captureSlot(parent, componentSiteId, key);
          }
          const id = this.#nextOwner++;
          const record = {
            id,
            parent,
            componentSiteId,
            key,
            children: /* @__PURE__ */ new Set(),
            childrenVersion: 0
          };
          setMap(privateOwners, id, record);
          putPrivateSlot(parent, componentSiteId, key, id);
          return id;
        },
        useState: (owner, site, initial, layout) => {
          assertOpen();
          ownerRecord(owner);
          if (!site) throw new Error("State site ID must not be empty");
          const cell = makeCandidateCell(owner, site, initial, layout);
          let dispatches = candidateDispatches.get(owner);
          if (!dispatches) {
            dispatches = /* @__PURE__ */ new Map();
            setMap(candidateDispatches, owner, dispatches);
          }
          let control = dispatches.get(site);
          if (!control) {
            control = {
              candidateCell: cell,
              discarded: false,
              dispatch: (action) => false
            };
            control.dispatch = (action) => {
              if (control.discarded) return false;
              if (control.forward) return control.forward(action);
              const candidate = control.candidateCell;
              if (!candidate) return false;
              const typedAction = action;
              const previous = candidate.value;
              const next = typeof typedAction === "function" ? typedAction(previous) : typedAction;
              if (Object.is(previous, next)) return false;
              const previousVersion = candidate.version;
              const previousSource = candidate.source;
              const previousSourceValue = previousSource?.value;
              const previousPromoted = candidate.promoted;
              const previousHasStateWrites = hasStateWrites;
              if (activeCheckpointCount !== 0) {
                recordUndo(() => {
                  candidate.value = previous;
                  candidate.version = previousVersion;
                  candidate.source = previousSource;
                  candidate.promoted = previousPromoted;
                  if (previousSource && previousSourceValue !== void 0) {
                    previousSource.value = previousSourceValue;
                  }
                  hasStateWrites = previousHasStateWrites;
                });
              }
              candidate.value = next;
              candidate.version++;
              if (candidate.numericLaneSlot !== void 0 && typeof next !== "number") candidate.promoted = true;
              hasStateWrites = true;
              if (typeof next === "number") {
                candidate.source ??= new ScalarSource(_OwnerStateWorld.#nextSourceId++, next);
                candidate.source.value = next;
              }
              return true;
            };
            setMap(dispatches, site, control);
            if (activeCheckpointCount !== 0) {
              const newControl = control;
              recordUndo(() => {
                newControl.candidateCell = null;
                newControl.forward = void 0;
                newControl.discarded = true;
              });
            }
          }
          return [
            cell.value,
            control.dispatch
          ];
        },
        scalarSource: (owner, site) => {
          assertOpen();
          ownerRecord(owner);
          const candidate = candidateCells.get(owner)?.get(site);
          if (candidate) {
            return typeof candidate.value === "number" ? candidate.source ?? null : null;
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
          const token = Object.freeze({});
          const node = {
            previous: checkpointTop,
            active: true,
            valid: true
          };
          checkpointTop = node;
          activeCheckpointCount++;
          checkpointMetadata.set(token, {
            preparation: preparationIdentity,
            cursor: undoJournal.length,
            node
          });
          return token;
        },
        rollbackTo: (checkpoint) => {
          assertOpen();
          const metadata = checkpointFor(checkpoint);
          if (metadata.cursor > undoJournal.length) {
            throw new Error("Owner preparation checkpoint is invalid");
          }
          for (let index = undoJournal.length - 1; index >= metadata.cursor; index--) {
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
          checkpointMetadata.delete(checkpoint);
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
          const privateChildren = /* @__PURE__ */ new Map();
          const fallbackSlots = /* @__PURE__ */ new Map();
          for (const [candidate, record] of privateOwners) {
            if (record.parent !== null) {
              let children = privateChildren.get(record.parent);
              if (!children) privateChildren.set(record.parent, children = []);
              children.push(candidate);
            }
          }
          const subtree = [];
          const subtreeSet = /* @__PURE__ */ new Set();
          const collect = (current) => {
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
            if (!bySite) fallbackSlots.set(record.parent, bySite = /* @__PURE__ */ new Map());
            let byKey = bySite.get(record.componentSiteId);
            if (!byKey) bySite.set(record.componentSiteId, byKey = /* @__PURE__ */ new Map());
            byKey.set(record.key, candidate);
          }
          for (const current of subtree) {
            const record = privateOwners.get(current);
            for (const [site, control] of candidateDispatches.get(current) ?? []) {
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
              control.forward = void 0;
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
                  if (oldSource && oldSourceValue !== void 0) {
                    oldSource.value = oldSourceValue;
                  }
                });
              }
              cell.value = void 0;
              if (oldSource) oldSource.value = 0;
              cell.source = void 0;
            }
            deleteMap(candidateDispatches, current);
            deleteMap(candidateCells, current);
            deleteMap(candidateInitialValues, current);
            deleteMap(expectedCells, current);
            deleteMap(privateOwners, current);
            const overlay = getPrivateSlot(record.parent, record.componentSiteId, record.key);
            if (overlay === current) {
              const previousPrivate = fallbackSlots.get(record.parent)?.get(record.componentSiteId)?.get(record.key);
              const bySite = privateSlots.get(record.parent)?.get(record.componentSiteId);
              if (previousPrivate !== void 0) {
                setMap(bySite, record.key, previousPrivate);
              } else if (bySite) {
                deleteMap(bySite, record.key);
                if (bySite.size === 0) {
                  const parentSlots = privateSlots.get(record.parent);
                  deleteMap(parentSlots, record.componentSiteId);
                  if (parentSlots.size === 0) {
                    deleteMap(privateSlots, record.parent);
                  }
                }
                const expectedByKey = expectedSlots.get(record.parent)?.get(record.componentSiteId);
                const expected = expectedByKey?.get(record.key);
                if (expectedByKey && expected && !expected.retained) {
                  deleteMap(expectedByKey, record.key);
                  if (expectedByKey.size === 0) {
                    const expectedBySite = expectedSlots.get(record.parent);
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
              const baseVersion = privateOwners.has(candidateOwner) ? 0 : expectedCells.get(candidateOwner)?.get(site)?.version ?? 0;
              if (candidate.version !== baseVersion) hasStateWrites = true;
            }
          }
          return true;
        },
        validate: () => {
          if (state !== "open") return false;
          for (const [owner, record] of privateOwners) {
            if (record.parent !== null && !privateOwners.has(record.parent) && this.#owners.get(record.parent) === void 0) return false;
            const slot = expectedSlots.get(record.parent)?.get(record.componentSiteId)?.get(record.key);
            if (!privateOwners.has(record.parent) && !slot) {
              return false;
            }
          }
          for (const bySite of expectedSlots.values()) {
            for (const byKey of bySite.values()) {
              for (const expected of byKey.values()) {
                if (this.#childrenBySlot.get(expected.parent)?.get(expected.site)?.get(expected.key) !== expected.owner) return false;
                if (this.#parentChildrenVersion(expected.parent) !== expected.parentVersion) return false;
              }
            }
          }
          for (const [owner, sites] of expectedCells) {
            if (!this.#owners.has(owner)) return false;
            for (const [site, expected] of sites) {
              const current = this.#stateByOwner.get(owner)?.get(site);
              if (current !== expected.cell || (current?.version ?? 0) !== expected.version) return false;
            }
          }
          return true;
        },
        publish: () => {
          assertOpen();
          if (!preparation.validate()) {
            throw new Error("Owner preparation is stale");
          }
          const records = [
            ...privateOwners.values()
          ];
          for (const record of records) {
            this.#owners.set(record.id, record);
            installSlot(record);
          }
          for (const [owner, sites] of candidateCells) {
            let committedSites = this.#stateByOwner.get(owner);
            if (!committedSites) {
              this.#stateByOwner.set(owner, committedSites = /* @__PURE__ */ new Map());
            }
            for (const [site, candidate] of sites) {
              const candidateLayout = candidate.stateLayout;
              const existing = committedSites.get(site);
              if (existing) {
                if (candidateLayout) {
                  this.#ensureCellLayout(owner, site, existing, candidateLayout);
                }
                if (candidate.promoted) {
                  this.#releaseNumericLane(owner, site, existing);
                  existing.promoted = true;
                }
                if (candidate.version !== existing.version) {
                  existing.value = candidate.value;
                  existing.version = candidate.version;
                  if (typeof candidate.value === "number") {
                    existing.source ??= new ScalarSource(_OwnerStateWorld.#nextSourceId++, candidate.value);
                    existing.source.value = candidate.value;
                  }
                  if (typeof candidate.value === "number" && existing.stateLayout && !existing.promoted) this.#ensureNumericLane(owner, site, existing);
                  this.#dirtyJournal.mark(owner, site);
                } else if (typeof existing.value === "number" && existing.stateLayout && !existing.promoted) {
                  this.#ensureNumericLane(owner, site, existing);
                }
                continue;
              }
              candidate.dispatch = (action) => this.#dispatchState(owner, site, candidate, action);
              committedSites.set(site, candidate);
              if (candidate.stateLayout && !candidate.promoted && typeof candidate.value === "number") this.#ensureNumericLane(owner, site, candidate);
              if (candidate.version > 0) {
                this.#dirtyJournal.mark(owner, site);
              }
            }
          }
          state = "published";
          for (const [owner, dispatches] of candidateDispatches) {
            for (const [site, control] of dispatches) {
              const live = this.#stateByOwner.get(owner)?.get(site);
              control.candidateCell = null;
              control.forward = live?.dispatch;
            }
          }
          undoJournal.length = 0;
          checkpointMetadata = /* @__PURE__ */ new WeakMap();
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
              control.forward = void 0;
              control.discarded = true;
            }
          }
          for (const sites of candidateCells.values()) {
            for (const cell of sites.values()) {
              cell.value = void 0;
              if (cell.source) cell.source.value = 0;
              cell.source = void 0;
            }
          }
          undoJournal.length = 0;
          checkpointMetadata = /* @__PURE__ */ new WeakMap();
          checkpointTop = null;
          activeCheckpointCount = 0;
          privateOwners.clear();
          privateSlots.clear();
          expectedSlots.clear();
          expectedCells.clear();
          candidateCells.clear();
          candidateInitialValues.clear();
          candidateDispatches.clear();
        }
      };
      return preparation;
    }
    claimRootId(rootId) {
      if (!rootId) throw new Error("Component root ID must not be empty");
      if (this.#claimedRootIds.has(rootId)) {
        throw new Error(`Component root ID ${rootId} is already active in this world`);
      }
      const owner = this.resolveOwner(null, `@component-root:${rootId}`);
      this.#claimedRootIds.set(rootId, owner);
      return owner;
    }
    releaseRootId(rootId, owner) {
      if (this.#claimedRootIds.get(rootId) !== owner) return;
      this.#claimedRootIds.delete(rootId);
    }
    resolveOwner(parent, componentSiteId, key = null) {
      if (componentSiteId.length === 0) {
        throw new Error("Component site ID must not be empty");
      }
      if (parent !== null) this.#assertOwner(parent);
      let bySite = this.#childrenBySlot.get(parent);
      if (!bySite) this.#childrenBySlot.set(parent, bySite = /* @__PURE__ */ new Map());
      let byKey = bySite.get(componentSiteId);
      if (!byKey) bySite.set(componentSiteId, byKey = /* @__PURE__ */ new Map());
      const existing = byKey.get(key);
      if (existing !== void 0) return existing;
      const id = this.#nextOwner++;
      this.#owners.set(id, {
        id,
        parent,
        componentSiteId,
        key,
        children: /* @__PURE__ */ new Set(),
        childrenVersion: 0
      });
      if (parent !== null) this.#owners.get(parent).children.add(id);
      byKey.set(key, id);
      this.#bumpParentChildrenVersion(parent);
      return id;
    }
    /** Allocate a private incarnation without replacing a committed keyed slot. */
    createStagedOwner(parent, componentSiteId, key) {
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
        children: /* @__PURE__ */ new Set(),
        childrenVersion: 0
      });
      this.#owners.get(parent).children.add(id);
      this.#stagedOwners.add(id);
      return id;
    }
    /** Publish a prepared incarnation only over its expected previous slot. */
    activateStagedOwner(owner, previousOwner) {
      this.#assertOwner(owner);
      if (!this.#stagedOwners.has(owner)) throw new Error("Owner is not staged");
      const record = this.#owners.get(owner);
      let bySite = this.#childrenBySlot.get(record.parent);
      let byKey = bySite?.get(record.componentSiteId);
      const current = byKey?.get(record.key);
      if (current !== previousOwner) {
        throw new Error("Staged owner slot changed before publication");
      }
      if (!bySite) this.#childrenBySlot.set(record.parent, bySite = /* @__PURE__ */ new Map());
      if (!byKey) bySite.set(record.componentSiteId, byKey = /* @__PURE__ */ new Map());
      byKey.set(record.key, owner);
      this.#stagedOwners.delete(owner);
      this.#bumpParentChildrenVersion(record.parent);
    }
    findOwner(parent, componentSiteId, key = null) {
      if (parent !== null) this.#assertOwner(parent);
      return this.#childrenBySlot.get(parent)?.get(componentSiteId)?.get(key);
    }
    /** React-like state API with an explicit, compiler-addressable site ID. */
    useState(owner, site, initial, layout) {
      this.#assertOwner(owner);
      if (site.length === 0) throw new Error("State site ID must not be empty");
      let sites = this.#stateByOwner.get(owner);
      if (!sites) this.#stateByOwner.set(owner, sites = /* @__PURE__ */ new Map());
      let cell = sites.get(site);
      if (!cell) {
        const value = typeof initial === "function" ? initial() : initial;
        cell = {
          value,
          version: 0,
          ...layout ? {
            stateLayout: normalizeCompiledStateLayout(layout)
          } : {},
          dispatch: () => false
        };
        if (typeof value === "number") {
          cell.source = new ScalarSource(_OwnerStateWorld.#nextSourceId++, value);
        }
        cell.dispatch = (action) => this.#dispatchState(owner, site, cell, action);
        sites.set(site, cell);
      }
      if (layout) this.#ensureCellLayout(owner, site, cell, layout);
      if (cell.stateLayout && !cell.promoted && typeof cell.value === "number") {
        this.#ensureNumericLane(owner, site, cell);
      }
      return [
        this.#readStateValue(owner, site, cell),
        cell.dispatch
      ];
    }
    /** Return the stable committed lane address, if this cell is lane-backed. */
    numericLane(owner, site) {
      if (!this.#owners.has(owner)) return null;
      const cell = this.#stateByOwner.get(owner)?.get(site);
      const lane = cell?.lane;
      return cell && lane && this.#laneIsCurrent(owner, site, cell, lane) ? lane : null;
    }
    /** Resolve a captured handle/version to its exact live numeric lane address. */
    numericLaneForCell(handle, version) {
      if (!Number.isSafeInteger(version)) return null;
      const entry = this.#committedCellsByIdentity.get(handle.cellIdentity);
      if (!entry || entry.handle.cellIdentity !== handle.cellIdentity || entry.owner !== handle.owner || entry.site !== handle.site || entry.cell.version !== version) return null;
      const lane = entry.cell.lane;
      return lane && this.#laneAddressIsCurrent(handle.owner, handle.site, entry.cell, lane) ? lane : null;
    }
    version(owner, site) {
      this.#assertOwner(owner);
      return this.#stateByOwner.get(owner)?.get(site)?.version ?? 0;
    }
    /** Stable scalar handle for a numeric state cell; nonnumeric sites have none. */
    scalarSource(owner, site) {
      this.#assertOwner(owner);
      const cell = this.#stateByOwner.get(owner)?.get(site);
      return cell && typeof this.#readStateValue(owner, site, cell) === "number" ? cell.source ?? null : null;
    }
    /** Resolve the canonical source for an identity-bearing committed change. */
    scalarSourceForChange(change) {
      const entry = change.cellIdentity ? this.#committedCellsByIdentity.get(change.cellIdentity) : void 0;
      if (entry && entry.owner === change.owner && entry.site === change.site) {
        this.#assertOwner(change.owner);
        return typeof entry.cell.value === "number" ? entry.cell.source ?? null : null;
      }
      return this.scalarSource(change.owner, change.site);
    }
    /** Resolve the canonical numeric source for an exact committed cell handle. */
    scalarSourceForCell(handle) {
      const entry = this.#committedCellsByIdentity.get(handle.cellIdentity);
      if (!entry || entry.handle.cellIdentity !== handle.cellIdentity || entry.owner !== handle.owner || entry.site !== handle.site || !this.#owners.has(handle.owner) || this.#stateByOwner.get(handle.owner)?.get(handle.site) !== entry.cell) return null;
      return typeof entry.cell.value === "number" ? entry.cell.source ?? null : null;
    }
    /** Resolve the current version for an identity-bearing committed change. */
    versionForChange(change) {
      const entry = change.cellIdentity ? this.#committedCellsByIdentity.get(change.cellIdentity) : void 0;
      if (entry && entry.owner === change.owner && entry.site === change.site) {
        this.#assertOwner(change.owner);
        return entry.cell.version;
      }
      return this.version(change.owner, change.site);
    }
    /** Resolve the current version for an exact committed cell handle. */
    versionForCell(handle) {
      const entry = this.#committedCellsByIdentity.get(handle.cellIdentity);
      if (!entry || entry.handle.cellIdentity !== handle.cellIdentity || entry.owner !== handle.owner || entry.site !== handle.site || !this.#owners.has(handle.owner) || this.#stateByOwner.get(handle.owner)?.get(handle.site) !== entry.cell) return null;
      return entry.cell.version;
    }
    /** Clear dirty cells only when each exact cell has not advanced past its cut. */
    clearCellChangesThrough(handles, versions, count) {
      if (!Number.isSafeInteger(count) || count < 0 || count > handles.length || count > versions.length) throw new RangeError("Invalid native state change count");
      for (let index = 0; index < count; index++) {
        const handle = handles[index];
        if (!handle || !Number.isSafeInteger(versions[index])) continue;
        const entry = this.#committedCellsByIdentity.get(handle.cellIdentity);
        if (!entry || entry.handle.cellIdentity !== handle.cellIdentity || entry.owner !== handle.owner || entry.site !== handle.site || !this.#owners.has(handle.owner) || this.#stateByOwner.get(handle.owner)?.get(handle.site) !== entry.cell) continue;
        if (entry.cell.version > versions[index]) continue;
        this.#dirtyJournal.delete(handle.owner, handle.site);
      }
    }
    /** Clear only changes at or below the captured versions. Reentrant writes survive. */
    clearChangesThrough(captured) {
      for (const change of captured) {
        if (!this.#dirtyJournal.has(change.owner, change.site)) continue;
        if (!this.#owners.has(change.owner) || this.versionForChange(change) <= change.version) {
          this.#dirtyJournal.delete(change.owner, change.site);
        }
      }
    }
    /** Coalesce repeated writes to the same owner/site until a scheduler consumes them. */
    pendingChanges() {
      const changes = [];
      for (const [owner, site] of this.#dirtyJournal.entries()) {
        changes.push({
          owner,
          site,
          version: this.version(owner, site)
        });
      }
      return changes;
    }
    drainChanges() {
      const changes = this.pendingChanges();
      this.#dirtyJournal.clear();
      return changes;
    }
    /** Return the changed owner and its component ancestors up to the root entity. */
    ownerLineage(owner) {
      this.#assertOwner(owner);
      const lineage = [];
      let current = owner;
      while (current !== null) {
        lineage.push(current);
        current = this.#owners.get(current).parent;
      }
      return lineage;
    }
    isAlive(owner) {
      return this.#owners.has(owner);
    }
    isWithin(owner, ancestor) {
      if (!this.#owners.has(owner) || !this.#owners.has(ancestor)) return false;
      let current = owner;
      while (current !== null) {
        if (current === ancestor) return true;
        current = this.#owners.get(current).parent;
      }
      return false;
    }
    hasPendingChanges() {
      return this.#dirtyJournal.size !== 0;
    }
    subscribeChanges(listener) {
      this.#changeListeners.add(listener);
      return () => this.#changeListeners.delete(listener);
    }
    /** Subscribe to committed state writes without allocating public change records. */
    subscribeDirtyCells(listener) {
      this.#dirtyCellListeners = [
        ...this.#dirtyCellListeners,
        listener
      ];
      let subscribed = true;
      return () => {
        if (!subscribed) return;
        subscribed = false;
        const index = this.#dirtyCellListeners.indexOf(listener);
        if (index < 0) return;
        this.#dirtyCellListeners = [
          ...this.#dirtyCellListeners.slice(0, index),
          ...this.#dirtyCellListeners.slice(index + 1)
        ];
      };
    }
    /** Destroy an owner and all nested keyed/component owners, including state traits. */
    destroyOwner(owner) {
      const record = this.#owners.get(owner);
      if (!record) return false;
      for (const child of [
        ...record.children
      ]) this.destroyOwner(child);
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
      for (const [site, cell] of this.#stateByOwner.get(owner) ?? []) {
        if (cell.cellIdentity) {
          this.#committedCellsByIdentity.delete(cell.cellIdentity);
        }
        this.#releaseNumericLane(owner, site, cell);
        cell.value = void 0;
        cell.source = void 0;
      }
      this.#stateByOwner.delete(owner);
      this.#dirtyJournal.removeOwner(owner);
      return true;
    }
    #assertOwner(owner) {
      if (!this.#owners.has(owner)) {
        throw new Error(`Owner ${owner} is not alive`);
      }
    }
    #parentChildrenVersion(parent) {
      return parent === null ? this.#rootChildrenVersion : this.#owners.get(parent)?.childrenVersion ?? -1;
    }
    #bumpParentChildrenVersion(parent) {
      if (parent === null) {
        this.#rootChildrenVersion++;
        return;
      }
      const record = this.#owners.get(parent);
      if (record) record.childrenVersion++;
    }
    #dispatchState(owner, site, cell, action) {
      this.#assertOwner(owner);
      const previous = cell.value;
      const next = typeof action === "function" ? action(previous) : action;
      if (Object.is(previous, next)) return false;
      if (cell.lane && typeof next !== "number") {
        this.#releaseNumericLane(owner, site, cell);
        cell.promoted = true;
      } else if (cell.numericLaneSlot !== void 0 && typeof next !== "number") {
        cell.promoted = true;
      }
      cell.value = next;
      cell.version++;
      if (typeof next === "number") {
        if (!cell.lane && cell.numericLaneSlot !== void 0 && !cell.promoted) {
          this.#ensureNumericLane(owner, site, cell);
        }
        cell.source ??= new ScalarSource(_OwnerStateWorld.#nextSourceId++, next);
        cell.source.value = next;
      }
      this.#dirtyJournal.mark(owner, site);
      let cellIdentity = cell.cellIdentity;
      if (!cellIdentity) {
        cellIdentity = {};
        cell.cellIdentity = cellIdentity;
        const handle2 = Object.freeze({
          owner,
          site,
          cellIdentity
        });
        cell.cellHandle = handle2;
        this.#committedCellsByIdentity.set(cellIdentity, {
          owner,
          site,
          cell,
          handle: handle2
        });
      }
      const handle = cell.cellHandle;
      const version = cell.version;
      const dirtyCellListeners = this.#dirtyCellListeners;
      const changeListeners = this.#changeListeners.size > 0 ? [
        ...this.#changeListeners
      ] : null;
      if (handle) {
        for (const listener of dirtyCellListeners) listener(handle, version);
      }
      if (changeListeners) {
        const change = {
          owner,
          site,
          version,
          cellIdentity
        };
        for (const listener of changeListeners) listener(change);
      }
      return true;
    }
  };

  // results/numeric-cell-shapes-v2/owner-state-world-entry.ts
  globalThis.__numericCellShapeWorld = OwnerStateWorld;
})();
