import { c as _c } from "react/compiler-runtime";
import { useLayoutEffect, useState } from "react";
import { jsx as _jsx } from "react/jsx-runtime";
export function createIslandTrace() {
	const trace = {
		mounts: {},
		cleanups: {},
		props: []
	};
	const observer = Object.freeze({
		activate(id) {
			trace.mounts[id] = (trace.mounts[id] ?? 0) + 1;
			return () => {
				trace.cleanups[id] = (trace.cleanups[id] ?? 0) + 1;
			};
		},
		observe(id, label, point, nativeClicks) {
			trace.props.push(`${id}:${label}:${point}:${nativeClicks}`);
		}
	});
	return {
		trace,
		observer
	};
}
export function ReactLeaf(t0) {
	const $ = _c(20);
	const { id, label, point, nativeClicks, onNativeAction, observer } = t0;
	const [clicks, setClicks] = useState(0);
	let t1;
	let t2;
	if ($[0] !== id || $[1] !== observer) {
		t1 = () => observer.activate(id);
		t2 = [id, observer];
		$[0] = id;
		$[1] = observer;
		$[2] = t1;
		$[3] = t2;
	} else {
		t1 = $[2];
		t2 = $[3];
	}
	useLayoutEffect(t1, t2);
	let t3;
	let t4;
	if ($[4] !== id || $[5] !== label || $[6] !== nativeClicks || $[7] !== observer || $[8] !== point) {
		t3 = () => observer.observe(id, label, point, nativeClicks);
		t4 = [
			id,
			label,
			point,
			nativeClicks,
			observer
		];
		$[4] = id;
		$[5] = label;
		$[6] = nativeClicks;
		$[7] = observer;
		$[8] = point;
		$[9] = t3;
		$[10] = t4;
	} else {
		t3 = $[9];
		t4 = $[10];
	}
	useLayoutEffect(t3, t4);
	let t5;
	if ($[11] !== onNativeAction) {
		t5 = () => {
			setClicks(_temp);
			onNativeAction();
		};
		$[11] = onNativeAction;
		$[12] = t5;
	} else {
		t5 = $[12];
	}
	let t6;
	if ($[13] !== clicks || $[14] !== id || $[15] !== label || $[16] !== nativeClicks || $[17] !== point || $[18] !== t5) {
		t6 = /* @__PURE__ */ _jsx("button", {
			"data-island": id,
			"data-label": label,
			"data-point": point,
			"data-clicks": clicks,
			"data-native-clicks": nativeClicks,
			onClick: t5,
			children: id
		});
		$[13] = clicks;
		$[14] = id;
		$[15] = label;
		$[16] = nativeClicks;
		$[17] = point;
		$[18] = t5;
		$[19] = t6;
	} else {
		t6 = $[19];
	}
	return t6;
}
function _temp(current) {
	return current + 1;
}
