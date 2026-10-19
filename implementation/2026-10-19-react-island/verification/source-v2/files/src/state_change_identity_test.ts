import { OwnerStateWorld, type StateChange } from "./owner_state_world.ts";
import { PendingStateChanges } from "./pending_state_changes.ts";

const equal = (actual: unknown, expected: unknown, label: string) => {
  if (!Object.is(actual, expected)) {
    throw new Error(
      `${label}: expected ${String(expected)}, got ${String(actual)}`,
    );
  }
};
const same = (actual: unknown, expected: unknown, label: string) => {
  if (actual !== expected) throw new Error(label);
};
const different = (actual: unknown, expected: unknown, label: string) => {
  if (actual === expected) throw new Error(label);
};

const identified = (
  owner: number,
  site: string,
  version: number,
  cellIdentity: object,
): StateChange => ({ owner, site, version, cellIdentity });
const plain = (owner: number, site: string, version: number): StateChange => ({
  owner,
  site,
  version,
});

Deno.test("reused foreign identity cannot alias another owner or site", () => {
  const pending = new PendingStateChanges();
  const identity = {};
  const first = identified(1, "a", 1, identity);
  const second = identified(2, "a", 1, identity);
  const third = identified(1, "b", 1, identity);
  pending.set(first);
  pending.set(second);
  pending.set(third);
  equal(pending.size, 3, "Identity hint must not replace address semantics");
  pending.clearThrough([first, second]);
  equal(pending.size, 1, "Clear must select captured owner/site");
  same([...pending.values()][0], third, "Unrelated hinted entry survives");
});

Deno.test("world cell identity stays stable through renders and existing-cell publish", () => {
  const world = new OwnerStateWorld();
  const owner = world.resolveOwner(null, "identity-existing");
  let [, setter] = world.useState(owner, "value", 0);
  const notifications: StateChange[] = [];
  world.subscribeChanges((change) => notifications.push(change));
  setter(1);
  const first = notifications[0];
  if (!first.cellIdentity) {
    throw new Error("World notification omitted its cell identity");
  }

  const prep = world.beginPreparation();
  const [, candidateSetter] = prep.useState(owner, "value", 99);
  prep.publish();
  setter = candidateSetter;
  setter(2);
  world.useState(owner, "value", 123);
  setter(3);
  same(
    notifications[1].cellIdentity,
    first.cellIdentity,
    "Existing candidate publish changed cell identity",
  );
  same(
    notifications[2].cellIdentity,
    first.cellIdentity,
    "Rerender changed cell identity",
  );
  equal(
    notifications[0].version,
    1,
    "Prior notification version remains immutable",
  );
  equal(
    notifications[1].version,
    2,
    "Candidate-forwarded notification version",
  );
  equal(notifications[2].version, 3, "Next notification version");
  const drained = world.pendingChanges();
  equal(
    "cellIdentity" in drained[0],
    false,
    "Public pendingChanges retains legacy shape",
  );
  equal(
    Object.keys(drained[0]).sort().join(","),
    "owner,site,version",
    "Public pending change fields",
  );
});

Deno.test("new candidate cells get distinct identity only after publication", () => {
  const world = new OwnerStateWorld();
  const existingOwner = world.resolveOwner(null, "identity-old");
  const [, setExisting] = world.useState(existingOwner, "value", 0);
  const notifications: StateChange[] = [];
  world.subscribeChanges((change) => notifications.push(change));
  setExisting(1);
  const oldIdentity = notifications[0].cellIdentity;

  const prep = world.beginPreparation();
  const newOwner = prep.resolveOwner(null, "identity-new");
  const [, setCandidate] = prep.useState(newOwner, "value", 0);
  setCandidate(1);
  equal(notifications.length, 1, "Unpublished candidate emits no notification");
  prep.publish();
  setCandidate(2);
  const freshIdentity = notifications[1].cellIdentity;
  if (!freshIdentity) {
    throw new Error("Published candidate notification omitted identity");
  }
  different(
    freshIdentity,
    oldIdentity,
    "New cell aliased an existing cell identity",
  );
  equal(notifications[1].owner, newOwner, "Published owner notification");
});

Deno.test("discarded candidates emit no identity notification and world destruction cleans state", () => {
  const world = new OwnerStateWorld();
  const owner = world.resolveOwner(null, "identity-discard");
  const notifications: StateChange[] = [];
  world.subscribeChanges((change) => notifications.push(change));
  const prep = world.beginPreparation();
  const [, stagedSet] = prep.useState(owner, "value", 0);
  stagedSet(1);
  prep.discard();
  equal(notifications.length, 0, "Discarded candidate emits no notification");
  equal(
    world.pendingChanges().length,
    0,
    "Discarded candidate leaves no dirty record",
  );

  const [, liveSet] = world.useState(owner, "value", 0);
  liveSet(1);
  const oldIdentity = notifications[0].cellIdentity;
  if (!oldIdentity) throw new Error("Committed notification omitted identity");
  equal(world.destroyOwner(owner), true, "Owner destroyed");
  equal(world.drainChanges().length, 0, "Destroy clears dirty journal");
  let staleSetterThrew = false;
  try {
    liveSet(2);
  } catch {
    staleSetterThrew = true;
  }
  equal(staleSetterThrew, true, "Destroyed owner setter is inactive");
  equal(notifications.length, 1, "Destroyed owner emits no later notification");
});

Deno.test("pending identity records coalesce with legacy records and preserve first order", () => {
  const pending = new PendingStateChanges();
  const identity = {};
  const first = plain(1, "value", 1);
  const other = plain(2, "value", 1);
  const identifiedWrite = identified(1, "value", 2, identity);
  const repeated = identified(1, "value", 3, identity);
  pending.set(first);
  pending.set(other);
  pending.set(identifiedWrite);
  pending.set(repeated);
  equal(pending.size, 2, "Legacy and identified writes coalesce");
  same(
    [...pending.values()][0],
    repeated,
    "Coalescing keeps first slot ordering",
  );
  same([...pending.values()][1], other, "Other owner ordering is stable");
});

Deno.test("identity clearThrough preserves reentrant newer versions", () => {
  const pending = new PendingStateChanges();
  const identity = {};
  const captured = identified(4, "value", 5, identity);
  const reentrant = identified(4, "value", 6, identity);
  pending.set(captured);
  pending.set(reentrant);
  pending.clearThrough([captured]);
  same(
    [...pending.values()][0],
    reentrant,
    "Captured clear removed reentrant update",
  );
  pending.clearThrough([reentrant]);
  equal(pending.size, 0, "Newest captured version clears pending entry");
});

Deno.test("pending identity cache resets on clear and invalidates on owner drop", () => {
  const pending = new PendingStateChanges();
  const identity = {};
  const old = identified(8, "value", 1, identity);
  pending.set(old);
  pending.dropOwner(8);
  equal(pending.size, 0, "dropOwner clears pending entry");
  const afterDrop = identified(8, "value", 2, identity);
  pending.set(afterDrop);
  same(
    [...pending.values()][0],
    afterDrop,
    "Stale identity was not reinserted through a dead key",
  );

  pending.clear();
  equal(pending.size, 0, "clear empties pending queue");
  const afterClear = identified(8, "value", 3, identity);
  pending.set(afterClear);
  same(
    [...pending.values()][0],
    afterClear,
    "Identity cache was not reset on clear",
  );
});
