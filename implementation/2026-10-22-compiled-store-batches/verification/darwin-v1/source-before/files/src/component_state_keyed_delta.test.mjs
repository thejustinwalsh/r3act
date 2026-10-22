import assert from "node:assert/strict";
import test from "node:test";

import { jsx, keyedOwnerChildren, createKeyedOwnerVersion } from "./jsx_binding_runtime.ts";
import { ComponentStateRoot, defineComponent, useStateAt } from "./component_state_runtime_owner_reuse_v3.ts";
import { MemoryVDOMHost } from "./vdom_snapshot_runtime.ts";

const mountedRows = (container) => container.children[0].children[0].children;

test("token-delta owner updates use bucketed keyed moves and structural edits", () => {
  let setRows;
  let regionVersion = createKeyedOwnerVersion();
  const Row = defineComponent("row", ({ id }) => jsx("li", { "data-id": id }, id));
  const App = defineComponent("app", () => {
    const [rows, set] = useStateAt("app.rows", ["a", "b", "c"]);
    setRows = set;
    return jsx("main", { key: "root" }, jsx("ul", { key: "list" }, keyedOwnerChildren(
      "row",
      rows.map((id) => jsx(Row, { key: id, id })),
      regionVersion,
    )));
  });

  const host = new MemoryVDOMHost();
  const container = host.createContainer();
  const counters = [];
  const root = new ComponentStateRoot(host, container, {
    keyedOwnerReuseMode: "token-delta",
    profileCounter: (value) => counters.push(value),
  });
  root.mount(jsx(App, {}));
  const [a, b, c] = mountedRows(container);

  assert.equal(setRows((rows) => ["c", "a", "b"]), true);
  assert.equal(root.flush(), true);
  assert.deepEqual(mountedRows(container).map((node) => node.props["data-id"]), ["c", "a", "b"]);
  assert.strictEqual(mountedRows(container)[0], c);
  assert.strictEqual(mountedRows(container)[1], a);
  assert.strictEqual(mountedRows(container)[2], b);
  assert.deepEqual(root.snapshot[0].children[0].children.map((node) => node.key), ["c:0", "a:0", "b:0"]);

  regionVersion = createKeyedOwnerVersion();
  assert.equal(setRows(["c", "a", "d"]), true);
  assert.equal(root.flush(), true);
  assert.deepEqual(mountedRows(container).map((node) => node.props["data-id"]), ["c", "a", "d"]);
  assert.strictEqual(mountedRows(container)[0], c);
  assert.strictEqual(mountedRows(container)[1], a);
  assert.equal(b.parent, null);
  assert.deepEqual(root.snapshot[0].children[0].children.map((node) => node.key), ["c:0", "a:0", "d:0"]);
  assert(counters.some((entry) => entry["vdom.keyed-region-delta.operations"] > 0), JSON.stringify(counters));
  root.dispose();
});
