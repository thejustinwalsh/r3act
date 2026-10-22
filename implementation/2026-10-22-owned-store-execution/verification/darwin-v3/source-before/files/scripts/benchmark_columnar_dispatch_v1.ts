import {
  bindCompiledColumn,
  jsx,
  NumericColumn,
} from "../src/jsx_binding_runtime.ts";
import {
  MemoryVDOMHost,
  VDOMSnapshotRoot,
} from "../src/vdom_snapshot_runtime.ts";

const replication = Number(Deno.args[0]);
if (!Number.isInteger(replication) || replication < 1 || replication > 5) {
  throw new Error("Pass a replication number from 1 through 5");
}
const preregistration = JSON.parse(await Deno.readTextFile(
  "results/columnar-dispatch-v1-preregistration.json",
));
if (preregistration.status !== "PREREGISTERED") {
  throw new Error("Columnar dispatch preregistration is missing");
}
let cases = preregistration.cases.filter((item: any) =>
  item.replication === replication
);
if (Deno.args[1] === "--pilot") cases = cases.slice(0, 1);
const now = () => performance.now();
const median = (values: number[]) => {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2
    ? sorted[middle]
    : (sorted[middle - 1] + sorted[middle]) / 2;
};
const percentile = (values: number[], p: number) => {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.max(0, Math.ceil(p * sorted.length) - 1)];
};
const shuffledRows = (size: number, seed: number) => {
  const rows = Uint32Array.from({ length: size }, (_, index) => index);
  let state = seed >>> 0;
  for (let index = size - 1; index > 0; index--) {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    const target = state % (index + 1);
    const value = rows[index];
    rows[index] = rows[target];
    rows[target] = value;
  }
  return rows;
};
const bucketBuffer = (rows: Uint32Array, count: number, size: number) => {
  const buckets = new Uint32Array(count);
  let used = 0;
  let previous = -1;
  for (let index = 0; index < count; index++) {
    const bucket = Math.floor(rows[index] / size);
    if (bucket !== previous) {
      buckets[used++] = bucket;
      previous = bucket;
    }
  }
  return buckets.subarray(0, used);
};
const runCell = (cell: any) => {
  const dirtyCount = Math.max(1, Math.ceil(cell.size * cell.dirtyPercent / 100));
  let rows: Uint32Array;
  if (cell.locality === "clustered") {
    rows = Uint32Array.from({ length: dirtyCount }, (_, index) => index);
  } else {
    const permutation = shuffledRows(cell.size, cell.seed);
    rows = permutation.slice(0, dirtyCount);
    rows.sort();
  }
  const bucketSize = cell.strategy === "bucket-32"
    ? 32
    : cell.strategy === "bucket-128"
    ? 128
    : 0;
  const buckets = bucketSize ? bucketBuffer(rows, dirtyCount, bucketSize) : null;
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
  const graph = {
    sourceCount: 2,
    sourcePaths: ["Position.x", "Position.y"],
    sourceBindingOffsets: [0, 1, 2],
    bindingIds: [0, 1],
  };
  const mountStart = now();
  root.commit(tree, graph);
  const mountMs = now() - mountStart;
  const board = container.children[0];
  const identities = [...board.children];
  const warmupCount = preregistration.warmupUpdatesPerCell;
  const measuredCount = preregistration.measuredUpdatesPerCell;
  const samples: number[] = [];
  const writesBeforeUpdates = host.writeCount;
  const update = (frame: number) => {
    const started = now();
    for (let index = 0; index < dirtyCount; index++) {
      const row = rows[index];
      x.values[row] = frame;
      y.values[row] = frame * 2;
    }
    if (cell.strategy === "dense-scan") root.setColumns([x, y]);
    else if (cell.strategy === "dirty-rows") root.setColumnRows([x, y], rows, dirtyCount);
    else root.setColumnBuckets([x, y], buckets!, buckets!.length, bucketSize);
    return now() - started;
  };
  for (let frame = 1; frame <= warmupCount; frame++) update(frame);
  for (let frame = 1; frame <= measuredCount; frame++) {
    samples.push(update(warmupCount + frame));
  }
  const expectedX = warmupCount + measuredCount;
  const dirty = new Uint8Array(cell.size);
  for (let index = 0; index < dirtyCount; index++) dirty[rows[index]] = 1;
  let allOutputMatches = true;
  for (let row = 0; row < cell.size; row++) {
    const expectedLeft = `${dirty[row] ? expectedX : 0}px`;
    const expectedTop = `${dirty[row] ? expectedX * 2 : 0}px`;
    const style = board.children[row].props.style as Record<string, unknown>;
    if (style.left !== expectedLeft || style.top !== expectedTop) {
      allOutputMatches = false;
      break;
    }
  }
  const stableNodeIdentity = board.children.length === identities.length &&
    board.children.every((node, index) => node === identities[index]);
  const expectedWrites = dirtyCount * 2 * measuredCount;
  const measuredWrites = host.writeCount - writesBeforeUpdates - dirtyCount * 2 * warmupCount;
  const stats = {
    medianMs: median(samples),
    p95Ms: percentile(samples, 0.95),
    updateCpuTotalMs: samples.reduce((sum, value) => sum + value, 0),
  };
  root.dispose();
  if (!allOutputMatches || !stableNodeIdentity || measuredWrites !== expectedWrites) {
    throw new Error(`Contract failed: ${JSON.stringify({ cell, allOutputMatches, stableNodeIdentity, measuredWrites, expectedWrites })}`);
  }
  return {
    ...cell,
    dirtyCount,
    bucketCount: buckets?.length ?? null,
    mountMs,
    ...stats,
    allOutputMatches,
    stableNodeIdentity,
    measuredHostWrites: measuredWrites,
    sampleCount: samples.length,
  };
};

const results = [];
for (const cell of cases) results.push(runCell(cell));
const environment = {
  deno: Deno.version.deno,
  v8: Deno.version.v8,
  typescript: Deno.version.typescript,
  platform: Deno.build.os,
  architecture: Deno.build.arch,
};
const record = {
  schemaVersion: "columnar-dispatch-v1-replication",
  replication,
  preregistration: "columnar-dispatch-v1-preregistration.json",
  status: "PASS",
  environment,
  caseCount: results.length,
  allContractsPass: results.every((result) =>
    result.allOutputMatches && result.stableNodeIdentity
  ),
  cases: results,
};
if (Deno.args[1] !== "--pilot") {
  await Deno.mkdir("results/columnar-dispatch-v1", { recursive: true });
  await Deno.writeTextFile(
    `results/columnar-dispatch-v1/replication-${replication}.json`,
    `${JSON.stringify(record, null, 2)}\n`,
  );
}
console.log(`Replication ${replication}${Deno.args[1] === "--pilot" ? " pilot" : ""}: ${results.length} cases passed.`);
