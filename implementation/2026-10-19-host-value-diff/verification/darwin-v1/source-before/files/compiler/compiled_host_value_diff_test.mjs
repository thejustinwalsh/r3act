import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { parse } from "@babel/parser";
import { transformWithOxc } from "vite";
import * as THREE from "three";
import { nativeModuleCompilerPlugin } from "./vite_native_module.ts";

const project = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const unit = path.join(project, "implementation/2026-10-19-host-value-diff");
const mode = process.argv.includes("--baseline") ? "baseline" : "fixed";
const sha = bytes => createHash("sha256").update(bytes).digest("hex");
const fixture = path.join(project, "compiler/fixtures/native-host-value-diff.tsx");
const artifact = path.join(project, ".cache", `compiled-host-value-diff-${mode}-${randomUUID()}`);
const baseline = mode === "baseline" ? JSON.parse(await readFile(path.join(unit, "baseline/provenance.json"))) : null;
if (baseline) {
  assert.equal(baseline.schemaVersion, 1);
  for (const item of baseline.inputs) {
    const bytes = await readFile(path.join(unit, item.archivedPath));
    assert.equal(bytes.length, item.bytes, `${item.path} archived length changed`);
    assert.equal(sha(bytes), item.sha256, `${item.path} archived hash changed`);
  }
  assert.equal(sha(await readFile(path.join(unit, baseline.compiler.path))), baseline.compiler.sha256);
}
const runtimeModule = baseline
  ? path.join(unit, baseline.nativeModule) : path.join(project, "src/native_runtime_api.ts");
const threeModule = baseline
  ? path.join(unit, baseline.threeModule) : path.join(project, "src/three_host.ts");
const vdomModule = baseline
  ? path.join(unit, baseline.runtimeRoot, "src/vdom_snapshot_runtime.ts")
  : path.join(project, "src/vdom_snapshot_runtime.ts");
const binary = baseline ? path.join(unit, baseline.compiler.path)
  : path.join(project, "compiler/oxc-spike/target/debug/ui-graph-compiler-spike");
const runtimePaths = baseline ? baseline.inputs.map(item => [item.path, path.join(unit, item.archivedPath)])
  : ["src/native_runtime_api.ts", "src/three_host.ts", "src/vdom_snapshot_runtime.ts",
    "src/component_state_runtime.ts", "src/jsx_binding_runtime.ts",
    "src/host_property_contract.ts", "src/three_property_writer.ts"].map(file => [file, path.join(project, file)]);
const runtimeSha256 = Object.fromEntries(await Promise.all(runtimePaths.map(async ([name, file]) =>
  [name, sha(await readFile(file))])));
const source = (await readFile(fixture, "utf8")).replace('"native_runtime_api.ts"',
  JSON.stringify(pathToFileURL(runtimeModule).href));
const receipt = { status: "STARTED", mode, artifact,
  sourceSha256: sha(source), compilerSha256: sha(await readFile(binary)),
  compilerAfterSha256: null, transformedSha256: null, executableSha256: null,
  baselineCommit: baseline?.sourceCommit ?? null, runtimeSha256,
  metadata: {}, stages: [], errors: [] };
const field = (node, name) => node?.properties?.find(item => item.type === "ObjectProperty" &&
  (item.key?.name ?? item.key?.value) === name)?.value;
const literal = node => ["StringLiteral", "NumericLiteral", "BooleanLiteral"].includes(node?.type)
  ? node.value : null;
const visit = (node, callback) => {
  if (!node || typeof node !== "object") return;
  callback(node);
  for (const [name, child] of Object.entries(node)) {
    if (["loc", "start", "end", "extra", "comments"].includes(name)) continue;
    if (Array.isArray(child)) child.forEach(item => visit(item, callback));
    else if (child && typeof child === "object") visit(child, callback);
  }
};
const locate = (node, predicate) => predicate(node) ? node :
  node.children.map(child => locate(child, predicate)).find(Boolean);
const settle = async (root, queue) => {
  for (let turn = 0; turn < 24 && queue.length; turn++) queue.shift()();
  assert.equal(queue.length, 0, "scheduled host-value work did not quiesce");
  root.flush();
};
let app, dom, three, failureRoot, plugin, sourceFile, primaryError;
try {
  await mkdir(artifact, { recursive: true });
  const sourcePath = path.join(artifact, "host-value-diff.tsx");
  await writeFile(sourcePath, source, { flag: "wx" });
  plugin = nativeModuleCompilerPlugin({ root: project, compilerBinary: binary });
  const context = { addWatchFile() {}, error(message) { throw new Error(String(message)); } };
  const transformed = await plugin.transform.call(context, source, sourcePath);
  assert.ok(transformed?.code, "actual Rust/OXC compiler did not transform fixture");
  receipt.transformedSha256 = sha(transformed.code);
  await writeFile(path.join(artifact, "transformed.tsx"), transformed.code, { flag: "wx" });
  const ast = parse(transformed.code, { sourceType: "module", plugins: ["typescript", "jsx"] });
  const owners = new Set();
  visit(ast, node => {
    if (node.type === "CallExpression" && /^__nativeDefineComponent_*$/.test(node.callee?.name ?? "")) {
      const name = literal(node.arguments[0])?.split("#component:")[1];
      if (name) owners.add(name);
    }
    if (node.type === "CallExpression" && node.callee?.name === "__registerNativeSemanticPlan")
      sourceFile = literal(field(node.arguments[0], "source_file"));
  });
  for (const name of ["DomApp", "DomTarget", "ThreeApp", "ThreeTarget", "Row"])
    assert.ok(owners.has(name), `${name} is not an actual compiled component`);
  assert.equal(typeof sourceFile, "string");
  receipt.metadata = { owners: [...owners].sort(), sourceFile };
  const emitted = await transformWithOxc(transformed.code, sourcePath,
    { lang: "tsx", jsx: { runtime: "classic", pragma: "jsx", pragmaFrag: "Fragment" } });
  const modulePath = path.join(artifact, "executable.mjs");
  receipt.executableSha256 = sha(emitted.code);
  await writeFile(modulePath, emitted.code, { flag: "wx" });
  app = await import(pathToFileURL(modulePath).href);
  const runtime = await import(pathToFileURL(runtimeModule).href);
  const threeRuntime = await import(pathToFileURL(threeModule).href);
  const vdom = await import(pathToFileURL(vdomModule).href);
  const domHost = new vdom.MemoryVDOMHost();
  const domContainer = domHost.createContainer();
  const domWrites = [];
  const originalDomProp = domHost.setProp;
  domHost.setProp = function (node, name, value, previous) {
    domWrites.push({ name, value: name === "style" ? { ...value } : value,
      previous: name === "style" && previous ? { ...previous } : previous });
    return originalDomProp.call(this, node, name, value, previous);
  };
  const domQueue = [], threeQueue = [];
  dom = runtime.createNativeRoot(domHost, domContainer,
    { rootId: `host-value-dom-${randomUUID()}`, scheduleCommit(commit) { domQueue.push(commit); } });
  dom.mount(runtime.jsx(app.DomApp, {}));
  const scene = new THREE.Scene();
  three = threeRuntime.createThreeNativeRoot(scene, { namespace: THREE,
    rootOptions: { rootId: `host-value-three-${randomUUID()}`,
      scheduleCommit(commit) { threeQueue.push(commit); } } });
  const threeWrites = [];
  const originalThreeProp = three.host.setProp;
  three.host.setProp = function (handle, name, value, previous) {
    threeWrites.push({ name, value: name === "position" ? value?.toArray?.() ?? value
      : Array.isArray(value) ? [...value] : value });
    return originalThreeProp.call(this, handle, name, value, previous);
  };
  three.root.mount(runtime.jsx(app.ThreeApp, {}));
  const target = locate(domContainer, node => node.props?.["data-step"] === 0);
  const b = locate(domContainer, node => node.props?.["data-row"] === "b");
  const mesh = scene.children[0]?.children.find(child => child.name === "step-0");
  assert.ok(target && b && mesh instanceof THREE.Mesh);
  const capture = name => receipt.stages.push({ name,
    color: target.props.style?.color, opacity: target.props.style?.opacity,
    scalar: target.props["data-scalar"], rowBRetained: locate(domContainer,
      node => node.props?.["data-row"] === "b") === b,
    meshRetained: scene.children[0]?.children.includes(mesh),
    position: mesh.position.toArray(), rotation: mesh.rotation.toArray().slice(0, 3),
    domWrites: domWrites.length, threeWrites: threeWrites.length,
    pending: app.pending.status.status,
    domVersion: dom.publicationVersion, threeVersion: three.root.publicationVersion });
  capture("mount");
  const beforeDom = domWrites.length, beforeThree = threeWrites.length;
  app.values.position.set(4, 5, 6);
  app.values.rotation[1] = 0.5;
  app.values.style.color = "blue";
  delete app.values.style.opacity;
  app.values.scalar = "second";
  assert.equal(app.trace.setDom(1), true);
  assert.equal(app.trace.setThree(1), true);
  await settle(dom, domQueue);
  await settle(three.root, threeQueue);
  capture("mutated-same-reference");
  receipt.mutatedWrites = { dom: domWrites.slice(beforeDom), three: threeWrites.slice(beforeThree) };
  if (mode === "fixed") {
    assert.deepEqual(mesh.position.toArray(), [4, 5, 6]);
    assert.deepEqual(mesh.rotation.toArray().slice(0, 3), [0, 0.5, 0]);
    assert.ok(receipt.mutatedWrites.three.some(item => item.name === "position"));
    assert.ok(receipt.mutatedWrites.three.some(item => item.name === "rotation"));
    const styleWrite = receipt.mutatedWrites.dom.find(item => item.name === "style");
    assert.ok(styleWrite, "mutated style was not written");
    assert.deepEqual(styleWrite.value, { color: "blue" });
    assert.deepEqual(styleWrite.previous, { color: "red", opacity: 1 },
      "style previous value adopted the mutated authored object");
    assert.deepEqual(target.props.style, { color: "blue" });
    assert.ok(!receipt.mutatedWrites.dom.some(item => item.name === "payload"),
      "same-reference opaque custom payload was force-written");
    assert.equal(target.props["data-scalar"], "second");
  }
  const unchangedThree = threeWrites.length, unchangedDom = domWrites.length;
  assert.equal(app.trace.setDom(2), true);
  assert.equal(app.trace.setThree(2), true);
  await settle(dom, domQueue);
  await settle(three.root, threeQueue);
  receipt.unchangedWrites = { dom: domWrites.slice(unchangedDom), three: threeWrites.slice(unchangedThree) };
  if (mode === "fixed") {
    assert.ok(!receipt.unchangedWrites.three.some(item => ["position", "rotation"].includes(item.name)));
    assert.ok(!receipt.unchangedWrites.dom.some(item => item.name === "payload"));
  }
  assert.equal(app.rows.apply(app.rows.version, [
    { type: "move", key: "b", beforeKey: "a" }, { type: "remove", key: "a" },
    { type: "insert", key: "c", beforeKey: null, value: { id: "c", label: "Charlie" } },
  ]).ok, true);
  await settle(dom, domQueue);
  capture("keyed-lifetime");
  if (mode === "fixed") {
    assert.equal(locate(domContainer, node => node.props?.["data-row"] === "b"), b);
    assert.equal(app.trace.cleanups.a, 1);
    assert.equal(app.trace.mounts.c, 1);
  }
  const firstC = locate(domContainer, node => node.props?.["data-row"] === "c");
  assert.ok(firstC, "new keyed row did not mount");
  assert.equal(app.rows.apply(app.rows.version, [
    { type: "remove", key: "c" },
    { type: "insert", key: "c", beforeKey: null, value: { id: "c", label: "Charlie again" } },
  ]).ok, true);
  await settle(dom, domQueue);
  capture("same-key-reinsert");
  if (mode === "fixed") {
    assert.notEqual(locate(domContainer, node => node.props?.["data-row"] === "c"), firstC,
      "same-key reinsertion retained the removed host");
    assert.equal(locate(domContainer, node => node.props?.["data-row"] === "b"), b);
    assert.equal(app.trace.cleanups.c, 1);
    assert.equal(app.trace.mounts.c, 2);
  }
  app.resolveResource("ready");
  for (let turn = 0; turn < 4; turn++)
    await new Promise(done => setTimeout(done, 0));
  await settle(dom, domQueue);
  await settle(three.root, threeQueue);
  capture("independent-reveal");
  if (mode === "fixed") {
    assert.ok(scene.children[0]?.children.some(child => child.name === "ready"));
    assert.equal(locate(domContainer, node => node.props?.["data-pending"] === "ready")?.tag, "span");
    assert.equal(scene.children[0]?.children.includes(mesh), true);
  }
  const previousThreeProp = three.host.setProp;
  let injected = false;
  three.host.setProp = function (handle, name, value, previous) {
    const result = previousThreeProp.call(this, handle, name, value, previous);
    if (!injected && name === "position" && (value?.x ?? value?.[0]) === 7) {
      injected = true;
      app.values.position.set(8, 5, 6);
      app.trace.setThree(4);
    }
    return result;
  };
  try {
    app.values.position.set(7, 5, 6);
    app.trace.setThree(3);
    const first = threeQueue.shift();
    assert.ok(first);
    first();
    receipt.reentry = { injected, afterFirst: mesh.position.toArray(), pending: threeQueue.length };
  } finally { three.host.setProp = previousThreeProp; }
  await settle(three.root, threeQueue);
  capture("host-reentry");
  if (mode === "fixed") {
    assert.equal(injected, true);
    assert.deepEqual(receipt.reentry.afterFirst, [7, 5, 6]);
    assert.ok(receipt.reentry.pending > 0);
    assert.deepEqual(mesh.position.toArray(), [8, 5, 6]);
  }
  const failureHost = new vdom.MemoryVDOMHost();
  const failureContainer = failureHost.createContainer();
  failureRoot = runtime.createNativeRoot(failureHost, failureContainer,
    { rootId: `host-value-failure-${randomUUID()}`, scheduleCommit() {} });
  failureRoot.mount(runtime.jsx(app.DomApp, {}));
  const acceptedVersion = failureRoot.publicationVersion;
  const acceptedSnapshot = JSON.stringify(failureRoot.snapshot);
  const originalFailureProp = failureHost.setProp;
  failureHost.setProp = function (node, name, value, previous) {
    originalFailureProp.call(this, node, name, value, previous);
    if (name === "data-scalar" && value === "boom") throw new Error("host-value-writer-failed");
  };
  app.values.scalar = "boom";
  let hostError = null, terminalError = null;
  app.trace.setDom(9);
  try { failureRoot.flush(); } catch (error) { hostError = String(error); }
  try { failureRoot.flush(); } catch (error) { terminalError = String(error); }
  receipt.hostFailure = { hostError, terminalError,
    acceptedVersion, afterVersion: failureRoot.publicationVersion,
    acceptedUnchanged: JSON.stringify(failureRoot.snapshot) === acceptedSnapshot };
  if (mode === "fixed") {
    assert.match(hostError ?? "", /host-value-writer-failed/);
    assert.ok(terminalError, "failed writer did not quarantine later publication");
    assert.equal(receipt.hostFailure.afterVersion, acceptedVersion);
    assert.equal(receipt.hostFailure.acceptedUnchanged, true);
  }
  receipt.status = mode === "baseline" ? "BASELINE_OBSERVED" : "PASS_COMPILED_HOST_VALUE_DIFF";
} catch (error) {
  primaryError = error;
  receipt.status = "FAIL_OR_INCOMPLETE";
  receipt.errors.push(error instanceof Error ? error.stack ?? String(error) : String(error));
} finally {
  const errors = [];
  for (const target of [dom, failureRoot, three]) try { target?.dispose(); } catch (error) { errors.push(error); }
  try { await plugin?.closeBundle(); } catch (error) { errors.push(error); }
  try {
    receipt.compilerAfterSha256 = sha(await readFile(binary));
    assert.equal(receipt.compilerAfterSha256, receipt.compilerSha256, "compiler changed during execution");
    if (receipt.transformedSha256) assert.equal(
      sha(await readFile(path.join(artifact, "transformed.tsx"))), receipt.transformedSha256);
    if (receipt.executableSha256) assert.equal(
      sha(await readFile(path.join(artifact, "executable.mjs"))), receipt.executableSha256);
  } catch (error) { errors.push(error); }
  for (const [name, file] of runtimePaths) try {
    assert.equal(sha(await readFile(file)), runtimeSha256[name], `runtime drift: ${name}`);
  } catch (error) { errors.push(error); }
  if (app) try {
    for (const [id, count] of Object.entries(app.trace.mounts))
      assert.equal(app.trace.cleanups[id], count, `${id} effect lifetime unbalanced`);
    assert.equal(app.rows.stats().readerCount, 0);
    const domDiagnostics = dom?.diagnostics() ?? null;
    const threeDiagnostics = three?.root.diagnostics() ?? null;
    const failureDiagnostics = failureRoot?.diagnostics() ?? null;
    const threeHostDiagnostics = three?.host.diagnostics ?? null;
    for (const [name, diagnostics] of [["dom", domDiagnostics], ["three", threeDiagnostics],
      ["failure", failureDiagnostics]]) {
      if (diagnostics) assert.equal(diagnostics.ownerCount, 0, `${name} owner leaked`);
    }
    for (const [name, diagnostics] of [["dom", domDiagnostics], ["three", threeDiagnostics]]) {
      if (diagnostics) assert.equal(diagnostics.pendingChangeCount, 0, `${name} work leaked`);
    }
    if (threeHostDiagnostics) {
      assert.equal(threeHostDiagnostics.liveHandles, 0);
      assert.equal(threeHostDiagnostics.liveResources, 0);
    }
    receipt.cleanup = { mounts: app.trace.mounts, cleanups: app.trace.cleanups,
      readers: app.rows.stats().readerCount, domDiagnostics, threeDiagnostics,
      failureDiagnostics, threeHostDiagnostics };
  } catch (error) { errors.push(error); }
  if (errors.length) {
    primaryError = new AggregateError(primaryError ? [primaryError, ...errors] : errors,
      "host-value cleanup failed");
    receipt.status = "FAIL_OR_INCOMPLETE";
    receipt.errors.push(String(primaryError));
  }
  await mkdir(artifact, { recursive: true });
  await writeFile(path.join(artifact, "receipt.json"), JSON.stringify(receipt, null, 2) + "\n", { flag: "wx" });
}
if (primaryError) throw primaryError;
console.log(JSON.stringify({ status: receipt.status, artifact }));
