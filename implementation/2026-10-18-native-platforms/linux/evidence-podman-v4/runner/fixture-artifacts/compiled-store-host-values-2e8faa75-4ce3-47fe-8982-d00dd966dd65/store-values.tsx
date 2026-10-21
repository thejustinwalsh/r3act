/** @jsxRuntime classic */
/** @jsx jsx */
// @native-ui
import { Suspense, use, createStore, jsx } from "file:///workspace/r3act/src/native_runtime_api.ts";
export function deferred() { let resolve; const promise = new Promise((done) => { resolve = done; }); return { promise, resolve }; }
export const pending = deferred();
export const position = createStore(1, (_old, next) => next);
export const camera = createStore(2, (_old, next) => next);
export function PendingDom() { const value = use(pending.promise); return <span key="pending-host">{value}</span>; }
export function PendingThree() { const value = use(pending.promise); return <group key="pending-host" name={value} />; }
export function Dom(props) {
  const x = use(props.position); const y = use(props.camera);
  return <output key="dom-host" style={{ color: "red", opacity: (x + y) / 10 }} />;
}
export function Three(props) {
  const x = use(props.position); const y = use(props.camera);
  return <mesh key="three-host" position={[x + y, 2, 3]} />;
}
export function AppDom() { return <section>
  <Dom key="dom-owner" position={position} camera={camera} />
  <Suspense fallback={<span key="pending-host">waiting</span>}><PendingDom key="pending-owner" /></Suspense>
</section>; }
export function AppThree() { return <group key="scene-root">
  <Three key="three-owner" position={position} camera={camera} />
  <mesh key="owned-static"><boxGeometry /><meshStandardMaterial /></mesh>
  <Suspense fallback={<group key="pending-host" name="waiting" />}><PendingThree key="pending-owner" /></Suspense>
</group>; }
