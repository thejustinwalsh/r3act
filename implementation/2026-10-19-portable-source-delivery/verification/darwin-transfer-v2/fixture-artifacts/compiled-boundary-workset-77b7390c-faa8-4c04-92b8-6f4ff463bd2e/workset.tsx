/** @jsxRuntime classic */
/** @jsx jsx */
// @native-ui
import { AsyncResource, Suspense, use, createStore, jsx } from "file:///private/tmp/r3act-native-transfer-v2-3kH8UO/stagedroot/src/native_runtime_api.ts";

export function deferred() {
  let resolve;
  const promise = new Promise((yes) => { resolve = yes; });
  return { promise, resolve };
}

export const firstA = deferred();
export const nextA = deferred();
export const pendingB = deferred();
export const pendingC = deferred();
export const resourceB = new AsyncResource(pendingB.promise);
export const resourceC = new AsyncResource(pendingC.promise);
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

export function C(props) {
  const value = use(props.resource);
  return <div key="c-host" data-c="primary">{value}</div>;
}

export function App() {
  return <section>
    <Suspense fallback={<div key="a-host">a-loading</div>}>
      <A key="a-child" />
    </Suspense>
    <Suspense fallback={<div key="b-host">b-loading</div>}>
      <B key="b-child" resource={resourceB} />
    </Suspense>
    <Suspense fallback={<div key="c-host">c-loading</div>}>
      <C key="c-child" resource={resourceC} />
    </Suspense>
  </section>;
}
