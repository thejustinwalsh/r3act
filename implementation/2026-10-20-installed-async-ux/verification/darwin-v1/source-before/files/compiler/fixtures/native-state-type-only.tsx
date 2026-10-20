import type { useState } from "native_runtime_api.ts";
export function Counter() { const [count] = useState(0); return <div>{count}</div>; }
