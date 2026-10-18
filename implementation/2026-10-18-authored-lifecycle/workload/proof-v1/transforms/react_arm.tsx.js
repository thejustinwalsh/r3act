import { c as _c } from "react/compiler-runtime";
import { Suspense, use, useLayoutEffect, useState, useSyncExternalStore } from "react";
import { flushSync } from "react-dom";
import { createRoot } from "react-dom/client";
import { editedRows, initialRows } from "./contract";
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
class ExternalStore {
	value;
	listeners = new Set();
	constructor(initial) {
		this.value = initial;
	}
	getSnapshot = () => this.value;
	subscribe = (listener) => {
		this.listeners.add(listener);
		return () => {
			this.listeners.delete(listener);
		};
	};
	publish(value) {
		this.value = value;
		for (const listener of this.listeners) listener();
	}
	get listenerCount() {
		return this.listeners.size;
	}
}
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
function ReactRow(props) {
	const { id, scene } = props;
	const step = useSyncExternalStore(scene.stepStore.subscribe, scene.stepStore.getSnapshot, scene.stepStore.getSnapshot);
	const [local, setLocal] = useState(0);
	useLayoutEffect(() => {
		scene.lifecycle.rowSetups++;
		return () => {
			scene.lifecycle.rowCleanups++;
		};
	}, [id, scene]);
	return /* @__PURE__ */ _jsx("button", {
		"data-row": id,
		"data-step": step,
		"data-local": local,
		style: {
			transform: `translateX(${(step + id) % 128}px)`,
			opacity: ((step + id) % 10 + 1) / 10
		},
		onClick: () => setLocal((current) => current + 1),
		children: `${id}:${step}:${local}`
	});
}
function DetailFallback(props) {
	const { lifecycle } = props;
	useLayoutEffect(() => {
		lifecycle.detailFallbackSetups++;
		return () => {
			lifecycle.detailFallbackCleanups++;
		};
	}, [lifecycle]);
	return /* @__PURE__ */ _jsx("output", {
		"data-detail": "waiting",
		children: "waiting"
	}, "detail-output");
}
function HealthFallback(props) {
	const { lifecycle } = props;
	useLayoutEffect(() => {
		lifecycle.healthFallbackSetups++;
		return () => {
			lifecycle.healthFallbackCleanups++;
		};
	}, [lifecycle]);
	return /* @__PURE__ */ _jsx("output", {
		"data-health": "waiting",
		children: "waiting"
	}, "health-output");
}
function DetailReady(props) {
	const $ = _c(2);
	const value = use(props.resource.promise);
	let t0;
	if ($[0] !== value) {
		t0 = /* @__PURE__ */ _jsx("output", {
			"data-detail": "ready",
			children: value
		}, "detail-output");
		$[0] = value;
		$[1] = t0;
	} else {
		t0 = $[1];
	}
	return t0;
}
function HealthReady(props) {
	const $ = _c(2);
	const value = use(props.resource.promise);
	let t0;
	if ($[0] !== value) {
		t0 = /* @__PURE__ */ _jsx("output", {
			"data-health": "ready",
			children: value
		}, "health-output");
		$[0] = value;
		$[1] = t0;
	} else {
		t0 = $[1];
	}
	return t0;
}
function ReactScene(props) {
	const $ = _c(25);
	const { scene } = props;
	const rows = useSyncExternalStore(scene.rowsStore.subscribe, scene.rowsStore.getSnapshot, scene.rowsStore.getSnapshot);
	let t0;
	if ($[0] !== rows || $[1] !== scene) {
		let t1;
		if ($[3] !== scene) {
			t1 = (id) => /* @__PURE__ */ _jsx(ReactRow, {
				id,
				scene
			}, id);
			$[3] = scene;
			$[4] = t1;
		} else {
			t1 = $[4];
		}
		t0 = rows.map(t1);
		$[0] = rows;
		$[1] = scene;
		$[2] = t0;
	} else {
		t0 = $[2];
	}
	let t1;
	if ($[5] !== t0) {
		t1 = /* @__PURE__ */ _jsx("div", {
			"data-rows": "ready",
			children: t0
		});
		$[5] = t0;
		$[6] = t1;
	} else {
		t1 = $[6];
	}
	let t2;
	if ($[7] !== scene.lifecycle) {
		t2 = /* @__PURE__ */ _jsx(DetailFallback, { lifecycle: scene.lifecycle });
		$[7] = scene.lifecycle;
		$[8] = t2;
	} else {
		t2 = $[8];
	}
	let t3;
	if ($[9] !== scene.detail) {
		t3 = /* @__PURE__ */ _jsx(DetailReady, { resource: scene.detail });
		$[9] = scene.detail;
		$[10] = t3;
	} else {
		t3 = $[10];
	}
	let t4;
	if ($[11] !== t2 || $[12] !== t3) {
		t4 = /* @__PURE__ */ _jsx(Suspense, {
			fallback: t2,
			children: t3
		});
		$[11] = t2;
		$[12] = t3;
		$[13] = t4;
	} else {
		t4 = $[13];
	}
	let t5;
	if ($[14] !== scene.lifecycle) {
		t5 = /* @__PURE__ */ _jsx(HealthFallback, { lifecycle: scene.lifecycle });
		$[14] = scene.lifecycle;
		$[15] = t5;
	} else {
		t5 = $[15];
	}
	let t6;
	if ($[16] !== scene.health) {
		t6 = /* @__PURE__ */ _jsx(HealthReady, { resource: scene.health });
		$[16] = scene.health;
		$[17] = t6;
	} else {
		t6 = $[17];
	}
	let t7;
	if ($[18] !== t5 || $[19] !== t6) {
		t7 = /* @__PURE__ */ _jsx(Suspense, {
			fallback: t5,
			children: t6
		});
		$[18] = t5;
		$[19] = t6;
		$[20] = t7;
	} else {
		t7 = $[20];
	}
	let t8;
	if ($[21] !== t1 || $[22] !== t4 || $[23] !== t7) {
		t8 = /* @__PURE__ */ _jsxs("main", { children: [
			t1,
			t4,
			t7
		] });
		$[21] = t1;
		$[22] = t4;
		$[23] = t7;
		$[24] = t8;
	} else {
		t8 = $[24];
	}
	return t8;
}
export function mountReact(host) {
	const lifecycle = {
		rowSetups: 0,
		rowCleanups: 0,
		detailFallbackSetups: 0,
		detailFallbackCleanups: 0,
		healthFallbackSetups: 0,
		healthFallbackCleanups: 0
	};
	const scene = {
		stepStore: new ExternalStore(0),
		rowsStore: new ExternalStore(initialRows()),
		detail: deferred(),
		health: deferred(),
		lifecycle
	};
	let root = createRoot(host);
	let disposed = false;
	flushSync(() => {
		root.render(/* @__PURE__ */ _jsx(ReactScene, { scene }));
	});
	const diagnostics = () => ({
		arm: "react",
		rowSetups: lifecycle.rowSetups,
		rowCleanups: lifecycle.rowCleanups,
		detailFallbackSetups: lifecycle.detailFallbackSetups,
		detailFallbackCleanups: lifecycle.detailFallbackCleanups,
		healthFallbackSetups: lifecycle.healthFallbackSetups,
		healthFallbackCleanups: lifecycle.healthFallbackCleanups,
		storeListeners: scene.stepStore.listenerCount + scene.rowsStore.listenerCount,
		storeReaders: null,
		ownerCount: null,
		pendingChangeCount: null,
		disposed
	});
	return {
		updateStep(step) {
			if (disposed) throw new Error("Cannot update a disposed React scene");
			flushSync(() => {
				scene.stepStore.publish(step);
			});
		},
		editRows() {
			if (disposed) throw new Error("Cannot edit a disposed React scene");
			flushSync(() => {
				scene.rowsStore.publish(editedRows());
			});
		},
		settleDetail() {
			if (disposed) throw new Error("Cannot settle a disposed React scene");
			scene.detail.resolve("detail ready");
		},
		settleHealth() {
			if (disposed) throw new Error("Cannot settle a disposed React scene");
			scene.health.resolve("health ready");
		},
		diagnostics,
		dispose() {
			if (!disposed) {
				const activeRoot = root;
				if (activeRoot) flushSync(() => {
					activeRoot.unmount();
				});
				root = null;
				disposed = true;
			}
			return diagnostics();
		}
	};
}
