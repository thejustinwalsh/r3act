import {
  createOwnedScalarStorePropDelta, evaluateClosedStoreDataExecution,
  isOwnedScalarStorePropDelta, normalizeClosedStoreDataExecution,
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
    [first, second] as OwnedClosedStoreOutputRequest[]), null);
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
