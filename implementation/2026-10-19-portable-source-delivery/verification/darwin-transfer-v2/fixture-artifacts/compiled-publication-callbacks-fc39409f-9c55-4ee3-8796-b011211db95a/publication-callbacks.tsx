/** @jsxRuntime classic */
/** @jsx jsx */
// @native-ui
import { AsyncResource, Suspense, createStore, jsx, use } from "file:///private/tmp/r3act-native-transfer-v2-3kH8UO/stagedroot/src/native_runtime_api.ts";
export function deferred() { let resolve; const promise = new Promise((done) => { resolve = done; }); return { promise, resolve }; }
export const pendingA = deferred(), pendingB = deferred(), pendingC = deferred();
export const resourceA = new AsyncResource(pendingA.promise);
export const resourceB = new AsyncResource(pendingB.promise);
export const resourceC = new AsyncResource(pendingC.promise);
export const newer = createStore(0, (_old, action) => action);
export function A(props) { const value = use(props.resource); return <div key="a-host" data-a="ready">{value}</div>; }
export function BInner(props) { const value = use(props.resource); return <div key="b-host" data-b="ready">{value}</div>; }
export function BOuter(props) { return <BInner key="b-inner" resource={props.resource} />; }
export function AppA() { return <Suspense fallback={<div key="a-host" data-a="fallback">A waiting</div>}><A key="a-owner" resource={resourceA} /></Suspense>; }
export function AppB(props) { return <Suspense fallback={<div key="b-host" data-b="fallback">B waiting</div>}>{props.child}</Suspense>; }
