import { c as _c } from "react/compiler-runtime";
import { useLayoutEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
function Counter() {
	const $ = _c(10);
	const [count, setCount] = useState(0);
	const canvasRef = useRef(null);
	let t0;
	let t1;
	if ($[0] !== count) {
		t0 = () => {
			const context = canvasRef.current?.getContext("2d");
			if (!context) {
				throw new Error("Canvas 2D unavailable");
			}
			context.clearRect(0, 0, 200, 80);
			context.fillStyle = "#227e70";
			context.fillRect(12, 12, 20 + count * 20, 28);
			context.fillStyle = "#26384f";
			context.font = "10px sans-serif";
			context.fillText(String(count), 12, 58);
		};
		t1 = [count];
		$[0] = count;
		$[1] = t0;
		$[2] = t1;
	} else {
		t0 = $[1];
		t1 = $[2];
	}
	useLayoutEffect(t0, t1);
	let t2;
	if ($[3] === Symbol.for("react.memo_cache_sentinel")) {
		t2 = /* @__PURE__ */ _jsx("h1", { children: "Canvas counter" });
		$[3] = t2;
	} else {
		t2 = $[3];
	}
	let t3;
	if ($[4] === Symbol.for("react.memo_cache_sentinel")) {
		t3 = /* @__PURE__ */ _jsx("button", {
			type: "button",
			onClick: () => setCount(_temp),
			children: "Increment"
		});
		$[4] = t3;
	} else {
		t3 = $[4];
	}
	let t4;
	if ($[5] !== count) {
		t4 = /* @__PURE__ */ _jsx("output", {
			"data-count": count,
			children: count
		});
		$[5] = count;
		$[6] = t4;
	} else {
		t4 = $[6];
	}
	let t5;
	if ($[7] === Symbol.for("react.memo_cache_sentinel")) {
		t5 = /* @__PURE__ */ _jsx("canvas", {
			ref: canvasRef,
			width: 200,
			height: 80
		});
		$[7] = t5;
	} else {
		t5 = $[7];
	}
	let t6;
	if ($[8] !== t4) {
		t6 = /* @__PURE__ */ _jsxs("main", { children: [
			t2,
			t3,
			t4,
			t5
		] });
		$[8] = t4;
		$[9] = t6;
	} else {
		t6 = $[9];
	}
	return t6;
}
function _temp(value) {
	return value + 1;
}
const host = document.querySelector("#app");
if (host) {
	const root = createRoot(host);
	root.render(/* @__PURE__ */ _jsx(Counter, {}));
	window.comparison = {
		snapshot: () => {
			const context = host.querySelector("canvas")?.getContext("2d");
			return {
				count: host.querySelector("[data-count]")?.textContent ?? null,
				pixel: context ? [...context.getImageData(16, 16, 1, 1).data] : null,
				growthPixel: context ? [...context.getImageData(45, 16, 1, 1).data] : null
			};
		},
		dispose: () => {
			root.unmount();
		}
	};
}
