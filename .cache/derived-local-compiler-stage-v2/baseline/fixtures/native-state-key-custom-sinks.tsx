import { useState } from "native_runtime_api.ts";
function Child({ value }: { value: number }) { return <span>{value}</span>; }
export function KeyOwner() { const [key] = useState(1); return <div key={key} />; }
export function CustomOwner() { const [value] = useState(2); return <Child value={value} />; }
