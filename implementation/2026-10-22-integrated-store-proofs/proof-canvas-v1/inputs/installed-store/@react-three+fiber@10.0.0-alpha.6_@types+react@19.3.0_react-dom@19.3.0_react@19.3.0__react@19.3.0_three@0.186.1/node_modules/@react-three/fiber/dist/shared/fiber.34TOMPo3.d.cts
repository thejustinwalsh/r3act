import * as React$1 from 'react';
import { ReactNode, Component, RefObject, JSX } from 'react';
import { Options } from 'react-use-measure';
import { ak as RenderProps, m as ConstructorRepresentation, aI as ObjectMap, a7 as BaseRendererProps, a8 as RendererFactory, az as Properties, I as InternalState, H as RootState, E as Euler$1, J as RootStore, a3 as EventManager, Z as DomEvent, av as Instance, o as ThreeElement, ar as Catalogue, ao as Root, al as InjectState, aQ as ThreeCore, aF as Bridge, aH as UnblockProps, aK as Disposable, D as Dpr, aD as ThreeCamera, y as Size, aJ as EquConfig } from './fiber.DQTSZ24m.cjs';
import * as THREE from 'three';
import { ColorRepresentation, Euler, Loader, RenderTargetOptions as RenderTargetOptions$1, ColorSpace, Texture as Texture$1, CubeTexture, Scene, Object3D } from 'three';
import { WebGPURenderer } from 'three/webgpu';

//* Loop Types ==============================

type GlobalRenderCallback = (timestamp: number) => void

type GlobalEffectType = 'before' | 'after' | 'tail'

declare const presetsObj: {
    apartment: string;
    city: string;
    dawn: string;
    forest: string;
    lobby: string;
    night: string;
    park: string;
    studio: string;
    sunset: string;
    warehouse: string;
};
type PresetsType = keyof typeof presetsObj;

//* Background Types ==============================

/**
 * Expanded object form for background configuration.
 * Allows separate textures for background (visual backdrop) and environment (PBR lighting).
 */
interface BackgroundConfig {
  /** HDRI preset name: 'apartment', 'city', 'dawn', 'forest', 'lobby', 'night', 'park', 'studio', 'sunset', 'warehouse' */
  preset?: PresetsType
  /** Files for cube texture (6 faces) or a single equirect (.hdr, .exr, .jpg, .png, .webp, .avif, .gif) */
  files?: string | string[]
  /** Separate files for scene.background (visual backdrop) */
  backgroundMap?: string | string[]
  backgroundRotation?: Euler | [number, number, number]
  backgroundBlurriness?: number
  backgroundIntensity?: number
  /** Separate files for scene.environment (PBR lighting/reflections) */
  envMap?: string | string[]
  environmentRotation?: Euler | [number, number, number]
  environmentIntensity?: number
  path?: string
  extensions?: (loader: Loader) => void
}

/**
 * Background prop type for Canvas.
 *
 * String detection priority:
 * 1. Preset - exact match against known presets (apartment, city, dawn, forest, lobby, night, park, studio, sunset, warehouse)
 * 2. URL - starts with /, ./, ../, http://, https://, data:, OR has an image extension (a query or hash may follow)
 * 3. Color - default fallback (CSS color names, hex values, rgb(), etc.)
 *
 * @example Color
 * ```tsx
 * <Canvas background="red" />
 * <Canvas background="#ff0000" />
 * <Canvas background={0xff0000} />
 * ```
 *
 * @example Preset
 * ```tsx
 * <Canvas background="city" />
 * ```
 *
 * @example URL
 * ```tsx
 * <Canvas background="/path/to/env.hdr" />
 * <Canvas background="./sky.jpg" />
 * ```
 *
 * @example Object form
 * ```tsx
 * <Canvas background={{
 *   files: ['px.png', 'nx.png', 'py.png', 'ny.png', 'pz.png', 'nz.png'],
 *   backgroundMap: 'path/to/sky.jpg',
 *   envMap: 'path/to/lighting.hdr',
 *   backgroundBlurriness: 0.5,
 * }} />
 * ```
 */
type BackgroundProp =
  | ColorRepresentation // "red", "#ff0000", 0xff0000
  | string // URL or preset
  | BackgroundConfig // Expanded object form

//* Canvas Types ==============================

interface CanvasProps
  extends Omit<RenderProps<HTMLCanvasElement>, 'size' | '_primaryToken'>, React$1.HTMLAttributes<HTMLDivElement> {
  children?: React$1.ReactNode
  ref?: React$1.Ref<HTMLCanvasElement>
  /** Canvas fallback content, similar to img's alt prop */
  fallback?: React$1.ReactNode
  /**
   * Options to pass to useMeasure.
   * @see https://github.com/pmndrs/react-use-measure#api
   */
  resize?: Options
  /** The target where events are being subscribed to, default: the div that wraps canvas */
  eventSource?: Element | React$1.RefObject<Element | null>
  /** The event prefix that is cast into canvas pointer x/y events, default: "offset" */
  eventPrefix?: 'offset' | 'client' | 'page' | 'layer' | 'screen'
  /** Enable/disable automatic HMR refresh for TSL nodes and uniforms, default: true in dev */
  hmr?: boolean
  /** Canvas resolution width in pixels. If omitted, uses container width. */
  width?: number
  /** Canvas resolution height in pixels. If omitted, uses container height. */
  height?: number
  /** Force canvas dimensions to even numbers (fixes Safari rendering issues with odd/fractional sizes) */
  forceEven?: boolean
  /**
   * Scene background configuration.
   * Accepts colors, URLs, presets, or an expanded object for separate background/environment.
   * @see BackgroundProp for full documentation and examples
   */
  background?: BackgroundProp
}

//* Loader Types ==============================

type InputLike = string | string[] | string[][] | Readonly<string | string[] | string[][]>

// Define a loader-like interface that matches THREE.Loader's load signature
// This works for both generic and non-generic THREE.Loader instances
interface LoaderLike {
  load(
    url: InputLike,
    onLoad?: (result: any) => void,
    onProgress?: (event: ProgressEvent<EventTarget>) => void,
    onError?: (error: unknown) => void,
  ): any
}

type GLTFLike = { scene: THREE.Object3D }

type LoaderInstance<T extends LoaderLike | ConstructorRepresentation<LoaderLike>> =
  T extends ConstructorRepresentation<LoaderLike> ? InstanceType<T> : T

// Infer result type from the load method's callback parameter
type InferLoadResult<T> = T extends {
  load(url: any, onLoad?: (result: infer R) => void, ...args: any[]): any
}
  ? R
  : T extends ConstructorRepresentation<any>
    ? InstanceType<T> extends {
        load(url: any, onLoad?: (result: infer R) => void, ...args: any[]): any
      }
      ? R
      : any
    : any

type LoaderResult<T extends LoaderLike | ConstructorRepresentation<LoaderLike>> =
  InferLoadResult<LoaderInstance<T>> extends infer R ? (R extends GLTFLike ? R & ObjectMap : R) : never

type Extensions<T extends LoaderLike | ConstructorRepresentation<LoaderLike>> = (
  loader: LoaderInstance<T>,
) => void

//* Renderer Props ========================================

type WebGLDefaultProps = Omit<THREE.WebGLRendererParameters, 'canvas'> & BaseRendererProps

type WebGLProps =
  | RendererFactory<THREE.WebGLRenderer, WebGLDefaultProps>
  | Partial<Properties<THREE.WebGLRenderer> | THREE.WebGLRendererParameters>

interface WebGLShadowConfig {
  shadows?: boolean | 'basic' | 'percentage' | 'soft' | 'variance' | Partial<THREE.WebGLShadowMap>
}

//* Legacy-specific Types ========================================

/** Legacy (WebGL) renderer type - re-exported as R3FRenderer from @react-three/fiber/legacy */
type LegacyRenderer = THREE.WebGLRenderer

/** Legacy internal state with narrowed renderer type */
interface LegacyInternalState extends Omit<InternalState, 'actualRenderer'> {
  actualRenderer: THREE.WebGLRenderer
}

/**
 * Legacy-specific RootState with narrowed renderer type.
 * Automatically used when importing from `@react-three/fiber/legacy`.
 *
 * @example
 * ```tsx
 * import { useThree } from '@react-three/fiber/legacy'
 *
 * function MyComponent() {
 *   const { renderer } = useThree()
 *   // renderer is typed as THREE.WebGLRenderer
 *   renderer.shadowMap.enabled = true
 * }
 * ```
 */
interface LegacyRootState extends Omit<RootState, 'renderer' | 'internal'> {
  /** The WebGL renderer instance */
  renderer: THREE.WebGLRenderer
  /** Internals with WebGL renderer */
  internal: LegacyInternalState
}

//* RenderTarget Types ==============================


type RenderTargetOptions = RenderTargetOptions$1

type EnvironmentLoaderProps = {
    files?: string | string[];
    path?: string;
    preset?: PresetsType;
    extensions?: (loader: Loader) => void;
    colorSpace?: ColorSpace;
};
/**
 * Loads environment textures for reflections and lighting.
 * Supports HDR files, presets, and cubemaps.
 *
 * @example Basic usage
 * ```jsx
 * const texture = useEnvironment({ preset: 'sunset' })
 * ```
 */
declare function useEnvironment({ files, path, preset, colorSpace, extensions, }?: Partial<EnvironmentLoaderProps>): Texture$1<unknown, THREE.TextureEventMap> | CubeTexture<unknown>;
declare namespace useEnvironment {
    var preload: (preloadOptions?: EnvironmentLoaderPreloadOptions) => void;
    var clear: (clearOptions?: EnvironmentLoaderClearOptions) => void;
}
/**
 * Options accepted by `useEnvironment.preload`.
 *
 * `colorSpace` is deliberately omitted: preload only warms the loader cache, and colorSpace is
 * applied to the texture by `useEnvironment()` at use time, per consumer. Accepting it here would
 * advertise an option this function silently ignores.
 */
type EnvironmentLoaderPreloadOptions = Omit<EnvironmentLoaderProps, 'colorSpace'>;
type EnvironmentLoaderClearOptions = Pick<EnvironmentLoaderProps, 'files' | 'preset'>;

/**
 * Props for Environment component that sets up global cubemap for PBR materials and backgrounds.
 *
 * @property children - React children to render into custom environment portal
 * @property frames - Number of frames to render the environment. Use 1 for static, Infinity for animated (default: 1)
 * @property near - Near clipping plane for cube camera (default: 0.1)
 * @property far - Far clipping plane for cube camera (default: 1000)
 * @property resolution - Resolution of the cube render target (default: 256)
 * @property background - Whether to set scene.background. Can be true, false, or "only" (which only sets background) (default: false)
 *
 * @property blur - @deprecated Use backgroundBlurriness instead
 * @property backgroundBlurriness - Blur factor between 0 and 1 for background (default: 0, requires three.js 0.146+)
 * @property backgroundIntensity - Intensity factor for background (default: 1, requires three.js 0.163+)
 * @property backgroundRotation - Rotation for background as Euler angles (default: [0,0,0], requires three.js 0.163+)
 * @property environmentIntensity - Intensity factor for environment lighting (default: 1, requires three.js 0.163+)
 * @property environmentRotation - Rotation for environment as Euler angles (default: [0,0,0], requires three.js 0.163+)
 *
 * @property map - Pre-existing texture to use as environment map
 * @property preset - HDRI Haven preset: 'apartment', 'city', 'dawn', 'forest', 'lobby', 'night', 'park', 'studio', 'sunset', 'warehouse'. Not for production use.
 * @property scene - Custom THREE.Scene or ref to apply environment to (default: uses default scene)
 * @property ground - Ground projection settings. Use true for defaults or object with:
 *   - height: Height of camera used to create env map (default: 15)
 *   - radius: Radius of the world (default: 60)
 *   - scale: Scale of backside projected sphere (default: 1000)
 *
 * Additional loader props:
 * @property files - File path(s) for environment. Supports .hdr, .exr, .jpg (Ultra HDR or plain), an LDR .png/.webp/.avif/.gif, or array of 6 cube faces
 * @property path - Base path for file loading
 * @property extensions - Texture extensions override
 */
type EnvironmentProps = {
    children?: React$1.ReactNode;
    frames?: number;
    near?: number;
    far?: number;
    resolution?: number;
    background?: boolean | 'only';
    /** deprecated, use backgroundBlurriness */
    blur?: number;
    backgroundBlurriness?: number;
    backgroundIntensity?: number;
    backgroundRotation?: Euler$1;
    environmentIntensity?: number;
    environmentRotation?: Euler$1;
    map?: Texture$1;
    preset?: PresetsType;
    scene?: Scene | React$1.RefObject<Scene>;
    ground?: boolean | {
        radius?: number;
        height?: number;
        scale?: number;
    };
    /** Solid color for background (alternative to files/preset) */
    color?: ColorRepresentation;
    /** Separate files for background (when different from environment files) */
    backgroundFiles?: string | string[];
} & EnvironmentLoaderProps;
/**
 * Internal component that applies a pre-existing texture as environment map.
 * Sets scene.environment and optionally scene.background.
 *
 * @example
 * ```jsx
 * <CubeCamera>{(texture) => <EnvironmentMap map={texture} />}</CubeCamera>
 * ```
 */
declare function EnvironmentMap({ scene, background, map, ...config }: EnvironmentProps): null;
/**
 * Internal component that loads environment textures from files or presets.
 * Uses HDRLoader for .hdr, EXRLoader for .exr, UltraHDRLoader for .jpg/.jpeg (a JPEG without a gain
 * map loads as a plain image), TextureLoader for an LDR .png/.webp/.avif/.gif, or CubeTextureLoader
 * for arrays of images.
 *
 * @example With preset
 * ```jsx
 * <EnvironmentCube preset="sunset" />
 * ```
 *
 * @example From HDR file
 * ```jsx
 * <EnvironmentCube files="environment.hdr" />
 * ```
 *
 * @example From an Ultra HDR JPEG (smallest footprint)
 * ```jsx
 * <EnvironmentCube files="file.jpg" />
 * ```
 *
 * @example From cube faces
 * ```jsx
 * <EnvironmentCube files={['px.png', 'nx.png', 'py.png', 'ny.png', 'pz.png', 'nz.png']} />
 * ```
 */
declare function EnvironmentCube({ background, scene, blur, backgroundBlurriness, backgroundIntensity, backgroundRotation, environmentIntensity, environmentRotation, ...rest }: EnvironmentProps): null;
/**
 * Internal component that renders custom environment using a portal and cube camera.
 * Renders children into an off-buffer and films with a cube camera to create environment map.
 * Can be static (frames=1) or animated (frames=Infinity).
 *
 * @example Custom environment with sphere
 * ```jsx
 * <EnvironmentPortal background near={1} far={1000} resolution={256}>
 *   <mesh scale={100}>
 *     <sphereGeometry args={[1, 64, 64]} />
 *     <meshBasicMaterial map={texture} side={THREE.BackSide} />
 *   </mesh>
 * </EnvironmentPortal>
 * ```
 *
 * @example Animated environment
 * ```jsx
 * <EnvironmentPortal frames={Infinity} resolution={256}>
 *   <Float>
 *     <mesh />
 *   </Float>
 * </EnvironmentPortal>
 * ```
 *
 * @example Mixed with preset
 * ```jsx
 * <EnvironmentPortal preset="warehouse">
 *   <mesh />
 * </EnvironmentPortal>
 * ```
 */
declare function EnvironmentPortal({ children, near, far, resolution, frames, map, background, blur, backgroundBlurriness, backgroundIntensity, backgroundRotation, environmentIntensity, environmentRotation, scene, files, path, preset, extensions, }: EnvironmentProps): React$1.JSX.Element;
/**
 * Sets up a global environment map for PBR materials and backgrounds.
 * Affects scene.environment and optionally scene.background unless a custom scene is passed.
 *
 * Supports multiple input methods:
 * - **Presets**: Selection of HDRI Haven assets (apartment, city, dawn, forest, lobby, night, park, studio, sunset, warehouse)
 * - **Files**: HDR (.hdr), EXR (.exr), JPEG (.jpg, Ultra HDR when it carries a gain map), LDR image (.png, .webp, .avif, .gif), or cube faces (array of 6 images)
 * - **Texture**: Pre-existing cube texture via `map` prop
 * - **Custom Scene**: Render children into environment using portal and cube camera
 * - **Ground Projection**: Project environment onto ground plane
 *
 * @remarks
 * - Preset property is NOT meant for production and may fail (relies on CDNs)
 * - Ultra HDR JPEG has the smallest file footprint
 * - Use `frames={Infinity}` for animated environments with low resolution for performance
 * - Ground projection places models on the "ground" within the environment map
 * - Supports self-hosting with @pmndrs/assets using dynamic imports
 *
 * @example Basic preset usage
 * ```jsx
 * <Environment preset="sunset" />
 * ```
 *
 * @example From HDR file
 * ```jsx
 * <Environment files="/hdr/environment.hdr" />
 * ```
 *
 * @example From an Ultra HDR JPEG (smallest footprint)
 * ```jsx
 * <Environment files="file.jpg" />
 * ```
 *
 * @example With self-hosted assets
 * ```jsx
 * import { suspend } from 'suspend-react'
 * const city = import('@pmndrs/assets/hdri/city.exr').then(m => m.default)
 *
 * <Environment files={suspend(city)} />
 * ```
 *
 * @example From existing texture
 * ```jsx
 * <CubeCamera>{(texture) => <Environment map={texture} />}</CubeCamera>
 * ```
 *
 * @example Custom environment scene
 * ```jsx
 * <Environment background near={1} far={1000} resolution={256}>
 *   <mesh scale={100}>
 *     <sphereGeometry args={[1, 64, 64]} />
 *     <meshBasicMaterial map={texture} side={THREE.BackSide} />
 *   </mesh>
 * </Environment>
 * ```
 *
 * @example Animated environment
 * ```jsx
 * <Environment frames={Infinity} resolution={256}>
 *   <Float>
 *     <mesh />
 *   </Float>
 * </Environment>
 * ```
 *
 * @example Mixed custom scene with preset
 * ```jsx
 * <Environment background preset="warehouse">
 *   <mesh />
 * </Environment>
 * ```
 *
 * @example With ground projection
 * ```jsx
 * <Environment ground={{ height: 15, radius: 60 }} preset="city" />
 * ```
 *
 * @example As background only
 * ```jsx
 * <Environment background="only" preset="sunset" />
 * ```
 *
 * @example With rotation and intensity
 * ```jsx
 * <Environment
 *   background
 *   backgroundBlurriness={0.5}
 *   backgroundIntensity={0.8}
 *   backgroundRotation={[0, Math.PI / 2, 0]}
 *   environmentIntensity={1.2}
 *   environmentRotation={[0, Math.PI / 4, 0]}
 *   preset="studio"
 * />
 * ```
 */
declare function Environment(props: EnvironmentProps): React$1.JSX.Element;

/**
 * Moves every trace of interactivity from one object to its replacement, for reconstruction.
 *
 * When `args` or a `primitive`'s `object` changes, R3F builds a new three object and keeps the same
 * instance. Removing the old object from the interaction state and registering the new one from
 * scratch makes events *work* again (#3778), but it forgets what was in flight: a pointer resting on
 * the object fires a second `onPointerEnter` without ever having left, and an active pointer capture
 * is dropped mid-drag. Rewriting the references instead keeps the interaction continuous across a
 * swap the user never asked to see (#3744).
 *
 * Captures are re-keyed rather than released, so the DOM-level capture on `captureData.target` is
 * left alone — releasing and re-acquiring it is precisely the glitch being avoided.
 *
 * Visibility handlers are deliberately not transferred: that registry is keyed by `object.uuid`, so
 * the replacement re-registers itself through `applyProps`. The old entry is dropped here so it
 * cannot outlive the object it described.
 */
declare function swapInteractivity(store: RootStore, object: THREE.Object3D, newObject: THREE.Object3D): void;
declare function removeInteractivity(store: RootStore, object: THREE.Object3D): void;
declare function createEvents(store: RootStore): {
    handlePointer: (name: string) => (event: DomEvent) => void;
    flushDeferredPointers: () => void;
    processDeferredPointer: (event: DomEvent, pointerId: number) => void;
};
/** Default R3F event manager for web */
declare function createPointerEvents(store: RootStore): EventManager<Element>;

/**
 * Gets or creates a memoized loader instance from a loader constructor or returns the loader if it's already an instance.
 * This allows external code to access loader methods like abort().
 */
declare function getLoader<L extends LoaderLike | ConstructorRepresentation<LoaderLike>>(Proto: L): L extends ConstructorRepresentation<infer T> ? T : L;
/**
 * Synchronously loads and caches assets with a three loader.
 *
 * Note: this hook's caller must be wrapped with `React.Suspense`
 * @see https://docs.pmnd.rs/react-three-fiber/api/hooks#useloader
 */
declare function useLoader<I extends InputLike, L extends LoaderLike | ConstructorRepresentation<LoaderLike>>(loader: L, input: I, extensions?: Extensions<L>, onProgress?: (event: ProgressEvent<EventTarget>) => void, cacheKey?: InputLike): I extends any[] ? LoaderResult<L>[] : LoaderResult<L>;
declare namespace useLoader {
    var preload: <I extends InputLike, L extends LoaderLike | ConstructorRepresentation<LoaderLike>>(loader: L, input: I, extensions?: Extensions<L>, onProgress?: (event: ProgressEvent<EventTarget>) => void, cacheKey?: InputLike) => void;
    var clear: <I extends InputLike, L extends LoaderLike | ConstructorRepresentation<LoaderLike>>(loader: L, input: I, cacheKey?: InputLike) => void;
    var loader: typeof getLoader;
}

declare const IsObject: (url: unknown) => url is Record<string, string>;
type TextureArray<T> = T extends string[] ? Texture$1[] : never;
type TextureRecord<T> = T extends Record<string, string> ? {
    [key in keyof T]: Texture$1;
} : never;
type SingleTexture<T> = T extends string ? Texture$1 : never;
type MappedTextureType<T extends string[] | string | Record<string, string>> = TextureArray<T> | TextureRecord<T> | SingleTexture<T>;
/** Options for useTexture hook */
type UseTextureOptions<Url extends string[] | string | Record<string, string>> = {
    /** Callback when texture(s) finish loading */
    onLoad?: (texture: MappedTextureType<Url>) => void;
    /**
     * Register the texture(s) in R3F's global texture registry for access via useTextures().
     * When true (the default):
     * - Textures persist until explicitly disposed
     * - On mount, returns existing registered textures if available (preserving modifications like colorSpace)
     *
     * Reads are taken once at mount — a mounted `useTexture` does not re-render when the registry
     * changes. To react to registry swaps, use `useTextures(s => s.get(key))` instead.
     *
     * Pass `false` to opt out of registry enrollment entirely.
     * @default true
     */
    cache?: boolean;
};
/**
 * Load texture(s) using Three's TextureLoader with Suspense support.
 *
 * @param input - URL string, array of URLs, or object mapping keys to URLs
 * @param optionsOrOnLoad - Options object or legacy onLoad callback
 *
 * @example
 * ```tsx
 * // Single texture
 * const diffuse = useTexture('/textures/diffuse.png')
 *
 * // Multiple textures (array)
 * const [diffuse, normal] = useTexture(['/diffuse.png', '/normal.png'])
 *
 * // Named textures (object)
 * const { diffuse, normal } = useTexture({
 *   diffuse: '/diffuse.png',
 *   normal: '/normal.png'
 * })
 *
 * // Textures are registered in the global registry by default — the same texture
 * // object is shared across components and modifications (colorSpace, wrapS, etc.) are preserved
 * const diffuse = useTexture('/diffuse.png')
 * diffuse.colorSpace = THREE.SRGBColorSpace
 *
 * // Another component gets the SAME texture with colorSpace already set
 * const sameDiffuse = useTexture('/diffuse.png')
 *
 * // Opt out of registry enrollment for a one-off texture
 * const scratch = useTexture('/scratch.png', { cache: false })
 *
 * // Access the registry directly
 * const { get } = useTextures()
 * const cached = get('/diffuse.png')
 * ```
 */
declare function useTexture<Url extends string[] | string | Record<string, string>>(input: Url, optionsOrOnLoad?: UseTextureOptions<Url> | ((texture: MappedTextureType<Url>) => void)): MappedTextureType<Url>;
declare namespace useTexture {
    var preload: (url: string | string[]) => void;
    var clear: (input: string | string[]) => void;
}
declare const Texture: ({ children, input, onLoad, cache, }: {
    children?: (texture: ReturnType<typeof useTexture>) => ReactNode;
    input: Parameters<typeof useTexture>[0];
    onLoad?: Parameters<typeof useTexture>[1];
    cache?: boolean;
}) => React$1.JSX.Element;

/** Accepted shapes for a registry read: a single key, a list of keys, or a name→key map. */
type TextureInput = string | string[] | Record<string, string>;
/** Result of a `get()` read, mirroring the input shape. */
type TextureResult<Input extends TextureInput> = Input extends string ? Texture$1 | undefined : Input extends string[] ? (Texture$1 | undefined)[] : {
    [K in keyof Input]: Texture$1 | undefined;
};
/** Options for `dispose()`. */
interface DisposeOptions {
    /** Dispose even if the texture still has active references (default false). */
    force?: boolean;
}
interface UseTexturesReturn {
    /** The live registry Map (key → Texture). Treat as read-only. */
    readonly all: Map<string, Texture$1>;
    /** Read one texture, an array of textures, or a name→texture record (mirrors the input shape). */
    get<Input extends TextureInput>(input: Input): TextureResult<Input>;
    /** Check whether a key exists in the registry. */
    has(key: string): boolean;
    /**
     * Register a texture (or a record of textures) that has no URL — e.g. a render
     * target or procedural texture. URL-loaded textures are registered automatically
     * by `useTexture` (registry enrollment is on by default).
     */
    add(key: string, texture: Texture$1): void;
    add(record: Record<string, Texture$1>): void;
    /**
     * Dispose a texture's GPU resources and remove it from the registry.
     * Refcount-aware: if the key is still in use by a mounted `useTexture` consumer it is
     * skipped (with a warning) unless `{ force: true }` is passed.
     * @returns true if disposed, false if skipped.
     */
    dispose(key: string, options?: DisposeOptions): boolean;
    /** Dispose every texture in the registry and clear it. Use on scene teardown. */
    disposeAll(): void;
}
/**
 * Reactive Texture registry — load once with `useTexture`, reach the textures from anywhere.
 *
 * This is a registry of plain `Texture` objects (not TSL nodes), so the same texture can feed
 * a material map, a heightmap sampler, or anything else. It does **not** load — pair it with
 * `useTexture` for loading (registry enrollment is on by default); `useTextures` is for access and lifecycle.
 *
 * The returned handle is **reactive**: the calling component re-renders when the registry
 * changes. Pass a selector to scope the subscription to a single read.
 *
 * @example
 * ```tsx
 * // Load + register once (anywhere in the tree) — registered by default
 * useTexture({ map: '/diffuse.jpg', normalMap: '/normal.jpg' })
 *
 * // Reach them from another component — record form lands straight into a material
 * const { map, normalMap } = useTextures().get({ map: '/diffuse.jpg', normalMap: '/normal.jpg' })
 * return <meshStandardMaterial map={map} normalMap={normalMap} />
 *
 * // A set of heightmaps at once
 * const [a, b, c] = useTextures().get(['/h0.png', '/h1.png', '/h2.png'])
 *
 * // Register a non-URL texture (render target / procedural)
 * useTextures().add('rt-main', renderTarget.texture)
 *
 * // Deliberate GPU cleanup (refcount-aware; force to override)
 * useTextures().dispose('/diffuse.jpg')
 * useTextures().disposeAll() // scene teardown
 * ```
 *
 * @remarks
 * **Future expansion:** an imperative async loader (e.g. `await useTextures().load('/x.jpg')`) is
 * intentionally not included yet. It would let non-React code (loading screens, dynamic streaming)
 * populate the registry without Suspense, at the cost of putting loading back into this hook. It
 * will be added only if a concrete consumer needs imperative loading; for now, loading lives in
 * `useTexture`.
 */
declare function useTextures(): UseTexturesReturn;
declare function useTextures<T>(selector: (registry: UseTexturesReturn) => T): T;

/**
 * Exposes an object's {@link Instance}.
 * @see https://docs.pmnd.rs/react-three-fiber/api/additional-exports#useInstanceHandle
 *
 * **Note**: this is an escape hatch to react-internal fields. Expect this to change significantly between versions.
 */
declare function useInstanceHandle<T>(ref: React.RefObject<T>): React.RefObject<Instance<T>>;
/**
 * Returns a node graph of an object with named nodes & materials.
 * @see https://docs.pmnd.rs/react-three-fiber/api/hooks#usegraph
 */
declare function useGraph(object: Object3D): ObjectMap;

/**
 * Adds a global render callback which is called each frame BEFORE rendering.
 *
 * @deprecated Use `useFrame(callback, { phase: 'start' })` instead.
 * This function will be removed in a future version.
 *
 * @param callback - Function called each frame with timestamp
 * @returns Unsubscribe function
 *
 * @example
 * // OLD (deprecated)
 * const unsub = addEffect((timestamp) => { ... })
 *
 * // NEW
 * useFrame((state, delta) => { ... }, { phase: 'start' })
 *
 * @see https://docs.pmnd.rs/react-three-fiber/api/additional-exports#addEffect
 */
declare function addEffect(callback: GlobalRenderCallback): () => void;
/**
 * Adds a global after-render callback which is called each frame AFTER rendering.
 *
 * @deprecated Use `useFrame(callback, { phase: 'finish' })` instead.
 * This function will be removed in a future version.
 *
 * @param callback - Function called each frame with timestamp
 * @returns Unsubscribe function
 *
 * @example
 * // OLD (deprecated)
 * const unsub = addAfterEffect((timestamp) => { ... })
 *
 * // NEW
 * useFrame((state, delta) => { ... }, { phase: 'finish' })
 *
 * @see https://docs.pmnd.rs/react-three-fiber/api/additional-exports#addAfterEffect
 */
declare function addAfterEffect(callback: GlobalRenderCallback): () => void;
/**
 * Adds a global callback which is called when rendering stops.
 *
 * @deprecated Use `scheduler.onIdle(callback)` instead.
 * This function will be removed in a future version.
 *
 * @param callback - Function called when rendering stops
 * @returns Unsubscribe function
 *
 * @example
 * // OLD (deprecated)
 * const unsub = addTail((timestamp) => { ... })
 *
 * // NEW
 * const { scheduler } = useFrame()
 * const unsub = scheduler.onIdle((timestamp) => { ... })
 *
 * @see https://docs.pmnd.rs/react-three-fiber/api/additional-exports#addTail
 */
declare function addTail(callback: GlobalRenderCallback): () => void;
/**
 * Invalidates the view, requesting a frame to be rendered.
 * In demand mode, this triggers the scheduler to run frames.
 *
 * With a state argument, only that root's jobs run on the requested frames; other
 * roots on 'demand' stay idle. Without one, every registered root is invalidated.
 *
 * @param state - Optional root state; targets the invalidation at that root
 * @param frames - Number of frames to request (default: 1)
 * @param stackFrames - If false, sets pendingFrames to frames. If true, adds to existing pendingFrames (default: false)
 *
 * @see https://docs.pmnd.rs/react-three-fiber/api/additional-exports#invalidate
 */
declare function invalidate(state?: RootState, frames?: number, stackFrames?: boolean): void;
/**
 * Advances the frameloop and runs render effects.
 * Useful for when manually rendering via `frameloop="never"`.
 *
 * With a state argument, only that root is stepped. Without one, every
 * registered root is stepped for backwards compatibility.
 *
 * @param timestamp - The timestamp to use for this frame
 * @param runGlobalEffects - Ignored (kept for backwards compat, global effects always run)
 * @param state - Optional root state; targets the manual step at that root
 *
 * @see https://docs.pmnd.rs/react-three-fiber/api/additional-exports#advance
 */
declare function advance(timestamp: number, runGlobalEffects?: boolean, state?: RootState): void;

/* eslint-disable @definitelytyped/no-unnecessary-generics */
declare function ReactReconciler<
    Type,
    Props,
    Container,
    Instance,
    TextInstance,
    SuspenseInstance,
    HydratableInstance,
    FormInstance,
    PublicInstance,
    HostContext,
    ChildSet,
    TimeoutHandle,
    NoTimeout,
    TransitionStatus,
>(
    /* eslint-enable @definitelytyped/no-unnecessary-generics */
    config: ReactReconciler.HostConfig<
        Type,
        Props,
        Container,
        Instance,
        TextInstance,
        SuspenseInstance,
        HydratableInstance,
        FormInstance,
        PublicInstance,
        HostContext,
        ChildSet,
        TimeoutHandle,
        NoTimeout,
        TransitionStatus
    >,
): ReactReconciler.Reconciler<Container, Instance, TextInstance, SuspenseInstance, FormInstance, PublicInstance>;

declare namespace ReactReconciler {
    interface HostConfig<
        Type,
        Props,
        Container,
        Instance,
        TextInstance,
        SuspenseInstance,
        HydratableInstance,
        FormInstance,
        PublicInstance,
        HostContext,
        ChildSet,
        TimeoutHandle,
        NoTimeout,
        TransitionStatus,
    > {
        // -------------------
        //        Modes
        // -------------------
        /**
         * The reconciler has two modes: mutation mode and persistent mode. You must specify one of them.
         *
         * If your target platform is similar to the DOM and has methods similar to `appendChild`, `removeChild`, and so on, you'll want to use the **mutation mode**. This is the same mode used by React DOM, React ART, and the classic React Native renderer.
         *
         * ```js
         * const HostConfig = {
         *   // ...
         *   supportsMutation: true,
         *   // ...
         * }
         * ```
         *
         * Depending on the mode, the reconciler will call different methods on your host config.
         *
         * If you're not sure which one you want, you likely need the mutation mode.
         */
        supportsMutation: boolean;

        /**
         * The reconciler has two modes: mutation mode and persistent mode. You must specify one of them.
         *
         * If your target platform has immutable trees, you'll want the **persistent mode** instead. In that mode, existing nodes are never mutated, and instead every change clones the parent tree and then replaces the whole parent tree at the root. This is the node used by the new React Native renderer, codenamed "Fabric".
         *
         * ```js
         * const HostConfig = {
         *   // ...
         *   supportsPersistence: true,
         *   // ...
         * }
         * ```
         *
         * Depending on the mode, the reconciler will call different methods on your host config.
         *
         * If you're not sure which one you want, you likely need the mutation mode.
         */
        supportsPersistence: boolean;

        // -------------------
        //    Core Methods
        // -------------------

        /**
         * This method should return a newly created node. For example, the DOM renderer would call `document.createElement(type)` here and then set the properties from `props`.
         *
         * You can use `rootContainer` to access the root container associated with that tree. For example, in the DOM renderer, this is useful to get the correct `document` reference that the root belongs to.
         *
         * The `hostContext` parameter lets you keep track of some information about your current place in the tree. To learn more about it, see `getChildHostContext` below.
         *
         * The `internalHandle` data structure is meant to be opaque. If you bend the rules and rely on its internal fields, be aware that it may change significantly between versions. You're taking on additional maintenance risk by reading from it, and giving up all guarantees if you write something to it.
         *
         * This method happens **in the render phase**. It can (and usually should) mutate the node it has just created before returning it, but it must not modify any other nodes. It must not register any event handlers on the parent tree. This is because an instance being created doesn't guarantee it would be placed in the tree — it could be left unused and later collected by GC. If you need to do something when an instance is definitely in the tree, look at `commitMount` instead.
         */
        createInstance(
            type: Type,
            props: Props,
            rootContainer: Container,
            hostContext: HostContext,
            internalHandle: OpaqueHandle,
        ): Instance;

        /**
         * Same as `createInstance`, but for text nodes. If your renderer doesn't support text nodes, you can throw here.
         */
        createTextInstance(
            text: string,
            rootContainer: Container,
            hostContext: HostContext,
            internalHandle: OpaqueHandle,
        ): TextInstance;

        /**
         * This method should mutate the `parentInstance` and add the child to its list of children. For example, in the DOM this would translate to a `parentInstance.appendChild(child)` call.
         *
         * This method happens **in the render phase**. It can mutate `parentInstance` and `child`, but it must not modify any other nodes. It's called while the tree is still being built up and not connected to the actual tree on the screen.
         */
        appendInitialChild(parentInstance: Instance, child: Instance | TextInstance): void;

        /**
         * In this method, you can perform some final mutations on the `instance`. Unlike with `createInstance`, by the time `finalizeInitialChildren` is called, all the initial children have already been added to the `instance`, but the instance itself has not yet been connected to the tree on the screen.
         *
         * This method happens **in the render phase**. It can mutate `instance`, but it must not modify any other nodes. It's called while the tree is still being built up and not connected to the actual tree on the screen.
         *
         * There is a second purpose to this method. It lets you specify whether there is some work that needs to happen when the node is connected to the tree on the screen. If you return `true`, the instance will receive a `commitMount` call later. See its documentation below.
         *
         * If you don't want to do anything here, you should return `false`.
         */
        finalizeInitialChildren(
            instance: Instance,
            type: Type,
            props: Props,
            rootContainer: Container,
            hostContext: HostContext,
        ): boolean;

        /**
         * Some target platforms support setting an instance's text content without manually creating a text node. For example, in the DOM, you can set `node.textContent` instead of creating a text node and appending it.
         *
         * If you return `true` from this method, React will assume that this node's children are text, and will not create nodes for them. It will instead rely on you to have filled that text during `createInstance`. This is a performance optimization. For example, the DOM renderer returns `true` only if `type` is a known text-only parent (like `'textarea'`) or if `props.children` has a `'string'` type. If you return `true`, you will need to implement `resetTextContent` too.
         *
         * If you don't want to do anything here, you should return `false`.
         *
         * This method happens **in the render phase**. Do not mutate the tree from it.
         */
        shouldSetTextContent(type: Type, props: Props): boolean;

        /**
         * This method lets you return the initial host context from the root of the tree. See `getChildHostContext` for the explanation of host context.
         *
         * If you don't intend to use host context, you can return `null`.
         *
         * This method happens **in the render phase**. Do not mutate the tree from it.
         */
        getRootHostContext(rootContainer: Container): HostContext | null;

        /**
         * Host context lets you track some information about where you are in the tree so that it's available inside `createInstance` as the `hostContext` parameter. For example, the DOM renderer uses it to track whether it's inside an HTML or an SVG tree, because `createInstance` implementation needs to be different for them.
         *
         * If the node of this `type` does not influence the context you want to pass down, you can return `parentHostContext`. Alternatively, you can return any custom object representing the information you want to pass down.
         *
         * If you don't want to do anything here, return `parentHostContext`.
         *
         * This method happens **in the render phase**. Do not mutate the tree from it.
         */
        getChildHostContext(parentHostContext: HostContext, type: Type, rootContainer: Container): HostContext;

        /**
         * Determines what object gets exposed as a ref. You'll likely want to return the `instance` itself. But in some cases it might make sense to only expose some part of it.
         *
         * If you don't want to do anything here, return `instance`.
         */
        getPublicInstance(instance: Instance | TextInstance): PublicInstance;

        /**
         * This method lets you store some information before React starts making changes to the tree on the screen. For example, the DOM renderer stores the current text selection so that it can later restore it. This method is mirrored by `resetAfterCommit`.
         *
         * Even if you don't want to do anything here, you need to return `null` from it.
         */
        prepareForCommit(containerInfo: Container): Record<string, any> | null;

        /**
         * This method is called right after React has performed the tree mutations. You can use it to restore something you've stored in `prepareForCommit` — for example, text selection.
         *
         * You can leave it empty.
         */
        resetAfterCommit(containerInfo: Container): void;

        /**
         * This method is called for a container that's used as a portal target. Usually you can leave it empty.
         */
        preparePortalMount(containerInfo: Container): void;

        /**
         * You can proxy this to `setTimeout` or its equivalent in your environment.
         */
        scheduleTimeout(fn: (...args: unknown[]) => unknown, delay?: number): TimeoutHandle;

        /**
         * You can proxy this to `clearTimeout` or its equivalent in your environment.
         */
        cancelTimeout(id: TimeoutHandle): void;

        /**
         * This is a property (not a function) that should be set to something that can never be a valid timeout ID. For example, you can set it to `-1`.
         */
        noTimeout: NoTimeout;

        /**
         * Set this to true to indicate that your renderer supports `scheduleMicrotask`. We use microtasks as part of our discrete event implementation in React DOM. If you're not sure if your renderer should support this, you probably should. The option to not implement `scheduleMicrotask` exists so that platforms with more control over user events, like React Native, can choose to use a different mechanism.
         */
        supportsMicrotasks?: boolean;

        /**
         * Optional. You can proxy this to `queueMicrotask` or its equivalent in your environment.
         */
        scheduleMicrotask?(fn: () => unknown): void;

        /**
         * This is a property (not a function) that should be set to `true` if your renderer is the main one on the page. For example, if you're writing a renderer for the Terminal, it makes sense to set it to `true`, but if your renderer is used *on top of* React DOM or some other existing renderer, set it to `false`.
         */
        isPrimaryRenderer: boolean;

        /**
         * Whether the renderer shouldn't trigger missing `act()` warnings
         */
        warnsIfNotActing?: boolean;

        getInstanceFromNode(node: any): Fiber | null | undefined;

        beforeActiveInstanceBlur(): void;

        afterActiveInstanceBlur(): void;

        prepareScopeUpdate(scopeInstance: any, instance: any): void;

        getInstanceFromScope(scopeInstance: any): null | Instance;

        detachDeletedInstance(node: Instance): void;

        // -------------------
        //  Mutation Methods
        //    (optional)
        //  If you're using React in mutation mode (you probably do), you'll need to implement a few more methods.
        // -------------------

        /**
         * This method should mutate the `parentInstance` and add the child to its list of children. For example, in the DOM this would translate to a `parentInstance.appendChild(child)` call.
         *
         * Although this method currently runs in the commit phase, you still should not mutate any other nodes in it. If you need to do some additional work when a node is definitely connected to the visible tree, look at `commitMount`.
         */
        appendChild?(parentInstance: Instance, child: Instance | TextInstance): void;

        /**
         * Same as `appendChild`, but for when a node is attached to the root container. This is useful if attaching to the root has a slightly different implementation, or if the root container nodes are of a different type than the rest of the tree.
         */
        appendChildToContainer?(container: Container, child: Instance | TextInstance): void;

        /**
         * This method should mutate the `parentInstance` and place the `child` before `beforeChild` in the list of its children. For example, in the DOM this would translate to a `parentInstance.insertBefore(child, beforeChild)` call.
         *
         * Note that React uses this method both for insertions and for reordering nodes. Similar to DOM, it is expected that you can call `insertBefore` to reposition an existing child. Do not mutate any other parts of the tree from it.
         */
        insertBefore?(
            parentInstance: Instance,
            child: Instance | TextInstance,
            beforeChild: Instance | TextInstance | SuspenseInstance,
        ): void;

        /**
         * Same as `insertBefore`, but for when a node is attached to the root container. This is useful if attaching to the root has a slightly different implementation, or if the root container nodes are of a different type than the rest of the tree.
         */
        insertInContainerBefore?(
            container: Container,
            child: Instance | TextInstance,
            beforeChild: Instance | TextInstance | SuspenseInstance,
        ): void;

        /**
         * This method should mutate the `parentInstance` to remove the `child` from the list of its children.
         *
         * React will only call it for the top-level node that is being removed. It is expected that garbage collection would take care of the whole subtree. You are not expected to traverse the child tree in it.
         */
        removeChild?(parentInstance: Instance, child: Instance | TextInstance | SuspenseInstance): void;

        /**
         * Same as `removeChild`, but for when a node is detached from the root container. This is useful if attaching to the root has a slightly different implementation, or if the root container nodes are of a different type than the rest of the tree.
         */
        removeChildFromContainer?(container: Container, child: Instance | TextInstance | SuspenseInstance): void;

        /**
         * If you returned `true` from `shouldSetTextContent` for the previous props, but returned `false` from `shouldSetTextContent` for the next props, React will call this method so that you can clear the text content you were managing manually. For example, in the DOM you could set `node.textContent = ''`.
         *
         * If you never return `true` from `shouldSetTextContent`, you can leave it empty.
         */
        resetTextContent?(instance: Instance): void;

        /**
         * This method should mutate the `textInstance` and update its text content to `nextText`.
         *
         * Here, `textInstance` is a node created by `createTextInstance`.
         */
        commitTextUpdate?(textInstance: TextInstance, oldText: string, newText: string): void;

        /**
         * This method is only called if you returned `true` from `finalizeInitialChildren` for this instance.
         *
         * It lets you do some additional work after the node is actually attached to the tree on the screen for the first time. For example, the DOM renderer uses it to trigger focus on nodes with the `autoFocus` attribute.
         *
         * Note that `commitMount` does not mirror `removeChild` one to one because `removeChild` is only called for the top-level removed node. This is why ideally `commitMount` should not mutate any nodes other than the `instance` itself. For example, if it registers some events on some node above, it will be your responsibility to traverse the tree in `removeChild` and clean them up, which is not ideal.
         *
         * The `internalHandle` data structure is meant to be opaque. If you bend the rules and rely on its internal fields, be aware that it may change significantly between versions. You're taking on additional maintenance risk by reading from it, and giving up all guarantees if you write something to it.
         *
         * If you never return `true` from `finalizeInitialChildren`, you can leave it empty.
         */
        commitMount?(instance: Instance, type: Type, props: Props, internalInstanceHandle: OpaqueHandle): void;

        /**
         * This method should mutate the instance to match nextProps.
         *
         * The internalHandle data structure is meant to be opaque. If you bend the rules and rely on its internal fields, be aware that it may change significantly between versions. You're taking on additional maintenance risk by reading from it, and giving up all guarantees if you write something to it.
         */
        commitUpdate?(
            instance: Instance,
            type: Type,
            prevProps: Props,
            nextProps: Props,
            internalHandle: OpaqueHandle,
        ): void;

        /**
         * This method should make the `instance` invisible without removing it from the tree. For example, it can apply visual styling to hide it. It is used by Suspense to hide the tree while the fallback is visible.
         */
        hideInstance?(instance: Instance): void;

        /**
         * Same as `hideInstance`, but for nodes created by `createTextInstance`.
         */
        hideTextInstance?(textInstance: TextInstance): void;

        /**
         * This method should make the `instance` visible, undoing what `hideInstance` did.
         */
        unhideInstance?(instance: Instance, props: Props): void;

        /**
         * Same as `unhideInstance`, but for nodes created by `createTextInstance`.
         */
        unhideTextInstance?(textInstance: TextInstance, text: string): void;

        /**
         * This method should mutate the `container` root node and remove all children from it.
         */
        clearContainer?(container: Container): void;

        // -------------------
        // Persistence Methods
        //    (optional)
        //  If you use the persistent mode instead of the mutation mode, you would still need the "Core Methods". However, instead of the Mutation Methods above you will implement a different set of methods that performs cloning nodes and replacing them at the root level. You can find a list of them in the "Persistence" section [listed in this file](https://github.com/facebook/react/blob/master/packages/react-reconciler/src/forks/ReactFiberConfig.custom.js). File an issue if you need help.
        // -------------------
        cloneInstance?(
            instance: Instance,
            type: Type,
            oldProps: Props,
            newProps: Props,
            keepChildren: boolean,
            recyclableInstance: null | Instance,
        ): Instance;
        createContainerChildSet?(container: Container): ChildSet;
        appendChildToContainerChildSet?(childSet: ChildSet, child: Instance | TextInstance): void;
        finalizeContainerChildren?(container: Container, newChildren: ChildSet): void;
        replaceContainerChildren?(container: Container, newChildren: ChildSet): void;
        cloneHiddenInstance?(
            instance: Instance,
            type: Type,
            props: Props,
            internalInstanceHandle: OpaqueHandle,
        ): Instance;
        cloneHiddenTextInstance?(instance: Instance, text: Type, internalInstanceHandle: OpaqueHandle): TextInstance;

        // -------------------
        // Hydration Methods
        //    (optional)
        // You can optionally implement hydration to "attach" to the existing tree during the initial render instead of creating it from scratch. For example, the DOM renderer uses this to attach to an HTML markup.
        //
        // To support hydration, you need to declare `supportsHydration: true` and then implement the methods in the "Hydration" section [listed in this file](https://github.com/facebook/react/blob/master/packages/react-reconciler/src/forks/ReactFiberConfig.custom.js). File an issue if you need help.
        // -------------------
        supportsHydration: boolean;

        canHydrateInstance?(instance: HydratableInstance, type: Type, props: Props): null | Instance;

        canHydrateTextInstance?(instance: HydratableInstance, text: string): null | TextInstance;

        canHydrateSuspenseInstance?(instance: HydratableInstance): null | SuspenseInstance;

        isSuspenseInstancePending?(instance: SuspenseInstance): boolean;

        isSuspenseInstanceFallback?(instance: SuspenseInstance): boolean;

        registerSuspenseInstanceRetry?(instance: SuspenseInstance, callback: () => void): void;

        getNextHydratableSibling?(instance: HydratableInstance): null | HydratableInstance;

        getFirstHydratableChild?(parentInstance: Container | Instance): null | HydratableInstance;

        hydrateInstance?(
            instance: Instance,
            type: Type,
            props: Props,
            rootContainerInstance: Container,
            hostContext: HostContext,
            internalInstanceHandle: any,
        ): null | any[];

        hydrateTextInstance?(textInstance: TextInstance, text: string, internalInstanceHandle: any): boolean;

        hydrateSuspenseInstance?(suspenseInstance: SuspenseInstance, internalInstanceHandle: any): void;

        getNextHydratableInstanceAfterSuspenseInstance?(suspenseInstance: SuspenseInstance): null | HydratableInstance;

        // Returns the SuspenseInstance if this node is a direct child of a
        // SuspenseInstance. I.e. if its previous sibling is a Comment with
        // SUSPENSE_x_START_DATA. Otherwise, null.
        getParentSuspenseInstance?(targetInstance: any): null | SuspenseInstance;

        commitHydratedContainer?(container: Container): void;

        commitHydratedSuspenseInstance?(suspenseInstance: SuspenseInstance): void;

        didNotMatchHydratedContainerTextInstance?(
            parentContainer: Container,
            textInstance: TextInstance,
            text: string,
        ): void;

        didNotMatchHydratedTextInstance?(
            parentType: Type,
            parentProps: Props,
            parentInstance: Instance,
            textInstance: TextInstance,
            text: string,
        ): void;

        didNotHydrateContainerInstance?(parentContainer: Container, instance: HydratableInstance): void;

        didNotHydrateInstance?(
            parentType: Type,
            parentProps: Props,
            parentInstance: Instance,
            instance: HydratableInstance,
        ): void;

        didNotFindHydratableContainerInstance?(parentContainer: Container, type: Type, props: Props): void;

        didNotFindHydratableContainerTextInstance?(parentContainer: Container, text: string): void;

        didNotFindHydratableContainerSuspenseInstance?(parentContainer: Container): void;

        didNotFindHydratableInstance?(
            parentType: Type,
            parentProps: Props,
            parentInstance: Instance,
            type: Type,
            props: Props,
        ): void;

        didNotFindHydratableTextInstance?(
            parentType: Type,
            parentProps: Props,
            parentInstance: Instance,
            text: string,
        ): void;

        didNotFindHydratableSuspenseInstance?(parentType: Type, parentProps: Props, parentInstance: Instance): void;

        errorHydratingContainer?(parentContainer: Container): void;

        // Undocumented
        // https://github.com/facebook/react/pull/26722
        NotPendingTransition: TransitionStatus | null;
        HostTransitionContext: ReactContext<TransitionStatus>;

        // https://github.com/facebook/react/pull/28751
        setCurrentUpdatePriority(newPriority: EventPriority): void;
        getCurrentUpdatePriority(): EventPriority;
        resolveUpdatePriority(): EventPriority;

        // https://github.com/facebook/react/pull/28804
        resetFormInstance(form: FormInstance): void;

        // https://github.com/facebook/react/pull/25105
        requestPostPaintCallback(callback: (time: number) => void): void;

        // https://github.com/facebook/react/pull/26025
        shouldAttemptEagerTransition(): boolean;

        // https://github.com/facebook/react/pull/31528
        trackSchedulerEvent(): void;

        // https://github.com/facebook/react/pull/31008
        resolveEventType(): null | string;
        resolveEventTimeStamp(): number;

        /**
         * This method is called during render to determine if the Host Component type and props require some kind of loading process to complete before committing an update.
         */
        maySuspendCommit(type: Type, props: Props): boolean;

        /**
         * This method may be called during render if the Host Component type and props might suspend a commit. It can be used to initiate any work that might shorten the duration of a suspended commit.
         */
        preloadInstance(type: Type, props: Props): boolean;

        /**
         * This method is called just before the commit phase. Use it to set up any necessary state while any Host Components that might suspend this commit are evaluated to determine if the commit must be suspended.
         */
        startSuspendingCommit(): void;

        /**
         * This method is called after `startSuspendingCommit` for each Host Component that indicated it might suspend a commit.
         */
        suspendInstance(type: Type, props: Props): void;

        /**
         * This method is called after all `suspendInstance` calls are complete.
         *
         * Return `null` if the commit can happen immediately.
         *
         * Return `(initiateCommit: Function) => Function` if the commit must be suspended. The argument to this callback will initiate the commit when called. The return value is a cancellation function that the Reconciler can use to abort the commit.
         */
        waitForCommitToBeReady():
            | ((initiateCommit: (...args: unknown[]) => unknown) => (...args: unknown[]) => unknown)
            | null;
    }

    interface Thenable<T> {
        then(resolve: () => T, reject?: () => T): T;
    }

    type RootTag = 0 | 1 | 2;

    type WorkTag =
        | 0
        | 1
        | 2
        | 3
        | 4
        | 5
        | 6
        | 7
        | 8
        | 9
        | 10
        | 11
        | 12
        | 13
        | 14
        | 15
        | 16
        | 17
        | 18
        | 19
        | 20
        | 21
        | 22
        | 23
        | 24;

    type HookType =
        | "useState"
        | "useReducer"
        | "useContext"
        | "useRef"
        | "useEffect"
        | "useLayoutEffect"
        | "useCallback"
        | "useMemo"
        | "useImperativeHandle"
        | "useDebugValue"
        | "useDeferredValue"
        | "useTransition"
        | "useMutableSource"
        | "useOpaqueIdentifier"
        | "useCacheRefresh";

    interface Source {
        fileName: string;
        lineNumber: number;
    }

    // TODO: Ideally these types would be opaque but that doesn't work well with
    // our reconciler fork infra, since these leak into non-reconciler packages.
    type LanePriority = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15 | 16 | 17;

    type Lanes = number;

    type Lane = number & { __LaneBrand: any };

    type Flags = number;

    type TypeOfMode = number;

    type EventPriority = number;

    interface ReactProvider<T> {
        $$typeof: symbol | number;
        type: ReactProviderType<T>;
        key: null | string;
        ref: null;
        props: {
            value: T;
            children?: ReactNode;
        };
    }

    interface ReactProviderType<T> {
        $$typeof: symbol | number;
        _context: ReactContext<T>;
    }

    interface ReactConsumer<T> {
        $$typeof: symbol | number;
        type: ReactContext<T>;
        key: null | string;
        ref: null;
        props: {
            children: (value: T) => ReactNode;
            unstable_observedBits?: number;
        };
    }

    interface ReactContext<T> {
        $$typeof: symbol | number;
        Consumer: ReactContext<T>;
        Provider: ReactProviderType<T>;
        _currentValue: T;
        _currentValue2: T;
        _threadCount: number;
        // DEV only
        _currentRenderer?: {
            [key: string]: any;
        } | null;
        _currentRenderer2?: {
            [key: string]: any;
        } | null;
        // This value may be added by application code
        // to improve DEV tooling display names
        displayName?: string;
    }

    interface ReactPortal {
        $$typeof: symbol | number;
        key: null | string;
        containerInfo: any;
        children: ReactNode;
        // TODO: figure out the API for cross-renderer implementation.
        implementation: any;
    }

    interface RefObject {
        current: any;
    }

    interface ContextDependency<T> {
        context: ReactContext<T>;
        observedBits: number;
        next: ContextDependency<unknown> | null;
    }

    interface Dependencies {
        lanes: Lanes;
        firstContext: ContextDependency<unknown> | null;
    }

    interface Fiber {
        // These first fields are conceptually members of an Instance. This used to
        // be split into a separate type and intersected with the other Fiber fields,
        // but until Flow fixes its intersection bugs, we've merged them into a
        // single type.

        // An Instance is shared between all versions of a component. We can easily
        // break this out into a separate object to avoid copying so much to the
        // alternate versions of the tree. We put this on a single object for now to
        // minimize the number of objects created during the initial render.

        // Tag identifying the type of fiber.
        tag: WorkTag;

        // Unique identifier of this child.
        key: null | string;

        // The value of element.type which is used to preserve the identity during
        // reconciliation of this child.
        elementType: any;

        // The resolved function/class/ associated with this fiber.
        type: any;

        // The local state associated with this fiber.
        stateNode: any;

        // Conceptual aliases
        // parent : Instance -> return The parent happens to be the same as the
        // return fiber since we've merged the fiber and instance.

        // Remaining fields belong to Fiber

        // The Fiber to return to after finishing processing this one.
        // This is effectively the parent, but there can be multiple parents (two)
        // so this is only the parent of the thing we're currently processing.
        // It is conceptually the same as the return address of a stack frame.
        return: Fiber | null;

        // Singly Linked List Tree Structure.
        child: Fiber | null;
        sibling: Fiber | null;
        index: number;

        // The ref last used to attach this node.
        // I'll avoid adding an owner field for prod and model that as functions.
        ref:
            | null
            | (((handle: unknown) => void) & {
                _stringRef?: string | null;
            })
            | RefObject;

        // Input is the data coming into process this fiber. Arguments. Props.
        pendingProps: any; // This type will be more specific once we overload the tag.
        memoizedProps: any; // The props used to create the output.

        // A queue of state updates and callbacks.
        updateQueue: unknown;

        // The state used to create the output
        memoizedState: any;

        // Dependencies (contexts, events) for this fiber, if it has any
        dependencies: Dependencies | null;

        // Bitfield that describes properties about the fiber and its subtree. E.g.
        // the ConcurrentMode flag indicates whether the subtree should be async-by-
        // default. When a fiber is created, it inherits the mode of its
        // parent. Additional flags can be set at creation time, but after that the
        // value should remain unchanged throughout the fiber's lifetime, particularly
        // before its child fibers are created.
        mode: TypeOfMode;

        // Effect
        flags: Flags;
        subtreeFlags: Flags;
        deletions: Fiber[] | null;

        // Singly linked list fast path to the next fiber with side-effects.
        nextEffect: Fiber | null;

        // The first and last fiber with side-effect within this subtree. This allows
        // us to reuse a slice of the linked list when we reuse the work done within
        // this fiber.
        firstEffect: Fiber | null;
        lastEffect: Fiber | null;

        lanes: Lanes;
        childLanes: Lanes;

        // This is a pooled version of a Fiber. Every fiber that gets updated will
        // eventually have a pair. There are cases when we can clean up pairs to save
        // memory if we need to.
        alternate: Fiber | null;

        // Time spent rendering this Fiber and its descendants for the current update.
        // This tells us how well the tree makes use of sCU for memoization.
        // It is reset to 0 each time we render and only updated when we don't bailout.
        // This field is only set when the enableProfilerTimer flag is enabled.
        actualDuration?: number;

        // If the Fiber is currently active in the "render" phase,
        // This marks the time at which the work began.
        // This field is only set when the enableProfilerTimer flag is enabled.
        actualStartTime?: number;

        // Duration of the most recent render time for this Fiber.
        // This value is not updated when we bailout for memoization purposes.
        // This field is only set when the enableProfilerTimer flag is enabled.
        selfBaseDuration?: number;

        // Sum of base times for all descendants of this Fiber.
        // This value bubbles up during the "complete" phase.
        // This field is only set when the enableProfilerTimer flag is enabled.
        treeBaseDuration?: number;

        // Conceptual aliases
        // workInProgress : Fiber ->  alternate The alternate used for reuse happens
        // to be the same as work in progress.
        // __DEV__ only
        _debugID?: number;
        _debugSource?: Source | null;
        _debugOwner?: Fiber | null;
        _debugIsCurrentlyTiming?: boolean;
        _debugNeedsRemount?: boolean;

        // Used to verify that the order of hooks does not change between renders.
        _debugHookTypes?: HookType[] | null;
    }

    type FiberRoot = any;

    // Concurrent related struct
    type MutableSource = any;

    type OpaqueHandle = any;
    type OpaqueRoot = any;

    // 0 is PROD, 1 is DEV.
    // Might add PROFILE later.
    type BundleType = 0 | 1;

    interface DevToolsConfig<Instance, TextInstance, RendererInspectionConfig> {
        bundleType: BundleType;
        version: string;
        rendererPackageName: string;
        // Note: this actually *does* depend on Fiber internal fields.
        // Used by "inspect clicked DOM element" in React DevTools.
        findFiberByHostInstance?: (instance: Instance | TextInstance) => Fiber | null;
        rendererConfig?: RendererInspectionConfig;
    }

    interface SuspenseHydrationCallbacks<SuspenseInstance> {
        onHydrated?: (suspenseInstance: SuspenseInstance) => void;
        onDeleted?: (suspenseInstance: SuspenseInstance) => void;
    }

    interface TransitionTracingCallbacks {
        onTransitionStart?: (transitionName: string, startTime: number) => void;
        onTransitionProgress?: (
            transitionName: string,
            startTime: number,
            currentTime: number,
            pending: Array<{ name: null | string }>,
        ) => void;
        onTransitionIncomplete?: (
            transitionName: string,
            startTime: number,
            deletions: Array<{
                type: string;
                name?: string;
                newName?: string;
                endTime: number;
            }>,
        ) => void;
        onTransitionComplete?: (transitionName: string, startTime: number, endTime: number) => void;
        onMarkerProgress?: (
            transitionName: string,
            marker: string,
            startTime: number,
            currentTime: number,
            pending: Array<{ name: null | string }>,
        ) => void;
        onMarkerIncomplete?: (
            transitionName: string,
            marker: string,
            startTime: number,
            deletions: Array<{
                type: string;
                name?: string;
                newName?: string;
                endTime: number;
            }>,
        ) => void;
        onMarkerComplete?: (transitionName: string, marker: string, startTime: number, endTime: number) => void;
    }

    interface ComponentSelector {
        $$typeof: symbol | number;
        value: React$AbstractComponent<never, unknown>;
    }

    interface HasPseudoClassSelector {
        $$typeof: symbol | number;
        value: Selector[];
    }

    interface RoleSelector {
        $$typeof: symbol | number;
        value: string;
    }

    interface TextSelector {
        $$typeof: symbol | number;
        value: string;
    }

    interface TestNameSelector {
        $$typeof: symbol | number;
        value: string;
    }

    type Selector = ComponentSelector | HasPseudoClassSelector | RoleSelector | TextSelector | TestNameSelector;

    // TODO can not find React$AbstractComponent def
    type React$AbstractComponent<Config, Instance = any> = any;

    interface BoundingRect {
        x: number;
        y: number;
        width: number;
        height: number;
    }

    type IntersectionObserverOptions = any;

    interface BaseErrorInfo {
        componentStack?: string;
    }

    interface Reconciler<Container, Instance, TextInstance, SuspenseInstance, FormInstance, PublicInstance> {
        createContainer(
            containerInfo: Container,
            tag: RootTag,
            hydrationCallbacks: null | SuspenseHydrationCallbacks<SuspenseInstance>,
            isStrictMode: boolean,
            concurrentUpdatesByDefaultOverride: null | boolean,
            identifierPrefix: string,
            onUncaughtError: (error: Error, info: BaseErrorInfo & { errorBoundary?: Component }) => void,
            onCaughtError: (error: Error, info: BaseErrorInfo) => void,
            onRecoverableError: (error: Error, info: BaseErrorInfo) => void,
            onDefaultTransitionIndicator: () => void,
        ): OpaqueRoot;

        createPortal(
            children: ReactNode,
            containerInfo: any, // TODO: figure out the API for cross-renderer implementation.
            implementation: any,
            key?: string | null,
        ): ReactPortal;

        createComponentSelector(component: React$AbstractComponent<never, unknown>): ComponentSelector;

        createHasPseudoClassSelector(selectors: Selector[]): HasPseudoClassSelector;

        createRoleSelector(role: string): RoleSelector;

        createTextSelector(text: string): TextSelector;

        createTestNameSelector(id: string): TestNameSelector;

        getFindAllNodesFailureDescription(hostRoot: Instance, selectors: Selector[]): string | null;

        findAllNodes(hostRoot: Instance, selectors: Selector[]): Instance[];

        findBoundingRects(hostRoot: Instance, selectors: Selector[]): BoundingRect[];

        focusWithin(hostRoot: Instance, selectors: Selector[]): boolean;

        observeVisibleRects(
            hostRoot: Instance,
            selectors: Selector[],
            callback: (intersections: Array<{ ratio: number; rect: BoundingRect }>) => void,
            options?: IntersectionObserverOptions,
        ): { disconnect: () => void };

        createHydrationContainer(
            initialChildren: ReactNode,
            callback: (() => void) | null | undefined,
            containerInfo: Container,
            tag: RootTag,
            hydrationCallbacks: null | SuspenseHydrationCallbacks<SuspenseInstance>,
            isStrictMode: boolean,
            concurrentUpdatesByDefaultOverride: null | boolean,
            identifierPrefix: string,
            onUncaughtError: (error: Error, info: BaseErrorInfo & { errorBoundary?: Component }) => void,
            onCaughtError: (error: Error, info: BaseErrorInfo) => void,
            onRecoverableError: (error: Error, info: BaseErrorInfo) => void,
            onDefaultTransitionIndicator: () => void,
            transitionCallbacks: null | TransitionTracingCallbacks,
            formState: unknown,
        ): OpaqueRoot;

        updateContainer(
            element: ReactNode,
            container: OpaqueRoot,
            parentComponent?: Component<any, any> | null,
            callback?: (() => void) | null,
        ): Lane;

        updateContainerSync(
            element: ReactNode,
            container: OpaqueRoot,
            parentComponent?: Component<any, any> | null,
            callback?: (() => void) | null,
        ): Lane;

        batchedUpdates<A, R>(fn: (a: A) => R, a: A): R;

        deferredUpdates<A>(fn: () => A): A;

        discreteUpdates<A, B, C, D, R>(fn: (arg0: A, arg1: B, arg2: C, arg3: D) => R, a: A, b: B, c: C, d: D): R;

        flushSync(): void;
        flushSync<R>(fn: () => R): R;

        flushSyncFromReconciler(): void;
        flushSyncFromReconciler<R>(fn: () => R): R;

        flushSyncWork(): boolean;

        isAlreadyRendering(): boolean;

        flushPassiveEffects(): boolean;

        getPublicRootInstance(container: OpaqueRoot): Component<any, any> | PublicInstance | null;

        attemptSynchronousHydration(fiber: Fiber): void;

        attemptContinuousHydration(fiber: Fiber): void;

        attemptHydrationAtCurrentPriority(fiber: Fiber): void;

        findHostInstance(component: any): PublicInstance | null;

        findHostInstanceWithWarning(component: any, methodName: string): PublicInstance | null;

        findHostInstanceWithNoPortals(fiber: Fiber): PublicInstance | null;

        shouldError(fiber: Fiber): boolean | undefined;

        shouldSuspend(fiber: Fiber): boolean;

        injectIntoDevTools(devToolsConfig: DevToolsConfig<Instance, TextInstance, any>): boolean;
    }

    function defaultOnUncaughtError(error: Error): void;
    function defaultOnCaughtError(error: Error): void;
    function defaultOnRecoverableError(error: Error): void;

    function startHostTransition(
        formFiber: Fiber,
        pendingState: unknown,
        action: ((formData: FormData) => void) | null,
        formData: FormData,
    ): void;
}

/**
 * Registers constructors so they can be rendered as JSX elements.
 *
 * - `extend({ OrbitControls })` makes each constructor available under its camelCased key
 *   (`<orbitControls />`). Values that are not constructors are skipped, so a whole module
 *   namespace can be passed.
 * - `extend(MyClass)` registers one constructor and returns a component to render it with.
 *
 * Registrations are global, shared by every copy and entry of fiber, and are checked before the
 * three namespace of a root's renderer when an element name is resolved.
 *
 * @example
 * import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
 * extend({ OrbitControls })
 * // <orbitControls args={[camera, gl.domElement]} />
 *
 * @example
 * const Controls = extend(OrbitControls)
 * // <Controls args={[camera, gl.domElement]} />
 *
 * @see https://docs.pmnd.rs/react-three-fiber/api/objects#using-3rd-party-objects-declaratively
 */
declare function extend<T extends ConstructorRepresentation>(objects: T): React$1.ExoticComponent<ThreeElement<T>>;
/** Registers each constructor in `objects` under its key; see the first overload. */
declare function extend<T extends Catalogue>(objects: T): void;
/** Registers every constructor in a module namespace, skipping other exports; see the first overload. */
declare function extend(objects: Record<string, unknown>): void;

/**
 * R3F's React reconciler: a mutation-mode host config that turns JSX elements into three.js objects.
 * Each root's {@link RootStore} is its container, and children attach to `internal.container`
 * (a portal's target) or else the root's `scene`.
 *
 * - **Element names** resolve through `extend()` registrations first, then the three namespace of
 *   the root's renderer. A `three` prefix (`<threeLine>`) is stripped when no element by the
 *   prefixed name exists. `<primitive object={...}>` wraps an existing object.
 * - **Construction is deferred** until an instance is attached to a mounted parent, so a tree that
 *   Suspense discards never creates three objects.
 * - **Updates** apply only changed props. Changing `args` (or a primitive's `object`) reconstructs
 *   the object instead; the swap happens in `resetAfterCommit`, before layout effects, so refs
 *   already point to the new object.
 * - **Removal** detaches the object and disposes it (at idle priority, or immediately in an `act`
 *   test environment), unless it is a primitive, a `Scene`, or it or an ancestor has `dispose={null}`.
 * - **Priority**: not the primary renderer, so it runs alongside react-dom, and update priority
 *   follows react-dom's event priorities. View-transition commits are flushed synchronously, since
 *   three has nothing to animate between commits.
 *
 * `createRoot`, `createPortal` and `flushSync` drive it; app code rarely needs it directly.
 */
declare const reconciler: ReactReconciler.Reconciler<RootStore, Instance<any>, void, Instance<any>, never, any>;
/**
 * Force React to flush any updates inside the provided callback synchronously and immediately.
 * All the same caveats documented for react-dom's `flushSync` apply here (see https://react.dev/reference/react-dom/flushSync).
 * Nevertheless, sometimes one needs to render synchronously, for example to keep DOM and 3D changes in lock-step without
 * having to revert to a non-React solution. Note: this will only flush updates within the `Canvas` root.
 */
declare function flushSync<R>(fn: () => R): R;

declare const _roots: Map<HTMLCanvasElement | OffscreenCanvas, Root>;
/**
 * Unmount the root on `canvas`. The teardown runs once React has committed the unmount, and waits
 * for a renderer that is still being created. `callback` runs when the root is gone: after the
 * teardown, and when it disposed a renderer R3F created whose `dispose()` is async (WebGPURenderer
 * from three r186), after that dispose has settled.
 */
declare function unmountComponentAtNode<TCanvas extends HTMLCanvasElement | OffscreenCanvas>(canvas: TCanvas, callback?: (canvas: TCanvas) => void): void;

declare function createPortal(children: ReactNode, container: THREE.Object3D | RefObject<THREE.Object3D | null> | RefObject<THREE.Object3D>, state?: InjectState): JSX.Element;
interface PortalProps {
    children: ReactNode;
    state?: InjectState;
    container: Object3D | RefObject<Object3D | null> | RefObject<Object3D>;
}
declare function Portal({ children, container, state }: PortalProps): JSX.Element;

/** Renderer resources: creation, shared canvas lookup, and ownership through final release. */

declare const isRenderer: (def: any) => boolean;
interface PrimaryCanvasEntry {
    /** The WebGPURenderer instance owned by this primary canvas */
    renderer: WebGPURenderer;
    /** The zustand store for this canvas */
    store: RootStore;
    /** The primary's scheduler root id; a sharing canvas renders after it by default */
    rootId?: string;
}
/**
 * Register a primary canvas that can be targeted by secondary canvases.
 *
 * @param id - Registry key: the canvas id, or DEFAULT_PRIMARY
 * @param renderer - The WebGPURenderer owned by this canvas
 * @param store - The zustand store for this canvas
 * @param options - The owner token that announced it and its scheduler root id
 * @returns Cleanup function to unregister on unmount
 */
declare function registerPrimary(id: string, renderer: WebGPURenderer, store: RootStore, options?: {
    token?: object;
    rootId?: string;
}): () => void;
/**
 * Get a registered primary canvas by id.
 *
 * @param id - The id of the primary canvas to look up
 * @returns The primary canvas entry or undefined if not found
 */
declare function getPrimary(id: string): PrimaryCanvasEntry | undefined;
/**
 * Wait for a primary canvas to be registered (`share="id"`).
 * Returns immediately if already registered, otherwise waits, even through a primary remounting.
 *
 * @param id - The id of the primary canvas to wait for
 * @param timeout - Optional timeout in ms (default: 5000)
 * @returns Promise that resolves with the primary canvas entry
 */
declare function waitForPrimary(id: string, timeout?: number): Promise<PrimaryCanvasEntry>;
/**
 * Check if a primary canvas with the given id exists.
 *
 * @param id - The id to check
 * @returns True if a primary canvas with this id is registered
 */
declare function hasPrimary(id: string): boolean;
/**
 * Unregister a primary canvas. Called on unmount.
 *
 * @param id - The id of the primary canvas to unregister
 */
declare function unregisterPrimary(id: string): void;
/**
 * Get all registered primary canvas ids. Useful for debugging.
 */
declare function getPrimaryIds(): string[];

/**
 * Creates the Zustand store that holds one root's {@link RootState}.
 *
 * The store starts unconfigured: the renderer, `camera`, `scene`, `raycaster`, `frustum` and `pointer`
 * are `null` placeholders until the root's renderer support has loaded and `configure()` in
 * `configuration.ts` fills them in. Only core's part of `RootState` is created here; packages building on
 * fiber add their own fields through root extensions.
 *
 * Besides the initial state, the store wires up:
 * - `state.gl` and `state.renderer` as accessors over `internal.actualRenderer`. `gl` reports a
 *   deprecation when user code reads it outside legacy mode.
 * - `rootScene` following `scene` whenever `scene` is set to a real `THREE.Scene`.
 * - On a size or DPR change: updating the camera and resizing the root's own canvas target (or the
 *   renderer when there is none).
 * - On a camera change: adding an unparented camera to `rootScene`, then refreshing the viewport and
 *   (when `autoUpdateFrustum` is set) the frustum.
 * - Calling `invalidate(state)` after every state change.
 *
 * `createRoot` calls this once per canvas.
 *
 * @param invalidate - Requests frames for a root. Bound into `state.invalidate` and called on every store change.
 * @param advance - Steps a root manually. Bound into `state.advance`.
 * @returns The root's store, which is also the reconciler container for that root.
 */
declare const createStore: (invalidate: (state?: RootState, frames?: number, stackFrames?: boolean) => void, advance: (timestamp: number, runGlobalEffects?: boolean, state?: RootState, frame?: XRFrame) => void) => RootStore;

/** Whether any root has loaded a renderer yet. */
declare function hasThree(): boolean;
/**
 * Three's shared core: the classes and constants `three` and `three/webgpu` have in common.
 * Available once the first root's renderer support is loaded (during `configure()`), which is
 * before any element renders, any hook runs, or `onCreated` fires.
 */
declare function getThree(): ThreeCore;
/** Resolves with three's shared core as soon as a root has loaded one. */
declare function whenThree(): Promise<ThreeCore>;

/**
 * An SSR-friendly useLayoutEffect.
 *
 * React currently throws a warning when using useLayoutEffect on the server.
 * To get around it, we can conditionally useEffect on the server (no-op) and
 * useLayoutEffect elsewhere.
 *
 * @see https://github.com/facebook/react/issues/14927
 */
declare const useIsomorphicLayoutEffect: typeof React$1.useLayoutEffect;
/**
 * Creates a stable ref that always contains the latest callback.
 * Useful for avoiding dependency arrays while ensuring the latest closure is called.
 *
 * @param fn - The callback function to wrap
 * @returns A ref containing the current callback
 */
declare function useMutableCallback<T>(fn: T): React$1.RefObject<T>;
/**
 * Bridges renderer Context, StrictMode, and Activity visibility from a primary renderer.
 * Used to maintain React context when rendering into portals or secondary canvases.
 *
 * @returns A Bridge component that wraps children with the parent renderer's context
 */
declare function useBridge(): Bridge;
/**
 * Internal component that blocks rendering until a promise resolves.
 * Used for suspense-like blocking behavior.
 *
 * @param set - Function to set the blocking promise
 */
declare function Block({ set }: Omit<UnblockProps, 'children'>): null;
/**
 * Error boundary component for catching and handling errors in the React tree.
 * Forwards errors to a state setter for external handling.
 *
 * NOTE: static members get down-level transpiled to mutations which break tree-shaking
 */
declare const ErrorBoundary: {
    new (props: {
        set: React$1.Dispatch<Error | undefined>;
        children: React$1.ReactNode;
    }): {
        state: {
            error: boolean;
        };
        componentDidCatch(err: Error): void;
        render(): React$1.ReactNode;
        context: unknown;
        setState<K extends "error">(state: {
            error: boolean;
        } | ((prevState: Readonly<{
            error: boolean;
        }>, props: Readonly<{
            set: React$1.Dispatch<Error | undefined>;
            children: React$1.ReactNode;
        }>) => {
            error: boolean;
        } | Pick<{
            error: boolean;
        }, K> | null) | Pick<{
            error: boolean;
        }, K> | null, callback?: (() => void) | undefined): void;
        forceUpdate(callback?: (() => void) | undefined): void;
        readonly props: Readonly<{
            set: React$1.Dispatch<Error | undefined>;
            children: React$1.ReactNode;
        }>;
        componentDidMount?(): void;
        shouldComponentUpdate?(nextProps: Readonly<{
            set: React$1.Dispatch<Error | undefined>;
            children: React$1.ReactNode;
        }>, nextState: Readonly<{
            error: boolean;
        }>, nextContext: any): boolean;
        componentWillUnmount?(): void;
        getSnapshotBeforeUpdate?(prevProps: Readonly<{
            set: React$1.Dispatch<Error | undefined>;
            children: React$1.ReactNode;
        }>, prevState: Readonly<{
            error: boolean;
        }>): any;
        componentDidUpdate?(prevProps: Readonly<{
            set: React$1.Dispatch<Error | undefined>;
            children: React$1.ReactNode;
        }>, prevState: Readonly<{
            error: boolean;
        }>, snapshot?: any): void;
        componentWillMount?(): void;
        UNSAFE_componentWillMount?(): void;
        componentWillReceiveProps?(nextProps: Readonly<{
            set: React$1.Dispatch<Error | undefined>;
            children: React$1.ReactNode;
        }>, nextContext: any): void;
        UNSAFE_componentWillReceiveProps?(nextProps: Readonly<{
            set: React$1.Dispatch<Error | undefined>;
            children: React$1.ReactNode;
        }>, nextContext: any): void;
        componentWillUpdate?(nextProps: Readonly<{
            set: React$1.Dispatch<Error | undefined>;
            children: React$1.ReactNode;
        }>, nextState: Readonly<{
            error: boolean;
        }>, nextContext: any): void;
        UNSAFE_componentWillUpdate?(nextProps: Readonly<{
            set: React$1.Dispatch<Error | undefined>;
            children: React$1.ReactNode;
        }>, nextState: Readonly<{
            error: boolean;
        }>, nextContext: any): void;
    };
    new (props: {
        set: React$1.Dispatch<Error | undefined>;
        children: React$1.ReactNode;
    }, context: any): {
        state: {
            error: boolean;
        };
        componentDidCatch(err: Error): void;
        render(): React$1.ReactNode;
        context: unknown;
        setState<K extends "error">(state: {
            error: boolean;
        } | ((prevState: Readonly<{
            error: boolean;
        }>, props: Readonly<{
            set: React$1.Dispatch<Error | undefined>;
            children: React$1.ReactNode;
        }>) => {
            error: boolean;
        } | Pick<{
            error: boolean;
        }, K> | null) | Pick<{
            error: boolean;
        }, K> | null, callback?: (() => void) | undefined): void;
        forceUpdate(callback?: (() => void) | undefined): void;
        readonly props: Readonly<{
            set: React$1.Dispatch<Error | undefined>;
            children: React$1.ReactNode;
        }>;
        componentDidMount?(): void;
        shouldComponentUpdate?(nextProps: Readonly<{
            set: React$1.Dispatch<Error | undefined>;
            children: React$1.ReactNode;
        }>, nextState: Readonly<{
            error: boolean;
        }>, nextContext: any): boolean;
        componentWillUnmount?(): void;
        getSnapshotBeforeUpdate?(prevProps: Readonly<{
            set: React$1.Dispatch<Error | undefined>;
            children: React$1.ReactNode;
        }>, prevState: Readonly<{
            error: boolean;
        }>): any;
        componentDidUpdate?(prevProps: Readonly<{
            set: React$1.Dispatch<Error | undefined>;
            children: React$1.ReactNode;
        }>, prevState: Readonly<{
            error: boolean;
        }>, snapshot?: any): void;
        componentWillMount?(): void;
        UNSAFE_componentWillMount?(): void;
        componentWillReceiveProps?(nextProps: Readonly<{
            set: React$1.Dispatch<Error | undefined>;
            children: React$1.ReactNode;
        }>, nextContext: any): void;
        UNSAFE_componentWillReceiveProps?(nextProps: Readonly<{
            set: React$1.Dispatch<Error | undefined>;
            children: React$1.ReactNode;
        }>, nextContext: any): void;
        componentWillUpdate?(nextProps: Readonly<{
            set: React$1.Dispatch<Error | undefined>;
            children: React$1.ReactNode;
        }>, nextState: Readonly<{
            error: boolean;
        }>, nextContext: any): void;
        UNSAFE_componentWillUpdate?(nextProps: Readonly<{
            set: React$1.Dispatch<Error | undefined>;
            children: React$1.ReactNode;
        }>, nextState: Readonly<{
            error: boolean;
        }>, nextContext: any): void;
    };
    getDerivedStateFromError: () => {
        error: boolean;
    };
    contextType?: React$1.Context<any> | undefined;
    propTypes?: any;
};

/**
 * React internal props that should not be passed to Three.js objects.
 */
declare const REACT_INTERNAL_PROPS: string[];
/**
 * Returns the instance's initial (outermost) root.
 * Traverses through previousRoot links to find the original root store.
 *
 * @param instance - R3F instance to find root for
 * @returns The outermost root store
 */
declare function findInitialRoot<T>(instance: Instance<T>): RootStore;
/**
 * Returns instance root state.
 * If the object doesn't have __r3f (e.g., child meshes in primitives/GLTFs),
 * traverses ancestors to find the nearest managed parent.
 *
 * @param obj - Three.js object to get root state for
 * @returns Root state if found, undefined otherwise
 */
declare function getRootState<T extends THREE.Object3D = THREE.Object3D>(obj: T): RootState | undefined;
/**
 * Collects nodes, materials, and meshes from a Three.js Object3D hierarchy.
 * Handles duplicate material names by appending UUID prefixes.
 *
 * @param object - Root object to traverse
 * @returns ObjectMap containing named nodes, materials, and meshes
 *
 * @example
 * const { nodes, materials, meshes } = buildGraph(gltf.scene)
 * // Access by name: nodes.Head, materials.Metal, meshes.Body
 */
declare function buildGraph(object: THREE.Object3D): ObjectMap;
/**
 * Disposes an object and all its disposable properties.
 * Skips Scene objects as they should not be disposed automatically.
 *
 * @param obj - Object to dispose
 */
declare function dispose<T extends Disposable>(obj: T): void;
/**
 * Extracts instance props from React reconciler fiber props.
 * Filters out React-internal props (children, key, ref).
 *
 * @param queue - Pending props from reconciler fiber
 * @returns Props object without React-internal keys
 */
declare function getInstanceProps<T = any>(pendingProps: Record<string, unknown>): Instance<T>['props'];
/**
 * Creates or retrieves an R3F instance descriptor for a Three.js object.
 * Each object in the scene carries a LocalState descriptor (__r3f).
 *
 * @param target - Target object to prepare
 * @param root - Root store for this instance
 * @param type - String identifier for the object type
 * @param props - Initial props for the instance
 * @returns Instance descriptor
 */
declare function prepare<T = any>(target: T, root: RootStore, type: string, props: Instance<T>['props']): Instance<T>;
/**
 * Triggers an update for an instance.
 * Invalidates the frame if the root is in demand mode.
 *
 * @param instance - Instance to invalidate
 */
declare function invalidateInstance(instance: Instance): void;

/**
 * Reserved prop names that should not be applied to Three.js objects.
 */
declare const RESERVED_PROPS: string[];
/**
 * Resolves a potentially pierced property key (e.g., 'material-color' → material.color).
 * First tries the entire key as a single property, then attempts piercing.
 *
 * @param root - Root object to resolve from
 * @param key - Property key (may contain dashes for piercing)
 * @returns Object containing root, key, and target value
 *
 * @example
 * resolve(mesh, 'material-color')
 * // => { root: mesh.material, key: 'color', target: mesh.material.color }
 */
declare function resolve(root: any, key: string): {
    root: any;
    key: string;
    target: any;
};
/**
 * Attaches a child instance to a parent instance.
 * Handles both string-based attachment (e.g., 'geometry', 'material-map')
 * and function-based attachment for custom logic.
 *
 * @param parent - Parent instance
 * @param child - Child instance to attach
 *
 * @example
 * // String attachment
 * <bufferGeometry attach="geometry" />
 * // Array attachment
 * <light attach="lights-0" />
 * // Function attachment
 * <thing attach={(parent, self) => { parent.customProp = self }} />
 */
declare function attach(parent: Instance, child: Instance): void;
/**
 * Detaches a child instance from a parent instance.
 * Restores the previous value or deletes the property if it was never set.
 *
 * @param parent - Parent instance
 * @param child - Child instance to detach
 */
declare function detach(parent: Instance, child: Instance): void;
/**
 * Compares old and new props to determine which properties have changed.
 * Also handles resetting removed props for HMR/fast-refresh.
 *
 * @param instance - Instance to diff props for
 * @param newProps - New props to compare against
 * @returns Object containing only changed props
 *
 * @example
 * const changes = diffProps(instance, { position: [1, 2, 3], color: 'red' })
 * // => { position: [1, 2, 3] } (only if position changed)
 */
declare function diffProps<T = any>(instance: Instance<T>, newProps: Instance<T>['props']): Instance<T>['props'];
/**
 * Applies a set of props to a Three.js object.
 * Handles special cases like colors, vectors, textures, events, and pierced props.
 *
 * @param object - Three.js object to apply props to
 * @param props - Props to apply
 * @returns The object with props applied
 *
 * @example
 * applyProps(mesh, { position: [0, 1, 0], 'material-color': 'red' })
 */
declare function applyProps<T = any>(object: Instance<T>['object'], props: Instance<T>['props']): Instance<T>['object'];

/**
 * Calculates the device pixel ratio for rendering.
 * Handles array DPR ranges [min, max] to clamp devicePixelRatio.
 *
 * @param dpr - Target DPR value or [min, max] range
 * @returns Calculated DPR value
 *
 * @example
 * calculateDpr(2) // => 2
 * calculateDpr([1, 2]) // => clamps window.devicePixelRatio between 1 and 2
 */
declare function calculateDpr(dpr: Dpr): number;
/**
 * Extracts the first segment of a UUID string (before the first hyphen).
 * Used for creating unique material names when duplicates exist.
 *
 * @param uuid - UUID string to extract prefix from
 * @returns First segment of the UUID
 *
 * @example
 * getUuidPrefix('a1b2c3d4-e5f6-g7h8-i9j0') // => 'a1b2c3d4'
 */
declare function getUuidPrefix(uuid: string): string;
/**
 * Updates camera projection based on viewport size.
 * Adjusts aspect ratio for perspective cameras or bounds for orthographic cameras.
 * Respects camera.manual flag - manual cameras are not modified.
 *
 * @param camera - Camera to update
 * @param size - Current viewport size
 */
declare function updateCamera(camera: ThreeCamera, size: Size): void;
/**
 * Updates a frustum from a camera's projection and world matrices.
 * If no target frustum is provided, creates and returns a new one.
 *
 * @param camera - Camera to extract frustum from
 * @param frustum - Optional existing frustum to update (creates new if not provided)
 * @returns The updated or newly created frustum
 *
 * @example
 * // Create new frustum
 * const frustum = updateFrustum(camera)
 *
 * // Update existing frustum (no allocation)
 * updateFrustum(camera, existingFrustum)
 *
 * // Use for visibility checks
 * if (frustum.containsPoint(point)) { ... }
 * if (frustum.intersectsObject(mesh)) { ... }
 */
declare function updateFrustum(camera: ThreeCamera, frustum?: THREE.Frustum): THREE.Frustum;

declare const is: {
    obj: (a: any) => boolean;
    fun: (a: any) => a is Function;
    str: (a: any) => a is string;
    num: (a: any) => a is number;
    boo: (a: any) => a is boolean;
    und: (a: any) => boolean;
    nul: (a: any) => boolean;
    arr: (a: any) => a is any[];
    equ(a: any, b: any, { arrays, objects, strict }?: EquConfig): boolean;
};
declare const isOrthographicCamera: (def: ThreeCamera) => def is THREE.OrthographicCamera;
declare const isRef: (obj: unknown) => obj is React.RefObject<unknown>;
declare const isColorRepresentation: (value: unknown) => value is THREE.ColorRepresentation;
declare const isObject3D: (object: any) => object is THREE.Object3D;
declare const isTexture: (value: unknown) => value is THREE.Texture;
declare const isLayers: (value: unknown) => value is THREE.Layers;
declare const isUniform: (value: unknown) => value is THREE.Uniform;
type VectorLike = {
    set: (...args: any[]) => void;
    constructor?: Function;
};
declare const isVectorLike: (object: unknown) => object is VectorLike;
type Copyable = {
    copy: (...args: any[]) => void;
    constructor?: Function;
};
declare const isCopyable: (object: unknown) => object is Copyable;
declare const hasConstructor: (object: unknown) => object is {
    constructor?: Function;
};

/**
 * Symbol marker for deferred ref resolution.
 * Used to identify values that should be resolved from refs after mount.
 */
declare const FROM_REF: unique symbol;
/** The marker `fromRef()` returns; resolved by the reconciler in `commitMount`. */
interface FromRefMarker<T = unknown, R = T> {
    [FROM_REF]: React$1.RefObject<T | null>;
    /** Optional transform applied to the resolved ref before assignment. */
    transform?: (value: T) => R;
}
/**
 * Defers prop application until the referenced object is available.
 * Useful for props like `target` that need sibling refs to be populated.
 *
 * Only top-level props on a three element are resolved: a marker nested inside another value
 * (an array, an options object) is never seen. When the prop needs the sibling *wrapped* rather
 * than assigned as-is, pass a `transform`; it runs once the ref is populated and its result is
 * what gets assigned.
 *
 * @param ref - React ref object to resolve at mount time
 * @param transform - Optional mapping from the resolved object to the value the prop expects
 * @returns A marker value that the reconciler resolves after mount
 *
 * @example
 * const targetRef = useRef<THREE.Object3D>(null)
 *
 * <group ref={targetRef} position={[-3, -2, -15]} />
 * <spotLight target={fromRef(targetRef)} intensity={100} />
 *
 * @example
 * // Wrap the sibling: a node material's lightsNode needs a LightsNode, not the light itself
 * <meshPhongNodeMaterial lightsNode={fromRef(lightRef, (light) => lights([light]))} />
 */
declare function fromRef<T>(ref: React$1.RefObject<T | null>): T;
declare function fromRef<T, R>(ref: React$1.RefObject<T | null>, transform: (value: T) => R): R;
/**
 * Type guard to check if a value is a fromRef marker.
 *
 * @param value - Value to check
 * @returns True if value is a fromRef marker
 */
declare function isFromRef(value: unknown): value is FromRefMarker<any, unknown>;

/**
 * Symbol marker for mount-only method calls.
 * Used to identify methods that should only be called once on initial mount.
 */
declare const ONCE: unique symbol;
/**
 * Marks a method call to be executed only on initial mount.
 * Useful for geometry transforms that should not be reapplied on every render.
 *
 * When `args` prop changes (triggering reconstruction), the method will be
 * called again on the new instance since appliedOnce is not carried over.
 *
 * @param args - Arguments to pass to the method
 * @returns A marker value that applyProps will execute once
 *
 * @example
 * // Rotate geometry on mount
 * <boxGeometry args={[1, 1, 1]} rotateX={once(Math.PI / 2)} />
 *
 * // Multiple arguments
 * <bufferGeometry applyMatrix4={once(matrix)} />
 *
 * // No arguments
 * <geometry center={once()} />
 */
declare function once<A extends unknown[]>(...args: A): OnceValue<A>;
/**
 * What `once(...args)` is typed as, so the marker is assignable to the prop it targets:
 * the single argument itself (`rotateX={once(angle)}`), the argument tuple for multi-argument
 * methods (`translate={once(x, y, z)}`), or `true` for a bare call (`center={once()}`).
 *
 * The runtime value is always the marker object; only the declared type follows the prop.
 */
type OnceValue<A extends unknown[]> = A extends [] ? true : A extends [infer Single] ? Single : A;
/**
 * Type guard to check if a value is a once marker.
 *
 * @param value - Value to check
 * @returns True if value is a once marker
 */
declare function isOnce(value: unknown): value is {
    [ONCE]: any[] | true;
};

export { Texture as $, EnvironmentMap as F, EnvironmentCube as H, EnvironmentPortal as J, Environment as K, presetsObj as M, swapInteractivity as O, removeInteractivity as Q, createEvents as S, useInstanceHandle as T, useGraph as U, useLoader as V, IsObject as X, useTexture as _, addEffect as a, useTextures as a4, useEnvironment as a6, extend as a7, reconciler as a8, flushSync as a9, applyProps as aA, is as aB, isOrthographicCamera as aC, isRef as aD, isColorRepresentation as aE, isObject3D as aF, isTexture as aG, isLayers as aH, isUniform as aI, isVectorLike as aJ, isCopyable as aK, hasConstructor as aL, FROM_REF as aM, fromRef as aO, isFromRef as aP, ONCE as aQ, once as aR, isOnce as aT, _roots as aa, unmountComponentAtNode as ab, createPortal as ac, Portal as ad, useIsomorphicLayoutEffect as ae, useMutableCallback as af, useBridge as ag, Block as ah, ErrorBoundary as ai, calculateDpr as aj, getUuidPrefix as ak, updateCamera as al, updateFrustum as am, REACT_INTERNAL_PROPS as an, findInitialRoot as ao, getRootState as ap, buildGraph as aq, dispose as ar, getInstanceProps as as, prepare as at, invalidateInstance as au, RESERVED_PROPS as av, resolve as aw, attach as ax, detach as ay, diffProps as az, addAfterEffect as b, createPointerEvents as c, addTail as d, advance as e, isRenderer as f, getPrimary as g, hasPrimary as h, invalidate as i, getPrimaryIds as j, createStore as k, getThree as l, hasThree as m, whenThree as n, registerPrimary as r, unregisterPrimary as u, waitForPrimary as w };
export type { LegacyInternalState as A, BackgroundConfig as B, LegacyRootState as C, EnvironmentProps as D, Extensions as E, GlobalRenderCallback as G, InputLike as I, LoaderLike as L, PresetsType as N, PrimaryCanvasEntry as P, RenderTargetOptions as R, WebGLDefaultProps as W, MappedTextureType as Y, UseTextureOptions as Z, TextureInput as a0, TextureResult as a1, DisposeOptions as a2, UseTexturesReturn as a3, EnvironmentLoaderProps as a5, FromRefMarker as aN, OnceValue as aS, CanvasProps as aU, GlobalEffectType as o, BackgroundProp as p, GLTFLike as q, LoaderInstance as s, InferLoadResult as t, LoaderResult as v, WebGLProps as x, WebGLShadowConfig as y, LegacyRenderer as z };
