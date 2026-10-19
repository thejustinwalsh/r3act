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

Deno.test("replacement stays private until publish and survives old-owner removal", () => {
  const world = new OwnerStateWorld();
  const parent = world.resolveOwner(null, "root");
  const old = world.resolveOwner(parent, "row", "samekey");
  world.useState(old, "value", "old");
  const preparation = world.beginPreparation();
  const replacement = preparation.replaceOwner(parent, "row", "samekey");
  preparation.useState(replacement, "value", "new");

  equal(preparation.findOwner(parent, "row", "samekey"), replacement);
  equal(world.findOwner(parent, "row", "samekey"), old);
  equal(world.isAlive(replacement), false);
  preparation.publish();

  equal(world.findOwner(parent, "row", "samekey"), replacement);
  equal(world.isAlive(old), true, "Old incarnation was retired during publish");
  equal(world.useState(replacement, "value", "?")[0], "new");
  equal(world.destroyOwner(old), true);
  equal(world.findOwner(parent, "row", "samekey"), replacement);
});

Deno.test("discarding the newest replacement restores the old slot", () => {
  const world = new OwnerStateWorld();
  const parent = world.resolveOwner(null, "root");
  const old = world.resolveOwner(parent, "row", 7);
  const preparation = world.beginPreparation();
  const first = preparation.replaceOwner(parent, "row", 7);
  const second = preparation.replaceOwner(parent, "row", 7);
  equal(preparation.findOwner(parent, "row", 7), second);
  equal(preparation.discardPrivateOwner(second), true);
  equal(preparation.findOwner(parent, "row", 7), first);
  equal(preparation.discardPrivateOwner(first), true);
  equal(preparation.findOwner(parent, "row", 7), old);
  preparation.publish();
  equal(world.findOwner(parent, "row", 7), old);
});

Deno.test("discard keeps an earlier committed slot read authoritative", () => {
  const world = new OwnerStateWorld();
  const parent = world.resolveOwner(null, "root");
  const old = world.resolveOwner(parent, "row", "samekey");
  const preparation = world.beginPreparation();
  equal(preparation.resolveOwner(parent, "row", "samekey"), old);
  const replacement = preparation.replaceOwner(parent, "row", "samekey");
  equal(preparation.discardPrivateOwner(replacement), true);
  world.resolveOwner(parent, "sibling", "later");
  equal(
    preparation.validate(),
    false,
    "Discard erased validation for a previously resolved committed slot",
  );
  preparation.discard();
});

Deno.test("canceling the only temporary insertion drops its unused slot capture", () => {
  const world = new OwnerStateWorld();
  const parent = world.resolveOwner(null, "root");
  const preparation = world.beginPreparation();
  const temporary = preparation.resolveOwner(parent, "row", "temporary");
  equal(preparation.discardPrivateOwner(temporary), true);
  world.resolveOwner(parent, "sibling", "later");
  equal(
    preparation.validate(),
    true,
    "Cancelled-only slot capture kept an irrelevant parent generation",
  );
  preparation.discard();
});

Deno.test("discarding a private write preserves unrelated committed candidate writes", () => {
  const world = new OwnerStateWorld();
  const parent = world.resolveOwner(null, "root");
  const committed = world.resolveOwner(parent, "stable", "c");
  const preparation = world.beginPreparation();
  const [, setCommitted] = preparation.useState(committed, "value", 1);
  setCommitted(2);
  const temporary = preparation.resolveOwner(parent, "row", "temporary");
  const [, setTemporary] = preparation.useState(temporary, "value", 1);
  setTemporary(2);
  equal(preparation.discardPrivateOwner(temporary), true);
  equal(preparation.hasStateWrites(), true);
  equal(setCommitted(3), true, "Unrelated candidate setter was invalidated");
  preparation.discard();
});

Deno.test("replacement validates its parent generation and parent liveness", () => {
  const world = new OwnerStateWorld();
  const parent = world.resolveOwner(null, "root");
  world.resolveOwner(parent, "row", "samekey");
  const staleBySibling = world.beginPreparation();
  staleBySibling.replaceOwner(parent, "row", "samekey");
  world.resolveOwner(parent, "sibling", "x");
  equal(staleBySibling.validate(), false);
  staleBySibling.discard();

  const deadParent = world.resolveOwner(null, "branch");
  world.resolveOwner(deadParent, "row", "samekey");
  const staleByParentRemoval = world.beginPreparation();
  staleByParentRemoval.replaceOwner(deadParent, "row", "samekey");
  world.destroyOwner(deadParent);
  equal(staleByParentRemoval.validate(), false);
  staleByParentRemoval.discard();
});

Deno.test("discarding a private subtree disables setters and releases numeric snapshots", () => {
  const world = new OwnerStateWorld();
  const parent = world.resolveOwner(null, "root");
  const preparation = world.beginPreparation();
  const temporary = preparation.resolveOwner(parent, "row", "temporary");
  const child = preparation.resolveOwner(temporary, "child", "nested");
  const [, setValue] = preparation.useState(child, "value", 4);
  const source = preparation.scalarSource(child, "value")!;
  equal(setValue(5), true);
  equal(source.value, 5);
  equal(preparation.discardPrivateOwner(temporary), true);
  equal(setValue(6), false);
  equal(source.value, 0, "Discard retained the candidate scalar payload");
  equal(preparation.findOwner(parent, "row", "temporary"), undefined);
  equal(preparation.hasStateWrites(), false);
  preparation.publish();
  equal(world.findOwner(parent, "row", "temporary"), undefined);
  equal(world.isAlive(child), false);
});

Deno.test("discarded replacement rolls back through a checkpoint and can be released", () => {
  const world = new OwnerStateWorld();
  const parent = world.resolveOwner(null, "root");
  const old = world.resolveOwner(parent, "row", "samekey");
  const preparation = world.beginPreparation();
  const replacement = preparation.replaceOwner(parent, "row", "samekey");
  const [, setValue] = preparation.useState(replacement, "count", 1);
  const source = preparation.scalarSource(replacement, "count")!;
  setValue(2);
  const outer = preparation.checkpoint();
  setValue(3);
  equal(preparation.discardPrivateOwner(replacement), true);
  equal(setValue(4), false);
  equal(preparation.findOwner(parent, "row", "samekey"), old);
  preparation.rollbackTo(outer);
  equal(preparation.findOwner(parent, "row", "samekey"), replacement);
  equal(source.value, 2, "Rollback did not restore candidate source payload");
  equal(setValue(4), true, "Rollback did not restore the candidate setter");
  equal(preparation.hasStateWrites(), true);
  preparation.releaseCheckpoint(outer);
  preparation.discard();
  equal(setValue(5), false, "Closed preparation retained a live setter");
});

Deno.test("private replacement and writes do not notify until committed dispatch", () => {
  const world = new OwnerStateWorld();
  const parent = world.resolveOwner(null, "root");
  const old = world.resolveOwner(parent, "row", "samekey");
  const [, committedSetter] = world.useState(old, "count", 1);
  const preparation = world.beginPreparation();
  let notifications = 0;
  let dirtyNotifications = 0;
  world.subscribeChanges(() => notifications++);
  world.subscribeDirtyCells(() => dirtyNotifications++);
  const replacement = preparation.replaceOwner(parent, "row", "samekey");
  const [, setCandidate] = preparation.useState(replacement, "count", 2);
  setCandidate(3);
  equal(notifications, 0);
  equal(dirtyNotifications, 0);
  equal(world.pendingChanges().length, 0);
  preparation.publish();
  equal(notifications, 0);
  equal(dirtyNotifications, 0);
  committedSetter(2);
  equal(notifications, 1);
  equal(dirtyNotifications, 1);
});
