import { c as _c } from "react/compiler-runtime";
/** @jsxImportSource react */
import React, { useLayoutEffect, useSyncExternalStore } from "react";
import { createRoot, unmountComponentAtNode } from "@react-three/fiber/legacy";
import { OBJECTS, createView, gridX, gridY, phase, start, recordAcceptance } from "./frame";
import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
let time = 0;
const listeners = new Set();
const subscribe = (fn) => {
	listeners.add(fn);
	return () => {
		listeners.delete(fn);
	};
};
const getSnapshot = () => time;
function Motion(t0) {
	const $ = _c(3);
	const { speed, children } = t0;
	const value = useSyncExternalStore(subscribe, getSnapshot);
	const t1 = phase(value) * speed;
	let t2;
	if ($[0] !== children || $[1] !== t1) {
		t2 = /* @__PURE__ */ _jsx("group", {
			"rotation-y": t1,
			children
		});
		$[0] = children;
		$[1] = t1;
		$[2] = t2;
	} else {
		t2 = $[2];
	}
	return t2;
}
function Marker() {
	const $ = _c(5);
	const value = useSyncExternalStore(subscribe, getSnapshot);
	let t0;
	let t1;
	if ($[0] !== value) {
		t0 = () => {
			recordAcceptance(value);
		};
		t1 = [value];
		$[0] = value;
		$[1] = t0;
		$[2] = t1;
	} else {
		t0 = $[1];
		t1 = $[2];
	}
	useLayoutEffect(t0, t1);
	let t2;
	if ($[3] !== value) {
		t2 = /* @__PURE__ */ _jsx("group", {
			name: "accepted-frame",
			"position-x": value
		});
		$[3] = value;
		$[4] = t2;
	} else {
		t2 = $[4];
	}
	return t2;
}
function App() {
	const $ = _c(2);
	let t0;
	if ($[0] === Symbol.for("react.memo_cache_sentinel")) {
		t0 = /* @__PURE__ */ _jsx(Marker, {});
		$[0] = t0;
	} else {
		t0 = $[0];
	}
	let t1;
	if ($[1] === Symbol.for("react.memo_cache_sentinel")) {
		t1 = /* @__PURE__ */ _jsxs(_Fragment, { children: [t0, /* @__PURE__ */ _jsx("group", {
			name: "objects",
			children: Array.from({ length: OBJECTS }, _temp)
		})] });
		$[1] = t1;
	} else {
		t1 = $[1];
	}
	return t1;
}
function _temp(_, id) {
	return /* @__PURE__ */ _jsx("group", {
		name: `object-${id}`,
		"position-x": gridX(id),
		"position-y": gridY(id),
		children: /* @__PURE__ */ _jsx(Motion, {
			speed: id % 4 + 1,
			children: /* @__PURE__ */ _jsxs("mesh", { children: [/* @__PURE__ */ _jsx("boxGeometry", { args: [
				.12,
				.12,
				.12
			] }), /* @__PURE__ */ _jsx("meshBasicMaterial", { color: "orange" })] })
		})
	}, id);
}
const view = createView(), root = createRoot(view.canvas);
await root.configure({
	gl: view.renderer,
	scene: view.scene,
	camera: view.camera,
	frameloop: "never",
	dpr: 1,
	size: {
		width: 640,
		height: 480,
		top: 0,
		left: 0
	}
});
root.render(/* @__PURE__ */ _jsx(App, {}));
start(view, {
	step(value, _epoch, draw) {
		time = value;
		for (const fn of listeners) fn();
		draw();
	},
	async dispose() {
		await new Promise((resolve) => unmountComponentAtNode(view.canvas, () => resolve()));
	}
});
