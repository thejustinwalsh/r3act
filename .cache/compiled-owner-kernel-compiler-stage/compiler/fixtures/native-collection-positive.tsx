// @native-ui
import { createKeyedCollection, jsx } from "../../src/native_runtime_api.ts";

const items = createKeyedCollection(
  [{ id: "a", label: "Alpha" }, { id: "b", label: "Beta" }],
  (item) => item.id,
);

export function CollectionList() {
  return <>
    <ul>{items.map((item) => <li key={item.id}>{item.label}</li>)}</ul>
    <ul>{items.map((item) => <li key={item.id}>{item.label}</li>)}</ul>
  </>;
}

export function CollectionLabels() {
  return <ol>{items.map((entry) => <li key={entry.id}>{entry.label}</li>)}</ol>;
}
