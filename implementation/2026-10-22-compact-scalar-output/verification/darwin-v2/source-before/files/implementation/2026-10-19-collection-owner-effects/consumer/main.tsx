/** @jsxImportSource @r3act/core */
// @native-ui
import { createKeyedCollection, createWorld, useEffect, useState } from "@r3act/core";
import { createDOMRoot } from "@r3act/host-dom";
import { createThreeNativeRoot } from "@r3act/host-three";
import { Scene } from "three";
import { SceneApp } from "./scene";
import { createSceneResource } from "./state";

type Item = { id: string; label: string };
export const opaqueRows = createKeyedCollection<Item>([
  { id: "a", label: "Alpha" }, { id: "b", label: "Beta" }, { id: "c", label: "Gamma" },
], row => row.id);
export const safeRows = createKeyedCollection<Item>([
  { id: "p", label: "Pure" }, { id: "q", label: "Quiet" },
], row => row.id);
const trace = {
  value: "A", opaqueCalls: 0, getterCalls: 0,
  mounts: {} as Record<string, number>, cleanups: {} as Record<string, number>,
  setters: {} as Record<string, (value: number) => void>,
};
const opaqueSource = { get value() { trace.getterCalls++; return trace.value; } };
function readOpaque() { trace.opaqueCalls++; return opaqueSource.value; }
export function Row(props: { row: Item }) {
  const { id, label } = props.row;
  const [count, setCount] = useState(0);
  useEffect(() => {
    trace.mounts[id] = (trace.mounts[id] ?? 0) + 1;
    trace.setters[id] = setCount;
    return () => { trace.cleanups[id] = (trace.cleanups[id] ?? 0) + 1; };
  });
  return <li key={id} data-row={id} data-count={count}>{label}</li>;
}
export function OpaqueCollection() {
  const opaque = readOpaque();
  return <section key="opaque-section">
    <output key="opaque-output" data-opaque={opaque} />
    <ul key="opaque-list" data-list="opaque">{opaqueRows.map(row => <Row row={row} />)}</ul>
  </section>;
}
export function SafeCollection() {
  return <ol key="safe-list" data-list="safe">{safeRows.map(row => <Row row={row} />)}</ol>;
}
export function App() {
  return <main>
    <h1>Collection owner effects</h1>
    <button type="button" data-action="safe" onClick={() => {
      safeRows.apply(safeRows.version, [{ type: "move", key: "q", beforeKey: "p" }]);
    }}>Move safe row</button>
    <button type="button" data-action="opaque" onClick={() => {
      trace.value = "B";
      opaqueRows.apply(opaqueRows.version, [{ type: "move", key: "c", beforeKey: "a" }]);
    }}>Move opaque row</button>
    <button type="button" data-action="row" onClick={() => trace.setters.b?.(7)}>Update row</button>
    <button type="button" data-action="structure" onClick={() => {
      opaqueRows.apply(opaqueRows.version, [
        { type: "remove", key: "a" },
        { type: "insert", key: "d", value: { id: "d", label: "Delta" }, beforeKey: "b" },
        { type: "replace", key: "b", value: { id: "b", label: "Bravo" } },
      ]);
    }}>Change structure</button>
    <OpaqueCollection key="opaque-owner" />
    <SafeCollection key="safe-owner" />
  </main>;
}

export function mountCollectionOwnerScene(host: HTMLElement) {
  const world = createWorld();
  const scene = new Scene();
  const pending = createSceneResource();
  const domRoot = createDOMRoot(host, { world, rootId: "collection-effects-dom" });
  const three = createThreeNativeRoot(scene,
    { rootOptions: { world, rootId: "collection-effects-three" } });
  let disposed = false;
  domRoot.mount(<App />);
  three.root.mount(<SceneApp resource={pending.resource} />);
  const identities = Object.fromEntries(["a", "b", "c", "p", "q"].map(id =>
    [id, host.querySelector(`[data-row="${id}"]`)]));
  const opaqueIdentity = host.querySelector("[data-opaque]");
  const sceneFallback = scene.children[0]?.children[0];
  const snapshot = () => {
    const list = (name: string) => Array.from(host.querySelectorAll(`[data-list="${name}"] [data-row]`))
      .map(node => node.getAttribute("data-row"));
    const row = (id: string) => host.querySelector(`[data-row="${id}"]`);
    const sceneChild = scene.children[0]?.children[0];
    return { opaque: host.querySelector("[data-opaque]")?.getAttribute("data-opaque") ?? null,
      opaqueRetained: host.querySelector("[data-opaque]") === opaqueIdentity,
      opaqueCalls: trace.opaqueCalls, getterCalls: trace.getterCalls,
      opaqueOrder: list("opaque"), safeOrder: list("safe"),
      rowBCount: row("b")?.getAttribute("data-count") ?? null,
      rowBLabel: row("b")?.textContent ?? null,
      retained: Object.fromEntries(Object.entries(identities).map(([id, node]) => [id, row(id) === node])),
      mounts: { ...trace.mounts }, cleanups: { ...trace.cleanups },
      sceneStatus: pending.resource.status.status,
      sceneName: sceneChild?.name ?? null,
      sceneFallbackRetained: sceneChild === sceneFallback,
      scenePosition: sceneChild?.children[0]?.position.toArray() ?? null,
      dom: domRoot.diagnostics(), three: three.root.diagnostics(),
      threeHost: three.host.diagnostics, disposed };
  };
  return { snapshot,
    resolveScene(x: number) { pending.resolve({ sample: { x } }); },
    dispose() { if (disposed) return; disposed = true; domRoot.dispose(); three.dispose(); } };
}

const host = document.getElementById("app")!;
(window as Window & { collectionOwnerProof?: ReturnType<typeof mountCollectionOwnerScene> })
  .collectionOwnerProof = mountCollectionOwnerScene(host);
