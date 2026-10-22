import {
  canRetireOwnedWorldOwner,
  captureOwnedClosedWorldInputs,
  OwnerStateWorld,
  retireOwnedWorldOwner,
} from "./owner_state_world.ts";

Deno.test("owned World retirement bypasses subclass recursion while public destruction observes it", () => {
  const observed: number[] = [];
  class ObservedWorld extends OwnerStateWorld {
    override destroyOwner(owner: number): boolean {
      observed.push(owner);
      return super.destroyOwner(owner);
    }
  }
  const publicWorld = new ObservedWorld();
  const publicParent = publicWorld.resolveOwner(null, "public-parent");
  const publicChild = publicWorld.resolveOwner(publicParent, "public-child");
  assertEquals(publicWorld.destroyOwner(publicParent), true);
  assertEquals(observed, [publicParent, publicChild]);

  observed.length = 0;
  const world = new ObservedWorld();
  const parent = world.resolveOwner(null, "owned-parent");
  const child = world.resolveOwner(parent, "owned-child");
  const [, setParent] = world.useState(parent, "parent-value", 1);
  const [, setChild] = world.useState(child, "child-value", 2);
  setParent(3);
  setChild(4);
  const parentHandle = world.cellHandle(parent, "parent-value")!;
  const childHandle = world.cellHandle(child, "child-value")!;
  assertEquals(canRetireOwnedWorldOwner(world, parent), true);
  assertEquals(retireOwnedWorldOwner(world, parent), true);
  assertEquals(observed, []);
  assertEquals(world.isAlive(parent), false);
  assertEquals(world.isAlive(child), false);
  assertEquals(world.versionForCell(parentHandle), null);
  assertEquals(world.versionForCell(childHandle), null);
  assertEquals(world.scalarSourceForCell(childHandle), null);
  assertEquals(world.pendingChanges(), []);
  assertEquals(retireOwnedWorldOwner(world, parent), false);
});

Deno.test("owned World retirement rejects lane descendants and Proxy receivers without mutation", () => {
  const world = new OwnerStateWorld();
  const parent = world.resolveOwner(null, "lane-parent");
  const child = world.resolveOwner(parent, "lane-child");
  const layout = {
    schemaVersion: 1 as const,
    slots: [{ siteId: "value", slot: 0 }],
  };
  const [, setValue] = world.useState(child, "value", 1, layout);
  setValue(2);
  assertEquals(world.numericLane(child, "value") !== null, true);
  assertEquals(canRetireOwnedWorldOwner(world, parent), false);
  assertEquals(retireOwnedWorldOwner(world, parent), false);
  assertEquals(world.isAlive(parent), true);
  assertEquals(world.isAlive(child), true);
  assertEquals(world.pendingChanges().length, 1);

  let traps = 0;
  const proxy = new Proxy(world, {
    getPrototypeOf() {
      traps++;
      throw new Error("receiver reflected");
    },
  });
  assertEquals(canRetireOwnedWorldOwner(proxy, parent), false);
  assertEquals(retireOwnedWorldOwner(proxy, parent), false);
  assertEquals(OwnerStateWorld._retireOwnedOwner(
    Symbol("forged"), proxy, parent,
  ), false);
  assertEquals(traps, 0);
});

Deno.test("owned World capture retains exact cell and lineage and declines overrides", () => {
  const world = new OwnerStateWorld();
  const root = world.resolveOwner(null, "capture-root");
  const child = world.resolveOwner(root, "capture-child");
  const [, dispatch] = world.useState(child, "position", 3);
  const first = captureOwnedClosedWorldInputs(world, [
    { owner: child, sites: ["position"] },
  ]);
  if (!first) throw new Error("canonical World capture declined");
  assertEquals(first[0].lineage, [child, root]);
  assertEquals(first[0].cells[0].value, 3);
  assertSame(first[0].cells[0].handle, world.cellHandle(child, "position"),
    "passive capture must reuse the committed cell handle");
  dispatch(5);
  const second = captureOwnedClosedWorldInputs(world, [
    { owner: child, sites: ["position"] },
  ]);
  if (!second) throw new Error("updated World capture declined");
  assertEquals(second[0].cells[0].value, 5);
  assertEquals(second[0].cells[0].version, first[0].cells[0].version + 1);
  world.cellHandle = (() => { throw new Error("override observed"); }) as typeof world.cellHandle;
  assertEquals(captureOwnedClosedWorldInputs(world, [
    { owner: child, sites: ["position"] },
  ]), null);
  assertEquals(captureOwnedClosedWorldInputs(new Proxy(world, {}), [
    { owner: child, sites: ["position"] },
  ]), null);
});

Deno.test("direct World capture entry cannot inspect caller requests", () => {
  const world = new OwnerStateWorld();
  let traps = 0;
  const requests = new Proxy([] as { owner: number; sites: string[] }[], {
    get() {
      traps++;
      throw new Error("caller request was inspected");
    },
  });
  assertEquals(OwnerStateWorld._captureOwnedClosedInputs(
    Symbol("forged"), world, requests,
  ), null);
  assertEquals(traps, 0);
});

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
