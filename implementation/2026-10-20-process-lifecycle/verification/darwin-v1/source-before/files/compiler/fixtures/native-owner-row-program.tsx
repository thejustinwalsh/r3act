import { useState } from "native_runtime_api.ts";

export function Row() {
  const [x] = useState(1);
  const [y] = useState(2);
  const [z] = useState(3);
  return <mesh position={[z, x, y]} data-repeat={x + x} data-x={x} data-y={y} />;
}
