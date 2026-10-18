import { createRoot } from "react-dom/client";
import { Suspense, use, useLayoutEffect, useState, useSyncExternalStore } from "react";
import { flushSync } from "react-dom";
type Payload = Readonly<{ offset: Readonly<{ x: number; y: number }> }>;
type Deferred<T> = { promise: Promise<T>; resolve(value: T): void };
function deferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => { resolve = done; });
  return { promise, resolve };
}
const first = deferred<Payload>(), second = deferred<Payload>(), health = deferred<string>();
const fallbackLife = { mounts: 0, cleanups: 0 };
const payload = (x: number, y: number) => Object.freeze({ offset: Object.freeze({ x, y }) });
const positionState = (x: number) => Object.freeze({ position: Object.freeze({ x }) });
let currentPosition = positionState(1);
const listeners = new Set<() => void>();
const position = { getSnapshot: () => currentPosition,
  subscribe(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener); }; } };
function Health(props: { resource: Promise<string> }) {
  const value = use(props.resource);
  return <div data-health="ready">{value}</div>;
}
function Fallback() {
  useState(1);
  useLayoutEffect(() => { fallbackLife.mounts++; return () => { fallbackLife.cleanups++; }; }, []);
  return <span data-joint="fallback">joint waiting</span>;
}
function Joint(props: { first: Promise<Payload>; position: typeof position; second: Promise<Payload> }) {
  const a = use(props.first);
  const x = useSyncExternalStore(props.position.subscribe, props.position.getSnapshot);
  const b = use(props.second);
  return <div data-joint="ready" data-value={x.position.x + a.offset.x + b.offset.x} style={{ transform: `translateX(${x.position.x + a.offset.x + b.offset.x}px)`, opacity: (x.position.x + a.offset.x + b.offset.x) / 20 }}><output data-label="sum">{x.position.x + a.offset.x + b.offset.x}</output><span data-model="sum">{a.offset.y + b.offset.y}</span></div>;
}
type ForwardPosition = typeof position;
function Panel(props: { sourceA: Promise<Payload>; live: ForwardPosition; sourceB: Promise<Payload>; note: string }) {
  return <Joint key="joint-leaf" first={props.sourceA} position={props.live} second={props.sourceB} />;
}
function Card({ first, position, second }: { first: Promise<Payload>; position: ForwardPosition; second: Promise<Payload> }) {
  return <Panel sourceA={first} live={position} sourceB={second} note={"ready"} />;
}
function Row() {
  const [value, setValue] = useState(0);
  return <button data-row="local" data-local={value} onClick={() => setValue((previous) => previous + 1)}>row</button>;
}
function App() {
  return <main><Suspense fallback={<div data-health="fallback">health waiting</div>}><Health resource={health.promise} /></Suspense><Suspense fallback={<Fallback />}><Card first={first.promise} position={position} second={second.promise} /></Suspense><Row /></main>;
}
export function mountReact(host: HTMLElement) {
  const root = createRoot(host);
  const started = performance.now(); flushSync(() => root.render(<App />));
  const mountDurationMs = performance.now() - started;
  return {
    mountDurationMs,
    settleSecond() { second.resolve(payload(2, 20)); },
    settleFirst() { first.resolve(payload(3, 30)); },
    updatePosition() { flushSync(() => { currentPosition = positionState(7); for (const listener of [...listeners]) listener(); }); },
    settleHealth() { health.resolve("health ready"); },
    fallbackLife() { return { ...fallbackLife }; },
    dispose() { flushSync(() => root.unmount()); return { disposed: true, fallbackLife: { ...fallbackLife }, store: { listeners: listeners.size } }; },
  };
}
