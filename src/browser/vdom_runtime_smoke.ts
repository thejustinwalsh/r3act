import { bind, jsx, ScalarSource, type RuntimeNode } from "../jsx_binding_runtime.ts";
import { DOMVDOMHost, VDOMSnapshotRoot } from "../vdom_snapshot_runtime.ts";
import { TransitionCoordinator, type TransitionRoot } from "../transition_coordinator.ts";

const sceneContainer = document.querySelector("#scene-root");
const hudContainer = document.querySelector("#hud-root");
const status = document.querySelector("#status");
const log = document.querySelector("#log");
if (!(sceneContainer instanceof HTMLElement) || !(hudContainer instanceof HTMLElement) ||
  !(status instanceof HTMLElement) || !(log instanceof HTMLElement)) {
  throw new Error("Smoke page is missing a required element");
}

const scene = new VDOMSnapshotRoot(new DOMVDOMHost(), sceneContainer);
const hud = new VDOMSnapshotRoot(new DOMVDOMHost(), hudContainer);
const roots = new Map<string, VDOMSnapshotRoot<Node, Node>>([
  ["scene", scene],
  ["hud", hud],
]);
const outputValue = new ScalarSource(0, 1);
let displayValue = 1;
let transitionSequence = 0;
let pendingGeneration: number | null = null;

const sceneTree = (version: number): RuntimeNode => jsx("article", { className: "card", key: "scene-card" },
  jsx("h2", {}, `Scene version ${version}`),
  jsx("p", {}, "Declarative scene output"),
  jsx("p", {}, "Bound display value: "),
  jsx("output", { value: bind(outputValue) }, String(outputValue.value)),
);
const hudTree = (version: number): RuntimeNode => jsx("article", { className: "card", key: "hud-card" },
  jsx("h2", {}, `HUD version ${version}`),
  jsx("p", {}, "This root commits with the scene root."),
);

const appendLog = (line: string) => {
  log.textContent = `${line}\n${log.textContent ?? ""}`.trim();
};
const showStatus = (message: string) => {
  status.textContent = message;
};

scene.commit(sceneTree(1));
hud.commit(hudTree(1));
showStatus("Mounted version 1 in both roots. Update the bound prop or start a staged transition.");
appendLog("Committed scene=1, hud=1");

const coordinator = new TransitionCoordinator<RuntimeNode>(new Map([["scene", 1], ["hud", 1]]), (batch) => {
  // This callback is one synchronous turn: both hosts are patched before paint.
  for (const candidate of batch) roots.get(candidate.rootId)!.commit(candidate.snapshot);
  const versions = batch.map((candidate) => `${candidate.rootId}=${candidate.targetVersion}`).join(", ");
  appendLog(`Committed generation ${coordinator.generation}: ${versions}`);
  showStatus(`Committed both roots (${versions}).`);
});

document.querySelector("#bind-update")?.addEventListener("click", () => {
  displayValue++;
  scene.setSource(outputValue, displayValue);
  showStatus(`Updated one bound prop to ${displayValue}; component functions and tree reconciliation were skipped.`);
  appendLog(`Bound prop updated to ${displayValue}`);
});

document.querySelector("#start-transition")?.addEventListener("click", () => {
  transitionSequence++;
  const nextSceneVersion = coordinator.getVersion("scene") + 1;
  const nextHudVersion = coordinator.getVersion("hud") + 1;
  const sceneResource = `scene-data-${transitionSequence}`;
  const hudResource = `hud-data-${transitionSequence}`;
  const candidates: TransitionRoot<RuntimeNode>[] = [
    {
      rootId: "scene",
      baseVersion: nextSceneVersion - 1,
      targetVersion: nextSceneVersion,
      snapshot: sceneTree(nextSceneVersion),
      pendingResources: [sceneResource],
    },
    {
      rootId: "hud",
      baseVersion: nextHudVersion - 1,
      targetVersion: nextHudVersion,
      snapshot: hudTree(nextHudVersion),
      pendingResources: [hudResource],
    },
  ];
  const resolution = coordinator.begin(candidates);
  const generation = coordinator.generation;
  pendingGeneration = resolution.status === "pending" ? generation : null;
  showStatus(`Candidate ${generation} is preparing. Both visible roots should remain unchanged until both resources resolve.`);
  appendLog(`Started generation ${generation}; staged scene and HUD versions.`);
  window.setTimeout(() => {
    const result = coordinator.resolve(generation, sceneResource);
    if (result.status === "pending") {
      showStatus(`Scene data is ready; HUD data is still pending. Both visible roots should remain unchanged.`);
    }
  }, 850);
  window.setTimeout(() => {
    const result = coordinator.resolve(generation, hudResource);
    if (result.status === "committed") pendingGeneration = null;
    else if (result.status === "stale") appendLog(`Generation ${generation} was stale before HUD data arrived.`);
  }, 1650);
});

document.querySelector("#cancel-transition")?.addEventListener("click", () => {
  if (pendingGeneration == null) {
    showStatus("There is no pending coordinated transition to cancel.");
    return;
  }
  const generation = pendingGeneration;
  const result = coordinator.cancel(generation);
  pendingGeneration = null;
  showStatus(`Cancelled generation ${generation}. The previously committed versions remain visible.`);
  appendLog(`Cancelled generation ${generation}: ${result.status}`);
});
