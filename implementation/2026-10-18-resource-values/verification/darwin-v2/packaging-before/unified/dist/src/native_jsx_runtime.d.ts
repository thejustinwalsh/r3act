/** Standard automatic-runtime JSX ABI, kept separate from the classic API. */
import { Fragment, type ElementType, type RuntimeElement } from "./jsx_binding_runtime.ts";
export type { JSX } from "./native_jsx_types.d.ts";
export { Fragment };
/**
 * Create an element using the automatic JSX transform ABI. `props.children`
 * is already the transformed child value; it must not be treated as a
 * variadic classic-factory child list. The runtime's current element model
 * stores reconciliation keys on `props.key`, so the separate ABI key is
 * copied there and takes precedence when it is supplied (including `null`).
 * If the ABI key is `undefined`, an existing `props.key` is retained.
 */
export declare function jsx(type: ElementType, props: Record<string, unknown> | null, key?: string | number | null): RuntimeElement;
/** `jsxs` has the same ABI; its children are an array in `props.children`. */
export declare const jsxs: typeof jsx;
//# sourceMappingURL=native_jsx_runtime.d.ts.map