import assert from "node:assert/strict";
import { setImmediate } from "node:timers/promises";
import { OwnerStateWorld } from "./world.ts";

assert.equal(typeof global.gc, "function", "Run Node with --expose-gc");
const world = new OwnerStateWorld();
function createRemovedCell() {
  const owner = world.resolveOwner(null, "identity-retention");
  const payload = { bytes: new Uint8Array(4096) };
  const reference = new WeakRef(payload);
  const [, setValue] = world.useState(owner, "value", null);
  let identity;
  const unsubscribe = world.subscribeChanges(change => { identity = change.cellIdentity; });
  setValue(payload);
  unsubscribe();
  assert.ok(identity);
  world.destroyOwner(owner);
  return { owner, identity, reference, control: new WeakRef({ control: true }) };
}
const retained = createRemovedCell();
// Keep the world and identity reachable, but never dereference the payload
// between collections: that would keep it alive for the rest of the job.
for (let iteration = 0; iteration < 12; iteration++) {
  await setImmediate();
  global.gc();
}
assert.equal(retained.control.deref(), undefined, "GC control was not collected");
assert.equal(retained.reference.deref(), undefined, "Retained notification identity held destroyed state payload");
assert.equal(world.isAlive(retained.owner), false);
assert.throws(() => world.scalarSourceForChange({ owner: retained.owner, site: "value", version: 1, cellIdentity: retained.identity }));
console.log("PASS: retained notification identity and live world do not retain destroyed cell payload. Narrow Node GC check, not general leak or performance proof.");
