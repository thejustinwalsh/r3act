import {
  evaluateClosedStoreHostProgram,
  normalizeClosedStoreHostProgram,
} from "./closed_store_host_program.ts";

const equal = (actual: unknown, expected: unknown) => {
  if (!Object.is(actual, expected)) {
    throw new Error(`Expected ${String(expected)}, received ${String(actual)}`);
  }
};
const data = (): any => ({
  schemaVersion: 1,
  componentProgramId: "module#component:Leaf",
  moduleRevision: "revision",
  storeUseSiteId: "module#component:Leaf#store:0",
  storeProp: "position",
  host: {
    tag: "mesh", key: "m", child: null,
    props: [["position-x", { kind: "binary", operator: "*",
      left: { kind: "input", index: 0 },
      right: { kind: "literal", value: 2 } }]],
  },
});

Deno.test("closed Store leaf snapshots data and evaluates scalar writes without source access", () => {
  const raw = data();
  const normalized = normalizeClosedStoreHostProgram(raw);
  if (!normalized) throw new Error("Expected a normalized Store host program");
  const expression = raw.host.props[0][1] as { right: { value: number } };
  expression.right.value = 100;
  raw.host.props[0][0] = "visible";
  const result = evaluateClosedStoreHostProgram(normalized, 3);
  if (!result) throw new Error("Expected a finite host output");
  equal(result[0][0], "position-x");
  equal(result[0][1], 6);
  equal(Object.isFrozen(normalized.host.props[0]), true);
  equal(evaluateClosedStoreHostProgram(normalized, Infinity), null);
  equal(evaluateClosedStoreHostProgram(normalized, {}), null);
});

Deno.test("closed Store leaf rejects getters, duplicate or unsafe host writes, and opaque expressions", () => {
  const getter = data();
  Object.defineProperty(getter.host, "key", { get() { throw new Error("unsafe key"); } });
  equal(normalizeClosedStoreHostProgram(getter), null);
  const duplicate = data();
  duplicate.host.props.push(["position-x", { kind: "literal", value: 2 }]);
  equal(normalizeClosedStoreHostProgram(duplicate), null);
  const event = data();
  event.host.props[0][0] = "onPointerDown";
  equal(normalizeClosedStoreHostProgram(event), null);
  const opaque = data();
  opaque.host.props[0][1] = { kind: "call", callee: "hidden" };
  equal(normalizeClosedStoreHostProgram(opaque), null);
  const object = data();
  object.host.props[0][1] = { kind: "literal", value: { x: 1 } };
  equal(normalizeClosedStoreHostProgram(object), null);
});
