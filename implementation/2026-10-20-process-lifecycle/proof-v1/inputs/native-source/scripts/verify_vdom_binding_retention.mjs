import assert from "node:assert/strict";
import { setImmediate } from "node:timers/promises";
import { bind, jsx, ScalarSource } from "../src/jsx_binding_runtime.ts";
import {
  MemoryVDOMHost,
  VDOMSnapshotRoot,
} from "../src/vdom_snapshot_runtime.ts";

assert.equal(typeof global.gc, "function", "Run Node with --expose-gc");
const host = new MemoryVDOMHost();
const container = host.createContainer();
const root = new VDOMSnapshotRoot(host, container);
const source = new ScalarSource(0, 1);

function installAndRemove() {
  const first = { bytes: new Uint8Array(8192) };
  const second = { bytes: new Uint8Array(8192) };
  const projectFirst = (value) => value + first.bytes.length;
  const projectSecond = (value) => value + second.bytes.length;
  const weak = [new WeakRef(first), new WeakRef(second)];
  root.prepareCommit(
    jsx("div", {
      key: "live",
      style: {
        left: bind(source, projectFirst),
        top: bind(source, projectSecond),
      },
    }),
    null,
    true,
  ).commit();
  assert.equal(root.hasBoundSource(source), true);
  root.prepareCommit(
    jsx("div", { key: "live", title: "Retained host" }),
    null,
    true,
  ).commit();
  assert.equal(
    root.hasBoundSource(source),
    false,
    "Removed style writers retained source membership",
  );
  assert.throws(() => root.setSource(source, 2), /not bound/);
  return { weak, control: new WeakRef({ control: true }) };
}

const { weak, control } = installAndRemove();
for (let attempt = 0; attempt < 12; attempt++) {
  await setImmediate();
  global.gc();
}
assert.equal(control.deref(), undefined, "GC control was not collected");
for (const ref of weak) {
  assert.equal(
    ref.deref(),
    undefined,
    "Removed style writer retained its projection payload",
  );
}
assert.equal(
  container.children.length,
  1,
  "Probe must keep the root and host mounted",
);
assert.equal(container.children[0].props.title, "Retained host");
root.dispose();
console.log(
  "PASS: two removed direct-style projection payloads collected while their source, host and VDOM root remain live. Narrow controlled Node GC check, not an allocation-rate claim.",
);
