/** @jsxImportSource react */
import { Suspense, use, useLayoutEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { flushSync } from "react-dom";
import { Group, Mesh, Scene } from "three";

type Item = { id: string; label: string };
const initialOpaque: Item[] = [
  { id: "a", label: "Alpha" }, { id: "b", label: "Beta" }, { id: "c", label: "Gamma" },
];
const initialSafe: Item[] = [{ id: "p", label: "Pure" }, { id: "q", label: "Quiet" }];
const scene = new Scene();
const sceneFallback = new Group();
sceneFallback.name = "waiting";
scene.add(sceneFallback);
let resolveScene!: (value: { sample: { x: number } }) => void;
const scenePromise = new Promise<{ sample: { x: number } }>(done => { resolveScene = done; });
let sceneResolved = false;
void scenePromise.then(() => { sceneResolved = true; });
const trace = { value: "A", opaqueCalls: 0, getterCalls: 0,
  mounts: {} as Record<string, number>, cleanups: {} as Record<string, number>,
  setters: {} as Record<string, (value: number) => void> };
const opaqueSource = { get value() { trace.getterCalls++; return trace.value; } };
function readOpaque() { trace.opaqueCalls++; return opaqueSource.value; }
function Row({ row }: { row: Item }) {
  const [count, setCount] = useState(0);
  useLayoutEffect(() => {
    trace.mounts[row.id] = (trace.mounts[row.id] ?? 0) + 1;
    trace.setters[row.id] = setCount;
    return () => { trace.cleanups[row.id] = (trace.cleanups[row.id] ?? 0) + 1; };
  }, [row.id]);
  return <li data-row={row.id} data-count={count}>{row.label}</li>;
}
function OpaqueCollection() {
  "use no memo";
  const [rows, setRows] = useState(initialOpaque);
  const opaque = readOpaque();
  return <section>
    <button type="button" data-action="opaque" onClick={() => {
      trace.value = "B"; setRows(current => [current[2], current[0], current[1]]);
    }}>Move opaque row</button>
    <button type="button" data-action="structure" onClick={() => setRows(current => [
      current.find(row => row.id === "c")!, { id: "d", label: "Delta" },
      { id: "b", label: "Bravo" },
    ])}>Change structure</button>
    <output data-opaque={opaque} />
    <ul data-list="opaque">{rows.map(row => <Row key={row.id} row={row} />)}</ul>
  </section>;
}
function SafeCollection() {
  const [rows, setRows] = useState(initialSafe);
  return <section>
    <button type="button" data-action="safe" onClick={() => setRows(current => [current[1], current[0]])}>
      Move safe row</button>
    <ol data-list="safe">{rows.map(row => <Row key={row.id} row={row} />)}</ol>
  </section>;
}
function SceneReveal() {
  const value = use(scenePromise);
  useLayoutEffect(() => {
    const group = new Group();
    const mesh = new Mesh();
    mesh.position.set(value.sample.x, 0, 0);
    group.add(mesh);
    scene.remove(sceneFallback);
    scene.add(group);
    return () => { scene.remove(group); };
  }, [value.sample.x]);
  return null;
}
function App() {
  return <main>
    <h1>Collection owner effects</h1>
    <button type="button" data-action="row" onClick={() => trace.setters.b?.(7)}>Update row</button>
    <OpaqueCollection />
    <SafeCollection />
    <Suspense fallback={null}><SceneReveal /></Suspense>
  </main>;
}

const root = createRoot(document.getElementById("app")!);
flushSync(() => root.render(<App />));
const identities = Object.fromEntries(["a", "b", "c", "p", "q"].map(id =>
  [id, document.querySelector(`[data-row="${id}"]`)]));
const opaqueIdentity = document.querySelector("[data-opaque]");
let disposed = false;
const snapshot = () => {
  const list = (name: string) => Array.from(document.querySelectorAll(`[data-list="${name}"] [data-row]`))
    .map(node => node.getAttribute("data-row"));
  const row = (id: string) => document.querySelector(`[data-row="${id}"]`);
  const sceneChild = scene.children[0];
  return { opaque: document.querySelector("[data-opaque]")?.getAttribute("data-opaque") ?? null,
    opaqueRetained: document.querySelector("[data-opaque]") === opaqueIdentity,
    opaqueCalls: trace.opaqueCalls, getterCalls: trace.getterCalls,
    opaqueOrder: list("opaque"), safeOrder: list("safe"),
    rowBCount: row("b")?.getAttribute("data-count") ?? null,
    rowBLabel: row("b")?.textContent ?? null,
    retained: Object.fromEntries(Object.entries(identities).map(([id, node]) => [id, row(id) === node])),
    mounts: { ...trace.mounts }, cleanups: { ...trace.cleanups },
    sceneStatus: sceneResolved ? "fulfilled" : "pending",
    sceneName: sceneChild?.name ?? null,
    sceneFallbackRetained: sceneChild === sceneFallback,
    scenePosition: sceneChild?.children[0]?.position.toArray() ?? null,
    disposed };
};
(window as Window & { collectionOwnerProof?: unknown }).collectionOwnerProof = {
  snapshot,
  resolveScene(x: number) { resolveScene({ sample: { x } }); },
  dispose() { if (disposed) return; flushSync(() => root.unmount());
    scene.remove(sceneFallback); disposed = true; },
};
