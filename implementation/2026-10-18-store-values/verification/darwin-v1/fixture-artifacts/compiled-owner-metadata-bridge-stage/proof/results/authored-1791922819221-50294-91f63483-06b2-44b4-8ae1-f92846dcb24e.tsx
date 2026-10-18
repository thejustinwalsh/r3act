import { useState } from "file:///Users/tjw/Documents/Codex/2026-10-09/le/outputs/react-runtime-research/.cache/compiled-owner-metadata-bridge-stage/src/native_runtime_api.ts";
export const trace = { renders: 0, setValue: null };
export function Row() {
  trace.renders++;
  const [value, setValue] = useState(1);
  trace.setValue = setValue;
  return <button data-value={value} style={{ left: `${value}px` }} />;
}