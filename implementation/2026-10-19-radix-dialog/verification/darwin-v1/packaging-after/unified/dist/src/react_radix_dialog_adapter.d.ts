import { type CSSProperties, type ReactNode } from "react";
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
export declare function ReactRadixDialog(props: RadixDialogProps): ReactNode;
/** Native owner wrapper; Radix and its portal remain in one React island. */
export declare const RadixDialog: import("./jsx_binding_runtime.ts").ComponentType<RadixDialogProps>;
//# sourceMappingURL=react_radix_dialog_adapter.d.ts.map