import { mkdir, writeFile } from "node:fs/promises";
import { KeyedRegionBuckets } from "../src/keyed_region_buckets.ts";
import { ColumnarKeyedRegion } from "../src/columnar_keyed_region.ts";

const replication = Number(process.argv[2] ?? "1");
const sizes = [1_000, 10_000, 50_000];
const scenarios = ["head-to-tail", "middle-to-tail"];
const warmup = 80;
const samplesPerArm = 315;
const now = () => performance.now();
const percentile = (values, p) => {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.max(0, Math.ceil(p * sorted.length) - 1)];
};
const summarize = (values) => ({
  medianMs: percentile(values, 0.5),
  p95Ms: percentile(values, 0.95),
  totalMs: values.reduce((sum, value) => sum + value, 0),
});
const buildTrace = (size, scenario, count) => {
  const order = Array.from({ length: size }, (_, index) => `k${index}`);
  const trace = [];
  for (let index = 0; index < count; index++) {
    let key;
    if (scenario === "head-to-tail") key = order[0];
    else key = order[Math.floor(order.length / 2)];
    const operation = { key, anchorKey: null };
    trace.push(operation);
    order.splice(order.indexOf(key), 1);
    order.push(key);
  }
  return trace;
};

const arrayMap = (size) => {
  const rows = Array.from({ length: size }, (_, id) => ({ key: `k${id}`, id }));
  const index = new Map(rows.map((row, slot) => [row.key, slot]));
  return {
    moveBefore(key, anchorKey) {
      if (key === anchorKey) return;
      const from = index.get(key);
      const [row] = rows.splice(from, 1);
      const to = anchorKey === null ? rows.length : index.get(anchorKey);
      rows.splice(to, 0, row);
      for (let slot = Math.min(from, to); slot < rows.length; slot++) {
        index.set(rows[slot].key, slot);
      }
    },
    entries() { return rows.map(({ key, id }) => ({ key, value: id })); },
    forEach(visitor) { for (const row of rows) visitor(row.key, row.id); },
  };
};

const createArm = (arm, size) => {
  const initial = Array.from({ length: size }, (_, id) => ({ key: `k${id}`, value: id }));
  if (arm === "array-map") return arrayMap(size);
  if (arm === "object-buckets") return new KeyedRegionBuckets(initial, 128);
  return new ColumnarKeyedRegion(initial, 128);
};

const checkOrder = (implementation, expected) => {
  const actual = [...implementation.entries()];
  if (actual.length !== expected.length) return false;
  for (let index = 0; index < expected.length; index++) {
    if (actual[index].key !== expected[index] || actual[index].value !== Number(expected[index].slice(1))) return false;
  }
  return true;
};

const runCell = (size, scenario) => {
  const arms = ["array-map", "object-buckets", "columnar-buckets"];
  const trace = buildTrace(size, scenario, warmup + samplesPerArm);
  const expected = Array.from({ length: size }, (_, id) => `k${id}`);
  for (const operation of trace) {
    const from = expected.indexOf(operation.key);
    expected.splice(from, 1);
    expected.push(operation.key);
  }
  const results = {};
  for (const arm of arms) {
    const implementation = createArm(arm, size);
    const samples = [];
    for (let index = 0; index < trace.length; index++) {
      const operation = trace[index];
      const started = now();
      implementation.moveBefore(operation.key, operation.anchorKey);
      const elapsed = now() - started;
      if (index >= warmup) samples.push(elapsed);
    }
    if (arm !== "array-map") implementation.assertIntegrity();
    if (!checkOrder(implementation, expected)) throw new Error(`${arm} order mismatch at ${size}/${scenario}`);
    results[arm] = summarize(samples);
  }
  return { size, scenario, traceOperations: trace.length, samplesPerArm, results };
};

const runScanCell = (size) => {
  const arms = ["array-map", "object-buckets", "columnar-buckets"];
  const results = {};
  for (const arm of arms) {
    const implementation = createArm(arm, size);
    const samples = [];
    let checksum = 0;
    for (let index = 0; index < warmup + samplesPerArm; index++) {
      const started = now();
      implementation.forEach((_key, value) => checksum += value);
      const elapsed = now() - started;
      if (index >= warmup) samples.push(elapsed);
    }
    const expected = (size * (size - 1)) / 2 * (warmup + samplesPerArm);
    if (checksum !== expected) throw new Error(`${arm} scan checksum mismatch at ${size}`);
    results[arm] = summarize(samples);
  }
  return { size, scenario: "full-sequential-scan", traceOperations: warmup + samplesPerArm, samplesPerArm, results };
};

const cells = [];
for (const size of sizes) for (const scenario of scenarios) cells.push(runCell(size, scenario));
for (const size of sizes) cells.push(runScanCell(size));
const record = {
  schemaVersion: "keyed-region-columnar-layout-v1",
  status: "PASS",
  label: "exploratory single-process mechanism benchmark",
  replication,
  runtime: { node: process.version, v8: process.versions.v8, platform: process.platform, arch: process.arch },
  warmupOperations: warmup,
  measuredOperationsPerArm: samplesPerArm,
  workload: "identical keyed move-to-tail traces and full sequential scans over a prebuilt ordered region; setup and parity checks are outside timed operations",
  arms: {
    "array-map": "array of row objects plus key-to-index Map; shifts and reindexes the suffix",
    "object-buckets": "existing linked buckets with per-row entry objects and key-to-entry Map",
    "columnar-buckets": "linked buckets with parallel key/value arrays and packed key-to-slot indexes",
  },
  cells,
};
await mkdir("results/keyed-region-columnar-layout-v1", { recursive: true });
await writeFile(`results/keyed-region-columnar-layout-v1/replication-${replication}.json`, `${JSON.stringify(record, null, 2)}\n`);
console.log(JSON.stringify(cells.map(({ size, scenario, results }) => ({ size, scenario, results })), null, 2));
