import * as ThreeWebGPU from 'three/webgpu';
import * as React from 'react';
import * as _react_three_fiber from '@react-three/fiber';
import { M as MutableOrReadonlyParameters$1, a as MathRepresentation$1, V as VectorRepresentation$1, b as MathTypes$1, c as MathType$1, d as MathProps$1, e as Vector2$1, f as Vector3$1, g as Vector4$1, C as Color$1, L as Layers$1, Q as Quaternion$1, E as Euler$1, h as Matrix3$1, i as Matrix4$1, R as RaycastableRepresentation$1, j as EventProps$1, G as GeometryTransformProps$1, k as GeometryProps$1, T as TSLNodeInput$1, N as NodeProps$1, l as ReactProps$1, m as ConstructorRepresentation, n as ElementProps$1, o as ThreeElement$1, p as ThreeToJSXElements$1, O as Object3DMethod$1, q as ThreeElementsOf$1, r as ElementOf$1, s as ReconcilerRoot } from './shared/fiber.DQTSZ24m.js';
export { aE as Act, as as Args, at as ArgsProp, ap as AttachFnType, aq as AttachType, a7 as BaseRendererProps, aF as Bridge, U as Camera, aj as CameraProps, ag as CanvasSchedulerConfig, ar as Catalogue, aa as ColorManagementConfig, a1 as ComputeFunction, ad as DefaultGLProps, af as DefaultRendererProps, aK as Disposable, Z as DomEvent, D as Dpr, aJ as EquConfig, $ as EventHandlers, a3 as EventManager, _ as Events, am as FiberRoot, a0 as FilterFunction, aY as ForRegisteredRenderer, aO as FrameCallback, aN as FrameNextCallback, aL as FrameNextState, aM as FrameState, F as Frameloop, ae as GLProps, aw as HostConfig, al as InjectState, av as Instance, au as InstanceProps, I as InternalState, K as Intersection, W as IntersectionEvent, aC as IsAllOptional, aB as IsOptional, aA as Mutable, ax as NonFunctionKeys, aI as ObjectMap, aR as OcclusionSupport, a6 as OffscreenCanvas, ay as Overwrite, B as Performance, a4 as PointerCaptureTarget, P as PointerState, az as Properties, aZ as R3FRenderTarget, x as R3FRenderer, a_ as R3FRendererSupport, aW as Register, aX as RegisteredRenderer, A as RenderCallback, ak as RenderProps, a9 as Renderer, ah as RendererConfigExtended, a8 as RendererFactory, ai as RendererProps, aV as RendererProvider, ac as RendererSettingsConfig, aU as RendererSupport, ao as Root, v as RootExtension, H as RootState, J as RootStore, aG as SetBlock, ab as ShadowsConfig, y as Size, S as Subscription, aD as ThreeCamera, aQ as ThreeCore, Y as ThreeEvent, aP as ThreeNamespace, an as TrackedPromise, aH as UnblockProps, z as Viewport, a5 as VisibilityEntry, aS as WebGLSupport, aT as WebGPUSupport, X as XRManager, a2 as XRPointerConfig, w as context, t as registerRootExtension, u as setRenderOverride, a$ as useStore } from './shared/fiber.DQTSZ24m.js';
export { B as BackgroundConfig, p as BackgroundProp, ah as Block, a2 as DisposeOptions, K as Environment, H as EnvironmentCube, a5 as EnvironmentLoaderProps, F as EnvironmentMap, J as EnvironmentPortal, D as EnvironmentProps, ai as ErrorBoundary, E as Extensions, aM as FROM_REF, aN as FromRefMarker, q as GLTFLike, o as GlobalEffectType, G as GlobalRenderCallback, t as InferLoadResult, I as InputLike, X as IsObject, A as LegacyInternalState, z as LegacyRenderer, C as LegacyRootState, s as LoaderInstance, L as LoaderLike, v as LoaderResult, Y as MappedTextureType, aQ as ONCE, aS as OnceValue, ad as Portal, N as PresetsType, P as PrimaryCanvasEntry, an as REACT_INTERNAL_PROPS, av as RESERVED_PROPS, R as RenderTargetOptions, $ as Texture, a0 as TextureInput, a1 as TextureResult, Z as UseTextureOptions, a3 as UseTexturesReturn, W as WebGLDefaultProps, x as WebGLProps, y as WebGLShadowConfig, aa as _roots, b as addAfterEffect, a as addEffect, d as addTail, e as advance, aA as applyProps, ax as attach, aq as buildGraph, aj as calculateDpr, S as createEvents, c as createPointerEvents, ac as createPortal, k as createStore, ay as detach, az as diffProps, ar as dispose, c as events, a7 as extend, ao as findInitialRoot, a9 as flushSync, aO as fromRef, as as getInstanceProps, g as getPrimary, j as getPrimaryIds, ap as getRootState, l as getThree, ak as getUuidPrefix, aL as hasConstructor, h as hasPrimary, m as hasThree, i as invalidate, au as invalidateInstance, aB as is, aE as isColorRepresentation, aK as isCopyable, aP as isFromRef, aH as isLayers, aF as isObject3D, aT as isOnce, aC as isOrthographicCamera, aD as isRef, f as isRenderer, aG as isTexture, aI as isUniform, aJ as isVectorLike, aR as once, at as prepare, M as presetsObj, a8 as reconciler, r as registerPrimary, Q as removeInteractivity, aw as resolve, O as swapInteractivity, ab as unmountComponentAtNode, u as unregisterPrimary, al as updateCamera, am as updateFrustum, ag as useBridge, a6 as useEnvironment, U as useGraph, T as useInstanceHandle, ae as useIsomorphicLayoutEffect, V as useLoader, af as useMutableCallback, _ as useTexture, a4 as useTextures, w as waitForPrimary, n as whenThree } from './shared/fiber.CjMAAsJy.js';
export { W as CanvasProps, c as UseFrameWebGPU, U as UseThreeWebGPU, h as WebGPUDefaultProps, e as WebGPUInternalState, g as WebGPUProps, f as WebGPUR3FRenderer, d as WebGPURootState, i as WebGPUShadowConfig, a as useFrame, b as useRenderTarget, u as useThree } from './shared/fiber.DuA4F8L5.js';
export { AddPhaseOptions, FrameControls, FrameNextControls, FrameTimingState, RootOptions, Scheduler, SchedulerApi, UseFrameNextOptions, UseFrameOptions, getScheduler } from '@pmndrs/scheduler';
import 'three';
import 'zustand';
import 'zustand/traditional';
import 'three/tsl';
import 'react-use-measure';

/**
 * The `ReactThreeFiber` namespace of the default entry: the shared element types plus this entry's JSX map.
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

type default_d_Color = Color;
type default_d_ElementOf<E, K extends string> = ElementOf<E, K>;
type default_d_ElementProps<T extends ConstructorRepresentation, P = InstanceType<T>> = ElementProps<T, P>;
type default_d_Euler = Euler;
type default_d_EventProps<P> = EventProps<P>;
type default_d_GeometryProps<P> = GeometryProps<P>;
type default_d_GeometryTransformProps = GeometryTransformProps;
type default_d_Layers = Layers;
type default_d_MathProps<P> = MathProps<P>;
type default_d_MathRepresentation = MathRepresentation;
type default_d_MathType<T extends MathTypes$1> = MathType<T>;
type default_d_MathTypes = MathTypes;
type default_d_Matrix3 = Matrix3;
type default_d_Matrix4 = Matrix4;
type default_d_MutableOrReadonlyParameters<T extends (...args: any) => any> = MutableOrReadonlyParameters<T>;
type default_d_NodeProps<P> = NodeProps<P>;
type default_d_Object3DMethod = Object3DMethod;
type default_d_Quaternion = Quaternion;
type default_d_RaycastableRepresentation = RaycastableRepresentation;
type default_d_ReactProps<P> = ReactProps<P>;
type default_d_TSLNodeInput = TSLNodeInput;
type default_d_ThreeElement<T extends ConstructorRepresentation> = ThreeElement<T>;
type default_d_ThreeElements = ThreeElements;
type default_d_ThreeElementsOf<T extends Record<string, any>> = ThreeElementsOf<T>;
type default_d_ThreeExports = ThreeExports;
type default_d_ThreeToJSXElements<T extends Record<string, any>> = ThreeToJSXElements<T>;
type default_d_Vector2 = Vector2;
type default_d_Vector3 = Vector3;
type default_d_Vector4 = Vector4;
type default_d_VectorRepresentation = VectorRepresentation;
declare namespace default_d {
  export type { default_d_Color as Color, default_d_ElementOf as ElementOf, default_d_ElementProps as ElementProps, default_d_Euler as Euler, default_d_EventProps as EventProps, default_d_GeometryProps as GeometryProps, default_d_GeometryTransformProps as GeometryTransformProps, default_d_Layers as Layers, default_d_MathProps as MathProps, default_d_MathRepresentation as MathRepresentation, default_d_MathType as MathType, default_d_MathTypes as MathTypes, default_d_Matrix3 as Matrix3, default_d_Matrix4 as Matrix4, default_d_MutableOrReadonlyParameters as MutableOrReadonlyParameters, default_d_NodeProps as NodeProps, default_d_Object3DMethod as Object3DMethod, default_d_Quaternion as Quaternion, default_d_RaycastableRepresentation as RaycastableRepresentation, default_d_ReactProps as ReactProps, default_d_TSLNodeInput as TSLNodeInput, default_d_ThreeElement as ThreeElement, default_d_ThreeElements as ThreeElements, default_d_ThreeElementsOf as ThreeElementsOf, default_d_ThreeExports as ThreeExports, default_d_ThreeToJSXElements as ThreeToJSXElements, default_d_Vector2 as Vector2, default_d_Vector3 as Vector3, default_d_Vector4 as Vector4, default_d_VectorRepresentation as VectorRepresentation };
}

declare const R3F_BUILD_LEGACY = false;
declare const R3F_BUILD_WEBGPU = true;
/**
 * Create a root on a canvas. Renders with `WebGPURenderer`; for `WebGLRenderer`, import `createRoot`
 * from `@react-three/fiber/legacy`.
 */
declare function createRoot<TCanvas extends HTMLCanvasElement | OffscreenCanvas>(canvas: TCanvas): ReconcilerRoot<TCanvas>;
/**
 * A DOM canvas which accepts threejs elements as children. Renders with `WebGPURenderer`; for
 * `WebGLRenderer`, import `Canvas` from `@react-three/fiber/legacy`.
 * @see https://docs.pmnd.rs/react-three-fiber/api/canvas
 */
declare const Canvas: (props: _react_three_fiber.CanvasProps) => React.JSX.Element;
/** Three.js constructors available as JSX elements on this entry. */
type ThreeExports = typeof ThreeWebGPU;
interface ThreeElements extends ThreeElementsOf$1<ThreeExports> {
}
declare module 'react' {
    namespace JSX {
        interface IntrinsicElements extends ThreeElements {
        }
    }
}

export { Canvas, Color$1 as Color, ConstructorRepresentation, ElementOf$1 as ElementOf, ElementProps$1 as ElementProps, Euler$1 as Euler, EventProps$1 as EventProps, GeometryProps$1 as GeometryProps, GeometryTransformProps$1 as GeometryTransformProps, Layers$1 as Layers, MathProps$1 as MathProps, MathRepresentation$1 as MathRepresentation, MathType$1 as MathType, MathTypes$1 as MathTypes, Matrix3$1 as Matrix3, Matrix4$1 as Matrix4, MutableOrReadonlyParameters$1 as MutableOrReadonlyParameters, NodeProps$1 as NodeProps, Object3DMethod$1 as Object3DMethod, Quaternion$1 as Quaternion, R3F_BUILD_LEGACY, R3F_BUILD_WEBGPU, RaycastableRepresentation$1 as RaycastableRepresentation, ReactProps$1 as ReactProps, default_d as ReactThreeFiber, ReconcilerRoot, TSLNodeInput$1 as TSLNodeInput, ThreeElement$1 as ThreeElement, ThreeElementsOf$1 as ThreeElementsOf, ThreeToJSXElements$1 as ThreeToJSXElements, Vector2$1 as Vector2, Vector3$1 as Vector3, Vector4$1 as Vector4, VectorRepresentation$1 as VectorRepresentation, createRoot };
export type { ThreeElements, ThreeExports };
