import { AsyncResource, createDOMRoot, createStore, Suspense, use, useEffect, useState } from "../../../src/native_runtime_api.ts";

type Deferred<T> = { promise: Promise<T>; resolve(value: T): void };
function deferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => { resolve = done; });
  return { promise, resolve };
}
const oldA = deferred<string>();
oldA.resolve("A ready");
const pendingA = deferred<string>();
const pendingB = deferred<number>();
const aStore = createStore(oldA.promise, (_current: Promise<string>, next: Promise<string>) => next);
const resourceB = new AsyncResource(pendingB.promise);
const fallbackLife = { mounts: 0, cleanups: 0 };

function A() {
  const value = use(use(aStore));
  return <div key="a-host" data-a="primary">{value}</div>;
}
function FallbackB() {
  const [, setValue] = useState(1);
  useEffect(() => { void setValue; fallbackLife.mounts++; return () => { fallbackLife.cleanups++; }; });
  return <span key="b-root" data-b="fallback" style={{ opacity: 0.2, transform: "translateX(0px)" }}>B waiting</span>;
}
function B(props: { resource: AsyncResource<number> }) {
  const value = use(props.resource);
  return <div key="b-root" data-b="ready" style={{ opacity: value / 10, transform: `translateX(${value}px)` }}><span key="b-label" data-label="ready">{value}</span><output key="b-output" data-count={value + 1}>{value}</output></div>;
}
function Row() {
  const [value, setValue] = useState(0);
  return <button key="row" data-row="local" data-local={value}
    onClick={() => setValue((previous) => previous + 1)}>row</button>;
}
function App() {
  return <main>
    <Suspense fallback={<div key="a-host" data-a="fallback">A waiting</div>}><A /></Suspense>
    <Suspense fallback={<FallbackB />}><B resource={resourceB} /></Suspense>
    <Row />
  </main>;
}
export function mountNative(host: HTMLElement) {
  const root = createDOMRoot(host);
  const started = performance.now();
  root.mount(<App />);
  const mountDurationMs = performance.now() - started;
  return {
    mountDurationMs,
    beginPendingA() { aStore.dispatch(pendingA.promise); },
    settleB() { pendingB.resolve(7); },
    settlePendingA() { pendingA.resolve("A next"); },
    fallbackLife() { return { ...fallbackLife }; },
    dispose() { root.dispose(); return { ...root.diagnostics(), fallbackLife: { ...fallbackLife },
      store: aStore.diagnostics() }; },
  };
}
