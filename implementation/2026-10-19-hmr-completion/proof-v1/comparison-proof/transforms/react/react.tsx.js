import { c as _c } from "react/compiler-runtime";
/** @jsxImportSource react */
import { useState } from "react";
import { createRoot } from "react-dom/client";
import { jsx as _jsx, jsxs as _jsxs } from "@r3act/core/jsx-runtime";
function Readout(props) {
	const $ = _c(2);
	let t0;
	if ($[0] !== props.count) {
		t0 = /* @__PURE__ */ _jsx("output", {
			"data-count": props.count,
			children: props.count
		});
		$[0] = props.count;
		$[1] = t0;
	} else {
		t0 = $[1];
	}
	return t0;
}
function Counter() {
	const $ = _c(8);
	const [count, setCount] = useState(0);
	let t0;
	if ($[0] === Symbol.for("react.memo_cache_sentinel")) {
		t0 = /* @__PURE__ */ _jsx("h1", { children: "Installed counter" });
		$[0] = t0;
	} else {
		t0 = $[0];
	}
	let t1;
	let t2;
	if ($[1] !== count) {
		t1 = /* @__PURE__ */ _jsx("button", {
			type: "button",
			onClick: () => setCount(count + 1),
			children: "Increment"
		});
		t2 = /* @__PURE__ */ _jsx(Readout, { count });
		$[1] = count;
		$[2] = t1;
		$[3] = t2;
	} else {
		t1 = $[2];
		t2 = $[3];
	}
	let t3;
	if ($[4] !== count || $[5] !== t1 || $[6] !== t2) {
		t3 = /* @__PURE__ */ _jsxs("main", {
			"data-count": count,
			children: [
				t0,
				t1,
				t2
			]
		});
		$[4] = count;
		$[5] = t1;
		$[6] = t2;
		$[7] = t3;
	} else {
		t3 = $[7];
	}
	return t3;
}
createRoot(document.getElementById("app")).render(/* @__PURE__ */ _jsx(Counter, {}));
