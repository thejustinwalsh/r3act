import { useState } from "native_runtime_api.ts";
export function Counter() { for (let i = 0; i < 2; i++) useState(i); return <div />; }
