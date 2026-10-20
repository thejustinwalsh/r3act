import { c as _c } from "react/compiler-runtime";
/** @jsxImportSource react */
import { useLayoutEffect } from "react";
import { createRoot } from "react-dom/client";
import { flushSync } from "react-dom";
import { Group, Scene } from "three";
import { jsx as _jsx } from "react/jsx-runtime";
const deferred = () => {
	let resolve;
	const promise = new Promise((done) => {
		resolve = done;
	});
	return {
		promise,
		resolve
	};
};
const providers = {
	A: deferred(),
	B: deferred(),
	C: deferred(),
	urgent: deferred()
};
const started = ["A"], settled = [];
const statuses = {
	A: "pending",
	B: null,
	C: null,
	urgent: null
};
let request = "A", accepted = "old", urgentValue = null, disposed = false;
const scene = new Scene(), sceneRoot = new Group(), sceneValue = new Group();
sceneValue.name = "old";
sceneRoot.add(sceneValue);
scene.add(sceneRoot);
const trace = {
	mounts: {},
	cleanups: {}
};
function Result(t0) {
	const $ = _c(6);
	const { value } = t0;
	let t1;
	let t2;
	if ($[0] !== value) {
		t1 = () => {
			trace.mounts[value] = (trace.mounts[value] ?? 0) + 1;
			return () => {
				trace.cleanups[value] = (trace.cleanups[value] ?? 0) + 1;
			};
		};
		t2 = [value];
		$[0] = value;
		$[1] = t1;
		$[2] = t2;
	} else {
		t1 = $[1];
		t2 = $[2];
	}
	useLayoutEffect(t1, t2);
	const t3 = value === "old" ? "none" : "C";
	let t4;
	if ($[3] !== t3 || $[4] !== value) {
		t4 = /* @__PURE__ */ _jsx("output", {
			"data-result": value,
			"data-request": t3,
			children: value
		});
		$[3] = t3;
		$[4] = value;
		$[5] = t4;
	} else {
		t4 = $[5];
	}
	return t4;
}
function Hot(t0) {
	const $ = _c(2);
	const { value } = t0;
	let t1;
	if ($[0] !== value) {
		t1 = /* @__PURE__ */ _jsx("main", {
			"data-shared": "shared",
			children: /* @__PURE__ */ _jsx(Result, { value })
		});
		$[0] = value;
		$[1] = t1;
	} else {
		t1 = $[1];
	}
	return t1;
}
function App(t0) {
	const $ = _c(2);
	const { value } = t0;
	let t1;
	if ($[0] !== value) {
		t1 = /* @__PURE__ */ _jsx(Hot, { value });
		$[0] = value;
		$[1] = t1;
	} else {
		t1 = $[1];
	}
	return t1;
}
const root = createRoot(document.getElementById("app"));
const fork = createRoot(document.getElementById("fork"));
const urgentRoot = createRoot(document.getElementById("urgent"));
const render = () => flushSync(() => {
	root.render(/* @__PURE__ */ _jsx(App, { value: accepted }));
	fork.render(/* @__PURE__ */ _jsx(App, { value: accepted }));
	urgentRoot.render(urgentValue === null ? null : /* @__PURE__ */ _jsx("output", {
		"data-urgent": urgentValue,
		children: urgentValue
	}));
});
render();
const completion = new Map();
const resolvers = new Map();
for (const label of [
	"A",
	"B",
	"C",
	"urgent"
]) completion.set(label, new Promise((resolve) => resolvers.set(label, resolve)));
const finish = (label, status) => {
	statuses[label] = status;
	settled.push(`${label}:${status}`);
	resolvers.get(label)?.({ status });
};
for (const label of [
	"A",
	"B",
	"C"
]) void providers[label].promise.then((value) => {
	if (statuses[label] !== "pending" || request !== label || disposed) return;
	accepted = value;
	sceneValue.name = value;
	finish(label, "committed");
	render();
});
void providers.urgent.promise.then((value) => {
	if (statuses.urgent !== "pending" || disposed) return;
	urgentValue = value;
	finish("urgent", "committed");
	render();
});
const snapshot = () => ({
	request,
	accepted: document.querySelector("[data-result]")?.getAttribute("data-result") ?? null,
	fork: document.getElementById("fork")?.querySelector("[data-result]")?.getAttribute("data-result") ?? null,
	scene: sceneRoot.children[0]?.name ?? null,
	urgent: document.querySelector("[data-urgent]")?.getAttribute("data-urgent") ?? null,
	statuses: { ...statuses },
	started: [...started],
	settled: [...settled],
	mounts: { ...trace.mounts },
	cleanups: { ...trace.cleanups },
	disposed
});
window.replacementProof = {
	snapshot,
	replace() {
		request = "B";
		statuses.B = "pending";
		finish("A", "cancelled");
		request = "C";
		statuses.C = "pending";
		started.push("C");
		finish("B", "cancelled");
		return "cancelled";
	},
	startUrgent() {
		statuses.urgent = "pending";
		started.push("urgent");
	},
	settle(label, value) {
		providers[label].resolve(value);
	},
	async wait(label) {
		return await completion.get(label);
	},
	dispose() {
		if (disposed) return;
		disposed = true;
		flushSync(() => {
			root.unmount();
			fork.unmount();
			urgentRoot.unmount();
		});
		sceneRoot.remove(sceneValue);
	}
};
