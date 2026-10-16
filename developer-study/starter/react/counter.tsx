import { useState } from "react";

/** Participant starter for the unscored ten-minute counter warm-up. */
export function WarmupCounter() {
  const [count, setCount] = useState(0);
  return (
    <section aria-label="Counter">
      <output data-count={count}>{count}</output>
      <button data-action="increment" onClick={() => setCount((value) => value + 1)}>
        Increment
      </button>
      {/* Warm-up: add decrement and reset controls. Clamp the count at zero. */}
    </section>
  );
}
