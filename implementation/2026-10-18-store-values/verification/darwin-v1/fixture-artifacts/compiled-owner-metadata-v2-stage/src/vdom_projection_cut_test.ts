import {
  bind,
  bindCompiledColumn,
  bindSources,
  bindVector3,
  jsx,
  NumericColumn,
  ScalarSource,
} from "./jsx_binding_runtime.ts";
import { assertEquals } from "jsr:@std/assert";
import {
  type MemoryNode,
  MemoryVDOMHost,
  VDOMSnapshotRoot,
} from "./vdom_snapshot_runtime.ts";

Deno.test("source batches stage unary and compound projections before host reentry", () => {
  let root!: VDOMSnapshotRoot<MemoryNode>;
  let b!: ScalarSource;
  let reentryError: unknown;
  const writes: Array<[string, unknown]> = [];
  class Host extends MemoryVDOMHost {
    reenter = false;
    override setProp(
      node: MemoryNode,
      name: string,
      value: unknown,
      previous?: unknown,
    ) {
      super.setProp(node, name, value, previous);
      if (name.startsWith("data-")) writes.push([name, value]);
      if (this.reenter && name === "data-a" && value === 2) {
        this.reenter = false;
        try {
          root.setSource(b, 9);
        } catch (error) {
          reentryError = error;
        }
      }
    }
  }
  const host = new Host(), container = host.createContainer();
  root = new VDOMSnapshotRoot(host, container);
  const a = new ScalarSource(0, 1);
  b = new ScalarSource(1, 1);
  root.commit(
    jsx("output", {
      "data-a": bind(a),
      "data-b": bind(b),
      "data-sum": bindSources([a, b], ([left, right]) => left + right),
    }),
    null,
    true,
  );
  writes.length = 0;
  host.reenter = true;
  root.setSources([[a, 2], [b, 3]]);
  assertEquals(
    reentryError instanceof Error &&
      reentryError.message === "Nested numeric VDOM writes are not supported",
    true,
  );
  // A direct nested numeric update is rejected before mutation. The outer
  // batch finishes on its captured cut, and the caller can retry afterward.
  assertEquals(writes, [
    ["data-a", 2],
    ["data-sum", 5],
    ["data-b", 3],
  ]);
  assertEquals(b.value, 3);
  root.setSource(b, 9);
  assertEquals(container.children[0].props["data-b"], 9);
  assertEquals(container.children[0].props["data-sum"], 11);
  root.dispose();
});

Deno.test("source batch validates all sources before mutation and uses last duplicate", () => {
  const host = new MemoryVDOMHost(), container = host.createContainer();
  const root = new VDOMSnapshotRoot(host, container);
  const source = new ScalarSource(0, 1);
  root.commit(jsx("i", { value: bind(source) }), null, true);
  const node = container.children[0];
  const baseline = host.writeCount;
  const unbound = new ScalarSource(1, 0);
  let thrown: unknown;
  try {
    root.setSources([[source, 2], [unbound, 4]]);
  } catch (error) {
    thrown = error;
  }
  assertEquals(thrown instanceof Error, true);
  assertEquals(source.value, 1);
  assertEquals(node.props.value, 1);
  assertEquals(host.writeCount, baseline);
  root.setSources([[source, 2], [source, 3]]);
  assertEquals(source.value, 3);
  assertEquals(node.props.value, 3);
  assertEquals(host.writeCount, baseline + 1);
  root.dispose();
});

Deno.test("projection errors happen before any source batch host writes", () => {
  const host = new MemoryVDOMHost(), container = host.createContainer();
  const root = new VDOMSnapshotRoot(host, container);
  const a = new ScalarSource(0, 1), b = new ScalarSource(1, 2);
  root.commit(
    jsx("i", {
      first: bind(a),
      second: bindSources([b], ([value]) => {
        if (value === 4) throw new Error("projection failed");
        return value;
      }),
    }),
    null,
    true,
  );
  const baseline = host.writeCount;
  let thrown: unknown;
  try {
    root.setSources([[a, 3], [b, 4]]);
  } catch (error) {
    thrown = error;
  }
  assertEquals(
    thrown instanceof Error && thrown.message === "projection failed",
    true,
  );
  assertEquals(host.writeCount, baseline);
  root.dispose();
});

Deno.test("stable mutable vector bindings keep identity and conservative writes", () => {
  const host = new MemoryVDOMHost(), container = host.createContainer();
  const root = new VDOMSnapshotRoot(host, container);
  const x = new ScalarSource(0, 1),
    y = new ScalarSource(1, 2),
    z = new ScalarSource(2, 3);
  root.commit(jsx("i", { position: bindVector3(x, y, z) }), null, true);
  const node = container.children[0], tuple = node.props.position;
  const baseline = host.writeCount;
  root.setSource(x, 4);
  assertEquals(host.writeCount, baseline + 1);
  assertEquals(node.props.position, tuple);
  assertEquals(tuple, [4, 2, 3]);
  root.dispose();
});

const twoColumnGraph = {
  sourceCount: 2,
  sourcePaths: ["a", "b"],
  sourceBindingOffsets: [0, 1, 2],
  bindingIds: [1, 2],
};

Deno.test("setColumns stages all changed numeric projections before host writes", () => {
  const a = new NumericColumn(0, 0, new Float64Array([1]));
  const b = new NumericColumn(1, 1, new Float64Array([1]));
  class Host extends MemoryVDOMHost {
    mutate = false;
    override setProp(
      node: MemoryNode,
      name: string,
      value: unknown,
      previous?: unknown,
    ) {
      super.setProp(node, name, value, previous);
      if (this.mutate && name === "data-a") b.values[0] = 9;
    }
  }
  const host = new Host(), container = host.createContainer();
  const root = new VDOMSnapshotRoot(host, container);
  root.commit(
    jsx("output", {
      "data-a": bindCompiledColumn(a, 0, 1),
      "data-b": bindCompiledColumn(b, 0, 2),
    }),
    twoColumnGraph,
  );
  a.values[0] = 2;
  b.values[0] = 3;
  host.mutate = true;
  root.setColumns([a, b]);
  assertEquals(container.children[0].props["data-a"], 2);
  assertEquals(container.children[0].props["data-b"], 3);
  host.mutate = false;
  root.setColumns([a, b]);
  assertEquals(container.children[0].props["data-b"], 9);
  root.dispose();
});

Deno.test("dirty rows and buckets stage later rows before a host writer mutates them", () => {
  for (const route of ["rows", "buckets"] as const) {
    const column = new NumericColumn(0, 0, new Float64Array([1, 1]));
    class Host extends MemoryVDOMHost {
      mutate = false;
      override setProp(
        node: MemoryNode,
        name: string,
        value: unknown,
        previous?: unknown,
      ) {
        super.setProp(node, name, value, previous);
        if (this.mutate && name === "data-a") column.values[1] = 9;
      }
    }
    const host = new Host(), container = host.createContainer();
    const root = new VDOMSnapshotRoot(host, container);
    const graph = {
      sourceCount: 1,
      sourcePaths: ["row"],
      sourceBindingOffsets: [0, 2],
      bindingIds: [3, 4],
    };
    root.commit(
      jsx("output", {
        "data-a": bindCompiledColumn(column, 0, 3),
        "data-b": bindCompiledColumn(column, 1, 4),
      }),
      graph,
    );
    column.values[0] = 2;
    column.values[1] = 3;
    host.mutate = true;
    if (route === "rows") {
      root.setColumnRows([column], new Uint32Array([0, 1]));
    } else {
      root.setColumnBuckets([column], new Uint32Array([0, 1]), 2, 1);
    }
    assertEquals(container.children[0].props["data-a"], 2);
    assertEquals(container.children[0].props["data-b"], 3);
    host.mutate = false;
    if (route === "rows") {
      root.setColumnRows([column], new Uint32Array([0, 1]));
    } else {
      root.setColumnBuckets([column], new Uint32Array([0, 1]), 2, 1);
    }
    assertEquals(container.children[0].props["data-b"], 9);
    root.dispose();
  }
});

Deno.test("duplicate columns, rows, and buckets issue only one group write", () => {
  for (const route of ["columns", "rows", "buckets"] as const) {
    const column = new NumericColumn(0, 0, new Float64Array([1]));
    const host = new MemoryVDOMHost(), container = host.createContainer();
    const root = new VDOMSnapshotRoot(host, container);
    const graph = {
      sourceCount: 1,
      sourcePaths: ["value"],
      sourceBindingOffsets: [0, 1],
      bindingIds: [5],
    };
    root.commit(
      jsx("i", {
        value: bindCompiledColumn(column, 0, 5, (value) => ({ value })),
      }),
      graph,
    );
    const baseline = host.writeCount;
    column.values[0] = 2;
    if (route === "columns") root.setColumns([column, column]);
    else if (route === "rows") {
      root.setColumnRows([column], new Uint32Array([0, 0]));
    } else {
      root.setColumnBuckets([column], new Uint32Array([0, 0]), 2, 1);
    }
    assertEquals(
      host.writeCount,
      baseline + 1,
      `${route} duplicate should write once`,
    );
    root.dispose();
  }
});

Deno.test("setColumns validates every column before advancing any source version", () => {
  const valid = new NumericColumn(0, 0, new Float64Array([1]));
  const unbound = new NumericColumn(1, 1, new Float64Array([1]));
  const host = new MemoryVDOMHost(), container = host.createContainer();
  const root = new VDOMSnapshotRoot(host, container);
  const graph = {
    sourceCount: 1,
    sourcePaths: ["value"],
    sourceBindingOffsets: [0, 1],
    bindingIds: [7],
  };
  root.commit(jsx("i", { value: bindCompiledColumn(valid, 0, 7) }), graph);
  const baseline = host.writeCount;
  let thrown: unknown;
  try {
    root.setColumns([valid, unbound]);
  } catch (error) {
    thrown = error;
  }
  assertEquals(thrown instanceof Error, true);
  assertEquals(valid.source.value, 0);
  assertEquals(unbound.source.value, 0);
  assertEquals(host.writeCount, baseline);
  root.dispose();
});

Deno.test("column host writer errors propagate and leave the source eligible for retry", () => {
  let failOnce = false;
  class Host extends MemoryVDOMHost {
    override setProp(
      node: MemoryNode,
      name: string,
      value: unknown,
      previous?: unknown,
    ) {
      if (failOnce && name === "value") {
        failOnce = false;
        throw new Error("column write failed");
      }
      super.setProp(node, name, value, previous);
    }
  }
  const column = new NumericColumn(0, 0, new Float64Array([1]));
  const host = new Host(), container = host.createContainer();
  const root = new VDOMSnapshotRoot(host, container);
  const graph = {
    sourceCount: 1,
    sourcePaths: ["value"],
    sourceBindingOffsets: [0, 1],
    bindingIds: [6],
  };
  root.commit(jsx("i", { value: bindCompiledColumn(column, 0, 6) }), graph);
  failOnce = true;
  column.values[0] = 2;
  let thrown: unknown;
  try {
    root.setColumns([column]);
  } catch (error) {
    thrown = error;
  }
  assertEquals(
    thrown instanceof Error && thrown.message === "column write failed",
    true,
  );
  assertEquals(root.setColumns([column]), true);
  assertEquals(container.children[0].props.value, 2);
  root.dispose();
});
