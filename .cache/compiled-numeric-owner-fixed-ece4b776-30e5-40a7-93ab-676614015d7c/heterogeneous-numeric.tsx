/** @jsxRuntime classic */
/** @jsx jsx */
// @native-ui
import { jsx, useEffect, useState } from "file:///Volumes/Depot/Developer/r3act/src/native_runtime_api.ts";
export const trace = { ax: null, ay: null, bx: null, by: null, genericAx: null,
  genericAy: null, genericBx: null, genericBy: null };
function opaque(value) { return value; }
export function NumericA() {
  const [x, setX] = useState(0);
  const [y, setY] = useState(0);
  useEffect(() => { trace.ax = setX; trace.ay = setY; });
  return <output key="numeric-a" data-a-sum={x + y} data-a-x={x} />;
}
export function NumericB() {
  const [x, setX] = useState(0);
  const [y, setY] = useState(0);
  useEffect(() => { trace.bx = setX; trace.by = setY; });
  return <output key="numeric-b" data-b-difference={x - y} data-b-x={x} />;
}
export function GenericA() {
  const [x, setX] = useState(0);
  const [y, setY] = useState(0);
  useEffect(() => { trace.genericAx = setX; trace.genericAy = setY; });
  return <output key="generic-a" data-a-sum={opaque(x + y)} data-a-x={opaque(x)} />;
}
export function GenericB() {
  const [x, setX] = useState(0);
  const [y, setY] = useState(0);
  useEffect(() => { trace.genericBx = setX; trace.genericBy = setY; });
  return <output key="generic-b" data-b-difference={opaque(x - y)} data-b-x={opaque(x)} />;
}
export function NumericApp() { return <main key="numeric-root"><NumericA key="a" /><NumericB key="b" /></main>; }
export function GenericApp() { return <main key="generic-root"><GenericA key="a" /><GenericB key="b" /></main>; }
