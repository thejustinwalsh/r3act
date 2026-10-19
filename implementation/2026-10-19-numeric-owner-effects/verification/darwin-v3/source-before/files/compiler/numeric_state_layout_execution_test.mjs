import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createNativeRoot, jsx } from "../src/native_runtime_api.ts";
import { MemoryVDOMHost } from "../src/vdom_snapshot_runtime.ts";
import { nativeModulePlugin } from "./vite_native_plugin.ts";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const cacheDirectory = path.join(projectRoot, ".cache/numeric-state-layout");
const attemptId = `${Date.now()}-${process.pid}`;
const authoredPath = path.join(cacheDirectory, `authored-layout-${attemptId}.tsx`);
const emittedPath = path.join(cacheDirectory, `compiled-layout-${attemptId}.mjs`);
const resultPath = path.join(cacheDirectory, `execution-proof-${attemptId}.json`);
const failurePath = path.join(cacheDirectory, `failure-${attemptId}.json`);
const runtimeUrl = pathToFileURL(path.join(projectRoot, "src/native_runtime_api.ts")).href;

const authored = `import { createKeyedCollection, useEffect, useState } from ${JSON.stringify(runtimeUrl)};
export const rows = createKeyedCollection([{ id: "a" }, { id: "b" }], row => row.id);
export const trace = { controls: {}, candidateMutationKey: null, candidateMutations: 0 };

export function Row({ id }) {
  const [x, setX] = useState(0);
  const [y, setY] = useState(0);
  const [rotation, setRotation] = useState(0);
  useEffect(() => {
    trace.controls[id] = { x: setX, y: setY, rotation: setRotation };
    return () => {
      if (trace.controls[id]?.x === setX) delete trace.controls[id];
    };
  });
  return <i data-row={id} style={{
    left: \`\${x}px\`,
    top: \`\${y}px\`,
    transform: \`rotate(\${rotation}deg)\`,
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
  return <ul>{rows.map(row => <Row key={row.id} id={row.id} />)}{trace.candidateMutationKey === null ? null : <CandidateProbe key="candidate" />}</ul>;
}`;

const plugin = nativeModulePlugin({ root: projectRoot });
plugin.configResolved?.call({}, { root: projectRoot });
const context = {
  addWatchFile() {},
  async resolve(specifier) {
    if (specifier === runtimeUrl) {
      return { id: path.join(projectRoot, "src/native_runtime_api.ts") };
    }
    return null;
  },
  error(message) { throw new Error(String(message)); },
};

let root;
let app;
let unsubscribeDirty;
const dirtyCells = [];

const componentSite = (code, name) => {
  const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = code.match(new RegExp(
    `__nativeDefineComponent\\("([^"\\n]*#component:${escapedName})"`,
  ));
  assert.ok(match, `compiler output lacks component site for ${name}`);
  return match[1];
};

const allNodes = (node, result = []) => {
  result.push(node);
  for (const child of node.children ?? []) allNodes(child, result);
  return result;
};

const assertStyles = (node, expected, label) => {
  assert.deepEqual(node.props.style, {
    left: `${expected.x}px`,
    top: `${expected.y}px`,
    transform: `rotate(${expected.rotation}deg)`,
  }, label);
};

const laneValues = (addresses) => addresses.map(({ column, row }) => column.values[row]);

try {
  await mkdir(cacheDirectory, { recursive: true });
  await writeFile(authoredPath, authored, { flag: "wx" });
  const transformed = await plugin.transform.call(context, authored, authoredPath);
  assert.ok(transformed?.code, "ordinary authored TSX must compile through Rust/OXC");
  assert.doesNotMatch(authored, /@native-ui|@jsx|\bjsx\s*[,}]/, "fixture must not use author markers or jsx calls");
  assert.match(transformed.code, /__nativeRenderCollectionAt\(/, "keyed collection must be compiler lowered");
  assert.match(transformed.code, /stateLayout:\s*\{\s*schemaVersion:\s*1/, "compiler must emit the numeric state layout");
  const rowSite = componentSite(transformed.code, "Row");
  const boardSite = componentSite(transformed.code, "Board");
  const stateSites = [0, 1, 2].map((slot) => `${rowSite}#state:${slot}`);
  const layoutMatch = transformed.code.match(/stateLayout:\s*\{\s*schemaVersion:\s*1,\s*slots:\s*\[([^\]]*)\]/s);
  assert.ok(layoutMatch, "Row component must carry a compiled state layout");
  const layoutEntries = [...layoutMatch[1].matchAll(/\{\s*siteId:\s*"([^"]+)",\s*slot:\s*(\d+)\s*\}/g)];
  assert.deepEqual(layoutEntries.map((entry) => [entry[1], Number(entry[2])]), stateSites.map((site, slot) => [site, slot]));
  assert.match(transformed.code, /__nativeUseStateAt\(/, "compiled useState calls must use the native hook ABI");
  await writeFile(emittedPath, transformed.code, { flag: "wx" });
  app = await import(`${pathToFileURL(emittedPath).href}?attempt=${attemptId}`);

  const host = new MemoryVDOMHost();
  const container = host.createContainer();
  root = createNativeRoot(host, container, {
    rootId: `numeric-state-layout-${attemptId}`,
    scheduleCommit() {},
  });
  root.mount(jsx(app.Board, {}));

  const rootOwner = root.world.findOwner(null, `@component-root:${root.rootId}`);
  assert.notEqual(rootOwner, undefined, "Root owner must be discoverable in World");
  const boardOwner = root.world.findOwner(rootOwner, boardSite, `@slot:${boardSite}:0`);
  assert.notEqual(boardOwner, undefined, "authored Board owner must be live");
  const collectionMatch = transformed.code.match(/__nativeRenderCollectionAt\("([^"\n]+#collection:\d+)"/);
  assert.ok(collectionMatch, "compiler must emit a stable keyed collection site");
  const rowOwnerSite = `${rowSite}\u0000collection:${collectionMatch[1]}`;
  const ownerFor = (id) => root.world.findOwner(boardOwner, rowOwnerSite, id);
  const nodeFor = (id) => allNodes(container).find((node) => node.props?.["data-row"] === id);
  const addressesFor = (owner) => stateSites.map((site) => {
    const address = root.world.numericLane(owner, site);
    assert.ok(address, `missing committed numeric lane for ${site}`);
    return address;
  });

  const ownerA = ownerFor("a");
  const ownerB = ownerFor("b");
  assert.notEqual(ownerA, undefined, "initial row a owner must be live");
  assert.notEqual(ownerB, undefined, "initial row b owner must be live");
  for (const owner of [ownerA, ownerB]) {
    const lineage = root.world.ownerLineage(owner);
    assert.equal(lineage[0], owner);
    assert.ok(lineage.includes(boardOwner), "row owner lineage must contain its Board");
    assert.ok(lineage.includes(rootOwner), "row owner lineage must reach the root");
  }
  const addressA = addressesFor(ownerA);
  const addressB = addressesFor(ownerB);
  for (let slot = 0; slot < 3; slot++) {
    assert.equal(addressA[slot].column, addressB[slot].column, `state slot ${slot} shares one World column`);
    assert.equal(addressA[slot].column.sourceSlot, slot, `state slot ${slot} retains its source slot`);
    assert.equal(addressA[slot].column.values[addressA[slot].row], 0);
    assert.equal(addressB[slot].column.values[addressB[slot].row], 0);
  }
  const nodeA = nodeFor("a");
  const nodeB = nodeFor("b");
  assert.ok(nodeA && nodeB, "initial host rows are present");
  assertStyles(nodeA, { x: 0, y: 0, rotation: 0 }, "initial row a style");
  assertStyles(nodeB, { x: 0, y: 0, rotation: 0 }, "initial row b style");

  unsubscribeDirty = root.world.subscribeDirtyCells((handle, version) => {
    dirtyCells.push({ handle, version });
  });
  assert.equal(app.trace.controls.a.x(13), true, "sparse setter changes row a x");
  assert.equal(root.flush(), true, "sparse state cut flushes");
  assert.equal(addressA[0].column.values[addressA[0].row], 13, "sparse x value reaches World column");
  assert.equal(addressA[1].column.values[addressA[1].row], 0, "untouched y column remains unchanged");
  assertStyles(nodeA, { x: 13, y: 0, rotation: 0 }, "sparse host style");
  const xChange = dirtyCells.find(({ handle }) => handle.owner === ownerA && handle.site === stateSites[0]);
  assert.ok(xChange, "World publishes the exact x cell identity");
  assert.equal(root.world.numericLaneForCell(xChange.handle, xChange.version), addressA[0], "exact cell/version resolves to the stable lane address");

  for (const [id, values] of Object.entries({
    a: { x: 21, y: 22, rotation: 23 },
    b: { x: 31, y: 32, rotation: 33 },
  })) {
    const controls = app.trace.controls[id];
    assert.equal(controls.x(values.x), true);
    assert.equal(controls.y(values.y), true);
    assert.equal(controls.rotation(values.rotation), true);
  }
  assert.equal(root.flush(), true, "dense state cut flushes");
  assert.deepEqual(laneValues(addressA), [21, 22, 23]);
  assert.deepEqual(laneValues(addressB), [31, 32, 33]);
  assertStyles(nodeA, { x: 21, y: 22, rotation: 23 }, "dense host style row a");
  assertStyles(nodeB, { x: 31, y: 32, rotation: 33 }, "dense host style row b");

  assert.equal(app.rows.apply(app.rows.version, [{ type: "move", key: "a", beforeKey: null }]).ok, true);
  assert.equal(root.flush(), true, "keyed move flushes");
  assert.equal(nodeFor("a"), nodeA, "move retains row a host identity");
  assert.equal(nodeFor("b"), nodeB, "move retains row b host identity");
  for (let slot = 0; slot < 3; slot++) {
    assert.equal(root.world.numericLane(ownerA, stateSites[slot]), addressA[slot], `row a address ${slot} stays stable through move`);
    assert.equal(root.world.numericLane(ownerB, stateSites[slot]), addressB[slot], `row b address ${slot} stays stable through move`);
  }

  const removedRow = addressB[0];
  const staleControls = app.trace.controls.b;
  assert.equal(app.rows.apply(app.rows.version, [{ type: "remove", key: "b" }]).ok, true);
  assert.equal(root.flush(), true, "keyed removal flushes");
  assert.equal(root.world.isAlive(ownerB), false, "removed World owner is destroyed");
  assert.equal(root.world.numericLane(ownerB, stateSites[0]), null, "removed owner has no live lane");
  let deadSetterError;
  try {
    staleControls.x(99);
  } catch (error) {
    deadSetterError = error;
  }
  assert.ok(deadSetterError, "setter from the destroyed row must remain rejected");
  assert.match(String(deadSetterError), /inactive|destroyed|alive/i, "dead setter rejection is explicit");

  assert.equal(app.rows.apply(app.rows.version, [{ type: "insert", key: "c", value: { id: "c" }, beforeKey: "a" }]).ok, true);
  assert.equal(root.flush(), true, "keyed insertion flushes");
  const ownerC = ownerFor("c");
  assert.notEqual(ownerC, undefined, "inserted row receives a live owner");
  const addressC = addressesFor(ownerC);
  assert.notEqual(ownerC, ownerB, "inserted row uses a fresh owner identity");
  assert.equal(addressC[0].row, removedRow.row, "inserted owner reuses released row capacity");
  assert.notEqual(addressC[0].generation, removedRow.generation, "reused row advances generation");
  for (let slot = 0; slot < 3; slot++) {
    assert.equal(addressC[slot].row, removedRow.row);
    assert.equal(addressC[slot].generation, addressB[slot].generation + 1);
    assert.equal(addressC[slot].column, addressB[slot].column);
    assert.equal(addressC[slot].column.values[addressC[slot].row], 0, "new owner starts with cleared lane values");
  }
  const nodeC = nodeFor("c");
  assert.ok(nodeC, "inserted row host node is present");
  assertStyles(nodeC, { x: 0, y: 0, rotation: 0 }, "inserted row style");

  // A full Root candidate mutates only its private state view while rendering.
  // The committed columns and host remain unchanged until a published commit.
  const columns = [...new Set([...addressA, ...addressC].map((address) => address.column))];
  const savedColumnArrays = columns.map((column) => column.values);
  const savedColumnValues = columns.map((column) => [...column.values]);
  const savedHostStyles = [structuredClone(nodeA.props.style), structuredClone(nodeC.props.style)];
  const savedControls = app.trace.controls;
  app.trace.candidateMutationKey = "a";
  const candidate = root.prepare(jsx(app.Board, {}));
  assert.ok(app.trace.candidateMutations > 0, "authored candidate render performed its private setter");
  const candidateValid = candidate.validate();
  assert.equal(candidateValid, false, "private render-time setter rejects candidate");
  for (let index = 0; index < columns.length; index++) {
    assert.equal(columns[index].values, savedColumnArrays[index], "candidate does not replace committed column storage");
    assert.deepEqual([...columns[index].values], savedColumnValues[index], "candidate does not write committed column values");
  }
  assert.deepEqual(nodeA.props.style, savedHostStyles[0], "candidate does not mutate committed host style");
  assert.deepEqual(nodeC.props.style, savedHostStyles[1], "candidate does not mutate committed host style");
  candidate.discard();
  app.trace.candidateMutationKey = null;
  app.trace.controls = savedControls;
  for (let index = 0; index < columns.length; index++) {
    assert.deepEqual([...columns[index].values], savedColumnValues[index], "discard leaves committed lane values untouched");
  }
  assert.equal(root.world.numericLane(ownerA, stateSites[0]), addressA[0]);
  assert.equal(root.world.numericLane(ownerC, stateSites[0]), addressC[0]);

  const proof = {
    status: "PASS",
    runtime: process.version,
    authoredSource: path.relative(projectRoot, authoredPath),
    emittedModule: path.relative(projectRoot, emittedPath),
    assertions: {
      ordinaryAuthoredTSX: true,
      compilerLayoutSlots: layoutEntries.map((entry) => ({ siteId: entry[1], slot: Number(entry[2]) })),
      initialOwners: [ownerA, ownerB],
      worldLineage: [
        root.world.ownerLineage(ownerA),
        root.world.ownerLineage(ownerC),
      ],
      sparseValues: [13, 0, 0],
      denseValues: [21, 22, 23, 31, 32, 33],
      stableAddressesThroughMove: true,
      removedOwnerAndDeadSetter: true,
      rowReuse: { row: addressC[0].row, oldGeneration: removedRow.generation, newGeneration: addressC[0].generation },
      discardedCandidateColumnIsolation: true,
      candidateValidAfterPrivateRenderWrite: candidateValid,
      hostStyles: { a: nodeA.props.style, c: nodeC.props.style },
    },
    boundary: "World storage/layout and helper proof only; does not claim VDOM row-writer integration or a speed result.",
  };
  root.dispose();
  root = undefined;
  unsubscribeDirty?.();
  unsubscribeDirty = undefined;
  await writeFile(resultPath, `${JSON.stringify(proof, null, 2)}\n`, { flag: "wx" });
  console.log("Numeric state layout execution PASS:", JSON.stringify(proof));
} catch (error) {
  await writeFile(failurePath, `${JSON.stringify({
    status: "FAIL",
    runtime: process.version,
    authoredSource: path.relative(projectRoot, authoredPath),
    emittedModule: path.relative(projectRoot, emittedPath),
    error: String(error?.stack ?? error),
  }, null, 2)}\n`, { flag: "wx" }).catch(() => {});
  throw error;
} finally {
  unsubscribeDirty?.();
  root?.dispose();
  plugin.closeBundle?.call({});
}
