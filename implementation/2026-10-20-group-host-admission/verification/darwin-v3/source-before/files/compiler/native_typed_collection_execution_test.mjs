import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { nativeModulePlugin } from "./vite_native_plugin.ts";
import { createNativeRoot, createKeyedCollection, jsx } from "../src/native_runtime_api.ts";
import { MemoryVDOMHost } from "../src/vdom_snapshot_runtime.ts";

const directory = path.resolve(import.meta.dirname, "..");
const output = path.join(directory, ".cache/typed-collection-execution.mjs");
const plugin = nativeModulePlugin({ root: directory });
const source = `import { createDOMRoot, useEffect } from "../src/native_runtime_api.ts";
import type { KeyedCollection } from "../src/native_runtime_api.ts";
type Item = { id: string; label: string };
export const lifetime = { mounts: 0, cleanups: 0 };
export function Row({ row }: { row: Item }) {
  useEffect(() => { lifetime.mounts++; return () => { lifetime.cleanups++; }; });
  return <li data-id={row.id} data-label={row.label}>{row.label}</li>;
}
export function Board({ unrelated, left, right }: { unrelated: number; left: KeyedCollection<Item>; right: KeyedCollection<Item> }) {
  const leftAlias = left;
  return <section data-unrelated={unrelated}><ul key="left">{leftAlias.map(row => (<Row key={row.id} row={row} />))}</ul><ul key="right">{right.map(row => <Row key={row.id} row={row} />)}</ul></section>;
}`;
let root;
try {
  const transformed = await plugin.transform.call({ addWatchFile() {}, error(message) { throw new Error(String(message)); } }, source, output.replace(/mjs$/, "tsx"));
  assert.ok(transformed?.code);
  // Inspect executable module before its embedded JSON plan.
  const executable = transformed.code.split("export const compiledNativeComponentPlan")[0];
  assert.equal((executable.match(/__nativeRenderCollectionAt\(/g) ?? []).length, 2);
  await mkdir(path.dirname(output), { recursive: true });
  await writeFile(output, transformed.code);
  const app = await import(pathToFileURL(output).href + `?run=${Date.now()}`);
  const host = new MemoryVDOMHost();
  const container = host.createContainer();
  root = createNativeRoot(host, container, { scheduleCommit() {} });
  const left = createKeyedCollection([{ id: "a", label: "A" }], row => row.id);
  const right = createKeyedCollection([{ id: "b", label: "B" }], row => row.id);
  root.mount(jsx(app.Board, { unrelated: 1, left, right }));
  const section = container.children[0];
  const originalA = section.children[0].children[0];
  const originalB = section.children[1].children[0];
  assert.equal(left.stats().readerCount, 1);
  assert.equal(right.stats().readerCount, 1);
  right.apply(right.version, [{ type: "insert", key: "c", value: { id: "c", label: "C" }, beforeKey: null }]);
  root.flush();
  assert.deepEqual(section.children[1].children.map(node => node.props["data-id"]), ["b", "c"]);
  assert.equal(section.children[0].children[0], originalA);
  assert.equal(section.children[1].children[0], originalB);
  left.apply(left.version, [{ type: "replace", key: "a", value: { id: "a", label: "A2" } }]);
  right.apply(right.version, [{ type: "remove", key: "b" }]);
  root.flush();
  assert.equal(section.children[0].children[0], originalA);
  assert.equal(originalA.props["data-label"], "A2");
  assert.deepEqual(section.children[1].children.map(node => node.props["data-id"]), ["c"]);
  assert.equal(app.lifetime.mounts, 3); assert.equal(app.lifetime.cleanups, 1);
  root.dispose();
  assert.equal(app.lifetime.mounts, app.lifetime.cleanups);
  for (const rows of [left, right]) { assert.equal(rows.stats().readerCount, 0); assert.equal(rows.stats().retainedBatches, 0); }
  console.log("PASS typed collections: actual compiled two-prop/two-source publication, aliases, retained identities, second-source notifications and balanced lifecycle.");
} finally { root?.dispose(); await plugin.closeBundle?.call({}); }
