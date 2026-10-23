import { assert, assertEquals, assertStrictEquals } from "jsr:@std/assert";
import {
  AsyncTaskDemandScope, defineProviderDemand, definePureDerivedDemand,
  runDemandUnshared, type DemandDefinition, type DemandLease,
} from "./async_task_demand.ts";

const capture = (identity: object, version: number, value: unknown) =>
  Object.freeze([{ identity, version, value }]);

Deno.test("provider leases share one request and abort only after last interest", async () => {
  const scope = new AsyncTaskDemandScope();
  const identity = {};
  const input = {};
  const owners = [{}, {}];
  const controllers: AbortSignal[] = [];
  let resolve!: (value: number) => void;
  const provider = defineProviderDemand<number>(identity, "rev-1", (_captures, signal) => {
    controllers.push(signal);
    return new Promise<number>((yes) => { resolve = yes; });
  });
  const first = scope.acquire(provider, owners[0], capture(input, 1, 10))!;
  const repeated = scope.acquire(provider, owners[0], capture(input, 1, 10))!;
  const second = scope.acquire(provider, owners[1], capture(input, 1, 10))!;
  assertStrictEquals(repeated, first);
  assertStrictEquals(second.resource, first.resource);
  assertEquals(controllers.length, 1);
  first.release(); first.release();
  assertEquals(controllers[0].aborted, false);
  resolve(42);
  assertEquals(await second.result, 42);
  assertEquals(second.resource.read(), 42);
  assertEquals(scope.size, 1);
  second.release();
  assertEquals(scope.size, 0);
  assertEquals(controllers[0].aborted, false);
  scope.dispose();
});

Deno.test("last release aborts owned provider and late fulfillment is ignored", async () => {
  const scope = new AsyncTaskDemandScope();
  const identity = {}, input = {}, owner = {};
  let resolve!: (value: number) => void;
  let signal!: AbortSignal;
  const provider = defineProviderDemand<number>(identity, "rev-1", (_captures, owned) => {
    signal = owned;
    return new Promise<number>((yes) => { resolve = yes; });
  });
  const first = scope.acquire(provider, owner, capture(input, 1, 10))!;
  first.release();
  assertEquals(signal.aborted, true);
  assertEquals(scope.size, 0);
  resolve(99);
  await assertRejectsPromise(first.result);
  const next = scope.acquire(provider, owner, capture(input, 1, 10))!;
  assert(next.resource !== first.resource);
  next.release();
  scope.dispose();
});

Deno.test("revision and input versions isolate demand while pure derivation reuses", async () => {
  const scope = new AsyncTaskDemandScope();
  const identity = {}, input = {};
  let calls = 0;
  const derive = (captures: readonly { value: unknown }[]) => {
    calls++;
    return Number(captures[0].value) * 2;
  };
  const old = definePureDerivedDemand(identity, "rev-1", derive);
  const changed = definePureDerivedDemand(identity, "rev-2", derive);
  const first = scope.acquire(old, {}, capture(input, 1, 7))!;
  const shared = scope.acquire(old, {}, capture(input, 1, 7))!;
  const newInput = scope.acquire(old, {}, capture(input, 2, 8))!;
  const newCode = scope.acquire(changed, {}, capture(input, 1, 7))!;
  assertStrictEquals(first.resource, shared.resource);
  assertEquals(await first.result, 14);
  assertEquals(await newInput.result, 16);
  assertEquals(await newCode.result, 14);
  assertEquals(calls, 3);
  for (const lease of [first, shared, newInput, newCode]) lease.release();
  assertEquals(scope.size, 0);
  scope.dispose();
});

Deno.test("capacity falls back to the declared unshared definition", async () => {
  const scope = new AsyncTaskDemandScope(1);
  const provider = defineProviderDemand<number>({}, "rev-1", (captures) =>
    Promise.resolve(Number(captures[0].value)));
  const first = scope.acquire(provider, {}, capture({}, 1, 1))!;
  const secondCapture = capture({}, 1, 2);
  assertEquals(scope.acquire(provider, {}, secondCapture), null);
  assertEquals(await runDemandUnshared(provider, secondCapture,
    new AbortController().signal), 2);
  assertEquals(await first.result, 1);
  first.release();
  scope.dispose();
});

Deno.test("declared work accepts more than 32 captured dependencies", async () => {
  const scope = new AsyncTaskDemandScope();
  const captures = Array.from({ length: 40 }, (_, index) =>
    Object.freeze({ identity: `input-${index}`, version: 1, value: index }));
  const derive = definePureDerivedDemand({}, "rev-1", (values) =>
    values.reduce((sum, item) => sum + Number(item.value), 0));
  const lease = scope.acquire(derive, {}, captures)!;
  assertEquals(await lease.result, 780);
  lease.release();
  assertEquals(scope.size, 0);
  scope.dispose();
});

Deno.test("last-interest abort never calls a returned promise's cancellation method", async () => {
  const scope = new AsyncTaskDemandScope();
  let cancelCalls = 0;
  let signal!: AbortSignal;
  const borrowed = Object.assign(new Promise<number>(() => {}), {
    cancel: () => { cancelCalls++; },
  });
  const provider = defineProviderDemand<number>({}, "rev-1", (_captures, owned) => {
    signal = owned;
    return borrowed;
  });
  const lease = scope.acquire(provider, {}, [])!;
  lease.release();
  assertEquals(signal.aborted, true);
  assertEquals(cancelCalls, 0);
  assertEquals(scope.size, 0);
  scope.dispose();
});

Deno.test("reentrant disposal and synchronous provider failure settle without retained entries", async () => {
  const scope = new AsyncTaskDemandScope();
  const provider = defineProviderDemand<number>({}, "rev-1", () => {
    scope.dispose();
    throw new Error("provider failed after disposal");
  });
  const lease = scope.acquire(provider, {}, [] )!;
  await assertRejectsPromise(lease.result);
  assertEquals(scope.size, 0);
  lease.release();
  const next = new AsyncTaskDemandScope();
  const failing = defineProviderDemand<number>({}, "rev-1", () => {
    throw new Error("provider failed");
  });
  const failed = next.acquire(failing, {}, [])!;
  await assertRejectsPromise(failed.result);
  assertEquals(failed.resource.status.status, "rejected");
  failed.release();
  assertEquals(next.size, 0);
  next.dispose();
});

Deno.test("synchronous provider reentry observes the first lease before startup completes", async () => {
  const scope = new AsyncTaskDemandScope();
  const input = {}, owner = {}, nestedOwner = {};
  let starts = 0;
  let nested: DemandLease<number> | null = null;
  let definition!: DemandDefinition<number>;
  definition = defineProviderDemand<number>({}, "rev-1", (captures) => {
    starts++;
    nested = scope.acquire(definition, nestedOwner, captures);
    return Promise.resolve(7);
  });
  const first = scope.acquire(definition, owner, capture(input, 1, 7))!;
  const nestedLease = nested as DemandLease<number> | null;
  if (!nestedLease) throw new Error("reentrant lease missing");
  assertStrictEquals(nestedLease.resource, first.resource);
  assertEquals(starts, 1);
  assertEquals(await first.result, 7);
  first.release();
  nestedLease.release();
  assertEquals(scope.size, 0);
  scope.dispose();
});

const assertRejectsPromise = async (promise: Promise<unknown>): Promise<void> => {
  let rejected = false;
  try { await promise; } catch { rejected = true; }
  assert(rejected);
};
