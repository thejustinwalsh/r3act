import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { setImmediate } from "node:timers/promises";

// Bundle the real TypeScript runtime first. Node's built-in TS stripping does
// not transform parameter properties used by the runtime's imports.
const bundleDirectory = mkdtempSync(join(tmpdir(), "native-cell-cut-retention-"));
const bridgePath = join(bundleDirectory, "bridge.ts");
const bundlePath = join(bundleDirectory, "runtime.mjs");
const moduleUrl = (relativePath) => new URL(relativePath, import.meta.url).href;
writeFileSync(
  bridgePath,
  `
  export { bindStatePropAt, ComponentStateRoot, defineComponent, renderCollectionAt, useStateAt } from ${
    JSON.stringify(moduleUrl("../src/component_state_runtime.ts"))
  };
  export { createKeyedCollection } from ${
    JSON.stringify(moduleUrl("../src/keyed_collection.ts"))
  };
  export { jsx } from ${
    JSON.stringify(moduleUrl("../src/jsx_binding_runtime.ts"))
  };
  export { MemoryVDOMHost } from ${
    JSON.stringify(moduleUrl("../src/vdom_snapshot_runtime.ts"))
  };
  export { PendingStateChanges } from ${
    JSON.stringify(moduleUrl("../src/pending_state_changes.ts"))
  };
`,
);
execFileSync("deno", ["bundle", "--platform=deno", bridgePath, "-o", bundlePath], {
  stdio: "ignore",
});
const {
  bindStatePropAt,
  ComponentStateRoot,
  createKeyedCollection,
  defineComponent,
  jsx,
  MemoryVDOMHost,
  PendingStateChanges,
  renderCollectionAt,
  useStateAt,
} = await import(pathToFileURL(bundlePath).href);
rmSync(bundleDirectory, { recursive: true, force: true });

assert.equal(typeof global.gc, "function", "Run Node 24+ with --expose-gc");
const nodeMajor = Number(process.versions.node.split(".")[0]);
assert.ok(nodeMajor >= 24, `Expected Node 24+, received ${process.versions.node}`);

const retainedRoots = [];
const retainedHosts = [];
const retainedContainers = [];
const retainedSetters = [];
const retainedDirtyHandles = [];
const retainedCaptureBuffers = [];
const retainedNativeCutHandles = [];
const program = (sinkId, sourceSites) => ({
  schemaVersion: 1,
  sinkId,
  sourceSites,
});

function installCaptureInstrumentation() {
  const originalCapture = PendingStateChanges.prototype.capture;
  const originalCaptureNative = PendingStateChanges.prototype.captureNativeWithKeys;
  let forbidCapture = false;
  let captureCallsWhileForbidden = 0;
  PendingStateChanges.prototype.capture = function (...args) {
    if (forbidCapture) {
      captureCallsWhileForbidden++;
      throw new Error("legacy StateChange capture entered during native-cell flush");
    }
    return originalCapture.apply(this, args);
  };
  PendingStateChanges.prototype.captureNativeWithKeys = function (handles, versions, keys) {
    const count = originalCaptureNative.call(this, handles, versions, keys);
    retainedCaptureBuffers.push({ handles, versions, keys });
    if (count !== null) {
      for (let index = 0; index < count; index++) {
        retainedNativeCutHandles.push(handles[index]);
      }
    }
    return count;
  };
  return {
    forbidLegacyCapture(value) {
      forbidCapture = value;
    },
    get captureCallsWhileForbidden() {
      return captureCallsWhileForbidden;
    },
    restore() {
      forbidCapture = false;
      PendingStateChanges.prototype.capture = originalCapture;
      PendingStateChanges.prototype.captureNativeWithKeys = originalCaptureNative;
    },
  };
}

function mountedPayloadRow() {
  const payload = { bytes: new Uint8Array(192 * 1024) };
  const payloadRef = new WeakRef(payload);
  const collection = createKeyedCollection([
    { id: "seed", payload: null },
    { id: "payload-row", payload },
  ], (row) => row.id);
  let rowSetter;
  const Row = defineComponent("native-cut-retention-row", ({ row }) => {
    const rowPayload = row.payload;
    const [, setValue] = useStateAt("value", 0);
    if (row.id === "payload-row") {
      rowSetter = setValue;
      retainedSetters.push(setValue);
    }
    return jsx("li", {
      "data-id": row.id,
      "data-size": rowPayload?.bytes.byteLength ?? 0,
      value: bindStatePropAt(
        "value",
        (value) => {
          if (rowPayload) void rowPayload.bytes.byteLength;
          return value;
        },
        program(`row-${row.id}.value`, ["value"]),
      ),
    }, row.id);
  }, { propOnlySites: ["value"] });
  const List = defineComponent("native-cut-retention-list", () =>
    jsx("section", {}, renderCollectionAt(
      "native-cut-retention-region",
      collection,
      (row) => jsx(Row, { row }),
    )));
  const host = new MemoryVDOMHost();
  const container = host.createContainer();
  const root = new ComponentStateRoot(host, container, { scheduleCommit() {} });
  root.mount(jsx(List, {}));
  const dirtyHandles = [];
  root.world.subscribeDirtyCells((handle) => dirtyHandles.push(handle));
  retainedRoots.push(root);
  retainedHosts.push(host);
  retainedContainers.push(container);
  return {
    collection,
    root,
    host,
    container,
    rowSetter,
    payloadRef,
    dirtyHandles,
  };
}

function removePayloadRowAfterNativeCut() {
  const environment = mountedPayloadRow();
  const rowNode = environment.container.children[0].children.find((node) =>
    node.props["data-id"] === "payload-row"
  );
  assert.ok(rowNode, "payload row did not mount");
  const targetRef = new WeakRef(rowNode);
  const instrumentation = installCaptureInstrumentation();
  try {
    instrumentation.forbidLegacyCapture(true);
    assert.equal(environment.rowSetter(1), true, "native cell write was not queued");
    assert.equal(environment.root.flush(), true, "native cell cut did not flush");
  } finally {
    instrumentation.restore();
  }
  assert.equal(
    instrumentation.captureCallsWhileForbidden,
    0,
    "eligible numeric flush called PendingStateChanges.capture",
  );
  assert.ok(retainedNativeCutHandles.length > 0, "captureNative saw no dirty handles");
  assert.ok(environment.dirtyHandles.length > 0, "World did not publish a stable dirty handle");
  assert.equal(environment.root.diagnostics().pendingChangeCount, 0);

  // Restore the legacy capture method before topology work: this removal is a
  // structural update and is deliberately outside the native numeric cut.
  const removed = environment.collection.apply(
    environment.collection.version,
    [{ type: "remove", key: "payload-row" }],
  );
  assert.equal(removed.ok, true, "payload row removal was rejected");
  assert.equal(environment.root.flush(), true, "payload row topology did not flush");
  assert.equal(environment.container.children[0].children.length, 1);
  assert.throws(
    () => environment.rowSetter(2),
    "removed row setter mutated a dead owner",
  );

  // Keep the root, VDOM host, container, dead setter, stable cell handles, and
  // the grown capture arrays alive. Their used prefixes must be scrubbed.
  retainedSetters.push(environment.rowSetter);
  retainedDirtyHandles.push(...environment.dirtyHandles, ...retainedNativeCutHandles);
  for (const { handles, versions, keys } of retainedCaptureBuffers) {
    assert.ok(handles.length > 0, "native capture buffer did not grow");
    assert.ok(handles.every((handle) => handle === undefined));
    assert.ok(versions.every((version) => version === 0));
    assert.ok(keys.every((key) => key === undefined));
  }
  return { payloadRef: environment.payloadRef, targetRef, root: environment.root };
}

function disposedInsideNativeWriter() {
  let root;
  let setValue;
  let setPayload;
  const targetRef = { current: null };
  let disposeOnWrite = false;
  class DisposingHost extends MemoryVDOMHost {
    setProp(node, name, value, previous) {
      super.setProp(node, name, value, previous);
      if (disposeOnWrite && name === "data-value") {
        disposeOnWrite = false;
        root.dispose();
      }
    }
  }
  const host = new DisposingHost();
  const container = host.createContainer();
  root = new ComponentStateRoot(host, container, { scheduleCommit() {} });
  const Output = defineComponent("native-cut-dispose-output", () => {
    const [payload, updatePayload] = useStateAt("payload", null);
    const [, updateValue] = useStateAt("value", 0);
    setPayload = updatePayload;
    setValue = updateValue;
    return jsx("output", {
      ref: targetRef,
      "data-value": bindStatePropAt(
        "value",
        (value) => {
          if (payload) void payload.bytes.byteLength;
          return value;
        },
        program("dispose-output.value", ["value"]),
      ),
    });
  }, { propOnlySites: ["value"] });
  root.mount(jsx(Output, {}));

  let payload = { bytes: new Uint8Array(160 * 1024) };
  const payloadRef = new WeakRef(payload);
  assert.equal(setPayload(payload), true);
  assert.equal(root.flush(), true, "payload state setup did not render");
  payload = null;
  const targetNode = targetRef.current;
  assert.ok(targetNode, "disposal target did not attach");
  const weakTarget = new WeakRef(targetNode);
  const dirtyHandles = [];
  root.world.subscribeDirtyCells((handle) => dirtyHandles.push(handle));
  const instrumentation = installCaptureInstrumentation();
  retainedRoots.push(root);
  retainedHosts.push(host);
  retainedContainers.push(container);
  try {
    instrumentation.forbidLegacyCapture(true);
    disposeOnWrite = true;
    assert.equal(setValue(1), true, "dispose writer update was not queued");
    assert.equal(root.flush(), true, "dispose-in-writer native cut did not flush");
  } finally {
    instrumentation.restore();
  }
  assert.equal(
    instrumentation.captureCallsWhileForbidden,
    0,
    "dispose-in-writer route called PendingStateChanges.capture",
  );
  assert.ok(dirtyHandles.length > 0, "disposed cut did not expose a stable dirty handle");
  assert.equal(root.diagnostics().disposed, true);
  assert.equal(container.children.length, 0);
  assert.equal(targetRef.current, null, "disposed target ref remained attached");
  assert.throws(() => setValue(2), "disposed numeric setter mutated a dead owner");
  assert.throws(() => setPayload(null), "disposed payload setter mutated a dead owner");
  retainedSetters.push(setValue, setPayload);
  retainedDirtyHandles.push(...dirtyHandles, ...retainedNativeCutHandles);
  for (const { handles, versions, keys } of retainedCaptureBuffers) {
    assert.ok(handles.every((handle) => handle === undefined));
    assert.ok(versions.every((version) => version === 0));
    assert.ok(keys.every((key) => key === undefined));
  }
  return { payloadRef, targetRef: weakTarget, root };
}

function fallbackAfterCaptureBufferGrowth() {
  let setA;
  let setB;
  let setFallback;
  let renders = 0;
  const host = new MemoryVDOMHost();
  const container = host.createContainer();
  const root = new ComponentStateRoot(host, container, { scheduleCommit() {} });
  const Output = defineComponent("native-cut-fallback-output", () => {
    renders++;
    const [, updateA] = useStateAt("a", 0);
    const [, updateB] = useStateAt("b", 0);
    const [fallback, updateFallback] = useStateAt("fallback", 0);
    setA = updateA;
    setB = updateB;
    setFallback = updateFallback;
    return jsx("output", {
      a: bindStatePropAt("a", (value) => value, program("fallback.a", ["a"])),
      b: bindStatePropAt("b", (value) => value, program("fallback.b", ["b"])),
      fallback,
    });
  }, { propOnlySites: ["a", "b"] });
  root.mount(jsx(Output, {}));
  const instrumentation = installCaptureInstrumentation();
  try {
    instrumentation.forbidLegacyCapture(true);
    assert.equal(setA(1), true);
    assert.equal(setB(2), true);
    assert.equal(root.flush(), true, "eligible multi-cell native cut did not flush");
  } finally {
    instrumentation.restore();
  }
  assert.equal(instrumentation.captureCallsWhileForbidden, 0);
  const rendersBeforeFallback = renders;
  assert.equal(setFallback(3), true);
  assert.equal(root.flush(), true, "ineligible source did not use normal fallback");
  assert.equal(renders, rendersBeforeFallback + 1);
  assert.equal(container.children[0].props.fallback, 3);
  assert.ok(retainedCaptureBuffers.some(({ handles }) => handles.length >= 2));
  for (const { handles, versions, keys } of retainedCaptureBuffers) {
    assert.ok(handles.every((handle) => handle === undefined));
    assert.ok(versions.every((version) => version === 0));
    assert.ok(keys.every((key) => key === undefined));
  }
  root.dispose();
}

const removed = removePayloadRowAfterNativeCut();
const disposed = disposedInsideNativeWriter();
fallbackAfterCaptureBufferGrowth();

for (let attempt = 0; attempt < 20; attempt++) {
  await setImmediate();
  global.gc();
}
assert.equal(removed.payloadRef.deref(), undefined, "retained cut buffers/handles kept removed-row payload alive");
assert.equal(removed.targetRef.deref(), undefined, "removed host target stayed reachable");
assert.equal(disposed.payloadRef.deref(), undefined, "disposed VDOM/root retained projector payload");
assert.equal(disposed.targetRef.deref(), undefined, "disposed host target stayed reachable");
assert.equal(retainedSetters.length >= 4, true, "dead setters were not retained for the check");
assert.ok(retainedDirtyHandles.length > 0, "stable dirty handles were not retained for the check");
assert.ok(retainedRoots.every((root) => root.diagnostics().disposed || root.diagnostics().pendingChangeCount === 0));
assert.ok(retainedHosts.length >= 2 && retainedContainers.length >= 2);
console.log(
  `PASS: Node ${process.versions.node}; eligible native-cell cuts bypass legacy capture, clear retained high-water buffers, release removed-row and disposed-writer payload/target references with roots/hosts/dead setters/stable handles retained, and preserve fallback after buffer growth. Narrow --expose-gc retention check; not an allocation or leak-rate verdict.`,
);
