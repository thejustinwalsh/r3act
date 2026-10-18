import { AsyncResource, createDOMRoot, createStore, storeRecord, Suspense, use, useEffect, useState } from "../../../src/native_runtime_api.ts";
type Payload = Readonly<{ offset: Readonly<{ x: number; y: number }> }>;
type Deferred<T> = { promise: Promise<T>; resolve(value: T): void };
function deferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => { resolve = done; });
  return { promise, resolve };
}
const first = deferred<Payload>(), second = deferred<Payload>(), health = deferred<string>();
const fallbackLife = { mounts: 0, cleanups: 0 };
const payload = (x: number, y: number) => storeRecord({ offset: storeRecord({ x, y }) });
const positionState = (x: number) => storeRecord({ position: storeRecord({ x }) });
const position = createStore(positionState(1));
const resourceFirst = new AsyncResource(first.promise), resourceSecond = new AsyncResource(second.promise);
function Health(props: { resource: Promise<string> }) {
  const value = use(props.resource);
  return <div key="health" data-health="ready">{value}</div>;
}
function Fallback() {
  const [, setValue] = useState(1);
  useEffect(() => { void setValue; fallbackLife.mounts++; return () => { fallbackLife.cleanups++; }; });
  return <span key="joint" data-joint="fallback">joint waiting</span>;
}
function Joint(props: { first: AsyncResource<Payload>; position: typeof position; second: AsyncResource<Payload> }) {
  const a = use(props.first);
  const x = use(props.position);
  const b = use(props.second);
  return <div key="joint" data-joint="ready" data-value={x.position.x + a.offset.x + b.offset.x} style={{ transform: `translateX(${x.position.x + a.offset.x + b.offset.x}px)`, opacity: (x.position.x + a.offset.x + b.offset.x) / 20 }}><output key="label" data-label="sum">{x.position.x + a.offset.x + b.offset.x}</output><span key="model" data-model="sum">{a.offset.y + b.offset.y}</span></div>;
}
function Row() {
  const [value, setValue] = useState(0);
  return <button key="row" data-row="local" data-local={value} onClick={() => setValue((previous) => previous + 1)}>row</button>;
}
function App() {
  return <main><Suspense fallback={<div key="health" data-health="fallback">health waiting</div>}><Health resource={health.promise} /></Suspense><Suspense fallback={<Fallback />}><Joint first={resourceFirst} position={position} second={resourceSecond} /></Suspense><Row /></main>;
}
export function mountNative(host: HTMLElement) {
  const root = createDOMRoot(host);
  const started = performance.now(); root.mount(<App />);
  const mountDurationMs = performance.now() - started;
  return {
    mountDurationMs,
    settleSecond() { second.resolve(payload(2, 20)); },
    settleFirst() { first.resolve(payload(3, 30)); },
    updatePosition() { position.dispatch(positionState(7)); },
    settleHealth() { health.resolve("health ready"); },
    fallbackLife() { return { ...fallbackLife }; },
    dispose() { root.dispose(); return { ...root.diagnostics(), fallbackLife: { ...fallbackLife }, store: position.diagnostics() }; },
  };
}
