import { useState as state } from "native_runtime_api.ts";
export function Counter() { const [count] = state(0); return <div>{count}</div>; }
