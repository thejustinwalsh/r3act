import { useStore as readStore } from "../native_runtime_api.ts";

export function StorePanel() {
  return <output>{String(readStore("global:count"))}</output>;
}
