import {
  createOwnedScalarStorePropDelta, evaluateClosedStoreDataExecution,
  bindOwnedClosedStoreOutputRequest,
  inspectClosedStoreDataExecution, isOwnedScalarStorePropDelta,
  normalizeClosedStoreDataExecution,
  prepareOwnedClosedStoreOutputs, type ClosedStoreDataExecution,
  type OwnedClosedStoreOutputRequest,
} from "./closed_store_execution.ts";
import { normalizeClosedStoreHostProgram } from "./closed_store_host_program.ts";
import { createAsyncStore, StoreRenderTransaction } from "./async_store_runtime.ts";
import { OwnerStateWorld } from "./owner_state_world.ts";
import { storeRecord } from "./owned_store_record.ts";

const equal = (actual: unknown, expected: unknown) => {
  if (!Object.is(actual, expected)) {
    throw new Error(`Expected ${String(expected)}, received ${String(actual)}`);
  }
};
const marker = (programId = "motion", revision = "rev"): ClosedStoreDataExecution => ({
  schemaVersion: 1, kind: "owned-data", componentProgramId: programId,
  moduleRevision: revision,
});
const scalarMarker = (
  numericKernel?: (inputs: readonly number[], outputs: number[]) => void,
  programId = "motion", revision = "rev",
): ClosedStoreDataExecution => ({ schemaVersion: 2, kind: "owned-data",
  componentProgramId: programId, moduleRevision: revision, numericKernel });
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

Deno.test("verified scalar execution preserves ordered outputs and private selection", () => {
  const host = normalizeClosedStoreHostProgram(mixed())!;
  const numericKernel = (inputs: readonly number[], outputs: number[]) => {
    outputs[0] = ((inputs[0] * 2) + inputs[2]);
    outputs[1] = inputs[1];
  };
  const execution = normalizeClosedStoreDataExecution(scalarMarker(numericKernel), host)!;
  equal(inspectClosedStoreDataExecution(execution)?.mode, "verified-scalar");
  equal(Object.isFrozen(inspectClosedStoreDataExecution(execution)), true);
  equal("kernel" in inspectClosedStoreDataExecution(execution)!, false);
  Object.defineProperty(numericKernel, "apply", { value() {
    throw new Error("candidate-owned apply must not run");
  } });
  const first = evaluateClosedStoreDataExecution(execution, [2, -0, 3])!;
  equal(first[0][1], 7);
  equal(Object.is(first[1][1], -0), true);
  const next = evaluateClosedStoreDataExecution(execution, [5, 6, 4])!;
  equal(next[0][1], 14);
  equal(next[1][1], 6);
  equal(first[0][1], 7);
  equal(Object.is(first[1][1], -0), true);
  equal(evaluateClosedStoreDataExecution(execution, [1, Infinity, 2]), null);
  equal(evaluateClosedStoreDataExecution(execution, [1, 2]), null);
});

Deno.test("verified scratch construction uses its captured property intrinsic", () => {
  const host = normalizeClosedStoreHostProgram(mixed())!;
  const execution = normalizeClosedStoreDataExecution(scalarMarker((i, o) => {
    o[0] = i[0] * 2 + i[2]; o[1] = i[1];
  }), host)!;
  equal(inspectClosedStoreDataExecution(execution)?.mode, "verified-scalar");
  const original = Object.defineProperty;
  let calls = 0;
  Object.defineProperty = (() => { calls++; throw new Error("late property hook"); }) as typeof original;
  try {
    equal(evaluateClosedStoreDataExecution(execution, [2, 3, 4])![0][1], 8);
    equal(calls, 0);
  } finally { Object.defineProperty = original; }
});

Deno.test("compact renamed emitted kernel keeps the same association", () => {
  const host = normalizeClosedStoreHostProgram({
    schemaVersion: 6, componentProgramId: "compact", moduleRevision: "rev",
    retainedChildProp: "children",
    inputs: [{ storeUseSiteId: "clock", storeProp: "clock", paths: [[]] }],
    host: { tag: "group", key: "compact", child: null, props: [
      ["position-x", { kind: "binary", operator: "*",
        left: { kind: "input", index: 0 }, right: { kind: "literal", value: 2 } }],
    ] },
  })!;
  const execution = normalizeClosedStoreDataExecution(scalarMarker(
    function(a,b){b[0]=a[0]*2;}, "compact"), host)!;
  equal(inspectClosedStoreDataExecution(execution)?.mode, "verified-scalar");
  equal(evaluateClosedStoreDataExecution(execution, [3])![0][1], 6);
});

Deno.test("optional v2 scalar kernels fall back and malformed descriptors decline", () => {
  const host = normalizeClosedStoreHostProgram(mixed())!;
  for (const candidate of [scalarMarker(),
    { ...scalarMarker(), numericKernel: 17 },
    scalarMarker((inputs, outputs) => { outputs[0] = inputs[0];
      outputs[1] = inputs[1]; })]) {
    const execution = normalizeClosedStoreDataExecution(candidate, host)!;
    equal(inspectClosedStoreDataExecution(execution)?.mode, "interpreted");
    equal(evaluateClosedStoreDataExecution(execution, [2, 3, 4])![0][1], 8);
  }
  let calls = 0;
  const hostile = (inputs: readonly number[], outputs: number[]) => {
    calls++;
    outputs[0] = inputs[0];
  };
  const safe = normalizeClosedStoreDataExecution(scalarMarker(hostile), host)!;
  equal(inspectClosedStoreDataExecution(safe)?.mode, "interpreted");
  equal(calls, 0);
  equal(normalizeClosedStoreDataExecution({ ...scalarMarker(), extra: true }, host), null);
  equal(normalizeClosedStoreDataExecution(scalarMarker(undefined, "motion", "stale"), host), null);
  const accessor = Object.defineProperty({ ...scalarMarker() }, "numericKernel", {
    get() { throw new Error("metadata getter"); },
  });
  equal(normalizeClosedStoreDataExecution(accessor, host), null);
});

Deno.test("verified scalar keeps nonnumeric schema-five literals in one output", () => {
  const host = normalizeClosedStoreHostProgram({
    schemaVersion: 5, componentProgramId: "marker-v2", moduleRevision: "rev",
    inputs: [{ storeUseSiteId: "clock", storeProp: "clock", paths: [["phase"]] }],
    host: { tag: "group", key: "marker", children: [], props: [
      ["name", { kind: "literal", value: "phase-anchor" }],
      ["visible", { kind: "literal", value: true }],
      ["position-x", { kind: "input", index: 0 }],
    ] },
  })!;
  const execution = normalizeClosedStoreDataExecution(scalarMarker(
    (inputs, outputs) => { outputs[0] = inputs[0]; }, "marker-v2"), host)!;
  equal(inspectClosedStoreDataExecution(execution)?.mode, "verified-scalar");
  const output = evaluateClosedStoreDataExecution(execution, [-0])!;
  equal(output[0][1], "phase-anchor");
  equal(output[1][1], true);
  equal(Object.is(output[2][1], -0), true);
  equal(Object.isFrozen(output), true);
  equal(Object.isFrozen(output[2]), true);
});

Deno.test("verified scalar retains grouping, signed zero and nonfinite intermediates", () => {
  const input = { kind: "input", index: 0 };
  const literal = (value: number) => ({ kind: "literal", value });
  const binary = (operator: string, left: unknown, right: unknown) =>
    ({ kind: "binary", operator, left, right });
  const host = normalizeClosedStoreHostProgram({
    schemaVersion: 6, componentProgramId: "coercion", moduleRevision: "rev",
    retainedChildProp: "children",
    inputs: [{ storeUseSiteId: "clock", storeProp: "clock", paths: [[]] }],
    host: { tag: "group", key: "coercion", child: null, props: [
      ["position-x", binary("-", binary("-", input, literal(1)), literal(2))],
      ["position-y", binary("|", binary("*", input, literal(2)), literal(0))],
      ["position-z", binary("|", binary("/", literal(0), literal(0)), literal(0))],
      ["rotation-x", { kind: "unary", operator: "-", argument: literal(0) }],
    ] },
  })!;
  const execution = normalizeClosedStoreDataExecution(scalarMarker((inputs, outputs) => {
    outputs[0] = ((inputs[0] - 1) - 2);
    outputs[1] = ((inputs[0] * 2) | 0);
    outputs[2] = ((0 / 0) | 0);
    outputs[3] = (-0);
  }, "coercion"), host)!;
  equal(inspectClosedStoreDataExecution(execution)?.mode, "verified-scalar");
  const output = evaluateClosedStoreDataExecution(execution, [Number.MAX_VALUE])!;
  equal(output[0][1], Number.MAX_VALUE);
  equal(output[1][1], 0);
  equal(output[2][1], 0);
  equal(Object.is(output[3][1], -0), true);
  const groupedWrong = normalizeClosedStoreDataExecution(scalarMarker((inputs, outputs) => {
    outputs[0] = (inputs[0] - (1 - 2));
    outputs[1] = ((inputs[0] * 2) | 0);
    outputs[2] = ((0 / 0) | 0);
    outputs[3] = (-0);
  }, "coercion"), host)!;
  equal(inspectClosedStoreDataExecution(groupedWrong)?.mode, "interpreted");
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

Deno.test("enclosed outputs preserve ordered projection, state and alternating program rows", () => {
  const world = new OwnerStateWorld();
  const firstOwner = world.resolveOwner(null, "first");
  const secondOwner = world.resolveOwner(null, "second");
  world.useState(firstOwner, "offset", 3);
  world.useState(secondOwner, "offset", 4);
  const firstStore = createAsyncStore(storeRecord({ phase: 2, epoch: -0 }));
  const secondStore = createAsyncStore(storeRecord({ phase: 5, epoch: 6 }));
  const first = normalizeClosedStoreDataExecution(marker(),
    normalizeClosedStoreHostProgram(mixed())!)!;
  const alternate = mixed();
  alternate.host.props.reverse();
  const second = normalizeClosedStoreDataExecution(marker(),
    normalizeClosedStoreHostProgram(alternate)!)!;
  const requests: OwnedClosedStoreOutputRequest[] = [
    { execution: first, owner: firstOwner, hostKey: "scope\u0000motion",
      inputs: [{ store: firstStore, readerId: "first\u0000frame" }] },
    { execution: second, owner: secondOwner, hostKey: "other\u0000motion",
      inputs: [{ store: secondStore, readerId: "second\u0000frame" }] },
  ];
  const transaction = new StoreRenderTransaction("enclosed");
  const result = prepareOwnedClosedStoreOutputs(world, transaction, requests);
  if (!result || result.kind !== "ready") throw new Error("enclosed batch declined");
  equal(result.rows.length, 2);
  equal(result.rows[0].region.key, "scope\u0000motion");
  equal(result.rows[0].region.componentOwner, firstOwner);
  equal(result.rows[0].region.retainedChildren, true);
  equal(result.rows[0].region.props[0][1], 7);
  equal(Object.is(result.rows[0].region.props[1][1], -0), true);
  equal(result.rows[1].region.props[0][0], "position-x");
  equal(result.rows[1].region.props[0][1], 6);
  equal(result.rows[1].region.props[1][1], 14);
  equal(result.rows[0].region.props[0][1], 7);
  equal(isOwnedScalarStorePropDelta(result.rows[0].region), true);
  equal(Object.isFrozen(result.rows[0].region.props[0]), true);
  equal(transaction.observations.size, 2);
  equal(result.rows[0].cells[0].value, 3);
  equal(result.rows[1].cells[0].value, 4);
  transaction.discard();
});

Deno.test("bound scalar request reuses static inputs with fresh World and Store values", () => {
  const world = new OwnerStateWorld();
  const owner = world.resolveOwner(null, "bound-execution");
  const [, dispatchOffset] = world.useState(owner, "offset", 3);
  const store = createAsyncStore(storeRecord({ phase: 2, epoch: -0 }));
  const execution = normalizeClosedStoreDataExecution(marker(),
    normalizeClosedStoreHostProgram(mixed())!)!;
  const input = { store, readerId: "original-reader" };
  const raw = { execution, owner, hostKey: "original-key", inputs: [input] };
  const bound = bindOwnedClosedStoreOutputRequest(raw);
  if (!bound) throw new Error("scalar binding declined");
  raw.hostKey = "changed-key";
  input.readerId = "changed-reader";
  const firstTransaction = new StoreRenderTransaction("bound-first");
  const first = prepareOwnedClosedStoreOutputs(world, firstTransaction, [bound]);
  if (!first || first.kind !== "ready") throw new Error("first bound output declined");
  equal(first.rows[0].region.key, "original-key");
  equal(first.rows[0].region.props[0][1], 7);
  equal(Object.is(first.rows[0].region.props[1][1], -0), true);
  equal(firstTransaction.readers.has("original-reader"), true);
  firstTransaction.discard();
  dispatchOffset(4);
  store.dispatch(storeRecord({ phase: 5, epoch: 6 }));
  const secondTransaction = new StoreRenderTransaction("bound-second");
  const second = prepareOwnedClosedStoreOutputs(world, secondTransaction, [bound]);
  if (!second || second.kind !== "ready") throw new Error("reused bound output declined");
  equal(second.rows[0].region.props[0][1], 14);
  equal(second.rows[0].region.props[1][1], 6);
  equal(first.rows[0].region.props[0][1], 7);
  equal(Object.isFrozen(first.rows[0].region.props), true);
  equal(second.rows[0].cells[0].version, first.rows[0].cells[0].version + 1);
  secondTransaction.discard();
  const forged = Object.freeze({}) as unknown as typeof bound;
  equal(prepareOwnedClosedStoreOutputs(world, new StoreRenderTransaction("forged"),
    [forged]), null);
  equal(prepareOwnedClosedStoreOutputs(world, new StoreRenderTransaction("proxy"),
    [new Proxy(bound, {})]), null);
  let constructorForged = false;
  try {
    const Constructor = bound.constructor as unknown as new (...args: unknown[]) => typeof bound;
    new Constructor(Symbol("forged"), { owner, hostKey: "forged" });
    constructorForged = true;
  } catch { /* expected */ }
  equal(constructorForged, false);
  const ReceiptClass = bound.constructor as unknown as {
    unwrap: (...args: unknown[]) => unknown;
  };
  equal(ReceiptClass.unwrap(Symbol("forged"), bound), null);
  const originalUnwrap = ReceiptClass.unwrap;
  ReceiptClass.unwrap = () => { throw new Error("public unwrap replacement ran"); };
  try {
    const unaffected = new StoreRenderTransaction("bound-static-replacement");
    equal(prepareOwnedClosedStoreOutputs(world, unaffected, [bound])?.kind, "ready");
    unaffected.discard();
  } finally { ReceiptClass.unwrap = originalUnwrap; }
  equal(bindOwnedClosedStoreOutputRequest({ ...raw,
    execution: Object.freeze({ ...execution }) as typeof execution }), null);
});

Deno.test("verified enclosed rows reuse scratch across alternating independent inputs", () => {
  const world = new OwnerStateWorld();
  const firstOwner = world.resolveOwner(null, "verified-first");
  const secondOwner = world.resolveOwner(null, "verified-second");
  world.useState(firstOwner, "offset", 3);
  world.useState(secondOwner, "offset", 4);
  const firstStore = createAsyncStore(storeRecord({ phase: 2, epoch: -0 }));
  const secondStore = createAsyncStore(storeRecord({ phase: 5, epoch: 6 }));
  const first = normalizeClosedStoreDataExecution(scalarMarker((inputs, outputs) => {
    outputs[0] = ((inputs[0] * 2) + inputs[2]);
    outputs[1] = inputs[1];
  }), normalizeClosedStoreHostProgram(mixed())!)!;
  const alternate = mixed();
  alternate.host.props.reverse();
  const second = normalizeClosedStoreDataExecution(scalarMarker((inputs, outputs) => {
    outputs[0] = inputs[1];
    outputs[1] = ((inputs[0] * 2) + inputs[2]);
  }), normalizeClosedStoreHostProgram(alternate)!)!;
  equal(inspectClosedStoreDataExecution(first)?.mode, "verified-scalar");
  equal(inspectClosedStoreDataExecution(second)?.mode, "verified-scalar");
  const transaction = new StoreRenderTransaction("verified-alternating");
  const result = prepareOwnedClosedStoreOutputs(world, transaction, [
    { execution: first, owner: firstOwner, hostKey: "first-key",
      inputs: [{ store: firstStore, readerId: "first-reader" }] },
    { execution: second, owner: secondOwner, hostKey: "second-key",
      inputs: [{ store: secondStore, readerId: "second-reader" }] },
  ]);
  if (!result || result.kind !== "ready") throw new Error("verified batch declined");
  equal(result.rows[0].region.props[0][1], 7);
  equal(Object.is(result.rows[0].region.props[1][1], -0), true);
  equal(result.rows[1].region.props[0][1], 6);
  equal(result.rows[1].region.props[1][1], 14);
  equal(result.rows[0].region.props[0][1], 7);
  equal(transaction.readers.size, 2);
  transaction.discard();
});

Deno.test("alternating verified row widths retain earlier outputs and reader cuts", () => {
  const world = new OwnerStateWorld();
  const firstOwner = world.resolveOwner(null, "short-first");
  const wideOwner = world.resolveOwner(null, "wide-middle");
  const lastOwner = world.resolveOwner(null, "short-last");
  world.useState(wideOwner, "offset", 4);
  const firstStore = createAsyncStore(-0);
  const wideStore = createAsyncStore(storeRecord({ phase: 5, epoch: 6 }));
  const lastStore = createAsyncStore(9);
  const short = normalizeClosedStoreDataExecution(scalarMarker(
    (inputs, outputs) => { outputs[0] = inputs[0]; }, "short"),
  normalizeClosedStoreHostProgram({
    schemaVersion: 6, componentProgramId: "short", moduleRevision: "rev",
    retainedChildProp: "children",
    inputs: [{ storeUseSiteId: "clock", storeProp: "clock", paths: [[]] }],
    host: { tag: "group", key: "short", child: null, props: [
      ["position-x", { kind: "input", index: 0 }],
    ] },
  })!)!;
  const wide = normalizeClosedStoreDataExecution(scalarMarker((inputs, outputs) => {
    outputs[0] = ((inputs[0] * 2) + inputs[2]);
    outputs[1] = inputs[1];
  }), normalizeClosedStoreHostProgram(mixed())!)!;
  equal(inspectClosedStoreDataExecution(short)?.mode, "verified-scalar");
  equal(inspectClosedStoreDataExecution(wide)?.mode, "verified-scalar");
  const transaction = new StoreRenderTransaction("alternating-widths");
  const result = prepareOwnedClosedStoreOutputs(world, transaction, [
    { execution: short, owner: firstOwner, hostKey: "first",
      inputs: [{ store: firstStore, readerId: "short-first-reader" }] },
    { execution: wide, owner: wideOwner, hostKey: "wide",
      inputs: [{ store: wideStore, readerId: "wide-reader" }] },
    { execution: short, owner: lastOwner, hostKey: "last",
      inputs: [{ store: lastStore, readerId: "short-last-reader" }] },
  ]);
  if (!result || result.kind !== "ready") throw new Error("alternating widths declined");
  equal(Object.is(result.rows[0].region.props[0][1], -0), true);
  equal(result.rows[1].region.props[0][1], 14);
  equal(result.rows[1].region.props[1][1], 6);
  equal(result.rows[2].region.props[0][1], 9);
  equal(Object.is(result.rows[0].region.props[0][1], -0), true);
  equal(result.rows[1].region.props[0][1], 14);
  equal(transaction.readers.size, 3);
  transaction.discard();
  equal(result.rows[1].region.props[1][1], 6);
});

Deno.test("passive capture decline requests the untouched public route", () => {
  const world = new OwnerStateWorld();
  const owner = world.resolveOwner(null, "fallback");
  const store = createAsyncStore(2);
  const host = normalizeClosedStoreHostProgram({
    schemaVersion: 6, componentProgramId: "fallback", moduleRevision: "rev",
    retainedChildProp: "children",
    inputs: [{ storeUseSiteId: "clock", storeProp: "clock", paths: [[]] }],
    host: { tag: "group", key: "fallback", child: null, props: [
      ["position-x", { kind: "input", index: 0 }],
    ] },
  })!;
  const execution = normalizeClosedStoreDataExecution(marker("fallback"), host)!;
  const request = [{ execution, owner, hostKey: "fallback",
    inputs: [{ store, readerId: "fallback" }] }];
  const original = world.ownerLineage;
  world.ownerLineage = (() => { throw new Error("public World callback"); }) as typeof original;
  const worldDeclined = new StoreRenderTransaction("world-declined");
  equal(prepareOwnedClosedStoreOutputs(world, worldDeclined, request)?.kind,
    "public-required");
  equal(worldDeclined.observations.size, 0);
  worldDeclined.discard();
  Reflect.deleteProperty(world, "ownerLineage");
  const storeDeclined = new StoreRenderTransaction("store-declined");
  storeDeclined.readClosedProjections = (() => {
    throw new Error("public Store callback");
  }) as typeof storeDeclined.readClosedProjections;
  equal(prepareOwnedClosedStoreOutputs(world, storeDeclined, request)?.kind,
    "public-required");
  equal(storeDeclined.observations.size, 0);
  storeDeclined.discard();
});

Deno.test("enclosed outputs retain independent histories for one Store projection", () => {
  const world = new OwnerStateWorld();
  const owner = world.resolveOwner(null, "shared");
  const store = createAsyncStore(9);
  const host = normalizeClosedStoreHostProgram({
    schemaVersion: 6, componentProgramId: "shared", moduleRevision: "rev",
    retainedChildProp: "children", inputs: [
      { storeUseSiteId: "left", storeProp: "clock", paths: [[]] },
      { storeUseSiteId: "right", storeProp: "clock", paths: [[]] },
    ], host: { tag: "group", key: "shared", child: null, props: [
      ["position-x", { kind: "input", index: 0 }],
      ["position-y", { kind: "input", index: 1 }],
    ] },
  })!;
  const execution = normalizeClosedStoreDataExecution(marker("shared"), host)!;
  const transaction = new StoreRenderTransaction("shared-root");
  const result = prepareOwnedClosedStoreOutputs(world, transaction, [{
    execution, owner, hostKey: "shared", inputs: [
      { store, readerId: "shared\u0000left" },
      { store, readerId: "shared\u0000right" },
    ],
  }]);
  if (!result || result.kind !== "ready") throw new Error("shared batch declined");
  equal(result.rows[0].region.props[0][1], 9);
  equal(result.rows[0].region.props[1][1], 9);
  equal(transaction.readers.size, 2);
  equal(transaction.observations.size, 2);
  transaction.preparePublication();
  transaction.publishAccepted();
  equal(store.diagnostics().readers, 2);
});

Deno.test("empty schema five groups retain owner while legacy scalar regions keep program key", () => {
  const world = new OwnerStateWorld();
  const fifthOwner = world.resolveOwner(null, "fifth");
  const legacyOwner = world.resolveOwner(null, "legacy");
  const fifthStore = createAsyncStore(storeRecord({ phase: -0 }));
  const legacyStore = createAsyncStore(7);
  const fifth = normalizeClosedStoreDataExecution(marker("fifth"),
    normalizeClosedStoreHostProgram({
      schemaVersion: 5, componentProgramId: "fifth", moduleRevision: "rev",
      inputs: [{ storeUseSiteId: "clock", storeProp: "clock",
        paths: [["phase"]] }],
      host: { tag: "group", key: "marker", children: [], props: [
        ["position-x", { kind: "input", index: 0 }],
      ] },
    })!)!;
  const legacy = normalizeClosedStoreDataExecution(marker("legacy"),
    normalizeClosedStoreHostProgram({
      schemaVersion: 1, componentProgramId: "legacy", moduleRevision: "rev",
      storeUseSiteId: "clock", storeProp: "clock",
      host: { tag: "mesh", key: "original", child: null, props: [
        ["position-x", { kind: "input", index: 0 }],
      ] },
    })!)!;
  const transaction = new StoreRenderTransaction("shape-root");
  const result = prepareOwnedClosedStoreOutputs(world, transaction, [
    { execution: fifth, owner: fifthOwner, hostKey: "scope\u0000marker",
      inputs: [{ store: fifthStore, readerId: "fifth" }] },
    { execution: legacy, owner: legacyOwner, hostKey: "ignored",
      inputs: [{ store: legacyStore, readerId: "legacy" }] },
  ]);
  if (!result || result.kind !== "ready") throw new Error("shape batch declined");
  equal(result.rows[0].region.key, "scope\u0000marker");
  equal(result.rows[0].region.componentOwner, fifthOwner);
  equal(Object.is(result.rows[0].region.props[0][1], -0), true);
  equal(result.rows[1].region.key, "original");
  equal(result.rows[1].region.retainedChildren, undefined);
  equal(result.rows[1].region.props[0][1], 7);
  transaction.discard();
});

Deno.test("late request getters cannot alter copied earlier fields and failures discard", () => {
  const world = new OwnerStateWorld();
  const owner = world.resolveOwner(null, "getter");
  const store = createAsyncStore(2);
  const host = normalizeClosedStoreHostProgram({
    schemaVersion: 6, componentProgramId: "getter", moduleRevision: "rev",
    retainedChildProp: "children",
    inputs: [{ storeUseSiteId: "clock", storeProp: "clock", paths: [[]] }],
    host: { tag: "group", key: "getter", child: null, props: [
      ["position-x", { kind: "input", index: 0 }],
    ] },
  })!;
  const execution = normalizeClosedStoreDataExecution(marker("getter"), host)!;
  const first = { execution, owner, hostKey: "first", inputs: [
    { store, readerId: "first" },
  ] };
  const second = Object.defineProperty({ execution, owner, inputs: [
    { store, readerId: "second" },
  ] }, "hostKey", { enumerable: true, get() {
    first.hostKey = "mutated";
    return "second";
  } });
  const transaction = new StoreRenderTransaction("getter-root");
  equal(prepareOwnedClosedStoreOutputs(world, transaction,
    [first, second] as unknown as OwnedClosedStoreOutputRequest[]), null);
  equal(first.hostKey, "first");
  equal(transaction.observations.size, 0);
  transaction.discard();
  const later = new Proxy({ execution, owner, hostKey: "second", inputs: [
    { store, readerId: "second" },
  ] }, { ownKeys(target) {
    first.hostKey = "mutated";
    return Reflect.ownKeys(target);
  } });
  const copiedTransaction = new StoreRenderTransaction("copied-root");
  const copied = prepareOwnedClosedStoreOutputs(world, copiedTransaction,
    [first, later] as OwnedClosedStoreOutputRequest[]);
  if (!copied || copied.kind !== "ready") throw new Error("copied batch declined");
  equal(copied.rows[0].region.key, "first");
  equal(first.hostKey, "mutated");
  copiedTransaction.discard();
  const forged = Object.freeze({ ...execution }) as typeof execution;
  const forgedTransaction = new StoreRenderTransaction("forged-root");
  equal(prepareOwnedClosedStoreOutputs(world, forgedTransaction, [
    { execution: forged, owner, hostKey: "first", inputs: [
      { store, readerId: "first" },
    ] },
  ]), null);
  equal(forgedTransaction.observations.size, 0);
  forgedTransaction.discard();
  const wrongArity = new StoreRenderTransaction("wrong-arity");
  equal(prepareOwnedClosedStoreOutputs(world, wrongArity, [
    { execution, owner, hostKey: "first", inputs: [] },
  ]), null);
  equal(wrongArity.observations.size, 0);
  wrongArity.discard();
});

Deno.test("nonfinite owned results decline after capture without leaking scratch", () => {
  const world = new OwnerStateWorld();
  const owner = world.resolveOwner(null, "overflow");
  const store = createAsyncStore(Number.MAX_VALUE);
  const host = normalizeClosedStoreHostProgram({
    schemaVersion: 6, componentProgramId: "overflow", moduleRevision: "rev",
    retainedChildProp: "children",
    inputs: [{ storeUseSiteId: "clock", storeProp: "clock", paths: [[]] }],
    host: { tag: "group", key: "overflow", child: null, props: [
      ["position-x", { kind: "binary", operator: "*",
        left: { kind: "input", index: 0 },
        right: { kind: "literal", value: 2 } }],
    ] },
  })!;
  const execution = normalizeClosedStoreDataExecution(marker("overflow"), host)!;
  const transaction = new StoreRenderTransaction("overflow-root");
  equal(prepareOwnedClosedStoreOutputs(world, transaction, [{ execution, owner,
    hostKey: "overflow", inputs: [{ store, readerId: "overflow" }] }]), null);
  equal(transaction.observations.size, 1);
  transaction.discard();
});

Deno.test("public scalar constructor still owns caller tuples and empty children", () => {
  const pair: [string, number] = ["position-x", -0];
  const children: unknown[] = [];
  const region = createOwnedScalarStorePropDelta({ key: "marker", tag: "group",
    props: [pair], children: children as never });
  if (!region) throw new Error("scalar region declined");
  pair[1] = 8;
  children.push("later");
  equal(Object.is(region.props[0][1], -0), true);
  equal(region.children?.length, 0);
  equal(isOwnedScalarStorePropDelta(region), true);
  equal(createOwnedScalarStorePropDelta({ key: "bad", tag: "group",
    props: [["position-x", Infinity]] }), null);
});
