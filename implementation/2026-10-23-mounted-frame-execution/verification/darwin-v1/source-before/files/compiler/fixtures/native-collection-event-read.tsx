// @native-ui
import { createKeyedCollection, jsx } from "../../src/native_runtime_api.ts";

const items = createKeyedCollection([{ id: "a", label: "Alpha" }], (item) => item.id);

export function CollectionRows() {
  return <ul>{items.map((item) => <li key={item.id}>{item.label}</li>)}</ul>;
}

export function CollectionControls() {
  const inspectSize = () => items.size;
  return <button onClick={inspectSize}>Inspect rows</button>;
}
