/**
 * Type-only JSX backend for `deno.native.json`.
 *
 * This declaration exists only to typecheck authored native TSX. It has no
 * runtime implementation; executable TSX must pass through nativeModulePlugin
 * and its classic `jsx` lowering.
 */
import type {
  ComponentType,
  Fragment as NativeFragment,
  RuntimeElement,
  RuntimeNode,
} from "./jsx_binding_runtime.js";

export namespace JSX {
  /** A JSX expression is one runtime element; components may also return other RuntimeNode values. */
  export type Element = RuntimeElement;

  /** Matches the runtime's string tags, function components, and Fragment symbol. */
  export type ElementType =
    | string
    | ComponentType<any>
    | typeof NativeFragment;

  export interface ElementChildrenAttribute {
    children: {};
  }

  export interface IntrinsicAttributes {
    key?: string | number | null;
  }

  /** Native intrinsic names are host-defined; the runtime stores arbitrary props. */
  export interface IntrinsicElements {
    [tag: string]: {
      children?: RuntimeNode;
      [name: string]: unknown;
    };
  }
}

/** Type declarations only; no callable JSX runtime is provided here. */
export const Fragment: typeof NativeFragment;
export function jsx(
  type: JSX.ElementType,
  props: Record<string, unknown> | null,
  key?: string,
): RuntimeElement;
export function jsxs(
  type: JSX.ElementType,
  props: Record<string, unknown> | null,
  key?: string,
): RuntimeElement;
