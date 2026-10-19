import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createNativeRoot, jsx } from "../src/native_runtime_api.ts";
import { MemoryVDOMHost } from "../src/vdom_snapshot_runtime.ts";
import { nativeModulePlugin } from "./vite_native_plugin.ts";
import { compiledNumericDescriptors } from "./compiled_numeric_descriptor_test_helpers.mjs";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const directory = path.join(projectRoot, ".cache/compiled-scoped-collection");
const attempt = `${Date.now()}-${process.pid}-${randomUUID()}`;
const sourcePath = path.join(directory, `authored-${attempt}.tsx`);
const outputPath = path.join(directory, `emitted-${attempt}.mjs`);
const passPath = path.join(directory, `pass-${attempt}.json`);
const failPath = path.join(directory, `fail-${attempt}.json`);
const runtimeUrl = pathToFileURL(path.join(projectRoot, "src/native_runtime_api.ts")).href;

const authored = `import { createKeyedCollection, renderCollectionAt, useState, useEffect } from ${JSON.stringify(runtimeUrl)};

export const leftRows = createKeyedCollection([
  { id: "a" }, { id: "b" }, { id: "c" },
], row => row.id);
export const rightRows = createKeyedCollection([
  { id: "d" }, { id: "e" }, { id: "f" },
], row => row.id);
export const trace = {
  appRenders: 0,
  setters: Object.create(null),
  mounts: Object.create(null),
  cleanups: Object.create(null),
  refAttachments: Object.create(null),
  refCleanups: Object.create(null),
};

export function captureItemNode(node) {
  if (!node) return;
  const id = node.props["data-row"];
  trace.refAttachments[id] = (trace.refAttachments[id] || 0) + 1;
  return () => { trace.refCleanups[id] = (trace.refCleanups[id] || 0) + 1; };
}

export function Item({ id }) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    trace.setters[id] = setCount;
    trace.mounts[id] = (trace.mounts[id] || 0) + 1;
    return () => {
      trace.cleanups[id] = (trace.cleanups[id] || 0) + 1;
    };
  });
  return <li key={id} data-row={id} data-count={count}
    ref={captureItemNode}>{id}</li>;
}

export function List({ side }) {
  return side === "left"
    ? <ul key="left-list" data-side="left">{renderCollectionAt("compiled-scoped-left", leftRows,
        row => <Item key={row.id} id={row.id} />)}</ul>
    : <ul key="right-list" data-side="right">{renderCollectionAt("compiled-scoped-right", rightRows,
        row => <Item key={row.id} id={row.id} />)}</ul>;
}

export function App() {
  trace.appRenders++;
  return <section><List key="left" side="left" /><List key="right" side="right" /></section>;
}`;

const plugin = nativeModulePlugin({ root: projectRoot,
  compilerBinary: path.join(projectRoot, "compiler/oxc-spike/target/debug/ui-graph-compiler-spike") });
plugin.configResolved?.call({}, { root: projectRoot });
const context = {
  addWatchFile() {},
  async resolve(specifier) {
    return specifier === runtimeUrl
      ? { id: path.join(projectRoot, "src/native_runtime_api.ts") }
      : null;
  },
  error(message) { throw new Error(String(message)); },
};
const rowNode = (list, id) => list.children.find((node) => node.props["data-row"] === id);
const order = (list) => list.children.map((node) => node.props["data-row"]);
const accept = (candidate) => {
  assert.equal(candidate.validate(), true, "prepared collection candidate became stale");
  candidate.commitHost();
  assert.equal(candidate.validatePostHost(), true, "host-applied collection cut became stale");
  candidate.preparePublication();
  candidate.publish();
  candidate.installSubscriptions();
  candidate.runEffects();
};

let root;
let app;
let failure;
let proof;
let restoreHookObserver = () => {};
try {
  await mkdir(directory, { recursive: true });
  await writeFile(sourcePath, authored, { flag: "wx" });
  const transformed = await plugin.transform.call(context, authored, sourcePath);
  assert.ok(transformed?.code, "authored TSX did not compile through Rust/OXC");
  await writeFile(outputPath, transformed.code, { flag: "wx" });
  assert.match(transformed.code, /__nativeDefineComponent\(/,
    "compiler did not define native component sites");
  assert.match(transformed.code, /moduleRevision:/,
    "compiler did not attach module revision metadata");
  const descriptors = compiledNumericDescriptors(transformed.code);
  assert.ok(descriptors.some((entry) => entry.closedExpressionKinds.includes("input")),
    "Item numeric prop has no closed compiled source expression");
  app = await import(`${pathToFileURL(outputPath).href}?attempt=${attempt}`);
  const host = new MemoryVDOMHost();
  const container = host.createContainer();
  const renderFrames = [];
  root = createNativeRoot(host, container, {
    rootId: `compiled-scoped-${attempt}`,
    scheduleCommit() {},
    profileCounter(frame) { renderFrames.push(frame); },
  });
  const itemHookReads = new Map();
  const originalUseState = root.world.useState;
  const originalBeginPreparation = root.world.beginPreparation;
  const countItemHook = (owner, site) => {
    if (site.endsWith("#component:Item#state:0")) {
      itemHookReads.set(owner, (itemHookReads.get(owner) ?? 0) + 1);
    }
  };
  root.world.useState = function (...args) {
    countItemHook(args[0], args[1]);
    return originalUseState.apply(this, args);
  };
  root.world.beginPreparation = function (...args) {
    const preparation = originalBeginPreparation.apply(this, args);
    const useState = preparation.useState;
    preparation.useState = function (...stateArgs) {
      countItemHook(stateArgs[0], stateArgs[1]);
      return useState.apply(this, stateArgs);
    };
    return preparation;
  };
  restoreHookObserver = () => {
    root.world.useState = originalUseState;
    root.world.beginPreparation = originalBeginPreparation;
  };
  root.mount(jsx(app.App, {}));
  const componentRenders = () => renderFrames.reduce((sum, frame) =>
    sum + (frame["owner.component-renders"] ?? 0), 0);
  const section = container.children[0];
  const left = section.children[0];
  const right = section.children[1];
  assert.deepEqual(order(left), ["a", "b", "c"]);
  assert.deepEqual(order(right), ["d", "e", "f"]);
  assert.deepEqual(Object.keys(app.trace.setters).sort(), ["a", "b", "c", "d", "e", "f"],
    "all authored Item controls activate at mount");
  assert.equal(itemHookReads.size, 6, "each Item reads its first hook at mount");
  assert.ok([...itemHookReads.values()].every((count) => count === 1),
    "each Item executes exactly once at mount");
  assert.equal(componentRenders(), 0, "mount does not emit flush profile frames");
  const a = rowNode(left, "a");
  const b = rowNode(left, "b");
  const c = rowNode(left, "c");
  const d = rowNode(right, "d");
  assert.ok(a && b && c && d, "initial keyed host rows are missing");
  assert.equal(app.trace.setters.b(7), true);
  assert.equal(root.flush(), true);
  assert.equal(rowNode(left, "b"), b, "local state update remounted b");
  assert.equal(b.props["data-count"], 7);
  const rendersBeforeCut = componentRenders();
  const hookReadsBeforeCut = new Map(itemHookReads);
  const appRendersBeforeCut = app.trace.appRenders;
  const mountsBeforeCut = { ...app.trace.mounts };
  const versionBeforeCut = root.publicationVersion;

  assert.equal(app.trace.setters.c(9), true, "numeric input did not become dirty");
  assert.equal(app.leftRows.apply(app.leftRows.version, [{
    type: "move", key: "c", beforeKey: "a",
  }]).ok, true);
  const leftCut = root.prepareCollections([app.leftRows]);
  assert.ok(leftCut, "compiled left move did not prepare a scoped cut");
  assert.equal(app.rightRows.apply(app.rightRows.version, [{
    type: "remove", key: "f",
  }]).ok, true);
  const rightCut = root.prepareCollections([app.rightRows]);
  assert.ok(rightCut, "compiled right removal did not prepare a scoped cut");
  accept(rightCut);
  assert.equal(leftCut.validate(), true,
    "unrelated accepted right edit invalidated preprepared left cut");
  accept(leftCut);
  assert.equal(root.publicationVersion, versionBeforeCut + 2,
    "two independent accepted collection cuts did not advance twice");
  assert.deepEqual(order(left), ["c", "a", "b"]);
  assert.deepEqual(order(right), ["d", "e"]);
  assert.equal(rowNode(left, "c"), c, "move replaced c host identity");
  assert.equal(rowNode(left, "a"), a, "move replaced a host identity");
  assert.equal(rowNode(right, "d"), d, "unrelated right row identity changed");
  assert.equal(b.props["data-count"], 7, "b local state was lost");
  assert.equal(c.props["data-count"], 0,
    "structural cut consumed an independent pending numeric input");
  assert.equal(root.diagnostics().pendingChangeCount, 1,
    "structural cuts acknowledged an unrelated numeric input");
  assert.equal(componentRenders(), rendersBeforeCut,
    "scoped move/remove does not enter a flush owner render");
  assert.deepEqual(itemHookReads, hookReadsBeforeCut,
    "manual scoped move/remove does not execute retained Item hooks");
  assert.equal(app.trace.appRenders, appRendersBeforeCut,
    "manual scoped move/remove does not execute common App");
  assert.deepEqual({ ...app.trace.mounts }, mountsBeforeCut,
    "move/remove remounted a retained row");
  assert.equal(app.trace.cleanups.f, 1, "removed f effect did not clean once");
  assert.equal(app.trace.refCleanups.f, 1, "removed f ref did not clean once");
  assert.equal(root.flush(), true, "pending numeric input did not flush");
  assert.equal(c.props["data-count"], 9, "moved row lost its pending numeric value");
  assert.equal(rowNode(left, "c"), c, "numeric flush remounted moved row");
  assert.equal(root.diagnostics().pendingChangeCount, 0);

  const rendersBeforeDecline = componentRenders();
  const hookReadsBeforeDecline = new Map(itemHookReads);
  const appRendersBeforeDecline = app.trace.appRenders;
  const mountsBeforeDecline = { ...app.trace.mounts };
  assert.equal(app.leftRows.apply(app.leftRows.version, [{
    type: "insert", key: "new", value: { id: "new" }, beforeKey: "a",
  }]).ok, true);
  assert.equal(root.prepareCollections([app.leftRows]), null,
    "explicit scoped API accepted arbitrary row-render insertion");
  assert.equal(componentRenders(), rendersBeforeDecline,
    "declined scoped insertion did not enter a flush owner render");
  assert.deepEqual(itemHookReads, hookReadsBeforeDecline,
    "declined scoped insertion does not execute an Item hook");
  assert.equal(app.trace.appRenders, appRendersBeforeDecline,
    "declined scoped insertion does not execute App");
  assert.deepEqual({ ...app.trace.mounts }, mountsBeforeDecline,
    "declined scoped insertion did not activate an Item");
  assert.equal(root.flush(), true, "ordinary collection fallback did not render insertion");
  assert.deepEqual(order(left), ["c", "new", "a", "b"]);
  assert.equal(app.trace.mounts.new, 1,
    "ordinary fallback activates exactly the inserted row");
  assert.equal(itemHookReads.size, hookReadsBeforeDecline.size + 1,
    "ordinary fallback executes one new Item owner");
  for (const [owner, count] of hookReadsBeforeDecline) {
    assert.equal(itemHookReads.get(owner), count,
      "ordinary fallback does not execute retained Item hooks");
  }
  assert.deepEqual([...itemHookReads].filter(([owner]) => !hookReadsBeforeDecline.has(owner))
    .map(([, count]) => count), [1], "inserted Item executes exactly once");
  assert.equal(componentRenders() - rendersBeforeDecline, 1,
    "ordinary fallback renders exactly the inserted Item");
  assert.equal(rowNode(left, "c"), c, "ordinary insert replaced retained c");
  assert.equal(rowNode(left, "b"), b, "ordinary insert lost b identity");
  assert.equal(b.props["data-count"], 7, "ordinary fallback lost b local state");

  proof = {
    attempt,
    sourcePath,
    outputPath,
    initialOrder: { left: ["a", "b", "c"], right: ["d", "e", "f"] },
    acceptedOrder: { left: ["c", "a", "b"], right: ["d", "e"] },
    fallbackOrder: order(left),
    publicationVersion: root.publicationVersion,
    profiledFlushComponentRenders: componentRenders(),
    itemHookReads: [...itemHookReads.values()],
    mounts: { ...app.trace.mounts },
    cleanupsBeforeDispose: { ...app.trace.cleanups },
    pendingAfterFlush: root.diagnostics().pendingChangeCount,
  };
} catch (error) {
  failure = error;
} finally {
  try {
    restoreHookObserver();
    root?.dispose();
    if (app) {
      for (const [id, mounts] of Object.entries(app.trace.mounts)) {
        assert.equal(app.trace.cleanups[id], mounts,
          `Item ${id} effect lifetime did not balance at disposal`);
        assert.equal(app.trace.refCleanups[id], app.trace.refAttachments[id],
          `Item ${id} ref lifetime did not balance at disposal`);
      }
      assert.equal(app.leftRows.stats().readerCount, 0,
        "left collection reader survived disposal");
      assert.equal(app.rightRows.stats().readerCount, 0,
        "right collection reader survived disposal");
    }
  } catch (error) {
    failure = failure ? new AggregateError([failure, error],
      "Fixture and disposal failed") : error;
  }
  try {
    await plugin.closeBundle();
  } catch (error) {
    failure = failure ? new AggregateError([failure, error],
      "Fixture and plugin cleanup failed") : error;
  }
  if (failure) {
    await writeFile(failPath, JSON.stringify({
      attempt, sourcePath, outputPath, message: String(failure),
      stack: failure.stack ?? null,
    }, null, 2), { flag: "wx" });
  } else {
    await writeFile(passPath, JSON.stringify({ ...proof,
      cleanupsAfterDispose: { ...app.trace.cleanups },
      refCleanupsAfterDispose: { ...app.trace.refCleanups },
    }, null, 2), { flag: "wx" });
  }
}
if (failure) throw failure;
console.log("PASS compiled scoped collection: independent accepted moves/removal, retained row identity, pending numeric input, fallback insertion, and exact cleanup.");
