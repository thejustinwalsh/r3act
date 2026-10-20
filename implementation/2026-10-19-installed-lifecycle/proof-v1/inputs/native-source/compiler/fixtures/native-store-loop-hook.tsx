import { use } from "../native_runtime_api.ts";

export function StorePanel({ keys }: { keys: string[] }) {
  for (const key of keys) use(key);
  return <output />;
}
