// @native-ui
import { createStore, use, useState } from "../native_runtime_api.ts";
import { formatExternal } from "./native-semantic-plan-helper.ts";

const label = createStore("ready");

export function SemanticPanel() {
  const [count, setCount] = useState(0);
  const currentLabel = use(label);
  return <button
    data-count={count + 1}
    data-vector={[count, 2]}
    data-external={formatExternal(count)}
    onClick={() => setCount((value) => value + 1)}
  >{currentLabel}</button>;
}
