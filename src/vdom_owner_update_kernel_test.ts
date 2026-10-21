import {
  associateCompiledOwnerUpdateProgram,
  type CompiledOwnerUpdatePrimitive,
  type CompiledOwnerUpdateProgram,
  type CompiledStateLayout,
} from "./compiled_state_layout.ts";
import { bind, bindSources, jsx, NumericColumn, ScalarSource } from "./jsx_binding_runtime.ts";
import { MemoryVDOMHost, VDOMSnapshotRoot } from "./vdom_snapshot_runtime.ts";

const assert: (condition: unknown, message: string) => asserts condition = (condition, message) => {
  if (!condition) throw new Error(message);
};
const same = (actual: unknown, expected: unknown, message: string) => {
  if (!Object.is(actual, expected)) {
    throw new Error(`${message}: expected ${String(expected)}, got ${String(actual)}`);
  }
};

const makeLayout = (): CompiledStateLayout => Object.freeze({
  schemaVersion: 1,
  programId: "KernelRows",
  slots: Object.freeze([
    Object.freeze({ siteId: "x", slot: 0 }),
    Object.freeze({ siteId: "y", slot: 1 }),
  ]),
});

const makeKernel = (programId: string): CompiledOwnerUpdateProgram => ({
  schemaVersion: 2,
  programId,
  slotCount: 2,
  sinkIds: Object.freeze(["sum", "x"]),
  executeCut(changedSlots, changeCount, rowStates, stagedInputIndices, stagedSinkIds, stagedValues) {
    let stagedCount = 0;
    for (let index = 0; index < changeCount; index++) {
      const slot = changedSlots[index];
      const row = rowStates[index]!;
      const add = (sinkIndex: number, value: number) => {
        const bit = 1 << sinkIndex;
        if ((row.seenMask & bit) !== 0) return;
        row.seenMask |= bit;
        if (!Object.is(row.sinks[sinkIndex].lastValue, value)) {
          stagedInputIndices[stagedCount] = index;
          stagedSinkIds[stagedCount] = sinkIndex;
          stagedValues[stagedCount] = value;
          stagedCount++;
        }
      };
      if (slot === 0) {
        add(0, row.inputValues[0] + row.inputValues[1]);
        add(1, row.inputValues[0]);
      } else if (slot === 1) {
        add(0, row.inputValues[0] + row.inputValues[1]);
      }
    }
    return stagedCount;
  },
});

const owned = <T extends object>(
  value: T,
  layout: CompiledStateLayout,
  sourceSlots: readonly number[],
  sinkId: string,
  owner = 73,
  projectInputs?: (values: readonly number[]) => unknown,
) => Object.assign(value, {
  ...(projectInputs ? { projectInputs } : {}),
  numericProgram: Object.freeze({
    schemaVersion: 2 as const,
    ownerProgramId: layout.programId!,
    sinkId,
    sourceSites: Object.freeze(sourceSlots.map((slot) => layout.slots[slot].siteId)),
  }),
  numericOwner: Object.freeze({
    owner,
    programId: layout.programId!,
    layout,
    sourceSlots: Object.freeze([...sourceSlots]),
  }),
});

const makeSingleSlotLayout = (programId: string): CompiledStateLayout => Object.freeze({
  schemaVersion: 1,
  programId,
  slots: Object.freeze([Object.freeze({ siteId: "value", slot: 0 })]),
});

const makeSingleSinkKernel = (
  programId: string,
  evaluate: (value: number) => number,
): CompiledOwnerUpdateProgram => ({
  schemaVersion: 2,
  programId,
  slotCount: 1,
  sinkIds: Object.freeze(["value"]),
  executeCut(changedSlots, changeCount, rowStates, stagedInputIndices, stagedSinkIds, stagedValues) {
    let stagedCount = 0;
    for (let index = 0; index < changeCount; index++) {
      if (changedSlots[index] !== 0) continue;
      const row = rowStates[index]!;
      if ((row.seenMask & 1) !== 0) continue;
      row.seenMask |= 1;
      const next = evaluate(row.inputValues[0]);
      if (!Object.is(row.sinks[0].lastValue, next)) {
        stagedInputIndices[stagedCount] = index;
        stagedSinkIds[stagedCount] = 0;
        stagedValues[stagedCount] = next;
        stagedCount++;
      }
    }
    return stagedCount;
  },
});

Deno.test("compiled owner update kernel stages sparse and dense row cuts", () => {
  const host = new MemoryVDOMHost();
  const container = host.createContainer();
  const root = new VDOMSnapshotRoot(host, container, undefined, () => {});
  const layout = makeLayout();
  associateCompiledOwnerUpdateProgram(layout, makeKernel("KernelRows"));
  const x = new ScalarSource(801, 1);
  const y = new ScalarSource(802, 2);
  const columns = [
    new NumericColumn(811, 0, new Float64Array([1])),
    new NumericColumn(812, 1, new Float64Array([2])),
  ];
  let genericProjectorCalls = 0;
  const sum = owned(bindSources([x, y], (values) => {
    genericProjectorCalls++;
    return values[0] + values[1];
  }), layout, [0, 1], "sum", 73, (values) => values[0] + values[1]);
  const xValue = owned(bind(x, (value) => {
    genericProjectorCalls++;
    return value;
  }), layout, [0], "x");
  root.commit(jsx("output", { sum, x: xValue }), undefined, true);
  genericProjectorCalls = 0;
  const token = root.prepareNumericRowProgram({
    owner: 73,
    layout,
    rowIdentity: {},
    row: 0,
    generation: 1,
    sources: [x, y],
    columns,
  });
  assert(token, "row preparation selects the associated complete kernel");

  columns[1].values = new Float64Array(0);
  same(root.executePreparedNumericRows(
    [token], new Uint32Array([0]), new Uint32Array([0]), [4], 1,
  ), null, "stale peer-column capacity declines before the kernel");
  same(x.value, 1, "stale peer-column decline leaves source mirrors untouched");
  columns[1].values = new Float64Array([2]);
  same(root.executePreparedNumericRows(
    [token], new Uint32Array([0, 0]), new Uint32Array([0, 0]), [4, 5], 2,
  ), null, "conflicting duplicate values reject before mirroring");
  same(x.value, 1, "conflicting values leave the source mirror unchanged");
  same(genericProjectorCalls, 0, "conflicting values do not call projectors");

  columns[0].values[0] = 4;
  same(root.executePreparedNumericRows(
    [token], new Uint32Array([0]), new Uint32Array([0]), [4], 1,
  ), true, "sparse cut writes its changed sinks");
  same(container.children[0].props.sum, 6, "sparse x update reads captured y");
  same(container.children[0].props.x, 4, "sparse x update reaches unary sink");

  columns[1].values[0] = 7;
  same(root.executePreparedNumericRows(
    [token], new Uint32Array([0, 0]), new Uint32Array([0, 1]), [5, 7], 2,
  ), true, "dense cut stages changed outputs before host writes");
  same(container.children[0].props.sum, 12, "dense cut projects the complete captured row");
  same(container.children[0].props.x, 5, "dense cut preserves sink mapping");
  same(genericProjectorCalls, 0, "compiled kernel bypasses per-group projectors");
  same(root.executePreparedNumericRows(
    [token], new Uint32Array([0, 0]), new Uint32Array([0, 1]), [5, 7], 2,
  ), false, "equal compiled outputs suppress host writes");
  const diagnostics = root.diagnostics();
  same(diagnostics.preparedOwnerUpdateKernelBatches, 3, "kernel batches are counted");
  same(diagnostics.preparedOwnerUpdateKernelSelectedSinks, 6,
    "selected sink count includes equality checks");
  same(diagnostics.preparedOwnerUpdateKernelStagedSinks, 4,
    "equal outputs do not enter the staged writer list");
  root.dispose();
});

Deno.test("kernel cuts stay bounded for sparse token indexes and deduplicate token aliases", () => {
  const host = new MemoryVDOMHost();
  const container = host.createContainer();
  const root = new VDOMSnapshotRoot(host, container, undefined, () => {});
  const layout = makeSingleSlotLayout("SparseTokenRows");
  associateCompiledOwnerUpdateProgram(layout, makeSingleSinkKernel("SparseTokenRows", (value) => value));
  const source = new ScalarSource(815, 1);
  const column = new NumericColumn(816, 0, new Float64Array([1]));
  root.commit(jsx("output", {
    value: owned(bind(source, (value) => value), layout, [0], "value"),
  }), undefined, true);
  const token = root.prepareNumericRowProgram({
    owner: 73, layout, rowIdentity: {}, row: 0, generation: 1,
    sources: [source], columns: [column],
  });
  assert(token, "single-source row prepares for sparse token lookup");
  const tokens = new Array(4096);
  tokens[4095] = token;
  column.values[0] = 7;
  same(root.executePreparedNumericRows(
    tokens, new Uint32Array([4095]), new Uint32Array([0]), [7], 1,
  ), true, "high token index executes one row");
  same(container.children[0].props.value, 7, "sparse token output is applied");
  same(root.diagnostics().preparedNumericRowWorkVisits, 3,
    "row preflight and mirroring visit only the one changed row");

  tokens[2] = token;
  column.values[0] = 8;
  same(root.executePreparedNumericRows(
    tokens, new Uint32Array([2, 4095]), new Uint32Array([0, 0]), [8, 8], 2,
  ), true, "duplicate token entries with matching values share one row state");
  same(container.children[0].props.value, 8, "deduplicated output remains correct");
  const diagnostics = root.diagnostics();
  same(diagnostics.preparedOwnerUpdateKernelBatches, 2, "both accepted cuts use the kernel");
  same(diagnostics.preparedOwnerUpdateKernelRows, 2, "duplicate indexes count one affected row per cut");
  same(diagnostics.preparedOwnerUpdateKernelSelectedSinks, 2, "duplicate input aliases select the sink once");
  same(root.executePreparedNumericRows(
    tokens, new Uint32Array([2, 4095]), new Uint32Array([0, 0]), [9, 10], 2,
  ), null, "conflicting duplicate values decline before kernel execution");
  same(container.children[0].props.value, 8, "conflicting alias cut leaves host unchanged");
  same(root.diagnostics().preparedOwnerUpdateKernelBatches, 2, "declined cut is not counted as a kernel batch");
  root.dispose();
});

Deno.test("incomplete compiled sink coverage chooses generic owner-row fallback", () => {
  const host = new MemoryVDOMHost();
  const container = host.createContainer();
  const root = new VDOMSnapshotRoot(host, container, undefined, () => {});
  const layout = makeLayout();
  associateCompiledOwnerUpdateProgram(layout, makeKernel("KernelRows"));
  const x = new ScalarSource(821, 1);
  const y = new ScalarSource(822, 2);
  const columns = [
    new NumericColumn(831, 0, new Float64Array([1])),
    new NumericColumn(832, 1, new Float64Array([2])),
  ];
  let projected = 0;
  const sum = owned(bindSources([x, y], (values) => {
    projected++;
    return values[0] + values[1];
  }), layout, [0, 1], "sum", 73, (values) => { projected++; return values[0] + values[1]; });
  const rootOnly = owned(bind(x, (value) => {
    projected++;
    return value;
  }), layout, [0], "different-sink");
  root.commit(jsx("output", { sum, x: rootOnly }), undefined, true);
  projected = 0;
  const token = root.prepareNumericRowProgram({
    owner: 73,
    layout,
    rowIdentity: {},
    row: 0,
    generation: 1,
    sources: [x, y],
    columns,
  });
  assert(token, "generic fallback remains prepared when kernel sinks are incomplete");
  columns[0].values[0] = 6;
  same(root.executePreparedNumericRows(
    [token], new Uint32Array([0]), new Uint32Array([0]), [6], 1,
  ), true, "generic fallback applies the cut");
  same(container.children[0].props.sum, 8, "generic fallback uses captured peer value");
  same(projected, 2, "both fallback projectors execute once");
  same(root.diagnostics().preparedOwnerUpdateGenericFallbackCuts, 1,
    "fallback is visible in diagnostics");
  root.dispose();
});

Deno.test("heterogeneous owner rows use ordered generic fanout with retained vectors", () => {
  const host = new MemoryVDOMHost();
  const container = host.createContainer();
  const root = new VDOMSnapshotRoot(host, container, undefined, () => {});
  const layoutA = makeLayout();
  const layoutB: CompiledStateLayout = Object.freeze({
    schemaVersion: 1,
    programId: "OtherRows",
    slots: layoutA.slots,
  });
  associateCompiledOwnerUpdateProgram(layoutA, makeKernel("KernelRows"));
  const aX = new ScalarSource(841, 1);
  const aY = new ScalarSource(842, 2);
  const bX = new ScalarSource(843, 3);
  const bY = new ScalarSource(844, 4);
  const aColumns = [
    new NumericColumn(851, 0, new Float64Array([1])),
    new NumericColumn(852, 1, new Float64Array([2])),
  ];
  const bColumns = [
    new NumericColumn(853, 0, new Float64Array([3])),
    new NumericColumn(854, 1, new Float64Array([4])),
  ];
  let genericCalls = 0;
  let aInputs: readonly number[] | undefined;
  const aSum = owned(bindSources([aX, aY], (values) => {
    genericCalls++;
    aInputs ??= values;
    return values[0] + values[1];
  }), layoutA, [0, 1], "sum-a", 73, (values) => { genericCalls++; return values[0] + values[1]; });
  const aUnary = owned(bind(aX, (value) => {
    genericCalls++;
    return value;
  }), layoutA, [0], "x-a", 73);
  const bSum = owned(bindSources([bX, bY], (values) => {
    genericCalls++;
    return values[0] + values[1];
  }), layoutB, [0, 1], "sum-b", 74, (values) => { genericCalls++; return values[0] + values[1]; });
  const bUnary = owned(bind(bX, (value) => {
    genericCalls++;
    return value;
  }), layoutB, [0], "x-b", 74);
  root.commit(jsx("output", { aSum, aX: aUnary, bSum, bX: bUnary }), undefined, true);
  genericCalls = 0;
  const aToken = root.prepareNumericRowProgram({
    owner: 73, layout: layoutA, rowIdentity: {}, row: 0, generation: 1,
    sources: [aX, aY], columns: aColumns,
  });
  const bToken = root.prepareNumericRowProgram({
    owner: 74, layout: layoutB, rowIdentity: {}, row: 0, generation: 1,
    sources: [bX, bY], columns: bColumns,
  });
  assert(aToken && bToken, "both rows prepare through their own layouts");
  const writes: string[] = [];
  const setProp = host.setProp.bind(host);
  host.setProp = (node, name, value, previous) => {
    writes.push(name);
    setProp(node, name, value, previous);
  };
  const cut = (aXValue: number, bXValue: number, aYValue: number, bYValue: number) => root.executePreparedNumericRows(
    [aToken, bToken], new Uint32Array([0, 1, 0, 1]), new Uint32Array([0, 0, 1, 1]),
    [aXValue, bXValue, aYValue, bYValue], 4,
  );
  same(cut(5, 9, 6, 10), true, "mixed kernel/generic rows take one generic cut");
  same(writes.join(","), "aSum,aX,bSum,bX", "generic fallback keeps first-touch sink order");
  same(container.children[0].props.aSum, 11, "kernel row uses generic projection after mixing");
  same(container.children[0].props.bSum, 19, "generic row uses captured peer state");
  same(genericCalls, 4, "all eligible sinks use generic projection in a mixed cut");
  const stableInputs = aInputs;
  writes.length = 0;
  same(cut(7, 11, 8, 12), true, "a later heterogeneous cut remains generic");
  same(aInputs, stableInputs, "fallback retains the per-sink argument vector");
  same(root.diagnostics().preparedOwnerUpdateKernelBatches, 0,
    "a heterogeneous cut does not partially execute a compiled kernel");
  same(root.diagnostics().preparedOwnerUpdateGenericFallbackCuts, 2,
    "both heterogeneous cuts are counted");
  const sourceValues = [aX.value, aY.value, bX.value, bY.value];
  writes.length = 0;
  genericCalls = 0;
  bColumns[1].values = new Float64Array(0);
  same(root.executePreparedNumericRows(
    [aToken, bToken], new Uint32Array([0, 1]), new Uint32Array([0, 0]),
    [101, 102], 2,
  ), null, "program mismatch still validates later untouched dependencies");
  same(JSON.stringify([aX.value, aY.value, bX.value, bY.value]),
    JSON.stringify(sourceValues), "mixed stale dependency leaves all mirrors unchanged");
  same(genericCalls, 0, "mixed stale dependency invokes no projectors");
  same(writes.length, 0, "mixed stale dependency performs no host writes");
  root.dispose();
});

Deno.test("certified heterogeneous rows run ordered kernels and validate every staged output before writing", () => {
  const host = new MemoryVDOMHost();
  const container = host.createContainer();
  const root = new VDOMSnapshotRoot(host, container, undefined, () => {});
  const layoutA = makeLayout();
  const layoutB = makeSingleSlotLayout("OtherCertifiedRows");
  associateCompiledOwnerUpdateProgram(layoutA, makeKernel("KernelRows"));
  const baseB = makeSingleSinkKernel("OtherCertifiedRows", (value) => value * 3);
  let malformedLater = false;
  associateCompiledOwnerUpdateProgram(layoutB, {
    ...baseB,
    executeCut(...args) {
      const count = baseB.executeCut(...args);
      if (malformedLater && count) args[5][0] = { invalid: true } as never;
      return count;
    },
  });
  const aX = new ScalarSource(901, 1);
  const aY = new ScalarSource(902, 2);
  const bX = new ScalarSource(903, 3);
  const aColumns = [
    new NumericColumn(911, 0, new Float64Array([1])),
    new NumericColumn(912, 1, new Float64Array([2])),
  ];
  const bColumn = new NumericColumn(913, 0, new Float64Array([3]));
  let genericCalls = 0;
  const sum = owned(bindSources([aX, aY], values => {
    genericCalls++;
    return values[0] + values[1];
  }), layoutA, [0, 1], "sum", 73, values => {
    genericCalls++;
    return values[0] + values[1];
  });
  const xValue = owned(bind(aX, value => {
    genericCalls++;
    return value;
  }), layoutA, [0], "x", 73);
  const bValue = owned(bind(bX, value => {
    genericCalls++;
    return value * 3;
  }), layoutB, [0], "value", 74);
  root.commit(jsx("output", { sum, x: xValue, b: bValue }), undefined, true);
  genericCalls = 0;
  const tokenA = root.prepareNumericRowProgram({
    owner: 73, layout: layoutA, rowIdentity: {}, row: 0, generation: 1,
    sources: [aX, aY], columns: aColumns,
  });
  const tokenB = root.prepareNumericRowProgram({
    owner: 74, layout: layoutB, rowIdentity: {}, row: 0, generation: 1,
    sources: [bX], columns: [bColumn],
  });
  assert(tokenA && tokenB, "both distinct compiled row programs prepare");
  const writes: string[] = [];
  const setProp = host.setProp.bind(host);
  host.setProp = (node, name, value, previous) => {
    writes.push(name);
    setProp(node, name, value, previous);
  };
  const execute = (x: number, b: number, y: number) => root.executePreparedNumericRows(
    [tokenA, tokenB], new Uint32Array([0, 1, 0]), new Uint32Array([0, 0, 1]),
    [x, b, y], 3,
  );
  aColumns[0].values[0] = 5;
  aColumns[1].values[0] = 6;
  bColumn.values[0] = 9;
  same(execute(5, 9, 6), true, "A.x, B.x, A.y publish as one heterogeneous cut");
  same(container.children[0].props.sum, 11, "A sum uses the final captured peer slot");
  same(container.children[0].props.x, 5, "A unary sink keeps its own slot");
  same(container.children[0].props.b, 27, "B uses its distinct compiled program");
  same(writes.join(","), "sum,x,b", "cross-program writes preserve first-touch sink order");
  same(genericCalls, 0, "certified mixed rows bypass generic projectors");
  same(root.diagnostics().preparedOwnerUpdateKernelBatches, 3,
    "three original-order program spans execute compiled kernels");
  same(root.diagnostics().preparedOwnerUpdateGenericFallbackCuts, 0,
    "complete mixed proof does not run generic fallback");
  writes.length = 0;
  malformedLater = true;
  aColumns[0].values[0] = 7;
  bColumn.values[0] = 10;
  let thrown = false;
  try { execute(7, 10, 6); } catch { thrown = true; }
  assert(thrown, "malformed output from the later program must reject the whole staged cut");
  same(writes.length, 0, "earlier program's valid output was not written before late validation");
  same(container.children[0].props.sum, 11, "accepted A output survives late kernel failure");
  same(container.children[0].props.b, 27, "accepted B output survives late kernel failure");
  root.dispose();
});

Deno.test("kernel failure and invalid staged tails scrub before host writes", () => {
  const host = new MemoryVDOMHost();
  const container = host.createContainer();
  const root = new VDOMSnapshotRoot(host, container);
  const layout = makeSingleSlotLayout("ThrowRows");
  let capturedValues: CompiledOwnerUpdatePrimitive[] | undefined;
  associateCompiledOwnerUpdateProgram(layout, {
    schemaVersion: 2,
    programId: "ThrowRows",
    slotCount: 1,
    sinkIds: Object.freeze(["value"]),
    executeCut(_slots, _count, rowStates, inputIndices, sinkIds, values) {
      const row = rowStates[0]!;
      row.seenMask |= 1;
      inputIndices[0] = 0;
      sinkIds[0] = 0;
      values[0] = row.inputValues[0];
      capturedValues = values;
      throw new Error("kernel failure after a staged write");
    },
  });
  const source = new ScalarSource(861, 1);
  const column = new NumericColumn(862, 0, new Float64Array([1]));
  root.commit(jsx("output", {
    value: owned(bind(source, (value) => value), layout, [0], "value"),
  }), undefined, true);
  const token = root.prepareNumericRowProgram({
    owner: 73, layout, rowIdentity: {}, row: 0, generation: 1,
    sources: [source], columns: [column],
  });
  assert(token, "throwing kernel row prepares");
  column.values[0] = 2;
  let threw = false;
  try {
    root.executePreparedNumericRows([token], new Uint32Array([0]), new Uint32Array([0]), [2], 1);
  } catch {
    threw = true;
  }
  assert(threw, "kernel exception remains terminal");
  same(container.children[0].props.value, 1, "kernel exception occurs before host writes");
  same(capturedValues?.[0], 0, "partial staged values are scrubbed after kernel throws");
  root.dispose();
});

Deno.test("kernel validates every staged result before its first host write", () => {
  const host = new MemoryVDOMHost();
  const container = host.createContainer();
  const root = new VDOMSnapshotRoot(host, container);
  const layout = makeSingleSlotLayout("InvalidRows");
  associateCompiledOwnerUpdateProgram(layout, {
    schemaVersion: 2,
    programId: "InvalidRows",
    slotCount: 1,
    sinkIds: Object.freeze(["first", "later"]),
    executeCut(_slots, _count, rowStates, inputIndices, sinkIds, values) {
      const row = rowStates[0]!;
      row.seenMask |= 3;
      inputIndices[0] = 0;
      inputIndices[1] = 0;
      sinkIds[0] = 0;
      sinkIds[1] = 1;
      values[0] = 2;
      values[1] = { invalid: true } as never;
      return 2;
    },
  });
  const source = new ScalarSource(871, 1);
  const column = new NumericColumn(872, 0, new Float64Array([1]));
  root.commit(jsx("output", {
    first: owned(bind(source, (value) => value), layout, [0], "first"),
    later: owned(bind(source, (value) => value), layout, [0], "later"),
  }), undefined, true);
  const token = root.prepareNumericRowProgram({
    owner: 73, layout, rowIdentity: {}, row: 0, generation: 1,
    sources: [source], columns: [column],
  });
  assert(token, "multi-sink row prepares");
  column.values[0] = 2;
  let threw = false;
  try {
    root.executePreparedNumericRows([token], new Uint32Array([0]), new Uint32Array([0]), [2], 1);
  } catch {
    threw = true;
  }
  assert(threw, "malformed later staged output is rejected");
  same(container.children[0].props.first, 1, "valid first staged output was not written early");
  same(container.children[0].props.later, 1, "invalid later output leaves sibling untouched");
  root.dispose();
});

Deno.test("kernel disposal cancels before selected-source bookkeeping or writers", () => {
  const host = new MemoryVDOMHost();
  const container = host.createContainer();
  const root = new VDOMSnapshotRoot(host, container);
  const layout = makeSingleSlotLayout("DisposeRows");
  associateCompiledOwnerUpdateProgram(layout, {
    schemaVersion: 2,
    programId: "DisposeRows",
    slotCount: 1,
    sinkIds: Object.freeze(["value"]),
    executeCut(_slots, _count, rowStates, inputIndices, sinkIds, values) {
      const row = rowStates[0]!;
      row.seenMask |= 1;
      inputIndices[0] = 0;
      sinkIds[0] = 0;
      values[0] = row.inputValues[0];
      root.dispose();
      return 1;
    },
  });
  const source = new ScalarSource(881, 1);
  const column = new NumericColumn(882, 0, new Float64Array([1]));
  root.commit(jsx("output", {
    value: owned(bind(source, (value) => value), layout, [0], "value"),
  }), undefined, true);
  const token = root.prepareNumericRowProgram({
    owner: 73, layout, rowIdentity: {}, row: 0, generation: 1,
    sources: [source], columns: [column],
  });
  assert(token, "disposal row prepares");
  column.values[0] = 2;
  same(root.executePreparedNumericRows([token], new Uint32Array([0]), new Uint32Array([0]), [2], 1),
    false, "disposal from a kernel cancels its cut");
  same(container.children.length, 0, "disposed host tree remains removed");
});

Deno.test("kernel host reentry failure leaves state retryable and cleans scratch", () => {
  const host = new MemoryVDOMHost();
  const container = host.createContainer();
  const root = new VDOMSnapshotRoot(host, container);
  const layout = makeSingleSlotLayout("HostRows");
  associateCompiledOwnerUpdateProgram(layout, makeSingleSinkKernel("HostRows", (value) => value));
  const source = new ScalarSource(891, 1);
  const column = new NumericColumn(892, 0, new Float64Array([1]));
  root.commit(jsx("output", {
    value: owned(bind(source, (value) => value), layout, [0], "value"),
  }), undefined, true);
  const token = root.prepareNumericRowProgram({
    owner: 73, layout, rowIdentity: {}, row: 0, generation: 1,
    sources: [source], columns: [column],
  });
  assert(token, "host row prepares");
  column.values[0] = 2;
  const originalSetProp = host.setProp.bind(host);
  let reenter = true;
  host.setProp = (node, name, value, previous) => {
    if (reenter && name === "value") {
      reenter = false;
      root.executePreparedNumericRows([token], new Uint32Array([0]), new Uint32Array([0]), [2], 1);
    }
    originalSetProp(node, name, value, previous);
  };
  let threw = false;
  try {
    root.executePreparedNumericRows([token], new Uint32Array([0]), new Uint32Array([0]), [2], 1);
  } catch {
    threw = true;
  }
  assert(threw, "nested host write is rejected by the numeric write guard");
  same(container.children[0].props.value, 1, "failed reentry does not complete the host write");
  same(root.executePreparedNumericRows(
    [token], new Uint32Array([0]), new Uint32Array([0]), [2], 1,
  ), true, "a later cut succeeds after host failure cleanup");
  same(container.children[0].props.value, 2, "retry publishes the captured value");
  root.dispose();
});
