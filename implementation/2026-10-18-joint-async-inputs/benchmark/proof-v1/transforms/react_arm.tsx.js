import { c as _c } from "react/compiler-runtime";
import { createRoot } from "react-dom/client";
import { Suspense, use, useLayoutEffect, useState, useSyncExternalStore } from "react";
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
const first = deferred(), second = deferred(), health = deferred();
const fallbackLife = {
	mounts: 0,
	cleanups: 0
};
const payload = (x, y) => Object.freeze({ offset: Object.freeze({
	x,
	y
}) });
const positionState = (x) => Object.freeze({ position: Object.freeze({ x }) });
let currentPosition = positionState(1);
const listeners = new Set();
const position = {
	getSnapshot: () => currentPosition,
	subscribe(listener) {
		listeners.add(listener);
		return () => {
			listeners.delete(listener);
		};
	}
};
function Health(props) {
	const $ = _c(2);
	const value = use(props.resource);
	let t0;
	if ($[0] !== value) {
		t0 = /* @__PURE__ */ _jsx("div", {
			"data-health": "ready",
			children: value
		});
		$[0] = value;
		$[1] = t0;
	} else {
		t0 = $[1];
	}
	return t0;
}
function Fallback() {
	const $ = _c(2);
	useState(1);
	let t0;
	if ($[0] === Symbol.for("react.memo_cache_sentinel")) {
		t0 = [];
		$[0] = t0;
	} else {
		t0 = $[0];
	}
	useLayoutEffect(_temp2, t0);
	let t1;
	if ($[1] === Symbol.for("react.memo_cache_sentinel")) {
		t1 = /* @__PURE__ */ _jsx("span", {
			"data-joint": "fallback",
			children: "joint waiting"
		});
		$[1] = t1;
	} else {
		t1 = $[1];
	}
	return t1;
}
function _temp2() {
	fallbackLife.mounts = fallbackLife.mounts + 1;
	return _temp;
}
function _temp() {
	fallbackLife.cleanups = fallbackLife.cleanups + 1;
}
function Joint(props) {
	const $ = _c(12);
	const a = use(props.first);
	const x = useSyncExternalStore(props.position.subscribe, props.position.getSnapshot);
	const b = use(props.second);
	const t0 = x.position.x + a.offset.x + b.offset.x;
	const t1 = `translateX(${x.position.x + a.offset.x + b.offset.x}px)`;
	const t2 = (x.position.x + a.offset.x + b.offset.x) / 20;
	let t3;
	if ($[0] !== t1 || $[1] !== t2) {
		t3 = {
			transform: t1,
			opacity: t2
		};
		$[0] = t1;
		$[1] = t2;
		$[2] = t3;
	} else {
		t3 = $[2];
	}
	const t4 = x.position.x + a.offset.x + b.offset.x;
	let t5;
	if ($[3] !== t4) {
		t5 = /* @__PURE__ */ _jsx("output", {
			"data-label": "sum",
			children: t4
		});
		$[3] = t4;
		$[4] = t5;
	} else {
		t5 = $[4];
	}
	const t6 = a.offset.y + b.offset.y;
	let t7;
	if ($[5] !== t6) {
		t7 = /* @__PURE__ */ _jsx("span", {
			"data-model": "sum",
			children: t6
		});
		$[5] = t6;
		$[6] = t7;
	} else {
		t7 = $[6];
	}
	let t8;
	if ($[7] !== t0 || $[8] !== t3 || $[9] !== t5 || $[10] !== t7) {
		t8 = /* @__PURE__ */ _jsxs("div", {
			"data-joint": "ready",
			"data-value": t0,
			style: t3,
			children: [t5, t7]
		});
		$[7] = t0;
		$[8] = t3;
		$[9] = t5;
		$[10] = t7;
		$[11] = t8;
	} else {
		t8 = $[11];
	}
	return t8;
}
function Row() {
	const $ = _c(3);
	const [value, setValue] = useState(0);
	let t0;
	if ($[0] === Symbol.for("react.memo_cache_sentinel")) {
		t0 = () => setValue(_temp3);
		$[0] = t0;
	} else {
		t0 = $[0];
	}
	let t1;
	if ($[1] !== value) {
		t1 = /* @__PURE__ */ _jsx("button", {
			"data-row": "local",
			"data-local": value,
			onClick: t0,
			children: "row"
		});
		$[1] = value;
		$[2] = t1;
	} else {
		t1 = $[2];
	}
	return t1;
}
function _temp3(previous) {
	return previous + 1;
}
function App() {
	const $ = _c(2);
	let t0;
	if ($[0] === Symbol.for("react.memo_cache_sentinel")) {
		t0 = /* @__PURE__ */ _jsx(Suspense, {
			fallback: /* @__PURE__ */ _jsx("div", {
				"data-health": "fallback",
				children: "health waiting"
			}),
			children: /* @__PURE__ */ _jsx(Health, { resource: health.promise })
		});
		$[0] = t0;
	} else {
		t0 = $[0];
	}
	let t1;
	if ($[1] === Symbol.for("react.memo_cache_sentinel")) {
		t1 = /* @__PURE__ */ _jsxs("main", { children: [
			t0,
			/* @__PURE__ */ _jsx(Suspense, {
				fallback: /* @__PURE__ */ _jsx(Fallback, {}),
				children: /* @__PURE__ */ _jsx(Joint, {
					first: first.promise,
					position,
					second: second.promise
				})
			}),
			/* @__PURE__ */ _jsx(Row, {})
		] });
		$[1] = t1;
	} else {
		t1 = $[1];
	}
	return t1;
}
export function mountReact(host) {
	const root = createRoot(host);
	const started = performance.now();
	flushSync(() => root.render(/* @__PURE__ */ _jsx(App, {})));
	const mountDurationMs = performance.now() - started;
	return {
		mountDurationMs,
		settleSecond() {
			second.resolve(payload(2, 20));
		},
		settleFirst() {
			first.resolve(payload(3, 30));
		},
		updatePosition() {
			flushSync(() => {
				currentPosition = positionState(7);
				for (const listener of [...listeners]) listener();
			});
		},
		settleHealth() {
			health.resolve("health ready");
		},
		fallbackLife() {
			return { ...fallbackLife };
		},
		dispose() {
			flushSync(() => root.unmount());
			return {
				disposed: true,
				fallbackLife: { ...fallbackLife },
				store: { listeners: listeners.size }
			};
		}
	};
}
