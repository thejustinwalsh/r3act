/** Optional Three-specific JSX types; authored hooks still require the compiler. */
import type { ComponentType, Fragment as NativeFragment, RuntimeElement, RuntimeNode } from "./jsx_binding_runtime.ts";
import type { ThreeHostInstance, ThreeIntrinsicElements, ThreeRef } from "./three_intrinsic_types.ts";
export { jsx, jsxs, Fragment } from "./native_jsx_runtime.ts";
export declare namespace JSX {
    type Element = RuntimeElement;
    type ElementType = keyof IntrinsicElements | ComponentType<any> | typeof NativeFragment;
    interface ElementChildrenAttribute {
        children: {};
    }
    interface IntrinsicAttributes {
        key?: string | number | null;
    }
    /** Custom constructor catalogs may augment this interface with inferred maps. */
    interface IntrinsicElements extends ThreeIntrinsicElements {
        primitive: {
            object: ThreeHostInstance;
            attach?: string;
            key?: string | number | null;
            ref?: ThreeRef<ThreeHostInstance>;
            children?: RuntimeNode;
        };
    }
}
//# sourceMappingURL=three_jsx_runtime.d.ts.map