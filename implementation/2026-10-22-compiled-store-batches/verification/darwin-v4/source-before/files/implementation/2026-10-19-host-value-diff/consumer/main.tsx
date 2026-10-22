/** @jsxImportSource @r3act/core */
// @native-ui
import { Suspense, createKeyedCollection, createWorld, use, useEffect, useState } from "@r3act/core";
import type { AsyncResource } from "@r3act/core";
import { createDOMRoot } from "@r3act/host-dom";
import { createThreeNativeRoot } from "@r3act/host-three";
import { Scene } from "three";
import { SceneApp } from "./scene";
import { verifyPublicCopyHost } from "./copy-host";
import { createPending, values } from "./state";

const copyHostContract = verifyPublicCopyHost();

type RowValue = { id: string; label: string };
const rows = createKeyedCollection<RowValue>([
  { id: "a", label: "Alpha" }, { id: "b", label: "Beta" },
], row => row.id);
const trace = { mounts: {} as Record<string, number>, cleanups: {} as Record<string, number> };
let setSceneStep: ((value: number) => void) | null = null;
function Row(props: { row: RowValue }) {
  useEffect(() => {
    const id = props.row.id;
    trace.mounts[id] = (trace.mounts[id] ?? 0) + 1;
    return () => { trace.cleanups[id] = (trace.cleanups[id] ?? 0) + 1; };
  });
  return <li key={props.row.id} data-row={props.row.id}>{props.row.label}</li>;
}
function PendingDom(props: { resource: AsyncResource<{ x: number }> }) {
  const value = use(props.resource);
  return <span key="pending-dom" data-dom-pending={`ready-${value.x}`} />;
}
export function App(props: { resource: AsyncResource<{ x: number }> }) {
  const [step, setStep] = useState(0);
  const update = () => {
    values.position.set(4, 5, 6);
    values.rotation[1] = 0.5;
    values.style.color = "blue";
    delete values.style.opacity;
    values.scalar = "second";
    setStep(1);
    setSceneStep?.(1);
  };
  return <main>
    <button type="button" data-action="update" onClick={update}>Update values</button>
    <button type="button" data-action="structure" onClick={() => rows.apply(rows.version, [
      { type: "move", key: "b", beforeKey: "a" },
      { type: "remove", key: "a" },
      { type: "insert", key: "c", value: { id: "c", label: "Charlie" }, beforeKey: null },
    ])}>Change rows</button>
    <output key="target" data-target="value" data-scalar={values.scalar}
      data-step={step} style={values.style} />
    <ul key="rows" data-list="rows">{rows.map(row => <Row row={row} />)}</ul>
    <Suspense fallback={<span key="pending-dom" data-dom-pending="waiting" />}>
      <PendingDom key="pending-dom-owner" resource={props.resource} />
    </Suspense>
  </main>;
}

export function mountHostValueDiff(host: HTMLElement) {
  const world = createWorld();
  const scene = new Scene();
  const pending = createPending();
  const dom = createDOMRoot(host, { world, rootId: "host-value-dom" });
  const three = createThreeNativeRoot(scene, { rootOptions: { world, rootId: "host-value-three" } });
  let disposed = false;
  let sceneStep = 0;
  setSceneStep = value => { sceneStep = value; three.root.update(<SceneApp step={value} resource={pending.resource} />); };
  dom.mount(<App resource={pending.resource} />);
  three.root.mount(<SceneApp step={sceneStep} resource={pending.resource} />);
  const target = host.querySelector('[data-target="value"]');
  const initialRows = Object.fromEntries(["a", "b"].map(id => [id, host.querySelector(`[data-row="${id}"]`)]));
  const mesh = scene.children[0]?.children.find(child => child.name === "step-0");
  const fallback = scene.children[0]?.children.find(child => child.name === "waiting");
  const snapshot = () => {
    const element = host.querySelector<HTMLElement>('[data-target="value"]');
    const sceneRoot = scene.children[0];
    const active = sceneRoot?.children.find(child => child.name.startsWith("step-"));
    const pendingChild = sceneRoot?.children.find(child => child.name === "waiting" || child.name.startsWith("ready-"));
    return { color: element?.style.color ?? null, opacity: element?.style.opacity ?? null,
      scalar: element?.getAttribute("data-scalar") ?? null,
      step: element?.getAttribute("data-step") ?? null,
      targetRetained: element === target,
      rowOrder: Array.from(host.querySelectorAll("[data-row]")).map(node => node.getAttribute("data-row")),
      rowBRetained: host.querySelector('[data-row="b"]') === initialRows.b,
      mounts: { ...trace.mounts }, cleanups: { ...trace.cleanups },
      meshRetained: active === mesh, position: active?.position.toArray() ?? null,
      rotation: active?.rotation.toArray().slice(0, 3) ?? null,
      pending: pending.resource.status.status, pendingName: pendingChild?.name ?? null,
      domPending: host.querySelector("[data-dom-pending]")?.getAttribute("data-dom-pending") ?? null,
      fallbackRetained: pendingChild === fallback,
      dom: dom.diagnostics(), three: three.root.diagnostics(),
      threeHost: three.host.diagnostics, copyHostContract, disposed };
  };
  return { snapshot, resolvePending(x: number) { pending.resolve({ x }); },
    dispose() { if (disposed) return; disposed = true; setSceneStep = null; dom.dispose(); three.dispose(); } };
}

(window as Window & { hostValueProof?: ReturnType<typeof mountHostValueDiff> }).hostValueProof =
  mountHostValueDiff(document.getElementById("app")!);
