/** @jsxRuntime classic */
/** @jsx jsx */
// @native-ui
import { AsyncResource, Suspense, createStore, jsx, storeRecord, use, useEffect, useState } from "file:///workspace/r3act/src/native_runtime_api.ts";

export function deferred() {
  let resolve;
  const promise = new Promise((done) => { resolve = done; });
  return { promise, resolve };
}
export const firstPending = deferred();
export const secondPending = deferred();
export const healthPending = deferred();
export const first = new AsyncResource(firstPending.promise);
export const second = new AsyncResource(secondPending.promise);
export const health = new AsyncResource(healthPending.promise);
export const position = createStore(storeRecord({ vector: storeRecord({ x: 1, y: 2 }) }),
  (_old, next) => next);
export const trace = { fallbackMounts: 0, fallbackCleanups: 0, staleSetters: [],
  opaqueRenders: 0, healthRenders: 0 };

export function Dom(props) {
  const b = use(props.second);
  const p = use(props.position);
  const a = use(props.first);
  return <div key="joint-root"><output key="joint-label" data-sum={a.sample.x + p.vector.x + b.sample.y} style={{ opacity: b.sample.x / 10 }}>{`${a.sample.y}:${p.vector.y}:${b.sample.x}`}</output><span key="joint-tail" data-value={p.vector.x + a.sample.x} /></div>;
}
export function Three(props) {
  const b = use(props.second);
  const p = use(props.position);
  const a = use(props.first);
  return <group key="joint-root"><mesh key="joint-mesh" position={[a.sample.x, p.vector.x, b.sample.y]} /><group key="joint-outline" position={[p.vector.x + a.sample.x, b.sample.x, 0]} /></group>;
}
export function DomMiddle(props) {
  return <Dom key="dom-leaf" second={props.second} position={props.position} first={props.first} />;
}
export function DomOuter({ secondary, motion, primary }) {
  return <DomMiddle key="dom-middle" second={secondary} position={motion} first={primary} />;
}
export function ThreeMiddle(props) {
  return <Three key="three-leaf" second={props.second} position={props.position} first={props.first} />;
}
export function ThreeOuter({ secondary, motion, primary }) {
  return <ThreeMiddle key="three-middle" second={secondary} position={motion} first={primary} />;
}
export function OpaqueTraced(props) {
  trace.opaqueRenders++;
  return <Dom key="opaque-leaf" second={props.second} position={props.position} first={props.first} />;
}
export function FallbackDom() {
  const [, setValue] = useState(1);
  useEffect(() => { trace.fallbackMounts++; trace.staleSetters.push(setValue);
    return () => { trace.fallbackCleanups++; }; });
  return <div key="joint-root" data-status="waiting" />;
}
export function FallbackThree() {
  const [, setValue] = useState(1);
  useEffect(() => { trace.fallbackMounts++; trace.staleSetters.push(setValue);
    return () => { trace.fallbackCleanups++; }; });
  return <mesh key="joint-root" name="waiting"><boxGeometry /><meshStandardMaterial /></mesh>;
}
export function HealthDom() {
  const value = use(health);
  trace.healthRenders++;
  return <span key="health-ready" data-health={value} />;
}
export function HealthThree() {
  const value = use(health);
  trace.healthRenders++;
  return <group key="health-ready" name={value} />;
}
export function AppDom() {
  return <section><Suspense key="joint-boundary" fallback={<FallbackDom key="joint-fallback-owner" />}><DomOuter key="dom-outer" secondary={second} motion={position} primary={first} /></Suspense><Suspense fallback={<span key="health-waiting" data-health="waiting" />}><HealthDom key="health-owner" /></Suspense></section>;
}
export function AppThree() {
  return <group key="scene-root"><Suspense key="joint-boundary" fallback={<FallbackThree key="joint-fallback-owner" />}><ThreeOuter key="three-outer" secondary={second} motion={position} primary={first} /></Suspense><Suspense fallback={<group key="health-waiting" name="waiting" />}><HealthThree key="health-owner" /></Suspense></group>;
}
