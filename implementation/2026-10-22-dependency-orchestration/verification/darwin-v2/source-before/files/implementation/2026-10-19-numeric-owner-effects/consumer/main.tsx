/** @jsxImportSource @r3act/core */
// @native-ui
import { createWorld, useEffect, useState } from "@r3act/core";
import { createDOMRoot } from "@r3act/host-dom";
import { createThreeNativeRoot } from "@r3act/host-three";
import { Scene } from "three";
import { SceneApp } from "./scene";
import { createSceneResource } from "./state";

const trace = { opaqueValue: "A", opaqueCalls: 0, getterCalls: 0,
  opaqueMounts: 0, opaqueCleanups: 0, hotMounts: 0, hotCleanups: 0,
  setOpaque: null as null | ((value: number) => void),
  setHot: null as null | ((value: number) => void) };
const opaqueSource = { get value() { trace.getterCalls++; return trace.opaqueValue; } };
function readOpaque() { trace.opaqueCalls++; return opaqueSource.value; }

export function OpaqueSibling() {
  const [n, setN] = useState(0);
  useEffect(() => { trace.opaqueMounts++; trace.setOpaque = setN;
    return () => { trace.opaqueCleanups++; }; });
  const opaque = readOpaque();
  return <output key="opaque" data-n={n + 1} data-opaque={opaque} />;
}
export const HotCounter = () => {
  const [n, setN] = useState(0);
  useEffect(() => { trace.hotMounts++; trace.setHot = setN;
    return () => { trace.hotCleanups++; }; });
  return <output key="hot" data-hot={n + 1} />;
};
export function PureNamed() {
  const [n] = useState(0);
  return <output key="pure-named" data-pure-named={n + 1} />;
}
export const PureArrow = () => {
  const [n] = useState(0);
  return <output key="pure-arrow" data-pure-arrow={n + 1} />;
};
export function App() {
  return <main>
    <h1>Numeric owner effects</h1>
    <button type="button" data-action="hot" onClick={() => trace.setHot?.(1)}>Update safe owner</button>
    <button type="button" data-action="opaque" onClick={() => {
      trace.opaqueValue = "B"; trace.setOpaque?.(1);
    }}>Update opaque owner</button>
    <OpaqueSibling key="opaque-owner" />
    <HotCounter key="hot-owner" />
    <PureNamed key="named-owner" />
    <PureArrow key="arrow-owner" />
  </main>;
}

export function mountNumericOwnerScene(host: HTMLElement) {
  const world = createWorld();
  const scene = new Scene();
  const pending = createSceneResource();
  const domRoot = createDOMRoot(host, { world, rootId: "numeric-effects-dom" });
  const three = createThreeNativeRoot(scene,
    { rootOptions: { world, rootId: "numeric-effects-three" } });
  let disposed = false;
  domRoot.mount(<App />);
  three.root.mount(<SceneApp resource={pending.resource} />);
  const opaqueInitial = host.querySelector("[data-opaque]");
  const hotInitial = host.querySelector("[data-hot]");
  const sceneFallback = scene.children[0]?.children[0];
  const snapshot = () => {
    const opaque = host.querySelector("[data-opaque]");
    const hot = host.querySelector("[data-hot]");
    const sceneChild = scene.children[0]?.children[0];
    return { opaqueN: opaque?.getAttribute("data-n") ?? null,
      opaqueValue: opaque?.getAttribute("data-opaque") ?? null,
      opaqueRetained: opaque === opaqueInitial,
      hot: hot?.getAttribute("data-hot") ?? null, hotRetained: hot === hotInitial,
      opaqueCalls: trace.opaqueCalls, getterCalls: trace.getterCalls,
      opaqueMounts: trace.opaqueMounts, opaqueCleanups: trace.opaqueCleanups,
      hotMounts: trace.hotMounts, hotCleanups: trace.hotCleanups,
      sceneStatus: pending.resource.status.status,
      sceneName: sceneChild?.name ?? null,
      sceneFallbackRetained: sceneChild === sceneFallback,
      scenePosition: sceneChild?.children[0]?.position.toArray() ?? null,
      dom: domRoot.diagnostics(), three: three.root.diagnostics(),
      threeHost: three.host.diagnostics, disposed };
  };
  return { snapshot,
    updateHot(value: number) { trace.setHot?.(value); },
    updateOpaque(value: number, opaque: string) { trace.opaqueValue = opaque; trace.setOpaque?.(value); },
    resolveScene(x: number) { pending.resolve({ sample: { x } }); },
    dispose() { if (disposed) return; disposed = true; domRoot.dispose(); three.dispose(); } };
}

const host = document.getElementById("app")!;
(window as Window & { numericOwnerProof?: ReturnType<typeof mountNumericOwnerScene> })
  .numericOwnerProof = mountNumericOwnerScene(host);
