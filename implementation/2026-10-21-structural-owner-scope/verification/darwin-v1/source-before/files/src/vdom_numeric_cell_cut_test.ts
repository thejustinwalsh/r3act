import { assertEquals } from "jsr:@std/assert";
import {
  bind,
  bindSources,
  jsx,
  keyedOwnerChildren,
  NumericColumn,
  ScalarSource,
} from "./jsx_binding_runtime.ts";
import {
  type MemoryNode,
  MemoryVDOMHost,
  VDOMSnapshotRoot,
} from "./vdom_snapshot_runtime.ts";

const unary = <T>(
  source: ScalarSource,
  sinkId: string,
  project: (value: number) => T,
) => ({
  ...bind(source, project),
  numericProgram: {
    schemaVersion: 1 as const,
    sinkId,
    sourceSites: [`site:${sinkId}`],
  },
});

const sourceRows = (items: Array<{ key: string; source: ScalarSource }>) =>
  jsx("section", {
    children: items.map(({ key, source }) =>
      jsx("i", { key, value: unary(source, `sink:${key}`, (value) => value) })
    ),
  });

Deno.test("source-column attachment declines unsupported and unbound sources atomically", () => {
  const host = new MemoryVDOMHost();
  const container = host.createContainer();
  const root = new VDOMSnapshotRoot(host, container);
  const unarySource = new ScalarSource(0, 1);
  const left = new ScalarSource(1, 2);
  const right = new ScalarSource(2, 3);
  const column = new NumericColumn(0, 0, new Float64Array([1]));
  root.commit(
    jsx("output", {
      plain: bind(unarySource),
      compound: bindSources([left, right], ([a, b]) => a + b, {
        schemaVersion: 1,
        sinkId: "compound",
        sourceSites: ["left", "right"],
      }),
    }),
    null,
    true,
  );
  const writes = host.writeCount;
  assertEquals(root.bindSourceColumn(unarySource, column, 0), false);
  assertEquals(root.bindSourceColumn(left, column, 0), false);
  assertEquals(root.bindSourceColumn(new ScalarSource(3, 0), column, 0), false);
  assertEquals(root.hasColumnCell(column, 0), false);
  assertEquals(root.setColumnCells([column], [0], [9], 1), null);
  assertEquals(host.writeCount, writes);
  assertEquals(unarySource.value, 1);
  assertEquals(left.value, 2);
  root.dispose();
});

Deno.test("dirty cell cut captures distinct addresses before projection and host callbacks", () => {
  const firstColumn = new NumericColumn(0, 0, new Float64Array([10, 11]));
  const secondColumn = new NumericColumn(1, 1, new Float64Array([20, 21]));
  const firstSource = new ScalarSource(10, 1);
  const secondSource = new ScalarSource(11, 2);
  let secondProjectionValue = -1;
  class Host extends MemoryVDOMHost {
    root?: VDOMSnapshotRoot<MemoryNode>;
    mutateOnWrite = false;
    override setProp(
      node: MemoryNode,
      name: string,
      value: unknown,
      previous?: unknown,
    ) {
      super.setProp(node, name, value, previous);
      if (this.mutateOnWrite && name === "data-first") {
        this.mutateOnWrite = false;
        firstColumn.values[1] = 101;
        secondColumn.values[0] = 202;
      }
    }
  }
  const host = new Host();
  const container = host.createContainer();
  const root = new VDOMSnapshotRoot(host, container);
  host.root = root;
  root.commit(
    jsx("output", {
      "data-first": unary(firstSource, "first", (value) => {
        secondColumn.values[0] = 88;
        return value * 10;
      }),
      "data-second": unary(secondSource, "second", (value) => {
        secondProjectionValue = value;
        return value * 100;
      }),
    }),
    null,
    true,
  );
  assertEquals(root.bindSourceColumn(firstSource, firstColumn, 1), true);
  assertEquals(root.bindSourceColumn(secondSource, secondColumn, 0), true);
  assertEquals(root.bindSourceColumn(firstSource, firstColumn, 1), true);
  assertEquals(root.bindSourceColumn(firstSource, secondColumn, 0), false);
  assertEquals(root.hasColumnCell(firstColumn, 1), true);
  assertEquals(root.hasColumnCell(secondColumn, 0), true);

  firstColumn.values[1] = 12;
  secondColumn.values[0] = 23;
  host.mutateOnWrite = true;
  assertEquals(
    root.setColumnCells([firstColumn, secondColumn], [1, 0], [5, 7], 2),
    true,
  );
  assertEquals(
    secondProjectionValue,
    7,
    "later projector receives captured input",
  );
  assertEquals(container.children[0].props["data-first"], 50);
  assertEquals(container.children[0].props["data-second"], 700);
  assertEquals(firstSource.value, 5);
  assertEquals(secondSource.value, 7);
  assertEquals(root.diagnostics().columnRowsScratchRetained, 0);
  assertEquals(
    root.setColumnCells([firstColumn, secondColumn], [1, 0], [5, 7], 2),
    false,
  );
  assertEquals(root.diagnostics().columnRowsScratchRetained, 0);
  root.dispose();
  assertEquals(root.hasColumnCell(firstColumn, 1), false);
  assertEquals(root.diagnostics().columnRowsScratchCapacity, 0);
});

Deno.test("dirty cell projection failure is atomic and can be retried", () => {
  const column = new NumericColumn(0, 0, new Float64Array([1, 2]));
  const first = new ScalarSource(0, 1);
  const second = new ScalarSource(1, 2);
  let shouldThrow = false;
  const host = new MemoryVDOMHost();
  const container = host.createContainer();
  const root = new VDOMSnapshotRoot(host, container);
  root.commit(
    jsx("output", {
      "data-first": unary(first, "first", (value) => value),
      "data-second": unary(second, "second", (value) => {
        if (shouldThrow && value === 9) {
          throw new Error("cell projector failed");
        }
        return value;
      }),
    }),
    null,
    true,
  );
  assertEquals(root.bindSourceColumn(first, column, 0), true);
  assertEquals(root.bindSourceColumn(second, column, 1), true);
  const baseline = host.writeCount;
  shouldThrow = true;
  let thrown: unknown;
  try {
    root.setColumnCells([column, column], [0, 1], [8, 9], 2);
  } catch (error) {
    thrown = error;
  }
  assertEquals(
    thrown instanceof Error && thrown.message === "cell projector failed",
    true,
  );
  assertEquals(host.writeCount, baseline);
  assertEquals(first.value, 8);
  assertEquals(second.value, 9);
  assertEquals(root.diagnostics().columnRowsScratchRetained, 0);
  shouldThrow = false;
  assertEquals(root.setColumnCells([column, column], [0, 1], [8, 9], 2), true);
  assertEquals(container.children[0].props["data-first"], 8);
  assertEquals(container.children[0].props["data-second"], 9);
  root.dispose();
});

Deno.test("dirty cell host failure and nested cut retain retry and guard behavior", () => {
  let root!: VDOMSnapshotRoot<MemoryNode>;
  const column = new NumericColumn(0, 0, new Float64Array([1, 2]));
  const first = new ScalarSource(0, 1);
  const second = new ScalarSource(1, 2);
  let failOnce = false;
  let nestedError: unknown;
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
          root.setColumnCells([column], [1], [90], 1);
        } catch (error) {
          nestedError = error;
        }
        throw new Error("cell host failed");
      }
      super.setProp(node, name, value, previous);
    }
  }
  const host = new Host();
  const container = host.createContainer();
  root = new VDOMSnapshotRoot(host, container);
  root.commit(
    jsx("output", {
      "data-first": unary(first, "first", (value) => value),
      "data-second": unary(second, "second", (value) => value),
    }),
    null,
    true,
  );
  assertEquals(root.bindSourceColumn(first, column, 0), true);
  assertEquals(root.bindSourceColumn(second, column, 1), true);
  failOnce = true;
  let thrown: unknown;
  try {
    root.setColumnCells([column, column], [0, 1], [3, 4], 2);
  } catch (error) {
    thrown = error;
  }
  assertEquals(
    thrown instanceof Error && thrown.message === "cell host failed",
    true,
  );
  assertEquals(
    nestedError instanceof Error &&
      nestedError.message === "Nested numeric VDOM writes are not supported",
    true,
  );
  assertEquals(root.diagnostics().columnRowsScratchRetained, 0);
  assertEquals(root.setColumnCells([column, column], [0, 1], [3, 4], 2), true);
  assertEquals(container.children[0].props["data-first"], 3);
  assertEquals(container.children[0].props["data-second"], 4);
  root.dispose();
});

Deno.test("same-source refresh and keyed move preserve cell mapping; removal prunes it", () => {
  const column = new NumericColumn(0, 0, new Float64Array([1]));
  const source = new ScalarSource(0, 1);
  const host = new MemoryVDOMHost();
  const container = host.createContainer();
  const root = new VDOMSnapshotRoot(host, container);
  root.commit(
    sourceRows([{ key: "a", source }, { key: "b", source }]),
    null,
    true,
  );
  assertEquals(root.bindSourceColumn(source, column, 0), true);
  assertEquals(root.hasColumnCell(column, 0), true);

  root.commit(
    jsx("section", {
      children: [
        jsx("i", {
          key: "b",
          value: unary(source, "sink:b", (value) => value),
        }),
        jsx("i", {
          key: "a",
          "data-value": unary(source, "sink:a", (value) => value),
        }),
      ],
    }),
    null,
    true,
  );
  assertEquals(root.hasColumnCell(column, 0), true);
  assertEquals(root.setColumnCells([column], [0], [6], 1), true);
  assertEquals(container.children[0].children[0].props.value, 6);
  assertEquals(container.children[0].children[1].props["data-value"], 6);

  root.commit(jsx("section", { children: [] }), null, true);
  assertEquals(root.hasColumnCell(column, 0), false);
  assertEquals(root.bindSourceColumn(source, column, 0), false);
  root.dispose();
});

Deno.test("keyed edits prune only the sources detached by that edit", () => {
  const count = 96;
  const column = new NumericColumn(
    0,
    0,
    new Float64Array(Array.from({ length: count }, (_, index) => index)),
  );
  const sources = Array.from(
    { length: count },
    (_, index) => new ScalarSource(index, index),
  );
  const row = (index: number) =>
    jsx("i", {
      key: `row-${index}`,
      value: unary(sources[index]!, `prune-${index}`, (value) => value),
    });
  const tree = (rows: ReturnType<typeof row>[]) =>
    jsx(
      "div",
      { key: "parent" },
      keyedOwnerChildren("rows", rows),
    );
  const host = new MemoryVDOMHost();
  const root = new VDOMSnapshotRoot(host, host.createContainer());
  root.commit(tree(sources.map((_, index) => row(index))), null, true);
  for (let index = 0; index < count; index++) {
    assertEquals(root.bindSourceColumn(sources[index]!, column, index), true);
  }

  const beforeRefresh = root.diagnostics().sourceColumnPruneVisits;
  assertEquals(
    root.commitKeyedRegionDelta("parent", "rows", [{
      type: "replace",
      key: "row-0",
      tree: row(0),
    }]),
    true,
  );
  assertEquals(
    root.diagnostics().sourceColumnPruneVisits - beforeRefresh,
    0,
    "re-registering the source cancels its pending prune",
  );
  assertEquals(root.hasColumnCell(column, 0), true);

  const beforeRemoval = root.diagnostics().sourceColumnPruneVisits;
  assertEquals(
    root.commitKeyedRegionDelta("parent", "rows", [{
      type: "remove",
      key: "row-1",
    }]),
    true,
  );
  assertEquals(
    root.diagnostics().sourceColumnPruneVisits - beforeRemoval,
    1,
    "one removal inspects only its one potentially dead source",
  );
  assertEquals(root.hasColumnCell(column, 1), false);
  assertEquals(root.hasColumnCell(column, count - 1), true);
  root.dispose();
  assertEquals(root.diagnostics().sourceColumnPruneVisits - beforeRemoval, 1);
});

Deno.test("disposing from a dirty-cell host callback cancels writes and releases associations", () => {
  let root!: VDOMSnapshotRoot<MemoryNode>;
  const column = new NumericColumn(0, 0, new Float64Array([1, 2]));
  const first = new ScalarSource(0, 1);
  const second = new ScalarSource(1, 2);
  let disposeOnWrite = false;
  const updates: string[] = [];
  class Host extends MemoryVDOMHost {
    override setProp(
      node: MemoryNode,
      name: string,
      value: unknown,
      previous?: unknown,
    ) {
      super.setProp(node, name, value, previous);
      if (disposeOnWrite && name.startsWith("data-")) {
        disposeOnWrite = false;
        updates.push(name);
        root.dispose();
      }
    }
  }
  const host = new Host();
  const container = host.createContainer();
  root = new VDOMSnapshotRoot(host, container);
  root.commit(
    jsx("output", {
      "data-first": unary(first, "first", (value) => value),
      "data-second": unary(second, "second", (value) => value),
    }),
    null,
    true,
  );
  assertEquals(root.bindSourceColumn(first, column, 0), true);
  assertEquals(root.bindSourceColumn(second, column, 1), true);
  disposeOnWrite = true;
  assertEquals(root.setColumnCells([column, column], [0, 1], [5, 6], 2), false);
  assertEquals(updates, ["data-first"]);
  assertEquals(root.hasColumnCell(column, 0), false);
  assertEquals(root.hasColumnCell(column, 1), false);
  assertEquals(root.diagnostics().columnRowsScratchRetained, 0);
  assertEquals(root.diagnostics().columnRowsScratchCapacity, 0);
});

Deno.test("invalid dirty-cell cuts do not mutate sources or hosts", () => {
  const column = new NumericColumn(0, 0, new Float64Array([1]));
  const source = new ScalarSource(0, 1);
  const host = new MemoryVDOMHost();
  const container = host.createContainer();
  const root = new VDOMSnapshotRoot(host, container);
  root.commit(
    jsx("i", { value: unary(source, "value", (value) => value) }),
    null,
    true,
  );
  assertEquals(root.bindSourceColumn(source, column, 0), true);
  const baseline = host.writeCount;
  assertEquals(root.setColumnCells([undefined], [0], [4], 1), null);
  assertEquals(root.setColumnCells([column], [1], [4], 1), null);
  let invalidCount: unknown;
  try {
    root.setColumnCells([column], [0], [], 1);
  } catch (error) {
    invalidCount = error;
  }
  assertEquals(invalidCount instanceof RangeError, true);
  assertEquals(source.value, 1);
  assertEquals(host.writeCount, baseline);
  assertEquals(root.diagnostics().columnRowsScratchRetained, 0);
  root.dispose();
});
