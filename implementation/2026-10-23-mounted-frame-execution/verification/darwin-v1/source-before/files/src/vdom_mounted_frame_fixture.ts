import { createAsyncStore, StoreRenderTransaction } from "./async_store_runtime.ts";
import {
  bindOwnedClosedStoreOutputRequest,
  normalizeClosedStoreDataExecution,
  prepareMountedClosedStoreExecution,
  prepareOwnedClosedStoreOutputs,
  type OwnedClosedFrameCut,
} from "./closed_store_execution.ts";
import { normalizeClosedStoreHostProgram } from "./closed_store_host_program.ts";
import { OwnerStateWorld } from "./owner_state_world.ts";
import { storeRecord } from "./owned_store_record.ts";

export const mountedFrameFixture = (selectedOwners: readonly number[]) => {
  const host = normalizeClosedStoreHostProgram({
    schemaVersion: 7, componentProgramId: "vdom-mounted-frame",
    moduleRevision: "fixture", inputs: [{ storeUseSiteId: "frame",
      storeProp: "clock", paths: [["phase"], ["epoch"]] }],
    stateSites: ["offset"], effectSites: [], retainedChildProp: "children",
    host: { tag: "group", key: "motion", child: null, props: [
      ["rotation-y", { kind: "binary", operator: "+", left: {
        kind: "input", index: 0 }, right: { kind: "input", index: 2 } }],
      ["position-x", { kind: "input", index: 1 }],
    ] },
  });
  if (!host) throw new Error("Mounted frame host fixture declined");
  const execution = normalizeClosedStoreDataExecution({
    schemaVersion: 3, kind: "owned-data",
    componentProgramId: "vdom-mounted-frame", moduleRevision: "fixture",
    batchKernel: function(s: readonly number[], v: readonly number[],
      o: number[][], n: number) {
      const doubled = s[0] * 2;
      for (let r = 0; r < n; r++) {
        o[r][0] = doubled + v[r];
        o[r][1] = s[1];
      }
    },
  }, host);
  if (!execution) throw new Error("Mounted frame execution fixture declined");
  const world = new OwnerStateWorld();
  const setters = new Map<number, (value: number) => void>();
  const store = createAsyncStore(storeRecord({ phase: 0, epoch: 0 }));
  for (let owner = 1; owner <= Math.max(...selectedOwners); owner++) {
    const actual = world.resolveOwner(null, `owner-${owner}`);
    if (actual !== owner) throw new Error("Fixture owner identity changed");
    setters.set(owner, world.useState(actual, "offset", 0)[1]);
  }
  const requests = selectedOwners.map((owner) => {
    const bound = bindOwnedClosedStoreOutputRequest({ execution, owner,
      hostKey: "motion", inputs: [{ store, readerId: `reader-${owner}` }] });
    if (!bound) throw new Error("Mounted frame request fixture declined");
    return bound;
  });
  const mounted = prepareMountedClosedStoreExecution(requests);
  if (!mounted) throw new Error("Mounted frame plan fixture declined");
  return {
    capture(value: number): OwnedClosedFrameCut {
      for (const owner of selectedOwners) setters.get(owner)!(value + owner);
      const transaction = new StoreRenderTransaction("vdom-mounted-frame");
      const result = prepareOwnedClosedStoreOutputs(world, transaction, mounted);
      transaction.discard();
      if (result?.kind !== "ready") throw new Error("Mounted frame cut declined");
      return result.cut;
    },
  };
};
