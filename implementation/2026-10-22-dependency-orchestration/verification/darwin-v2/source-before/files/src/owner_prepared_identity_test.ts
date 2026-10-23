import { assertEquals, assertThrows } from "jsr:@std/assert";
import {
  OwnerStateWorld,
  type StateCellHandle,
} from "./owner_state_world.ts";
import type { CompiledStateLayout } from "./compiled_state_layout.ts";

const layout: CompiledStateLayout = Object.freeze({
  schemaVersion: 1,
  slots: Object.freeze([
    Object.freeze({ siteId: "value", slot: 0 }),
  ]),
});

Deno.test("identity resolution rejects forged fields and stale versions", () => {
  const world = new OwnerStateWorld();
  const owner = world.resolveOwner(null, "IdentityOwner");
  const [, setter] = world.useState(owner, "value", 1, layout);
  const lane = world.numericLane(owner, "value")!;
  const writes: Array<{ handle: StateCellHandle; version: number }> = [];
  const unsubscribe = world.subscribeDirtyCells((handle, version) => {
    writes.push({ handle, version });
  });

  setter(2);
  const captured = writes[0];
  assertEquals(world.numericLaneForCell(captured.handle, captured.version), lane);
  assertEquals(
    world.numericLaneForCell(
      { ...captured.handle, owner: owner + 1 },
      captured.version,
    ),
    null,
  );
  assertEquals(
    world.numericLaneForCell(
      { ...captured.handle, site: "other" },
      captured.version,
    ),
    null,
  );
  assertEquals(
    world.numericLaneForCell(
      { ...captured.handle, cellIdentity: {} },
      captured.version,
    ),
    null,
  );

  setter(3);
  assertEquals(world.numericLaneForCell(captured.handle, captured.version), null);
  assertEquals(
    world.numericLaneForCell(writes[1].handle, writes[1].version),
    lane,
  );
  unsubscribe();
});

Deno.test("identity resolution rejects destroyed owners and reused rows", () => {
  const world = new OwnerStateWorld();
  const owner = world.resolveOwner(null, "IdentityOwner");
  const [, setter] = world.useState(owner, "value", 1, layout);
  let captured: { handle: StateCellHandle; version: number } | undefined;
  world.subscribeDirtyCells((handle, version) => captured = { handle, version });
  setter(2);
  const oldLane = world.numericLane(owner, "value")!;

  assertEquals(world.destroyOwner(owner), true);
  assertEquals(world.numericLaneForCell(captured!.handle, captured!.version), null);
  assertThrows(() => setter(3));

  const replacement = world.resolveOwner(null, "IdentityOwner");
  world.useState(replacement, "value", 9, layout);
  const newLane = world.numericLane(replacement, "value")!;
  assertEquals(newLane.row, oldLane.row);
  assertEquals(newLane.generation !== oldLane.generation, true);
  assertEquals(world.numericLaneForCell(captured!.handle, captured!.version), null);
});

Deno.test("candidate setters remain private on discard and forward after publish", () => {
  const world = new OwnerStateWorld();
  const owner = world.resolveOwner(null, "CandidateOwner");
  const [, liveSetter] = world.useState(owner, "value", 1, layout);
  const lane = world.numericLane(owner, "value")!;

  const discarded = world.beginPreparation();
  const [, discardedSetter] = discarded.useState(owner, "value", 0, layout);
  discardedSetter(2);
  assertEquals(world.useState(owner, "value", 0, layout)[0], 1);
  assertEquals(lane.column.values[lane.row], 1);
  discarded.discard();
  assertEquals(discardedSetter(3), false);
  assertEquals(world.useState(owner, "value", 0, layout)[0], 1);

  const published = world.beginPreparation();
  const [, candidateSetter] = published.useState(owner, "value", 0, layout);
  candidateSetter(4);
  assertEquals(world.useState(owner, "value", 0, layout)[0], 1);
  published.publish();
  assertEquals(world.useState(owner, "value", 0, layout)[0], 4);
  assertEquals(world.numericLane(owner, "value"), lane);
  assertEquals(candidateSetter(5), true);
  assertEquals(world.useState(owner, "value", 0, layout)[0], 5);
  assertEquals(lane.column.values[lane.row], 5);
  assertEquals(liveSetter(5), false);
});

Deno.test("reentrant writes keep the same identity but invalidate the old cut", () => {
  const world = new OwnerStateWorld();
  const owner = world.resolveOwner(null, "ReentrantOwner");
  const [, setter] = world.useState(owner, "value", 0, layout);
  const writes: Array<{ handle: StateCellHandle; version: number }> = [];
  let nested = false;
  world.subscribeDirtyCells((handle, version) => {
    writes.push({ handle, version });
    if (!nested) {
      nested = true;
      setter(2);
    }
  });

  setter(1);
  assertEquals(writes.length, 2);
  assertEquals(writes[0].handle, writes[1].handle);
  assertEquals(world.numericLaneForCell(writes[0].handle, writes[0].version), null);
  assertEquals(
    world.numericLaneForCell(writes[1].handle, writes[1].version) !== null,
    true,
  );
});

Deno.test("promotion keeps identity live but removes lane eligibility", () => {
  const world = new OwnerStateWorld();
  const owner = world.resolveOwner(null, "PromotionOwner");
  const [, setter] = world.useState(owner, "value", 1, layout);
  const lane = world.numericLane(owner, "value")!;
  let captured: { handle: StateCellHandle; version: number } | undefined;
  world.subscribeDirtyCells((handle, version) => captured = { handle, version });

  (setter as (value: number | string) => boolean)("boxed");
  assertEquals(world.numericLaneForCell(captured!.handle, captured!.version), null);
  (setter as (value: number | string) => boolean)(7);
  assertEquals(world.numericLane(owner, "value"), null);
  assertEquals(world.numericLaneForCell(captured!.handle, captured!.version), null);
  assertEquals(lane.column.values[lane.row], 0);
  assertEquals(world.useState<unknown>(owner, "value", null, layout)[0], 7);
});
