import { createRoot } from "react-dom/client";
import { Suspense, use, useLayoutEffect, useSyncExternalStore } from "react";
import { flushSync } from "react-dom";

type Payload = Readonly<{ sample: Readonly<{ x: number; y: number }> }>;
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => { resolve = done; });
  return { promise, resolve };
}
const a = deferred<Payload>(), b = deferred<Payload>(), health = deferred<string>();
const together = Promise.all([a.promise, b.promise]);
const life = { a: { mounts: 0, cleanups: 0 }, b: { mounts: 0, cleanups: 0 } };
const payload = (x: number, y: number) => Object.freeze({ sample: Object.freeze({ x, y }) });
let point = Object.freeze({ point: Object.freeze({ x: 1 }) });
const listeners = new Set<() => void>();
const position = { getSnapshot: () => point,
  subscribe(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener); }; } };
function A() {
  const [value] = use(together);
  const current = useSyncExternalStore(position.subscribe, position.getSnapshot);
  return <output data-ready="a" data-value={value.sample.x + current.point.x}>{value.sample.y}</output>;
}
function B() {
  const [, value] = use(together);
  return <output data-ready="b" data-value={value.sample.x}>{value.sample.y}</output>;
}
function C() { const value = use(health.promise); return <span data-health={value} />; }
function Fallback(props: { slot: "a" | "b" }) {
  useLayoutEffect(() => { life[props.slot].mounts++; return () => { life[props.slot].cleanups++; }; }, []);
  return <output data-waiting={props.slot} />;
}
function Urgent() {
  const value = useSyncExternalStore(position.subscribe, position.getSnapshot);
  return <button data-urgent={value.point.x} />;
}
function App() {
  return <main><Suspense fallback={<Fallback slot="a" />}><A /></Suspense><Suspense fallback={<Fallback slot="b" />}><B /></Suspense><Suspense fallback={<span data-health="waiting" />}><C /></Suspense><Urgent /></main>;
}
export function mountReact(host: HTMLElement) {
  const root = createRoot(host);
  const mountStart = performance.now(); flushSync(() => root.render(<App />));
  const mountMs = performance.now() - mountStart;
  return {
    mountMs,
    settleA() { a.resolve(payload(3, 4)); },
    settleB() { b.resolve(payload(5, 6)); },
    settleHealth() { health.resolve("healthy"); },
    updateUrgent() { flushSync(() => { point = Object.freeze({ point: Object.freeze({ x: 7 }) });
      for (const listener of [...listeners]) listener(); }); },
    state() { return { life: structuredClone(life), callbackCount: null, callbackView: null,
      queueStatus: null, listeners: listeners.size }; },
    dispose() { flushSync(() => root.unmount()); return { disposed: true, listeners: listeners.size }; },
  };
}
