import { createStore, use, useEffect, useState } from "@compiled-ui/runtime";

export const buildToken = "v1";
export const labelStore = createStore("ready");
export const lifecycle = { activeEffects: 0, setups: 0, cleanups: 0 };

export function NativePanel({ label }: { label: string }) {
  const [count, setCount] = useState(0);
  const storeValue = use(labelStore);
  useEffect(() => {
    lifecycle.activeEffects++;
    lifecycle.setups++;
    return () => {
      lifecycle.activeEffects--;
      lifecycle.cleanups++;
    };
  });
  return <button data-native-panel={label} onClick={() => setCount((value) => value + 1)}>{buildToken}:{label}:{storeValue}:{count}</button>;
}
