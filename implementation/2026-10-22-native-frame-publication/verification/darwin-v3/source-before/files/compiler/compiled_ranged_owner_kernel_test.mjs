import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { stripTypeScriptTypes } from "node:module";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { parse } from "@babel/parser";
import * as THREE from "three";
import { createNativeRoot, jsx } from "../src/native_runtime_api.ts";
import { MemoryVDOMHost, VDOMSnapshotRoot } from "../src/vdom_snapshot_runtime.ts";
import { createThreeNativeRoot } from "../src/three_host.ts";
import { nativeModulePlugin } from "./vite_native_plugin.ts";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const artifact = path.join(rootDir, ".cache", `compiled-ranged-owner-${randomUUID()}`);
const binary = path.join(rootDir, "compiler/oxc-spike/target/debug/ui-graph-compiler-spike");
const runtimeUrl = pathToFileURL(path.join(rootDir, "src/native_runtime_api.ts")).href;
const sha = bytes => createHash("sha256").update(bytes).digest("hex");
const authored = `import { useEffect, useState } from ${JSON.stringify(runtimeUrl)};
export const trace = { position: {}, rotation: {}, opaque: null, scene: null, opaqueCalls: 0 };
export function opaque(value) { trace.opaqueCalls++; return value; }
export function Position({ id }) {
  const [x, setX] = useState(0);
  const [y, setY] = useState(0);
  useEffect(() => { trace.position[id] = { x: setX, y: setY }; });
  const shared = (x + 1) * (y + 2);
  return <i data-row={id} data-a={shared + 3} data-b={shared * 2} data-sign={x * 1} />;
}
export function Rotation({ id }) {
  const [angle, setAngle] = useState(0);
  useEffect(() => { trace.rotation[id] = setAngle; });
  const shared = (angle + 1) * (angle + 2);
  return <i data-row={id} data-r={shared + 1} data-s={shared * 2} data-angle={angle * 1} />;
}
export function Opaque() {
  const [value, setValue] = useState(0);
  useEffect(() => { trace.opaque = setValue; });
  return <i data-row="opaque" data-value={opaque(value)} />;
}
export function Board() {
  return <section><Position key="p0" id="p0" /><Rotation key="r0" id="r0" />
    <Position key="p1" id="p1" /><Rotation key="r1" id="r1" /><Opaque key="opaque" /></section>;
}
export function Scene() {
  const [x, setX] = useState(0);
  useEffect(() => { trace.scene = setX; });
  return <mesh position={[x, 0, 0]}><boxGeometry args={[1, 1, 1]} />
    <meshStandardMaterial roughness={x * 0.1} /></mesh>;
}`;
const field = (node, name) => node?.type === "ObjectExpression" ?
  node.properties.find(entry => entry.type === "ObjectProperty" && !entry.computed &&
    (entry.key.name ?? entry.key.value) === name)?.value ?? null : null;
const visit = (node, callback) => {
  if (!node || typeof node !== "object") return;
  callback(node);
  for (const [key, value] of Object.entries(node)) {
    if (["loc", "start", "end", "extra", "comments"].includes(key)) continue;
    if (Array.isArray(value)) value.forEach(child => visit(child, callback));
    else if (value && typeof value === "object") visit(value, callback);
  }
};
const find = (node, predicate) => {
  const found = [];
  visit(node, item => { if (predicate(item)) found.push(item); });
  return found;
};
const hostNode = (container, id) => {
  const pending = [container];
  while (pending.length) {
    const node = pending.pop();
    if (node.props?.["data-row"] === id) return node;
    pending.push(...(node.children ?? []));
  }
  return null;
};
const same = (actual, expected, label) =>
  assert.ok(Object.is(actual, expected), `${label}: expected ${String(expected)}, got ${String(actual)}`);
const checkPosition = (node, x, y, label) => {
  const shared = (x + 1) * (y + 2);
  assert.ok(node, `${label} exists`);
  same(node.props["data-a"], shared + 3, `${label} a`);
  same(node.props["data-b"], shared * 2, `${label} b`);
  same(node.props["data-sign"], x * 1, `${label} signed`);
};
const checkRotation = (node, angle, label) => {
  const shared = (angle + 1) * (angle + 2);
  assert.ok(node, `${label} exists`);
  same(node.props["data-r"], shared + 1, `${label} r`);
  same(node.props["data-s"], shared * 2, `${label} s`);
  same(node.props["data-angle"], angle * 1, `${label} angle`);
};

const plugin = nativeModulePlugin({ root: rootDir, compilerBinary: binary });
plugin.configResolved?.call({}, { root: rootDir });
const context = {
  addWatchFile() {},
  async resolve(specifier) {
    return specifier === runtimeUrl ? { id: path.join(rootDir, "src/native_runtime_api.ts") } : null;
  },
  error(message) { throw new Error(String(message)); },
};
const originalExecute = VDOMSnapshotRoot.prototype.executePreparedNumericRows;
const cuts = [];
let native, three;
let telemetryKey;
try {
  await mkdir(artifact, { recursive: true });
  const compilerSha256 = sha(await readFile(binary));
  const sourcePath = path.join(artifact, "authored.tsx");
  const originalPath = path.join(artifact, "compiled-original.mjs");
  const emittedPath = path.join(artifact, "compiled-instrumented.mjs");
  await writeFile(sourcePath, authored, { flag: "wx" });
  const transformed = await plugin.transform.call(context, authored, sourcePath);
  assert.ok(transformed?.code, "actual Rust/OXC compilation succeeded");
  await writeFile(originalPath, transformed.code, { flag: "wx" });
  const ast = parse(transformed.code, { sourceType: "module", plugins: ["typescript", "jsx"] });
  const arrays = new Map();
  const tableStatements = [];
  for (const statement of ast.program.body) {
    if (statement.type !== "VariableDeclaration") continue;
    for (const declaration of statement.declarations) {
      if (!/^__nativeOwnerCutKernels/.test(declaration.id?.name ?? "")) continue;
      arrays.set(declaration.id.name, declaration.init);
      tableStatements.push({ end: statement.end, name: declaration.id.name });
    }
  }
  assert.ok(tableStatements.length > 0, "emitted owner kernel table is present");
  telemetryKey = `__r3actRangedFixture_${randomUUID().replaceAll("-", "")}`;
  const cutTelemetry = [];
  globalThis[telemetryKey] = cutTelemetry;
  let instrumented = transformed.code;
  for (const { end, name } of tableStatements.sort((left, right) => right.end - left.end)) {
    const hook = `\nfor (const kernel of ${name}) { const original = kernel.executeCut; kernel.executeCut = function(...args) { const entry = { programId: kernel.programId, changedSlots: args[0], rowStates: args[2], inputIndices: args[3], sinkIds: args[4], values: args[5], inputStart: args[6], outputStart: args[7], changeCount: args[1] }; const result = original.apply(this, args); entry.appended = result; globalThis[${JSON.stringify(telemetryKey)}].push(entry); return result; }; }\n`;
    instrumented = instrumented.slice(0, end) + hook + instrumented.slice(end);
  }
  await writeFile(emittedPath, instrumented, { flag: "wx" });
  const registrations = new Map();
  for (const call of find(ast.program, node => node.type === "CallExpression" &&
    /^__nativeDefineComponent_*$/.test(node.callee?.name ?? ""))) {
    const site = call.arguments[0]?.value;
    if (typeof site === "string") registrations.set(site.split("#component:").at(-1),
      { site, metadata: call.arguments[2] });
  }
  const kernels = {};
  const sinkCounts = {};
  for (const name of ["Position", "Rotation"]) {
    const registration = registrations.get(name);
    const ref = field(registration?.metadata, "ownerUpdateProgram");
    assert.equal(ref?.type, "MemberExpression", `${name} has actual emitted owner program`);
    const kernel = arrays.get(ref.object.name)?.elements?.[ref.property.value];
    assert.equal(field(kernel, "programId")?.value, registration.site);
    assert.equal(field(kernel, "schemaVersion")?.value, 4, `${name} emits ranged schema 4`);
    sinkCounts[name] = field(kernel, "sinkIds")?.elements?.length;
    assert.ok(Number.isInteger(sinkCounts[name]) && sinkCounts[name] > 0);
    const executeCut = field(kernel, "executeCut");
    assert.equal(executeCut?.type, "FunctionExpression");
    assert.equal(executeCut.params.length, 8);
    for (const [index, expected] of [[6, "inputStart"], [7, "outputStart"]]) {
      assert.equal(executeCut.params[index].type, "AssignmentPattern");
      assert.equal(executeCut.params[index].left.name, expected);
      assert.equal(executeCut.params[index].right.value, 0);
    }
    assert.equal(find(executeCut.body, node => node.type === "VariableDeclarator" &&
      node.id?.name === "changeIndex" && node.init?.operator === "+" &&
      node.init.left?.name === "inputStart" && node.init.right?.name === "localIndex").length, 1);
    assert.equal(find(executeCut.body, node => node.type === "VariableDeclarator" &&
      node.id?.name === "stagedCount" && node.init?.name === "outputStart").length, 1);
    assert.equal(find(executeCut.body, node => node.type === "ReturnStatement" &&
      node.argument?.operator === "-" && node.argument.left?.name === "stagedCount" &&
      node.argument.right?.name === "outputStart").length, 1);
    assert.ok(find(executeCut.body, node => node.type === "AssignmentExpression" &&
      node.left?.type === "MemberExpression" && node.left.object?.name === "stagedInputIndices" &&
      node.left.property?.name === "stagedCount" && node.right?.name === "changeIndex").length > 0);
    const actualSource = transformed.code.slice(executeCut.start, executeCut.end);
    kernels[name] = Function(`"use strict"; return ${stripTypeScriptTypes(`(${actualSource})`, { mode: "strip" })};`)();
    if (name === "Position") {
      const dagTemps = find(executeCut.body, node => node.type === "VariableDeclarator" &&
        /^\$r3actDag\d+$/.test(node.id?.name ?? ""));
      assert.ok(dagTemps.some(temp => find(executeCut.body, node => node.type === "Identifier" &&
        node.name === temp.id.name).length >= 3), "shared numeric DAG survives ranged emission");
    }
  }
  assert.equal(field(registrations.get("Opaque")?.metadata, "ownerUpdateProgram"), null);
  const rowState = { seenMask: 0, inputValues: [2, 3],
    sinks: Array.from({ length: sinkCounts.Position }, () => ({ lastValue: NaN })) };
  const slots = Uint32Array.of(99, 99, 0, 99);
  const rows = [{ seenMask: 0, inputValues: [], sinks: [] }, null, rowState, null];
  const indices = Uint32Array.of(701, 702, 703, 704, 705, 706);
  const sinks = Uint16Array.of(801, 802, 803, 804, 805, 806);
  const values = ["prefix-a", "prefix-b", "prefix-c", "tail-a", "tail-b", "tail-c"];
  const appended = kernels.Position(slots, 1, rows, indices, sinks, values, 2, 3);
  assert.ok(appended > 0 && appended <= 3, "nonzero input/output range appends outputs");
  assert.deepEqual(Array.from(indices.slice(0, 3)), [701, 702, 703]);
  assert.deepEqual(Array.from(sinks.slice(0, 3)), [801, 802, 803]);
  assert.deepEqual(values.slice(0, 3), ["prefix-a", "prefix-b", "prefix-c"]);
  assert.ok(indices.slice(3, 3 + appended).every(index => index === 2),
    "all staged input indices remain absolute");
  const defaultRows = [{ seenMask: 0, inputValues: [2, 3],
    sinks: Array.from({ length: rowState.sinks.length }, () => ({ lastValue: NaN })) }];
  const defaultIndices = new Uint32Array(sinkCounts.Position);
  const defaultSinks = new Uint16Array(sinkCounts.Position);
  const defaultValues = [];
  const defaultCount = kernels.Position(Uint32Array.of(0), 1, defaultRows,
    defaultIndices, defaultSinks, defaultValues);
  assert.equal(defaultCount, appended, "omitted offsets preserve legacy call shape");
  assert.deepEqual(Array.from(defaultIndices.slice(0, appended)), Array(appended).fill(0));
  assert.deepEqual(Array.from(defaultSinks.slice(0, appended)),
    Array.from(sinks.slice(3, 3 + appended)));
  assert.deepEqual(defaultValues.slice(0, appended), values.slice(3, 3 + appended));

  const app = await import(pathToFileURL(emittedPath).href);
  VDOMSnapshotRoot.prototype.executePreparedNumericRows = function (
    tokens, changedRowIndices, changedSlots, inputValues, count,
  ) {
    const cut = { count, slots: Array.from(changedSlots.slice(0, count)),
      rows: Array.from(changedRowIndices.slice(0, count)) };
    const result = originalExecute.call(this, tokens, changedRowIndices, changedSlots, inputValues, count);
    cut.accepted = result !== null;
    cuts.push(cut);
    return result;
  };
  const host = new MemoryVDOMHost();
  const container = host.createContainer();
  const originalSet = host.setProp.bind(host);
  let reenter = null;
  const writes = [];
  host.setProp = (node, name, value, previous) => {
    if (node.props?.["data-row"] === "p0") writes.push(name);
    originalSet(node, name, value, previous);
    if (reenter && node.props?.["data-row"] === "p0" && name === "data-a") {
      const action = reenter; reenter = null; action();
    }
  };
  native = createNativeRoot(host, container, { rootId: `ranged-${path.basename(artifact)}`, scheduleCommit() {} });
  native.mount(jsx(app.Board, {}));
  const p0 = hostNode(container, "p0"), p1 = hostNode(container, "p1");
  const r0 = hostNode(container, "r0"), r1 = hostNode(container, "r1");
  const opaque = hostNode(container, "opaque");
  checkPosition(p0, 0, 0, "initial p0"); checkRotation(r0, 0, "initial r0");
  assert.equal(app.trace.position.p0.x(-0), true);
  assert.equal(app.trace.position.p0.y(4), true);
  assert.equal(app.trace.rotation.r0(3), true);
  assert.equal(app.trace.position.p1.x(5), true);
  assert.equal(app.trace.rotation.r1(6), true);
  writes.length = 0;
  const beforeHeterogeneous = cutTelemetry.length;
  assert.equal(native.flush(), true);
  checkPosition(p0, -0, 4, "heterogeneous p0");
  checkRotation(r0, 3, "heterogeneous r0");
  checkPosition(p1, 5, 0, "heterogeneous p1");
  checkRotation(r1, 6, "heterogeneous r1");
  assert.deepEqual(cuts.at(-1)?.slots, [0, 1, 0, 0, 0], "multi-input source order survives");
  assert.equal(cuts.at(-1)?.accepted, true);
  const heterogeneousCalls = cutTelemetry.slice(beforeHeterogeneous);
  assert.ok(heterogeneousCalls.length >= 4, "alternating owners execute separate ranged kernels");
  assert.ok(new Set(heterogeneousCalls.map(call => call.programId)).size >= 2);
  for (const key of ["changedSlots", "rowStates", "inputIndices", "sinkIds", "values"])
    assert.ok(heterogeneousCalls.every(call => call[key] === heterogeneousCalls[0][key]),
      `${key} is shared across heterogeneous runs`);
  assert.ok(heterogeneousCalls.some(call => call.inputStart > 0 && call.outputStart > 0),
    "later heterogeneous runs receive nonzero input/output offsets");
  assert.ok(heterogeneousCalls.every(call => Number.isInteger(call.appended) && call.appended >= 0));
  assert.deepEqual(writes.filter(name => ["data-a", "data-b", "data-sign"].includes(name)),
    ["data-a", "data-b", "data-sign"], "host writes retain authored sink order");
  assert.equal(hostNode(container, "p0"), p0); assert.equal(hostNode(container, "r0"), r0);
  assert.equal(app.trace.position.p0.y(10), true);
  assert.equal(app.trace.position.p0.x(2), true);
  assert.equal(native.flush(), true);
  checkPosition(p0, 2, 10, "reverse source order");
  assert.deepEqual(cuts.at(-1)?.slots, [1, 0]);
  reenter = () => assert.equal(app.trace.position.p0.x(9), true);
  assert.equal(app.trace.position.p0.x(8), true);
  assert.equal(native.flush(), true);
  checkPosition(p0, 8, 10, "first reentrant publication");
  assert.equal(native.flush(), true);
  checkPosition(p0, 9, 10, "newer reentrant action");
  const beforeFallback = cuts.length, beforeOpaque = app.trace.opaqueCalls;
  assert.equal(app.trace.opaque(7), true);
  assert.equal(native.flush(), true);
  assert.equal(opaque.props["data-value"], 7);
  assert.ok(app.trace.opaqueCalls > beforeOpaque);
  assert.equal(cuts.length, beforeFallback, "opaque owner uses generic fallback");
  assert.equal(app.trace.position.p0.x("wide"), true);
  assert.equal(native.flush(), true);
  checkPosition(p0, "wide", 10, "promoted generic fallback");
  assert.equal(hostNode(container, "p0"), p0);

  const scene = new THREE.Scene();
  three = createThreeNativeRoot(scene, { namespace: THREE,
    rootOptions: { rootId: `ranged-three-${path.basename(artifact)}`, scheduleCommit() {} } });
  three.root.mount(jsx(app.Scene, {}));
  const mesh = scene.children.find(item => item instanceof THREE.Mesh);
  assert.ok(mesh?.material instanceof THREE.MeshStandardMaterial);
  const position = mesh.position, material = mesh.material;
  assert.equal(app.trace.scene(4), true);
  assert.equal(three.root.flush(), true);
  same(mesh.position.x, 4, "Three position");
  same(mesh.material.roughness, 0.4, "Three roughness");
  assert.equal(mesh.position, position); assert.equal(mesh.material, material);
  three.dispose(); three = undefined;
  assert.equal(scene.children.length, 0);
  native.dispose(); native = undefined;
  assert.equal(container.children.length, 0, "Memory host tears down");
  const proof = { schemaVersion: 1, status: "PASS", compilerSha256,
    authoredSha256: sha(authored), transformedSha256: sha(transformed.code),
    instrumentedSha256: sha(instrumented),
    sourcePath: path.relative(rootDir, sourcePath), originalPath: path.relative(rootDir, originalPath),
    instrumentedPath: path.relative(rootDir, emittedPath),
    appended, defaultCount, cuts,
    assertions: { actualRustOxcAst: true, schemas4: true, rangedOffsets: true,
      absoluteInputIndices: true, preservedPrefix: true, defaultSixArguments: true,
      sharedDag: true, heterogeneousMemoryUpdates: true, sharedWholeCutBuffers: true,
      nonzeroRuntimeOffsets: true, sourceOrder: true,
      reentry: true, genericFallback: true, memoryAndThreeLifetime: true },
    boundary: "Actual compiled Memory ranged kernels and public Memory/Three values; Three owner may use generic resource path; no timing claim." };
  await writeFile(path.join(artifact, "result.json"), JSON.stringify(proof, null, 2) + "\n", { flag: "wx" });
  console.log("Compiled ranged owner kernel PASS:", JSON.stringify(proof));
} catch (error) {
  await writeFile(path.join(artifact, "failure.json"), JSON.stringify({
    status: "FAIL", error: String(error?.stack ?? error), cuts,
  }, null, 2) + "\n").catch(() => {});
  throw error;
} finally {
  VDOMSnapshotRoot.prototype.executePreparedNumericRows = originalExecute;
  if (telemetryKey) delete globalThis[telemetryKey];
  native?.dispose(); three?.dispose(); plugin.closeBundle?.call({});
}
