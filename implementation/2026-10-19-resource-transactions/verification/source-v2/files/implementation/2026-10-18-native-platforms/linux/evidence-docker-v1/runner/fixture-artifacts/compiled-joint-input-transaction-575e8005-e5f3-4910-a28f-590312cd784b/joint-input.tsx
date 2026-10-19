/** @jsxRuntime classic */
/** @jsx jsx */
// @native-ui
import { Suspense, use, useState, useEffect, createStore, createKeyedCollection,
  renderCollectionAt, jsx } from "file:///workspace/r3act/src/native_runtime_api.ts";
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
export const domRows = createKeyedCollection([
  { id: "a" }, { id: "b" }, { id: "c" },
], row => row.id);
export const threeRows = createKeyedCollection([
  { id: "a" }, { id: "b" }, { id: "c" },
], row => row.id);
export const trace = {
  controls: { dom: null, three: null },
  activations: { dom: 0, three: 0 },
  cleanups: { dom: 0, three: 0 },
  rowRenders: { dom: Object.create(null), three: Object.create(null) },
  rowMounts: { dom: Object.create(null), three: Object.create(null) },
  rowCleanups: { dom: Object.create(null), three: Object.create(null) },
};
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
  return <output key="joint-dom" data-joint={x + y} />;
}
export function JointThree(props) {
  const x = use(props.position);
  const y = use(props.camera);
  return <mesh key="joint-three" position-x={x + y} />;
}
export function WorldDom() {
  const [value, setValue] = useState(0);
  useEffect(() => {
    trace.controls.dom = setValue;
    trace.activations.dom++;
    return () => {
      trace.cleanups.dom++;
      if (trace.controls.dom === setValue) trace.controls.dom = null;
    };
  });
  return <output key="world-dom" data-world={value} />;
}
export function WorldThree() {
  const [value, setValue] = useState(0);
  useEffect(() => {
    trace.controls.three = setValue;
    trace.activations.three++;
    return () => {
      trace.cleanups.three++;
      if (trace.controls.three === setValue) trace.controls.three = null;
    };
  });
  return <mesh key="world-three" position-x={value} />;
}
export function RowDom({ row }) {
  trace.rowRenders.dom[row.id] = (trace.rowRenders.dom[row.id] || 0) + 1;
  useEffect(() => {
    trace.rowMounts.dom[row.id] = (trace.rowMounts.dom[row.id] || 0) + 1;
    return () => { trace.rowCleanups.dom[row.id] = (trace.rowCleanups.dom[row.id] || 0) + 1; };
  });
  return <li key={row.id} data-row={row.id}>{row.id}</li>;
}
export function RowThree({ row }) {
  trace.rowRenders.three[row.id] = (trace.rowRenders.three[row.id] || 0) + 1;
  useEffect(() => {
    trace.rowMounts.three[row.id] = (trace.rowMounts.three[row.id] || 0) + 1;
    return () => { trace.rowCleanups.three[row.id] = (trace.rowCleanups.three[row.id] || 0) + 1; };
  });
  return <group key={row.id} name={row.id} />;
}
export function ListDom() {
  return <ul key="dom-list">{renderCollectionAt("dom-rows", domRows,
    row => <RowDom key={row.id} row={row} />)}</ul>;
}
export function ListThree() {
  return <group key="three-list">{renderCollectionAt("three-rows", threeRows,
    row => <RowThree key={row.id} row={row} />)}</group>;
}
export function AppDom() {
  return <section>
    <Suspense fallback={<div key="a-host">a-loading</div>}>
      <ADom key="a-child" />
    </Suspense>
    <JointDom key="joint-child" position={position} camera={camera} />
    <WorldDom key="world-child" />
    <ListDom key="list-child" />
  </section>;
}
export function AppThree() {
  return <group key="app-group">
    <Suspense fallback={<group key="a-group" name="a-loading" />}>
      <AThree key="a-child" />
    </Suspense>
    <JointThree key="joint-child" position={position} camera={camera} />
    <WorldThree key="world-child" />
    <ListThree key="list-child" />
  </group>;
}
