import { AsyncResource, createDOMRoot, createStore, Suspense, use, useState } from "../../../src/native_runtime_api.ts";

type Deferred = { promise: Promise<string>; resolve(value: string): void };
function deferred(): Deferred {
  let resolve!: (value: string) => void;
  const promise = new Promise<string>((done) => { resolve = done; });
  return { promise, resolve };
}

const initial = deferred();
initial.resolve("initial value");
const obsolete = deferred();
const latest = deferred();
const initialControl = deferred();
initialControl.resolve("control ready");
const pendingControl = deferred();
const controlStore = createStore(initialControl.promise,
  (_current: PromiseLike<string>, next: PromiseLike<string>) => next);

function Primary(props: { resource: AsyncResource<string>; label: string }) {
  const value = use(props.resource);
  use(use(controlStore));
  const [count, setCount] = useState(0);
  return <div key="primary-host" data-primary="yes" data-label={props.label}>
    <button data-counter="yes" onClick={() => setCount((n) => n + 1)}>{count}</button>
    <span data-value="yes">{value}</span>
  </div>;
}

function App(props: { resource: AsyncResource<string>; label: string }) {
  return <Suspense fallback={<div key="primary-host" data-fallback="yes">waiting</div>}>
    <Primary resource={props.resource} label={props.label} />
  </Suspense>;
}

export function mountNative(host: HTMLElement) {
  const root = createDOMRoot(host);
  const initialResource = new AsyncResource(initial.promise);
  const obsoleteResource = new AsyncResource(obsolete.promise);
  const latestResource = new AsyncResource(latest.promise);
  const started = performance.now();
  root.mount(<App resource={initialResource} label="initial" />);
  const mountDurationMs = performance.now() - started;
  return {
    mountDurationMs,
    beginRequests() {
      controlStore.dispatch(pendingControl.promise);
      root.update(<App resource={obsoleteResource} label="obsolete" />);
      root.update(<App resource={latestResource} label="latest" />);
    },
    settleObsolete() { obsolete.resolve("obsolete value"); },
    settleLatest() {
      latest.resolve("latest value");
      pendingControl.resolve("control next");
    },
    dispose() { root.dispose(); return root.diagnostics(); },
  };
}
