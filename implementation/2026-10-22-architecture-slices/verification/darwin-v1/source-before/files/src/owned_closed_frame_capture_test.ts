import {
  bindOwnedClosedStoreOutputRequest, createOwnedClosedFrameRequests,
  inspectClosedStoreDataExecution, materializeOwnedScalarStorePropDelta,
  normalizeClosedStoreDataExecution, prepareOwnedClosedStoreOutputs,
} from "./closed_store_execution.ts";
import { normalizeClosedStoreHostProgram } from "./closed_store_host_program.ts";
import { createAsyncStore, StoreRenderTransaction } from "./async_store_runtime.ts";
import { bindOwnedClosedProjectionRequest } from "./async_store_runtime.ts";
import { bindOwnedClosedWorldInputRequest, OwnerStateWorld } from "./owner_state_world.ts";
import { createOwnedClosedFrameSchedule } from "./owned_closed_frame_input.ts";
import { createOwnedClosedFrameInput } from "./owned_closed_frame_input.ts";
import { captureVerifiedOwnedScalarBatch, OwnedScalarFrame,
  OwnedScalarLayout } from "./closed_scalar_output.ts";
import type { ClosedStoreBatchKernelProof } from "./closed_store_batch_kernel_proof.ts";
import { storeRecord } from "./owned_store_record.ts";

const equal = (actual: unknown, expected: unknown): void => {
  if (!Object.is(actual, expected))
    throw new Error(`Expected ${String(expected)}, received ${String(actual)}`);
};

const host = () => normalizeClosedStoreHostProgram({
  schemaVersion: 7, componentProgramId: "capture-batch", moduleRevision: "rev",
  inputs: [{ storeUseSiteId: "frame", storeProp: "clock",
    paths: [["phase"], ["epoch"]] }],
  stateSites: ["offset"], effectSites: ["effect"],
  retainedChildProp: "children",
  host: { tag: "group", key: "motion", child: null, props: [
    ["rotation-y", { kind: "binary", operator: "+",
      left: { kind: "binary", operator: "*",
        left: { kind: "input", index: 0 }, right: { kind: "literal", value: 2 } },
      right: { kind: "input", index: 2 } }],
    ["position-x", { kind: "input", index: 1 }],
  ] },
})!;

const batch = normalizeClosedStoreDataExecution({ schemaVersion: 3,
  kind: "owned-data", componentProgramId: "capture-batch", moduleRevision: "rev",
  batchKernel: function(s: readonly number[], v: readonly number[],
    o: number[][], n: number) {
    const doubled = s[0] * 2;
    for (let r = 0; r < n; r++) {
      o[r][0] = doubled + v[r];
      o[r][1] = s[1];
    }
  },
}, host())!;

Deno.test("owned schedule groups exact Store identity and returns original row order", () => {
  equal(inspectClosedStoreDataExecution(batch)?.mode, "verified-batch");
  const world = new OwnerStateWorld();
  const owners = ["first", "second", "third", "fourth"].map((key) =>
    world.resolveOwner(null, key));
  const dispatches = owners.map((owner, index) =>
    world.useState(owner, "offset", index + 1)[1]);
  const firstStore = createAsyncStore(storeRecord({ phase: 2, epoch: -0 }));
  const secondStore = createAsyncStore(storeRecord({ phase: 2, epoch: -0 }));
  const builder = createOwnedClosedFrameRequests();
  for (let index = 0; index < owners.length; index++) {
    const bound = bindOwnedClosedStoreOutputRequest({ execution: batch,
      owner: owners[index], hostKey: `owner-${index}`,
      inputs: [{ store: index === 1 ? secondStore : firstStore,
        readerId: `reader-${index}` }] });
    if (!bound || !builder.append(bound)) throw new Error("binding declined");
  }
  equal(builder.seal(), true);
  equal(builder.append({} as never), false);
  const counts = { frames: 0, rootMaterializations: 0, propMaterializations: 0,
    directCaptures: 0, batchCalls: 0, batchRows: 0 };
  const transaction = new StoreRenderTransaction("batch-root");
  const result = prepareOwnedClosedStoreOutputs(world, transaction, builder, counts);
  if (!result || result.kind !== "ready") throw new Error("owned batch declined");
  equal(result.rows.length, 4);
  equal(counts.batchCalls, 2);
  equal(counts.batchRows, 4);
  equal(counts.directCaptures, 4);
  for (let index = 0; index < 4; index++) {
    const region = materializeOwnedScalarStorePropDelta(result.rows[index]);
    equal(region.key, `owner-${index}`);
    equal(region.props[0][1], 5 + index);
    equal(Object.is(region.props[1][1], -0), true);
  }
  equal(prepareOwnedClosedStoreOutputs(world, new StoreRenderTransaction("reused"),
    builder), null);
  dispatches[0](9);
  firstStore.dispatch(storeRecord({ phase: 7, epoch: 8 }));
  equal(materializeOwnedScalarStorePropDelta(result.rows[0]).props[0][1], 5);
  equal(result.rows[0].cells[0].value, 1);
  equal(Object.isFrozen(result.rows[0].frame), true);
  equal(Object.keys(result.rows[0].frame).length, 0);
  transaction.discard();
});

Deno.test("owned builder rejects forged receipts and leaves public overrides untouched", () => {
  const world = new OwnerStateWorld();
  const owner = world.resolveOwner(null, "override");
  world.useState(owner, "offset", 3);
  const store = createAsyncStore(storeRecord({ phase: 2, epoch: 4 }));
  const bound = bindOwnedClosedStoreOutputRequest({ execution: batch, owner,
    hostKey: "override", inputs: [{ store, readerId: "override-reader" }] });
  if (!bound) throw new Error("binding declined");
  const forged = createOwnedClosedFrameRequests();
  equal(forged.append(new Proxy(bound, {}) as typeof bound), false);
  equal(forged.seal(), false);
  const builder = createOwnedClosedFrameRequests();
  equal(builder.append(bound), true);
  equal(builder.seal(), true);
  const original = world.ownerLineage;
  world.ownerLineage = (() => { throw new Error("public World callback"); }) as typeof original;
  const transaction = new StoreRenderTransaction("override-root");
  equal(prepareOwnedClosedStoreOutputs(world, transaction, builder)?.kind,
    "public-required");
  transaction.discard();
  Reflect.deleteProperty(world, "ownerLineage");
});

Deno.test("one cut supports mixed batch and interpreted rows", () => {
  const world = new OwnerStateWorld();
  const firstOwner = world.resolveOwner(null, "batch");
  const oldOwner = world.resolveOwner(null, "old");
  world.useState(firstOwner, "offset", 3);
  world.useState(oldOwner, "offset", 4);
  const store = createAsyncStore(storeRecord({ phase: 5, epoch: 6 }));
  const old = normalizeClosedStoreDataExecution({ schemaVersion: 1,
    kind: "owned-data", componentProgramId: "capture-batch", moduleRevision: "rev",
  }, host())!;
  const builder = createOwnedClosedFrameRequests();
  const first = bindOwnedClosedStoreOutputRequest({ execution: batch,
    owner: firstOwner, hostKey: "batch-key",
    inputs: [{ store, readerId: "batch-reader" }] });
  const second = bindOwnedClosedStoreOutputRequest({ execution: old,
    owner: oldOwner, hostKey: "old-key",
    inputs: [{ store, readerId: "old-reader" }] });
  if (!first || !second || !builder.append(first) || !builder.append(second) ||
    !builder.seal()) throw new Error("mixed binding declined");
  const counts = { frames: 0, rootMaterializations: 0, propMaterializations: 0,
    directCaptures: 0, batchCalls: 0, batchRows: 0 };
  const transaction = new StoreRenderTransaction("mixed-root");
  const result = prepareOwnedClosedStoreOutputs(world, transaction, builder, counts);
  if (!result || result.kind !== "ready") throw new Error("mixed cut declined");
  equal(counts.batchCalls, 1);
  equal(counts.batchRows, 1);
  equal(counts.frames, 2);
  equal(materializeOwnedScalarStorePropDelta(result.rows[0]).props[0][1], 13);
  equal(materializeOwnedScalarStorePropDelta(result.rows[1]).props[0][1], 14);
  equal(result.rows[0].cells[0].value, 3);
  equal(result.rows[1].cells[0].value, 4);
  equal(transaction.readers.size, 2);
  transaction.discard();
});

Deno.test("nonfinite final batch output rejects the whole prepared candidate", () => {
  const world = new OwnerStateWorld();
  const owner = world.resolveOwner(null, "overflow");
  world.useState(owner, "offset", 1);
  const store = createAsyncStore(storeRecord({ phase: 1e308, epoch: 2 }));
  const bound = bindOwnedClosedStoreOutputRequest({ execution: batch, owner,
    hostKey: "overflow", inputs: [{ store, readerId: "overflow-reader" }] });
  if (!bound) throw new Error("overflow binding declined");
  const builder = createOwnedClosedFrameRequests();
  if (!builder.append(bound) || !builder.seal()) throw new Error("overflow append declined");
  const transaction = new StoreRenderTransaction("overflow-root");
  equal(prepareOwnedClosedStoreOutputs(world, transaction, builder), null);
  transaction.discard();
});

Deno.test("finite final result survives an overflowing intermediate", () => {
  const host = normalizeClosedStoreHostProgram({
    schemaVersion: 6, componentProgramId: "reciprocal", moduleRevision: "rev",
    retainedChildProp: "children",
    inputs: [{ storeUseSiteId: "number", storeProp: "number", paths: [[]] }],
    host: { tag: "group", key: "reciprocal", child: null, props: [
      ["position-x", { kind: "binary", operator: "/",
        left: { kind: "literal", value: 1 },
        right: { kind: "binary", operator: "*",
          left: { kind: "input", index: 0 },
          right: { kind: "literal", value: 2 } } }],
    ] },
  })!;
  const execution = normalizeClosedStoreDataExecution({ schemaVersion: 3,
    kind: "owned-data", componentProgramId: "reciprocal", moduleRevision: "rev",
    batchKernel: function(s: readonly number[], _v: readonly number[],
      o: number[][], n: number) {
      const doubled = s[0] * 2;
      for (let r = 0; r < n; r++) o[r][0] = 1 / doubled;
    },
  }, host)!;
  equal(inspectClosedStoreDataExecution(execution)?.mode, "verified-batch");
  const world = new OwnerStateWorld();
  const owner = world.resolveOwner(null, "reciprocal");
  const store = createAsyncStore(1e308);
  const bound = bindOwnedClosedStoreOutputRequest({ execution, owner,
    hostKey: "reciprocal", inputs: [{ store, readerId: "reciprocal-reader" }] });
  if (!bound) throw new Error("reciprocal binding declined");
  const builder = createOwnedClosedFrameRequests();
  if (!builder.append(bound) || !builder.seal()) throw new Error("reciprocal append declined");
  const transaction = new StoreRenderTransaction("reciprocal-root");
  const result = prepareOwnedClosedStoreOutputs(world, transaction, builder);
  if (!result || result.kind !== "ready") throw new Error("reciprocal batch declined");
  equal(materializeOwnedScalarStorePropDelta(result.rows[0]).props[0][1], 0);
  transaction.discard();
});

Deno.test("final NaN is rejected after verified batch execution", () => {
  const host = normalizeClosedStoreHostProgram({
    schemaVersion: 6, componentProgramId: "nan-output", moduleRevision: "rev",
    retainedChildProp: "children",
    inputs: [{ storeUseSiteId: "number", storeProp: "number", paths: [[]] }],
    host: { tag: "group", key: "nan-output", child: null, props: [
      ["position-x", { kind: "binary", operator: "/",
        left: { kind: "input", index: 0 },
        right: { kind: "input", index: 0 } }],
    ] },
  })!;
  const execution = normalizeClosedStoreDataExecution({ schemaVersion: 3,
    kind: "owned-data", componentProgramId: "nan-output", moduleRevision: "rev",
    batchKernel: function(s: readonly number[], _v: readonly number[],
      o: number[][], n: number) {
      const quotient = s[0] / s[0];
      for (let r = 0; r < n; r++) o[r][0] = quotient;
    },
  }, host)!;
  equal(inspectClosedStoreDataExecution(execution)?.mode, "verified-batch");
  const world = new OwnerStateWorld();
  const owner = world.resolveOwner(null, "nan-output");
  const store = createAsyncStore(0);
  const bound = bindOwnedClosedStoreOutputRequest({ execution, owner,
    hostKey: "nan-output", inputs: [{ store, readerId: "nan-reader" }] });
  if (!bound) throw new Error("NaN binding declined");
  const builder = createOwnedClosedFrameRequests();
  if (!builder.append(bound) || !builder.seal()) throw new Error("NaN append declined");
  const transaction = new StoreRenderTransaction("nan-root");
  equal(prepareOwnedClosedStoreOutputs(world, transaction, builder), null);
  transaction.discard();
});

Deno.test("schedule snapshots each bound projection reference once", () => {
  const world = new OwnerStateWorld();
  const owner = world.resolveOwner(null, "once");
  const store = createAsyncStore(3);
  const worldBound = bindOwnedClosedWorldInputRequest({ owner, sites: [] });
  const projection = bindOwnedClosedProjectionRequest({ store,
    readerId: "once-reader", paths: [[]] });
  if (!worldBound || !projection) throw new Error("schedule binding declined");
  let reads = 0;
  const source = [] as unknown as (typeof projection)[];
  Object.defineProperty(source, 0, { configurable: true,
    get() { reads++; return reads === 1 ? projection : {}; } });
  source.length = 1;
  const schedule = createOwnedClosedFrameSchedule();
  equal(schedule.append(worldBound, source, null, -1, true), true);
  equal(reads, 1);
  equal(schedule.seal(), true);
  equal(schedule.projectionAt(0).bound, projection);
});

Deno.test("public frame authority exposes no mutable batch matrix or forged adoption", () => {
  const layout = OwnedScalarLayout.create(["position-x"], [undefined], [0]);
  const input = createOwnedClosedFrameInput(0, 0, 1);
  equal("prepareVerifiedBatchRows" in OwnedScalarFrame, false);
  let rejectedAdoption = false;
  try {
    OwnedScalarFrame.adoptVerifiedBatchRow(Symbol("forged"), layout,
      [3], undefined);
  } catch { rejectedAdoption = true; }
  equal(rejectedAdoption, true);
  let rejected = false;
  try {
    captureVerifiedOwnedScalarBatch(layout,
      { kind: "verified", numericPropIndices: [0], sharedInputCount: 0,
        varyingInputCount: 0 } as ClosedStoreBatchKernelProof,
      input, 1);
  } catch { rejected = true; }
  equal(rejected, true);
  rejected = false;
  try {
    captureVerifiedOwnedScalarBatch(layout,
      {} as ClosedStoreBatchKernelProof,
      new Proxy(createOwnedClosedFrameInput(0, 0, 1), {}) as never, 1);
  } catch { rejected = true; }
  equal(rejected, true);
});
