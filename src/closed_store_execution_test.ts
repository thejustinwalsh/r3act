import {
  evaluateClosedStoreDataExecution, normalizeClosedStoreDataExecution,
  type ClosedStoreDataExecution,
} from "./closed_store_execution.ts";
import { normalizeClosedStoreHostProgram } from "./closed_store_host_program.ts";

const equal = (actual: unknown, expected: unknown) => {
  if (!Object.is(actual, expected)) {
    throw new Error(`Expected ${String(expected)}, received ${String(actual)}`);
  }
};
const marker = (programId = "motion", revision = "rev"): ClosedStoreDataExecution => ({
  schemaVersion: 1, kind: "owned-data", componentProgramId: programId,
  moduleRevision: revision,
});
const mixed = (): any => ({
  schemaVersion: 7, componentProgramId: "motion", moduleRevision: "rev",
  inputs: [{ storeUseSiteId: "frame", storeProp: "clock", paths: [["phase"], ["epoch"]] }],
  stateSites: ["offset"], effectSites: ["effect"], retainedChildProp: "children",
  host: { tag: "group", key: "motion", child: null, props: [
    ["rotation-y", { kind: "binary", operator: "+", left: {
      kind: "binary", operator: "*", left: { kind: "input", index: 0 },
      right: { kind: "literal", value: 2 },
    }, right: { kind: "input", index: 2 } }],
    ["position-x", { kind: "input", index: 1 }],
  ] },
});

Deno.test("data execution associates one normalized mixed host and preserves input order", () => {
  const raw = mixed();
  const host = normalizeClosedStoreHostProgram(raw)!;
  const execution = normalizeClosedStoreDataExecution(marker(), host)!;
  raw.host.props[0][1].right.index = 0;
  const output = evaluateClosedStoreDataExecution(execution, [2, -0, 3])!;
  equal(output[0][1], 7);
  equal(Object.is(output[1][1], -0), true);
  equal(Object.is(evaluateClosedStoreDataExecution(execution, [2, 0, 3])![1][1], -0), false);
  equal(evaluateClosedStoreDataExecution(execution, [2, Infinity, 3]), null);
  equal(evaluateClosedStoreDataExecution(execution, [2, 3]), null);
  equal(Object.isFrozen(output), true);
  equal(Object.isFrozen(output[0]), true);
});

Deno.test("data marker rejects mismatched, accessor and forged provenance", () => {
  const host = normalizeClosedStoreHostProgram(mixed())!;
  equal(normalizeClosedStoreDataExecution(marker("other"), host), null);
  equal(normalizeClosedStoreDataExecution(marker("motion", "old"), host), null);
  equal(normalizeClosedStoreDataExecution({ ...marker(), executeRange() { return 1; } }, host), null);
  const accessor = Object.defineProperty({ ...marker() }, "kind", {
    get() { throw new Error("getter must not run"); },
  });
  equal(normalizeClosedStoreDataExecution(accessor, host), null);
  const normalized = normalizeClosedStoreDataExecution(marker(), host)!;
  const forged = Object.freeze({ ...normalized });
  equal(evaluateClosedStoreDataExecution(forged as typeof normalized, [1, 2, 3]), null);
  equal(normalizeClosedStoreDataExecution(marker(), mixed() as typeof host), null);
});

Deno.test("data execution declines aggregate, logical and tree expansion", () => {
  const raw = mixed();
  raw.host.props[0][1] = { kind: "logical", operator: "&&",
    left: { kind: "input", index: 0 }, right: { kind: "input", index: 1 } } as never;
  equal(normalizeClosedStoreDataExecution(marker(), normalizeClosedStoreHostProgram(raw)!), null);
  const tree = normalizeClosedStoreHostProgram({
    schemaVersion: 5, componentProgramId: "tree", moduleRevision: "rev",
    inputs: [{ storeUseSiteId: "frame", storeProp: "clock", paths: [["epoch"]] }],
    host: { tag: "group", key: "tree", props: [["position-x", { kind: "input", index: 0 }]],
      children: [{ kind: "host", host: { tag: "mesh", key: "child", props: [], children: [] } }] },
  })!;
  equal(normalizeClosedStoreDataExecution(marker("tree"), tree), null);
});

Deno.test("renamed empty-child primitive group evaluates owned props", () => {
  const raw = {
    schemaVersion: 5, componentProgramId: "marker", moduleRevision: "rev",
    inputs: [{ storeUseSiteId: "frame", storeProp: "clock", paths: [["epoch"]] }],
    host: { tag: "group", key: "other-marker", children: [], props: [
      ["name", { kind: "literal", value: "phase-anchor" }],
      ["visible", { kind: "literal", value: true }],
      ["position-x", { kind: "input", index: 0 }],
    ] },
  };
  const execution = normalizeClosedStoreDataExecution(marker("marker"),
    normalizeClosedStoreHostProgram(raw)!)!;
  const output = evaluateClosedStoreDataExecution(execution, [-0])!;
  equal(output[0][1], "phase-anchor");
  equal(output[1][1], true);
  equal(Object.is(output[2][1], -0), true);
  raw.host.children.push({ kind: "text" } as never);
  equal(evaluateClosedStoreDataExecution(execution, [5])![2][1], 5);
  equal(normalizeClosedStoreDataExecution(marker("marker"),
    normalizeClosedStoreHostProgram(raw)!), null);
  raw.host.children.pop();
  raw.host.props[2][1] = { kind: "logical", operator: "&&",
    left: { kind: "input", index: 0 }, right: { kind: "literal", value: 1 } } as never;
  equal(normalizeClosedStoreDataExecution(marker("marker"),
    normalizeClosedStoreHostProgram(raw)!), null);
});
