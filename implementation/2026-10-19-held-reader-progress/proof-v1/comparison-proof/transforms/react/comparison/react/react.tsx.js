import { c as _c } from "react/compiler-runtime";
/** @jsxImportSource react */
import * as Dialog from "@radix-ui/react-dialog";
import { Suspense, use, useLayoutEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { flushSync } from "react-dom";
import { Group, Mesh, Scene } from "three";
import { ReactPanel } from "../../react-panel";
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
function deferred() {
	let resolve;
	const promise = new Promise((done) => {
		resolve = done;
	});
	return {
		promise,
		resolve
	};
}
const detail = deferred();
const signal = deferred();
let detailResolved = false, signalResolved = false;
void detail.promise.then(() => {
	detailResolved = true;
});
void signal.promise.then(() => {
	signalResolved = true;
});
const sample = (x, y) => ({ sample: {
	x,
	y
} });
const portal = document.getElementById("dialog-portal");
const scene = new Scene();
const trace = {
	mounts: 0,
	cleanups: 0
};
let setHeldA;
let setOpen;
function JointReveal(props) {
	const $ = _c(12);
	const d = use(detail.promise);
	const s = use(signal.promise);
	let t0;
	let t1;
	if ($[0] !== props.a.x || $[1] !== props.a.y || $[2] !== s.sample.x || $[3] !== s.sample.y) {
		t0 = () => {
			const group = new Group();
			const mesh = new Mesh();
			mesh.position.set(props.a.x, s.sample.x, props.a.y + s.sample.y);
			group.add(mesh);
			scene.add(group);
			return () => {
				scene.remove(group);
			};
		};
		t1 = [
			props.a.x,
			props.a.y,
			s.sample.x,
			s.sample.y
		];
		$[0] = props.a.x;
		$[1] = props.a.y;
		$[2] = s.sample.x;
		$[3] = s.sample.y;
		$[4] = t0;
		$[5] = t1;
	} else {
		t0 = $[4];
		t1 = $[5];
	}
	useLayoutEffect(t0, t1);
	const t2 = props.a.x + d.sample.x;
	const t3 = props.a.y + d.sample.y;
	let t4;
	if ($[6] !== t3) {
		t4 = /* @__PURE__ */ _jsx("output", { "data-value": t3 });
		$[6] = t3;
		$[7] = t4;
	} else {
		t4 = $[7];
	}
	let t5;
	if ($[8] !== props.a.x || $[9] !== t2 || $[10] !== t4) {
		t5 = /* @__PURE__ */ _jsx("div", {
			"data-held": t2,
			"data-accepted-a": props.a.x,
			children: t4
		});
		$[8] = props.a.x;
		$[9] = t2;
		$[10] = t4;
		$[11] = t5;
	} else {
		t5 = $[11];
	}
	return t5;
}
function DialogSlot(props) {
	const $ = _c(16);
	const [local, setLocal] = useState(0);
	const t0 = props.open ? "true" : undefined;
	let t1;
	if ($[0] !== local) {
		t1 = () => setLocal(local + 1);
		$[0] = local;
		$[1] = t1;
	} else {
		t1 = $[1];
	}
	let t2;
	if ($[2] !== local || $[3] !== t1) {
		t2 = /* @__PURE__ */ _jsxs("button", {
			type: "button",
			"data-action": "local",
			onClick: t1,
			children: ["Local ", local]
		});
		$[2] = local;
		$[3] = t1;
		$[4] = t2;
	} else {
		t2 = $[4];
	}
	let t3;
	if ($[5] === Symbol.for("react.memo_cache_sentinel")) {
		t3 = /* @__PURE__ */ _jsx(Dialog.Trigger, { children: "Open held scene settings" });
		$[5] = t3;
	} else {
		t3 = $[5];
	}
	let t4;
	if ($[6] === Symbol.for("react.memo_cache_sentinel")) {
		t4 = /* @__PURE__ */ _jsx(Dialog.Overlay, { className: "dialog-overlay" });
		$[6] = t4;
	} else {
		t4 = $[6];
	}
	let t5;
	if ($[7] === Symbol.for("react.memo_cache_sentinel")) {
		t5 = /* @__PURE__ */ _jsxs(Dialog.Portal, {
			container: portal,
			children: [t4, /* @__PURE__ */ _jsxs(Dialog.Content, {
				className: "dialog-content",
				children: [
					/* @__PURE__ */ _jsx(Dialog.Title, { children: "Held scene settings" }),
					/* @__PURE__ */ _jsx(Dialog.Description, { children: "Independent scene controls" }),
					/* @__PURE__ */ _jsx(ReactPanel, { trace }),
					/* @__PURE__ */ _jsx(Dialog.Close, { children: "Close held scene settings" })
				]
			})]
		});
		$[7] = t5;
	} else {
		t5 = $[7];
	}
	let t6;
	if ($[8] !== props.onOpenChange || $[9] !== props.open) {
		t6 = /* @__PURE__ */ _jsxs(Dialog.Root, {
			open: props.open,
			onOpenChange: props.onOpenChange,
			children: [t3, t5]
		});
		$[8] = props.onOpenChange;
		$[9] = props.open;
		$[10] = t6;
	} else {
		t6 = $[10];
	}
	let t7;
	if ($[11] !== local || $[12] !== t0 || $[13] !== t2 || $[14] !== t6) {
		t7 = /* @__PURE__ */ _jsxs("div", {
			"data-dialog-slot": "true",
			"data-open": t0,
			"data-local": local,
			children: [t2, t6]
		});
		$[11] = local;
		$[12] = t0;
		$[13] = t2;
		$[14] = t6;
		$[15] = t7;
	} else {
		t7 = $[15];
	}
	return t7;
}
function App() {
	const $ = _c(14);
	let t0;
	if ($[0] === Symbol.for("react.memo_cache_sentinel")) {
		t0 = {
			x: 1,
			y: 2
		};
		$[0] = t0;
	} else {
		t0 = $[0];
	}
	const [a, updateA] = useState(t0);
	const [open, updateOpen] = useState(false);
	let t1;
	let t2;
	if ($[1] === Symbol.for("react.memo_cache_sentinel")) {
		t1 = () => {
			setHeldA = updateA;
			setOpen = updateOpen;
		};
		t2 = [updateA, updateOpen];
		$[1] = t1;
		$[2] = t2;
	} else {
		t1 = $[1];
		t2 = $[2];
	}
	useLayoutEffect(t1, t2);
	let t3;
	if ($[3] === Symbol.for("react.memo_cache_sentinel")) {
		t3 = /* @__PURE__ */ _jsx("h1", { children: "Held reader progress" });
		$[3] = t3;
	} else {
		t3 = $[3];
	}
	let t4;
	if ($[4] === Symbol.for("react.memo_cache_sentinel")) {
		t4 = /* @__PURE__ */ _jsx("button", {
			type: "button",
			"data-action": "open",
			onClick: () => updateOpen(true),
			children: "Open settings"
		});
		$[4] = t4;
	} else {
		t4 = $[4];
	}
	let t5;
	if ($[5] === Symbol.for("react.memo_cache_sentinel")) {
		t5 = /* @__PURE__ */ _jsx("button", {
			type: "button",
			"data-action": "close",
			onClick: () => updateOpen(false),
			children: "Close settings"
		});
		$[5] = t5;
	} else {
		t5 = $[5];
	}
	let t6;
	if ($[6] === Symbol.for("react.memo_cache_sentinel")) {
		t6 = /* @__PURE__ */ _jsx("div", {
			"data-held": "waiting",
			children: "Waiting"
		});
		$[6] = t6;
	} else {
		t6 = $[6];
	}
	let t7;
	if ($[7] !== a) {
		t7 = /* @__PURE__ */ _jsx(Suspense, {
			fallback: t6,
			children: /* @__PURE__ */ _jsx(JointReveal, { a })
		});
		$[7] = a;
		$[8] = t7;
	} else {
		t7 = $[8];
	}
	let t8;
	if ($[9] !== open) {
		t8 = /* @__PURE__ */ _jsx(DialogSlot, {
			open,
			onOpenChange: updateOpen
		});
		$[9] = open;
		$[10] = t8;
	} else {
		t8 = $[10];
	}
	let t9;
	if ($[11] !== t7 || $[12] !== t8) {
		t9 = /* @__PURE__ */ _jsxs("main", { children: [
			t3,
			t4,
			t5,
			t7,
			t8
		] });
		$[11] = t7;
		$[12] = t8;
		$[13] = t9;
	} else {
		t9 = $[13];
	}
	return t9;
}
const root = createRoot(document.getElementById("app"));
flushSync(() => root.render(/* @__PURE__ */ _jsx(App, {})));
const fallback = document.querySelector("[data-held=\"waiting\"]");
let disposed = false;
const snapshot = () => {
	const held = document.querySelector("[data-held]");
	const slot = document.querySelector("[data-dialog-slot]");
	const group = scene.children[0];
	return {
		groupStatus: detailResolved && signalResolved && held?.getAttribute("data-held") !== "waiting" ? "committed" : "pending",
		detailStatus: detailResolved ? "fulfilled" : "pending",
		signalStatus: signalResolved ? "fulfilled" : "pending",
		held: held?.getAttribute("data-held") ?? null,
		acceptedA: held?.getAttribute("data-accepted-a") ?? null,
		fallbackRetained: held === fallback,
		threePosition: group?.children[0]?.position.toArray() ?? null,
		open: slot?.getAttribute("data-open") ?? null,
		local: slot?.getAttribute("data-local") ?? null,
		dialogPresent: Boolean(portal.querySelector("[role=\"dialog\"]")),
		reactMounts: trace.mounts,
		reactCleanups: trace.cleanups,
		disposed
	};
};
window.heldReaderProof = {
	snapshot,
	setHeldA(x, y) {
		setHeldA({
			x,
			y
		});
	},
	setOpen(value) {
		setOpen(value);
	},
	resolveDetail(x = 4, y = 5) {
		detail.resolve(sample(x, y));
	},
	resolveSignal(x = 2, y = 3) {
		signal.resolve(sample(x, y));
	},
	dispose() {
		if (disposed) return;
		flushSync(() => root.unmount());
		disposed = true;
	}
};
