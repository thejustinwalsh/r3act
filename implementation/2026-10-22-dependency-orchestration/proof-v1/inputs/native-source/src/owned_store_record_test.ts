import {
  captureClosedProjectionValues, captureOwnedClosedProjectionValues,
  isOwnedClosedProjectionPaths, normalizeClosedProjectionPaths, storeRecord,
} from "./owned_store_record.ts";

const equal = (actual: unknown, expected: unknown) => {
  if (!Object.is(actual, expected)) throw new Error(`Expected ${String(expected)}, received ${String(actual)}`);
};

Deno.test("owned projection paths copy input and reject unowned nested records", () => {
  const raw = [["position", "x"]];
  const paths = normalizeClosedProjectionPaths(raw)!;
  equal(isOwnedClosedProjectionPaths(paths), true);
  equal(isOwnedClosedProjectionPaths(Object.freeze([["position", "x"]])), false);
  raw[0][1] = "y";
  equal(paths[0][1], "x");
  equal(captureOwnedClosedProjectionValues(storeRecord({ position: storeRecord({ x: 3 }) }), paths)?.[0], 3);
  equal(captureOwnedClosedProjectionValues(storeRecord({ position: { x: 3 } }), paths), null);
  equal(captureOwnedClosedProjectionValues(storeRecord({ position: storeRecord({ x: Infinity }) }), paths), null);
});

Deno.test("public projection paths still inspect getters and Proxy descriptors", () => {
  const state = storeRecord({ x: 5 });
  let getterCalls = 0;
  const path = ["x"];
  Object.defineProperty(path, "0", { get() { getterCalls++; return "x"; }, enumerable: true });
  equal(captureClosedProjectionValues(state, [path]), null);
  equal(getterCalls, 0);
  let descriptorCalls = 0;
  const proxy = new Proxy(["x"], {
    getOwnPropertyDescriptor(target, property) {
      descriptorCalls++;
      return Reflect.getOwnPropertyDescriptor(target, property);
    },
  });
  equal(captureClosedProjectionValues(state, [proxy])?.[0], 5);
  equal(descriptorCalls > 0, true);
  equal(isOwnedClosedProjectionPaths(proxy), false);
});
