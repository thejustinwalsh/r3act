import { FrameCallback, UseFrameNextOptions, FrameNextControls } from '@pmndrs/scheduler';
import { WebGPURenderer, WebGPURendererParameters, RenderTarget } from 'three/webgpu';
import { H as RootState, I as InternalState, a8 as RendererFactory, a7 as BaseRendererProps, az as Properties } from './fiber.DQTSZ24m.cjs';
import { R as RenderTargetOptions, aU as CanvasProps } from './fiber.34TOMPo3.cjs';

//* Renderer Props ========================================

type WebGPUDefaultProps = Omit<WebGPURendererParameters, 'canvas'> & BaseRendererProps

type WebGPUProps =
  | RendererFactory<WebGPURenderer, WebGPUDefaultProps>
  | Partial<Properties<WebGPURenderer> | WebGPURendererParameters>

// WebGPU doesn't have shadow maps in the same way
interface WebGPUShadowConfig {
  shadows?: boolean // Simplified for WebGPU
}

//* WebGPU-specific Types ========================================

/** WebGPU renderer type - re-exported as R3FRenderer from @react-three/fiber/webgpu */
type WebGPUR3FRenderer = WebGPURenderer

/** WebGPU internal state with narrowed renderer type */
interface WebGPUInternalState extends Omit<InternalState, 'actualRenderer'> {
  actualRenderer: WebGPURenderer
}

/**
 * WebGPU-specific RootState with narrowed renderer type.
 * Automatically used when importing from `@react-three/fiber/webgpu`.
 *
 * @example
 * ```tsx
 * import { useThree } from '@react-three/fiber/webgpu'
 *
 * function MyComponent() {
 *   const { renderer } = useThree()
 *   // renderer is typed as WebGPURenderer
 *   renderer.compute(computePass)
 * }
 * ```
 */
// `gl` is not narrowed: it keeps the base type (WebGLRenderer, for code written against it), so a
// WebGPURootState stays assignable to RootState and `useFrame((state: RootState) => ...)` still
// compiles where the hooks are WebGPU-typed. At runtime it aliases `renderer`; use that instead.
interface WebGPURootState extends Omit<RootState, 'renderer' | 'internal'> {
  /** The WebGPU renderer instance */
  renderer: WebGPURenderer
  /** Internals with WebGPU renderer */
  internal: WebGPUInternalState
}

/**
 * @fileoverview WebGPU-narrowed hook and Canvas types, shared by the entries that render with WebGPU
 *
 * `@react-three/fiber` and `@react-three/fiber/webgpu` both render with WebGPURenderer. The core
 * hooks are declared against the base RootState, whose `renderer` is the R3FRenderer union
 * (WebGLRenderer included) so that libraries typed against it also compile for `/legacy` apps. On
 * these entries that union is already resolved, so leaving it in place forced a cast for anything
 * WebGPU-only:
 *
 *   const renderer = useThree((s) => s.renderer)
 *   renderer.compute(node)   // Property 'compute' does not exist on type 'R3FRenderer'
 *
 * The entries re-export the hooks below instead. Types only: the values are the core
 * implementations untouched, so there is no runtime cost and no second code path to keep in sync.
 * See https://github.com/pmndrs/react-three-fiber/issues/3851
 */

/** `useThree` narrowed to WebGPU state — `state.renderer` is a `WebGPURenderer`. */
type UseThreeWebGPU = <T = WebGPURootState>(selector?: (state: WebGPURootState) => T, equalityFn?: <U>(state: U, newState: U) => boolean) => T;
/** `useFrame` narrowed to WebGPU state — the callback's `state.renderer` is a `WebGPURenderer`. */
type UseFrameWebGPU = (callback?: FrameCallback<WebGPURootState>, priorityOrOptions?: number | UseFrameNextOptions) => FrameNextControls;
declare const useThree: UseThreeWebGPU;
declare const useFrame: UseFrameWebGPU;
/** `useRenderTarget` narrowed to the target a WebGPU renderer produces. */
declare const useRenderTarget: {
    (options?: RenderTargetOptions): RenderTarget;
    (size: number, options?: RenderTargetOptions): RenderTarget;
    (width: number, height: number, options?: RenderTargetOptions): RenderTarget;
};
/** Canvas props on a WebGPU entry: `onCreated` receives `WebGPURootState`. */
type WebGPUCanvasProps = Omit<CanvasProps, 'onCreated'> & {
    /** Callback after the canvas has rendered (but not yet committed); `state.renderer` is a `WebGPURenderer` */
    onCreated?: (state: WebGPURootState) => void;
};

export { useFrame as a, useRenderTarget as b, useThree as u };
export type { UseThreeWebGPU as U, WebGPUCanvasProps as W, UseFrameWebGPU as c, WebGPURootState as d, WebGPUInternalState as e, WebGPUR3FRenderer as f, WebGPUProps as g, WebGPUDefaultProps as h, WebGPUShadowConfig as i };
