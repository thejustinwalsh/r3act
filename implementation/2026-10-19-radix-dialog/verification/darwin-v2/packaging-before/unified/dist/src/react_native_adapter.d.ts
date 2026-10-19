import { type ComponentType as ReactComponentType } from "react";
import { type ComponentType as NativeComponentType, type NativeRootOptions } from "./native_runtime_api.ts";
/**
 * Create a React component that owns one bounded native DOM root.
 *
 * The native component receives the React component's committed props. React
 * context, refs, portals, and React lifecycle semantics do not cross this
 * boundary. The native subtree owns only the contents of its private div.
 * An explicit rootId identifies one mounted adapter instance in its world;
 * use the automatic ID when mounting several instances of the same adapter.
 */
export declare function createReactNativeRootAdapter<P>(NativeComponent: NativeComponentType<P>, options?: NativeRootOptions): ReactComponentType<P>;
/** Embed one independent React DOM root inside a native owner. */
export declare function createNativeReactRootAdapter<P extends object>(ReactComponent: ReactComponentType<P>): NativeComponentType<P>;
//# sourceMappingURL=react_native_adapter.d.ts.map