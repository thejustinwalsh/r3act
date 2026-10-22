import { FrameTimingState, FrameCallback as FrameCallback$1, SchedulerApi } from '@pmndrs/scheduler';
import * as THREE from 'three';
import { WebGLRenderer, WebGLRenderTarget, Color as Color$1, ColorRepresentation } from 'three';
import * as ThreeWebGPU from 'three/webgpu';
import { WebGPURenderer, RenderTarget, CanvasTarget, WebGPURendererParameters } from 'three/webgpu';
import * as React$1 from 'react';
import { ReactNode } from 'react';
import { StoreApi } from 'zustand';
import { UseBoundStoreWithEqualityFn } from 'zustand/traditional';
import { uniform, nodeObject } from 'three/tsl';

//* Utility Types ==============================

type NonFunctionKeys<P> = { [K in keyof P]-?: P[K] extends Function ? never : K }[keyof P]
type Overwrite<P, O> = Omit<P, NonFunctionKeys<O>> & O
type Properties<T> = Pick<T, NonFunctionKeys<T>>
type Mutable<P> = { -readonly [K in keyof P]: P[K] }
type IsOptional<T> = undefined extends T ? true : false
type IsAllOptional<T extends any[]> = T extends [infer First, ...infer Rest]
  ? IsOptional<First> extends true
    ? IsAllOptional<Rest>
    : false
  : true

//* Camera Types ==============================

type ThreeCamera = (THREE.OrthographicCamera | THREE.PerspectiveCamera) & { manual?: boolean }

//* Act Type ==============================

type Act = <T = any>(cb: () => Promise<T>) => Promise<T>

//* Bridge & Block Types ==============================

type Bridge = React$1.FC<{ children?: React$1.ReactNode }>

type SetBlock = false | Promise<null> | null
type UnblockProps = { set: React$1.Dispatch<React$1.SetStateAction<SetBlock>>; children: React$1.ReactNode }

//* Object Map Type ==============================

/* Original version
export interface ObjectMap {
  nodes: { [name: string]: THREE.Object3D }
  materials: { [name: string]: THREE.Material }
  meshes: { [name: string]: THREE.Mesh }
}
*/
/* This version is an expansion found in a PR by itsdouges that seems abandoned but looks useful.
It allows expansion but falls back to the original shape. (deleted due to stale, but If it doesnt conflict
I will keep the use here)
https://github.com/pmndrs/react-three-fiber/commits/generic-object-map/
His description is:
The object map type is now generic and can optionally declare the available properties for nodes, materials, and meshes.
*/
interface ObjectMap<
  T extends { nodes?: string; materials?: string; meshes?: string } = {
    nodes: string
    materials: string
    meshes: string
  },
> {
  nodes: Record<T['nodes'] extends string ? T['nodes'] : string, THREE.Object3D>
  materials: Record<T['materials'] extends string ? T['materials'] : string, THREE.Material>
  meshes: Record<T['meshes'] extends string ? T['meshes'] : string, THREE.Mesh>
}

//* Equality Config ==============================

interface EquConfig {
  /** Compare arrays by reference equality a === b (default), or by shallow equality */
  arrays?: 'reference' | 'shallow'
  /** Compare objects by reference equality a === b (default), or by shallow equality */
  objects?: 'reference' | 'shallow'
  /** If true the keys in both a and b must match 1:1 (default), if false a's keys must intersect b's */
  strict?: boolean
}

//* Disposable Type ==============================

interface Disposable {
  type?: string
  dispose?: () => void
}

//* Event-related Types =====================================

interface Intersection extends THREE.Intersection {
  /** The event source (the object which registered the handler) */
  eventObject: THREE.Object3D
}

type Camera = THREE.OrthographicCamera | THREE.PerspectiveCamera

interface IntersectionEvent<TSourceEvent> extends Intersection {
  /** The event source (the object which registered the handler) */
  eventObject: THREE.Object3D
  /** An array of intersections */
  intersections: Intersection[]
  /** vec3.set(pointer.x, pointer.y, 0).unproject(camera) */
  unprojectedPoint: THREE.Vector3
  /** Normalized event coordinates */
  pointer: THREE.Vector2
  /** pointerId of the original event for multiple pointer events */
  pointerId: number
  /** Delta between first click and this event */
  delta: number
  /** The ray that pierced it */
  ray: THREE.Ray
  /** The camera that was used by the raycaster */
  camera: Camera
  /** stopPropagation will stop underlying handlers from firing */
  stopPropagation: () => void
  /** The original host event */
  nativeEvent: TSourceEvent
  /** If the event was stopped by calling stopPropagation */
  stopped: boolean
}

type ThreeEvent<TEvent> = IntersectionEvent<TEvent> & Properties<TEvent>
type DomEvent = PointerEvent | MouseEvent | WheelEvent

/** DOM event handlers registered on the canvas element */
interface Events {
  onClick: EventListener
  onContextMenu: EventListener
  onDoubleClick: EventListener
  onWheel: EventListener
  onPointerDown: EventListener
  onPointerUp: EventListener
  onPointerLeave: EventListener
  onPointerMove: EventListener
  onPointerCancel: EventListener
  onLostPointerCapture: EventListener
  onDragEnter: EventListener
  onDragLeave: EventListener
  onDragOver: EventListener
  onDrop: EventListener
}

/** Event handlers that can be attached to R3F objects (meshes, groups, etc.) */
interface EventHandlers {
  onClick?: (event: ThreeEvent<MouseEvent>) => void
  onContextMenu?: (event: ThreeEvent<MouseEvent>) => void
  onDoubleClick?: (event: ThreeEvent<MouseEvent>) => void
  /** Fires continuously while dragging over the object */
  onDragOver?: (event: ThreeEvent<DragEvent>) => void
  /** Fires once when drag enters the object */
  onDragOverEnter?: (event: ThreeEvent<DragEvent>) => void
  /** Fires once when drag leaves the object */
  onDragOverLeave?: (event: ThreeEvent<DragEvent>) => void
  /** Fires when drag misses this object (for objects that have drag handlers) */
  onDragOverMissed?: (event: DragEvent) => void
  /** Fires when a drop occurs on this object */
  onDrop?: (event: ThreeEvent<DragEvent>) => void
  /** Fires when a drop misses this object (for objects that have drop handlers) */
  onDropMissed?: (event: DragEvent) => void
  onPointerUp?: (event: ThreeEvent<PointerEvent>) => void
  onPointerDown?: (event: ThreeEvent<PointerEvent>) => void
  onPointerOver?: (event: ThreeEvent<PointerEvent>) => void
  onPointerOut?: (event: ThreeEvent<PointerEvent>) => void
  onPointerEnter?: (event: ThreeEvent<PointerEvent>) => void
  onPointerLeave?: (event: ThreeEvent<PointerEvent>) => void
  onPointerMove?: (event: ThreeEvent<PointerEvent>) => void
  onPointerMissed?: (event: MouseEvent) => void
  onPointerCancel?: (event: ThreeEvent<PointerEvent>) => void
  onWheel?: (event: ThreeEvent<WheelEvent>) => void
  onLostPointerCapture?: (event: ThreeEvent<PointerEvent>) => void

  //* Visibility Events --------------------------------
  /** Fires when object enters/exits camera frustum. Receives true when in view, false when out. */
  onFramed?: (inView: boolean) => void
  /** Fires when object occlusion state changes (WebGPU only, requires occlusionTest=true on object) */
  onOccluded?: (occluded: boolean) => void
  /** Fires when combined visibility changes (frustum + occlusion + visible prop) */
  onVisible?: (visible: boolean) => void
}

type FilterFunction = (items: THREE.Intersection[], state: RootState) => THREE.Intersection[]
type ComputeFunction = (event: DomEvent, root: RootState, previous?: RootState) => void

/** Configuration for XR pointer registration (controllers/hands) */
interface XRPointerConfig {
  /** Ray origin (updated each frame by XR system) */
  ray: THREE.Ray
  /** Optional: custom compute function for this pointer */
  compute?: (state: RootState) => void
  /** Pointer type identifier */
  type: 'controller' | 'hand' | 'gaze'
  /** Which hand (for controller/hand types) */
  handedness?: 'left' | 'right'
}

interface EventManager<TTarget> {
  /** Determines if the event layer is active */
  enabled: boolean
  /** Event layer priority, higher prioritized layers come first and may stop(-propagate) lower layer  */
  priority: number
  /** The compute function needs to set up the raycaster and an xy- pointer  */
  compute?: ComputeFunction
  /** The filter can re-order or re-structure the intersections  */
  filter?: FilterFunction
  /** The target node the event layer is tied to */
  connected?: TTarget
  /** All the pointer event handlers through which the host forwards native events */
  handlers?: Events
  /** Allows re-connecting to another target */
  connect?: (target: TTarget) => void
  /** Removes all existing events handlers from the target */
  disconnect?: () => void
  /** Triggers a onPointerMove with the last known event. This can be useful to enable raycasting without
   *  explicit user interaction, for instance when the camera moves a hoverable object underneath the cursor.
   *  @param pointerId - Optional pointer ID to update specific pointer only
   */
  update?: (pointerId?: number) => void
  /** Defer pointer move raycasting to frame start (default: true) */
  frameTimedRaycasts?: boolean
  /** Always fire raycaster immediately on scroll events (default: true) */
  alwaysFireOnScroll?: boolean
  /** Automatically re-raycast every frame to detect hover changes from moving objects/camera (default: false) */
  updateOnFrame?: boolean
  /** Flush deferred pointer raycasts. Called by scheduler at frame start (input phase). */
  flush?: () => void
  /** Register an XR pointer (controller/hand). Returns assigned pointerId */
  registerPointer?: (config: XRPointerConfig) => number
  /** Unregister an XR pointer */
  unregisterPointer?: (pointerId: number) => void
}

interface PointerCaptureTarget {
  intersection: Intersection
  target: Element
}

//* Visibility System Types =====================================

/** Entry in the visibility registry for tracking object visibility state */
interface VisibilityEntry {
  object: THREE.Object3D
  handlers: Pick<EventHandlers, 'onFramed' | 'onOccluded' | 'onVisible'>
  lastFramedState: boolean | null
  lastOccludedState: boolean | null
  lastVisibleState: boolean | null
}

//* Scheduler Types (useFrame) ==============================
//
// The generic, framework-agnostic scheduler types now live in @pmndrs/scheduler.
// This file re-exports them and layers r3f's RootState-aware frame state on top,
// so existing `#types` imports across the codebase keep resolving unchanged.



// Frame State (r3f-specific) --------------------------------

/**
 * State passed to useFrame callbacks (extends RootState with timing).
 */
interface FrameNextState extends RootState, FrameTimingState {}

/** Alias for FrameNextState */
type FrameState = FrameNextState

// Callback Types (r3f-specific) --------------------------------

/**
 * Callback function for useFrame. Receives the full r3f RootState plus timing.
 */
type FrameNextCallback = FrameCallback$1<RootState>

/** Alias for FrameNextCallback */
type FrameCallback = FrameNextCallback

//* Renderer Support ==============================
// Core has no static imports from `three` or `three/webgpu`. Both are separate bundles built on one
// shared `three.core.js`, and there is no import that gives you the core alone -- so a core that
// statically imported either one would put that renderer into every app's eager graph. Instead each
// renderer is described by a *support* object, loaded when a root needs it, that carries the three
// namespace of its flavour plus the handful of renderer-specific classes core touches by name.

/** The Three.js namespace of either flavour. Classes in three's shared core are the same objects in both. */
type ThreeNamespace = typeof THREE | typeof ThreeWebGPU

/**
 * Three's shared core: every export `three` and `three/webgpu` have in common (`Vector3`, `Scene`,
 * `Mesh`, the constants, ...). This is what core code reads from `getThree()`. The renderer-specific
 * exports are reached through the flavour's support object, never by name from here.
 */
type ThreeCore = Pick<typeof THREE, Extract<keyof typeof THREE, keyof typeof ThreeWebGPU>>

/** Node classes and TSL functions the occlusion observer is built from (WebGPU only). */
interface OcclusionSupport {
  Node: typeof ThreeWebGPU.Node
  NodeUpdateType: typeof ThreeWebGPU.NodeUpdateType
  MeshBasicNodeMaterial: typeof ThreeWebGPU.MeshBasicNodeMaterial
  uniform: typeof uniform
  nodeObject: typeof nodeObject
}

/** WebGL renderer support: the `three` namespace and the classes only it exports. */
interface WebGLSupport {
  kind: 'webgl'
  /** `import * as THREE from 'three'`: JSX constructors for roots on this renderer, and core's classes. */
  three: typeof THREE
  Renderer: typeof THREE.WebGLRenderer
  /** Render target for `useRenderTarget`. */
  RenderTarget: typeof THREE.WebGLRenderTarget
  /** Cube render target for `<Environment>`. */
  CubeRenderTarget: typeof THREE.WebGLCubeRenderTarget
}

/** WebGPU renderer support: the `three/webgpu` namespace and the classes only it exports. */
interface WebGPUSupport {
  kind: 'webgpu'
  /** `import * as THREE from 'three/webgpu'`: JSX constructors (node materials included) and core's classes. */
  three: typeof ThreeWebGPU
  Renderer: typeof ThreeWebGPU.WebGPURenderer
  /** Render target for `useRenderTarget`. */
  RenderTarget: typeof ThreeWebGPU.RenderTarget
  /** Cube render target for `<Environment>`. */
  CubeRenderTarget: typeof ThreeWebGPU.CubeRenderTarget
  /** Canvas target for secondary canvases sharing a primary's renderer. */
  CanvasTarget: typeof ThreeWebGPU.CanvasTarget
  occlusion: OcclusionSupport
}

/** Support for the renderer a root ended up with. Selected by `configure()`, kept on `state.internal.support`. */
type RendererSupport = WebGLSupport | WebGPUSupport

/**
 * What an entry point hands to `createRoot`/`Canvas`: a loader per renderer it can construct.
 *
 * The root entry provides both as dynamic imports, so an app downloads only the renderer its
 * Canvas asks for. `/legacy` and `/webgpu` provide one each, statically, for apps that would rather
 * have no extra request than the choice.
 */
interface RendererProvider {
  webgl?: () => WebGLSupport | Promise<WebGLSupport>
  webgpu?: () => WebGPUSupport | Promise<WebGPUSupport>
}

//* Register ==============================
// The base RootState is typed for both renderers, so by default `state.renderer` is the union and a
// WebGPU-only member (`renderer.compute`, `renderer.backend`) needs a narrow. That base is what
// `@react-three/fiber/extension` (the entry for libraries) and the `RootState` type expose, so a
// library compiles for apps on either renderer.
//
// Apps rarely need this: each entry's hooks are already typed for the renderer it renders with
// (`@react-three/fiber` WebGPU, `/legacy` WebGL). Registering narrows the base types too, for code
// that goes through them (`/extension` hooks in an app, `RootState` annotations):
//
//   declare module '@react-three/fiber' {
//     interface Register {
//       renderer: 'webgpu'
//     }
//   }
//
// Same pattern as `Register` in @react-three/tsl (and TanStack Router). Nothing registered means
// the union, unchanged.

/**
 * Augment this to type `RootState` for the renderer your app uses. Recognised keys:
 * - `renderer`: `'webgpu'` or `'webgl'`
 */
interface Register {}

/** The registered renderer, or `'any'` when nothing is registered. */
type RegisteredRenderer = Register extends { renderer: infer R extends 'webgl' | 'webgpu' } ? R : 'any'

/** Pick the type for the registered renderer: WebGPU, WebGL, or both when nothing is registered. */
type ForRegisteredRenderer<WebGPU, WebGL, Either = WebGPU | WebGL> = RegisteredRenderer extends 'webgpu'
  ? WebGPU
  : RegisteredRenderer extends 'webgl'
    ? WebGL
    : Either

/** The renderer type of `state.renderer`: a union of both unless one is registered. */
type R3FRenderer = ForRegisteredRenderer<WebGPURenderer, WebGLRenderer>

/** What `useRenderTarget` returns: a union of both target classes unless a renderer is registered. */
type R3FRenderTarget = ForRegisteredRenderer<RenderTarget, WebGLRenderTarget>

/** The renderer support on `state.internal.support`, narrowed to the registered renderer. */
type R3FRendererSupport = ForRegisteredRenderer<WebGPUSupport, WebGLSupport, RendererSupport>

//* Core Store Types ========================================

type Subscription = {
  ref: React$1.RefObject<RenderCallback>
  priority: number
  store: RootStore
}

/** Per-pointer state for multi-touch and XR support */
type PointerState = {
  /** Objects currently hovered by this pointer */
  hovered: Map<string, ThreeEvent<DomEvent>>
  /** Objects capturing this pointer */
  captured: Map<THREE.Object3D, PointerCaptureTarget>
  /** Initial click position [x, y] */
  initialClick: [x: number, y: number]
  /** Objects hit on initial click */
  initialHits: THREE.Object3D[]
}

type Dpr = number | [min: number, max: number]

interface Size {
  width: number
  height: number
  top: number
  left: number
}

type Frameloop = 'always' | 'demand' | 'never'

interface Viewport extends Size {
  /** The initial pixel ratio */
  initialDpr: number
  /** Current pixel ratio */
  dpr: number
  /** size.width / viewport.width */
  factor: number
  /** Camera distance */
  distance: number
  /** Camera aspect ratio: width / height */
  aspect: number
}

type RenderCallback = (state: RootState, delta: number, frame?: XRFrame) => void

interface Performance {
  /** Current performance normal, between min and max */
  current: number
  /** How low the performance can go, between 0 and max */
  min: number
  /** How high the performance can go, between min and max */
  max: number
  /** Time until current returns to max in ms */
  debounce: number
  /** Sets current to min, puts the system in regression */
  regress: () => void
}

interface InternalState {
  interaction: THREE.Object3D[]
  subscribers: Subscription[]
  /** Per-pointer state (hover, capture, click tracking) - replaces hovered, capturedMap, initialClick, initialHits */
  pointerMap: Map<number, PointerState>
  /** Pointers needing raycast this frame (used with frameTimedRaycasts) */
  pointerDirty: Map<number, DomEvent>
  /** Last event received (for events.update() compatibility) */
  lastEvent: React$1.RefObject<DomEvent | null>
  /** @deprecated Use pointerMap.get(pointerId).hovered instead */
  hovered: Map<string, ThreeEvent<DomEvent>>
  /** @deprecated Use pointerMap.get(pointerId).captured instead */
  capturedMap: Map<number, Map<THREE.Object3D, PointerCaptureTarget>>
  /** @deprecated Use pointerMap.get(pointerId).initialClick instead */
  initialClick: [x: number, y: number]
  /** @deprecated Use pointerMap.get(pointerId).initialHits instead */
  initialHits: THREE.Object3D[]
  /** Visibility event registry (onFramed, onOccluded, onVisible) */
  visibilityRegistry: Map<string, VisibilityEntry>
  /** Whether occlusion queries are enabled (WebGPU only) */
  occlusionEnabled: boolean
  /** Reference to the invisible occlusion observer mesh */
  occlusionObserver: THREE.Mesh | null
  /** Cached occlusion results from render pass - keyed by Object3D */
  occlusionCache: Map<THREE.Object3D, boolean | null>
  /** Internal helper group for R3F system objects (occlusion observer, etc.) */
  helperGroup: THREE.Group | null
  active: boolean
  priority: number
  frames: number
  subscribe: (callback: React$1.RefObject<RenderCallback>, priority: number, store: RootStore) => () => void
  /** Internal renderer storage - use state.renderer or state.gl to access */
  actualRenderer: R3FRenderer
  /**
   * The renderer support `configure()` loaded for this root: the three namespace of that flavour
   * (JSX constructors, core's classes) and the renderer-specific classes core needs by name.
   * Selected once, from the entry's provider, and copied into portals with the rest of `internal`.
   */
  support: R3FRendererSupport
  /**
   * Releases this root's lease on its renderer. The last release disposes a renderer R3F created;
   * a renderer passed in as an instance is never disposed by R3F.
   */
  releaseRenderer?: () => void | Promise<void>
  /** Global scheduler reference (for useFrame hook) */
  scheduler: SchedulerApi | null
  /**
   * Replaces `renderer.render(scene, camera)` in the default render job when set. Set it with
   * `setRenderOverride(store, fn)`; the job keeps its fps throttle, error handling and user
   * render-phase takeover. Used by `useRenderPipeline`.
   */
  renderOverride?: (() => void) | null
  /** This root's unique ID in the global scheduler */
  rootId?: string
  /** Scheduler id reserved when a primary publishes its renderer, before root jobs are installed. */
  pendingRootId?: string
  /** Default scheduler predecessor when borrowing a primary renderer. */
  sharedAfter?: string
  /** Function to unregister this root from the global scheduler */
  unregisterRoot?: () => void
  /** Function to stop following devicePixelRatio changes */
  unwatchDpr?: () => void
  /** Container for child attachment (scene for root, original container for portals) */
  container?: THREE.Object3D
  /**
   * The CanvasTarget this root sizes and renders through.
   *
   * A primary (`<Canvas id>`) owns the renderer's default target -- the one three itself built
   * around the canvas element -- so sizing it is sizing the renderer. A secondary owns a target
   * R3F created for its own element. Either way there is exactly one target per canvas element,
   * and the canvas-target job makes it the renderer's active one before this root renders.
   * Absent on WebGL and on a WebGPU canvas that is neither a primary nor sharing, where the renderer
   * is sized directly.
   * @see https://threejs.org/docs/#api/en/renderers/common/CanvasTarget
   */
  canvasTarget?: CanvasTarget
  /**
   * Set when this root's canvas target has been resized and the backend's cached render pass
   * descriptor (which holds a depth-stencil view built once per canvas) is therefore stale.
   *
   * Flushed by the canvas-target job in the `start` phase, which is the only place this root's
   * target is guaranteed to be the renderer's active one — `backend.updateSize()` operates on
   * whatever `getCanvasTarget()` returns, so calling it from the resize subscription would
   * invalidate some other canvas's descriptor instead.
   *
   * @see https://github.com/pmndrs/react-three-fiber/issues/3847
   */
  canvasTargetSizeDirty?: boolean
  /**
   * Whether multi-canvas rendering is active.
   * True on a `<Canvas primary>` once another canvas shares its renderer, and on that canvas.
   * When true, setCanvasTarget is called before each render.
   */
  isMultiCanvas?: boolean
  /**
   * Whether this canvas is a secondary canvas sharing another's renderer: it found a
   * `<Canvas primary>` (automatically, or through `share="id"`) and borrows its renderer.
   */
  isSecondary?: boolean
  /**
   * The id of the primary canvas this secondary canvas shares.
   * Only set when isSecondary is true and the primary has an `id`.
   */
  targetId?: string
  /**
   * This secondary stopped sharing because the primary's renderer fell back to its
   * WebGL2 backend (#3965): it owns the renderer it constructed, so it is not
   * `isSecondary` (which marks a canvas borrowing another's renderer).
   */
  sharedRendererFallback?: boolean
  /**
   * Function to withdraw this primary canvas from the registry.
   * Only set on a `<Canvas primary>`.
   */
  unregisterPrimary?: () => void
  /**
   * Function to stop tracking this canvas as one that built its own WebGPU renderer while no primary
   * existed (for the late-primary warning).
   */
  untrackStandalone?: () => void
  /** Whether canvas dimensions are forced to even numbers */
  forceEven?: boolean
}

interface XRManager {
  connect: () => void
  disconnect: () => void
}

//* Root State Interface ====================================

interface RootState {
  /** Set current state */
  set: StoreApi<RootState>['setState']
  /** Get current state */
  get: StoreApi<RootState>['getState']
  /**
   * The store of the canvas that owns this root's renderer.
   * - For primary/independent canvases: points to its own store (self-reference)
   * - For secondary canvases: points to the primary canvas's store
   * - Portals copy it from their parent
   *
   * Anything shared per renderer rather than per canvas (e.g. @react-three/tsl's resources)
   * resolves through it.
   */
  primaryStore: RootStore
  /** @deprecated Use `renderer` instead. The instance of the renderer (typed as WebGLRenderer for backwards compat) */
  gl: ForRegisteredRenderer<WebGPURenderer, THREE.WebGLRenderer, THREE.WebGLRenderer>
  /**
   * The renderer instance. Both renderers unless the app registered one
   * (`declare module '@react-three/fiber' { interface Register { renderer: 'webgpu' } }`), or the
   * entry decides it (`/webgpu`, `/legacy`).
   */
  renderer: R3FRenderer
  /** Inspector of the webGPU Renderer. Init in the canvas */
  inspector: any // Inspector type from three/webgpu

  /** Default camera */
  camera: ThreeCamera
  /** Camera frustum for visibility checks - auto-updated each frame when autoUpdateFrustum is true */
  frustum: THREE.Frustum
  /** Whether to automatically update the frustum each frame (default: true) */
  autoUpdateFrustum: boolean
  /** Default scene (may be overridden in portals to point to the portal container) */
  scene: THREE.Scene
  /** The actual root THREE.Scene - always points to the true scene, even inside portals */
  rootScene: THREE.Scene
  /** Default raycaster */
  raycaster: THREE.Raycaster
  /** Event layer interface, contains the event handler and the node they're connected to */
  events: EventManager<any>
  /** XR interface */
  xr: XRManager
  /** Currently used controls */
  controls: THREE.EventDispatcher | null
  /** Normalized event coordinates */
  pointer: THREE.Vector2
  /** @deprecated Normalized event coordinates, use "pointer" instead! */
  mouse: THREE.Vector2
  /** Color space assigned to 8-bit input textures (color maps). Most textures are authored in sRGB. */
  textureColorSpace: THREE.ColorSpace
  /** Render loop flags */
  frameloop: Frameloop
  performance: Performance
  /** Reactive pixel-size of the canvas */
  size: Size
  /** Reactive size of the viewport in threejs units */
  viewport: Viewport & {
    getCurrentViewport: (
      camera?: ThreeCamera,
      target?: THREE.Vector3 | Parameters<THREE.Vector3['set']>,
      size?: Size,
    ) => Omit<Viewport, 'dpr' | 'initialDpr'>
  }
  /** Flags the canvas for render, but doesn't render in itself */
  invalidate: (frames?: number, stackFrames?: boolean) => void
  /** Advance (render) one step */
  advance: (timestamp: number, runGlobalEffects?: boolean) => void
  /** Shortcut to setting the event layer */
  setEvents: (events: Partial<EventManager<any>>) => void
  /** Shortcut to manual sizing. No args resets to props/container. Single arg creates square. */
  setSize: (width?: number, height?: number, top?: number, left?: number) => void
  /** Shortcut to manual setting the pixel ratio */
  setDpr: (dpr: Dpr) => void
  /** Shortcut to setting frameloop flags. No args resets to 'always'. */
  setFrameloop: (frameloop?: Frameloop) => void
  /** Set error state to propagate to error boundary */
  setError: (error: Error | null) => void
  /** Current error state (null when no error) */
  error: Error | null
  /** Global Texture registry (key → Texture, usually keyed by URL) - use useTextures() hook for access + lifecycle */
  textures: Map<string, THREE.Texture>
  /** Internal: refcount per texture key, driven by mounted useTexture consumers (registry enrollment is on by default) */
  _textureRefs: Map<string, number>
  /** Internal: whether setSize() has taken ownership of canvas dimensions */
  _sizeImperative: boolean
  /** Internal: stored size props from Canvas for reset functionality */
  _sizeProps: { width?: number; height?: number } | null
  /** When the canvas was clicked but nothing was hit */
  onPointerMissed?: (event: MouseEvent) => void
  /** When a dragover event has missed any target */
  onDragOverMissed?: (event: DragEvent) => void
  /** When a drop event has missed any target */
  onDropMissed?: (event: DragEvent) => void
  /** If this state model is layered (via createPortal) then this contains the previous layer */
  previousRoot?: RootStore
  /** Internals */
  internal: InternalState
  // flags for triggers
  // if we are using the webGl renderer, this will be true
  isLegacy: ForRegisteredRenderer<false, true, boolean>
  // regardless of renderer, if the system supports webGpu, this will be true
  webGPUSupported: boolean
  //if we are on native
  isNative: boolean
}

type RootStore = UseBoundStoreWithEqualityFn<StoreApi<RootState>>

//* Reconciler Types ==============================

// FiberRoot is an opaque internal React type - we define it locally
// to avoid bundling @types/react-reconciler which causes absolute path issues
type FiberRoot = any

/** A promise tagged with its state, the protocol React's `use` reads */
type TrackedPromise<T> = Promise<T> &
  ({ status: 'pending' } | { status: 'fulfilled'; value: T } | { status: 'rejected'; reason: unknown })

interface Root {
  fiber: FiberRoot
  store: RootStore
  state:
    | { status: 'open' }
    | { status: 'closing'; token: symbol; settled: Promise<void>; settle: () => void }
    | { status: 'disposed' }
  configuration: {
    previous?: RenderProps<HTMLCanvasElement | OffscreenCanvas>
    apply: (props: RenderProps<HTMLCanvasElement | OffscreenCanvas>) => void
  }
  /** Settles once all accepted configuration has been applied */
  ready: TrackedPromise<unknown>
}

type AttachFnType<O = any> = (parent: any, self: O) => () => void
type AttachType<O = any> = string | AttachFnType<O>

type ConstructorRepresentation<T = any> = new (...args: any[]) => T

interface Catalogue {
  [name: string]: ConstructorRepresentation
}

// TODO: handle constructor overloads
// https://github.com/pmndrs/react-three-fiber/pull/2931
// https://github.com/microsoft/TypeScript/issues/37079
type Args<T> = T extends ConstructorRepresentation
  ? T extends typeof Color$1
    ? [r: number, g: number, b: number] | [color: ColorRepresentation]
    : ConstructorParameters<T>
  : any[]

type ArgsProp<P> = P extends ConstructorRepresentation
  ? IsAllOptional<ConstructorParameters<P>> extends true
    ? { args?: Args<P> }
    : { args: Args<P> }
  : { args: unknown[] }

type InstanceProps<T = any, P = any> = ArgsProp<P> & {
  object?: T
  dispose?: null
  attach?: AttachType<T>
}

interface Instance<O = any> {
  root: RootStore
  type: string
  parent: Instance | null
  children: Instance[]
  props: InstanceProps<O> & Record<string, unknown>
  object: O & { __r3f?: Instance<O> }
  eventCount: number
  handlers: Partial<EventHandlers>
  attach?: AttachType<O>
  previousAttach?: any
  previousVisible: boolean | undefined
  isHidden: boolean
  /** Set of props that have been applied via once() */
  appliedOnce?: Set<string>
}

interface HostConfig {
  type: string
  props: Instance['props']
  container: RootStore
  instance: Instance
  textInstance: void
  suspenseInstance: Instance
  hydratableInstance: never
  formInstance: never
  publicInstance: Instance['object']
  hostContext: {}
  childSet: never
  timeoutHandle: number | undefined
  noTimeout: -1
  TransitionStatus: null
}
declare global {
  var IS_REACT_ACT_ENVIRONMENT: boolean | undefined
}

//* Base Renderer Types =====================================

// Shim for OffscreenCanvas since it was removed from DOM types
interface OffscreenCanvas$1 extends EventTarget {}

interface BaseRendererProps {
  canvas: HTMLCanvasElement | OffscreenCanvas$1
  powerPreference?: 'high-performance' | 'low-power' | 'default'
  antialias?: boolean
  alpha?: boolean
}

type RendererFactory<TRenderer, TParams> =
  | TRenderer
  | ((defaultProps: TParams) => TRenderer)
  | ((defaultProps: TParams) => Promise<TRenderer>)

interface Renderer {
  render: (scene: THREE.Scene, camera: THREE.Camera) => any
}

//* Color Management Config ==============================

/**
 * Color management configuration shared by both WebGL and WebGPU renderers.
 */
interface ColorManagementConfig {
  /**
   * Color space assigned to 8-bit input textures (color maps).
   * Defaults to sRGB. Most textures are authored in sRGB.
   * @default THREE.SRGBColorSpace
   */
  textureColorSpace?: THREE.ColorSpace
}

//* Renderer Settings ==============================

/**
 * Shadow map setting: `true` uses `THREE.PCFShadowMap`, a string picks a type, an object is assigned
 * to `renderer.shadowMap`.
 *
 * `'soft'` is a deprecated alias of `'percentage'`: both map to `THREE.PCFShadowMap`, because three.js
 * deprecated `PCFSoftShadowMap` and made `PCFShadowMap` soft. Using `'soft'` logs a deprecation notice.
 * @see https://threejs.org/docs/#api/en/renderers/WebGLRenderer.shadowMap
 */
type ShadowsConfig = boolean | 'basic' | 'percentage' | 'soft' | 'variance' | Partial<THREE.WebGLShadowMap>

/**
 * Renderer-wide settings R3F reads from the `renderer` / `gl` props bag. They are not renderer
 * properties: R3F applies them itself, and only on the canvas that owns its renderer.
 */
interface RendererSettingsConfig extends ColorManagementConfig {
  /**
   * Enables shadows. Only on a renderer R3F builds from a props bag: a renderer instance or factory
   * keeps the `shadowMap` you give it.
   * @example <Canvas renderer={{ shadows: 'variance' }} />
   */
  shadows?: ShadowsConfig
}

//* WebGL Renderer Props ==============================

type DefaultGLProps = Omit<THREE.WebGLRendererParameters, 'canvas'> & {
  canvas: HTMLCanvasElement | OffscreenCanvas$1
}

type GLProps =
  | Renderer
  | ((defaultProps: DefaultGLProps) => Renderer)
  | ((defaultProps: DefaultGLProps) => Promise<Renderer>)
  | (Partial<Properties<THREE.WebGLRenderer> | THREE.WebGLRendererParameters> & RendererSettingsConfig)

//* WebGPU Renderer Props ==============================

type DefaultRendererProps = {
  canvas: HTMLCanvasElement | OffscreenCanvas$1
  [key: string]: any
}

/**
 * Canvas-level scheduler configuration.
 * Controls render timing relative to other canvases.
 */
interface CanvasSchedulerConfig {
  /**
   * Run this Canvas root before the referenced Canvas root id(s).
   */
  before?: string | string[]
  /**
   * Run this Canvas root after the referenced Canvas root id(s).
   */
  after?: string | string[]
  /**
   * Numeric root order. Lower values run first.
   */
  order?: number
  /**
   * Limit this Canvas's default render job (frames per second).
   */
  fps?: number
}

/**
 * The config keys the `renderer` props bag accepts besides the renderer's own parameters and
 * properties. Multi-canvas and scheduling are Canvas props (`primary`, `share`, `scheduler`).
 */
type RendererConfigExtended = RendererSettingsConfig

/**
 * The `renderer` prop: opt into three's WebGPU renderer.
 * - `true` (the `<Canvas renderer>` shorthand) or `{}`: a default `WebGPURenderer`
 * - a props bag: constructor parameters (`antialias`, `forceWebGL`, ...) and renderer properties
 *   (`toneMapping`, ...), plus `shadows` and `textureColorSpace`
 * - a renderer instance, or a sync/async factory receiving the default props. Structural, like
 *   the `gl` prop: anything with `render()`, so a wrapped or mocked renderer is accepted.
 *
 * Everything here configures a renderer this canvas owns. A canvas sharing a primary's renderer
 * ignores a props bag (with a dev warning): renderer-wide settings come from the `<Canvas primary>`.
 */
type RendererProps =
  | boolean
  | Renderer
  | ((defaultProps: DefaultRendererProps) => Renderer)
  | ((defaultProps: DefaultRendererProps) => Promise<Renderer>)
  | (Partial<Properties<WebGPURenderer> & WebGPURendererParameters> & RendererConfigExtended)

//* Camera Props ==============================

type CameraProps = (
  | THREE.Camera
  | Partial<
      ThreeElement<typeof THREE.Camera> &
        ThreeElement<typeof THREE.PerspectiveCamera> &
        ThreeElement<typeof THREE.OrthographicCamera>
    >
) & {
  /** Flags the camera as manual, putting projection into your own hands */
  manual?: boolean
}

//* Render Props ==============================

interface RenderProps<TCanvas extends HTMLCanvasElement | OffscreenCanvas$1> {
  /**
   * Canvas id. Sets the HTML `id` attribute on the canvas element and the canvas's scheduler root
   * id (so `scheduler={{ after: 'main' }}` can order against it). On a `<Canvas primary>` it is the
   * name other canvases pass to `share="id"`.
   * @example <Canvas id="main-viewer">...</Canvas>
   */
  id?: string
  /**
   * Make this canvas the owner of a WebGPU renderer that other canvases share. Every other WebGPU
   * canvas mounted with or after it borrows its renderer (drawing into its own element through a
   * `CanvasTarget`) unless it passes `share={false}` or its own renderer instance/factory.
   * Renderer-wide settings (`renderer={{ shadows, toneMapping, ... }}`) belong on the primary.
   *
   * WebGPU only: on the root entry `primary` selects WebGPU like the `renderer` prop does. Several
   * primaries need distinct `id`s, and the other canvases then pick one with `share="id"`.
   * Read when the renderer is created; changing it later needs a remount.
   * @example <Canvas primary renderer={{ shadows: true }}>...</Canvas>
   */
  primary?: boolean
  /**
   * Renderer sharing for a non-primary canvas (WebGPU only).
   * - omitted: share the primary's renderer when exactly one `<Canvas primary>` is mounted, else
   *   own a renderer as usual
   * - `"id"`: share the renderer of `<Canvas id="id" primary>`, waiting for it to mount
   * - `false`: always own a renderer, even while a primary exists
   *
   * Read when the renderer is created; changing it later needs a remount.
   * @example <Canvas share="main">...</Canvas>
   */
  share?: string | false
  /**
   * Canvas-level scheduler options: this canvas's order relative to other canvases, and an fps cap
   * for its default render. A canvas sharing a primary's renderer runs after the primary unless
   * `before`/`after` are given here.
   * @example <Canvas scheduler={{ after: 'main', fps: 30 }}>...</Canvas>
   */
  scheduler?: CanvasSchedulerConfig
  /** A threejs renderer instance or props that go into the default renderer */
  gl?: GLProps
  /** A WebGPU renderer instance or props that go into the default renderer */
  renderer?: RendererProps
  /** Dimensions to fit the renderer to. Will measure canvas dimensions if omitted */
  size?: Size
  /** Creates an orthographic camera */
  orthographic?: boolean
  /**
   * R3F's render mode. Set to `demand` to only render on state change or `never` to take control.
   * @see https://docs.pmnd.rs/react-three-fiber/advanced/scaling-performance#on-demand-rendering
   */
  frameloop?: Frameloop
  /**
   * R3F performance options for adaptive performance.
   * @see https://docs.pmnd.rs/react-three-fiber/advanced/scaling-performance#movement-regression
   */
  performance?: Partial<Omit<Performance, 'regress'>>
  /** Target pixel ratio. Can clamp between a range: `[min, max]` */
  dpr?: Dpr
  /**
   * Props that go into the default raycaster. `params` is merged into the raycaster's defaults,
   * so a single threshold can be set: `raycaster={{ params: { Points: { threshold: 0.2 } } }}`.
   */
  raycaster?: Partial<Omit<THREE.Raycaster, 'params'>> & { params?: Partial<THREE.RaycasterParameters> }
  /** A `THREE.Scene` instance or props that go into the default scene */
  scene?: THREE.Scene | Partial<THREE.Scene>
  /** A `THREE.Camera` instance or props that go into the default camera */
  camera?: CameraProps
  /** An R3F event manager to manage elements' pointer events */
  events?: (store: RootStore) => EventManager<Element>
  /** Callback after the canvas has rendered (but not yet committed) */
  onCreated?: (state: RootState) => void
  /** Response for pointer clicks that have missed any target */
  onPointerMissed?: (event: MouseEvent) => void
  /** Response for dragover events that have missed any target */
  onDragOverMissed?: (event: DragEvent) => void
  /** Response for drop events that have missed any target */
  onDropMissed?: (event: DragEvent) => void
  /** Whether to automatically update the frustum each frame (default: true) */
  autoUpdateFrustum?: boolean
  /**
   * Enable WebGPU occlusion queries for onOccluded/onVisible events.
   * Auto-enabled when any object uses onOccluded or onVisible handlers.
   * Only works with WebGPU renderer - WebGL will log a warning.
   */
  occlusion?: boolean
  /** Internal: stored size props from Canvas for reset functionality */
  _sizeProps?: { width?: number; height?: number } | null
  /**
   * Internal: the token a Canvas announced `primary` with before this root existed, so configure
   * continues that announcement instead of starting a second one.
   * @internal
   */
  _primaryToken?: object
  /** Force canvas dimensions to even numbers (fixes Safari rendering issues with odd/fractional sizes) */
  forceEven?: boolean
}

//* Reconciler Root ==============================

interface ReconcilerRoot<TCanvas extends HTMLCanvasElement | OffscreenCanvas$1> {
  ready: TrackedPromise<unknown>
  configure: (config?: RenderProps<TCanvas>) => TrackedPromise<ReconcilerRoot<TCanvas>>
  render: (element: ReactNode) => RootStore
  unmount: () => void
}

//* Inject State ==============================

type InjectState = Partial<
  Omit<RootState, 'events'> & {
    events?: {
      enabled?: boolean
      priority?: number
      compute?: ComputeFunction
      connected?: any
    }
    /**
     * When true (default), injects a THREE.Scene between container and children if container isn't already a Scene.
     * This ensures state.scene is always a real THREE.Scene with proper properties (background, environment, fog).
     * Set to false to use the container directly as scene (anti-pattern, but supported for edge cases).
     */
    injectScene?: boolean
  }
>

type MutableOrReadonlyParameters<T extends (...args: any) => any> = Parameters<T> | Readonly<Parameters<T>>

interface MathRepresentation {
  set(...args: number[]): any
}
interface VectorRepresentation extends MathRepresentation {
  setScalar(value: number): any
}
type MathTypes = MathRepresentation | THREE.Euler | THREE.Color

type MathType<T extends MathTypes> = T extends THREE.Color
  ? Args<typeof THREE.Color> | THREE.ColorRepresentation
  : T extends VectorRepresentation | THREE.Layers | THREE.Euler
    ? T | MutableOrReadonlyParameters<T['set']> | number
    : T | MutableOrReadonlyParameters<T['set']>

type MathProps<P> = {
  [K in keyof P as P[K] extends MathTypes ? K : never]: P[K] extends MathTypes ? MathType<P[K]> : never
}

type Vector2 = MathType<THREE.Vector2>
type Vector3 = MathType<THREE.Vector3>
type Vector4 = MathType<THREE.Vector4>
type Color = MathType<THREE.Color>
type Layers = MathType<THREE.Layers>
type Quaternion = MathType<THREE.Quaternion>
type Euler = MathType<THREE.Euler>
type Matrix3 = MathType<THREE.Matrix3>
type Matrix4 = MathType<THREE.Matrix4>

interface RaycastableRepresentation {
  raycast(raycaster: THREE.Raycaster, intersects: THREE.Intersection[]): void
}
type EventProps<P> = P extends RaycastableRepresentation ? Partial<EventHandlers> : {}

/**
 * Props for geometry transform methods that can be called with `once()`.
 * These methods modify the geometry in-place and only make sense to call once on mount.
 *
 * @example
 * import { once } from '@react-three/fiber'
 *
 * <boxGeometry args={[1, 1, 1]} rotateX={once(Math.PI / 2)} />
 * <planeGeometry args={[10, 10]} translate={once(0, 0, 5)} />
 * <bufferGeometry applyMatrix4={once(matrix)} center={once()} />
 */
interface GeometryTransformProps {
  /** Rotate the geometry about the X axis (radians). Use with once(). */
  rotateX?: number
  /** Rotate the geometry about the Y axis (radians). Use with once(). */
  rotateY?: number
  /** Rotate the geometry about the Z axis (radians). Use with once(). */
  rotateZ?: number
  /** Translate the geometry (x, y, z). Use with once(). */
  translate?: [x: number, y: number, z: number]
  /** Scale the geometry (x, y, z). Use with once(). */
  scale?: [x: number, y: number, z: number]
  /** Center the geometry based on bounding box. Use with once(). */
  center?: true
  /** Apply a Matrix4 transformation. Use with once(). */
  applyMatrix4?: THREE.Matrix4
  /** Apply a Quaternion rotation. Use with once(). */
  applyQuaternion?: THREE.Quaternion
}

type GeometryProps<P> = P extends THREE.BufferGeometry ? GeometryTransformProps : {}

/**
 * Workaround for @types/three TSL node type issues.
 * The Node base class has properties that subclasses (OperatorNode, ConstNode, etc.) don't inherit.
 * This transforms `Node | null` properties to accept any object with node-like shape.
 */
type TSLNodeInput = { nodeType?: string | null; uuid?: string } | null

/**
 * For node material properties (colorNode, positionNode, etc.), accept broader types
 * since @types/three has broken inheritance for TSL node subclasses. NodeClass requires
 * `nodeType`, so this structural key test remains neutral to the selected Three entry.
 */
type NodeProps<P> = {
  [K in keyof P as NonNullable<P[K]> extends { nodeType: string | null } ? K : never]?: TSLNodeInput
}

interface ReactProps<P> {
  children?: React.ReactNode
  ref?: React.Ref<P>
  key?: React.Key
}

type ElementProps<T extends ConstructorRepresentation, P = InstanceType<T>> = Partial<
  Overwrite<P, MathProps<P> & ReactProps<P> & EventProps<P> & GeometryProps<P> & NodeProps<P>>
>

type ThreeElement<T extends ConstructorRepresentation> = Mutable<
  Overwrite<ElementProps<T>, Omit<InstanceProps<InstanceType<T>, T>, 'object'>>
>

/**
 * Every constructor export of a three namespace as an uncapitalized JSX element. Non-constructor
 * exports (constants, functions, nested namespaces) are dropped from the keys rather than mapped
 * to `never`: a single `never`-valued key in `JSX.IntrinsicElements` collapses the props of any
 * tag typed `React.ElementType` (#3898).
 */
type ThreeToJSXElements<T extends Record<string, any>> = {
  [K in keyof T & string as T[K] extends ConstructorRepresentation ? Uncapitalize<K> : never]: ThreeElement<T[K]>
}

/** Method names of Object3D, excluded from the `primitive` element's typed props. */
type Object3DMethod = NonNullable<
  {
    [K in keyof THREE.Object3D]-?: THREE.Object3D[K] extends (...args: any[]) => any ? K : never
  }[keyof THREE.Object3D]
>

/** Look up a key present in a generic element map. */
type ElementOf<E, K extends string> = E[Extract<keyof E, K>]

/**
 * The JSX element map derived from an entry's Three.js exports. Each entry declares its own
 * `ThreeElements` from this (`src/index.tsx`, `src/legacy.tsx`, `src/webgpu/index.tsx`) and augments
 * react's `IntrinsicElements` with it, so `/legacy` never advertises node materials and `/webgpu`
 * never advertises a `<webGLRenderer>`.
 */
type ThreeElementsOf<T extends Record<string, any>> = Omit<
  ThreeToJSXElements<T>,
  'audio' | 'source' | 'line' | 'path'
> & {
  /**
   * `primitive` wraps a pre-existing object, so its props cannot be derived from one class.
   * Events are typed from `EventHandlers` (`onClick={(e) => ...}` infers `e`), the ref is
   * untyped, and any other prop is accepted and applied to the object by name. Object3D's own
   * methods are left out of the typed surface: they return `this`, so a subclass element's
   * props (`ThreeElements['group']`) could not be spread onto a primitive otherwise.
   */
  primitive: Omit<ThreeElement<typeof THREE.Object3D>, 'args' | 'object' | 'ref' | Object3DMethod> & {
    object: object
    ref?: React.Ref<any>
    [prop: string]: unknown
  }
  // Conflicts with DOM types can be accessed through a three* prefix
  threeAudio: ElementOf<ThreeToJSXElements<T>, 'audio'>
  threeSource: ElementOf<ThreeToJSXElements<T>, 'source'>
  threeLine: ElementOf<ThreeToJSXElements<T>, 'line'>
  threePath: ElementOf<ThreeToJSXElements<T>, 'path'>
}

interface RootExtension {
    /** Unique name. Registering the same name again replaces the entry (HMR-safe); roots it already
     *  set up are not set up a second time, but get the new entry's dispose and hmr. */
    name: string;
    /**
     * Called once per root, after its renderer exists and before `onCreated` and the first frame.
     * `isLegacy` and `primaryStore` are known by then, so an extension can skip WebGL roots or defer
     * to the primary canvas. Return fields to merge into the root's state, or nothing.
     */
    setup?(store: RootStore): Partial<RootState> | void;
    /** Called when a root this extension set up unmounts. */
    dispose?(store: RootStore): void;
    /** Called when `<Canvas>` detects hot module replacement (skipped with `hmr={false}`). */
    hmr?(store: RootStore): void;
}
/**
 * Register an extension. It is set up on every live root immediately, and on every root created
 * afterwards. Returns a function that unregisters it: new roots are no longer set up, while roots
 * it already set up keep its state and still get its dispose when they unmount.
 */
declare function registerRootExtension(extension: RootExtension): () => void;
/**
 * Point a root's default render job at a different render function, or back at
 * `renderer.render(scene, camera)` with `null`.
 *
 * The default job keeps everything else: the Canvas `fps` throttle, error propagation to the error
 * boundary, and backing off when a user `useFrame(..., { phase: 'render' })` job takes over.
 */
declare function setRenderOverride(store: RootStore, render: (() => void) | null): void;

/**
 * Returns the R3F Canvas' Zustand store. Useful for [transient updates](https://github.com/pmndrs/zustand#transient-updates-for-often-occurring-state-changes).
 * @see https://docs.pmnd.rs/react-three-fiber/api/hooks#usestore
 */
declare function useStore(): RootStore;
/**
 * Accesses R3F's internal state, containing renderer, canvas, scene, etc.
 * @see https://docs.pmnd.rs/react-three-fiber/api/hooks#usethree
 */
declare function useThree<T = RootState>(selector?: (state: RootState) => T, equalityFn?: <T>(state: T, newState: T) => boolean): T;

/**
 * React context that carries the current root's {@link RootStore}. Each root provides its store and
 * each portal provides its own scoped one; `useStore`, and every hook built on it, reads it.
 *
 * Stored on `globalThis` under `Symbol.for('@react-three/fiber.context')`, so every copy and entry
 * of fiber shares a single context.
 */
declare const context: React$1.Context<RootStore>;

export { useStore as a$, useThree as b0, registerRootExtension as t, setRenderOverride as u, context as w };
export type { EventHandlers as $, RenderCallback as A, Performance as B, Color as C, Dpr as D, Euler as E, Frameloop as F, GeometryTransformProps as G, RootState as H, InternalState as I, RootStore as J, Intersection as K, Layers as L, MutableOrReadonlyParameters as M, NodeProps as N, Object3DMethod as O, PointerState as P, Quaternion as Q, RaycastableRepresentation as R, Subscription as S, TSLNodeInput as T, Camera as U, VectorRepresentation as V, IntersectionEvent as W, XRManager as X, ThreeEvent as Y, DomEvent as Z, Events as _, MathRepresentation as a, FilterFunction as a0, ComputeFunction as a1, XRPointerConfig as a2, EventManager as a3, PointerCaptureTarget as a4, VisibilityEntry as a5, OffscreenCanvas$1 as a6, BaseRendererProps as a7, RendererFactory as a8, Renderer as a9, Mutable as aA, IsOptional as aB, IsAllOptional as aC, ThreeCamera as aD, Act as aE, Bridge as aF, SetBlock as aG, UnblockProps as aH, ObjectMap as aI, EquConfig as aJ, Disposable as aK, FrameNextState as aL, FrameState as aM, FrameNextCallback as aN, FrameCallback as aO, ThreeNamespace as aP, ThreeCore as aQ, OcclusionSupport as aR, WebGLSupport as aS, WebGPUSupport as aT, RendererSupport as aU, RendererProvider as aV, Register as aW, RegisteredRenderer as aX, ForRegisteredRenderer as aY, R3FRenderTarget as aZ, R3FRendererSupport as a_, ColorManagementConfig as aa, ShadowsConfig as ab, RendererSettingsConfig as ac, DefaultGLProps as ad, GLProps as ae, DefaultRendererProps as af, CanvasSchedulerConfig as ag, RendererConfigExtended as ah, RendererProps as ai, CameraProps as aj, RenderProps as ak, InjectState as al, FiberRoot as am, TrackedPromise as an, Root as ao, AttachFnType as ap, AttachType as aq, Catalogue as ar, Args as as, ArgsProp as at, InstanceProps as au, Instance as av, HostConfig as aw, NonFunctionKeys as ax, Overwrite as ay, Properties as az, MathTypes as b, MathType as c, MathProps as d, Vector2 as e, Vector3 as f, Vector4 as g, Matrix3 as h, Matrix4 as i, EventProps as j, GeometryProps as k, ReactProps as l, ConstructorRepresentation as m, ElementProps as n, ThreeElement as o, ThreeToJSXElements as p, ThreeElementsOf as q, ElementOf as r, ReconcilerRoot as s, RootExtension as v, R3FRenderer as x, Size as y, Viewport as z };
