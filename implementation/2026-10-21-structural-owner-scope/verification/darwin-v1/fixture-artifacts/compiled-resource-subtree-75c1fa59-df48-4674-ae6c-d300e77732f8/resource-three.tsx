/** @jsxRuntime classic */
/** @jsx jsx */
// @native-ui
import { AsyncResource, Suspense, use, useState, useEffect, createStore, jsx } from "file:///Volumes/Depot/Developer/r3act/src/native_runtime_api.ts";
export function deferred() { let resolve; const promise = new Promise((done) => { resolve = done; }); return { promise, resolve }; }
export const oldA = deferred(), nextA = deferred(), pendingB = deferred();
export const resourceB = new AsyncResource(pendingB.promise);
export const mode = createStore(0, (_current, next) => next);
export const trace = { fallbackMounts: 0, fallbackCleanups: 0, fallbackSetter: null };
export function A() { const value = use(use(mode) === 0 ? oldA.promise : nextA.promise); return <group key="a-host" name={value} />; }
export function FallbackB() {
  const [, setValue] = useState(1);
  useEffect(() => { trace.fallbackSetter = setValue; trace.fallbackMounts++;
    return () => { trace.fallbackCleanups++; if (trace.fallbackSetter === setValue) trace.fallbackSetter = null; }; });
  return <mesh key="b-root" name="waiting"><boxGeometry /><meshStandardMaterial /></mesh>;
}
export function B(props) { const value = use(props.resource); return <group key="b-root" name="ready"><mesh key="b-mesh" position-x={value + 1} /><group key="b-child" name="static" /></group>; }
export function App() { return <group key="scene-root">
  <Suspense fallback={<group key="a-host" name="A waiting" />}><A key="a-child" /></Suspense>
  <Suspense fallback={<FallbackB key="b-fallback-owner" />}><B key="b-child" resource={resourceB} /></Suspense>
</group>; }
