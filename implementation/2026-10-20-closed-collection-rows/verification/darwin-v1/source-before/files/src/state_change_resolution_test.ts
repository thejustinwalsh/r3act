import { OwnerStateWorld, type StateChange } from "./owner_state_world.ts";

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
const throws = (run: () => unknown, label: string) => {
  let didThrow = false;
  try {
    run();
  } catch {
    didThrow = true;
  }
  equal(didThrow, true, label);
};

Deno.test("change resolution follows the canonical cell through existing candidate publish", () => {
  const world = new OwnerStateWorld();
  const owner = world.resolveOwner(null, "resolve-existing");
  let [, setValue] = world.useState(owner, "value", 1);
  const changes: StateChange[] = [];
  world.subscribeChanges((change) => changes.push(change));
  setValue(2);
  const first = changes[0];
  const originalSource = world.scalarSource(owner, "value");
  same(
    world.scalarSourceForChange(first),
    originalSource,
    "Initial identity resolves canonical source",
  );
  equal(
    world.versionForChange(first),
    1,
    "Initial identity resolves canonical version",
  );

  const preparation = world.beginPreparation();
  const [, candidateSetter] = preparation.useState(owner, "value", 100);
  candidateSetter(3);
  preparation.publish();
  setValue = candidateSetter;
  setValue(4);

  same(
    changes[1].cellIdentity,
    first.cellIdentity,
    "Existing publish preserves cell identity",
  );
  same(
    world.scalarSourceForChange(changes[1]),
    originalSource,
    "Existing publish preserves canonical source",
  );
  equal(
    world.versionForChange(first),
    3,
    "Captured change resolves the current cell version",
  );
  equal(
    world.versionForChange(changes[1]),
    3,
    "New change resolves current version",
  );
  equal(
    world.scalarSourceForChange(first)?.value,
    4,
    "Canonical source follows published writes",
  );
});

Deno.test("new candidate cell registers identity on its first committed dispatch", () => {
  const world = new OwnerStateWorld();
  const preparation = world.beginPreparation();
  const owner = preparation.resolveOwner(null, "resolve-new");
  const [, candidateSetter] = preparation.useState(owner, "value", 0);
  candidateSetter(1);
  preparation.publish();
  const changes: StateChange[] = [];
  world.subscribeChanges((change) => changes.push(change));
  candidateSetter(2);

  equal(
    changes.length,
    1,
    "Published candidate dispatch emits one committed change",
  );
  same(
    world.scalarSourceForChange(changes[0]),
    world.scalarSource(owner, "value"),
    "New identity resolves published cell source",
  );
  equal(
    world.versionForChange(changes[0]),
    2,
    "New identity resolves published version",
  );
});

Deno.test("foreign and misaddressed identities fall back to owner/site APIs", () => {
  const world = new OwnerStateWorld();
  const firstOwner = world.resolveOwner(null, "resolve-foreign-a");
  const secondOwner = world.resolveOwner(null, "resolve-foreign-b");
  const [, setFirst] = world.useState(firstOwner, "value", 10);
  const [, setSecond] = world.useState(secondOwner, "value", 20);
  const changes: StateChange[] = [];
  world.subscribeChanges((change) => changes.push(change));
  setFirst(11);
  setSecond(21);

  const foreign: StateChange = {
    owner: secondOwner,
    site: "value",
    version: 0,
    cellIdentity: {},
  };
  same(
    world.scalarSourceForChange(foreign),
    world.scalarSource(secondOwner, "value"),
    "Foreign identity uses addressed source",
  );
  equal(
    world.versionForChange(foreign),
    1,
    "Foreign identity uses addressed version",
  );

  const misaddressed: StateChange = {
    ...changes[0],
    owner: secondOwner,
  };
  same(
    world.scalarSourceForChange(misaddressed),
    world.scalarSource(secondOwner, "value"),
    "Address mismatch uses addressed source",
  );
  equal(
    world.versionForChange(misaddressed),
    1,
    "Address mismatch uses addressed version",
  );
});

Deno.test("identity resolution preserves destroyed-owner failure semantics", () => {
  const world = new OwnerStateWorld();
  const owner = world.resolveOwner(null, "resolve-destroyed");
  const [, setValue] = world.useState(owner, "value", 0);
  const changes: StateChange[] = [];
  world.subscribeChanges((change) => changes.push(change));
  setValue(1);
  const change = changes[0];
  world.destroyOwner(owner);
  throws(
    () => world.scalarSourceForChange(change),
    "Destroyed identity source lookup throws",
  );
  throws(
    () => world.versionForChange(change),
    "Destroyed identity version lookup throws",
  );
});

Deno.test("identity source resolution follows nonnumeric promotions", () => {
  const world = new OwnerStateWorld();
  const owner = world.resolveOwner(null, "resolve-promotion");
  const [, setValue] = world.useState<unknown>(owner, "value", "initial");
  const changes: StateChange[] = [];
  world.subscribeChanges((change) => changes.push(change));
  setValue("text");
  const textChange = changes[0];
  equal(
    world.scalarSourceForChange(textChange),
    null,
    "Nonnumeric committed cell has no scalar source",
  );
  setValue(7);
  same(
    changes[1].cellIdentity,
    textChange.cellIdentity,
    "Promotion keeps cell identity",
  );
  same(
    world.scalarSourceForChange(textChange),
    world.scalarSource(owner, "value"),
    "Captured identity resolves promoted source",
  );
  equal(
    world.scalarSourceForChange(textChange)?.value,
    7,
    "Promoted source has current numeric value",
  );
  setValue("again");
  equal(
    world.scalarSourceForChange(changes[2]),
    null,
    "Demotion removes scalar source availability",
  );
});

Deno.test("clearing a captured change preserves a reentrant newer write", () => {
  const world = new OwnerStateWorld();
  const owner = world.resolveOwner(null, "resolve-reentrant");
  const [, setValue] = world.useState(owner, "value", 0);
  let nested = false;
  const changes: StateChange[] = [];
  world.subscribeChanges((change) => {
    changes.push(change);
    if (!nested) {
      nested = true;
      setValue(2);
    }
  });
  setValue(1);

  equal(changes.length, 2, "Listener receives nested write");
  same(
    changes[0].cellIdentity,
    changes[1].cellIdentity,
    "Reentrant writes share committed identity",
  );
  world.clearChangesThrough([changes[0]]);
  const pending = world.pendingChanges();
  equal(pending.length, 1, "Newer write remains pending");
  equal(pending[0].version, 2, "Pending record retains newer version");
  equal(
    "cellIdentity" in pending[0],
    false,
    "Public pending changes keep plain shape",
  );
});
