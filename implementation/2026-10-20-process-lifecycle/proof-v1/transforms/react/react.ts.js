import { mountReact } from "./react_arm.tsx";
import { installAuthoredLifecycle } from "./entry.ts";
const entryBodyStartedAtMs = performance.now();
installAuthoredLifecycle("react", mountReact);
const lifecycle = window.__authoredLifecycle;
if (!lifecycle) throw new Error("React lifecycle API missing after installation");
lifecycle.mount("react");
const mountedAtMs = performance.now();
const initial = lifecycle.inspect();
if (initial.arm !== "react" || initial.rows.length !== 256 || initial.rows.some((row, id) => row.id !== id || row.step !== "0" || row.local !== "0")) throw new Error("React startup did not publish the initial 256 rows");
Object.assign(window, { __r3actStartupReady: {
	arm: "react",
	ready: true,
	entryBodyStartedAtMs,
	mountedAtMs
} });
