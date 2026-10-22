import { useState } from "native_runtime_api.ts";
export function MovingDot() {
  const [x, setX] = useState(1);
  const [y, setY] = useState(2);
  return <div data-x={x} data-sum={x + y} data-label={`position ${x + y}`} style={{ "--x": x, "--y": y }} onClick={() => setX((previous) => previous + 1)} />;
}
