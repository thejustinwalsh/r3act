import { createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { flushSync } from "react-dom";
import { DerivedRegionDispatcher } from "../derived_region_runtime.ts";
import { DOMVDOMHost, VDOMSnapshotRoot } from "../vdom_snapshot_runtime.ts";
import { keyedFilterRegionsPlan } from "./generated_task_b_regions.ts";
import { TaskBReactTree } from "./task_b_react.tsx";
import { taskBRegionTree, type TaskBState } from "./task_b_runtime.tsx";

type Region = "groups" | "scores";
type Observation = { action: string; groups: number[]; scores: number[]; queries: [string, string] };

const result = document.querySelector<HTMLPreElement>("#result")!;
const runButton = document.querySelector<HTMLButtonElement>("#run")!;
const reactMount = document.querySelector<HTMLDivElement>("#react-root")!;
const runtimeMount = document.querySelector<HTMLDivElement>("#runtime-root")!;
const regions = ["groups", "scores"] as const;
const sourceSlots = Object.fromEntries(keyedFilterRegionsPlan.dependency_graph.source_paths.map((path, index) => [path, index]));
for (const source of ["queryA", "queryB", "rows"] as const) {
  if (sourceSlots[source] === undefined) throw new Error(`Missing compiler dependency for ${source}`);
}

const initial: TaskBState = {
  rows: [
    { id: 1, group: 1, score: 60 },
    { id: 2, group: 2, score: 80 },
    { id: 3, group: 1, score: 95 },
  ],
  queryA: "1",
  queryB: "75",
};

const rootOf = (mount: HTMLElement, region: Region) =>
  mount.querySelector<HTMLElement>(`[data-region="${region}"]`);
const idsOf = (root: HTMLElement | null) => root
  ? Array.from(root.querySelectorAll<HTMLElement>("li[data-id]"), (node) => Number(node.dataset.id))
  : [];
const assertEqual = (actual: unknown, expected: unknown, label: string) => {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(`${label}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
};
const assertObservation = (
  action: string,
  state: TaskBState,
  expected: { groups: number[]; scores: number[] },
) => {
  for (const [arm, mount] of [["React", reactMount], ["runtime", runtimeMount]] as const) {
    const groupRoot = rootOf(mount, "groups");
    const scoreRoot = rootOf(mount, "scores");
    assertEqual(idsOf(groupRoot), expected.groups, `${action} ${arm} groups`);
    assertEqual(idsOf(scoreRoot), expected.scores, `${action} ${arm} scores`);
    assertEqual(groupRoot?.getAttribute("data-query"), state.queryA, `${action} ${arm} group query`);
    assertEqual(scoreRoot?.getAttribute("data-query"), state.queryB, `${action} ${arm} score query`);
  }
};

const settleReact = (root: Root, state: TaskBState) =>
  flushSync(() => root.render(createElement(TaskBReactTree, { state })));

runButton.addEventListener("click", () => {
  runButton.disabled = true;
  let state: TaskBState = initial;
  let reactRoot: Root | undefined;
  let groupRuntime: VDOMSnapshotRoot<Node, Node> | undefined;
  let scoreRuntime: VDOMSnapshotRoot<Node, Node> | undefined;
  const runtimeRoots: VDOMSnapshotRoot<Node, Node>[] = [];
  const observations: Observation[] = [];
  const dispatcher = new DerivedRegionDispatcher(keyedFilterRegionsPlan.dependency_graph);
  const note = (action: string, expected: { groups: number[]; scores: number[] }) => {
    assertObservation(action, state, expected);
    observations.push({
      action,
      groups: idsOf(rootOf(runtimeMount, "groups")),
      scores: idsOf(rootOf(runtimeMount, "scores")),
      queries: [state.queryA, state.queryB],
    });
  };
  const updateRuntime = (sources: readonly ("queryA" | "queryB" | "rows")[]) => {
    for (const source of sources) dispatcher.invalidateSourceSlot(sourceSlots[source]);
    dispatcher.flush((region) => {
      const root = runtimeRoots[region];
      root.commit(taskBRegionTree(region, state));
    });
  };

  try {
    reactRoot = createRoot(reactMount);
    settleReact(reactRoot, state);
    const host = new DOMVDOMHost();
    const shell = document.createElement("main");
    shell.className = "task-b-regions";
    runtimeMount.replaceChildren(shell);
    groupRuntime = new VDOMSnapshotRoot(host, shell);
    scoreRuntime = new VDOMSnapshotRoot(host, shell);
    runtimeRoots.push(groupRuntime, scoreRuntime);
    updateRuntime(["queryA", "queryB"]);
    note("initial", { groups: [1, 3], scores: [2, 3] });

    const scoreRootBeforeQueryA = rootOf(runtimeMount, "scores");
    const reactScoreBeforeQueryA = rootOf(reactMount, "scores");
    state = { ...state, queryA: "2" };
    settleReact(reactRoot, state);
    updateRuntime(["queryA"]);
    note("change queryA", { groups: [2], scores: [2, 3] });
    if (rootOf(runtimeMount, "scores") !== scoreRootBeforeQueryA) throw new Error("queryA changed runtime scores root identity");
    if (rootOf(reactMount, "scores") !== reactScoreBeforeQueryA) throw new Error("queryA changed React scores root identity");

    const groupItemBeforeAppend = rootOf(runtimeMount, "groups")?.querySelector<HTMLElement>('[data-id="2"]');
    const reactGroupItemBeforeAppend = rootOf(reactMount, "groups")?.querySelector<HTMLElement>('[data-id="2"]');
    state = { ...state, rows: [...state.rows, { id: 4, group: 2, score: 90 }] };
    settleReact(reactRoot, state);
    updateRuntime(["rows"]);
    note("append shared row", { groups: [2, 4], scores: [2, 3, 4] });
    if (rootOf(runtimeMount, "groups")?.querySelector<HTMLElement>('[data-id="2"]') !== groupItemBeforeAppend) {
      throw new Error("shared rows update replaced surviving runtime group item 2");
    }
    if (rootOf(reactMount, "groups")?.querySelector<HTMLElement>('[data-id="2"]') !== reactGroupItemBeforeAppend) {
      throw new Error("shared rows update replaced surviving React group item 2");
    }

    const groupRootBeforeQueryB = rootOf(runtimeMount, "groups");
    const reactGroupBeforeQueryB = rootOf(reactMount, "groups");
    const scoreNodesBeforeQueryB = new Map([3, 4].map((id) => [
      id,
      rootOf(runtimeMount, "scores")?.querySelector<HTMLElement>(`li[data-id="${id}"]`),
    ]));
    const reactScoreNodesBeforeQueryB = new Map([3, 4].map((id) => [
      id,
      rootOf(reactMount, "scores")?.querySelector<HTMLElement>(`li[data-id="${id}"]`),
    ]));
    state = { ...state, queryB: "90" };
    settleReact(reactRoot, state);
    updateRuntime(["queryB"]);
    note("change queryB", { groups: [2, 4], scores: [3, 4] });
    if (rootOf(runtimeMount, "groups") !== groupRootBeforeQueryB) throw new Error("queryB changed runtime groups root identity");
    if (rootOf(reactMount, "groups") !== reactGroupBeforeQueryB) throw new Error("queryB changed React groups root identity");
    for (const id of [3, 4]) {
      if (rootOf(runtimeMount, "scores")?.querySelector<HTMLElement>(`li[data-id="${id}"]`) !== scoreNodesBeforeQueryB.get(id)) {
        throw new Error(`queryB replaced surviving runtime item ${id}`);
      }
      if (rootOf(reactMount, "scores")?.querySelector<HTMLElement>(`li[data-id="${id}"]`) !== reactScoreNodesBeforeQueryB.get(id)) {
        throw new Error(`queryB replaced surviving React item ${id}`);
      }
    }

    result.dataset.status = "PASS";
    result.textContent = JSON.stringify({ status: "PASS", graph: keyedFilterRegionsPlan.dependency_graph, observations }, null, 2);
  } catch (error) {
    result.dataset.status = "FAIL";
    result.textContent = error instanceof Error ? error.stack ?? error.message : String(error);
  } finally {
    groupRuntime?.dispose();
    scoreRuntime?.dispose();
    if (reactRoot) flushSync(() => reactRoot!.unmount());
  }
});

if (new URLSearchParams(location.search).get("run") === "1") runButton.click();
