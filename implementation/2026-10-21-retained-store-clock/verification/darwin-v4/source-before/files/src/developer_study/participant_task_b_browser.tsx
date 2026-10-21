import { createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { flushSync } from "react-dom";
import { DerivedRegionDispatcher } from "../derived_region_runtime.ts";
import { jsx } from "../jsx_binding_runtime.ts";
import { DOMVDOMHost, VDOMSnapshotRoot } from "../vdom_snapshot_runtime.ts";
import {
  ParticipantTaskB as ReactParticipantTaskB,
  type TaskBState,
} from "../../developer-study/starter/react/task-b.tsx";

const params = new URLSearchParams(location.search);
const arm = params.get("arm");
const label = document.querySelector<HTMLElement>("#arm-label")!;
const result = document.querySelector<HTMLPreElement>("#result")!;
const runButton = document.querySelector<HTMLButtonElement>("#run")!;
const mount = document.querySelector<HTMLDivElement>("#app-root")!;

if (arm !== "react" && arm !== "runtime") {
  result.dataset.status = "CONFIGURATION ERROR";
  result.textContent = "Choose one arm with ?arm=react or ?arm=runtime";
  runButton.disabled = true;
  throw new Error("Choose one study arm with ?arm=react or ?arm=runtime");
}
label.textContent = arm === "react"
  ? "React 19.3 + React Compiler starter"
  : "OXC dependency plan + retained VDOM starter";

type Region = "groups" | "scores";
type Observation = { action: string; groups: number[]; scores: number[]; queries: [string | null, string | null] };
const initial: TaskBState = {
  rows: [
    { id: 1, group: 1, score: 60 },
    { id: 2, group: 2, score: 80 },
    { id: 3, group: 1, score: 95 },
  ],
  queryA: "1",
  queryB: "75",
};

const rootOf = (region: Region) => mount.querySelector<HTMLElement>(`[data-region="${region}"]`);
const idsOf = (root: HTMLElement | null) => root
  ? Array.from(root.querySelectorAll<HTMLElement>("li[data-id]"), (node) => Number(node.dataset.id))
  : [];
const assertEqual = (actual: unknown, expected: unknown, label: string) => {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(`${label}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
};

const generatedPlan = arm === "runtime"
  ? (await import("./generated_participant_task_b_regions.ts")).keyedFilterRegionsPlan
  : null;
const runtimeRegions = arm === "runtime"
  ? await import("../../developer-study/starter/runtime/task-b.tsx")
  : null;
const sourceSlots = generatedPlan
  ? Object.fromEntries(generatedPlan.dependency_graph.source_paths.map((path, index) => [path, index]))
  : null;
if (sourceSlots) {
  for (const source of ["queryA", "queryB", "rows"] as const) {
    if (sourceSlots[source] === undefined) throw new Error(`Missing compiler dependency for ${source}`);
  }
}

runButton.addEventListener("click", () => {
  runButton.disabled = true;
  let state: TaskBState = initial;
  let reactRoot: Root | undefined;
  let groupRuntime: VDOMSnapshotRoot<Node, Node> | undefined;
  let scoreRuntime: VDOMSnapshotRoot<Node, Node> | undefined;
  const runtimeRoots: VDOMSnapshotRoot<Node, Node>[] = [];
  const observations: Observation[] = [];
  const dispatcher = generatedPlan ? new DerivedRegionDispatcher(generatedPlan.dependency_graph) : null;

  const renderReact = () => flushSync(() => reactRoot!.render(createElement(ReactParticipantTaskB, { state })));
  const updateRuntime = (sources: readonly ("queryA" | "queryB" | "rows")[]) => {
    for (const source of sources) dispatcher!.invalidateSourceSlot(sourceSlots![source]);
    dispatcher!.flush((region) => {
      const tree = region === 0
        ? runtimeRegions!.GroupRegion({ rows: state.rows, queryA: state.queryA })
        : runtimeRegions!.ScoreRegion({ rows: state.rows, queryB: state.queryB });
      runtimeRoots[region].commit(tree);
    });
  };
  const update = (sources: readonly ("queryA" | "queryB" | "rows")[]) => {
    if (arm === "react") renderReact();
    else updateRuntime(sources);
  };
  const note = (action: string, expected: { groups: number[]; scores: number[] }) => {
    const groupRoot = rootOf("groups");
    const scoreRoot = rootOf("scores");
    assertEqual(idsOf(groupRoot), expected.groups, `${action} groups`);
    assertEqual(idsOf(scoreRoot), expected.scores, `${action} scores`);
    assertEqual(groupRoot?.getAttribute("data-query"), state.queryA, `${action} group query`);
    assertEqual(scoreRoot?.getAttribute("data-query"), state.queryB, `${action} score query`);
    observations.push({
      action,
      groups: idsOf(groupRoot),
      scores: idsOf(scoreRoot),
      queries: [groupRoot?.getAttribute("data-query") ?? null, scoreRoot?.getAttribute("data-query") ?? null],
    });
  };

  try {
    if (arm === "react") {
      reactRoot = createRoot(mount);
      renderReact();
    } else {
      const shell = document.createElement("main");
      shell.className = "task-b-regions";
      mount.replaceChildren(shell);
      const host = new DOMVDOMHost();
      groupRuntime = new VDOMSnapshotRoot(host, shell);
      scoreRuntime = new VDOMSnapshotRoot(host, shell);
      runtimeRoots.push(groupRuntime, scoreRuntime);
      updateRuntime(["queryA", "queryB"]);
    }
    note("initial", { groups: [1, 3], scores: [2, 3] });

    const scoreRootBeforeQueryA = rootOf("scores");
    state = { ...state, queryA: "2" };
    update(["queryA"]);
    note("change queryA", { groups: [2], scores: [2, 3] });
    if (rootOf("scores") !== scoreRootBeforeQueryA) throw new Error("queryA changed scores region root identity");

    const groupItemBeforeAppend = rootOf("groups")?.querySelector<HTMLElement>('[data-id="2"]');
    state = { ...state, rows: [...state.rows, { id: 4, group: 2, score: 90 }] };
    update(["rows"]);
    note("append shared row", { groups: [2, 4], scores: [2, 3, 4] });
    if (rootOf("groups")?.querySelector<HTMLElement>('[data-id="2"]') !== groupItemBeforeAppend) {
      throw new Error("shared rows update replaced surviving group item 2");
    }

    const groupRootBeforeQueryB = rootOf("groups");
    const scoreNodesBeforeQueryB = new Map([3, 4].map((id) => [
      id,
      rootOf("scores")?.querySelector<HTMLElement>(`li[data-id="${id}"]`),
    ]));
    state = { ...state, queryB: "90" };
    update(["queryB"]);
    note("change queryB", { groups: [2, 4], scores: [3, 4] });
    if (rootOf("groups") !== groupRootBeforeQueryB) throw new Error("queryB changed groups region root identity");
    for (const id of [3, 4]) {
      if (rootOf("scores")?.querySelector<HTMLElement>(`li[data-id="${id}"]`) !== scoreNodesBeforeQueryB.get(id)) {
        throw new Error(`queryB replaced surviving item ${id}`);
      }
    }

    result.dataset.status = "PASS";
    result.textContent = JSON.stringify({ status: "PASS", arm, graph: generatedPlan?.dependency_graph ?? null, observations }, null, 2);
  } catch (error) {
    result.dataset.status = "FAIL";
    result.textContent = error instanceof Error ? error.stack ?? error.message : String(error);
  } finally {
    groupRuntime?.dispose();
    scoreRuntime?.dispose();
    if (reactRoot) flushSync(() => reactRoot!.unmount());
    runButton.disabled = false;
  }
});

if (params.get("run") === "1") runButton.click();
