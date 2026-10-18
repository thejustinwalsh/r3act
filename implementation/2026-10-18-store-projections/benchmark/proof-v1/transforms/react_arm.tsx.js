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
const health = deferred();
const external = (initial) => {
	let value = initial;
	const listeners = new Set();
	return {
		getSnapshot: () => value,
		subscribe(listener) {
			listeners.add(listener);
			return () => {
				listeners.delete(listener);
			};
		},
		dispatch(next) {
			if (Object.is(value, next)) return;
			value = next;
			for (const listener of [...listeners]) listener();
		},
		diagnostics: () => ({ listeners: listeners.size })
	};
};
const positionState = (x) => Object.freeze({ position: Object.freeze({ x }) });
const cameraState = (x) => Object.freeze({ camera: Object.freeze({ x }) });
const position = external(positionState(1));
const camera = external(cameraState(2));
const ids = Array.from({ length: 64 }, (_, index) => `row-${index}`);
let setWorld = null;
let setOrder = null;
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
function Position(props) {
	const $ = _c(11);
	const x = useSyncExternalStore(props.position.subscribe, props.position.getSnapshot);
	const t0 = `translateX(${x.position.x}px)`;
	let t1;
	if ($[0] !== t0) {
		t1 = { transform: t0 };
		$[0] = t0;
		$[1] = t1;
	} else {
		t1 = $[1];
	}
	let t2;
	if ($[2] !== t1 || $[3] !== x.position.x) {
		t2 = /* @__PURE__ */ _jsx("div", {
			"data-position": x.position.x,
			style: t1,
			children: x.position.x
		});
		$[2] = t1;
		$[3] = x.position.x;
		$[4] = t2;
	} else {
		t2 = $[4];
	}
	const t3 = x.position.x * 2;
	const t4 = x.position.x * 2;
	let t5;
	if ($[5] !== t3 || $[6] !== t4) {
		t5 = /* @__PURE__ */ _jsx("span", {
			"data-outline": t3,
			children: t4
		});
		$[5] = t3;
		$[6] = t4;
		$[7] = t5;
	} else {
		t5 = $[7];
	}
	let t6;
	if ($[8] !== t2 || $[9] !== t5) {
		t6 = /* @__PURE__ */ _jsxs("div", { children: [t2, t5] });
		$[8] = t2;
		$[9] = t5;
		$[10] = t6;
	} else {
		t6 = $[10];
	}
	return t6;
}
function Joint(props) {
	const $ = _c(11);
	const x = useSyncExternalStore(props.position.subscribe, props.position.getSnapshot);
	const y = useSyncExternalStore(props.camera.subscribe, props.camera.getSnapshot);
	const t0 = x.position.x + y.camera.x;
	const t1 = (x.position.x + y.camera.x) / 10;
	let t2;
	if ($[0] !== t1) {
		t2 = { opacity: t1 };
		$[0] = t1;
		$[1] = t2;
	} else {
		t2 = $[1];
	}
	const t3 = x.position.x + y.camera.x;
	let t4;
	if ($[2] !== t0 || $[3] !== t2 || $[4] !== t3) {
		t4 = /* @__PURE__ */ _jsx("output", {
			"data-joint": t0,
			style: t2,
			children: t3
		});
		$[2] = t0;
		$[3] = t2;
		$[4] = t3;
		$[5] = t4;
	} else {
		t4 = $[5];
	}
	let t5;
	if ($[6] !== y.camera.x) {
		t5 = /* @__PURE__ */ _jsx("span", {
			"data-camera": y.camera.x,
			children: y.camera.x
		});
		$[6] = y.camera.x;
		$[7] = t5;
	} else {
		t5 = $[7];
	}
	let t6;
	if ($[8] !== t4 || $[9] !== t5) {
		t6 = /* @__PURE__ */ _jsxs("div", { children: [t4, t5] });
		$[8] = t4;
		$[9] = t5;
		$[10] = t6;
	} else {
		t6 = $[10];
	}
	return t6;
}
function World() {
	const $ = _c(4);
	const [value, setter] = useState(0);
	let t0;
	let t1;
	if ($[0] === Symbol.for("react.memo_cache_sentinel")) {
		t0 = () => {
			setWorld = setter;
			return _temp;
		};
		t1 = [setter];
		$[0] = t0;
		$[1] = t1;
	} else {
		t0 = $[0];
		t1 = $[1];
	}
	useLayoutEffect(t0, t1);
	let t2;
	if ($[2] !== value) {
		t2 = /* @__PURE__ */ _jsx("output", { "data-world": value });
		$[2] = value;
		$[3] = t2;
	} else {
		t2 = $[3];
	}
	return t2;
}
function _temp() {
	setWorld = null;
}
function Row(props) {
	const $ = _c(4);
	const [local, setLocal] = useState(0);
	let t0;
	if ($[0] === Symbol.for("react.memo_cache_sentinel")) {
		t0 = () => setLocal(_temp2);
		$[0] = t0;
	} else {
		t0 = $[0];
	}
	let t1;
	if ($[1] !== local || $[2] !== props.id) {
		t1 = /* @__PURE__ */ _jsx("li", {
			"data-id": props.id,
			"data-local": local,
			onClick: t0,
			children: props.id
		});
		$[1] = local;
		$[2] = props.id;
		$[3] = t1;
	} else {
		t1 = $[3];
	}
	return t1;
}
function _temp2(previous) {
	return previous + 1;
}
function List() {
	const $ = _c(6);
	const [order, setter] = useState(ids);
	let t0;
	let t1;
	if ($[0] === Symbol.for("react.memo_cache_sentinel")) {
		t0 = () => {
			setOrder = setter;
			return _temp3;
		};
		t1 = [setter];
		$[0] = t0;
		$[1] = t1;
	} else {
		t0 = $[0];
		t1 = $[1];
	}
	useLayoutEffect(t0, t1);
	let t2;
	if ($[2] !== order) {
		t2 = order.map(_temp4);
		$[2] = order;
		$[3] = t2;
	} else {
		t2 = $[3];
	}
	let t3;
	if ($[4] !== t2) {
		t3 = /* @__PURE__ */ _jsx("ul", { children: t2 });
		$[4] = t2;
		$[5] = t3;
	} else {
		t3 = $[5];
	}
	return t3;
}
function _temp4(id) {
	return /* @__PURE__ */ _jsx(Row, { id }, id);
}
function _temp3() {
	setOrder = null;
}
function App() {
	const $ = _c(1);
	let t0;
	if ($[0] === Symbol.for("react.memo_cache_sentinel")) {
		t0 = /* @__PURE__ */ _jsxs("main", { children: [
			/* @__PURE__ */ _jsx(Suspense, {
				fallback: /* @__PURE__ */ _jsx("div", {
					"data-health": "fallback",
					children: "health waiting"
				}),
				children: /* @__PURE__ */ _jsx(Health, { resource: health.promise })
			}),
			/* @__PURE__ */ _jsx(Position, { position }),
			/* @__PURE__ */ _jsx(Joint, {
				position,
				camera
			}),
			/* @__PURE__ */ _jsx(World, {}),
			/* @__PURE__ */ _jsx(List, {})
		] });
		$[0] = t0;
	} else {
		t0 = $[0];
	}
	return t0;
}
export function mountReact(host) {
	const root = createRoot(host);
	const started = performance.now();
	flushSync(() => root.render(/* @__PURE__ */ _jsx(App, {})));
	const mountDurationMs = performance.now() - started;
	if (!setWorld || !setOrder) throw new Error("React transaction setters were not installed");
	return {
		mountDurationMs,
		transact() {
			flushSync(() => {
				position.dispatch(positionState(7));
				setWorld?.(5);
				setOrder?.([...ids.slice(1), ids[0]]);
			});
		},
		settleHealth() {
			health.resolve("health ready");
		},
		dispose() {
			flushSync(() => root.unmount());
			return {
				disposed: true,
				position: position.diagnostics(),
				camera: camera.diagnostics()
			};
		}
	};
}
