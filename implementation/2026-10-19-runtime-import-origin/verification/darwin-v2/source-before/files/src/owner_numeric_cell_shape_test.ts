import { assertEquals, assertThrows } from "jsr:@std/assert";
import { OwnerStateWorld } from "./owner_state_world.ts";
import type { CompiledStateLayout } from "./compiled_state_layout.ts";

const numericLayout: CompiledStateLayout = {
  schemaVersion: 1,
  slots: [{ siteId: "value", slot: 0 }, { siteId: "other", slot: 1 }],
};

function interceptValueDefinitions(run: () => void): number {
  const original = Object.defineProperty;
  let count = 0;
  Object.defineProperty = function (target, property, descriptor) {
    if (property === "value") count++;
    return original(target, property, descriptor);
  };
  try {
    run();
  } finally {
    Object.defineProperty = original;
  }
  return count;
}

function captureCompiledCells<T>(run: () => T): { result: T; cells: object[] } {
  const original = Object.create;
  const cells: object[] = [];
  Object.create = function (
    prototype: object | null,
    properties?: PropertyDescriptorMap & ThisType<any>,
  ) {
    const created = properties === undefined
      ? original(prototype)
      : original(prototype, properties);
    const descriptor = prototype && Object.getOwnPropertyDescriptor(prototype, "value");
    if (descriptor?.get?.name === "getLaneBackedValue" && descriptor.set?.name === "setLaneBackedValue") {
      cells.push(created);
    }
    return created;
  };
  try {
    return { result: run(), cells };
  } finally {
    Object.create = original;
  }
}

Deno.test("numeric cells attach from their shared prototype without redefining value", () => {
  const world = new OwnerStateWorld();
  const owner = world.resolveOwner(null, "Board");
  let initialized = 0;
  let setter!: (action: number | ((previous: number) => number)) => boolean;
  let capturedCell: object | undefined;
  const definitions = interceptValueDefinitions(() => {
    const observed = captureCompiledCells(() => {
      const [, set] = world.useState(owner, "value", () => {
        initialized++;
        return 4;
      }, numericLayout);
      setter = set;
      assertEquals(world.numericLane(owner, "value") !== null, true);
      setter((previous) => previous + 1);
    });
    assertEquals(observed.cells.length, 1);
    capturedCell = observed.cells[0];
  });

  assertEquals(definitions, 0, "Attaching a birth-eligible cell must not redefine its value property");
  assertEquals(initialized, 1);
  const cell = capturedCell as { value: number; boxedValue: unknown; lane?: unknown };
  assertEquals(Object.hasOwn(cell, "value"), false);
  assertEquals(cell.boxedValue, undefined, "Published lane cells clear their boxed value");
  assertEquals(cell.value, 5);
  const lane = world.numericLane(owner, "value")!;
  assertEquals(lane.column.values[lane.row], 5);
  const mirror = world.scalarSource(owner, "value")!;
  lane.column.values[lane.row] = 17;
  assertEquals(world.useState(owner, "value", 0, numericLayout)[0], 17);
  assertEquals(mirror.value, 5, "The scalar compatibility mirror must not own the logical value");
  setter((previous) => previous + 1);
  assertEquals(lane.column.values[lane.row], 18);
  assertEquals(mirror.value, 18);
});

Deno.test("generic cells stay plain until late layout metadata uses compatibility attachment", () => {
  const world = new OwnerStateWorld();
  const owner = world.resolveOwner(null, "Board");
  const [, setter] = world.useState(owner, "value", 2);
  assertEquals(world.numericLane(owner, "value"), null);
  let definitions = interceptValueDefinitions(() => {
    assertEquals(world.useState(owner, "value", 0, numericLayout)[0], 2);
  });
  assertEquals(definitions, 1, "Late layout metadata retains the existing accessor compatibility path");
  setter(3);
  assertEquals(world.useState(owner, "value", 0, numericLayout)[0], 3);
  const lane = world.numericLane(owner, "value")!;
  assertEquals(lane.column.values[lane.row], 3);
});

Deno.test("candidate numeric boxes remain private through rollback, discard, and publish", () => {
  const world = new OwnerStateWorld();
  const parent = world.resolveOwner(null, "Board");
  const oldOwner = world.resolveOwner(parent, "Row", "key");
  const [, oldSetter] = world.useState(oldOwner, "value", 8, numericLayout);
  const oldLane = world.numericLane(oldOwner, "value")!;

  const discarded = world.beginPreparation();
  const replaced = discarded.replaceOwner(parent, "Row", "key");
  const discardedCandidate = captureCompiledCells(() =>
    discarded.useState(replaced, "value", 10, numericLayout)
  );
  const discardedCell = discardedCandidate.cells[0] as { boxedValue: unknown };
  const discardedSetter = discardedCandidate.result[1];
  const checkpoint = discarded.checkpoint();
  discardedSetter(11);
  assertEquals(discardedCell.boxedValue, 11);
  discarded.rollbackTo(checkpoint);
  discarded.releaseCheckpoint(checkpoint);
  assertEquals(discardedCell.boxedValue, 10, "Rollback restores only the private box");
  discardedSetter(11);
  assertEquals(world.numericLane(replaced, "value"), null);
  assertEquals(oldLane.column.values[oldLane.row], 8);
  discarded.discard();
  assertEquals(discardedCell.boxedValue, undefined, "Discard clears the candidate's boxed payload");
  assertEquals(world.numericLane(replaced, "value"), null);
  assertEquals(oldLane.column.values[oldLane.row], 8);

  const preparation = world.beginPreparation();
  const nextOwner = preparation.replaceOwner(parent, "Row", "key");
  const publishedCandidate = captureCompiledCells(() =>
    preparation.useState(nextOwner, "value", 12, numericLayout)
  );
  const publishedCell = publishedCandidate.cells[0] as { boxedValue: unknown; lane?: unknown };
  const candidateSetter = publishedCandidate.result[1];
  candidateSetter(13);
  assertEquals(publishedCell.boxedValue, 13);
  assertEquals(world.numericLane(nextOwner, "value"), null);
  assertEquals(oldLane.column.values[oldLane.row], 8);
  preparation.publish();
  assertEquals(publishedCell.boxedValue, undefined, "Publish clears the box after lane seeding");
  assertEquals(publishedCell.lane !== undefined, true);
  const nextLane = world.numericLane(nextOwner, "value")!;
  assertEquals(nextLane.column.values[nextLane.row], 13);
  assertEquals(oldLane.column.values[oldLane.row], 8);
  world.destroyOwner(oldOwner);
  assertEquals(oldLane.column.values[oldLane.row], 0);
  assertThrows(() => oldSetter(9));
});

Deno.test("promotion is sticky and destruction clears retained numeric-cell payloads", () => {
  const world = new OwnerStateWorld();
  const owner = world.resolveOwner(null, "Board");
  const captured = captureCompiledCells(() => world.useState(owner, "value", 6, numericLayout));
  const setter = captured.result[1];
  const promotedCell = captured.cells[0] as { boxedValue: unknown };
  const originalLane = world.numericLane(owner, "value")!;
  const promote = setter as (action: number | object) => boolean;
  const payload = { retained: "only while live" };
  const detachDefinitions = interceptValueDefinitions(() => { promote(payload); });
  assertEquals(detachDefinitions, 0, "Promotion detaches through fields rather than redefining value");
  assertEquals(promotedCell.boxedValue, payload);
  assertEquals(world.numericLane(owner, "value"), null);
  assertEquals(world.useState<unknown>(owner, "value", 0, numericLayout)[0], payload);
  promote(7);
  assertEquals(world.useState(owner, "value", 0, numericLayout)[0], 7);
  assertEquals(world.numericLane(owner, "value"), null);
  assertEquals(originalLane.column.values[originalLane.row], 0);
  promote(payload);
  assertEquals(promotedCell.boxedValue, payload);
  assertEquals(world.destroyOwner(owner), true);
  assertEquals(promotedCell.boxedValue, undefined, "Destroy clears an object payload held in the numeric cell box");

  const numericOwner = world.resolveOwner(null, "Board", "numeric-owner");
  const observed = captureCompiledCells(() =>
    world.useState(numericOwner, "value", 1, numericLayout)
  );
  const deadSetter = observed.result[1];
  const liveLane = world.numericLane(numericOwner, "value")!;
  const destroyedCell = observed.cells[0] as { boxedValue: unknown; lane?: unknown };
  const destroyDefinitions = interceptValueDefinitions(() => { assertEquals(world.destroyOwner(numericOwner), true); });
  assertEquals(destroyDefinitions, 0, "Destroy detaches through fields rather than redefining value");
  assertEquals(destroyedCell.boxedValue, undefined);
  assertEquals(destroyedCell.lane, undefined);
  assertEquals(liveLane.column.values[liveLane.row], 0);
  assertThrows(() => deadSetter(2));
});

Deno.test("existing numeric cell publication preserves its storage and source identities", () => {
  const world = new OwnerStateWorld();
  const owner = world.resolveOwner(null, "Row");
  const live = captureCompiledCells(() => world.useState(owner, "value", 1, numericLayout));
  const liveCell = live.cells[0] as { value: unknown; boxedValue: unknown };
  const source = world.scalarSource(owner, "value")!;
  const lane = world.numericLane(owner, "value")!;
  live.result[1](2);
  const preparation = world.beginPreparation();
  const candidate = captureCompiledCells(() => preparation.useState(owner, "value", 0, numericLayout));
  const privateCell = candidate.cells[0] as { lane?: unknown; boxedValue: unknown };
  const setPrivate = candidate.result[1] as (value: number | string) => boolean;
  assertEquals(privateCell === liveCell, false);
  assertEquals(privateCell.lane, undefined);
  assertEquals(privateCell.boxedValue, 2);
  const privateSource = preparation.scalarSource(owner, "value")!;
  assertEquals(privateSource === source, false);
  setPrivate(3);
  const checkpoint = preparation.checkpoint();
  setPrivate("private");
  preparation.rollbackTo(checkpoint);
  preparation.releaseCheckpoint(checkpoint);
  assertEquals(privateCell.boxedValue, 3);
  assertEquals(privateSource.value, 3);
  assertEquals(liveCell.value, 2);
  assertEquals(lane.column.values[lane.row], 2);
  assertEquals(source.value, 2);
  preparation.publish();
  assertEquals(world.scalarSource(owner, "value"), source);
  assertEquals(world.numericLane(owner, "value"), lane);
  assertEquals(liveCell.value, 3);
  assertEquals(liveCell.boxedValue, undefined);
  setPrivate(4);
  assertEquals(liveCell.value, 4);
  assertEquals(lane.column.values[lane.row], 4);
  assertEquals(source.value, 4);
  world.destroyOwner(owner);
  assertEquals(liveCell.value, undefined);
  assertEquals(liveCell.boxedValue, undefined);
});
