/** @jsxImportSource @r3act/core */
// @native-ui
import { NativeRootWorkQueue, Suspense, createWorld, use, useState } from "@r3act/core";
import { createDOMRoot } from "@r3act/host-dom";
import { createThreeNativeRoot } from "@r3act/host-three";
import { RadixDialog } from "@r3act/react-bridge/radix-dialog";
import { createElement } from "react";
import { Scene } from "three";
import { ReactPanel, type DialogTrace } from "./react-panel";
import { SceneApp } from "./scene";
import { createDomain, heldState, sample, type Domain } from "./state";

type AppProps = { domain: Domain; portal: HTMLElement; trace: DialogTrace };

export const NumericCounter = () => {
  const [count] = useState(0);
  return <output key="numeric-counter" data-count={count + 1} />;
};

export const HeldDom = (props: { heldA: Domain["heldA"]; resource: Domain["detail"] }) => {
  const a = use(props.heldA);
  const detail = use(props.resource);
  return <div key="held-dom" data-held={a.vector.x + detail.sample.x}
    data-accepted-a={a.vector.x}>
    {/* elidable formatting around the closed child */}
    <output key="held-dom-value" data-value={a.vector.y + detail.sample.y} />
  </div>;
}

export const ForwardHeldDom = (props: { heldA: Domain["heldA"]; resource: Domain["detail"] }) =>
  <HeldDom key="held-owner" heldA={props.heldA} resource={props.resource} />;

export const DialogSlot = (props: AppProps) => {
  const open = use(props.domain.independentB);
  const [local, setLocal] = useState(0);
  return <div key="dialog-slot" data-dialog-slot="true" data-open={open ? "true" : undefined}
    data-local={local}>
    <button type="button" data-action="local"
      onClick={() => setLocal(local + 1)}>Local {local}</button>
    <RadixDialog open={open}
      onOpenChange={(value) => props.domain.independentB.dispatch(value)}
      title="Closed arrow settings" description="Independent scene controls"
      triggerLabel="Open closed arrow settings" closeLabel="Close closed arrow settings"
      portalContainer={props.portal} className="dialog-content"
      overlayClassName="dialog-overlay"
      children={createElement(ReactPanel, { trace: props.trace })} />
  </div>;
}

export const App = (props: AppProps) => {
  return <main>
    <h1>Closed arrow authoring</h1>
    <button type="button" data-action="open"
      onClick={() => props.domain.independentB.dispatch(true)}>Open settings</button>
    <button type="button" data-action="close"
      onClick={() => props.domain.independentB.dispatch(false)}>Close settings</button>
    <Suspense fallback={<div key="held-dom" data-held="waiting">Waiting</div>}>
      <ForwardHeldDom key="held-forward" heldA={props.domain.heldA}
        resource={props.domain.detail} />
    </Suspense>
    <DialogSlot key="dialog-owner" {...props} />
    <NumericCounter key="numeric-owner" />
  </main>;
}

export function mountHeldReaderScene(host: HTMLElement, portal: HTMLElement) {
  const domain = createDomain();
  const trace: DialogTrace = { mounts: 0, cleanups: 0 };
  const world = createWorld();
  const scene = new Scene();
  const domRoot = createDOMRoot(host, { world, rootId: "closed-arrow-dom" });
  const three = createThreeNativeRoot(scene, {
    rootOptions: { world, rootId: "closed-arrow-three" },
  });
  const queue = new NativeRootWorkQueue();
  const initialPortalParent = portal.parentNode;
  let groupCallbacks = 0;
  let disposed = false;
  domRoot.mount(<App domain={domain} portal={portal} trace={trace} />);
  three.root.mount(<SceneApp domain={domain} />);
  const fallback = host.querySelector('[data-held="waiting"]');
  const numericInitial = host.querySelector("[data-count]");
  const sceneFallback = scene.children[0]?.children[0];
  const group = queue.enqueueResources({ id: "closed-arrow-dom-three", roots: [
    { root: domRoot, resources: [domain.detail] },
    { root: three.root, resources: [domain.signal] },
  ], onSettled(outcome) {
    if (outcome.status === "cancelled" && disposed) return;
    if (outcome.status !== "committed") throw outcome.error ??
      new Error(`held reader group ${outcome.status}`);
    groupCallbacks++;
  } });
  if (group.status !== "pending") throw new Error("held resource group was not admitted");
  const snapshot = () => {
    const held = host.querySelector("[data-held]");
    const slot = host.querySelector("[data-dialog-slot]");
    const sceneHeld = scene.children[0]?.children[0];
    const mesh = sceneHeld?.children[0];
    return {
      groupStatus: group.status, groupCallbacks,
      detailStatus: domain.detail.status.status,
      signalStatus: domain.signal.status.status,
      held: held?.getAttribute("data-held") ?? null,
      acceptedA: held?.getAttribute("data-accepted-a") ?? null,
      fallbackRetained: held === fallback,
      threeFallbackRetained: sceneHeld === sceneFallback,
      threePosition: mesh?.position.toArray() ?? null,
      open: slot?.getAttribute("data-open") ?? null,
      local: slot?.getAttribute("data-local") ?? null,
      numeric: host.querySelector("[data-count]")?.getAttribute("data-count") ?? null,
      numericRetained: host.querySelector("[data-count]") === numericInitial,
      dialogPresent: Boolean(portal.querySelector('[role="dialog"]')),
      reactMounts: trace.mounts, reactCleanups: trace.cleanups,
      dom: domRoot.diagnostics(), three: three.root.diagnostics(),
      threeHost: three.host.diagnostics,
      heldPendingValue: domain.heldA.getState().vector.x,
      heldDomProjection: disposed ? null : domain.heldA.getStateForRoot(domRoot.rootId).vector.x,
      heldThreeProjection: disposed ? null : domain.heldA.getStateForRoot(three.root.rootId).vector.x,
      portalConnected: portal.parentNode === initialPortalParent,
      disposed,
    };
  };
  return {
    snapshot,
    setHeldA(x: number, y: number) { domain.heldA.dispatch(heldState(x, y)); },
    setOpen(open: boolean) { domain.independentB.dispatch(open); },
    resolveDetail(x = 4, y = 5) { domain.resolveDetail(sample(x, y)); },
    resolveSignal(x = 2, y = 3) { domain.resolveSignal(sample(x, y)); },
    dispose() {
      if (disposed) return;
      disposed = true;
      queue.dispose();
      domRoot.dispose();
      three.dispose();
    },
  };
}

const host = document.getElementById("app")!;
const portal = document.getElementById("dialog-portal")!;
(window as Window & { heldReaderProof?: ReturnType<typeof mountHeldReaderScene> })
  .heldReaderProof = mountHeldReaderScene(host, portal);
