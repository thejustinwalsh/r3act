import { useState } from "file:///Users/tjw/Documents/Codex/2026-10-09/le/outputs/react-runtime-research/.cache/derived-local-compiler-stage-v2/runtime/src/native_runtime_api.ts";
export const trace = { renders: { a: 0, b: 0 }, setters: { a: null, b: null } };
function Row({ id }) {
  trace.renders[id]++;
  const [value, setValue] = useState(1);
  trace.setters[id] = setValue;
  const parity = value % 2;
  const offset = 2;
  const doubled = parity * offset;
  const label = `parity=${parity}; doubled=${doubled}`;
  return <output data-parity={parity} data-double={doubled} data-label={label} style={{ left: `${parity}px` }} />;
}
export function App() {
  return <main><Row id="a" /><Row id="b" /></main>;
}