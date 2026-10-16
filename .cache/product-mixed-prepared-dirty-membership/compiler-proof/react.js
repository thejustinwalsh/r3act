import { c as _c } from "react/compiler-runtime";
import { useLayoutEffect, useState } from "react";
import { flushSync } from "react-dom";
import { createRoot } from "react-dom/client";
import { productMixedState } from "./product_mixed_contract";
import { jsx as _jsx } from "react/jsx-runtime";
function ReactRow(t0) {
	const $ = _c(11);
	const { id, session } = t0;
	const [x, setX] = useState(0);
	const [y, setY] = useState(0);
	const [rotation, setRotation] = useState(0);
	let t1;
	let t2;
	if ($[0] !== id || $[1] !== session) {
		t1 = () => {
			const setFrame = (frame) => {
				const state = productMixedState(id, frame);
				setX(state.x);
				setY(state.y);
				setRotation(state.rotation);
			};
			session.registerSetter(id, setFrame);
			session.registerMount();
			return () => {
				session.removeSetter(id, setFrame);
				session.registerCleanup();
			};
		};
		t2 = [id, session];
		$[0] = id;
		$[1] = session;
		$[2] = t1;
		$[3] = t2;
	} else {
		t1 = $[2];
		t2 = $[3];
	}
	useLayoutEffect(t1, t2);
	const t3 = `${x}px`;
	const t4 = `${y}px`;
	const t5 = `rotate(${rotation}deg)`;
	let t6;
	if ($[4] !== t3 || $[5] !== t4 || $[6] !== t5) {
		t6 = {
			left: t3,
			top: t4,
			transform: t5
		};
		$[4] = t3;
		$[5] = t4;
		$[6] = t5;
		$[7] = t6;
	} else {
		t6 = $[7];
	}
	let t7;
	if ($[8] !== id || $[9] !== t6) {
		t7 = /* @__PURE__ */ _jsx("i", {
			className: "entity",
			"data-id": id,
			style: t6
		});
		$[8] = id;
		$[9] = t6;
		$[10] = t7;
	} else {
		t7 = $[10];
	}
	return t7;
}
function ReactBoard(t0) {
	const $ = _c(12);
	const { initialIds, session } = t0;
	let t1;
	if ($[0] !== initialIds) {
		t1 = () => [...initialIds];
		$[0] = initialIds;
		$[1] = t1;
	} else {
		t1 = $[1];
	}
	const [ids, setIds] = useState(t1);
	let t2;
	let t3;
	if ($[2] !== session) {
		t2 = () => {
			session.registerIdsSetter(setIds);
			return () => {
				session.removeIdsSetter(setIds);
			};
		};
		t3 = [session];
		$[2] = session;
		$[3] = t2;
		$[4] = t3;
	} else {
		t2 = $[3];
		t3 = $[4];
	}
	useLayoutEffect(t2, t3);
	let t4;
	if ($[5] !== ids || $[6] !== session) {
		let t5;
		if ($[8] !== session) {
			t5 = (id) => /* @__PURE__ */ _jsx(ReactRow, {
				id,
				session
			}, id);
			$[8] = session;
			$[9] = t5;
		} else {
			t5 = $[9];
		}
		t4 = ids.map(t5);
		$[5] = ids;
		$[6] = session;
		$[7] = t4;
	} else {
		t4 = $[7];
	}
	let t5;
	if ($[10] !== t4) {
		t5 = /* @__PURE__ */ _jsx("div", {
			className: "board",
			children: t4
		});
		$[10] = t4;
		$[11] = t5;
	} else {
		t5 = $[11];
	}
	return t5;
}
export const createProductMixedReact = (container, initialIds) => {
	let mounts = 0;
	let cleanups = 0;
	let setIds = null;
	const setters = new Map();
	const session = {
		setters,
		registerSetter(id, setter) {
			setters.set(id, setter);
		},
		removeSetter(id, setter) {
			if (setters.get(id) === setter) setters.delete(id);
		},
		registerMount() {
			mounts++;
		},
		registerCleanup() {
			cleanups++;
		},
		registerIdsSetter(setter) {
			setIds = setter;
		},
		removeIdsSetter(setter) {
			if (setIds === setter) setIds = null;
		}
	};
	let root = createRoot(container);
	let disposed = false;
	flushSync(() => {
		root.render(/* @__PURE__ */ _jsx(ReactBoard, {
			initialIds,
			session
		}));
	});
	flushSync(() => {
		for (const setFrame of session.setters.values()) setFrame(0);
	});
	const controller = {
		step(frame, edit) {
			if (disposed || !root) throw new Error("Cannot step a disposed React product arm");
			flushSync(() => {
				if (edit) {
					const removed = new Set(edit.removed);
					for (const [id, setFrame] of session.setters) {
						if (!removed.has(id)) setFrame(frame);
					}
					setIds?.([...edit.ids]);
				} else {
					for (const setFrame of session.setters.values()) setFrame(frame);
				}
			});
			if (edit) {
				flushSync(() => {
					for (const id of edit.inserted) session.setters.get(id)?.(frame);
				});
			}
		},
		diagnostics() {
			return {
				renders: -1,
				mounts,
				cleanups,
				writers: session.setters.size
			};
		},
		dispose() {
			if (disposed) return;
			disposed = true;
			const activeRoot = root;
			if (activeRoot) flushSync(() => activeRoot.unmount());
			root = null;
			setIds = null;
			session.setters.clear();
		}
	};
	return controller;
};
