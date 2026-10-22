import { useEffect, useState } from "file:///Volumes/Depot/Developer/r3act/src/native_runtime_api.ts";
export const trace = { position: {}, rotation: {}, opaque: null, scene: null, opaqueCalls: 0 };
export function opaque(value) { trace.opaqueCalls++; return value; }
export function Position({ id }) {
  const [x, setX] = useState(0);
  const [y, setY] = useState(0);
  useEffect(() => { trace.position[id] = { x: setX, y: setY }; });
  const shared = (x + 1) * (y + 2);
  return <i data-row={id} data-a={shared + 3} data-b={shared * 2} data-sign={x * 1} />;
}
export function Rotation({ id }) {
  const [angle, setAngle] = useState(0);
  useEffect(() => { trace.rotation[id] = setAngle; });
  const shared = (angle + 1) * (angle + 2);
  return <i data-row={id} data-r={shared + 1} data-s={shared * 2} data-angle={angle * 1} />;
}
export function Opaque() {
  const [value, setValue] = useState(0);
  useEffect(() => { trace.opaque = setValue; });
  return <i data-row="opaque" data-value={opaque(value)} />;
}
export function Board() {
  return <section><Position key="p0" id="p0" /><Rotation key="r0" id="r0" />
    <Position key="p1" id="p1" /><Rotation key="r1" id="r1" /><Opaque key="opaque" /></section>;
}
export function Scene() {
  const [x, setX] = useState(0);
  useEffect(() => { trace.scene = setX; });
  return <mesh position={[x, 0, 0]}><boxGeometry args={[1, 1, 1]} />
    <meshStandardMaterial roughness={x * 0.1} /></mesh>;
}