import { PendingStateChanges, type PendingCellCutKey } from "./pending_state_changes.ts";
import { OwnerStateWorld, type StateCellHandle } from "./owner_state_world.ts";

const equal = (
  actual: unknown,
  expected: unknown,
  message = "Values differ",
) => {
  if (!Object.is(actual, expected)) {
    throw new Error(
      `${message}: expected ${String(expected)}, received ${String(actual)}`,
    );
  }
};

const throws = (action: () => unknown, message: string) => {
  let didThrow = false;
  try {
    action();
  } catch {
    didThrow = true;
  }
  equal(didThrow, true, message);
};

const nativeHandle = (
  owner: number,
  site: string,
  cellIdentity: object,
): StateCellHandle => Object.freeze({ owner, site, cellIdentity });

Deno.test("captureNative coalesces in first-arrival order into reused buffers", () => {
  const pending = new PendingStateChanges();
  const first = nativeHandle(1, "first", {});
  const second = nativeHandle(2, "second", {});
  pending.setCell(first, 1);
  pending.setCell(second, 4);
  pending.setCell(first, 3);
  const handles: (StateCellHandle | undefined)[] = [
    undefined,
    undefined,
    undefined,
  ];
  const versions = [0, 0, 0];

  equal(pending.captureNative(handles, versions), 2);
  equal(handles[0], first);
  equal(handles[1], second);
  equal(versions[0], 3);
  equal(versions[1], 4);
  equal(pending.captureNative(handles, versions), 2);
  equal(handles[0], first, "Capture replaced the caller-owned buffer");
});

Deno.test("legacy fallback scrubs the partially written native prefix", () => {
  const pending = new PendingStateChanges();
  const first = nativeHandle(1, "native", {});
  pending.setCell(first, 5);
  pending.set({ owner: 2, site: "legacy", version: 7 });
  const handles: (StateCellHandle | undefined)[] = [first, undefined, first];
  const versions = [5, 0, 99];

  equal(pending.captureNative(handles, versions), null);
  equal(handles[0], undefined, "Fallback left a partial handle in the buffer");
  equal(versions[0], 0, "Fallback left a partial version in the buffer");
  equal(handles[2], first, "Fallback scrubbed beyond its partial prefix");
  equal(
    versions[2],
    99,
    "Fallback changed a version beyond its partial prefix",
  );
});

Deno.test("capacity fallback scrubs partial output without changing the queue", () => {
  const pending = new PendingStateChanges();
  const first = nativeHandle(1, "first", {});
  const second = nativeHandle(2, "second", {});
  pending.setCell(first, 3);
  pending.setCell(second, 5);
  const handles: (StateCellHandle | undefined)[] = [second];
  const versions = [99];

  equal(pending.captureNative(handles, versions), null);
  equal(handles[0], undefined, "Capacity fallback left a partial handle");
  equal(versions[0], 0, "Capacity fallback left a partial version");
  equal(pending.size, 2, "Capacity fallback mutated the pending queue");

  const enoughHandles: (StateCellHandle | undefined)[] = [undefined, undefined];
  const enoughVersions = [0, 0];
  equal(pending.captureNative(enoughHandles, enoughVersions), 2);
  equal(enoughHandles[0], first);
  equal(enoughHandles[1], second);
  equal(enoughVersions[0], 3);
  equal(enoughVersions[1], 5);
});

Deno.test("native to legacy to native preserves reference and queue order", () => {
  const pending = new PendingStateChanges();
  const first = nativeHandle(1, "first", {});
  const second = nativeHandle(2, "second", {});
  pending.setCell(first, 3);
  pending.setCell(second, 5);

  const legacy = { owner: first.owner, site: first.site, version: 7 };
  pending.set(legacy);
  const legacyCapture = pending.capture();
  equal(legacyCapture.length, 2);
  equal(legacyCapture[0], legacy, "Generic set lost reference semantics");
  equal(legacyCapture[1].owner, second.owner);
  equal(legacyCapture[1].version, 5);

  const handles: (StateCellHandle | undefined)[] = [undefined, undefined];
  const versions = [0, 0];
  equal(pending.captureNative(handles, versions), null);
  equal(handles[0], undefined);
  equal(versions[0], 0);

  pending.setCell(first, 9);
  equal(pending.captureNative(handles, versions), 2);
  equal(handles[0], first);
  equal(handles[1], second);
  equal(versions[0], 9);
  equal(versions[1], 5);
});

Deno.test("native queue clear requires exact handle address and incarnation", () => {
  const pending = new PendingStateChanges();
  const handle = nativeHandle(3, "count", {});
  pending.setCell(handle, 8);
  const copiedHandle = nativeHandle(
    handle.owner,
    handle.site,
    handle.cellIdentity,
  );
  const handles: (StateCellHandle | undefined)[] = [copiedHandle];
  const versions = [100];
  handles[0] = nativeHandle(handle.owner + 1, handle.site, handle.cellIdentity);
  pending.clearNativeThrough(handles, versions, 1);
  equal(
    pending.size,
    1,
    "Misaddressed handle incorrectly acknowledged an entry",
  );

  handles[0] = nativeHandle(handle.owner, handle.site, {});
  pending.clearNativeThrough(handles, versions, 1);
  equal(
    pending.size,
    1,
    "Different cell identity incorrectly acknowledged an entry",
  );

  handles[0] = handle;
  pending.clearNativeThrough(handles, [7], 1);
  equal(pending.size, 1, "Older cut cleared a newer pending version");
  const nextIncarnation = nativeHandle(handle.owner, handle.site, {});
  pending.setCell(nextIncarnation, 1);
  handles[0] = handle;
  pending.clearNativeThrough(handles, [100], 1);
  equal(pending.size, 1, "Old incarnation cleared a replacement cell");
  equal(pending.captureNative(handles, versions), 1);
  equal(handles[0], nextIncarnation);
  equal(versions[0], 1);
  handles[0] = copiedHandle;
  pending.clearNativeThrough(handles, [100], 1);
  equal(pending.size, 1, "Copied old incarnation cleared replacement cell");
  const nextIncarnationCopy = nativeHandle(
    handle.owner,
    handle.site,
    nextIncarnation.cellIdentity,
  );
  handles[0] = nextIncarnationCopy;
  pending.clearNativeThrough(handles, [1], 1);
  equal(pending.size, 0);
  equal(pending.captureNative(handles, versions), 0);
  equal(
    handles[0],
    nextIncarnationCopy,
    "Empty capture mutated an unused buffer slot",
  );
  throws(
    () => pending.clearNativeThrough(handles, versions, 2),
    "Invalid native cut count was accepted",
  );
});

Deno.test("world validates exact cell handles and preserves writes newer than a cut", () => {
  const world = new OwnerStateWorld();
  const owner = world.resolveOwner(null, "native-cut-owner");
  let [, setValue] = world.useState(owner, "value", 0);
  const pending = new PendingStateChanges();
  world.subscribeDirtyCells((handle, version) =>
    pending.setCell(handle, version)
  );
  setValue(1);

  const handles: (StateCellHandle | undefined)[] = [undefined];
  const versions = [0];
  equal(pending.captureNative(handles, versions), 1);
  const firstHandle = handles[0]!;
  equal(world.versionForCell(firstHandle), 1);
  const firstSource = world.scalarSourceForCell(firstHandle);
  equal(firstSource?.value, 1);

  setValue(2);
  equal(world.versionForCell(firstHandle), 2);
  equal(firstSource?.value, 2);
  pending.clearNativeThrough(handles, versions, 1);
  world.clearCellChangesThrough(handles, versions, 1);
  equal(pending.size, 1, "Pending queue cleared a newer notification");
  equal(world.pendingChanges().length, 1, "World cleared a newer dirty cell");

  equal(pending.captureNative(handles, versions), 1);
  equal(versions[0], 2);
  pending.clearNativeThrough(handles, versions, 1);
  world.clearCellChangesThrough(handles, versions, 1);
  equal(pending.size, 0);
  equal(world.pendingChanges().length, 0);
  equal(
    world.versionForCell(firstHandle),
    2,
    "Acknowledgement changed the cell version",
  );

  const wrongAddress = nativeHandle(
    owner + 1,
    firstHandle.site,
    firstHandle.cellIdentity,
  );
  const copiedHandle = nativeHandle(
    owner,
    firstHandle.site,
    firstHandle.cellIdentity,
  );
  for (
    const invalid of [
      wrongAddress,
      nativeHandle(owner, firstHandle.site, {}),
    ]
  ) {
    equal(world.scalarSourceForCell(invalid), null);
    equal(world.versionForCell(invalid), null);
    world.clearCellChangesThrough([invalid], [100], 1);
    equal(world.pendingChanges().length, 0);
  }
  equal(world.scalarSourceForCell(copiedHandle), firstSource);
  equal(world.versionForCell(copiedHandle), 2);
});

Deno.test("dead cell handles resolve to null and stale native cuts cannot clear state", () => {
  const world = new OwnerStateWorld();
  const owner = world.resolveOwner(null, "dead-native-cut-owner");
  const [, setter] = world.useState(owner, "value", 0);
  const pending = new PendingStateChanges();
  world.subscribeDirtyCells((handle, version) =>
    pending.setCell(handle, version)
  );
  setter(1);
  const handles: (StateCellHandle | undefined)[] = [undefined];
  const versions = [0];
  equal(pending.captureNative(handles, versions), 1);
  const oldHandle = handles[0]!;

  equal(world.destroyOwner(owner), true);
  equal(world.scalarSourceForCell(oldHandle), null);
  equal(world.versionForCell(oldHandle), null);
  world.clearCellChangesThrough(handles, versions, 1);
  equal(world.pendingChanges().length, 0);
  equal(
    pending.size,
    1,
    "World destruction mutated an independent local queue",
  );
  pending.dropOwner(owner);
  equal(pending.captureNative(handles, versions), 0);
  equal(handles[0], oldHandle, "Empty capture should preserve ignored suffix");
});

Deno.test("two roots can capture and independently acknowledge one shared-world cut", () => {
  const world = new OwnerStateWorld();
  const owner = world.resolveOwner(null, "shared-native-cut-owner");
  const [, setter] = world.useState(owner, "value", 0);
  const firstRoot = new PendingStateChanges();
  const secondRoot = new PendingStateChanges();
  world.subscribeDirtyCells((handle, version) =>
    firstRoot.setCell(handle, version)
  );
  world.subscribeDirtyCells((handle, version) =>
    secondRoot.setCell(handle, version)
  );
  setter(1);

  const firstHandles: (StateCellHandle | undefined)[] = [undefined];
  const secondHandles: (StateCellHandle | undefined)[] = [undefined];
  const firstVersions = [0];
  const secondVersions = [0];
  equal(firstRoot.captureNative(firstHandles, firstVersions), 1);
  equal(secondRoot.captureNative(secondHandles, secondVersions), 1);
  equal(firstHandles[0], secondHandles[0]);
  equal(firstVersions[0], secondVersions[0]);

  world.clearCellChangesThrough(firstHandles, firstVersions, 1);
  equal(world.pendingChanges().length, 0);
  firstRoot.clearNativeThrough(firstHandles, firstVersions, 1);
  secondRoot.clearNativeThrough(secondHandles, secondVersions, 1);
  equal(firstRoot.size, 0);
  equal(secondRoot.size, 0);

  setter(2);
  equal(firstRoot.captureNative(firstHandles, firstVersions), 1);
  equal(secondRoot.captureNative(secondHandles, secondVersions), 1);
  equal(firstVersions[0], 2);
  equal(secondVersions[0], 2);
});

Deno.test("keyed native capture scrubs every prefix on legacy and capacity fallback", () => {
  const pending = new PendingStateChanges();
  const first = nativeHandle(11, "first", {});
  const second = nativeHandle(12, "second", {});
  pending.setCell(first, 1);
  pending.setCell(second, 4);
  const handles: (StateCellHandle | undefined)[] = [undefined, undefined];
  const versions = [0, 0];
  const keys: (PendingCellCutKey | undefined)[] = [
    undefined,
    undefined,
  ];

  equal(pending.captureNativeWithKeys(handles, versions, keys), 2);
  equal(keys[0] !== undefined, true);
  equal(keys[1] !== undefined, true);
  const retainedFirstKey = keys[0];

  const shortKeys: (typeof keys[number])[] = [retainedFirstKey];
  equal(pending.captureNativeWithKeys(handles, versions, shortKeys), null);
  equal(handles[0], undefined, "Key capacity fallback retained a handle");
  equal(versions[0], 0, "Key capacity fallback retained a version");
  equal(shortKeys[0], undefined, "Key capacity fallback retained a key");
  equal(pending.size, 2, "Capacity fallback changed the queue");

  pending.set({ owner: 13, site: "legacy", version: 9 });
  keys[0] = retainedFirstKey;
  equal(pending.captureNativeWithKeys(handles, versions, keys), null);
  equal(handles[0], undefined, "Legacy fallback retained a handle");
  equal(versions[0], 0, "Legacy fallback retained a version");
  equal(keys[0], undefined, "Legacy fallback retained a key");
  equal(pending.size, 3, "Legacy fallback changed the queue");
});

Deno.test("direct keyed acknowledgement preserves nested maximum version", () => {
  const pending = new PendingStateChanges();
  const handle = nativeHandle(21, "nested", {});
  pending.setCell(handle, 4);
  const handles: (StateCellHandle | undefined)[] = [undefined];
  const versions = [0];
  const keys: (PendingCellCutKey | undefined)[] = [
    undefined,
  ];

  equal(pending.captureNativeWithKeys(handles, versions, keys), 1);
  const originalKey = keys[0];
  pending.setCell(handle, 9);
  pending.setCell(handle, 7);
  pending.clearNativeThroughKeys(keys, handles, [4], 1);
  equal(pending.size, 1, "Older outer cut cleared a nested newer write");

  equal(pending.captureNativeWithKeys(handles, versions, keys), 1);
  equal(keys[0], originalKey, "Keyed capture replaced its reusable capability");
  equal(versions[0], 9, "Nested lower version replaced the maximum");
  pending.clearNativeThroughKeys(keys, handles, versions, 1);
  equal(pending.size, 0);
});

Deno.test("direct keyed acknowledgement rejects identity replacement and old cuts", () => {
  const pending = new PendingStateChanges();
  const oldHandle = nativeHandle(31, "replace", {});
  pending.setCell(oldHandle, 2);
  const handles: (StateCellHandle | undefined)[] = [undefined];
  const versions = [0];
  const keys: (PendingCellCutKey | undefined)[] = [
    undefined,
  ];
  equal(pending.captureNativeWithKeys(handles, versions, keys), 1);
  const oldKey = keys[0];

  const replacement = nativeHandle(oldHandle.owner, oldHandle.site, {});
  pending.setCell(replacement, 1);
  pending.clearNativeThroughKeys([oldKey], [oldHandle], [100], 1);
  equal(pending.size, 1, "Old identity cut cleared its replacement");

  equal(pending.captureNativeWithKeys(handles, versions, keys), 1);
  equal(handles[0], replacement);
  equal(versions[0], 1);
  pending.clearNativeThroughKeys(keys, handles, [0], 1);
  equal(pending.size, 1, "Older cut cleared current identity");
  pending.clearNativeThroughKeys(keys, handles, [1], 1);
  equal(pending.size, 0);
});

Deno.test("keyed acknowledgements are queue-scoped and reject forged keys and proxies", () => {
  const firstQueue = new PendingStateChanges();
  const secondQueue = new PendingStateChanges();
  const handle = nativeHandle(41, "shared", {});
  firstQueue.setCell(handle, 1);
  secondQueue.setCell(handle, 1);
  const handles: (StateCellHandle | undefined)[] = [undefined];
  const versions = [0];
  const keys: (PendingCellCutKey | undefined)[] = [
    undefined,
  ];
  equal(firstQueue.captureNativeWithKeys(handles, versions, keys), 1);
  const foreignKey = keys[0]!;

  secondQueue.clearNativeThroughKeys([foreignKey], [handle], [1], 1);
  equal(firstQueue.size, 1);
  equal(secondQueue.size, 1, "Foreign queue token unlinked another queue");

  const forged = {} as PendingCellCutKey;
  const throwingProxy = new Proxy({}, {
    get: () => { throw new Error("proxy get trap"); },
    getPrototypeOf: () => { throw new Error("proxy prototype trap"); },
    getOwnPropertyDescriptor: () => { throw new Error("proxy descriptor trap"); },
  }) as PendingCellCutKey;
  firstQueue.clearNativeThroughKeys([forged], [handle], [100], 1);
  firstQueue.clearNativeThroughKeys([throwingProxy], [handle], [100], 1);
  equal(firstQueue.size, 1, "Forged capability acknowledged a real entry");
  firstQueue.clearNativeThroughKeys([foreignKey], [handle], [1], 1);
  equal(firstQueue.size, 0);
  equal(secondQueue.size, 1);
  secondQueue.clearNativeThroughKeys([undefined], [handle], [1], 1);
  equal(secondQueue.size, 1, "Missing capability acknowledged a real entry");
});

Deno.test("clear and dropOwner revoke retained keyed capabilities before reuse", () => {
  const pending = new PendingStateChanges();
  const first = nativeHandle(51, "revoke", {});
  pending.setCell(first, 1);
  const handles: (StateCellHandle | undefined)[] = [undefined];
  const versions = [0];
  const keys: (PendingCellCutKey | undefined)[] = [
    undefined,
  ];
  equal(pending.captureNativeWithKeys(handles, versions, keys), 1);
  const droppedKey = keys[0]!;

  pending.dropOwner(first.owner);
  const afterDrop = nativeHandle(first.owner, first.site, {});
  pending.setCell(afterDrop, 1);
  pending.clearNativeThroughKeys([droppedKey], [afterDrop], [100], 1);
  equal(pending.size, 1, "Dropped owner capability survived owner reuse");

  equal(pending.captureNativeWithKeys(handles, versions, keys), 1);
  const clearedKey = keys[0]!;
  pending.clear();
  const afterClear = nativeHandle(first.owner, first.site, {});
  pending.setCell(afterClear, 1);
  pending.clearNativeThroughKeys([clearedKey], [afterClear], [100], 1);
  equal(pending.size, 1, "Cleared capability survived queue reset");

  const badCountKeys: (typeof keys[number])[] = [undefined];
  throws(
    () => pending.clearNativeThroughKeys(badCountKeys, [afterClear], [1], 2),
    "Invalid keyed native cut count was accepted",
  );
});

Deno.test("captured keys expose no pending-node properties and are revocable", () => {
  const pending = new PendingStateChanges();
  const handle = nativeHandle(61, "opaque", {});
  pending.setCell(handle, 1);
  const handles: (StateCellHandle | undefined)[] = [undefined];
  const versions = [0];
  const keys: (PendingCellCutKey | undefined)[] = [
    undefined,
  ];
  equal(pending.captureNativeWithKeys(handles, versions, keys), 1);
  const key = keys[0]!;
  equal(Object.keys(key).length, 0);
  equal(Object.getOwnPropertySymbols(key).length, 0);
  equal(Object.getPrototypeOf(key), null);
  equal(Object.isFrozen(key), true);

  pending.dropOwner(handle.owner);
  pending.clearNativeThroughKeys([key], [handle], [100], 1);
  equal(pending.size, 0);
});
