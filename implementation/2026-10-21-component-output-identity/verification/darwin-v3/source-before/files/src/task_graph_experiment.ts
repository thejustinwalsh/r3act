import { defineTaskGraphPlan } from "./task_graph_plan.ts";
import { TaskGraphRuntime } from "./task_graph_runtime.ts";

type Arm = "taskGraph" | "fullScan";
type Pair = { pair: number; order: Arm[]; repeatsPerSample: number; taskGraphMs: number; fullScanMs: number };

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
  const orders: Arm[][] = Array.from({ length: pairCount }, (_, index) =>
    index % 2 === 0 ? ["taskGraph", "fullScan"] : ["fullScan", "taskGraph"]
  );
  const random = makeRandom(seed);
  for (let i = orders.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [orders[i], orders[j]] = [orders[j], orders[i]];
  }
  return orders;
};

const makeChangedSlots = (count: number, fraction: number) => {
  const changedCount = Math.max(1, Math.floor(count * fraction));
  const slots = new Uint32Array(changedCount);
  for (let i = 0; i < changedCount; i++) slots[i] = Math.floor(i * count / changedCount);
  return slots;
};

const runScenario = (entityCount: number, changedFraction: number, pairCount: number, seed: number) => {
  const sourceIds = Array.from({ length: entityCount }, (_, index) => `s${index}`);
  const taskIds = Array.from({ length: entityCount }, (_, index) => `t${index}`);
  const planStarted = performance.now();
  const plan = defineTaskGraphPlan(sourceIds, taskIds, sourceIds.map((source) => [`source:${source}`]));
  const planBuildMs = performance.now() - planStarted;
  const task = (values: readonly unknown[], inputs: readonly number[], start: number) => Number(values[inputs[start]]) + 1;
  const implementations = Object.fromEntries(taskIds.map((id) => [id, task]));
  const initialSources = Object.fromEntries(sourceIds.map((id) => [id, 0]));
  const runtimeStarted = performance.now();
  const graph = new TaskGraphRuntime(plan, implementations, initialSources);
  graph.initialize();
  const runtimeSetupMs = performance.now() - runtimeStarted;

  const changedSlots = makeChangedSlots(entityCount, changedFraction);
  const scanSources = new Float64Array(entityCount);
  const scanOutputs = new Float64Array(entityCount);
  scanOutputs.fill(1);
  const graphUpdate = () => {
    frame.taskGraph++;
    const value = frame.taskGraph;
    for (const slot of changedSlots) graph.setSourceSlot(slot, value);
    const executed = graph.flush();
    if (executed !== changedSlots.length) throw new Error(`Expected ${changedSlots.length} task executions, received ${executed}`);
  };
  const fullScanUpdate = () => {
    frame.fullScan++;
    const value = frame.fullScan;
    for (const slot of changedSlots) scanSources[slot] = value;
    for (let slot = 0; slot < entityCount; slot++) scanOutputs[slot] = scanSources[slot] + 1;
  };
  const frame: Record<Arm, number> = { taskGraph: 0, fullScan: 0 };
  const update: Record<Arm, () => void> = { taskGraph: graphUpdate, fullScan: fullScanUpdate };
  const orders = makeOrders(pairCount, seed);
  const repeatsPerSample = entityCount === 1_000
    ? 128
    : entityCount === 10_000 && changedFraction <= 0.01
    ? 128
    : entityCount === 10_000 && changedFraction <= 0.05
    ? 32
    : entityCount === 50_000 && changedFraction <= 0.01
    ? 32
    : 8;
  for (let warmup = 0; warmup < 4; warmup++) {
    for (const arm of orders[warmup % orders.length]) {
      for (let repeat = 0; repeat < repeatsPerSample; repeat++) update[arm]();
    }
  }
  const pairs: Pair[] = orders.map((order, pair) => {
    const times: Partial<Record<Arm, number>> = {};
    for (const arm of order) {
      const start = performance.now();
      for (let repeat = 0; repeat < repeatsPerSample; repeat++) update[arm]();
      times[arm] = (performance.now() - start) / repeatsPerSample;
    }
    return { pair, order, repeatsPerSample, taskGraphMs: times.taskGraph!, fullScanMs: times.fullScan! };
  });

  let parityFailures = 0;
  for (let slot = 0; slot < entityCount; slot++) {
    if (!Object.is(graph.getTaskValue(taskIds[slot]), scanOutputs[slot])) parityFailures++;
  }
  if (parityFailures) throw new Error(`Task graph/full scan parity failed for ${parityFailures} outputs`);
  const graphSamples = pairs.map((pair) => pair.taskGraphMs);
  const scanSamples = pairs.map((pair) => pair.fullScanMs);
  return {
    entityCount,
    changedFraction,
    changedCount: changedSlots.length,
    planBuildMs,
    runtimeSetupMs,
    repeatsPerSample,
    pairCount,
    medianMs: { taskGraph: nearestRank(graphSamples, 0.5), fullScan: nearestRank(scanSamples, 0.5) },
    p95Ms: { taskGraph: nearestRank(graphSamples, 0.95), fullScan: nearestRank(scanSamples, 0.95) },
    pairedWins: {
      taskGraph: pairs.filter((pair) => pair.taskGraphMs < pair.fullScanMs).length,
      fullScan: pairs.filter((pair) => pair.fullScanMs < pair.taskGraphMs).length,
      ties: pairs.filter((pair) => pair.fullScanMs === pair.taskGraphMs).length,
    },
    parityFailures,
    pairs,
  };
};

export const runTaskGraphExperiment = (pairCount = 24, baseSeed = 1_610_091_001) => {
  const entityCounts = [1_000, 10_000, 50_000];
  const changedFractions = [0.001, 0.005, 0.01, 0.02, 0.05, 0.1, 0.25, 0.5, 1];
  const results = entityCounts.flatMap((count, sizeIndex) =>
    changedFractions.map((fraction, densityIndex) =>
      runScenario(count, fraction, pairCount, baseSeed + sizeIndex * 101 + densityIndex * 17)
    )
  );
  return {
    schemaVersion: 1,
    experiment: "Paired task-graph dispatch versus full recomputation",
    environment: {
      deno: Deno.version.deno,
      v8: Deno.version.v8,
      os: Deno.build.os,
      arch: Deno.build.arch,
      hardwareConcurrency: navigator.hardwareConcurrency,
      sampleDate: new Date().toISOString(),
    },
    protocol: {
      entityCounts,
      changedFractions,
      pairCount,
      repeatsPerSample: "Adaptive per scenario: 128 for 1k, 128 for 10k at <=1%, 32 for 10k at <=5%, 32 for 50k at <=1%, otherwise 8.",
      warmupPairs: 4,
      randomizationSeed: baseSeed >>> 0,
      design: "Each source feeds one independent task. Every changed source changes its output. Each pair measures eight repeated batches per arm; arm order is balanced and seeded. Plan build and runtime setup are reported separately from updates.",
      measurement: "Source writes, task dispatch, and derived output updates are included; DOM, VDOM reconciliation, and paint are excluded.",
    },
    results,
  };
};
