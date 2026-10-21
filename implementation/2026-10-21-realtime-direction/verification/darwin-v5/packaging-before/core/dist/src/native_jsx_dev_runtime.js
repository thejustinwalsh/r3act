/** Development automatic-runtime JSX ABI. */
import { Fragment, jsx, } from "./native_jsx_runtime.js";
export { Fragment };
/**
 * Match the standard development helper signature. Debug metadata is accepted
 * for transform compatibility; the current runtime does not retain it.
 */
export function jsxDEV(type, props, key, _isStaticChildren, _source, _self) {
    return jsx(type, props, key);
}
//# sourceMappingURL=native_jsx_dev_runtime.js.map