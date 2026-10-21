import {
  useCallback,
  useLayoutEffect,
  useSyncExternalStore,
  version as reactVersion,
} from "react";
import { createRoot, type Root } from "react-dom/client";
import { flushSync, unstable_batchedUpdates } from "react-dom";
import type { CSSProperties } from "react";
import {
  bind,
  bindCompiled,
  bindCompiledColumn,
  jsx,
  NumericColumn,
  type RuntimeNode,
  ScalarSource,
} from "../jsx_binding_runtime.ts";
import {
  type CompiledVDOMBindingGraph,
  DOMVDOMHost,
  VDOMSnapshotRoot,
} from "../vdom_snapshot_runtime.ts";
import {
  bindingParticlesPlan,
  mountGeneratedBindingParticles,
} from "./generated_snake_frame_plan.ts";
import {
  snakeFrameV5Pages,
  snakeFrameV5ProductionPages,
} from "./snake_frame_v5_schedule.ts";
import { snakeFrameV6Pages } from "./snake_frame_v6_schedule.ts";
import "./snake_frame_benchmark.css";

type Arm =
  | "react"
  | "runtime"
  | "generated"
  | "generated-vdom"
  | "columnar-vdom"
  | "direct";
type Snapshot = { frame: number; transform: string; x: number; y: number };
type Cell = { x: number; y: number };

const params = new URLSearchParams(location.search);
const protocol = params.get("protocol") ?? "v3";
if (protocol !== "v3" && protocol !== "v4") {
  if (protocol !== "v5" && protocol !== "v6") {
    throw new Error("protocol must be v3, v4, v5, or v6");
  }
}
const protocolV4 = protocol === "v4";
const protocolV5 = protocol === "v5";
const protocolV6 = protocol === "v6";
const protocolModern = protocolV4 || protocolV5 || protocolV6;
const selectedArm = (params.get("arm") ?? "runtime") as Arm;
const segmentCount = Number(params.get("segments") ?? 128);
const sampleFrames = Number(params.get("frames") ?? 600);
const trialId = params.get("trial") ?? crypto.randomUUID();
const collection = params.get("collection") ?? "development";
const validArms: Arm[] = protocolV6
  ? ["react", "runtime", "generated-vdom", "columnar-vdom", "direct"]
  : protocolModern
  ? ["react", "runtime", "generated", "generated-vdom", "direct"]
  : ["react", "runtime", "direct"];
if (!validArms.includes(selectedArm)) {
  throw new Error(
    "arm must be react, runtime, generated, generated-vdom, columnar-vdom, or direct",
  );
}
if (![32, 128, 512, 1024].includes(segmentCount)) {
  throw new Error("segments must be 32, 128, 512, or 1024");
}
if (![60, 300, 600, 1200].includes(sampleFrames)) {
  throw new Error("frames must be 60, 300, 600, or 1200");
}

const boardSide = 64;
const cellPx = 10;
const tickMs = 115;
const path: Cell[] = [];
for (let y = 0; y < boardSide; y++) {
  if (y % 2 === 0) {
    for (let x = 0; x < boardSide; x++) path.push({ x, y });
  } else {
    for (let x = boardSide - 1; x >= 0; x--) path.push({ x, y });
  }
}

class SnakeModel {
  headStep = segmentCount + 20;
  alpha = 0;
  accumulator = 0;
  previousTime: number | null = null;
  paused = false;
  speed = 1;
  foodStep = this.headStep + 36;
  score = 0;
  step(time: number) {
    if (this.previousTime === null) this.previousTime = time;
    const elapsed = Math.max(0, Math.min(64, time - this.previousTime));
    this.previousTime = time;
    if (!this.paused) {
      this.accumulator += elapsed * this.speed;
      while (this.accumulator >= tickMs) {
        this.headStep++;
        if (this.headStep >= this.foodStep) {
          this.score++;
          this.foodStep = this.headStep + 72;
        }
        this.accumulator -= tickMs;
      }
    }
    this.alpha = this.paused ? 0 : this.accumulator / tickMs;
  }
  transform(id: number) {
    const { x, y } = this.position(id);
    return `translate3d(${x.toFixed(2)}px, ${y.toFixed(2)}px, 0)`;
  }
  position(id: number) {
    const fromIndex = (this.headStep - id + path.length) % path.length;
    const toIndex = (fromIndex + 1) % path.length;
    const from = path[fromIndex];
    const to = path[toIndex];
    return {
      x: (from.x + (to.x - from.x) * this.alpha) * cellPx,
      y: (from.y + (to.y - from.y) * this.alpha) * cellPx,
    };
  }
  writePositionColumns(x: Float64Array, y: Float64Array) {
    for (let id = 0; id < segmentCount; id++) {
      const fromIndex = (this.headStep - id + path.length) % path.length;
      const toIndex = (fromIndex + 1) % path.length;
      const from = path[fromIndex];
      const to = path[toIndex];
      x[id] = (from.x + (to.x - from.x) * this.alpha) * cellPx;
      y[id] = (from.y + (to.y - from.y) * this.alpha) * cellPx;
    }
  }
  foodTransform() {
    const food = path[this.foodStep % path.length];
    return `translate3d(${food.x * cellPx}px, ${food.y * cellPx}px, 0)`;
  }
  reset() {
    this.headStep = segmentCount + 20;
    this.alpha = 0;
    this.accumulator = 0;
    this.previousTime = null;
    this.paused = false;
    this.speed = 1;
    this.foodStep = this.headStep + 36;
    this.score = 0;
  }
}

class SegmentStore {
  snapshots: Snapshot[];
  listeners: Array<Set<() => void>>;
  frameListeners = new Set<() => void>();
  frameSnapshot = { frame: 0 };
  currentFrame = 0;
  frameStartedAt = new Map<number, number>();
  completed = new Map<number, number>();
  constructor(count: number, model: SnakeModel) {
    this.snapshots = Array.from({ length: count }, (_, id) => ({
      frame: 0,
      transform: id === count - 1 ? model.foodTransform() : model.transform(id),
      ...model.position(id),
    }));
    this.listeners = Array.from({ length: count }, () => new Set());
  }
  getSnapshot = (id: number) => this.snapshots[id];
  getFrameSnapshot = () => this.frameSnapshot;
  subscribe = (id: number, listener: () => void) => {
    this.listeners[id].add(listener);
    return () => this.listeners[id].delete(listener);
  };
  subscribeFrame = (listener: () => void) => {
    this.frameListeners.add(listener);
    return () => this.frameListeners.delete(listener);
  };
  publish(
    frame: number,
    transforms: string[],
    startedAt: number,
    positions?: Array<{ x: number; y: number }>,
  ) {
    this.currentFrame = frame;
    this.frameSnapshot = { frame };
    this.frameStartedAt.set(frame, startedAt);
    const changed: number[] = [];
    for (let id = 0; id < transforms.length; id++) {
      this.snapshots[id] = {
        ...this.snapshots[id],
        frame,
        transform: transforms[id],
      };
      if (positions) Object.assign(this.snapshots[id], positions[id]);
      changed.push(id);
    }
    unstable_batchedUpdates(() => {
      for (const id of changed) {
        for (const listener of this.listeners[id]) listener();
      }
      for (const listener of this.frameListeners) listener();
    });
  }
  publishColumns(
    frame: number,
    transforms: string[],
    startedAt: number,
    x: Float64Array,
    y: Float64Array,
  ) {
    this.currentFrame = frame;
    this.frameSnapshot = { frame };
    this.frameStartedAt.set(frame, startedAt);
    const changed: number[] = [];
    for (let id = 0; id < transforms.length; id++) {
      this.snapshots[id] = {
        ...this.snapshots[id],
        frame,
        transform: transforms[id],
        ...(id < x.length ? { x: x[id], y: y[id] } : {}),
      };
      changed.push(id);
    }
    unstable_batchedUpdates(() => {
      for (const id of changed) {
        for (const listener of this.listeners[id]) listener();
      }
      for (const listener of this.frameListeners) listener();
    });
  }
  markCommitted(frame: number) {
    const startedAt = this.frameStartedAt.get(frame);
    if (startedAt === undefined) return;
    this.completed.set(frame, performance.now() - startedAt);
    this.frameStartedAt.delete(frame);
  }
}

const model = new SnakeModel();
let activeStore: SegmentStore | null = null;
let framePositions: Array<{ x: number; y: number }> | null = null;
const positionFor = (id: number) => framePositions?.[id] ?? model.position(id);
const expectedTransform = (id: number) => model.transform(id);

function ReactSegment(
  { id, store, food = false }: {
    id: number;
    store: SegmentStore;
    food?: boolean;
  },
) {
  const subscribe = useCallback(
    (listener: () => void) => store.subscribe(id, listener),
    [id, store],
  );
  const getSnapshot = useCallback(() => store.getSnapshot(id), [id, store]);
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  const style: CSSProperties = protocolModern && !food
    ? { left: `${snapshot.x}px`, top: `${snapshot.y}px` }
    : { transform: snapshot.transform };
  return (
    <i
      className={food
        ? "snake-food"
        : `snake-segment${id === 0 ? " snake-head" : ""}`}
      style={style}
    />
  );
}

function ReactCommitMarker({ store }: { store: SegmentStore }) {
  const snapshot = useSyncExternalStore(
    store.subscribeFrame,
    store.getFrameSnapshot,
    store.getFrameSnapshot,
  );
  useLayoutEffect(() => store.markCommitted(snapshot.frame), [
    store,
    snapshot.frame,
  ]);
  return null;
}

function ReactBoard({ store, count }: { store: SegmentStore; count: number }) {
  return (
    <>
      <div className="snake-board">
        {Array.from(
          { length: count },
          (_, id) => <ReactSegment key={id} id={id} store={store} />,
        )}
        <ReactSegment key="food" id={count} store={store} food />
      </div>
      <ReactCommitMarker store={store} />
    </>
  );
}

const runtimeTree = (count: number, progress: ScalarSource): RuntimeNode =>
  jsx(
    "div",
    { className: "snake-board" },
    [
      ...Array.from({ length: count }, (_, id) =>
        jsx("i", {
          className: `snake-segment${id === 0 ? " snake-head" : ""}`,
          style: protocolModern
            ? {
              left: bind(progress, () =>
                `${(protocolV6 ? frameX?.[id] : undefined) ?? positionFor(id).x}px`
              ),
              top: bind(progress, () =>
                `${(protocolV6 ? frameY?.[id] : undefined) ?? positionFor(id).y}px`
              ),
            }
            : { transform: bind(progress, () => model.transform(id)) },
          key: `segment-${id}`,
        })),
      jsx("i", {
        className: "snake-food",
        style: { transform: bind(progress, () => model.foodTransform()) },
        key: "food",
      }),
    ],
  );

const rootElement = document.getElementById("root")!;
rootElement.innerHTML = `
  <main class="snake-app">
    <header class="snake-header">
      <div><p class="eyebrow">${
  selectedArm === "generated-vdom"
    ? "Integration probe · OXC → retained VDOM"
    : `Frame update study · ${selectedArm} arm`
}</p><h1>Snake, animated every frame</h1>
      <p>The snake follows a deterministic trail. The game step is discrete; segment transforms are updated on every animation frame.</p></div>
    <div class="score-panel"><span>SCORE</span><strong id="score">0</strong><span>BODY</span><strong>${segmentCount}</strong><span>SPEED</span><strong id="speed">1×</strong></div>
    </header>
    <section class="snake-layout">
      <div class="board-shell"><div id="game" class="game-mount" aria-label="Animated snake game"></div></div>
      <aside class="game-controls">
        <h2>Controls</h2><p><kbd>Space</kbd> pause / resume</p><p><kbd>↑</kbd> speed up</p><p><kbd>↓</kbd> slow down</p>
        <button id="toggle" type="button">Pause</button><button id="reset" type="button">Reset trail</button>
        <label>Benchmark frames <select id="frames"><option value="60">60 smoke</option><option value="300">300</option><option value="600" selected>600</option><option value="1200">1,200</option></select></label>
        <button id="export" type="button">Export raw frame data</button>
        <p id="status" class="status" aria-live="polite">Running. Measurements begin after warmup.</p>
      </aside>
    </section>
    <details><summary>Latest frame record</summary><pre id="record">Waiting for ${sampleFrames} measured RAF updates after warmup.</pre></details>
  </main>`;

const gameMount = document.getElementById("game") as HTMLElement;
const statusNode = document.getElementById("status")!;
const recordNode = document.getElementById("record")!;
const speedNode = document.getElementById("speed")!;
const scoreNode = document.getElementById("score")!;
const frameSelect = document.getElementById("frames") as HTMLSelectElement;
frameSelect.value = String(sampleFrames);

let reactRoot: Root | null = null;
let runtimeRoot: VDOMSnapshotRoot<Node, Node> | null = null;
let progressSource: ScalarSource | null = null;
let generatedPlan: ReturnType<typeof mountGeneratedBindingParticles> | null =
  null;
let generatedVdomRoot: VDOMSnapshotRoot<Node, Node> | null = null;
let generatedVdomSources: Array<{ x: ScalarSource; y: ScalarSource }> = [];
let columnarVdomRoot: VDOMSnapshotRoot<Node, Node> | null = null;
let columnarX: NumericColumn | null = null;
let columnarY: NumericColumn | null = null;
const columnarColumns: NumericColumn[] = [];
let columnarXValues: Float64Array | null = null;
let columnarYValues: Float64Array | null = null;
let frameX: Float64Array | null = null;
let frameY: Float64Array | null = null;
let segmentNodes: HTMLElement[] = [];
let foodNode: HTMLElement | null = null;
let frame = 0;
let warmupFrames = 90;
let previousRaf: number | null = null;
let samples: Array<{
  frame: number;
  intervalMs: number;
  updateCpuMs: number;
  commitMs: number | null;
}> = [];
let completed = false;
let finishing = false;
let pendingSample:
  | { frame: number; intervalMs: number; updateCpuMs: number }
  | null = null;
const pageLoadId = crypto.randomUUID();
let mountMs = 0;
let heapBeforeMountBytes: number | null = null;
let heapAfterMountBytes: number | null = null;

const heapUsedBytes = (): number | null => {
  const memory = (performance as Performance & {
    memory?: { usedJSHeapSize?: number };
  }).memory;
  const value = memory?.usedJSHeapSize;
  return typeof value === "number" && Number.isFinite(value) ? value : null;
};

const mountArm = () => {
  const startedAt = performance.now();
  model.reset();
  framePositions = null;
  if (protocolV6) {
    frameX = new Float64Array(segmentCount);
    frameY = new Float64Array(segmentCount);
    model.writePositionColumns(frameX, frameY);
  }
  if (selectedArm === "react") {
    activeStore = new SegmentStore(segmentCount + 1, model);
    reactRoot = createRoot(gameMount);
    flushSync(() =>
      reactRoot!.render(
        <ReactBoard store={activeStore!} count={segmentCount} />,
      )
    );
  } else if (selectedArm === "runtime") {
    progressSource = new ScalarSource(0, 0);
    runtimeRoot = new VDOMSnapshotRoot(new DOMVDOMHost(), gameMount);
    runtimeRoot.commit(runtimeTree(segmentCount, progressSource), null, true);
  } else if (selectedArm === "generated") {
    const sources = Array.from({ length: segmentCount }, (_, id) => ({
      id,
      values: [model.position(id).x, model.position(id).y],
    }));
    generatedPlan = mountGeneratedBindingParticles(sources, gameMount);
    const board = gameMount.querySelector<HTMLElement>(".snake-board")!;
    const food = document.createElement("i");
    food.className = "snake-food";
    food.style.transform = model.foodTransform();
    board.append(food);
  } else if (selectedArm === "generated-vdom") {
    const leftBindingId = bindingParticlesPlan.bindings.findIndex((binding) =>
      binding.property === "left"
    );
    const topBindingId = bindingParticlesPlan.bindings.findIndex((binding) =>
      binding.property === "top"
    );
    if (leftBindingId < 0 || topBindingId < 0) {
      throw new Error("OXC Snake plan is missing left/top bindings");
    }
    const leftBinding = bindingParticlesPlan.bindings[leftBindingId];
    const topBinding = bindingParticlesPlan.bindings[topBindingId];
    generatedVdomSources = Array.from({ length: segmentCount }, (_, id) => ({
      x: new ScalarSource(id * 2, model.position(id).x),
      y: new ScalarSource(id * 2 + 1, model.position(id).y),
    }));
    const tree = jsx("div", { className: "snake-board" }, [
      ...generatedVdomSources.map((sources, id) =>
        jsx("i", {
          key: `segment-${id}`,
          className: `snake-segment${id === 0 ? " snake-head" : ""}`,
          style: {
            left: bindCompiled(
              sources.x,
              leftBindingId,
              leftBinding.sourceSlot ?? 0,
              (value) => `${value}px`,
            ),
            top: bindCompiled(
              sources.y,
              topBindingId,
              topBinding.sourceSlot ?? 0,
              (value) => `${value}px`,
            ),
          },
        })
      ),
      jsx("i", {
        key: "food",
        className: "snake-food",
        style: { transform: model.foodTransform() },
      }),
    ]);
    generatedVdomRoot = new VDOMSnapshotRoot(new DOMVDOMHost(), gameMount);
    generatedVdomRoot.commit(
      tree,
      bindingParticlesPlan.dependencyGraph as CompiledVDOMBindingGraph,
    );
  } else if (selectedArm === "columnar-vdom") {
    const leftBindingId = bindingParticlesPlan.bindings.findIndex((binding) =>
      binding.property === "left"
    );
    const topBindingId = bindingParticlesPlan.bindings.findIndex((binding) =>
      binding.property === "top"
    );
    if (leftBindingId < 0 || topBindingId < 0 || !frameX || !frameY) {
      throw new Error("OXC Snake plan or frame columns are missing");
    }
    const leftBinding = bindingParticlesPlan.bindings[leftBindingId];
    const topBinding = bindingParticlesPlan.bindings[topBindingId];
    columnarXValues = frameX;
    columnarYValues = frameY;
    columnarX = new NumericColumn(0, leftBinding.sourceSlot ?? 0, frameX);
    columnarY = new NumericColumn(1, topBinding.sourceSlot ?? 1, frameY);
    columnarColumns.length = 0;
    columnarColumns.push(columnarX, columnarY);
    const tree = jsx("div", { className: "snake-board" }, [
      ...Array.from({ length: segmentCount }, (_, id) =>
        jsx("i", {
          key: `segment-${id}`,
          className: `snake-segment${id === 0 ? " snake-head" : ""}`,
          style: {
            left: bindCompiledColumn(
              columnarX!,
              id,
              leftBindingId,
              (value) => `${value}px`,
            ),
            top: bindCompiledColumn(
              columnarY!,
              id,
              topBindingId,
              (value) => `${value}px`,
            ),
          },
        })
      ),
      jsx("i", {
        key: "food",
        className: "snake-food",
        style: { transform: model.foodTransform() },
      }),
    ]);
    columnarVdomRoot = new VDOMSnapshotRoot(new DOMVDOMHost(), gameMount);
    columnarVdomRoot.commit(
      tree,
      bindingParticlesPlan.dependencyGraph as CompiledVDOMBindingGraph,
    );
  } else {
    const board = document.createElement("div");
    board.className = "snake-board";
    for (let id = 0; id < segmentCount; id++) {
      const segment = document.createElement("i");
      segment.className = `snake-segment${id === 0 ? " snake-head" : ""}`;
      board.append(segment);
    }
    const food = document.createElement("i");
    food.className = "snake-food";
    food.style.transform = model.foodTransform();
    board.append(food);
    gameMount.replaceChildren(board);
  }
  segmentNodes = [...gameMount.querySelectorAll<HTMLElement>(".snake-segment")];
  foodNode = gameMount.querySelector<HTMLElement>(".snake-food");
  mountMs = performance.now() - startedAt;
  heapAfterMountBytes = heapUsedBytes();
};

const readTransforms = () => segmentNodes.map((node) => node.style.transform);
const readPositions = () =>
  segmentNodes.map((node) => ({
    x: Number.parseFloat(node.style.left),
    y: Number.parseFloat(node.style.top),
  }));
const readFoodTransform = () => foodNode?.style.transform ?? "";
const exportRecord = () => {
  const blob = new Blob([
    JSON.stringify(
      window.__snakeFrameBenchmarkV6 ?? window.__snakeFrameBenchmarkV5 ??
        window.__snakeFrameBenchmarkV4 ?? window.__snakeFrameBenchmarkV3 ?? null,
      null,
      2,
    ),
  ], { type: "application/json" });
  const href = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = href;
  anchor.download = `snake-frame-${selectedArm}-${pageLoadId}.json`;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(href), 1000);
};

heapBeforeMountBytes = heapUsedBytes();
mountArm();
document.getElementById("export")!.addEventListener("click", exportRecord);
document.getElementById("toggle")!.addEventListener("click", () => {
  model.paused = !model.paused;
  document.getElementById("toggle")!.textContent = model.paused
    ? "Resume"
    : "Pause";
});
document.getElementById("reset")!.addEventListener("click", () => {
  model.reset();
  scoreNode.textContent = "0";
  samples = [];
  frame = 0;
  completed = false;
  finishing = false;
  pendingSample = null;
  window.__snakeFrameBenchmarkV3 = undefined;
  window.__snakeFrameBenchmarkV4 = undefined;
  window.__snakeFrameBenchmarkV5 = undefined;
  window.__snakeFrameBenchmarkV6 = undefined;
  document.getElementById("toggle")!.textContent = "Pause";
  statusNode.textContent = "Trail reset. Measurements begin after warmup.";
});
document.addEventListener("keydown", (event) => {
  if (event.code === "Space") {
    event.preventDefault();
    model.paused = !model.paused;
    document.getElementById("toggle")!.textContent = model.paused
      ? "Resume"
      : "Pause";
  } else if (event.key === "ArrowUp") {
    model.speed = Math.min(4, model.speed + 0.25);
  } else if (event.key === "ArrowDown") {
    model.speed = Math.max(0.25, model.speed - 0.25);
  }
  speedNode.textContent = `${model.speed}×`;
});

const finishSamples = () => {
  const translation = (value: string) => {
    const matrix = new DOMMatrixReadOnly(value);
    return [matrix.m41, matrix.m42] as const;
  };
  let allOutputMatches: boolean;
  if (protocolModern) {
    const positions = readPositions();
    const [foodX, foodY] = translation(readFoodTransform());
    const [expectedFoodX, expectedFoodY] = translation(model.foodTransform());
    allOutputMatches = positions.length === segmentCount &&
      positions.every((actual, id) => {
        const expected = model.position(id);
        return Number.isFinite(actual.x) && Number.isFinite(actual.y) &&
          Math.abs(actual.x - expected.x) < 0.02 &&
          Math.abs(actual.y - expected.y) < 0.02;
      }) && Math.abs(foodX - expectedFoodX) < 0.02 &&
      Math.abs(foodY - expectedFoodY) < 0.02;
  } else {
    const transforms = readTransforms();
    const expected = [
      ...Array.from({ length: segmentCount }, (_, id) => expectedTransform(id)),
      model.foodTransform(),
    ];
    const actual = [...transforms, readFoodTransform()];
    allOutputMatches = actual.length === expected.length &&
      actual.every((value, id) => {
        const [x, y] = translation(value);
        const [expectedX, expectedY] = translation(expected[id]);
        return Math.abs(x - expectedX) < 0.02 &&
          Math.abs(y - expectedY) < 0.02;
      });
  }
  const currentNodes = [
    ...gameMount.querySelectorAll<HTMLElement>(".snake-segment"),
    gameMount.querySelector<HTMLElement>(".snake-food"),
  ];
  const mountedNodes = [...segmentNodes, foodNode];
  const stableNodeIdentity = currentNodes.length === mountedNodes.length &&
    currentNodes.every((node, index) => node === mountedNodes[index]);
  const stableNodeCount = segmentNodes.length === segmentCount &&
    currentNodes.length === segmentCount + 1;
  const completeCommitCoverage = selectedArm !== "react" ||
    samples.every((sample) => sample.commitMs !== null);
  const allContractsPass = samples.length === sampleFrames &&
    allOutputMatches && stableNodeCount && stableNodeIdentity &&
    completeCommitCoverage;
  const record = {
    schemaVersion: protocolV6
      ? "snake-frame-browser-v6"
      : protocolV5
      ? "snake-frame-browser-v5"
      : protocolV4
      ? "snake-frame-browser-v4"
      : "snake-frame-browser-v3",
    status: allContractsPass ? "PASS" : "FAIL",
    allContractsPass,
    trialId,
    collection,
    buildMode: import.meta.env.MODE,
    pageLoadId,
    arm: selectedArm,
    segmentCount,
    warmupFrames,
    measuredFrames: samples.length,
    mountMs,
    heapUsedBeforeMountBytes: heapBeforeMountBytes,
    heapUsedAfterMountBytes: heapAfterMountBytes,
    heapUsedAfterMeasuredFramesBytes: heapUsedBytes(),
    reactVersion,
    runtimeStrategy: selectedArm === "generated"
      ? "oxc-generated-repeated-host-two-source-style-writers"
      : selectedArm === "generated-vdom"
      ? "oxc-generated-csr-bindings-through-retained-vdom"
      : selectedArm === "columnar-vdom"
      ? "oxc-generated-csr-columnar-bindings-through-retained-vdom"
      : protocolModern
      ? "v4-two-dimensional-style-binding"
      : "retained-vdom-single-source-style-binding",
    browser: {
      userAgent: navigator.userAgent,
      visibilityState: document.visibilityState,
      devicePixelRatio: devicePixelRatio,
      viewport: { width: innerWidth, height: innerHeight },
      hardwareConcurrency: navigator.hardwareConcurrency ?? null,
    },
    refreshRateEstimateHz: previousRaf && samples.length
      ? 1000 /
        (samples.reduce((sum, item) => sum + item.intervalMs, 0) /
          samples.length)
      : null,
    allOutputMatches,
    stableNodeCount,
    stableNodeIdentity,
    completeCommitCoverage,
    samples,
  };
  if (protocolV6) window.__snakeFrameBenchmarkV6 = record;
  else if (protocolV5) window.__snakeFrameBenchmarkV5 = record;
  else if (protocolV4) window.__snakeFrameBenchmarkV4 = record;
  else window.__snakeFrameBenchmarkV3 = record;
  recordNode.textContent = JSON.stringify(record, null, 2);
  statusNode.textContent =
    `${record.status}: ${samples.length} measured RAFs; final output parity ${
      allOutputMatches ? "passed" : "failed"
    }.`;
  completed = true;
  void fetch("/__benchmark/save-snake-frame", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(record),
  }).then(async (response) => {
    if (!response.ok) throw new Error(await response.text());
    const saved = await response.json();
    statusNode.textContent += ` Raw record saved: ${saved.filename}.`;
    if ((protocolV5 || protocolV6) && params.get("autoplay") === "1") {
      const sequence = Number(params.get("sequence"));
      const pages = protocolV6
        ? snakeFrameV6Pages()
        : collection === "production"
        ? snakeFrameV5ProductionPages()
        : snakeFrameV5Pages();
      if (Number.isInteger(sequence) && pages[sequence]?.trialId === trialId) {
        const next = pages[sequence + 1];
        if (next) {
          const query = new URLSearchParams({
            protocol: protocolV6 ? "v6" : "v5",
            arm: next.arm,
            segments: String(next.segmentCount),
            frames: "300",
            trial: next.trialId,
            ...(collection !== "development" ? { collection } : {}),
            autoplay: "1",
            sequence: String(sequence + 1),
          });
          statusNode.textContent += ` Starting page ${
            sequence + 2
          }/${pages.length}.`;
          location.assign(`/snake-frame-benchmark.html?${query}`);
        } else {
          statusNode.textContent += " V5 matrix complete.";
        }
      } else {
        statusNode.textContent += " Auto-run stopped: schedule ID mismatch.";
      }
    }
  }).catch((error) => {
    statusNode.textContent += ` Raw record archive unavailable: ${
      String(error)
    }.`;
  });
};

const raf = (time: number) => {
  frame++;
  if (pendingSample) {
    const commitMs = selectedArm === "react"
      ? activeStore!.completed.get(pendingSample.frame) ?? null
      : pendingSample.updateCpuMs;
    if (commitMs !== null || frame - pendingSample.frame > 2) {
      samples.push({ ...pendingSample, commitMs });
      pendingSample = null;
      if (samples.length >= Number(frameSelect.value) && !finishing) {
        finishing = true;
        requestAnimationFrame(() => requestAnimationFrame(finishSamples));
      }
    }
  }
  const intervalMs = previousRaf === null ? 0 : time - previousRaf;
  previousRaf = time;
  model.step(time);
  const startedAt = performance.now();
  if (protocolModern) {
    const positions = protocolV6
      ? []
      : Array.from({ length: segmentCount }, (_, id) => model.position(id));
    if (protocolV6) {
      model.writePositionColumns(frameX!, frameY!);
    } else {
      framePositions = positions;
    }
    if (selectedArm === "react") {
      const transforms = [
        ...Array(segmentCount).fill(""),
        model.foodTransform(),
      ];
      if (protocolV6) {
        activeStore!.publishColumns(frame, transforms, startedAt, frameX!, frameY!);
      } else {
        activeStore!.publish(frame, transforms, startedAt, positions);
      }
    } else if (selectedArm === "runtime") {
      runtimeRoot!.setSource(progressSource!, model.headStep + model.alpha);
    } else if (selectedArm === "generated") {
      for (let id = 0; id < positions.length; id++) {
        generatedPlan!.set(id, positions[id].x, 0);
        generatedPlan!.set(id, positions[id].y, 1);
      }
      generatedPlan!.flush();
      if (foodNode) foodNode.style.transform = model.foodTransform();
    } else if (selectedArm === "generated-vdom") {
      const updates: Array<readonly [ScalarSource, number]> = [];
      for (let id = 0; id < segmentCount; id++) {
        const x = protocolV6 ? frameX![id] : positions[id].x;
        const y = protocolV6 ? frameY![id] : positions[id].y;
        updates.push([generatedVdomSources[id].x, x]);
        updates.push([generatedVdomSources[id].y, y]);
      }
      generatedVdomRoot!.setSources(updates);
      if (foodNode) foodNode.style.transform = model.foodTransform();
    } else if (selectedArm === "columnar-vdom") {
      columnarVdomRoot!.setColumns(columnarColumns);
      if (foodNode) foodNode.style.transform = model.foodTransform();
    } else {
      for (let id = 0; id < segmentCount; id++) {
        const x = protocolV6 ? frameX![id] : positions[id].x;
        const y = protocolV6 ? frameY![id] : positions[id].y;
        segmentNodes[id].style.left = `${x}px`;
        segmentNodes[id].style.top = `${y}px`;
      }
      if (foodNode) foodNode.style.transform = model.foodTransform();
    }
  } else if (selectedArm === "react") {
    const transforms = [
      ...Array.from({ length: segmentCount }, (_, id) => model.transform(id)),
      model.foodTransform(),
    ];
    activeStore!.publish(frame, transforms, startedAt);
  } else if (selectedArm === "runtime") {
    runtimeRoot!.setSource(progressSource!, model.headStep + model.alpha);
  } else {
    for (let id = 0; id < segmentCount; id++) {
      segmentNodes[id].style.transform = model.transform(id);
    }
    if (foodNode) foodNode.style.transform = model.foodTransform();
  }
  scoreNode.textContent = String(model.score);
  const updateCpuMs = performance.now() - startedAt;
  if (frame > warmupFrames && !completed && !finishing && !pendingSample) {
    pendingSample = { frame, intervalMs, updateCpuMs };
  }
  requestAnimationFrame(raf);
};
requestAnimationFrame(raf);

declare global {
  interface Window {
    __snakeFrameBenchmarkV3?: Record<string, unknown>;
    __snakeFrameBenchmarkV4?: Record<string, unknown>;
    __snakeFrameBenchmarkV5?: Record<string, unknown>;
    __snakeFrameBenchmarkV6?: Record<string, unknown>;
  }
}
