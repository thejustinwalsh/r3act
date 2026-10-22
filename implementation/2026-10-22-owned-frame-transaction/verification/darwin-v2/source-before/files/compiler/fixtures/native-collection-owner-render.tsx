// @native-ui
import { createKeyedCollection, jsx } from "../../src/native_runtime_api.ts";

const items = createKeyedCollection([{ id: "a", label: "Alpha" }], (item) => item.id);

export function CollectionHeader() {
  return <header>{items.size}:{items.version}</header>;
}

export function CollectionRows() {
  return <ul>{items.map((item) => <li key={item.id}>{items.version}:{item.label}</li>)}</ul>;
}

export function CollectionDemo() {
  return <section><CollectionHeader /><CollectionRows /></section>;
}
