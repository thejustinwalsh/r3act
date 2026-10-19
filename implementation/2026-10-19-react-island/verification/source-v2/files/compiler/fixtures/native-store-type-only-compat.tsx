import type { useStore } from "../native_runtime_api.ts";

export function StorePanel() {
  return <output>{String(useStore("global:count"))}</output>;
}
