/** @jsxRuntime classic */
/** @jsx jsx */
// @native-ui
import { createStore, storeRecord, use, useEffect, useState, jsx } from "file:///Volumes/Depot/Developer/r3act/src/native_runtime_api.ts";
export const clock = createStore(storeRecord({ phase: 0, epoch: 0 }));
export const trace = { childRenders: 0, setChild: null, clicks: 0, opaqueCalls: 0 };
export function opaque(value) { trace.opaqueCalls++; return value; }
export function DomMotion(props) {
  const frame = use(props.clock);
  return <div key="motion" data-phase={frame.phase} data-epoch={frame.epoch}>{props.children}</div>;
}
export function ThreeMotion(props) {
  const frame = use(props.clock);
  return <group key="motion" rotation-y={frame.phase * .42} rotation-z={frame.phase * .15}>{props.children}</group>;
}
export function Child() {
  trace.childRenders++;
  const [count, setCount] = useState(0);
  useEffect(() => { trace.setChild = setCount; });
  return <button key="child" data-count={count} onClick={() => { trace.clicks++; }}>child</button>;
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
export function DomApp() {
  return <section key="scene"><div key="left"><DomMotion key="motion" clock={clock}><Child key="child-owner" /></DomMotion></div>
    <div key="right"><DomMotion key="motion" clock={clock}><span key="stable">stable</span></DomMotion></div>
  </section>;
}
export function FallbackApp() {
  return <section key="fallback"><OpaqueReader key="opaque-reader" clock={clock} />
    <UnsafeChildren key="unsafe-reader" clock={clock}><b key="unsafe-child">unsafe</b></UnsafeChildren>
  </section>;
}
export function ThreeApp() {
  return <group key="scene"><group key="left"><ThreeMotion key="motion" clock={clock}>
    <mesh key="retained" name="retained"><boxGeometry args={[1,1,1]} /><meshStandardMaterial color="orange" /></mesh>
  </ThreeMotion></group><group key="right"><ThreeMotion key="motion" clock={clock}>
    <group key="retained" name="other-retained" />
  </ThreeMotion></group></group>;
}