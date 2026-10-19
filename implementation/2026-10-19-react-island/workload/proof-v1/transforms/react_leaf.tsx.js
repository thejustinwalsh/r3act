import { useLayoutEffect, useState } from "react";
import { jsx as _jsx } from "react/jsx-runtime";
export function ReactLeaf({ id, label, point, nativeClicks, onNativeAction, trace }) {
	const [clicks, setClicks] = useState(0);
	useLayoutEffect(() => {
		trace.mounts[id] = (trace.mounts[id] ?? 0) + 1;
		return () => {
			trace.cleanups[id] = (trace.cleanups[id] ?? 0) + 1;
		};
	}, [id, trace]);
	useLayoutEffect(() => {
		trace.props.push(`${id}:${label}:${point}:${nativeClicks}`);
	}, [
		id,
		label,
		point,
		nativeClicks,
		trace
	]);
	return /* @__PURE__ */ _jsx("button", {
		"data-island": id,
		"data-label": label,
		"data-point": point,
		"data-clicks": clicks,
		"data-native-clicks": nativeClicks,
		onClick: () => {
			setClicks((current) => current + 1);
			onNativeAction();
		},
		children: id
	});
}
