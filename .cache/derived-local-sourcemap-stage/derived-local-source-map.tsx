// 🧭 UTF-8 prefix; Rust byte offsets must map to JavaScript UTF-16 columns.
import { useState } from "file:///Users/tjw/Documents/Codex/2026-10-09/le/outputs/react-runtime-research/src/native_runtime_api.ts";

export function DerivedRow() {
  const [value] = useState(4);
  const parity = value % 2;
  const label = parity + 10;
  return <div data-parity={parity} data-label={label} data-tail="sentinel" />;
}

export const untouchedTail = "tail-after-component";
