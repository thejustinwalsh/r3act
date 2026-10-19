import { c as _c } from "react/compiler-runtime";
import { useState } from "react";
import { createRoot } from "react-dom/client";
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
const Counter = () => {
	const $ = _c(4);
	const [count, setCount] = useState(0);
	let t0;
	if ($[0] === Symbol.for("react.memo_cache_sentinel")) {
		t0 = /* @__PURE__ */ _jsx("h1", { children: "Arrow counter" });
		$[0] = t0;
	} else {
		t0 = $[0];
	}
	let t1;
	if ($[1] === Symbol.for("react.memo_cache_sentinel")) {
		t1 = /* @__PURE__ */ _jsx("button", {
			type: "button",
			onClick: () => setCount(_temp),
			children: "Increment"
		});
		$[1] = t1;
	} else {
		t1 = $[1];
	}
	let t2;
	if ($[2] !== count) {
		t2 = /* @__PURE__ */ _jsxs("main", { children: [
			t0,
			t1,
			/* @__PURE__ */ _jsx("output", {
				"data-count": count,
				children: count
			})
		] });
		$[2] = count;
		$[3] = t2;
	} else {
		t2 = $[3];
	}
	return t2;
};
const host = document.querySelector("#app");
if (host) {
	const root = createRoot(host);
	root.render(/* @__PURE__ */ _jsx(Counter, {}));
	window.comparison = {
		snapshot: () => ({
			count: host.querySelector("[data-count]")?.textContent ?? null,
			title: host.querySelector("h1")?.textContent ?? null,
			button: host.querySelector("button")?.textContent ?? null
		}),
		dispose: () => root.unmount()
	};
}
function _temp(value) {
	return value + 1;
}
