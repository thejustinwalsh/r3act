import { useState, use } from "../native_runtime_api.ts";

export function StoreBackedAttribute() {
  const [key] = useState(3);
  return <output data-value={use(key)} />;
}
