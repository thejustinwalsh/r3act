import {
  AsyncResource, AsyncTaskDemandScope, NativeTaskTransitionQueue,
  createStore, defineProviderDemand, definePureDerivedDemand, jsx,
} from "@r3act/core";
import type { DemandCapture, DemandDefinition } from "@r3act/core";
import { createDOMRoot } from "@r3act/host-dom";
import { createThreeNativeRoot } from "@r3act/host-three";
import { Scene } from "three";
import {
  NavigationApp, RecommendationsApp, ThreeApp, deriveNavigation,
  routeTasks, profileTask,
} from "./app";
import type { Navigation, Permissions, Profile, Projects,
  Recommendations, RouteProvider } from "./app";

type Deferred<T> = { promise: Promise<T>; resolve(value: T): void };
const deferred = <T>(): Deferred<T> => {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((yes) => { resolve = yes; });
  return { promise, resolve };
};

type ProviderKind = "profile" | "permissions" | "projects" | "recommendations";
type ProviderEvent = Readonly<{ kind: ProviderKind; key: string;
  event: "start" | "abort" | "resolve"; atMs: number }>;

export function mountNative(host: HTMLElement) {
  const navHost = document.createElement("div");
  const forkHost = document.createElement("div");
  host.append(navHost, forkHost);
  const scene = new Scene();
  const navigationRoot = createDOMRoot(navHost, { rootId: "dependency-navigation" });
  const forkRoot = createDOMRoot(forkHost, { rootId: "dependency-fork" });
  const three = createThreeNativeRoot(scene,
    { rootOptions: { rootId: "dependency-three" } });
  const transitions = new NativeTaskTransitionQueue();
  const demandScope = new AsyncTaskDemandScope();
  const query = createStore("A");
  const urgent = createStore(0);
  const trace: ProviderEvent[] = [];
  const pending = new Map<string, Deferred<unknown>[]>();
  const settled: { lane: string; status: string }[] = [];
  let routeHandle: ReturnType<NativeTaskTransitionQueue["enqueue"]> | null = null;
  let nextRoute = 0;
  let disposed = false;

  const start = <T>(kind: ProviderKind, key: string,
    signal: AbortSignal): Promise<T> => {
    trace.push({ kind, key, event: "start", atMs: performance.now() });
    signal.addEventListener("abort", () => trace.push({ kind, key, event: "abort",
      atMs: performance.now() }),
      { once: true });
    const result = deferred<T>();
    const id = `${kind}:${key}`;
    const queue = pending.get(id) ?? [];
    queue.push(result as Deferred<unknown>);
    pending.set(id, queue);
    return result.promise;
  };
  const provider: RouteProvider = Object.freeze({
    profile: (value: string, signal: AbortSignal) => start<Profile>("profile", value, signal),
    permissions: (value: string, signal: AbortSignal) =>
      start<Permissions>("permissions", value, signal),
    projects: (value: string, signal: AbortSignal) => start<Projects>("projects", value, signal),
    recommendations: (value: string, signal: AbortSignal) =>
      start<Recommendations>("recommendations", value, signal),
  });
  const revision = profileTask.compiled?.moduleRevision ?? "authored-route-v1";
  const identities = { profile: {}, permissions: {}, projects: {},
    navigation: {}, recommendations: {} };
  const valueCapture = (value: unknown): DemandCapture =>
    Object.freeze({ identity: value, version: 0, value });
  const providerCapture = valueCapture(provider);
  const queryCaptures = (inputs: ReadonlyMap<string, unknown>) =>
    Object.freeze([providerCapture, valueCapture(String(inputs.get("$query")))]);
  const demands = new Map<string, DemandDefinition | Readonly<{
    definition: DemandDefinition;
    captures: (inputs: ReadonlyMap<string, unknown>) => readonly DemandCapture[];
  }>>([
    ["profile", { definition: defineProviderDemand<Profile>(identities.profile, revision,
      (captures, signal) => provider.profile(String(captures[1].value), signal)),
      captures: queryCaptures }],
    ["permissions", { definition: defineProviderDemand<Permissions>(identities.permissions,
      revision, (captures, signal) =>
        provider.permissions(String(captures[1].value), signal)),
      captures: queryCaptures }],
    ["projects", { definition: defineProviderDemand<Projects>(identities.projects,
      revision, (captures, signal) =>
        provider.projects((captures[1].value as Profile).accountId, signal)),
      captures: (inputs) => Object.freeze([providerCapture,
        valueCapture(inputs.get("profile"))]) }],
    ["navigation", { definition: definePureDerivedDemand<Navigation>(identities.navigation,
      revision, (captures) => deriveNavigation(captures[0].value as Profile,
        captures[1].value as Permissions, captures[2].value as Projects)),
      captures: (inputs) => Object.freeze([valueCapture(inputs.get("profile")),
        valueCapture(inputs.get("permissions")), valueCapture(inputs.get("projects"))]) }],
    ["recommendations", { definition: defineProviderDemand<Recommendations>(
      identities.recommendations, revision, (captures, signal) =>
        provider.recommendations(String(captures[1].value), signal)),
      captures: queryCaptures }],
  ]);

  const initialNav = new AsyncResource<Navigation>(Promise.resolve(Object.freeze({
    query: "A", label: "Initial", projectCount: 0,
  })));
  const initialRecommendations = new AsyncResource<Recommendations>(
    Promise.resolve(Object.freeze({ query: "A", label: "Initial" })));
  const navigationTree = (resource: AsyncResource<Navigation>) =>
    jsx(NavigationApp, { resource, urgent });
  const recommendationsTree = (resource: AsyncResource<Recommendations>) =>
    jsx(RecommendationsApp, { resource, urgent });
  const threeTree = (resource: AsyncResource<Navigation>) =>
    jsx(ThreeApp, { resource, urgent });
  navigationRoot.mount(navigationTree(initialNav));
  forkRoot.mount(recommendationsTree(initialRecommendations));
  three.root.mount(threeTree(initialNav));

  const requireActive = () => {
    if (disposed) throw new Error("Dependency route is disposed");
  };
  const resolve = <T>(kind: ProviderKind, key: string, value: T) => {
    trace.push({ kind, key, event: "resolve", atMs: performance.now() });
    const id = `${kind}:${key}`;
    for (const request of pending.get(id) ?? []) request.resolve(value);
    pending.delete(id);
  };
  const read = (element: HTMLElement, selector: string, attribute: string) =>
    element.querySelector(selector)?.getAttribute(attribute) ?? null;
  const snapshot = () => ({
    navigation: {
      query: read(navHost, "[data-navigation]", "data-navigation"),
      label: read(navHost, "[data-label]", "data-label"),
      projectCount: read(navHost, "[data-project-count]", "data-project-count"),
      urgent: read(navHost, "[data-urgent]", "data-urgent"),
    },
    fork: {
      query: read(forkHost, "[data-recommendations]", "data-recommendations"),
      label: read(forkHost, "[data-recommendation-label]", "data-recommendation-label"),
      urgent: read(forkHost, "[data-urgent]", "data-urgent"),
    },
    three: scene.children[0]?.name ?? null,
    queryHead: query.getState(), urgentHead: urgent.getState(),
    providerTrace: [...trace], settlementTrace: [...settled],
    routeWork: routeHandle?.snapshot() ?? null,
    scopeEntries: demandScope.size,
    accepted: {
      navigation: JSON.stringify(navigationRoot.snapshot),
      fork: JSON.stringify(forkRoot.snapshot),
      three: JSON.stringify(three.root.snapshot),
    },
    disposed,
  });

  const acceptedUrgent = (count: number) => {
    const expected = String(count);
    const navQuery = read(navHost, "[data-navigation]", "data-navigation");
    const projectCount = read(navHost, "[data-project-count]", "data-project-count");
    return navQuery !== null && navQuery !== "pending" &&
      read(forkHost, "[data-recommendations]", "data-recommendations") !== null &&
      read(navHost, "[data-urgent]", "data-urgent") === expected &&
      read(forkHost, "[data-urgent]", "data-urgent") === expected &&
      scene.children[0]?.name ===
        `navigation-${navQuery}-${projectCount}-urgent-${expected}`;
  };

  return {
    begin(value: string) {
      requireActive();
      query.dispatch(value);
      routeHandle = transitions.enqueue(routeTasks, [
        { root: navigationRoot, buildTree: (execution) =>
          navigationTree(execution.resource("navigation")) },
        { root: three.root, buildTree: (execution) =>
          threeTree(execution.resource("navigation")) },
        { root: forkRoot, buildTree: (execution) =>
          recommendationsTree(execution.resource("recommendations")) },
      ], { id: `route-${++nextRoute}-${value}`, key: "dependency-route",
        reveal: "independent", renderPreparation: "repeatable",
        inputs: { "$provider": provider }, liveInputs: { "$query": query },
        demandScope, demands,
        onSettled: (outcome) => settled.push({ lane: "route", status: outcome.status }) });
      return snapshot();
    },
    resolveProfile(value: string, profile: Profile) {
      resolve("profile", value, Object.freeze({ ...profile }));
      return snapshot();
    },
    resolvePermissions(value: string, permissions: Permissions) {
      resolve("permissions", value, Object.freeze({ ...permissions }));
      return snapshot();
    },
    resolveProjects(accountId: string, projects: Projects) {
      resolve("projects", accountId, Object.freeze({ ...projects,
        titles: Object.freeze([...projects.titles]) }));
      return snapshot();
    },
    resolveRecommendations(value: string, recommendations: Recommendations) {
      resolve("recommendations", value, Object.freeze({ ...recommendations }));
      return snapshot();
    },
    urgent() {
      requireActive();
      urgent.dispatch(urgent.getState() + 1);
      navigationRoot.flush(); forkRoot.flush(); three.root.flush();
    },
    cancelPending() {
      requireActive();
      routeHandle?.cancel("Pending fork recommendation cancelled");
      return snapshot();
    },
    snapshot,
    acceptedUrgent,
    dispose() {
      if (disposed) return snapshot();
      disposed = true;
      const errors: unknown[] = [];
      for (const cleanup of [() => transitions.dispose(), () => demandScope.dispose(),
        () => navigationRoot.dispose(), () => forkRoot.dispose(), () => three.dispose(),
        () => navHost.remove(), () => forkHost.remove()]) {
        try { cleanup(); } catch (error) { errors.push(error); }
      }
      if (errors.length) throw new AggregateError(errors, "Dependency route disposal failed");
      return snapshot();
    },
  };
}

declare global {
  interface Window { dependencyScoped?: ReturnType<typeof mountNative> }
}

const host = document.querySelector<HTMLElement>("#app");
if (host) {
  const controller = mountNative(host);
  window.dependencyScoped = controller;
  const dispose = () => controller.dispose();
  window.addEventListener("pagehide", dispose, { once: true });
  if (import.meta.hot) import.meta.hot.dispose(() => {
    window.removeEventListener("pagehide", dispose);
    dispose();
  });
}
