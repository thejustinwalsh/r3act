import { createRoot, type Root } from "react-dom/client";
import { Suspense, use, useSyncExternalStore } from "react";
import { flushSync } from "react-dom";

type Deferred = { promise: Promise<string>; resolve(value: string): void };
function deferred(): Deferred {
  let resolve!: (value: string) => void;
  const promise = new Promise<string>((done) => { resolve = done; });
  return { promise, resolve };
}

const health = deferred();
const position = (() => {
  let value = 1;
  const listeners = new Set<() => void>();
  return {
    getSnapshot: () => value,
    subscribe(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener); }; },
    dispatch(next: number) { if (Object.is(value, next)) return; value = next; for (const listener of [...listeners]) listener(); },
    diagnostics: () => ({ listeners: listeners.size }),
  };
})();

function Health(props: { resource: Promise<string> }) {
  const value = use(props.resource);
  return <div data-health="ready">{value}</div>;
}

function Position(props: { position: typeof position }) {
  const x = useSyncExternalStore(props.position.subscribe, props.position.getSnapshot);
  return <output data-x={x} />;
}

function DoublePosition(props: { position: typeof position }) {
  const x = useSyncExternalStore(props.position.subscribe, props.position.getSnapshot);
  return <output data-double={x * 2} />;
}

function App() {
  return <main>
    <Suspense fallback={<div data-health="fallback">health waiting</div>}>
      <Health resource={health.promise} />
    </Suspense>
    <Position position={position} />
    <DoublePosition position={position} />
  </main>;
}

export function mountReact(host: HTMLElement) {
  const root: Root = createRoot(host);
  const started = performance.now();
  flushSync(() => root.render(<App />));
  const mountDurationMs = performance.now() - started;
  return {
    mountDurationMs,
    updatePosition() { position.dispatch(7); },
    settleHealth() { health.resolve("health ready"); },
    dispose() { flushSync(() => root.unmount()); return { disposed: true, listeners: position.diagnostics().listeners }; },
  };
}
