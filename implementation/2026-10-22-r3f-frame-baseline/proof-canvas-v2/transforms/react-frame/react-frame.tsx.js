import { c as _c } from "react/compiler-runtime";
/** @jsxImportSource react */
import React, { useLayoutEffect, useRef, useState } from "react";
import { createRoot, flushSync, getScheduler, unmountComponentAtNode, useFrame } from "@react-three/fiber/legacy";
import { MEASURED, OBJECTS, WARMUP, applyCommonRendererSettings, createView, gridX, gridY, start, value } from "./scene";
import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
const diagnostics = window.__realtimeProof === true;
let input = {
	phase: 0,
	epoch: 0
};
let motionCallbacks = 0;
let markerCallbacks = 0;
let renderTakeovers = 0;
let controlCommits = 0;
let registeredFrameCallbacks = 0;
const controls = [];
let renderJob;
const { scene, camera, renderer } = createView();
const canvas = renderer.domElement;
let renderCalls = 0;
const originalRender = renderer.render;
if (diagnostics) renderer.render = function(...args) {
	renderCalls++;
	return originalRender.apply(this, args);
};
function Position({ id, children }) {
	const motion = useRef(null);
	const [offset, setOffset] = useState(0);
	useFrame(() => {
		if (diagnostics) motionCallbacks++;
		const group = motion.current;
		group.position.x = input.phase * .01 + offset;
		group.position.y = input.phase * .005 + offset * .5;
		group.rotation.z = input.phase * 1e-4 + offset * .01;
	}, { phase: "update" });
	useLayoutEffect(() => {
		controls[id] = setOffset;
		registeredFrameCallbacks++;
		return () => {
			controls[id] = undefined;
			registeredFrameCallbacks--;
		};
	}, [id]);
	useLayoutEffect(() => {
		if (diagnostics) controlCommits++;
	}, [offset]);
	return /* @__PURE__ */ _jsx("group", {
		ref: motion,
		children
	}, "motion");
}
function Rotation({ id, children }) {
	const motion = useRef(null);
	const [offset, setOffset] = useState(0);
	useFrame(() => {
		if (diagnostics) motionCallbacks++;
		const group = motion.current;
		group.position.x = input.phase * .0025 + offset;
		group.position.y = input.phase * .0075 + offset * .5;
		group.rotation.z = input.phase * 2e-4 + offset * .01;
	}, { phase: "update" });
	useLayoutEffect(() => {
		controls[id] = setOffset;
		registeredFrameCallbacks++;
		return () => {
			controls[id] = undefined;
			registeredFrameCallbacks--;
		};
	}, [id]);
	useLayoutEffect(() => {
		if (diagnostics) controlCommits++;
	}, [offset]);
	return /* @__PURE__ */ _jsx("group", {
		ref: motion,
		children
	}, "motion");
}
function FrameMarker() {
	const marker = useRef(null);
	useFrame(() => {
		if (diagnostics) markerCallbacks++;
		marker.current.position.x = input.epoch;
	}, { phase: "update" });
	useLayoutEffect(() => {
		registeredFrameCallbacks++;
		return () => {
			registeredFrameCallbacks--;
		};
	}, []);
	return /* @__PURE__ */ _jsx("group", {
		ref: marker,
		name: "accepted-frame"
	});
}
function RenderTakeover() {
	const job = useFrame(() => {
		if (diagnostics) renderTakeovers++;
	}, { phase: "render" });
	useLayoutEffect(() => {
		renderJob = job;
		registeredFrameCallbacks++;
		return () => {
			registeredFrameCallbacks--;
		};
	}, [job]);
	return null;
}
function App() {
	const $ = _c(3);
	let t0;
	let t1;
	if ($[0] === Symbol.for("react.memo_cache_sentinel")) {
		t0 = /* @__PURE__ */ _jsx(FrameMarker, {});
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
				children: Array.from({ length: OBJECTS }, _temp)
			})
		] });
		$[2] = t2;
	} else {
		t2 = $[2];
	}
	return t2;
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
const rootStore = root.render(/* @__PURE__ */ _jsx(App, {}));
const setupMs = performance.now() - setupStart;
const advance = () => rootStore.getState().advance(performance.now());
start({
	scene,
	camera,
	renderer,
	controlProof() {
		if (controls.filter(Boolean).length !== OBJECTS || registeredFrameCallbacks !== OBJECTS + 2) throw new Error("Missing R3F frame controls");
		if (diagnostics && renderCalls !== 0) throw new Error("R3F rendered during setup");
		flushSync(() => {
			controls[0](2);
			controls[1](3);
		});
		advance();
		if (diagnostics && renderCalls !== 0) throw new Error("R3F rendered during activation step");
		const objects = scene.getObjectByName("objects").children;
		if (objects[0].children[0].position.x !== 2 || objects[1].children[0].position.x !== 3) throw new Error("R3F frame local control mismatch");
		flushSync(() => {
			controls[0](0);
			controls[1](0);
		});
		advance();
		if (diagnostics && renderCalls !== 0) throw new Error("R3F rendered during reset step");
	},
	update(epoch) {
		const before = diagnostics ? {
			motionCallbacks,
			markerCallbacks,
			renderTakeovers,
			controlCommits
		} : undefined;
		if (diagnostics && renderCalls !== epoch - 1) throw new Error(`Expected ${epoch - 1} shared draws before frame ${epoch}, saw ${renderCalls}`);
		const drawsBeforeAdvance = renderCalls;
		input = {
			phase: value(epoch),
			epoch
		};
		advance();
		const drawsDuringAdvance = renderCalls - drawsBeforeAdvance;
		if (diagnostics && drawsDuringAdvance !== 0) throw new Error(`R3F scheduler drew ${drawsDuringAdvance} times during frame ${epoch}`);
		return {
			published: scene.getObjectByName("accepted-frame")?.position.x === epoch,
			counters: before ? {
				frameCallbacks: motionCallbacks - before.motionCallbacks + markerCallbacks - before.markerCallbacks,
				motionCallbacks: motionCallbacks - before.motionCallbacks,
				markerCallbacks: markerCallbacks - before.markerCallbacks,
				renderTakeovers: renderTakeovers - before.renderTakeovers,
				controlCommitsDuringUpdate: controlCommits - before.controlCommits,
				drawsDuringAdvance
			} : undefined
		};
	},
	async dispose() {
		const job = renderJob;
		const rootId = job?.rootId;
		await new Promise((resolve) => unmountComponentAtNode(canvas, () => resolve()));
		scene.remove(camera);
		const rootStopped = !!rootId && !getScheduler().hasUserJobsInPhase("update", rootId) && !getScheduler().hasUserJobsInPhase("render", rootId);
		if (diagnostics && renderCalls !== WARMUP + MEASURED) throw new Error(`Expected ${WARMUP + MEASURED} shared draws, saw ${renderCalls}`);
		if (diagnostics) renderer.render = originalRender;
		return {
			setupMs,
			setupScope: "R3F configure plus authored frame root.render through activation; scene/camera/renderer construction excluded",
			sceneChildren: scene.children.length,
			registeredSetters: controls.filter(Boolean).length,
			registeredFrameCallbacks,
			rootStopped,
			renderCalls: diagnostics ? renderCalls : undefined
		};
	}
});
