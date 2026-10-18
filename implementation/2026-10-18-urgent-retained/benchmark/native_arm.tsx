import {
  createDOMRoot,
  createStore,
  Suspense,
  use,
  useState,
} from "../../../src/native_runtime_api.ts";

type Deferred<T> = { promise: Promise<T>; resolve(value: T): void };
function deferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => { resolve = done; });
  return { promise, resolve };
}

const initialA = deferred<string>();
initialA.resolve("A ready");
const pendingA = deferred<string>();
const aStore = createStore(initialA.promise, (_current: PromiseLike<string>, next: PromiseLike<string>) => next);

function APrimary() {
  const value = use(use(aStore));
  return <div data-a="primary">{value}</div>;
}

function NumericControl() {
  const [x, setX] = useState(1);
  return <button data-x={x} style={{ opacity: x / 10 }} onClick={() => setX((n) => n + 1)}>Increment</button>;
}

function App() {
  return <main>
    <Suspense fallback={<div data-a="fallback">A waiting</div>}>
      <APrimary />
    </Suspense>
    <NumericControl />
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
    settlePendingA() { pendingA.resolve("A next"); },
    dispose() { root.dispose(); return root.diagnostics(); },
  };
}
