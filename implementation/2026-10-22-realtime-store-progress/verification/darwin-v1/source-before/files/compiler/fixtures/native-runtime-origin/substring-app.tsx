/** @jsxImportSource @r3act/core */
import { use } from "./my_native_runtime_api.ts";

export function App() {
  return <output>{use("probe")}</output>;
}
