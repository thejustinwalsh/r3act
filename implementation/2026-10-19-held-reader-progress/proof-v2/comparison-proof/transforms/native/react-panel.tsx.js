/** @jsxImportSource react */
import { useEffect, useState } from "react";
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
export function ReactPanel(props) {
	const [clicks, setClicks] = useState(0);
	useEffect(() => {
		props.trace.mounts++;
		return () => {
			props.trace.cleanups++;
		};
	}, [props.trace]);
	return /* @__PURE__ */ _jsxs("div", {
		"data-react-revision": "react-v1",
		children: [/* @__PURE__ */ _jsxs("label", { children: ["Note ", /* @__PURE__ */ _jsx("input", {
			"aria-label": "Dialog note",
			defaultValue: "seed"
		})] }), /* @__PURE__ */ _jsxs("button", {
			type: "button",
			"data-dialog-local": clicks,
			onClick: () => setClicks((current) => current + 1),
			children: ["Local count: ", clicks]
		})]
	});
}
