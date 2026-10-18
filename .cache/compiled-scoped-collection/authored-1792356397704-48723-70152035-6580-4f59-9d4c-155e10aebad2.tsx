import { createKeyedCollection, renderCollectionAt, useState, useEffect } from "file:///Volumes/Depot/Developer/r3act/src/native_runtime_api.ts";

export const leftRows = createKeyedCollection([
  { id: "a" }, { id: "b" }, { id: "c" },
], row => row.id);
export const rightRows = createKeyedCollection([
  { id: "d" }, { id: "e" }, { id: "f" },
], row => row.id);
export const trace = {
  appRenders: 0,
  rowRenders: Object.create(null),
  setters: Object.create(null),
  mounts: Object.create(null),
  cleanups: Object.create(null),
  refAttachments: Object.create(null),
  refCleanups: Object.create(null),
};

export function Item({ row }) {
  trace.rowRenders[row.id] = (trace.rowRenders[row.id] || 0) + 1;
  const [count, setCount] = useState(0);
  trace.setters[row.id] = setCount;
  useEffect(() => {
    trace.mounts[row.id] = (trace.mounts[row.id] || 0) + 1;
    return () => {
      trace.cleanups[row.id] = (trace.cleanups[row.id] || 0) + 1;
    };
  });
  return <li key={row.id} data-row={row.id} data-count={count}
    ref={node => {
      if (!node) return;
      trace.refAttachments[row.id] = (trace.refAttachments[row.id] || 0) + 1;
      return () => {
        trace.refCleanups[row.id] = (trace.refCleanups[row.id] || 0) + 1;
      };
    }}>{row.id}</li>;
}

export function List({ side }) {
  return side === "left"
    ? <ul key="left-list" data-side="left">{renderCollectionAt("compiled-scoped-left", leftRows,
        row => <Item key={row.id} row={row} />)}</ul>
    : <ul key="right-list" data-side="right">{renderCollectionAt("compiled-scoped-right", rightRows,
        row => <Item key={row.id} row={row} />)}</ul>;
}

export function App() {
  trace.appRenders++;
  return <section><List key="left" side="left" /><List key="right" side="right" /></section>;
}