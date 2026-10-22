import { asyncTask, useState } from "native_runtime_api.ts";

const kernelProofTask = asyncTask("kernel-proof", async (input) => null);

export function Row() {
  const [x] = useState(1);
  const [y] = useState(2);
  return <mesh data-y={y} data-sum={x + y} data-label={`${x}px`} data-x={x} data-negative={-x} data-condition={x > 0 ? "positive" : "nonpositive"} data-escaped={`line\n${x}px`} />;
}

export function SameShape() {
  const [x] = useState(1);
  const [y] = useState(2);
  return <mesh data-y={y} data-sum={x + y} data-label={`${x}px`} data-x={x} data-negative={-x} data-condition={x > 0 ? "positive" : "nonpositive"} data-escaped={`line\n${x}px`} />;
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

export function Member() {
  const [x] = useState(1);
  const source = { value: 2 };
  return <mesh data-member={source.value + x} />;
}

export function Call() {
  const [x] = useState(1);
  return <mesh data-call={formatValue(x)} />;
}

export function ShadowedUndefined() {
  const [x] = useState(1);
  const undefined = 2;
  return <mesh data-shadowed={x + undefined} />;
}

export function Mutation() {
  const [x] = useState(1);
  return <mesh data-assignment={x = 2} data-update={x++} />;
}

export function MixedCoverage() {
  const [x] = useState(1);
  return <mesh data-x={x} position={[x, 2]} />;
}
