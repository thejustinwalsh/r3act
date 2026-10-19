/** @jsxRuntime classic */
/** @jsx jsx */
// @native-ui
import { AsyncResource, Suspense, createStore, createKeyedCollection, renderCollectionAt,
  jsx, storeRecord, use, useEffect, useState } from "file:///Volumes/Depot/Developer/r3act/src/native_runtime_api.ts";

export function deferred() {
  let resolve;
  const promise = new Promise((done) => { resolve = done; });
  return { promise, resolve };
}
export const pendingA = deferred(), pendingB = deferred(), pendingC = deferred();
export const resourceA = new AsyncResource(pendingA.promise);
export const resourceB = new AsyncResource(pendingB.promise);
export const resourceC = new AsyncResource(pendingC.promise);
export const position = createStore(storeRecord({ point: storeRecord({ x: 1, y: 2 }) }),
  (_old, next) => next);
export const domRows = createKeyedCollection([{ id: "a" }, { id: "b" }, { id: "c" }], row => row.id);
export const threeRows = createKeyedCollection([{ id: "a" }, { id: "b" }, { id: "c" }], row => row.id);
export const trace = { mounts: { domA: 0, domB: 0, threeA: 0, threeB: 0 },
  cleanups: { domA: 0, domB: 0, threeA: 0, threeB: 0 },
  controls: { dom: [], three: null }, rows: { dom: {}, three: {} } };

export function ADom(props) {
  const value = use(props.resource);
  const point = use(props.position);
  return <output key="a-host" data-slot="a" data-value={value.sample.x + point.point.x}>{value.sample.y}</output>;
}
export function BDom(props) {
  const value = use(props.resource);
  return <output key="b-host" data-slot="b" data-value={value.sample.x}>{value.sample.y}</output>;
}
export function AThree(props) {
  const value = use(props.resource);
  const point = use(props.position);
  return <mesh key="a-host" name="a-ready" position={[value.sample.x + point.point.x, value.sample.y, 0]} />;
}
export function BThree(props) {
  const value = use(props.resource);
  return <mesh key="b-host" name="b-ready" position={[value.sample.x, value.sample.y, 0]} />;
}
export function CDom(props) { const value = use(props.resource); return <span key="c-host" data-health={value} />; }
export function CThree(props) { const value = use(props.resource); return <group key="c-host" name={value} />; }
export function FallbackDom({ slot, hostKey }) {
  const [, setValue] = useState(0);
  useEffect(() => { trace.mounts[slot]++; return () => { trace.cleanups[slot]++; }; });
  return <output key={hostKey} data-fallback={slot} />;
}
export function FallbackThree({ slot, hostKey }) {
  const [, setValue] = useState(0);
  useEffect(() => { trace.mounts[slot]++; return () => { trace.cleanups[slot]++; }; });
  return <mesh key={hostKey} name={`${slot}-waiting`}><boxGeometry /><meshStandardMaterial /></mesh>;
}
export function LocalDom() {
  const [value, setValue] = useState(0);
  useEffect(() => { trace.controls.dom.push(setValue); return () => {
    trace.controls.dom = trace.controls.dom.filter((current) => current !== setValue); }; });
  return <button key="local" data-local={value} onClick={() => setValue(value + 1)} />;
}
export function LocalThree() {
  const [value, setValue] = useState(0);
  useEffect(() => { trace.controls.three = setValue; return () => { trace.controls.three = null; }; });
  return <mesh key="local" name="local" position-x={value} />;
}
export function RowDom({ row }) {
  useEffect(() => { trace.rows.dom[row.id] ??= { mounts: 0, cleanups: 0 }; trace.rows.dom[row.id].mounts++;
    return () => { trace.rows.dom[row.id].cleanups++; }; });
  return <li key={row.id} data-row={row.id}>{row.id}</li>;
}
export function RowThree({ row }) {
  useEffect(() => { trace.rows.three[row.id] ??= { mounts: 0, cleanups: 0 }; trace.rows.three[row.id].mounts++;
    return () => { trace.rows.three[row.id].cleanups++; }; });
  return <group key={row.id} name={row.id} />;
}
export function AppDom() {
  return <section><Suspense fallback={<FallbackDom slot="domA" hostKey="a-host" />}><ADom resource={resourceA} position={position} /></Suspense><Suspense fallback={<FallbackDom slot="domB" hostKey="b-host" />}><BDom resource={resourceB} /></Suspense><Suspense fallback={<span key="c-host" data-health="waiting" />}><CDom resource={resourceC} /></Suspense><LocalDom /><ul key="list">{renderCollectionAt("dom-rows", domRows, row => <RowDom key={row.id} row={row} />)}</ul></section>;
}
export function AppResourcesDom() {
  return <section><Suspense fallback={<FallbackDom slot="domA" hostKey="a-host" />}><ADom resource={resourceA} position={position} /></Suspense><Suspense fallback={<FallbackDom slot="domB" hostKey="b-host" />}><BDom resource={resourceB} /></Suspense><Suspense fallback={<span key="c-host" data-health="waiting" />}><CDom resource={resourceC} /></Suspense></section>;
}
export function AppThree() {
  return <group key="scene"><Suspense fallback={<FallbackThree slot="threeA" hostKey="a-host" />}><AThree resource={resourceA} position={position} /></Suspense><Suspense fallback={<FallbackThree slot="threeB" hostKey="b-host" />}><BThree resource={resourceB} /></Suspense><Suspense fallback={<group key="c-host" name="waiting" />}><CThree resource={resourceC} /></Suspense><LocalThree /><group key="list" name="list">{renderCollectionAt("three-rows", threeRows, row => <RowThree key={row.id} row={row} />)}</group></group>;
}
