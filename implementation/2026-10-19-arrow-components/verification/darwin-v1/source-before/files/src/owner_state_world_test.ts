import { OwnerStateWorld } from "./owner_state_world.ts";

Deno.test("prepared owner state stays private until accepted publication", () => {
  const world = new OwnerStateWorld();
  const preparation = world.beginPreparation();
  const owner = preparation.resolveOwner(null, "prepared-owner");
  assertEquals(preparation.useState(owner, "value", 3)[0], 3);
  preparation.preparePublication();
  assertEquals(world.isAlive(owner), false);
  preparation.publishAccepted();
  preparation.notifyPublished();
  assertEquals(world.isAlive(owner), true);
  assertEquals(world.useState(owner, "value", 9)[0], 3);
});

Deno.test("posthost owner publication preserves a newer live cell action", () => {
  const world = new OwnerStateWorld();
  const owner = world.resolveOwner(null, "posthost-owner");
  const [, setValue] = world.useState(owner, "value", 1);
  const preparation = world.beginPreparation();
  assertEquals(preparation.useState(owner, "value", 0)[0], 1);
  setValue(2);
  assertEquals(preparation.validate(), false);
  assertEquals(preparation.validatePublicationInputs(), true);
  preparation.preparePublicationAfterHost();
  preparation.publishAccepted();
  assertEquals(world.useState(owner, "value", 0)[0], 2);
  assertEquals(world.version(owner, "value"), 1);
});

const assertEquals = (actual: unknown, expected: unknown, message = "Values differ") => {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(`${message}: expected ${JSON.stringify(expected)}, received ${JSON.stringify(actual)}`);
  }
};
const assertSame = (actual: unknown, expected: unknown, message: string) => {
  if (actual !== expected) throw new Error(message);
};
const assertNotSame = (actual: unknown, expected: unknown, message: string) => {
  if (actual === expected) throw new Error(message);
};

Deno.test("owner/site state survives skipped conditional sites without shifting neighboring state", () => {
  const world = new OwnerStateWorld();
  const root = world.resolveOwner(null, "app-root");
  const panel = world.resolveOwner(root, "panel-callsite");
  let conditionalValue = -1;

  const render = (showConditional: boolean) => {
    if (showConditional) {
      const [value, setValue] = world.useState(panel, "panel.conditional-site", 0);
      conditionalValue = value;
      if (value === 0) setValue(7);
    }
    return world.useState(panel, "panel.trailing-site", "trailing-state")[0];
  };

  assertEquals(render(false), "trailing-state");
  assertEquals(render(true), "trailing-state", "Activating an earlier state site shifted the trailing site");
  assertEquals(conditionalValue, 0, "A new conditional site should begin from its initializer");
  assertEquals(render(false), "trailing-state", "Skipping a state site shifted a later site");
  assertEquals(render(true), "trailing-state");
  assertEquals(conditionalValue, 7, "A skipped state site lost its owner/site value");
});

Deno.test("keyed owner identity is stable through reorder and fresh after destruction", () => {
  const world = new OwnerStateWorld();
  const root = world.resolveOwner(null, "app-root");
  const rowA = world.resolveOwner(root, "row-component", "a");
  const rowB = world.resolveOwner(root, "row-component", "b");
  const [, setA] = world.useState(rowA, "row.selected", false);
  const [, setB] = world.useState(rowB, "row.selected", false);
  setA(true);
  setB(true);

  const reordered = ["b", "a"].map((key) => world.resolveOwner(root, "row-component", key));
  assertEquals(reordered, [rowB, rowA], "Reorder changed owner identity");
  assertEquals(world.useState(rowA, "row.selected", false)[0], true);
  assertEquals(world.useState(rowB, "row.selected", false)[0], true);

  world.destroyOwner(rowB);
  assertEquals(world.isAlive(rowB), false);
  const freshB = world.resolveOwner(root, "row-component", "b");
  assertNotSame(freshB, rowB, "A removed owner ID was reused");
  assertEquals(world.useState(freshB, "row.selected", false)[0], false, "Reinserted key reused removed state");
});

Deno.test("state writes use Object.is, functional updates, and coalesced owner/site change records", () => {
  const world = new OwnerStateWorld();
  const owner = world.resolveOwner(null, "counter");
  const [initial, setCount] = world.useState(owner, "counter.value", 1);
  assertEquals(initial, 1);
  assertEquals(setCount(1), false, "Equal state should not enqueue work");
  assertEquals(setCount((previous) => previous + 1), true);
  assertEquals(setCount((previous) => previous + 1), true);
  assertEquals(world.useState(owner, "counter.value", 999)[0], 3, "Initializer ran again for an existing owner/site");
  assertEquals(world.version(owner, "counter.value"), 2);
  assertEquals(world.drainChanges(), [{ owner, site: "counter.value", version: 2 }]);
  assertEquals(world.drainChanges(), []);
});

Deno.test("destroying an owner recursively removes child traits and queued updates", () => {
  const world = new OwnerStateWorld();
  const root = world.resolveOwner(null, "app-root");
  const parent = world.resolveOwner(root, "parent");
  const child = world.resolveOwner(parent, "child", "row");
  const [, setState] = world.useState(child, "child.value", 0);
  setState(1);

  assertEquals(world.destroyOwner(parent), true);
  assertEquals(world.isAlive(parent), false);
  assertEquals(world.isAlive(child), false);
  assertEquals(world.drainChanges(), [], "Destroyed owner left stale work in the change journal");
  let thrown = false;
  try {
    setState(2);
  } catch {
    thrown = true;
  }
  assertEquals(thrown, true, "A stale setter mutated a destroyed owner");
});
