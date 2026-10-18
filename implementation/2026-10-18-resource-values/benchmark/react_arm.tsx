import { createRoot, type Root } from "react-dom/client";
import { startTransition, Suspense, use, useLayoutEffect, useState } from "react";
import { flushSync } from "react-dom";

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
const fallbackLife = { mounts: 0, cleanups: 0 };

function A(props: { resource: Promise<string> }) {
  const value = use(props.resource);
  return <div data-a="primary">{value}</div>;
}
function FallbackB() {
  useState(1);
  useLayoutEffect(() => { fallbackLife.mounts++; return () => { fallbackLife.cleanups++; }; }, []);
  return <span data-b="fallback" style={{ opacity: 0.2, transform: "translateX(0px)" }}>B waiting</span>;
}
function B(props: { resource: Promise<number> }) {
  const value = use(props.resource);
  return <div data-b="ready" style={{ opacity: value / 10, transform: `translateX(${value}px)` }}><span data-label="ready">{value}</span><output data-count={value + 1}>{value}</output></div>;
}
function Row() {
  const [value, setValue] = useState(0);
  return <button data-row="local" data-local={value}
    onClick={() => setValue((previous) => previous + 1)}>row</button>;
}
function App(props: { bind(setter: (resource: Promise<string>) => void): void }) {
  const [resource, setResource] = useState(oldA.promise);
  useLayoutEffect(() => { props.bind(setResource); }, [props.bind, setResource]);
  return <main>
    <Suspense fallback={<div data-a="fallback">A waiting</div>}><A resource={resource} /></Suspense>
    <Suspense fallback={<FallbackB />}><B resource={pendingB.promise} /></Suspense>
    <Row />
  </main>;
}
export function mountReact(host: HTMLElement) {
  const root: Root = createRoot(host);
  let setResource: ((resource: Promise<string>) => void) | null = null;
  const bind = (setter: (resource: Promise<string>) => void) => { setResource = setter; };
  const started = performance.now();
  flushSync(() => root.render(<App bind={bind} />));
  const mountDurationMs = performance.now() - started;
  return {
    mountDurationMs,
    beginPendingA() {
      if (!setResource) throw new Error("React A resource setter is unavailable");
      startTransition(() => setResource!(pendingA.promise));
    },
    settleB() { pendingB.resolve(7); },
    settlePendingA() { pendingA.resolve("A next"); },
    fallbackLife() { return { ...fallbackLife }; },
    dispose() { flushSync(() => root.unmount()); return { disposed: true, fallbackLife: { ...fallbackLife } }; },
  };
}
