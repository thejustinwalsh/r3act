import {
  evaluateClosedResourceHostProgram,
  normalizeClosedResourceHostProgram,
} from "./closed_resource_host_program.ts";

const equal = (actual: unknown, expected: unknown, label: string) => {
  if (!Object.is(actual, expected)) {
    throw new Error(`${label}: expected ${String(expected)}, got ${String(actual)}`);
  }
};

const descriptor = () => ({
  schemaVersion: 1,
  componentProgramId: "example.tsx#component:Ready",
  moduleRevision: "sha:example",
  resourceUseSiteId: "example.tsx#component:Ready#store:0",
  resourceProp: "resource",
  host: {
    tag: "div",
    key: "b-primary",
    props: [["data-b", "primary"]],
    child: "resource-value",
  },
});

Deno.test("closed resource host program snapshots data and constructs keyed primitive host", () => {
  const raw = descriptor();
  const program = normalizeClosedResourceHostProgram(raw);
  equal(!!program, true, "normalized");
  raw.host.props[0][1] = "mutated";
  Object.defineProperty(raw.host, "key", { get: () => { throw new Error("getter reached"); } });
  const tree = evaluateClosedResourceHostProgram(program!, "ready");
  equal(tree?.type, "div", "host tag");
  equal(tree?.props.key, "b-primary", "stable key");
  equal(tree?.props["data-b"], "primary", "captured prop");
  equal(tree?.props.children, "ready", "ready child");
  equal(Object.isFrozen(program?.host.props[0]), true, "frozen tuple");
  equal(Object.isFrozen(tree?.props), true, "frozen output");
});

Deno.test("closed resource host program declines getters, unsafe props and nonprimitive ready values", () => {
  const getter = descriptor();
  Object.defineProperty(getter, "resourceProp", { get: () => "resource" });
  equal(normalizeClosedResourceHostProgram(getter), null, "getter declined");
  const duplicate = descriptor();
  duplicate.host.props.push(["data-b", "duplicate"]);
  equal(normalizeClosedResourceHostProgram(duplicate), null, "duplicate prop declined");
  for (const name of ["ref", "onClick", "style", "children", "__proto__", "data--bad"]) {
    const raw = descriptor();
    raw.host.props[0][0] = name;
    equal(normalizeClosedResourceHostProgram(raw), null, `${name} declined`);
  }
  const program = normalizeClosedResourceHostProgram(descriptor())!;
  equal(evaluateClosedResourceHostProgram(program, { value: "ready" }), null, "object declined");
  equal(evaluateClosedResourceHostProgram(program, true), null, "true is not a runtime child");
});

const subtreeDescriptor = (): any => ({
  schemaVersion: 2,
  componentProgramId: "example.tsx#component:Tree",
  moduleRevision: "sha:example",
  resourceUseSiteId: "example.tsx#component:Tree#store:0",
  resourceProp: "resource",
  host: {
    tag: "div",
    key: "root",
    props: [["data-kind", { kind: "literal", value: "ready" }]],
    children: [
      { kind: "host", host: {
        tag: "span", key: "text", props: [],
        children: [{ kind: "text", expression: { kind: "input", index: 0 } }],
      } },
      { kind: "host", host: {
        tag: "output", key: "computed", props: [["data-count", {
          kind: "binary", operator: "+", left: { kind: "input", index: 0 },
          right: { kind: "literal", value: 1 },
        }]], children: [],
      } },
    ],
  },
});

Deno.test("closed resource subtree snapshots nested primitive expressions and builds keyed hosts", () => {
  const raw = subtreeDescriptor();
  const program = normalizeClosedResourceHostProgram(raw);
  equal(program?.schemaVersion, 2, "schema 2 normalized");
  raw.host.children[0].host!.key = "mutated";
  raw.host.children[1].host!.props[0][1].right.value = 999;
  const tree = evaluateClosedResourceHostProgram(program!, 4);
  equal(tree?.props.key, "root", "root key");
  equal(tree?.props["data-kind"], "ready", "literal prop");
  const children = tree?.props.children;
  equal(children[0].type, "span", "first nested host");
  equal(children[0].props.key, "text", "captured nested key");
  equal(children[0].props.children, 4, "captured resource child");
  equal(children[1].type, "output", "second nested host");
  equal(children[1].props["data-count"], 5, "closed computed prop");
  equal(Object.isFrozen(program?.host), true, "frozen host");
  equal(Object.isFrozen(children), true, "frozen output children");
});

Deno.test("closed resource subtree declines unsafe shape, getters and nonprimitive output", () => {
  const getter = subtreeDescriptor();
  Object.defineProperty(getter.host.children[0].host, "key", {
    get: () => { throw new Error("getter reached"); },
  });
  equal(normalizeClosedResourceHostProgram(getter), null, "nested getter declined");
  const duplicate = subtreeDescriptor();
  duplicate.host.children[1].host!.key = "text";
  equal(normalizeClosedResourceHostProgram(duplicate), null, "duplicate nested key declined");
  const unsafe = subtreeDescriptor();
  unsafe.host.children[1].host!.props[0][0] = "onClick";
  equal(normalizeClosedResourceHostProgram(unsafe), null, "event prop declined");
  const program = normalizeClosedResourceHostProgram(subtreeDescriptor())!;
  equal(evaluateClosedResourceHostProgram(program, { value: 1 }), null, "object value declined");
  equal(evaluateClosedResourceHostProgram(program, true), null, "true text child declined");
});
