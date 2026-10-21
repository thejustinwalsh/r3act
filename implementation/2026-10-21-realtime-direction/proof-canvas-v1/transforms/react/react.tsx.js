import { c as _c } from "react/compiler-runtime";
/** @jsxImportSource react */
import React, { useLayoutEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { flushSync } from "react-dom";
import * as THREE from "three";
import { makeObject, OBJECTS, start, value } from "./scene";
import { Fragment as _Fragment, jsx as _jsx } from "react/jsx-runtime";
const scene = new THREE.Scene();
const group = new THREE.Group();
scene.add(group);
const objects = Array.from({ length: OBJECTS }, (_, id) => makeObject(id));
group.add(...objects);
const setters = Array(OBJECTS).fill(undefined);
function Position(t0) {
	const $ = _c(7);
	const { id } = t0;
	const [x, setX] = useState(0);
	let t1;
	let t2;
	if ($[0] !== id) {
		t1 = () => {
			setters[id] = setX;
			return () => {
				setters[id] = undefined;
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
	let t3;
	let t4;
	if ($[3] !== id || $[4] !== x) {
		t3 = () => {
			objects[id].position.x = x;
		};
		t4 = [id, x];
		$[3] = id;
		$[4] = x;
		$[5] = t3;
		$[6] = t4;
	} else {
		t3 = $[5];
		t4 = $[6];
	}
	useLayoutEffect(t3, t4);
	return null;
}
function Rotation(t0) {
	const $ = _c(7);
	const { id } = t0;
	const [angle, setAngle] = useState(0);
	let t1;
	let t2;
	if ($[0] !== id) {
		t1 = () => {
			setters[id] = setAngle;
			return () => {
				setters[id] = undefined;
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
	let t3;
	let t4;
	if ($[3] !== angle || $[4] !== id) {
		t3 = () => {
			objects[id].rotation.z = angle;
		};
		t4 = [id, angle];
		$[3] = angle;
		$[4] = id;
		$[5] = t3;
		$[6] = t4;
	} else {
		t3 = $[5];
		t4 = $[6];
	}
	useLayoutEffect(t3, t4);
	return null;
}
function App() {
	const $ = _c(1);
	let t0;
	if ($[0] === Symbol.for("react.memo_cache_sentinel")) {
		t0 = /* @__PURE__ */ _jsx(_Fragment, { children: Array.from({ length: OBJECTS }, _temp) });
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
if (setters.some((set) => !set)) throw new Error("React layout effect did not register every setter");
start({
	scene,
	update(epoch) {
		flushSync(() => {
			for (let id = 0; id < OBJECTS; id++) setters[id](value(id, epoch));
		});
		return { published: true };
	},
	dispose() {
		flushSync(() => root.unmount());
		scene.clear();
		return {
			setupMs,
			setupScope: "flushSync root.render through activation; scene/object construction excluded",
			sceneChildren: scene.children.length,
			registeredSetters: setters.filter(Boolean).length,
			hostChildren: host.childNodes.length
		};
	}
});
