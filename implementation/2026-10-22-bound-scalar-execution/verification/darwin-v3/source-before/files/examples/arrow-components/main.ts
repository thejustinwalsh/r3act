import { AsyncResource, NativeRootWorkQueue, createStore, createWorld, jsx } from "@r3act/core";
import { createDOMRoot } from "@r3act/host-dom";
import { createThreeNativeRoot } from "@r3act/host-three";
import { Scene } from "three";
import { ArrowApp, type Life, type Panel, type RowRef } from "./app";
import { ArrowScene } from "./scene";

type Deferred<T> = { promise: Promise<T>; resolve(value: T): void; reject(reason: unknown): void };
function deferred<T>(): Deferred<T> {
  let resolve!: Deferred<T>["resolve"], reject!: Deferred<T>["reject"];
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}

export function mountNative(host: HTMLElement) {
  const domHost = document.createElement("div");
  host.append(domHost);
  const world = createWorld(), stage = createStore("A"), urgent = createStore(0);
  const scene = new Scene();
  const dom = createDOMRoot(domHost, { world, rootId: "arrow-dom" });
  const three = createThreeNativeRoot(scene, { rootOptions: { world, rootId: "arrow-three" } });
  const queue = new NativeRootWorkQueue();
  const life: Life = { mounts: 0, cleanups: 0, conditionalMounts: 0,
    conditionalCleanups: 0, resultMounts: 0, resultCleanups: 0 };
  const refs: Record<string, RowRef> = { a: { current: null }, b: { current: null }, c: { current: null } };
  let rows = ["a", "b"];
  const initial = new AsyncResource<Panel>(Promise.resolve({ stage: "A", detail: "ready-A" }));
  let resource = initial, active: ReturnType<NativeRootWorkQueue["enqueue"]> | null = null;
  let provider: Deferred<Panel> | null = null, retiredProvider: Deferred<Panel> | null = null;
  let disposed = false, sequence = 0;
  const domTree = (next: AsyncResource<Panel>) => jsx(ArrowApp,
    { stage, urgent, resource: next, rows, refs, life });
  const sceneTree = (next: AsyncResource<Panel>) => jsx(ArrowScene,
    { stage, urgent, resource: next });
  dom.mount(domTree(initial));
  three.root.mount(sceneTree(initial));

  const requireActive = () => { if (disposed) throw new Error("Arrow example is disposed"); };
  const snapshot = () => {
    const group = scene.getObjectByName("arrow-components");
    return {
      stage: domHost.querySelector("[data-stage]")?.getAttribute("data-stage") ?? null,
      urgent: domHost.querySelector("[data-urgent]")?.getAttribute("data-urgent") ?? null,
      result: domHost.querySelector("[data-result]")?.getAttribute("data-result") ?? null,
      detail: domHost.querySelector("[data-detail]")?.getAttribute("data-detail") ?? null,
      error: domHost.querySelector("[data-error]")?.getAttribute("data-error") ?? null,
      rows: [...domHost.querySelectorAll("[data-row]")].map((node) => ({
        id: node.getAttribute("data-row"), count: node.getAttribute("data-count"),
      })),
      three: group?.children.map((node) => node.name) ?? [],
      threeHost: { ...three.host.diagnostics },
      life: { ...life },
      roots: { dom: dom.diagnostics(), three: three.root.diagnostics() },
      stores: { stage: stage.diagnostics(), urgent: urgent.diagnostics() },
      pending: active?.status ?? null,
      disposed,
    };
  };
  return {
    snapshot,
    click(id: string) { requireActive(); refs[id]?.current?.click(); return snapshot(); },
    reorder(next: string[]) { requireActive(); rows = [...next]; dom.update(domTree(resource)); return snapshot(); },
    urgent() { requireActive(); urgent.dispatch((value) => value + 1); return snapshot(); },
    async publishStage(next: string) {
      requireActive();
      const transition = `arrow-stage-${++sequence}`;
      stage.beginTransition(transition, [dom.rootId, three.root.rootId]);
      stage.dispatch(next, { kind: "transition", transitionId: transition });
      await new Promise<void>((resolve, reject) => queue.enqueue({ renderPreparation: "repeatable",
        id: transition, roots: [{ root: dom, tree: domTree(resource) },
          { root: three.root, tree: sceneTree(resource) }],
        transitions: [transition], finishTransitions: true,
        onSettled(outcome) { if (outcome.status === "committed") resolve();
          else reject(outcome.error ?? new Error(`Publication ${outcome.status}`)); },
      }));
      return snapshot();
    },
    beginDetail() {
      requireActive();
      active?.cancel("superseded by newer detail");
      retiredProvider = provider;
      provider = deferred<Panel>();
      const next = new AsyncResource(provider.promise);
      const candidate = queue.enqueue({ renderPreparation: "repeatable", id: `arrow-detail-${++sequence}`, roots: [
        { root: dom, tree: domTree(next) }, { root: three.root, tree: sceneTree(next) },
      ], onSettled(outcome) { if (outcome.status === "committed") resource = next; } });
      active = candidate;
      return snapshot();
    },
    resolveDetail(detail: string) {
      requireActive();
      provider?.resolve({ stage: stage.getState(), detail });
      return snapshot();
    },
    resolveRetiredDetail(detail: string) {
      requireActive();
      retiredProvider?.resolve({ stage: "stale", detail });
      return snapshot();
    },
    rejectDetail(reason: string) { requireActive(); provider?.reject(reason); return snapshot(); },
    retireDetail() { requireActive(); active?.cancel("caller retired detail"); return snapshot(); },
    dispose() {
      if (disposed) return snapshot();
      disposed = true;
      const errors: unknown[] = [];
      for (const cleanup of [() => queue.dispose(), () => dom.dispose(), () => three.dispose(),
        () => domHost.remove()]) {
        try { cleanup(); } catch (error) { errors.push(error); }
      }
      if (errors.length) throw new AggregateError(errors, "Arrow example disposal failed");
      return snapshot();
    },
  };
}

declare global { interface Window { arrowComponents?: ReturnType<typeof mountNative> } }

const host = document.querySelector<HTMLElement>("#app");
if (host) {
  const controller = mountNative(host);
  window.arrowComponents = controller;
  const dispose = () => { controller.dispose(); };
  window.addEventListener("pagehide", dispose, { once: true });
  if (import.meta.hot) import.meta.hot.dispose(() => {
    window.removeEventListener("pagehide", dispose);
    dispose();
  });
}
