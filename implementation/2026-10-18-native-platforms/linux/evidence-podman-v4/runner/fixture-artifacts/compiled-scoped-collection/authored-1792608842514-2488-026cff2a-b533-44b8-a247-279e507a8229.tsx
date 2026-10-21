import { createKeyedCollection, renderCollectionAt, useState, useEffect } from "file:///workspace/r3act/src/native_runtime_api.ts";

export const leftRows = createKeyedCollection([
  { id: "a" }, { id: "b" }, { id: "c" },
], row => row.id);
export const rightRows = createKeyedCollection([
  { id: "d" }, { id: "e" }, { id: "f" },
], row => row.id);
export const trace = {
  appRenders: 0,
  setters: Object.create(null),
  mounts: Object.create(null),
  cleanups: Object.create(null),
  refAttachments: Object.create(null),
  refCleanups: Object.create(null),
};

export function captureItemNode(node) {
  if (!node) return;
  const id = node.props["data-row"];
  trace.refAttachments[id] = (trace.refAttachments[id] || 0) + 1;
  return () => { trace.refCleanups[id] = (trace.refCleanups[id] || 0) + 1; };
}

export function Item({ id }) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    trace.setters[id] = setCount;
    trace.mounts[id] = (trace.mounts[id] || 0) + 1;
    return () => {
      trace.cleanups[id] = (trace.cleanups[id] || 0) + 1;
    };
  });
  return <li key={id} data-row={id} data-count={count}
    ref={captureItemNode}>{id}</li>;
}

export function List({ side }) {
  return side === "left"
    ? <ul key="left-list" data-side="left">{renderCollectionAt("compiled-scoped-left", leftRows,
        row => <Item key={row.id} id={row.id} />)}</ul>
    : <ul key="right-list" data-side="right">{renderCollectionAt("compiled-scoped-right", rightRows,
        row => <Item key={row.id} id={row.id} />)}</ul>;
}

export function App() {
  trace.appRenders++;
  return <section><List key="left" side="left" /><List key="right" side="right" /></section>;
}