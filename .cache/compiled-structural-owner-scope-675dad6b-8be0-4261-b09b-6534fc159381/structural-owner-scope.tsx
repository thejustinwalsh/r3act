/** @jsxRuntime classic */
/** @jsx jsx */
// @native-ui
import { createStore, storeRecord, use, useEffect, useState, jsx } from "file:///Volumes/Depot/Developer/r3act/src/native_runtime_api.ts";
export const clock = createStore(storeRecord({ phase: 0, epoch: 0 }));
export const trace = { childRenders: 0, controls: {}, cleanups: {}, clicks: {}, opaqueCalls: 0 };
export function opaque(value) { trace.opaqueCalls++; return value; }
export function DomMotion(props) {
  const frame = use(props.clock);
  return <div key="motion" data-phase={frame.phase} data-epoch={frame.epoch}>{props.children}</div>;
}
export function ThreeMotion(props) {
  const frame = use(props.clock);
  return <group key="motion" rotation-y={frame.phase * .42} rotation-z={frame.phase * .15}>{props.children}</group>;
}
export function Child(props) {
  trace.childRenders++;
  const [count, setCount] = useState(0);
  useEffect(() => {
    trace.controls[props.id] = setCount;
    return () => { if (trace.controls[props.id] === setCount) delete trace.controls[props.id];
      trace.cleanups[props.id] = (trace.cleanups[props.id] ?? 0) + 1; };
  });
  return <button key="child" data-id={props.id} data-count={count}
    onClick={() => { trace.clicks[props.id] = (trace.clicks[props.id] ?? 0) + 1; }}>child</button>;
}
export function OpaqueReader(props) {
  const frame = use(props.clock);
  return <i key="opaque" data-value={opaque(frame.phase)} />;
}
export function UnsafeChildren(props) {
  const child = props.children;
  const frame = use(props.clock);
  return <div key="unsafe" data-phase={frame.phase}>{child}</div>;
}
export function DomApp(props) {
  const names = props.reverse ? ["right", "left"] : ["left", "right"];
  const hosts = names.filter(id => id !== "left" || !props.omitLeft).map(id =>
    <div key={id === "right" && props.replaceRight ? "right-replaced" : id}>
      <DomMotion key="motion" clock={clock}>
        <Child key="child-owner" id={id} />
      </DomMotion>
    </div>);
  return <section key="scene">{[hosts]}</section>;
}
export function FallbackApp() {
  return <section key="fallback"><OpaqueReader key="opaque-reader" clock={clock} />
    <UnsafeChildren key="unsafe-reader" clock={clock}><b key="unsafe-child">unsafe</b></UnsafeChildren>
  </section>;
}
export function ThreeApp() {
  return <group key="scene">{["left", "right"].map(id =>
    <group key={id}><ThreeMotion key="motion" clock={clock}>
      {id === "left"
        ? <mesh key="retained" name="retained"><boxGeometry args={[1,1,1]} /><meshStandardMaterial color="orange" /></mesh>
        : <group key="retained" name="other-retained" />}
    </ThreeMotion></group>)}</group>;
}