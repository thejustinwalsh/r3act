import { assertEquals } from "jsr:@std/assert";
import {
  bindCompiledColumn,
  jsx,
  NumericColumn,
} from "./jsx_binding_runtime.ts";
import {
  type MemoryNode,
  MemoryVDOMHost,
  VDOMSnapshotRoot,
} from "./vdom_snapshot_runtime.ts";

function graph(bindingIds: number[]) {
  return {
    sourceCount: bindingIds.length,
    sourcePaths: bindingIds.map((_, index) => `column-${index}`),
    sourceBindingOffsets: Array.from(
      { length: bindingIds.length + 1 },
      (_, index) => index,
    ),
    bindingIds,
  };
}

function rowGraph(bindingIds: number[]) {
  return {
    sourceCount: 1,
    sourcePaths: ["row"],
    sourceBindingOffsets: [0, bindingIds.length],
    bindingIds,
  };
}

Deno.test("dirty-row scratch deduplicates rows and stages distinct columns as one cut", () => {
  const left = new NumericColumn(0, 0, new Float64Array([1]));
  const right = new NumericColumn(1, 1, new Float64Array([4]));
  const host = new MemoryVDOMHost();
  const container = host.createContainer();
  const root = new VDOMSnapshotRoot(host, container);
  root.commit(
    jsx("output", {
      "data-left": bindCompiledColumn(left, 0, 10),
      "data-right": bindCompiledColumn(right, 0, 11),
    }),
    graph([10, 11]),
  );

  const baseline = host.writeCount;
  left.values[0] = 2;
  right.values[0] = 8;
  root.setColumnRows([left, right, left], new Uint32Array([0, 0]));
  assertEquals(container.children[0].props["data-left"], 2);
  assertEquals(container.children[0].props["data-right"], 8);
  assertEquals(host.writeCount, baseline + 2);
  assertEquals(root.diagnostics().columnRowsScratchRetained, 0);
  assertEquals(root.diagnostics().columnRowsScratchCapacity > 0, true);

  root.setColumnRows([left, right], new Uint32Array([0, 0]));
  assertEquals(
    host.writeCount,
    baseline + 2,
    "unchanged row projections suppress writes",
  );
  assertEquals(root.diagnostics().columnRowsScratchRetained, 0);
  root.dispose();
  assertEquals(root.diagnostics().columnRowsScratchCapacity, 0);
});

Deno.test("dirty-row projector failure is atomic and clears reusable scratch references", () => {
  const column = new NumericColumn(0, 0, new Float64Array([1, 2]));
  let failProjection = false;
  const host = new MemoryVDOMHost();
  const container = host.createContainer();
  const root = new VDOMSnapshotRoot(host, container);
  root.commit(
    jsx("output", {
      "data-first": bindCompiledColumn(column, 0, 20),
      "data-second": bindCompiledColumn(column, 1, 21, (value) => {
        if (failProjection && value === 4) {
          throw new Error("row projection failed");
        }
        return value * 2;
      }),
    }),
    rowGraph([20, 21]),
  );
  const baseline = host.writeCount;
  column.values[0] = 3;
  column.values[1] = 4;
  failProjection = true;
  let thrown: unknown;
  try {
    root.setColumnRows([column], new Uint32Array([0, 1]));
  } catch (error) {
    thrown = error;
  }
  assertEquals(
    thrown instanceof Error && thrown.message === "row projection failed",
    true,
  );
  assertEquals(
    host.writeCount,
    baseline,
    "all projections precede the first host write",
  );
  assertEquals(root.diagnostics().columnRowsScratchRetained, 0);
  assertEquals(root.diagnostics().columnRowsScratchCapacity > 0, true);

  failProjection = false;
  assertEquals(root.setColumnRows([column], new Uint32Array([0, 1])), true);
  assertEquals(container.children[0].props["data-first"], 3);
  assertEquals(container.children[0].props["data-second"], 8);
  assertEquals(root.diagnostics().columnRowsScratchRetained, 0);
  root.dispose();
});

Deno.test("dirty-row host failure and guarded reentry preserve retry eligibility", () => {
  let root!: VDOMSnapshotRoot<MemoryNode>;
  let failOnce = false;
  let reentryError: unknown;
  class Host extends MemoryVDOMHost {
    override setProp(
      node: MemoryNode,
      name: string,
      value: unknown,
      previous?: unknown,
    ) {
      if (failOnce && name === "data-first") {
        failOnce = false;
        try {
          root.setColumnRows([column], new Uint32Array([1]));
        } catch (error) {
          reentryError = error;
        }
        throw new Error("row host write failed");
      }
      super.setProp(node, name, value, previous);
    }
  }
  const column = new NumericColumn(0, 0, new Float64Array([1, 2]));
  const host = new Host();
  const container = host.createContainer();
  root = new VDOMSnapshotRoot(host, container);
  root.commit(
    jsx("output", {
      "data-first": bindCompiledColumn(column, 0, 30),
      "data-second": bindCompiledColumn(column, 1, 31),
    }),
    rowGraph([30, 31]),
  );
  column.values[0] = 5;
  column.values[1] = 6;
  failOnce = true;
  let thrown: unknown;
  try {
    root.setColumnRows([column], new Uint32Array([0, 1]));
  } catch (error) {
    thrown = error;
  }
  assertEquals(
    thrown instanceof Error && thrown.message === "row host write failed",
    true,
  );
  assertEquals(
    reentryError instanceof Error &&
      reentryError.message === "Nested numeric VDOM writes are not supported",
    true,
  );
  assertEquals(root.diagnostics().columnRowsScratchRetained, 0);
  assertEquals(root.setColumnRows([column], new Uint32Array([0, 1])), true);
  assertEquals(container.children[0].props["data-first"], 5);
  assertEquals(container.children[0].props["data-second"], 6);
  assertEquals(root.diagnostics().columnRowsScratchRetained, 0);
  root.dispose();
});

Deno.test("disposing from a dirty-row host callback cancels staged writes and releases scratch", () => {
  let root!: VDOMSnapshotRoot<MemoryNode>;
  let disposeOnWrite = false;
  const updateWrites: string[] = [];
  class Host extends MemoryVDOMHost {
    override setProp(
      node: MemoryNode,
      name: string,
      value: unknown,
      previous?: unknown,
    ) {
      super.setProp(node, name, value, previous);
      if (disposeOnWrite && name.startsWith("data-")) {
        updateWrites.push(name);
        disposeOnWrite = false;
        root.dispose();
      }
    }
  }
  const column = new NumericColumn(0, 0, new Float64Array([1, 2]));
  const host = new Host();
  const container = host.createContainer();
  root = new VDOMSnapshotRoot(host, container);
  root.commit(
    jsx("output", {
      "data-first": bindCompiledColumn(column, 0, 40),
      "data-second": bindCompiledColumn(column, 1, 41),
    }),
    rowGraph([40, 41]),
  );
  column.values[0] = 7;
  column.values[1] = 9;
  disposeOnWrite = true;
  root.setColumnRows([column], new Uint32Array([0, 1]));
  assertEquals(
    updateWrites,
    ["data-first"],
    "disposal stops the remaining staged writes",
  );
  assertEquals(root.diagnostics().columnRowsScratchRetained, 0);
  assertEquals(root.diagnostics().columnRowsScratchCapacity, 0);
});

Deno.test("disposing during dirty-row projection prevents every host write", () => {
  const column = new NumericColumn(0, 0, new Float64Array([1]));
  const host = new MemoryVDOMHost();
  const container = host.createContainer();
  const root = new VDOMSnapshotRoot(host, container);
  let dispose = false;
  root.commit(
    jsx("output", {
      value: bindCompiledColumn(column, 0, 50, (value) => {
        if (dispose) root.dispose();
        return value;
      }),
    }),
    rowGraph([50]),
  );
  const baseline = host.writeCount;
  column.values[0] = 2;
  dispose = true;
  assertEquals(root.setColumnRows([column], new Uint32Array([0])), false);
  assertEquals(host.writeCount, baseline);
  assertEquals(container.children.length, 0);
  assertEquals(root.diagnostics().columnRowsScratchRetained, 0);
  assertEquals(root.diagnostics().columnRowsScratchCapacity, 0);
});

Deno.test("mounted dirty-row groups survive column reserve and structural row activation", () => {
  const column = new NumericColumn(0, 0, new Float64Array([1]));
  const host = new MemoryVDOMHost();
  const container = host.createContainer();
  const root = new VDOMSnapshotRoot(host, container);
  const row = (index: number) =>
    jsx("output", {
      key: String(index),
      value: bindCompiledColumn(column, index, 60 + index),
    });
  root.commit(row(0), rowGraph([60]));
  const first = container.children[0];
  const source = column.source;
  column.reserve(3);
  column.values[0] = 4;
  column.values[2] = 8;
  root.commit([row(0), row(2)], rowGraph([60, 62]));
  assertEquals(container.children[0], first);
  assertEquals(column.source, source);
  column.values[0] = 5;
  column.values[2] = 9;
  root.setColumnRows([column], new Uint32Array([2, 0]));
  assertEquals(container.children.map((node) => node.props.value), [5, 9]);
  assertEquals(root.diagnostics().columnRowsScratchRetained, 0);
  root.dispose();
});
