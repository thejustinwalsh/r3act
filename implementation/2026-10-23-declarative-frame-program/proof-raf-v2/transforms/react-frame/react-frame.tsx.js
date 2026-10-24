import { c as _c } from "react/compiler-runtime";
/** @jsxImportSource react */
import React, { useRef } from "react";
import { createRoot, unmountComponentAtNode, useFrame } from "@react-three/fiber/legacy";
import { OBJECTS, createView, gridX, gridY, phase, start, recordAcceptance } from "./frame";
import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
let time = 0;
function Motion(t0) {
	const $ = _c(5);
	const { speed, children } = t0;
	const target = useRef(null);
	let t1;
	if ($[0] !== speed) {
		t1 = () => {
			target.current.rotation.y = phase(time) * speed;
		};
		$[0] = speed;
		$[1] = t1;
	} else {
		t1 = $[1];
	}
	let t2;
	if ($[2] === Symbol.for("react.memo_cache_sentinel")) {
		t2 = { phase: "update" };
		$[2] = t2;
	} else {
		t2 = $[2];
	}
	useFrame(t1, t2);
	let t3;
	if ($[3] !== children) {
		t3 = /* @__PURE__ */ _jsx("group", {
			ref: target,
			children
		});
		$[3] = children;
		$[4] = t3;
	} else {
		t3 = $[4];
	}
	return t3;
}
function Marker() {
	const $ = _c(3);
	const target = useRef(null);
	let t0;
	let t1;
	if ($[0] === Symbol.for("react.memo_cache_sentinel")) {
		t0 = () => {
			target.current.position.x = time;
			recordAcceptance(time);
		};
		t1 = { phase: "update" };
		$[0] = t0;
		$[1] = t1;
	} else {
		t0 = $[0];
		t1 = $[1];
	}
	useFrame(t0, t1);
	let t2;
	if ($[2] === Symbol.for("react.memo_cache_sentinel")) {
		t2 = /* @__PURE__ */ _jsx("group", {
			name: "accepted-frame",
			ref: target
		});
		$[2] = t2;
	} else {
		t2 = $[2];
	}
	return t2;
}
function RenderTakeover() {
	const $ = _c(1);
	let t0;
	if ($[0] === Symbol.for("react.memo_cache_sentinel")) {
		t0 = { phase: "render" };
		$[0] = t0;
	} else {
		t0 = $[0];
	}
	useFrame(_temp, t0);
	return null;
}
function _temp() {}
function App() {
	const $ = _c(3);
	let t0;
	let t1;
	if ($[0] === Symbol.for("react.memo_cache_sentinel")) {
		t0 = /* @__PURE__ */ _jsx(Marker, {});
		t1 = /* @__PURE__ */ _jsx(RenderTakeover, {});
		$[0] = t0;
		$[1] = t1;
	} else {
		t0 = $[0];
		t1 = $[1];
	}
	let t2;
	if ($[2] === Symbol.for("react.memo_cache_sentinel")) {
		t2 = /* @__PURE__ */ _jsxs(_Fragment, { children: [
			t0,
			t1,
			/* @__PURE__ */ _jsx("group", {
				name: "objects",
				children: Array.from({ length: OBJECTS }, _temp2)
			})
		] });
		$[2] = t2;
	} else {
		t2 = $[2];
	}
	return t2;
}
function _temp2(_, id) {
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
const store = root.render(/* @__PURE__ */ _jsx(App, {}));
start(view, {
	step(value, _epoch, draw) {
		time = value;
		store.getState().advance(performance.now());
		draw();
	},
	async dispose() {
		await new Promise((resolve) => unmountComponentAtNode(view.canvas, () => resolve()));
	}
});
