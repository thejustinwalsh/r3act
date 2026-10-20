import assert from "node:assert/strict";
import { setImmediate } from "node:timers/promises";
import { OwnerStateWorld } from "../src/owner_state_world.ts";

assert.equal(typeof global.gc, "function", "Run Node with --expose-gc");

const world = new OwnerStateWorld();

function retainCommittedSetter() {
  const owner = world.resolveOwner(null, "dead-setter-committed");
  const payload = { bytes: new Uint8Array(4096) };
  const reference = new WeakRef(payload);
  const [, setter] = world.useState(owner, "value", payload);
  let notifications = 0;
  const unsubscribe = world.subscribeChanges(() => { notifications++; });

  world.destroyOwner(owner);
  let actions = 0;
  assert.throws(
    () => setter(() => {
      actions++;
      return { after: true };
    }),
    /not alive/,
    "A committed setter for a destroyed owner must throw",
  );
  assert.equal(actions, 0, "A stale committed setter ran its action");
  assert.equal(notifications, 0, "A stale committed setter notified listeners");
  unsubscribe();

  return { owner, setter, reference, control: new WeakRef({ control: true }) };
}

function retainPublishedCandidateSetter() {
  const preparation = world.beginPreparation();
  const owner = preparation.resolveOwner(null, "dead-setter-candidate");
  const payload = { bytes: new Uint8Array(4096) };
  const reference = new WeakRef(payload);
  const [, setter] = preparation.useState(owner, "value", payload);
  preparation.publish();

  let notifications = 0;
  const unsubscribe = world.subscribeChanges(() => { notifications++; });
  world.destroyOwner(owner);
  let actions = 0;
  assert.throws(
    () => setter(() => {
      actions++;
      return { after: true };
    }),
    /not alive/,
    "A published candidate setter for a destroyed owner must throw",
  );
  assert.equal(actions, 0, "A stale candidate setter ran its action");
  assert.equal(notifications, 0, "A stale candidate setter notified listeners");
  unsubscribe();

  return { owner, setter, reference, control: new WeakRef({ control: true }) };
}

const retainedSetters = [
  retainCommittedSetter(),
  retainPublishedCandidateSetter(),
];

// Keep the world and both stale setter closures reachable throughout repeated
// collections. Never dereference payload WeakRefs until the check is complete.
for (let iteration = 0; iteration < 12; iteration++) {
  await setImmediate();
  global.gc();
}

for (const retained of retainedSetters) {
  assert.equal(retained.control.deref(), undefined, "GC control was not collected");
  assert.equal(
    retained.reference.deref(),
    undefined,
    "A stale setter closure and live world retained destroyed state payload",
  );
  assert.equal(world.isAlive(retained.owner), false);
  assert.throws(() => retained.setter(() => {
    throw new Error("Destroyed setter executed its action after collection");
  }), /not alive/);
}

console.log(
  "PASS: retained committed and published-candidate setters do not retain destroyed state payloads; stale setters throw before actions or notifications. Narrow Node GC check, not general leak or performance proof. A pre-clear negative control should retain the payload through the stale setter's closed-over cell.",
);
