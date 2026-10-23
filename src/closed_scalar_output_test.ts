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
  const authored = materializeOwnedScalarRuntimeElement({ kind: "frame", frame: first }, {
    tag: "group", key: "motion", owner: 42, children: authoredChild,
  }, counts);
  const expanded = materializeOwnedScalarRuntimeElement({ kind: "frame", frame: first }, {
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
