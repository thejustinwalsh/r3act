import {
  createDOMRoot,
  createStore,
  AsyncResource,
  Suspense,
  use,
} from "../../../src/native_runtime_api.ts";

type Deferred = { promise: Promise<string>; resolve(value: string): void };
function deferred(): Deferred {
  let resolve!: (value: string) => void;
  const promise = new Promise<string>((done) => { resolve = done; });
  return { promise, resolve };
}

const primaryA = deferred();
void primaryA.resolve("A ready");
const pendingA = deferred();
const pendingB = deferred();
const aStore = createStore(primaryA.promise, (_current: PromiseLike<string>, next: PromiseLike<string>) => next);

function APrimary() {
  const value = use(use(aStore));
  return <div key="a-primary" data-a="primary">{value}</div>;
}

function BPrimary(props: { resource: AsyncResource<string> }) {
  const value = use(props.resource);
  return <div key="b-primary" data-b="primary">{value}</div>;
}

function App(props: { resourceB: AsyncResource<string> }) {
  return <main>
    <Suspense key="boundary-a" fallback={<div key="a-primary" data-a="fallback">A waiting</div>}>
      <APrimary />
    </Suspense>
    <Suspense key="boundary-b" fallback={<div key="b-primary" data-b="fallback">B waiting</div>}>
      <BPrimary resource={props.resourceB} />
    </Suspense>
  </main>;
}

export function mountNative(host: HTMLElement) {
  const root = createDOMRoot(host);
  const started = performance.now();
  const resourceB = new AsyncResource(pendingB.promise);
  root.mount(<App resourceB={resourceB} />);
  const mountDurationMs = performance.now() - started;
  return {
    mountDurationMs,
    beginPendingA() { aStore.dispatch(pendingA.promise); },
    settleB() { pendingB.resolve("B ready"); },
    settlePendingA() { pendingA.resolve("A next"); },
    dispose() { root.dispose(); return root.diagnostics(); },
  };
}
