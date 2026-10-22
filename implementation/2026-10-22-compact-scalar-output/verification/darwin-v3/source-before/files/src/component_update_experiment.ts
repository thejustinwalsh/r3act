import { ComponentStateRoot } from "./component_state_runtime.ts";
import { jsx } from "./jsx_binding_runtime.ts";
import { MemoryVDOMHost, type MemoryNode } from "./vdom_snapshot_runtime.ts";
import { componentStateSitesPlan } from "./browser/generated_component_state_sites.ts";
import { BenchmarkItem } from "./browser/generated_component_state_transform.tsx";

type Arm = "ownerCache" | "fullRender";
type Sample = { pair: number; order: readonly [Arm, Arm]; milliseconds: Record<Arm, number> };
type Scenario = {
  size: number;
  seed: number;
  warmupPairs: number;
  measuredPairs: number;
  medianMs: Record<Arm, number>;
  p95Ms: Record<Arm, number>;
  rendersPerUpdate: Record<Arm, number>;
  renderCountContract: boolean;
  partialCommitsPerUpdate: Record<Arm, number>;
  partialCommitContract: boolean;
  finalOutputParity: boolean;
  samples: Sample[];
};

const nearestRank = (values: number[], quantile: number): number => {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.max(0, Math.ceil(quantile * sorted.length) - 1)];
};

const createArm = (size: number) => {
  let renders = 0;
  const onRender = () => renders++;
  const host = new MemoryVDOMHost();
  const container = host.createContainer();
  const root = new ComponentStateRoot(host, container, { invalidationPlan: componentStateSitesPlan.invalidation_graph });
  const tree = () => jsx("main", {}, Array.from({ length: size }, (_, id) => jsx(BenchmarkItem, { key: id, id, onRender })));
  root.mount(tree());
  const target = container.children[0]?.children.at(-1);
  if (!target || typeof target.props.onClick !== "function") throw new Error("Target component did not mount");
  return {
    root,
    tree,
    container,
    get renders() { return renders; },
    clickTarget: () => (target.props.onClick as () => void)(),
  };
};

const median = (values: number[]) => nearestRank(values, 0.5);
const canonical = (node: MemoryNode): unknown => node.kind === "text"
  ? { text: node.text }
  : {
    tag: node.tag,
    props: Object.fromEntries(Object.entries(node.props).filter(([name]) => !/^on[A-Z]/.test(name))),
    children: node.children.map(canonical),
  };

/** Paired Deno ablation over OXC-generated components and their emitted state-site graph. */
export const runComponentUpdateScenario = (
  size: number,
  warmupPairs = 5,
  measuredPairs = 25,
  seed = 1_610_091_001,
): Scenario => {
  if (!Number.isInteger(size) || size < 1 || !Number.isInteger(warmupPairs) || warmupPairs < 0 ||
    !Number.isInteger(measuredPairs) || measuredPairs < 1) throw new RangeError("Invalid component update scenario");
  const ownerCache = createArm(size);
  const fullRender = createArm(size);
  const samples: Sample[] = [];
  let expectedSelected = false;
  const iterations = warmupPairs + measuredPairs;
  let ownerRendersBeforeMeasurement = 0;
  let fullRendersBeforeMeasurement = 0;
  let ownerPartialCommitsBeforeMeasurement = 0;
  let fullPartialCommitsBeforeMeasurement = 0;
  let randomState = (seed ^ size) >>> 0;
  const nextBit = () => {
    randomState ^= randomState << 13;
    randomState ^= randomState >>> 17;
    randomState ^= randomState << 5;
    return randomState & 1;
  };

  for (let pair = 0; pair < iterations; pair++) {
    if (pair === warmupPairs) {
      ownerRendersBeforeMeasurement = ownerCache.renders;
      fullRendersBeforeMeasurement = fullRender.renders;
      ownerPartialCommitsBeforeMeasurement = ownerCache.root.partialCommitCount;
      fullPartialCommitsBeforeMeasurement = fullRender.root.partialCommitCount;
    }
    ownerCache.clickTarget();
    fullRender.clickTarget();
    expectedSelected = !expectedSelected;
    const order: readonly [Arm, Arm] = nextBit() === 0
      ? ["ownerCache", "fullRender"]
      : ["fullRender", "ownerCache"];
    const milliseconds = { ownerCache: 0, fullRender: 0 };
    for (const arm of order) {
      const start = performance.now();
      if (arm === "ownerCache") ownerCache.root.flush();
      else fullRender.root.update(fullRender.tree());
      milliseconds[arm] = performance.now() - start;
    }
    if (pair >= warmupPairs) samples.push({ pair: pair - warmupPairs, order, milliseconds });
  }

  const actualValue = ownerCache.container.children[0]?.children.at(-1)?.props["data-selected"];
  const fullValue = fullRender.container.children[0]?.children.at(-1)?.props["data-selected"];
  const arms: Arm[] = ["ownerCache", "fullRender"];
  const scenario: Scenario = {
    size,
    seed,
    warmupPairs,
    measuredPairs,
    medianMs: Object.fromEntries(arms.map((arm) => [arm, median(samples.map((sample) => sample.milliseconds[arm]))])) as Record<Arm, number>,
    p95Ms: Object.fromEntries(arms.map((arm) => [arm, nearestRank(samples.map((sample) => sample.milliseconds[arm]), 0.95)])) as Record<Arm, number>,
    rendersPerUpdate: {
      ownerCache: (ownerCache.renders - ownerRendersBeforeMeasurement) / measuredPairs,
      fullRender: (fullRender.renders - fullRendersBeforeMeasurement) / measuredPairs,
    },
    renderCountContract: (ownerCache.renders - ownerRendersBeforeMeasurement) / measuredPairs === 1 &&
      (fullRender.renders - fullRendersBeforeMeasurement) / measuredPairs === size,
    partialCommitsPerUpdate: {
      ownerCache: (ownerCache.root.partialCommitCount - ownerPartialCommitsBeforeMeasurement) / measuredPairs,
      fullRender: (fullRender.root.partialCommitCount - fullPartialCommitsBeforeMeasurement) / measuredPairs,
    },
    partialCommitContract: (ownerCache.root.partialCommitCount - ownerPartialCommitsBeforeMeasurement) === measuredPairs &&
      (fullRender.root.partialCommitCount - fullPartialCommitsBeforeMeasurement) === 0,
    finalOutputParity: actualValue === fullValue && actualValue === String(expectedSelected) &&
      JSON.stringify(canonical(ownerCache.container)) === JSON.stringify(canonical(fullRender.container)),
    samples,
  };
  ownerCache.root.dispose();
  fullRender.root.dispose();
  if (!scenario.renderCountContract) throw new Error(`Component update scenario violated render counts at size ${size}`);
  if (!scenario.finalOutputParity) throw new Error(`Component update scenario failed output parity at size ${size}`);
  return scenario;
};

export const runComponentUpdateExperiment = (
  sizes: readonly number[] = [100, 1_000, 5_000, 10_000],
  seed = 1_610_091_001,
) => ({
  schemaVersion: "component-update-ablation-v1",
  runtime: Deno.version,
  compiler: {
    sourceFile: componentStateSitesPlan.source_file,
    schemaVersion: componentStateSitesPlan.schema_version,
    invalidationSourceCount: componentStateSitesPlan.invalidation_graph.source_count,
    componentRegionCount: componentStateSitesPlan.invalidation_graph.region_component_site_ids.length,
  },
  methodology: {
    pairedOrder: "seeded pseudorandom order, recorded per pair",
    timer: "performance.now around one state update and commit",
    warmupPairs: 5,
    measuredPairs: 25,
    stateChangesPerBatch: 1,
    equalWork: "one native click state update on the final keyed OXC-generated BenchmarkItem; same tree, compiler-emitted invalidation graph, and retained in-memory VDOM host implementation",
    limitation: "owner-cache arm uses the compiler-selected owner and a globally unique stable host-root key to commit one host region without scanning siblings; structural changes and ineligible trees fall back to full reconciliation. This is not a browser or React comparison",
  },
  scenarios: sizes.map((size) => runComponentUpdateScenario(size, 5, 25, seed + size)),
});
