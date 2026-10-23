import { CompiledBindings, type BindingEdge } from "./compiled_bindings.ts";

type Arm = "graph" | "bucketScan";

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

const makeBalancedOrders = (pairs: number, seed: number) => {
  const orders: Arm[][] = Array.from({ length: Math.floor(pairs / 2) }, () => ["graph", "bucketScan"]);
  while (orders.length < pairs) orders.push(["bucketScan", "graph"]);
  const random = makeRandom(seed);
  for (let i = orders.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [orders[i], orders[j]] = [orders[j], orders[i]];
  }
  return orders;
};

const makeIds = (entityCount: number, changedFraction: number, distribution: "spread" | "cluster") => {
  const changedCount = Math.max(1, Math.floor(entityCount * changedFraction));
  const ids = new Uint32Array(changedCount);
  if (distribution === "cluster") {
    const start = Math.floor((entityCount - changedCount) / 2);
    for (let i = 0; i < changedCount; i++) ids[i] = start + i;
  } else {
    // Avoid stride collapse above 50% density; these IDs stay unique and
    // evenly distributed for every tested fraction.
    for (let i = 0; i < changedCount; i++) ids[i] = Math.floor(i * entityCount / changedCount);
  }
  return ids;
};

const timeSample = (update: () => void, estimatedOps: number) => {
  const frames = Math.max(1, Math.min(1_000, Math.floor(50_000 / Math.max(1, estimatedOps))));
  const start = performance.now();
  for (let i = 0; i < frames; i++) update();
  return { ms: (performance.now() - start) / frames, frames };
};

const runScenario = (
  entityCount: number,
  changedFraction: number,
  bucketSize: number,
  distribution: "spread" | "cluster",
  pairCount: number,
  seed: number,
) => {
  const ids = makeIds(entityCount, changedFraction, distribution);
  const edges: BindingEdge[] = Array.from({ length: entityCount }, (_, id) => [id, id] as const);
  const graph = new CompiledBindings(entityCount, entityCount, edges);
  const bucketSource = new Float64Array(entityCount);
  const bucketHost = new Float64Array(entityCount);
  const dirtyEntities = new Uint8Array(entityCount);
  const bucketCount = Math.ceil(entityCount / bucketSize);
  const dirtyBuckets = new Uint32Array(bucketCount);
  const dirtyBucketFlags = new Uint8Array(bucketCount);
  let dirtyBucketCount = 0;
  const touchedBuckets = new Set<number>();
  for (const id of ids) touchedBuckets.add(Math.floor(id / bucketSize));
  const bucketEntityInspections = [...touchedBuckets].reduce((sum, bucket) =>
    sum + Math.min(bucketSize, entityCount - bucket * bucketSize), 0);

  let graphFrame = 0;
  let bucketFrame = 0;
  const graphUpdate = () => {
    graphFrame++;
    for (const id of ids) graph.set(id, graphFrame + id);
    graph.flush(undefined, false);
  };
  const bucketUpdate = () => {
    bucketFrame++;
    for (const id of ids) {
      const value = bucketFrame + id;
      if (!Object.is(bucketSource[id], value)) {
        bucketSource[id] = value;
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
          bucketHost[entity] = bucketSource[entity];
          dirtyEntities[entity] = 0;
        }
      }
      dirtyBucketFlags[bucket] = 0;
    }
    dirtyBucketCount = 0;
  };

  const estimatedOps = {
    graph: 2 * ids.length,
    bucketScan: 2 * ids.length + bucketEntityInspections,
  };
  const orders = makeBalancedOrders(pairCount, seed);
  for (let warmup = 0; warmup < 5; warmup++) {
    for (const arm of orders[warmup % orders.length]) {
      const update = arm === "graph" ? graphUpdate : bucketUpdate;
      const frames = Math.max(1, Math.min(1_000, Math.floor(50_000 / estimatedOps[arm])));
      for (let frame = 0; frame < frames; frame++) update();
    }
  }
  graphFrame = 0;
  bucketFrame = 0;
  const pairs = orders.map((order, pairIndex) => {
    const times: Partial<Record<Arm, { ms: number; frames: number }>> = {};
    for (const arm of order) {
      times[arm] = timeSample(arm === "graph" ? graphUpdate : bucketUpdate, estimatedOps[arm]);
    }
    return {
      pairIndex,
      order,
      graphMs: times.graph!.ms,
      bucketScanMs: times.bucketScan!.ms,
      graphFrames: times.graph!.frames,
      bucketFrames: times.bucketScan!.frames,
      graphFaster: times.graph!.ms < times.bucketScan!.ms,
    };
  });

  graphFrame = 0;
  bucketFrame = 0;
  graphUpdate();
  bucketUpdate();
  let parityFailures = 0;
  for (let entity = 0; entity < entityCount; entity++) {
    if (!Object.is(graph.hostValues[entity], bucketHost[entity])) parityFailures++;
  }
  if (parityFailures > 0) throw new Error(`Bucket parity failed for ${parityFailures} outputs`);

  const graphSamples = pairs.map((pair) => pair.graphMs);
  const bucketSamples = pairs.map((pair) => pair.bucketScanMs);
  const bucketOverGraph = pairs.map((pair) => pair.bucketScanMs / pair.graphMs);
  return {
    entityCount,
    changedFraction,
    changedCount: ids.length,
    distribution,
    bucketSize,
    dirtyBucketCount: touchedBuckets.size,
    bucketEntityInspectionsPerBatch: bucketEntityInspections,
    graphBindingVisitsPerBatch: ids.length,
    randomizationSeed: seed >>> 0,
    graphMedianMs: median(graphSamples),
    graphP95Ms: nearestRank(graphSamples, 0.95),
    bucketMedianMs: median(bucketSamples),
    bucketP95Ms: nearestRank(bucketSamples, 0.95),
    medianBucketOverGraph: median(bucketOverGraph),
    graphWins: pairs.filter((pair) => pair.graphFaster).length,
    bucketWins: pairs.filter((pair) => !pair.graphFaster).length,
    graphFirst: pairs.filter((pair) => pair.order[0] === "graph").length,
    bucketFirst: pairs.filter((pair) => pair.order[0] === "bucketScan").length,
    parityFailures,
    pairs,
  };
};

export const runBucketExperiment = (pairCount = 41, baseSeed = 1_905_426_017) => {
  const sizes = [1_000, 10_000, 50_000];
  const fractions = [0.01, 0.1, 0.15, 0.2, 0.25, 0.5, 0.75, 1];
  const distributions = ["spread", "cluster"] as const;
  const bucketSizes = [16, 64, 256, 1_024];
  const results = sizes.flatMap((entityCount, sizeIndex) =>
    fractions.flatMap((fraction, densityIndex) =>
      distributions.flatMap((distribution, distributionIndex) =>
        bucketSizes.map((bucketSize, bucketIndex) => {
          const seed = baseSeed + sizeIndex * 1_009 + densityIndex * 101 + distributionIndex * 13 + bucketIndex * 7;
          return runScenario(entityCount, fraction, bucketSize, distribution, pairCount, seed);
        })
      )
    )
  );
  return {
    schemaVersion: 1,
    experiment: "Deno randomized paired source queue versus dirty-bucket scan",
    environment: {
      deno: Deno.version.deno,
      v8: Deno.version.v8,
      os: Deno.build.os,
      arch: Deno.build.arch,
      hardwareConcurrency: navigator.hardwareConcurrency,
      sampleDate: new Date().toISOString(),
    },
    protocol: {
      pairCount,
      warmupPairs: 5,
      targetOperationsPerSample: 50_000,
      p95: "nearest-rank",
      order: "balanced randomized within pair",
      sources: "same source updates and values in both arms",
      graph: "typed-array source queue and compiled one-edge bindings; diagnostics disabled",
      bucketScan: "queue touched fixed-size buckets, scan their entity ranges, write dirty outputs",
      distributions: ["evenly spread", "contiguous cluster"],
      parity: "all target values compared after timing",
    },
    baseSeed,
    results,
  };
};
