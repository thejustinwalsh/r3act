// @native-ui
import { createKeyedCollection, jsx } from "../../src/native_runtime_api.ts";

const items = createKeyedCollection([{ id: "a" }], (item) => item.id);

export function IndexedRows() {
  return <ul>{items.map((item, index) => <li key={item.id}>{index}</li>)}</ul>;
}

export function ShadowedRows(items: readonly { id: string }[]) {
  return <ul>{items.map((item) => <li key={item.id}>{item.id}</li>)}</ul>;
}
