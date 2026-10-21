import { ComponentStateRoot } from "../src/component_state_runtime.ts";
import {
  type MemoryNode,
  MemoryVDOMHost,
} from "../src/vdom_snapshot_runtime.ts";
import { jsx } from "../src/jsx_binding_runtime.ts";
import { componentStateSitesPlan } from "../src/browser/generated_component_state_structural.ts";
import { StructuralApp } from "../src/browser/generated_component_state_structural_transform.tsx";

const count = 10_000;
const warmups = 2;
const samplesPerOperation = 10;
const ids = () => Array.from({ length: count }, (_, id) => `row-${id}`);
const median = (values: number[]) => {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)];
};
const operations = ["rotate", "replace-edge", "filter-half"] as const;

const scenarios = [];
for (const operation of operations) {
  let token = "initial";
  let tick = 0;
  const profile = new Map<string, number[]>();
  let capture = false;
  const host = new MemoryVDOMHost();
  const container = host.createContainer();
  const root = new ComponentStateRoot<MemoryNode, MemoryNode>(host, container, {
    invalidationPlan: componentStateSitesPlan.invalidation_graph,
    profile: (phase, milliseconds) => {
      if (!capture) return;
      const values = profile.get(phase) ?? [];
      values.push(milliseconds);
      profile.set(phase, values);
    },
  });
  const applyNext = (previous: string[]) => {
    tick++;
    if (operation === "rotate") {
      return [...previous.slice(1), previous[0]];
    }
    if (operation === "replace-edge") {
      return [`new-${token}-${tick}`, ...previous.slice(0, -1)];
    }
    return previous.length > count / 2
      ? previous.filter((id) =>
        id.startsWith("row-") && Number(id.slice(4)) % 2 === 0
      )
      : ids();
  };
  root.mount(jsx(StructuralApp, { initialIds: ids(), applyNext }));
  const button = host.findByProp(container, "data-action", "toggle-structure");
  if (!button || typeof button.props.onClick !== "function") {
    throw new Error("Could not find the structural update handler");
  }
  const writeStart = host.writeCount;
  const placeStart = host.placementCount;
  const removeStart = host.removalCount;
  const wall: number[] = [];
  for (let index = 0; index < warmups + samplesPerOperation; index++) {
    token = `${operation}-${index}`;
    capture = index >= warmups;
    const started = performance.now();
    (button.props.onClick as () => void)();
    root.flush();
    const elapsed = performance.now() - started;
    if (capture) wall.push(elapsed);
  }
  capture = false;
  scenarios.push({
    operation,
    rows: count,
    measuredUpdates: wall.length,
    operationCountUpdates: warmups + samplesPerOperation,
    hostWrites: host.writeCount - writeStart,
    hostPlacements: host.placementCount - placeStart,
    hostRemovals: host.removalCount - removeStart,
    medianWallMs: median(wall),
    phaseMedianMs: Object.fromEntries(
      [...profile].map(([phase, values]) => [phase, median(values)]),
    ),
    caveat:
      "Exploratory Deno MemoryVDOMHost diagnostic; not comparable to browser DOM or primary AP v4 timings.",
  });
  root.dispose();
}
console.log(JSON.stringify(
  {
    schemaVersion: "component-state-structural-memory-profile-v1",
    status: "EXPLORATORY",
    collectedAt: new Date().toISOString(),
    runtime: {
      deno: Deno.version.deno,
      v8: Deno.version.v8,
      typescript: Deno.version.typescript,
      os: Deno.build.os,
      arch: Deno.build.arch,
    },
    workload: {
      rows: count,
      warmupsPerOperation: warmups,
      measuredUpdatesPerOperation: samplesPerOperation,
      host: "MemoryVDOMHost",
      phases:
        "owner.render-and-key, owner.expand-and-cache, vdom.normalize, vdom.reconcile-host, vdom.index-snapshot, root.flush",
    },
    limitations: [
      "One Deno process; this diagnostic is not a replicated performance result.",
      "MemoryVDOMHost uses an array-backed child list; its place/remove costs do not model browser DOM operations.",
      "No React arm, browser layout, paint, or presentation is included.",
      "Phase instrumentation adds timing calls and phase medians are not additive; compare them only as diagnostic proportions.",
    ],
    scenarios,
  },
  null,
  2,
));
