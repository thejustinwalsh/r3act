/** Optional Three-specific JSX types; authored hooks still require the compiler. */
import type { ComponentType, Fragment as NativeFragment, RuntimeElement, RuntimeNode } from "./jsx_binding_runtime.ts";
import type { ThreeHostInstance, ThreeIntrinsicElements, ThreeRef } from "./three_intrinsic_types.ts";
export { jsx, jsxs, Fragment } from "./native_jsx_runtime.ts";

export namespace JSX {
  export type Element = RuntimeElement;
  export type ElementType = keyof IntrinsicElements | ComponentType<any> | typeof NativeFragment;
  export interface ElementChildrenAttribute { children: {}; }
  export interface IntrinsicAttributes { key?: string | number | null; }
  /** Custom constructor catalogs may augment this interface with inferred maps. */
  export interface IntrinsicElements extends ThreeIntrinsicElements {
    primitive: {
      object: ThreeHostInstance;
      attach?: string;
      key?: string | number | null;
      ref?: ThreeRef<ThreeHostInstance>;
      children?: RuntimeNode;
    };
  }
}
