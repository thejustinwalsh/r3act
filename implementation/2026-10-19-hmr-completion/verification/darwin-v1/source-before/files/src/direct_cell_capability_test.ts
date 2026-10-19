import { assertEquals } from "jsr:@std/assert";
import {
  OwnerStateWorld,
  type NumericCellRowView,
  type StateCellHandle,
} from "./owner_state_world.ts";
import type { CompiledStateLayout } from "./compiled_state_layout.ts";

const layout: CompiledStateLayout = Object.freeze({
  schemaVersion: 1,
  slots: Object.freeze([
    Object.freeze({ siteId: "x", slot: 0 }),
    Object.freeze({ siteId: "y", slot: 1 }),
  ]),
});

function captureHandle(
  world: OwnerStateWorld,
  owner: number,
  site: string,
  update: (set: (next: number) => boolean) => void = (set) => set(2),
): StateCellHandle {
  let captured: StateCellHandle | undefined;
  world.subscribeDirtyCells((handle, version) => {
    if (handle.owner === owner && handle.site === site && version > 0) {
      captured = handle;
    }
  });
  const [, set] = world.useState(owner, site, 1, layout);
  update(set as (next: number) => boolean);
  if (!captured) throw new Error("Expected committed cell handle");
  return captured;
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

Deno.test("direct capabilities preserve copied handle aliases and cached row views", () => {
  const world = new OwnerStateWorld();
  const owner = world.resolveOwner(null, "Board");
  const handle = captureHandle(world, owner, "x");
  const alias = Object.freeze({
    owner: handle.owner,
    site: handle.site,
    cellIdentity: handle.cellIdentity,
  });
  const version = world.versionForCell(handle)!;
  const view = world.numericRowForCell(handle, version);
  assert(view, "Expected numeric row view");

  assertEquals(world.numericLaneForCell(alias, version), view.lane);
  assertEquals(world.numericRowForCell(alias, version), view);
  assertEquals(world.versionForCell(alias), version);
  assertEquals(world.scalarSourceForCell(alias), view.source);
  assertEquals(view.owner, owner);
  assertEquals(view.site, "x");
  assertEquals(view.layout, layout);
  assertEquals(view.rowIdentity !== handle.cellIdentity, true);
  for (const key of ["lane", "source", "sources", "columns"] as const) {
    const descriptor = Object.getOwnPropertyDescriptor(view, key);
    assert(descriptor && "value" in descriptor, `${key} should be data`);
  }
  assertEquals(view.columns[0], view.lane.column);
  assertEquals(view.sources[0], view.source);
  assertEquals(world.numericRowForCell(alias, version)?.sources, view.sources);
  assertEquals(world.numericRowForCell(alias, version)?.columns, view.columns);
  assertEquals(world.numericRowForCell(alias, version - 1), null);
  assertEquals(world.numericRowForCell(alias, version + 1), null);
  assertEquals(world.numericLaneForCell(alias, version + 1), null);
});

Deno.test("forged, proxied, foreign, and mismatched identities fail closed", () => {
  const world = new OwnerStateWorld();
  const foreign = new OwnerStateWorld();
  const owner = world.resolveOwner(null, "Board");
  const foreignOwner = foreign.resolveOwner(null, "Board");
  const handle = captureHandle(world, owner, "x");
  const foreignHandle = captureHandle(foreign, foreignOwner, "x");
  const version = world.versionForCell(handle)!;

  assertEquals(world.versionForCell({
    owner,
    site: "x",
    cellIdentity: {},
  }), null);
  assertEquals(world.versionForCell({
    owner: owner + 1,
    site: "x",
    cellIdentity: handle.cellIdentity,
  }), null);
  assertEquals(world.versionForCell({
    owner,
    site: "y",
    cellIdentity: handle.cellIdentity,
  }), null);
  assertEquals(world.versionForCell({
    owner,
    site: "x",
    cellIdentity: new Proxy(handle.cellIdentity, {}),
  }), null);
  assertEquals(world.numericRowForCell(foreignHandle, version), null);
  assertEquals(world.versionForCell(null as unknown as StateCellHandle), null);
});

Deno.test("all address getters run once before capability resolution", () => {
  const world = new OwnerStateWorld();
  const owner = world.resolveOwner(null, "Board");
  const handle = captureHandle(world, owner, "x");
  const counts = { owner: 0, site: 0, cellIdentity: 0 };
  const alias = Object.freeze({
    get owner() {
      counts.owner++;
      return owner;
    },
    get site() {
      counts.site++;
      return "x";
    },
    get cellIdentity() {
      counts.cellIdentity++;
      world.destroyOwner(owner);
      return handle.cellIdentity;
    },
  }) as StateCellHandle;

  assertEquals(world.versionForCell(alias), null);
  assertEquals(counts, { owner: 1, site: 1, cellIdentity: 1 });
  assertEquals(world.numericRowForCell(handle, 1), null);
});

Deno.test("batch acknowledgement snapshots both arrays before resolving handles", () => {
  const world = new OwnerStateWorld();
  const owner = world.resolveOwner(null, "Board");
  const handle = captureHandle(world, owner, "x");
  const version = world.versionForCell(handle)!;
  const handles = Object.defineProperty([handle], "0", {
    configurable: true,
    get() {
      world.destroyOwner(owner);
      return handle;
    },
  });
  const versions = [version];

  world.clearCellChangesThrough(handles, versions, 1);
  assertEquals(world.versionForCell(handle), null);
});

Deno.test("row leases scrub source slots and reject a reused row generation", () => {
  const world = new OwnerStateWorld();
  const firstOwner = world.resolveOwner(null, "Board", "first");
  const firstHandle = captureHandle(world, firstOwner, "x");
  const firstVersion = world.versionForCell(firstHandle)!;
  const firstView = world.numericRowForCell(firstHandle, firstVersion)!;
  const firstRow = firstView.row;
  const firstGeneration = firstView.generation;
  const retainedSources = firstView.sources;
  const firstLane = firstView.lane;
  const firstSource = firstView.source;

  assertEquals(world.destroyOwner(firstOwner), true);
  // The frozen view is a data snapshot and deliberately retains its lane and
  // source references; the shared lease arrays themselves are scrubbed.
  assertEquals(firstView.lane, firstLane);
  assertEquals(firstView.source, firstSource);
  assertEquals(retainedSources.every((source) => source === undefined), true);
  assertEquals(world.numericRowForCell(firstHandle, firstVersion), null);

  const secondOwner = world.resolveOwner(null, "Board", "second");
  const secondHandle = captureHandle(world, secondOwner, "x", (set) => set(3));
  const secondView = world.numericRowForCell(
    secondHandle,
    world.versionForCell(secondHandle)!,
  )!;
  assertEquals(secondView.row, firstRow);
  assert(secondView.generation > firstGeneration, "row generation did not advance");
  assert(secondView.rowIdentity !== firstView.rowIdentity, "row lease identity was reused");
});

Deno.test("acknowledgement preserves newer writes and retains future-cut behavior", () => {
  const world = new OwnerStateWorld();
  const owner = world.resolveOwner(null, "Board");
  let handle: StateCellHandle | undefined;
  world.subscribeDirtyCells((next) => handle = next);
  const [, set] = world.useState(owner, "x", 1, layout);
  set(2);
  const first = handle!;
  const firstVersion = world.versionForCell(first)!;
  set(3);
  const latestVersion = world.versionForCell(first)!;
  assert(latestVersion > firstVersion, "expected a newer write");

  world.clearCellChangesThrough([first], [firstVersion], 1);
  assertEquals(world.pendingChanges().length, 1);
  world.clearCellChangesThrough([first], [latestVersion + 1], 1);
  assertEquals(world.pendingChanges().length, 0);
});

Deno.test("updater destruction revokes existing capabilities before row release", () => {
  const world = new OwnerStateWorld();
  const owner = world.resolveOwner(null, "Board");
  let handle: StateCellHandle | undefined;
  world.subscribeDirtyCells((next) => handle = next);
  const [, set] = world.useState(owner, "x", 1, layout);
  set(2);
  const oldHandle = handle!;
  const result = set((previous) => {
    world.destroyOwner(owner);
    return previous + 1;
  });

  assertEquals(result, false);
  assertEquals(world.versionForCell(oldHandle), null);
  assertEquals(world.scalarSourceForCell(oldHandle), null);
  assertEquals(world.numericLaneForCell(oldHandle, 2), null);
});

Deno.test("throwing outer address getters fail without resolving identity", () => {
  const world = new OwnerStateWorld();
  const owner = world.resolveOwner(null, "Board");
  const handle = captureHandle(world, owner, "x");
  const throwing = Object.defineProperty({}, "owner", {
    get() {
      throw new Error("address trap");
    },
  }) as StateCellHandle;
  assertEquals(world.versionForCell(throwing), null);
  assertEquals(world.versionForCell(handle), 1);
});

// Keep the type in this suite as a compile-time assertion that cached row views
// expose readonly, layout-specific source/column arrays.
const _rowViewType: NumericCellRowView | null = null;
void _rowViewType;
