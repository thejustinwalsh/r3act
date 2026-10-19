import assert from "node:assert/strict";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createNativeRoot, jsx } from "../src/native_runtime_api.ts";
import { MemoryVDOMHost } from "../src/vdom_snapshot_runtime.ts";
import { nativeModulePlugin } from "./vite_native_plugin.ts";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const cacheDirectory = path.join(projectRoot, ".cache");
const sourceId = path.join(cacheDirectory, "native-numeric-commit.tsx");
const outputPath = path.join(cacheDirectory, "native-numeric-commit.mjs");
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

const source = `import { createStore, createStoreSelector, use, useEffect, useState } from "../src/native_runtime_api.ts";

export const storeA = createStore(0);
export const storeB = createStore(false);
export const summary = createStoreSelector([storeA, storeB], ([left, right]) => String(left) + ":" + String(right));
export const refs = { hot: null, attachCalls: 0, cleanupCalls: 0 };
export const trace = {
  hotRenders: 0,
  hotMounts: 0,
  hotCleanups: 0,
  badgeRenders: 0,
  appRenders: 0,
  toggleRenders: 0,
  replaceRenders: 0,
  observerMounts: 0,
  observerCleanups: 0,
  observations: [],
  setHot: null,
  setShow: null,
  setKey: null,
  setVisible: null,
};

export function captureHot(node) {
  if (node == null) return;
  refs.hot = node;
  refs.attachCalls++;
  return () => {
    refs.cleanupCalls++;
    if (refs.hot === node) refs.hot = null;
  };
}

export function Hot() {
  trace.hotRenders++;
  const [value, setValue] = useState(1);
  trace.setHot = setValue;
  useEffect(() => {
    trace.hotMounts++;
    return () => { trace.hotCleanups++; };
  });
  return <div ref={captureHot} data-hot="yes" data-value={value} style={{ opacity: value }} />;
}

export function StoreProbe() {
  trace.badgeRenders++;
  const value = use(summary);
  return <output data-summary={value}>{value}</output>;
}

export function Observer() {
  useEffect(() => {
    trace.observerMounts++;
    const node = refs.hot;
    trace.observations.push({ value: node?.props["data-value"], node });
    return () => { trace.observerCleanups++; };
  });
  return <aside data-observer="yes">observed</aside>;
}

export function App() {
  trace.appRenders++;
  const showObserver = use(storeB);
  return <section><StoreProbe /><Hot key="hot" />{showObserver ? <Observer key="observer" /> : null}</section>;
}

export function LocalStructureApp() {
  trace.toggleRenders++;
  const [showObserver, setShowObserver] = useState(false);
  trace.setShow = setShowObserver;
  return <section><Hot key="hot" /><button data-toggle="yes" onClick={() => setShowObserver((value) => !value)}>toggle</button>
    {showObserver ? <Observer key="observer" /> : null}</section>;
}

export function ReplaceApp() {
  trace.replaceRenders++;
  const [key, setKey] = useState("first");
  const [visible, setVisible] = useState(true);
  trace.setKey = setKey;
  trace.setVisible = setVisible;
  return <section><button data-swap="yes" onClick={() => setKey((value) => value === "first" ? "second" : "first")}>swap</button>
    <button data-visible="yes" onClick={() => setVisible((value) => !value)}>visible</button>
    {visible ? <Hot key={key} /> : null}</section>;
}`;

let compiledRoot;
let structureRoot;
let replacementRoot;
try {
  await mkdir(cacheDirectory, { recursive: true });
  const transformed = await plugin.transform.call(context, source, sourceId);
  assert.ok(transformed?.code, "composed native compiler did not transform authored TSX");
  assert.match(transformed.code, /useStoreAt/, "authored use(store) did not compile");
  assert.match(transformed.code, /__nativeBindStateProps?At\(/, "Hot numeric prop/style bindings did not compile");
  assert.doesNotMatch(source, /@native-ui|@jsx|\bjsx\s*[,}]/, "authored TSX must not use a marker, pragma, or factory import");
  await writeFile(outputPath, transformed.code);
  const app = await import(`${pathToFileURL(outputPath).href}?run=${Date.now()}`);

  const makeRoot = (id) => {
    const host = new MemoryVDOMHost();
    const container = host.createContainer();
    const root = createNativeRoot(host, container, { rootId: id, scheduleCommit() {} });
    return { host, container, root };
  };
  const find = (container, predicate) => {
    const visit = (node) => {
      if (predicate(node)) return node;
      for (const child of node.children) {
        const result = visit(child);
        if (result) return result;
      }
      return undefined;
    };
    return visit(container);
  };
  const summaryNode = (container) => find(container, (node) => "data-summary" in node.props);
  const observerNode = (container) => find(container, (node) => node.props["data-observer"] === "yes");

  const first = makeRoot("numeric-commit-stores");
  compiledRoot = first.root;
  compiledRoot.mount(jsx(app.App, {}));
  const firstHot = app.refs.hot;
  assert.ok(firstHot, "Hot ref was not published");
  assert.equal(firstHot.props["data-value"], 1);
  assert.equal(app.refs.attachCalls, 1);
  assert.equal(app.trace.hotRenders, 1);
  assert.equal(app.trace.hotMounts, 1);
  assert.equal(summaryNode(first.container).props["data-summary"], "0:false");
  assert.equal(observerNode(first.container), undefined);

  const beforeCombinedHotRenders = app.trace.hotRenders;
  const beforeCombinedBadgeRenders = app.trace.badgeRenders;
  assert.equal(app.storeA.dispatch(1), true);
  assert.equal(app.storeB.dispatch(true), true);
  assert.equal(app.trace.setHot(2), true);
  compiledRoot.flush();
  assert.equal(app.trace.hotRenders, beforeCombinedHotRenders, "combined store and numeric update reran Hot");
  assert.equal(app.trace.badgeRenders - beforeCombinedBadgeRenders, 1, "selector Badge did not render exactly once");
  assert.equal(firstHot.props["data-value"], 2, "numeric data prop was not written before effects");
  assert.equal(firstHot.props.style.opacity, 2, "numeric style prop was not written before effects");
  assert.equal(app.refs.hot, firstHot, "numeric update replaced the public host instance");
  assert.equal(app.refs.attachCalls, 1, "unchanged ref callback was republished during numeric update");
  assert.equal(summaryNode(first.container).props["data-summary"], "1:true", "selector observed stale source history");
  assert.ok(observerNode(first.container), "storeB did not mount the effect observer");
  assert.equal(app.trace.observations.length, 1);
  assert.equal(app.trace.observations[0].value, 2, "new effect did not read the committed Hot prop");
  assert.equal(app.trace.observations[0].node, firstHot, "observer did not read the raw public ref instance");

  const beforeHideHotRenders = app.trace.hotRenders;
  const beforeHideObserverCleanups = app.trace.observerCleanups;
  assert.equal(app.storeA.dispatch(2), true);
  assert.equal(app.storeB.dispatch(false), true);
  assert.equal(app.trace.setHot(3), true);
  compiledRoot.flush();
  assert.equal(app.trace.hotRenders, beforeHideHotRenders, "storeB removal reran the unrelated numeric Hot owner");
  assert.equal(firstHot.props["data-value"], 3);
  assert.equal(summaryNode(first.container).props["data-summary"], "2:false", "selector retained a stale source version");
  assert.equal(observerNode(first.container), undefined);
  assert.equal(app.trace.observerCleanups, beforeHideObserverCleanups + 1, "storeB removal did not clean its observer effect");

  const beforeRemountHotRenders = app.trace.hotRenders;
  assert.equal(app.storeA.dispatch(3), true);
  assert.equal(app.storeB.dispatch(true), true);
  assert.equal(app.trace.setHot(4), true);
  compiledRoot.flush();
  assert.equal(app.trace.hotRenders, beforeRemountHotRenders, "observer remount reran the unrelated numeric Hot owner");
  assert.equal(summaryNode(first.container).props["data-summary"], "3:true", "selector missed the latest paired source history");
  assert.equal(app.refs.hot, firstHot);
  assert.deepEqual(app.trace.observations.map(({ value }) => value), [2, 4], "effects did not observe the newest committed Hot values");
  assert.equal(app.trace.observations[1].node, firstHot);

  compiledRoot.dispose();
  assert.equal(compiledRoot.diagnostics().disposed, true);
  assert.equal(app.refs.hot, null, "root teardown did not detach the public ref");
  assert.equal(app.refs.cleanupCalls, 1, "ref cleanup did not run exactly once");
  assert.equal(app.trace.hotMounts, app.trace.hotCleanups, "Hot effect teardown was not exact-once");
  assert.equal(app.trace.observerMounts, app.trace.observerCleanups, "observer effect teardown was not exact-once");
  assert.equal(app.storeA.diagnostics().roots, 0);
  assert.equal(app.storeA.diagnostics().readers, 0);
  assert.equal(app.storeB.diagnostics().roots, 0);
  assert.equal(app.storeB.diagnostics().readers, 0);

  const second = makeRoot("numeric-commit-structure");
  structureRoot = second.root;
  const hotRendersBeforeStructureRoot = app.trace.hotRenders;
  const observationCountBeforeStructureRoot = app.trace.observations.length;
  structureRoot.mount(jsx(app.LocalStructureApp, {}));
  const structureHot = app.refs.hot;
  assert.ok(structureHot);
  assert.equal(app.trace.hotRenders, hotRendersBeforeStructureRoot + 1);
  const hotRendersBeforeLocalToggle = app.trace.hotRenders;
  const observerCleanupsBeforeLocalToggle = app.trace.observerCleanups;
  assert.equal(app.trace.setHot(2), true);
  assert.equal(app.trace.setShow(true), true);
  structureRoot.flush();
  assert.equal(app.trace.hotRenders, hotRendersBeforeLocalToggle, "no-store structural mount reran Hot");
  assert.equal(structureHot.props["data-value"], 2);
  assert.equal(app.refs.hot, structureHot);
  assert.equal(app.trace.observations[observationCountBeforeStructureRoot].value, 2, "new no-store structural effect missed numeric publication");
  assert.equal(app.trace.observations[observationCountBeforeStructureRoot].node, structureHot);
  assert.ok(observerNode(second.container));
  assert.equal(app.trace.setHot(3), true);
  assert.equal(app.trace.setShow(false), true);
  structureRoot.flush();
  assert.equal(app.trace.hotRenders, hotRendersBeforeLocalToggle);
  assert.equal(structureHot.props["data-value"], 3);
  assert.equal(app.trace.observerCleanups, observerCleanupsBeforeLocalToggle + 1);
  structureRoot.dispose();
  assert.equal(app.refs.hot, null);
  assert.equal(app.refs.cleanupCalls, 2);
  assert.equal(app.trace.hotMounts, app.trace.hotCleanups);
  assert.equal(app.trace.observerMounts, app.trace.observerCleanups);
  assert.equal(structureRoot.diagnostics().disposed, true);

  const third = makeRoot("numeric-commit-replacement");
  replacementRoot = third.root;
  replacementRoot.mount(jsx(app.ReplaceApp, {}));
  const oldHot = app.refs.hot;
  const oldHotSetter = app.trace.setHot;
  const hotRendersBeforeReplacement = app.trace.hotRenders;
  const hotCleanupsBeforeReplacement = app.trace.hotCleanups;
  const refCleanupsBeforeReplacement = app.refs.cleanupCalls;
  assert.equal(app.trace.setKey("second"), true);
  assert.equal(oldHotSetter(2), true);
  replacementRoot.flush();
  const replacementHot = app.refs.hot;
  assert.ok(replacementHot && replacementHot !== oldHot, "key change did not publish a replacement Hot host");
  assert.equal(oldHot.parent, null, "keyed replacement left the old host attached");
  assert.equal(replacementHot.props["data-value"], 1, "replacement inherited stale state or writer output");
  assert.equal(app.trace.hotRenders - hotRendersBeforeReplacement, 1, "keyed replacement executed more than the new Hot owner");
  assert.equal(app.trace.hotCleanups, hotCleanupsBeforeReplacement + 1, "replacement did not clean the old Hot effect exactly once");
  assert.equal(app.refs.cleanupCalls, refCleanupsBeforeReplacement + 1, "replacement did not detach the old Hot ref exactly once");
  assert.throws(() => oldHotSetter(9), /Owner \d+ is not alive/, "detached owner's stale numeric setter was not rejected");
  replacementRoot.flush();
  assert.equal(replacementHot.props["data-value"], 1, "stale writer changed the replacement host");

  const replacementSetter = app.trace.setHot;
  const replacementHotRenders = app.trace.hotRenders;
  const hotCleanupsBeforeRemoval = app.trace.hotCleanups;
  const refCleanupsBeforeRemoval = app.refs.cleanupCalls;
  assert.equal(app.trace.setVisible(false), true);
  assert.equal(replacementSetter(2), true);
  replacementRoot.flush();
  assert.equal(app.trace.hotRenders, replacementHotRenders, "same-batch removal executed a detached Hot owner");
  assert.equal(replacementHot.parent, null, "removed Hot host stayed attached");
  assert.equal(app.refs.hot, null, "removed Hot ref remained current");
  assert.equal(app.trace.hotCleanups, hotCleanupsBeforeRemoval + 1, "removed Hot effect did not clean exactly once");
  assert.equal(app.refs.cleanupCalls, refCleanupsBeforeRemoval + 1, "removed Hot ref did not clean exactly once");
  assert.throws(() => replacementSetter(9), /Owner \d+ is not alive/, "removed owner's stale numeric setter was not rejected");
  replacementRoot.dispose();
  assert.equal(replacementRoot.diagnostics().disposed, true);
  assert.equal(app.trace.hotMounts, app.trace.hotCleanups, "replacement root leaked Hot effects");
  assert.equal(app.refs.hot, null);
  assert.equal(app.refs.cleanupCalls, refCleanupsBeforeRemoval + 1);
  assert.deepEqual(app.storeA.diagnostics(), { roots: 0, listeners: 0, readers: 0, retainedActions: 0, transitions: 0 });
  assert.deepEqual(app.storeB.diagnostics(), { roots: 0, listeners: 0, readers: 0, retainedActions: 0, transitions: 0 });

  console.log("Compiled numeric commit seam PASS: same-batch store/prop publication before observer effects; stable numeric owner/host; selector history; no-store structural effect publication; keyed replacement/removal releases refs, effects, and stale writers.");
} finally {
  compiledRoot?.dispose();
  structureRoot?.dispose();
  replacementRoot?.dispose();
  try {
    await unlink(outputPath);
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
  }
  plugin.closeBundle?.call({});
}
