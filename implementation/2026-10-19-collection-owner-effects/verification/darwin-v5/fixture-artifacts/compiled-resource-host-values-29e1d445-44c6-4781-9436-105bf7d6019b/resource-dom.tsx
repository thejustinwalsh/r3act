/** @jsxRuntime classic */
/** @jsx jsx */
// @native-ui
import { AsyncResource, Suspense, use, useState, useEffect, createStore, jsx } from "file:///Volumes/Depot/Developer/r3act/src/native_runtime_api.ts";
export function deferred() { let resolve; const promise = new Promise((done) => { resolve = done; }); return { promise, resolve }; }
export const oldA = deferred(), nextA = deferred(), pendingB = deferred();
export const resourceB = new AsyncResource(pendingB.promise);
export const mode = createStore(0, (_current, next) => next);
export const trace = { fallbackMounts: 0, fallbackCleanups: 0, fallbackSetter: null };
export function A() { const value = use(use(mode) === 0 ? oldA.promise : nextA.promise); return <div key="a-host" data-a="primary">{value}</div>; }
export function FallbackB() {
  const [, setValue] = useState(1);
  useEffect(() => { trace.fallbackSetter = setValue; trace.fallbackMounts++;
    return () => { trace.fallbackCleanups++; if (trace.fallbackSetter === setValue) trace.fallbackSetter = null; }; });
  return <span key="b-root" data-b="fallback" style={{ color: "gray" }}>B waiting</span>;
}
export function B(props) { const value = use(props.resource); return <div key="b-root" data-b="ready" style={{ color: "green", opacity: value / 10 }}><span key="b-label" data-label="ready">{value}</span><output key="b-output" data-count={value + 1}>{value}</output></div>; }
export function App() { return <section>
  <Suspense fallback={<div key="a-host" data-a="fallback">A waiting</div>}><A key="a-child" /></Suspense>
  <Suspense fallback={<FallbackB key="b-fallback-owner" />}><B key="b-child" resource={resourceB} /></Suspense>
</section>; }
