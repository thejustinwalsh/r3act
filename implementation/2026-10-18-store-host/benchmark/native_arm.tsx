import { createDOMRoot, createStore, Suspense, use } from "../../../src/native_runtime_api.ts";

type Deferred = { promise: Promise<string>; resolve(value: string): void };
function deferred(): Deferred {
  let resolve!: (value: string) => void;
  const promise = new Promise<string>((done) => { resolve = done; });
  return { promise, resolve };
}

const health = deferred();
const position = createStore(1);

function Health(props: { resource: Promise<string> }) {
  const value = use(props.resource);
  return <div key="health" data-health="ready">{value}</div>;
}

function Position(props: { position: typeof position }) {
  const x = use(props.position);
  return <output key="position" data-x={x} />;
}

function DoublePosition(props: { position: typeof position }) {
  const x = use(props.position);
  return <output key="double-position" data-double={x * 2} />;
}

function App() {
  return <main>
    <Suspense fallback={<div key="health" data-health="fallback">health waiting</div>}>
      <Health resource={health.promise} />
    </Suspense>
    <Position position={position} />
    <DoublePosition position={position} />
  </main>;
}

export function mountNative(host: HTMLElement) {
  const root = createDOMRoot(host);
  const started = performance.now();
  root.mount(<App />);
  const mountDurationMs = performance.now() - started;
  return {
    mountDurationMs,
    updatePosition() { position.dispatch(7); },
    settleHealth() { health.resolve("health ready"); },
    dispose() { root.dispose(); return { ...root.diagnostics(), store: position.diagnostics() }; },
  };
}
