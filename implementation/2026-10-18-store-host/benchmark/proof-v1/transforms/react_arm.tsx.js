import { c as _c } from "react/compiler-runtime";
import { createRoot } from "react-dom/client";
import { Suspense, use, useSyncExternalStore } from "react";
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
const position = (() => {
	let value = 1;
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
})();
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
	const $ = _c(2);
	const x = useSyncExternalStore(props.position.subscribe, props.position.getSnapshot);
	let t0;
	if ($[0] !== x) {
		t0 = /* @__PURE__ */ _jsx("output", { "data-x": x });
		$[0] = x;
		$[1] = t0;
	} else {
		t0 = $[1];
	}
	return t0;
}
function DoublePosition(props) {
	const $ = _c(2);
	const x = useSyncExternalStore(props.position.subscribe, props.position.getSnapshot);
	const t0 = x * 2;
	let t1;
	if ($[0] !== t0) {
		t1 = /* @__PURE__ */ _jsx("output", { "data-double": t0 });
		$[0] = t0;
		$[1] = t1;
	} else {
		t1 = $[1];
	}
	return t1;
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
			/* @__PURE__ */ _jsx(DoublePosition, { position })
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
	return {
		mountDurationMs,
		updatePosition() {
			position.dispatch(7);
		},
		settleHealth() {
			health.resolve("health ready");
		},
		dispose() {
			flushSync(() => root.unmount());
			return {
				disposed: true,
				listeners: position.diagnostics().listeners
			};
		}
	};
}
