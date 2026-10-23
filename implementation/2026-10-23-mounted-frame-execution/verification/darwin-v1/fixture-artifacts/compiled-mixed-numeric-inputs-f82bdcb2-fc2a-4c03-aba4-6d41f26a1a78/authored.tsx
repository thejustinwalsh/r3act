/** @jsxRuntime classic */
/** @jsx jsx */
// @native-ui
import { createStore, storeRecord, use, useEffect, useState, jsx } from "file:///Volumes/Depot/Developer/r3act/src/native_runtime_api.ts";
export const clock = createStore(storeRecord({ phase: 0, epoch: 0 }));
export const tuning = createStore(storeRecord({ gain: 2 }));
export const trace = { controls: {}, childControls: {}, cleanups: {}, activations: {}, renders: 0, clicks: 0, opaqueCalls: 0 };
export function opaque(value) { trace.opaqueCalls++; return value; }
export function Motion(props) {
  const frame = use(props.clock);
  const tune = use(props.tuning);
  const [offset, setOffset] = useState(0);
  const [trim, setTrim] = useState(1);
  useEffect(() => { trace.controls[props.id] = { offset: setOffset, trim: setTrim };
    trace.activations[props.id] = (trace.activations[props.id] ?? 0) + 1;
    return () => { trace.cleanups[props.id] = (trace.cleanups[props.id] ?? 0) + 1;
      delete trace.controls[props.id]; }; });
  const shared = (frame.phase + offset) * (tune.gain + trim);
  return <div key="motion" data-a={shared + frame.epoch} data-b={shared - trim}
    data-sign={offset * 1}>{props.children}</div>;
}
export const Alternate = props => {
  const frame = use(props.clock);
  const tune = use(props.tuning);
  const [offset, setOffset] = useState(0);
  useEffect(() => { trace.controls[props.id] = { offset: setOffset };
    trace.activations[props.id] = (trace.activations[props.id] ?? 0) + 1;
    return () => { trace.cleanups[props.id] = (trace.cleanups[props.id] ?? 0) + 1;
      delete trace.controls[props.id]; }; });
  return <div key="alternate" data-a={frame.phase * tune.gain + offset}
    data-b={frame.epoch + offset}>{props.children}</div>;
};
export function Child(props) {
  trace.renders++;
  const [count, setCount] = useState(0);
  useEffect(() => { trace.childControls[props.id] = setCount; });
  return <button key="child" data-id={props.id} data-count={count}
    onClick={() => { trace.clicks++; }}>child</button>;
}
export function Opaque(props) {
  const frame = use(props.clock);
  const [offset] = useState(0);
  return <i key="opaque" data-value={opaque(frame.phase + offset)} />;
}
export function DomApp() {
  return <section key="scene">{["a", "b", "c", "d"].map(id =>
    <section key={id}>{id === "c"
      ? <Alternate key="motion" id={id} clock={clock} tuning={tuning}><Child key="child" id={id} /></Alternate>
      : <Motion key="motion" id={id} clock={clock} tuning={tuning}><Child key="child" id={id} /></Motion>}
    </section>)}</section>;
}
export function FallbackApp() { return <section><Opaque key="opaque-owner" clock={clock} /></section>; }
export function ThreeMotion(props) {
  const frame = use(props.clock);
  const [offset, setOffset] = useState(0);
  useEffect(() => { trace.controls.three = { offset: setOffset }; return () => { trace.cleanups.three = (trace.cleanups.three ?? 0) + 1; }; });
  return <group key="motion" rotation-y={(frame.phase + offset) * .01}
    rotation-z={(frame.epoch + offset) * .02}>{props.children}</group>;
}
export function ThreeApp() {
  return <group key="scene"><ThreeMotion key="motion" clock={clock}>
    <mesh key="retained"><boxGeometry args={[1,1,1]} /><meshStandardMaterial color="orange" /></mesh>
  </ThreeMotion></group>;
}