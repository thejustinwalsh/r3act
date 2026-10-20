/** @jsxImportSource @r3act/core */
// @native-ui
import { useState } from "@r3act/core";
import { use as wrapperUse } from "./my_native_runtime_api.ts";

export function App() {
  const [count, setCount] = useState(0);
  const text = wrapperUse(count);
  return <button data-count={count} onClick={() => setCount(count + 1)}>{text}</button>;
}
