import {
  bindOwnedClosedStoreOutputRequest, normalizeClosedStoreDataExecution,
  OwnedClosedFrameCut, prepareMountedClosedStoreExecution,
  prepareOwnedClosedStoreOutputs,
} from "./closed_store_execution.ts";
import { normalizeClosedStoreHostProgram } from "./closed_store_host_program.ts";
import { createAsyncStore, StoreRenderTransaction } from "./async_store_runtime.ts";
import { OwnerStateWorld } from "./owner_state_world.ts";

const equal = (actual: unknown, expected: unknown): void => {
  if (!Object.is(actual, expected))
    throw new Error(`Expected ${String(expected)}, received ${String(actual)}`);
};

Deno.test("mounted capture authenticates one cut and retains its old accepted image", () => {
  const host = normalizeClosedStoreHostProgram({
    schemaVersion: 6, componentProgramId: "mounted-cut", moduleRevision: "rev",
    inputs: [{ storeUseSiteId: "clock", storeProp: "clock", paths: [[]] }],
    retainedChildProp: "children",
    host: { tag: "group", key: "clock", child: null,
      props: [["position-x", { kind: "input", index: 0 }]] },
  })!;
  const execution = normalizeClosedStoreDataExecution({
    schemaVersion: 3, kind: "owned-data", componentProgramId: "mounted-cut",
    moduleRevision: "rev",
  }, host)!;
  const world = new OwnerStateWorld();
  const owner = world.resolveOwner(null, "clock");
  const store = createAsyncStore(3);
  const request = bindOwnedClosedStoreOutputRequest({ execution, owner,
    hostKey: "clock", inputs: [{ store, readerId: "clock-reader" }] })!;
  const plan = prepareMountedClosedStoreExecution([request]);
  if (!plan) throw new Error("mounted plan declined");
  equal(plan.requestAt(0), request);
  equal(prepareMountedClosedStoreExecution([request], plan), plan);
  equal(prepareMountedClosedStoreExecution([request, request]), null);
  const firstTransaction = new StoreRenderTransaction("cut-first");
  const first = prepareOwnedClosedStoreOutputs(world, firstTransaction, plan);
  if (!first || first.kind !== "ready") throw new Error("first cut declined");
  equal(OwnedClosedFrameCut.owns(first.cut), true);
  equal(OwnedClosedFrameCut.owns(new Proxy(first.cut, {})), false);
  equal(first.cut.mounted, plan);
  equal(first.cut.rowCount, 1);
  equal(first.cut.ownerAt(0), owner);
  equal(first.cut.keyAt(0), "clock");
  equal(first.cut.tagAt(0), "group");
  equal(first.cut.retainedChildrenAt(0), true);
  equal(first.cut.valueAt(0, 0), 3);
  equal(first.cut.imageAt(0), first.cut.imageAt(0));
  equal(Object.isFrozen(first.cut.imageAt(0)), true);
  firstTransaction.discard();
  store.dispatch(7);
  const nextTransaction = new StoreRenderTransaction("cut-next");
  const next = prepareOwnedClosedStoreOutputs(world, nextTransaction, plan);
  if (!next || next.kind !== "ready") throw new Error("next cut declined");
  equal(next.cut.valueAt(0, 0), 7);
  equal(first.cut.valueAt(0, 0), 3);
  nextTransaction.discard();
});
