/** @jsxRuntime classic */
/** @jsx jsx */
// @native-ui
import { Suspense, use, createStore, jsx } from "file:///private/tmp/r3act-native-transfer-v2-3kH8UO/stagedroot/src/native_runtime_api.ts";
export function deferred() {
  let resolve;
  const promise = new Promise((yes) => { resolve = yes; });
  return { promise, resolve };
}
export const firstA = deferred();
export const nextA = deferred();
export const mode = createStore(0, (_state, action) => action);
export const position = createStore(1, (_state, action) => action);
export const camera = createStore(10, (_state, action) => action);
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
export function JointDom(props) {
  const x = use(props.position);
  const y = use(props.camera);
  return <output key="joint-dom" data-sum={x + y} />;
}
export function PositionDom(props) {
  const x = use(props.position);
  return <output key="position-dom" data-position={x * 2} />;
}
export function JointThree(props) {
  const x = use(props.position);
  const y = use(props.camera);
  return <mesh key="joint-three" position-x={x + y} />;
}
export function PositionThree(props) {
  const x = use(props.position);
  return <mesh key="position-three" position-x={x * 2} />;
}
export function AppDom() {
  return <section>
    <Suspense fallback={<div key="a-host">a-loading</div>}>
      <ADom key="a-child" />
    </Suspense>
    <JointDom key="joint-child" position={position} camera={camera} />
    <PositionDom key="position-child" position={position} />
  </section>;
}
export function AppThree() {
  return <group key="app-group">
    <Suspense fallback={<group key="a-group" name="a-loading" />}>
      <AThree key="a-child" />
    </Suspense>
    <JointThree key="joint-child" position={position} camera={camera} />
    <PositionThree key="position-child" position={position} />
  </group>;
}
