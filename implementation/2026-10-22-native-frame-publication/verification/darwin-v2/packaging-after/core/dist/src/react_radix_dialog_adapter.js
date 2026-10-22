import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import * as Dialog from "@radix-ui/react-dialog";
import { createNativeReactRootAdapter } from "./react_native_adapter.js";
/** Controlled Radix Dialog view for ordinary React roots. */
export function ReactRadixDialog(props) {
    return (_jsxs(Dialog.Root, { open: props.open, onOpenChange: props.onOpenChange, modal: true, children: [_jsx(Dialog.Trigger, { children: props.triggerLabel }), _jsxs(Dialog.Portal, { container: props.portalContainer ?? undefined, children: [_jsx(Dialog.Overlay, { className: props.overlayClassName }), _jsxs(Dialog.Content, { "aria-modal": "true", className: props.className, style: props.style, children: [_jsx(Dialog.Title, { children: props.title }), _jsx(Dialog.Description, { children: props.description }), props.children, _jsx(Dialog.Close, { children: props.closeLabel ?? "Close" })] })] })] }));
}
/** Native owner wrapper; Radix and its portal remain in one React island. */
export const RadixDialog = createNativeReactRootAdapter(ReactRadixDialog);
//# sourceMappingURL=react_radix_dialog_adapter.js.map