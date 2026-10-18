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
const initialA = deferred();
void initialA.resolve("A ready");
const pendingA = deferred();
const pendingB = deferred();
const pendingC = deferred();
function APrimary(t0) {
	const $ = _c(2);
	const { resource } = t0;
	const value = use(resource);
	let t1;
	if ($[0] !== value) {
		t1 = /* @__PURE__ */ _jsx("div", {
			"data-a": "primary",
			children: value
		}, "a-primary");
		$[0] = value;
		$[1] = t1;
	} else {
		t1 = $[1];
	}
	return t1;
}
function BPrimary(t0) {
	const $ = _c(2);
	const { resource } = t0;
	const value = use(resource);
	let t1;
	if ($[0] !== value) {
		t1 = /* @__PURE__ */ _jsx("div", {
			"data-b": "primary",
			children: value
		}, "b-primary");
		$[0] = value;
		$[1] = t1;
	} else {
		t1 = $[1];
	}
	return t1;
}
function CPrimary(t0) {
	const $ = _c(2);
	const { resource } = t0;
	const value = use(resource);
	let t1;
	if ($[0] !== value) {
		t1 = /* @__PURE__ */ _jsx("div", {
			"data-c": "primary",
			children: value
		}, "c-primary");
		$[0] = value;
		$[1] = t1;
	} else {
		t1 = $[1];
	}
	return t1;
}
function App(t0) {
	const $ = _c(10);
	const { bind } = t0;
	const [resource, setResource] = useState(initialA.promise);
	let t1;
	let t2;
	if ($[0] !== bind) {
		t1 = () => {
			bind(setResource);
		};
		t2 = [bind, setResource];
		$[0] = bind;
		$[1] = t1;
		$[2] = t2;
	} else {
		t1 = $[1];
		t2 = $[2];
	}
	useLayoutEffect(t1, t2);
	let t3;
	if ($[3] === Symbol.for("react.memo_cache_sentinel")) {
		t3 = /* @__PURE__ */ _jsx("div", {
			"data-a": "fallback",
			children: "A waiting"
		}, "a-primary");
		$[3] = t3;
	} else {
		t3 = $[3];
	}
	let t4;
	if ($[4] !== resource) {
		t4 = /* @__PURE__ */ _jsx(Suspense, {
			fallback: t3,
			children: /* @__PURE__ */ _jsx(APrimary, { resource })
		}, "boundary-a");
		$[4] = resource;
		$[5] = t4;
	} else {
		t4 = $[5];
	}
	let t5;
	if ($[6] === Symbol.for("react.memo_cache_sentinel")) {
		t5 = /* @__PURE__ */ _jsx(Suspense, {
			fallback: /* @__PURE__ */ _jsx("div", {
				"data-b": "fallback",
				children: "B waiting"
			}, "b-primary"),
			children: /* @__PURE__ */ _jsx(BPrimary, { resource: pendingB.promise })
		}, "boundary-b");
		$[6] = t5;
	} else {
		t5 = $[6];
	}
	let t6;
	if ($[7] === Symbol.for("react.memo_cache_sentinel")) {
		t6 = /* @__PURE__ */ _jsx(Suspense, {
			fallback: /* @__PURE__ */ _jsx("div", {
				"data-c": "fallback",
				children: "C waiting"
			}, "c-primary"),
			children: /* @__PURE__ */ _jsx(CPrimary, { resource: pendingC.promise })
		}, "boundary-c");
		$[7] = t6;
	} else {
		t6 = $[7];
	}
	let t7;
	if ($[8] !== t4) {
		t7 = /* @__PURE__ */ _jsxs("main", { children: [
			t4,
			t5,
			t6
		] });
		$[8] = t4;
		$[9] = t7;
	} else {
		t7 = $[9];
	}
	return t7;
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
			if (!setResource) throw new Error("React resource setter was not registered");
			startTransition(() => setResource(pendingA.promise));
		},
		settleBC() {
			pendingB.resolve("B ready");
			pendingC.resolve("C ready");
		},
		settlePendingA() {
			pendingA.resolve("A next");
		},
		dispose() {
			flushSync(() => root.unmount());
			return { disposed: true };
		}
	};
}
