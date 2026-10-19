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
export const mode = createStore(0, (_state, action) => action);
export const numberStore = createStore(1, (_state, action) => action);
export const opaqueStore = createStore(1, (_state, action) => action);
export function ADom() {
  const resource = use(mode) === 0 ? firstA.promise : nextA.promise;
  const value = use(resource);
  return <div key="a-host">{value}</div>;
}
export function AThree() {
  const resource = use(mode) === 0 ? firstA.promise : nextA.promise;
  const value = use(resource);
  return <group key="a-group" name={value} />;
}
export function BDom(props) {
  const value = use(props.store);
  return <output key="b-host" data-value={value * 2} />;
}
export function BThree(props) {
  const value = use(props.store);
  return <mesh key="b-mesh" position-x={value * 2} />;
}
export function Opaque(props) {
  const value = use(props.store);
  return <output key="opaque-host" data-value={Math.round(value)} />;
}
export function AppDom() {
  return <section>
    <Suspense fallback={<div key="a-host">a-loading</div>}>
      <ADom key="a-child" />
    </Suspense>
    <BDom key="b-child" store={numberStore} />
  </section>;
}
export function AppThree() {
  return <group key="app-group">
    <Suspense fallback={<group key="a-group" name="a-loading" />}>
      <AThree key="a-child" />
    </Suspense>
    <BThree key="b-child" store={numberStore} />
  </group>;
}
