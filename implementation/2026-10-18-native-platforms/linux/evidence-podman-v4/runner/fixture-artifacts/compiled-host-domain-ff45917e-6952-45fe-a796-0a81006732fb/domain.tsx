import { jsx } from "file:///workspace/r3act/src/native_runtime_api.ts";
export const trace = { sceneBodies: [], domBodies: [] };
export function Scene(props) {
  trace.sceneBodies.push(props.label + ":" + props.step);
  return <group key="root" name={props.label}>
    <mesh key="mesh" position-x={props.step} domainProbe={props.step} />
  </group>;
}
export function Dom(props) {
  trace.domBodies.push(props.step);
  return <output key="status" data-step={props.step}>step:{props.step}</output>;
}