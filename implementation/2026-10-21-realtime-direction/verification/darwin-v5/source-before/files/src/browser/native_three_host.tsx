import * as THREE from "three";
import {
  createDOMRoot,
  createNativeRoot,
  createStore,
  createWorld,
  use,
  useEffect,
  useState,
  type RuntimeNode,
} from "../native_runtime_api.ts";
import {
  createThreeHost,
  type NativeThreePointerEvent,
  raycastThreePointer,
  type ThreeHost,
} from "../three_host.ts";
import type { ThreeHandle, ThreeParent } from "../three_host.ts";
import type { StoreSource } from "../native_runtime_api.ts";

declare global {
  interface ImportMeta {
    hot?: { accept(): void; dispose(callback: () => void): void };
  }
  interface Window {
    __nativeThreeDiagnostics?: {
      snapshot(): Readonly<Record<string, unknown>>;
    };
  }
}

type Shape = {
  readonly id: string;
  readonly title: string;
  readonly kind: "shared" | "owned";
  readonly phaseOffset: number;
  readonly height: number;
};
type StudioState = {
  readonly shapes: readonly Shape[];
  readonly selectedId: string;
  readonly tint: string;
  readonly roughness: number;
  readonly playing: boolean;
  readonly nextId: number;
};

const rootNames = [
  "three-scene",
  "scene-hud",
  "scene-tree",
  "inspector",
] as const;
const world = createWorld();
const studio = createStore<StudioState>({
  shapes: [
    {
      id: "orbit-a",
      title: "Orbit A",
      kind: "shared",
      phaseOffset: 0,
      height: 1.12,
    },
    {
      id: "orbit-b",
      title: "Orbit B",
      kind: "shared",
      phaseOffset: 1.8,
      height: 1.52,
    },
    {
      id: "relay",
      title: "Ceramic relay",
      kind: "owned",
      phaseOffset: 3.7,
      height: 1.06,
    },
  ],
  selectedId: "orbit-a",
  tint: "#c6965e",
  roughness: 0.31,
  playing: true,
  nextId: 4,
});

// This pair is deliberately borrowed by multiple meshes. The Three host must
// detach handles without disposing assets that the application still owns.
const sharedGeometry = new THREE.TorusKnotGeometry(0.63, 0.14, 96, 12, 2, 3);
const sharedMaterial = new THREE.MeshStandardMaterial({
  color: studio.getState().tint,
  roughness: studio.getState().roughness,
  metalness: 0.68,
  envMapIntensity: 0.8,
});
const groundGeometry = new THREE.BoxGeometry(18, 0.12, 18);
const groundMaterial = new THREE.MeshStandardMaterial({
  color: "#202821",
  roughness: 0.84,
  metalness: 0.12,
});

let appDisposed = false;
let borrowedAssetsDisposed = false;
let sceneRenderCount = 0;
let actorRenderCount = 0;
let domRenderCount = 0;
let rendererFrames = 0;
let phasePropWrites = 0;
let allHostPropWrites = 0;
let pointerEvents = 0;
let nearestPointerDistance = Number.POSITIVE_INFINITY;
let frameId = 0;
let lastFrameTime: number | null = null;
let requestedFrameEpoch = 0;
let drawnFrameEpoch = 0;
let deferredFrameCount = 0;
let setFrameEpoch: ((epoch: number) => void) | null = null;
const phaseSetters = new Map<string, (delta: number) => void>();
const frameMarkerName = "accepted-frame";
let resizeObserver: ResizeObserver | null = null;
let pointerListener: ((event: PointerEvent) => void) | null = null;
let pagehideListener: (() => void) | null = null;
let storeUnsubscribe: (() => void) | null = null;
const controlListeners: Array<[Element, string, EventListener]> = [];
let renderer: THREE.WebGLRenderer | null = null;
let camera: THREE.PerspectiveCamera | null = null;
let scene: THREE.Scene | null = null;
let threeHost: ThreeHost | null = null;
let finalHostDiagnostics: Readonly<Record<string, number>> | null = null;
let sceneRoot:
  | ReturnType<typeof createNativeRoot<ThreeHandle, ThreeParent>>
  | null = null;
let hudRoot: ReturnType<typeof createDOMRoot> | null = null;
let inspectorRoot: ReturnType<typeof createDOMRoot> | null = null;
let treeRoot: ReturnType<typeof createDOMRoot> | null = null;

const choose = (id: string) => {
  studio.dispatch((state) =>
    state.selectedId === id ? state : { ...state, selectedId: id }
  );
};

const setTint = (tint: string) => {
  studio.dispatch((state) => state.tint === tint ? state : { ...state, tint });
};

const setRoughness = (roughness: number) => {
  studio.dispatch((state) =>
    state.roughness === roughness ? state : { ...state, roughness }
  );
};

const toggleMotion = () => {
  studio.dispatch((state) => ({ ...state, playing: !state.playing }));
};

const addShape = () => {
  studio.dispatch((state) => {
    if (state.shapes.length >= 6) return state;
    const id = `form-${state.nextId}`;
    const shape: Shape = {
      id,
      title: state.nextId % 2 === 0 ? "Orbit form" : "Owned form",
      kind: state.nextId % 2 === 0 ? "shared" : "owned",
      phaseOffset: state.nextId * 1.13,
      height: state.nextId % 2 === 0 ? 1.28 : 0.95,
    };
    return {
      ...state,
      shapes: [...state.shapes, shape],
      selectedId: id,
      nextId: state.nextId + 1,
    };
  });
};

const reorderShapes = () => {
  studio.dispatch((state) => {
    if (state.shapes.length < 2) return state;
    return { ...state, shapes: [...state.shapes.slice(1), state.shapes[0]] };
  });
};

const resetScene = () => {
  studio.dispatch((state) => ({
    ...state,
    shapes: [
      {
        id: "orbit-a",
        title: "Orbit A",
        kind: "shared",
        phaseOffset: 0,
        height: 1.12,
      },
      {
        id: "orbit-b",
        title: "Orbit B",
        kind: "shared",
        phaseOffset: 1.8,
        height: 1.52,
      },
      {
        id: "relay",
        title: "Ceramic relay",
        kind: "owned",
        phaseOffset: 3.7,
        height: 1.06,
      },
    ],
    selectedId: "orbit-a",
    tint: "#c6965e",
    roughness: 0.31,
    playing: true,
    nextId: 4,
  }));
};

const removeSelected = () => {
  studio.dispatch((state) => {
    if (state.shapes.length <= 1) return state;
    const shapes = state.shapes.filter((shape) =>
      shape.id !== state.selectedId
    );
    return {
      ...state,
      shapes,
      selectedId: shapes[0].id,
    };
  });
};

function KineticForm({
  shape,
  index,
  count,
  tint,
  roughness,
  onSelect,
}: {
  key?: string;
  shape: Shape;
  index: number;
  count: number;
  tint: string;
  roughness: number;
  onSelect: (event: NativeThreePointerEvent) => void;
}) {
  actorRenderCount++;
  const spacing = 1.62;
  const x = (index - (count - 1) / 2) * spacing;
  if (shape.kind === "shared") {
    return (
      <SharedMotion id={shape.id} motionName={`motion:${shape.id}`} x={x} y={shape.height}>
        <mesh
          name={shape.id}
          args={[sharedGeometry, sharedMaterial]}
          rotation-z={shape.phaseOffset * 0.25}
          scale={index === 0 ? [1, 1, 1] : [0.78, 0.78, 0.78]}
          material-color={tint}
          material-roughness={roughness}
          castShadow
          receiveShadow
          onPointerDown={onSelect}
        />
      </SharedMotion>
    );
  }

  return (
    <OwnedMotion id={shape.id} motionName={`motion:${shape.id}`} x={x} y={shape.height}>
      <mesh
        name={shape.id}
        castShadow
        receiveShadow
        onPointerDown={onSelect}
      >
        <icosahedronGeometry args={[0.72, 2]} />
        <meshStandardMaterial
          color={tint}
          roughness={roughness}
          metalness={0.42}
        />
      </mesh>
    </OwnedMotion>
  );
}

type MotionProps = {
  id: string;
  motionName: string;
  x: number;
  y: number;
  children?: RuntimeNode;
};

function SharedMotion(props: MotionProps) {
  const [phase, setPhase] = useState(0);
  useEffect(() => {
    const advance = (delta: number) => {
      setPhase((current) => (current + delta) % (Math.PI * 200));
    };
    phaseSetters.set(props.id, advance);
    return () => {
      if (phaseSetters.get(props.id) === advance) phaseSetters.delete(props.id);
    };
  });
  return (
    <group name={props.motionName} position={[props.x, props.y, 0]}
      rotation-y={phase * 0.42} rotation-x={phase * 0.17}>
      {props.children}
    </group>
  );
}

function OwnedMotion(props: MotionProps) {
  const [phase, setPhase] = useState(0);
  useEffect(() => {
    const advance = (delta: number) => {
      setPhase((current) => (current + delta) % (Math.PI * 200));
    };
    phaseSetters.set(props.id, advance);
    return () => {
      if (phaseSetters.get(props.id) === advance) phaseSetters.delete(props.id);
    };
  });
  return (
    <group name={props.motionName} position={[props.x, props.y, 0]}
      rotation-y={phase * -0.42} rotation-z={phase * 0.15}>
      {props.children}
    </group>
  );
}

function FrameMarker() {
  const [frameEpoch, updateFrameEpoch] = useState(0);
  useEffect(() => {
    setFrameEpoch = updateFrameEpoch;
    return () => {
      if (setFrameEpoch === updateFrameEpoch) setFrameEpoch = null;
    };
  });
  return <group name="accepted-frame" position-x={frameEpoch} />;
}

function SceneRoot({ store }: { store: StoreSource<StudioState> }) {
  sceneRenderCount++;
  const state = use(store);
  const onSelect = (shape: Shape) => (event: NativeThreePointerEvent) => {
    pointerEvents++;
    const distance = event.distance ?? 0;
    if (distance <= nearestPointerDistance) {
      nearestPointerDistance = distance;
      choose(shape.id);
    }
  };

  return (
    <group name="kinetic-study">
      <FrameMarker />
      <ambientLight args={["#d9e6d8", 1.05]} />
      <directionalLight
        args={["#ffddb1", 3.4]}
        position={[4.5, 7, 5]}
        castShadow
      />
      <directionalLight args={["#93c9d8", 1.2]} position={[-5, 3, -4]} />
      <mesh
        name="ground-plane"
        args={[groundGeometry, groundMaterial]}
        position-y={-0.08}
        receiveShadow
      />
      {state.shapes.map((shape, index) => (
        <KineticForm
          key={shape.id}
          shape={shape}
          index={index}
          count={state.shapes.length}
          tint={state.tint}
          roughness={state.roughness}
          onSelect={onSelect(shape)}
        />
      ))}
    </group>
  );
}

function SceneHud({ store }: { store: StoreSource<StudioState> }) {
  domRenderCount++;
  const state = use(store);
  const selected = state.shapes.find((shape) => shape.id === state.selectedId);
  return (
    <div className="selection-hud" aria-live="polite">
      <small>Selected form</small>
      <strong>{selected?.title ?? "No selection"}</strong>
      <span>
        {selected?.kind === "shared" ? "BORROWED ASSET" : "OWNED RESOURCE"}
      </span>
    </div>
  );
}

function SceneTree({ store }: { store: StoreSource<StudioState> }) {
  const state = use(store);
  return (
    <>
      {state.shapes.map((shape, index) => (
        <button
          key={shape.id}
          className="tree-row"
          type="button"
          role="option"
          aria-current={state.selectedId === shape.id}
          aria-selected={state.selectedId === shape.id}
          onClick={() => choose(shape.id)}
        >
          <span className="tree-glyph">
            {shape.kind === "shared" ? "◉" : "◇"}
          </span>
          <span>{shape.title}</span>
          <span className="row-kind">{String(index + 1).padStart(2, "0")}</span>
        </button>
      ))}
    </>
  );
}

const palette = [
  { name: "Bronze", value: "#c6965e" },
  { name: "Glacier", value: "#91c7ca" },
  { name: "Porcelain", value: "#d9ddd0" },
  { name: "Oxide", value: "#af6d58" },
];

function Inspector({ store }: { store: StoreSource<StudioState> }) {
  const state = use(store);
  const selected = state.shapes.find((shape) => shape.id === state.selectedId);
  return (
    <>
      <div className="inspector-head">
        <h1>{selected?.title ?? "Scene"}</h1>
        <span className="selected-tag">{selected?.id ?? "—"}</span>
      </div>
      <div className="control">
        <div className="control-label">
          <span>Material tint</span>
          <output>
            {palette.find((color) => color.value === state.tint)?.name ??
              "Custom"}
          </output>
        </div>
        <div className="swatches" role="group" aria-label="Material tint">
          {palette.map((color) => (
            <button
              key={color.value}
              className="swatch"
              type="button"
              title={color.name}
              aria-label={color.name}
              aria-pressed={state.tint === color.value}
              style={{ backgroundColor: color.value }}
              onClick={() => setTint(color.value)}
            />
          ))}
        </div>
      </div>
      <label className="control">
        <span className="control-label">
          <span>Surface roughness</span>
          <output>{state.roughness.toFixed(2)}</output>
        </span>
        <input
          aria-label="Surface roughness"
          type="range"
          min="0.08"
          max="0.88"
          step="0.01"
          value={state.roughness}
          onInput={(event: Event) =>
            setRoughness(
              Number((event.currentTarget as HTMLInputElement).value),
            )}
        />
      </label>
      <div className="material-card">
        <span className="section-label">Ownership</span>
        <strong>
          {selected?.kind === "shared"
            ? "Borrowed geometry + material"
            : "Owned geometry + material"}
        </strong>
        <p>
          {selected?.kind === "shared"
            ? "Several meshes reference the same application-owned knot and surface. Removing one form leaves those shared assets alive."
            : "Geometry and surface are resource children. Removing this keyed mesh disposes both resources after its subtree detaches."}
        </p>
        <div className="material-meta">
          <span>RETAINED NODE</span>
          <span>{selected?.kind === "shared" ? "SHARED" : "OWNED"}</span>
        </div>
      </div>
      <button
        className="tree-row"
        type="button"
        style={{ marginTop: 14, justifyContent: "center" }}
        onClick={removeSelected}
        disabled={state.shapes.length <= 1}
      >
        Remove selected form
      </button>
    </>
  );
}

const createInstrumentedHost = () => {
  const base = createThreeHost();
  return new Proxy(base, {
    get(target, key) {
      if (key === "setProp") {
        return (
          node: ThreeHandle,
          name: string,
          value: unknown,
          previous: unknown,
        ) => {
          allHostPropWrites++;
          if (
            name === "rotation-y" || name === "rotation-x" ||
            name === "rotation-z"
          ) phasePropWrites++;
          return target.setProp(node, name, value, previous);
        };
      }
      const value = Reflect.get(target, key, target);
      return typeof value === "function" ? value.bind(target) : value;
    },
  });
};

const updateCanvasSize = (element: HTMLElement) => {
  if (!renderer || !camera) return;
  const width = Math.max(1, element.clientWidth);
  const height = Math.max(1, element.clientHeight);
  renderer.setSize(width, height, false);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
};

const dispose = () => {
  if (appDisposed) return;
  appDisposed = true;
  cancelAnimationFrame(frameId);
  frameId = 0;
  phaseSetters.clear();
  setFrameEpoch = null;
  resizeObserver?.disconnect();
  resizeObserver = null;
  if (pointerListener) {
    document.getElementById("scene-canvas")?.removeEventListener(
      "pointerdown",
      pointerListener,
    );
    pointerListener = null;
  }
  if (pagehideListener) {
    window.removeEventListener("pagehide", pagehideListener);
    pagehideListener = null;
  }
  for (const [element, type, listener] of controlListeners.splice(0)) {
    element.removeEventListener(type, listener);
  }
  storeUnsubscribe?.();
  storeUnsubscribe = null;
  const roots = [inspectorRoot, treeRoot, hudRoot];
  for (const root of roots) {
    try {
      root?.dispose();
    } catch (error) {
      console.error("Native DOM root cleanup failed", error);
    }
  }
  inspectorRoot = null;
  treeRoot = null;
  hudRoot = null;
  try {
    sceneRoot?.dispose();
  } catch (error) {
    console.error("Native Three scene cleanup failed", error);
  } finally {
    try {
      threeHost?.dispose();
    } catch (error) {
      console.error("Three host cleanup failed", error);
    }
  }
  if (threeHost) finalHostDiagnostics = { ...threeHost.diagnostics };
  sceneRoot = null;
  threeHost = null;
  if (renderer) {
    // The page shell owns this mount point. Give accepted HMR a fresh canvas
    // rather than removing its mount or reusing a lost WebGL context.
    const oldCanvas = renderer.domElement;
    oldCanvas.replaceWith(oldCanvas.cloneNode(false));
    renderer.dispose();
    renderer.forceContextLoss();
    renderer = null;
  }
  camera = null;
  scene = null;
  if (!borrowedAssetsDisposed) {
    borrowedAssetsDisposed = true;
    sharedGeometry.dispose();
    sharedMaterial.dispose();
    groundGeometry.dispose();
    groundMaterial.dispose();
  }
};

const start = () => {
  const stage = document.querySelector<HTMLElement>(".stage");
  const canvas = document.querySelector<HTMLCanvasElement>("#scene-canvas");
  const hudMount = document.querySelector<HTMLElement>("#hud-mount");
  const inspectorMount = document.querySelector<HTMLElement>(
    "#inspector-mount",
  );
  const treeMount = document.querySelector<HTMLElement>("#scene-tree");
  const objectCount = document.querySelector<HTMLElement>("#object-count");
  const toggleButton = document.querySelector<HTMLButtonElement>(
    "#toggle-motion",
  );
  if (
    !stage || !canvas || !hudMount || !inspectorMount || !treeMount ||
    !objectCount || !toggleButton
  ) {
    throw new Error(
      "Native Three workbench is missing a required mount element.",
    );
  }

  scene = new THREE.Scene();
  scene.background = new THREE.Color("#151c18");
  scene.fog = new THREE.Fog("#151c18", 13, 28);
  camera = new THREE.PerspectiveCamera(37, 1, 0.1, 60);
  camera.position.set(5.6, 4.3, 8.6);
  camera.lookAt(0, 0.9, 0);
  renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: false,
    powerPreference: "high-performance",
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.8));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.info.autoReset = true;

  const sharedWorld = world;
  const host = createInstrumentedHost();
  threeHost = host;
  sceneRoot = createNativeRoot<ThreeHandle, ThreeParent>(host, scene, {
    world: sharedWorld,
    rootId: rootNames[0],
    scheduleCommit() {},
  });
  sceneRoot.mount(<SceneRoot store={studio} />);
  hudRoot = createDOMRoot(hudMount, {
    world: sharedWorld,
    rootId: rootNames[1],
  });
  hudRoot.mount(<SceneHud store={studio} />);
  inspectorRoot = createDOMRoot(inspectorMount, {
    world: sharedWorld,
    rootId: rootNames[3],
  });
  inspectorRoot.mount(<Inspector store={studio} />);
  treeRoot = createDOMRoot(treeMount, {
    world: sharedWorld,
    rootId: rootNames[2],
  });
  treeRoot.mount(<SceneTree store={studio} />);

  const updateCount = () => {
    objectCount.textContent = String(studio.getState().shapes.length).padStart(
      2,
      "0",
    );
    const playing = studio.getState().playing;
    toggleButton.textContent = playing ? "Ⅱ  Pause" : "▶  Resume";
    toggleButton.setAttribute("aria-pressed", String(playing));
  };
  storeUnsubscribe = studio.subscribe(rootNames[0], updateCount);
  updateCount();

  updateCanvasSize(stage);
  resizeObserver = new ResizeObserver(() => updateCanvasSize(stage));
  resizeObserver.observe(stage);
  const raycaster = new THREE.Raycaster();
  pointerListener = (event: PointerEvent) => {
    if (!camera || !scene || !threeHost) return;
    const bounds = canvas.getBoundingClientRect();
    raycaster.setFromCamera(
      new THREE.Vector2(
        ((event.clientX - bounds.left) / bounds.width) * 2 - 1,
        -((event.clientY - bounds.top) / bounds.height) * 2 + 1,
      ),
      camera,
    );
    nearestPointerDistance = Number.POSITIVE_INFINITY;
    raycastThreePointer(threeHost, raycaster, scene, "pointerdown");
  };
  canvas.addEventListener("pointerdown", pointerListener);

  const listen = (selector: string, type: string, callback: () => void) => {
    const element = document.querySelector(selector);
    if (!element) return;
    const listener: EventListener = callback;
    element.addEventListener(type, listener);
    controlListeners.push([element, type, listener]);
  };
  listen("#toggle-motion", "click", toggleMotion);
  listen("#reorder-shape", "click", reorderShapes);
  listen("#add-shape", "click", addShape);
  listen("#reset-scene", "click", resetScene);
  pagehideListener = dispose;
  window.addEventListener("pagehide", pagehideListener, { once: true });

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const draw = (time: number) => {
    frameId = 0;
    if (appDisposed || !renderer || !scene || !camera) return;
    try {
      const elapsed = lastFrameTime === null ? 0 :
        Math.min(50, Math.max(0, time - lastFrameTime));
      lastFrameTime = time;
      if (studio.getState().playing && !reducedMotion.matches &&
        elapsed > 0 && phaseSetters.size > 0 && setFrameEpoch) {
        const delta = elapsed * 0.00072;
        for (const advance of phaseSetters.values()) advance(delta);
        setFrameEpoch(++requestedFrameEpoch);
      }
      sceneRoot?.flush();
      const accepted = scene.getObjectByName(frameMarkerName)?.position.x;
      if (accepted === requestedFrameEpoch) {
        renderer.render(scene, camera);
        rendererFrames++;
        drawnFrameEpoch = requestedFrameEpoch;
      } else {
        deferredFrameCount++;
      }
    } catch (error) {
      console.error("Native Three frame failed", error);
      dispose();
      return;
    }
    if (!appDisposed) frameId = requestAnimationFrame(draw);
  };
  frameId = requestAnimationFrame(draw);
  window.__nativeThreeDiagnostics = {
    snapshot: () => ({
      roots: [sceneRoot, hudRoot, treeRoot, inspectorRoot].map(root => root?.diagnostics() ?? null),
      store: studio.diagnostics(),
      sceneObjects: studio.getState().shapes.map(shape => {
        const object = scene?.getObjectByName(shape.id);
        const mesh = object instanceof THREE.Mesh ? object : null;
        const rotation = object
          ? new THREE.Euler().setFromQuaternion(object.getWorldQuaternion(new THREE.Quaternion()))
          : null;
        return { id: shape.id, uuid: object?.uuid ?? null, parent: object?.parent?.name ?? null,
          position: object?.getWorldPosition(new THREE.Vector3()).toArray() ?? null,
          rotation: rotation ? [rotation.x,rotation.y,rotation.z] : null,
          geometry: mesh?.geometry.uuid ?? null, material: mesh && !Array.isArray(mesh.material) ? mesh.material.uuid : null,
          color: mesh && !Array.isArray(mesh.material) && 'color' in mesh.material ? (mesh.material as THREE.MeshStandardMaterial).color.getHexString() : null,
          roughness: mesh && !Array.isArray(mesh.material) && 'roughness' in mesh.material ? (mesh.material as THREE.MeshStandardMaterial).roughness : null };
      }),
      projectedCenters: studio.getState().shapes.map(shape => {
        const object=scene?.getObjectByName(shape.id);
        const canvas=renderer?.domElement;
        if(!object||!camera||!canvas) return {id:shape.id,x:null,y:null};
        const point=object.getWorldPosition(new THREE.Vector3()).project(camera);
        const bounds=canvas.getBoundingClientRect();
        return {id:shape.id,x:bounds.left+(point.x+1)*bounds.width/2,y:bounds.top+(1-point.y)*bounds.height/2};
      }),
      actualSceneOrder: scene?.getObjectByName('kinetic-study')?.children.filter(object => studio.getState().shapes.some(shape => `motion:${shape.id}`===object.name)).map(object=>object.name.slice('motion:'.length)) ?? [],
      selectedId: studio.getState().selectedId,
      sceneOrder: studio.getState().shapes.map((shape) => shape.id),
      shapeKinds: studio.getState().shapes.map((shape) => ({
        id: shape.id,
        kind: shape.kind,
      })),
      playing: studio.getState().playing,
      sceneRenderCount,
      actorRenderCount,
      domRenderCount,
      rendererFrames,
      requestedFrameEpoch,
      drawnFrameEpoch,
      hostFrameEpoch: scene?.getObjectByName(frameMarkerName)?.position.x ?? null,
      deferredFrameCount,
      activePhaseSetters: phaseSetters.size,
      phasePropWrites,
      allHostPropWrites,
      pointerEvents,
      sharedAssetUse: {
        geometryMeshes:
          studio.getState().shapes.filter((shape) => shape.kind === "shared")
            .length,
        materialMeshes:
          studio.getState().shapes.filter((shape) => shape.kind === "shared")
            .length,
      },
      host: threeHost?.diagnostics ?? finalHostDiagnostics,
      borrowedAssetsDisposed,
      disposed: appDisposed,
      storeSubscriptionActive: !appDisposed && storeUnsubscribe !== null,
    }),
  };
  if (import.meta.hot) {
    import.meta.hot.accept();
    import.meta.hot.dispose(() => {
      dispose();
      delete window.__nativeThreeDiagnostics;
    });
  }
};

start();
