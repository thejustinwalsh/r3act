import {
  useCallback,
  useLayoutEffect,
  useSyncExternalStore,
} from "react";
import { createRoot, type Root } from "react-dom/client";
import { flushSync, unstable_batchedUpdates } from "react-dom";
import { NumericColumn, bindCompiledColumn, jsx } from "../jsx_binding_runtime.ts";
import { DOMVDOMHost, type CompiledVDOMBindingGraph, VDOMSnapshotRoot } from "../vdom_snapshot_runtime.ts";
import { bindingParticlesPlan } from "./generated_snake_frame_plan.ts";
import { sparseV1Arms, sparseV1Pages, type SparseV1Arm } from "./snake_sparse_v1_schedule.ts";
import "./snake_frame_benchmark.css";

type Point = { x: number; y: number };
type Props = { arm: SparseV1Arm; size: number; dirtyPercent: number; locality: "clustered" | "scattered" };
type Result = {
  schemaVersion: "snake-sparse-frame-browser-v1";
  status: "PASS" | "FAIL";
  allContractsPass: boolean;
  trialId: string;
  pageLoadId: string;
  replication: number;
  arm: SparseV1Arm;
  size: number;
  dirtyPercent: number;
  dirtyCount: number;
  locality: Props["locality"];
  warmupFrames: number;
  measuredFrames: number;
  mountMs: number;
  stableNodeCount: boolean;
  stableNodeIdentity: boolean;
  finalOutputParity: boolean;
  completeCommitCoverage: boolean;
  samples: Array<{ frame: number; intervalMs: number; updateCpuMs: number; commitMs: number }>;
  browser: { userAgent: string; platform: string; hardwareConcurrency: number; devicePixelRatio: number; visibilityState: string; buildMode: string };
};

const query = new URLSearchParams(location.search);
const props: Props = {
  arm: query.get("arm") as SparseV1Arm,
  size: Number(query.get("size")),
  dirtyPercent: Number(query.get("density")),
  locality: query.get("locality") as Props["locality"],
};
const trialId = query.get("trial") ?? crypto.randomUUID();
const pageLoadId = crypto.randomUUID();
const replication = Number(query.get("replication") ?? 1);
const sequence = Number(query.get("sequence") ?? -1);
const autoplay = query.get("autoplay") === "1";
const warmupFrames = 30;
const measuredFrames = 60;
const dirtyCount = Math.max(1, Math.floor(props.size * props.dirtyPercent / 100));
if (!sparseV1Arms.includes(props.arm) || ![512, 4096].includes(props.size) ||
  ![1, 10, 50, 100].includes(props.dirtyPercent) ||
  !["clustered", "scattered"].includes(props.locality) ||
  !Number.isInteger(replication) || replication < 1 || replication > 3) {
  throw new Error("Invalid sparse frame benchmark page parameters");
}

const rootElement = document.getElementById("root")!;
rootElement.innerHTML = `<main class="snake-app"><header class="snake-header"><div><p class="eyebrow">Per-frame sparse updates · ${props.arm}</p><h1>Snake workload, sparse motion</h1><p>Each animation frame updates ${dirtyCount.toLocaleString()} of ${props.size.toLocaleString()} stable entities (${props.dirtyPercent}%, ${props.locality}). Dirty worklist construction and host updates are timed together.</p></div><div class="score-panel"><span>ENTITIES</span><strong>${props.size.toLocaleString()}</strong><span>DIRTY / FRAME</span><strong>${dirtyCount.toLocaleString()}</strong></div></header><section class="snake-layout"><div class="board-shell"><div id="game" class="game-mount"></div></div><aside class="game-controls"><h2>Frame study</h2><p id="status" class="status" aria-live="polite">${autoplay ? "Starting scheduled run…" : "Ready to run."}</p><button id="run" type="button">Run ${measuredFrames} frames</button><button id="save" type="button">Save result</button><details><summary>Latest result</summary><pre id="record">No run yet.</pre></details></aside></section></main>`;

const mount = document.getElementById("game")!;
const status = document.getElementById("status")!;
const recordNode = document.getElementById("record")!;
const xValues = new Float64Array(props.size);
const yValues = new Float64Array(props.size);
const expectedX = new Float64Array(props.size);
const expectedY = new Float64Array(props.size);
const dirtyRows = new Uint32Array(dirtyCount);
const bucketCapacity = Math.ceil(props.size / 32);
const dirtyBuckets = new Uint32Array(bucketCapacity);
const bucketStamps = new Uint32Array(bucketCapacity);
let bucketEpoch = 0;
const permutation = new Uint32Array(props.size);
for (let id = 0; id < props.size; id++) permutation[id] = id;
let randomState = (props.size * 31 + props.dirtyPercent * 997 + (props.locality === "scattered" ? 17 : 3)) >>> 0;
for (let index = permutation.length - 1; index > 0; index--) {
  randomState ^= randomState << 13;
  randomState ^= randomState >>> 17;
  randomState ^= randomState << 5;
  const other = (randomState >>> 0) % (index + 1);
  [permutation[index], permutation[other]] = [permutation[other], permutation[index]];
}

const columns = [new NumericColumn(0, 0, xValues), new NumericColumn(1, 1, yValues)];
const leftBindingId = bindingParticlesPlan.bindings.findIndex((binding) => binding.property === "left");
const topBindingId = bindingParticlesPlan.bindings.findIndex((binding) => binding.property === "top");
if (leftBindingId < 0 || topBindingId < 0) throw new Error("Compiled left/top bindings are missing");

class Store {
  snapshots: Point[] = Array.from({ length: props.size }, () => ({ x: 0, y: 0 }));
  listeners = Array.from({ length: props.size }, () => new Set<() => void>());
  frameListeners = new Set<() => void>();
  frame = 0;
  getSnapshot = (id: number) => this.snapshots[id];
  subscribe = (id: number, listener: () => void) => { this.listeners[id].add(listener); return () => this.listeners[id].delete(listener); };
  getFrame = () => this.frame;
  subscribeFrame = (listener: () => void) => { this.frameListeners.add(listener); return () => this.frameListeners.delete(listener); };
  publish(rows: Uint32Array, count: number, frame: number) {
    this.frame = frame;
    unstable_batchedUpdates(() => {
      for (let index = 0; index < count; index++) {
        const id = rows[index];
        this.snapshots[id] = { x: xValues[id], y: yValues[id] };
        for (const listener of this.listeners[id]) listener();
      }
      for (const listener of this.frameListeners) listener();
    });
  }
}

const store = new Store();
function ReactSegment({ id }: { id: number }) {
  const subscribe = useCallback((listener: () => void) => store.subscribe(id, listener), [id]);
  const getSnapshot = useCallback(() => store.getSnapshot(id), [id]);
  const point = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  return <i className={id === 0 ? "snake-segment snake-head" : "snake-segment"} style={{ left: `${point.x}px`, top: `${point.y}px` }} />;
}
function CommitMarker() {
  const frame = useSyncExternalStore(store.subscribeFrame, store.getFrame, store.getFrame);
  useLayoutEffect(() => { if (frame > 0) committedFrames++; committedFrame = frame; }, [frame]);
  return null;
}
function ReactBoard() {
  return <><div className="snake-board">{Array.from({ length: props.size }, (_, id) => <ReactSegment key={id} id={id} />)}</div><CommitMarker /></>;
}

const graph = bindingParticlesPlan.dependencyGraph as CompiledVDOMBindingGraph;
let reactRoot: Root | null = null;
let vdomRoot: VDOMSnapshotRoot<Node, Node> | null = null;
let nodes: HTMLElement[] = [];
let committedFrame = 0;
let committedFrames = 0;
let rafId = 0;
let frame = 0;
let previousRaf: number | null = null;
let mountMs = 0;
let samples: Result["samples"] = [];
let result: Result | null = null;
let running = false;

const tree = () => jsx("div", { className: "snake-board" }, Array.from({ length: props.size }, (_, id) => jsx("i", {
  key: `entity-${id}`,
  className: id === 0 ? "snake-segment snake-head" : "snake-segment",
  style: {
    left: bindCompiledColumn(columns[0], id, leftBindingId, (value) => `${value}px`),
    top: bindCompiledColumn(columns[1], id, topBindingId, (value) => `${value}px`),
  },
})));

const mountArm = () => {
  const started = performance.now();
  if (props.arm === "react") {
    reactRoot = createRoot(mount);
    flushSync(() => reactRoot!.render(<ReactBoard />));
  } else if (props.arm === "direct") {
    const board = document.createElement("div");
    board.className = "snake-board";
    const fragment = document.createDocumentFragment();
    for (let id = 0; id < props.size; id++) {
      const node = document.createElement("i");
      node.className = id === 0 ? "snake-segment snake-head" : "snake-segment";
      node.style.left = "0px";
      node.style.top = "0px";
      fragment.append(node);
    }
    board.append(fragment);
    mount.replaceChildren(board);
  } else {
    vdomRoot = new VDOMSnapshotRoot(new DOMVDOMHost(), mount);
    vdomRoot.commit(tree(), graph);
  }
  nodes = [...mount.querySelectorAll<HTMLElement>(".snake-segment")];
  mountMs = performance.now() - started;
};
mountArm();

const buildDirtyRows = () => {
  for (let index = 0; index < dirtyCount; index++) {
    dirtyRows[index] = props.locality === "clustered" ? index : permutation[index];
  }
};
const buildBuckets = () => {
  bucketEpoch = (bucketEpoch + 1) >>> 0;
  if (bucketEpoch === 0) { bucketStamps.fill(0); bucketEpoch = 1; }
  let count = 0;
  const bucketSize = props.arm === "bucket-32-vdom" ? 32 : 128;
  for (let index = 0; index < dirtyCount; index++) {
    const bucket = Math.floor(dirtyRows[index] / bucketSize);
    if (bucketStamps[bucket] !== bucketEpoch) {
      bucketStamps[bucket] = bucketEpoch;
      dirtyBuckets[count++] = bucket;
    }
  }
  return count;
};
const coordinate = (id: number, tick: number): Point => ({
  x: ((id * 13 + tick * 7) % 624),
  y: ((id * 19 + tick * 11) % 624),
});
const updateValues = (tick: number) => {
  for (let index = 0; index < dirtyCount; index++) {
    const id = dirtyRows[index];
    const point = coordinate(id, tick);
    xValues[id] = expectedX[id] = point.x;
    yValues[id] = expectedY[id] = point.y;
  }
};

const update = (tick: number) => {
  buildDirtyRows();
  updateValues(tick);
  if (props.arm === "react") {
    flushSync(() => store.publish(dirtyRows, dirtyCount, tick));
    return;
  }
  if (props.arm === "direct") {
    for (let index = 0; index < dirtyCount; index++) {
      const id = dirtyRows[index];
      nodes[id].style.left = `${xValues[id]}px`;
      nodes[id].style.top = `${yValues[id]}px`;
    }
    return;
  }
  if (props.arm === "dense-vdom") vdomRoot!.setColumns(columns);
  else if (props.arm === "dirty-rows-vdom") vdomRoot!.setColumnRows(columns, dirtyRows, dirtyCount);
  else {
    const bucketSize = props.arm === "bucket-32-vdom" ? 32 : 128;
    const count = buildBuckets();
    vdomRoot!.setColumnBuckets(columns, dirtyBuckets, count, bucketSize);
  }
};

const finish = async () => {
  const stableNodeCount = nodes.length === props.size && mount.querySelectorAll(".snake-segment").length === props.size;
  const current = [...mount.querySelectorAll<HTMLElement>(".snake-segment")];
  const stableNodeIdentity = current.length === nodes.length && current.every((node, id) => node === nodes[id]);
  const finalOutputParity = nodes.every((node, id) =>
    Number.parseFloat(node.style.left) === expectedX[id] && Number.parseFloat(node.style.top) === expectedY[id]
  );
  const completeCommitCoverage = props.arm !== "react" || (committedFrame === frame && committedFrames === frame);
  const allContractsPass = samples.length === measuredFrames && stableNodeCount && stableNodeIdentity && finalOutputParity && completeCommitCoverage;
  result = {
    schemaVersion: "snake-sparse-frame-browser-v1",
    status: allContractsPass ? "PASS" : "FAIL",
    allContractsPass,
    trialId,
    pageLoadId,
    replication,
    arm: props.arm,
    size: props.size,
    dirtyPercent: props.dirtyPercent,
    dirtyCount,
    locality: props.locality,
    warmupFrames,
    measuredFrames: samples.length,
    mountMs,
    stableNodeCount,
    stableNodeIdentity,
    finalOutputParity,
    completeCommitCoverage,
    samples,
    browser: {
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      hardwareConcurrency: navigator.hardwareConcurrency,
      devicePixelRatio: window.devicePixelRatio,
      visibilityState: document.visibilityState,
      buildMode: import.meta.env.MODE,
    },
  };
  recordNode.textContent = JSON.stringify(result, null, 2);
  status.textContent = allContractsPass ? "PASS · frame updates, identity and final values agree" : "FAIL · contract mismatch";
  running = false;
  if (query.get("archive") === "1" && allContractsPass) {
    const response = await fetch("/__benchmark/save-snake-sparse-frame-v1", {
      method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(result),
    });
    if (!response.ok) throw new Error(`Archive rejected: ${await response.text()}`);
    status.textContent += ` · ${(await response.json()).filename}`;
    const nextPage = sequence >= 0 ? sparseV1Pages()[sequence + 1] : undefined;
    if (autoplay && nextPage) {
      const nextUrl = new URL(location.href);
      nextUrl.searchParams.set("arm", nextPage.arm);
      nextUrl.searchParams.set("size", String(nextPage.size));
      nextUrl.searchParams.set("density", String(nextPage.dirtyPercent));
      nextUrl.searchParams.set("locality", nextPage.locality);
      nextUrl.searchParams.set("replication", String(nextPage.replication));
      nextUrl.searchParams.set("trial", nextPage.trialId);
      nextUrl.searchParams.set("sequence", String(nextPage.sequence));
      setTimeout(() => location.replace(nextUrl), 250);
    }
  }
};

const onFrame = (time: number) => {
  if (!running) return;
  const intervalMs = previousRaf === null ? 0 : time - previousRaf;
  previousRaf = time;
  const started = performance.now();
  frame++;
  update(frame);
  const end = performance.now();
  if (frame > warmupFrames) {
    samples.push({ frame, intervalMs, updateCpuMs: end - started, commitMs: end - started });
  }
  if (frame >= warmupFrames + measuredFrames) void finish();
  else rafId = requestAnimationFrame(onFrame);
};
const run = () => {
  if (running) return;
  frame = 0;
  previousRaf = null;
  committedFrames = 0;
  samples = [];
  result = null;
  running = true;
  status.textContent = "Measuring dirty-row construction and commit…";
  rafId = requestAnimationFrame(onFrame);
};
document.getElementById("run")!.addEventListener("click", run);
document.getElementById("save")!.addEventListener("click", async () => {
  if (!result) { status.textContent = "Run the frame study first."; return; }
  const response = await fetch("/__benchmark/save-snake-sparse-frame-v1", {
    method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(result),
  });
  status.textContent = response.ok ? `Saved ${(await response.json()).filename}` : `Save failed: ${await response.text()}`;
});
if (autoplay) run();

declare global { interface Window { __snakeSparseFrameResult?: Result } }
Object.defineProperty(window, "__snakeSparseFrameResult", { get: () => result });
