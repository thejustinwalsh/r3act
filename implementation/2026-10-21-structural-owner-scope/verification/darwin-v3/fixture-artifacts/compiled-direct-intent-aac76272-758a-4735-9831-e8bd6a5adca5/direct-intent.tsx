/** @jsxRuntime classic */
/** @jsx jsx */
// @native-ui
import { AsyncResource, Suspense, createStore, use, useState, useEffect, jsx } from "file:///Volumes/Depot/Developer/r3act/src/native_runtime_api.ts";
export function deferred() {
  let resolve;
  const promise = new Promise((yes) => { resolve = yes; });
  return { promise, resolve };
}
export const old = deferred();
export const older = deferred();
export const newer = deferred();
export const oldGate = deferred();
export const pendingGate = deferred();
export const oldResource = new AsyncResource(old.promise);
export const olderResource = new AsyncResource(older.promise);
export const newerResource = new AsyncResource(newer.promise);
export const oldGateResource = new AsyncResource(oldGate.promise);
export const pendingGateResource = new AsyncResource(pendingGate.promise);
export const gateStore = createStore(oldGateResource, (_state, action) => action);
export const acceptedSelection = createStore(oldResource, (_state, action) => action);
export const pendingSelection = createStore(olderResource, (_state, action) => action);
export const trace = { setter: null, activations: 0, cleanups: 0 };

export function Primary(props) {
  const resource = use(props.selection);
  const value = use(resource);
  const gateResource = use(gateStore);
  const gate = use(gateResource);
  return <div key="primary-host" data-label={props.label}>{value}:{gate}</div>;
}
export function Local() {
  const [count, setCount] = useState(1);
  useEffect(() => {
    trace.setter = setCount;
    trace.activations++;
    return () => {
      trace.cleanups++;
      if (trace.setter === setCount) trace.setter = null;
    };
  });
  return <output key="local-host" data-count={count}>local</output>;
}
export function App(props) {
  return <section>
    <Suspense fallback={<div key="primary-host" data-label="fallback">loading</div>}>
      <Primary key="primary-child" selection={props.selection} label={props.label} />
    </Suspense>
    <Local key="local-child" />
  </section>;
}
