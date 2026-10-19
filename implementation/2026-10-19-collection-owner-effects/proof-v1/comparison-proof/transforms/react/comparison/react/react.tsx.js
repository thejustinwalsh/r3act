import { c as _c } from "react/compiler-runtime";
/** @jsxImportSource react */
import { Suspense, use, useLayoutEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { flushSync } from "react-dom";
import { Group, Mesh, Scene } from "three";
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
const initialOpaque = [
	{
		id: "a",
		label: "Alpha"
	},
	{
		id: "b",
		label: "Beta"
	},
	{
		id: "c",
		label: "Gamma"
	}
];
const initialSafe = [{
	id: "p",
	label: "Pure"
}, {
	id: "q",
	label: "Quiet"
}];
const scene = new Scene();
const sceneFallback = new Group();
sceneFallback.name = "waiting";
scene.add(sceneFallback);
let resolveScene;
const scenePromise = new Promise((done) => {
	resolveScene = done;
});
let sceneResolved = false;
void scenePromise.then(() => {
	sceneResolved = true;
});
const trace = {
	value: "A",
	opaqueCalls: 0,
	getterCalls: 0,
	mounts: {},
	cleanups: {},
	setters: {}
};
const opaqueSource = { get value() {
	trace.getterCalls++;
	return trace.value;
} };
function readOpaque() {
	trace.opaqueCalls++;
	return opaqueSource.value;
}
function Row(t0) {
	const $ = _c(7);
	const { row } = t0;
	const [count, setCount] = useState(0);
	let t1;
	let t2;
	if ($[0] !== row.id) {
		t1 = () => {
			trace.mounts[row.id] = (trace.mounts[row.id] ?? 0) + 1;
			trace.setters[row.id] = setCount;
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
	if ($[3] !== count || $[4] !== row.id || $[5] !== row.label) {
		t3 = /* @__PURE__ */ _jsx("li", {
			"data-row": row.id,
			"data-count": count,
			children: row.label
		});
		$[3] = count;
		$[4] = row.id;
		$[5] = row.label;
		$[6] = t3;
	} else {
		t3 = $[6];
	}
	return t3;
}
function OpaqueCollection() {
	"use no memo";
	const [rows, setRows] = useState(initialOpaque);
	const opaque = readOpaque();
	return /* @__PURE__ */ _jsxs("section", { children: [
		/* @__PURE__ */ _jsx("button", {
			type: "button",
			"data-action": "opaque",
			onClick: () => {
				trace.value = "B";
				setRows((current) => [
					current[2],
					current[0],
					current[1]
				]);
			},
			children: "Move opaque row"
		}),
		/* @__PURE__ */ _jsx("button", {
			type: "button",
			"data-action": "structure",
			onClick: () => setRows((current_0) => [
				current_0.find((row) => row.id === "c"),
				{
					id: "d",
					label: "Delta"
				},
				{
					id: "b",
					label: "Bravo"
				}
			]),
			children: "Change structure"
		}),
		/* @__PURE__ */ _jsx("output", { "data-opaque": opaque }),
		/* @__PURE__ */ _jsx("ul", {
			"data-list": "opaque",
			children: rows.map((row_0) => /* @__PURE__ */ _jsx(Row, { row: row_0 }, row_0.id))
		})
	] });
}
function SafeCollection() {
	const $ = _c(5);
	const [rows, setRows] = useState(initialSafe);
	let t0;
	if ($[0] === Symbol.for("react.memo_cache_sentinel")) {
		t0 = /* @__PURE__ */ _jsx("button", {
			type: "button",
			"data-action": "safe",
			onClick: () => setRows(_temp5),
			children: "Move safe row"
		});
		$[0] = t0;
	} else {
		t0 = $[0];
	}
	let t1;
	if ($[1] !== rows) {
		t1 = rows.map(_temp6);
		$[1] = rows;
		$[2] = t1;
	} else {
		t1 = $[2];
	}
	let t2;
	if ($[3] !== t1) {
		t2 = /* @__PURE__ */ _jsxs("section", { children: [t0, /* @__PURE__ */ _jsx("ol", {
			"data-list": "safe",
			children: t1
		})] });
		$[3] = t1;
		$[4] = t2;
	} else {
		t2 = $[4];
	}
	return t2;
}
function _temp6(row) {
	return /* @__PURE__ */ _jsx(Row, { row }, row.id);
}
function _temp5(current) {
	return [current[1], current[0]];
}
function SceneReveal() {
	const $ = _c(3);
	const value = use(scenePromise);
	let t0;
	let t1;
	if ($[0] !== value.sample.x) {
		t0 = () => {
			const group = new Group();
			const mesh = new Mesh();
			mesh.position.set(value.sample.x, 0, 0);
			group.add(mesh);
			scene.remove(sceneFallback);
			scene.add(group);
			return () => {
				scene.remove(group);
			};
		};
		t1 = [value.sample.x];
		$[0] = value.sample.x;
		$[1] = t0;
		$[2] = t1;
	} else {
		t0 = $[1];
		t1 = $[2];
	}
	useLayoutEffect(t0, t1);
	return null;
}
function App() {
	const $ = _c(5);
	let t0;
	let t1;
	let t2;
	let t3;
	if ($[0] === Symbol.for("react.memo_cache_sentinel")) {
		t0 = /* @__PURE__ */ _jsx("h1", { children: "Collection owner effects" });
		t1 = /* @__PURE__ */ _jsx("button", {
			type: "button",
			"data-action": "row",
			onClick: _temp7,
			children: "Update row"
		});
		t2 = /* @__PURE__ */ _jsx(OpaqueCollection, {});
		t3 = /* @__PURE__ */ _jsx(SafeCollection, {});
		$[0] = t0;
		$[1] = t1;
		$[2] = t2;
		$[3] = t3;
	} else {
		t0 = $[0];
		t1 = $[1];
		t2 = $[2];
		t3 = $[3];
	}
	let t4;
	if ($[4] === Symbol.for("react.memo_cache_sentinel")) {
		t4 = /* @__PURE__ */ _jsxs("main", { children: [
			t0,
			t1,
			t2,
			t3,
			/* @__PURE__ */ _jsx(Suspense, {
				fallback: null,
				children: /* @__PURE__ */ _jsx(SceneReveal, {})
			})
		] });
		$[4] = t4;
	} else {
		t4 = $[4];
	}
	return t4;
}
function _temp7() {
	return trace.setters.b?.(7);
}
const root = createRoot(document.getElementById("app"));
flushSync(() => root.render(/* @__PURE__ */ _jsx(App, {})));
const identities = Object.fromEntries([
	"a",
	"b",
	"c",
	"p",
	"q"
].map((id) => [id, document.querySelector(`[data-row="${id}"]`)]));
const opaqueIdentity = document.querySelector("[data-opaque]");
let disposed = false;
const snapshot = () => {
	const list = (name) => Array.from(document.querySelectorAll(`[data-list="${name}"] [data-row]`)).map((node) => node.getAttribute("data-row"));
	const row = (id) => document.querySelector(`[data-row="${id}"]`);
	const sceneChild = scene.children[0];
	return {
		opaque: document.querySelector("[data-opaque]")?.getAttribute("data-opaque") ?? null,
		opaqueRetained: document.querySelector("[data-opaque]") === opaqueIdentity,
		opaqueCalls: trace.opaqueCalls,
		getterCalls: trace.getterCalls,
		opaqueOrder: list("opaque"),
		safeOrder: list("safe"),
		rowBCount: row("b")?.getAttribute("data-count") ?? null,
		rowBLabel: row("b")?.textContent ?? null,
		retained: Object.fromEntries(Object.entries(identities).map(([id, node]) => [id, row(id) === node])),
		mounts: { ...trace.mounts },
		cleanups: { ...trace.cleanups },
		sceneStatus: sceneResolved ? "fulfilled" : "pending",
		sceneName: sceneChild?.name ?? null,
		sceneFallbackRetained: sceneChild === sceneFallback,
		scenePosition: sceneChild?.children[0]?.position.toArray() ?? null,
		disposed
	};
};
window.collectionOwnerProof = {
	snapshot,
	resolveScene(x) {
		resolveScene({ sample: { x } });
	},
	dispose() {
		if (disposed) return;
		flushSync(() => root.unmount());
		scene.remove(sceneFallback);
		disposed = true;
	}
};
