import { useState } from "native_runtime_api.ts";

export function Row() {
  const [x] = useState(1);
  const [y] = useState(2);
  return <mesh data-y={y} data-sum={x + y} data-label={`${x}px`} data-x={x} data-negative={-x} />;
}

export function SameShape() {
  const [x] = useState(1);
  const [y] = useState(2);
  return <mesh data-y={y} data-sum={x + y} data-label={`${x}px`} data-x={x} data-negative={-x} />;
}

export function Vector() {
  const [x] = useState(1);
  const [y] = useState(2);
  return <mesh position={[x, y]} />;
}

export function Opaque() {
  const [x] = useState(1);
  return <mesh data-opaque={Math.sin(x)} />;
}
