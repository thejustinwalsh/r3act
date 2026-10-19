import { c as _c } from "react/compiler-runtime";
import * as Dialog from "@radix-ui/react-dialog";
import { createNativeReactRootAdapter } from "./react_native_adapter.ts";
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/** Controlled Radix Dialog view for ordinary React roots. */
export function ReactRadixDialog(props) {
	const $ = _c(26);
	let t0;
	if ($[0] !== props.triggerLabel) {
		t0 = /* @__PURE__ */ _jsx(Dialog.Trigger, { children: props.triggerLabel });
		$[0] = props.triggerLabel;
		$[1] = t0;
	} else {
		t0 = $[1];
	}
	const t1 = props.portalContainer ?? undefined;
	let t2;
	if ($[2] !== props.overlayClassName) {
		t2 = /* @__PURE__ */ _jsx(Dialog.Overlay, { className: props.overlayClassName });
		$[2] = props.overlayClassName;
		$[3] = t2;
	} else {
		t2 = $[3];
	}
	let t3;
	if ($[4] !== props.title) {
		t3 = /* @__PURE__ */ _jsx(Dialog.Title, { children: props.title });
		$[4] = props.title;
		$[5] = t3;
	} else {
		t3 = $[5];
	}
	let t4;
	if ($[6] !== props.description) {
		t4 = /* @__PURE__ */ _jsx(Dialog.Description, { children: props.description });
		$[6] = props.description;
		$[7] = t4;
	} else {
		t4 = $[7];
	}
	const t5 = props.closeLabel ?? "Close";
	let t6;
	if ($[8] !== t5) {
		t6 = /* @__PURE__ */ _jsx(Dialog.Close, { children: t5 });
		$[8] = t5;
		$[9] = t6;
	} else {
		t6 = $[9];
	}
	let t7;
	if ($[10] !== props.children || $[11] !== props.className || $[12] !== props.style || $[13] !== t3 || $[14] !== t4 || $[15] !== t6) {
		t7 = /* @__PURE__ */ _jsxs(Dialog.Content, {
			className: props.className,
			style: props.style,
			children: [
				t3,
				t4,
				props.children,
				t6
			]
		});
		$[10] = props.children;
		$[11] = props.className;
		$[12] = props.style;
		$[13] = t3;
		$[14] = t4;
		$[15] = t6;
		$[16] = t7;
	} else {
		t7 = $[16];
	}
	let t8;
	if ($[17] !== t1 || $[18] !== t2 || $[19] !== t7) {
		t8 = /* @__PURE__ */ _jsxs(Dialog.Portal, {
			container: t1,
			children: [t2, t7]
		});
		$[17] = t1;
		$[18] = t2;
		$[19] = t7;
		$[20] = t8;
	} else {
		t8 = $[20];
	}
	let t9;
	if ($[21] !== props.onOpenChange || $[22] !== props.open || $[23] !== t0 || $[24] !== t8) {
		t9 = /* @__PURE__ */ _jsxs(Dialog.Root, {
			open: props.open,
			onOpenChange: props.onOpenChange,
			modal: true,
			children: [t0, t8]
		});
		$[21] = props.onOpenChange;
		$[22] = props.open;
		$[23] = t0;
		$[24] = t8;
		$[25] = t9;
	} else {
		t9 = $[25];
	}
	return t9;
}
/** Native owner wrapper; Radix and its portal remain in one React island. */
export const RadixDialog = createNativeReactRootAdapter(ReactRadixDialog);
