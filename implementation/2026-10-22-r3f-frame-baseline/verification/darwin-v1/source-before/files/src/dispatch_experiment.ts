import { CompiledBindings, type BindingEdge } from "./compiled_bindings.ts";

type Arm = "graph" | "bucketScan" | "fullScan";
type Distribution = "spread" | "cluster";

const arms: Arm[] = ["graph", "bucketScan", "fullScan"];
const permutations: Arm[][] = [
  ["graph", "bucketScan", "fullScan"],
  ["graph", "fullScan", "bucketScan"],
  ["bucketScan", "graph", "fullScan"],
  ["bucketScan", "fullScan", "graph"],
  ["fullScan", "graph", "bucketScan"],
  ["fullScan", "bucketScan", "graph"],
];

const nearestRank = (values: number[], p: number) => {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.max(0, Math.ceil(p * sorted.length) - 1)];
};

const median = (values: number[]) => nearestRank(values, 0.5);

const makeRandom = (seed: number) => {
  let state = seed >>> 0;
  return () => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    return (state >>> 0) / 0x1_0000_0000;
  };
};

const makeOrders = (pairCount: number, seed: number) => {
  const orders: Arm[][] = Array.from({ length: pairCount }, (_, index) => [...permutations[index % permutations.length]]);
  const random = makeRandom(seed);
  for (let i = orders.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [orders[i], orders[j]] = [orders[j], orders[i]];
  }
  return orders;
};

const makeIds = (entityCount: number, changedFraction: number, distribution: Distribution) => {
  const changedCount = Math.max(1, Math.floor(entityCount * changedFraction));
  const ids = new Uint32Array(changedCount);
  if (distribution === "cluster") {
    const start = Math.floor((entityCount - changedCount) / 2);
    for (let i = 0; i < changedCount; i++) ids[i] = start + i;
  } else {
    for (let i = 0; i < changedCount; i++) ids[i] = Math.floor(i * entityCount / changedCount);
  }
  return ids;
};

const runScenario = (
  entityCount: number,
  changedFraction: number,
  distribution: Distribution,
  bucketSize: number,
  pairCount: number,
  seed: number,
) => {
  const ids = makeIds(entityCount, changedFraction, distribution);
  const edges: BindingEdge[] = Array.from({ length: entityCount }, (_, id) => [id, id] as const);
  const graph = new CompiledBindings(entityCount, entityCount, edges);
  const sourceValues = {
    graph: new Float64Array(entityCount),
    bucketScan: new Float64Array(entityCount),
    fullScan: new Float64Array(entityCount),
  };
  const hostValues = {
    graph: new Float64Array(entityCount),
    bucketScan: new Float64Array(entityCount),
    fullScan: new Float64Array(entityCount),
  };
  const dirtyEntities = new Uint8Array(entityCount);
  const dirtyBuckets = new Uint32Array(Math.ceil(entityCount / bucketSize));
  const dirtyBucketFlags = new Uint8Array(dirtyBuckets.length);
  let dirtyBucketCount = 0;
  const frame = { graph: 0, bucketScan: 0, fullScan: 0 };

  const graphUpdate = () => {
    frame.graph++;
    for (const id of ids) graph.set(id, frame.graph + id);
    graph.flush(undefined, false);
  };
  const bucketUpdate = () => {
    frame.bucketScan++;
    for (const id of ids) {
      const value = frame.bucketScan + id;
      if (!Object.is(sourceValues.bucketScan[id], value)) {
        sourceValues.bucketScan[id] = value;
        if (dirtyEntities[id] === 0) {
          dirtyEntities[id] = 1;
          const bucket = Math.floor(id / bucketSize);
          if (dirtyBucketFlags[bucket] === 0) {
            dirtyBucketFlags[bucket] = 1;
            dirtyBuckets[dirtyBucketCount++] = bucket;
          }
        }
      }
    }
    for (let index = 0; index < dirtyBucketCount; index++) {
      const bucket = dirtyBuckets[index];
      const first = bucket * bucketSize;
      const last = Math.min(entityCount, first + bucketSize);
      for (let entity = first; entity < last; entity++) {
        if (dirtyEntities[entity] !== 0) {
          hostValues.bucketScan[entity] = sourceValues.bucketScan[entity];
          dirtyEntities[entity] = 0;
        }
      }
      dirtyBucketFlags[bucket] = 0;
    }
    dirtyBucketCount = 0;
  };
  const scanDirtyFlags = new Uint8Array(entityCount);
  const fullScanUpdate = () => {
    frame.fullScan++;
    for (const id of ids) {
      const value = frame.fullScan + id;
      if (!Object.is(sourceValues.fullScan[id], value)) {
        sourceValues.fullScan[id] = value;
        scanDirtyFlags[id] = 1;
      }
    }
    for (let entity = 0; entity < entityCount; entity++) {
      if (scanDirtyFlags[entity] !== 0) {
        hostValues.fullScan[entity] = sourceValues.fullScan[entity];
        scanDirtyFlags[entity] = 0;
      }
    }
  };
  const update: Record<Arm, () => void> = { graph: graphUpdate, bucketScan: bucketUpdate, fullScan: fullScanUpdate };

  const bucketCount = new Set([...ids].map((id) => Math.floor(id / bucketSize))).size;
  const bucketInspections = Math.min(entityCount, bucketCount * bucketSize);
  const workEstimate: Record<Arm, number> = {
    graph: 2 * ids.length,
    bucketScan: 2 * ids.length + bucketInspections,
    fullScan: entityCount + ids.length,
  };
  const orders = makeOrders(pairCount, seed);
  for (let warmup = 0; warmup < 6; warmup++) {
    for (const arm of orders[warmup % orders.length]) {
      const frames = Math.max(1, Math.min(1_000, Math.floor(50_000 / workEstimate[arm])));
      for (let index = 0; index < frames; index++) update[arm]();
    }
  }
  frame.graph = frame.bucketScan = frame.fullScan = 0;
  const pairs = orders.map((order, pairIndex) => {
    const times: Partial<Record<Arm, number>> = {};
    for (const arm of order) {
      const frames = Math.max(1, Math.min(1_000, Math.floor(50_000 / workEstimate[arm])));
      const start = performance.now();
      for (let index = 0; index < frames; index++) update[arm]();
      times[arm] = (performance.now() - start) / frames;
    }
    return { pairIndex, order, graphMs: times.graph!, bucketScanMs: times.bucketScan!, fullScanMs: times.fullScan! };
  });

  frame.graph = frame.bucketScan = frame.fullScan = 0;
  graphUpdate();
  bucketUpdate();
  fullScanUpdate();
  let parityFailures = 0;
  for (let entity = 0; entity < entityCount; entity++) {
    const expected = graph.hostValues[entity];
    if (!Object.is(expected, hostValues.bucketScan[entity])) parityFailures++;
    if (!Object.is(expected, hostValues.fullScan[entity])) parityFailures++;
  }
  if (parityFailures !== 0) throw new Error(`Three-way output parity failed: ${parityFailures} mismatches`);

  const graphSamples = pairs.map((pair) => pair.graphMs);
  const bucketSamples = pairs.map((pair) => pair.bucketScanMs);
  const scanSamples = pairs.map((pair) => pair.fullScanMs);
  return {
    entityCount,
    changedFraction,
    changedCount: ids.length,
    distribution,
    bucketSize,
    dirtyBucketCount: bucketCount,
    bucketEntityInspectionsPerBatch: bucketInspections,
    sourceUpdateWorkPerBatch: ids.length,
    graphBindingVisitsPerBatch: ids.length,
    equivalentHostWritesPerBatch: ids.length,
    randomizationSeed: seed >>> 0,
    armOrderCounts: Object.fromEntries(permutations.map((permutation) => [permutation.join("/"), pairs.filter((pair) => pair.order.join("/") === permutation.join("/")).length])),
    mediansMs: { graph: median(graphSamples), bucketScan: median(bucketSamples), fullScan: median(scanSamples) },
    p95Ms: {
      graph: nearestRank(graphSamples, 0.95),
      bucketScan: nearestRank(bucketSamples, 0.95),
      fullScan: nearestRank(scanSamples, 0.95),
    },
    pairwiseWins: {
      graphOverBucket: pairs.filter((pair) => pair.graphMs < pair.bucketScanMs).length,
      bucketOverGraph: pairs.filter((pair) => pair.bucketScanMs < pair.graphMs).length,
      graphOverFullScan: pairs.filter((pair) => pair.graphMs < pair.fullScanMs).length,
      fullScanOverGraph: pairs.filter((pair) => pair.fullScanMs < pair.graphMs).length,
      bucketOverFullScan: pairs.filter((pair) => pair.bucketScanMs < pair.fullScanMs).length,
      fullScanOverBucket: pairs.filter((pair) => pair.fullScanMs < pair.bucketScanMs).length,
    },
    parityFailures,
    pairs,
  };
};

export const runDispatchExperiment = (pairCount = 48, baseSeed = 1_222_641_003) => {
  const entityCount = 50_000;
  const bucketSize = 64;
  const fractions = [0.01, 0.1, 0.15, 0.2, 0.25, 0.5, 0.75, 1];
  const distributions: Distribution[] = ["spread", "cluster"];
  const results = fractions.flatMap((fraction, densityIndex) =>
    distributions.map((distribution, distributionIndex) =>
      runScenario(
        entityCount,
        fraction,
        distribution,
        bucketSize,
        pairCount,
        baseSeed + densityIndex * 101 + distributionIndex * 13,
      )
    )
  );
  return {
    schemaVersion: 1,
    experiment: "Three-way randomized paired graph, dirty-bucket, and full-scan propagation",
    environment: {
      deno: Deno.version.deno,
      v8: Deno.version.v8,
      os: Deno.build.os,
      arch: Deno.build.arch,
      hardwareConcurrency: navigator.hardwareConcurrency,
      sampleDate: new Date().toISOString(),
    },
    protocol: {
      entityCount,
      bucketSize,
      changedFractions: fractions,
      distributions,
      pairCount,
      warmupPairs: 6,
      armOrders: "all six permutations balanced eight times, then shuffled across 48 paired blocks",
      targetOperationsPerArmSample: 50_000,
      p95: "nearest-rank",
      inputAccounting: "all paths update the same changed source IDs and values",
      host: "Float64Array; same output values and number of host writes",
      graphInstrumentation: "disabled during timed flushes",
      setup: "graph construction and dirty-structure allocation excluded from timed updates",
      outputParity: "all host outputs compared across all three paths after every scenario",
      caveat: "one-edge-per-entity scalar topology; 64-entity bucket size; no DOM or React work",
    },
    baseSeed,
    results,
  };
};
