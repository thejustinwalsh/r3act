/** @jsxRuntime classic */
/** @jsx jsx */
// @native-ui
import { createStore, storeRecord, use, useState, useEffect, jsx } from "file:///Volumes/Depot/Developer/r3act/src/native_runtime_api.ts";
export const clock = createStore(storeRecord({ phase: 0 }));
export const replacementClock = createStore(storeRecord({ phase: 20 }));
export const controls = {};
export function Motion(props) {
  const frame = use(props.clock);
  const [offset, setOffset] = useState(0);
  useEffect(() => { controls[props.id] = setOffset; return () => { delete controls[props.id]; }; });
  return <group key="motion" position-z={0.5} position-x={frame.phase * 2 + offset}>{props.children}</group>;
}
export function Alternate(props) {
  const frame = use(props.clock);
  const [offset, setOffset] = useState(0);
  useEffect(() => { controls[props.id] = setOffset; return () => { delete controls[props.id]; }; });
  return <group key="motion" position-z={0.5} position-x={frame.phase * 3 + offset}>{props.children}</group>;
}
export function Marker(props) {
  const frame = use(props.clock);
  return <group key="marker" name="accepted-bound-frame" visible={true} position-z={0.5} position-x={frame.phase} />;
}