/** @jsxRuntime classic */
/** @jsx jsx */
// @native-ui
import { Suspense, use, createStore, useState, useEffect, jsx } from "file:///Volumes/Depot/Developer/r3act/src/native_runtime_api.ts";
export function deferred() {
  let resolve;
  const promise = new Promise((yes) => { resolve = yes; });
  return { promise, resolve };
}
export const firstA = deferred();
export const nextA = deferred();
export const mode = createStore(0, (_state, action) => action);
export const trace = { setter: null, activations: 0, cleanups: 0 };
export function A() {
  const selected = use(mode) === 0 ? firstA.promise : nextA.promise;
  const value = use(selected);
  return <group key="a-group" name={value} />;
}
export function B() {
  const [x, setX] = useState(1);
  useEffect(() => {
    trace.setter = setX;
    trace.activations++;
    return () => {
      trace.cleanups++;
      if (trace.setter === setX) trace.setter = null;
    };
  });
  return <mesh key="b-mesh" position-x={x} />;
}
export function App() {
  return <group key="app-group">
    <Suspense fallback={<group key="a-group" name="a-loading" />}>
      <A key="a-child" />
    </Suspense>
    <B key="b-child" />
  </group>;
}
