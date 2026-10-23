import {
  bindOwnedClosedStoreOutputRequest,
  inspectClosedStoreDataExecution, materializeOwnedScalarStorePropDelta,
  normalizeClosedStoreDataExecution, prepareOwnedClosedStoreOutputs,
  pruneMountedClosedStoreExecution,
} from "./closed_store_execution.ts";
import { normalizeClosedStoreHostProgram } from "./closed_store_host_program.ts";
import { createAsyncStore, StoreRenderTransaction } from "./async_store_runtime.ts";
import { bindOwnedClosedProjectionRequest } from "./async_store_runtime.ts";
import { bindOwnedClosedWorldInputRequest, OwnerStateWorld } from "./owner_state_world.ts";
import { createOwnedClosedFramePlan, createOwnedClosedFrameScheduleFromPlan } from "./owned_closed_frame_input.ts";
import { createOwnedClosedFrameInput } from "./owned_closed_frame_input.ts";
import { captureVerifiedOwnedScalarBatch, OwnedScalarBatchPage,
  OwnedScalarLayout, isOwnedScalarImage, ownedScalarImageValueAt,
} from "./closed_scalar_output.ts";
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
  const builder: NonNullable<ReturnType<typeof bindOwnedClosedStoreOutputRequest>>[] = [];
  const bindings: NonNullable<ReturnType<typeof bindOwnedClosedStoreOutputRequest>>[] = [];
  for (let index = 0; index < owners.length; index++) {
    const bound = bindOwnedClosedStoreOutputRequest({ execution: batch,
      owner: owners[index], hostKey: `owner-${index}`,
      inputs: [{ store: index === 1 ? secondStore : firstStore,
        readerId: `reader-${index}` }] });
    if (!bound) throw new Error("binding declined");
    builder.push(bound);
    bindings.push(bound);
  }
  const counts = { frames: 0, rootMaterializations: 0, propMaterializations: 0,
    pages: 0, batchCalls: 0, batchRows: 0 };
  const transaction = new StoreRenderTransaction("batch-root");
  const result = prepareOwnedClosedStoreOutputs(world, transaction, builder, counts);
  if (!result || result.kind !== "ready") throw new Error("owned batch declined");
  equal(result.rows.length, 4);
  equal(counts.batchCalls, 2);
  equal(counts.batchRows, 4);
  equal(counts.pages, 2);
  equal(counts.frames, 0);
  equal(result.rows[0].kind, "page");
  equal(result.rows[2].kind, "page");
  if (result.rows[0].kind !== "page" || result.rows[1].kind !== "page" ||
    result.rows[2].kind !== "page" || result.rows[3].kind !== "page")
    throw new Error("Expected page rows");
  equal(result.rows[0].page, result.rows[2].page);
  equal(result.rows[0].page, result.rows[3].page);
  equal(result.rows[1].page === result.rows[0].page, false);
  equal(result.rows[0].rowIndex, 0);
  equal(result.rows[2].rowIndex, 1);
  for (let index = 0; index < 4; index++) {
    const region = materializeOwnedScalarStorePropDelta(result.rows[index]);
    equal(region.key, `owner-${index}`);
    equal(region.props[0][1], 5 + index);
    equal(Object.is(region.props[1][1], -0), true);
  }

  dispatches[0](9);
  firstStore.dispatch(storeRecord({ phase: 7, epoch: 8 }));
  equal(materializeOwnedScalarStorePropDelta(result.rows[0]).props[0][1], 5);
  equal(result.rows[0].cells[0].value, 1);
  equal(Object.isFrozen(result.rows[0].page), true);
  equal(Object.keys(result.rows[0].page).length, 0);
  equal(isOwnedScalarImage(result.rows[0]), true);
  equal(ownedScalarImageValueAt(result.rows[0], 0), 5);
  const reuseBuilder: NonNullable<ReturnType<typeof bindOwnedClosedStoreOutputRequest>>[] = [];
  for (const bound of bindings) reuseBuilder.push(bound);

  const planCounts = { built: 0, reused: 0, repairedGroups: 0 };
  const nextTransaction = new StoreRenderTransaction("batch-fork");
  const next = prepareOwnedClosedStoreOutputs(world, nextTransaction,
    reuseBuilder, undefined, result.plan, planCounts);
  if (!next || next.kind !== "ready") throw new Error("mounted reuse declined");
  equal(next.plan, result.plan);
  equal(planCounts.reused, 1);
  equal(materializeOwnedScalarStorePropDelta(next.rows[0]).props[0][1], 23);
  equal(materializeOwnedScalarStorePropDelta(result.rows[0]).props[0][1], 5);
  nextTransaction.discard();
  const replacement = createAsyncStore(storeRecord({ phase: 11, epoch: 12 }));
  const rebound = bindOwnedClosedStoreOutputRequest({ execution: batch,
    owner: owners[1], hostKey: "owner-1",
    inputs: [{ store: replacement, readerId: "reader-1" }] });
  if (!rebound) throw new Error("replacement binding declined");
  const repairBuilder: NonNullable<ReturnType<typeof bindOwnedClosedStoreOutputRequest>>[] = [];
  for (let index = 0; index < bindings.length; index++)
    repairBuilder.push(index === 1 ? rebound : bindings[index]);

  const repairTransaction = new StoreRenderTransaction("batch-repaired-root");
  const repaired = prepareOwnedClosedStoreOutputs(world, repairTransaction,
    repairBuilder, undefined, next.plan, planCounts);
  if (!repaired || repaired.kind !== "ready") throw new Error("group repair declined");
  equal(planCounts.built, 1);
  equal(planCounts.repairedGroups, 1);
  equal(materializeOwnedScalarStorePropDelta(repaired.rows[1]).props[0][1], 24);
  equal(materializeOwnedScalarStorePropDelta(repaired.rows[0]).props[0][1], 23);
  repairTransaction.discard();
  transaction.discard();
});

Deno.test("mounted group geometry survives insert, remove, reorder and rebind", () => {
  const world = new OwnerStateWorld();
  const owners = ["a", "b", "c", "d"].map((key) => world.resolveOwner(null, key));
  owners.forEach((owner, index) => world.useState(owner, "offset", index + 1));
  const firstStore = createAsyncStore(storeRecord({ phase: 2, epoch: 3 }));
  const secondStore = createAsyncStore(storeRecord({ phase: 5, epoch: 6 }));
  const thirdStore = createAsyncStore(storeRecord({ phase: 8, epoch: 9 }));
  const bound = (index: number, store: typeof firstStore) => {
    const result = bindOwnedClosedStoreOutputRequest({ execution: batch,
      owner: owners[index], hostKey: `owner-${index}`,
      inputs: [{ store, readerId: `reader-${index}` }] });
    if (!result) throw new Error("mounted binding declined");
    return result;
  };
  const [a, b, c, d, reboundB] = [
    bound(0, firstStore), bound(1, secondStore), bound(2, firstStore),
    bound(3, secondStore), bound(1, thirdStore),
  ];
  let previous: NonNullable<ReturnType<typeof prepareOwnedClosedStoreOutputs>> | null = null;
  const capture = (label: string, rows: typeof a[]) => {
    const transaction = new StoreRenderTransaction(`geometry-${label}`);
    const result = prepareOwnedClosedStoreOutputs(world, transaction, rows,
      undefined, previous?.kind === "ready" ? previous.plan : null);
    if (!result || result.kind !== "ready") throw new Error(`${label} declined`);
    previous = result;
    transaction.discard();
    return result;
  };
  const first = capture("first", [a, b, c]);
  const firstGeometry = first.plan.layoutIdentityForOwner(owners[0]);
  const secondGeometry = first.plan.layoutIdentityForOwner(owners[1]);
  const old = materializeOwnedScalarStorePropDelta(first.rows[0]);
  const inserted = capture("inserted", [a, d, b, c]);
  equal(inserted.plan.layoutIdentityForOwner(owners[0]), firstGeometry);
  equal(inserted.plan.layoutIdentityForOwner(owners[2]), firstGeometry);
  equal(inserted.plan.layoutIdentityForOwner(owners[1]) === secondGeometry, false);
  const pruned = pruneMountedClosedStoreExecution(inserted.plan, new Set([owners[3]]));
  if (!pruned) throw new Error("prune removed every group");
  equal(pruned.layoutIdentityForOwner(owners[3]), null);
  equal(pruned.layoutIdentityForOwner(owners[0]), firstGeometry);
  previous = { ...inserted, plan: pruned };
  const reordered = capture("reordered", [b, a, c]);
  equal(reordered.plan.layoutIdentityForOwner(owners[0]), firstGeometry);
  equal(reordered.plan.layoutIdentityForOwner(owners[1]) !== null, true);
  const rebound = capture("rebound", [reboundB, a, c]);
  equal(rebound.plan.layoutIdentityForOwner(owners[0]), firstGeometry);
  equal(rebound.plan.layoutIdentityForOwner(owners[1]) === secondGeometry, false);
  const reinserted = capture("reinserted", [reboundB, a, d, c]);
  equal(reinserted.plan.layoutIdentityForOwner(owners[0]), firstGeometry);
  equal(materializeOwnedScalarStorePropDelta(reinserted.rows[1]).props[0][1], 5);
  equal(old.props[0][1], 5);
});

Deno.test("owned request cut rejects forged receipts and leaves public overrides untouched", () => {
  const world = new OwnerStateWorld();
  const owner = world.resolveOwner(null, "override");
  world.useState(owner, "offset", 3);
  const store = createAsyncStore(storeRecord({ phase: 2, epoch: 4 }));
  const bound = bindOwnedClosedStoreOutputRequest({ execution: batch, owner,
    hostKey: "override", inputs: [{ store, readerId: "override-reader" }] });
  if (!bound) throw new Error("binding declined");
  const forged = [new Proxy(bound, {}) as typeof bound];
  const forgedTransaction = new StoreRenderTransaction("forged");
  equal(prepareOwnedClosedStoreOutputs(world, forgedTransaction, forged), null);
  forgedTransaction.discard();
  const builder: NonNullable<ReturnType<typeof bindOwnedClosedStoreOutputRequest>>[] = [];
  builder.push(bound);

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
  const old = normalizeClosedStoreDataExecution({ schemaVersion: 3,
    kind: "owned-data", componentProgramId: "capture-batch", moduleRevision: "rev",
  }, host())!;
  const builder: NonNullable<ReturnType<typeof bindOwnedClosedStoreOutputRequest>>[] = [];
  const first = bindOwnedClosedStoreOutputRequest({ execution: batch,
    owner: firstOwner, hostKey: "batch-key",
    inputs: [{ store, readerId: "batch-reader" }] });
  const second = bindOwnedClosedStoreOutputRequest({ execution: old,
    owner: oldOwner, hostKey: "old-key",
    inputs: [{ store, readerId: "old-reader" }] });
  if (!first || !second) throw new Error("mixed binding declined");
  builder.push(first, second);
  const counts = { frames: 0, rootMaterializations: 0, propMaterializations: 0,
    pages: 0, batchCalls: 0, batchRows: 0 };
  const transaction = new StoreRenderTransaction("mixed-root");
  const result = prepareOwnedClosedStoreOutputs(world, transaction, builder, counts);
  if (!result || result.kind !== "ready") throw new Error("mixed cut declined");
  equal(counts.batchCalls, 1);
  equal(counts.batchRows, 1);
  equal(counts.frames, 1);
  equal(counts.pages, 1);
  equal(result.rows[0].kind, "page");
  equal(result.rows[1].kind, "frame");
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
  const builder: NonNullable<ReturnType<typeof bindOwnedClosedStoreOutputRequest>>[] = [];
  if (!bound) throw new Error("overflow binding declined");
  builder.push(bound);
  const transaction = new StoreRenderTransaction("overflow-root");
  equal(prepareOwnedClosedStoreOutputs(world, transaction, builder), null);
  transaction.discard();
});

Deno.test("a later invalid batch row prevents publication of the entire page", () => {
  const twoRowsHost = normalizeClosedStoreHostProgram({
    schemaVersion: 7, componentProgramId: "whole-page", moduleRevision: "rev",
    inputs: [{ storeUseSiteId: "frame", storeProp: "clock", paths: [["phase"]] }],
    stateSites: ["offset"], effectSites: [], retainedChildProp: "children",
    host: { tag: "group", key: "whole-page", child: null, props: [
      ["position-x", { kind: "binary", operator: "+",
        left: { kind: "input", index: 0 }, right: { kind: "input", index: 1 } }],
    ] },
  })!;
  const twoRows = normalizeClosedStoreDataExecution({ schemaVersion: 3,
    kind: "owned-data", componentProgramId: "whole-page", moduleRevision: "rev",
    batchKernel: function(s: readonly number[], v: readonly number[],
      o: number[][], n: number) {
      for (let r = 0; r < n; r++) o[r][0] = s[0] + v[r];
    },
  }, twoRowsHost)!;
  equal(inspectClosedStoreDataExecution(twoRows)?.mode, "verified-batch");
  const world = new OwnerStateWorld();
  const first = world.resolveOwner(null, "finite");
  const second = world.resolveOwner(null, "nonfinite");
  world.useState(first, "offset", -1e308);
  world.useState(second, "offset", 1e308);
  const store = createAsyncStore(storeRecord({ phase: 1e308 }));
  const builder: NonNullable<ReturnType<typeof bindOwnedClosedStoreOutputRequest>>[] = [];
  for (const [owner, readerId] of [[first, "finite"], [second, "nonfinite"]] as const) {
    const bound = bindOwnedClosedStoreOutputRequest({ execution: twoRows, owner,
      hostKey: readerId, inputs: [{ store, readerId }] });
    if (!bound) throw new Error("batch binding declined");
    builder.push(bound);
  }
  const counts = { frames: 0, pages: 0, rootMaterializations: 0,
    propMaterializations: 0, batchCalls: 0, batchRows: 0 };
  const transaction = new StoreRenderTransaction("invalid-later-row");
  equal(prepareOwnedClosedStoreOutputs(world, transaction, builder, counts), null);
  equal(counts.pages, 0);
  equal(counts.batchRows, 0);
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
  const builder: NonNullable<ReturnType<typeof bindOwnedClosedStoreOutputRequest>>[] = [];
  if (!bound) throw new Error("reciprocal binding declined");
  builder.push(bound);
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
  const builder: NonNullable<ReturnType<typeof bindOwnedClosedStoreOutputRequest>>[] = [];
  if (!bound) throw new Error("NaN binding declined");
  builder.push(bound);
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
  const plan = createOwnedClosedFramePlan([{
    world: worldBound, projections: source, group: -1, groupRow: -1,
  }]);
  if (!plan) throw new Error("mounted capture plan declined");
  equal(reads, 1);
  const schedule = createOwnedClosedFrameScheduleFromPlan(plan, []);
  if (!schedule) throw new Error("capture cut declined");
  equal(schedule.boundAt(0), projection);
});

Deno.test("public page authority exposes no mutable batch matrix or forged page", () => {
  const layout = OwnedScalarLayout.create(["position-x"], [undefined], [0]);
  const input = createOwnedClosedFrameInput(0, 0, 1);
  equal("rows" in OwnedScalarBatchPage.prototype, false);
  let rejectedPage = false;
  try {
    new OwnedScalarBatchPage(Symbol("forged"), layout, Object.freeze([Object.freeze([3])]));
  } catch { rejectedPage = true; }
  equal(rejectedPage, true);
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
