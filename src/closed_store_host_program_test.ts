import {
  closedStoreHostInputs,
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
  equal(evaluateClosedStoreHostProgram(normalized, {} as unknown as number), null);
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

const jointData = (): any => ({
  schemaVersion: 2,
  componentProgramId: "module#component:Joint",
  moduleRevision: "revision",
  inputs: [
    { storeUseSiteId: "module#component:Joint#store:0", storeProp: "position" },
    { storeUseSiteId: "module#component:Joint#store:1", storeProp: "camera" },
  ],
  host: { tag: "mesh", key: "joint", child: null, props: [
    ["position-x", { kind: "binary", operator: "+",
      left: { kind: "input", index: 0 }, right: { kind: "input", index: 1 } }],
    ["visible", { kind: "conditional", test: { kind: "input", index: 1 },
      consequent: { kind: "literal", value: true },
      alternate: { kind: "literal", value: false } }],
  ] },
});

Deno.test("joint Store host program snapshots ordered inputs and evaluates complete primitive tuples", () => {
  const raw = jointData();
  const program = normalizeClosedStoreHostProgram(raw);
  if (!program) throw new Error("Expected joint Store program");
  equal(program.schemaVersion, 2);
  const inputs = closedStoreHostInputs(program);
  equal(inputs.length, 2);
  equal(inputs[0].storeProp, "position");
  equal(inputs[1].storeProp, "camera");
  equal(Object.isFrozen(inputs), true);
  equal(Object.isFrozen(inputs[0]), true);
  raw.inputs[0].storeProp = "mutated";
  raw.host.props[0][1].right.index = 0;
  const output = evaluateClosedStoreHostProgram(program, [2, 3]);
  if (!output) throw new Error("Expected joint output");
  equal(output[0][1], 5);
  equal(output[1][1], true);
  equal(evaluateClosedStoreHostProgram(program, 2), null);
  equal(evaluateClosedStoreHostProgram(program, [2]), null);
  equal(evaluateClosedStoreHostProgram(program, [2, Infinity]), null);
  equal(evaluateClosedStoreHostProgram(program, [2, 3, 4]), null);
  const one = normalizeClosedStoreHostProgram(data());
  if (!one) throw new Error("Expected schema-1 program");
  equal(closedStoreHostInputs(one)[0].storeProp, "position");
  equal(evaluateClosedStoreHostProgram(one, [3])?.[0][1], 6);
});

Deno.test("joint Store host program rejects duplicate sites, getters, wrong indexes and oversized footprints", () => {
  const duplicate = jointData();
  duplicate.inputs[1].storeUseSiteId = duplicate.inputs[0].storeUseSiteId;
  equal(normalizeClosedStoreHostProgram(duplicate), null);
  const getter = jointData();
  Object.defineProperty(getter.inputs[1], "storeProp", { get() { throw new Error("unsafe"); } });
  equal(normalizeClosedStoreHostProgram(getter), null);
  const index = jointData();
  index.host.props[0][1].right.index = 2;
  equal(normalizeClosedStoreHostProgram(index), null);
  const large = jointData();
  for (let number = 2; number <= 8; number++) {
    large.inputs.push({ storeUseSiteId: `site:${number}`, storeProp: `source${number}` });
  }
  equal(normalizeClosedStoreHostProgram(large), null);
  const extra = jointData();
  extra.storeProp = "old";
  equal(normalizeClosedStoreHostProgram(extra), null);
});

const structuredData = (): any => ({
  schemaVersion: 3,
  componentProgramId: "module#component:Values",
  moduleRevision: "revision",
  inputs: [
    { storeUseSiteId: "module#component:Values#store:0", storeProp: "position" },
    { storeUseSiteId: "module#component:Values#store:1", storeProp: "camera" },
  ],
  host: { tag: "mesh", key: "values", child: null, props: [["position", {
    kind: "tuple", items: [
      { kind: "input", index: 0 }, { kind: "input", index: 1 },
      { kind: "literal", value: 3 },
    ],
  }]] },
});

Deno.test("Store schema 3 evaluates fresh stable triples and one to eight direct inputs", () => {
  const raw = structuredData();
  const program = normalizeClosedStoreHostProgram(raw)!;
  equal(program.schemaVersion, 3);
  raw.host.props[0][1].items[2].value = 99;
  const first = evaluateClosedStoreHostProgram(program, [1, 2])!;
  const next = evaluateClosedStoreHostProgram(program, [4, 5])!;
  equal((first[0][1] as readonly number[])[2], 3);
  equal((next[0][1] as readonly number[])[0], 4);
  equal(first[0][1] === next[0][1], false);
  equal(Object.isFrozen(first[0][1]), true);
  equal(evaluateClosedStoreHostProgram(program, [1]), null);
  const one = structuredData();
  one.inputs.pop();
  one.host.props[0][1].items[1] = { kind: "literal", value: 2 };
  equal(normalizeClosedStoreHostProgram(one)?.schemaVersion, 3);
  const eight = structuredData();
  for (let index = 2; index < 8; index++) {
    eight.inputs.push({ storeUseSiteId: `site:${index}`, storeProp: `source${index}` });
  }
  equal(normalizeClosedStoreHostProgram(eight)?.schemaVersion, 3);
  eight.inputs.push({ storeUseSiteId: "site:8", storeProp: "source8" });
  equal(normalizeClosedStoreHostProgram(eight), null);
});

Deno.test("Store schema 3 accepts DOM style and declines malformed aggregate outputs", () => {
  const raw = structuredData();
  raw.host.tag = "span";
  raw.host.props = [["style", { kind: "style", entries: [
    ["color", { kind: "literal", value: "red" }],
    ["--offset", { kind: "input", index: 0 }],
  ] }]];
  const program = normalizeClosedStoreHostProgram(raw)!;
  const first = evaluateClosedStoreHostProgram(program, [1, 2])!;
  const next = evaluateClosedStoreHostProgram(program, [3, 4])!;
  equal((first[0][1] as Record<string, unknown>)["--offset"], 1);
  equal(first[0][1] === next[0][1], false);
  for (const tag of ["div", "output"]) {
    raw.host.tag = tag;
    equal(normalizeClosedStoreHostProgram(raw)?.schemaVersion, 3);
  }
  for (const tag of ["group", "mesh"]) {
    const triple = structuredData(); triple.host.tag = tag;
    equal(normalizeClosedStoreHostProgram(triple)?.schemaVersion, 3);
  }
  const symbol = structuredData();
  symbol.host.props[0][1][Symbol("extra")] = true;
  equal(normalizeClosedStoreHostProgram(symbol), null);
  const accessor = structuredData();
  Object.defineProperty(accessor.host.props[0][1].items, "0", {
    get() { throw new Error("hidden"); },
  });
  equal(normalizeClosedStoreHostProgram(accessor), null);
  const cycle = structuredData();
  cycle.host.props[0][1].items[1] = cycle.host.props[0][1];
  equal(normalizeClosedStoreHostProgram(cycle), null);
  const nonfinite = structuredData();
  nonfinite.host.props[0][1].items[2] = { kind: "binary", operator: "/",
    left: { kind: "literal", value: 1 }, right: { kind: "literal", value: 0 } };
  equal(evaluateClosedStoreHostProgram(normalizeClosedStoreHostProgram(nonfinite)!, [1, 2]), null);
  const old = structuredData(); old.schemaVersion = 2;
  equal(normalizeClosedStoreHostProgram(old), null);
  const legacySpan = data(); legacySpan.host.tag = "span";
  equal(normalizeClosedStoreHostProgram(legacySpan), null);
});
