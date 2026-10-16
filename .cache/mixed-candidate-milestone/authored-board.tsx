import { createKeyedCollection, createStore, use, useEffect, useState } from "../../src/native_runtime_api.ts";

export const rows = createKeyedCollection([
  { id: "a", label: "Alpha" },
  { id: "b", label: "Beta" },
  { id: "c", label: "Gamma" },
], row => row.id);
export const shared = createStore(0);
export const trace = {
  renders: Object.create(null),
  controls: Object.create(null),
  mounts: [],
  cleanups: [],
  refObservations: [],
  storeObservations: [],
  storeRefObservations: [],
  effectObservations: [],
  watchedNode: null,
  probeNode: null,
};

export function Row({ row }) {
  trace.renders[row.id] = (trace.renders[row.id] || 0) + 1;
  const [x, setX] = useState(0);
  trace.controls[row.id] = { setX };
  const sourceValue = row.id === "a" ? use(shared) : null;
  useEffect(() => {
    trace.mounts.push(row.id);
    trace.effectObservations.push({
      id: row.id,
      watchedX: trace.watchedNode?.props["data-x"],
      probeValue: trace.probeNode?.props["data-source-probe"],
    });
    return () => trace.cleanups.push(row.id);
  });
  return <li ref={node => {
      if (node) trace.refObservations.push({
        id: row.id,
        watchedX: trace.watchedNode?.props["data-x"],
      });
    }} data-row={row.id} data-x={x} data-source={sourceValue ?? ""}
    data-label={row.label}>{row.label}</li>;
}

export function StoreProbe() {
  const value = use(shared);
  useEffect(() => {
    trace.storeObservations.push({
      value,
      watchedX: trace.watchedNode?.props["data-x"],
    });
  });
  return <output ref={node => {
      if (!node) return;
      trace.probeNode = node;
      trace.storeRefObservations.push({
        value: node.props["data-source-probe"],
        watchedX: trace.watchedNode?.props["data-x"],
      });
    }} data-source-probe={value}>shared:{value}</output>;
}

export function Board() {
  const [boardState] = useState("board");
  return <section data-board-state={boardState}>
    <StoreProbe />
    <ul>{rows.map(row => <Row key={row.id} row={row} />)}</ul>
  </section>;
}