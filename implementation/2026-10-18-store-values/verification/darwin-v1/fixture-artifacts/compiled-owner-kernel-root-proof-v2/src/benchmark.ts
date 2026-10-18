import { CompiledBindings, type BindingEdge } from "./compiled_bindings.ts";

type Element = { type: "mesh"; key: number; props: { x: number } };

const renderLeaf = (key: number, x: number): Element => ({
  type: "mesh",
  key,
  props: { x },
});

interface VariantResult {
  medianMs: number;
  p95Ms: number;
  workPerFrame: {
    componentCalls: number;
    elementAndPropsAllocations: number;
    valueEqualityChecks: number;
    bindingVisits: number;
    hostWrites: number;
  };
}

const percentile = (values: number[], p: number) => {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * p))];
};

const measure = (
  fn: () => void,
  warmupFrames: number,
  sampleFrames: number,
  framesPerSample: number,
) => {
  for (let frame = 0; frame < warmupFrames; frame++) fn();
  const samples: number[] = [];
  for (let frame = 0; frame < sampleFrames; frame++) {
    const start = performance.now();
    for (let batchFrame = 0; batchFrame < framesPerSample; batchFrame++) fn();
    samples.push((performance.now() - start) / framesPerSample);
  }
  return { medianMs: percentile(samples, 0.5), p95Ms: percentile(samples, 0.95) };
};

const makeChangedIds = (count: number, changedCount: number) => {
  const ids = new Uint32Array(changedCount);
  const stride = Math.max(1, Math.floor(count / changedCount));
  for (let i = 0; i < changedCount; i++) ids[i] = (i * stride) % count;
  return ids;
};

const runScenario = (
  entityCount: number,
  changedFraction: number,
  sampleFrames: number,
  framesPerSample: number,
) => {
  const changedCount = Math.max(1, Math.floor(entityCount * changedFraction));
  const changedIds = makeChangedIds(entityCount, changedCount);
  const edges: BindingEdge[] = Array.from({ length: entityCount }, (_, id) => [id, id] as const);
  const graph = new CompiledBindings(entityCount, entityCount, edges);

  // Component/VNode baseline: each changed leaf component executes, creates a
  // JSX-like element and props object, shallow-compares its prop, then commits.
  // This is deliberately not called React: it omits React's actual scheduler,
  // fiber bookkeeping, compiler, and host config.
  const previous: Element[] = Array.from({ length: entityCount }, (_, key) => ({
    type: "mesh",
    key,
    props: { x: 0 },
  }));
  const reactLikeHost = new Float64Array(entityCount);
  let frame = 0;
  const baselineWork = {
    componentCalls: changedCount,
    elementAndPropsAllocations: changedCount * 2,
    valueEqualityChecks: changedCount,
    bindingVisits: 0,
    hostWrites: changedCount,
  };
  const baselineTime = measure(() => {
    frame++;
    for (const id of changedIds) {
      const next = renderLeaf(id, frame + id);
      if (!Object.is(previous[id].props.x, next.props.x)) {
        reactLikeHost[id] = next.props.x;
      }
      previous[id] = next;
    }
  }, 8, sampleFrames, framesPerSample);

  frame = 0;
  const graphWork = {
    componentCalls: 0,
    elementAndPropsAllocations: 0,
    valueEqualityChecks: changedCount,
    bindingVisits: changedCount,
    hostWrites: changedCount,
  };
  const graphTime = measure(() => {
    frame++;
    for (const id of changedIds) graph.set(id, frame + id);
    const stats = graph.flush(undefined, true)!;
    graphWork.bindingVisits = stats.bindingVisits;
    graphWork.hostWrites = stats.hostWrites;
  }, 8, sampleFrames, framesPerSample);

  for (let id = 0; id < entityCount; id++) {
    if (!Object.is(reactLikeHost[id], graph.hostValues[id])) {
      throw new Error(`Output mismatch at entity ${id}`);
    }
  }

  return {
    entityCount,
    changedCount,
    changedFraction,
    baseline: { ...baselineTime, workPerFrame: baselineWork } satisfies VariantResult,
    compiledGraph: { ...graphTime, workPerFrame: graphWork } satisfies VariantResult,
    parity: "identical host values",
  };
};

export const runBenchmark = (sampleFrames = 31) => {
  const scenarios = [
    [10_000, 0.001],
    [10_000, 0.1],
    [10_000, 1],
    [100_000, 0.001],
    [100_000, 0.1],
    [100_000, 1],
  ] as const;
  return scenarios.map(([entityCount, changedFraction]) =>
    runScenario(
      entityCount,
      changedFraction,
      sampleFrames,
      Math.max(1, Math.ceil(10_000 / Math.max(1, Math.floor(entityCount * changedFraction)))),
    )
  );
};

if (import.meta.main) {
  console.log(JSON.stringify({
    benchmark: "compiled-bindings vs synthetic component/VNode model",
    disclaimer: "Not a React benchmark. It omits React scheduling, Fiber, compiler, host config, and browser host costs.",
    runtime: Deno.version,
    hardwareConcurrency: navigator.hardwareConcurrency,
    results: runBenchmark(),
  }, null, 2));
}
