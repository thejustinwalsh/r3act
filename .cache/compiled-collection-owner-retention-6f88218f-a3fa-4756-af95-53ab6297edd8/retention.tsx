/** @jsxRuntime classic */
/** @jsx jsx */
// @native-ui
import { jsx, createKeyedCollection, useEffect } from "file:///Volumes/Depot/Developer/r3act/src/native_runtime_api.ts";
export const rows = createKeyedCollection([
  { id: "dead", payload: { value: "removed" } },
  { id: "live", payload: { value: "surviving" } },
], row => row.id);
export const trace = { mounts: {}, cleanups: {} };
export function Row({ row }) {
  useEffect(() => {
    trace.mounts[row.id] = (trace.mounts[row.id] || 0) + 1;
    return () => { trace.cleanups[row.id] = (trace.cleanups[row.id] || 0) + 1; };
  });
  return <li key={row.id} data-id={row.id} onClick={() => row.payload}>{row.id}</li>;
}
export function List() {
  return <ul>{rows.map(row => <Row row={row} />)}</ul>;
}
export function App() { return <section><List key="list" /></section>; }
