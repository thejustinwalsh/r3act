import {
  AsyncResource,
  AsyncResourceTable,
  isPendingResourceToken,
  isResourceRejection,
} from "./async_resource_runtime.ts";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function equal<T>(actual: T, expected: T, message: string): void {
  if (!Object.is(actual, expected)) {
    throw new Error(
      `${message}: expected ${String(expected)}, got ${String(actual)}`,
    );
  }
}

function throws(action: () => unknown, message: string): unknown {
  try {
    action();
  } catch (error) {
    return error;
  }
  throw new Error(message);
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
}

Deno.test("resource read exposes stable pending token then fulfilled value", async () => {
  const pending = deferred<number>();
  const resource = new AsyncResource(pending.promise);
  const first = throws(() => resource.read(), "pending read should throw");
  const second = throws(() => resource.read(), "pending read should throw");
  assert(isPendingResourceToken(first), "pending read was not identifiable");
  equal(first, second, "pending token identity changed while pending");
  assert(
    first.resource === resource,
    "pending token points at the wrong resource",
  );
  equal(resource.version, 0, "pending resource version should start at zero");

  const observed: Array<[string, number]> = [];
  resource.subscribe((_record, status) =>
    observed.push([status.status, status.version])
  );
  pending.resolve(42);
  await Promise.resolve();
  equal(resource.read(), 42, "fulfilled read returned the wrong value");
  equal(resource.status.status, "fulfilled", "resource did not fulfill");
  equal(resource.version, 1, "settlement should advance the version once");
  equal(observed.length, 1, "settlement did not notify exactly once");
  equal(observed[0][0], "fulfilled", "listener saw the wrong status");
  equal(observed[0][1], 1, "listener saw the wrong version");
});

Deno.test("resource rejection is structured, stable, and preserves its reason", async () => {
  const pending = deferred<number>();
  const resource = new AsyncResource(pending.promise);
  const reason = { code: "offline" };
  pending.reject(reason);
  await Promise.resolve();
  const first = throws(() => resource.read(), "rejected read should throw");
  const second = throws(() => resource.read(), "rejected read should throw");
  assert(isResourceRejection(first), "rejection was not identifiable");
  equal(first, second, "rejection wrapper identity changed");
  assert(first.resource === resource, "rejection points at the wrong resource");
  equal(first.reason, reason, "rejection lost the original reason");
  equal(resource.status.status, "rejected", "resource did not reject");
  equal(resource.version, 1, "rejection should advance the version once");
});

Deno.test("subscriptions notify on settlement and unsubscription is idempotent", async () => {
  const pending = deferred<string>();
  const resource = new AsyncResource(pending.promise);
  let retainedCalls = 0;
  let releasedCalls = 0;
  resource.subscribe(() => retainedCalls++);
  const unsubscribe = resource.subscribe(() => releasedCalls++);
  unsubscribe();
  unsubscribe();
  pending.resolve("ok");
  await Promise.resolve();
  equal(retainedCalls, 1, "active subscriber was not called once");
  equal(releasedCalls, 0, "unsubscribed listener was retained");

  let lateCalls = 0;
  resource.subscribe(() => lateCalls++)();
  equal(lateCalls, 0, "settled resource retained a late subscription");
});

Deno.test("table deduplicates thenable identity only within that table", async () => {
  const pending = deferred<number>();
  const left = new AsyncResourceTable();
  const right = new AsyncResourceTable();
  const first = left.from(pending.promise);
  equal(left.from(pending.promise), first, "same table did not reuse resource");
  assert(
    right.from(pending.promise) !== first,
    "tables shared resource identity",
  );
  pending.resolve(9);
  await Promise.resolve();
  equal(first.read(), 9, "deduplicated resource did not settle");
});

Deno.test("synchronous thenable settlement is immediate and first-call wins", () => {
  const thenable: PromiseLike<number> = {
    then(resolve, reject) {
      resolve?.(7);
      reject?.(new Error("second settlement"));
      resolve?.(8);
      throw new Error("throw after settlement");
    },
  };
  const resource = new AsyncResource(thenable);
  equal(resource.read(), 7, "synchronous first resolution did not win");
  equal(resource.version, 1, "synchronous thenable settled more than once");
});

Deno.test("thenable throws before settlement and throwing then getter reject", () => {
  const callError = new Error("then call failed");
  const callThrows = new AsyncResource<number>({
    then() {
      throw callError;
    },
  });
  const callRejection = throws(() => callThrows.read(), "throw should reject");
  assert(isResourceRejection(callRejection), "call throw was not wrapped");
  equal(callRejection.reason, callError, "call throw reason was lost");

  const getterError = new Error("then getter failed");
  const getterThrows = Object.defineProperty({}, "then", {
    get() {
      throw getterError;
    },
  }) as PromiseLike<never>;
  const getterResource = new AsyncResource(getterThrows);
  const getterRejection = throws(
    () => getterResource.read(),
    "getter throw should reject",
  );
  assert(isResourceRejection(getterRejection), "getter throw was not wrapped");
  equal(getterRejection.reason, getterError, "getter throw reason was lost");
});

Deno.test("a thenable that resolves then throws preserves the resolution", () => {
  const thenable: PromiseLike<string> = {
    then(resolve) {
      resolve?.("settled");
      throw new Error("ignored after resolution");
    },
  };
  const resource = new AsyncResource(thenable);
  equal(resource.read(), "settled", "post-resolution throw replaced value");
});

Deno.test("subscriber and reporter failures do not block later subscribers", () => {
  const reported: unknown[] = [];
  const pending = deferred<number>();
  const resource = new AsyncResource(pending.promise, (error) => {
    reported.push(error);
    throw new Error("reporter failure");
  });
  const subscriberError = new Error("subscriber failure");
  let laterSubscriberCalls = 0;
  resource.subscribe(() => {
    throw subscriberError;
  });
  resource.subscribe(() => laterSubscriberCalls++);
  pending.resolve(11);

  return Promise.resolve().then(() => {
    equal(laterSubscriberCalls, 1, "later listener was blocked");
    equal(reported.length, 1, "subscriber error was not reported once");
    equal(reported[0], subscriberError, "wrong subscriber error was reported");
    equal(
      resource.read(),
      11,
      "listener failure corrupted resource settlement",
    );
  });
});

Deno.test("nested thenables are adopted and resolution cycles reject", async () => {
  const outer = deferred<PromiseLike<string>>();
  const resource = new AsyncResource<string>(
    outer.promise as unknown as PromiseLike<string>,
  );
  const inner = deferred<string>();
  outer.resolve(inner.promise);
  await Promise.resolve();
  await Promise.resolve();
  assert(
    isPendingResourceToken(
      throws(() => resource.read(), "nested value should pend"),
    ),
    "nested promise was returned as a value instead of adopted",
  );
  inner.resolve("nested result");
  await Promise.resolve();
  await Promise.resolve();
  equal(resource.read(), "nested result", "nested resolution was not adopted");

  let resolveCycle!: (value: PromiseLike<unknown>) => void;
  const cycle = {
    then(resolve: (value: unknown) => unknown) {
      resolveCycle = resolve as (value: PromiseLike<unknown>) => void;
    },
  } as unknown as PromiseLike<unknown>;
  const cyclicResource = new AsyncResource(cycle);
  resolveCycle(cycle);
  const rejection = throws(() => cyclicResource.read(), "cycle should reject");
  assert(isResourceRejection(rejection), "cycle rejection was not structured");
  assert(rejection.reason instanceof TypeError, "cycle did not use TypeError");
});

Deno.test("table installs identity before a synchronous reentrant then call", () => {
  const table = new AsyncResourceTable();
  let nestedLookup: AsyncResource<number> | undefined;
  const thenable = {
    then(resolve?: (value: number) => unknown) {
      nestedLookup = table.from(thenable);
      resolve?.(5);
    },
  } as unknown as PromiseLike<number>;
  const resource = table.from(thenable);
  assert(
    nestedLookup === resource,
    "reentrant lookup created another resource",
  );
  equal(resource.read(), 5, "reentrant resource did not settle");
});

Deno.test("deep synchronous thenable chains do not overflow the stack", () => {
  let current: unknown = 27;
  for (let index = 0; index < 20_000; index++) {
    const next = current;
    current = {
      then(resolve: (value: unknown) => unknown) {
        resolve(next);
      },
    };
  }
  const resource = new AsyncResource<number>(current as PromiseLike<number>);
  equal(resource.read(), 27, "deep thenable chain did not resolve");
});

Deno.test("non-thenable constructor input rejects while nested plain values fulfill", () => {
  const invalid = new AsyncResource<number>({} as PromiseLike<number>);
  const rejection = throws(() => invalid.read(), "invalid input should reject");
  assert(
    isResourceRejection(rejection),
    "invalid input rejection was not structured",
  );
  assert(
    rejection.reason instanceof TypeError,
    "invalid input did not use TypeError",
  );

  const plainValue = { value: 3 };
  const resource = new AsyncResource<{ value: number }>(
    {
      then(resolve?: (value: { value: number }) => unknown) {
        resolve?.(plainValue);
      },
    } as unknown as PromiseLike<{ value: number }>,
  );
  equal(resource.read(), plainValue, "nested plain value was not fulfilled");
});

Deno.test("direct resource typing reflects recursively resolved values", async () => {
  const nested = new AsyncResource<Promise<number>>({
    then(resolve?: (value: Promise<number>) => unknown) {
      resolve?.(Promise.resolve(31));
    },
  } as unknown as PromiseLike<Promise<number>>);
  await Promise.resolve();
  const value: number = nested.read();
  equal(value, 31, "nested direct resource did not expose the resolved type");
});

Deno.test("primitive constructor misuse rejects with a structured TypeError", () => {
  for (const input of [123, null]) {
    const resource = new AsyncResource<number>(
      input as unknown as PromiseLike<number>,
    );
    const rejection = throws(
      () => resource.read(),
      "primitive input should reject",
    );
    assert(
      isResourceRejection(rejection),
      "primitive rejection was unstructured",
    );
    assert(
      rejection.reason instanceof TypeError,
      "primitive input did not use TypeError",
    );
  }
});
