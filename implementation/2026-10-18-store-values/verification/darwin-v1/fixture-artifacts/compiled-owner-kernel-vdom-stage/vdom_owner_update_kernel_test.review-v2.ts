import {
  associateCompiledOwnerUpdateProgram,
  type CompiledOwnerUpdateProgram,
  type CompiledStateLayout,
} from "./compiled_state_layout.ts";
import { bind, bindSources, jsx, NumericColumn, ScalarSource } from "./jsx_binding_runtime.ts";
import { MemoryVDOMHost, VDOMSnapshotRoot } from "./vdom_snapshot_runtime.ts";

const assert = (condition: unknown, message: string) => {
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
  schemaVersion: 1,
  programId,
  slotCount: 2,
  sinkIds: Object.freeze(["sum", "x"]),
  executeCut(changedRows, changedSlots, changeCount, rowStates, stagedRows, stagedSinkIds, stagedValues) {
    let stagedCount = 0;
    for (let index = 0; index < changeCount; index++) {
      const rowIndex = changedRows[index];
      const slot = changedSlots[index];
      const row = rowStates[rowIndex]!;
      const add = (sinkIndex: number, value: number) => {
        const bit = 1 << sinkIndex;
        if ((row.seenMask & bit) !== 0) return;
        row.seenMask |= bit;
        if (!Object.is(row.sinks[sinkIndex].lastValue, value)) {
          stagedRows[stagedCount] = rowIndex;
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
) => Object.assign(value, {
  numericProgram: Object.freeze({
    schemaVersion: 2 as const,
    ownerProgramId: layout.programId!,
    sinkId,
    sourceSites: Object.freeze(sourceSlots.map((slot) => layout.slots[slot].siteId)),
  }),
  numericOwner: Object.freeze({
    owner: 73,
    programId: layout.programId!,
    layout,
    sourceSlots: Object.freeze([...sourceSlots]),
  }),
});

Deno.test("compiled owner update kernel stages sparse and dense row cuts", () => {
  const host = new MemoryVDOMHost();
  const container = host.createContainer();
  const root = new VDOMSnapshotRoot(host, container);
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
  }), layout, [0, 1], "sum");
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

Deno.test("incomplete compiled sink coverage chooses generic owner-row fallback", () => {
  const host = new MemoryVDOMHost();
  const container = host.createContainer();
  const root = new VDOMSnapshotRoot(host, container);
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
  }), layout, [0, 1], "sum");
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
