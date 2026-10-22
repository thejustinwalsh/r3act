/** @jsxRuntime classic */
/** @jsx jsx */
// @native-ui
import { createStore, storeRecord, use, useEffect, useState, jsx } from "file:///Volumes/Depot/Developer/r3act/src/native_runtime_api.ts";
export const clock = createStore(storeRecord({ phase: 0, epoch: 0 }));
export const trace = { controls: {}, cleanups: {}, renders: 0, clicks: 0, opaqueCalls: 0 };
export function opaque(value) { trace.opaqueCalls++; return value; }
export function Motion(props) {
  const frame = use(props.clock);
  return <div key="motion" data-a={((frame.phase + 1) * (frame.epoch + 2)) + 3}
    data-b={((frame.phase + 1) * (frame.epoch + 2)) - 4}
    data-sign={frame.phase * 1}>{props.children}</div>;
}
export function Alternate(props) {
  const frame = use(props.clock);
  return <div key="alternate" data-a={frame.phase * 2} data-b={frame.epoch + 7}>{props.children}</div>;
}
export function Child(props) {
  trace.renders++;
  const [count, setCount] = useState(0);
  useEffect(() => { trace.controls[props.id] = setCount;
    return () => { trace.cleanups[props.id] = (trace.cleanups[props.id] ?? 0) + 1; }; });
  return <button key="child" data-id={props.id} data-count={count}
    onClick={() => { trace.clicks++; }}>child</button>;
}
export function Opaque(props) {
  const frame = use(props.clock);
  return <i key="opaque" data-value={opaque(frame.phase)} />;
}
export function DomApp() {
  return <section key="scene">{["a", "b", "c", "d"].map(id =>
    <section key={id}>{id === "c"
      ? <Alternate key="motion" clock={clock}><Child key="child" id={id} /></Alternate>
      : <Motion key="motion" clock={clock}><Child key="child" id={id} /></Motion>}
    </section>)}</section>;
}
export function FallbackApp() { return <section><Opaque key="opaque-owner" clock={clock} /></section>; }
export function ThreeMotion(props) {
  const frame = use(props.clock);
  return <group key="motion" rotation-y={((frame.phase + 1) * (frame.epoch + 2)) * .01}
    rotation-z={((frame.phase + 1) * (frame.epoch + 2)) * .02}>{props.children}</group>;
}
export function ThreeApp() {
  return <group key="scene"><ThreeMotion key="motion" clock={clock}>
    <mesh key="retained"><boxGeometry args={[1,1,1]} /><meshStandardMaterial color="orange" /></mesh>
  </ThreeMotion></group>;
}