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
  try {
    run();
  } catch {
    return;
  }
  throw new Error(label);
};

Deno.test("native dirty channel uses stable payload-free handles only for committed changes", () => {
  const world = new OwnerStateWorld();
  const owner = world.resolveOwner(null, "native-dirty");
  const [, setValue] = world.useState(owner, "value", 1);
  const notifications: Array<{ handle: object; version: number }> = [];
  world.subscribeDirtyCells((handle, version) =>
    notifications.push({ handle, version })
  );

  equal(setValue(1), false, "Object.is no-op is rejected");
  equal(notifications.length, 0, "No-op has no native notification");
  equal(setValue(2), true, "Changed value commits");
  equal(setValue(3), true, "Second changed value commits");
  equal(
    notifications.length,
    2,
    "Each committed change notifies native listeners",
  );
  equal(notifications[0].version, 1, "First captured version");
  equal(notifications[1].version, 2, "Second captured version");
  same(
    notifications[0].handle,
    notifications[1].handle,
    "Cell handle is stable",
  );
  const handle = notifications[0].handle as {
    owner: number;
    site: string;
    cellIdentity: object;
  };
  equal(handle.owner, owner, "Handle carries owner address");
  equal(handle.site, "value", "Handle carries site address");
  equal(Object.isFrozen(handle), true, "Handle cannot be mutated at runtime");
  equal("value" in handle, false, "Handle exposes no state payload");
});

Deno.test("native notifications precede public observers and preserve captured versions across reentry", () => {
  const world = new OwnerStateWorld();
  const owner = world.resolveOwner(null, "native-reentry");
  const [, setValue] = world.useState(owner, "value", 0);
  const order: string[] = [];
  const nativeVersions: number[] = [];
  const publicChanges: StateChange[] = [];
  let reentered = false;
  world.subscribeDirtyCells((_handle, version) => {
    order.push(`native:${version}`);
    nativeVersions.push(version);
    if (!reentered) {
      reentered = true;
      setValue(2);
    }
  });
  world.subscribeChanges((change) => {
    order.push(`public:${change.version}`);
    publicChanges.push(change);
  });

  setValue(1);
  equal(
    order.join(","),
    "native:1,native:2,public:2,public:1",
    "Nested dispatch completes before outer public delivery",
  );
  equal(
    nativeVersions.join(","),
    "1,2",
    "Native callbacks receive captured versions",
  );
  equal(
    publicChanges[0].version,
    2,
    "Nested public record keeps its own version",
  );
  equal(
    publicChanges[1].version,
    1,
    "Outer public record retains captured version",
  );
  equal(
    publicChanges[0] === publicChanges[1],
    false,
    "Public records are freshly allocated",
  );
});

Deno.test("native and public listener snapshots are copy-on-write during dispatch", () => {
  const world = new OwnerStateWorld();
  const owner = world.resolveOwner(null, "native-snapshot");
  const [, setValue] = world.useState(owner, "value", 0);
  const calls: string[] = [];
  let removeNativeB = () => {};
  let removePublicB = () => {};
  const nativeB = () => calls.push("native-b");
  const publicB = () => calls.push("public-b");
  world.subscribeDirtyCells(() => {
    calls.push("native-a");
    removeNativeB();
    world.subscribeDirtyCells(() => calls.push("native-c"));
  });
  removeNativeB = world.subscribeDirtyCells(nativeB);
  world.subscribeChanges(() => {
    calls.push("public-a");
    removePublicB();
    world.subscribeChanges(() => calls.push("public-c"));
  });
  removePublicB = world.subscribeChanges(publicB);

  setValue(1);
  equal(
    calls.join(","),
    "native-a,native-b,public-a,public-b",
    "Mutations use the captured listener snapshots",
  );
  calls.length = 0;
  setValue(2);
  equal(
    calls.join(","),
    "native-a,native-c,public-a,public-c",
    "Copy-on-write mutations take effect next dispatch",
  );
});

Deno.test("public listener-free writes avoid public notifications while pending changes stay plain", () => {
  const world = new OwnerStateWorld();
  const owner = world.resolveOwner(null, "native-no-public");
  const [, setValue] = world.useState(owner, "value", 0);
  const nativeVersions: number[] = [];
  world.subscribeDirtyCells((_handle, version) => nativeVersions.push(version));
  setValue(1);
  const [pending] = world.pendingChanges();
  equal(nativeVersions.join(","), "1", "Native channel still receives writes");
  equal(
    "cellIdentity" in pending,
    false,
    "Public pending record retains its legacy plain shape",
  );
});

Deno.test("destroyed setters fail before evaluating actions and release cell payload fields", () => {
  const world = new OwnerStateWorld();
  const owner = world.resolveOwner(null, "native-dead-setter");
  const payload = { large: [1, 2, 3] };
  const [, setValue] = world.useState(owner, "value", payload);
  let actionRan = false;
  world.destroyOwner(owner);
  throws(() =>
    setValue((previous) => {
      actionRan = true;
      return previous;
    }), "Dead setter throws");
  equal(actionRan, false, "Dead setter does not read or invoke the action");
  equal(
    world.hasPendingChanges(),
    false,
    "Destroyed cell is absent from dirty state",
  );
});

Deno.test("candidate writes notify only after publish forwards setters into committed dispatch", () => {
  const world = new OwnerStateWorld();
  const owner = world.resolveOwner(null, "native-candidate");
  world.useState(owner, "value", 0);
  const events: number[] = [];
  world.subscribeDirtyCells((_handle, version) => events.push(version));

  const discarded = world.beginPreparation();
  const discardedOwner = discarded.resolveOwner(null, "candidate-discarded");
  const [, discardedSetter] = discarded.useState(discardedOwner, "value", 0);
  discardedSetter(1);
  equal(events.length, 0, "Private candidate writes are silent");
  discarded.discard();
  equal(discardedSetter(2), false, "Discarded setter is inert");

  const preparation = world.beginPreparation();
  const [, candidateSetter] = preparation.useState(owner, "value", 0);
  candidateSetter(1);
  equal(events.length, 0, "Unpublished existing-cell candidate stays silent");
  preparation.publish();
  equal(events.length, 0, "Publish itself does not notify");
  candidateSetter(2);
  equal(
    events.join(","),
    "2",
    "Forwarded setter notifies with committed version",
  );

  const newCell = world.beginPreparation();
  const newOwner = newCell.resolveOwner(null, "candidate-new");
  const [, newSetter] = newCell.useState(newOwner, "value", 0);
  newSetter(1);
  newCell.publish();
  equal(events.length, 1, "New candidate cell publication is silent");
  newSetter(2);
  equal(
    events.join(","),
    "2,2",
    "First post-publish dispatch emits native notification",
  );
});
