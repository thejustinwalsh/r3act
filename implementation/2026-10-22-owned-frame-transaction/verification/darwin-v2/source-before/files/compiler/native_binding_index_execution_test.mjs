import assert from "node:assert/strict";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createNativeRoot, jsx } from "../src/native_runtime_api.ts";
import { MemoryVDOMHost } from "../src/vdom_snapshot_runtime.ts";
import { nativeModulePlugin } from "./vite_native_plugin.ts";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const cacheDirectory = path.join(projectRoot, ".cache");
const sourceId = path.join(cacheDirectory, "native-binding-index.tsx");
const outputPath = path.join(cacheDirectory, "native-binding-index.mjs");
const plugin = nativeModulePlugin({ root: projectRoot });
plugin.configResolved?.call({}, { root: projectRoot });
const context = {
  addWatchFile() {},
  async resolve(specifier, importer) {
    if (specifier === "../src/native_runtime_api.ts") {
      return { id: path.resolve(path.dirname(importer), specifier) };
    }
    return null;
  },
  error(message) {
    throw new Error(String(message));
  },
};

const source = `import { createStore, use, useEffect, useState } from "../src/native_runtime_api.ts";

export const version = createStore(0);
export const refs = { hot: null, hotAttaches: 0, hotDetachments: 0 };
export const trace = {
  hotRenders: 0,
  hotEffectSetups: 0,
  hotEffectCleanups: 0,
  storeRenders: 0,
  observerRenders: 0,
  observerEffectSetups: 0,
  observerEffectCleanups: 0,
  observations: [],
  setX: null,
  setY: null,
  setFrame: null,
  setUseY: null,
  setShowObserver: null,
  setObserverKey: null,
  setShowHot: null,
  closedControls: null,
  closedEffectSetups: 0,
  closedEffectCleanups: 0,
};

export function captureHot(node) {
  if (node == null) return;
  refs.hot = node;
  refs.hotAttaches++;
  return () => {
    refs.hotDetachments++;
    if (refs.hot === node) refs.hot = null;
  };
}

export function Hot() {
  trace.hotRenders++;
  const [x, setX] = useState(2);
  const [y, setY] = useState(4);
  const [frame, setFrame] = useState(0);
  const [useY, setUseY] = useState(false);
  trace.setX = setX;
  trace.setY = setY;
  trace.setFrame = setFrame;
  trace.setUseY = setUseY;
  useEffect(() => {
    trace.hotEffectSetups++;
    return () => { trace.hotEffectCleanups++; };
  });
  if (useY) {
    return <output ref={captureHot} data-hot="yes" data-value={y}
      style={{ left: \`\${frame + x}px\`, opacity: (x + y) / 100 }} />;
  }
  return <output ref={captureHot} data-hot="yes" data-value={x}
    style={{ left: \`\${frame + x}px\`, opacity: (x + y) / 100 }} />;
}

export function ClosedHot() {
  const [x, setX] = useState(2);
  const [y, setY] = useState(4);
  const [frame, setFrame] = useState(0);
  useEffect(() => {
    trace.closedEffectSetups++;
    trace.closedControls = { setX, setY, setFrame };
    return () => {
      trace.closedEffectCleanups++;
      if (trace.closedControls?.setX === setX) trace.closedControls = null;
    };
  });
  return <output data-closed-hot="yes" data-value={x}
    style={{ left: \`\${frame + x}px\`, opacity: (x + y) / 100 }} />;
}

export function StoreProbe() {
  trace.storeRenders++;
  const current = use(version);
  return <output data-store={current}>{current}</output>;
}

export function Observer() {
  trace.observerRenders++;
  const current = use(version);
  useEffect(() => {
    trace.observerEffectSetups++;
    const node = refs.hot;
    trace.observations.push({
      store: current,
      node,
      value: node?.props["data-value"],
      left: node?.props.style?.left,
      opacity: node?.props.style?.opacity,
    });
    return () => { trace.observerEffectCleanups++; };
  });
  return <aside data-observer="yes">store:{current}</aside>;
}

export function App() {
  const [showObserver, setShowObserver] = useState(false);
  const [observerKey, setObserverKey] = useState("first");
  const [showHot, setShowHot] = useState(true);
  trace.setShowObserver = setShowObserver;
  trace.setObserverKey = setObserverKey;
  trace.setShowHot = setShowHot;
  return <section>
    <StoreProbe />
    <ClosedHot key="closed-hot" />
    {showHot ? <Hot key="hot" /> : null}
    {showObserver ? <Observer key={observerKey} /> : null}
  </section>;
}`;

let root;
let app;
let trackingHost;
const counterEvents = [];
try {
  await mkdir(cacheDirectory, { recursive: true });
  const transformed = await plugin.transform.call(context, source, sourceId);
  assert.ok(transformed?.code, "nativeModulePlugin did not compile authored TSX");
  assert.match(transformed.code, /__nativeBindStateProps?At\(/, "native numeric prop/style reads were not compiled to bindings");
  assert.match(transformed.code, /useStoreAt/, "authored use(store) was not compiler-lowered");
  assert.doesNotMatch(source, /@native-ui|@jsx|\bjsx\s*[,}]/, "authored TSX must not use a marker, pragma, or factory import");
  await writeFile(outputPath, transformed.code);
  app = await import(`${pathToFileURL(outputPath).href}?run=${Date.now()}`);

  class TrackingHost extends MemoryVDOMHost {
    trackedNode = null;
    writes = [];
    setProp(node, name, value, previous) {
      if (node === this.trackedNode && name === "data-value") {
        this.writes.push({ kind: "prop", name, value });
      }
      super.setProp(node, name, value, previous);
    }
    setStyleProp(node, name, value) {
      if (node === this.trackedNode && (name === "left" || name === "opacity")) {
        this.writes.push({ kind: "style", name, value });
      }
      super.setStyleProp(node, name, value);
    }
  }
  trackingHost = new TrackingHost();
  const container = trackingHost.createContainer();
  root = createNativeRoot(trackingHost, container, {
    rootId: "binding-index-lifecycle",
    scheduleCommit() {},
    profileCounter(next) { counterEvents.push(next); },
  });
  const countersAfter = (action) => {
    counterEvents.length = 0;
    action();
    return Object.assign({}, ...counterEvents);
  };
  const assertNoBindingIndexRebuild = (stage, counters) => {
    assert.equal(counters["vdom.binding-index.full-rebuild-visits"] ?? 0, 0, `${stage}: binding index performed a full rebuild`);
  };
  const assertBindingGroupWork = (stage, counters, detaches, attaches) => {
    assert.equal(counters["vdom.binding-index.incremental-group-detaches"] ?? 0, detaches, `${stage}: unexpected binding-group detaches`);
    assert.equal(counters["vdom.binding-index.incremental-group-attaches"] ?? 0, attaches, `${stage}: unexpected binding-group attaches`);
  };
  root.mount(jsx(app.App, {}));

  const find = (predicate) => {
    const visit = (node) => {
      if (predicate(node)) return node;
      for (const child of node.children) {
        const found = visit(child);
        if (found) return found;
      }
      return undefined;
    };
    return visit(container);
  };
  const storeNode = () => find((node) => "data-store" in node.props);
  const observerNode = () => find((node) => node.props["data-observer"] === "yes");
  const closedHotNode = () => find((node) => node.props["data-closed-hot"] === "yes");
  const hot = app.refs.hot;
  const closedHot = closedHotNode();
  assert.ok(hot, "Hot ref was not published at mount");
  assert.ok(closedHot, "closed numeric control did not mount");
  trackingHost.trackedNode = hot;
  assert.equal(hot.props["data-value"], 2);
  assert.equal(hot.props.style.left, "2px");
  assert.equal(hot.props.style.opacity, 0.06);
  assert.equal(app.trace.hotRenders, 1);
  assert.equal(app.trace.hotEffectSetups, 1);
  assert.equal(app.refs.hotAttaches, 1);
  assert.equal(app.trace.storeRenders, 1);
  assert.equal(storeNode().props["data-store"], 0);
  assert.equal(observerNode(), undefined);

  trackingHost.trackedNode = closedHot;
  trackingHost.writes.length = 0;
  const closedCounters = countersAfter(() => {
    assert.equal(app.trace.closedControls.setX(4), true);
    assert.equal(app.trace.closedControls.setY(6), true);
    assert.equal(app.trace.closedControls.setFrame(2), true);
    root.flush();
  });
  assertNoBindingIndexRebuild("closed numeric control", closedCounters);
  assertBindingGroupWork("closed numeric control", closedCounters, 0, 0);
  assert.equal(closedCounters["owner.component-renders"] ?? 0, 0, "closed numeric control reran an owner");
  assert.equal(closedHotNode(), closedHot, "closed numeric control replaced its host");
  assert.equal(closedHot.props["data-value"], 4);
  assert.equal(closedHot.props.style.left, "6px");
  assert.equal(closedHot.props.style.opacity, 0.1);
  assert.deepEqual(trackingHost.writes.map(write => `${write.kind}:${write.name}`), ["prop:data-value", "style:left", "style:opacity"]);
  trackingHost.trackedNode = hot;
  trackingHost.writes.length = 0;

  // A store read and a structural observer mount share a root commit with all
  // three live numeric bindings. The effect reads the committed host instance.
  const rendersBeforeFirstBatch = app.trace.hotRenders;
  const firstBatchCounters = countersAfter(() => {
    assert.equal(app.trace.setX(4), true);
    assert.equal(app.trace.setY(6), true);
    assert.equal(app.trace.setFrame(2), true);
    assert.equal(app.trace.setShowObserver(true), true);
    assert.equal(app.version.dispatch(1), true);
    root.flush();
  });
  assertNoBindingIndexRebuild("first direct/store/structural batch", firstBatchCounters);
  assertBindingGroupWork("first direct/store/structural batch", firstBatchCounters, 0, 0);
  assert.equal(app.refs.hot, hot, "numeric publication replaced the host instance");
  assert.equal(app.trace.hotRenders, rendersBeforeFirstBatch + 1, "opaque Hot did not re-execute for its state changes");
  assert.equal(hot.props["data-value"], 4);
  assert.equal(hot.props.style.left, "6px");
  assert.equal(hot.props.style.opacity, 0.1);
  assert.equal(storeNode().props["data-store"], 1);
  assert.ok(observerNode(), "ordinary structural branch did not mount");
  assert.equal(app.trace.observations.length, 1);
  assert.deepEqual(
    { ...app.trace.observations[0], node: undefined },
    { store: 1, node: undefined, value: 4, left: "6px", opacity: 0.1 },
    "new effect did not observe the fresh numeric host props",
  );
  assert.equal(app.trace.observations[0].node, hot, "effect did not read the raw stable host instance");
  assert.equal(app.refs.hotAttaches, 1, "unchanged ref was reattached during scalar writes");

  // Change which state feeds the data prop while keeping the host key and
  // identity stable, then prove subsequent writes follow the new source set.
  const sourceSwitchCounters = countersAfter(() => {
    assert.equal(app.trace.setUseY(true), true);
    root.flush();
  });
  assertNoBindingIndexRebuild("binding source switch", sourceSwitchCounters);
  assertBindingGroupWork("binding source switch", sourceSwitchCounters, 1, 1);
  assert.equal(app.refs.hot, hot, "binding source switch replaced the host instance");
  assert.equal(hot.props["data-value"], 6, "data binding did not switch from x to y");
  const rendersAfterSourceSwitch = app.trace.hotRenders;
  const detachedSourceCounters = countersAfter(() => {
    assert.equal(app.trace.setX(7), true);
    root.flush();
  });
  assertNoBindingIndexRebuild("old-source scalar update", detachedSourceCounters);
  assertBindingGroupWork("old-source scalar update", detachedSourceCounters, 0, 0);
  assert.equal(app.trace.hotRenders, rendersAfterSourceSwitch + 1, "opaque Hot did not re-execute for its old-source style change");
  assert.equal(hot.props["data-value"], 6, "detached x source still wrote the switched data prop");
  assert.equal(hot.props.style.left, "9px", "x source stopped updating its still-live style binding");
  assert.equal(hot.props.style.opacity, 0.13, "x source stopped updating the still-live combined style binding");
  const writesBeforePostSwitch = trackingHost.writes.length;
  const freshEffectCounters = countersAfter(() => {
    assert.equal(app.trace.setY(8), true);
    assert.equal(app.trace.setFrame(3), true);
    assert.equal(app.trace.setObserverKey("second"), true);
    assert.equal(app.version.dispatch(2), true);
    root.flush();
  });
  assertNoBindingIndexRebuild("post-switch scalar/store/observer batch", freshEffectCounters);
  assertBindingGroupWork("post-switch scalar/store/observer batch", freshEffectCounters, 0, 0);
  assert.equal(app.trace.hotRenders, rendersAfterSourceSwitch + 2, "opaque Hot did not re-execute for its post-switch changes");
  assert.equal(hot.props["data-value"], 8, "active y binding missed its post-switch write");
  assert.equal(hot.props.style.left, "10px", "frame/x style binding missed a post-switch write");
  assert.equal(hot.props.style.opacity, 0.15, "x/y style binding missed a post-switch write");
  assert.equal(
    storeNode().props["data-store"],
    2,
    `store projection missed the update after source switch (renders=${app.trace.storeRenders}, diagnostics=${JSON.stringify(root.diagnostics())})`,
  );
  assert.ok(trackingHost.writes.length > writesBeforePostSwitch, "post-switch values did not write any live binding");
  assert.equal(app.trace.observations.length, 2, "keyed observer replacement did not mount a fresh effect");
  assert.equal(app.trace.observations.at(-1).store, 2, "same-root observer did not read the current store value");
  assert.equal(app.trace.observations.at(-1).node, hot);
  assert.equal(app.trace.observations.at(-1).value, 8, "store effect saw stale current prop after source switch");
  assert.equal(app.trace.observations.at(-1).left, "10px");
  assert.equal(app.trace.observations.at(-1).opacity, 0.15);

  // Unmount the observer branch, then remove Hot in the same batch as writes
  // to every state source. No writer may target the detached host.
  const cleanupCountBeforeHide = app.trace.observerEffectCleanups;
  const observerRemovalCounters = countersAfter(() => {
    assert.equal(app.trace.setShowObserver(false), true);
    root.flush();
  });
  assertNoBindingIndexRebuild("observer branch removal", observerRemovalCounters);
  assertBindingGroupWork("observer branch removal", observerRemovalCounters, 0, 0);
  assert.equal(observerNode(), undefined, "ordinary structural branch did not unmount");
  assert.equal(app.trace.observerEffectCleanups, cleanupCountBeforeHide + 1);
  const hotWritesBeforeRemoval = trackingHost.writes.length;
  const hotEffectCleanupsBeforeRemoval = app.trace.hotEffectCleanups;
  const hotRemovalCounters = countersAfter(() => {
    assert.equal(app.trace.setX(9), true);
    assert.equal(app.trace.setY(10), true);
    assert.equal(app.trace.setFrame(4), true);
    assert.equal(app.trace.setShowHot(false), true);
    root.flush();
  });
  assertNoBindingIndexRebuild("Hot removal with pending scalar writes", hotRemovalCounters);
  assertBindingGroupWork("Hot removal with pending scalar writes", hotRemovalCounters, 3, 0);
  assert.equal(app.refs.hot, null, "removed Hot ref remained current");
  assert.equal(hot.parent, null, "removed Hot host stayed attached");
  assert.equal(trackingHost.writes.length, hotWritesBeforeRemoval, "removed host received numeric prop/style writes");
  assert.equal(app.trace.hotEffectCleanups, hotEffectCleanupsBeforeRemoval + 1, "Hot effect did not clean up on removal");
  assert.equal(app.refs.hotAttaches, 1);
  assert.equal(app.refs.hotDetachments, 1);

  root.dispose();
  assert.equal(root.diagnostics().disposed, true);
  assert.equal(app.trace.hotEffectSetups, app.trace.hotEffectCleanups, "Hot effect cleanup count did not balance");
  assert.equal(app.trace.closedEffectSetups, app.trace.closedEffectCleanups, "closed numeric control cleanup count did not balance");
  assert.equal(app.trace.observerEffectSetups, app.trace.observerEffectCleanups, "Observer effect cleanup count did not balance");
  assert.deepEqual(app.version.diagnostics(), { roots: 0, listeners: 0, readers: 0, retainedActions: 0, transitions: 0 });

  console.log("Compiled binding-index lifecycle PASS:", JSON.stringify({
    semantics: "opaque Hot source switch and ref lifetime, separate closed numeric writers, coherent effects and exact cleanup",
    counters: {
      closed: closedCounters,
      firstBatch: firstBatchCounters,
      sourceSwitch: sourceSwitchCounters,
      oldSourceWrite: detachedSourceCounters,
      postSwitchBatch: freshEffectCounters,
      observerRemoval: observerRemovalCounters,
      hotRemoval: hotRemovalCounters,
    },
  }));
} finally {
  try {
    root?.dispose();
    if (root) assert.equal(root.diagnostics().disposed, true, "generated root was not disposed during cleanup");
    if (app) assert.deepEqual(app.version.diagnostics(), { roots: 0, listeners: 0, readers: 0, retainedActions: 0, transitions: 0 });
  } finally {
    try {
      await unlink(outputPath);
    } catch (error) {
      if (error?.code !== "ENOENT") throw error;
    }
    plugin.closeBundle?.call({});
  }
}
