import { useEffect, useState } from "file:///private/tmp/r3act-native-transfer-v2-3kH8UO/stagedroot/src/native_runtime_api.ts";
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