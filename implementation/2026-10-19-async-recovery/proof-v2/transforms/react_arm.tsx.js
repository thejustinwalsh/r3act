import { c as _c } from "react/compiler-runtime";
import { Component, Suspense, startTransition, use, useLayoutEffect, useState, useSyncExternalStore } from "react";
import { createRoot } from "react-dom/client";
import { flushSync } from "react-dom";
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
function deferred() {
	let resolve, reject;
	const promise = new Promise((yes, no) => {
		resolve = yes;
		reject = no;
	});
	return {
		promise,
		resolve,
		reject
	};
}
const initial = Promise.resolve({
	label: "accepted",
	x: 1
});
let replaceResource = null;
let urgent = 0;
const urgentListeners = new Set();
const subscribeUrgent = (listener) => {
	urgentListeners.add(listener);
	return () => {
		urgentListeners.delete(listener);
	};
};
export const life = {
	readyMounts: 0,
	readyCleanups: 0,
	errorMounts: 0,
	errorCleanups: 0
};
function Ready(t0) {
	const $ = _c(4);
	const { promise } = t0;
	const payload = use(promise);
	let t1;
	if ($[0] === Symbol.for("react.memo_cache_sentinel")) {
		t1 = [];
		$[0] = t1;
	} else {
		t1 = $[0];
	}
	useLayoutEffect(_temp2, t1);
	let t2;
	if ($[1] !== payload.label || $[2] !== payload.x) {
		t2 = /* @__PURE__ */ _jsx("output", {
			"data-value": payload.label,
			"data-x": payload.x,
			children: payload.label
		});
		$[1] = payload.label;
		$[2] = payload.x;
		$[3] = t2;
	} else {
		t2 = $[3];
	}
	return t2;
}
function _temp2() {
	life.readyMounts = life.readyMounts + 1;
	return _temp;
}
function _temp() {
	life.readyCleanups = life.readyCleanups + 1;
}
function ErrorView(t0) {
	const $ = _c(3);
	const { reason } = t0;
	let t1;
	if ($[0] === Symbol.for("react.memo_cache_sentinel")) {
		t1 = [];
		$[0] = t1;
	} else {
		t1 = $[0];
	}
	useLayoutEffect(_temp4, t1);
	const t2 = String(reason);
	let t3;
	if ($[1] !== t2) {
		t3 = /* @__PURE__ */ _jsx("output", { "data-error": t2 });
		$[1] = t2;
		$[2] = t3;
	} else {
		t3 = $[2];
	}
	return t3;
}
function _temp4() {
	life.errorMounts = life.errorMounts + 1;
	return _temp3;
}
function _temp3() {
	life.errorCleanups = life.errorCleanups + 1;
}
class RecoveryBoundary extends Component {
	state = { reason: null };
	static getDerivedStateFromError(reason) {
		return { reason };
	}
	render() {
		return this.state.reason === null ? this.props.children : /* @__PURE__ */ _jsx(ErrorView, { reason: this.state.reason });
	}
}
function Urgent() {
	const $ = _c(2);
	const score = useSyncExternalStore(subscribeUrgent, _temp5);
	let t0;
	if ($[0] !== score) {
		t0 = /* @__PURE__ */ _jsx("output", { "data-urgent": score });
		$[0] = score;
		$[1] = t0;
	} else {
		t0 = $[1];
	}
	return t0;
}
function _temp5() {
	return urgent;
}
function App() {
	const $ = _c(12);
	let t0;
	if ($[0] === Symbol.for("react.memo_cache_sentinel")) {
		t0 = {
			promise: initial,
			key: 0
		};
		$[0] = t0;
	} else {
		t0 = $[0];
	}
	const [resource, setResource] = useState(t0);
	let t1;
	let t2;
	if ($[1] === Symbol.for("react.memo_cache_sentinel")) {
		t1 = () => {
			replaceResource = setResource;
			return () => {
				if (replaceResource === setResource) {
					replaceResource = null;
				}
			};
		};
		t2 = [setResource];
		$[1] = t1;
		$[2] = t2;
	} else {
		t1 = $[1];
		t2 = $[2];
	}
	useLayoutEffect(t1, t2);
	let t3;
	if ($[3] === Symbol.for("react.memo_cache_sentinel")) {
		t3 = /* @__PURE__ */ _jsx("output", { "data-pending": "true" });
		$[3] = t3;
	} else {
		t3 = $[3];
	}
	let t4;
	if ($[4] !== resource.promise) {
		t4 = /* @__PURE__ */ _jsx(Ready, { promise: resource.promise });
		$[4] = resource.promise;
		$[5] = t4;
	} else {
		t4 = $[5];
	}
	let t5;
	if ($[6] !== resource.key || $[7] !== t4) {
		t5 = /* @__PURE__ */ _jsx(Suspense, {
			fallback: t3,
			children: /* @__PURE__ */ _jsx(RecoveryBoundary, { children: t4 }, resource.key)
		});
		$[6] = resource.key;
		$[7] = t4;
		$[8] = t5;
	} else {
		t5 = $[8];
	}
	let t6;
	if ($[9] === Symbol.for("react.memo_cache_sentinel")) {
		t6 = /* @__PURE__ */ _jsx(Urgent, {});
		$[9] = t6;
	} else {
		t6 = $[9];
	}
	let t7;
	if ($[10] !== t5) {
		t7 = /* @__PURE__ */ _jsxs("section", { children: [t5, t6] });
		$[10] = t5;
		$[11] = t7;
	} else {
		t7 = $[11];
	}
	return t7;
}
export function mountReact(host) {
	const caught = [];
	const root = createRoot(host, { onCaughtError(error) {
		caught.push(String(error));
	} });
	flushSync(() => root.render(/* @__PURE__ */ _jsx(App, {})));
	let generation = 0;
	const providers = [];
	const operations = [];
	function replace() {
		const update = replaceResource;
		if (!update) throw new Error("React recovery controller is not mounted");
		const provider = deferred();
		providers.push(provider);
		const key = ++generation;
		const handle = {
			status: "pending",
			cancel(_reason) {
				if (handle.status === "pending") handle.status = "cancelled";
			}
		};
		operations.push(handle);
		provider.promise.then(() => {
			if (handle.status === "pending") handle.status = "committed";
		}, () => {
			if (handle.status === "pending") handle.status = "committed";
		});
		startTransition(() => update({
			promise: provider.promise,
			key
		}));
		return {
			provider,
			handle
		};
	}
	return {
		replace,
		operations,
		providers,
		urgent(value) {
			flushSync(() => {
				urgent = value;
				for (const listener of [...urgentListeners]) listener();
			});
		},
		dispose() {
			for (const operation of operations) operation.cancel("disposed");
			flushSync(() => root.unmount());
			return {
				listenerCount: urgentListeners.size,
				caught
			};
		}
	};
}
