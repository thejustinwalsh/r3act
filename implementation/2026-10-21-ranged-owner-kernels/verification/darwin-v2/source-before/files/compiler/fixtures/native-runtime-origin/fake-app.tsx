/** @jsxImportSource @r3act/core */
import { createStore, use } from "./fake/native_runtime_api.ts";

const source = createStore("probe");

export function App() {
  return <output>{use(source)}</output>;
}
