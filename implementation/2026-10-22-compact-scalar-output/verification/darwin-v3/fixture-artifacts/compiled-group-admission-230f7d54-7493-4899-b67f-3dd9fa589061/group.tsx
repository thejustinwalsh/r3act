import { jsx } from "file:///Volumes/Depot/Developer/r3act/src/native_runtime_api.ts";
export function Scene(props) {
  return <group key="scene"><mesh key="mesh" position-x={props.step} /></group>;
}
export function Dom(props) {
  return <output key="status" data-step={props.step}>step:{props.step}</output>;
}