import { c as _c } from "react/compiler-runtime";
/** @jsxImportSource react */
import React, { useLayoutEffect, useSyncExternalStore } from "react";
import { createRoot } from "react-dom/client";
import { flushSync } from "react-dom";
import * as THREE from "three";
import { makeObject, OBJECTS, start, value } from "./scene";
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
const scene = new THREE.Scene();
const group = new THREE.Group();
group.name = "objects";
const marker = new THREE.Group();
marker.name = "accepted-frame";
scene.add(marker, group);
const objects = Array.from({ length: OBJECTS }, (_, id) => makeObject(id));
group.add(...objects);
function Position(t0) {
	const $ = _c(4);
	const { id } = t0;
	const frame = useSyncExternalStore(clock.subscribe, clock.getSnapshot);
	let t1;
	let t2;
	if ($[0] !== frame.phase || $[1] !== id) {
		t1 = () => {
			const motion = objects[id].children[0];
			motion.position.x = frame.phase * .01;
			motion.position.y = frame.phase * .005;
			motion.rotation.z = frame.phase * 1e-4;
		};
		t2 = [id, frame.phase];
		$[0] = frame.phase;
		$[1] = id;
		$[2] = t1;
		$[3] = t2;
	} else {
		t1 = $[2];
		t2 = $[3];
	}
	useLayoutEffect(t1, t2);
	return null;
}
function Rotation(t0) {
	const $ = _c(4);
	const { id } = t0;
	const frame = useSyncExternalStore(clock.subscribe, clock.getSnapshot);
	let t1;
	let t2;
	if ($[0] !== frame.phase || $[1] !== id) {
		t1 = () => {
			const motion = objects[id].children[0];
			motion.position.x = frame.phase * .0025;
			motion.position.y = frame.phase * .0075;
			motion.rotation.z = frame.phase * 2e-4;
		};
		t2 = [id, frame.phase];
		$[0] = frame.phase;
		$[1] = id;
		$[2] = t1;
		$[3] = t2;
	} else {
		t1 = $[2];
		t2 = $[3];
	}
	useLayoutEffect(t1, t2);
	return null;
}
function FrameMarker() {
	const $ = _c(3);
	const frame = useSyncExternalStore(clock.subscribe, clock.getSnapshot);
	let t0;
	let t1;
	if ($[0] !== frame.epoch) {
		t0 = () => {
			marker.position.x = frame.epoch;
		};
		t1 = [frame.epoch];
		$[0] = frame.epoch;
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
	const $ = _c(1);
	let t0;
	if ($[0] === Symbol.for("react.memo_cache_sentinel")) {
		t0 = /* @__PURE__ */ _jsxs(_Fragment, { children: [/* @__PURE__ */ _jsx(FrameMarker, {}), Array.from({ length: OBJECTS }, _temp)] });
		$[0] = t0;
	} else {
		t0 = $[0];
	}
	return t0;
}
function _temp(_, id) {
	return id % 2 === 0 ? /* @__PURE__ */ _jsx(Position, { id }, id) : /* @__PURE__ */ _jsx(Rotation, { id }, id);
}
const host = document.getElementById("react-root");
const root = createRoot(host);
const setupStart = performance.now();
flushSync(() => root.render(/* @__PURE__ */ _jsx(App, {})));
const setupMs = performance.now() - setupStart;
start({
	scene,
	update(epoch) {
		flushSync(() => clock.dispatch({
			phase: value(epoch),
			epoch
		}));
		return { published: marker.position.x === epoch };
	},
	dispose() {
		flushSync(() => root.unmount());
		scene.clear();
		return {
			setupMs,
			setupScope: "preloaded Three objects excluded; flushSync React mount and layout adapter included",
			sceneChildren: scene.children.length,
			registeredSetters: listeners.size,
			hostChildren: host.childNodes.length
		};
	}
});
