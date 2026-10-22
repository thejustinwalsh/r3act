import {
  ComponentStateRoot,
  defineComponent,
  useStateAt,
} from "../component_state_runtime.ts";
import { jsx } from "../jsx_binding_runtime.ts";
import { DOMVDOMHost } from "../vdom_snapshot_runtime.ts";

const Counter = defineComponent("bundle.counter", () => {
  const [count, setCount] = useStateAt("bundle.counter.count", 0);
  return jsx(
    "button",
    { onClick: () => setCount((value) => value + 1) },
    `Count ${count}`,
  );
});

const container = document.querySelector("#app");
if (!container) throw new Error("Missing #app mount node");
new ComponentStateRoot(new DOMVDOMHost(), container).mount(
  jsx(Counter, {}),
);
