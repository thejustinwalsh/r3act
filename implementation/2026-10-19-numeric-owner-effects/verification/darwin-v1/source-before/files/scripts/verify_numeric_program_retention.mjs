import assert from "node:assert/strict";
import { setImmediate } from "node:timers/promises";
import { bind, bindSources, jsx, ScalarSource } from "../src/jsx_binding_runtime.ts";
import { MemoryVDOMHost, VDOMSnapshotRoot } from "../src/vdom_snapshot_runtime.ts";

assert.equal(typeof global.gc, "function", "Run Node with --expose-gc");
const retained = [];
function installAndRemove(maintenance) {
  const host = new MemoryVDOMHost();
  const container = host.createContainer();
  const root = new VDOMSnapshotRoot(host, container, undefined, undefined, "delta", maintenance);
  const a = new ScalarSource(0, 1);
  const b = new ScalarSource(1, 2);
  const payload = { bytes: new Uint8Array(8192) };
  const reference = new WeakRef(payload);
  const descriptor = Object.freeze({ schemaVersion: 1, sinkId: "sum", sourceSites: Object.freeze(["a", "b"]) });
  const binding = bindSources([a, b], ([x, y]) => x + y + payload.bytes.length, descriptor);
  root.commit(jsx("div", { key: "retained", value: binding }), null, true);
  assert.equal(root.hasSourceProgram(a), true);
  root.executeSourceProgram([a, b], [2, 3], 2);
  assert.equal(root.diagnostics().numericProgramScratchRetained, 0);
  const capacity = root.diagnostics().numericProgramScratchCapacity;
  root.executeSourceProgram([a, b], [2, 3], 2);
  assert.equal(root.diagnostics().numericProgramScratchRetained, 0);
  assert.equal(root.diagnostics().numericProgramScratchCapacity, capacity);
  root.commit(jsx("div", { key: "retained", title: "Live root" }), null, true);
  assert.equal(root.hasSourceProgram(a), false);
  assert.equal(root.hasSourceProgram(b), false);
  assert.equal(root.diagnostics().numericProgramSinkSlots, 0);
  assert.throws(() => root.executeSourceProgram([a], [4], 1), /no supported numeric program/);
  retained.push({ root, host, container, a, b, reference, control: new WeakRef({ control: true }) });
}
installAndRemove("delta");
installAndRemove("rebuild");
for (let attempt = 0; attempt < 12; attempt++) {
  await setImmediate(); global.gc();
}
for (const item of retained) {
  assert.equal(item.control.deref(), undefined);
  assert.equal(item.reference.deref(), undefined, "Detached program sink retained its projector payload");
  assert.equal(item.root.hasSourceProgram(item.a), false);
  assert.equal(item.container.children[0].props.title, "Live root");
  item.root.dispose();
  assert.equal(item.root.diagnostics().numericProgramScratchCapacity, 0);
}
console.log("PASS: detached compound program projector payloads collected with roots, hosts and sources retained; dense/no-op scratch releases references in both index modes. Narrow Node GC check, not an allocation or leak-rate verdict.");
