import { useEffect, useState } from "file:///Volumes/Depot/Developer/r3act/src/native_runtime_api.ts";
export const trace = { controls: {}, opaqueControls: {}, threeControl: null, opaqueCalls: 0 };
export function opaque(value) { trace.opaqueCalls++; return value; }
export function Row({ id }) {
  const [x, setX] = useState(0);
  const [y, setY] = useState(0);
  useEffect(() => { trace.controls[id] = { x: setX, y: setY }; });
  const shared = (x + 1) * (y + 2);
  return <i data-row={id} data-a={shared + 3} data-b={shared - 4}
    data-c={shared * 5} data-sign={x * 1}
    data-text={`${shared}px`} data-branch={x > 0 ? `${shared}!` : "low"} />;
}
export function Opaque() {
  const [value, setValue] = useState(0);
  useEffect(() => { trace.opaqueControls.value = setValue; });
  const result = opaque(value);
  return <i data-row="opaque" data-result={result} />;
}
export function Board() {
  return <section><Row key="a" id="a" /><Row key="b" id="b" /><Opaque key="opaque" /></section>;
}
export function SceneComponent() {
  const [x, setX] = useState(0);
  useEffect(() => { trace.threeControl = setX; });
  const shared = (x + 1) * (x + 2);
  return <mesh position={[x, 0, 0]}><boxGeometry args={[1, 1, 1]} />
    <meshStandardMaterial roughness={shared * 0.1} metalness={shared * 0.01} />
  </mesh>;
}