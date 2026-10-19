import { c as _c } from "react/compiler-runtime";
import { createRoot } from "react-dom/client";
import { Suspense, use, useLayoutEffect, useSyncExternalStore } from "react";
import { flushSync } from "react-dom";
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
function deferred() {
	let resolve;
	const promise = new Promise((done) => {
		resolve = done;
	});
	return {
		promise,
		resolve
	};
}
const a = deferred(), b = deferred(), health = deferred();
const together = Promise.all([a.promise, b.promise]);
const life = {
	a: {
		mounts: 0,
		cleanups: 0
	},
	b: {
		mounts: 0,
		cleanups: 0
	}
};
const payload = (x, y) => Object.freeze({ sample: Object.freeze({
	x,
	y
}) });
let point = Object.freeze({ point: Object.freeze({ x: 1 }) });
const listeners = new Set();
const position = {
	getSnapshot: () => point,
	subscribe(listener) {
		listeners.add(listener);
		return () => {
			listeners.delete(listener);
		};
	}
};
function A() {
	const $ = _c(3);
	const [value] = use(together);
	const current = useSyncExternalStore(position.subscribe, position.getSnapshot);
	const t0 = value.sample.x + current.point.x;
	let t1;
	if ($[0] !== t0 || $[1] !== value.sample.y) {
		t1 = /* @__PURE__ */ _jsx("output", {
			"data-ready": "a",
			"data-value": t0,
			children: value.sample.y
		});
		$[0] = t0;
		$[1] = value.sample.y;
		$[2] = t1;
	} else {
		t1 = $[2];
	}
	return t1;
}
function B() {
	const $ = _c(3);
	const [, value] = use(together);
	let t0;
	if ($[0] !== value.sample.x || $[1] !== value.sample.y) {
		t0 = /* @__PURE__ */ _jsx("output", {
			"data-ready": "b",
			"data-value": value.sample.x,
			children: value.sample.y
		});
		$[0] = value.sample.x;
		$[1] = value.sample.y;
		$[2] = t0;
	} else {
		t0 = $[2];
	}
	return t0;
}
function C() {
	const $ = _c(2);
	const value = use(health.promise);
	let t0;
	if ($[0] !== value) {
		t0 = /* @__PURE__ */ _jsx("span", { "data-health": value });
		$[0] = value;
		$[1] = t0;
	} else {
		t0 = $[1];
	}
	return t0;
}
function Fallback(props) {
	const $ = _c(5);
	let t0;
	if ($[0] !== props.slot) {
		t0 = () => {
			life[props.slot].mounts = life[props.slot].mounts + 1;
			return () => {
				life[props.slot].cleanups = life[props.slot].cleanups + 1;
			};
		};
		$[0] = props.slot;
		$[1] = t0;
	} else {
		t0 = $[1];
	}
	let t1;
	if ($[2] === Symbol.for("react.memo_cache_sentinel")) {
		t1 = [];
		$[2] = t1;
	} else {
		t1 = $[2];
	}
	useLayoutEffect(t0, t1);
	let t2;
	if ($[3] !== props.slot) {
		t2 = /* @__PURE__ */ _jsx("output", { "data-waiting": props.slot });
		$[3] = props.slot;
		$[4] = t2;
	} else {
		t2 = $[4];
	}
	return t2;
}
function Urgent() {
	const $ = _c(2);
	const value = useSyncExternalStore(position.subscribe, position.getSnapshot);
	let t0;
	if ($[0] !== value.point.x) {
		t0 = /* @__PURE__ */ _jsx("output", { "data-urgent": value.point.x });
		$[0] = value.point.x;
		$[1] = t0;
	} else {
		t0 = $[1];
	}
	return t0;
}
function App() {
	const $ = _c(3);
	let t0;
	if ($[0] === Symbol.for("react.memo_cache_sentinel")) {
		t0 = /* @__PURE__ */ _jsx(Suspense, {
			fallback: /* @__PURE__ */ _jsx(Fallback, { slot: "a" }),
			children: /* @__PURE__ */ _jsx(A, {})
		});
		$[0] = t0;
	} else {
		t0 = $[0];
	}
	let t1;
	if ($[1] === Symbol.for("react.memo_cache_sentinel")) {
		t1 = /* @__PURE__ */ _jsx(Suspense, {
			fallback: /* @__PURE__ */ _jsx(Fallback, { slot: "b" }),
			children: /* @__PURE__ */ _jsx(B, {})
		});
		$[1] = t1;
	} else {
		t1 = $[1];
	}
	let t2;
	if ($[2] === Symbol.for("react.memo_cache_sentinel")) {
		t2 = /* @__PURE__ */ _jsxs("main", { children: [
			t0,
			t1,
			/* @__PURE__ */ _jsx(Suspense, {
				fallback: /* @__PURE__ */ _jsx("span", { "data-health": "waiting" }),
				children: /* @__PURE__ */ _jsx(C, {})
			}),
			/* @__PURE__ */ _jsx(Urgent, {})
		] });
		$[2] = t2;
	} else {
		t2 = $[2];
	}
	return t2;
}
export function mountReact(host) {
	const root = createRoot(host);
	const mountStart = performance.now();
	flushSync(() => root.render(/* @__PURE__ */ _jsx(App, {})));
	const mountMs = performance.now() - mountStart;
	return {
		mountMs,
		settleA() {
			a.resolve(payload(3, 4));
		},
		settleB() {
			b.resolve(payload(5, 6));
		},
		settleHealth() {
			health.resolve("healthy");
		},
		updateUrgent() {
			flushSync(() => {
				point = Object.freeze({ point: Object.freeze({ x: 7 }) });
				for (const listener of [...listeners]) listener();
			});
		},
		state() {
			return {
				life: structuredClone(life),
				callbackCount: null,
				callbackView: null,
				queueStatus: null,
				listeners: listeners.size
			};
		},
		dispose() {
			flushSync(() => root.unmount());
			return {
				disposed: true,
				listeners: listeners.size
			};
		}
	};
}
