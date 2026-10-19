// @native-ui
import { createKeyedCollection, jsx } from "../../src/native_runtime_api.ts";

const records = createKeyedCollection([{ id: "a" }], (record) => record.id);

export function AliasedCollectionRows() {
  return <ul>{alias.map((item) => <li key={item.id}>{item.id}</li>)}</ul>;
}

const alias = records;
