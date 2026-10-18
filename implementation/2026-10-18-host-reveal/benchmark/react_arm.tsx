import { createRoot, type Root } from "react-dom/client";
import { startTransition, Suspense, use, useLayoutEffect, useState } from "react";
import { flushSync } from "react-dom";

type Deferred = { promise: Promise<string>; resolve(value: string): void };
function deferred(): Deferred {
  let resolve!: (value: string) => void;
  const promise = new Promise<string>((done) => { resolve = done; });
  return { promise, resolve };
}

const initialA = deferred();
void initialA.resolve("A ready");
const pendingA = deferred();
const pendingB = deferred();

function APrimary({ resource }: { resource: Promise<string> }) {
  const value = use(resource);
  return <div key="a-primary" data-a="primary">{value}</div>;
}

function BPrimary({ resource }: { resource: Promise<string> }) {
  const value = use(resource);
  return <div key="b-primary" data-b="primary">{value}</div>;
}

function App({ bind }: { bind(setResource: (resource: Promise<string>) => void): void }) {
  const [resource, setResource] = useState(initialA.promise);
  useLayoutEffect(() => { bind(setResource); }, [bind, setResource]);
  return <main>
    <Suspense key="boundary-a" fallback={<div key="a-primary" data-a="fallback">A waiting</div>}>
      <APrimary resource={resource} />
    </Suspense>
    <Suspense key="boundary-b" fallback={<div key="b-primary" data-b="fallback">B waiting</div>}>
      <BPrimary resource={pendingB.promise} />
    </Suspense>
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
    settleB() { pendingB.resolve("B ready"); },
    settlePendingA() { pendingA.resolve("A next"); },
    dispose() { flushSync(() => root.unmount()); return { disposed: true }; },
  };
}
