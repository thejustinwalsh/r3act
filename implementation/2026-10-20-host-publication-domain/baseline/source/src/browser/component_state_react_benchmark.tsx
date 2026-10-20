import { createElement, Fragment as ReactFragment, useState } from "react";
import { createRoot } from "react-dom/client";
import { flushSync } from "react-dom";
import { ComponentStateRoot, defineComponent } from "../component_state_runtime.ts";
import { Fragment as RuntimeFragment, jsx, type RuntimeNode } from "../jsx_binding_runtime.ts";
import { DOMVDOMHost } from "../vdom_snapshot_runtime.ts";
import { componentStateSitesPlan } from "./generated_component_state_sites.ts";
import { BenchmarkItem } from "./generated_component_state_transform.tsx";

type Arm = "react" | "runtime";
type Sample = { pair: number; order: readonly [Arm, Arm]; milliseconds: Record<Arm, number> };
type RecordResult = {
  schemaVersion: "component-state-react-browser-v1" | "component-state-tree-shape-browser-v1";
  status: "PASS" | "FAIL";
  collectedAt: string;
  count: number;
  groupCount: number;
  groupSize: number | null;
  topology: string;
  seed: number;
  warmupPairs: number;
  measuredPairs: number;
  updatesPerSample: number;
  browser: { userAgent: string; platform: string; hardwareConcurrency: number; devicePixelRatio: number };
  mountMs: Record<Arm, number>;
  medianMs: Record<Arm, number>;
  p95Ms: Record<Arm, number>;
  rendersPerUpdate: Record<Arm, number>;
  groupRendersPerUpdate: Record<Arm, number>;
  partialCommitsPerUpdate: number;
  partialCommitContract: boolean;
  dispatchMode: string;
  stableTargetIdentity: boolean;
  finalOutputParity: boolean;
  archiveFile: string | null;
  samples: Sample[];
  limitation: string;
};

const countControl = document.querySelector<HTMLSelectElement>("#count")!;
const groupCountControl = document.querySelector<HTMLSelectElement>("#group-count");
const seedControl = document.querySelector<HTMLInputElement>("#seed")!;
const resultNode = document.querySelector<HTMLPreElement>("#result")!;
const runButton = document.querySelector<HTMLButtonElement>("#run")!;
const exportButton = document.querySelector<HTMLButtonElement>("#export")!;
const reactContainer = document.querySelector<HTMLDivElement>("#react-root")!;
const runtimeContainer = document.querySelector<HTMLDivElement>("#runtime-root")!;
let latest: RecordResult | null = null;

const quantile = (samples: number[], p: number) => {
  const ordered = [...samples].sort((a, b) => a - b);
  return ordered[Math.max(0, Math.ceil(p * ordered.length) - 1)];
};

const nextRandom = (state: { value: number }) => {
  state.value ^= state.value << 13;
  state.value ^= state.value >>> 17;
  state.value ^= state.value << 5;
  return state.value & 1;
};

const settleRuntime = () => new Promise<void>((resolve) => queueMicrotask(resolve));

const run = async () => {
  runButton.disabled = true;
  exportButton.disabled = true;
  resultNode.className = "";
  resultNode.textContent = "Mounting both trees…";
  const count = Number(countControl.value);
  const seed = Number(seedControl.value) >>> 0;
  const query = new URLSearchParams(location.search);
  const treeShapeStudy = query.get("study") === "tree-shape";
  const groupCount = Number(groupCountControl?.value ?? query.get("groups") ?? 0);
  if (!Number.isInteger(count) || count < 1 || !Number.isInteger(seed) ||
    ![0, 10, 100, 1_000].includes(groupCount) || (groupCount > 0 && count % groupCount !== 0) ||
    (treeShapeStudy && count !== 10_000)) throw new Error("Invalid benchmark controls");
  const groupSize = groupCount === 0 ? null : count / groupCount;
  const targetId = count - 1;
  const warmupPairs = 8;
  const measuredPairs = 40;
  const updatesPerSample = 100;
  const orderState = { value: (seed ^ count) >>> 0 };
  let reactRenders = 0;
  let runtimeRenders = 0;
  let reactGroupRenders = 0;
  let runtimeGroupRenders = 0;
  let selected = false;

  function ReactItem({ id }: { id: number }) {
    const [value, setValue] = useState(false);
    reactRenders++;
    return createElement("span", { "data-id": id, "data-selected": String(value), onClick: () => setValue((previous: boolean) => !previous) }, String(value));
  }

  function ReactGroup({ items, onRender }: { items: any[]; onRender: () => void }) {
    onRender();
    return createElement(ReactFragment, null, items);
  }

  const reactRoot = createRoot(reactContainer);
  const runtimeRoot = new ComponentStateRoot(new DOMVDOMHost(), runtimeContainer, {
    invalidationPlan: componentStateSitesPlan.invalidation_graph,
  });
  const onRuntimeRender = () => runtimeRenders++;
  const onRuntimeGroupRender = () => runtimeGroupRenders++;
  const RuntimeGroup = defineComponent<{ onRender: () => void; children?: RuntimeNode }>(
    "browser.component-state.RuntimeGroup",
    ({ onRender, children }) => {
      onRender();
      return jsx(RuntimeFragment, { children });
    },
  );
  const reactLeaves = (start: number, end: number) =>
    Array.from({ length: end - start }, (_, offset) => createElement(ReactItem, { key: start + offset, id: start + offset }));
  const runtimeLeaves = (start: number, end: number) =>
    Array.from({ length: end - start }, (_, offset) => jsx(BenchmarkItem, { key: start + offset, id: start + offset, onRender: onRuntimeRender }));
  const reactTree = () => createElement("main", {}, groupCount === 0
    ? reactLeaves(0, count)
    : Array.from({ length: groupCount }, (_, group) => {
      const first = group * groupSize!;
      return createElement(ReactGroup, {
        key: "group-" + group,
        items: reactLeaves(first, first + groupSize!),
        onRender: () => reactGroupRenders++,
      });
    }));
  const runtimeTree = () => jsx("main", {}, groupCount === 0
    ? runtimeLeaves(0, count)
    : Array.from({ length: groupCount }, (_, group) => {
      const first = group * groupSize!;
      return jsx(RuntimeGroup, { key: "group-" + group, onRender: onRuntimeGroupRender }, runtimeLeaves(first, first + groupSize!));
    }));

  const mountMs: Record<Arm, number> = { react: 0, runtime: 0 };
  let start = performance.now();
  flushSync(() => reactRoot.render(reactTree()));
  mountMs.react = performance.now() - start;
  start = performance.now();
  runtimeRoot.mount(runtimeTree());
  mountMs.runtime = performance.now() - start;

  const reactTarget = reactContainer.querySelector<HTMLElement>(`[data-id="${targetId}"]`);
  const runtimeTarget = runtimeContainer.querySelector<HTMLElement>(`[data-id="${targetId}"]`);
  if (!reactTarget || !runtimeTarget) throw new Error("Target leaf did not mount");
  let stableTargetIdentity = true;
  const samples: Sample[] = [];
  const totalPairs = warmupPairs + measuredPairs;
  let rendersBeforeMeasured = { react: 0, runtime: 0, reactGroups: 0, runtimeGroups: 0 };
  let partialCommitsBeforeMeasured = 0;

  for (let pair = 0; pair < totalPairs; pair++) {
    if (pair === warmupPairs) {
      rendersBeforeMeasured = {
        react: reactRenders,
        runtime: runtimeRenders,
        reactGroups: reactGroupRenders,
        runtimeGroups: runtimeGroupRenders,
      };
      partialCommitsBeforeMeasured = runtimeRoot.partialCommitCount;
    }
    const order: readonly [Arm, Arm] = nextRandom(orderState) === 0 ? ["react", "runtime"] : ["runtime", "react"];
    const milliseconds: Record<Arm, number> = { react: 0, runtime: 0 };
    for (const arm of order) {
      start = performance.now();
      let expectedForArm = selected;
      for (let update = 0; update < updatesPerSample; update++) {
        if (arm === "react") reactTarget.click();
        else runtimeTarget.click();
        expectedForArm = !expectedForArm;
        await Promise.resolve();
        const current = arm === "react" ? reactTarget : runtimeTarget;
        if (current?.dataset.selected !== String(expectedForArm) || current.textContent !== String(expectedForArm)) {
          throw new Error(`${arm} output diverged at pair ${pair}, update ${update}`);
        }
      }
      milliseconds[arm] = (performance.now() - start) / updatesPerSample;
      const current = arm === "react" ? reactTarget : runtimeTarget;
      if (current !== (arm === "react" ? reactContainer : runtimeContainer).querySelector(`[data-id="${targetId}"]`)) stableTargetIdentity = false;
    }
    for (let update = 0; update < updatesPerSample; update++) selected = !selected;
    await settleRuntime();
    if (pair >= warmupPairs) samples.push({ pair: pair - warmupPairs, order, milliseconds });
  }

  const times = (arm: Arm) => samples.map((sample) => sample.milliseconds[arm]);
  const finalReact = reactContainer.querySelector<HTMLElement>(`[data-id="${targetId}"]`)!;
  const finalRuntime = runtimeContainer.querySelector<HTMLElement>(`[data-id="${targetId}"]`)!;
  const reactNodes = reactContainer.querySelectorAll<HTMLElement>("[data-id]");
  const runtimeNodes = runtimeContainer.querySelectorAll<HTMLElement>("[data-id]");
  let finalOutputParity = reactNodes.length === count && runtimeNodes.length === count &&
    finalReact.dataset.selected === finalRuntime.dataset.selected && finalReact.textContent === finalRuntime.textContent &&
    finalReact.dataset.selected === String(selected);
  for (let index = 0; index < count && finalOutputParity; index++) {
    finalOutputParity = reactNodes[index].dataset.id === runtimeNodes[index].dataset.id &&
      reactNodes[index].dataset.selected === runtimeNodes[index].dataset.selected &&
      reactNodes[index].textContent === runtimeNodes[index].textContent;
  }
  const rendersPerUpdate = {
    react: (reactRenders - rendersBeforeMeasured.react) / (measuredPairs * updatesPerSample),
    runtime: (runtimeRenders - rendersBeforeMeasured.runtime) / (measuredPairs * updatesPerSample),
  };
  const partialCommitsPerUpdate = (runtimeRoot.partialCommitCount - partialCommitsBeforeMeasured) / (measuredPairs * updatesPerSample);
  const partialCommitContract = partialCommitsPerUpdate === 1;
  const result: RecordResult = {
    schemaVersion: treeShapeStudy ? "component-state-tree-shape-browser-v1" : "component-state-react-browser-v1",
    status: "PASS",
    collectedAt: new Date().toISOString(),
    count,
    groupCount,
    groupSize,
    topology: groupCount === 0 ? "flat keyed leaf siblings" : "keyed component groups returning Fragments; no additional DOM nodes",
    seed,
    warmupPairs,
    measuredPairs,
    updatesPerSample,
    browser: { userAgent: navigator.userAgent, platform: navigator.platform, hardwareConcurrency: navigator.hardwareConcurrency, devicePixelRatio: devicePixelRatio },
    mountMs,
    medianMs: { react: quantile(times("react"), 0.5), runtime: quantile(times("runtime"), 0.5) },
    p95Ms: { react: quantile(times("react"), 0.95), runtime: quantile(times("runtime"), 0.95) },
    rendersPerUpdate,
    groupRendersPerUpdate: {
      react: (reactGroupRenders - rendersBeforeMeasured.reactGroups) / (measuredPairs * updatesPerSample),
      runtime: (runtimeGroupRenders - rendersBeforeMeasured.runtimeGroups) / (measuredPairs * updatesPerSample),
    },
    partialCommitsPerUpdate,
    partialCommitContract,
    dispatchMode: "HTMLElement.click() on one target leaf; React local useState and React DOM event path versus graph-selected owner state and indexed VDOM commit; Fragment-only groups preserve identical flat DOM output",
    stableTargetIdentity,
    finalOutputParity,
    archiveFile: null,
    samples,
    limitation: treeShapeStudy
      ? "One leaf-local boolean state update in a flat 10,000-span DOM list. Fragment-only component groups vary React/runtime component topology without adding host nodes. Programmatic events, one Chrome profile/device, mount excluded from update timing, layout and paint excluded; no structural updates or multi-owner batches."
      : "React local useState leaf versus one OXC owner/site state leaf; both update identical host props/text through a programmatic click and wait for commit. Mount, browser layout, and paint are excluded. Programmatic clicks may differ from trusted user input, and a single clean-state update is not representative of every React workload.",
  };
  result.status = rendersPerUpdate.react === 1 && rendersPerUpdate.runtime === 1 &&
    (groupCount === 0 || (result.groupRendersPerUpdate.react === 0 && result.groupRendersPerUpdate.runtime === 0)) &&
    partialCommitContract && stableTargetIdentity && finalOutputParity ? "PASS" : "FAIL";
  reactRoot.unmount();
  runtimeRoot.dispose();
  if (result.status === "PASS") {
    try {
      const response = await fetch(treeShapeStudy ? "/__benchmark/save-tree-shape" : "/__benchmark/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(result),
      });
      if (response.ok) result.archiveFile = (await response.json()).filename ?? null;
      else result.archiveFile = `archive failed: HTTP ${response.status} ${await response.text()}`;
    } catch (error) {
      result.archiveFile = `archive failed: ${error instanceof Error ? error.message : String(error)}`;
    }
  }
  latest = result;
  exportButton.disabled = false;
  resultNode.className = result.status === "PASS" ? "pass" : "fail";
  resultNode.textContent = JSON.stringify(result, null, 2);
  runButton.disabled = false;
};

runButton.addEventListener("click", () => void run().catch((error) => {
  resultNode.className = "fail";
  resultNode.textContent = `${error instanceof Error ? error.stack : String(error)}`;
  runButton.disabled = false;
}));
exportButton.addEventListener("click", () => {
  if (!latest) return;
  const blob = new Blob([JSON.stringify(latest, null, 2) + "\n"], { type: "application/json" });
  const anchor = document.createElement("a");
  anchor.href = URL.createObjectURL(blob);
  anchor.download = `${latest.schemaVersion}-${latest.groupCount}-${latest.seed}.json`;
  anchor.click();
  URL.revokeObjectURL(anchor.href);
});
if (new URLSearchParams(location.search).get("autorun") === "1") {
  const count = new URLSearchParams(location.search).get("count");
  const seed = new URLSearchParams(location.search).get("seed");
  const groups = new URLSearchParams(location.search).get("groups");
  if (count) countControl.value = count;
  if (seed) seedControl.value = seed;
  if (groups && groupCountControl) groupCountControl.value = groups;
  void runButton.click();
}
