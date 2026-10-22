import {
  closedStoreHostInputPaths,
  closedStoreHostInputs,
  closedStoreHostValueCount,
  evaluateClosedStoreHostProgram,
  evaluateClosedStoreHostTree,
  normalizeClosedStoreHostProgram,
} from "./closed_store_host_program.ts";
import { isOwnedClosedProjectionPaths } from "./owned_store_record.ts";

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

const subtreeData = (): any => ({
  schemaVersion: 4,
  componentProgramId: "module#component:Subtree",
  moduleRevision: "revision",
  inputs: [
    { storeUseSiteId: "site:0", storeProp: "position" },
    { storeUseSiteId: "site:1", storeProp: "camera" },
  ],
  host: { tag: "div", key: "root", props: [["style", { kind: "style", entries: [
    ["--offset", { kind: "input", index: 0 }],
  ] }]], children: [
    { kind: "host", host: { tag: "span", key: "label", props: [], children: [
      { kind: "text", expression: { kind: "template", parts: ["x=", " / ", ""], expressions: [
        { kind: "input", index: 0 }, { kind: "input", index: 1 },
      ] } },
    ] } },
    { kind: "host", host: { tag: "group", key: "scene", props: [], children: [
      { kind: "host", host: { tag: "mesh", key: "mesh", props: [["position", {
        kind: "tuple", items: [
          { kind: "input", index: 0 }, { kind: "input", index: 1 },
          { kind: "literal", value: 0 },
        ],
      }]], children: [] } },
    ] } },
  ] },
});

Deno.test("Store schema 6 retains only a declared child slot and flattened numeric inputs", () => {
  const raw = {
    schemaVersion: 6, componentProgramId: "module#component:Motion",
    moduleRevision: "revision", retainedChildProp: "children",
    inputs: [{ storeUseSiteId: "site:0", storeProp: "clock",
      paths: [["phase"], ["epoch"]] }],
    host: { tag: "group", key: "motion", child: null,
      props: [["rotation-y", { kind: "input", index: 0 }],
        ["position-x", { kind: "input", index: 1 }]] },
  };
  const program = normalizeClosedStoreHostProgram(raw)!;
  equal(program.schemaVersion, 6);
  equal(closedStoreHostValueCount(program), 2);
  equal(evaluateClosedStoreHostProgram(program, [2, 3])?.[0][1], 2);
  equal(evaluateClosedStoreHostTree(program, [2, 3]), null);
  raw.inputs[0].paths[0][0] = "changed";
  equal(closedStoreHostInputPaths(closedStoreHostInputs(program)[0])[0][0], "phase");
  equal(normalizeClosedStoreHostProgram({ ...raw, retainedChildProp: "content" }), null);
  equal(normalizeClosedStoreHostProgram({ ...raw,
    host: { ...raw.host, child: "unsafe" } }), null);
});

Deno.test("legacy direct Store path carries owned projection provenance", () => {
  const program = normalizeClosedStoreHostProgram(data())!;
  const paths = closedStoreHostInputPaths(closedStoreHostInputs(program)[0]);
  equal(isOwnedClosedProjectionPaths(paths), true);
  equal(paths.length, 1);
  equal(paths[0].length, 0);
});

Deno.test("Store schema 5 freezes lexical paths and flattens expression inputs", () => {
  const raw = subtreeData();
  raw.schemaVersion = 5;
  raw.inputs[0].paths = [["position", "x"], ["position", "y"]];
  raw.inputs[1].paths = [[]];
  raw.host.children[0].host.children[0].expression.expressions[1].index = 2;
  const program = normalizeClosedStoreHostProgram(raw)!;
  equal(program.schemaVersion, 5);
  equal(closedStoreHostValueCount(program), 3);
  const paths = closedStoreHostInputPaths(closedStoreHostInputs(program)[0]);
  equal(paths[0].join("."), "position.x");
  equal(paths[1].join("."), "position.y");
  equal(Object.isFrozen(paths), true);
  equal(Object.isFrozen(paths[0]), true);
  equal(isOwnedClosedProjectionPaths(paths), true);
  raw.inputs[0].paths[0][1] = "z";
  equal(paths[0][1], "x");
  equal(evaluateClosedStoreHostTree(program, [2, 3, 4])?.props.children[0].props.children,
    "x=2 / 4");
  equal(evaluateClosedStoreHostTree(program, [2, 3]), null);
  const legacy = normalizeClosedStoreHostProgram(subtreeData())!;
  equal(closedStoreHostInputPaths(closedStoreHostInputs(legacy)[0])[0].length, 0);
  equal(closedStoreHostValueCount(legacy), 2);
});

Deno.test("Store schema 5 enforces path, count and descriptor limits", () => {
  const source = () => {
    const raw = subtreeData();
    raw.schemaVersion = 5;
    raw.inputs[0].paths = [["position", "x"]];
    raw.inputs[1].paths = [[]];
    return raw;
  };
  const duplicate = source();
  duplicate.inputs[0].paths.push(["position", "x"]);
  equal(normalizeClosedStoreHostProgram(duplicate), null);
  const empty = source();
  empty.inputs[0].paths = [[]];
  equal(normalizeClosedStoreHostProgram(empty), null);
  const unsafe = source();
  unsafe.inputs[0].paths = [["__proto__"]];
  equal(normalizeClosedStoreHostProgram(unsafe), null);
  for (const depth of [9]) {
    const overdeep = source();
    overdeep.inputs[0].paths = [Array.from({ length: depth }, () => "x")];
    equal(normalizeClosedStoreHostProgram(overdeep), null);
  }
  const overcount = source();
  overcount.inputs[0].paths = Array.from({ length: 32 }, (_, index) => [`p${index}`]);
  equal(normalizeClosedStoreHostProgram(overcount), null);
  const thirtyTwo = source();
  thirtyTwo.inputs[0].paths = Array.from({ length: 31 }, (_, index) => [`p${index}`]);
  thirtyTwo.host.props[0][1].entries[0][1].index = 31;
  const bounded = normalizeClosedStoreHostProgram(thirtyTwo);
  equal(closedStoreHostValueCount(bounded!), 32);
  equal(evaluateClosedStoreHostTree(bounded!, Array.from({ length: 32 }, (_, index) => index))?.props.style["--offset"], 31);
  const accessor = source();
  Object.defineProperty(accessor.inputs[0].paths[0], "0", { get() { throw new Error("getter"); } });
  equal(normalizeClosedStoreHostProgram(accessor), null);
  const highIndex = source();
  highIndex.host.props[0][1].entries[0][1].index = 3;
  equal(normalizeClosedStoreHostProgram(highIndex), null);
});

Deno.test("Store schema 4 snapshots nested styles, text and tuples over joint inputs", () => {
  const raw = subtreeData();
  const program = normalizeClosedStoreHostProgram(raw)!;
  equal(program.schemaVersion, 4);
  if (program.schemaVersion !== 4) throw new Error("Expected Store schema 4");
  equal(closedStoreHostInputs(program).length, 2);
  raw.host.children[0].host.key = "changed";
  raw.host.children[1].host.children[0].host.props[0][1].items[2].value = 100;
  const first = evaluateClosedStoreHostTree(program, [2, 3])!;
  const second = evaluateClosedStoreHostTree(program, [4, 5])!;
  equal(first.props.style["--offset"], 2);
  equal(first.props.children[0].props.key, "label");
  equal(first.props.children[0].props.children, "x=2 / 3");
  equal(first.props.children[1].props.children.props.position[2], 0);
  equal(first.props.style === second.props.style, false);
  equal(first.props.children[1].props.children.props.position ===
    second.props.children[1].props.children.props.position, false);
  equal(Object.isFrozen(program.host), true);
  equal(Object.isFrozen(program.host.children), true);
  equal(evaluateClosedStoreHostProgram(program, [2, 3]), null);
  equal(evaluateClosedStoreHostTree(program, [2]), null);
  equal(evaluateClosedStoreHostTree(program, [2, Infinity]), null);
});

Deno.test("Store schema 4 declines absent text nodes and unsafe descriptors", () => {
  const absent = subtreeData();
  absent.host.children[0].host.children[0].expression = { kind: "literal", value: null };
  equal(evaluateClosedStoreHostTree(normalizeClosedStoreHostProgram(absent)!, [1, 2]), null);
  absent.host.children[0].host.children[0].expression = { kind: "literal", value: false };
  equal(evaluateClosedStoreHostTree(normalizeClosedStoreHostProgram(absent)!, [1, 2]), null);
  const duplicate = subtreeData();
  duplicate.host.children[1].host.children[0].host.key = "label";
  equal(normalizeClosedStoreHostProgram(duplicate), null);
  const accessor = subtreeData();
  Object.defineProperty(accessor.host.children[0], "host", { get() { throw new Error("unsafe"); } });
  equal(normalizeClosedStoreHostProgram(accessor), null);
  const cycle = subtreeData();
  cycle.host.children[0].host.children.push({ kind: "host", host: cycle.host });
  equal(normalizeClosedStoreHostProgram(cycle), null);
  const callback = subtreeData();
  callback.host.children[0].host.props.push(["onClick", { kind: "literal", value: 1 }]);
  equal(normalizeClosedStoreHostProgram(callback), null);
  const extra = subtreeData();
  extra.host.children[0].host.children[0].callback = () => {};
  equal(normalizeClosedStoreHostProgram(extra), null);
  const props = subtreeData();
  props.host.children[0].host.props = Array.from({ length: 33 }, (_, i) =>
    [`data-p${i}`, { kind: "literal", value: i }]);
  equal(normalizeClosedStoreHostProgram(props), null);
  const style = subtreeData();
  style.host.props[0][1].entries = Array.from({ length: 33 }, (_, i) =>
    [`--p${i}`, { kind: "literal", value: i }]);
  equal(normalizeClosedStoreHostProgram(style), null);
  const nodes = subtreeData();
  nodes.host.children = Array.from({ length: 256 }, (_, i) => ({ kind: "text", expression: {
    kind: "literal", value: String(i),
  } }));
  equal(normalizeClosedStoreHostProgram(nodes), null);
  const depth = subtreeData();
  let cursor = depth.host.children[1].host;
  for (let index = 0; index < 33; index++) {
    const next = { tag: "group", key: `deep:${index}`, props: [], children: [] as any[] };
    cursor.children = [{ kind: "host", host: next }];
    cursor = next;
  }
  equal(normalizeClosedStoreHostProgram(depth), null);
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
  const tree = evaluateClosedStoreHostTree(one, [3]);
  equal(tree?.type, "mesh");
  equal(tree?.props.key, "m");
  equal(tree?.props["position-x"], 6);
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
  equal(evaluateClosedStoreHostTree(program, [1, 2])?.props.position[1], 2);
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
