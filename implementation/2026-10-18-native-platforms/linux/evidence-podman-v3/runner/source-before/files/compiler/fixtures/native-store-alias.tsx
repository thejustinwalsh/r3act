import { use as useSharedStore } from "../native_runtime_api.ts";

export function StorePanel() {
  return <output>{String(useSharedStore("global:count"))}</output>;
}
