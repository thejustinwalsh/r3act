import { useState } from "native_runtime_api.ts";
export function Counter() { const make = () => useState(0); const [count] = make(); return <div>{count}</div>; }
