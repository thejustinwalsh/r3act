/** @jsxRuntime classic */
/** @jsx jsx */
// @native-ui
import { createStore, storeRecord, use, jsx } from "file:///Volumes/Depot/Developer/r3act/src/native_runtime_api.ts";
export const clock = createStore(storeRecord({ phase: 0 }));
export function Motion(props) {
  const frame = use(props.clock);
  return <group key="motion" rotation-y={frame.phase} position-x={frame.phase * 2}>{props.children}</group>;
}