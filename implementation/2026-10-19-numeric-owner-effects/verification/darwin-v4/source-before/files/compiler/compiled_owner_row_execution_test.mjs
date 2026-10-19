import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { PendingStateChanges } from "../src/pending_state_changes.ts";
import { createNativeRoot, jsx, inspectCompiledSemanticPlan } from "../src/native_runtime_api.ts";
import { MemoryVDOMHost, VDOMSnapshotRoot } from "../src/vdom_snapshot_runtime.ts";
import { nativeModulePlugin } from "./vite_native_plugin.ts";
import { compiledNumericDescriptors } from "./compiled_numeric_descriptor_test_helpers.mjs";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const cacheDirectory = path.join(projectRoot, ".cache/compiled-owner-proof");
const attemptId = `${Date.now()}-${process.pid}-${randomUUID()}`;
const authoredPath = path.join(cacheDirectory, `authored-owner-row-${attemptId}.tsx`);
const emittedPath = path.join(cacheDirectory, `compiled-owner-row-${attemptId}.mjs`);
const resultPath = path.join(cacheDirectory, `compiled-owner-row-proof-${attemptId}.json`);
const failurePath = path.join(cacheDirectory, `compiled-owner-row-failure-${attemptId}.json`);
const runtimeUrl = pathToFileURL(path.join(projectRoot, "src/native_runtime_api.ts")).href;

const authored = `import { createKeyedCollection, useEffect, useState } from ${JSON.stringify(runtimeUrl)};
export const rows = createKeyedCollection([{ id: "a" }, { id: "b" }], row => row.id);
export const trace = { controls: {}, candidateMutationKey: null, candidateMutations: 0 };

export function Row({ id }) {
  const [x, setX] = useState(0);
  const [y, setY] = useState(0);
  const [z, setZ] = useState(0);
  useEffect(() => { trace.controls[id] = { x: setX, y: setY, z: setZ }; });
  return <i data-row={id} position={[z, x, y]} data-repeat={x + x} style={{
    left: \`\${x}px\`,
    top: \`\${y}px\`,
    opacity: z,
  }} />;
}

export function CandidateProbe() {
  const [value, setValue] = useState(0);
  if (trace.candidateMutationKey !== null) {
    trace.candidateMutations++;
    setValue(999);
  }
  return <span data-candidate={value} />;
}

export function Board() {
  return <ul>{rows.map(row => <Row key={row.id} id={row.id} />)}
    {trace.candidateMutationKey === null ? null : <CandidateProbe key="candidate" />}</ul>;
}`;

const plugin = nativeModulePlugin({ root: projectRoot,
  compilerBinary: path.join(projectRoot, "compiler/oxc-spike/target/debug/ui-graph-compiler-spike") });
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
  log: console.log,
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
let fixtureProof;
let root;
let unsubscribeDirty;
let app;
const dirtyCells = [];

const allNodes = (node, result = []) => {
  result.push(node);
  for (const child of node.children ?? []) allNodes(child, result);
  return result;
};
const componentSite = (code, name) => {
  const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = code.match(new RegExp(`__nativeDefineComponent\\("([^"\\n]*#component:${escapedName})"`));
  assert.ok(match, `compiler output lacks component site for ${name}`);
  return match[1];
};
const nodeFor = (container, id) => allNodes(container).find((node) => node.props?.["data-row"] === id);
const assertAuthoredOutput = (node, { x, y, z }, label) => {
  assert.deepEqual(node.props.position, [z, x, y], `${label} vector retains authored [z,x,y] order`);
  assert.equal(node.props["data-repeat"], x + x, `${label} repeated read keeps JavaScript + semantics`);
  assert.deepEqual(node.props.style, {
    left: `${x}px`,
    top: `${y}px`,
    opacity: z,
  }, `${label} independent unary styles`);
};
const laneAddresses = (world, owner, sites) => sites.map((site) => {
  const address = world.numericLane(owner, site);
  assert.ok(address, `missing numeric address ${site}`);
  return address;
});

if (typeof originals.capture === "function") {
  PendingStateChanges.prototype.capture = function (...args) {
    if (this.size > 0) metrics.nonemptyPendingCaptures++;
    return originals.capture.apply(this, args);
  };
}
if (typeof originals.prepareRow === "function") {
  VDOMSnapshotRoot.prototype.prepareNumericRowProgram = function (...args) {
    const token = originals.prepareRow.apply(this, args);
    if (token !== null && token !== undefined) {
      metrics.preparedRowPrograms++;
      metrics.preparedRowTokens.add(token);
    }
    return token;
  };
}
if (typeof originals.executeRows === "function") {
  VDOMSnapshotRoot.prototype.executePreparedNumericRows = function (tokens, changedRowIndices, changedSlots, values, count) {
    const rowIndices = Array.from(changedRowIndices.slice(0, count));
    const slots = Array.from(changedSlots.slice(0, count));
    const referencedTokens = rowIndices.map((rowIndex) => tokens[rowIndex]);
    const call = {
      count,
      tokensLength: tokens?.length,
      changedRowIndicesType: changedRowIndices?.constructor?.name,
      changedSlotsType: changedSlots?.constructor?.name,
      changedRowIndices: rowIndices,
      changedSlots: slots,
      valuesLength: values?.length,
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
}
if (typeof originals.prepareCell === "function") {
  VDOMSnapshotRoot.prototype.prepareNumericCellProgram = function (...args) {
    metrics.legacyPreparedCellCalls++;
    return originals.prepareCell.apply(this, args);
  };
}
if (typeof originals.executeCells === "function") {
  VDOMSnapshotRoot.prototype.executePreparedNumericCells = function (...args) {
    metrics.legacyPreparedCellExecutions++;
    return originals.executeCells.apply(this, args);
  };
}
if (typeof originals.setColumnCells === "function") {
  VDOMSnapshotRoot.prototype.setColumnCells = function (...args) {
    metrics.legacySetColumnCellsCalls++;
    return originals.setColumnCells.apply(this, args);
  };
}
if (typeof originals.setColumnRows === "function") {
  VDOMSnapshotRoot.prototype.setColumnRows = function (...args) {
    metrics.legacySetColumnRowsCalls++;
    return originals.setColumnRows.apply(this, args);
  };
}
if (typeof originals.executeSourceProgram === "function") {
  VDOMSnapshotRoot.prototype.executeSourceProgram = function (...args) {
    metrics.sourceProgramCalls++;
    return originals.executeSourceProgram.apply(this, args);
  };
}
console.log = (...args) => {
  if (args[0] === "Compiled owner row execution PASS:" && typeof args[1] === "string") {
    fixtureProof = JSON.parse(args[1]);
  }
  return originals.log.apply(console, args);
};

try {
  for (const [name, original] of Object.entries({
    prepareNumericRowProgram: originals.prepareRow,
    executePreparedNumericRows: originals.executeRows,
  })) assert.equal(typeof original, "function", `${name} runtime API exists`);
  assert.equal(typeof originals.capture, "function", "generic capture instrumentation API exists");
  await mkdir(cacheDirectory, { recursive: true });
  await writeFile(authoredPath, authored, { flag: "wx" });
  const transformed = await plugin.transform.call(context, authored, authoredPath);
  assert.ok(transformed?.code, "ordinary authored TSX must compile through Rust/OXC");
  assert.doesNotMatch(authored, /@native-ui|@jsx|\bjsx\s*[,}]/, "fixture must not include author markers or jsx factory calls");
  assert.match(transformed.code, /__nativeRenderCollectionAt\(/, "keyed collection is compiler lowered");
  assert.match(transformed.code, /schemaVersion:\s*2,\s*ownerProgramId:/, "compiler emits owner-scoped v2 row programs");
  assert.match(transformed.code, /stateLayout:\s*\{\s*schemaVersion:\s*1,\s*programId:/, "compiler layout includes its owner ID");
  assert.match(transformed.code, /\[z, x, y\]/, "compiler preserves authored vector expression order");
  assert.match(transformed.code, /x \+ x/, "compiler preserves repeated source reads");

  const rowSite = componentSite(transformed.code, "Row");
  const boardSite = componentSite(transformed.code, "Board");
  const stateSites = [0, 1, 2].map((slot) => `${rowSite}#state:${slot}`);
  const layoutPattern = /stateLayout:\s*\{\s*schemaVersion:\s*1,\s*programId:\s*"([^"]+)",\s*moduleRevision:\s*"([^"]+)",\s*slots:\s*\[([^\]]*)\]/s;
  const layoutMatch = transformed.code.match(layoutPattern);
  assert.ok(layoutMatch, "Row carries one compiled owner layout");
  assert.equal(layoutMatch[1], rowSite, "layout programId equals defineComponent's first argument");
  const layoutEntries = [...layoutMatch[3].matchAll(/\{\s*siteId:\s*"([^"]+)",\s*slot:\s*(\d+)\s*\}/g)];
  assert.deepEqual(layoutEntries.map((entry) => [entry[1], Number(entry[2])]), stateSites.map((site, slot) => [site, slot]));
  const descriptors = compiledNumericDescriptors(transformed.code)
    .filter((entry) => entry.ownerProgramId === rowSite);
  assert.equal(descriptors.length, 5, "vector, repeat, and three unary style sinks each have a compiled descriptor");
  assert.ok(descriptors.every((entry) => entry.sinkId && entry.sourceSites), "every owner descriptor contains an explicit source list");
  assert.equal(descriptors.filter((entry) => entry.closedExpressionKinds.length).length, descriptors.length - 1,
    "all primitive sinks have closed expressions while the vector keeps fallback");
  const descriptorSources = descriptors.map((entry) => entry.sourceSites);
  assert.ok(descriptorSources.every((sites) => new Set(sites).size === sites.length), "descriptor source sites are unique");
  assert.ok(descriptorSources.some((sites) => JSON.stringify(sites) === JSON.stringify(stateSites)), "vector descriptor lists sources in layout order");
  assert.match(
    transformed.code,
    /__nativeBindStatePropsAt\(\[\s*"[^"]+#state:0",\s*"[^"]+#state:1",\s*"[^"]+#state:2"\s*\],\s*\(\[x,\s*y,\s*z\]\)\s*=>\s*\[\s*z,\s*x,\s*y\s*\]/,
    "lowered vector slots are ordered by layout while the emitted expression retains authored z,x,y order",
  );
  await writeFile(emittedPath, transformed.code, { flag: "wx" });
  app = await import(`${pathToFileURL(emittedPath).href}?attempt=${attemptId}`);
  const moduleSource = layoutMatch[1].slice(0, layoutMatch[1].lastIndexOf("#component:"));
  assert.equal(layoutMatch[2], inspectCompiledSemanticPlan(moduleSource)?.module_revision,
    "emitted layout and registered semantic plan share one module revision");

  const host = new MemoryVDOMHost();
  const container = host.createContainer();
  const renderFrames = [];
  root = createNativeRoot(host, container, {
    rootId: `compiled-owner-row-${attemptId}`,
    scheduleCommit() {},
    profileCounter(frame) { renderFrames.push(frame); },
  });
  root.mount(jsx(app.Board, {}));
  const componentRenders = () => renderFrames.reduce((sum, frame) => sum +
    (frame["owner.component-renders"] ?? 0), 0);
  const rootOwner = root.world.findOwner(null, `@component-root:${root.rootId}`);
  assert.notEqual(rootOwner, undefined, "root owner is live");
  const boardOwner = root.world.findOwner(rootOwner, boardSite, `@slot:${boardSite}:0`);
  assert.notEqual(boardOwner, undefined, "authored Board owner is live");
  const collectionMatch = transformed.code.match(/__nativeRenderCollectionAt\("([^"\n]+#collection:\d+)"/);
  assert.ok(collectionMatch, "compiler emits stable keyed collection site");
  const rowOwnerSite = `${rowSite}\u0000collection:${collectionMatch[1]}`;
  const ownerFor = (id) => root.world.findOwner(boardOwner, rowOwnerSite, id);
  const ownerA = ownerFor("a");
  const ownerB = ownerFor("b");
  assert.notEqual(ownerA, undefined, "row a owner is live");
  assert.notEqual(ownerB, undefined, "row b owner is live");
  const addressesA = laneAddresses(root.world, ownerA, stateSites);
  const addressesB = laneAddresses(root.world, ownerB, stateSites);
  for (let slot = 0; slot < 3; slot++) {
    assert.equal(addressesA[slot].column, addressesB[slot].column, `slot ${slot} shares World storage`);
    assert.equal(addressesA[slot].column.sourceSlot, slot, `slot ${slot} retains source position`);
    assert.equal(addressesA[slot].column.values[addressesA[slot].row], 0);
    assert.equal(addressesB[slot].column.values[addressesB[slot].row], 0);
  }
  const nodeA = nodeFor(container, "a");
  const nodeB = nodeFor(container, "b");
  assert.ok(nodeA && nodeB, "initial host rows are mounted");
  assertAuthoredOutput(nodeA, { x: 0, y: 0, z: 0 }, "initial row a");
  assertAuthoredOutput(nodeB, { x: 0, y: 0, z: 0 }, "initial row b");
  const initialRenders = componentRenders();
  assert.deepEqual(Object.keys(app.trace.controls).sort(), ["a", "b"],
    "both authored row controls activate at mount");
  assert.equal(initialRenders, 0, "mount does not emit flush profile frames");

  unsubscribeDirty = root.world.subscribeDirtyCells((handle, version) => dirtyCells.push({ handle, version }));
  const eligibleCaptureBaseline = metrics.nonemptyPendingCaptures;
  const eligibleCellPrepareBaseline = metrics.legacyPreparedCellCalls;
  const eligibleCellExecuteBaseline = metrics.legacyPreparedCellExecutions;
  const eligibleSetCellsBaseline = metrics.legacySetColumnCellsCalls;
  const eligibleSetRowsBaseline = metrics.legacySetColumnRowsCalls;
  const eligibleSourceBaseline = metrics.sourceProgramCalls;
  assert.equal(app.trace.controls.a.x(13), true, "sparse x setter is accepted");
  assert.equal(root.flush(), true, "sparse one-cell row cut flushes");
  assertAuthoredOutput(nodeA, { x: 13, y: 0, z: 0 }, "sparse row a");
  assert.equal(addressesA[0].column.values[addressesA[0].row], 13);
  assert.equal(addressesA[1].column.values[addressesA[1].row], 0);
  assert.equal(componentRenders(), initialRenders, "eligible sparse update does not rerender rows");
  const xChange = dirtyCells.find(({ handle }) => handle.owner === ownerA && handle.site === stateSites[0]);
  assert.ok(xChange, "World publishes sparse x cell");

  for (const [id, values] of Object.entries({
    a: { x: 21, y: 22, z: 23 },
    b: { x: 31, y: 32, z: 33 },
  })) {
    assert.equal(app.trace.controls[id].x(values.x), true);
    assert.equal(app.trace.controls[id].y(values.y), true);
    assert.equal(app.trace.controls[id].z(values.z), true);
  }
  assert.equal(root.flush(), true, "dense six-cell/two-row cut flushes");
  assertAuthoredOutput(nodeA, { x: 21, y: 22, z: 23 }, "dense row a");
  assertAuthoredOutput(nodeB, { x: 31, y: 32, z: 33 }, "dense row b");
  assert.deepEqual(
    [addressesA, addressesB].flatMap((addresses) => addresses.map(({ column, row }) => column.values[row])),
    [21, 22, 23, 31, 32, 33],
  );
  assert.equal(componentRenders(), initialRenders, "eligible dense update does not rerender rows");
  const numericRowCalls = metrics.rowCalls.slice();
  assert.deepEqual(numericRowCalls.map(({ count }) => count), [1, 6], "sparse and dense cuts use one row program path");
  assert.ok(numericRowCalls.every(({ tokensLength, valuesLength, count, changedRowIndices, changedRowIndicesType, changedSlotsType }) =>
    tokensLength === new Set(changedRowIndices).size && valuesLength >= count &&
    changedRowIndicesType === "Uint32Array" && changedSlotsType === "Uint32Array"
  ), "row token buffers cover the owners addressed, and dirty row/slot/value buffers cover the active prefix");
  assert.ok(numericRowCalls.every(({ referencedTokensPrepared }) => referencedTokensPrepared), "every dirty owner index resolves to a prepared row token");
  assert.ok(numericRowCalls.every(({ referencedTokensCurrent }) => referencedTokensCurrent === null || referencedTokensCurrent), "when exposed, the currentness validator accepts every referenced token");
  assert.ok(numericRowCalls.every(({ accepted }) => accepted), "every eligible sparse and dense cut is accepted by the prepared row executor");
  assert.deepEqual(numericRowCalls.map(({ changedRowIndices }) => new Set(changedRowIndices).size), [1, 2], "sparse and dense cuts address one then two distinct owners");
  assert.deepEqual(numericRowCalls[0].changedRowIndices, [addressesA[0].row]);
  assert.deepEqual(numericRowCalls[1].changedRowIndices, [addressesA[0].row, addressesA[0].row, addressesA[0].row, addressesB[0].row, addressesB[0].row, addressesB[0].row]);
  assert.deepEqual(numericRowCalls.map(({ changedSlots }) => changedSlots), [[0], [0, 1, 2, 0, 1, 2]], "dirty slot vectors match the changed source cells");
  assert.deepEqual(numericRowCalls.map(({ values }) => values), [[13], [21, 22, 23, 31, 32, 33]], "one numeric value is captured for each dirty row/slot pair");
  assert.ok(metrics.preparedRowPrograms >= 1, "prepared owner-row program is observed");
  assert.equal(metrics.nonemptyPendingCaptures - eligibleCaptureBaseline, 0, "eligible cuts avoid generic captures");
  const eligibleNonemptyPendingCaptureCalls = metrics.nonemptyPendingCaptures - eligibleCaptureBaseline;
  assert.equal(metrics.legacyPreparedCellCalls - eligibleCellPrepareBaseline, 0, "eligible cuts avoid old per-cell preparation");
  assert.equal(metrics.legacyPreparedCellExecutions - eligibleCellExecuteBaseline, 0, "eligible cuts avoid old prepared-cell execution");
  assert.equal(metrics.legacySetColumnCellsCalls - eligibleSetCellsBaseline, 0, "eligible cuts avoid legacy cell batching");
  assert.equal(metrics.legacySetColumnRowsCalls - eligibleSetRowsBaseline, 0, "eligible cuts avoid legacy row cross-products");
  assert.equal(metrics.sourceProgramCalls - eligibleSourceBaseline, 0, "eligible cuts avoid scalar source programs");

  assert.equal(app.rows.apply(app.rows.version, [{ type: "move", key: "a", beforeKey: null }]).ok, true);
  assert.equal(root.flush(), true, "keyed move commits");
  assert.equal(nodeFor(container, "a"), nodeA, "move preserves row a host identity");
  assert.equal(nodeFor(container, "b"), nodeB, "move preserves row b host identity");
  for (let slot = 0; slot < 3; slot++) {
    assert.equal(root.world.numericLane(ownerA, stateSites[slot]), addressesA[slot], `row a slot ${slot} identity stays stable`);
    assert.equal(root.world.numericLane(ownerB, stateSites[slot]), addressesB[slot], `row b slot ${slot} identity stays stable`);
  }

  const removedAddress = addressesB[0];
  const staleControls = app.trace.controls.b;
  assert.equal(app.rows.apply(app.rows.version, [{ type: "remove", key: "b" }]).ok, true);
  assert.equal(root.flush(), true, "keyed removal commits");
  assert.equal(root.world.isAlive(ownerB), false, "removed row owner is destroyed");
  assert.equal(root.world.numericLane(ownerB, stateSites[0]), null, "removed owner has no current lane");
  let deadSetterError;
  try { staleControls.x(99); } catch (error) { deadSetterError = error; }
  assert.ok(deadSetterError, "removed row setter is rejected");
  assert.match(String(deadSetterError), /inactive|destroyed|alive/i);

  assert.equal(app.rows.apply(app.rows.version, [{ type: "insert", key: "c", value: { id: "c" }, beforeKey: "a" }]).ok, true);
  assert.equal(root.flush(), true, "keyed insertion commits");
  const ownerC = ownerFor("c");
  assert.notEqual(ownerC, undefined, "inserted row owner is live");
  const addressesC = laneAddresses(root.world, ownerC, stateSites);
  assert.notEqual(ownerC, ownerB, "row reuse receives a new owner identity");
  assert.equal(addressesC[0].row, removedAddress.row, "released storage row is reused");
  assert.notEqual(addressesC[0].generation, removedAddress.generation, "reused row advances generation");
  for (let slot = 0; slot < 3; slot++) {
    assert.equal(addressesC[slot].row, removedAddress.row);
    assert.equal(addressesC[slot].generation, addressesB[slot].generation + 1);
    assert.equal(addressesC[slot].column, addressesB[slot].column);
    assert.equal(addressesC[slot].column.values[addressesC[slot].row], 0, "new row starts cleared");
  }
  const nodeC = nodeFor(container, "c");
  assert.ok(nodeC, "inserted host row is mounted");
  assertAuthoredOutput(nodeC, { x: 0, y: 0, z: 0 }, "inserted row c");

  const columns = [...new Set([...addressesA, ...addressesC].map(({ column }) => column))];
  const savedArrays = columns.map(({ values }) => values);
  const savedValues = columns.map(({ values }) => [...values]);
  const savedStyles = [structuredClone(nodeA.props.style), structuredClone(nodeC.props.style)];
  const savedPositions = [structuredClone(nodeA.props.position), structuredClone(nodeC.props.position)];
  const savedControls = { ...app.trace.controls };
  app.trace.candidateMutationKey = "a";
  const candidate = root.prepare(jsx(app.Board, {}));
  assert.ok(app.trace.candidateMutations > 0, "candidate render attempts a private setter");
  const candidateValid = candidate.validate();
  assert.equal(candidateValid, false, "private render-time setter rejects candidate");
  for (let index = 0; index < columns.length; index++) {
    assert.equal(columns[index].values, savedArrays[index], "candidate keeps committed column allocations");
    assert.deepEqual([...columns[index].values], savedValues[index], "candidate does not write committed columns");
  }
  assert.deepEqual(nodeA.props.style, savedStyles[0]);
  assert.deepEqual(nodeC.props.style, savedStyles[1]);
  assert.deepEqual(nodeA.props.position, savedPositions[0]);
  assert.deepEqual(nodeC.props.position, savedPositions[1]);
  candidate.discard();
  app.trace.candidateMutationKey = null;
  app.trace.controls = savedControls;
  for (let index = 0; index < columns.length; index++) {
    assert.deepEqual([...columns[index].values], savedValues[index], "discard preserves committed values");
  }
  assert.equal(root.world.numericLane(ownerA, stateSites[0]), addressesA[0]);
  assert.equal(root.world.numericLane(ownerC, stateSites[0]), addressesC[0]);

  const prePromotionRenders = componentRenders();
  assert.equal(app.trace.controls.a.x("wide"), true, "string promotion setter is accepted");
  assert.equal(app.trace.controls.a.y(undefined), true, "undefined promotion setter is accepted");
  assert.equal(root.flush(), true, "promoted values reconcile through safe fallback");
  assert.equal(componentRenders() - prePromotionRenders, 1,
    "unsupported promoted values rerender only the affected owner");
  assert.equal(nodeFor(container, "a"), nodeA, "promotion retains keyed host identity");
  assertAuthoredOutput(nodeA, { x: "wide", y: undefined, z: 23 }, "promoted row a");
  assert.equal(nodeA.props["data-repeat"], "widewide", "string addition retains authored JavaScript semantics");
  assert.equal(nodeA.props.position[2], undefined, "undefined vector member is preserved");
  assert.equal(nodeA.props.style.top, "undefinedpx", "undefined interpolation preserves authored semantics");

  const proof = {
    schemaVersion: 1,
    status: "PASS",
    runtime: process.version,
    authoredSource: path.relative(projectRoot, authoredPath),
    emittedModule: path.relative(projectRoot, emittedPath),
    componentSites: { row: rowSite, board: boardSite },
    ownerRowPrograms: {
      preparedProgramCount: metrics.preparedRowPrograms,
      sparseAndDenseCalls: numericRowCalls,
      legacyPreparedCellCalls: metrics.legacyPreparedCellCalls,
      legacyPreparedCellExecutions: metrics.legacyPreparedCellExecutions,
      legacySetColumnCellsCalls: metrics.legacySetColumnCellsCalls,
      legacySetColumnRowsCalls: metrics.legacySetColumnRowsCalls,
      sourceProgramCalls: metrics.sourceProgramCalls,
      eligibleNonemptyPendingCaptureCalls,
    },
    assertions: {
      ordinaryAuthoredTSX: true,
      layoutOwnerMatchesComponent: true,
      sourceSiteOrderMatchesLayout: true,
      authoredVectorOrderPreserved: true,
      repeatedSourceReadPreserved: true,
      sparseCellUpdate: true,
      denseTwoRowSixCellUpdate: true,
      noEligibleRerenders: true,
      stableKeyedMoveIdentity: true,
      removedOwnerAndDeadSetter: true,
      rowReuseGeneration: true,
      discardedCandidateColumnIsolation: true,
      candidateValidAfterPrivateRenderWrite: candidateValid,
      promotedStringAndUndefinedFallback: true,
    },
    rawSemantics: {
      promotedRepeat: nodeA.props["data-repeat"],
      promotedPosition: nodeA.props.position,
      promotedStyle: nodeA.props.style,
    },
    boundary: "Compiled owner-row program correctness proof for ordinary keyed TSX; no latency claim.",
  };
  root.dispose();
  root = undefined;
  unsubscribeDirty?.();
  unsubscribeDirty = undefined;
  await writeFile(resultPath, `${JSON.stringify(proof, null, 2)}\n`, { flag: "wx" });
  originals.log("Compiled owner row execution PASS:", JSON.stringify(proof));
} catch (error) {
  await writeFile(failurePath, `${JSON.stringify({
    schemaVersion: 1,
    status: "FAIL",
    runtime: process.version,
    authoredSource: path.relative(projectRoot, authoredPath),
    emittedModule: path.relative(projectRoot, emittedPath),
    metrics,
    fixtureProof,
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
  console.log = originals.log;
  unsubscribeDirty?.();
  root?.dispose();
  plugin.closeBundle?.call({});
}
