import {
  mountRepeatedHostPlanCsr,
  type RepeatedPlanSource,
} from "../compiled_plan_runtime.ts";
import {
  bindingParticlesPlan as multiTraitPlan,
  mountGeneratedBindingParticles,
} from "./generated_multi_trait_plan.ts";
import {
  bindingParticlesPlan as sharedSourcePlan,
  mountGeneratedBindingParticles as mountSharedSourcePlan,
} from "./generated_shared_source_plan.ts";

const result = document.querySelector<HTMLElement>("#result");
const denseContainer = document.querySelector<HTMLElement>("#dense");
const csrContainer = document.querySelector<HTMLElement>("#csr");
const denseSharedContainer = document.querySelector<HTMLElement>("#dense-shared");
const csrSharedContainer = document.querySelector<HTMLElement>("#csr-shared");
if (!result || !denseContainer || !csrContainer || !denseSharedContainer || !csrSharedContainer) throw new Error("Missing parity-check DOM nodes");

const sources: readonly RepeatedPlanSource[] = [
  { id: 0, values: [10, 0.25] },
  { id: 1, values: [20, 0.75] },
];
const dense = mountGeneratedBindingParticles(sources, denseContainer);
const csr = mountRepeatedHostPlanCsr(sources, csrContainer, multiTraitPlan);
const sharedSources: readonly RepeatedPlanSource[] = [
  { id: 0, values: [10] },
  { id: 1, values: [20] },
];
const denseShared = mountSharedSourcePlan(sharedSources, denseSharedContainer, [0.4]);
const csrShared = mountRepeatedHostPlanCsr(sharedSources, csrSharedContainer, sharedSourcePlan, [0.4]);

function snapshot(container: HTMLElement) {
  return Array.from(container.querySelectorAll<HTMLElement>(".scene-node"), (element) => ({
    left: element.style.left,
    opacity: element.style.opacity,
    transform: element.style.transform,
  }));
}

function sharedSnapshot(container: HTMLElement) {
  return Array.from(container.querySelectorAll<HTMLElement>(".scene-node"), (element) => ({
    opacity: element.style.opacity,
    transform: element.style.transform,
  }));
}

try {
  const initial = snapshot(denseContainer);
  const expectedInitial = [
    { left: "10px", opacity: "0.25", transform: "translateX(10px)" },
    { left: "20px", opacity: "0.75", transform: "translateX(20px)" },
  ];
  if (JSON.stringify(initial) !== JSON.stringify(expectedInitial) ||
    JSON.stringify(snapshot(csrContainer)) !== JSON.stringify(expectedInitial)) {
    throw new Error("Initial multi-source bindings do not match expected host props");
  }

  // Repeated writes to one slot coalesce; the other slot routes independently.
  dense.set(0, 30, 0);
  dense.set(0, 31, 0);
  dense.set(1, 0.5, 1);
  csr.set(0, 30, 0);
  csr.set(0, 31, 0);
  csr.set(1, 0.5, 1);
  dense.flush();
  csr.flush();

  const denseOutput = snapshot(denseContainer);
  const csrOutput = snapshot(csrContainer);
  const expectedOutput = [
    { left: "31px", opacity: "0.25", transform: "translateX(31px)" },
    { left: "20px", opacity: "0.5", transform: "translateX(20px)" },
  ];
  if (JSON.stringify(denseOutput) !== JSON.stringify(csrOutput) ||
    JSON.stringify(denseOutput) !== JSON.stringify(expectedOutput)) {
    throw new Error("Dense and CSR dispatch diverged or routed an update to an unrelated binding");
  }

  const expectedSharedInitial = [
    { opacity: "0.4", transform: "translateX(10px)" },
    { opacity: "0.4", transform: "translateX(20px)" },
  ];
  if (JSON.stringify(sharedSnapshot(denseSharedContainer)) !== JSON.stringify(expectedSharedInitial) ||
    JSON.stringify(sharedSnapshot(csrSharedContainer)) !== JSON.stringify(expectedSharedInitial)) {
    throw new Error("Shared source did not initialize every repeated host identically");
  }
  denseShared.setShared(0, 0.9);
  denseShared.setShared(0, 0.6);
  denseShared.set(0, 15, 0);
  csrShared.setShared(0, 0.9);
  csrShared.setShared(0, 0.6);
  csrShared.set(0, 15, 0);
  denseShared.flush();
  csrShared.flush();
  const sharedOutput = sharedSnapshot(denseSharedContainer);
  const expectedSharedOutput = [
    { opacity: "0.6", transform: "translateX(15px)" },
    { opacity: "0.6", transform: "translateX(20px)" },
  ];
  if (JSON.stringify(sharedOutput) !== JSON.stringify(sharedSnapshot(csrSharedContainer)) ||
    JSON.stringify(sharedOutput) !== JSON.stringify(expectedSharedOutput)) {
    throw new Error("Shared-source fan-out or local/shared update coalescing diverged between dispatchers");
  }

  const parityRecord = {
    status: "pass",
    schemaVersion: 1,
    fixture: "compiler/fixtures/shared_source_scene.tsx",
    dispatchers: ["dense", "csr"],
    entityCount: sharedSources.length,
    graphSourceCount: multiTraitPlan.dependencyGraph.sourceCount,
    sourcePaths: multiTraitPlan.dependencyGraph.sourcePaths,
    sourceBindingOffsets: multiTraitPlan.dependencyGraph.sourceBindingOffsets,
    bindingIds: multiTraitPlan.dependencyGraph.bindingIds,
    denseBindingCount: dense.bindingCount,
    csrBindingCount: csr.bindingCount,
    initial: expectedInitial,
    afterIndependentSlotUpdates: denseOutput,
    sharedEntityCount: sharedSources.length,
    sharedSourceCount: sharedSourcePlan.dependencyGraph.sharedSourceCount,
    sharedSourcePaths: sharedSourcePlan.dependencyGraph.sharedSourcePaths,
    sharedSourceOffsets: sharedSourcePlan.dependencyGraph.sharedSourceBindingOffsets,
    sharedBindingIds: sharedSourcePlan.dependencyGraph.sharedBindingIds,
    sharedInitial: expectedSharedInitial,
    afterSharedFanOut: sharedOutput,
    parity: true,
    coalescing: true,
    localAndSharedBatch: true,
    notes: "Two-entity correctness fixture; not a timing sample.",
  };
  (window as Window & { __sharedSourceParityRecord?: typeof parityRecord }).__sharedSourceParityRecord = parityRecord;
  result.dataset.status = "pass";
  result.textContent = JSON.stringify(parityRecord, null, 2);
} catch (error) {
  result.dataset.status = "fail";
  result.textContent = error instanceof Error ? error.stack ?? error.message : String(error);
  throw error;
} finally {
  dense.dispose();
  csr.dispose();
  denseShared.dispose();
  csrShared.dispose();
}
