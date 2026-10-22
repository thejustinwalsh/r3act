import type { use } from "../native_runtime_api.ts";

export function StorePanel() {
  return <output>{String(use("global:count"))}</output>;
}
