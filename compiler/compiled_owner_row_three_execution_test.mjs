import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import * as THREE from "three";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { PendingStateChanges } from "../src/pending_state_changes.ts";
import { jsx, inspectCompiledSemanticPlan } from "../src/native_runtime_api.ts";
import { VDOMSnapshotRoot } from "../src/vdom_snapshot_runtime.ts";
import { createThreeNativeRoot } from "../src/three_host.ts";
import { nativeModulePlugin } from "./vite_native_plugin.ts";
import { compiledNumericDescriptors } from "./compiled_numeric_descriptor_test_helpers.mjs";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const cacheDirectory = path.join(projectRoot, ".cache/compiled-owner-three-proof");
const attemptId = `${Date.now()}-${process.pid}-${randomUUID()}`;
const authoredPath = path.join(cacheDirectory, `authored-three-owner-row-${attemptId}.tsx`);
const emittedPath = path.join(cacheDirectory, `compiled-three-owner-row-${attemptId}.mjs`);
const resultPath = path.join(cacheDirectory, `compiled-three-owner-row-proof-${attemptId}.json`);
const failurePath = path.join(cacheDirectory, `compiled-three-owner-row-failure-${attemptId}.json`);
const runtimeUrl = pathToFileURL(path.join(projectRoot, "src/native_runtime_api.ts")).href;

const authored = `import { useState } from ${JSON.stringify(runtimeUrl)};
export const trace = { renders: 0, controls: null };

export function SceneComponent() {
  trace.renders++;
  const [x, setX] = useState(0);
  const [y, setY] = useState(0);
  const [z, setZ] = useState(0);
  const [r, setR] = useState(0);
  const [rough, setRough] = useState(0.2);
  trace.controls = { x: setX, y: setY, z: setZ, r: setR, rough: setRough };
  const parity = x % 2;
  return <mesh position={[x, y + parity, z]} rotation={[r, 0, 0]}>
    <boxGeometry args={[1, 2, 3]} />
    <meshStandardMaterial roughness={rough} />
  </mesh>;
}`;

const plugin = nativeModulePlugin({ root: projectRoot });
plugin.configResolved?.call({}, { root: projectRoot });
const context = {
  addWatchFile() {},
  async resolve(specifier) {
    if (specifier === runtimeUrl) return { id: path.join(projectRoot, "src/native_runtime_api.ts") };
    return null;
  },
  error(message) { throw new Error(String(message)); },
};

const originals = {
  capture: PendingStateChanges.prototype.capture,
  prepareRow: VDOMSnapshotRoot.prototype.prepareNumericRowProgram,
  executeRows: VDOMSnapshotRoot.prototype.executePreparedNumericRows,
  isRowCurrent: VDOMSnapshotRoot.prototype.isPreparedNumericRowProgramCurrent,
  prepareCell: VDOMSnapshotRoot.prototype.prepareNumericCellProgram,
  executeCells: VDOMSnapshotRoot.prototype.executePreparedNumericCells,
  setColumnCells: VDOMSnapshotRoot.prototype.setColumnCells,
  setColumnRows: VDOMSnapshotRoot.prototype.setColumnRows,
  executeSourceProgram: VDOMSnapshotRoot.prototype.executeSourceProgram,
};
const metrics = {
  nonemptyPendingCaptures: 0,
  preparedRowPrograms: 0,
  preparedRowTokens: new Set(),
  rowCalls: [],
  legacyPreparedCellCalls: 0,
  legacyPreparedCellExecutions: 0,
  legacySetColumnCellsCalls: 0,
  legacySetColumnRowsCalls: 0,
  sourceProgramCalls: 0,
};
let rootBundle;
let app;

PendingStateChanges.prototype.capture = function (...args) {
  if (this.size > 0) metrics.nonemptyPendingCaptures++;
  return originals.capture.apply(this, args);
};
VDOMSnapshotRoot.prototype.prepareNumericRowProgram = function (...args) {
  const token = originals.prepareRow.apply(this, args);
  if (token !== null && token !== undefined) {
    metrics.preparedRowPrograms++;
    metrics.preparedRowTokens.add(token);
  }
  return token;
};
VDOMSnapshotRoot.prototype.executePreparedNumericRows = function (
  tokens,
  changedRowIndices,
  changedSlots,
  values,
  count,
) {
  const rowIndices = Array.from(changedRowIndices.slice(0, count));
  const slots = Array.from(changedSlots.slice(0, count));
  const referencedTokens = rowIndices.map((rowIndex) => tokens[rowIndex]);
  const call = {
    count,
    tokensLength: tokens.length,
    changedRowIndicesType: changedRowIndices.constructor.name,
    changedSlotsType: changedSlots.constructor.name,
    changedRowIndices: rowIndices,
    changedSlots: slots,
    valuesLength: values.length,
    values: Array.from(values.slice(0, count)),
    referencedTokensPrepared: referencedTokens.every((token) => metrics.preparedRowTokens.has(token)),
    referencedTokensCurrent: typeof originals.isRowCurrent === "function"
      ? referencedTokens.every((token) => originals.isRowCurrent.call(this, token))
      : null,
  };
  const result = originals.executeRows.call(this, tokens, changedRowIndices, changedSlots, values, count);
  call.executionResult = result;
  call.accepted = result !== null;
  metrics.rowCalls.push(call);
  return result;
};
VDOMSnapshotRoot.prototype.prepareNumericCellProgram = function (...args) {
  metrics.legacyPreparedCellCalls++;
  return originals.prepareCell.apply(this, args);
};
VDOMSnapshotRoot.prototype.executePreparedNumericCells = function (...args) {
  metrics.legacyPreparedCellExecutions++;
  return originals.executeCells.apply(this, args);
};
VDOMSnapshotRoot.prototype.setColumnCells = function (...args) {
  metrics.legacySetColumnCellsCalls++;
  return originals.setColumnCells.apply(this, args);
};
VDOMSnapshotRoot.prototype.setColumnRows = function (...args) {
  metrics.legacySetColumnRowsCalls++;
  return originals.setColumnRows.apply(this, args);
};
VDOMSnapshotRoot.prototype.executeSourceProgram = function (...args) {
  metrics.sourceProgramCalls++;
  return originals.executeSourceProgram.apply(this, args);
};

try {
  for (const [name, original] of Object.entries({
    capture: originals.capture,
    prepareNumericRowProgram: originals.prepareRow,
    executePreparedNumericRows: originals.executeRows,
    prepareNumericCellProgram: originals.prepareCell,
    executePreparedNumericCells: originals.executeCells,
    setColumnCells: originals.setColumnCells,
    setColumnRows: originals.setColumnRows,
    executeSourceProgram: originals.executeSourceProgram,
  })) assert.equal(typeof original, "function", `${name} instrumentation API exists`);

  await mkdir(cacheDirectory, { recursive: true });
  await writeFile(authoredPath, authored, { flag: "wx" });
  const transformed = await plugin.transform.call(context, authored, authoredPath);
  assert.ok(transformed?.code, "ordinary authored Three TSX compiles through Rust/OXC");
  await writeFile(emittedPath, transformed.code, { flag: "wx" });
  assert.doesNotMatch(authored, /@native-ui|@jsx|\bjsx\s*[,}]/, "authored TSX has no JSX author marker or factory call");
  assert.match(transformed.code, /schemaVersion:\s*2,\s*ownerProgramId:/, "owner-scoped v2 sink programs are emitted");
  assert.match(transformed.code, /stateLayout:\s*\{\s*schemaVersion:\s*1,\s*programId:/, "owner layout includes program ID");
  assert.match(transformed.code, /position:\s*__nativeBindStatePropsAt\(/, "lowered Three position property uses the three-source binding helper");
  assert.match(transformed.code, /rotation:\s*__nativeBindStatePropAt\(/, "lowered Three rotation property uses the one-source binding helper");
  assert.match(transformed.code, /roughness:\s*__nativeBindStatePropAt\(/, "lowered material roughness property uses the one-source binding helper");
  const componentMatch = transformed.code.match(/__nativeDefineComponent\("([^"]+#component:SceneComponent)",\s*SceneComponent/);
  assert.ok(componentMatch, "component registration has a stable owner ID");
  const ownerProgramId = componentMatch[1];
  const layoutMatch = transformed.code.match(/stateLayout:\s*\{\s*schemaVersion:\s*1,\s*programId:\s*"([^"]+)",\s*moduleRevision:\s*"([^"]+)",\s*slots:\s*\[([^\]]*)\]/s);
  assert.ok(layoutMatch, "SceneComponent emits a compiled layout");
  assert.equal(layoutMatch[1], ownerProgramId, "layout programId equals component registration ID");
  const stateSites = [0, 1, 2, 3, 4].map((slot) => `${ownerProgramId}#state:${slot}`);
  const layoutEntries = [...layoutMatch[3].matchAll(/\{\s*siteId:\s*"([^"]+)",\s*slot:\s*(\d+)\s*\}/g)];
  assert.equal(layoutEntries.length, 5, "SceneComponent has exactly five numeric state layout slots");
  assert.deepEqual(layoutEntries.map((entry) => [entry[1], Number(entry[2])]), stateSites.map((site, slot) => [site, slot]));
  const descriptorEntries = compiledNumericDescriptors(transformed.code);
  assert.equal(descriptorEntries.length, 3, "position, rotation, and roughness emit exactly three sink descriptors");
  assert.equal(descriptorEntries.filter((entry) => entry.closedExpressionKinds.length).length, 1,
    "scalar roughness has a closed expression; position and rotation arrays keep fallback");
  assert.ok(descriptorEntries.find((entry) =>
    JSON.stringify(entry.sourceSites) === JSON.stringify([stateSites[4]])
  )?.closedExpressionKinds.includes("input"), "roughness carries its identity data expression");
  assert.ok(descriptorEntries.every((entry) => entry.ownerProgramId === ownerProgramId && entry.sinkId), "sink descriptors belong to this component");
  const descriptorSites = descriptorEntries.map((entry) => entry.sourceSites);
  assert.ok(descriptorSites.every(Array.isArray), "every sink has an explicit source list");
  assert.ok(descriptorSites.every((sites) => new Set(sites).size === sites.length), "every sink source list is unique");
  assert.ok(descriptorSites.some((sites) => JSON.stringify(sites) === JSON.stringify(stateSites.slice(0, 3))), "position vector source list follows layout order");
  assert.ok(descriptorSites.some((sites) => JSON.stringify(sites) === JSON.stringify([stateSites[3]])), "rotation uses its one source slot");
  assert.ok(descriptorSites.some((sites) => JSON.stringify(sites) === JSON.stringify([stateSites[4]])), "roughness uses its one source slot");

  app = await import(`${pathToFileURL(emittedPath).href}?attempt=${attemptId}`);
  const moduleSource = layoutMatch[1].slice(0, layoutMatch[1].lastIndexOf("#component:"));
  assert.equal(layoutMatch[2], inspectCompiledSemanticPlan(moduleSource)?.module_revision,
    "emitted layout and registered semantic plan share one module revision");
  const scene = new THREE.Scene();
  const rootId = `compiled-owner-three-${attemptId}`;
  rootBundle = createThreeNativeRoot(scene, {
    namespace: THREE,
    rootOptions: { rootId, scheduleCommit() {} },
  });
  const threeHost = rootBundle.host;
  rootBundle.root.mount(jsx(app.SceneComponent, {}));
  const mesh = scene.children.find((child) => child instanceof THREE.Mesh);
  assert.ok(mesh, "actual Three Mesh is attached to the supplied Scene");
  assert.ok(mesh.geometry instanceof THREE.BufferGeometry, "actual Three geometry is attached");
  assert.ok(mesh.material instanceof THREE.MeshStandardMaterial, "actual Three material is attached");
  const positionObject = mesh.position;
  const rotationObject = mesh.rotation;
  const geometry = mesh.geometry;
  const material = mesh.material;
  const geometryDispose = geometry.dispose.bind(geometry);
  const materialDispose = material.dispose.bind(material);
  let geometryDisposals = 0;
  let materialDisposals = 0;
  geometry.dispose = () => { geometryDisposals++; geometryDispose(); };
  material.dispose = () => { materialDisposals++; materialDispose(); };
  assert.equal(app.trace.renders, 1, "initial authored component render occurs once");
  assert.deepEqual(positionObject.toArray(), [0, 0, 0]);
  assert.deepEqual([rotationObject.x, rotationObject.y, rotationObject.z], [0, 0, 0]);
  assert.equal(material.roughness, 0.2);

  const nonemptyCaptureBaseline = metrics.nonemptyPendingCaptures;
  const legacyCellPrepareBaseline = metrics.legacyPreparedCellCalls;
  const legacyCellExecuteBaseline = metrics.legacyPreparedCellExecutions;
  const legacySetColumnCellsBaseline = metrics.legacySetColumnCellsCalls;
  const legacySetColumnRowsBaseline = metrics.legacySetColumnRowsCalls;
  const sourceProgramBaseline = metrics.sourceProgramCalls;
  const expectedFrameValues = [];
  for (let frame = 1; frame <= 240; frame++) {
    const expected = {
      x: frame,
      y: frame + 100,
      z: frame + 200,
      r: frame / 100,
      rough: 0.1 + frame / 1000,
    };
    expectedFrameValues.push(expected);
    for (const [key, value] of Object.entries(expected)) assert.equal(app.trace.controls[key](value), true, `${key} setter accepted at frame ${frame}`);
    assert.equal(rootBundle.root.flush(), true, `frame ${frame} flush succeeds`);
    assert.deepEqual(positionObject.toArray(), [expected.x, expected.y + expected.x % 2, expected.z], `frame ${frame} derived alias updates actual Three position`);
    assert.deepEqual([rotationObject.x, rotationObject.y, rotationObject.z], [expected.r, 0, 0], `frame ${frame} actual Three rotation`);
    assert.equal(material.roughness, expected.rough, `frame ${frame} actual Three material property`);
    assert.equal(mesh.position, positionObject, `frame ${frame} preserves Vector3 identity`);
    assert.equal(mesh.rotation, rotationObject, `frame ${frame} preserves Euler identity`);
    assert.equal(mesh.geometry, geometry, `frame ${frame} preserves geometry identity`);
    assert.equal(mesh.material, material, `frame ${frame} preserves material identity`);
  }

  assert.equal(app.trace.renders, 1, "all eligible frame batches update Three objects without rerendering the component");
  const rowCalls = metrics.rowCalls.slice();
  assert.equal(rowCalls.length, 240, "each setter batch executes exactly one owner-row numeric cut");
  assert.ok(rowCalls.every(({ count, tokensLength, changedRowIndicesType, changedSlotsType, valuesLength }) =>
    count === 5 && tokensLength === 1 && valuesLength >= 5 &&
    changedRowIndicesType === "Uint32Array" && changedSlotsType === "Uint32Array"
  ), "each cut has one owner token and five active row/slot/value entries");
  assert.ok(rowCalls.every(({ changedRowIndices, changedSlots, referencedTokensPrepared, referencedTokensCurrent, accepted, values }, index) =>
    changedRowIndices.length === 5 && new Set(changedRowIndices).size === 1 &&
    JSON.stringify(changedSlots) === JSON.stringify([0, 1, 2, 3, 4]) &&
    referencedTokensPrepared && (referencedTokensCurrent === null || referencedTokensCurrent) && accepted &&
    JSON.stringify(values) === JSON.stringify(Object.values(expectedFrameValues[index]))
  ), "every cut references one valid owner row and all five source slots in stable order");
  assert.ok(metrics.preparedRowPrograms >= 1, "prepared owner-row program was created");
  assert.equal(metrics.nonemptyPendingCaptures - nonemptyCaptureBaseline, 0, "eligible Three cuts avoid generic pending snapshots");
  assert.equal(metrics.legacyPreparedCellCalls - legacyCellPrepareBaseline, 0, "eligible Three cuts avoid old per-cell preparation");
  assert.equal(metrics.legacyPreparedCellExecutions - legacyCellExecuteBaseline, 0, "eligible Three cuts avoid old prepared-cell execution");
  assert.equal(metrics.legacySetColumnCellsCalls - legacySetColumnCellsBaseline, 0, "eligible Three cuts avoid legacy cell batching");
  assert.equal(metrics.legacySetColumnRowsCalls - legacySetColumnRowsBaseline, 0, "eligible Three cuts avoid legacy row cross-products");
  assert.equal(metrics.sourceProgramCalls - sourceProgramBaseline, 0, "eligible Three cuts avoid generic scalar source programs");
  const identitiesAfterBatches = {
    positionVectorStable: mesh.position === positionObject,
    rotationEulerStable: mesh.rotation === rotationObject,
    geometryStable: mesh.geometry === geometry,
    materialStable: mesh.material === material,
  };

  const beforeDispose = rootBundle.host.diagnostics;
  assert.ok(beforeDispose.createdResources >= 2, "geometry and material were host-created resources");
  assert.equal(beforeDispose.liveResources, beforeDispose.createdResources, "all created Three resources are live before disposal");
  rootBundle.dispose();
  rootBundle = undefined;
  assert.equal(geometryDisposals, 1, "owned geometry is disposed exactly once");
  assert.equal(materialDisposals, 1, "owned material is disposed exactly once");
  assert.equal(scene.children.length, 0, "mesh detaches from Scene on disposal");
  const disposedCounts = threeHost.diagnostics;
  assert.equal(disposedCounts.liveResources, 0);
  assert.equal(disposedCounts.liveHandles, 0);
  assert.equal(disposedCounts.eventRegistrations, 0);
  assert.equal(disposedCounts.createdResources, disposedCounts.disposedResources);

  const proof = {
    schemaVersion: 1,
    status: "PASS",
    runtime: process.version,
    attemptId,
    authoredSource: path.relative(projectRoot, authoredPath),
    emittedModule: path.relative(projectRoot, emittedPath),
    ownerProgramId,
    numericOwnerRowCut: {
      batches: rowCalls.length,
      cellsPerBatch: 5,
      firstCall: rowCalls[0],
      lastCall: rowCalls.at(-1),
      preparedRowProgramCount: metrics.preparedRowPrograms,
      eligibleNonemptyPendingCaptureCalls: metrics.nonemptyPendingCaptures - nonemptyCaptureBaseline,
      legacyPreparedCellCalls: metrics.legacyPreparedCellCalls - legacyCellPrepareBaseline,
      legacyPreparedCellExecutions: metrics.legacyPreparedCellExecutions - legacyCellExecuteBaseline,
      legacySetColumnCellsCalls: metrics.legacySetColumnCellsCalls - legacySetColumnCellsBaseline,
      legacySetColumnRowsCalls: metrics.legacySetColumnRowsCalls - legacySetColumnRowsBaseline,
      genericSourceProgramCalls: metrics.sourceProgramCalls - sourceProgramBaseline,
    },
    threeObjectIdentity: {
      componentRenders: app.trace.renders,
      ...identitiesAfterBatches,
      geometryDisposals,
      materialDisposals,
      diagnostics: disposedCounts,
    },
    assertions: {
      actualThreeSceneAndObjects: true,
      ordinaryAuthoredTSX: true,
      ownerProgramAndLayoutMatch: true,
      sourceSlotsVectorRotationRoughness: true,
      "240DistinctSetterBatches": true,
      exactThreePropertiesPerBatch: true,
      sameThreeObjectAndResourceIdentities: true,
      noComponentRerenders: true,
      noGenericOrLegacyFallbackDuringNumericBatches: true,
      cleanThreeResourceDisposal: true,
    },
    boundary: "Headless actual-THREE host correctness and compiled owner-row path proof only; no RAF, GPU, visual, or latency claim.",
  };
  await writeFile(resultPath, `${JSON.stringify(proof, null, 2)}\n`, { flag: "wx" });
  console.log("Compiled owner-row Three execution PASS:", JSON.stringify(proof));
} catch (error) {
  await writeFile(failurePath, `${JSON.stringify({
    schemaVersion: 1,
    status: "FAIL",
    runtime: process.version,
    attemptId,
    authoredSource: path.relative(projectRoot, authoredPath),
    emittedModule: path.relative(projectRoot, emittedPath),
    metrics: {
      nonemptyPendingCaptures: metrics.nonemptyPendingCaptures,
      preparedRowPrograms: metrics.preparedRowPrograms,
      rowCalls: metrics.rowCalls,
      legacyPreparedCellCalls: metrics.legacyPreparedCellCalls,
      legacyPreparedCellExecutions: metrics.legacyPreparedCellExecutions,
      legacySetColumnCellsCalls: metrics.legacySetColumnCellsCalls,
      legacySetColumnRowsCalls: metrics.legacySetColumnRowsCalls,
      sourceProgramCalls: metrics.sourceProgramCalls,
    },
    error: String(error?.stack ?? error),
  }, null, 2)}\n`, { flag: "wx" }).catch(() => {});
  throw error;
} finally {
  PendingStateChanges.prototype.capture = originals.capture;
  VDOMSnapshotRoot.prototype.prepareNumericRowProgram = originals.prepareRow;
  VDOMSnapshotRoot.prototype.executePreparedNumericRows = originals.executeRows;
  VDOMSnapshotRoot.prototype.prepareNumericCellProgram = originals.prepareCell;
  VDOMSnapshotRoot.prototype.executePreparedNumericCells = originals.executeCells;
  VDOMSnapshotRoot.prototype.setColumnCells = originals.setColumnCells;
  VDOMSnapshotRoot.prototype.setColumnRows = originals.setColumnRows;
  VDOMSnapshotRoot.prototype.executeSourceProgram = originals.executeSourceProgram;
  rootBundle?.dispose();
  await plugin.closeBundle?.call({});
}
