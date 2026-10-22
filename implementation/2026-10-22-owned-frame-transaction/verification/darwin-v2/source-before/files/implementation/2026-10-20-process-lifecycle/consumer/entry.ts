import type { Arm, SceneController, SceneDiagnostics } from "./contract.ts";

type Disposal = { diagnostics: SceneDiagnostics; remainingChildren: number };
type Snapshot = {
  arm: Arm | null;
  rows: Array<{ id: number; step: string | null; local: string | null; transform: string; opacity: string; text: string }>;
  row0Retained: boolean | null;
  detail: { fallback: number; ready: number; text: string | null };
  health: { fallback: number; ready: number; text: string | null };
  diagnostics: SceneDiagnostics | null;
  remainingChildren: number;
};
function createAuthoredLifecycleApi(selectedArm: Arm, mountScene: (host: HTMLElement) => SceneController) {
  let host: HTMLElement | null = null;
  let controller: SceneController | null = null;
  let retainedController: SceneController | null = null;
  let row0: Element | null = null;
  let arm: Arm | null = null;
  let finalDiagnostics: SceneDiagnostics | null = null;
  function active(): SceneController {
    if (!controller) throw new Error("scene is not mounted");
    return controller;
  }
  function resource(name: "detail" | "health") {
    if (!host) return { fallback: 0, ready: 0, text: null };
    const fallback = host.querySelectorAll(`[data-${name}="waiting"]`);
    const ready = host.querySelectorAll(`[data-${name}="ready"]`);
    const node = ready[0] ?? fallback[0];
    return { fallback: fallback.length, ready: ready.length, text: node?.textContent ?? null };
  }
  const api = {
    mount(nextArm: Arm): void {
      if (host || controller || retainedController) throw new Error("previous scene must be released");
      if (nextArm !== selectedArm) throw new Error(`selected page only supports ${selectedArm}`);
      const element = document.createElement("section");
      element.dataset.arm = nextArm;
      document.body.append(element);
      try {
        const next = mountScene(element);
        host = element;
        controller = next;
        arm = nextArm;
        finalDiagnostics = null;
        row0 = null;
      } catch (error) { element.remove(); throw error; }
    },
    clickRow(): void {
      const row = host?.querySelector<HTMLElement>('[data-row="0"]');
      if (!row) throw new Error("row 0 missing");
      row0 ??= row;
      row.click();
    },
    update(step: number): void { active().updateStep(step); },
    edit(): void { active().editRows(); },
    settleDetail(): void { active().settleDetail(); },
    settleHealth(): void { active().settleHealth(); },
    inspect(): Snapshot {
      const rows = [...(host?.querySelectorAll<HTMLElement>("[data-row]") ?? [])].map((node) => ({
        id: Number(node.dataset.row), step: node.dataset.step ?? null, local: node.dataset.local ?? null,
        transform: node.style.transform, opacity: node.style.opacity, text: node.textContent ?? "",
      }));
      const currentRow0 = host?.querySelector('[data-row="0"]') ?? null;
      return { arm, rows, row0Retained: row0 ? currentRow0 === row0 : null,
        detail: resource("detail"), health: resource("health"),
        diagnostics: controller?.diagnostics() ?? finalDiagnostics, remainingChildren: host?.childNodes.length ?? 0 };
    },
    dispose(options: { retain: boolean }): Disposal {
      const next = active();
      const diagnostics = next.dispose();
      const remainingChildren = host?.childNodes.length ?? 0;
      controller = null;
      finalDiagnostics = diagnostics;
      row0 = null;
      host?.remove(); host = null;
      if (options.retain) retainedController = next;
      return { diagnostics, remainingChildren };
    },
    release(): void {
      if (controller) throw new Error("dispose before release");
      retainedController = null;
      finalDiagnostics = null;
      arm = null;
    },
  };
  return api;
}

declare global { interface Window { __authoredLifecycle?: ReturnType<typeof createAuthoredLifecycleApi> } }

export function installAuthoredLifecycle(selectedArm: Arm, mountScene: (host: HTMLElement) => SceneController): void {
  if (window.__authoredLifecycle) throw new Error("authored lifecycle API already installed");
  window.__authoredLifecycle = createAuthoredLifecycleApi(selectedArm, mountScene);
}
