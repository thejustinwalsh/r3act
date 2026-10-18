import { bind, jsx, keyedOwnerChildren, ScalarSource } from "./jsx_binding_runtime.ts";
import { MemoryVDOMHost, VDOMSnapshotRoot, type MemoryNode } from "./vdom_snapshot_runtime.ts";

const assert: (value: unknown, message: string) => asserts value = (value, message) => {
  if (!value) throw new Error(message);
};
const same = (actual: unknown, expected: unknown, message: string) => {
  if (actual !== expected) throw new Error(`${message}: ${actual} !== ${expected}`);
};
const row = (key: string, source?: ScalarSource) =>
  jsx("li", { key, ...(source ? { title: bind(source) } : {}) }, key);
const initial = (source?: ScalarSource) =>
  jsx("main", { key: "app" },
    jsx("ul", { key: "list" }, keyedOwnerChildren("rows", [row("a", source)])),
    jsx("aside", { key: "leaf", title: "old" }, "old"),
  );

Deno.test("prepared keyed program defers hosts and commits delta plus leaf once", () => {
  const host = new MemoryVDOMHost();
  const container = host.createContainer();
  const root = new VDOMSnapshotRoot(host, container);
  root.commit(initial());
  const version = root.version;
  const writes = host.writeCount, places = host.placementCount;
  let leafExecutions = 0;
  const program = root.prepareKeyedRegionDeltas([{
    // The indexed key is an ancestor of the keyed-region parent.
    parentKey: "app",
    regionId: "rows",
    operations: [{ type: "insert", key: "b", beforeKey: null, tree: row("b") }],
  }], [{
    key: "leaf",
    tree: jsx(() => {
      leafExecutions++;
      return jsx("aside", { key: "leaf", title: "new" }, "new");
    }, {}),
  }]);
  assert(program, "valid composite should prepare");
  same(leafExecutions, 1, "leaf candidate normalized more than once");
  same(host.writeCount, writes, "preparation wrote host properties");
  same(host.placementCount, places, "preparation placed host nodes");
  assert(program.validate(), "prepared program should validate");
  program.commit();
  same(root.version, version + 1, "composite should advance version once");
  same(container.children[0].children[0].children.length, 2, "insert did not apply");
  same(container.children[0].children[1].props.title, "new", "leaf replacement did not apply");
  program.discard();
  root.dispose();
});

Deno.test("prepared program rejects stale roots, disposed targets, and bad operations", () => {
  const host = new MemoryVDOMHost();
  const container = host.createContainer();
  const root = new VDOMSnapshotRoot(host, container);
  root.commit(initial());
  const request = [{ parentKey: "list", regionId: "rows", operations: [
    { type: "insert" as const, key: "b", beforeKey: "missing", tree: row("b") },
  ] }];
  const before = host.writeCount;
  same(root.prepareKeyedRegionDeltas(request), null, "invalid anchor accepted");
  same(host.writeCount, before, "invalid preparation mutated host");
  const stale = root.prepareKeyedRegionDeltas([{
    parentKey: "app",
    regionId: "rows",
    operations: [],
  }], [{
    key: "leaf",
    tree: jsx("aside", { key: "leaf", title: "new" }, "new"),
  }]);
  assert(stale, "empty delta should prepare");
  root.commit(initial());
  assert(!stale.validate(), "version change was not detected");
  let staleCommitRejected = false;
  try { stale.commit(); } catch { staleCommitRejected = true; }
  assert(staleCommitRejected, "stale commit should throw");
  let closedCommitRejected = false;
  try { stale.commit(); } catch { closedCommitRejected = true; }
  assert(closedCommitRejected, "failed stale commit retained an open handle");
  root.dispose();
  stale.discard();
});

Deno.test("prepared keyed leaf stale failure closes and releases its handle", () => {
  const host = new MemoryVDOMHost();
  const container = host.createContainer();
  const root = new VDOMSnapshotRoot(host, container);
  root.commit(initial());
  const prepared = root.prepareKeyedRegions([{
    key: "leaf",
    tree: jsx("aside", { key: "leaf", title: "next" }, "next"),
  }]);
  assert(prepared, "leaf replacement should prepare");
  root.commit(initial());
  let staleRejected = false;
  try { prepared.commit(); } catch { staleRejected = true; }
  assert(staleRejected, "stale leaf commit should throw");
  let secondCommitRejected = false;
  try { prepared.commit(); } catch { secondCommitRejected = true; }
  assert(secondCommitRejected, "stale leaf handle remained open");
  prepared.discard?.();
  root.dispose();
});

Deno.test("prepared source writer lifecycle detaches removed sinks", () => {
  const host = new MemoryVDOMHost();
  const container = host.createContainer();
  const root = new VDOMSnapshotRoot(host, container);
  const oldSource = new ScalarSource(0, 1);
  const source = new ScalarSource(0, 2);
  root.commit(initial(oldSource));
  const program = root.prepareKeyedRegionDelta("list", "rows", [
    { type: "remove", key: "a" },
    { type: "insert", key: "a", beforeKey: null, tree: row("a", source) },
  ]);
  assert(program, "remove and reinsert should prepare");
  program.commit();
  let rejected = false;
  try { root.setSource(oldSource, 9); } catch { rejected = true; }
  assert(rejected, "removed scalar sink stayed registered");
  root.setSource(source, 9);
  same(container.children[0].children[0].children[0].props.title, 9, "reinserted writer was not attached");
  root.dispose();
});

Deno.test("prepared delta normalization reentry invalidates preparation before host writes", () => {
  const host = new MemoryVDOMHost();
  const container = host.createContainer();
  const root = new VDOMSnapshotRoot(host, container);
  root.commit(initial());
  let entered = false;
  const writes = host.writeCount;
  const component = () => {
    if (!entered) { entered = true; root.commit(initial()); }
    return row("b");
  };
  const program = root.prepareKeyedRegionDelta("list", "rows", [{
    type: "insert", key: "b", beforeKey: null, tree: jsx(component, {}),
  }]);
  same(program, null, "reentrant root mutation should invalidate preparation");
  assert(host.writeCount >= writes, "host counter regressed");
  root.dispose();
});

Deno.test("raw VDOM roots can be mounted again after dispose", () => {
  const host = new MemoryVDOMHost();
  const container = host.createContainer();
  const root = new VDOMSnapshotRoot(host, container);
  root.commit(initial());
  root.dispose();
  root.commit(initial());
  const program = root.prepareKeyedRegionDelta("list", "rows", [{
    type: "insert", key: "b", beforeKey: null, tree: row("b"),
  }]);
  assert(program, "remounted root should support keyed preparation");
  program.commit();
  same(container.children.length, 1, "remounted host root missing");
  same(container.children[0].children[0].children.length, 2, "remounted sparse edit missing");
  root.dispose();
});

Deno.test("failed prepared host phase repairs indexes and leaves refs unpublished", () => {
  class FailingHost extends MemoryVDOMHost {
    failTitle = false;
    override setProp(node: MemoryNode, name: string, value: unknown, previous?: unknown) {
      if (this.failTitle && name === "title") {
        this.failTitle = false;
        throw new Error("injected host failure");
      }
      super.setProp(node, name, value, previous);
    }
  }
  const host = new FailingHost();
  const container = host.createContainer();
  const root = new VDOMSnapshotRoot(host, container);
  root.commit(initial());
  let refCalls = 0;
  const program = root.prepareKeyedRegionDeltas([], [{
    key: "leaf",
    tree: jsx("aside", {
      key: "leaf",
      ref: () => { refCalls++; },
      title: "new",
    }, "new"),
  }]);
  assert(program, "leaf replacement should prepare");
  host.failTitle = true;
  let failed = false;
  try { program.commit(); } catch { failed = true; }
  assert(failed, "injected host failure did not reach caller");
  same(refCalls, 0, "failed host phase published a ref");
  const source = new ScalarSource(0, 1);
  const next = root.prepareKeyedRegionDelta("list", "rows", [{
    type: "insert", key: "b", beforeKey: null, tree: row("b", source),
  }]);
  assert(next, "binding index was not repaired after host failure");
  next.commit();
  root.setSource(source, 2);
  same(container.children[0].children[0].children[1].props.title, 2, "repaired writer missed update");
  root.dispose();
});
