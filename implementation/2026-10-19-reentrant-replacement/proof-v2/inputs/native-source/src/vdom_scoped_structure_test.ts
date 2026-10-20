import {
  bind,
  jsx,
  keyedOwnerChildren,
  ScalarSource,
} from "./jsx_binding_runtime.ts";
import { MemoryVDOMHost, VDOMSnapshotRoot } from "./vdom_snapshot_runtime.ts";

const assert: (value: unknown, message: string) => asserts value = (
  value,
  message,
) => {
  if (!value) throw new Error(message);
};
const same = (actual: unknown, expected: unknown, message: string) => {
  if (actual !== expected) {
    throw new Error(`${message}: ${String(actual)} !== ${String(expected)}`);
  }
};
const row = (key: string, source?: ScalarSource) =>
  jsx("li", { key, ...(source ? { title: bind(source) } : {}) }, key);
const tree = (source?: ScalarSource) =>
  jsx(
    "main",
    { key: "app" },
    jsx(
      "ul",
      { key: "left" },
      keyedOwnerChildren("left-rows", [
        row("a", source),
        row("b"),
        row("c"),
      ]),
    ),
    jsx(
      "ul",
      { key: "right" },
      keyedOwnerChildren("right-rows", [
        row("x"),
        row("y"),
      ]),
    ),
  );

Deno.test("scoped keyed program survives disjoint accepted region and prop edits", () => {
  const host = new MemoryVDOMHost();
  const container = host.createContainer();
  const root = new VDOMSnapshotRoot(host, container);
  const source = new ScalarSource(1, 1);
  root.commit(tree(source));
  const leftRows = container.children[0].children[0].children;
  const a = leftRows[0];
  const startVersion = root.version;
  const scoped = root.prepareKeyedRegionDeltas(
    [{
      parentKey: "left",
      regionId: "left-rows",
      operations: [{ type: "move", key: "c", beforeKey: "a" }],
    }],
    [],
    { scoped: true },
  );
  assert(scoped, "scoped move should prepare");
  same(scoped.scoped, true, "program did not expose scoped admission");
  same(scoped.structuralVersionDelta, 1, "move version delta is wrong");
  root.setSource(source, 2);
  assert(
    root.commitKeyedRegionDelta("right", "right-rows", [{
      type: "move",
      key: "y",
      beforeKey: "x",
    }]),
    "disjoint edit failed",
  );
  assert(
    scoped.validate(),
    "disjoint region and prop writes staled a scoped move",
  );
  const acceptedSnapshot = JSON.stringify(root.snapshot);
  root.beginPublication();
  scoped.commit();
  same(
    JSON.stringify(root.snapshot),
    acceptedSnapshot,
    "applying exposed an unaccepted order",
  );
  assert(scoped.validatePostHost(), "scoped host result did not validate");
  root.publishAccepted();
  assert(
    JSON.stringify(root.snapshot) !== acceptedSnapshot,
    "accepted order did not advance",
  );
  same(
    root.version,
    startVersion + 2,
    "scoped commit did not advance current version",
  );
  same(
    container.children[0].children[0].children[1],
    a,
    "keyed identity changed",
  );
  same(a.props.title, 2, "unrelated accepted prop was lost");
  same(
    container.children[0].children[0].children[0].children[0].text,
    "c",
    "left move missing",
  );
  same(
    container.children[0].children[1].children[0].children[0].text,
    "y",
    "right move missing",
  );
  root.dispose();
});

Deno.test("same-region edits and remove/reinsert invalidate scoped programs", () => {
  const host = new MemoryVDOMHost();
  const container = host.createContainer();
  const root = new VDOMSnapshotRoot(host, container);
  root.commit(tree());
  const sameRegion = root.prepareKeyedRegionDeltas(
    [{
      parentKey: "left",
      regionId: "left-rows",
      operations: [{ type: "move", key: "c", beforeKey: "a" }],
    }],
    [],
    { scoped: true },
  );
  assert(sameRegion, "same-region case did not prepare");
  assert(
    root.commitKeyedRegionDelta("left", "left-rows", [{
      type: "move",
      key: "b",
      beforeKey: "a",
    }]),
    "intervening same-region edit failed",
  );
  assert(!sameRegion.validate(), "same-region order change was accepted");
  const reusedKey = root.prepareKeyedRegionDeltas(
    [{
      parentKey: "left",
      regionId: "left-rows",
      operations: [{ type: "remove", key: "a" }],
    }],
    [],
    { scoped: true },
  );
  assert(reusedKey, "remove case did not prepare");
  assert(
    root.commitKeyedRegionDelta("left", "left-rows", [
      { type: "remove", key: "a" },
      { type: "insert", key: "a", beforeKey: null, tree: row("a") },
    ]),
    "key reuse failed",
  );
  assert(!reusedKey.validate(), "removed and reinserted key kept old identity");
  sameRegion.discard();
  reusedKey.discard();
  root.dispose();
});

Deno.test("public getters cannot revive a scoped region base during preparation", () => {
  for (const phase of ["operation", "request"] as const) {
    const host = new MemoryVDOMHost();
    const container = host.createContainer();
    const root = new VDOMSnapshotRoot(host, container);
    root.commit(tree());
    let getterCalls = 0;
    const editRegion = () => {
      getterCalls++;
      assert(
        root.commitKeyedRegionDelta("left", "left-rows", [{
          type: "move",
          key: "b",
          beforeKey: "a",
        }]),
        "getter could not perform its same-region edit",
      );
    };
    const operation = phase === "operation"
      ? {
        type: "move" as const,
        key: "c",
        get beforeKey() {
          editRegion();
          return "a";
        },
      }
      : { type: "move" as const, key: "c", beforeKey: "a" };
    const request = phase === "request"
      ? {
        parentKey: "left",
        regionId: "left-rows",
        operations: [operation],
        get lateRead() {
          editRegion();
          return 1;
        },
      }
      : {
        parentKey: "left",
        regionId: "left-rows",
        operations: [operation],
      };
    try {
      same(
        root.prepareKeyedRegionDeltas([request], [], { scoped: true }),
        null,
        `${phase} getter adopted a newer region generation`,
      );
      same(getterCalls, 1, `${phase} getter was not read exactly once`);
      same(root.version, 2, "getter reentry did not advance the live VDOM");
    } finally {
      root.dispose();
    }
  }
});

Deno.test("nested keyed edits under a moved row preserve the outer placement cut", () => {
  const host = new MemoryVDOMHost();
  const container = host.createContainer();
  const root = new VDOMSnapshotRoot(host, container);
  root.commit(jsx(
    "ul",
    { key: "outer" },
    keyedOwnerChildren("outer-rows", [
      jsx(
        "li",
        { key: "a" },
        keyedOwnerChildren("inner-rows", [
          jsx("em", { key: "i" }, "i"),
          jsx("em", { key: "j" }, "j"),
        ]),
      ),
      row("b"),
    ]),
  ));
  const a = container.children[0].children[0];
  const outer = root.prepareKeyedRegionDeltas(
    [{
      parentKey: "outer",
      regionId: "outer-rows",
      operations: [{ type: "move", key: "a", beforeKey: null }],
    }],
    [],
    { scoped: true },
  );
  assert(outer, "outer move did not prepare");
  assert(
    root.commitKeyedRegionDelta("a", "inner-rows", [{
      type: "move",
      key: "j",
      beforeKey: "i",
    }]),
    "nested keyed edit failed",
  );
  assert(outer.validate(), "nested region edit staled outer placement");
  outer.commit();
  same(container.children[0].children[1], a, "outer row identity changed");
  same(a.children[0].children[0].text, "j", "nested accepted order was lost");
  root.dispose();
});

Deno.test("scoped removal detaches the current writer after an intervening prop cut", () => {
  const host = new MemoryVDOMHost();
  const container = host.createContainer();
  const root = new VDOMSnapshotRoot(host, container);
  const source = new ScalarSource(1, 1);
  root.commit(tree(source));
  const remove = root.prepareKeyedRegionDeltas(
    [{
      parentKey: "left",
      regionId: "left-rows",
      operations: [{ type: "remove", key: "a" }],
    }],
    [],
    { scoped: true },
  );
  assert(remove, "bound row removal should prepare");
  root.setSource(source, 3);
  assert(
    remove.validate(),
    "independent accepted prop write staled row removal",
  );
  remove.commit();
  same(
    container.children[0].children[0].children.length,
    2,
    "row was not removed",
  );
  let staleWriterAccepted = false;
  try {
    root.setSource(source, 4);
    staleWriterAccepted = true;
  } catch { /* detached */ }
  assert(!staleWriterAccepted, "removed row retained its scalar writer");
  const insert = root.prepareKeyedRegionDeltas(
    [{
      parentKey: "left",
      regionId: "left-rows",
      operations: [{
        type: "insert",
        key: "d",
        beforeKey: null,
        tree: row("d"),
      }],
    }],
    [],
    { scoped: true },
  );
  assert(insert, "closed primitive insertion did not prepare");
  insert.commit();
  same(
    container.children[0].children[0].children.length,
    3,
    "closed primitive insertion did not restore row count",
  );
  same(
    root.prepareKeyedRegionDeltas([], [{
      key: "left",
      tree: jsx("ul", { key: "left" }),
    }], {
      scoped: true,
    }),
    null,
    "leaf replacement escaped strict fallback",
  );
  root.dispose();
});
