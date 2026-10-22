import { useStore } from "../native_runtime_api.ts";

export function LegacyStoreReader({ source }: { source: string }) {
  return <output>{String(useStore(source))}</output>;
}
