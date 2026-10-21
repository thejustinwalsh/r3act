/** @jsxRuntime classic */
/** @jsx jsx */
/** @jsxFrag Fragment */
import { defineComponent as __uiDefineComponent, useStateAt as __uiUseStateAt, useEffectAt as __uiUseEffectAt } from "../component_state_runtime.ts";
import { jsx, Fragment } from "../jsx_binding_runtime.ts";

/** Participant starter compiled to the native component-state runtime. */
export const WarmupCounter = __uiDefineComponent("developer-study/starter/runtime/counter.tsx#component:WarmupCounter", function WarmupCounter() {
  const [count, setCount] = __uiUseStateAt("developer-study/starter/runtime/counter.tsx#component:WarmupCounter#state:0", 0);
  return (
    <section aria-label="Counter">
      <output data-count={count}>{count}</output>
      <button data-action="increment" onClick={() => setCount((value) => value + 1)}>
        Increment
      </button>
      {/* Warm-up: add decrement and reset controls. Clamp the count at zero. */}
    </section>
  );
});
