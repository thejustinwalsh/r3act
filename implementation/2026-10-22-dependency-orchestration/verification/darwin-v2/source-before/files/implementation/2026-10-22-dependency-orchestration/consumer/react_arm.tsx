/** @jsxImportSource react */
import { useSyncExternalStore } from "react";
import { createRoot } from "react-dom/client";
import { Canvas } from "@react-three/fiber/legacy";

type Kind = "profile" | "permissions" | "projects" | "recommendations";
type Profile = { query: string; accountId: string; name: string };
type Permissions = { query: string; level: string };
type Projects = { accountId: string; titles: readonly string[] };
type Recommendations = { query: string; label: string };
type Navigation = { query: string; label: string; projectCount: number };
type Values = { profile: Profile; permissions: Permissions;
  projects: Projects; recommendations: Recommendations };
type Deferred<T> = { promise: Promise<T>; resolve(value: T): void };
type View = { nav: Navigation; fork: Recommendations; urgentHead: number };
type RouteStore = {
  subscribe(listener: () => void): () => void;
  getSnapshot(): View;
  observeThree(name: string): void;
};

function NavigationPanel({ store }: { store: RouteStore }) {
  const state = useSyncExternalStore(store.subscribe, store.getSnapshot);
  return <section data-root="navigation">
    <output data-urgent={state.urgentHead}>{state.urgentHead}</output>
    <output data-navigation={state.nav.query} data-label={state.nav.label}
      data-project-count={state.nav.projectCount}>
      {state.nav.label} · {state.nav.projectCount} projects
    </output>
    <Canvas frameloop="never" gl={{ antialias: false }}
      style={{ width: 240, height: 120 }}>
      <ThreePanel store={store} />
    </Canvas>
  </section>;
}

function ThreePanel({ store }: { store: RouteStore }) {
  const state = useSyncExternalStore(store.subscribe, store.getSnapshot);
  const name = `navigation-${state.nav.query}-${state.nav.projectCount}-urgent-${state.urgentHead}`;
  return <group name={name} onUpdate={(object) => store.observeThree(object.name)} />;
}

function RecommendationPanel({ store }: { store: RouteStore }) {
  const state = useSyncExternalStore(store.subscribe, store.getSnapshot);
  return <section data-root="recommendations">
    <output data-urgent={state.urgentHead}>{state.urgentHead}</output>
    <output data-recommendations={state.fork.query}
      data-recommendation-label={state.fork.label}>{state.fork.label}</output>
  </section>;
}

function deferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((yes) => { resolve = yes; });
  return { promise, resolve };
}

export function mountReact(host: HTMLElement) {
  const navHost = document.createElement("div");
  const forkHost = document.createElement("div");
  host.append(navHost, forkHost);
  const navRoot = createRoot(navHost);
  const forkRoot = createRoot(forkHost);
  const listeners = new Set<() => void>();
  const trace: { kind: Kind; key: string; event: "start" | "resolve" | "abort";
    atMs: number }[] = [];
  const settled: { lane: string; status: string }[] = [];
  const providers = new Map<string, Deferred<unknown>>();
  const controllers = new Map<string, AbortController>();
  const navCache = new Map<string, Navigation>();
  let queryHead = "A", urgentHead = 0, navGeneration = 0, forkGeneration = 0;
  let nav: Navigation = { query: "A", label: "Initial", projectCount: 0 };
  let fork: Recommendations = { query: "A", label: "Initial" };
  let threeName: string | null = null;
  let disposed = false;
  let view = { nav, fork, urgentHead };
  const subscribe = (listener: () => void) => {
    listeners.add(listener);
    return () => { listeners.delete(listener); };
  };
  const getSnapshot = () => view;
  const store: RouteStore = {
    subscribe,
    getSnapshot,
    observeThree(name) {
      threeName = name;
      window.dispatchEvent(new Event("dependency-three-commit"));
    },
  };
  const publish = () => {
    view = { nav, fork, urgentHead };
    for (const listener of [...listeners]) listener();
  };
  const provider = <K extends Kind>(kind: K, key: string): Promise<Values[K]> => {
    const id = `${kind}:${key}`;
    let entry = providers.get(id);
    if (!entry) {
      entry = deferred<Values[K]>();
      providers.set(id, entry);
      controllers.set(id, new AbortController());
      trace.push({ kind, key, event: "start", atMs: performance.now() });
    }
    return entry.promise as Promise<Values[K]>;
  };
  const resolve = <K extends Kind>(kind: K, key: string, value: Values[K]) => {
    const id = `${kind}:${key}`;
    const entry = providers.get(id);
    if (!entry) throw new Error(`Unknown ${id} resolution`);
    providers.delete(id);
    trace.push({ kind, key, event: "resolve", atMs: performance.now() });
    entry.resolve(value);
  };
  const abort = (kind: Kind, key: string) => {
    const id = `${kind}:${key}`;
    const controller = controllers.get(id);
    if (!controller || controller.signal.aborted) return;
    controller.abort();
    trace.push({ kind, key, event: "abort", atMs: performance.now() });
  };
  const read = (element: HTMLElement, selector: string, attribute: string) =>
    element.querySelector(selector)?.getAttribute(attribute) ?? null;

  navRoot.render(<NavigationPanel store={store} />);
  forkRoot.render(<RecommendationPanel store={store} />);

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
    three: threeName,
    queryHead, urgentHead, providerTrace: [...trace], settlementTrace: [...settled],
    navigationWork: null, forkWork: null, scopeEntries: providers.size,
    accepted: null, disposed,
  });
  const acceptedUrgent = (count: number) => {
    const expected = String(count);
    const navQuery = read(navHost, "[data-navigation]", "data-navigation");
    const projectCount = read(navHost, "[data-project-count]", "data-project-count");
    return navQuery !== null && navQuery !== "pending" &&
      read(forkHost, "[data-recommendations]", "data-recommendations") !== null &&
      read(navHost, "[data-urgent]", "data-urgent") === expected &&
      read(forkHost, "[data-urgent]", "data-urgent") === expected &&
      threeName === `navigation-${navQuery}-${projectCount}-urgent-${expected}`;
  };
  return {
    begin(query: string) {
      if (disposed) throw new Error("Dependency route disposed");
      queryHead = query;
      const navTicket = ++navGeneration;
      const forkTicket = ++forkGeneration;
      const profile = provider("profile", query);
      const permissions = provider("permissions", query);
      const recommendations = provider("recommendations", query);
      const projects = profile.then((value) => provider("projects", value.accountId));
      void Promise.all([profile, permissions, projects]).then(([p, permission, project]) => {
        let next = navCache.get(query);
        if (!next) {
          next = { query: p.query, label: `${p.name} · ${permission.level}`,
            projectCount: project.titles.length };
          navCache.set(query, next);
        }
        if (!disposed && navTicket === navGeneration) {
          nav = next;
          settled.push({ lane: "navigation", status: "committed" });
          publish();
        }
      });
      void recommendations.then((next) => {
        if (!disposed && forkTicket === forkGeneration) {
          fork = next;
          settled.push({ lane: "fork", status: "committed" });
          publish();
        }
      });
      return snapshot();
    },
    resolveProfile(query: string, value: Profile) {
      resolve("profile", query, Object.freeze({ ...value })); return snapshot();
    },
    resolvePermissions(query: string, value: Permissions) {
      resolve("permissions", query, Object.freeze({ ...value })); return snapshot();
    },
    resolveProjects(accountId: string, value: Projects) {
      resolve("projects", accountId, Object.freeze({ ...value,
        titles: Object.freeze([...value.titles]) })); return snapshot();
    },
    resolveRecommendations(query: string, value: Recommendations) {
      resolve("recommendations", query, Object.freeze({ ...value })); return snapshot();
    },
    urgent() {
      if (disposed) throw new Error("Dependency route disposed");
      urgentHead++;
      publish();
    },
    cancelPending() {
      ++forkGeneration;
      abort("recommendations", queryHead);
      return snapshot();
    },
    snapshot,
    acceptedUrgent,
    dispose() {
      if (disposed) return snapshot();
      disposed = true;
      ++navGeneration;
      ++forkGeneration;
      for (const id of controllers.keys()) {
        const [kind, ...key] = id.split(":");
        abort(kind as Kind, key.join(":"));
      }
      navRoot.unmount();
      forkRoot.unmount();
      navHost.remove();
      forkHost.remove();
      threeName = null;
      listeners.clear();
      return snapshot();
    },
  };
}
