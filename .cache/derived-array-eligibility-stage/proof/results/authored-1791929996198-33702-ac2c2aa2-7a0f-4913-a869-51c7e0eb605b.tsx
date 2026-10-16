import { useState } from "file:///Users/tjw/Documents/Codex/2026-10-09/le/outputs/react-runtime-research/.cache/derived-array-eligibility-stage/runtime/src/native_runtime_api.ts";
export const trace = { renders: 0, setValue: null };
function Row() {
  trace.renders++;
  const [x, setValue] = useState(1);
  trace.setValue = setValue;
  const parity = x % 2;
  return <mesh position={[x, parity, 0]} />;
}
export function App() { return <Row />; }