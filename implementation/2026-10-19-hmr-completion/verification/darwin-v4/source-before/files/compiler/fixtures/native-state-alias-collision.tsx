import { useState } from "native_runtime_api.ts";

const __nativeBindStatePropsAt = "user-owned binding";

export function Collision() {
  const [value] = useState(3);
  return <div data-value={value} />;
}
