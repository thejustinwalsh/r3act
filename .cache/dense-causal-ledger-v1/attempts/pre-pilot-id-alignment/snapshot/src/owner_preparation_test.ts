import { OwnerStateWorld } from "./owner_state_world.ts";

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

Deno.test("overlapping preparations keep new owner slots and state private", () => {
  const world = new OwnerStateWorld();
  const parent = world.resolveOwner(null, "root");
  const first = world.beginPreparation();
  const second = world.beginPreparation();
  let notifications = 0;
  world.subscribeChanges(() => notifications++);

  const firstOwner = first.resolveOwner(parent, "row", "same-key");
  const secondOwner = second.resolveOwner(parent, "row", "same-key");
  equal(
    firstOwner === secondOwner,
    false,
    "Candidates shared a private owner ID",
  );
  equal(world.findOwner(parent, "row", "same-key"), undefined);
  equal(world.isAlive(firstOwner), false);
  equal(first.useState(firstOwner, "count", 1)[0], 1);
  const [secondCount, setSecond] = second.useState(secondOwner, "count", 2);
  equal(secondCount, 2);
  equal(setSecond((value) => value + 1), true);
  equal(world.pendingChanges().length, 0, "Preparation leaked a change record");
  equal(notifications, 0, "Preparation notified committed listeners");

  first.publish();
  equal(world.findOwner(parent, "row", "same-key"), firstOwner);
  equal(world.useState(firstOwner, "count", 0)[0], 1);
  equal(
    second.validate(),
    false,
    "Competing slot candidate did not become stale",
  );
  second.discard();
  equal(world.isAlive(secondOwner), false);
});

Deno.test("existing numeric reads are snapshots and stale on a write", () => {
  const world = new OwnerStateWorld();
  const owner = world.resolveOwner(null, "counter");
  const [, setCount] = world.useState(owner, "count", 4);
  const preparation = world.beginPreparation();
  const [candidateValue] = preparation.useState(owner, "count", 99);
  const candidateSource = preparation.scalarSource(owner, "count")!;
  equal(candidateValue, 4);
  equal(candidateSource.value, 4);
  equal(
    preparation.scalarSource(owner, "count"),
    candidateSource,
    "Candidate source snapshot was not stable",
  );
  equal(candidateSource === world.scalarSource(owner, "count"), false);
  setCount(5);
  equal(
    candidateSource.value,
    4,
    "Candidate source followed a committed write",
  );
  equal(
    preparation.validate(),
    false,
    "Numeric state write did not invalidate preparation",
  );
  preparation.discard();
});

Deno.test("slot generation catches create-remove ABA before candidate publication", () => {
  const world = new OwnerStateWorld();
  const parent = world.resolveOwner(null, "root");
  const preparation = world.beginPreparation();
  const candidate = preparation.resolveOwner(parent, "row", "k");
  const transient = world.resolveOwner(parent, "row", "k");
  world.destroyOwner(transient);
  equal(world.findOwner(parent, "row", "k"), undefined);
  equal(
    preparation.validate(),
    false,
    "An absent-again slot hid an intervening owner",
  );
  equal(world.isAlive(candidate), false);
  preparation.discard();
});

Deno.test("candidate state on an existing owner publishes privately and setters then forward", () => {
  const world = new OwnerStateWorld();
  const owner = world.resolveOwner(null, "owner");
  const preparation = world.beginPreparation();
  const [initial, setValue] = preparation.useState(owner, "conditional", 10);
  equal(
    preparation.useState(owner, "conditional", 999)[1],
    setValue,
    "Candidate dispatch identity changed between reads",
  );
  equal(initial, 10);
  equal(setValue(11), true);
  equal(
    world.pendingChanges().length,
    0,
    "Unpublished state entered the committed change journal",
  );
  let notifications = 0;
  world.subscribeChanges(() => notifications++);
  preparation.publish();
  equal(world.useState(owner, "conditional", 0)[0], 11);
  equal(notifications, 0, "Publication called change listeners");
  equal(setValue((value) => value + 1), true);
  equal(world.useState(owner, "conditional", 0)[0], 12);
  equal(notifications, 1, "Published setter did not use normal dispatch");
});

Deno.test("sibling slot edits conservatively stale a candidate without key tombstones", () => {
  const world = new OwnerStateWorld();
  const parent = world.resolveOwner(null, "root");
  const preparation = world.beginPreparation();
  preparation.resolveOwner(parent, "row", "candidate");
  world.resolveOwner(parent, "row", "sibling");
  equal(
    preparation.validate(),
    false,
    "Sibling shape change did not invalidate the candidate",
  );
  preparation.discard();
});

Deno.test("findOwner resolves nested candidate slots without exposing committed slots under private parents", () => {
  const world = new OwnerStateWorld();
  const root = world.resolveOwner(null, "root");
  const preparation = world.beginPreparation();
  const parent = preparation.resolveOwner(root, "parent", "p");
  const child = preparation.resolveOwner(parent, "child", "c");
  equal(preparation.findOwner(root, "parent", "p"), parent);
  equal(preparation.findOwner(parent, "child", "c"), child);
  equal(preparation.findOwner(parent, "missing", "m"), undefined);
  equal(world.findOwner(root, "parent", "p"), undefined);
  equal(world.isAlive(child), false);
  preparation.discard();
});

Deno.test("hasStateWrites excludes initialization, no-op, and post-publish writes", () => {
  const world = new OwnerStateWorld();
  const owner = world.resolveOwner(null, "owner");
  const preparation = world.beginPreparation();
  const [value, setValue] = preparation.useState(owner, "value", 1);
  equal(value, 1);
  equal(preparation.hasStateWrites(), false);
  equal(setValue(1), false);
  equal(preparation.hasStateWrites(), false);
  preparation.publish();
  equal(setValue(2), true);
  equal(preparation.hasStateWrites(), false);

  const changed = world.beginPreparation();
  const [, setChanged] = changed.useState(owner, "value", 0);
  equal(setChanged(3), true);
  equal(changed.hasStateWrites(), true);
  changed.discard();
});

Deno.test("discarded preparations reject setters and never attach children to a parent", () => {
  const world = new OwnerStateWorld();
  const parent = world.resolveOwner(null, "root");
  const preparation = world.beginPreparation();
  const child = preparation.resolveOwner(parent, "child");
  const [, setChild] = preparation.useState(child, "value", 1);
  preparation.discard();
  equal(setChild(2), false);
  equal(world.isAlive(child), false);
  equal(world.findOwner(parent, "child"), undefined);
  equal(preparation.validate(), false);
});

Deno.test("removing a candidate parent invalidates its private descendants", () => {
  const world = new OwnerStateWorld();
  const root = world.resolveOwner(null, "root");
  const preparation = world.beginPreparation();
  const parent = preparation.resolveOwner(root, "parent", "p");
  const child = preparation.resolveOwner(parent, "child", "c");
  preparation.useState(child, "value", 1);
  equal(world.isAlive(parent), false);
  equal(world.isAlive(child), false);
  world.destroyOwner(root);
  equal(preparation.validate(), false);
  preparation.discard();
});
