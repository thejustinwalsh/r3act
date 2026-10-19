import { assertEquals, assertThrows } from "jsr:@std/assert";
import { bind, jsx, NumericColumn, ScalarSource } from "./jsx_binding_runtime.ts";
import { MemoryVDOMHost, VDOMSnapshotRoot } from "./vdom_snapshot_runtime.ts";

function unary(source: ScalarSource, sinkId: string, project: (value: number) => unknown) {
  return { ...bind(source, project), numericProgram: {
    schemaVersion: 1 as const, sinkId, sourceSites: [sinkId],
  } };
}

Deno.test("prepared cut cancels during projection before any host write", () => {
  const host = new MemoryVDOMHost();
  const container = host.createContainer();
  const root = new VDOMSnapshotRoot(host, container);
  const source = new ScalarSource(0, 1);
  const column = new NumericColumn(0, 0, new Float64Array([1]));
  let cancel = false;
  let laterProjects = 0;
  root.commit(jsx("output", {
    first: unary(source, "first", (value) => {
      if (cancel) root.dispose();
      return value;
    }),
    second: unary(source, "second", (value) => { laterProjects++; return value; }),
  }), null, true);
  const token = root.prepareNumericCellProgram(source, column, 0)!;
  const writes = host.writeCount;
  laterProjects = 0;
  cancel = true;
  assertEquals(root.executePreparedNumericCells([token], [2], 1), false);
  assertEquals(laterProjects, 0);
  assertEquals(host.writeCount, writes);
  assertEquals(root.isPreparedNumericCellProgramCurrent(token), false);
  assertEquals(root.diagnostics().columnRowsScratchRetained, 0);
  assertEquals(root.diagnostics().columnRowsScratchCapacity, 0);
});

Deno.test("prepared projector failure performs no host writes and releases reusable scratch", () => {
  const host = new MemoryVDOMHost();
  const container = host.createContainer();
  const root = new VDOMSnapshotRoot(host, container);
  const source = new ScalarSource(0, 1);
  const column = new NumericColumn(0, 0, new Float64Array([1]));
  let fail = false;
  root.commit(jsx("output", {
    first: unary(source, "first", (value) => value),
    second: unary(source, "second", (value) => {
      if (fail) throw new Error("projection failure");
      return value;
    }),
  }), null, true);
  const token = root.prepareNumericCellProgram(source, column, 0)!;
  const writes = host.writeCount;
  fail = true;
  assertThrows(() => root.executePreparedNumericCells([token], [2], 1), Error, "projection failure");
  assertEquals(host.writeCount, writes);
  assertEquals(container.children[0].props.first, 1);
  assertEquals(root.diagnostics().columnRowsScratchRetained, 0);
  fail = false;
  assertEquals(root.executePreparedNumericCells([token], [3], 1), true);
  assertEquals(container.children[0].props.first, 3);
  root.dispose();
});
