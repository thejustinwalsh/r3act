/** @jsxRuntime classic */
/** @jsx jsx */
// @native-ui
import { Suspense, use, createStore, storeRecord, jsx } from "file:///Volumes/Depot/Developer/r3act/src/native_runtime_api.ts";

export function deferred() {
  let resolve;
  const promise = new Promise((done) => { resolve = done; });
  return { promise, resolve };
}

export const pending = deferred();
export const position = createStore(storeRecord({
  position: storeRecord({ x: 1, y: 2 }),
}), (_old, next) => next);
export const camera = createStore(storeRecord({
  camera: storeRecord({ x: 3, y: 4 }),
}), (_old, next) => next);

export function PendingDom() {
  const value = use(pending.promise);
  return <span key="pending-dom">{value}</span>;
}
export function PendingThree() {
  const value = use(pending.promise);
  return <group key="pending-three" name={value} />;
}
export function Dom(props) {
  const x = use(props.position);
  const y = use(props.camera);
  return <div key="scene"><output key="label" style={{ opacity: (y.camera.x + x.position.x) / 10 }} data-sum={x.position.x + y.camera.x}>{`${x.position.y}:${y.camera.y}`}</output><span key="tail">{x.position.x}</span></div>;
}
export function Three(props) {
  const x = use(props.position);
  const y = use(props.camera);
  return <group key="scene"><mesh key="mesh" position={[x.position.x, x.position.y, y.camera.x]} /><group key="outline" position={[x.position.x + y.camera.x, y.camera.y, 0]} /></group>;
}
export function AppDom() {
  return <section><Dom key="dom-owner" position={position} camera={camera} />
    <Suspense fallback={<span key="waiting-dom">waiting</span>}>
      <PendingDom key="pending-owner" />
    </Suspense></section>;
}
export function AppThree() {
  return <group key="scene-root"><Three key="three-owner" position={position} camera={camera} />
    <mesh key="owned-static"><boxGeometry /><meshStandardMaterial /></mesh>
    <Suspense fallback={<group key="waiting-three" name="waiting" />}>
      <PendingThree key="pending-owner" />
    </Suspense></group>;
}
