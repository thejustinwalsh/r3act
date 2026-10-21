type Arm = "graph" | "fullScan";
type SharedMode = "none" | "scale" | "scaleAndOpacity";

type Pair = {
  pair: number;
  order: Arm[];
  graphMs: number;
  fullScanMs: number;
  repeats: number;
  parityFailures: number;
};

const permutations: Arm[][] = [["graph", "fullScan"], ["fullScan", "graph"]];

const nearestRank = (values: number[], p: number) => {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.max(0, Math.ceil(p * sorted.length) - 1)];
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

const makeOrders = (pairCount: number, seed: number): Arm[][] => {
  const orders = Array.from({ length: pairCount }, (_, index) => [...permutations[index % 2]]);
  const random = makeRandom(seed);
  for (let i = orders.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [orders[i], orders[j]] = [orders[j], orders[i]];
  }
  return orders;
};

const makeChangedIds = (count: number, fraction: number) => {
  const changed = Math.max(1, Math.floor(count * fraction));
  const ids = new Uint32Array(changed);
  for (let i = 0; i < changed; i++) ids[i] = Math.floor(i * count / changed);
  return ids;
};

type State = {
  x: Float64Array;
  left: Float64Array;
  transform: Float64Array;
  opacity: Float64Array;
  scale: number;
  alpha: number;
};

const makeState = (count: number): State => {
  const x = new Float64Array(count);
  const left = new Float64Array(count);
  const transform = new Float64Array(count);
  const opacity = new Float64Array(count);
  for (let i = 0; i < count; i++) {
    x[i] = i % 320;
    left[i] = x[i];
    transform[i] = x[i];
    opacity[i] = 0.5;
  }
  return { x, left, transform, opacity, scale: 1, alpha: 0.5 };
};

const runScenario = (
  entityCount: number,
  changedFraction: number,
  sharedMode: SharedMode,
  pairCount: number,
  seed: number,
) => {
  const ids = makeChangedIds(entityCount, changedFraction);
  const graphState = makeState(entityCount);
  const scanState = makeState(entityCount);

  // The three binding columns are left=0, transform=1, opacity=2 per entity.
  // Local x fans out to left and transform. Shared scale fans out to every
  // transform. Shared alpha fans out to every opacity.
  const bindingCount = entityCount * 3;
  const dirtyBindings = new Uint8Array(bindingCount);
  const dirtyQueue = new Uint32Array(bindingCount);
  let dirtyCount = 0;
  const localDirty = new Uint8Array(entityCount);
  const enqueue = (bindingId: number) => {
    if (dirtyBindings[bindingId] === 0) {
      dirtyBindings[bindingId] = 1;
      dirtyQueue[dirtyCount++] = bindingId;
    }
  };
  const scaleChanged = sharedMode === "scale" || sharedMode === "scaleAndOpacity";
  const alphaChanged = sharedMode === "scaleAndOpacity";

  const graphUpdate = (epoch: number) => {
    for (const id of ids) {
      const value = epoch + id % 101;
      graphState.x[id] = value;
      enqueue(id * 3);
      enqueue(id * 3 + 1);
    }
    if (scaleChanged) {
      graphState.scale = 1 + epoch / 1000;
      for (let id = 0; id < entityCount; id++) enqueue(id * 3 + 1);
    }
    if (alphaChanged) {
      graphState.alpha = (epoch % 100) / 100;
      for (let id = 0; id < entityCount; id++) enqueue(id * 3 + 2);
    }

    for (let index = 0; index < dirtyCount; index++) {
      const bindingId = dirtyQueue[index];
      const entityId = Math.floor(bindingId / 3);
      switch (bindingId % 3) {
        case 0:
          graphState.left[entityId] = graphState.x[entityId];
          break;
        case 1:
          graphState.transform[entityId] = graphState.x[entityId] * graphState.scale;
          break;
        case 2:
          graphState.opacity[entityId] = graphState.alpha;
          break;
      }
      dirtyBindings[bindingId] = 0;
    }
    dirtyCount = 0;
  };

  const fullScanUpdate = (epoch: number) => {
    for (const id of ids) {
      scanState.x[id] = epoch + id % 101;
      localDirty[id] = 1;
    }
    if (scaleChanged) scanState.scale = 1 + epoch / 1000;
    if (alphaChanged) scanState.alpha = (epoch % 100) / 100;

    for (let id = 0; id < entityCount; id++) {
      if (localDirty[id] !== 0) {
        scanState.left[id] = scanState.x[id];
        scanState.transform[id] = scanState.x[id] * scanState.scale;
        localDirty[id] = 0;
      } else if (scaleChanged) {
        scanState.transform[id] = scanState.x[id] * scanState.scale;
      }
      if (alphaChanged) scanState.opacity[id] = scanState.alpha;
    }
  };

  const repeats = scaleChanged ? (alphaChanged ? 1 : 2) : changedFraction >= 1 ? 1 : changedFraction >= 0.1 ? 8 : 32;
  const orders = makeOrders(pairCount, seed);
  const countParityFailures = () => {
    let failures = 0;
    for (let id = 0; id < entityCount; id++) {
      if (!Object.is(graphState.left[id], scanState.left[id])) failures++;
      if (!Object.is(graphState.transform[id], scanState.transform[id])) failures++;
      if (!Object.is(graphState.opacity[id], scanState.opacity[id])) failures++;
    }
    return failures;
  };
  let epoch = 1;
  for (let warmup = 0; warmup < 12; warmup++) {
    for (const arm of orders[warmup % orders.length]) {
      for (let repeat = 0; repeat < repeats; repeat++) {
        if (arm === "graph") graphUpdate(epoch++);
        else fullScanUpdate(epoch++);
      }
    }
  }

  const pairs: Pair[] = [];
  for (let pair = 0; pair < pairCount; pair++) {
    const order = orders[pair];
    let graphMs = 0;
    let fullScanMs = 0;
    // Both implementations receive identical epochs for this paired block.
    const firstEpoch = epoch;
    for (const arm of order) {
      const start = performance.now();
      for (let repeat = 0; repeat < repeats; repeat++) {
        const pairedEpoch = firstEpoch + repeat;
        if (arm === "graph") graphUpdate(pairedEpoch);
        else fullScanUpdate(pairedEpoch);
      }
      const elapsed = (performance.now() - start) / repeats;
      if (arm === "graph") graphMs = elapsed;
      else fullScanMs = elapsed;
    }
    const pairParityFailures = countParityFailures();
    epoch += repeats;
    pairs.push({ pair, order, graphMs, fullScanMs, repeats, parityFailures: pairParityFailures });
  }

  // One deterministic final update brings both arms to the same state before
  // comparing every host output, including outputs unaffected by the batch.
  graphUpdate(epoch);
  fullScanUpdate(epoch);
  const parityFailures = pairs.reduce((sum, pair) => sum + pair.parityFailures, 0) + countParityFailures();
  if (parityFailures !== 0) throw new Error(`Shared-dependency parity failed: ${parityFailures}`);

  const graphSamples = pairs.map((pair) => pair.graphMs);
  const scanSamples = pairs.map((pair) => pair.fullScanMs);
  const orderCounts = Object.fromEntries(permutations.map((order) => [
    order.join("/"), pairs.filter((pair) => pair.order.join("/") === order.join("/")).length,
  ]));
  return {
    entityCount,
    changedFraction,
    changedEntities: ids.length,
    sharedMode,
    affectedBindingsPerBatch: ids.length * 2 + (scaleChanged ? entityCount : 0) + (alphaChanged ? entityCount : 0) - (scaleChanged ? Math.min(ids.length, entityCount) : 0),
    repeatsPerPair: repeats,
    pairCount,
    seed,
    orderCounts,
    medianMs: { graph: nearestRank(graphSamples, 0.5), fullScan: nearestRank(scanSamples, 0.5) },
    p95Ms: { graph: nearestRank(graphSamples, 0.95), fullScan: nearestRank(scanSamples, 0.95) },
    graphWins: pairs.filter((pair) => pair.graphMs < pair.fullScanMs).length,
    fullScanWins: pairs.filter((pair) => pair.fullScanMs < pair.graphMs).length,
    parityFailures,
    pairs,
  };
};

export const runSharedDependencyExperiment = (pairCount = 48, baseSeed = 1_063_771_009) => {
  const entityCount = 10_000;
  const densities = [0.01, 0.1, 1];
  const modes: SharedMode[] = ["none", "scale", "scaleAndOpacity"];
  const scenarios = modes.flatMap((mode, modeIndex) => densities.map((fraction, densityIndex) =>
    runScenario(entityCount, fraction, mode, pairCount, baseSeed + modeIndex * 1009 + densityIndex * 97)
  ));
  return {
    schemaVersion: 1,
    experiment: "Shared-source fan-out and dirty-binding de-duplication",
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
      pairCount,
      balancedRandomizedOrders: true,
      changedFractions: densities,
      sharedModes: modes,
      localSource: "x[i] -> left[i], transform[i]",
      sharedScale: "scale -> transform[i] for every entity",
      sharedOpacity: "alpha -> opacity[i] for every entity",
      repeatedWritesForTimerFloor: true,
      setupExcluded: true,
      warmupPairs: 12,
      outputParity: "compare every left, transform, and opacity slot after paired updates",
    },
    scenarios,
  };
};
