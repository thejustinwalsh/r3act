import { useState } from "file:///Users/tjw/Documents/Codex/2026-10-09/le/outputs/react-runtime-research/src/native_runtime_api.ts";
export const controls: Record<number, {
  x: (value: number) => boolean;
  y: (value: number) => boolean;
  label: (value: string) => boolean;
}> = {};
export const trace = { renders: Array.from({ length: 32 }, () => 0), appRenders: 0 };
export let showLast: (value: boolean) => boolean;
const ids = Array.from({ length: 32 }, (_, index) => index);

export function Row({ id }: { id: number }) {
  trace.renders[id]++;
  const [x, setX] = useState(0);
  const [y, setY] = useState(0);
  const [label, setLabel] = useState("row-" + id);
  controls[id] = { x: setX, y: setY, label: setLabel };
  return <div data-row={id} data-x={x} data-y={y} data-sum={x + y}
    style={{ left: `${x}px`, top: `${y}px`, width: "7px" }}>{label}</div>;
}

export function App() {
  trace.appRenders++;
  const [visible, setVisible] = useState(true);
  showLast = setVisible;
  return <main>{ids.map(id => id === 31 && !visible ? null : <Row key={id} id={id} />)}</main>;
}