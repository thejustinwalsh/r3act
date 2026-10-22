import {
  canRetireOwnedWorldOwner,
  captureOwnedClosedWorldInputs,
  createClosedWorldCellCut,
  validateClosedWorldCellCut,
  validateCanonicalClosedWorldPhase,
  OwnerStateWorld,
  retireOwnedWorldOwner,
  type OwnedClosedWorldInputCell,
} from "./owner_state_world.ts";

Deno.test("canonical World phase distinguishes public overrides, stale cuts and newer actions", () => {
  const world = new OwnerStateWorld();
  const owner = world.resolveOwner(null, "phase");
  const [, dispatch] = world.useState(owner, "value", 1);
  const cut = createClosedWorldCellCut([capturedCell(world, owner, "value")]);
  if (!cut) throw new Error("World cut declined");
  assertEquals(validateCanonicalClosedWorldPhase(world, cut, "prepared"), "current");
  const original = world.versionForCell;
  world.versionForCell = (...args) => original.call(world, ...args);
  assertEquals(validateCanonicalClosedWorldPhase(world, cut, "prepared"), "public-required");
  delete (world as { versionForCell?: unknown }).versionForCell;
  assertEquals(dispatch(2), true);
  assertEquals(validateCanonicalClosedWorldPhase(world, cut, "prepared"), "stale");
  assertEquals(validateCanonicalClosedWorldPhase(world, cut, "after-host"), "current");
  world.destroyOwner(owner);
  assertEquals(validateCanonicalClosedWorldPhase(world, cut, "after-host"), "stale");
});

Deno.test("canonical World phase audits prototype between phases and avoids Proxy traps", () => {
  const world = new OwnerStateWorld();
  const owner = world.resolveOwner(null, "phase-prototype");
  world.useState(owner, "value", 1);
  const cut = createClosedWorldCellCut([capturedCell(world, owner, "value")]);
  if (!cut) throw new Error("World cut declined");
  const descriptor = Object.getOwnPropertyDescriptor(OwnerStateWorld.prototype, "versionForCell")!;
  try {
    Object.defineProperty(OwnerStateWorld.prototype, "versionForCell", {
      ...descriptor, value() { return null; },
    });
    assertEquals(validateCanonicalClosedWorldPhase(world, cut, "after-host"), "public-required");
  } finally {
    Object.defineProperty(OwnerStateWorld.prototype, "versionForCell", descriptor);
  }
  let traps = 0;
  const proxy = new Proxy(world, { getPrototypeOf() { traps++; throw new Error("trap"); } });
  assertEquals(validateCanonicalClosedWorldPhase(proxy, cut, "prepared"), "public-required");
  assertEquals(traps, 0);
});

Deno.test("canonical World phase preserves subclass public validation", () => {
  let calls = 0;
  class ObservedWorld extends OwnerStateWorld {
    override versionForCell(handle: Parameters<OwnerStateWorld["versionForCell"]>[0]) {
      calls++;
      return super.versionForCell(handle);
    }
  }
  const world = new ObservedWorld();
  const owner = world.resolveOwner(null, "subclass");
  world.useState(owner, "value", 1);
  const cut = createClosedWorldCellCut([capturedCell(world, owner, "value")]);
  if (!cut) throw new Error("World cut declined");
  const before = calls;
  assertEquals(validateCanonicalClosedWorldPhase(world, cut, "prepared"), "public-required");
  assertEquals(calls, before);
  assertEquals(world.versionForCell(capturedCell(world, owner, "value").handle) !== null, true);
  assertEquals(calls > before, true);
});

const capturedCell = (
  world: OwnerStateWorld, owner: number, site: string,
): OwnedClosedWorldInputCell => {
  const handle = world.cellHandle(owner, site);
  if (!handle) throw new Error("Missing cell handle");
  const source = world.scalarSourceForCell(handle);
  const version = world.versionForCell(handle);
  if (!source || version === null) throw new Error("Missing numeric cell");
  return { handle, source, version, value: source.value };
};

Deno.test("closed World cut owns handles and rejects forged receivers before callbacks", () => {
  const world = new OwnerStateWorld();
  const owner = world.resolveOwner(null, "cut");
  world.useState(owner, "value", 1);
  const captured = capturedCell(world, owner, "value");
  const originalHandle = { ...captured.handle };
  const row = { ...captured, handle: originalHandle };
  const cut = createClosedWorldCellCut([row]);
  if (!cut) throw new Error("World cut declined");
  Object.defineProperty(originalHandle, "owner", { get() { throw new Error("handle getter"); } });
  Object.defineProperty(row, "source", { get() { throw new Error("row getter"); } });
  world.scalarSourceForCell = (() => { throw new Error("public source called"); }) as typeof world.scalarSourceForCell;
  world.versionForCell = (() => { throw new Error("public version called"); }) as typeof world.versionForCell;
  assertEquals(validateClosedWorldCellCut(world, cut, "prepared"), true);
  assertEquals(validateClosedWorldCellCut(world, cut, "after-host"), true);
  assertEquals(validateClosedWorldCellCut(world, {} as typeof cut, "prepared"), false);
  let receiverTraps = 0;
  const proxy = new Proxy(world, { getPrototypeOf() { receiverTraps++; throw new Error("receiver trap"); } });
  assertEquals(validateClosedWorldCellCut(proxy, cut, "prepared"), false);
  assertEquals(receiverTraps, 0);
  let handleTraps = 0;
  const hostileHandle = new Proxy(captured.handle, {
    getOwnPropertyDescriptor() { handleTraps++; throw new Error("handle descriptor"); },
  });
  assertEquals(createClosedWorldCellCut([{ ...captured, handle: hostileHandle }]), null);
  assertEquals(handleTraps, 1);
});

Deno.test("closed World cut rechecks cells after all caller normalization", () => {
  const world = new OwnerStateWorld();
  const firstOwner = world.resolveOwner(null, "first");
  const secondOwner = world.resolveOwner(null, "second");
  world.useState(firstOwner, "value", 1);
  world.useState(secondOwner, "value", 2);
  const first = capturedCell(world, firstOwner, "value");
  const second = capturedCell(world, secondOwner, "value");
  let trapCount = 0;
  const later = new Proxy(second, {
    getOwnPropertyDescriptor(target, property) {
      if (property === "handle" && trapCount++ === 0) world.destroyOwner(firstOwner);
      return Reflect.getOwnPropertyDescriptor(target, property);
    },
  });
  const cut = createClosedWorldCellCut([first, later]);
  if (!cut) throw new Error("Normalization declined before validation");
  assertEquals(trapCount, 1);
  assertEquals(validateClosedWorldCellCut(world, cut, "prepared"), false);
  const replacement = world.resolveOwner(null, "first");
  world.useState(replacement, "value", 1);
  assertEquals(validateClosedWorldCellCut(world, cut, "after-host"), false);
});

Deno.test("closed World cut observes source, same-version value and newer action rules", () => {
  const world = new OwnerStateWorld();
  const owner = world.resolveOwner(null, "value");
  const [, dispatch] = world.useState(owner, "value", -0);
  const captured = capturedCell(world, owner, "value");
  const cut = createClosedWorldCellCut([captured]);
  if (!cut) throw new Error("World cut declined");
  assertEquals(validateClosedWorldCellCut(world, cut, "prepared"), true);
  captured.source.value = 0;
  assertEquals(validateClosedWorldCellCut(world, cut, "prepared"), false);
  assertEquals(validateClosedWorldCellCut(world, cut, "after-host"), false);
  captured.source.value = -0;
  assertEquals(dispatch(2), true);
  assertEquals(validateClosedWorldCellCut(world, cut, "prepared"), false);
  assertEquals(validateClosedWorldCellCut(world, cut, "after-host"), true);
  const newer = capturedCell(world, owner, "value");
  const newerCut = createClosedWorldCellCut([newer]);
  if (!newerCut) throw new Error("Newer World cut declined");
  Object.defineProperty(newer.source, "value", {
    configurable: true, get() { throw new Error("source getter"); },
  });
  assertEquals(validateClosedWorldCellCut(world, newerCut, "prepared"), false);
  assertEquals(validateClosedWorldCellCut(world, newerCut, "after-host"), false);
});

Deno.test("closed World cut declines conflicting duplicate captures", () => {
  const world = new OwnerStateWorld();
  const owner = world.resolveOwner(null, "duplicate");
  world.useState(owner, "value", 3);
  const cell = capturedCell(world, owner, "value");
  assertEquals(createClosedWorldCellCut([cell, { ...cell, version: cell.version + 1 }]), null);
  assertEquals(createClosedWorldCellCut([cell, { ...cell, value: 4 }]), null);
  const cut = createClosedWorldCellCut([cell, { ...cell }]);
  if (!cut) throw new Error("Identical duplicate declined");
  assertEquals(validateClosedWorldCellCut(world, cut, "prepared"), true);
});

Deno.test("closed World cut preserves NaN and declines lane-backed uncertainty", () => {
  const world = new OwnerStateWorld();
  const owner = world.resolveOwner(null, "nan");
  world.useState(owner, "value", NaN);
  const nanCut = createClosedWorldCellCut([capturedCell(world, owner, "value")]);
  if (!nanCut) throw new Error("NaN World cut declined");
  assertEquals(validateClosedWorldCellCut(world, nanCut, "prepared"), true);

  const laneOwner = world.resolveOwner(null, "lane");
  const layout = { schemaVersion: 1 as const, slots: [{ siteId: "value", slot: 0 }] };
  world.useState(laneOwner, "value", 1, layout);
  const laneCut = createClosedWorldCellCut([capturedCell(world, laneOwner, "value")]);
  if (!laneCut) throw new Error("Lane cut normalization declined");
  assertEquals(validateClosedWorldCellCut(world, laneCut, "prepared"), false);
  assertEquals(validateClosedWorldCellCut(world, laneCut, "after-host"), false);
});

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
