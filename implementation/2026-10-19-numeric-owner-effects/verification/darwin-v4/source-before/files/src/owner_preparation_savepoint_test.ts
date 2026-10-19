import {
  type OwnerPreparationCheckpoint,
  OwnerStateWorld,
} from "./owner_state_world.ts";

const equal = (
  actual: unknown,
  expected: unknown,
  message = "Values differ",
) => {
  if (!Object.is(actual, expected)) {
    throw new Error(
      `${message}: expected ${String(expected)}, received ${String(actual)}`,
    );
  }
};

const throws = (action: () => unknown, message: string) => {
  let didThrow = false;
  try {
    action();
  } catch {
    didThrow = true;
  }
  equal(didThrow, true, message);
};

Deno.test("nested savepoints roll back subtree allocations and keep siblings usable", () => {
  const world = new OwnerStateWorld();
  const root = world.resolveOwner(null, "root");
  const preparation = world.beginPreparation();
  const outer = preparation.checkpoint();
  const removedParent = preparation.resolveOwner(root, "parent", "removed");
  const removedChild = preparation.resolveOwner(removedParent, "child", "c");
  const [, removedSetter] = preparation.useState(removedChild, "value", 1);
  const inner = preparation.checkpoint();
  const innerOnly = preparation.resolveOwner(root, "inner", "x");
  preparation.useState(innerOnly, "state", 1);

  preparation.rollbackTo(outer);
  equal(world.isAlive(removedParent), false);
  equal(world.isAlive(removedChild), false);
  equal(removedSetter(2), false, "Setter from a removed branch remained live");
  equal(preparation.findOwner(root, "parent", "removed"), undefined);
  throws(
    () => preparation.rollbackTo(inner),
    "Rolled-back nested token worked",
  );

  const sibling = preparation.resolveOwner(root, "parent", "survivor");
  const [value, setValue] = preparation.useState(sibling, "value", 5);
  equal(value, 5);
  equal(setValue(6), true);
  equal(preparation.hasStateWrites(), true);
  preparation.publish();
  equal(world.findOwner(root, "parent", "survivor"), sibling);
  equal(world.findOwner(root, "parent", "removed"), undefined);
  equal(world.useState(sibling, "value", 0)[0], 6);
});

Deno.test("branch rollback restores cell values, versions, sources, and write flags", () => {
  const world = new OwnerStateWorld();
  const owner = world.resolveOwner(null, "owner");
  world.useState(owner, "count", 10);
  const preparation = world.beginPreparation();
  const [initial, setCount] = preparation.useState(owner, "count", 0);
  const source = preparation.scalarSource(owner, "count")!;
  const checkpoint = preparation.checkpoint();

  equal(initial, 10);
  equal(setCount(11), true);
  equal(source.value, 11);
  equal(preparation.hasStateWrites(), true);
  equal(setCount(12), true);
  preparation.rollbackTo(checkpoint);

  equal(source.value, 10, "Source snapshot was not restored");
  equal(preparation.useState(owner, "count", 0)[0], 10);
  equal(preparation.hasStateWrites(), false);
  equal(preparation.scalarSource(owner, "count"), source);
  equal(preparation.useState(owner, "count", 0)[1](11), true);
  equal(preparation.hasStateWrites(), true);
  preparation.discard();
});

Deno.test("rollback restores a candidate cell allocated in an earlier branch", () => {
  const world = new OwnerStateWorld();
  const root = world.resolveOwner(null, "root");
  const preparation = world.beginPreparation();
  const owner = preparation.resolveOwner(root, "private-owner", "p");
  const [initial, setValue] = preparation.useState(owner, "value", 1);
  const source = preparation.scalarSource(owner, "value")!;
  const checkpoint = preparation.checkpoint();

  equal(initial, 1);
  equal(setValue(2), true);
  equal(source.value, 2);
  preparation.rollbackTo(checkpoint);
  equal(source.value, 1);
  equal(preparation.useState(owner, "value", 0)[0], 1);
  equal(preparation.hasStateWrites(), false);
  equal(setValue(3), true, "Preexisting candidate setter was discarded");
  preparation.publish();
  equal(world.useState(owner, "value", 0)[0], 3);
});

Deno.test("conditional state and captured setters on a live owner roll back", () => {
  const world = new OwnerStateWorld();
  const owner = world.resolveOwner(null, "owner");
  const preparation = world.beginPreparation();
  const checkpoint = preparation.checkpoint();
  const [initial, setConditional] = preparation.useState(
    owner,
    "conditional",
    20,
  );
  equal(initial, 20);
  equal(setConditional(21), true);
  preparation.rollbackTo(checkpoint);
  equal(setConditional(22), false, "Removed conditional setter stayed active");
  equal(preparation.hasStateWrites(), false);
  equal(preparation.useState(owner, "conditional", 30)[0], 30);
  preparation.publish();
  equal(world.useState(owner, "conditional", 0)[0], 30);
});

Deno.test("outer rollback removes partial inner work and preserves no committed effects", () => {
  const world = new OwnerStateWorld();
  const owner = world.resolveOwner(null, "owner");
  const [, committedSetter] = world.useState(owner, "value", 1);
  const preparation = world.beginPreparation();
  let notifications = 0;
  world.subscribeChanges(() => notifications++);
  const outer = preparation.checkpoint();
  const [, setCandidate] = preparation.useState(owner, "value", 0);
  setCandidate(2);
  const inner = preparation.checkpoint();
  setCandidate(3);
  preparation.rollbackTo(inner);
  equal(preparation.useState(owner, "value", 0)[0], 2);
  preparation.rollbackTo(outer);
  equal(preparation.hasStateWrites(), false);
  equal(world.useState(owner, "value", 0)[0], 1);
  equal(world.pendingChanges().length, 0);
  equal(notifications, 0);

  // A committed write after rollback is valid because the abandoned branch's
  // expected-cell capture was removed from the preparation.
  committedSetter(4);
  equal(preparation.validate(), true);
  preparation.discard();
});

Deno.test("rollback removes slot and cell validation captures", () => {
  const world = new OwnerStateWorld();
  const root = world.resolveOwner(null, "root");
  const owner = world.resolveOwner(root, "child", "existing");
  world.useState(owner, "value", 1);
  const preparation = world.beginPreparation();
  const checkpoint = preparation.checkpoint();
  preparation.findOwner(root, "child", "existing");
  preparation.useState(owner, "value", 0);
  preparation.rollbackTo(checkpoint);

  world.useState(owner, "value", 2)[1](3);
  equal(
    preparation.validate(),
    true,
    "Rolled-back cell capture still made preparation stale",
  );
  preparation.discard();

  const slotPreparation = world.beginPreparation();
  const slotCheckpoint = slotPreparation.checkpoint();
  slotPreparation.findOwner(root, "child", "existing");
  slotPreparation.rollbackTo(slotCheckpoint);
  world.resolveOwner(root, "another-child", "sibling");
  equal(
    slotPreparation.validate(),
    true,
    "Rolled-back slot capture still validated an old parent generation",
  );
  slotPreparation.discard();
});

Deno.test("checkpoint tokens reject foreign, future, rolled-back, and closed use", () => {
  const world = new OwnerStateWorld();
  const first = world.beginPreparation();
  const second = world.beginPreparation();
  const firstToken = first.checkpoint();
  const secondToken = second.checkpoint();
  throws(() => first.rollbackTo(secondToken), "Foreign token was accepted");

  const later = first.checkpoint();
  first.rollbackTo(firstToken);
  throws(() => first.rollbackTo(later), "Rolled-back token was accepted");

  // A type cast cannot forge the private runtime identity carried by tokens.
  throws(
    () => first.rollbackTo({} as OwnerPreparationCheckpoint),
    "Forged token was accepted",
  );
  first.publish();
  throws(
    () => first.rollbackTo(firstToken),
    "Closed preparation accepted token",
  );
  second.discard();
});

Deno.test("released child markers preserve the outer rollback boundary", () => {
  const world = new OwnerStateWorld();
  const owner = world.resolveOwner(null, "owner");
  const preparation = world.beginPreparation();
  const outer = preparation.checkpoint();
  const [, setValue] = preparation.useState(owner, "value", 1);
  const child = preparation.checkpoint();
  setValue(2);
  preparation.releaseCheckpoint(child);
  throws(
    () => preparation.rollbackTo(child),
    "Released child marker remained usable",
  );
  equal(preparation.useState(owner, "value", 0)[0], 2);

  const nextChild = preparation.checkpoint();
  setValue(3);
  preparation.rollbackTo(nextChild);
  preparation.releaseCheckpoint(nextChild);
  equal(preparation.useState(owner, "value", 0)[0], 2);
  preparation.rollbackTo(outer);
  equal(preparation.hasStateWrites(), false);
  preparation.releaseCheckpoint(outer);
  throws(
    () => preparation.rollbackTo(outer),
    "Released outer marker remained usable",
  );
  preparation.discard();
});

Deno.test("state written before a checkpoint remains the rollback base", () => {
  const world = new OwnerStateWorld();
  const owner = world.resolveOwner(null, "owner");
  world.useState(owner, "value", 1);
  const preparation = world.beginPreparation();
  const [, setValue] = preparation.useState(owner, "value", 0);
  setValue(2);
  const checkpoint = preparation.checkpoint();
  setValue(3);
  preparation.rollbackTo(checkpoint);
  equal(preparation.useState(owner, "value", 0)[0], 2);
  equal(preparation.hasStateWrites(), true);
  preparation.releaseCheckpoint(checkpoint);
  preparation.discard();
});

Deno.test("many sibling savepoints can roll back and release under one outer marker", () => {
  const world = new OwnerStateWorld();
  const root = world.resolveOwner(null, "root");
  const preparation = world.beginPreparation();
  const outer = preparation.checkpoint();

  for (let index = 0; index < 1_000; index++) {
    const child = preparation.checkpoint();
    preparation.resolveOwner(root, "row", index);
    preparation.rollbackTo(child);
    preparation.releaseCheckpoint(child);
  }

  equal(preparation.findOwner(root, "row", 999), undefined);
  preparation.rollbackTo(outer);
  preparation.releaseCheckpoint(outer);
  preparation.discard();
});
