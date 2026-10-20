// @native-ui
import { createKeyedCollection, jsx } from "../../src/native_runtime_api.ts";

const records = createKeyedCollection([{ id: "a" }], (record) => record.id);
const arrayItems = [{ id: "local" }];

export function OrdinaryArrayRows() {
  return <ul>{arrayItems.map((item) => <li key={item.id}>{item.id}</li>)}</ul>;
}

export function ShadowedRows(records: readonly { id: string }[]) {
  return <ul>{records.map((item) => <li key={item.id}>{item.id}</li>)}</ul>;
}
