import { c as _c } from "react/compiler-runtime";
import { useState } from "react";
import { jsxs as _jsxs } from "react/jsx-runtime";
export function Counter(props) {
	const $ = _c(3);
	const [level, setLevel] = useState(props.initial);
	let t0;
	if ($[0] === Symbol.for("react.memo_cache_sentinel")) {
		t0 = () => setLevel(_temp);
		$[0] = t0;
	} else {
		t0 = $[0];
	}
	let t1;
	if ($[1] !== level) {
		t1 = /* @__PURE__ */ _jsxs("button", {
			"data-level": level,
			onClick: t0,
			children: ["level ", level]
		}, "counter");
		$[1] = level;
		$[2] = t1;
	} else {
		t1 = $[2];
	}
	return t1;
}
function _temp(previous) {
	return previous + 1;
}
