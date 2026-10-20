import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { parse } from "@babel/parser";
import * as THREE from "three";
import { transformWithOxc } from "vite";
import { nativeModulePlugin } from "./vite_native_plugin.ts";
import { createNativeRoot, jsx, NativeRootWorkQueue,
  storeRecord } from "../src/native_runtime_api.ts";
import { MemoryVDOMHost } from "../src/vdom_snapshot_runtime.ts";
import { createThreeNativeRoot } from "../src/three_host.ts";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const directory = path.join(projectRoot, ".cache", `compiled-closed-rows-${randomUUID()}`);
const runtimePath = path.join(projectRoot, "src/native_runtime_api.ts");
const runtimeUrl = pathToFileURL(runtimePath).href;
const authored = `import { Suspense, use, createKeyedCollection, storeRecord } from ${JSON.stringify(runtimeUrl)};
export const domRows = createKeyedCollection([
  storeRecord({ id: "a", value: 1 }), storeRecord({ id: "b", value: 2 }),
], row => row.id);
export const threeRows = createKeyedCollection([
  storeRecord({ id: "a", value: 1 }), storeRecord({ id: "b", value: 2 }),
], row => row.id);
export const domAux = createKeyedCollection([storeRecord({ id: "q", value: 5 })], row => row.id);
export const threeAux = createKeyedCollection([storeRecord({ id: "q", value: 5 })], row => row.id);
export const opaqueRows = createKeyedCollection([storeRecord({ id: "o", value: 1 })], row => row.id);
export const unownedRows = createKeyedCollection([{ id: "u", value: 1 }], row => row.id);
export const failingRows = createKeyedCollection([storeRecord({ id: "f", value: 1 })], row => row.id);
export const trace = { opaqueCalls: 0 };
export const pending = new Promise(() => {});
export function DomRow(props) {
  return <output data-value={props.row.value}>{props.row.value}</output>;
}
export function ThreeRow(props) {
  return <mesh position-x={props.row.value} />;
}
export function DomList() {
  return <ul key="rows">{domRows.map(row => <DomRow row={row} />)}</ul>;
}
export function ThreeList() {
  return <group key="rows">{threeRows.map(row => <ThreeRow row={row} />)}</group>;
}
export function DomAux() {
  return <div key="aux">{domAux.map(row => <DomRow row={row} />)}</div>;
}
export function ThreeAux() {
  return <group key="aux">{threeAux.map(row => <ThreeRow row={row} />)}</group>;
}
function opaqueValue(row) {
  trace.opaqueCalls++;
  return row.value;
}
export function OpaqueRow(props) {
  return <output data-value={opaqueValue(props.row)} />;
}
export function OpaqueList() {
  return <div key="opaque">{opaqueRows.map(row => <OpaqueRow row={row} />)}</div>;
}
export function UnownedList() {
  return <div key="unowned">{unownedRows.map(row => <DomRow row={row} />)}</div>;
}
export function FailingList() {
  return <div key="failing">{failingRows.map(row => <DomRow row={row} />)}</div>;
}
export function PendingDom() {
  const value = use(pending);
  return <output key="pending" data-value={value} />;
}
export function PendingThree() {
  const value = use(pending);
  return <group key="pending" name={value} />;
}
export function DomApp() {
  return <section><DomList key="list" /><DomAux key="aux" />
    <Suspense fallback={<output key="pending">waiting</output>}>
      <PendingDom key="pending-child" />
    </Suspense>
  </section>;
}
export function ThreeApp() {
  return <group key="app"><ThreeList key="list" /><ThreeAux key="aux" />
    <Suspense fallback={<group key="pending" name="waiting" />}>
      <PendingThree key="pending-child" />
    </Suspense>
  </group>;
}`;

const property = (node, name) => node?.properties?.find((entry) =>
  entry.type === "ObjectProperty" && !entry.computed &&
  (entry.key.name ?? entry.key.value) === name
)?.value;
const importedAliases = (ast, name) => new Set(ast.program.body.flatMap((statement) =>
  statement.type === "ImportDeclaration" && statement.source.value === runtimeUrl
    ? statement.specifiers.filter((specifier) =>
      specifier.type === "ImportSpecifier" &&
      (specifier.imported.name ?? specifier.imported.value) === name
    ).map((specifier) => specifier.local.name)
    : []));
const visitAst = (node, callback) => {
  if (!node || typeof node !== "object") return;
  callback(node);
  for (const [key, value] of Object.entries(node)) {
    if (key === "loc" || key === "start" || key === "end") continue;
    if (Array.isArray(value)) value.forEach((entry) => visitAst(entry, callback));
    else if (value && typeof value === "object") visitAst(value, callback);
  }
};
const registration = (ast, suffix) => {
  const aliases = importedAliases(ast, "defineComponent");
  assert.ok(aliases.size, "transformed component registration import missing");
  const found = [];
  visitAst(ast, (node) => {
    if (node.type === "CallExpression" &&
      aliases.has(node.callee?.name) &&
      node.arguments?.[0]?.value?.endsWith(suffix)) found.push(node);
  });
  assert.equal(found.length, 1, `${suffix} has no unique compiled registration`);
  return found[0];
};
const accept = (candidate) => {
  assert.equal(candidate.validate(), true);
  candidate.commitHost();
  assert.equal(candidate.validatePostHost(), true);
  candidate.preparePublication();
  candidate.publish();
  candidate.installSubscriptions();
  candidate.runEffects();
};
const change = (collection, operations) =>
  assert.equal(collection.apply(collection.version, operations).ok, true);
const order = (list, kind) => kind === "dom"
  ? list.children.map((row) => row.props["data-value"])
  : list.children.map((row) => row.position.x);
const text = (node) => (node.text ?? "") + node.children.map(text).join("");

const plugin = nativeModulePlugin({ root: projectRoot,
  compilerBinary: path.join(projectRoot, "compiler/oxc-spike/target/debug/ui-graph-compiler-spike") });
plugin.configResolved?.call({}, { root: projectRoot });
const context = {
  addWatchFile() {},
  async resolve(specifier) { return specifier === runtimeUrl ? { id: runtimePath } : null; },
  error(message) { throw new Error(String(message)); },
};
let domRoot, forkRoot, opaqueRoot, unownedRoot, failingRoot, three, queue, app;
let primaryError;
const cleanupErrors = [];
try {
  await mkdir(directory, { recursive: true });
  const sourcePath = path.join(directory, "closed-rows.tsx");
  await writeFile(sourcePath, authored, { flag: "wx" });
  const transformed = await plugin.transform.call(context, authored, sourcePath);
  assert.ok(transformed?.code && transformed.code !== authored, "Rust/OXC did not transform rows");
  await writeFile(path.join(directory, "closed-rows.transformed.tsx"),
    transformed.code, { flag: "wx" });
  const ast = parse(transformed.code, { sourceType: "module", plugins: ["typescript", "jsx"] });
  const collectionAliases = importedAliases(ast, "renderCollectionAt");
  assert.ok(collectionAliases.size, "lowered collection helper import missing");
  const loweredCollectionSites = [];
  visitAst(ast, (node) => {
    if (node.type === "CallExpression" && collectionAliases.has(node.callee?.name)) {
      loweredCollectionSites.push(node.arguments?.[0]?.value);
    }
  });
  assert.equal(loweredCollectionSites.length, 7,
    "ordinary keyed .map calls were not lowered by Rust/OXC");
  assert.ok(loweredCollectionSites.every((site) =>
    typeof site === "string" && /#collection:\d+$/.test(site)));
  const compilerProof = [];
  for (const [owner, row] of [["DomList", "DomRow"], ["ThreeList", "ThreeRow"],
    ["DomAux", "DomRow"], ["ThreeAux", "ThreeRow"],
    ["FailingList", "DomRow"], ["UnownedList", "DomRow"]]) {
    const compiled = registration(ast, `#component:${owner}`);
    const programs = property(compiled.arguments[2], "closedCollectionRowPrograms");
    assert.equal(programs?.type, "ArrayExpression", `${owner} lacks closed row metadata`);
    assert.equal(programs.elements.length, 1, `${owner} has an unexpected row program count`);
    const program = programs.elements[0];
    assert.equal(property(program, "schemaVersion")?.value, 1);
    assert.equal(property(program, "rowProp")?.value, "row");
    assert.equal(property(program, "componentProgramId")?.value, compiled.arguments[0].value);
    assert.match(property(program, "rowComponentProgramId")?.value ?? "",
      new RegExp(`#component:${row}$`));
    const inputs = property(program, "inputs");
    assert.deepEqual(inputs?.elements.map((entry) =>
      property(entry, "path")?.elements.map((part) => part.value)), [["value"]]);
    assert.equal(property(property(program, "host"), "key")?.type, "NullLiteral");
    const site = property(program, "collectionSiteId")?.value;
    assert.match(site ?? "", /#collection:\d+$/);
    compilerProof.push({ owner, row, site });
  }
  const opaqueRegistration = registration(ast, "#component:OpaqueList");
  assert.equal(property(opaqueRegistration.arguments[2], "closedCollectionRowPrograms")?.elements?.length ?? 0,
    0, "opaque helper row unexpectedly gained closed admission");
  const componentSites = Object.fromEntries([
    "DomApp", "ThreeApp", "DomList", "ThreeList", "DomRow", "ThreeRow",
  ].map((name) => [name, registration(ast, `#component:${name}`).arguments[0].value]));
  const collectionSites = Object.fromEntries(compilerProof.map(({ owner, site }) => [owner, site]));
  const emitted = await transformWithOxc(transformed.code, sourcePath, {
    lang: "tsx", jsx: { runtime: "classic", pragma: "jsx", pragmaFrag: "Fragment" },
  });
  const outputPath = path.join(directory, "closed-rows.emitted.mjs");
  await writeFile(outputPath, emitted.code, { flag: "wx" });
  app = await import(`${pathToFileURL(outputPath).href}?run=${randomUUID()}`);

  const domHost = new MemoryVDOMHost();
  const domContainer = domHost.createContainer();
  domRoot = createNativeRoot(domHost, domContainer, {
    rootId: `closed-rows-dom-${randomUUID()}`, scheduleCommit() {},
  });
  domRoot.mount(jsx(app.DomApp, {}));
  const forkHost = new MemoryVDOMHost();
  const forkContainer = forkHost.createContainer();
  forkRoot = createNativeRoot(forkHost, forkContainer, {
    rootId: `closed-rows-fork-${randomUUID()}`, scheduleCommit() {},
  });
  forkRoot.mount(jsx(app.DomApp, {}));
  const scene = new THREE.Scene();
  three = createThreeNativeRoot(scene, { namespace: THREE,
    rootOptions: { rootId: `closed-rows-three-${randomUUID()}`, scheduleCommit() {} },
  });
  three.root.mount(jsx(app.ThreeApp, {}));
  const section = domContainer.children[0];
  const forkSection = forkContainer.children[0];
  const sceneGroup = scene.children[0];
  const domList = section.children[0], domAux = section.children[1];
  const forkList = forkSection.children[0], threeList = sceneGroup.children[0];
  assert.deepEqual(order(domList, "dom"), [1, 2]);
  assert.deepEqual(order(threeList, "three"), [1, 2]);
  assert.equal(text(section.children[2]), "waiting");
  assert.equal(sceneGroup.children[2].name, "waiting");
  const oldDomB = domList.children[1], oldThreeB = threeList.children[1];
  const oldForkB = forkList.children[1];
  const ownerFor = (root, kind, key) => {
    const world = root.world;
    const appName = kind === "dom" ? "DomApp" : "ThreeApp";
    const listName = kind === "dom" ? "DomList" : "ThreeList";
    const rowName = kind === "dom" ? "DomRow" : "ThreeRow";
    const rootOwner = world.findOwner(null, `@component-root:${root.rootId}`);
    assert.ok(rootOwner, "missing root owner");
    const appSite = componentSites[appName];
    const appOwner = world.findOwner(rootOwner, appSite, `@slot:${appSite}:0`);
    assert.ok(appOwner, "missing app owner");
    const listOwner = world.findOwner(appOwner, componentSites[listName], "list");
    assert.ok(listOwner, "missing collection owner");
    return world.findOwner(listOwner,
      `${componentSites[rowName]}\u0000collection:${collectionSites[listName]}`, key);
  };
  const oldDomBOwner = ownerFor(domRoot, "dom", "b");
  const oldThreeBOwner = ownerFor(three.root, "three", "b");
  const oldForkBOwner = ownerFor(forkRoot, "dom", "b");
  assert.ok(oldDomBOwner && oldThreeBOwner && oldForkBOwner,
    "initial keyed row owners are missing");
  queue = new NativeRootWorkQueue({ maxStaleRetries: 0 });

  for (const collection of [app.domRows, app.threeRows]) change(collection, [
    { type: "insert", key: "c", value: storeRecord({ id: "c", value: 3 }), beforeKey: "b" },
    { type: "replace", key: "b", value: storeRecord({ id: "b", value: 20 }) },
  ]);
  const preparedDom = domRoot.prepareCollections([app.domRows]);
  const preparedThree = three.root.prepareCollections([app.threeRows]);
  assert.ok(preparedDom && preparedThree, "compiled insert/replace did not prepare");
  for (const collection of [app.domAux, app.threeAux]) change(collection, [
    { type: "replace", key: "q", value: storeRecord({ id: "q", value: 6 }) },
  ]);
  const intervening = queue.enqueueTransaction({ id: `closed-aux-${randomUUID()}`,
    roots: [
      { root: domRoot, cells: [], collections: [app.domAux] },
      { root: three.root, cells: [], collections: [app.threeAux] },
    ],
  });
  assert.equal(intervening.status, "committed", "independent accepted rows did not publish");
  assert.equal(preparedDom.validate(), true, "unrelated DOM acceptance invalidated row cut");
  assert.equal(preparedThree.validate(), true, "unrelated Three acceptance invalidated row cut");
  preparedDom.discard();
  preparedThree.discard();
  assert.deepEqual(order(domAux, "dom"), [6]);
  assert.deepEqual(order(domList, "dom"), [1, 2]);

  const before = [domRoot.publicationVersion, three.root.publicationVersion];
  const work = queue.enqueueTransaction({ id: `closed-main-${randomUUID()}`,
    roots: [
      { root: domRoot, cells: [], collections: [app.domRows] },
      { root: three.root, cells: [], collections: [app.threeRows] },
    ], pending: ["ready"],
  });
  assert.equal(work.status, "pending");
  assert.deepEqual(order(domList, "dom"), [1, 2]);
  assert.deepEqual(order(threeList, "three"), [1, 2]);
  work.resolve("ready");
  assert.equal(work.status, "committed", "DOM/Three closed row group did not publish");
  assert.deepEqual([domRoot.publicationVersion, three.root.publicationVersion],
    before.map((version) => version + 1));
  assert.deepEqual(order(domList, "dom"), [1, 3, 20]);
  assert.deepEqual(order(threeList, "three"), [1, 3, 20]);
  assert.equal(domList.children[2], oldDomB, "same-key replacement lost DOM host identity");
  assert.equal(threeList.children[2], oldThreeB, "same-key replacement lost Three host identity");
  assert.equal(ownerFor(domRoot, "dom", "b"), oldDomBOwner);
  assert.equal(ownerFor(three.root, "three", "b"), oldThreeBOwner);
  assert.deepEqual(order(forkList, "dom"), [1, 2], "unselected fork advanced");
  assert.equal(forkList.children[1], oldForkB);
  assert.equal(text(section.children[2]), "waiting", "independent resource branch advanced");
  assert.equal(sceneGroup.children[2].name, "waiting");
  assert.equal(domRoot.diagnostics().pendingChangeCount, 0);
  assert.equal(three.root.diagnostics().pendingChangeCount, 0);
  assert.ok(forkRoot.diagnostics().pendingChangeCount > 0);
  const forkCandidate = forkRoot.prepareCollections([app.domRows]);
  assert.ok(forkCandidate, "older fork could not accept its own source history");
  accept(forkCandidate);
  assert.deepEqual(order(forkList, "dom"), [1, 3, 20]);
  assert.equal(forkList.children[2], oldForkB);
  assert.equal(ownerFor(forkRoot, "dom", "b"), oldForkBOwner);
  assert.equal(forkRoot.diagnostics().pendingChangeCount, 0);

  for (const collection of [app.domRows, app.threeRows]) change(collection, [
    { type: "remove", key: "b" },
  ]);
  const remove = queue.enqueueTransaction({ id: `closed-remove-${randomUUID()}`,
    roots: [
      { root: domRoot, cells: [], collections: [app.domRows] },
      { root: three.root, cells: [], collections: [app.threeRows] },
    ],
  });
  assert.equal(remove.status, "committed");
  assert.equal(ownerFor(domRoot, "dom", "b"), undefined);
  assert.equal(ownerFor(three.root, "three", "b"), undefined);
  for (const collection of [app.domRows, app.threeRows]) change(collection, [
    { type: "insert", key: "b", value: storeRecord({ id: "b", value: 30 }) },
  ]);
  const reinsert = queue.enqueueTransaction({ id: `closed-reinsert-${randomUUID()}`,
    roots: [
      { root: domRoot, cells: [], collections: [app.domRows] },
      { root: three.root, cells: [], collections: [app.threeRows] },
    ],
  });
  assert.equal(reinsert.status, "committed");
  assert.deepEqual(order(domList, "dom"), [1, 3, 30]);
  assert.deepEqual(order(threeList, "three"), [1, 3, 30]);
  assert.notEqual(domList.children[2], oldDomB, "remove/reinsert reused DOM lifetime");
  assert.notEqual(threeList.children[2], oldThreeB, "remove/reinsert reused Three lifetime");
  assert.notEqual(ownerFor(domRoot, "dom", "b"), oldDomBOwner,
    "remove/reinsert reused DOM owner lifetime");
  assert.notEqual(ownerFor(three.root, "three", "b"), oldThreeBOwner,
    "remove/reinsert reused Three owner lifetime");

  change(app.domRows, [{ type: "replace", key: "a",
    value: storeRecord({ id: "a", value: 10 }) }]);
  const stale = domRoot.prepareCollections([app.domRows]);
  assert.ok(stale);
  change(app.domRows, [{ type: "replace", key: "a",
    value: storeRecord({ id: "a", value: 11 }) }]);
  assert.equal(stale.validate(), false, "newer same-source action did not revoke candidate");
  stale.discard();
  const latest = queue.enqueueCollections({ id: `closed-latest-${randomUUID()}`,
    roots: [{ root: domRoot, collections: [app.domRows] }],
  });
  assert.equal(latest.status, "committed");
  assert.deepEqual(order(domList, "dom"), [11, 3, 30]);
  assert.ok(forkRoot.diagnostics().pendingChangeCount > 0,
    "latest source actions were acknowledged for unselected fork");

  const opaqueHost = new MemoryVDOMHost();
  const opaqueContainer = opaqueHost.createContainer();
  opaqueRoot = createNativeRoot(opaqueHost, opaqueContainer, {
    rootId: `closed-rows-opaque-${randomUUID()}`, scheduleCommit() {},
    renderPreparation: "repeatable",
  });
  opaqueRoot.mount(jsx(app.OpaqueList, {}));
  const opaqueCalls = app.trace.opaqueCalls;
  change(app.opaqueRows, [{ type: "insert", key: "p",
    value: storeRecord({ id: "p", value: 9 }) }]);
  assert.equal(opaqueRoot.prepareCollections([app.opaqueRows]), null,
    "opaque authored row gained a closed insertion cut");
  assert.equal(app.trace.opaqueCalls, opaqueCalls,
    "declined closed preparation invoked unknown row callback");
  assert.equal(opaqueRoot.flush(), true, "generic opaque insertion did not reconcile");
  assert.deepEqual(order(opaqueContainer.children[0], "dom"), [1, 9]);
  assert.ok(app.trace.opaqueCalls > opaqueCalls,
    "generic fallback did not invoke opaque row helper");

  const unownedHost = new MemoryVDOMHost();
  const unownedContainer = unownedHost.createContainer();
  unownedRoot = createNativeRoot(unownedHost, unownedContainer, {
    rootId: `closed-rows-unowned-${randomUUID()}`, scheduleCommit() {},
    renderPreparation: "repeatable",
  });
  unownedRoot.mount(jsx(app.UnownedList, {}));
  change(app.unownedRows, [{ type: "insert", key: "z",
    value: Object.freeze({ id: "z", value: 7 }) }]);
  assert.equal(unownedRoot.prepareCollections([app.unownedRows]), null,
    "plain frozen row gained closed admission");
  assert.equal(unownedRoot.flush(), true);
  assert.deepEqual(order(unownedContainer.children[0], "dom"), [1, 7]);
  let proxyReads = 0;
  const proxyValue = new Proxy(Object.freeze({ id: "p", value: 8 }), {
    get(target, key, receiver) {
      proxyReads++;
      return Reflect.get(target, key, receiver);
    },
    getOwnPropertyDescriptor(target, key) {
      proxyReads++;
      return Reflect.getOwnPropertyDescriptor(target, key);
    },
  });
  change(app.unownedRows, [{ type: "insert", key: "p", value: proxyValue }]);
  const beforeProxyPreparation = proxyReads;
  assert.equal(unownedRoot.prepareCollections([app.unownedRows]), null,
    "unowned Proxy wrapper gained closed admission");
  assert.equal(proxyReads, beforeProxyPreparation,
    "closed preparation invoked unowned Proxy traps");
  assert.equal(unownedRoot.flush(), true);
  assert.deepEqual(order(unownedContainer.children[0], "dom"), [1, 7, 8]);
  const accessorValue = { id: "g" };
  let accessorReads = 0;
  Object.defineProperty(accessorValue, "value", { enumerable: true,
    get() { accessorReads++; return 10; },
  });
  change(app.unownedRows, [{ type: "insert", key: "g", value: accessorValue }]);
  assert.equal(unownedRoot.prepareCollections([app.unownedRows]), null,
    "unowned accessor row gained closed admission");
  assert.equal(accessorReads, 0,
    "closed preparation invoked unowned accessor getter");
  assert.equal(unownedRoot.flush(), true);
  assert.deepEqual(order(unownedContainer.children[0], "dom"), [1, 7, 8, 10]);
  assert.ok(accessorReads > 0, "generic fallback did not invoke accessor row getter");

  class FailingHost extends MemoryVDOMHost {
    failNextRowWrite = false;
    setProp(node, name, value, previous) {
      super.setProp(node, name, value, previous);
      if (this.failNextRowWrite && name === "data-value") {
        this.failNextRowWrite = false;
        throw new Error("closed-row-host-partial");
      }
    }
  }
  const failingHost = new FailingHost();
  const failingContainer = failingHost.createContainer();
  failingRoot = createNativeRoot(failingHost, failingContainer, {
    rootId: `closed-rows-failing-${randomUUID()}`, scheduleCommit() {},
  });
  failingRoot.mount(jsx(app.FailingList, {}));
  const acceptedVersions = [domRoot.publicationVersion, failingRoot.publicationVersion];
  const acceptedSnapshots = [JSON.stringify(domRoot.snapshot),
    JSON.stringify(failingRoot.snapshot)];
  change(app.domAux, [{ type: "replace", key: "q",
    value: storeRecord({ id: "q", value: 7 }) }]);
  change(app.failingRows, [{ type: "replace", key: "f",
    value: storeRecord({ id: "f", value: 2 }) }]);
  failingHost.failNextRowWrite = true;
  const failed = queue.enqueueTransaction({ id: `closed-failed-${randomUUID()}`,
    roots: [
      { root: domRoot, cells: [], collections: [app.domAux] },
      { root: failingRoot, cells: [], collections: [app.failingRows] },
    ],
  });
  assert.equal(failed.status, "failed", "partial row host write did not fail group");
  assert.match(String(failed.resolution?.error), /closed-row-host-partial/);
  assert.deepEqual([domRoot.publicationVersion, failingRoot.publicationVersion], acceptedVersions,
    "partial group advanced managed acceptance");
  assert.equal(JSON.stringify(domRoot.snapshot), acceptedSnapshots[0]);
  assert.equal(JSON.stringify(failingRoot.snapshot), acceptedSnapshots[1]);
  assert.throws(() => failingRoot.update(jsx(app.FailingList, {})),
    /terminal|failed|failure|quarantin/i,
    "failed host accepted later work without remount");

  await writeFile(path.join(directory, "result.json"), JSON.stringify({
    status: "PASS", compilerProof,
    groupVersions: [domRoot.publicationVersion, three.root.publicationVersion],
    forkVersion: forkRoot.publicationVersion,
    acceptedDom: order(domList, "dom"), acceptedThree: order(threeList, "three"),
    forkPending: forkRoot.diagnostics().pendingChangeCount,
  }, null, 2) + "\n", { flag: "wx" });
} catch (error) {
  primaryError = error;
} finally {
  for (const dispose of [() => queue?.dispose(), () => domRoot?.dispose(),
    () => forkRoot?.dispose(), () => opaqueRoot?.dispose(),
    () => unownedRoot?.dispose(),
    () => failingRoot?.dispose(), () => three?.dispose(),
    () => plugin.closeBundle?.call(context)]) {
    try { await dispose(); } catch (error) { cleanupErrors.push(error); }
  }
}
if (primaryError || cleanupErrors.length) {
  await writeFile(path.join(directory, "failure.json"), JSON.stringify({
    status: "FAIL", primaryError: primaryError ? String(primaryError.stack ?? primaryError) : null,
    cleanupErrors: cleanupErrors.map((error) => String(error.stack ?? error)),
  }, null, 2) + "\n", { flag: "wx" }).catch(() => {});
}
if (primaryError && cleanupErrors.length) throw new AggregateError(
  [primaryError, ...cleanupErrors], "Closed row fixture and cleanup failed", { cause: primaryError });
if (primaryError) throw primaryError;
if (cleanupErrors.length) throw new AggregateError(cleanupErrors, "Closed row cleanup failed");
console.log(`PASS actual compiled closed collection rows; provenance: ${directory}`);
