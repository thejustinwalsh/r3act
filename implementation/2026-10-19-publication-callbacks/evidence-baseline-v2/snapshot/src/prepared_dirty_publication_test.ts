import { OwnerStateWorld } from "./owner_state_world.ts";
import { WorldDirtyJournal, type PreparedDirtyMembership } from "./world_dirty_journal.ts";

const equal = (actual: unknown, expected: unknown, message: string) => {
  if (!Object.is(actual, expected)) throw new Error(`${message}: ${String(actual)} !== ${String(expected)}`);
};
const layout = { schemaVersion: 1 as const, slots: [{ siteId: "value", slot: 0 }] };

Deno.test("candidate rollback and existing-cell publication retain prepared membership", () => {
  const original = WorldDirtyJournal.prototype.prepareMembership;
  const tokens: PreparedDirtyMembership[] = [];
  WorldDirtyJournal.prototype.prepareMembership = function (...args) {
    const token = original.apply(this, args);
    tokens.push(token);
    return token;
  };
  const world = new OwnerStateWorld();
  const owner = world.resolveOwner(null, "prepared-publication.existing");
  let notifications = 0;
  const unsubscribe = world.subscribeChanges(() => notifications++);
  try {
    const [, set] = world.useState<number | string>(owner, "value", 1, layout);
    set(2);
    const liveToken = tokens[0];
    equal(tokens.length, 1, "first committed write prepares once");
    world.clearChangesThrough(world.pendingChanges());
    const preparation = world.beginPreparation();
    const [, candidateSet] = preparation.useState<number | string>(owner, "value", 0, layout);
    const checkpoint = preparation.checkpoint();
    candidateSet("private promotion");
    preparation.rollbackTo(checkpoint);
    preparation.releaseCheckpoint(checkpoint);
    candidateSet(3);
    equal(tokens.length, 1, "private rollback/write prepares no live node");
    equal(world.hasPendingChanges(), false, "candidate remains private");
    equal(world.useState(owner, "value", 0)[0], 2, "live value stays unchanged before publication");
    preparation.publish();
    equal(tokens.length, 1, "publication keeps the live membership");
    equal(tokens[0], liveToken, "original token remains authoritative");
    equal(world.useState(owner, "value", 0)[0], 3, "published candidate value becomes live");
    equal(notifications, 1, "private writes and publish do not notify public listeners");
    equal(world.hasPendingChanges(), true, "publication marks live work");
    world.clearChangesThrough(world.pendingChanges());
    candidateSet(4);
    equal(tokens.length, 1, "published setter reuses live membership");
    equal(notifications, 2, "forwarded committed write notifies once");
    equal(world.useState(owner, "value", 0)[0], 4, "forwarded setter updates live cell");
    world.destroyOwner(owner);
    equal(world.hasPendingChanges(), false, "destroy retires pending membership");
  } finally {
    unsubscribe();
    WorldDirtyJournal.prototype.prepareMembership = original;
  }
});

Deno.test("new private dirty cell obtains membership only at publication", () => {
  const original = WorldDirtyJournal.prototype.prepareMembership;
  const owners: number[] = [];
  WorldDirtyJournal.prototype.prepareMembership = function (owner, site) {
    owners.push(owner);
    return original.call(this, owner, site);
  };
  const world = new OwnerStateWorld();
  try {
    const discarded = world.beginPreparation();
    const discardedOwner = discarded.resolveOwner(null, "prepared-publication.discarded");
    const [, discardedSet] = discarded.useState(discardedOwner, "value", 0, layout);
    discardedSet(1);
    discarded.discard();
    equal(owners.length, 0, "discarded private cell allocates no membership");
    equal(discardedSet(2), false, "discarded setter remains cancelled");
    const preparation = world.beginPreparation();
    const owner = preparation.resolveOwner(null, "prepared-publication.new");
    const [, candidateSet] = preparation.useState(owner, "value", 0, layout);
    candidateSet(5);
    equal(owners.length, 0, "private dirty cell has no committed membership");
    equal(world.isAlive(owner), false, "owner is still private");
    preparation.publish();
    equal(world.isAlive(owner), true, "owner publishes before membership use");
    equal(owners.length, 1, "new committed dirty cell prepares exactly once");
    equal(owners[0], owner, "membership names the published owner");
    equal(world.hasPendingChanges(), true, "new cell publication marks work");
    world.clearChangesThrough(world.pendingChanges());
    candidateSet(6);
    equal(owners.length, 1, "forwarded setter reuses its published token");
    equal(world.useState(owner, "value", 0)[0], 6, "new published setter updates its committed cell");
    world.destroyOwner(owner);
    equal(world.hasPendingChanges(), false, "new-owner cleanup unlinks prepared node");
  } finally {
    WorldDirtyJournal.prototype.prepareMembership = original;
  }
});
