import { createElement, type CSSProperties, type ReactNode } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { createNativeReactRootAdapter } from "./react_native_adapter.ts";

export type RadixDialogProps = {
  open: boolean;
  onOpenChange(open: boolean): void;
  title: string;
  description: string;
  triggerLabel: string;
  closeLabel?: string;
  children?: ReactNode;
  portalContainer?: HTMLElement | null;
  className?: string;
  overlayClassName?: string;
  style?: CSSProperties;
};

/** Controlled Radix Dialog view for ordinary React roots. */
export function ReactRadixDialog(props: RadixDialogProps): ReactNode {
  return createElement(
    Dialog.Root,
    { open: props.open, onOpenChange: props.onOpenChange, modal: true },
    createElement(Dialog.Trigger, null, props.triggerLabel),
    createElement(
      Dialog.Portal,
      { container: props.portalContainer ?? undefined },
      createElement(Dialog.Overlay, { className: props.overlayClassName }),
      createElement(
        Dialog.Content,
        { className: props.className, style: props.style },
        createElement(Dialog.Title, null, props.title),
        createElement(Dialog.Description, null, props.description),
        props.children,
        createElement(Dialog.Close, null, props.closeLabel ?? "Close"),
      ),
    ),
  );
}

/** Native owner wrapper; Radix and its portal remain in one React island. */
export const RadixDialog = createNativeReactRootAdapter(ReactRadixDialog);
