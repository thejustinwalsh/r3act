import { c as _c } from "react/compiler-runtime";
/** @jsxImportSource react */
import { Suspense, use, useLayoutEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { flushSync } from "react-dom";
import { Group, Mesh, Scene } from "three";
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
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
	opaqueValue: "A",
	opaqueCalls: 0,
	getterCalls: 0,
	opaqueMounts: 0,
	opaqueCleanups: 0,
	hotMounts: 0,
	hotCleanups: 0
};
const opaqueSource = { get value() {
	trace.getterCalls++;
	return trace.opaqueValue;
} };
function readOpaque() {
	trace.opaqueCalls++;
	return opaqueSource.value;
}
let setOpaque;
let setHot;
function OpaqueSibling() {
	const $ = _c(5);
	const [n, updateN] = useState(0);
	let t0;
	let t1;
	if ($[0] === Symbol.for("react.memo_cache_sentinel")) {
		t0 = () => {
			trace.opaqueMounts = trace.opaqueMounts + 1;
			setOpaque = updateN;
			return _temp;
		};
		t1 = [updateN];
		$[0] = t0;
		$[1] = t1;
	} else {
		t0 = $[0];
		t1 = $[1];
	}
	useLayoutEffect(t0, t1);
	let t2;
	if ($[2] === Symbol.for("react.memo_cache_sentinel")) {
		t2 = readOpaque();
		$[2] = t2;
	} else {
		t2 = $[2];
	}
	const opaque = t2;
	const t3 = n + 1;
	let t4;
	if ($[3] !== t3) {
		t4 = /* @__PURE__ */ _jsx("output", {
			"data-n": t3,
			"data-opaque": opaque
		});
		$[3] = t3;
		$[4] = t4;
	} else {
		t4 = $[4];
	}
	return t4;
}
function _temp() {
	trace.opaqueCleanups = trace.opaqueCleanups + 1;
}
function HotCounter() {
	const $ = _c(4);
	const [n, updateN] = useState(0);
	let t0;
	let t1;
	if ($[0] === Symbol.for("react.memo_cache_sentinel")) {
		t0 = () => {
			trace.hotMounts = trace.hotMounts + 1;
			setHot = updateN;
			return _temp2;
		};
		t1 = [updateN];
		$[0] = t0;
		$[1] = t1;
	} else {
		t0 = $[0];
		t1 = $[1];
	}
	useLayoutEffect(t0, t1);
	const t2 = n + 1;
	let t3;
	if ($[2] !== t2) {
		t3 = /* @__PURE__ */ _jsx("output", { "data-hot": t2 });
		$[2] = t2;
		$[3] = t3;
	} else {
		t3 = $[3];
	}
	return t3;
}
function _temp2() {
	trace.hotCleanups = trace.hotCleanups + 1;
}
function PureNamed() {
	const $ = _c(2);
	const [n] = useState(0);
	const t0 = n + 1;
	let t1;
	if ($[0] !== t0) {
		t1 = /* @__PURE__ */ _jsx("output", { "data-pure-named": t0 });
		$[0] = t0;
		$[1] = t1;
	} else {
		t1 = $[1];
	}
	return t1;
}
function PureArrow() {
	const $ = _c(2);
	const [n] = useState(0);
	const t0 = n + 1;
	let t1;
	if ($[0] !== t0) {
		t1 = /* @__PURE__ */ _jsx("output", { "data-pure-arrow": t0 });
		$[0] = t0;
		$[1] = t1;
	} else {
		t1 = $[1];
	}
	return t1;
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
	const $ = _c(8);
	let t0;
	let t1;
	let t2;
	let t3;
	let t4;
	let t5;
	let t6;
	if ($[0] === Symbol.for("react.memo_cache_sentinel")) {
		t0 = /* @__PURE__ */ _jsx("h1", { children: "Numeric owner effects" });
		t1 = /* @__PURE__ */ _jsx("button", {
			type: "button",
			"data-action": "hot",
			onClick: _temp3,
			children: "Update safe owner"
		});
		t2 = /* @__PURE__ */ _jsx("button", {
			type: "button",
			"data-action": "opaque",
			onClick: _temp4,
			children: "Update opaque owner"
		});
		t3 = /* @__PURE__ */ _jsx(OpaqueSibling, {});
		t4 = /* @__PURE__ */ _jsx(HotCounter, {});
		t5 = /* @__PURE__ */ _jsx(PureNamed, {});
		t6 = /* @__PURE__ */ _jsx(PureArrow, {});
		$[0] = t0;
		$[1] = t1;
		$[2] = t2;
		$[3] = t3;
		$[4] = t4;
		$[5] = t5;
		$[6] = t6;
	} else {
		t0 = $[0];
		t1 = $[1];
		t2 = $[2];
		t3 = $[3];
		t4 = $[4];
		t5 = $[5];
		t6 = $[6];
	}
	let t7;
	if ($[7] === Symbol.for("react.memo_cache_sentinel")) {
		t7 = /* @__PURE__ */ _jsxs("main", { children: [
			t0,
			t1,
			t2,
			t3,
			t4,
			t5,
			t6,
			/* @__PURE__ */ _jsx(Suspense, {
				fallback: null,
				children: /* @__PURE__ */ _jsx(SceneReveal, {})
			})
		] });
		$[7] = t7;
	} else {
		t7 = $[7];
	}
	return t7;
}
function _temp4() {
	trace.opaqueValue = "B";
	setOpaque(1);
}
function _temp3() {
	return setHot(1);
}
const root = createRoot(document.getElementById("app"));
flushSync(() => root.render(/* @__PURE__ */ _jsx(App, {})));
const opaqueInitial = document.querySelector("[data-opaque]");
const hotInitial = document.querySelector("[data-hot]");
let disposed = false;
const snapshot = () => {
	const opaque = document.querySelector("[data-opaque]");
	const hot = document.querySelector("[data-hot]");
	const sceneChild = scene.children[0];
	return {
		opaqueN: opaque?.getAttribute("data-n") ?? null,
		opaqueValue: opaque?.getAttribute("data-opaque") ?? null,
		opaqueRetained: opaque === opaqueInitial,
		hot: hot?.getAttribute("data-hot") ?? null,
		hotRetained: hot === hotInitial,
		opaqueCalls: trace.opaqueCalls,
		getterCalls: trace.getterCalls,
		opaqueMounts: trace.opaqueMounts,
		opaqueCleanups: trace.opaqueCleanups,
		hotMounts: trace.hotMounts,
		hotCleanups: trace.hotCleanups,
		sceneStatus: sceneResolved ? "fulfilled" : "pending",
		sceneFallbackRetained: sceneChild === sceneFallback,
		scenePosition: sceneChild?.children[0]?.position.toArray() ?? null,
		disposed
	};
};
window.numericOwnerProof = {
	snapshot,
	updateHot(value) {
		setHot(value);
	},
	updateOpaque(value, opaque) {
		trace.opaqueValue = opaque;
		setOpaque(value);
	},
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
