import { c as _c } from "react/compiler-runtime";
import { flushSync } from "react-dom";
import { createRoot } from "react-dom/client";
import { useLayoutEffect, useState } from "react";
import { jsx as _jsx } from "react/jsx-runtime";
function ReactRow(t0) {
	const $ = _c(7);
	const { id, register } = t0;
	const [value, setValue] = useState(0);
	let t1;
	let t2;
	if ($[0] !== id || $[1] !== register) {
		t1 = () => {
			register(id, setValue);
			return () => {
				register(id, undefined);
			};
		};
		t2 = [
			id,
			register,
			setValue
		];
		$[0] = id;
		$[1] = register;
		$[2] = t1;
		$[3] = t2;
	} else {
		t1 = $[2];
		t2 = $[3];
	}
	useLayoutEffect(t1, t2);
	let t3;
	if ($[4] !== id || $[5] !== value) {
		t3 = /* @__PURE__ */ _jsx("li", {
			"data-id": id,
			"data-value": value,
			children: id
		});
		$[4] = id;
		$[5] = value;
		$[6] = t3;
	} else {
		t3 = $[6];
	}
	return t3;
}
function ReactList(t0) {
	const $ = _c(7);
	const { ids, register } = t0;
	let t1;
	if ($[0] !== ids || $[1] !== register) {
		let t2;
		if ($[3] !== register) {
			t2 = (id) => /* @__PURE__ */ _jsx(ReactRow, {
				id,
				register
			}, id);
			$[3] = register;
			$[4] = t2;
		} else {
			t2 = $[4];
		}
		t1 = ids.map(t2);
		$[0] = ids;
		$[1] = register;
		$[2] = t1;
	} else {
		t1 = $[2];
	}
	let t2;
	if ($[5] !== t1) {
		t2 = /* @__PURE__ */ _jsx("ul", { children: t1 });
		$[5] = t1;
		$[6] = t2;
	} else {
		t2 = $[6];
	}
	return t2;
}
function ReactApp(t0) {
	const $ = _c(6);
	const { ids, register, bindOrder } = t0;
	const [current, setIds] = useState(ids);
	let t1;
	let t2;
	if ($[0] !== bindOrder) {
		t1 = () => {
			bindOrder(setIds);
		};
		t2 = [bindOrder, setIds];
		$[0] = bindOrder;
		$[1] = t1;
		$[2] = t2;
	} else {
		t1 = $[1];
		t2 = $[2];
	}
	useLayoutEffect(t1, t2);
	let t3;
	if ($[3] !== current || $[4] !== register) {
		t3 = /* @__PURE__ */ _jsx(ReactList, {
			ids: current,
			register
		});
		$[3] = current;
		$[4] = register;
		$[5] = t3;
	} else {
		t3 = $[5];
	}
	return t3;
}
export function mountReact(host, ids, selected) {
	const root = createRoot(host);
	const setters = new Map();
	const mounts = new Map();
	const cleanups = new Map();
	let setOrder = null;
	const register = (id, setter) => {
		if (setter) {
			setters.set(id, setter);
			mounts.set(id, (mounts.get(id) ?? 0) + 1);
		} else {
			setters.delete(id);
			cleanups.set(id, (cleanups.get(id) ?? 0) + 1);
		}
	};
	const bindOrder = (setter) => {
		setOrder = setter;
	};
	const canonical = [...ids];
	const mountStart = performance.now();
	flushSync(() => root.render(/* @__PURE__ */ _jsx(ReactApp, {
		ids: canonical,
		register,
		bindOrder
	})));
	const mountDurationMs = performance.now() - mountStart;
	flushSync(() => {
		for (const id of selected) setters.get(id)?.(1);
	});
	const tail = [...canonical.slice(1), canonical[0]];
	const head = canonical;
	if (!setOrder) throw new Error("React order setter is not registered after mount");
	const selectedSetters = selected.map((id) => {
		const setter = setters.get(id);
		if (!setter) throw new Error(`selected React setter is missing for ${id}`);
		return setter;
	});
	return {
		mountDurationMs,
		lifecycle() {
			return {
				mounts: Object.fromEntries(mounts),
				cleanups: Object.fromEntries(cleanups)
			};
		},
		transact(step, moveTail) {
			flushSync(() => {
				for (const [index, setter] of selectedSetters.entries()) setter(step * 1e3 + index + 2);
				setOrder(moveTail ? tail : head);
			});
			return null;
		},
		dispose() {
			flushSync(() => root.unmount());
			return {
				ownerCount: null,
				readerCount: null
			};
		}
	};
}
