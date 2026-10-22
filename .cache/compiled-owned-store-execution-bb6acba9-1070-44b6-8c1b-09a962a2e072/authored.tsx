/** @jsxRuntime classic */
/** @jsx jsx */
// @native-ui
import { createStore, storeRecord, use, jsx } from "file:///Volumes/Depot/Developer/r3act/src/native_runtime_api.ts";
export const clock = createStore(storeRecord({ phase: 0 }));
export function Data(props) {
  const frame = use(props.clock);
  return <group key="data" name="renamed-phase-anchor" position-x={frame.phase * 2} />;
}