/** @jsxImportSource react */
import * as Dialog from "@radix-ui/react-dialog";
import { Suspense, use, useLayoutEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { flushSync } from "react-dom";
import { Group, Mesh, Scene } from "three";
import { ReactPanel, type DialogTrace } from "../../react-panel";

type RecordValue = { sample: { x: number; y: number } };
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => { resolve = done; });
  return { promise, resolve };
}
const detail = deferred<RecordValue>();
const signal = deferred<RecordValue>();
let detailResolved = false, signalResolved = false;
void detail.promise.then(() => { detailResolved = true; });
void signal.promise.then(() => { signalResolved = true; });
const sample = (x: number, y: number) => ({ sample: { x, y } });
const portal = document.getElementById("dialog-portal")!;
const scene = new Scene();
const trace: DialogTrace = { mounts: 0, cleanups: 0 };
let setHeldA!: (value: { x: number; y: number }) => void;
let setOpen!: (value: boolean) => void;

function NumericCounter() {
  const [count] = useState(0);
  return <output data-count={count + 1} />;
}

function JointReveal(props: { a: { x: number; y: number } }) {
  const d = use(detail.promise);
  const s = use(signal.promise);
  useLayoutEffect(() => {
    const group = new Group();
    const mesh = new Mesh();
    mesh.position.set(props.a.x, s.sample.x, props.a.y + s.sample.y);
    group.add(mesh);
    scene.add(group);
    return () => { scene.remove(group); };
  }, [props.a.x, props.a.y, s.sample.x, s.sample.y]);
  return <div data-held={props.a.x + d.sample.x} data-accepted-a={props.a.x}>
    <output data-value={props.a.y + d.sample.y} />
  </div>;
}

function DialogSlot(props: { open: boolean; onOpenChange: (value: boolean) => void }) {
  const [local, setLocal] = useState(0);
  return <div data-dialog-slot="true" data-open={props.open ? "true" : undefined} data-local={local}>
    <button type="button" data-action="local"
      onClick={() => setLocal(local + 1)}>Local {local}</button>
    <Dialog.Root open={props.open} onOpenChange={props.onOpenChange}>
      <Dialog.Trigger>Open closed arrow settings</Dialog.Trigger>
      <Dialog.Portal container={portal}>
        <Dialog.Overlay className="dialog-overlay" />
        <Dialog.Content className="dialog-content">
          <Dialog.Title>Closed arrow settings</Dialog.Title>
          <Dialog.Description>Independent scene controls</Dialog.Description>
          <ReactPanel trace={trace} />
          <Dialog.Close>Close closed arrow settings</Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  </div>;
}

function App() {
  const [a, updateA] = useState({ x: 1, y: 2 });
  const [open, updateOpen] = useState(false);
  useLayoutEffect(() => {
    setHeldA = updateA;
    setOpen = updateOpen;
  }, [updateA, updateOpen]);
  return <main>
    <h1>Closed arrow authoring</h1>
    <button type="button" data-action="open" onClick={() => updateOpen(true)}>Open settings</button>
    <button type="button" data-action="close" onClick={() => updateOpen(false)}>Close settings</button>
    <Suspense fallback={<div data-held="waiting">Waiting</div>}>
      <JointReveal a={a} />
    </Suspense>
    <DialogSlot open={open} onOpenChange={updateOpen} />
    <NumericCounter />
  </main>;
}

const root = createRoot(document.getElementById("app")!);
flushSync(() => root.render(<App />));
const fallback = document.querySelector('[data-held="waiting"]');
const numericInitial = document.querySelector("[data-count]");
let disposed = false;
const snapshot = () => {
  const held = document.querySelector("[data-held]");
  const slot = document.querySelector("[data-dialog-slot]");
  const group = scene.children[0];
  return {
    groupStatus: detailResolved && signalResolved && held?.getAttribute("data-held") !== "waiting"
      ? "committed" : "pending",
    detailStatus: detailResolved ? "fulfilled" : "pending",
    signalStatus: signalResolved ? "fulfilled" : "pending",
    held: held?.getAttribute("data-held") ?? null,
    acceptedA: held?.getAttribute("data-accepted-a") ?? null,
    fallbackRetained: held === fallback,
    threePosition: group?.children[0]?.position.toArray() ?? null,
    open: slot?.getAttribute("data-open") ?? null,
    local: slot?.getAttribute("data-local") ?? null,
    numeric: document.querySelector("[data-count]")?.getAttribute("data-count") ?? null,
    numericRetained: document.querySelector("[data-count]") === numericInitial,
    dialogPresent: Boolean(portal.querySelector('[role="dialog"]')),
    reactMounts: trace.mounts, reactCleanups: trace.cleanups,
    disposed,
  };
};
(window as Window & { heldReaderProof?: unknown }).heldReaderProof = {
  snapshot,
  setHeldA(x: number, y: number) { setHeldA({ x, y }); },
  setOpen(value: boolean) { setOpen(value); },
  resolveDetail(x = 4, y = 5) { detail.resolve(sample(x, y)); },
  resolveSignal(x = 2, y = 3) { signal.resolve(sample(x, y)); },
  dispose() { if (disposed) return; flushSync(() => root.unmount()); disposed = true; },
};
