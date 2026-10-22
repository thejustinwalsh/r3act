import { useEffect, useState } from "file:///Volumes/Depot/Developer/r3act/src/native_runtime_api.ts";
export const trace = { controls: {}, activations: 0 };
export function Scene() {
  const [position, setPosition] = useState(1);
  const [camera, setCamera] = useState(10);
  const [health, setHealth] = useState(100);
  useEffect(() => { trace.controls = { position: setPosition, camera: setCamera, health: setHealth }; trace.activations++; });
  return <output data-position={position} data-joint={position + camera}
    data-conditional={position ? camera : 0} data-label={`x=${position}`}
    data-health={health} />;
}