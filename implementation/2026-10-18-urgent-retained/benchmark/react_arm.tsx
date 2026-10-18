import { createRoot, type Root } from "react-dom/client";
import { startTransition, Suspense, use, useLayoutEffect, useState } from "react";
import { flushSync } from "react-dom";

type Deferred<T> = { promise: Promise<T>; resolve(value: T): void };
function deferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => { resolve = done; });
  return { promise, resolve };
}

const initialA = deferred<string>();
initialA.resolve("A ready");
const pendingA = deferred<string>();

function APrimary({ resource }: { resource: Promise<string> }) {
  const value = use(resource);
  return <div data-a="primary">{value}</div>;
}

function NumericControl() {
  const [x, setX] = useState(1);
  return <button data-x={x} style={{ opacity: x / 10 }} onClick={() => setX((n) => n + 1)}>Increment</button>;
}

function App({ bind }: { bind(setResource: (resource: Promise<string>) => void): void }) {
  const [resource, setResource] = useState(initialA.promise);
  useLayoutEffect(() => { bind(setResource); }, [bind, setResource]);
  return <main>
    <Suspense fallback={<div data-a="fallback">A waiting</div>}>
      <APrimary resource={resource} />
    </Suspense>
    <NumericControl />
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
      if (!setResource) throw new Error("React resource setter was not registered");
      startTransition(() => setResource!(pendingA.promise));
    },
    settlePendingA() { pendingA.resolve("A next"); },
    dispose() { flushSync(() => root.unmount()); return { disposed: true }; },
  };
}
