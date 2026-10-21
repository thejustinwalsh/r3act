/** @jsxRuntime classic */
/** @jsx jsx */
// @native-ui
import { createKeyedCollection, jsx, useEffect, useState } from "file:///workspace/r3act/src/native_runtime_api.ts";

export const trace = {
  value: "A", throwGetter: false, throwRowGetter: false,
  opaqueCalls: 0, getterCalls: 0, rowGetterCalls: 0,
  ownerCalls: 0, mounts: {}, cleanups: {},
  setters: {}, effectMounts: 0, effectCleanups: 0,
};
export const opaqueRows = createKeyedCollection([
  { id: "a", label: "Alpha" }, { id: "b", label: "Beta" },
  { id: "c", get label() {
    trace.rowGetterCalls++;
    if (trace.throwRowGetter) throw new Error("collection row getter failed");
    return "Gamma";
  } },
], row => row.id);
export const pureRows = createKeyedCollection([
  { id: "p", label: "Pure" }, { id: "q", label: "Quiet" },
], row => row.id);
const source = { get current() {
  trace.getterCalls++;
  if (trace.throwGetter) throw new Error("collection opaque getter failed");
  return trace.value;
} };
export function readOpaque() { trace.opaqueCalls++; return source.current; }

export function Row(props) {
  const { id, label } = props.row;
  const [count, setCount] = useState(0);
  useEffect(() => {
    trace.mounts[id] = (trace.mounts[id] || 0) + 1;
    trace.setters[id] = setCount;
    return () => { trace.cleanups[id] = (trace.cleanups[id] || 0) + 1; };
  });
  return <li key={id} data-row={id} data-count={count}>{label}</li>;
}
export function OpaqueCollection(props) {
  trace.ownerCalls++;
  useEffect(() => {
    trace.effectMounts++;
    return () => { trace.effectCleanups++; };
  });
  const sibling = readOpaque();
  return <section key="opaque-section" data-section={props.caption}>
    <output key="opaque-sibling" data-opaque={sibling} />
    <ul key="opaque-list">{opaqueRows.map(row => <Row row={row} probe={row.label} />)}</ul>
  </section>;
}
export function PureCollection() {
  return <ol key="pure-list">{pureRows.map(row => <Row row={row} />)}</ol>;
}
export function App(props) {
  return <main>
    <OpaqueCollection key="opaque-owner" caption={props.caption} />
    <PureCollection key="pure-owner" />
  </main>;
}
