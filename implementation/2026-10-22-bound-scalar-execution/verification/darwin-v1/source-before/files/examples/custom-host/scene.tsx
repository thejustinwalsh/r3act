/** @jsxImportSource @r3act/host-three */
// @native-ui
import { use } from "@r3act/core";
import type { StoreSource } from "@r3act/core";

export function ThreeApp(props: { stage: StoreSource<string> }) {
  const stage = use(props.stage);
  return <group key="scene" name="custom-host-scene">
    <group key="stage" name={`stage-${stage}`} />
  </group>;
}
