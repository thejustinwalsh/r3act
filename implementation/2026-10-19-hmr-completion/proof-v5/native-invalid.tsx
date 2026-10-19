/** @jsxImportSource @r3act/core */
// @native-ui
import { Suspense, NativeRootWorkQueue, createWorld, use } from "@r3act/core";
import { createDOMRoot } from "@r3act/host-dom";
import { createThreeNativeRoot } from "@r3act/host-three";
import { RadixDialog } from "@r3act/react-bridge/radix-dialog";
import { createElement } from "react";
import { BoxGeometry, MeshBasicMaterial, Scene } from "three";
import { ReactPanel, type DialogTrace } from "./react-panel";
import { ThreeApp } from "./scene";
import { createSceneDomain, type SceneDomain } from "./state";

export const nativeRevision = "native-v1" + ;;

type AppProps = {
  domain: SceneDomain;
  portal: HTMLElement;
  trace: DialogTrace;
  order: readonly string[];
  onOpenChange: (open: boolean) => void;
  onMove: () => void;
  onReorder: () => void;
  onLoadDetail: () => void;
  onLoadSignal: () => void;
  onLoadHealth: () => void;
};

export function Detail(props: { resource: SceneDomain["detail"]; point: SceneDomain["point"] }) {
  const value = use(props.resource);
  const point = use(props.point);
  return <output key="detail" data-detail={value} data-joint={value + point}>{value + point}</output>;
}

export function Health(props: { resource: SceneDomain["health"] }) {
  const value = use(props.resource);
  return <output key="health" data-health={value}>{value}</output>;
}

export const Position = (props: { point: SceneDomain["point"] }) => {
  const point = use(props.point);
  return <output key="position" data-point={point}>{point}</output>;
};

export function DialogSlot(props: AppProps) {
  const open = use(props.domain.open);
  return <div key="dialog" data-dialog-slot="true">
    <RadixDialog open={open} onOpenChange={props.onOpenChange}
      title="Scene settings" description="A controlled dialog for this scene"
      triggerLabel="Open scene settings" closeLabel="Close settings"
      portalContainer={props.portal} className="dialog-content"
      overlayClassName="dialog-overlay"
      children={createElement(ReactPanel, { trace: props.trace })} />
  </div>;
}

export function App(props: AppProps) {
  return <main>
    <h1 data-native-revision={nativeRevision}>Installed R3ACT HMR {nativeRevision}</h1>
    <p>Native controls update one Store read by this page and a Three scene.</p>
    <div role="group" aria-label="Scene controls">
      <button type="button" data-action="move" onClick={props.onMove}>Move scene</button>
      <button type="button" data-action="reorder" onClick={props.onReorder}>Reorder settings</button>
      <button type="button" data-action="detail" onClick={props.onLoadDetail}>Load detail</button>
      <button type="button" data-action="signal" onClick={props.onLoadSignal}>Load signal</button>
      <button type="button" data-action="health" onClick={props.onLoadHealth}>Load health</button>
    </div>
    <Position point={props.domain.point} />
    <Suspense fallback={<output key="detail" data-detail="waiting">Detail waiting</output>}>
      <Detail resource={props.domain.detail} point={props.domain.point} />
    </Suspense>
    <Suspense fallback={<output key="health" data-health="waiting">Health waiting</output>}>
      <Health resource={props.domain.health} />
    </Suspense>
    <div data-islands="true">{props.order.map((id) => id === "dialog" ?
      <DialogSlot key="dialog" {...props} /> :
      <output key="other" data-other="stable">Other island</output>)}</div>
  </main>;
}

export function mountInstalledScene(host: HTMLElement, portal: HTMLElement) {
  const domain = createSceneDomain();
  const scene = new Scene();
  const portalParent = portal.parentNode;
  const borrowedDisposed = { geometry: 0, material: 0 };
  const { borrowedGeometry, borrowedMaterial, domRoot, three, queue } = (() => {
    let geometry: BoxGeometry | undefined;
    let material: MeshBasicMaterial | undefined;
    let dom: ReturnType<typeof createDOMRoot<HTMLElement>> | undefined;
    let sceneRoot: ReturnType<typeof createThreeNativeRoot> | undefined;
    let workQueue: NativeRootWorkQueue | undefined;
    try {
      geometry = new BoxGeometry(0.5, 0.5, 0.5);
      material = new MeshBasicMaterial({ color: "#637188" });
      geometry.addEventListener("dispose", () => { borrowedDisposed.geometry++; });
      material.addEventListener("dispose", () => { borrowedDisposed.material++; });
      const world = createWorld();
      dom = createDOMRoot(host, { world, rootId: "installed-dom" });
      sceneRoot = createThreeNativeRoot(scene, { rootOptions: { world, rootId: "installed-three" } });
      workQueue = new NativeRootWorkQueue();
      return { borrowedGeometry: geometry, borrowedMaterial: material,
        domRoot: dom, three: sceneRoot, queue: workQueue };
    } catch (error) {
      const errors: unknown[] = [error];
      for (const cleanup of [() => workQueue?.dispose(), () => dom?.dispose(),
        () => sceneRoot?.dispose(), () => geometry?.dispose(), () => material?.dispose()]) {
        try { cleanup(); } catch (cleanupError) { errors.push(cleanupError); }
      }
      throw new AggregateError(errors, "Installed scene construction failed");
    }
  })();
  const trace: DialogTrace = { mounts: 0, cleanups: 0 };
  let order: readonly string[] = ["dialog", "other"];
  let disposed = false;
  let dialogIdentity: Element | null = null;
  let cursorIdentity: object | null = null;
  let revealCallbacks = 0;
  let revealView: string | null = null;
  let positionCallbacks = 0;
  let positionView: string | null = null;
  let borrowedAtHostDisposal: { geometry: number; material: number } | null = null;
  const onOpenChange = (open: boolean) => { domain.open.dispatch(open); };
  const updatePoint = (next: number) => {
    domain.point.dispatch(next);
    if (reveal.status !== "committed") return;
    queue.enqueueStores({ id: `joint-position-${next}`, roots: [
      { root: domRoot, stores: [domain.point] },
      { root: three.root, stores: [domain.point] },
    ], onSettled(outcome) {
      if (outcome.status === "cancelled") return;
      if (outcome.status !== "committed") throw new Error(`Joint position ${outcome.status}`);
      positionCallbacks++;
      positionView = `${host.querySelector('[data-point]')?.getAttribute("data-point") ?? "missing"}:${scene.getObjectByName("cursor")?.position.x ?? "missing"}`;
    } });
  };
  const onMove = () => { updatePoint(domain.point.getState() + 1); };
  const onLoadDetail = () => { domain.resolveDetail(3); };
  const onLoadSignal = () => { domain.resolveSignal(5); };
  const onLoadHealth = () => { domain.resolveHealth("healthy"); };
  const onReorder = () => { order = [...order].reverse(); domRoot.update(tree()); };
  const tree = () => <App domain={domain} portal={portal} trace={trace} order={order}
    onOpenChange={onOpenChange} onMove={onMove} onReorder={onReorder}
    onLoadDetail={onLoadDetail} onLoadSignal={onLoadSignal} onLoadHealth={onLoadHealth} />;
  let reveal!: ReturnType<NativeRootWorkQueue["enqueueResources"]>;
  try {
    domRoot.mount(tree());
    three.root.mount(<ThreeApp domain={domain} geometry={borrowedGeometry} material={borrowedMaterial} />);
    dialogIdentity = host.querySelector('[data-dialog-slot="true"]');
    cursorIdentity = scene.getObjectByName("cursor") ?? null;
    reveal = queue.enqueueResources({ id: "joint-dom-three-reveal", roots: [
      { root: domRoot, resources: [domain.detail] },
      { root: three.root, resources: [domain.signal] },
    ], onSettled(outcome) {
      if (outcome.status === "cancelled") return;
      if (outcome.status !== "committed") throw new Error(`Joint reveal ${outcome.status}`);
      revealCallbacks++;
      revealView = `${host.querySelector('[data-detail]')?.getAttribute("data-detail") ?? "missing"}:${scene.getObjectByName("signal-ready")?.position.x ?? "missing"}`;
    } });
  } catch (error) {
    const errors: unknown[] = [error];
    for (const cleanup of [() => queue.dispose(), () => domRoot.dispose(), () => three.dispose(),
      () => borrowedGeometry.dispose(), () => borrowedMaterial.dispose()]) {
      try { cleanup(); } catch (cleanupError) { errors.push(cleanupError); }
    }
    throw new AggregateError(errors, "Installed scene setup failed");
  }
  return {
    settleA: onLoadDetail,
    settleB: onLoadSignal,
    settleHealth: onLoadHealth,
    updatePoint(next?: number) { updatePoint(next ?? domain.point.getState() + 1); },
    reorder: onReorder,
    externalOpen() { domain.open.dispatch(true); },
    externalClose() { domain.open.dispatch(false); },
    removeDialog() { order = ["other"]; domRoot.update(tree()); },
    reinsertDialog() { order = ["dialog", "other"]; domRoot.update(tree()); },
    snapshot() {
      const cursor = scene.getObjectByName("cursor");
      const signal = scene.getObjectByName("signal-ready") ?? scene.getObjectByName("signal-waiting");
      const slot = host.querySelector('[data-dialog-slot="true"]');
      const note = portal.querySelector<HTMLInputElement>('input[aria-label="Dialog note"]');
      return {
        point: domain.point.getState(),
        nativeRevision,
        domPoint: host.querySelector('[data-point]')?.getAttribute("data-point") ?? null,
        domDetail: host.querySelector('[data-detail]')?.getAttribute("data-detail") ?? null,
        domJoint: host.querySelector('[data-joint]')?.getAttribute("data-joint") ?? null,
        health: host.querySelector('[data-health]')?.getAttribute("data-health") ?? null,
        sceneCursorX: cursor?.position.x ?? null,
        sceneSignalName: signal?.name ?? null,
        sceneSignalX: signal?.position.x ?? null,
        sceneChildren: scene.children.length,
        cursorRetained: cursor === cursorIdentity,
        dialogPresent: slot !== null,
        dialogRetained: slot !== null && slot === dialogIdentity,
        dialogOpen: domain.open.getState(),
        portalChildCount: portal.childElementCount,
        portalRetained: portal.parentNode === portalParent && portal.isConnected,
        noteValue: note?.value ?? null,
        noteSelectionStart: note?.selectionStart ?? null,
        noteSelectionEnd: note?.selectionEnd ?? null,
        dialogLocalCount: portal.querySelector('[data-dialog-local]')?.getAttribute("data-dialog-local") ?? null,
        dialogMounts: trace.mounts,
        dialogCleanups: trace.cleanups,
        revealStatus: reveal.status,
        revealCallbacks,
        revealView,
        positionCallbacks,
        positionView,
        disposed,
        borrowedDisposed: { ...borrowedDisposed },
        borrowedAtHostDisposal,
        three: { ...three.host.diagnostics },
        dom: domRoot.diagnostics(),
      };
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      const errors: unknown[] = [];
      for (const cleanup of [() => queue.dispose(), () => domRoot.dispose(), () => three.dispose()]) {
        try { cleanup(); } catch (error) { errors.push(error); }
      }
      borrowedAtHostDisposal = { ...borrowedDisposed };
      for (const cleanup of [() => borrowedGeometry.dispose(), () => borrowedMaterial.dispose()]) {
        try { cleanup(); } catch (error) { errors.push(error); }
      }
      if (errors.length) throw new AggregateError(errors, "Installed scene disposal failed");
    },
  };
}

declare global {
  interface Window {
    installedHmr?: ReturnType<typeof mountInstalledScene>;
    installedHmrPrevious?: ReturnType<ReturnType<typeof mountInstalledScene>["snapshot"]>;
  }
}

const host = document.querySelector<HTMLElement>("#app");
const portal = document.querySelector<HTMLElement>("#dialog-portal");
const previous = sessionStorage.getItem("r3act-installed-hmr-disposal");
if (previous) window.installedHmrPrevious = JSON.parse(previous);
if (host && portal) window.installedHmr = mountInstalledScene(host, portal);
const recordDisposal = () => {
  window.installedHmr?.dispose();
  if (window.installedHmr) sessionStorage.setItem(
    "r3act-installed-hmr-disposal", JSON.stringify(window.installedHmr.snapshot()));
};
window.addEventListener("pagehide", recordDisposal, { once: true });
if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    window.removeEventListener("pagehide", recordDisposal);
    recordDisposal();
  });
}
