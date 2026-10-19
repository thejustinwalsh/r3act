import { OwnerStateWorld, type StateCellHandle } from "./owner_state_world.ts";
import { WorldDirtyJournal } from "./world_dirty_journal.ts";

const equal = (actual: unknown, expected: unknown, message: string) => {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(`${message}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
};

Deno.test("World acknowledgement uses direct membership and preserves listener reentry", () => {
  const world = new OwnerStateWorld();
  const owner = world.resolveOwner(null, "journal-listener");
  const [, setValue] = world.useState(owner, "value", 0);
  const unsubscribe = world.subscribeChanges((change) => {
    if (change.version !== 1) return;
    const cut = world.pendingChanges();
    equal(cut, [{ owner, site: "value", version: 1 }], "work is visible before listeners");
    setValue(2);
    world.clearChangesThrough(cut);
  });
  try {
    setValue(1);
    equal(world.pendingChanges(), [{ owner, site: "value", version: 2 }], "listener's newer write survives the old cut");
    const cut = world.pendingChanges();
    const originalEntries = WorldDirtyJournal.prototype.entries;
    WorldDirtyJournal.prototype.entries = () => {
      throw new Error("Acknowledgement must not scan journal entries");
    };
    try {
      world.clearChangesThrough(cut);
    } finally {
      WorldDirtyJournal.prototype.entries = originalEntries;
    }
    equal(world.hasPendingChanges(), false, "direct acknowledgement clears current work");
  } finally {
    unsubscribe();
    world.destroyOwner(owner);
  }
});

Deno.test("World journal preserves owner-major and site activation order", () => {
  const world = new OwnerStateWorld();
  const first = world.resolveOwner(null, "journal-first");
  const second = world.resolveOwner(null, "journal-second");
  const [, setFirstA] = world.useState(first, "a", 0);
  const [, setFirstB] = world.useState(first, "b", 0);
  const [, setSecondA] = world.useState(second, "a", 0);

  setFirstA(1);
  setSecondA(1);
  setFirstB(1);
  setFirstA(2);
  equal(world.pendingChanges(), [
    { owner: first, site: "a", version: 2 },
    { owner: first, site: "b", version: 1 },
    { owner: second, site: "a", version: 1 },
  ], "repeated writes preserve the active owner/site order");

  world.clearChangesThrough([{ owner: first, site: "a", version: 2 }]);
  setFirstA(3);
  equal(world.pendingChanges().map(({ owner, site }) => [owner, site]), [
    [first, "b"],
    [first, "a"],
    [second, "a"],
  ], "a clean site re-enters at its owner tail");

  world.clearChangesThrough([
    { owner: first, site: "a", version: 3 },
    { owner: first, site: "b", version: 1 },
  ]);
  setFirstB(2);
  equal(world.pendingChanges().map(({ owner, site }) => [owner, site]), [
    [second, "a"],
    [first, "b"],
  ], "an emptied owner re-enters at the owner tail");
});

Deno.test("captured versions and native handles retain newer World writes", () => {
  const world = new OwnerStateWorld();
  const owner = world.resolveOwner(null, "journal-versions");
  const [, setValue] = world.useState(owner, "value", 0);
  let handle: StateCellHandle | undefined;
  const unsubscribe = world.subscribeDirtyCells((next) => handle = next);
  try {
    setValue(1);
    const captured = world.pendingChanges();
    const capturedHandle = handle!;
    const capturedVersion = captured[0].version;
    setValue(2);
    world.clearChangesThrough(captured);
    equal(world.pendingChanges(), [{ owner, site: "value", version: 2 }], "newer legacy cut survives");

    const oldHandles: (StateCellHandle | undefined)[] = [capturedHandle];
    const oldVersions = [capturedVersion];
    world.clearCellChangesThrough(oldHandles, oldVersions, 1);
    equal(world.pendingChanges(), [{ owner, site: "value", version: 2 }], "newer native cut survives");

    const currentHandle = handle!;
    const currentVersion = world.version(owner, "value");
    world.clearCellChangesThrough([currentHandle], [currentVersion], 1);
    equal(world.hasPendingChanges(), false, "exact current native cut clears the active entry");
  } finally {
    unsubscribe();
  }
});

Deno.test("private preparation discard is isolated and publish installs matching work", () => {
  const world = new OwnerStateWorld();
  const root = world.resolveOwner(null, "journal-preparation-root");
  const existing = world.resolveOwner(root, "existing");
  const [, setExisting] = world.useState(existing, "value", 0);
  setExisting(1);
  const before = world.pendingChanges();

  const discarded = world.beginPreparation();
  const [, setExistingPrivate] = discarded.useState(existing, "value", 0);
  setExistingPrivate(2);
  const privateOwner = discarded.resolveOwner(root, "private-child");
  const [, setPrivate] = discarded.useState(privateOwner, "value", 0);
  setPrivate(4);
  equal(world.pendingChanges(), before, "private writes do not enter committed journal");
  discarded.discard();
  equal(world.pendingChanges(), before, "discard leaves committed journal untouched");

  const published = world.beginPreparation();
  const [, setExistingCandidate] = published.useState(existing, "value", 0);
  setExistingCandidate(3);
  const publishedOwner = published.resolveOwner(root, "published-child");
  const [, setPublishedPrivate] = published.useState(publishedOwner, "value", 0);
  setPublishedPrivate(5);
  published.publish();
  equal(world.pendingChanges(), [
    { owner: existing, site: "value", version: 2 },
    { owner: publishedOwner, site: "value", version: 1 },
  ], "publish marks changed existing and nonzero private cells in candidate order");
});

Deno.test("owner replacement and removal affect only the exact owner incarnation", () => {
  const world = new OwnerStateWorld();
  const root = world.resolveOwner(null, "journal-replacement-root");
  const oldOwner = world.resolveOwner(root, "row", "key");
  const [, setOld] = world.useState(oldOwner, "value", 0);
  setOld(1);

  const preparation = world.beginPreparation();
  const replacement = preparation.replaceOwner(root, "row", "key");
  const [, setReplacement] = preparation.useState(replacement, "value", 0);
  setReplacement(7);
  preparation.publish();
  equal(world.findOwner(root, "row", "key"), replacement, "new incarnation owns the published slot");
  equal(world.pendingChanges().map(({ owner, version }) => [owner, version]), [
    [oldOwner, 1],
    [replacement, 1],
  ], "new publication does not overwrite old incarnation's pending work");

  world.destroyOwner(oldOwner);
  equal(world.pendingChanges(), [{ owner: replacement, site: "value", version: 1 }], "old owner removal preserves replacement work");
  world.destroyOwner(root);
  equal(world.pendingChanges(), [], "recursive owner removal clears remaining journal entries");
});
