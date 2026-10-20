/** @jsxImportSource @r3act/host-three */
// @native-ui
import { use } from "file:///private/tmp/r3act-native-transfer-v2-3kH8UO/stagedroot/src/native_runtime_api.ts";
import type { StoreSource } from "file:///private/tmp/r3act-native-transfer-v2-3kH8UO/stagedroot/src/native_runtime_api.ts";

export function ThreeApp(props: { stage: StoreSource<string> }) {
  const stage = use(props.stage);
  return <group key="scene" name="custom-host-scene">
    <group key="stage" name={`stage-${stage}`} />
  </group>;
}
