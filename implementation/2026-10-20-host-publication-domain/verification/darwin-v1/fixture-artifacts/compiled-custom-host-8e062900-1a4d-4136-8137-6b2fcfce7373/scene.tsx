/** @jsxImportSource @r3act/host-three */
// @native-ui
import { use } from "file:///Volumes/Depot/Developer/r3act/src/native_runtime_api.ts";
import type { StoreSource } from "file:///Volumes/Depot/Developer/r3act/src/native_runtime_api.ts";

export function ThreeApp(props: { stage: StoreSource<string> }) {
  const stage = use(props.stage);
  return <group key="scene" name="custom-host-scene">
    <group key="stage" name={`stage-${stage}`} />
  </group>;
}
