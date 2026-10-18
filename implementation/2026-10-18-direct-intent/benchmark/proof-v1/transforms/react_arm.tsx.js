import { c as _c } from "react/compiler-runtime";
import { createRoot } from "react-dom/client";
import { startTransition, Suspense, use, useState } from "react";
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
const initial = deferred();
initial.resolve("initial value");
const obsolete = deferred();
const latest = deferred();
const initialControl = deferred();
initialControl.resolve("control ready");
const pendingControl = deferred();
function Primary(props) {
	const $ = _c(9);
	const value = use(props.resource);
	use(props.control);
	const [count, setCount] = useState(0);
	let t0;
	if ($[0] === Symbol.for("react.memo_cache_sentinel")) {
		t0 = () => setCount(_temp);
		$[0] = t0;
	} else {
		t0 = $[0];
	}
	let t1;
	if ($[1] !== count) {
		t1 = /* @__PURE__ */ _jsx("button", {
			"data-counter": "yes",
			onClick: t0,
			children: count
		});
		$[1] = count;
		$[2] = t1;
	} else {
		t1 = $[2];
	}
	let t2;
	if ($[3] !== value) {
		t2 = /* @__PURE__ */ _jsx("span", {
			"data-value": "yes",
			children: value
		});
		$[3] = value;
		$[4] = t2;
	} else {
		t2 = $[4];
	}
	let t3;
	if ($[5] !== props.label || $[6] !== t1 || $[7] !== t2) {
		t3 = /* @__PURE__ */ _jsxs("div", {
			"data-primary": "yes",
			"data-label": props.label,
			children: [t1, t2]
		});
		$[5] = props.label;
		$[6] = t1;
		$[7] = t2;
		$[8] = t3;
	} else {
		t3 = $[8];
	}
	return t3;
}
function _temp(n) {
	return n + 1;
}
function App(props) {
	const $ = _c(5);
	let t0;
	if ($[0] === Symbol.for("react.memo_cache_sentinel")) {
		t0 = /* @__PURE__ */ _jsx("div", {
			"data-fallback": "yes",
			children: "waiting"
		});
		$[0] = t0;
	} else {
		t0 = $[0];
	}
	let t1;
	if ($[1] !== props.control || $[2] !== props.label || $[3] !== props.resource) {
		t1 = /* @__PURE__ */ _jsx(Suspense, {
			fallback: t0,
			children: /* @__PURE__ */ _jsx(Primary, {
				resource: props.resource,
				control: props.control,
				label: props.label
			})
		});
		$[1] = props.control;
		$[2] = props.label;
		$[3] = props.resource;
		$[4] = t1;
	} else {
		t1 = $[4];
	}
	return t1;
}
export function mountReact(host) {
	const root = createRoot(host);
	const started = performance.now();
	flushSync(() => root.render(/* @__PURE__ */ _jsx(App, {
		resource: initial.promise,
		control: initialControl.promise,
		label: "initial"
	})));
	const mountDurationMs = performance.now() - started;
	return {
		mountDurationMs,
		beginRequests() {
			startTransition(() => root.render(/* @__PURE__ */ _jsx(App, {
				resource: obsolete.promise,
				control: pendingControl.promise,
				label: "obsolete"
			})));
			startTransition(() => root.render(/* @__PURE__ */ _jsx(App, {
				resource: latest.promise,
				control: pendingControl.promise,
				label: "latest"
			})));
		},
		settleObsolete() {
			obsolete.resolve("obsolete value");
		},
		settleLatest() {
			latest.resolve("latest value");
			pendingControl.resolve("control next");
		},
		dispose() {
			flushSync(() => root.unmount());
			return { disposed: true };
		}
	};
}
