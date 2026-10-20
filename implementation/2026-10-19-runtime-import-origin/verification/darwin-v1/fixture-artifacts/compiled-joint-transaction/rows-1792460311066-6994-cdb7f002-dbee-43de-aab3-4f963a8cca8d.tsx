import { createKeyedCollection, renderCollectionAt, useState, useEffect } from "file:///Volumes/Depot/Developer/r3act/src/native_runtime_api.ts";
export const rows = createKeyedCollection(Array.from({ length: 12 }, (_, index) => ({ id: `row-${index}` })), row => row.id);
export const trace = { setters: Object.create(null), mounts: Object.create(null), cleanups: Object.create(null) };
export function Row({ id }) {
  const [value, setValue] = useState(0);
  useEffect(() => { trace.setters[id] = setValue; trace.mounts[id] = (trace.mounts[id] || 0) + 1; return () => { trace.cleanups[id] = (trace.cleanups[id] || 0) + 1; }; });
  return <li data-id={id} data-value={value}>{id}</li>;
}
export function List() { return <ul>{renderCollectionAt("compiled-joint-rows", rows, row => <Row key={row.id} id={row.id} />)}</ul>; }