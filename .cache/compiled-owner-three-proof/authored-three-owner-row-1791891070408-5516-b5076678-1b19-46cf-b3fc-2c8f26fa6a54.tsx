import { useState } from "file:///Users/tjw/Documents/Codex/2026-10-09/le/outputs/react-runtime-research/src/native_runtime_api.ts";
export const trace = { renders: 0, controls: null };

export function SceneComponent() {
  trace.renders++;
  const [x, setX] = useState(0);
  const [y, setY] = useState(0);
  const [z, setZ] = useState(0);
  const [r, setR] = useState(0);
  const [rough, setRough] = useState(0.2);
  trace.controls = { x: setX, y: setY, z: setZ, r: setR, rough: setRough };
  return <mesh position={[x, y, z]} rotation={[r, 0, 0]}>
    <boxGeometry args={[1, 2, 3]} />
    <meshStandardMaterial roughness={rough} />
  </mesh>;
}