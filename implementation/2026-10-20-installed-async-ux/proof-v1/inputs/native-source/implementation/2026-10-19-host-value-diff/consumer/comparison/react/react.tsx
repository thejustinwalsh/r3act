/** @jsxImportSource react */
import { Suspense, use, useLayoutEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { flushSync } from "react-dom";
import { BoxGeometry, Group, Mesh, MeshStandardMaterial, Scene } from "three";

type RowValue = { id: string; label: string };
const scene = new Scene();
const sceneRoot = new Group();
scene.add(sceneRoot);
const mesh = new Mesh(new BoxGeometry(), new MeshStandardMaterial());
mesh.name = "step-0";
mesh.position.set(1, 2, 3);
sceneRoot.add(mesh);
const fallback = new Group();
fallback.name = "waiting";
sceneRoot.add(fallback);
let resolvePending!: (value: { x: number }) => void;
const pending = new Promise<{ x: number }>(done => { resolvePending = done; });
let pendingStatus = "pending";
void pending.then(() => { pendingStatus = "fulfilled"; });
const trace = { mounts: {} as Record<string, number>, cleanups: {} as Record<string, number> };
const initialRows: RowValue[] = [{ id: "a", label: "Alpha" }, { id: "b", label: "Beta" }];

function Row({ row }: { row: RowValue }) {
  useLayoutEffect(() => {
    trace.mounts[row.id] = (trace.mounts[row.id] ?? 0) + 1;
    return () => { trace.cleanups[row.id] = (trace.cleanups[row.id] ?? 0) + 1; };
  }, [row.id]);
  return <li data-row={row.id}>{row.label}</li>;
}
function PendingScene() {
  const value = use(pending);
  useLayoutEffect(() => {
    const ready = fallback;
    ready.name = `ready-${value.x}`;
    return () => { sceneRoot.remove(ready); };
  }, [value.x]);
  return null;
}
function PendingDom() {
  const value = use(pending);
  return <span data-dom-pending={`ready-${value.x}`} />;
}
function Hot({ step }: { step: number }) {
  return <output data-target="value" data-scalar={step === 0 ? "first" : "second"}
    data-step={step} style={step === 0 ? { color: "red", opacity: 1 } : { color: "blue" }} />;
}
function App() {
  const [step, setStep] = useState(0);
  const [rows, setRows] = useState(initialRows);
  useLayoutEffect(() => {
    mesh.name = `step-${step}`;
    mesh.position.set(step === 0 ? 1 : 4, step === 0 ? 2 : 5, step === 0 ? 3 : 6);
    mesh.rotation.set(0, step === 0 ? 0 : 0.5, 0);
  }, [step]);
  return <main>
    <button type="button" data-action="update" onClick={() => setStep(1)}>Update values</button>
    <button type="button" data-action="structure" onClick={() => setRows(current => [
      current.find(row => row.id === "b")!, { id: "c", label: "Charlie" },
    ])}>Change rows</button>
    <Hot step={step} />
    <ul data-list="rows">{rows.map(row => <Row key={row.id} row={row} />)}</ul>
    <Suspense fallback={<span data-dom-pending="waiting" />}><PendingDom /></Suspense>
    <Suspense fallback={null}><PendingScene /></Suspense>
  </main>;
}

const root = createRoot(document.getElementById("app")!);
flushSync(() => root.render(<App />));
const target = document.querySelector('[data-target="value"]');
const rowB = document.querySelector('[data-row="b"]');
let disposed = false;
const snapshot = () => {
  const element = document.querySelector<HTMLElement>('[data-target="value"]');
  const pendingChild = sceneRoot.children.find(child => child.name === "waiting" || child.name.startsWith("ready-"));
  return { color: element?.style.color ?? null, opacity: element?.style.opacity ?? null,
    scalar: element?.getAttribute("data-scalar") ?? null,
    step: element?.getAttribute("data-step") ?? null,
    targetRetained: element === target,
    rowOrder: Array.from(document.querySelectorAll("[data-row]")).map(node => node.getAttribute("data-row")),
    rowBRetained: document.querySelector('[data-row="b"]') === rowB,
    mounts: { ...trace.mounts }, cleanups: { ...trace.cleanups },
    meshRetained: sceneRoot.children.includes(mesh), position: mesh.position.toArray(),
    rotation: mesh.rotation.toArray().slice(0, 3), pending: pendingStatus,
    pendingName: pendingChild?.name ?? null, fallbackRetained: pendingChild === fallback,
    domPending: document.querySelector("[data-dom-pending]")?.getAttribute("data-dom-pending") ?? null,
    disposed };
};
(window as Window & { hostValueProof?: unknown }).hostValueProof = {
  snapshot, resolvePending(x: number) { resolvePending({ x }); },
  dispose() { if (disposed) return; flushSync(() => root.unmount());
    sceneRoot.remove(fallback); sceneRoot.remove(mesh); mesh.geometry.dispose();
    (mesh.material as MeshStandardMaterial).dispose(); disposed = true; },
};
