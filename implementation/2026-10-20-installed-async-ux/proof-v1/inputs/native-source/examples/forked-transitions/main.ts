import { AsyncResource, NativeRootWorkQueue, NativeTaskTransitionQueue,
  createStore, createWorld, jsx } from "@r3act/core";
import type { NativeRootWork } from "@r3act/core";
import { createDOMRoot } from "@r3act/host-dom";
import { createThreeNativeRoot } from "@r3act/host-three";
import { BoxGeometry, Mesh, MeshBasicMaterial, Scene } from "three";
import { DomApp, tasks, type Life, type Panel, type Request } from "./app";
import { ThreeApp } from "./scene";

type Query = "A" | "B" | "C";
type Deferred<T> = { promise: Promise<T>; resolve(value: T): void; reject(reason: unknown): void };
function deferred<T>(): Deferred<T> {
  let resolve!: Deferred<T>["resolve"], reject!: Deferred<T>["reject"];
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}

export function mountNative(host: HTMLElement) {
  const primaryHost = document.createElement("div");
  const forkHost = document.createElement("div");
  host.append(primaryHost, forkHost);
  const world = createWorld();
  const query = createStore<Query>("A");
  const urgent = createStore(0);
  const scene = new Scene();
  const geometry = new BoxGeometry(0.5, 0.5, 0.5);
  const material = new MeshBasicMaterial({ color: "#89a4bf" });
  const borrowedDisposed = { geometry: 0, material: 0 };
  geometry.addEventListener("dispose", () => { borrowedDisposed.geometry++; });
  material.addEventListener("dispose", () => { borrowedDisposed.material++; });
  const primary = createDOMRoot(primaryHost, { world, rootId: "fork-stress-primary" });
  const fork = createDOMRoot(forkHost, { world, rootId: "fork-stress-fork" });
  const three = createThreeNativeRoot(scene, { rootOptions: { world, rootId: "fork-stress-three" } });
  const publications = new NativeRootWorkQueue();
  const transitions = new NativeTaskTransitionQueue();
  const life: Life = { starts: 0, cleanups: 0 };
  const initial = new AsyncResource<Panel>(Promise.resolve({ query: "A", detail: "ready-A", catalog: "shared-catalog" }));
  const provider = { A: deferred<string>(), B: deferred<string>(), C: deferred<string>() };
  const providerTrace: { query: Query; event: "start" | "abort" | "resolve" }[] = [];
  const settlementTrace: { id: string; status: string }[] = [];
  const request: Request = {
    catalog: "shared-catalog",
    load(value, signal) {
      const key = value as Query;
      providerTrace.push({ query: key, event: "start" });
      signal.addEventListener("abort", () => providerTrace.push({ query: key, event: "abort" }), { once: true });
      return provider[key].promise.then((detail) => {
        providerTrace.push({ query: key, event: "resolve" });
        return detail;
      });
    },
  };
  const domTree = (lane: "primary" | "fork", resource: AsyncResource<Panel>) =>
    jsx(DomApp, { lane, query, urgent, resource, life });
  const sceneTree = (resource: AsyncResource<Panel>) =>
    jsx(ThreeApp, { query, urgent, resource, geometry, material });
  let detail: ReturnType<NativeTaskTransitionQueue["enqueue"]> | null = null;
  let bPublished = false, forkCaughtUp = false, cPublished = false, disposed = false;
  let borrowedAtHostDisposal: { geometry: number; material: number } | null = null;
  primary.mount(domTree("primary", initial));
  fork.mount(domTree("fork", initial));
  three.root.mount(sceneTree(initial));

  const requireActive = () => {
    if (disposed) throw new Error("Forked transition example is disposed");
  };
  const publish = async (id: string, roots: "primary-three" | "fork" | "all", transition: string,
    finishTransitions: boolean) => {
    type Settled = Parameters<NonNullable<NativeRootWork["onSettled"]>>[0];
    let resolveSettled!: (outcome: Settled) => void;
    const settled = new Promise<Settled>((resolve) => { resolveSettled = resolve; });
    const entries = roots === "fork"
      ? [{ root: fork, tree: domTree("fork", initial) }]
      : roots === "primary-three"
      ? [{ root: primary, tree: domTree("primary", initial) },
        { root: three.root, tree: sceneTree(initial) }]
      : [{ root: primary, tree: domTree("primary", initial) },
        { root: three.root, tree: sceneTree(initial) },
        { root: fork, tree: domTree("fork", initial) }];
    publications.enqueue({ id, roots: entries,
      transitions: [transition], finishTransitions,
      onSettled(outcome) {
        settlementTrace.push({ id, status: outcome.status });
        resolveSettled(outcome);
      } });
    const outcome = await settled;
    if (disposed && outcome.status === "cancelled") return false;
    if (outcome.status !== "committed")
      throw outcome.error ?? new Error(`Host publication ${id}: ${outcome.status}`);
    if (disposed) return false;
    return true;
  };
  const snapshot = () => {
    const read = (root: HTMLElement) => ({
      query: root.querySelector("[data-query]")?.getAttribute("data-query") ?? null,
      urgent: root.querySelector("[data-urgent]")?.getAttribute("data-urgent") ?? null,
      result: root.querySelector("[data-result]")?.getAttribute("data-result") ?? null,
      detail: root.querySelector("[data-detail]")?.getAttribute("data-detail") ?? null,
      pending: root.querySelector("[data-pending]")?.getAttribute("data-pending") ?? null,
      error: root.querySelector("[data-error]")?.getAttribute("data-error") ?? null,
    });
    const sceneGroup = scene.getObjectByName("forked-transitions");
    const result = sceneGroup?.children.find((node) => node.name.startsWith("result-"));
    const resultMesh = result instanceof Mesh ? result : null;
    return {
      primary: read(primaryHost), fork: read(forkHost),
      three: {
        query: sceneGroup?.children.find((node) => node.name.startsWith("query-"))?.name ?? null,
        urgent: sceneGroup?.children.find((node) => node.name.startsWith("urgent-"))?.name ?? null,
        result: result?.name ?? null,
        resultPosition: result?.position.x ?? null,
        resultHandleId: resultMesh?.uuid ?? null,
        resultGeometryId: resultMesh?.geometry.uuid ?? null,
        resultMaterialId: resultMesh
          ? Array.isArray(resultMesh.material)
            ? resultMesh.material.map((entry) => entry.uuid)
            : resultMesh.material.uuid
          : null,
        children: scene.children.length,
        diagnostics: { ...three.host.diagnostics },
      },
      queryHead: query.getState(), urgentHead: urgent.getState(),
      providerTrace: [...providerTrace], settlementTrace: [...settlementTrace],
      detail: detail?.snapshot() ?? null,
      life: { ...life }, borrowedDisposed: { ...borrowedDisposed },
      borrowedAtHostDisposal, bPublished, forkCaughtUp, cPublished, disposed,
      roots: { primary: primary.diagnostics(), fork: fork.diagnostics(), three: three.root.diagnostics() },
      stores: { query: query.diagnostics(), urgent: urgent.diagnostics() },
    };
  };

  return {
    async beginB() {
      requireActive();
      if (bPublished) throw new Error("B was already published");
      query.beginTransition("query-B", [primary.rootId, three.root.rootId, fork.rootId]);
      query.dispatch("B", { kind: "transition", transitionId: "query-B" });
      if (!await publish("publish-B-primary-three", "primary-three", "query-B", true))
        return snapshot();
      bPublished = true;
      detail = transitions.enqueue(tasks, [
        { root: primary, buildTree: (execution) => domTree("primary", execution.resource("panel")) },
        { root: three.root, buildTree: (execution) => sceneTree(execution.resource("panel")) },
        { root: fork, buildTree: (execution) => domTree("fork", execution.resource("panel")) },
      ], { id: "detail-frontier", inputs: { "$request": request },
        liveInputs: { "$query": query },
        onSettled(outcome) { settlementTrace.push({ id: "detail-frontier", status: outcome.status }); } });
      return snapshot();
    },
    async catchUpFork() {
      requireActive();
      if (!bPublished || forkCaughtUp) throw new Error("Fork catch-up requires pending B");
      if (!await publish("publish-B-fork", "fork", "query-B", true))
        return snapshot();
      forkCaughtUp = true;
      return snapshot();
    },
    urgent() {
      requireActive();
      urgent.dispatch(urgent.getState() + 1);
      return snapshot();
    },
    async beginC() {
      requireActive();
      if (!forkCaughtUp || cPublished) throw new Error("C requires a converged pending B");
      query.beginTransition("query-C", [primary.rootId, three.root.rootId, fork.rootId]);
      query.dispatch("C", { kind: "transition", transitionId: "query-C" });
      if (!await publish("publish-C-all", "all", "query-C", true))
        return snapshot();
      cPublished = true;
      return snapshot();
    },
    resolveA() { provider.A.resolve("late-A"); },
    resolveB() { provider.B.resolve("late-B"); },
    resolveC() { provider.C.resolve("ready-C"); },
    cancel() { requireActive(); return detail?.cancel("caller cancelled detail") ?? null; },
    snapshot,
    dispose() {
      if (disposed) return snapshot();
      disposed = true;
      const errors: unknown[] = [];
      for (const cleanup of [() => transitions.dispose(), () => publications.dispose(),
        () => primary.dispose(), () => fork.dispose(), () => three.dispose()]) {
        try { cleanup(); } catch (error) { errors.push(error); }
      }
      borrowedAtHostDisposal = { ...borrowedDisposed };
      for (const cleanup of [() => geometry.dispose(), () => material.dispose(),
        () => primaryHost.remove(), () => forkHost.remove()]) {
        try { cleanup(); } catch (error) { errors.push(error); }
      }
      if (errors.length) throw new AggregateError(errors, "Forked transition disposal failed");
      return snapshot();
    },
  };
}

declare global {
  interface Window { forkedTransitions?: ReturnType<typeof mountNative> }
}

const host = document.querySelector<HTMLElement>("#app");
if (host) {
  const controller = mountNative(host);
  window.forkedTransitions = controller;
  const dispose = () => { controller.dispose(); };
  window.addEventListener("pagehide", dispose, { once: true });
  if (import.meta.hot) import.meta.hot.dispose(() => {
    window.removeEventListener("pagehide", dispose);
    dispose();
  });
}
