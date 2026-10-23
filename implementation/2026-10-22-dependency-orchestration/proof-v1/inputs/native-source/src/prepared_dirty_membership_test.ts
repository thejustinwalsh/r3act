import { OwnerStateWorld, type StateCellHandle } from "./owner_state_world.ts";
import { WorldDirtyJournal } from "./world_dirty_journal.ts";
import type { CompiledStateLayout } from "./compiled_state_layout.ts";

const numericLayout: CompiledStateLayout = Object.freeze({
  schemaVersion: 1,
  slots: Object.freeze([Object.freeze({ siteId: "value", slot: 0 })]),
});

const assert: (condition: unknown, message: string) => asserts condition = (
  condition,
  message,
) => {
  if (!condition) throw new Error(message);
};

const assertEntries = (
  journal: WorldDirtyJournal,
  expected: readonly (readonly [number, string])[],
  label: string,
) => {
  const actual = [...journal.entries()];
  assert(actual.length === expected.length, `${label}: entry count`);
  for (let index = 0; index < expected.length; index++) {
    assert(actual[index][0] === expected[index][0], `${label}: owner ${index}`);
    assert(actual[index][1] === expected[index][1], `${label}: site ${index}`);
  }
};

Deno.test("prepared dirty nodes preserve ordering and reject foreign/stale tokens", () => {
  const first = new WorldDirtyJournal();
  const second = new WorldDirtyJournal();
  const firstA = first.prepareMembership(1, "a");
  const firstB = first.prepareMembership(1, "b");
  const secondX = first.prepareMembership(2, "x");

  assert(
    Reflect.ownKeys(firstA).length === 0,
    "token exposes internal payload",
  );
  assert(first.markPrepared(firstA), "current prepared mark was rejected");
  assert(first.markPrepared(secondX), "second prepared mark was rejected");
  assert(first.markPrepared(firstB), "third prepared mark was rejected");
  assert(!second.markPrepared(firstA), "foreign journal accepted a token");
  assertEntries(first, [[1, "a"], [1, "b"], [2, "x"]], "owner-major");

  assert(first.deletePrepared(firstA), "prepared delete was rejected");
  assert(first.markPrepared(firstA), "prepared reactivation was rejected");
  assertEntries(first, [[1, "b"], [1, "a"], [2, "x"]], "site reactivation");

  first.clear();
  assert(first.markPrepared(secondX), "clear invalidated a reusable token");
  assert(first.markPrepared(firstA), "clear invalidated a reusable node");
  assertEntries(first, [[2, "x"], [1, "a"]], "post-clear order");

  first.removeOwner(1);
  assert(!first.markPrepared(firstA), "removed owner's token was accepted");
  assert(!first.deletePrepared(firstA), "removed owner's token deleted work");
  assertEntries(first, [[2, "x"]], "removed owner leaves no linked siblings");

  const malformed = new Proxy({}, {
    getPrototypeOf() {
      throw new Error("untrusted proxy trap");
    },
  });
  assert(
    !first.markPrepared(malformed as never),
    "malformed token should decline without throwing",
  );
  assert(
    !first.deletePrepared({} as never),
    "forged tuple-shaped object should decline",
  );
});

Deno.test("World native acknowledgement uses the exact prepared owner/site node", () => {
  const world = new OwnerStateWorld();
  const owner = world.resolveOwner(null, "fixture.prepared-dirty");
  const [, set] = world.useState(owner, "value", 0);
  let handle: StateCellHandle | undefined;
  const unsubscribe = world.subscribeDirtyCells((next) => handle = next);
  try {
    assert(set(1), "first committed write was ignored");
    const capturedHandle = handle;
    assert(capturedHandle, "dispatch did not publish its stable handle");
    const capturedVersion = world.versionForCell(capturedHandle);
    assert(capturedVersion === 1, "exact committed version was not resolved");

    assert(set(2), "reentrant/newer committed write was ignored");
    world.clearCellChangesThrough([capturedHandle], [capturedVersion], 1);
    assert(
      world.hasPendingChanges(),
      "old acknowledgement erased a newer write",
    );

    const latestVersion = world.versionForCell(capturedHandle);
    assert(latestVersion === 2, "latest exact version was not resolved");
    world.clearCellChangesThrough([capturedHandle], [latestVersion], 1);
    assert(
      !world.hasPendingChanges(),
      "current acknowledgement left dirty work",
    );

    assert(set(3), "write after acknowledgement was ignored");
    assert(world.hasPendingChanges(), "acknowledged node did not reactivate");
    world.destroyOwner(owner);
    assert(
      world.versionForCell(capturedHandle) === null,
      "dead handle resolved",
    );
    assert(
      !world.hasPendingChanges(),
      "destroy retained the owner's journal node",
    );
  } finally {
    unsubscribe();
  }
});

Deno.test("captured acknowledgement preserves future-version and row-reuse semantics", () => {
  const world = new OwnerStateWorld();
  const oldOwner = world.resolveOwner(null, "fixture.prepared-row", "old");
  const [, oldSet] = world.useState(oldOwner, "value", 1, numericLayout);
  let oldHandle: StateCellHandle | undefined;
  const unsubscribe = world.subscribeDirtyCells((handle) => oldHandle = handle);
  try {
    assert(oldSet(2), "old owner write was ignored");
    assert(oldHandle, "old owner did not publish a handle");
    const oldLane = world.numericLane(oldOwner, "value");
    assert(oldLane, "old owner did not receive its numeric row");
    unsubscribe();
    world.destroyOwner(oldOwner);

    const newOwner = world.resolveOwner(null, "fixture.prepared-row", "new");
    const [, newSet] = world.useState(newOwner, "value", 3, numericLayout);
    assert(newSet(4), "replacement owner write was ignored");
    const newLane = world.numericLane(newOwner, "value");
    assert(newLane, "replacement owner did not receive its numeric row");
    assert(
      newLane.row === oldLane.row,
      "fixture did not reuse the retired row",
    );
    assert(
      newLane.generation !== oldLane.generation,
      "reused row did not advance its generation",
    );

    world.clearCellChangesThrough([oldHandle], [Number.MAX_SAFE_INTEGER], 1);
    assert(
      world.hasPendingChanges(),
      "a dead handle cleared a new owner's reused row membership",
    );

    let newHandle: StateCellHandle | undefined;
    const unsubscribeNew = world.subscribeDirtyCells((handle) =>
      newHandle = handle
    );
    try {
      assert(newSet(5), "new owner follow-up write was ignored");
      assert(newHandle, "new owner did not publish a handle");
      // Captured versions are upper bounds; a future cut has historically
      // acknowledged the current version and remains accepted.
      world.clearCellChangesThrough(
        [newHandle],
        [Number.MAX_SAFE_INTEGER],
        1,
      );
      assert(
        !world.hasPendingChanges(),
        "future captured version no longer acknowledges current work",
      );
    } finally {
      unsubscribeNew();
    }
  } finally {
    unsubscribe();
  }
});

Deno.test("updaters that destroy their owner cannot dirty a dead cell", () => {
  {
    const world = new OwnerStateWorld();
    const owner = world.resolveOwner(null, "fixture.destroy-in-updater.first");
    const [, set] = world.useState(owner, "value", 0);
    let notifications = 0;
    const unsubscribe = world.subscribeDirtyCells(() => notifications++);
    try {
      const accepted = set((previous) => {
        world.destroyOwner(owner);
        return previous + 1;
      });
      assert(!accepted, "destroyed first-write updater was accepted");
      assert(!world.hasPendingChanges(), "dead first write left dirty work");
      assert(notifications === 0, "dead first write notified listeners");
    } finally {
      unsubscribe();
    }
  }

  {
    const world = new OwnerStateWorld();
    const owner = world.resolveOwner(
      null,
      "fixture.destroy-in-updater.identified",
    );
    const [, set] = world.useState(owner, "value", 0);
    let handle: StateCellHandle | undefined;
    let notifications = 0;
    const unsubscribeHandle = world.subscribeDirtyCells((next) =>
      handle = next
    );
    const unsubscribeCount = world.subscribeDirtyCells(() => notifications++);
    try {
      assert(set(1), "setup write was ignored");
      assert(handle, "setup write did not install its identity");
      const version = world.versionForCell(handle);
      assert(version !== null, "setup identity did not resolve");
      world.clearCellChangesThrough([handle], [version], 1);
      assert(!world.hasPendingChanges(), "setup acknowledgement failed");
      notifications = 0;

      const accepted = set((previous) => {
        world.destroyOwner(owner);
        return previous + 1;
      });
      assert(!accepted, "destroyed identified updater was accepted");
      assert(
        !world.hasPendingChanges(),
        "dead identified update left dirty work",
      );
      assert(notifications === 0, "dead identified update notified listeners");
      assert(
        world.versionForCell(handle) === null,
        "destroyed cell identity remained live",
      );
    } finally {
      unsubscribeHandle();
      unsubscribeCount();
    }
  }
});

Deno.test("destroying an updater owner before numeric row reuse cannot touch the replacement", () => {
  const world = new OwnerStateWorld();
  const oldOwner = world.resolveOwner(
    null,
    "fixture.destroy-in-updater.row",
    "old",
  );
  const [, oldSet] = world.useState(oldOwner, "value", 1, numericLayout);
  const oldLane = world.numericLane(oldOwner, "value");
  assert(oldLane, "old owner did not receive a numeric row");
  let notifications = 0;
  const unsubscribe = world.subscribeDirtyCells(() => notifications++);
  try {
    const accepted = oldSet((previous) => {
      world.destroyOwner(oldOwner);
      const replacement = world.resolveOwner(
        null,
        "fixture.destroy-in-updater.row",
        "new",
      );
      world.useState(replacement, "value", 41, numericLayout);
      return previous + 1;
    });
    assert(!accepted, "updater write after owner destruction was accepted");

    const replacement = world.resolveOwner(
      null,
      "fixture.destroy-in-updater.row",
      "new",
    );
    const replacementLane = world.numericLane(replacement, "value");
    assert(replacementLane, "replacement owner did not receive a row");
    assert(
      replacementLane.row === oldLane.row,
      "test did not reuse the retired row",
    );
    assert(
      replacementLane.generation !== oldLane.generation,
      "replacement row generation did not advance",
    );
    assert(
      replacementLane.column.values[replacementLane.row] === 41,
      "dead updater overwrote the replacement numeric value",
    );
    assert(!world.hasPendingChanges(), "dead updater left dirty membership");
    assert(notifications === 0, "dead updater notified listeners");
  } finally {
    unsubscribe();
  }
});

Deno.test("private candidate writes never borrow or activate a committed journal node", () => {
  const world = new OwnerStateWorld();
  const owner = world.resolveOwner(null, "fixture.prepared-private");
  const [, set] = world.useState(owner, "value", 1);
  let handle: StateCellHandle | undefined;
  const unsubscribe = world.subscribeDirtyCells((next) => handle = next);
  assert(set(2), "setup write was ignored");
  assert(handle, "setup dispatch did not expose its handle");
  const version = world.versionForCell(handle);
  assert(version !== null, "setup handle did not resolve");
  world.clearCellChangesThrough(
    [handle],
    [version],
    1,
  );
  assert(!world.hasPendingChanges(), "setup acknowledgement failed");

  let notifications = 0;
  const unsubscribeNotifications = world.subscribeDirtyCells(() =>
    notifications++
  );
  const preparation = world.beginPreparation();
  try {
    const [, candidateSet] = preparation.useState(owner, "value", 1);
    assert(candidateSet(3), "private candidate write was ignored");
    assert(
      !world.hasPendingChanges(),
      "private write activated live membership",
    );
    assert(notifications === 0, "private write notified committed listeners");
    preparation.discard();
    assert(!world.hasPendingChanges(), "discard leaked candidate dirtiness");
    assert(notifications === 0, "discard notified committed listeners");
  } finally {
    unsubscribe();
    unsubscribeNotifications();
  }
});
