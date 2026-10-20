import { assertEquals, assertThrows } from "jsr:@std/assert";
import {
  OwnerStateWorld,
  type StateCellHandle,
} from "./owner_state_world.ts";
import {
  normalizeCompiledStateLayout,
  type CompiledStateLayout,
} from "./compiled_state_layout.ts";

const layout: CompiledStateLayout = Object.freeze({
  schemaVersion: 1,
  slots: Object.freeze([
    Object.freeze({ siteId: "x", slot: 0 }),
    Object.freeze({ siteId: "y", slot: 1 }),
  ]),
});

Deno.test("committed numbers use the authoritative lane and preserve scalar mirrors", () => {
  const world = new OwnerStateWorld();
  const owner = world.resolveOwner(null, "Board");
  let initializers = 0;
  const [initial, set] = world.useState(owner, "x", () => {
    initializers++;
    return 3;
  }, layout);
  assertEquals(initial, 3);
  assertEquals(initializers, 1);
  const lane = world.numericLane(owner, "x")!;
  assertEquals(lane.column.values[lane.row], 3);
  assertEquals(lane.generation > 0, true);
  const source = world.scalarSource(owner, "x")!;

  set(-0);
  assertEquals(Object.is(lane.column.values[lane.row], -0), true);
  assertEquals(Object.is(source.value, -0), true);
  set(Number.NaN);
  assertEquals(Number.isNaN(world.useState(owner, "x", 999, layout)[0]), true);
  assertEquals(Number.isNaN(lane.column.values[lane.row]), true);
  set(Number.POSITIVE_INFINITY);
  assertEquals(lane.column.values[lane.row], Number.POSITIVE_INFINITY);
  assertEquals(initializers, 1);
  assertEquals(world.numericLane(owner, "x"), lane);

  // Legacy scalar restoration must not rewrite authoritative lane storage.
  source.value = 77;
  assertEquals(
    world.useState(owner, "x", 0, layout)[0],
    Number.POSITIVE_INFINITY,
  );
  assertEquals(lane.column.values[lane.row], Number.POSITIVE_INFINITY);
});

Deno.test("layout columns grow in place and share one generation-checked row per owner", () => {
  const world = new OwnerStateWorld();
  const firstOwner = world.resolveOwner(null, "Board");
  world.useState(firstOwner, "x", 1, layout);
  world.useState(firstOwner, "y", 2, layout);
  const x = world.numericLane(firstOwner, "x")!;
  const y = world.numericLane(firstOwner, "y")!;
  assertEquals(x.row, y.row);
  assertEquals(x.generation, y.generation);
  assertEquals(x.column !== y.column, true);
  const firstColumn = x.column;
  const firstSource = firstColumn.source;
  const firstValues = firstColumn.values;

  for (let index = 0; index < 8; index++) {
    const owner = world.resolveOwner(null, "Board", index);
    world.useState(owner, "x", index + 10, layout);
  }
  assertEquals(x.column, firstColumn);
  assertEquals(firstColumn.source, firstSource);
  assertEquals(firstColumn.values !== firstValues, true);
  assertEquals(firstColumn.values[x.row], 1);
  assertEquals(firstColumn.values.length >= 9, true);
});

Deno.test("nonnumber promotion is sticky, including an initially boxed value", () => {
  const world = new OwnerStateWorld();
  const owner = world.resolveOwner(null, "Board");
  const [, set] = world.useState(owner, "x", 2, layout);
  const original = world.numericLane(owner, "x")!;
  const promote = set as (action: number | string) => boolean;
  assertEquals(promote("text"), true);
  assertEquals(world.numericLane(owner, "x"), null);
  assertEquals(world.useState<unknown>(owner, "x", 0, layout)[0], "text");
  assertEquals(promote(8), true);
  assertEquals(world.numericLane(owner, "x"), null);
  assertEquals(world.useState(owner, "x", 0, layout)[0], 8);
  assertEquals(original.column.values[original.row], 0);

  const boxedOwner = world.resolveOwner(null, "Board");
  const [, setLaterNumber] = world.useState(boxedOwner, "x", "start", layout);
  assertEquals(world.numericLane(boxedOwner, "x"), null);
  (setLaterNumber as (action: string | number) => boolean)(4);
  assertEquals(world.numericLane(boxedOwner, "x"), null);
});

Deno.test("owner removal clears lane, rejects retained setter, and advances row generation", () => {
  const world = new OwnerStateWorld();
  const owner = world.resolveOwner(null, "Board");
  const [, setter] = world.useState(owner, "x", 5, layout);
  const lane = world.numericLane(owner, "x")!;
  let handle: StateCellHandle | undefined;
  let version = -1;
  const unsubscribe = world.subscribeDirtyCells((next, nextVersion) => {
    handle = next;
    version = nextVersion;
  });
  setter(6);
  assertEquals(world.numericLaneForCell(handle!, version), lane);
  const capturedVersion = version;
  setter(7);
  assertEquals(world.numericLaneForCell(handle!, capturedVersion), null);
  assertEquals(world.numericLaneForCell(handle!, version), lane);
  unsubscribe();

  assertEquals(world.destroyOwner(owner), true);
  assertEquals(world.numericLane(owner, "x"), null);
  assertEquals(lane.column.values[lane.row], 0);
  assertThrows(() => setter(9));

  const replacement = world.resolveOwner(null, "Board");
  world.useState(replacement, "x", 10, layout);
  const reused = world.numericLane(replacement, "x")!;
  assertEquals(reused.row, lane.row);
  assertEquals(reused.generation !== lane.generation, true);
  assertEquals(world.numericLaneForCell(handle!, version), null);
});

Deno.test("candidate writes and rollback stay private; stale candidates cannot publish", () => {
  const world = new OwnerStateWorld();
  const owner = world.resolveOwner(null, "Board");
  const [, setter] = world.useState(owner, "x", 1, layout);
  const lane = world.numericLane(owner, "x")!;

  const prep = world.beginPreparation();
  const [, candidateSetter] = prep.useState(owner, "x", 999, layout);
  candidateSetter(2);
  assertEquals(lane.column.values[lane.row], 1);
  const checkpoint = prep.checkpoint();
  candidateSetter(3);
  prep.rollbackTo(checkpoint);
  prep.releaseCheckpoint(checkpoint);
  assertEquals(prep.useState(owner, "x", 0, layout)[0], 2);
  prep.discard();
  assertEquals(lane.column.values[lane.row], 1);
  assertEquals(world.useState(owner, "x", 0, layout)[0], 1);

  const stale = world.beginPreparation();
  const [, staleSetter] = stale.useState(owner, "x", 0, layout);
  staleSetter(4);
  setter(5);
  assertEquals(stale.validate(), false);
  assertThrows(() => stale.publish());
  stale.discard();
  assertEquals(lane.column.values[lane.row], 5);
});

Deno.test("private replacement gets a row only at publish and preserves old row until removal", () => {
  const world = new OwnerStateWorld();
  const parent = world.resolveOwner(null, "Board");
  const oldOwner = world.resolveOwner(parent, "Row", "key");
  world.useState(oldOwner, "x", 11, layout);
  const oldLane = world.numericLane(oldOwner, "x")!;

  const prep = world.beginPreparation();
  const newOwner = prep.replaceOwner(parent, "Row", "key");
  const [, setNew] = prep.useState(newOwner, "x", 22, layout);
  setNew(23);
  assertEquals(oldLane.column.values[oldLane.row], 11);
  assertEquals(world.numericLane(newOwner, "x"), null);
  prep.publish();
  const newLane = world.numericLane(newOwner, "x")!;
  assertEquals(newLane.column.values[newLane.row], 23);
  assertEquals(world.findOwner(parent, "Row", "key"), newOwner);
  assertEquals(oldLane.column.values[oldLane.row], 11);
  world.destroyOwner(oldOwner);
  assertEquals(oldLane.column.values[oldLane.row], 0);
});

Deno.test("same-shape layout reactivation keeps canonical address and shared cell identity", () => {
  const world = new OwnerStateWorld();
  const owner = world.resolveOwner(null, "Board");
  const [, setter] = world.useState(owner, "x", 1, layout);
  const lane = world.numericLane(owner, "x")!;
  const equivalentLayout: CompiledStateLayout = {
    schemaVersion: 1,
    slots: [{ siteId: "x", slot: 0 }, { siteId: "y", slot: 1 }],
  };
  const [value, sameSetter] = world.useState(owner, "x", 999, equivalentLayout);
  assertEquals(value, 1);
  assertEquals(sameSetter, setter);
  assertEquals(world.numericLane(owner, "x"), lane);
  assertThrows(() =>
    world.useState(owner, "x", 0, {
      schemaVersion: 1,
      slots: [{ siteId: "x", slot: 0 }],
    })
  );
  assertEquals(world.numericLane(owner, "x"), lane);
  setter(12);
  assertEquals(world.useState(owner, "x", 0, layout)[0], 12);
  assertEquals(lane.column.values[lane.row], 12);
});

Deno.test("warm numeric dispatch does not inspect compiled layout slots", () => {
  const world = new OwnerStateWorld();
  const owner = world.resolveOwner(null, "Board");
  const [, set] = world.useState(owner, "x", 1, layout);
  assertEquals(world.numericLane(owner, "x") !== null, true);
  const normalized = normalizeCompiledStateLayout(layout);
  const originalSome = Array.prototype.some;
  let layoutScans = 0;
  Array.prototype.some = function <T>(
    this: T[],
    predicate: (value: T, index: number, array: T[]) => unknown,
    thisArg?: unknown,
  ) {
    if (this === normalized.slots) layoutScans++;
    return originalSome.call(this, predicate, thisArg);
  };
  try {
    for (let value = 2; value < 20; value++) set(value);
  } finally {
    Array.prototype.some = originalSome;
  }
  assertEquals(layoutScans, 0);
  assertEquals(world.numericLane(owner, "x")!.column.values[0], 19);
});
