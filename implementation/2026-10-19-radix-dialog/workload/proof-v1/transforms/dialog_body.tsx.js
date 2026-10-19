import { c as _c } from "react/compiler-runtime";
import { useLayoutEffect, useState } from "react";
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
export function createDialogTrace() {
	const trace = {
		mounts: 0,
		cleanups: 0,
		props: []
	};
	const observer = Object.freeze({
		activate() {
			trace.mounts++;
			return () => {
				trace.cleanups++;
			};
		},
		observe(label, point, nativeCount) {
			trace.props.push(`${label}:${point}:${nativeCount}`);
		}
	});
	return {
		trace,
		observer
	};
}
export function DialogBody(t0) {
	const $ = _c(17);
	const { label, point, nativeCount, observer } = t0;
	const [clicks, setClicks] = useState(0);
	let t1;
	if ($[0] !== observer) {
		t1 = [observer];
		$[0] = observer;
		$[1] = t1;
	} else {
		t1 = $[1];
	}
	useLayoutEffect(observer.activate, t1);
	let t2;
	let t3;
	if ($[2] !== label || $[3] !== nativeCount || $[4] !== observer || $[5] !== point) {
		t2 = () => observer.observe(label, point, nativeCount);
		t3 = [
			label,
			point,
			nativeCount,
			observer
		];
		$[2] = label;
		$[3] = nativeCount;
		$[4] = observer;
		$[5] = point;
		$[6] = t2;
		$[7] = t3;
	} else {
		t2 = $[6];
		t3 = $[7];
	}
	useLayoutEffect(t2, t3);
	let t4;
	if ($[8] === Symbol.for("react.memo_cache_sentinel")) {
		t4 = /* @__PURE__ */ _jsx("input", {
			"aria-label": "Dialog note",
			defaultValue: "seed"
		});
		$[8] = t4;
	} else {
		t4 = $[8];
	}
	let t5;
	if ($[9] === Symbol.for("react.memo_cache_sentinel")) {
		t5 = () => setClicks(_temp);
		$[9] = t5;
	} else {
		t5 = $[9];
	}
	let t6;
	if ($[10] !== clicks) {
		t6 = /* @__PURE__ */ _jsx("button", {
			"data-dialog-local": clicks,
			onClick: t5,
			children: "Count"
		});
		$[10] = clicks;
		$[11] = t6;
	} else {
		t6 = $[11];
	}
	let t7;
	if ($[12] !== label || $[13] !== nativeCount || $[14] !== point || $[15] !== t6) {
		t7 = /* @__PURE__ */ _jsxs("div", {
			"data-dialog-body": label,
			"data-point": point,
			"data-native-count": nativeCount,
			children: [t4, t6]
		});
		$[12] = label;
		$[13] = nativeCount;
		$[14] = point;
		$[15] = t6;
		$[16] = t7;
	} else {
		t7 = $[16];
	}
	return t7;
}
function _temp(current) {
	return current + 1;
}
