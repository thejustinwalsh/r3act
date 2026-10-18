import { createRoot, type Root } from "react-dom/client";
import { Suspense, use, useLayoutEffect, useState, useSyncExternalStore } from "react";
import { flushSync } from "react-dom";

type Deferred = { promise: Promise<string>; resolve(value: string): void };
function deferred(): Deferred {
  let resolve!: (value: string) => void;
  const promise = new Promise<string>((done) => { resolve = done; });
  return { promise, resolve };
}
const health = deferred();
const external = (initial: number) => {
  let value = initial;
  const listeners = new Set<() => void>();
  return {
    getSnapshot: () => value,
    subscribe(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener); }; },
    dispatch(next: number) { if (Object.is(value, next)) return; value = next; for (const listener of [...listeners]) listener(); },
    diagnostics: () => ({ listeners: listeners.size }),
  };
};
const position = external(1);
const camera = external(2);
const ids = Array.from({ length: 64 }, (_, index) => `row-${index}`);
let setWorld: ((value: number) => void) | null = null;
let setOrder: ((value: readonly string[]) => void) | null = null;

function Health(props: { resource: Promise<string> }) {
  const value = use(props.resource);
  return <div data-health="ready">{value}</div>;
}
function Joint(props: { position: typeof position; camera: typeof camera }) {
  const x = useSyncExternalStore(props.position.subscribe, props.position.getSnapshot);
  const y = useSyncExternalStore(props.camera.subscribe, props.camera.getSnapshot);
  return <output data-joint={x + y} />;
}
function World() {
  const [value, setter] = useState(0);
  useLayoutEffect(() => { setWorld = setter; return () => { setWorld = null; }; }, [setter]);
  return <output data-world={value} />;
}
function Row(props: { id: string }) {
  const [local, setLocal] = useState(0);
  return <li data-id={props.id} data-local={local}
    onClick={() => setLocal((previous) => previous + 1)}>{props.id}</li>;
}
function List() {
  const [order, setter] = useState<readonly string[]>(ids);
  useLayoutEffect(() => { setOrder = setter; return () => { setOrder = null; }; }, [setter]);
  return <ul>{order.map((id) => <Row key={id} id={id} />)}</ul>;
}
function App() {
  return <main>
    <Suspense fallback={<div data-health="fallback">health waiting</div>}>
      <Health resource={health.promise} />
    </Suspense>
    <Joint position={position} camera={camera} />
    <World />
    <List />
  </main>;
}

export function mountReact(host: HTMLElement) {
  const root: Root = createRoot(host);
  const started = performance.now();
  flushSync(() => root.render(<App />));
  const mountDurationMs = performance.now() - started;
  if (!setWorld || !setOrder) throw new Error("React transaction setters were not installed");
  return {
    mountDurationMs,
    transact() {
      flushSync(() => {
        position.dispatch(7);
        setWorld?.(5);
        setOrder?.([...ids.slice(1), ids[0]]);
      });
    },
    settleHealth() { health.resolve("health ready"); },
    dispose() { flushSync(() => root.unmount()); return { disposed: true,
      position: position.diagnostics(), camera: camera.diagnostics() }; },
  };
}
