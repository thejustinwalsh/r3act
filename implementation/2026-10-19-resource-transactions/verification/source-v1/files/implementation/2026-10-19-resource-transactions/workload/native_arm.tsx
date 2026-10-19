import { AsyncResource, Suspense, createDOMRoot, createStore, storeRecord,
  NativeRootWorkQueue, use, useEffect, useState } from "@r3act/core";

type Payload = Readonly<{ sample: Readonly<{ x: number; y: number }> }>;
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => { resolve = done; });
  return { promise, resolve };
}
const a = deferred<Payload>(), b = deferred<Payload>(), health = deferred<string>();
const resourceA = new AsyncResource(a.promise), resourceB = new AsyncResource(b.promise);
const resourceHealth = new AsyncResource(health.promise);
const position = createStore(storeRecord({ point: storeRecord({ x: 1 }) }), (_old, value) => value);
const life = { a: { mounts: 0, cleanups: 0 }, b: { mounts: 0, cleanups: 0 } };
const payload = (x: number, y: number) => storeRecord({ sample: storeRecord({ x, y }) });
function A(props: { resource: typeof resourceA; position: typeof position }) {
  const value = use(props.resource);
  const point = use(props.position);
  return <output key="a" data-ready="a" data-value={value.sample.x + point.point.x}>{value.sample.y}</output>;
}
function B(props: { resource: typeof resourceB }) {
  const value = use(props.resource);
  return <output key="b" data-ready="b" data-value={value.sample.x}>{value.sample.y}</output>;
}
function C(props: { resource: typeof resourceHealth }) { const value = use(props.resource); return <span key="health" data-health={value} />; }
function Fallback(props: { slot: "a" | "b" }) {
  const [, setValue] = useState(0);
  useEffect(() => { void setValue; life[props.slot].mounts++; return () => { life[props.slot].cleanups++; }; });
  return <output key={props.slot} data-waiting={props.slot} />;
}
function Urgent(props: { position: typeof position }) {
  const value = use(props.position);
  return <button key="urgent" data-urgent={value.point.x} />;
}
function App() {
  return <main><Suspense fallback={<Fallback slot="a" />}><A resource={resourceA} position={position} /></Suspense><Suspense fallback={<Fallback slot="b" />}><B resource={resourceB} /></Suspense><Suspense fallback={<span key="health" data-health="waiting" />}><C resource={resourceHealth} /></Suspense><Urgent position={position} /></main>;
}
export function mountNative(host: HTMLElement) {
  const root = createDOMRoot(host);
  const queue = new NativeRootWorkQueue();
  const mountStart = performance.now(); root.mount(<App />);
  const mountMs = performance.now() - mountStart;
  let callbackCount = 0, callbackView: string | null = null;
  const selected = queue.enqueueResources({ id: "paired-resource-reveal", roots: [
    { root, resources: [resourceA, resourceB] },
  ], onSettled(outcome) {
    if (outcome.status !== "committed") throw new Error(`selected resources ${outcome.status}`);
    callbackCount++;
    callbackView = `${host.querySelector('[data-ready="a"]')?.getAttribute("data-value") ?? "missing"}:${host.querySelector('[data-ready="b"]')?.getAttribute("data-value") ?? "missing"}`;
  } });
  return {
    mountMs,
    settleA() { a.resolve(payload(3, 4)); },
    settleB() { b.resolve(payload(5, 6)); },
    settleHealth() { health.resolve("healthy"); },
    updateUrgent() { position.dispatch(storeRecord({ point: storeRecord({ x: 7 }) })); },
    state() { return { life: structuredClone(life), callbackCount, callbackView, queueStatus: selected.status }; },
    dispose() { queue.dispose(); root.dispose(); return root.diagnostics(); },
  };
}
