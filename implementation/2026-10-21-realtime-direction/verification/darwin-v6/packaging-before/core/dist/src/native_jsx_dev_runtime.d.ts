/** Development automatic-runtime JSX ABI. */
import { Fragment } from "./native_jsx_runtime.ts";
import type { ElementType, RuntimeElement } from "./jsx_binding_runtime.ts";
export type { JSX } from "./native_jsx_types.d.ts";
export { Fragment };
/**
 * Match the standard development helper signature. Debug metadata is accepted
 * for transform compatibility; the current runtime does not retain it.
 */
export declare function jsxDEV(type: ElementType, props: Record<string, unknown> | null, key?: string | number | null, _isStaticChildren?: boolean, _source?: unknown, _self?: unknown): RuntimeElement;
//# sourceMappingURL=native_jsx_dev_runtime.d.ts.map