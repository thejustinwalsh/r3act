import { bindSources, jsx, keyedOwnerChildren, type RuntimeElement, ScalarSource } from "./jsx_binding_runtime.ts";
import { MemoryVDOMHost, VDOMSnapshotRoot } from "./vdom_snapshot_runtime.ts";

const assert: (value: unknown, message: string) => asserts value = (value, message) => {
  if (!value) throw new Error(message);
};
const same = (actual: unknown, expected: unknown, message: string) => {
  if (!Object.is(actual, expected)) {
    throw new Error(`${message}: ${String(actual)} !== ${String(expected)}`);
  }
};
const row = (key: string, text = key) => jsx("li", { key }, text);
const tree = () => jsx("main", { key: "app" },
  jsx("ul", { key: "left" }, keyedOwnerChildren("left-rows", [row("a"), row("b")])),
  jsx("ul", { key: "right" }, keyedOwnerChildren("right-rows", [row("x"), row("y")])),
);

Deno.test("scoped primitive insert merges after a disjoint keyed publication", () => {
  const host = new MemoryVDOMHost();
  const container = host.createContainer();
  const root = new VDOMSnapshotRoot(host, container);
  root.commit(tree());
  const left = container.children[0].children[0];
  const a = left.children[0];
  const candidate: RuntimeElement = {
    type: "li", props: { key: "c", children: "prepared" },
  };
  const program = root.prepareKeyedRegionDeltas([{
    parentKey: "left",
    regionId: "left-rows",
    operations: [{ type: "insert", key: "c", beforeKey: "b", tree: candidate }],
  }], [], { scoped: true });
  assert(program, "primitive insert did not prepare");
  candidate.props.children = "changed after preparation";
  assert(root.commitKeyedRegionDelta("right", "right-rows", [
    { type: "move", key: "y", beforeKey: "x" },
  ]), "disjoint edit failed");
  assert(program.validate(), "disjoint region invalidated scoped insert");
  const accepted = JSON.stringify(root.snapshot);
  root.beginPublication();
  program.commit();
  same(JSON.stringify(root.snapshot), accepted, "unaccepted insert leaked into snapshot");
  assert(program.validatePostHost(), "insert posthost validation failed");
  root.publishAccepted();
  same(left.children[0], a, "existing row identity changed");
  same(left.children[1].children[0].text, "prepared", "candidate alias changed output");
  same(container.children[0].children[1].children[0].children[0].text, "y", "disjoint edit was lost");
  root.dispose();
});

Deno.test("scoped replace pins the old subtree and global candidate keys", () => {
  const host = new MemoryVDOMHost();
  const container = host.createContainer();
  const root = new VDOMSnapshotRoot(host, container);
  root.commit(jsx("main", { key: "app" },
    jsx("ul", { key: "left" }, keyedOwnerChildren("left-rows", [
      jsx("li", { key: "a" }, keyedOwnerChildren("inner-rows", [row("i"), row("j")])),
      row("b"),
    ])),
    jsx("ul", { key: "right" }, keyedOwnerChildren("right-rows", [row("x")])),
  ));
  const replace = () => root.prepareKeyedRegionDeltas([{
    parentKey: "left", regionId: "left-rows",
    operations: [{ type: "replace", key: "a", tree: jsx("li", { key: "a" }, row("new")) }],
  }], [], { scoped: true });
  const nested = replace();
  assert(nested, "static replace did not prepare");
  assert(root.commitKeyedRegionDelta("a", "inner-rows", [
    { type: "move", key: "j", beforeKey: "i" },
  ]), "nested edit failed");
  assert(!nested.validate(), "nested edit did not revoke replaced subtree");
  nested.discard();

  const collision = replace();
  assert(collision, "second replace did not prepare");
  assert(root.commitKeyedRegionDelta("right", "right-rows", [
    { type: "insert", key: "new", beforeKey: null, tree: row("new") },
  ]), "disjoint key insertion failed");
  assert(!collision.validate(), "global candidate-key collision survived");
  collision.discard();
  root.dispose();
});

Deno.test("a replace tree getter cannot adopt a newer nested subtree", () => {
  const host = new MemoryVDOMHost();
  const container = host.createContainer();
  const root = new VDOMSnapshotRoot(host, container);
  root.commit(jsx("ul", { key: "left" }, keyedOwnerChildren("left-rows", [
    jsx("li", { key: "a" }, keyedOwnerChildren("inner-rows", [row("i"), row("j")])),
    row("b"),
  ])));
  let reads = 0;
  const operation = {
    type: "replace" as const,
    key: "a",
    get tree() {
      reads++;
      assert(root.commitKeyedRegionDelta("a", "inner-rows", [
        { type: "move", key: "j", beforeKey: "i" },
      ]), "getter nested edit failed");
      return row("a", "new");
    },
  };
  same(root.prepareKeyedRegionDeltas([{
    parentKey: "left", regionId: "left-rows", operations: [operation],
  }], [], { scoped: true }), null, "getter adopted an edited nested base");
  same(reads, 1, "tree getter was not read exactly once");
  root.dispose();
});

Deno.test("scoped edits decline callback, ref, style, and bound props", () => {
  const host = new MemoryVDOMHost();
  const container = host.createContainer();
  const root = new VDOMSnapshotRoot(host, container);
  root.commit(tree());
  const source = new ScalarSource(1, 1);
  const candidates = [
    jsx("li", { key: "c", onClick: () => {} }, "c"),
    jsx("li", { key: "c", ref: { current: null } }, "c"),
    jsx("li", { key: "c", style: { color: "red" } }, "c"),
    jsx("li", { key: "c", title: bindSources([source], ([value]) => value) }, "c"),
  ];
  for (const candidate of candidates) {
    same(root.prepareKeyedRegionDeltas([{
      parentKey: "left", regionId: "left-rows",
      operations: [{ type: "insert", key: "c", beforeKey: null, tree: candidate }],
    }], [], { scoped: true }), null, "effectful candidate entered scoped path");
  }
  root.dispose();
});

Deno.test("one scoped publication applies retained prop before keyed move", () => {
  const host = new MemoryVDOMHost();
  const container = host.createContainer();
  const root = new VDOMSnapshotRoot(host, container);
  const source = new ScalarSource(2, 1);
  const value = bindSources([source], () => { throw new Error("authored projector ran"); }, {
    schemaVersion: 2, ownerProgramId: "fixture", sinkId: "value",
    sourceSites: ["value"], closedExpression: { kind: "input", index: 0 },
  });
  root.commit(jsx("main", { key: "app" },
    jsx("output", { key: "display", value }),
    jsx("ul", { key: "left" }, keyedOwnerChildren("left-rows", [row("a"), row("b")])),
    jsx("ul", { key: "right" }, keyedOwnerChildren("right-rows", [row("x"), row("y")])),
  ), null, true);
  source.value = 3;
  const program = root.prepareScopedKeyedAndRetainedDeltas([{
    parentKey: "left", regionId: "left-rows",
    operations: [{ type: "move", key: "b", beforeKey: "a" }],
  }], [[source, 3]]);
  assert(program, "scoped mixed cut did not prepare");
  same(program.readSources[0], source, "retained read footprint missing");
  assert(root.commitKeyedRegionDelta("right", "right-rows", [
    { type: "move", key: "y", beforeKey: "x" },
  ]), "disjoint keyed edit failed");
  assert(program.validate(), "disjoint keyed edit invalidated mixed cut");
  root.beginPublication();
  program.commit();
  assert(program.validatePostHost(), "mixed cut failed posthost validation");
  root.publishAccepted();
  same(container.children[0].children[0].props.value, 3, "retained prop was lost");
  same(container.children[0].children[1].children[0].children[0].text, "b", "keyed move was lost");
  same(container.children[0].children[2].children[0].children[0].text, "y", "disjoint keyed edit was lost");
  root.dispose();
});

Deno.test("scoped mixed cut rejects a retained writer in a removed subtree", () => {
  const host = new MemoryVDOMHost();
  const container = host.createContainer();
  const root = new VDOMSnapshotRoot(host, container);
  const source = new ScalarSource(3, 1);
  const value = bindSources([source], ([number]) => number, {
    schemaVersion: 2, ownerProgramId: "fixture", sinkId: "row-value",
    sourceSites: ["row-value"], closedExpression: { kind: "input", index: 0 },
  });
  root.commit(jsx("ul", { key: "left" }, keyedOwnerChildren("left-rows", [
    jsx("li", { key: "a", value }, "a"), row("b"),
  ])), null, true);
  source.value = 2;
  same(root.prepareScopedKeyedAndRetainedDeltas([{
    parentKey: "left", regionId: "left-rows",
    operations: [{ type: "remove", key: "a" }],
  }], [[source, 2]]), null, "removed retained target entered mixed cut");
  root.dispose();
});
