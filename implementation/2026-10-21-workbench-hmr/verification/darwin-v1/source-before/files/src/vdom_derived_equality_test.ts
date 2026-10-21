import {
  bind,
  bindCompiledColumn,
  bindSources,
  bindVector3,
  jsx,
  NumericColumn,
  ScalarSource,
} from "./jsx_binding_runtime.ts";
import { MemoryVDOMHost, VDOMSnapshotRoot } from "./vdom_snapshot_runtime.ts";

const assert = (condition: unknown, message: string) => {
  if (!condition) throw new Error(message);
};

Deno.test("direct derived bindings suppress unchanged primitive projections", () => {
  const host = new MemoryVDOMHost(), container = host.createContainer();
  const root = new VDOMSnapshotRoot(host, container);
  const source = new ScalarSource(0, 1.1);
  root.commit(
    jsx("i", { value: bindSources([source], ([value]) => Math.floor(value)) }),
    null,
    true,
  );
  const node = container.children[0];
  const baseline = host.writeCount;

  root.setSource(source, 1.8);
  assert(host.writeCount === baseline, "same numeric projection should not write");
  assert(node.props.value === 1, "same projected value should remain visible");

  root.setSource(source, 2.1);
  assert(host.writeCount === baseline + 1, "changed numeric projection writes once");
  assert(node.props.value === 2, "changed projected value should be visible");
  root.dispose();
});

Deno.test("derived equality handles null and NaN primitive results", () => {
  const host = new MemoryVDOMHost(), container = host.createContainer();
  const root = new VDOMSnapshotRoot(host, container);
  const source = new ScalarSource(0, 0);
  root.commit(
    jsx("i", {
      nullable: bindSources([source], ([value]) => value < 2 ? null : "ready"),
      notANumber: bindSources([source], () => Number.NaN),
    }),
    null,
    true,
  );
  const baseline = host.writeCount;
  root.setSource(source, 1);
  assert(host.writeCount === baseline, "equal null and NaN projections should skip");
  root.setSource(source, 2);
  assert(host.writeCount === baseline + 1, "only changed nullable projection writes");
  assert(container.children[0].props.nullable === "ready", "null projection changed");
  root.dispose();
});

Deno.test("stable mutable vector bindings retain forced writes", () => {
  const host = new MemoryVDOMHost(), container = host.createContainer();
  const root = new VDOMSnapshotRoot(host, container);
  const x = new ScalarSource(0, 1), y = new ScalarSource(1, 2);
  const z = new ScalarSource(2, 3);
  root.commit(jsx("i", { position: bindVector3(x, y, z) }), null, true);
  const node = container.children[0];
  const tuple = node.props.position;
  const baseline = host.writeCount;
  root.setSource(x, 4);
  assert(host.writeCount === baseline + 1, "stable mutable tuple must be written");
  assert(node.props.position === tuple, "host should receive the same tuple identity");
  assert(JSON.stringify(tuple) === "[4,2,3]", "tuple mutation should be visible");
  root.dispose();
});

Deno.test("multi-source batch writes only changed derived results", () => {
  const host = new MemoryVDOMHost(), container = host.createContainer();
  const root = new VDOMSnapshotRoot(host, container);
  const left = new ScalarSource(0, 2), right = new ScalarSource(1, 3);
  root.commit(
    jsx("i", {
      total: bindSources([left, right], ([a, b]) => a + b),
      bucket: bindSources([left, right], ([a, b]) => Math.floor((a + b) / 5)),
    }),
    null,
    true,
  );
  const baseline = host.writeCount;
  root.setSources([[left, 1], [right, 4]]);
  assert(host.writeCount === baseline, "unchanged sum and bucket should not write");
  root.setSources([[left, 2], [right, 4]]);
  assert(host.writeCount === baseline + 1, "only changed sum should write");
  root.dispose();
});

Deno.test("derived equality does not swallow host writer errors", () => {
  let failWrites = false;
  class ThrowingHost extends MemoryVDOMHost {
    override setProp(
      node: Parameters<MemoryVDOMHost["setProp"]>[0],
      name: string,
      value: unknown,
      previous?: unknown,
    ) {
      if (failWrites && name === "value") {
        throw new Error("derived write failed");
      }
      super.setProp(node, name, value, previous);
    }
  }
  const host = new ThrowingHost(), container = host.createContainer();
  const root = new VDOMSnapshotRoot(host, container);
  const source = new ScalarSource(0, 1);
  root.commit(jsx("i", { value: bind(source) }), null, true);
  failWrites = true;
  let thrown: unknown;
  try {
    root.setSource(source, 2);
  } catch (error) {
    thrown = error;
  }
  assert(thrown instanceof Error && thrown.message === "derived write failed", "writer error should propagate");
  root.dispose();
});

Deno.test("numeric column dirty-row writers retain primitive equality behavior", () => {
  const host = new MemoryVDOMHost(), container = host.createContainer();
  const root = new VDOMSnapshotRoot(host, container);
  const column = new NumericColumn(0, 0, new Float64Array([1.1]));
  const graph = {
    sourceCount: 1,
    sourcePaths: ["value"],
    sourceBindingOffsets: [0, 1],
    bindingIds: [7],
  };
  // Column binding projection is compiler-known and writes only when its
  // primitive result changes, even as source rows are updated in place.
  root.commit(
    jsx("i", { value: bindCompiledColumn(column, 0, 7, Math.floor) }),
    graph,
  );
  const baseline = host.writeCount;
  column.values[0] = 1.8;
  assert(root.setColumns([column]) === false, "equal column projection should report no write");
  assert(host.writeCount === baseline, "equal column projection should skip host write");
  column.values[0] = 2.1;
  assert(root.setColumns([column]) === true, "changed column projection should write");
  assert(container.children[0].props.value === 2, "column projection should update host prop");
  root.dispose();
});
