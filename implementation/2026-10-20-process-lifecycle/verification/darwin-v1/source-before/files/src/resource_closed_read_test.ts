import { assertEquals, assertStrictEquals, assertThrows } from "jsr:@std/assert";
import { AsyncResource, AsyncResourceTable } from "./async_resource_runtime.ts";
import { closedResourceStatus, ResourceReadSet } from "./resource_read_set.ts";

Deno.test("closed resource reads capture canonical fulfilled values and reject later overrides", async () => {
  const resource = new AsyncResource(Promise.resolve(7));
  await Promise.resolve();
  const reads = new ResourceReadSet(new AsyncResourceTable());
  const captured = reads.readClosed(resource);
  assertEquals(captured?.status, "fulfilled");
  assertEquals(captured?.value, 7);
  assertEquals(reads.validate(), true);
  let calls = 0;
  Object.defineProperty(resource, "version", { get() { calls++; return 1; } });
  assertEquals(reads.validate(), false);
  assertEquals(reads.readClosed(resource), null);
  assertEquals(calls, 0);
  reads.discard();
  assertThrows(() => reads.readClosed(resource), Error, "closed");
});

Deno.test("closed resource inspection rejects proxies and fake brands before traps run", () => {
  const resource = new AsyncResource(new Promise<number>(() => {}));
  let calls = 0;
  const proxy = new Proxy(resource, {
    getPrototypeOf(target) { calls++; return Reflect.getPrototypeOf(target); },
    getOwnPropertyDescriptor(target, key) { calls++; return Reflect.getOwnPropertyDescriptor(target, key); },
  });
  assertEquals(closedResourceStatus(proxy), null);
  assertEquals(closedResourceStatus(Object.create(AsyncResource.prototype)), null);
  assertEquals(calls, 0);
  assertEquals(closedResourceStatus(resource)?.status, "pending");
});

Deno.test("closed resource inspection declines changed prototype accessors without invoking them", async () => {
  const resource = new AsyncResource(Promise.resolve("ready"));
  await Promise.resolve();
  const reads = new ResourceReadSet(new AsyncResourceTable());
  assertEquals(reads.readClosed(resource)?.value, "ready");
  const descriptor = Object.getOwnPropertyDescriptor(AsyncResource.prototype, "read")!;
  let calls = 0;
  try {
    Object.defineProperty(AsyncResource.prototype, "read", { configurable: true,
      get() { calls++; return () => "authored"; } });
    assertEquals(closedResourceStatus(resource), null);
    assertEquals(reads.validate(), false);
    assertEquals(calls, 0);
  } finally {
    Object.defineProperty(AsyncResource.prototype, "read", descriptor);
    reads.discard();
  }
});

Deno.test("closed capture cannot refresh an earlier generic pending read", async () => {
  let resolve!: (value: number) => void;
  const resource = new AsyncResource(new Promise<number>((done) => { resolve = done; }));
  const reads = new ResourceReadSet(new AsyncResourceTable());
  assertThrows(() => reads.read(resource));
  assertStrictEquals(reads.pending[0], resource);
  resolve(9);
  await Promise.resolve();
  assertEquals(reads.readClosed(resource), null);
  assertEquals(reads.validate(), false);
  reads.discard();
});
