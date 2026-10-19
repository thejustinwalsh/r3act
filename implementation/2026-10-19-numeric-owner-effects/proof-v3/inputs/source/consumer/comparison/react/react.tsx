/** @jsxImportSource react */
import { Suspense, use, useLayoutEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { flushSync } from "react-dom";
import { Group, Mesh, Scene } from "three";

const scene = new Scene();
const sceneFallback = new Group();
sceneFallback.name = "waiting";
scene.add(sceneFallback);
let resolveScene!: (value: { sample: { x: number } }) => void;
const scenePromise = new Promise<{ sample: { x: number } }>(done => { resolveScene = done; });
let sceneResolved = false;
void scenePromise.then(() => { sceneResolved = true; });
const trace = { opaqueValue: "A", opaqueCalls: 0, getterCalls: 0,
  opaqueMounts: 0, opaqueCleanups: 0, hotMounts: 0, hotCleanups: 0 };
const opaqueSource = { get value() { trace.getterCalls++; return trace.opaqueValue; } };
function readOpaque() { trace.opaqueCalls++; return opaqueSource.value; }
let setOpaque!: (value: number) => void;
let setHot!: (value: number) => void;

function OpaqueSibling() {
  const [n, updateN] = useState(0);
  useLayoutEffect(() => { trace.opaqueMounts++; setOpaque = updateN;
    return () => { trace.opaqueCleanups++; }; }, [updateN]);
  const opaque = readOpaque();
  return <output data-n={n + 1} data-opaque={opaque} />;
}
function HotCounter() {
  const [n, updateN] = useState(0);
  useLayoutEffect(() => { trace.hotMounts++; setHot = updateN;
    return () => { trace.hotCleanups++; }; }, [updateN]);
  return <output data-hot={n + 1} />;
}
function PureNamed() {
  const [n] = useState(0);
  return <output data-pure-named={n + 1} />;
}
function PureArrow() {
  const [n] = useState(0);
  return <output data-pure-arrow={n + 1} />;
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
    <h1>Numeric owner effects</h1>
    <button type="button" data-action="hot" onClick={() => setHot(1)}>Update safe owner</button>
    <button type="button" data-action="opaque" onClick={() => {
      trace.opaqueValue = "B"; setOpaque(1);
    }}>Update opaque owner</button>
    <OpaqueSibling />
    <HotCounter />
    <PureNamed />
    <PureArrow />
    <Suspense fallback={null}><SceneReveal /></Suspense>
  </main>;
}

const root = createRoot(document.getElementById("app")!);
flushSync(() => root.render(<App />));
const opaqueInitial = document.querySelector("[data-opaque]");
const hotInitial = document.querySelector("[data-hot]");
let disposed = false;
const snapshot = () => {
  const opaque = document.querySelector("[data-opaque]");
  const hot = document.querySelector("[data-hot]");
  const sceneChild = scene.children[0];
  return { opaqueN: opaque?.getAttribute("data-n") ?? null,
    opaqueValue: opaque?.getAttribute("data-opaque") ?? null,
    opaqueRetained: opaque === opaqueInitial,
    hot: hot?.getAttribute("data-hot") ?? null, hotRetained: hot === hotInitial,
    opaqueCalls: trace.opaqueCalls, getterCalls: trace.getterCalls,
    opaqueMounts: trace.opaqueMounts, opaqueCleanups: trace.opaqueCleanups,
    hotMounts: trace.hotMounts, hotCleanups: trace.hotCleanups,
    sceneStatus: sceneResolved ? "fulfilled" : "pending",
    sceneName: sceneChild?.name ?? null,
    sceneFallbackRetained: sceneChild === sceneFallback,
    scenePosition: sceneChild?.children[0]?.position.toArray() ?? null,
    disposed };
};
(window as Window & { numericOwnerProof?: unknown }).numericOwnerProof = {
  snapshot,
  updateHot(value: number) { setHot(value); },
  updateOpaque(value: number, opaque: string) { trace.opaqueValue = opaque; setOpaque(value); },
  resolveScene(x: number) { resolveScene({ sample: { x } }); },
  dispose() { if (disposed) return; flushSync(() => root.unmount());
    scene.remove(sceneFallback); disposed = true; },
};
