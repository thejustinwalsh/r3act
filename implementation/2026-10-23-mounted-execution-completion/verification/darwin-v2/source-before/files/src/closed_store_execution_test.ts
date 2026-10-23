import {
  bindOwnedClosedStoreOutputRequest,
  createOwnedScalarStorePropDelta, evaluateClosedStoreDataExecution,
  inspectClosedStoreDataExecution, isOwnedScalarStorePropDelta,
  materializeOwnedScalarStorePropDelta, normalizeClosedStoreDataExecution,
  prepareOwnedClosedStoreOutputs, type ClosedStoreDataExecution,
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
const schedule = (bound: NonNullable<ReturnType<typeof bindOwnedClosedStoreOutputRequest>>) => {
  return [bound];
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
  const first = prepareOwnedClosedStoreOutputs(world, firstTransaction,
    schedule(bound), undefined, null, planCounts);
  if (!first || first.kind !== "ready") throw new Error("first capture declined");
  equal(planCounts.built, 1);
  const old = materializeOwnedScalarStorePropDelta(first.rows[0]);
  equal(old.key, "original-key");
  equal(old.props[0][1], 7);
  equal(Object.is(old.props[1][1], -0), true);
  firstTransaction.discard();
  dispatchOffset(4);
  store.dispatch(storeRecord({ phase: 5, epoch: 6 }));
  const secondTransaction = new StoreRenderTransaction("bound-second");
  const second = prepareOwnedClosedStoreOutputs(world, secondTransaction,
    schedule(bound), undefined, first.plan, planCounts);
  if (!second || second.kind !== "ready") throw new Error("second capture declined");
  equal(second.plan, first.plan);
  equal(planCounts.reused, 1);
  equal(planCounts.built, 1);
  const next = materializeOwnedScalarStorePropDelta(second.rows[0]);
  equal(next.props[0][1], 14);
  equal(next.props[1][1], 6);
  equal(old.props[0][1], 7);
  equal(second.rows[0].cells[0].version, first.rows[0].cells[0].version + 1);
  equal(isOwnedScalarStorePropDelta(next), true);
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
  const first = prepareOwnedClosedStoreOutputs(world, firstTransaction, schedule(bound));
  if (!first || first.kind !== "ready") throw new Error("first capture declined");
  const old = materializeOwnedScalarStorePropDelta(first.rows[0]);
  firstTransaction.discard();
  const counts = { built: 0, reused: 0, repairedGroups: 0 };
  const secondTransaction = new StoreRenderTransaction("rebound-root");
  const second = prepareOwnedClosedStoreOutputs(world, secondTransaction,
    schedule(rebound), undefined, first.plan, counts);
  if (!second || second.kind !== "ready") throw new Error("rebind declined");
  equal(counts.built, 1);
  equal(counts.reused, 0);
  equal(second.plan === first.plan, false);
  equal(materializeOwnedScalarStorePropDelta(second.rows[0]).props[0][1], 13);
  equal(old.props[0][1], 7);
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
  equal(prepareOwnedClosedStoreOutputs(world, transaction, []), null);
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
