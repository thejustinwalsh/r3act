import { CompiledBindings, type BindingEdge } from "./compiled_bindings.ts";

type Arm = "scan" | "compiledGraph";

const nearestRank = (values: number[], probability: number) => {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.max(0, Math.ceil(probability * sorted.length) - 1)];
};

const summarize = (values: number[]) => ({
  medianMs: nearestRank(values, 0.5),
  p95Ms: nearestRank(values, 0.95),
});

const makeChangedIds = (entityCount: number, changedFraction: number) => {
  const changedCount = Math.max(1, Math.floor(entityCount * changedFraction));
  const ids = new Uint32Array(changedCount);
  for (let index = 0; index < changedCount; index++) {
    // Stratification remains evenly spread even when changedCount is greater
    // than half of entityCount (where an integer stride collapses to 1).
    ids[index] = Math.floor(index * entityCount / changedCount);
  }
  return ids;
};

const makeRandom = (seed: number) => {
  let state = seed >>> 0;
  return () => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    return (state >>> 0) / 0x1_0000_0000;
  };
};

const shuffledBalancedOrders = (pairCount: number, seed: number) => {
  const orders: Arm[][] = Array.from({ length: Math.floor(pairCount / 2) }, () => ["scan", "compiledGraph"]);
  while (orders.length < pairCount) orders.push(["compiledGraph", "scan"]);
  const random = makeRandom(seed);
  for (let index = orders.length - 1; index > 0; index--) {
    const other = Math.floor(random() * (index + 1));
    [orders[index], orders[other]] = [orders[other], orders[index]];
  }
  return orders;
};

const timeBatch = (update: () => void, estimatedOps: number, targetOps: number) => {
  const batchFrames = Math.max(1, Math.min(1_000, Math.floor(targetOps / Math.max(1, estimatedOps))));
  const started = performance.now();
  for (let frame = 0; frame < batchFrames; frame++) update();
  return { msPerBatch: (performance.now() - started) / batchFrames, batchFrames };
};

const runScenario = (
  entityCount: number,
  changedFraction: number,
  pairCount: number,
  seed: number,
) => {
  const changedIds = makeChangedIds(entityCount, changedFraction);
  const edges: BindingEdge[] = Array.from({ length: entityCount }, (_, id) => [id, id] as const);
  const graph = new CompiledBindings(entityCount, entityCount, edges);
  const dirtyFlags = new Uint8Array(entityCount);
  const scanSourceValues = new Float64Array(entityCount);
  const scanHostValues = new Float64Array(entityCount);

  let scanFrame = 0;
  let graphFrame = 0;
  const scanUpdate = () => {
    scanFrame++;
    for (const id of changedIds) {
      const value = scanFrame + id;
      if (!Object.is(scanSourceValues[id], value)) {
        scanSourceValues[id] = value;
        dirtyFlags[id] = 1;
      }
    }
    for (let entity = 0; entity < entityCount; entity++) {
      if (dirtyFlags[entity] !== 0) {
        scanHostValues[entity] = scanSourceValues[entity];
        dirtyFlags[entity] = 0;
      }
    }
  };
  const graphUpdate = () => {
    graphFrame++;
    for (const id of changedIds) graph.set(id, graphFrame + id);
    graph.flush(undefined, false);
  };
  const updates: Record<Arm, () => void> = { scan: scanUpdate, compiledGraph: graphUpdate };
  // Both arms do one input pass. The scan also visits every entity; the graph
  // also visits each changed binding during flush. Include both passes when
  // selecting repetitions so timed samples remain near the target duration.
  const estimatedOps: Record<Arm, number> = {
    scan: entityCount + changedIds.length,
    compiledGraph: changedIds.length * 2,
  };
  const orders = shuffledBalancedOrders(pairCount, seed);

  // Warm both arms in balanced order, then reset frame numbers so they start
  // each measured pair from equivalent logical inputs.
  for (let warmup = 0; warmup < 5; warmup++) {
    for (const arm of orders[warmup % orders.length]) {
      for (let frame = 0; frame < Math.max(1, Math.min(1_000, Math.floor(50_000 / estimatedOps[arm]))); frame++) {
        updates[arm]();
      }
    }
  }
  scanFrame = 0;
  graphFrame = 0;
  const pairSamples = orders.map((order, pairIndex) => {
    const timings: Partial<Record<Arm, { msPerBatch: number; batchFrames: number }>> = {};
    for (const arm of order) timings[arm] = timeBatch(updates[arm], estimatedOps[arm], 50_000);
    return {
      pairIndex,
      order,
      scanMs: timings.scan!.msPerBatch,
      graphMs: timings.compiledGraph!.msPerBatch,
      scanFrames: timings.scan!.batchFrames,
      graphFrames: timings.compiledGraph!.batchFrames,
      graphFaster: timings.compiledGraph!.msPerBatch < timings.scan!.msPerBatch,
    };
  });

  // Reset both arms to the same logical input and compare every output.
  scanFrame = 0;
  graphFrame = 0;
  scanUpdate();
  graphUpdate();
  let mismatches = 0;
  for (let entity = 0; entity < entityCount; entity++) {
    if (!Object.is(scanHostValues[entity], graph.hostValues[entity])) mismatches++;
  }
  if (mismatches !== 0) throw new Error(`Output mismatch: ${mismatches} values`);

  const scanSamples = pairSamples.map((pair) => pair.scanMs);
  const graphSamples = pairSamples.map((pair) => pair.graphMs);
  const scanGraphRatios = pairSamples.map((pair) => pair.scanMs / pair.graphMs);
  return {
    entityCount,
    changedFraction,
    changedCount: changedIds.length,
    randomizationSeed: seed >>> 0,
    scanEntitiesVisitedPerBatch: entityCount,
    graphBindingVisitsPerBatch: changedIds.length,
    equivalentHostWritesPerBatch: changedIds.length,
    pairSamples,
    scan: { ...summarize(scanSamples), samplesMs: scanSamples },
    compiledGraph: { ...summarize(graphSamples), samplesMs: graphSamples },
    paired: {
      medianScanOverGraph: nearestRank(scanGraphRatios, 0.5),
      graphFasterPairs: pairSamples.filter((pair) => pair.graphFaster).length,
      scanFasterPairs: pairSamples.filter((pair) => !pair.graphFaster).length,
      scanFirstPairs: pairSamples.filter((pair) => pair.order[0] === "scan").length,
      graphFirstPairs: pairSamples.filter((pair) => pair.order[0] === "compiledGraph").length,
    },
    outputParity: mismatches === 0,
  };
};

export const runDenoExperiment = (pairCount = 41, baseSeed = 1_736_031_009) => {
  const results = [1_000, 10_000, 50_000].flatMap((entityCount, sizeIndex) =>
    [0.01, 0.1, 0.15, 0.2, 0.25, 0.5, 0.75, 1].map((fraction, densityIndex) =>
      runScenario(entityCount, fraction, pairCount, baseSeed + sizeIndex * 101 + densityIndex * 17)
    )
  );
  return {
    schemaVersion: 4,
    experiment: "Deno randomized paired full scan versus compiled binding graph with matched input mutation and diagnostics disabled",
    environment: {
      deno: Deno.version.deno,
      v8: Deno.version.v8,
      typescript: Deno.version.typescript,
      os: Deno.build.os,
      arch: Deno.build.arch,
      hardwareConcurrency: navigator.hardwareConcurrency,
      sampleDate: new Date().toISOString(),
    },
    protocol: {
      pairCount,
      warmupPairs: 5,
      order: "balanced randomized within pair; per-scenario deterministic xorshift seed",
      targetOperationsPerArmSample: 50_000,
      maxFramesPerArmSample: 1_000,
      p95: "nearest-rank",
      changedIds: "stratified evenly spaced unique IDs; identical across arms",
      inputAccounting: "both arms iterate the same changed IDs and update source values; scan also marks dirty flags before full scan",
      instrumentation: "flush statistics disabled in the timed graph path; counters use the known one-edge-per-source topology",
      host: "Float64Array; equal number of host-buffer writes",
      outputCheck: "all outputs compared after timing",
      setup: "graph constructed before timed samples; setup excluded",
    },
    baseSeed,
    results,
  };
};
