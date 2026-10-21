import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { stripTypeScriptTypes } from "node:module";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { parse } from "@babel/parser";
import * as THREE from "three";
import { createNativeRoot, jsx, inspectCompiledSemanticPlan } from "../src/native_runtime_api.ts";
import { MemoryVDOMHost, VDOMSnapshotRoot } from "../src/vdom_snapshot_runtime.ts";
import { createThreeNativeRoot } from "../src/three_host.ts";
import { nativeModulePlugin } from "./vite_native_plugin.ts";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const artifact = path.join(projectRoot, ".cache", `compiled-numeric-expression-dag-${randomUUID()}`);
const binary = path.join(projectRoot, "compiler/oxc-spike/target/debug/ui-graph-compiler-spike");
const runtimeUrl = pathToFileURL(path.join(projectRoot, "src/native_runtime_api.ts")).href;
const sha = (bytes) => createHash("sha256").update(bytes).digest("hex");
const authored = `import { useEffect, useState } from ${JSON.stringify(runtimeUrl)};
export const trace = { controls: {}, opaqueControls: {}, threeControl: null, opaqueCalls: 0 };
export function opaque(value) { trace.opaqueCalls++; return value; }
export function Row({ id }) {
  const [x, setX] = useState(0);
  const [y, setY] = useState(0);
  useEffect(() => { trace.controls[id] = { x: setX, y: setY }; });
  const shared = (x + 1) * (y + 2);
  return <i data-row={id} data-a={shared + 3} data-b={shared - 4}
    data-c={shared * 5} data-sign={x * 1}
    data-text={\`\${shared}px\`} data-branch={x > 0 ? \`\${shared}!\` : "low"} />;
}
export function Opaque() {
  const [value, setValue] = useState(0);
  useEffect(() => { trace.opaqueControls.value = setValue; });
  const result = opaque(value);
  return <i data-row="opaque" data-result={result} />;
}
export function Board() {
  return <section><Row key="a" id="a" /><Row key="b" id="b" /><Opaque key="opaque" /></section>;
}
export function SceneComponent() {
  const [x, setX] = useState(0);
  useEffect(() => { trace.threeControl = setX; });
  const shared = (x + 1) * (x + 2);
  return <mesh position={[x, 0, 0]}><boxGeometry args={[1, 1, 1]} />
    <meshStandardMaterial roughness={shared * 0.1} metalness={shared * 0.01} />
  </mesh>;
}`;

const property = (node, name) => node?.type === "ObjectExpression" ?
  node.properties.find((entry) => entry.type === "ObjectProperty" && !entry.computed &&
    (entry.key.name ?? entry.key.value) === name)?.value ?? null : null;
const visit = (node, callback) => {
  if (!node || typeof node !== "object") return;
  callback(node);
  for (const [key, value] of Object.entries(node)) {
    if (["loc", "start", "end", "extra", "comments"].includes(key)) continue;
    if (Array.isArray(value)) value.forEach((item) => visit(item, callback));
    else if (value && typeof value === "object") visit(value, callback);
  }
};
const allNodes = (node, result = []) => {
  result.push(node);
  for (const child of node.children ?? []) allNodes(child, result);
  return result;
};
const nodeFor = (container, id) => allNodes(container).find((node) => node.props?.["data-row"] === id);
const same = (actual, expected, label) =>
  assert.ok(Object.is(actual, expected), `${label}: expected ${String(expected)}, got ${String(actual)}`);
const oracle = (x, y) => {
  const shared = (x + 1) * (y + 2);
  return { "data-a": shared + 3, "data-b": shared - 4, "data-c": shared * 5,
    "data-sign": x * 1, "data-text": `${shared}px`,
    "data-branch": x > 0 ? `${shared}!` : "low" };
};
const assertOutput = (node, x, y, label) => {
  assert.ok(node, `${label} host exists`);
  for (const [name, expected] of Object.entries(oracle(x, y)))
    same(node.props[name], expected, `${label} ${name}`);
};

const plugin = nativeModulePlugin({ root: projectRoot, compilerBinary: binary });
plugin.configResolved?.call({}, { root: projectRoot });
const context = {
  addWatchFile() {},
  async resolve(specifier) {
    return specifier === runtimeUrl ? { id: path.join(projectRoot, "src/native_runtime_api.ts") } : null;
  },
  error(message) { throw new Error(String(message)); },
};
const originals = {
  prepare: VDOMSnapshotRoot.prototype.prepareNumericRowProgram,
  execute: VDOMSnapshotRoot.prototype.executePreparedNumericRows,
};
const metrics = { prepared: 0, cuts: [], writes: [] };
let root;
let three;
const sourcePath = path.join(artifact, "authored.tsx");
const emittedPath = path.join(artifact, "compiled.mjs");
try {
  await mkdir(artifact, { recursive: true });
  const compilerSha256 = sha(await readFile(binary));
  await writeFile(sourcePath, authored, { flag: "wx" });
  const transformed = await plugin.transform.call(context, authored, sourcePath);
  assert.ok(transformed?.code, "actual Rust/OXC transform emits code");
  assert.doesNotMatch(authored, /@native-ui|@jsx|\bjsx\s*[,}]/);
  await writeFile(emittedPath, transformed.code, { flag: "wx" });
  const ast = parse(transformed.code, { sourceType: "module", plugins: ["typescript", "jsx"] });
  const registrations = new Map();
  const kernels = new Map();
  visit(ast.program, (node) => {
    if (node.type === "VariableDeclarator" && node.id?.type === "Identifier" &&
      /^__nativeOwnerCutKernels/.test(node.id.name))
      kernels.set(node.id.name, node.init);
    if (node.type !== "CallExpression" || !/^__nativeDefineComponent_*$/.test(node.callee?.name ?? "")) return;
    const site = node.arguments[0]?.value;
    if (typeof site === "string") registrations.set(site.split("#component:").at(-1), { site, metadata: node.arguments[2] });
  });
  const row = registrations.get("Row");
  const opaque = registrations.get("Opaque");
  const sceneOwner = registrations.get("SceneComponent");
  assert.ok(row && opaque && sceneOwner, "compiled registrations retain Row, Opaque, and Three owners");
  const programRef = property(row.metadata, "ownerUpdateProgram");
  assert.equal(programRef?.type, "MemberExpression", "Row references an actual emitted owner kernel");
  const table = kernels.get(programRef.object.name);
  const kernel = table?.elements?.[programRef.property.value];
  assert.ok(kernel, "Row owner kernel is present in the compiler output");
  assert.equal(property(kernel, "programId")?.value, row.site);
  const executeCut = property(kernel, "executeCut");
  assert.equal(executeCut?.type, "FunctionExpression", "kernel has executable cut function");
  assert.equal(property(opaque.metadata, "ownerUpdateProgram"), null,
    "opaque call does not acquire a numeric owner kernel");
  assert.match(transformed.code, /stateLayout:\s*\{\s*schemaVersion:\s*1,\s*programId:/);
  const cases = [];
  visit(executeCut.body, (node) => {
    if (node.type === "SwitchCase") cases.push(node);
  });
  assert.deepEqual(cases.map((entry) => entry.test?.value), [0, 1],
    "two source slots each have an affected sink case");
  const actualCutSource = transformed.code.slice(executeCut.start, executeCut.end);
  const executableCutSource = stripTypeScriptTypes(`(${actualCutSource})`, { mode: "strip" });
  const isolatedCut = Function(`"use strict"; return ${executableCutSource};`)();
  const sinkCount = property(kernel, "sinkIds")?.elements?.length;
  assert.ok(Number.isInteger(sinkCount) && sinkCount > 0 && sinkCount <= 30,
    "all-sinks mask derives from actual emitted sink table");
  const allSeen = (1 << sinkCount) - 1;
  let maskedInputReads = 0;
  const throwingInputs = new Proxy([], {
    get() { maskedInputReads++; throw new Error("masked numeric input was read"); },
  });
  for (const slotCase of cases) {
    const staged = [[], [], []];
    assert.equal(isolatedCut(Uint32Array.of(slotCase.test.value), 1,
      [{ seenMask: allSeen, inputValues: throwingInputs, sinks: [] }],
      ...staged), 0, "all-sinks-seen case stages no value");
  }
  assert.equal(maskedInputReads, 0, "masked-out shared arithmetic never reads a numeric input");
  const sharedProof = [];
  for (const slotCase of cases) {
    const directStatements = slotCase.consequent.flatMap((statement) =>
      statement.type === "BlockStatement" ? statement.body : [statement]);
    const eagerDeclarations = directStatements
      .filter((statement) => statement.type === "VariableDeclaration")
      .flatMap((statement) => statement.declarations);
    assert.ok(eagerDeclarations.every((entry) => /^\$r3actDag\d+$/.test(entry.id?.name ?? "")),
      "case-level declarations contain no eager string or branch computation");
    const declarations = [];
    visit(slotCase, (node) => {
      if (node.type === "VariableDeclarator" && node.id?.type === "Identifier")
        declarations.push(node);
    });
    const temps = declarations.filter((entry) => /^\$r3actDag\d+$/.test(entry.id.name));
    assert.ok(temps.length > 0, "actual executeCut contains a compiler-generated shared numeric temp");
    let repeatedUse = false;
    for (const temp of temps) {
      let references = 0;
      visit(slotCase, (node) => {
        if (node.type === "Identifier" && node.name === temp.id.name &&
          node !== temp.id) references++;
      });
      assert.ok(references >= 1, "shared temp has a downstream use");
      repeatedUse ||= references >= 2;
      const guarded = temp.init;
      assert.equal(guarded?.type, "ConditionalExpression",
        "shared numeric work has a sink-mask guard");
      const condition = guarded.test;
      const numeric = guarded.consequent;
      assert.match(transformed.code.slice(condition.start, condition.end), /seenMask/,
        "shared work checks selected sink bits before evaluation");
      assert.equal(guarded.alternate?.value, 0, "masked-out numeric temporary is inert");
      visit(numeric, (node) => {
        assert.ok(!["TemplateLiteral", "ConditionalExpression", "LogicalExpression",
          "CallExpression"].includes(node.type), "shared work contains only eager-safe numeric arithmetic");
      });
      sharedProof.push({ slot: slotCase.test.value, name: temp.id.name, references });
    }
    assert.ok(repeatedUse, "at least one generated temp serves multiple sinks");
  }
  const sceneProgramRef = property(sceneOwner.metadata, "ownerUpdateProgram");
  let scenePath = "generic";
  if (sceneProgramRef) {
    assert.equal(sceneProgramRef.type, "MemberExpression",
      "eligible Three owner references an emitted owner kernel");
    const sceneKernel = kernels.get(sceneProgramRef.object.name)?.elements?.[sceneProgramRef.property.value];
    assert.equal(property(sceneKernel, "programId")?.value, sceneOwner.site);
    const sceneCut = property(sceneKernel, "executeCut");
    assert.equal(sceneCut?.type, "FunctionExpression");
    let sceneTemps = 0;
    visit(sceneCut, (node) => {
      if (node.type === "VariableDeclarator" && /^\$r3actDag\d+$/.test(node.id?.name ?? ""))
        sceneTemps++;
    });
    assert.ok(sceneTemps > 0, "eligible Three owner has actual DAG temporaries");
    scenePath = "compiled-dag";
  }
  const moduleSource = row.site.slice(0, row.site.lastIndexOf("#component:"));
  const app = await import(pathToFileURL(emittedPath).href);
  assert.ok(inspectCompiledSemanticPlan(moduleSource)?.module_revision,
    "compiled module registers the plan for its actual source");

  VDOMSnapshotRoot.prototype.prepareNumericRowProgram = function (...args) {
    const token = originals.prepare.apply(this, args);
    if (token) metrics.prepared++;
    return token;
  };
  VDOMSnapshotRoot.prototype.executePreparedNumericRows = function (
    tokens, changedRowIndices, changedSlots, values, count,
  ) {
    const cut = { count, rows: Array.from(changedRowIndices.slice(0, count)),
      slots: Array.from(changedSlots.slice(0, count)),
      values: Array.from(values.slice(0, count)) };
    const result = originals.execute.call(this, tokens, changedRowIndices, changedSlots, values, count);
    cut.accepted = result !== null;
    metrics.cuts.push(cut);
    return result;
  };
  const host = new MemoryVDOMHost();
  const originalSetProp = host.setProp.bind(host);
  let reenter = null;
  host.setProp = (node, name, value, previous) => {
    if (node.props?.["data-row"] === "a" && /^data-(a|b|c)$/.test(name))
      metrics.writes.push({ row: "a", name, value });
    originalSetProp(node, name, value, previous);
    if (reenter && node.props?.["data-row"] === "a" && name === "data-a") {
      const action = reenter;
      reenter = null;
      action();
    }
  };
  const container = host.createContainer();
  const frames = [];
  root = createNativeRoot(host, container, {
    rootId: `numeric-dag-${path.basename(artifact)}`,
    scheduleCommit() {}, profileCounter(frame) { frames.push(frame); },
  });
  root.mount(jsx(app.Board, {}));
  const nodeA = nodeFor(container, "a");
  const nodeB = nodeFor(container, "b");
  const nodeOpaque = nodeFor(container, "opaque");
  assertOutput(nodeA, 0, 0, "initial a");
  assertOutput(nodeB, 0, 0, "initial b");
  assert.equal(nodeOpaque?.props["data-result"], 0);
  const initialRenders = frames.reduce((sum, frame) => sum + (frame["owner.component-renders"] ?? 0), 0);
  assert.deepEqual(Object.keys(app.trace.controls).sort(), ["a", "b"]);
  assert.equal(app.trace.controls.a.x(3), true);
  assert.equal(root.flush(), true);
  assertOutput(nodeA, 3, 0, "sparse a");
  assert.equal(nodeFor(container, "b"), nodeB);
  assert.equal(metrics.cuts.at(-1)?.count, 1, "one changed source uses one row cut");
  assert.deepEqual(metrics.cuts.at(-1)?.slots, [0]);
  assert.equal(metrics.cuts.at(-1)?.accepted, true);
  assert.equal(app.trace.controls.a.x(-0), true);
  assert.equal(app.trace.controls.a.y(4), true);
  assert.equal(app.trace.controls.b.x(5), true);
  assert.equal(app.trace.controls.b.y(6), true);
  metrics.writes.length = 0;
  assert.equal(root.flush(), true);
  assertOutput(nodeA, -0, 4, "dense a");
  assertOutput(nodeB, 5, 6, "dense b");
  same(nodeA.props["data-sign"], -0, "signed zero survives");
  assert.deepEqual(metrics.cuts.at(-1)?.slots, [0, 1, 0, 1],
    "multi-slot cut preserves original source order");
  assert.equal(new Set(metrics.cuts.at(-1)?.rows).size, 2, "same program has two owner handles");
  assert.equal(metrics.cuts.at(-1)?.accepted, true);
  assert.deepEqual(metrics.writes.map(({ name }) => name).filter((name) =>
    ["data-a", "data-b", "data-c"].includes(name)), ["data-a", "data-b", "data-c"],
  "shared numeric sinks retain authored host order once per owner");
  assert.equal(app.trace.controls.a.y(10), true);
  assert.equal(app.trace.controls.a.x(2), true);
  metrics.writes.length = 0;
  assert.equal(root.flush(), true);
  assertOutput(nodeA, 2, 10, "reverse-order a");
  assert.deepEqual(metrics.cuts.at(-1)?.slots, [1, 0],
    "reverse y-then-x changes retain their original slot order");
  assert.deepEqual(metrics.writes.map(({ name }) => name).filter((name) =>
    ["data-a", "data-b", "data-c", "data-sign"].includes(name)),
  ["data-a", "data-b", "data-c", "data-sign"],
  "remaining x-only sink writes after earlier shared sinks without duplicate shared staging");
  const afterNumericRenders = frames.reduce((sum, frame) => sum + (frame["owner.component-renders"] ?? 0), 0);
  assert.equal(afterNumericRenders, initialRenders, "numeric owner path avoids component rerenders");
  assert.ok(metrics.prepared >= 1, "runtime prepared an owner-row program");

  assert.equal(app.trace.controls.a.x(NaN), true);
  assert.equal(root.flush(), true);
  assertOutput(nodeA, NaN, 10, "NaN a");
  assert.equal(app.trace.controls.a.x(Infinity), true);
  assert.equal(root.flush(), true);
  assertOutput(nodeA, Infinity, 10, "infinite a");
  const beforeReentry = metrics.cuts.length;
  reenter = () => assert.equal(app.trace.controls.a.x(9), true);
  assert.equal(app.trace.controls.a.x(8), true);
  assert.equal(root.flush(), true);
  assertOutput(nodeA, 8, 10, "first reentrant publication");
  assert.ok(metrics.cuts.length > beforeReentry, "reentrant first cut used owner program");
  assert.equal(root.flush(), true, "newer reentrant setter survives exact acknowledgement");
  assertOutput(nodeA, 9, 10, "newer reentrant publication");
  assert.equal(nodeFor(container, "a"), nodeA, "same-owner host identity survives reentry");
  assert.equal(nodeFor(container, "b"), nodeB, "other owner host identity survives reentry");

  const beforeOpaque = app.trace.opaqueCalls;
  const beforeFallback = metrics.cuts.length;
  assert.equal(app.trace.opaqueControls.value(7), true);
  assert.equal(root.flush(), true);
  assert.equal(nodeOpaque.props["data-result"], 7);
  assert.ok(app.trace.opaqueCalls > beforeOpaque, "opaque component reruns application code");
  assert.equal(metrics.cuts.length, beforeFallback, "opaque owner uses generic fallback");
  assert.equal(app.trace.controls.a.x("wide"), true);
  assert.equal(root.flush(), true);
  assertOutput(nodeA, "wide", 10, "string promotion");
  assert.equal(nodeFor(container, "a"), nodeA, "promoted state retains host identity");

  const scene = new THREE.Scene();
  three = createThreeNativeRoot(scene, { namespace: THREE,
    rootOptions: { rootId: `numeric-dag-three-${path.basename(artifact)}`, scheduleCommit() {} } });
  three.root.mount(jsx(app.SceneComponent, {}));
  const mesh = scene.children.find((item) => item instanceof THREE.Mesh);
  assert.ok(mesh?.material instanceof THREE.MeshStandardMaterial, "actual Three mesh and material mount");
  const position = mesh.position;
  const material = mesh.material;
  const beforeThreeCuts = metrics.cuts.length;
  assert.equal(app.trace.threeControl(4), true);
  assert.equal(three.root.flush(), true);
  if (scenePath === "compiled-dag")
    assert.ok(metrics.cuts.length > beforeThreeCuts && metrics.cuts.at(-1)?.accepted,
      "eligible Three update executes an accepted owner-row cut");
  same(mesh.position.x, 4, "Three position");
  same(material.roughness, (4 + 1) * (4 + 2) * 0.1, "Three roughness");
  same(material.metalness, (4 + 1) * (4 + 2) * 0.01, "Three metalness");
  assert.equal(mesh.position, position, "Three Vector3 identity is stable");
  assert.equal(mesh.material, material, "Three material identity is stable");
  three.dispose();
  three = undefined;
  assert.equal(scene.children.length, 0, "Three scene detaches on disposal");

  const proof = { schemaVersion: 1, status: "PASS", compilerSha256,
    authoredSha256: sha(authored), transformedSha256: sha(transformed.code),
    sourcePath: path.relative(projectRoot, sourcePath),
    emittedPath: path.relative(projectRoot, emittedPath),
    ownerProgramId: row.site, scenePath, sharedProof, maskedInputReads, cuts: metrics.cuts,
    assertions: { actualRustOxcAndAst: true, sharedNumericTemps: true,
      allSeenMaskSkipsInputReads: true, sparseAndDenseSameOwnerRows: true,
      reverseSlotOrderAndRemainingSink: true, sourceAndHostOrder: true,
      signedZeroNaNInfinity: true, branchStringSafety: true,
      opaqueAndPromotedFallback: true, reentrantNewerAction: true,
      actualThreeTransformsAndIdentity: true },
    boundary: `Actual compiled Memory owner-kernel and public Memory/Three host correctness; Three path is ${scenePath}; no timing claim.` };
  root.dispose();
  root = undefined;
  await writeFile(path.join(artifact, "result.json"), JSON.stringify(proof, null, 2) + "\n", { flag: "wx" });
  console.log("Compiled numeric expression DAG PASS:", JSON.stringify(proof));
} catch (error) {
  await writeFile(path.join(artifact, "failure.json"), JSON.stringify({
    status: "FAIL", error: String(error?.stack ?? error), metrics,
  }, null, 2) + "\n").catch(() => {});
  throw error;
} finally {
  VDOMSnapshotRoot.prototype.prepareNumericRowProgram = originals.prepare;
  VDOMSnapshotRoot.prototype.executePreparedNumericRows = originals.execute;
  root?.dispose();
  three?.dispose();
  plugin.closeBundle?.call({});
}
