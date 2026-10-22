import * as THREE from 'three';
import { WebGLRenderTarget } from 'three';
import { M as MutableOrReadonlyParameters$1, a as MathRepresentation$1, V as VectorRepresentation$1, b as MathTypes$1, c as MathType$1, d as MathProps$1, e as Vector2$1, f as Vector3$1, g as Vector4$1, C as Color$1, L as Layers$1, Q as Quaternion$1, E as Euler$1, h as Matrix3$1, i as Matrix4$1, R as RaycastableRepresentation$1, j as EventProps$1, G as GeometryTransformProps$1, k as GeometryProps$1, T as TSLNodeInput$1, N as NodeProps$1, l as ReactProps$1, m as ConstructorRepresentation, n as ElementProps$1, o as ThreeElement$1, p as ThreeToJSXElements$1, O as Object3DMethod$1, q as ThreeElementsOf$1, r as ElementOf$1, s as ReconcilerRoot } from './shared/fiber.DQTSZ24m.cjs';
export { aE as Act, as as Args, at as ArgsProp, ap as AttachFnType, aq as AttachType, a7 as BaseRendererProps, aF as Bridge, U as Camera, aj as CameraProps, ag as CanvasSchedulerConfig, ar as Catalogue, aa as ColorManagementConfig, a1 as ComputeFunction, ad as DefaultGLProps, af as DefaultRendererProps, aK as Disposable, Z as DomEvent, D as Dpr, aJ as EquConfig, $ as EventHandlers, a3 as EventManager, _ as Events, am as FiberRoot, a0 as FilterFunction, aY as ForRegisteredRenderer, aO as FrameCallback, aN as FrameNextCallback, aL as FrameNextState, aM as FrameState, F as Frameloop, ae as GLProps, aw as HostConfig, al as InjectState, av as Instance, au as InstanceProps, K as Intersection, W as IntersectionEvent, aC as IsAllOptional, aB as IsOptional, aA as Mutable, ax as NonFunctionKeys, aI as ObjectMap, aR as OcclusionSupport, a6 as OffscreenCanvas, ay as Overwrite, B as Performance, a4 as PointerCaptureTarget, P as PointerState, az as Properties, aZ as R3FRenderTarget, a_ as R3FRendererSupport, aW as Register, aX as RegisteredRenderer, A as RenderCallback, ak as RenderProps, a9 as Renderer, ah as RendererConfigExtended, a8 as RendererFactory, ai as RendererProps, aV as RendererProvider, ac as RendererSettingsConfig, aU as RendererSupport, ao as Root, v as RootExtension, J as RootStore, aG as SetBlock, ab as ShadowsConfig, y as Size, S as Subscription, aD as ThreeCamera, aQ as ThreeCore, Y as ThreeEvent, aP as ThreeNamespace, an as TrackedPromise, aH as UnblockProps, z as Viewport, a5 as VisibilityEntry, aS as WebGLSupport, aT as WebGPUSupport, X as XRManager, a2 as XRPointerConfig, w as context, t as registerRootExtension, u as setRenderOverride, a$ as useStore } from './shared/fiber.DQTSZ24m.cjs';
import { aU as CanvasProps, C as LegacyRootState, R as RenderTargetOptions } from './shared/fiber.34TOMPo3.cjs';
export { B as BackgroundConfig, p as BackgroundProp, ah as Block, a2 as DisposeOptions, K as Environment, H as EnvironmentCube, a5 as EnvironmentLoaderProps, F as EnvironmentMap, J as EnvironmentPortal, D as EnvironmentProps, ai as ErrorBoundary, E as Extensions, aM as FROM_REF, aN as FromRefMarker, q as GLTFLike, o as GlobalEffectType, G as GlobalRenderCallback, t as InferLoadResult, I as InputLike, A as InternalState, X as IsObject, A as LegacyInternalState, z as LegacyRenderer, s as LoaderInstance, L as LoaderLike, v as LoaderResult, Y as MappedTextureType, aQ as ONCE, aS as OnceValue, ad as Portal, N as PresetsType, P as PrimaryCanvasEntry, z as R3FRenderer, an as REACT_INTERNAL_PROPS, av as RESERVED_PROPS, $ as Texture, a0 as TextureInput, a1 as TextureResult, Z as UseTextureOptions, a3 as UseTexturesReturn, W as WebGLDefaultProps, x as WebGLProps, y as WebGLShadowConfig, aa as _roots, b as addAfterEffect, a as addEffect, d as addTail, e as advance, aA as applyProps, ax as attach, aq as buildGraph, aj as calculateDpr, S as createEvents, c as createPointerEvents, ac as createPortal, k as createStore, ay as detach, az as diffProps, ar as dispose, c as events, a7 as extend, ao as findInitialRoot, a9 as flushSync, aO as fromRef, as as getInstanceProps, g as getPrimary, j as getPrimaryIds, ap as getRootState, l as getThree, ak as getUuidPrefix, aL as hasConstructor, h as hasPrimary, m as hasThree, i as invalidate, au as invalidateInstance, aB as is, aE as isColorRepresentation, aK as isCopyable, aP as isFromRef, aH as isLayers, aF as isObject3D, aT as isOnce, aC as isOrthographicCamera, aD as isRef, f as isRenderer, aG as isTexture, aI as isUniform, aJ as isVectorLike, aR as once, at as prepare, M as presetsObj, a8 as reconciler, r as registerPrimary, Q as removeInteractivity, aw as resolve, O as swapInteractivity, ab as unmountComponentAtNode, u as unregisterPrimary, al as updateCamera, am as updateFrustum, ag as useBridge, a6 as useEnvironment, U as useGraph, T as useInstanceHandle, ae as useIsomorphicLayoutEffect, V as useLoader, af as useMutableCallback, _ as useTexture, a4 as useTextures, w as waitForPrimary, n as whenThree } from './shared/fiber.34TOMPo3.cjs';
import { FrameCallback, UseFrameNextOptions, FrameNextControls } from '@pmndrs/scheduler';
export { AddPhaseOptions, FrameControls, FrameNextControls, FrameTimingState, RootOptions, Scheduler, SchedulerApi, UseFrameNextOptions, UseFrameOptions, getScheduler } from '@pmndrs/scheduler';
import { JSX } from 'react';
import 'three/webgpu';
import 'zustand';
import 'zustand/traditional';
import 'three/tsl';
import 'react-use-measure';

/**
 * The `ReactThreeFiber` namespace of the legacy entry: the shared element types plus this entry's JSX map.
 *
 * Explicit aliases, not `export type *`: rollup-dts otherwise re-exports the types as namespace values
 * and the built declaration fails to compile for consumers.
 */


type MutableOrReadonlyParameters<T extends (...args: any) => any> = MutableOrReadonlyParameters$1<T>
type MathRepresentation = MathRepresentation$1
type VectorRepresentation = VectorRepresentation$1
type MathTypes = MathTypes$1
type MathType<T extends MathTypes$1> = MathType$1<T>
type MathProps<P> = MathProps$1<P>
type Vector2 = Vector2$1
type Vector3 = Vector3$1
type Vector4 = Vector4$1
type Color = Color$1
type Layers = Layers$1
type Quaternion = Quaternion$1
type Euler = Euler$1
type Matrix3 = Matrix3$1
type Matrix4 = Matrix4$1
type RaycastableRepresentation = RaycastableRepresentation$1
type EventProps<P> = EventProps$1<P>
type GeometryTransformProps = GeometryTransformProps$1
type GeometryProps<P> = GeometryProps$1<P>
type TSLNodeInput = TSLNodeInput$1
type NodeProps<P> = NodeProps$1<P>
type ReactProps<P> = ReactProps$1<P>
type ElementProps<T extends ConstructorRepresentation, P = InstanceType<T>> = ElementProps$1<T, P>
type ThreeElement<T extends ConstructorRepresentation> = ThreeElement$1<T>
type ThreeToJSXElements<T extends Record<string, any>> = ThreeToJSXElements$1<T>
type Object3DMethod = Object3DMethod$1
type ThreeElementsOf<T extends Record<string, any>> = ThreeElementsOf$1<T>
type ElementOf<E, K extends string> = ElementOf$1<E, K>

type legacy_d_Color = Color;
type legacy_d_ElementOf<E, K extends string> = ElementOf<E, K>;
type legacy_d_ElementProps<T extends ConstructorRepresentation, P = InstanceType<T>> = ElementProps<T, P>;
type legacy_d_Euler = Euler;
type legacy_d_EventProps<P> = EventProps<P>;
type legacy_d_GeometryProps<P> = GeometryProps<P>;
type legacy_d_GeometryTransformProps = GeometryTransformProps;
type legacy_d_Layers = Layers;
type legacy_d_MathProps<P> = MathProps<P>;
type legacy_d_MathRepresentation = MathRepresentation;
type legacy_d_MathType<T extends MathTypes$1> = MathType<T>;
type legacy_d_MathTypes = MathTypes;
type legacy_d_Matrix3 = Matrix3;
type legacy_d_Matrix4 = Matrix4;
type legacy_d_MutableOrReadonlyParameters<T extends (...args: any) => any> = MutableOrReadonlyParameters<T>;
type legacy_d_NodeProps<P> = NodeProps<P>;
type legacy_d_Object3DMethod = Object3DMethod;
type legacy_d_Quaternion = Quaternion;
type legacy_d_RaycastableRepresentation = RaycastableRepresentation;
type legacy_d_ReactProps<P> = ReactProps<P>;
type legacy_d_TSLNodeInput = TSLNodeInput;
type legacy_d_ThreeElement<T extends ConstructorRepresentation> = ThreeElement<T>;
type legacy_d_ThreeElements = ThreeElements;
type legacy_d_ThreeElementsOf<T extends Record<string, any>> = ThreeElementsOf<T>;
type legacy_d_ThreeExports = ThreeExports;
type legacy_d_ThreeToJSXElements<T extends Record<string, any>> = ThreeToJSXElements<T>;
type legacy_d_Vector2 = Vector2;
type legacy_d_Vector3 = Vector3;
type legacy_d_Vector4 = Vector4;
type legacy_d_VectorRepresentation = VectorRepresentation;
declare namespace legacy_d {
  export type { legacy_d_Color as Color, legacy_d_ElementOf as ElementOf, legacy_d_ElementProps as ElementProps, legacy_d_Euler as Euler, legacy_d_EventProps as EventProps, legacy_d_GeometryProps as GeometryProps, legacy_d_GeometryTransformProps as GeometryTransformProps, legacy_d_Layers as Layers, legacy_d_MathProps as MathProps, legacy_d_MathRepresentation as MathRepresentation, legacy_d_MathType as MathType, legacy_d_MathTypes as MathTypes, legacy_d_Matrix3 as Matrix3, legacy_d_Matrix4 as Matrix4, legacy_d_MutableOrReadonlyParameters as MutableOrReadonlyParameters, legacy_d_NodeProps as NodeProps, legacy_d_Object3DMethod as Object3DMethod, legacy_d_Quaternion as Quaternion, legacy_d_RaycastableRepresentation as RaycastableRepresentation, legacy_d_ReactProps as ReactProps, legacy_d_TSLNodeInput as TSLNodeInput, legacy_d_ThreeElement as ThreeElement, legacy_d_ThreeElements as ThreeElements, legacy_d_ThreeElementsOf as ThreeElementsOf, legacy_d_ThreeExports as ThreeExports, legacy_d_ThreeToJSXElements as ThreeToJSXElements, legacy_d_Vector2 as Vector2, legacy_d_Vector3 as Vector3, legacy_d_Vector4 as Vector4, legacy_d_VectorRepresentation as VectorRepresentation };
}

declare const R3F_BUILD_LEGACY = true;
declare const R3F_BUILD_WEBGPU = false;
/** Create a root that always constructs a WebGLRenderer. */
declare function createRoot<TCanvas extends HTMLCanvasElement | OffscreenCanvas>(canvas: TCanvas): ReconcilerRoot<TCanvas>;

/** `useThree` narrowed to legacy state — `state.renderer` is a `WebGLRenderer`. */
type UseThreeLegacy = <T = LegacyRootState>(selector?: (state: LegacyRootState) => T, equalityFn?: <U>(state: U, newState: U) => boolean) => T;
/** `useFrame` narrowed to legacy state — the callback's `state.renderer` is a `WebGLRenderer`. */
type UseFrameLegacy = (callback?: FrameCallback<LegacyRootState>, priorityOrOptions?: number | UseFrameNextOptions) => FrameNextControls;
declare const useThree: UseThreeLegacy;
declare const useFrame: UseFrameLegacy;
/** `useRenderTarget` narrowed to the target this entry's renderer produces. */
declare const useRenderTarget: {
    (options?: RenderTargetOptions): WebGLRenderTarget;
    (size: number, options?: RenderTargetOptions): WebGLRenderTarget;
    (width: number, height: number, options?: RenderTargetOptions): WebGLRenderTarget;
};

/**
 * Canvas props on the legacy entry: `onCreated` receives `LegacyRootState`. No `primary` / `share`:
 * renderer sharing is WebGPU-only. `scheduler` works as on every entry.
 */
type LegacyCanvasProps = Omit<CanvasProps, 'onCreated' | 'primary' | 'share'> & {
    /** Callback after the canvas has rendered (but not yet committed); `state.renderer` is a `WebGLRenderer` */
    onCreated?: (state: LegacyRootState) => void;
};

/**
 * A DOM canvas which accepts threejs elements as children, rendered with WebGL. `onCreated` is
 * typed against `LegacyRootState`.
 * @see https://docs.pmnd.rs/react-three-fiber/api/canvas
 */
declare const Canvas: (props: LegacyCanvasProps) => JSX.Element;
/** Three.js constructors available as JSX elements on this entry. */
type ThreeExports = typeof THREE;
interface ThreeElements extends ThreeElementsOf$1<ThreeExports> {
}
declare module 'react' {
    namespace JSX {
        interface IntrinsicElements extends ThreeElements {
        }
    }
}

export { Canvas, Color$1 as Color, ConstructorRepresentation, ElementOf$1 as ElementOf, ElementProps$1 as ElementProps, Euler$1 as Euler, EventProps$1 as EventProps, GeometryProps$1 as GeometryProps, GeometryTransformProps$1 as GeometryTransformProps, Layers$1 as Layers, LegacyRootState, MathProps$1 as MathProps, MathRepresentation$1 as MathRepresentation, MathType$1 as MathType, MathTypes$1 as MathTypes, Matrix3$1 as Matrix3, Matrix4$1 as Matrix4, MutableOrReadonlyParameters$1 as MutableOrReadonlyParameters, NodeProps$1 as NodeProps, Object3DMethod$1 as Object3DMethod, Quaternion$1 as Quaternion, R3F_BUILD_LEGACY, R3F_BUILD_WEBGPU, RaycastableRepresentation$1 as RaycastableRepresentation, ReactProps$1 as ReactProps, legacy_d as ReactThreeFiber, ReconcilerRoot, RenderTargetOptions, LegacyRootState as RootState, TSLNodeInput$1 as TSLNodeInput, ThreeElement$1 as ThreeElement, ThreeElementsOf$1 as ThreeElementsOf, ThreeToJSXElements$1 as ThreeToJSXElements, Vector2$1 as Vector2, Vector3$1 as Vector3, Vector4$1 as Vector4, VectorRepresentation$1 as VectorRepresentation, createRoot, useFrame, useRenderTarget, useThree };
export type { LegacyCanvasProps as CanvasProps, LegacyCanvasProps, ThreeElements, ThreeExports, UseFrameLegacy, UseThreeLegacy };
