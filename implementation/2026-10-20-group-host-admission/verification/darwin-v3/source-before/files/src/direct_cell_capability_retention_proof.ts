import { assertEquals } from "jsr:@std/assert";
import { OwnerStateWorld, type StateCellHandle } from "./owner_state_world.ts";

type RetainedState = {
  handle: StateCellHandle;
  payload: WeakRef<object>;
};

function dispatchPayload(
  setPayload: (value: object) => boolean,
): WeakRef<object> {
  const value = { text: "cell payload should be released" };
  const reference = new WeakRef(value);
  setPayload(value);
  return reference;
}

function createRetainedState(): RetainedState {
  const world = new OwnerStateWorld();
  const owner = world.resolveOwner(null, "CapabilityRetention");
  let handle: StateCellHandle | undefined;
  world.subscribeDirtyCells((next) => {
    handle = next;
  });

  const [, setPayload] = world.useState<object | null>(owner, "payload", null);
  const payload = dispatchPayload(setPayload as (value: object) => boolean);
  const retainedHandle = handle!;
  assertEquals(world.destroyOwner(owner), true);

  return { handle: retainedHandle, payload };
}

const gc = (globalThis as typeof globalThis & { gc?: () => void }).gc;
if (!gc) throw new Error("Run with Deno --v8-flags=--expose-gc");

// Keep only the copied public handle alive to prove the revoked private
// cellIdentity does not retain the dead cell or its payload.
const retained = createRetainedState();
void retained.handle;

for (let attempt = 0; attempt < 60; attempt++) {
  const pressure = Array.from({ length: 10_000 }, () => ({}));
  void pressure;
  gc();
  await new Promise((resolve) => setTimeout(resolve, 0));
}

assertEquals(retained.payload.deref(), undefined);
console.log("direct cell capability retention: PASS");
