import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { setImmediate } from "node:timers/promises";

assert.equal(typeof global.gc, "function", "Run Node with --expose-gc");
const directory = mkdtempSync(join(tmpdir(), "prepared-style-retention-"));
const bridge = join(directory, "bridge.ts");
const bundle = join(directory, "runtime.mjs");
writeFileSync(bridge, `export { createNativeRoot, defineComponent, bindStatePropAt,
  useStateAt, renderCollectionAt, createKeyedCollection, jsx } from
  ${JSON.stringify(new URL("../src/native_runtime_api.ts", import.meta.url).href)};
  export { MemoryVDOMHost } from
  ${JSON.stringify(new URL("../src/vdom_snapshot_runtime.ts", import.meta.url).href)};`);
execFileSync("deno", ["bundle", "--platform=deno", bridge, "-o", bundle], { stdio: "ignore" });
const api = await import(pathToFileURL(bundle).href);
rmSync(directory, { recursive: true, force: true });
const { createNativeRoot, defineComponent, bindStatePropAt, useStateAt,
  renderCollectionAt, createKeyedCollection, jsx, MemoryVDOMHost } = api;
const retained = [];

class PreparedHost extends MemoryVDOMHost {
  factories = 0;
  writes = 0;
  onWrite;
  prepareStyleProp(node, name) {
    this.factories++;
    return (next, previous) => {
      this.writes++;
      this.setStyleProp(node, name, next, previous);
      this.onWrite?.();
    };
  }
}

function scenario(disposeDuringWrite) {
  const payload = { bytes: new Uint8Array(192 * 1024) };
  const payloadRef = new WeakRef(payload);
  const rows = createKeyedCollection([{ id: "seed", payload: null },
    { id: "payload", payload }], row => row.id);
  let setter;
  const Row = defineComponent("prepared-retention-row", ({ row }) => {
    const capturedPayload = row.payload;
    const [, setValue] = useStateAt("value", 0);
    if (row.id === "payload") setter = setValue;
    return jsx("i", {
      "data-row": row.id,
      style: { width: bindStatePropAt("value", value => {
        if (capturedPayload) void capturedPayload.bytes.byteLength;
        return `${value}px`;
      }, { schemaVersion: 1, sinkId: `width-${row.id}`, sourceSites: ["value"] }) },
    });
  }, { propOnlySites: ["value"] });
  const List = defineComponent("prepared-retention-list", () =>
    jsx("section", {}, renderCollectionAt("rows", rows, row => jsx(Row, { row }))));
  const host = new PreparedHost();
  const container = host.createContainer();
  const root = createNativeRoot(host, container, { scheduleCommit() {} });
  root.mount(jsx(List, {}));
  const node = container.children[0].children.find(child => child.props["data-row"] === "payload");
  assert.ok(node);
  const targetRef = new WeakRef(node);
  const handles = [];
  const unsubscribe = root.world.subscribeDirtyCells(handle => handles.push(handle));
  if (disposeDuringWrite) host.onWrite = () => root.dispose();
  setter(1);
  root.flush();
  assert.ok(host.factories >= 2 && host.writes > 0);
  if (disposeDuringWrite) {
    assert.equal(root.diagnostics().disposed, true);
    // The collection is caller-owned. Disposal releases the reader, not its
    // application data; explicitly remove that data before testing framework
    // references while still retaining the collection itself.
    assert.equal(rows.apply(rows.version, [{ type: "remove", key: "payload" }]).ok, true);
  } else {
    assert.equal(rows.apply(rows.version, [{ type: "remove", key: "payload" }]).ok, true);
    root.flush();
    assert.equal(container.children[0].children.length, 1);
  }
  unsubscribe();
  assert.throws(() => setter(2));
  retained.push(root, host, container, setter, rows, handles);
  return { payloadRef, targetRef };
}

const probes = [scenario(false), scenario(true)];
let collected = false;
for (let attempt = 0; attempt < 40; attempt++) {
  await setImmediate();
  global.gc();
  if (probes.every(probe => probe.payloadRef.deref() === undefined &&
    probe.targetRef.deref() === undefined)) {
    collected = true;
    break;
  }
}
assert.equal(collected, true,
  "Removed/disposed payloads and targets must be collectible with roots, hosts, containers, dead setters and stable handles retained");
assert.ok(retained.length > 0);
console.log("PASS prepared style retention: removed and in-writer-disposed payload/target references collected while roots, hosts, containers, dead setters, collections and stable handles remain retained. Narrow --expose-gc lifetime proof, not mounted memory or allocation-rate evidence.");
