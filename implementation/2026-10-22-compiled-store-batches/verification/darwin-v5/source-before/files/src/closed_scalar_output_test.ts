import {
  OwnedScalarFrame, OwnedScalarLayout, isOwnedScalarFrame,
  materializeOwnedScalarPropEntries, materializeOwnedScalarPropRecord,
} from "./closed_scalar_output.ts";
import { getComponentOutputOwner, isRuntimeOwnedElement,
  materializeOwnedScalarRuntimeElement } from "./jsx_binding_runtime.ts";

const equal = (actual: unknown, expected: unknown) => {
  if (!Object.is(actual, expected)) {
    throw new Error(`Expected ${String(expected)}, received ${String(actual)}`);
  }
};

Deno.test("owned scalar frames copy one and 32 props before scratch reuse", () => {
  for (const width of [1, 32]) {
    const names = Array.from({ length: width }, (_, index) => `position-${index}`);
    const constants = Array.from({ length: width }, () => undefined);
    const layout = OwnedScalarLayout.create(names, constants);
    const scratch = Array.from({ length: width }, (_, index) => index);
    const first = OwnedScalarFrame.create(layout, scratch);
    scratch.fill(8);
    const second = OwnedScalarFrame.create(layout, scratch);
    names[0] = "changed";
    equal(first.layout.nameAt(0), "position-0");
    equal(first.valueAt(0), 0);
    equal(first.valueAt(width - 1), width - 1);
    equal(second.valueAt(0), 8);
    equal(Object.isFrozen(first), true);
    equal(Object.isFrozen(first.layout), true);
    equal("values" in first, false);
    equal("previous" in first, false);
    equal("root" in first, false);
    equal("node" in first, false);
  }
});

Deno.test("literal primitives, signed zero and ordinary materialization retain exact values", () => {
  const layout = OwnedScalarLayout.create(
    ["position-x", "data-label", "visible", "data-empty", "position-y"],
    [undefined, "ready", true, null, -0],
  );
  const counts = { frames: 0, rootMaterializations: 0, propMaterializations: 0 };
  const scratch: (number | string | boolean | null)[] = [2, "ready", true, null, -0];
  const first = OwnedScalarFrame.create(layout, scratch, counts);
  scratch[0] = 9;
  const entries = materializeOwnedScalarPropEntries(first, counts);
  const props = materializeOwnedScalarPropRecord(first, counts);
  equal(first.valueAt(0), 2);
  equal(Object.is(first.valueAt(4), -0), true);
  equal(entries[1][1], "ready");
  equal(entries[2][1], true);
  equal(entries[3][1], null);
  equal(Object.is(props["position-y"], -0), true);
  equal(Object.isFrozen(entries), true);
  equal(Object.isFrozen(entries[0]), true);
  equal(Object.isFrozen(props), true);
  equal(Object.getOwnPropertyDescriptor(props, "position-x")?.value, 2);
  const authoredChild = { type: "mesh", props: {} };
  const expandedChild = { type: "mesh", props: {} };
  const authored = materializeOwnedScalarRuntimeElement(first, {
    tag: "group", key: "motion", owner: 42, children: authoredChild,
  }, counts);
  const expanded = materializeOwnedScalarRuntimeElement(first, {
    tag: "group", key: "motion", owner: 42, children: expandedChild,
  }, counts);
  equal(isRuntimeOwnedElement(authored), true);
  equal(authored.type, "group");
  equal(authored.props.key, "motion");
  equal(authored.props.children, authoredChild);
  equal(expanded.props.children, expandedChild);
  equal(getComponentOutputOwner(authored), 42);
  equal(counts.frames, 1);
  equal(counts.rootMaterializations, 2);
  equal(counts.propMaterializations, 4);
});

Deno.test("scalar brands reject forged prototypes and Proxy wrappers", () => {
  const layout = OwnedScalarLayout.create(["position-x"], [undefined]);
  const frame = OwnedScalarFrame.create(layout, [1]);
  equal(isOwnedScalarFrame(frame), true);
  equal(isOwnedScalarFrame(Object.freeze({ layout, length: 1 })), false);
  equal(isOwnedScalarFrame(Object.create(Object.getPrototypeOf(frame))), false);
  equal(isOwnedScalarFrame(new Proxy(frame, {})), false);
  const revoked = Proxy.revocable(frame, {});
  revoked.revoke();
  equal(isOwnedScalarFrame(revoked.proxy), false);
  let rejected = false;
  try { OwnedScalarFrame.create(layout, [Infinity]); }
  catch { rejected = true; }
  equal(rejected, true);
  rejected = false;
  try { OwnedScalarFrame.create(layout, [NaN]); }
  catch { rejected = true; }
  equal(rejected, true);
  rejected = false;
  try { OwnedScalarLayout.create(["position-x", "position-x"], [undefined, undefined]); }
  catch { rejected = true; }
  equal(rejected, true);
  rejected = false;
  try { OwnedScalarFrame.create(OwnedScalarLayout.create(["position-x"], [-0]), [0]); }
  catch { rejected = true; }
  equal(rejected, true);
});

Deno.test("scalar capture validates the copied values rather than a mutable getter source", () => {
  const layout = OwnedScalarLayout.create(["position-x"], [undefined]);
  let reads = 0;
  const values = Object.defineProperty([0], "0", { enumerable: true,
    get() { return ++reads === 1 ? 5 : Infinity; },
  });
  const frame = OwnedScalarFrame.create(layout, values);
  equal(frame.valueAt(0), 5);
  equal(reads, 1);
});

Deno.test("scalar capture rejects an unbounded Proxy length before slot iteration", () => {
  const layout = OwnedScalarLayout.create(["position-x"], [undefined]);
  let indexedReads = 0;
  const values = new Proxy([1], { get(target, key, receiver) {
    if (key === "length") return Infinity;
    if (key === "0") indexedReads++;
    return Reflect.get(target, key, receiver);
  } });
  let rejected = false;
  try { OwnedScalarFrame.create(layout, values); }
  catch { rejected = true; }
  equal(rejected, true);
  equal(indexedReads, 0);
});

Deno.test("verified capture owns one and 32 final slots across scratch reuse", () => {
  for (const width of [1, 32]) {
    const layout = OwnedScalarLayout.create(
      Array.from({ length: width }, (_, index) => `data-${index}`),
      Array.from({ length: width }, () => undefined),
      Array.from({ length: width }, (_, index) => index),
    );
    const counts = { frames: 0, rootMaterializations: 0,
      propMaterializations: 0, directCaptures: 0 };
    const scratch = Array.from({ length: width }, (_, index) => index);
    const first = OwnedScalarFrame.captureVerifiedNumericResults(layout, scratch, counts);
    scratch.fill(42);
    const second = OwnedScalarFrame.captureVerifiedNumericResults(layout, scratch, counts);
    equal(first.valueAt(0), 0);
    equal(first.valueAt(width - 1), width - 1);
    equal(second.valueAt(0), 42);
    equal(counts.frames, 2);
    equal(counts.directCaptures, 2);
    equal(Object.isFrozen(first), true);
    equal("values" in first, false);
  }
});

Deno.test("verified mapping includes numeric literals and captures a reused prefix", () => {
  const layout = OwnedScalarLayout.create(
    ["label", "x", "visible", "literal", "empty", "negative-zero"],
    ["ready", undefined, true, 3, null, -0], [1, 3, 5],
  );
  equal(layout.slotAt(0), -1);
  equal(layout.slotAt(1), 0);
  equal(layout.slotAt(3), 1);
  equal(layout.slotAt(5), 2);
  const scratch = [7, 3, -0, 99, 100];
  const frame = OwnedScalarFrame.captureVerifiedNumericResults(layout, scratch);
  scratch.fill(8);
  equal(frame.valueAt(0), "ready");
  equal(frame.valueAt(1), 7);
  equal(frame.valueAt(2), true);
  equal(frame.valueAt(3), 3);
  equal(frame.valueAt(4), null);
  equal(Object.is(frame.valueAt(5), -0), true);
  equal(OwnedScalarLayout.create(["x", "literal"], [undefined, 3]).slotAt(1), -1);
});

Deno.test("verified capture rejects malformed maps, constants, missing slots and nonfinite values", () => {
  const rejects = (run: () => unknown) => {
    let rejected = false;
    try { run(); } catch { rejected = true; }
    equal(rejected, true);
  };
  const names = ["x", "literal", "name", "zero"];
  const constants = [undefined, 3, "fixed", -0];
  for (const indices of [[0, 3], [0, 1, 2, 3], [1, 0, 3], [0, 1, 1]])
    rejects(() => OwnedScalarLayout.create(names, constants, indices));
  const layout = OwnedScalarLayout.create(names, constants, [0, 1, 3]);
  rejects(() => OwnedScalarFrame.captureVerifiedNumericResults(layout, [1, 4, -0]));
  rejects(() => OwnedScalarFrame.captureVerifiedNumericResults(layout, [1, 3, 0]));
  rejects(() => OwnedScalarFrame.captureVerifiedNumericResults(layout, [1, 3]));
  rejects(() => OwnedScalarFrame.captureVerifiedNumericResults(layout, [1, 3, NaN]));
  rejects(() => OwnedScalarFrame.captureVerifiedNumericResults(layout, [1, 3, Infinity]));
  for (const malformed of ["1", null, true])
    rejects(() => OwnedScalarFrame.captureVerifiedNumericResults(layout,
      [malformed, 3, -0] as unknown as number[]));
  rejects(() => OwnedScalarFrame.captureVerifiedNumericResults(layout, [1, 3, -0, ...
    Array.from({ length: 30 }, () => 0)]));
  const omitted = [1, 3, -0];
  Reflect.deleteProperty(omitted, "1");
  rejects(() => OwnedScalarFrame.captureVerifiedNumericResults(layout, omitted));
  rejects(() => OwnedScalarFrame.captureVerifiedNumericResults(
    OwnedScalarLayout.create(["x"], [undefined]), [1]));
});

Deno.test("verified capture reads an own accessor or Proxy slot only during capture", () => {
  const layout = OwnedScalarLayout.create(["x"], [undefined], [0]);
  let reads = 0;
  const accessor = Object.defineProperty([0], "0", { enumerable: true,
    get() { return ++reads === 1 ? 5 : Infinity; },
  });
  const first = OwnedScalarFrame.captureVerifiedNumericResults(layout, accessor);
  equal(first.valueAt(0), 5);
  equal(reads, 1);
  const proxy = new Proxy([7], { get(target, key, receiver) {
    if (key === "0") reads++;
    return Reflect.get(target, key, receiver);
  } });
  const second = OwnedScalarFrame.captureVerifiedNumericResults(layout, proxy);
  proxy[0] = 9;
  equal(second.valueAt(0), 7);
  equal(reads, 2);
  equal(isOwnedScalarFrame(new Proxy(first, {})), false);
});
