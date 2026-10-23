/** @jsxImportSource @r3act/core */
// @native-ui
import { jsx, use, type StoreSource } from '@r3act/core';
export function Hud(props: { ticks: StoreSource<number> }) {
  const tick = use(props.ticks);
  return <output key="hud" data-tick={tick} />;
}
