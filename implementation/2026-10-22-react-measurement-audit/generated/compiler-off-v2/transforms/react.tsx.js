/** @jsxImportSource react */
import React, { useLayoutEffect, useState, useSyncExternalStore } from "react";
import { createRoot, flushSync, unmountComponentAtNode } from "@react-three/fiber/legacy";
import { OBJECTS, applyCommonRendererSettings, createView, gridX, gridY, start, value } from "./scene";
import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
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
function Position({ id, children }) {
	const frame = useSyncExternalStore(clock.subscribe, clock.getSnapshot);
	const [offset, setOffset] = useState(0);
	useLayoutEffect(() => {
		controls[id] = setOffset;
		return () => {
			controls[id] = undefined;
		};
	}, [id]);
	return /* @__PURE__ */ _jsx("group", {
		"position-x": frame.phase * .01 + offset,
		"position-y": frame.phase * .005 + offset * .5,
		"rotation-z": frame.phase * 1e-4 + offset * .01,
		children
	}, "motion");
}
function Rotation({ id, children }) {
	const frame = useSyncExternalStore(clock.subscribe, clock.getSnapshot);
	const [offset, setOffset] = useState(0);
	useLayoutEffect(() => {
		controls[id] = setOffset;
		return () => {
			controls[id] = undefined;
		};
	}, [id]);
	return /* @__PURE__ */ _jsx("group", {
		"position-x": frame.phase * .0025 + offset,
		"position-y": frame.phase * .0075 + offset * .5,
		"rotation-z": frame.phase * 2e-4 + offset * .01,
		children
	}, "motion");
}
function FrameMarker() {
	const frame = useSyncExternalStore(clock.subscribe, clock.getSnapshot);
	return /* @__PURE__ */ _jsx("group", {
		name: "accepted-frame",
		"position-x": frame.epoch
	});
}
function App() {
	return /* @__PURE__ */ _jsxs(_Fragment, { children: [/* @__PURE__ */ _jsx(FrameMarker, {}), /* @__PURE__ */ _jsx("group", {
		name: "objects",
		children: Array.from({ length: OBJECTS }, (_, id) => /* @__PURE__ */ _jsx("group", {
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
		}, id))
	})] });
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
