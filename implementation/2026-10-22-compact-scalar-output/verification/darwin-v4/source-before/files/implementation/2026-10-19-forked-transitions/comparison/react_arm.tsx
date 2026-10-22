import { startTransition, Suspense, use, useLayoutEffect, useState, useSyncExternalStore } from "react";
import { createRoot } from "react-dom/client";
import { BoxGeometry, Group, Mesh, MeshBasicMaterial, Scene } from "three";

type Query = "A" | "B" | "C";
type Payload = Readonly<{ query: Query; detail: string; catalog: string }>;
type Provider = { promise: Promise<Payload>; resolve(value: Payload): void; status: "pending" | "resolved" };
function deferred(): Provider {
  let finish!: (value: Payload) => void;
  const promise = new Promise<Payload>(resolve => { finish = resolve; });
  const provider: Provider = { promise, status: "pending", resolve(value) {
    if (provider.status !== "pending") throw new Error("provider resolved twice");
    provider.status = "resolved"; finish(value);
  } };
  return provider;
}
const accepted: Payload = { query: "A", detail: "ready-A", catalog: "shared-catalog" };
const initial = Promise.resolve(accepted);
const position = (query: Query) => query === "A" ? 1 : query === "B" ? 2 : 3;

export function mountReact(host: HTMLElement) {
  const primaryHost = document.createElement("div"), forkHost = document.createElement("div");
  host.append(primaryHost, forkHost);
  const scene = new Scene(), group = new Group(); group.name = "forked-transitions"; scene.add(group);
  const queryGroup = new Group(); queryGroup.name = "query-A"; group.add(queryGroup);
  const urgentGroup = new Group(); urgentGroup.name = "urgent-0"; group.add(urgentGroup);
  const borrowedGeometry = new BoxGeometry(0.5, 0.5, 0.5);
  const borrowedMaterial = new MeshBasicMaterial({ color: "#89a4bf" });
  const borrowed = new Mesh(borrowedGeometry, borrowedMaterial); borrowed.name = "borrowed"; group.add(borrowed);
  const borrowedDisposed = { geometry: 0, material: 0 };
  borrowedGeometry.addEventListener("dispose", () => { borrowedDisposed.geometry++; });
  borrowedMaterial.addEventListener("dispose", () => { borrowedDisposed.material++; });
  const owned = { createdGeometry: 0, disposedGeometry: 0, createdMaterial: 0, disposedMaterial: 0 };
  let resultMesh: Mesh | null = null;
  let urgent = 0, queryHead: Query = "A", forkHead: Query = "A";
  let disposed = false, borrowedAtHostDisposal: { geometry: number; material: number } | null = null;
  let primarySetter: ((promise: Promise<Payload>) => void) | null = null;
  let forkSetter: ((promise: Promise<Payload>) => void) | null = null;
  const listeners = new Set<() => void>();
  const providers = { A: deferred(), B: deferred(), C: deferred() };
  const life = { effectRuns: 0, effectCleanups: 0, resourceStarts: 0,
    resourceSettlements: 0, resourceCancellations: 0, primaryMounts: 0,
    primaryCleanups: 0, forkMounts: 0, forkCleanups: 0 };
  const providerTrace: { query: Query; event: "start" | "resolve" }[] = [];
  const logicalRetirements: Query[] = [];
  const subscribe = (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; };
  const notify = () => { for (const listener of [...listeners]) listener(); };
  const getPrimary = () => `${queryHead}:${urgent}`;
  const getFork = () => `${forkHead}:${urgent}`;
  const beginProvider = (query: Query) => { providerTrace.push({ query, event: "start" }); life.resourceStarts++; };
  const retire = (query: Query) => { logicalRetirements.push(query); life.resourceCancellations++; };

  function Projection({ target }: { target: "primary" | "fork" }) {
    const state = useSyncExternalStore(subscribe, target === "primary" ? getPrimary : getFork);
    const [query, count] = state.split(":");
    useLayoutEffect(() => {
      if (target === "primary") { queryGroup.name = `query-${query}`; urgentGroup.name = `urgent-${count}`; }
    }, [target, query, count]);
    return <><output data-query={query}>{query}</output><output data-urgent={count}>{count}</output></>;
  }
  function Result({ promise, target }: { promise: Promise<Payload>; target: "primary" | "fork" }) {
    const value = use(promise);
    const requestedQuery = useSyncExternalStore(subscribe, target === "primary" ? getPrimary : getFork).split(":")[0];
    useLayoutEffect(() => {
      if (target === "primary") life.primaryMounts++; else life.forkMounts++;
      return () => { if (target === "primary") life.primaryCleanups++; else life.forkCleanups++; };
    }, [target]);
    useLayoutEffect(() => {
      life.effectRuns++;
      if (target === "primary") {
        if (resultMesh) {
          resultMesh.name = `result-${value.query}`;
          resultMesh.position.x = position(value.query);
        }
      }
      return () => { life.effectCleanups++; };
    }, [target, value]);
    return <output data-result={value.query} data-detail={value.detail}
      data-pending={requestedQuery === value.query ? undefined : "detail"}>
      {value.query}: {value.detail} · {value.catalog}</output>;
  }
  function App({ target }: { target: "primary" | "fork" }) {
    const [resource, setResource] = useState(initial);
    useLayoutEffect(() => {
      if (target === "primary") primarySetter = setResource; else forkSetter = setResource;
      return () => { if (target === "primary") primarySetter = null; else forkSetter = null; };
    }, [target, setResource]);
    useLayoutEffect(() => {
      if (target !== "primary") return;
      const geometry = new BoxGeometry(1, 1, 1);
      const material = new MeshBasicMaterial({ color: "#4775ad" });
      owned.createdGeometry++; owned.createdMaterial++;
      const mesh = new Mesh(geometry, material);
      mesh.name = `result-${accepted.query}`;
      mesh.position.x = position(accepted.query);
      group.add(mesh); resultMesh = mesh;
      return () => {
        group.remove(mesh); resultMesh = null;
        geometry.dispose(); material.dispose();
        owned.disposedGeometry++; owned.disposedMaterial++;
      };
    }, [target]);
    return <section data-root={target}><h2>{target === "primary" ? "Workspace" : "Forked inspector"}</h2>
      <Projection target={target} />
      <Suspense fallback={<output data-startup={target}>Loading</output>}>
        <Result promise={resource} target={target} />
      </Suspense></section>;
  }
  const primaryRoot = createRoot(primaryHost), forkRoot = createRoot(forkHost);
  primaryRoot.render(<App target="primary" />); forkRoot.render(<App target="fork" />);
  const current = (rootName: string, field: string) =>
    host.querySelector(`[data-root="${rootName}"] [data-${field}]`)?.getAttribute(`data-${field}`) ?? null;
  const snapshot = () => ({
    primary: { query: current("primary", "query"), urgent: current("primary", "urgent"),
      result: current("primary", "result"), detail: current("primary", "detail"), pending: current("primary", "pending") },
    fork: { query: current("fork", "query"), urgent: current("fork", "urgent"),
      result: current("fork", "result"), detail: current("fork", "detail"), pending: current("fork", "pending") },
    three: { query: queryGroup.name, urgent: urgentGroup.name, result: resultMesh?.name ?? null,
      resultPosition: resultMesh?.position.x ?? null, children: scene.children.length,
      resultHandleId: resultMesh?.uuid ?? null, resultGeometryId: resultMesh?.geometry.uuid ?? null,
      resultMaterialId: (resultMesh?.material as MeshBasicMaterial | undefined)?.uuid ?? null },
    queryHead, urgentHead: urgent, providers: { A: providers.A.status, B: providers.B.status, C: providers.C.status },
    providerTrace: [...providerTrace], logicalRetirements: [...logicalRetirements], life: { ...life }, owned: { ...owned },
    borrowedDisposed: { ...borrowedDisposed }, borrowedAtHostDisposal, listenerCount: listeners.size,
  });
  function requireReady() { if (disposed || !primarySetter || !forkSetter) throw new Error("React roots not ready or disposed"); }
  function settle(query: Query, detail: string) {
    providers[query].resolve({ query, detail, catalog: "shared-catalog" });
    providerTrace.push({ query, event: "resolve" }); life.resourceSettlements++;
  }
  return {
    beginB() { requireReady(); queryHead = "B"; notify();
      beginProvider("B"); beginProvider("A");
      startTransition(() => { primarySetter!(providers.B.promise); forkSetter!(providers.A.promise); }); },
    catchUpFork() { requireReady(); if (queryHead !== "B") throw new Error("fork catch-up requires pending B");
      forkHead = "B"; retire("A"); notify();
      startTransition(() => forkSetter!(providers.B.promise)); },
    urgent() { requireReady(); urgent++; notify(); },
    beginC() { requireReady(); if (forkHead !== "B") throw new Error("C requires converged B");
      queryHead = "C"; forkHead = "C"; retire("B"); beginProvider("C"); notify();
      startTransition(() => { primarySetter!(providers.C.promise); forkSetter!(providers.C.promise); }); },
    resolveA() { settle("A", "late-A"); },
    resolveB() { settle("B", "late-B"); },
    resolveC() { settle("C", "ready-C"); },
    cancel() { if (disposed) return; for (const query of ["A", "B", "C"] as const)
      if (providerTrace.some(item => item.query === query && item.event === "start") &&
        !logicalRetirements.includes(query)) retire(query);
      if (primarySetter && forkSetter) startTransition(() => { primarySetter!(initial); forkSetter!(initial); }); },
    snapshot,
    dispose() { if (disposed) return { ...snapshot(), hostChildren: host.childNodes.length,
      sceneChildren: scene.children.length }; disposed = true;
      primaryRoot.unmount(); forkRoot.unmount();
      group.remove(queryGroup, urgentGroup, borrowed); scene.remove(group);
      borrowedAtHostDisposal = { ...borrowedDisposed };
      borrowedGeometry.dispose(); borrowedMaterial.dispose();
      primaryHost.remove(); forkHost.remove();
      return { ...snapshot(), hostChildren: host.childNodes.length, sceneChildren: scene.children.length };
    },
  };
}
