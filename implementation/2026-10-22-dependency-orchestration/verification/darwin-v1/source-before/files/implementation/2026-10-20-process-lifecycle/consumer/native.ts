import { mountNative } from "./native_arm.tsx";
import { installAuthoredLifecycle } from "./entry.ts";

const entryBodyStartedAtMs = performance.now();
installAuthoredLifecycle("native", mountNative);
const lifecycle = window.__authoredLifecycle;
if (!lifecycle) throw new Error("Native lifecycle API missing after installation");
lifecycle.mount("native");
const mountedAtMs = performance.now();
const initial = lifecycle.inspect();
if (initial.arm !== "native" || initial.rows.length !== 256 ||
    initial.rows.some((row, id) => row.id !== id || row.step !== "0" || row.local !== "0"))
  throw new Error("Native startup did not publish the initial 256 rows");
Object.assign(window, {
  __r3actStartupReady: { arm: "native", ready: true, entryBodyStartedAtMs, mountedAtMs },
});
