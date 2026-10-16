import { createKeyedCollection } from "../../../src/native_runtime_api.ts";

const rows = createKeyedCollection([{ id: "row-0" }], (row) => row.id);

export function UnsupportedIndexBoard() {
  return <ul>{rows.map((row, index) => <li key={row.id} data-id={row.id}>{index}</li>)}</ul>;
}
