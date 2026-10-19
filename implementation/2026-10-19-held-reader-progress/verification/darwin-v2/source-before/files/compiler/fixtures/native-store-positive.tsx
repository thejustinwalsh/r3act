// @native-ui
import { use } from "../native_runtime_api.ts";

export function StorePanel({ source, enabled }: { source: string; enabled: boolean }) {
  if (enabled) {
    const value = use(source);
    return <output>{String(value)}</output>;
  }
  const fallback = use("global:fallback");
  return <output>{String(fallback)}</output>;
}

export function MultipleStores({ keyName }: { keyName: string }) {
  const first = use(`user:${keyName}`);
  const second = use({ key: keyName });
  return <output>{String(first)}:{String(second)}</output>;
}
