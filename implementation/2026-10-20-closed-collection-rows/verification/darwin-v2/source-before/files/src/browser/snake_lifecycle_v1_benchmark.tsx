import {
  useCallback,
  useSyncExternalStore,
  version as reactVersion,
} from "react";
import { createRoot, type Root } from "react-dom/client";
import { flushSync } from "react-dom";
import {
  bind,
  bindCompiledColumn,
  jsx,
  NumericColumn,
  type RuntimeNode,
  ScalarSource,
} from "../jsx_binding_runtime.ts";
import { DOMVDOMHost, VDOMSnapshotRoot } from "../vdom_snapshot_runtime.ts";
import { bindingParticlesPlan } from "./generated_snake_frame_plan.ts";
import {
  type LifecycleArm,
  lifecyclePages,
} from "./snake_lifecycle_v1_schedule.ts";
import "./snake_frame_benchmark.css";

const params = new URLSearchParams(location.search);
const pageIndex = Number(params.get("sequence") ?? -1);
const pages = lifecyclePages();
const scheduled = pages[pageIndex];
const arm =
  (params.get("arm") ?? scheduled?.arm ?? "columnar-vdom") as LifecycleArm;
const segmentCount = Number(
  params.get("segments") ?? scheduled?.segmentCount ?? 512,
);
const replication = Number(
  params.get("replication") ?? scheduled?.replication ?? 1,
);
const collection = params.get("collection") ?? "scheduled";
const scheduledAutorun = params.get("autorun") === "1" &&
  params.has("sequence") && collection === "scheduled";
const trialId = params.get("trial") ??
  `lifecycle-v1-s${segmentCount}-r${replication}-${arm}`;
const warmupFrames = 90;
const measuredFrames = 300;
if (!["react", "runtime-vdom", "columnar-vdom"].includes(arm)) {
  throw new Error("Unknown arm");
}
if (![512, 1024].includes(segmentCount)) {
  throw new Error("segments must be 512 or 1024");
}
if (
  params.has("sequence") &&
  (!scheduled || scheduled.arm !== arm ||
    scheduled.segmentCount !== segmentCount)
) {
  throw new Error("URL does not match the frozen lifecycle schedule");
}

type Position = { x: number; y: number };
const boardWidth = 64;
const scale = 8;
const trail = Array.from({ length: boardWidth * boardWidth }, (_, index) => ({
  x: index % boardWidth,
  y: Math.floor(index / boardWidth),
}));
class Model {
  step = segmentCount + 23;
  alpha = 0;
  previous: number | null = null;
  accumulator = 0;
  x = new Float64Array(segmentCount);
  y = new Float64Array(segmentCount);
  advance(time: number) {
    if (this.previous === null) this.previous = time;
    this.accumulator += Math.min(64, Math.max(0, time - this.previous));
    this.previous = time;
    while (this.accumulator >= 33) {
      this.step++;
      this.accumulator -= 33;
    }
    this.alpha = this.accumulator / 33;
    for (let id = 0; id < segmentCount; id++) {
      const from = trail[(this.step - id + trail.length) % trail.length];
      const to = trail[(this.step - id + 1 + trail.length) % trail.length];
      this.x[id] = (from.x + (to.x - from.x) * this.alpha) * scale;
      this.y[id] = (from.y + (to.y - from.y) * this.alpha) * scale;
    }
  }
}
type Snapshot = Position;
class Store {
  readonly snapshots: Snapshot[];
  readonly listeners: Set<() => void>[];
  constructor(readonly model: Model) {
    this.snapshots = Array.from({ length: segmentCount }, (_, id) => ({
      x: model.x[id],
      y: model.y[id],
    }));
    this.listeners = Array.from({ length: segmentCount }, () => new Set());
  }
  get = (id: number) => this.snapshots[id];
  subscribe = (id: number, listener: () => void) => {
    this.listeners[id].add(listener);
    return () => this.listeners[id].delete(listener);
  };
  publish() {
    for (let id = 0; id < segmentCount; id++) {
      this.snapshots[id] = { x: this.model.x[id], y: this.model.y[id] };
      for (const listener of this.listeners[id]) listener();
    }
  }
  subscriptionCount() {
    return this.listeners.reduce((sum, listeners) => sum + listeners.size, 0);
  }
}
function ReactSegment({ id, store }: { id: number; store: Store }) {
  const subscribe = useCallback(
    (listener: () => void) => store.subscribe(id, listener),
    [id, store],
  );
  const getSnapshot = useCallback(() => store.get(id), [id, store]);
  const position = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  return (
    <i
      className="snake-segment"
      style={{ left: `${position.x}px`, top: `${position.y}px` }}
    />
  );
}
function ReactScene({ store }: { store: Store }) {
  return (
    <div className="snake-board">
      {Array.from(
        { length: segmentCount },
        (_, id) => <ReactSegment key={id} id={id} store={store} />,
      )}
      <i
        className="snake-food"
        style={{
          left: `${
            (segmentCount + 70) % (boardWidth * boardWidth) % boardWidth * scale
          }px`,
          top: `${
            Math.floor(
              ((segmentCount + 70) % (boardWidth * boardWidth)) / boardWidth,
            ) * scale
          }px`,
        }}
      />
    </div>
  );
}

const rootElement = document.querySelector<HTMLElement>("#root")!;
rootElement.innerHTML =
  `<main class="snake-app"><header class="snake-header"><div><p class="eyebrow">Lifecycle follow-up · ${arm}</p><h1>Snake frame lifecycle</h1><p>Mount, 90 warmup frames, 300 measured requestAnimationFrame updates, correctness checks, then teardown. This is a frozen research harness, not a gameplay loop.</p></div><div class="score-panel"><span>ARM / SIZE</span><strong>${arm}</strong><span>SEGMENTS</span><strong>${segmentCount}</strong></div></header><section class="snake-layout"><div class="board-shell"><div id="game" class="game-mount"></div></div><aside class="game-controls"><h2>Lifecycle run</h2><p id="status" class="status" aria-live="polite">Preparing ${trialId}</p><button id="run" type="button">Run this page</button><button id="next" type="button" hidden>Run next scheduled page</button><details><summary>Latest lifecycle record</summary><pre id="record">Waiting to run.</pre></details></aside></section></main>`;
const gameMount = document.querySelector<HTMLElement>("#game")!;
const statusNode = document.querySelector<HTMLElement>("#status")!;
const recordNode = document.querySelector<HTMLElement>("#record")!;
const runButton = document.querySelector<HTMLButtonElement>("#run")!;
const nextButton = document.querySelector<HTMLButtonElement>("#next")!;
let model: Model | null = null;
let store: Store | null = null;
let reactRoot: Root | null = null;
let runtimeRoot: VDOMSnapshotRoot<Node, Node> | null = null;
let progress: ScalarSource | null = null;
let columnX: NumericColumn | null = null;
let columnY: NumericColumn | null = null;
let segmentNodes: HTMLElement[] = [];
let raf = 0;
let frame = 0;
let measured: number[] = [];
let lastRaf: number | null = null;
let mountMs = 0;
let heapBefore: number | null = null;
let heapMounted: number | null = null;
const heapUsed = () => {
  const value =
    (performance as Performance & { memory?: { usedJSHeapSize?: number } })
      .memory?.usedJSHeapSize;
  return typeof value === "number" ? value : null;
};
const mount = () => {
  const started = performance.now();
  model = new Model();
  model.advance(0);
  if (arm === "react") {
    store = new Store(model);
    reactRoot = createRoot(gameMount);
    flushSync(() => reactRoot!.render(<ReactScene store={store!} />));
  } else if (arm === "runtime-vdom") {
    progress = new ScalarSource(0, 0);
    runtimeRoot = new VDOMSnapshotRoot(new DOMVDOMHost(), gameMount);
    runtimeRoot.commit(
      jsx("div", { className: "snake-board" }, [
        ...Array.from({ length: segmentCount }, (_, id) =>
          jsx("i", {
            key: `segment-${id}`,
            className: "snake-segment",
            style: {
              left: bind(progress, () => `${model!.x[id]}px`),
              top: bind(progress, () => `${model!.y[id]}px`),
            },
          })),
        jsx("i", {
          key: "food",
          className: "snake-food",
          style: {
            left: `${
              ((segmentCount + 70) % (boardWidth * boardWidth)) % boardWidth *
              scale
            }px`,
            top: `${
              Math.floor(
                ((segmentCount + 70) % (boardWidth * boardWidth)) / boardWidth,
              ) * scale
            }px`,
          },
        }),
      ]),
      null,
      true,
    );
  } else {
    const leftId = bindingParticlesPlan.bindings.findIndex((item) =>
      item.property === "left"
    );
    const topId = bindingParticlesPlan.bindings.findIndex((item) =>
      item.property === "top"
    );
    if (leftId < 0 || topId < 0) {
      throw new Error("OXC plan does not contain left/top bindings");
    }
    columnX = new NumericColumn(0, 0, model.x);
    columnY = new NumericColumn(1, 1, model.y);
    runtimeRoot = new VDOMSnapshotRoot(new DOMVDOMHost(), gameMount);
    const tree: RuntimeNode = jsx("div", { className: "snake-board" }, [
      ...Array.from({ length: segmentCount }, (_, id) =>
        jsx("i", {
          key: `segment-${id}`,
          className: "snake-segment",
          style: {
            left: bindCompiledColumn(columnX!, id, leftId, (value) =>
              `${value}px`),
            top: bindCompiledColumn(columnY!, id, topId, (value) =>
              `${value}px`),
          },
        })),
      jsx("i", {
        key: "food",
        className: "snake-food",
        style: {
          left: `${
            ((segmentCount + 70) % (boardWidth * boardWidth)) % boardWidth *
            scale
          }px`,
          top: `${
            Math.floor(
              ((segmentCount + 70) % (boardWidth * boardWidth)) / boardWidth,
            ) * scale
          }px`,
        },
      }),
    ]);
    runtimeRoot.commit(tree, bindingParticlesPlan.dependencyGraph);
  }
  segmentNodes = [...gameMount.querySelectorAll<HTMLElement>(".snake-segment")];
  mountMs = performance.now() - started;
  heapMounted = heapUsed();
};
const update = () => {
  if (arm === "react") {
    flushSync(() => {
      model!.advance(performance.now());
      store!.publish();
    });
  } else {
    model!.advance(performance.now());
    if (arm === "runtime-vdom") runtimeRoot!.setSource(progress!, frame);
    else runtimeRoot!.setColumns([columnX!, columnY!]);
  }
};
const dispose = () => {
  const started = performance.now();
  if (reactRoot) flushSync(() => reactRoot!.unmount());
  if (runtimeRoot) runtimeRoot.dispose();
  const teardownMs = performance.now() - started;
  const remainingSubscriptions = store?.subscriptionCount() ?? 0;
  const runtimeDiagnostics = runtimeRoot?.diagnostics() ?? null;
  const emptyContainer = gameMount.childElementCount === 0;
  segmentNodes = [];
  reactRoot = null;
  runtimeRoot = null;
  store = null;
  progress = null;
  columnX = null;
  columnY = null;
  model = null;
  return {
    teardownMs,
    remainingSubscriptions,
    runtimeDiagnostics,
    emptyContainer,
  };
};
const run = () => {
  runButton.disabled = true;
  frame = 0;
  measured = [];
  lastRaf = null;
  heapBefore = heapUsed();
  mount();
  const identities = [
    ...segmentNodes,
    gameMount.querySelector<HTMLElement>(".snake-food")!,
  ];
  const pageStarted = performance.now();
  const tick = (time: number) => {
    if (lastRaf !== null) {
      update();
      if (frame > warmupFrames) {
        measured.push(performance.now() - updateStarted);
      }
    }
    lastRaf = time;
    frame++;
    if (frame <= warmupFrames + measuredFrames) {
      requestAnimationFrame((nextTime) => {
        updateStarted = performance.now();
        tick(nextTime);
      });
      return;
    }
    const updateCosts = [...measured];
    const foodNode = gameMount.querySelector<HTMLElement>(".snake-food");
    const foodIndex = (segmentCount + 70) % (boardWidth * boardWidth);
    const positionMismatches = segmentNodes.flatMap((node, id) => {
      const actual = {
        x: Number.parseFloat(node.style.left),
        y: Number.parseFloat(node.style.top),
      };
      const expected = { x: model!.x[id], y: model!.y[id] };
      return Math.abs(actual.x - expected.x) <= 0.01 &&
          Math.abs(actual.y - expected.y) <= 0.01
        ? []
        : [{ id, actual, expected }];
    }).slice(0, 8);
    const foodPosition = {
      actual: {
        x: Number.parseFloat(foodNode?.style.left ?? "NaN"),
        y: Number.parseFloat(foodNode?.style.top ?? "NaN"),
      },
      expected: {
        x: foodIndex % boardWidth * scale,
        y: Math.floor(foodIndex / boardWidth) * scale,
      },
    };
    const outputMatches = segmentNodes.length === segmentCount &&
      segmentNodes.every((node, id) =>
        Math.abs(Number.parseFloat(node.style.left) - model!.x[id]) <= 0.01 &&
        Math.abs(Number.parseFloat(node.style.top) - model!.y[id]) <= 0.01
      ) &&
      Math.abs(
          Number.parseFloat(foodNode?.style.left ?? "NaN") -
            foodIndex % boardWidth * scale,
        ) <= 0.01 &&
      Math.abs(
          Number.parseFloat(foodNode?.style.top ?? "NaN") -
            Math.floor(foodIndex / boardWidth) * scale,
        ) <= 0.01;
    const allMountedNodes = [...segmentNodes, ...(foodNode ? [foodNode] : [])];
    const stableNodeIdentity = allMountedNodes.length === identities.length &&
      allMountedNodes.every((node, id) => node === identities[id]);
    const lifecycle = dispose();
    const checks = {
      measuredFrameCount: updateCosts.length === measuredFrames,
      outputMatches,
      outputMismatches: { segments: positionMismatches, food: foodPosition },
      stableNodeIdentity,
      emptyContainerAfterTeardown: lifecycle.emptyContainer,
      zeroReactSubscriptions: lifecycle.remainingSubscriptions === 0,
      zeroRuntimeRegistrations: arm === "react" ||
        Object.values(lifecycle.runtimeDiagnostics ?? {}).every((value) =>
          value === 0
        ),
    };
    const allContractsPass = Object.values(checks).every(Boolean);
    const sorted = [...updateCosts].sort((a, b) => a - b);
    const percentile = (p: number) =>
      sorted[Math.max(0, Math.ceil(p * sorted.length) - 1)] ?? null;
    const record = {
      schemaVersion: "snake-frame-lifecycle-browser-v1",
      status: allContractsPass ? "PASS" : "FAIL",
      allContractsPass,
      checks,
      trialId,
      collection,
      replication,
      arm,
      segmentCount,
      warmupFrames,
      measuredFrames: updateCosts.length,
      mountMs,
      updateCpuMs: {
        sum: updateCosts.reduce((sum, value) => sum + value, 0),
        median: percentile(0.5),
        p95: percentile(0.95),
        samples: updateCosts,
      },
      teardownMs: lifecycle.teardownMs,
      primaryCycleCostMs: mountMs +
        updateCosts.reduce((sum, value) => sum + value, 0) +
        lifecycle.teardownMs,
      heapUsedBeforeMountBytes: heapBefore,
      heapUsedAfterMountBytes: heapMounted,
      heapUsedAfterTeardownBytes: heapUsed(),
      emptyContainerAfterTeardown: lifecycle.emptyContainer,
      remainingSubscriptions: lifecycle.remainingSubscriptions,
      runtimeDiagnosticsAfterTeardown: lifecycle.runtimeDiagnostics,
      outputMatches,
      stableNodeIdentity,
      fullRafElapsedMs: performance.now() - pageStarted,
      reactVersion,
      browser: {
        userAgent: navigator.userAgent,
        visibilityState: document.visibilityState,
        hardwareConcurrency: navigator.hardwareConcurrency ?? null,
        devicePixelRatio,
        viewport: { width: innerWidth, height: innerHeight },
        buildMode: import.meta.env.MODE,
      },
      compilerPlan: {
        bindingCount: bindingParticlesPlan.bindings.length,
        graph: bindingParticlesPlan.dependencyGraph,
      },
    };
    recordNode.textContent = JSON.stringify(record, null, 2);
    statusNode.textContent = `${record.status}: lifecycle ${
      record.primaryCycleCostMs.toFixed(2)
    } ms · update median ${percentile(0.5)?.toFixed(3)} ms`;
    void fetch("/__benchmark/save-snake-lifecycle-v1", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(record),
    })
      .then(async (response) => {
        if (!response.ok) throw new Error(await response.text());
        const saved = await response.json();
        statusNode.textContent += ` · saved ${saved.filename}`;
        const sequence = Number(params.get("sequence") ?? -1);
        const next = pages[sequence + 1];
        if (scheduledAutorun && next) {
          location.assign(urlForPage(sequence + 1));
        } else if (scheduledAutorun) {
          statusNode.textContent += " · schedule complete";
        }
      })
      .catch((error) => {
        statusNode.textContent += ` · archive error ${String(error)}`;
      });
    runButton.disabled = false;
    nextButton.hidden = !params.has("sequence") || !pages[pageIndex + 1];
  };
  let updateStarted = performance.now();
  requestAnimationFrame((time) => {
    updateStarted = performance.now();
    tick(time);
  });
};
function urlForPage(index: number) {
  const page = pages[index];
  const query = new URLSearchParams({
    sequence: String(index),
    replication: String(page.replication),
    arm: page.arm,
    segments: String(page.segmentCount),
    trial:
      `lifecycle-v1-s${page.segmentCount}-r${page.replication}-${page.arm}`,
    autorun: "1",
  });
  return `/snake-lifecycle-v1-benchmark.html?${query}`;
}
runButton.addEventListener("click", run);
nextButton.addEventListener(
  "click",
  () => location.assign(urlForPage(Number(params.get("sequence") ?? -1) + 1)),
);
if (scheduledAutorun) run();
