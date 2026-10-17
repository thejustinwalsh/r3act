import { c as _c } from "react/compiler-runtime";
import { flushSync } from "react-dom";
import { createRoot } from "react-dom/client";
import { useLayoutEffect, useState } from "react";
import { jsx as _jsx } from "react/jsx-runtime";
function ReactRow(t0) {
	const $ = _c(8);
	const { id, life } = t0;
	const [selected, setSelected] = useState(false);
	let t1;
	let t2;
	if ($[0] !== id || $[1] !== life) {
		t1 = () => {
			life.mount(id);
			return () => life.cleanup(id);
		};
		t2 = [id, life];
		$[0] = id;
		$[1] = life;
		$[2] = t1;
		$[3] = t2;
	} else {
		t1 = $[2];
		t2 = $[3];
	}
	useLayoutEffect(t1, t2);
	const t3 = String(selected);
	let t4;
	if ($[4] === Symbol.for("react.memo_cache_sentinel")) {
		t4 = () => setSelected(_temp);
		$[4] = t4;
	} else {
		t4 = $[4];
	}
	let t5;
	if ($[5] !== id || $[6] !== t3) {
		t5 = /* @__PURE__ */ _jsx("li", {
			"data-id": id,
			"data-selected": t3,
			onClick: t4,
			children: id
		});
		$[5] = id;
		$[6] = t3;
		$[7] = t5;
	} else {
		t5 = $[7];
	}
	return t5;
}
function _temp(value) {
	return !value;
}
function ReactList(t0) {
	const $ = _c(7);
	const { ids, life } = t0;
	let t1;
	if ($[0] !== ids || $[1] !== life) {
		let t2;
		if ($[3] !== life) {
			t2 = (id) => /* @__PURE__ */ _jsx(ReactRow, {
				id,
				life
			}, id);
			$[3] = life;
			$[4] = t2;
		} else {
			t2 = $[4];
		}
		t1 = ids.map(t2);
		$[0] = ids;
		$[1] = life;
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
function ReactRoot(t0) {
	const $ = _c(8);
	const { initialIds, life, registerIdsSetter } = t0;
	let t1;
	if ($[0] !== initialIds) {
		t1 = () => [...initialIds];
		$[0] = initialIds;
		$[1] = t1;
	} else {
		t1 = $[1];
	}
	const [current, setIds] = useState(t1);
	let t2;
	let t3;
	if ($[2] !== registerIdsSetter) {
		t2 = () => registerIdsSetter(setIds);
		t3 = [registerIdsSetter];
		$[2] = registerIdsSetter;
		$[3] = t2;
		$[4] = t3;
	} else {
		t2 = $[3];
		t3 = $[4];
	}
	useLayoutEffect(t2, t3);
	let t4;
	if ($[5] !== current || $[6] !== life) {
		t4 = /* @__PURE__ */ _jsx(ReactList, {
			ids: current,
			life
		});
		$[5] = current;
		$[6] = life;
		$[7] = t4;
	} else {
		t4 = $[7];
	}
	return t4;
}
export function mountReact(host, ids, life) {
	const root = createRoot(host);
	const canonical = [...ids];
	const toTail = [...canonical.slice(1), canonical[0]];
	const toHead = canonical;
	const withoutMiddle = canonical.filter((id) => id !== "row-512");
	const restoreMiddle = [
		...withoutMiddle.slice(0, 512),
		"row-512",
		...withoutMiddle.slice(512)
	];
	let setIds = null;
	const registerIdsSetter = (setter) => {
		if (setIds) throw new Error("duplicate React setter registration");
		setIds = setter;
		return () => {
			if (setIds === setter) setIds = null;
		};
	};
	flushSync(() => root.render(/* @__PURE__ */ _jsx(ReactRoot, {
		initialIds: canonical,
		life,
		registerIdsSetter
	})));
	const update = (next) => {
		if (!setIds) throw new Error("React setter is unavailable");
		flushSync(() => setIds(next));
	};
	return {
		click(id) {
			const node = [...host.querySelectorAll("li[data-id]")].find((item) => item.dataset.id === id);
			if (!node) throw new Error(`missing row ${id}`);
			flushSync(() => node.click());
		},
		moveTail() {
			update(toTail);
		},
		moveHead() {
			update(toHead);
		},
		removeMiddle() {
			update(withoutMiddle);
		},
		restoreMiddle() {
			update(restoreMiddle);
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
