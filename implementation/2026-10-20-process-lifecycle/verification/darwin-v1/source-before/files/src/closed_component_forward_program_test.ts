import { normalizeClosedComponentForwardProgram } from "./closed_component_forward_program.ts";

const equal = (actual: unknown, expected: unknown, label: string) => {
  if (!Object.is(actual, expected)) throw new Error(`${label}: expected ${String(expected)}, got ${String(actual)}`);
};

let childCalls = 0;
const child = () => { childCalls++; throw new Error("component executed"); };
const valid = () => ({
  schemaVersion: 1,
  componentProgramId: "wrapper-site",
  moduleRevision: "revision-1",
  childComponentProgramId: "child-site",
  childComponent: child,
  key: "child-key" as string | null,
  props: [
    ["renamed", { kind: "prop", name: "source" }],
    ["offset", { kind: "literal", value: -0 }],
  ] as unknown[][],
});

Deno.test("forwarding metadata owns frozen pairs and preserves the direct child reference and signed zero", () => {
  const callsBefore = childCalls;
  const raw = valid();
  const program = normalizeClosedComponentForwardProgram(raw)!;
  equal(childCalls, callsBefore, "child function was not invoked");
  equal(program.childComponent, child, "direct function reference");
  equal(Object.isFrozen(program), true, "frozen program");
  equal(Object.isFrozen(program.props), true, "frozen props");
  equal(Object.isFrozen(program.props[0]), true, "frozen pair");
  equal(Object.isFrozen(program.props[0][1]), true, "frozen expression");
  equal(program.props[0][1].kind, "prop", "forwarded kind");
  equal(Object.is((program.props[1][1] as { value: number }).value, -0), true, "signed zero");
  (raw.props[0] as unknown[])[0] = "changed";
  (raw.props[0][1] as { name: string }).name = "changed";
  raw.props.push(["late", { kind: "literal", value: 1 }]);
  raw.key = null;
  equal(program.props[0][0], "renamed", "owned target name");
  equal((program.props[0][1] as { name: string }).name, "source", "owned source name");
  equal(program.props.length, 2, "owned pair list");
  equal(program.key, "child-key", "owned key");
});

Deno.test("forwarding metadata rejects malformed fields and unsafe prop names", () => {
  const reject = (change: (raw: ReturnType<typeof valid>) => unknown, label: string) =>
    equal(normalizeClosedComponentForwardProgram(change(valid())), null, label);
  reject((raw) => ({ ...raw, schemaVersion: 2 }), "schema");
  reject((raw) => ({ ...raw, componentProgramId: "" }), "empty site");
  reject((raw) => ({ ...raw, moduleRevision: "" }), "empty revision");
  reject((raw) => ({ ...raw, childComponentProgramId: "" }), "empty child site");
  reject((raw) => ({ ...raw, childComponent: {} }), "nonfunction child");
  reject((raw) => ({ ...raw, key: "" }), "empty key");
  reject((raw) => ({ ...raw, key: 1 }), "nonstring key");
  reject((raw) => ({ ...raw, extra: 1 }), "extra root field");
  reject((raw) => ({ ...raw, props: [["name", { kind: "literal", value: Infinity }]] }), "nonfinite literal");
  reject((raw) => ({ ...raw, props: [["name", { kind: "literal", value: undefined }]] }), "undefined literal");
  reject((raw) => ({ ...raw, props: [["name", { kind: "prop", name: "x", extra: 1 }]] }), "extra expression field");
  reject((raw) => ({ ...raw, props: [["name", { kind: "prop", name: "a-b" }]] }), "unsafe source name");
  reject((raw) => ({ ...raw, props: [["name", { kind: "literal", value: {} }]] }), "object literal");
  reject((raw) => ({ ...raw, props: [["name", { kind: "prop", name: "x" }], ["name", { kind: "prop", name: "y" }]] }), "duplicate target");
  reject((raw) => ({ ...raw, props: [["name"]] }), "short pair");
  reject((raw) => ({ ...raw, props: Array.from({ length: 33 }, (_, index) => [`p${index}`, { kind: "literal", value: index }]) }), "too many pairs");
  for (const name of ["key", "ref", "children", "__proto__", "constructor", "prototype", "a-b", "0name"]) {
    reject((raw) => ({ ...raw, props: [[name, { kind: "prop", name: "source" }]] }), `unsafe target ${name}`);
    reject((raw) => ({ ...raw, props: [["target", { kind: "prop", name }]] }), `unsafe source ${name}`);
  }
  equal(normalizeClosedComponentForwardProgram({ ...valid(), key: null })?.key, null, "missing key represented by null");
  equal(normalizeClosedComponentForwardProgram({ ...valid(), props: [] })?.props.length, 0, "empty finite prop list");
  equal(childCalls, 0, "malformed descriptors did not invoke child");
});

Deno.test("forwarding metadata declines accessors, symbols, sparse arrays and hostile proxies", () => {
  let rootReads = 0;
  const rootGetter = valid();
  Object.defineProperty(rootGetter, "childComponent", { get() { rootReads++; throw new Error("read child"); } });
  equal(normalizeClosedComponentForwardProgram(rootGetter), null, "root accessor");
  equal(rootReads, 0, "root accessor was not read");
  let expressionReads = 0;
  const expressionGetter = valid();
  Object.defineProperty(expressionGetter.props[0][1] as object, "name", { get() { expressionReads++; throw new Error("read name"); } });
  equal(normalizeClosedComponentForwardProgram(expressionGetter), null, "expression accessor");
  equal(expressionReads, 0, "expression accessor was not read");
  let pairReads = 0;
  const pairGetter = valid();
  Object.defineProperty(pairGetter.props[0], "1", { get() { pairReads++; throw new Error("read expression"); } });
  equal(normalizeClosedComponentForwardProgram(pairGetter), null, "pair accessor");
  equal(pairReads, 0, "pair accessor was not read");
  const symbol = valid() as ReturnType<typeof valid> & { [key: symbol]: unknown };
  symbol[Symbol("hidden")] = 1;
  equal(normalizeClosedComponentForwardProgram(symbol), null, "symbol root field");
  const sparse = valid();
  sparse.props = new Array(1);
  equal(normalizeClosedComponentForwardProgram(sparse), null, "sparse props");
  const hostile = new Proxy(valid(), { getOwnPropertyDescriptor() { throw new Error("hostile"); } });
  equal(normalizeClosedComponentForwardProgram(hostile), null, "proxy trap failure");
  equal(childCalls, 0, "declined descriptors did not invoke child");
});
