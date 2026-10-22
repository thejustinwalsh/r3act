import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { parse } from "@babel/parser";
import { transformWithOxc } from "vite";
import { nativeModuleCompilerPlugin } from "./vite_native_module.ts";
import { createNativeRoot, jsx } from "../src/native_runtime_api.ts";
import { invalidateCompiledSemanticPlan } from "../src/compiled_semantic_plan.ts";
import { MemoryVDOMHost } from "../src/vdom_snapshot_runtime.ts";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const unit = path.join(root, "implementation/2026-10-19-collection-owner-effects");
const mode = process.argv.includes("--baseline") ? "baseline" : "fixed";
const sha = bytes => createHash("sha256").update(bytes).digest("hex");
let baseline = null;
if (mode === "baseline") {
  baseline = JSON.parse(await readFile(path.join(unit, "baseline/provenance.json")));
  assert.equal(sha(await readFile(path.join(unit, baseline.copiedPath))), baseline.sha256);
  assert.equal(sha(await readFile(path.join(unit, baseline.copiedReport))), baseline.reportSha256);
}
const binary = mode === "baseline"
  ? path.join(unit, baseline.copiedPath)
  : path.join(root, "compiler/oxc-spike/target/debug/ui-graph-compiler-spike");
const fixture = path.join(root, "compiler/fixtures/native-collection-owner-effects.tsx");
const artifact = path.join(root, ".cache", `compiled-collection-owner-${mode}-${randomUUID()}`);
const runtimeFiles = [
  "src/component_state_runtime.ts", "src/jsx_binding_runtime.ts",
  "src/vdom_snapshot_runtime.ts", "src/compiled_semantic_plan.ts",
  "src/keyed_collection.ts", "src/owner_state_world.ts",
];
const runtimeSha256 = Object.fromEntries(await Promise.all(runtimeFiles.map(async relative =>
  [relative, sha(await readFile(path.join(root, relative)))])));
const source = (await readFile(fixture, "utf8")).replace('"native_runtime_api.ts"',
  JSON.stringify(pathToFileURL(path.join(root, "src/native_runtime_api.ts")).href));
const property = (node, name) => node?.type === "ObjectExpression"
  ? node.properties.find(entry => entry.type === "ObjectProperty" && !entry.computed &&
    (entry.key.name ?? entry.key.value) === name)?.value ?? null : null;
const literal = node => ["StringLiteral", "NumericLiteral", "BooleanLiteral"].includes(node?.type)
  ? node.value : null;
const visit = (node, callback) => {
  if (!node || typeof node !== "object") return;
  callback(node);
  for (const [key, child] of Object.entries(node)) {
    if (["loc", "start", "end", "extra", "comments"].includes(key)) continue;
    if (Array.isArray(child)) child.forEach(item => visit(item, callback));
    else if (child && typeof child === "object") visit(child, callback);
  }
};
const nodes = (node, result = []) => {
  result.push(node);
  for (const child of node?.children ?? []) nodes(child, result);
  return result;
};
const row = (container, id) => nodes(container).find(node => node?.props?.["data-row"] === id);
const sibling = container => nodes(container).find(node => node?.props?.["data-opaque"] !== undefined);
const order = container => nodes(container).filter(node => node?.props?.["data-row"] !== undefined)
  .map(node => node.props["data-row"]);
const plugin = nativeModuleCompilerPlugin({ root, compilerBinary: binary });
const context = { addWatchFile() {}, error(message) { throw new Error(String(message)); } };
const receipt = { mode, status: "STARTED", artifact, sourceSha256: sha(source),
  compilerSha256: sha(await readFile(binary)), baselineSha256: baseline?.sha256 ?? null,
  runtimeSha256, metadata: {}, stages: [], errors: [] };
let app, dom, fork, sourceFile, primaryError;
const pending = [];
const drain = (target = dom) => {
  for (let turn = 0; turn < 24 && pending.length; turn++) pending.shift()();
  assert.equal(pending.length, 0, "scheduled collection work did not quiesce");
  target.flush();
};
const stage = (name, container) => receipt.stages.push({
  name, order: order(container), opaque: sibling(container)?.props["data-opaque"] ?? null,
  opaqueCalls: app.trace.opaqueCalls, getterCalls: app.trace.getterCalls,
  ownerCalls: app.trace.ownerCalls,
  mounts: { ...app.trace.mounts }, cleanups: { ...app.trace.cleanups },
  version: app.opaqueRows.version, pureVersion: app.pureRows.version,
  pending: dom?.diagnostics().pendingChangeCount ?? null,
});
try {
  await mkdir(artifact, { recursive: true });
  const sourcePath = path.join(artifact, "collection-owner-effects.tsx");
  await writeFile(sourcePath, source, { flag: "wx" });
  const transformed = await plugin.transform.call(context, source, sourcePath);
  assert.ok(transformed?.code, "actual Rust/OXC compiler did not transform fixture");
  await writeFile(path.join(artifact, "transformed.tsx"), transformed.code, { flag: "wx" });
  const ast = parse(transformed.code, { sourceType: "module", plugins: ["typescript", "jsx"] });
  const registrations = new Map();
  const collectionOptions = [];
  let plan;
  visit(ast, node => {
    if (node.type === "CallExpression" && node.callee?.name === "__registerNativeSemanticPlan")
      plan = node.arguments[0];
    if (node.type === "CallExpression" && /^__nativeDefineComponent_*$/.test(node.callee?.name ?? "")) {
      const id = literal(node.arguments[0]);
      if (id?.includes("#component:")) registrations.set(id.split("#component:")[1], node);
    }
    if (node.type === "CallExpression" &&
      /^__nativeRenderCollectionAt_*$/.test(node.callee?.name ?? "")) {
      collectionOptions.push({
        id: literal(node.arguments[0]),
        requiresOwnerRender: literal(property(node.arguments.at(-1), "requiresOwnerRender")) ?? false,
      });
    }
  });
  assert.ok(plan);
  sourceFile = literal(property(plan, "source_file"));
  assert.equal(typeof sourceFile, "string");
  assert.equal(path.isAbsolute(sourceFile), false);
  for (const name of ["App", "OpaqueCollection", "PureCollection", "Row"])
    assert.ok(registrations.has(name), `${name} missing compiled owner`);
  receipt.metadata = { sourceFile, collectionOptions,
    owners: [...registrations.keys()].sort() };
  assert.equal(collectionOptions.length, 2, "both authored maps must be lowered");
  if (mode === "fixed") {
    const byOwner = new Map(collectionOptions.map(site => [
      site.id?.match(/#component:([^#]+)#collection:/)?.[1], site.requiresOwnerRender,
    ]));
    assert.deepEqual([...byOwner].sort(), [
      ["OpaqueCollection", true], ["PureCollection", false],
    ], "opaque owner must render while pure collection keeps local delta eligibility");
  }
  const emitted = await transformWithOxc(transformed.code, sourcePath,
    { lang: "tsx", jsx: { runtime: "classic", pragma: "jsx", pragmaFrag: "Fragment" } });
  const modulePath = path.join(artifact, "executable.mjs");
  await writeFile(modulePath, emitted.code, { flag: "wx" });
  app = await import(pathToFileURL(modulePath).href);
  const host = new MemoryVDOMHost(), container = host.createContainer();
  const frames = [];
  dom = createNativeRoot(host, container,
    { rootId: `collection-owner-${randomUUID()}`,
      scheduleCommit(commit) { pending.push(commit); },
      profileCounter(frame) { frames.push(frame); } });
  dom.mount(jsx(app.App, { caption: "first" }));
  const a = row(container, "a"), b = row(container, "b"), c = row(container, "c");
  const p = row(container, "p"), q = row(container, "q");
  const acceptedSibling = sibling(container);
  assert.ok(a && b && c && p && q && acceptedSibling);
  stage("mount", container);
  assert.equal(app.trace.setters.b(7), true);
  drain();
  assert.equal(row(container, "b"), b);
  assert.equal(b.props["data-count"], 7);
  stage("row-state", container);
  const beforePureFrame = frames.length;
  assert.equal(app.pureRows.apply(app.pureRows.version,
    [{ type: "move", key: "q", beforeKey: "p" }]).ok, true);
  drain();
  assert.equal(row(container, "p"), p);
  assert.equal(row(container, "q"), q);
  assert.deepEqual(order(container).slice(-2), ["q", "p"]);
  receipt.purePath = frames.slice(beforePureFrame);
  if (mode === "fixed") {
    assert.equal(receipt.purePath.reduce((sum, frame) =>
      sum + (frame["collection.delta-operations"] ?? 0), 0), 1,
    "safe pure collection did not select exactly one local move");
    assert.equal(receipt.purePath.reduce((sum, frame) =>
      sum + (frame["owner.component-renders"] ?? 0), 0), 0,
    "safe pure collection reexecuted an owner");
  }
  stage("pure-move", container);
  const beforeOpaque = app.trace.opaqueCalls, beforeGetter = app.trace.getterCalls;
  app.trace.value = "B";
  assert.equal(app.opaqueRows.apply(app.opaqueRows.version,
    [{ type: "move", key: "c", beforeKey: "a" }]).ok, true);
  drain();
  stage("opaque-move", container);
  if (mode === "fixed") {
    assert.equal(sibling(container)?.props["data-opaque"], "B");
    assert.equal(sibling(container), acceptedSibling);
    assert.ok(app.trace.opaqueCalls > beforeOpaque);
    assert.ok(app.trace.getterCalls > beforeGetter);
    assert.equal(row(container, "a"), a);
    assert.equal(row(container, "b"), b);
    assert.equal(row(container, "c"), c);
    assert.equal(b.props["data-count"], 7);
  }
  const originalPlace = host.place;
  let injected = false;
  host.place = function (...args) {
    const value = originalPlace.apply(this, args);
    if (!injected) {
      injected = true;
      assert.equal(app.pureRows.apply(app.pureRows.version,
        [{ type: "move", key: "q", beforeKey: "p" }]).ok, true);
    }
    return value;
  };
  try {
    assert.equal(app.pureRows.apply(app.pureRows.version,
      [{ type: "move", key: "p", beforeKey: "q" }]).ok, true);
    assert.ok(pending.length > 0, "first pure move was not scheduled");
    pending.shift()();
    receipt.hostReentry = { injected, collectionVersion: app.pureRows.version,
      orderAfterFirst: order(container).slice(-2), pendingAfterFirst: pending.length };
    if (mode === "fixed") {
      assert.equal(injected, true, "host placement did not inject newer collection action");
      assert.ok(pending.length > 0, "newer host-time action was consumed by old acknowledgement");
    }
  } finally {
    host.place = originalPlace;
  }
  drain();
  if (mode === "fixed") {
    assert.deepEqual(order(container).slice(-2), ["q", "p"]);
    assert.equal(dom.diagnostics().pendingChangeCount, 0);
  }
  stage("host-reentry", container);
  dom.update(jsx(app.App, { caption: "second" }));
  drain();
  stage("intervening-props", container);
  if (mode === "fixed") {
    assert.equal(container.children[0]?.children[0]?.props?.["data-section"], "second");
    assert.deepEqual(order(container).slice(-2), ["q", "p"]);
    assert.equal(row(container, "b"), b);
    assert.equal(b.props["data-count"], 7);
  }
  assert.equal(app.opaqueRows.apply(app.opaqueRows.version,
    [{ type: "remove", key: "a" }]).ok, true);
  drain();
  stage("remove", container);
  if (mode === "fixed") {
    assert.equal(row(container, "a"), undefined);
    assert.equal(app.trace.cleanups.a, 1);
  }
  assert.equal(app.opaqueRows.apply(app.opaqueRows.version, [
    { type: "insert", key: "d", value: { id: "d", label: "Delta" }, beforeKey: "b" },
    { type: "replace", key: "b", value: { id: "b", label: "Bravo" } },
  ]).ok, true);
  drain();
  stage("insert-replace", container);
  if (mode === "fixed") {
    assert.deepEqual(order(container).slice(0, 3), ["c", "d", "b"]);
    assert.equal(row(container, "b")?.props["data-count"], 7);
  }
  const forkHost = new MemoryVDOMHost(), forkContainer = forkHost.createContainer();
  const forkPending = [];
  fork = createNativeRoot(forkHost, forkContainer,
    { rootId: `collection-fork-${randomUUID()}`,
      scheduleCommit(commit) { forkPending.push(commit); } });
  fork.mount(jsx(app.App, { caption: "fork" }));
  stage("fork", container);
  if (mode === "fixed") {
    assert.equal(sibling(forkContainer)?.props["data-opaque"], "B");
    assert.equal(forkContainer.children[0]?.children[0]?.props?.["data-section"], "fork");
    assert.equal(container.children[0]?.children[0]?.props?.["data-section"], "second");
  }
  app.trace.throwGetter = true;
  assert.equal(app.opaqueRows.apply(app.opaqueRows.version,
    [{ type: "move", key: "c", beforeKey: null }]).ok, true);
  let opaqueError = null;
  try { drain(); } catch (error) { opaqueError = String(error); }
  receipt.opaqueThrow = { error: opaqueError,
    acceptedSiblingRetained: sibling(container) === acceptedSibling,
    getterCalls: app.trace.getterCalls, forkPending: forkPending.length };
  if (mode === "fixed") {
    assert.match(opaqueError ?? "", /collection opaque getter failed/);
    assert.equal(sibling(container), acceptedSibling);
  }
  app.trace.throwGetter = false;
  drain();
  const rowGetterBefore = app.trace.rowGetterCalls;
  const acceptedC = row(container, "c");
  app.trace.throwRowGetter = true;
  assert.equal(app.opaqueRows.apply(app.opaqueRows.version,
    [{ type: "move", key: "b", beforeKey: "c" }]).ok, true);
  let rowError = null;
  try { drain(); } catch (error) { rowError = String(error); }
  receipt.rowGetter = { calls: app.trace.rowGetterCalls - rowGetterBefore,
    error: rowError, unchangedCRetained: row(container, "c") === acceptedC };
  if (mode === "fixed") {
    assert.ok(receipt.rowGetter.calls > 0, "unchanged-row mapper getter was suppressed");
    assert.match(rowError ?? "", /collection row getter failed/);
    assert.equal(row(container, "c"), acceptedC);
  }
  const revision = transformed.code.match(/"module_revision"\s*:\s*"([^"]+)"/)?.[1];
  assert.ok(revision);
  assert.equal(invalidateCompiledSemanticPlan(sourceFile, revision), true);
  await Promise.resolve();
  if (mode === "fixed") {
    assert.equal(dom.retired, true);
    assert.equal(fork.retired, true);
  }
  receipt.retired = { dom: dom.retired, fork: fork.retired };
  receipt.status = mode === "fixed" ? "PASS_COMPILED_COLLECTION_OWNER" : "BASELINE_OBSERVED";
} catch (error) {
  primaryError = error;
  receipt.status = "FAIL_OR_INCOMPLETE";
  receipt.errors.push(error instanceof Error ? error.stack ?? String(error) : String(error));
} finally {
  const errors = [];
  for (const target of [dom, fork]) try { target?.dispose(); } catch (error) { errors.push(error); }
  try { await plugin.closeBundle(); } catch (error) { errors.push(error); }
  for (const [relative, expected] of Object.entries(runtimeSha256)) try {
    assert.equal(sha(await readFile(path.join(root, relative))), expected,
      `runtime source changed during ${mode}: ${relative}`);
  } catch (error) { errors.push(error); }
  if (sourceFile) try { invalidateCompiledSemanticPlan(sourceFile); } catch (error) { errors.push(error); }
  if (app) {
    try {
      for (const [id, mounts] of Object.entries(app.trace.mounts))
        assert.equal(app.trace.cleanups[id], mounts, `${id} effect lifetime unbalanced`);
      assert.equal(app.opaqueRows.stats().readerCount, 0);
      assert.equal(app.pureRows.stats().readerCount, 0);
      for (const target of [dom, fork]) if (target) assert.equal(target.diagnostics().ownerCount, 0);
      receipt.cleanup = { mounts: app.trace.mounts, cleanups: app.trace.cleanups,
        opaqueReaders: app.opaqueRows.stats().readerCount,
        pureReaders: app.pureRows.stats().readerCount };
    } catch (error) { errors.push(error); }
  }
  if (errors.length) {
    primaryError = new AggregateError(primaryError ? [primaryError, ...errors] : errors,
      "collection owner cleanup failed");
    receipt.status = "FAIL_OR_INCOMPLETE";
    receipt.errors.push(String(primaryError));
  }
  await writeFile(path.join(artifact, "receipt.json"), JSON.stringify(receipt, null, 2) + "\n",
    { flag: "wx" });
}
if (primaryError) throw primaryError;
console.log(JSON.stringify({ status: receipt.status, artifact }));
