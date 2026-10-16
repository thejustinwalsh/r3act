import assert from "node:assert/strict";
import test from "node:test";

import { jsx, keyedOwnerChildren } from "./jsx_binding_runtime.ts";
import { MemoryVDOMHost, VDOMSnapshotRoot } from "./vdom_snapshot_runtime.ts";

const row = (key, tag = "li", label = key) =>
  jsx(tag, { key, "data-row": key }, label);

const tree = (rows) => jsx("ul", { key: "list" }, keyedOwnerChildren("rows", rows));

const mountedRows = (container) => container.children[0].children;
const snapshotKeys = (root) => root.snapshot[0].children.map((child) => child.key);

test("keyed-region deltas retain identities, update order and serialize lazily", () => {
  const host = new MemoryVDOMHost();
  const container = host.createContainer();
  const root = new VDOMSnapshotRoot(host, container);
  root.commit(tree([row("a"), row("b"), row("c")]));
  const [a, b, c] = mountedRows(container);

  assert.equal(root.commitKeyedRegionDelta("list", "rows", [
    { type: "move", key: "c", beforeKey: "a" },
    { type: "insert", key: "d", beforeKey: "b", tree: row("d") },
    { type: "replace", key: "a", tree: row("a", "button", "A") },
    { type: "remove", key: "d" },
  ]), true);

  const [nextC, nextA, nextB] = mountedRows(container);
  assert.strictEqual(nextC, c, "move should preserve the moved host node");
  assert.notStrictEqual(nextA, a, "incompatible replacement should replace its host node");
  assert.strictEqual(nextB, b, "unaffected host identity should remain stable");
  assert.deepEqual(snapshotKeys(root), ["c", "a", "b"]);
  assert.equal(nextA.tag, "button");

  // A normal declarative commit must be able to leave the bucket path and
  // materialize its current order without losing keyed identity.
  root.commit(tree([row("b"), row("c"), row("a", "button", "A")]));
  assert.deepEqual(mountedRows(container).map((node) => node.props["data-row"]), ["b", "c", "a"]);
  assert.deepEqual(snapshotKeys(root), ["b", "c", "a"]);
  assert.strictEqual(mountedRows(container)[0], b);
});

test("invalid keyed-region delta is rejected before host mutation", () => {
  const host = new MemoryVDOMHost();
  const container = host.createContainer();
  const root = new VDOMSnapshotRoot(host, container);
  root.commit(tree([row("a"), row("b")]));
  const beforeNodes = [...mountedRows(container)];
  const beforeWrites = host.writeCount;
  const beforePlaces = host.placementCount;
  const beforeRemoves = host.removalCount;
  const beforeVersion = root.version;

  assert.equal(root.commitKeyedRegionDelta("list", "rows", [
    { type: "move", key: "a", beforeKey: "missing" },
  ]), false);
  assert.equal(root.commitKeyedRegionDelta("list", "wrong-region", [
    { type: "remove", key: "a" },
  ]), false);
  assert.deepEqual(mountedRows(container), beforeNodes);
  assert.equal(host.writeCount, beforeWrites);
  assert.equal(host.placementCount, beforePlaces);
  assert.equal(host.removalCount, beforeRemoves);
  assert.equal(root.version, beforeVersion);
});

test("keyed-region delta can split and merge buckets while preserving parity", () => {
  const host = new MemoryVDOMHost();
  const container = host.createContainer();
  const root = new VDOMSnapshotRoot(host, container);
  const initial = Array.from({ length: 300 }, (_, index) => row(`r${index}`));
  root.commit(tree(initial));

  const operations = [
    { type: "move", key: "r299", beforeKey: "r0" },
    { type: "insert", key: "new-a", beforeKey: "r100", tree: row("new-a") },
    { type: "insert", key: "new-b", beforeKey: "r101", tree: row("new-b") },
    ...Array.from({ length: 160 }, (_, index) => ({ type: "remove", key: `r${index + 110}` })),
  ];
  assert.equal(root.commitKeyedRegionDelta("list", "rows", operations), true);

  const expected = [
    "r299",
    ...Array.from({ length: 100 }, (_, i) => `r${i}`),
    "new-a",
    "r100",
    "new-b",
    ...Array.from({ length: 9 }, (_, i) => `r${i + 101}`),
    ...Array.from({ length: 29 }, (_, i) => `r${i + 270}`),
  ];
  const actual = mountedRows(container).map((node) => node.props["data-row"]);
  assert.deepEqual(actual, expected);
  assert.deepEqual(snapshotKeys(root), expected);
});
