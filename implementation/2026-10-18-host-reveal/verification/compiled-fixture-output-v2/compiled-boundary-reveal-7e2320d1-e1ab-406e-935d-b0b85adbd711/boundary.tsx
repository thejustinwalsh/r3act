/** @jsxRuntime classic */
/** @jsx jsx */
// @native-ui
import { Suspense, use, createStore, jsx } from "file:///Volumes/Depot/Developer/r3act/src/native_runtime_api.ts";

export function deferred() {
  let resolve;
  const promise = new Promise((yes) => { resolve = yes; });
  return { promise, resolve };
}

export const firstA = deferred();
export const nextA = deferred();
export const pendingB = deferred();
export const mode = createStore(0, (_state, action) => action);

export function A() {
  const selected = use(mode) === 0 ? firstA.promise : nextA.promise;
  const value = use(selected);
  return <div key="a-host" data-a="primary">{value}</div>;
}

export function B(props) {
  const value = use(props.resource);
  return <div key="b-host" data-b="primary">{value}</div>;
}

export function App() {
  return <section>
    <Suspense fallback={<div key="a-host">a-loading</div>}>
      <A key="a-child" />
    </Suspense>
    <Suspense fallback={<div key="b-host">b-loading</div>}>
      <B key="b-child" resource={pendingB.promise} />
    </Suspense>
  </section>;
}
