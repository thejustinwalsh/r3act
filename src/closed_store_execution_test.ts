import {
  bindOwnedClosedStoreOutputRequest,
  createOwnedScalarStorePropDelta, evaluateClosedStoreDataExecution,
  inspectClosedStoreDataExecution, isOwnedScalarStorePropDelta,
  normalizeClosedStoreDataExecution, OwnedClosedFrameCut,
  prepareMountedClosedStoreExecution, prepareOwnedClosedStoreOutputs,
  type ClosedStoreDataExecution, type BoundClosedStoreOutputRequest,
  type MountedClosedStoreExecution, type MountedClosedStoreExecutionCounts,
} from "./closed_store_execution.ts";
import { normalizeClosedStoreHostProgram } from "./closed_store_host_program.ts";
import { createAsyncStore, StoreRenderTransaction } from "./async_store_runtime.ts";
import { OwnerStateWorld } from "./owner_state_world.ts";
import { storeRecord } from "./owned_store_record.ts";

const equal = (actual: unknown, expected: unknown) => {
  if (!Object.is(actual, expected))
    throw new Error(`Expected ${String(expected)}, received ${String(actual)}`);
};
const marker = (programId = "motion", revision = "rev"): ClosedStoreDataExecution => ({
  schemaVersion: 3, kind: "owned-data", componentProgramId: programId,
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
const requestsFor = (bound: NonNullable<ReturnType<typeof bindOwnedClosedStoreOutputRequest>>) => {
  return [bound];
};
const capture = (world: OwnerStateWorld, transaction: StoreRenderTransaction,
  requests: readonly BoundClosedStoreOutputRequest[],
  previous?: MountedClosedStoreExecution | null,
  counts?: MountedClosedStoreExecutionCounts) => {
  const plan = prepareMountedClosedStoreExecution(requests, previous, counts);
  return plan ? prepareOwnedClosedStoreOutputs(world, transaction, plan) : null;
};

Deno.test("current data execution binds one host and preserves finite input order", () => {
  const raw = mixed();
  const host = normalizeClosedStoreHostProgram(raw)!;
  const execution = normalizeClosedStoreDataExecution(marker(), host)!;
  equal(inspectClosedStoreDataExecution(execution)?.mode, "interpreted");
  raw.host.props[0][1].right.index = 0;
  const output = evaluateClosedStoreDataExecution(execution, [2, -0, 3])!;
  equal(output[0][1], 7);
  equal(Object.is(output[1][1], -0), true);
  equal(evaluateClosedStoreDataExecution(execution, [2, Infinity, 3]), null);
  equal(evaluateClosedStoreDataExecution(execution, [2, 3]), null);
  equal(Object.isFrozen(output), true);
  equal(Object.isFrozen(output[0]), true);
  equal(normalizeClosedStoreDataExecution({ ...marker(), schemaVersion: 2 }, host), null);
  equal(normalizeClosedStoreDataExecution(marker("other"), host), null);
  equal(normalizeClosedStoreDataExecution({ ...marker(), extra: true }, host), null);
});

Deno.test("owned Store execution preserves a static Three name beside numeric props", () => {
  for (const schemaVersion of [5, 6, 7, 8] as const) {
    const host = normalizeClosedStoreHostProgram({
      schemaVersion, componentProgramId: "named", moduleRevision: "rev",
      inputs: [{ storeUseSiteId: "clock", storeProp: "store",
        paths: [["phase"]] }],
      ...(schemaVersion === 6 ? { retainedChildProp: "children" } : {}),
      ...(schemaVersion === 7 ? { stateSites: ["offset"], effectSites: [],
        retainedChildProp: null } : {}),
      ...(schemaVersion === 8 ? { stateSites: [], effectSites: [],
        propInputs: ["speed"], retainedChildProp: null } : {}),
      host: schemaVersion === 5
        ? { tag: "mesh", key: "named", children: [], props: [
          ["name", { kind: "literal", value: "accepted-frame" }],
          ["rotation-y", { kind: "input", index: 0 }],
        ] }
        : { tag: "mesh", key: "named", child: null, props: [
          ["name", { kind: "literal", value: "accepted-frame" }],
          ["rotation-y", { kind: "input", index: 0 }],
        ] },
    });
    if (!host) throw new Error(`Schema ${schemaVersion} declined the named host`);
    const execution = normalizeClosedStoreDataExecution(marker("named"), host);
    if (!execution) throw new Error(`Schema ${schemaVersion} declined owned execution`);
    const output = evaluateClosedStoreDataExecution(execution,
      schemaVersion >= 7 ? [2, 3] : [2]);
    equal(output?.[0][1], "accepted-frame");
    equal(output?.[1][1], 2);
  }
});

Deno.test("bound frame requests reuse layout while old accepted output stays immutable", () => {
  const world = new OwnerStateWorld();
  const owner = world.resolveOwner(null, "bound-execution");
  const [, dispatchOffset] = world.useState(owner, "offset", 3);
  const store = createAsyncStore(storeRecord({ phase: 2, epoch: -0 }));
  const execution = normalizeClosedStoreDataExecution(marker(),
    normalizeClosedStoreHostProgram(mixed())!)!;
  const input = { store, readerId: "original-reader" };
  const raw = { execution, owner, hostKey: "original-key", inputs: [input] };
  const bound = bindOwnedClosedStoreOutputRequest(raw);
  if (!bound) throw new Error("binding declined");
  raw.hostKey = "changed-key";
  input.readerId = "changed-reader";
  const firstTransaction = new StoreRenderTransaction("bound-first");
  const planCounts = { built: 0, reused: 0, repairedGroups: 0 };
  const first = capture(world, firstTransaction, requestsFor(bound), null, planCounts);
  if (!first || first.kind !== "ready") throw new Error("first capture declined");
  equal(planCounts.built, 1);
  const oldImage = first.cut.imageAt(0);
  equal(first.cut.keyAt(0), "original-key");
  equal(first.cut.layoutAt(0).nameAt(0), "rotation-y");
  equal(first.cut.valueAt(0, 0), 7);
  equal(Object.is(first.cut.valueAt(0, 1), -0), true);
  firstTransaction.discard();
  dispatchOffset(4);
  store.dispatch(storeRecord({ phase: 5, epoch: 6 }));
  const secondTransaction = new StoreRenderTransaction("bound-second");
  const second = capture(world, secondTransaction,
    requestsFor(bound), first.cut.mounted, planCounts);
  if (!second || second.kind !== "ready") throw new Error("second capture declined");
  equal(second.cut.mounted, first.cut.mounted);
  equal(planCounts.reused, 1);
  equal(planCounts.built, 1);
  equal(second.cut.valueAt(0, 0), 14);
  equal(second.cut.valueAt(0, 1), 6);
  equal(first.cut.imageAt(0), oldImage);
  equal(first.cut.valueAt(0, 0), 7);
  equal(second.cut.cellsAt(0)[0].version, first.cut.cellsAt(0)[0].version + 1);
  equal(OwnedClosedFrameCut.owns(second.cut), true);
  secondTransaction.discard();
});

Deno.test("mounted execution repairs a changed bound source without changing old cut", () => {
  const world = new OwnerStateWorld();
  const owner = world.resolveOwner(null, "rebound-execution");
  world.useState(owner, "offset", 3);
  const firstStore = createAsyncStore(storeRecord({ phase: 2, epoch: 1 }));
  const secondStore = createAsyncStore(storeRecord({ phase: 5, epoch: 8 }));
  const execution = normalizeClosedStoreDataExecution(marker(),
    normalizeClosedStoreHostProgram(mixed())!)!;
  const bound = bindOwnedClosedStoreOutputRequest({ execution, owner,
    hostKey: "rebound-key", inputs: [{ store: firstStore, readerId: "rebound-reader" }] })!;
  const rebound = bindOwnedClosedStoreOutputRequest({ execution, owner,
    hostKey: "rebound-key", inputs: [{ store: secondStore, readerId: "rebound-reader" }] })!;
  const firstTransaction = new StoreRenderTransaction("rebound-root");
  const first = capture(world, firstTransaction, requestsFor(bound));
  if (!first || first.kind !== "ready") throw new Error("first capture declined");
  const oldImage = first.cut.imageAt(0);
  firstTransaction.discard();
  const counts = { built: 0, reused: 0, repairedGroups: 0 };
  const secondTransaction = new StoreRenderTransaction("rebound-root");
  const second = capture(world, secondTransaction,
    requestsFor(rebound), first.cut.mounted, counts);
  if (!second || second.kind !== "ready") throw new Error("rebind declined");
  equal(counts.built, 1);
  equal(counts.reused, 0);
  equal(second.cut.mounted === first.cut.mounted, false);
  equal(second.cut.valueAt(0, 0), 13);
  equal(first.cut.imageAt(0), oldImage);
  equal(first.cut.valueAt(0, 0), 7);
  secondTransaction.discard();
});

Deno.test("invalid owned binding declines before Store capture", () => {
  const world = new OwnerStateWorld();
  const owner = world.resolveOwner(null, "invalid");
  world.useState(owner, "offset", 3);
  const store = createAsyncStore(storeRecord({ phase: 2, epoch: 1 }));
  const execution = normalizeClosedStoreDataExecution(marker(),
    normalizeClosedStoreHostProgram(mixed())!)!;
  equal(bindOwnedClosedStoreOutputRequest({ execution, owner, hostKey: "",
    inputs: [{ store, readerId: "reader" }] }), null);
  const transaction = new StoreRenderTransaction("invalid");
  equal(prepareMountedClosedStoreExecution([]), null);
  equal(transaction.observations.size, 0);
  transaction.discard();
});

Deno.test("public scalar constructor owns caller tuples and empty children", () => {
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
