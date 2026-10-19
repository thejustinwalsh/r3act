import { c as _c } from "react/compiler-runtime";
import { useState } from "react";
import { createRoot } from "react-dom/client";
import { ReactRadixDialog } from "@r3act/react-bridge/radix-dialog";
import { jsx as _jsx } from "react/jsx-runtime";
function Dialog() {
	const $ = _c(2);
	const [open, setOpen] = useState(false);
	let t0;
	if ($[0] !== open) {
		t0 = /* @__PURE__ */ _jsx(ReactRadixDialog, {
			open,
			onOpenChange: setOpen,
			title: "Settings",
			description: "Edit settings",
			triggerLabel: "Open settings",
			closeLabel: "Close settings"
		});
		$[0] = open;
		$[1] = t0;
	} else {
		t0 = $[1];
	}
	return t0;
}
createRoot(document.getElementById("app")).render(/* @__PURE__ */ _jsx(Dialog, {}));
