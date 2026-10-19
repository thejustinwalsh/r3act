import { c as _c } from "react/compiler-runtime";
import { Suspense, startTransition, use, useState, useSyncExternalStore } from "react";
import { flushSync } from "react-dom";
import { createRoot } from "react-dom/client";
import { ReactRadixDialog } from "@r3act/react-bridge/radix-dialog";
import { DialogBody, createDialogTrace } from "./dialog_body.tsx";
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
function externalStore(initial) {
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
		publish(next) {
			value = next;
			for (const listener of [...listeners]) listener();
		}
	};
}
function ReactApp(props) {
	const $ = _c(22);
	if (props.gate) {
		use(props.gate);
	}
	const open = useSyncExternalStore(props.openStore.subscribe, props.openStore.getSnapshot);
	const point = useSyncExternalStore(props.pointStore.subscribe, props.pointStore.getSnapshot);
	const [nativeCount, setNativeCount] = useState(0);
	const t0 = props.label;
	let t1;
	if ($[0] === Symbol.for("react.memo_cache_sentinel")) {
		t1 = /* @__PURE__ */ _jsx("button", {
			"data-native-action": "true",
			onClick: () => setNativeCount(_temp),
			children: "Native count"
		});
		$[0] = t1;
	} else {
		t1 = $[0];
	}
	let t2;
	if ($[1] !== nativeCount || $[2] !== open || $[3] !== point || $[4] !== props.label || $[5] !== props.observer || $[6] !== props.onOpenChange || $[7] !== props.order || $[8] !== props.portalContainer) {
		let t3;
		if ($[10] !== nativeCount || $[11] !== open || $[12] !== point || $[13] !== props.label || $[14] !== props.observer || $[15] !== props.onOpenChange || $[16] !== props.portalContainer) {
			t3 = (id) => /* @__PURE__ */ _jsx("div", {
				"data-row": id,
				children: id === "dialog" ? /* @__PURE__ */ _jsx(ReactRadixDialog, {
					open,
					onOpenChange: props.onOpenChange,
					title: "Settings",
					description: "Edit your dialog note",
					triggerLabel: "Open settings",
					closeLabel: "Close settings",
					portalContainer: props.portalContainer,
					children: /* @__PURE__ */ _jsx(DialogBody, {
						label: props.label,
						point,
						nativeCount,
						observer: props.observer
					})
				}) : /* @__PURE__ */ _jsx("output", { "data-other": "stable" })
			}, id);
			$[10] = nativeCount;
			$[11] = open;
			$[12] = point;
			$[13] = props.label;
			$[14] = props.observer;
			$[15] = props.onOpenChange;
			$[16] = props.portalContainer;
			$[17] = t3;
		} else {
			t3 = $[17];
		}
		t2 = props.order.map(t3);
		$[1] = nativeCount;
		$[2] = open;
		$[3] = point;
		$[4] = props.label;
		$[5] = props.observer;
		$[6] = props.onOpenChange;
		$[7] = props.order;
		$[8] = props.portalContainer;
		$[9] = t2;
	} else {
		t2 = $[9];
	}
	let t3;
	if ($[18] !== nativeCount || $[19] !== props.label || $[20] !== t2) {
		t3 = /* @__PURE__ */ _jsxs("section", {
			"data-native-label": t0,
			"data-native-count": nativeCount,
			children: [t1, t2]
		});
		$[18] = nativeCount;
		$[19] = props.label;
		$[20] = t2;
		$[21] = t3;
	} else {
		t3 = $[21];
	}
	return t3;
}
function _temp(current) {
	return current + 1;
}
export function mountReact(host, portal) {
	const root = createRoot(host), { trace, observer } = createDialogTrace();
	const openStore = externalStore(false), pointStore = externalStore(1);
	const pending = deferred();
	let callbackCount = 0, callbackOpen = false;
	const onOpenChange = (open) => {
		callbackCount++;
		callbackOpen = open;
		openStore.publish(open);
	};
	const tree = (label, order, gate = false) => /* @__PURE__ */ _jsx(Suspense, {
		fallback: null,
		children: /* @__PURE__ */ _jsx(ReactApp, {
			label,
			order,
			portalContainer: portal,
			observer,
			openStore,
			pointStore,
			onOpenChange,
			gate: gate ? pending.promise : undefined
		})
	});
	flushSync(() => root.render(tree("accepted", ["dialog", "other"])));
	return {
		trace,
		host,
		portal,
		externalOpen() {
			openStore.publish(true);
		},
		externalClose() {
			openStore.publish(false);
		},
		updatePoint() {
			pointStore.publish(7);
		},
		reorder() {
			flushSync(() => root.render(tree("accepted", ["other", "dialog"])));
		},
		discard() {},
		pending() {
			startTransition(() => root.render(tree("next", ["other", "dialog"], true)));
			return { status: "pending" };
		},
		settle() {
			pending.resolve("ready");
		},
		replaceReady() {
			flushSync(() => root.render(tree("fresh", ["other", "dialog"])));
		},
		remove() {
			flushSync(() => root.render(tree("fresh", ["other"])));
		},
		reinsert() {
			flushSync(() => root.render(tree("fresh", ["other", "dialog"])));
		},
		state() {
			return {
				callbackCount,
				callbackOpen,
				groupedCallback: null,
				open: openStore.getSnapshot(),
				version: null,
				trace: structuredClone(trace)
			};
		},
		dispose() {
			flushSync(() => root.unmount());
			return { disposed: true };
		}
	};
}
