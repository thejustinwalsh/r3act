import { useState, useEffect } from "file:///workspace/r3act/src/native_runtime_api.ts";
export const trace = { controls: null, activations: 0 };

export function SceneComponent() {
  const [x, setX] = useState(0);
  const [y, setY] = useState(0);
  const [z, setZ] = useState(0);
  const [r, setR] = useState(0);
  const [rough, setRough] = useState(0.2);
  useEffect(() => {
    trace.controls = { x: setX, y: setY, z: setZ, r: setR, rough: setRough };
    trace.activations++;
  });
  const parity = x % 2;
  return <mesh position={[x, y + parity, z]} rotation={[r, 0, 0]}>
    <boxGeometry args={[1, 2, 3]} />
    <meshStandardMaterial roughness={rough} />
  </mesh>;
}