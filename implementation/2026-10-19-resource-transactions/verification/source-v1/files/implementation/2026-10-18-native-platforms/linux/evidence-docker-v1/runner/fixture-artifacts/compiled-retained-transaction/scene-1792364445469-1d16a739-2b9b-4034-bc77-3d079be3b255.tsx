import { useState } from "file:///workspace/r3act/src/native_runtime_api.ts";
export const trace = { renders: 0, controls: {} };
export function Scene() {
  trace.renders++;
  const [position, setPosition] = useState(1);
  const [camera, setCamera] = useState(10);
  const [health, setHealth] = useState(100);
  trace.controls = { position: setPosition, camera: setCamera, health: setHealth };
  return <output data-position={position} data-joint={position + camera}
    data-conditional={position ? camera : 0} data-label={`x=${position}`}
    data-health={health} />;
}