import { c as _c } from "react/compiler-runtime";
import { useLayoutEffect, useState } from "react";
import { flushSync } from "react-dom";
import { createRoot } from "react-dom/client";
import { highFrequencyState } from "./high_frequency_contract";
import { jsx as _jsx } from "react/jsx-runtime";
function ReactRowA({ id, session }) {
	const [x, setX] = useState(0);
	const [y, setY] = useState(0);
	const [rotation, setRotation] = useState(0);
	useLayoutEffect(() => {
		const setter = (frame) => {
			const state = highFrequencyState(id, frame);
			setX(state.x);
			setY(state.y);
			setRotation(state.rotation);
		};
		session.mounts++;
		session.setters.set(id, setter);
		return () => {
			session.cleanups++;
			if (session.setters.get(id) === setter) session.setters.delete(id);
		};
	}, [id, session]);
	return /* @__PURE__ */ _jsx("i", {
		className: "row",
		"data-row-id": id,
		style: {
			left: `${x}px`,
			top: `${y}px`,
			transform: `rotate(${rotation}deg)`
		}
	});
}
function ReactRowB({ id, session }) {
	const [rotation, setRotation] = useState(0);
	const [x, setX] = useState(0);
	const [y, setY] = useState(0);
	useLayoutEffect(() => {
		const setter = (frame) => {
			const state = highFrequencyState(id, frame);
			setX(state.x);
			setY(state.y);
			setRotation(state.rotation);
		};
		session.mounts++;
		session.setters.set(id, setter);
		return () => {
			session.cleanups++;
			if (session.setters.get(id) === setter) session.setters.delete(id);
		};
	}, [id, session]);
	return /* @__PURE__ */ _jsx("i", {
		className: "row",
		"data-row-id": id,
		style: {
			left: `${x}px`,
			top: `${y}px`,
			transform: `rotate(${rotation}deg)`
		}
	});
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
	const session = {
		setters: new Map(),
		mounts: 0,
		cleanups: 0
	};
	let root = createRoot(container);
	let disposed = false;
	let staleSetters = [];
	const diagnostics = () => ({
		mounts: session.mounts,
		cleanups: session.cleanups,
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
