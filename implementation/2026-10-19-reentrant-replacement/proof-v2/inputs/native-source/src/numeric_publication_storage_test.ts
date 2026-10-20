import { assertEquals, assertStrictEquals } from "jsr:@std/assert";
import type { CompiledStateLayout } from "./compiled_state_layout.ts";
import { NumericColumn } from "./jsx_binding_runtime.ts";
import { OwnerStateWorld } from "./owner_state_world.ts";

const layout: CompiledStateLayout = Object.freeze({
  schemaVersion: 1,
  slots: Object.freeze([Object.freeze({ siteId: "value", slot: 0 })]),
});

Deno.test("group members have numeric storage before any notification", () => {
  const world = new OwnerStateWorld();
  const first = world.beginPreparation();
  const second = world.beginPreparation();
  const firstOwner = first.resolveOwner(null, "first");
  const secondOwner = second.resolveOwner(null, "second");
  first.useState(firstOwner, "value", 3, layout);
  second.useState(secondOwner, "value", 7, layout);
  first.preparePublication();
  second.preparePublication();

  first.publishAccepted();
  second.publishAccepted();
  const notify = () => {
    const firstLane = world.numericLane(firstOwner, "value")!;
    const secondLane = world.numericLane(secondOwner, "value")!;
    assertEquals(firstLane.column.values[firstLane.row], 3);
    assertEquals(secondLane.column.values[secondLane.row], 7);
    assertEquals(world.scalarSource(firstOwner, "value")!.value, 3);
    assertEquals(world.scalarSource(secondOwner, "value")!.value, 7);
  };
  notify();
  first.notifyPublished();
  second.notifyPublished();
  notify();
});

Deno.test("failed optional lane setup retains boxed state, source, and exact dirty work", () => {
  const world = new OwnerStateWorld();
  const preparation = world.beginPreparation();
  const owner = preparation.resolveOwner(null, "lane-fallback");
  const [, set] = preparation.useState(owner, "value", 2, layout);
  preparation.preparePublication();

  const reserve = NumericColumn.prototype.reserve;
  NumericColumn.prototype.reserve = function () {
    throw new Error("injected lane allocation failure");
  };
  try {
    preparation.publishAccepted();
  } finally {
    NumericColumn.prototype.reserve = reserve;
  }

  assertStrictEquals(world.numericLane(owner, "value"), null);
  assertEquals(world.useState(owner, "value", 0, layout)[0], 2);
  assertEquals(world.scalarSource(owner, "value")!.value, 2);
  const seen: number[] = [];
  const unsubscribe = world.subscribeChanges((change) => seen.push(change.version));
  try {
    assertEquals(set(5), true);
    assertEquals(world.useState(owner, "value", 0, layout)[0], 5);
    assertStrictEquals(world.numericLane(owner, "value"), null);
    assertEquals(world.scalarSource(owner, "value")!.value, 5);
    assertEquals(world.pendingChanges(), [{ owner, site: "value", version: 1 }]);
    assertEquals(seen, [1]);
    world.clearChangesThrough([{ owner, site: "value", version: 1 }]);
    assertEquals(set(8), true);
    world.clearChangesThrough([{ owner, site: "value", version: 1 }]);
    assertEquals(world.pendingChanges(), [{ owner, site: "value", version: 2 }]);
    assertEquals(seen, [1, 2]);
    preparation.notifyPublished();
  } finally {
    unsubscribe();
  }
});

Deno.test("direct activation falls back after lane allocation failure and reuses the row", () => {
  const world = new OwnerStateWorld();
  const owner = world.resolveOwner(null, "direct-fallback");
  const reserve = NumericColumn.prototype.reserve;
  let reserves = 0;
  NumericColumn.prototype.reserve = function (minCapacity) {
    if (++reserves === 2) throw new Error("injected lane allocation failure");
    return reserve.call(this, minCapacity);
  };
  let set!: (value: number) => boolean;
  try {
    [, set] = world.useState(owner, "value", 4, layout);
  } finally {
    NumericColumn.prototype.reserve = reserve;
  }
  assertStrictEquals(world.numericLane(owner, "value"), null);
  assertEquals(world.scalarSource(owner, "value")!.value, 4);
  assertEquals(set(6), true);
  assertEquals(world.pendingChanges(), [{ owner, site: "value", version: 1 }]);

  const nextOwner = world.resolveOwner(null, "direct-next");
  world.useState(nextOwner, "value", 9, layout);
  assertEquals(world.numericLane(nextOwner, "value")!.row, 0);
});

Deno.test("host-time candidate setter preserves its captured value and forwards newer live work", () => {
  const world = new OwnerStateWorld();
  const owner = world.resolveOwner(null, "host-reentry");
  world.useState(owner, "value", 1, layout);
  const preparation = world.beginPreparation();
  const [captured, setCandidate] = preparation.useState(owner, "value", 0, layout);
  assertEquals(captured, 1);
  preparation.beginHostApplication();
  assertEquals(setCandidate(9), true);
  assertEquals(preparation.useState(owner, "value", 0, layout)[0], 1);
  assertEquals(preparation.hasStateWrites(), false);
  assertEquals(preparation.validatePublicationInputs(), true);
  preparation.preparePublicationAfterHost();
  preparation.publishAccepted();
  assertEquals(world.useState(owner, "value", 0, layout)[0], 9);
  assertEquals(world.pendingChanges(), [{ owner, site: "value", version: 1 }]);
});

Deno.test("host-time setter for an unpublished owner declines without changing the candidate", () => {
  const world = new OwnerStateWorld();
  const preparation = world.beginPreparation();
  const owner = preparation.resolveOwner(null, "host-new-owner");
  const [, setCandidate] = preparation.useState(owner, "value", 2, layout);
  preparation.beginHostApplication();
  assertEquals(setCandidate(9), false);
  assertEquals(preparation.useState(owner, "value", 0, layout)[0], 2);
  assertEquals(preparation.hasStateWrites(), false);
  preparation.preparePublicationAfterHost();
  preparation.publishAccepted();
  assertEquals(world.useState(owner, "value", 0, layout)[0], 2);
});
