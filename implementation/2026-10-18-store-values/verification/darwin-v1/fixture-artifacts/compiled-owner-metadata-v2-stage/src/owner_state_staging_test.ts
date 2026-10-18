import { OwnerStateWorld } from "./owner_state_world.ts";
const equal = (actual: unknown, expected: unknown) => {
  if (!Object.is(actual, expected)) {
    throw new Error(`Expected ${expected}, got ${actual}`);
  }
};
const throws = (fn: () => unknown) => {
  let failed = false;
  try {
    fn();
  } catch {
    failed = true;
  }
  if (!failed) throw new Error("Expected rejection");
};
Deno.test("discarding fresh staged incarnation retains old keyed owner state", () => {
  const world = new OwnerStateWorld();
  const parent = world.resolveOwner(null, "parent");
  const old = world.resolveOwner(parent, "Row", "id");
  const [, set] = world.useState(old, "value", 3);
  set(9);
  const staged = world.createStagedOwner(parent, "Row", "id");
  equal(world.findOwner(parent, "Row", "id"), old);
  equal(world.useState(staged, "value", 3)[0], 3);
  world.destroyOwner(staged);
  equal(world.findOwner(parent, "Row", "id"), old);
  equal(world.useState(old, "value", 0)[0], 9);
});
Deno.test("publishing fresh incarnation and retiring old preserves the new slot", () => {
  const world = new OwnerStateWorld();
  const parent = world.resolveOwner(null, "parent");
  const old = world.resolveOwner(parent, "Row", "id");
  const [, setOld] = world.useState(old, "value", 3);
  setOld(9);
  const staged = world.createStagedOwner(parent, "Row", "id");
  world.useState(staged, "value", 3);
  world.activateStagedOwner(staged, old);
  world.destroyOwner(old);
  equal(world.resolveOwner(parent, "Row", "id"), staged);
  equal(world.useState(staged, "value", 0)[0], 3);
  throws(() => setOld(10));
  throws(() => world.activateStagedOwner(staged));
});
Deno.test("staged activation rejects a changed slot without overwriting it", () => {
  const world = new OwnerStateWorld();
  const parent = world.resolveOwner(null, "parent");
  const candidate = world.createStagedOwner(parent, "Row", "id");
  const rival = world.resolveOwner(parent, "Row", "id");
  throws(() => world.activateStagedOwner(candidate));
  equal(world.findOwner(parent, "Row", "id"), rival);
  world.destroyOwner(candidate);
  equal(world.findOwner(parent, "Row", "id"), rival);
});
Deno.test("destroying ancestor releases staged and committed descendants", () => {
  const world = new OwnerStateWorld();
  const parent = world.resolveOwner(null, "parent");
  const old = world.resolveOwner(parent, "Row", "id");
  const staged = world.createStagedOwner(parent, "Row", "id");
  world.destroyOwner(parent);
  equal(world.isAlive(old), false);
  equal(world.isAlive(staged), false);
});
