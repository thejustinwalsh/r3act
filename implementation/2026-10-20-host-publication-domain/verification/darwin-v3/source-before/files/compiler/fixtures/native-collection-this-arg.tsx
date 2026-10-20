// @native-ui
import { createKeyedCollection, jsx } from "../../src/native_runtime_api.ts";

const items = createKeyedCollection([{ id: "a" }], (item) => item.id);

export function Rows() {
  return <ul>{items.map((item) => <li key={item.id}>{item.id}</li>, null)}</ul>;
}
