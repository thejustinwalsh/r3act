import {
  bindCompiledColumn,
  jsx,
  NumericColumn,
} from "../results/columnar-dispatch-v1/source-snapshot/src/jsx_binding_runtime.ts";
import {
  MemoryVDOMHost,
  VDOMSnapshotRoot,
} from "../results/columnar-dispatch-v1/source-snapshot/src/vdom_snapshot_runtime.ts";

const prereg = JSON.parse(await Deno.readTextFile(
  "results/columnar-dispatch-v1-preregistration.json",
));
const makeRows = (size: number, dirtyCount: number, seed: number, locality: string) => {
  if (locality === "clustered") {
    return Uint32Array.from({ length: dirtyCount }, (_, index) => index);
  }
  const rows = Uint32Array.from({ length: size }, (_, index) => index);
  let state = seed >>> 0;
  for (let index = size - 1; index > 0; index--) {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    const target = state % (index + 1);
    const value = rows[index];
    rows[index] = rows[target];
    rows[target] = value;
  }
  const selected = rows.slice(0, dirtyCount);
  selected.sort();
  return selected;
};
const makeBuckets = (rows: Uint32Array, bucketSize: number) => {
  const values: number[] = [];
  let previous = -1;
  for (const row of rows) {
    const bucket = Math.floor(row / bucketSize);
    if (bucket !== previous) values.push(bucket);
    previous = bucket;
  }
  return Uint32Array.from(values);
};
let caseCount = 0;
let batchCount = 0;
let entityChecks = 0;
let writeChecks = 0;
for (const cell of prereg.cases) {
  const dirtyCount = Math.max(1, Math.ceil(cell.size * cell.dirtyPercent / 100));
  const rows = makeRows(cell.size, dirtyCount, cell.seed, cell.locality);
  const bucketSize = cell.strategy === "bucket-32"
    ? 32
    : cell.strategy === "bucket-128"
    ? 128
    : 0;
  const buckets = bucketSize ? makeBuckets(rows, bucketSize) : null;
  const x = new NumericColumn(0, 0, new Float64Array(cell.size));
  const y = new NumericColumn(1, 1, new Float64Array(cell.size));
  const host = new MemoryVDOMHost();
  const container = host.createContainer();
  const root = new VDOMSnapshotRoot(host, container);
  const tree = jsx("div", {}, Array.from({ length: cell.size }, (_, row) =>
    jsx("i", {
      key: `entity-${row}`,
      style: {
        left: bindCompiledColumn(x, row, 0, (value) => `${value}px`),
        top: bindCompiledColumn(y, row, 1, (value) => `${value}px`),
      },
    })));
  root.commit(tree, {
    sourceCount: 2,
    sourcePaths: ["Position.x", "Position.y"],
    sourceBindingOffsets: [0, 1, 2],
    bindingIds: [0, 1],
  });
  const board = container.children[0];
  const identities = [...board.children];
  const dirty = new Uint8Array(cell.size);
  for (const row of rows) dirty[row] = 1;
  const totalBatches = prereg.warmupUpdatesPerCell + prereg.measuredUpdatesPerCell;
  for (let frame = 1; frame <= totalBatches; frame++) {
    const writesBefore = host.writeCount;
    for (const row of rows) {
      x.values[row] = frame;
      y.values[row] = frame * 2;
    }
    if (cell.strategy === "dense-scan") root.setColumns([x, y]);
    else if (cell.strategy === "dirty-rows") root.setColumnRows([x, y], rows, dirtyCount);
    else root.setColumnBuckets([x, y], buckets!, buckets!.length, bucketSize);
    if (host.writeCount - writesBefore !== dirtyCount * 2) {
      throw new Error(`Write count mismatch in case ${cell.sequence}, batch ${frame}`);
    }
    for (let row = 0; row < cell.size; row++) {
      const style = board.children[row].props.style as Record<string, unknown>;
      const expectedX = dirty[row] ? frame : 0;
      const expectedY = dirty[row] ? frame * 2 : 0;
      if (style.left !== `${expectedX}px` || style.top !== `${expectedY}px`) {
        throw new Error(`Output mismatch in case ${cell.sequence}, batch ${frame}, row ${row}`);
      }
      entityChecks++;
    }
    if (!board.children.every((node, index) => node === identities[index])) {
      throw new Error(`Host identity mismatch in case ${cell.sequence}, batch ${frame}`);
    }
    writeChecks++;
    batchCount++;
  }
  root.dispose();
  caseCount++;
}
const verification = {
  schemaVersion: "columnar-dispatch-v1-replay-verification",
  status: "PASS",
  sourceSnapshot: "results/columnar-dispatch-v1-source-snapshot",
  preregistration: "results/columnar-dispatch-v1-preregistration.json",
  caseCount,
  batchCount,
  expectedBatchCount: prereg.cases.length * (prereg.warmupUpdatesPerCell + prereg.measuredUpdatesPerCell),
  entityChecks,
  writeChecks,
  allOutputAndIdentityChecksPass: true,
};
await Deno.writeTextFile(
  "results/columnar-dispatch-v1-replay-verification.json",
  `${JSON.stringify(verification, null, 2)}\n`,
);
console.log(`Replay PASS: ${caseCount} cases, ${batchCount} batches, ${entityChecks} entity state checks.`);
