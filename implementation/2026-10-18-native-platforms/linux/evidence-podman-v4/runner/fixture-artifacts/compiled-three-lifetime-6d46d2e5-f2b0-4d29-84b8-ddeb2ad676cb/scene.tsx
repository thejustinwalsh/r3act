/** @jsxRuntime classic */
/** @jsx jsx */
// @native-ui
import { jsx } from "file:///workspace/r3act/src/native_runtime_api.ts";
export function Scene(props) {
  return <group key="group" name={props.label}>
    <mesh key="main" position-x={props.phase} failPhase={props.phase}>
      {props.show ? <sharedGeometry key="geometry" /> : null}
      {props.show ? <sharedMaterial key="material" /> : null}
    </mesh>
    <mesh key="borrowed"><primitive key="borrowed-geometry" object={props.borrowed} attach="geometry" /></mesh>
  </group>;
}
export function Dom(props) { return <output key="status" data-phase={props.phase}>phase:{props.phase}</output>; }
