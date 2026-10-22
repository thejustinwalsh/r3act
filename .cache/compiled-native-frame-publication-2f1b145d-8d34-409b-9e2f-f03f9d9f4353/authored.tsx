/** @jsxRuntime classic */
/** @jsx jsx */
// @native-ui
import { Suspense, createStore, storeRecord, use, useEffect, useState, jsx } from "file:///Volumes/Depot/Developer/r3act/src/native_runtime_api.ts";
export const clock = createStore(storeRecord({ phase: 0, epoch: 0 }));
export const trace = { childRenders: 0, childSetter: null, clicks: 0 };
export function DomMotion(props) {
  const frame = use(props.clock);
  return <div key="motion" data-phase={frame.phase} data-epoch={frame.epoch}>{props.children}</div>;
}
export function ThreeMotion(props) {
  const frame = use(props.clock);
  return <group key="motion" rotation-y={frame.phase * .125} rotation-z={frame.epoch * .25}>{props.children}</group>;
}
export function Child() {
  trace.childRenders++;
  const [count, setCount] = useState(0);
  useEffect(() => { trace.childSetter = setCount; });
  return <button key="child" data-count={count} onClick={() => trace.clicks++}>child</button>;
}
export function DomApp() {
  return <section key="scene"><DomMotion clock={clock}><Child key="retained" /></DomMotion></section>;
}
export function ThreeApp() {
  return <group key="scene"><ThreeMotion clock={clock}>
    <mesh key="retained"><boxGeometry args={[1,1,1]} /><meshStandardMaterial color="orange" /></mesh>
  </ThreeMotion></group>;
}
export function Independent() {
  const [count, setCount] = useState(0);
  useEffect(() => { trace.independentSetter = setCount; });
  return <output key="independent" data-count={count} />;
}
export function ResourceView(props) {
  const value = use(props.resource);
  return <output key="resource" data-value={value} />;
}
export function ResourceApp(props) {
  return <Suspense fallback={<output key="resource" data-value="waiting" />}>
    <ResourceView key="reader" resource={props.resource} />
  </Suspense>;
}
