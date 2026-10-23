import { c as _c } from "react/compiler-runtime";
/** @jsxImportSource react */
import React, { useLayoutEffect, useState, useSyncExternalStore } from "react";
import { createRoot, flushSync, unmountComponentAtNode } from "@react-three/fiber/legacy";
import { OBJECTS, applyCommonRendererSettings, createView, gridX, gridY, start, value } from "./scene";
import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
const listeners = new Set();
let snapshot = Object.freeze({
	phase: 0,
	epoch: 0
});
const clock = {
	subscribe(listener) {
		listeners.add(listener);
		return () => {
			listeners.delete(listener);
		};
	},
	getSnapshot() {
		return snapshot;
	},
	dispatch(frame) {
		snapshot = Object.freeze(frame);
		for (const listener of listeners) listener();
	}
};
const controls = [];
const { scene, camera, renderer } = createView();
const canvas = renderer.domElement;
function Position(t0) {
	const $ = _c(8);
	const { id, children } = t0;
	const frame = useSyncExternalStore(clock.subscribe, clock.getSnapshot);
	const [offset, setOffset] = useState(0);
	let t1;
	let t2;
	if ($[0] !== id) {
		t1 = () => {
			controls[id] = setOffset;
			return () => {
				controls[id] = undefined;
			};
		};
		t2 = [id];
		$[0] = id;
		$[1] = t1;
		$[2] = t2;
	} else {
		t1 = $[1];
		t2 = $[2];
	}
	useLayoutEffect(t1, t2);
	const t3 = frame.phase * .01 + offset;
	const t4 = frame.phase * .005 + offset * .5;
	const t5 = frame.phase * 1e-4 + offset * .01;
	let t6;
	if ($[3] !== children || $[4] !== t3 || $[5] !== t4 || $[6] !== t5) {
		t6 = /* @__PURE__ */ _jsx("group", {
			"position-x": t3,
			"position-y": t4,
			"rotation-z": t5,
			children
		}, "motion");
		$[3] = children;
		$[4] = t3;
		$[5] = t4;
		$[6] = t5;
		$[7] = t6;
	} else {
		t6 = $[7];
	}
	return t6;
}
function Rotation(t0) {
	const $ = _c(8);
	const { id, children } = t0;
	const frame = useSyncExternalStore(clock.subscribe, clock.getSnapshot);
	const [offset, setOffset] = useState(0);
	let t1;
	let t2;
	if ($[0] !== id) {
		t1 = () => {
			controls[id] = setOffset;
			return () => {
				controls[id] = undefined;
			};
		};
		t2 = [id];
		$[0] = id;
		$[1] = t1;
		$[2] = t2;
	} else {
		t1 = $[1];
		t2 = $[2];
	}
	useLayoutEffect(t1, t2);
	const t3 = frame.phase * .0025 + offset;
	const t4 = frame.phase * .0075 + offset * .5;
	const t5 = frame.phase * 2e-4 + offset * .01;
	let t6;
	if ($[3] !== children || $[4] !== t3 || $[5] !== t4 || $[6] !== t5) {
		t6 = /* @__PURE__ */ _jsx("group", {
			"position-x": t3,
			"position-y": t4,
			"rotation-z": t5,
			children
		}, "motion");
		$[3] = children;
		$[4] = t3;
		$[5] = t4;
		$[6] = t5;
		$[7] = t6;
	} else {
		t6 = $[7];
	}
	return t6;
}
function FrameMarker() {
	const $ = _c(2);
	const frame = useSyncExternalStore(clock.subscribe, clock.getSnapshot);
	let t0;
	if ($[0] !== frame.epoch) {
		t0 = /* @__PURE__ */ _jsx("group", {
			name: "accepted-frame",
			"position-x": frame.epoch
		});
		$[0] = frame.epoch;
		$[1] = t0;
	} else {
		t0 = $[1];
	}
	return t0;
}
function App() {
	const $ = _c(2);
	let t0;
	if ($[0] === Symbol.for("react.memo_cache_sentinel")) {
		t0 = /* @__PURE__ */ _jsx(FrameMarker, {});
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
		children: id % 2 === 0 ? /* @__PURE__ */ _jsx(Position, {
			id,
			children: /* @__PURE__ */ _jsx("group", {
				name: `child-${id}`,
				children: /* @__PURE__ */ _jsxs("mesh", { children: [/* @__PURE__ */ _jsx("boxGeometry", { args: [
					.12,
					.12,
					.12
				] }), /* @__PURE__ */ _jsx("meshBasicMaterial", { color: "orange" })] })
			})
		}, "motion") : /* @__PURE__ */ _jsx(Rotation, {
			id,
			children: /* @__PURE__ */ _jsx("group", {
				name: `child-${id}`,
				children: /* @__PURE__ */ _jsxs("mesh", { children: [/* @__PURE__ */ _jsx("boxGeometry", { args: [
					.12,
					.12,
					.12
				] }), /* @__PURE__ */ _jsx("meshBasicMaterial", { color: "orange" })] })
			})
		}, "motion")
	}, id);
}
const root = createRoot(canvas);
const setupStart = performance.now();
await root.configure({
	gl: renderer,
	scene,
	camera,
	frameloop: "never",
	dpr: 1,
	size: {
		width: canvas.width,
		height: canvas.height,
		top: 0,
		left: 0
	}
});
applyCommonRendererSettings(renderer);
root.render(/* @__PURE__ */ _jsx(App, {}));
const setupMs = performance.now() - setupStart;
start({
	scene,
	camera,
	renderer,
	controlProof() {
		if (controls.filter(Boolean).length !== OBJECTS) throw new Error("Missing declarative R3F local controls");
		flushSync(() => {
			controls[0](2);
			controls[1](3);
		});
		const objects = scene.getObjectByName("objects").children;
		if (objects[0].children[0].position.x !== 2 || objects[1].children[0].position.x !== 3) throw new Error("R3F local control mismatch");
		flushSync(() => {
			controls[0](0);
			controls[1](0);
		});
	},
	update(epoch) {
		flushSync(() => clock.dispatch({
			phase: value(epoch),
			epoch
		}));
		return { published: scene.getObjectByName("accepted-frame")?.position.x === epoch };
	},
	async dispose() {
		await new Promise((resolve) => unmountComponentAtNode(canvas, () => resolve()));
		scene.remove(camera);
		const sceneChildren = scene.children.length;
		const registeredSetters = listeners.size + controls.filter(Boolean).length;
		return {
			setupMs,
			setupScope: "R3F configure plus declarative root.render through activation; scene/camera/renderer construction excluded",
			sceneChildren,
			registeredSetters
		};
	}
});
