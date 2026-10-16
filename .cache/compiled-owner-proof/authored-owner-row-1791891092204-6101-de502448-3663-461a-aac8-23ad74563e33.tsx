import { createKeyedCollection, useState } from "file:///Users/tjw/Documents/Codex/2026-10-09/le/outputs/react-runtime-research/src/native_runtime_api.ts";
export const rows = createKeyedCollection([{ id: "a" }, { id: "b" }], row => row.id);
export const trace = { renders: {}, controls: {}, candidateMutationKey: null, candidateMutations: 0 };

export function Row({ row }) {
  trace.renders[row.id] = (trace.renders[row.id] ?? 0) + 1;
  const [x, setX] = useState(0);
  const [y, setY] = useState(0);
  const [z, setZ] = useState(0);
  trace.controls[row.id] = { x: setX, y: setY, z: setZ };
  if (trace.candidateMutationKey === row.id) {
    trace.candidateMutations++;
    setX(999);
  }
  return <i data-row={row.id} position={[z, x, y]} data-repeat={x + x} style={{
    left: `${x}px`,
    top: `${y}px`,
    opacity: z,
  }} />;
}

export function Board() {
  return <ul>{rows.map(row => <Row key={row.id} row={row} />)}</ul>;
}