/** @jsxImportSource @r3act/core */
// @native-ui
import { jsx, use, type StoreSource } from "file:///Volumes/Depot/Developer/r3act/src/native_runtime_api.ts";
export function Hud(props: { ticks: StoreSource<number> }) {
  const tick = use(props.ticks);
  return <output key="hud" data-tick={tick} />;
}
