import { c as _c } from "react/compiler-runtime";
/** @jsxImportSource react */
import React, { Suspense, use, useLayoutEffect, useSyncExternalStore } from "react";
import { createRoot } from "react-dom/client";
import { flushSync } from "react-dom";
import * as THREE from "three";
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
let rows = Array.from({ length: 64 }, (_, id) => ({
	id,
	x: id
}));
const listeners = new Set();
const subscribe = (notify) => {
	listeners.add(notify);
	return () => {
		listeners.delete(notify);
	};
};
const snapshot = () => rows;
const pending = new Promise(() => {});
function Row(t0) {
	const $ = _c(2);
	const { row } = t0;
	let t1;
	if ($[0] !== row.x) {
		t1 = /* @__PURE__ */ _jsx("output", {
			"data-x": row.x,
			children: row.x
		});
		$[0] = row.x;
		$[1] = t1;
	} else {
		t1 = $[1];
	}
	return t1;
}
function Waiting() {
	const $ = _c(2);
	const t0 = use(pending);
	let t1;
	if ($[0] !== t0) {
		t1 = /* @__PURE__ */ _jsx("span", { children: t0 });
		$[0] = t0;
		$[1] = t1;
	} else {
		t1 = $[1];
	}
	return t1;
}
function App(t0) {
	const $ = _c(14);
	const { scene } = t0;
	const values = useSyncExternalStore(subscribe, snapshot, snapshot);
	let t1;
	let t2;
	if ($[0] !== scene || $[1] !== values) {
		t1 = () => {
			const ids = new Set(values.map(_temp));
			for (const node of [...scene.children]) {
				if (!ids.has(node.userData.id)) {
					scene.remove(node);
				}
			}
			for (const row_0 of values) {
				let node_0 = scene.children.find((child) => child.userData.id === row_0.id);
				if (!node_0) {
					node_0 = new THREE.Group();
					node_0.userData.id = row_0.id;
					scene.add(node_0);
				}
				if (!Object.is(node_0.position.x, row_0.x)) {
					node_0.position.x = row_0.x;
				}
			}
		};
		t2 = [scene, values];
		$[0] = scene;
		$[1] = values;
		$[2] = t1;
		$[3] = t2;
	} else {
		t1 = $[2];
		t2 = $[3];
	}
	useLayoutEffect(t1, t2);
	let t3;
	let t4;
	if ($[4] !== scene) {
		t3 = () => () => {
			scene.clear();
		};
		t4 = [scene];
		$[4] = scene;
		$[5] = t3;
		$[6] = t4;
	} else {
		t3 = $[5];
		t4 = $[6];
	}
	useLayoutEffect(t3, t4);
	let t5;
	if ($[7] !== values) {
		t5 = values.map(_temp2);
		$[7] = values;
		$[8] = t5;
	} else {
		t5 = $[8];
	}
	let t6;
	if ($[9] !== t5) {
		t6 = /* @__PURE__ */ _jsx("div", {
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
			fallback: /* @__PURE__ */ _jsx("span", {
				"data-pending": "yes",
				children: "waiting"
			}),
			children: /* @__PURE__ */ _jsx(Waiting, {})
		});
		$[11] = t7;
	} else {
		t7 = $[11];
	}
	let t8;
	if ($[12] !== t6) {
		t8 = /* @__PURE__ */ _jsxs("section", { children: [t6, t7] });
		$[12] = t6;
		$[13] = t8;
	} else {
		t8 = $[13];
	}
	return t8;
}
function _temp2(row_1) {
	return /* @__PURE__ */ _jsx(Row, { row: row_1 }, row_1.id);
}
function _temp(row) {
	return row.id;
}
export function mountClosedRows(container) {
	const scene = new THREE.Group();
	const rowGroup = new THREE.Group();
	scene.add(rowGroup);
	const root = createRoot(container);
	flushSync(() => root.render(/* @__PURE__ */ _jsx(App, { scene: rowGroup })));
	const first = container.querySelector("output");
	const firstObject = rowGroup.children[0];
	let disposed = false;
	return {
		step(index) {
			const cycle = Math.floor(index / 3), id = 64 + cycle, kind = index % 3;
			flushSync(() => {
				if (kind === 0) rows = rows.map((row) => row.id === 0 ? {
					id: 0,
					x: 1e3 + index
				} : row);
				else if (kind === 1) rows = [...rows, {
					id,
					x: 2e3 + index
				}];
				else rows = rows.filter((row) => row.id !== id);
				for (const notify of listeners) notify();
			});
		},
		inspect() {
			return {
				values: [...container.querySelectorAll("output")].map((node) => Number(node.textContent)),
				attributes: [...container.querySelectorAll("output")].map((node) => Number(node.getAttribute("data-x"))),
				positions: rowGroup.children.map((node) => node.position.x),
				identity: container.querySelector("output") === first && rowGroup.children[0] === firstObject,
				pending: container.querySelector("[data-pending]")?.textContent === "waiting",
				disposed
			};
		},
		dispose() {
			flushSync(() => root.unmount());
			scene.clear();
			disposed = true;
			return {
				hostChildren: container.childNodes.length,
				sceneChildren: scene.children.length,
				listeners: listeners.size
			};
		}
	};
}
