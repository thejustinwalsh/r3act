import { c as _c } from "react/compiler-runtime";
import { useLayoutEffect, useState } from "react";
import { flushSync } from "react-dom";
import { createRoot } from "react-dom/client";
import { highFrequencyState } from "./high_frequency_contract";
import { jsx as _jsx } from "react/jsx-runtime";
function ReactRowA(t0) {
	const $ = _c(11);
	const { id, session } = t0;
	const [x, setX] = useState(0);
	const [y, setY] = useState(0);
	const [rotation, setRotation] = useState(0);
	let t1;
	let t2;
	if ($[0] !== id || $[1] !== session) {
		t1 = () => {
			const setter = (frame) => {
				const state = highFrequencyState(id, frame);
				setX(state.x);
				setY(state.y);
				setRotation(state.rotation);
			};
			session.registerSetter(id, setter);
			session.registerMount();
			return () => {
				session.removeSetter(id, setter);
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
			className: "row",
			"data-row-id": id,
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
function ReactRowB(t0) {
	const $ = _c(11);
	const { id, session } = t0;
	const [rotation, setRotation] = useState(0);
	const [x, setX] = useState(0);
	const [y, setY] = useState(0);
	let t1;
	let t2;
	if ($[0] !== id || $[1] !== session) {
		t1 = () => {
			const setter = (frame) => {
				const state = highFrequencyState(id, frame);
				setX(state.x);
				setY(state.y);
				setRotation(state.rotation);
			};
			session.registerSetter(id, setter);
			session.registerMount();
			return () => {
				session.removeSetter(id, setter);
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
			className: "row",
			"data-row-id": id,
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
	const $ = _c(9);
	const { ids, session, programs } = t0;
	let t1;
	if ($[0] !== ids || $[1] !== programs || $[2] !== session) {
		let t2;
		if ($[4] !== programs || $[5] !== session) {
			t2 = (id) => programs === "heterogeneous" && id % 2 === 1 ? /* @__PURE__ */ _jsx(ReactRowB, {
				id,
				session
			}, id) : /* @__PURE__ */ _jsx(ReactRowA, {
				id,
				session
			}, id);
			$[4] = programs;
			$[5] = session;
			$[6] = t2;
		} else {
			t2 = $[6];
		}
		t1 = ids.map(t2);
		$[0] = ids;
		$[1] = programs;
		$[2] = session;
		$[3] = t1;
	} else {
		t1 = $[3];
	}
	let t2;
	if ($[7] !== t1) {
		t2 = /* @__PURE__ */ _jsx("div", {
			className: "board",
			children: t1
		});
		$[7] = t1;
		$[8] = t2;
	} else {
		t2 = $[8];
	}
	return t2;
}
export const createHighFrequencyReact = (container, ids, programs) => {
	let mounts = 0;
	let cleanups = 0;
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
		}
	};
	let root = createRoot(container);
	let disposed = false;
	let staleSetters = [];
	const diagnostics = () => ({
		mounts,
		cleanups,
		writers: session.setters.size
	});
	const controller = {
		mount() {
			if (disposed || !root) throw new Error("Cannot mount a disposed React arm");
			flushSync(() => root.render(/* @__PURE__ */ _jsx(ReactBoard, {
				ids,
				session,
				programs
			})));
			flushSync(() => {
				for (const setter of session.setters.values()) setter(0);
			});
		},
		step(frame, dirtyIds) {
			if (disposed || !root) throw new Error("Cannot step a disposed React arm");
			flushSync(() => {
				for (const id of dirtyIds) {
					const setter = session.setters.get(id);
					if (!setter) throw new Error(`Missing React row setter ${id}`);
					setter(frame);
				}
			});
		},
		diagnostics,
		dispose() {
			if (disposed) return;
			disposed = true;
			staleSetters = [...session.setters.values()];
			const activeRoot = root;
			if (activeRoot) flushSync(() => activeRoot.unmount());
			root = null;
		},
		probeDeadSetters(frame) {
			let thrown = 0;
			for (const setter of staleSetters) {
				try {
					setter(frame);
				} catch {
					thrown++;
				}
			}
			return thrown;
		}
	};
	return controller;
};
