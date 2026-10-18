import { c as _c } from "react/compiler-runtime";
import { createRoot } from "react-dom/client";
import { startTransition, Suspense, use, useLayoutEffect, useState } from "react";
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
const oldA = deferred();
oldA.resolve("A ready");
const pendingA = deferred();
const pendingB = deferred();
const fallbackLife = {
	mounts: 0,
	cleanups: 0
};
function A(props) {
	const $ = _c(2);
	const value = use(props.resource);
	let t0;
	if ($[0] !== value) {
		t0 = /* @__PURE__ */ _jsx("div", {
			"data-a": "primary",
			children: value
		});
		$[0] = value;
		$[1] = t0;
	} else {
		t0 = $[1];
	}
	return t0;
}
function FallbackB() {
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
			"data-b": "fallback",
			style: {
				opacity: .2,
				transform: "translateX(0px)"
			},
			children: "B waiting"
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
function B(props) {
	const $ = _c(12);
	const value = use(props.resource);
	const t0 = value / 10;
	const t1 = `translateX(${value}px)`;
	let t2;
	if ($[0] !== t0 || $[1] !== t1) {
		t2 = {
			opacity: t0,
			transform: t1
		};
		$[0] = t0;
		$[1] = t1;
		$[2] = t2;
	} else {
		t2 = $[2];
	}
	let t3;
	if ($[3] !== value) {
		t3 = /* @__PURE__ */ _jsx("span", {
			"data-label": "ready",
			children: value
		});
		$[3] = value;
		$[4] = t3;
	} else {
		t3 = $[4];
	}
	const t4 = value + 1;
	let t5;
	if ($[5] !== t4 || $[6] !== value) {
		t5 = /* @__PURE__ */ _jsx("output", {
			"data-count": t4,
			children: value
		});
		$[5] = t4;
		$[6] = value;
		$[7] = t5;
	} else {
		t5 = $[7];
	}
	let t6;
	if ($[8] !== t2 || $[9] !== t3 || $[10] !== t5) {
		t6 = /* @__PURE__ */ _jsxs("div", {
			"data-b": "ready",
			style: t2,
			children: [t3, t5]
		});
		$[8] = t2;
		$[9] = t3;
		$[10] = t5;
		$[11] = t6;
	} else {
		t6 = $[11];
	}
	return t6;
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
function App(props) {
	const $ = _c(11);
	const [resource, setResource] = useState(oldA.promise);
	let t0;
	if ($[0] !== props) {
		t0 = () => {
			props.bind(setResource);
		};
		$[0] = props;
		$[1] = t0;
	} else {
		t0 = $[1];
	}
	let t1;
	if ($[2] !== props.bind) {
		t1 = [props.bind, setResource];
		$[2] = props.bind;
		$[3] = t1;
	} else {
		t1 = $[3];
	}
	useLayoutEffect(t0, t1);
	let t2;
	if ($[4] === Symbol.for("react.memo_cache_sentinel")) {
		t2 = /* @__PURE__ */ _jsx("div", {
			"data-a": "fallback",
			children: "A waiting"
		});
		$[4] = t2;
	} else {
		t2 = $[4];
	}
	let t3;
	if ($[5] !== resource) {
		t3 = /* @__PURE__ */ _jsx(Suspense, {
			fallback: t2,
			children: /* @__PURE__ */ _jsx(A, { resource })
		});
		$[5] = resource;
		$[6] = t3;
	} else {
		t3 = $[6];
	}
	let t4;
	let t5;
	if ($[7] === Symbol.for("react.memo_cache_sentinel")) {
		t4 = /* @__PURE__ */ _jsx(Suspense, {
			fallback: /* @__PURE__ */ _jsx(FallbackB, {}),
			children: /* @__PURE__ */ _jsx(B, { resource: pendingB.promise })
		});
		t5 = /* @__PURE__ */ _jsx(Row, {});
		$[7] = t4;
		$[8] = t5;
	} else {
		t4 = $[7];
		t5 = $[8];
	}
	let t6;
	if ($[9] !== t3) {
		t6 = /* @__PURE__ */ _jsxs("main", { children: [
			t3,
			t4,
			t5
		] });
		$[9] = t3;
		$[10] = t6;
	} else {
		t6 = $[10];
	}
	return t6;
}
export function mountReact(host) {
	const root = createRoot(host);
	let setResource = null;
	const bind = (setter) => {
		setResource = setter;
	};
	const started = performance.now();
	flushSync(() => root.render(/* @__PURE__ */ _jsx(App, { bind })));
	const mountDurationMs = performance.now() - started;
	return {
		mountDurationMs,
		beginPendingA() {
			if (!setResource) throw new Error("React A resource setter is unavailable");
			startTransition(() => setResource(pendingA.promise));
		},
		settleB() {
			pendingB.resolve(7);
		},
		settlePendingA() {
			pendingA.resolve("A next");
		},
		fallbackLife() {
			return { ...fallbackLife };
		},
		dispose() {
			flushSync(() => root.unmount());
			return {
				disposed: true,
				fallbackLife: { ...fallbackLife }
			};
		}
	};
}
