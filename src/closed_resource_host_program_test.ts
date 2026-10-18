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
