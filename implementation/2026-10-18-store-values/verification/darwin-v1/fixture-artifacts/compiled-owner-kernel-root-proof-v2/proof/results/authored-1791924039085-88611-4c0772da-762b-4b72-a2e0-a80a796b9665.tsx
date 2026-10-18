import { useState } from "file:///Users/tjw/Documents/Codex/2026-10-09/le/outputs/react-runtime-research/.cache/compiled-owner-kernel-root-proof-v2/src/native_runtime_api.ts";
export const trace = { renders: { a: 0, b: 0 }, setters: { a: null, b: null } };
function Row({ id }) {
  trace.renders[id]++;
  const [value, setValue] = useState(1);
  trace.setters[id] = setValue;
  const parity = value % 2;
  return <output data-parity={parity} style={{ left: `${parity}px` }} />;
}
export function App() {
  return <main><Row id="a" /><Row id="b" /></main>;
}