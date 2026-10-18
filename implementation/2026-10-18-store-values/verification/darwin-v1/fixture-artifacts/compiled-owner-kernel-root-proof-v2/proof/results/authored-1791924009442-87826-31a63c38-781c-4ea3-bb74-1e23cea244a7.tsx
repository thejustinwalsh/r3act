import { useState } from "file:///Users/tjw/Documents/Codex/2026-10-09/le/outputs/react-runtime-research/.cache/compiled-owner-kernel-root-proof-v2/src/native_runtime_api.ts";
export const trace = { renders: { a: 0, b: 0 }, setters: { a: null, b: null } };
function Row({ id, initial }) {
  trace.renders[id]++;
  const [value, setValue] = useState(initial);
  trace.setters[id] = setValue;
  return <output data-parity={value % 2} style={{ left: `${value % 2}px` }} />;
}
export function App() {
  return <main><Row id="a" initial={1} /><Row id="b" initial={1} /></main>;
}