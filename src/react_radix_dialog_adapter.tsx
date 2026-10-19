/** @jsxImportSource react */
import { type CSSProperties, type ReactNode } from "react";
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
  return (
    <Dialog.Root open={props.open} onOpenChange={props.onOpenChange} modal>
      <Dialog.Trigger>{props.triggerLabel}</Dialog.Trigger>
      <Dialog.Portal container={props.portalContainer ?? undefined}>
        <Dialog.Overlay className={props.overlayClassName} />
        <Dialog.Content aria-modal="true" className={props.className} style={props.style}>
          <Dialog.Title>{props.title}</Dialog.Title>
          <Dialog.Description>{props.description}</Dialog.Description>
          {props.children}
          <Dialog.Close>{props.closeLabel ?? "Close"}</Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

/** Native owner wrapper; Radix and its portal remain in one React island. */
export const RadixDialog = createNativeReactRootAdapter(ReactRadixDialog);
