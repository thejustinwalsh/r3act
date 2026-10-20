import { c as _c } from "react/compiler-runtime";
/** @jsxImportSource react */
import { Suspense, use, useLayoutEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { flushSync } from "react-dom";
import { BoxGeometry, Group, Mesh, MeshStandardMaterial, Scene } from "three";
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
const scene = new Scene();
const sceneRoot = new Group();
scene.add(sceneRoot);
const mesh = new Mesh(new BoxGeometry(), new MeshStandardMaterial());
mesh.name = "step-0";
mesh.position.set(1, 2, 3);
sceneRoot.add(mesh);
const fallback = new Group();
fallback.name = "waiting";
sceneRoot.add(fallback);
let resolvePending;
const pending = new Promise((done) => {
	resolvePending = done;
});
let pendingStatus = "pending";
void pending.then(() => {
	pendingStatus = "fulfilled";
});
const trace = {
	mounts: {},
	cleanups: {}
};
const initialRows = [{
	id: "a",
	label: "Alpha"
}, {
	id: "b",
	label: "Beta"
}];
function Row(t0) {
	const $ = _c(6);
	const { row } = t0;
	let t1;
	let t2;
	if ($[0] !== row.id) {
		t1 = () => {
			trace.mounts[row.id] = (trace.mounts[row.id] ?? 0) + 1;
			return () => {
				trace.cleanups[row.id] = (trace.cleanups[row.id] ?? 0) + 1;
			};
		};
		t2 = [row.id];
		$[0] = row.id;
		$[1] = t1;
		$[2] = t2;
	} else {
		t1 = $[1];
		t2 = $[2];
	}
	useLayoutEffect(t1, t2);
	let t3;
	if ($[3] !== row.id || $[4] !== row.label) {
		t3 = /* @__PURE__ */ _jsx("li", {
			"data-row": row.id,
			children: row.label
		});
		$[3] = row.id;
		$[4] = row.label;
		$[5] = t3;
	} else {
		t3 = $[5];
	}
	return t3;
}
function PendingScene() {
	const $ = _c(3);
	const value = use(pending);
	let t0;
	let t1;
	if ($[0] !== value.x) {
		t0 = () => {
			fallback.name = `ready-${value.x}`;
			return _temp;
		};
		t1 = [value.x];
		$[0] = value.x;
		$[1] = t0;
		$[2] = t1;
	} else {
		t0 = $[1];
		t1 = $[2];
	}
	useLayoutEffect(t0, t1);
	return null;
}
function _temp() {
	sceneRoot.remove(fallback);
}
function PendingDom() {
	const $ = _c(2);
	const value = use(pending);
	const t0 = `ready-${value.x}`;
	let t1;
	if ($[0] !== t0) {
		t1 = /* @__PURE__ */ _jsx("span", { "data-dom-pending": t0 });
		$[0] = t0;
		$[1] = t1;
	} else {
		t1 = $[1];
	}
	return t1;
}
function Hot(t0) {
	const $ = _c(6);
	const { step } = t0;
	const t1 = step === 0 ? "first" : "second";
	let t2;
	if ($[0] !== step) {
		t2 = step === 0 ? {
			color: "red",
			opacity: 1
		} : { color: "blue" };
		$[0] = step;
		$[1] = t2;
	} else {
		t2 = $[1];
	}
	let t3;
	if ($[2] !== step || $[3] !== t1 || $[4] !== t2) {
		t3 = /* @__PURE__ */ _jsx("output", {
			"data-target": "value",
			"data-scalar": t1,
			"data-step": step,
			style: t2
		});
		$[2] = step;
		$[3] = t1;
		$[4] = t2;
		$[5] = t3;
	} else {
		t3 = $[5];
	}
	return t3;
}
function App() {
	const $ = _c(16);
	const [step, setStep] = useState(0);
	const [rows, setRows] = useState(initialRows);
	let t0;
	let t1;
	if ($[0] !== step) {
		t0 = () => {
			mesh.name = `step-${step}`;
			mesh.position.set(step === 0 ? 1 : 4, step === 0 ? 2 : 5, step === 0 ? 3 : 6);
			mesh.rotation.set(0, step === 0 ? 0 : .5, 0);
		};
		t1 = [step];
		$[0] = step;
		$[1] = t0;
		$[2] = t1;
	} else {
		t0 = $[1];
		t1 = $[2];
	}
	useLayoutEffect(t0, t1);
	let t2;
	if ($[3] === Symbol.for("react.memo_cache_sentinel")) {
		t2 = /* @__PURE__ */ _jsx("button", {
			type: "button",
			"data-action": "update",
			onClick: () => setStep(1),
			children: "Update values"
		});
		$[3] = t2;
	} else {
		t2 = $[3];
	}
	let t3;
	if ($[4] === Symbol.for("react.memo_cache_sentinel")) {
		t3 = /* @__PURE__ */ _jsx("button", {
			type: "button",
			"data-action": "structure",
			onClick: () => setRows(_temp3),
			children: "Change rows"
		});
		$[4] = t3;
	} else {
		t3 = $[4];
	}
	let t4;
	if ($[5] !== step) {
		t4 = /* @__PURE__ */ _jsx(Hot, { step });
		$[5] = step;
		$[6] = t4;
	} else {
		t4 = $[6];
	}
	let t5;
	if ($[7] !== rows) {
		t5 = rows.map(_temp4);
		$[7] = rows;
		$[8] = t5;
	} else {
		t5 = $[8];
	}
	let t6;
	if ($[9] !== t5) {
		t6 = /* @__PURE__ */ _jsx("ul", {
			"data-list": "rows",
			children: t5
		});
		$[9] = t5;
		$[10] = t6;
	} else {
		t6 = $[10];
	}
	let t7;
	if ($[11] === Symbol.for("react.memo_cache_sentinel")) {
		t7 = /* @__PURE__ */ _jsx(Suspense, {
			fallback: /* @__PURE__ */ _jsx("span", { "data-dom-pending": "waiting" }),
			children: /* @__PURE__ */ _jsx(PendingDom, {})
		});
		$[11] = t7;
	} else {
		t7 = $[11];
	}
	let t8;
	if ($[12] === Symbol.for("react.memo_cache_sentinel")) {
		t8 = /* @__PURE__ */ _jsx(Suspense, {
			fallback: null,
			children: /* @__PURE__ */ _jsx(PendingScene, {})
		});
		$[12] = t8;
	} else {
		t8 = $[12];
	}
	let t9;
	if ($[13] !== t4 || $[14] !== t6) {
		t9 = /* @__PURE__ */ _jsxs("main", { children: [
			t2,
			t3,
			t4,
			t6,
			t7,
			t8
		] });
		$[13] = t4;
		$[14] = t6;
		$[15] = t9;
	} else {
		t9 = $[15];
	}
	return t9;
}
function _temp4(row_0) {
	return /* @__PURE__ */ _jsx(Row, { row: row_0 }, row_0.id);
}
function _temp3(current) {
	return [current.find(_temp2), {
		id: "c",
		label: "Charlie"
	}];
}
function _temp2(row) {
	return row.id === "b";
}
const root = createRoot(document.getElementById("app"));
flushSync(() => root.render(/* @__PURE__ */ _jsx(App, {})));
const target = document.querySelector("[data-target=\"value\"]");
const rowB = document.querySelector("[data-row=\"b\"]");
let disposed = false;
const snapshot = () => {
	const element = document.querySelector("[data-target=\"value\"]");
	const pendingChild = sceneRoot.children.find((child) => child.name === "waiting" || child.name.startsWith("ready-"));
	return {
		color: element?.style.color ?? null,
		opacity: element?.style.opacity ?? null,
		scalar: element?.getAttribute("data-scalar") ?? null,
		step: element?.getAttribute("data-step") ?? null,
		targetRetained: element === target,
		rowOrder: Array.from(document.querySelectorAll("[data-row]")).map((node) => node.getAttribute("data-row")),
		rowBRetained: document.querySelector("[data-row=\"b\"]") === rowB,
		mounts: { ...trace.mounts },
		cleanups: { ...trace.cleanups },
		meshRetained: sceneRoot.children.includes(mesh),
		position: mesh.position.toArray(),
		rotation: mesh.rotation.toArray().slice(0, 3),
		pending: pendingStatus,
		pendingName: pendingChild?.name ?? null,
		fallbackRetained: pendingChild === fallback,
		domPending: document.querySelector("[data-dom-pending]")?.getAttribute("data-dom-pending") ?? null,
		disposed
	};
};
window.hostValueProof = {
	snapshot,
	resolvePending(x) {
		resolvePending({ x });
	},
	dispose() {
		if (disposed) return;
		flushSync(() => root.unmount());
		sceneRoot.remove(fallback);
		sceneRoot.remove(mesh);
		mesh.geometry.dispose();
		mesh.material.dispose();
		disposed = true;
	}
};
