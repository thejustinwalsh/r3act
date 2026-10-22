import { useState } from "native_runtime_api.ts";
export function Parent() {
  function Child() { const [value] = useState(1); return <div>{value}</div>; }
  return <Child />;
}
