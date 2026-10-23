/** @jsxRuntime classic */
/** @jsx jsx */
// @native-ui
import { createStore, storeRecord, use, useEffect, useState, jsx } from "file:///Volumes/Depot/Developer/r3act/src/native_runtime_api.ts";
export const clock = createStore(storeRecord({ phase: 0, epoch: 0 }));
export const trace = { controls: {}, cleanups: {}, childRenders: 0, clicks: 0 };
export function Motion(props) {
  const frame = use(props.clock);
  const [offset, setOffset] = useState(0);
  useEffect(() => { trace.controls[props.id] = setOffset;
    return () => { trace.cleanups[props.id] = (trace.cleanups[props.id] ?? 0) + 1;
      delete trace.controls[props.id]; }; });
  return <div key="motion" data-value={(frame.phase + offset) * 2 + frame.epoch}>{props.children}</div>;
}
export function Alternate(props) {
  const frame = use(props.clock);
  const [offset, setOffset] = useState(0);
  useEffect(() => { trace.controls[props.id] = setOffset;
    return () => { trace.cleanups[props.id] = (trace.cleanups[props.id] ?? 0) + 1;
      delete trace.controls[props.id]; }; });
  return <div key="motion" data-value={frame.phase + offset + frame.epoch}>{props.children}</div>;
}
export function Child(props) {
  trace.childRenders++;
  const [count] = useState(0);
  return <button key="child" data-id={props.id} data-count={count}
    onClick={() => { trace.clicks++; }}>child</button>;
}
export function DomApp(props) {
  return <section key="scene">{props.alternate
    ? <Alternate key="owner" id={props.id} clock={clock}><Child key={props.childKey} id={props.id} /></Alternate>
    : <Motion key="owner" id={props.id} clock={clock}><Child key={props.childKey} id={props.id} /></Motion>}
  </section>;
}
export function ThreeMotion(props) {
  const frame = use(props.clock);
  const [offset, setOffset] = useState(0);
  useEffect(() => { trace.controls.three = setOffset;
    return () => { trace.cleanups.three = (trace.cleanups.three ?? 0) + 1; }; });
  return <group key="motion" rotation-y={(frame.phase + offset) * .01 + frame.epoch * .001}>{props.children}</group>;
}
export function ThreeApp() {
  return <group key="scene"><ThreeMotion key="owner" clock={clock}>
    <mesh key="retained"><boxGeometry args={[1,1,1]} /><meshStandardMaterial color="orange" /></mesh>
  </ThreeMotion></group>;
}