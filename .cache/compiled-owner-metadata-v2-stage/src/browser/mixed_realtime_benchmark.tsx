import {
  useCallback,
  useLayoutEffect,
  useState,
  useSyncExternalStore,
  version as reactVersion,
} from "react";
import { createRoot, type Root } from "react-dom/client";
import { flushSync, unstable_batchedUpdates } from "react-dom";
import {
  bind,
  bindSources,
  jsx,
  type RuntimeNode,
  ScalarSource,
} from "../jsx_binding_runtime.ts";
import { DOMVDOMHost, VDOMSnapshotRoot } from "../vdom_snapshot_runtime.ts";
import {
  mixedRealtimeMeasuredFrames,
  mixedRealtimePages,
  mixedRealtimeTopologyEvery,
  mixedRealtimeWarmupFrames,
} from "./mixed_realtime_schedule.ts";
import "./mixed_realtime_benchmark.css";

type Arm = "react" | "runtime";
type Entity = { id: number; x: number; y: number; rotation: number };
type Snapshot = Entity & { frame: number };
type Sample = {
  frame: number;
  intervalMs: number;
  updateCpuMs: number;
  commitMs: number | null;
  structural: boolean;
  entityCount: number;
};

const params = new URLSearchParams(location.search);
const arm = (params.get("arm") ?? "runtime") as Arm;
const collection = params.get("collection") ?? "pilot";
const sequence = Number(params.get("sequence") ?? -1);
const pages = mixedRealtimePages();
const scheduledPage = collection === "mixed-v1" ? pages[sequence] : undefined;
if (collection === "mixed-v1" && !scheduledPage) throw new Error("Invalid mixed-v1 schedule sequence");
const entityCount = scheduledPage?.entityCount ?? Number(params.get("entities") ?? 256);
const measuredFrames = scheduledPage ? mixedRealtimeMeasuredFrames : Number(params.get("frames") ?? 240);
const warmupFrames = scheduledPage ? mixedRealtimeWarmupFrames : 45;
const trialId = scheduledPage?.trialId ?? params.get("trial") ?? crypto.randomUUID();
if (!["react", "runtime"].includes(arm)) throw new Error("arm must be react or runtime");
if (scheduledPage && scheduledPage.arm !== arm) throw new Error("Arm does not match schedule");
if (![128, 256, 512, 1024].includes(entityCount)) throw new Error("entities must be 128, 256, 512, or 1024");
if (![120, 240, 600].includes(measuredFrames)) throw new Error("frames must be 120, 240, or 600");

const initialIds = Array.from({ length: entityCount }, (_, id) => id);
const records = new Map<number, Entity>();
const sourceById = new Map<number, { x: ScalarSource; y: ScalarSource; rotation: ScalarSource }>();
let nextId = entityCount;
let currentFrame = 0;
let currentStartedAt = 0;
const startedAtByFrame = new Map<number, number>();
let currentStructural = false;
let setReactIds: ((ids: number[]) => void) | null = null;

const stateFor = (id: number, frame: number): Entity => ({
  id,
  x: (id * 17 + frame * 2) % 760,
  y: (id * 29 + frame * 3) % 500,
  rotation: (id * 7 + frame * 4) % 360,
});

class EntityStore {
  snapshots = new Map<number, Snapshot>();
  listeners = new Map<number, Set<() => void>>();
  frame = { value: 0 };
  frameListeners = new Set<() => void>();
  completed = new Map<number, number>();

  constructor(ids: number[]) {
    for (const id of ids) {
      const value = stateFor(id, 0);
      records.set(id, value);
      this.snapshots.set(id, { ...value, frame: 0 });
      this.listeners.set(id, new Set());
    }
  }
  get = (id: number) => this.snapshots.get(id)!;
  subscribe = (id: number, listener: () => void) => {
    let listeners = this.listeners.get(id);
    if (!listeners) this.listeners.set(id, listeners = new Set());
    listeners.add(listener);
    return () => listeners!.delete(listener);
  };
  getFrame = () => this.frame;
  subscribeFrame = (listener: () => void) => {
    this.frameListeners.add(listener);
    return () => this.frameListeners.delete(listener);
  };
  publish(ids: number[], frame: number) {
    this.frame = { value: frame };
    for (const id of ids) {
      const value = stateFor(id, frame);
      records.set(id, value);
      this.snapshots.set(id, { ...value, frame });
    }
    unstable_batchedUpdates(() => {
      for (const id of ids) for (const listener of this.listeners.get(id) ?? []) listener();
      for (const listener of this.frameListeners) listener();
    });
  }
}

let store: EntityStore;
function ReactEntity({ id }: { id: number }) {
  const subscribe = useCallback((listener: () => void) => store.subscribe(id, listener), [id]);
  const getSnapshot = useCallback(() => store.get(id), [id]);
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  return <i className="entity" data-id={id} style={{ left: snapshot.x, top: snapshot.y, transform: `rotate(${snapshot.rotation}deg)` }} />;
}
function ReactCommitMarker() {
  const snapshot = useSyncExternalStore(store.subscribeFrame, store.getFrame, store.getFrame);
  useLayoutEffect(() => {
    const startedAt = startedAtByFrame.get(snapshot.value);
    if (startedAt !== undefined) store.completed.set(snapshot.value, performance.now() - startedAt);
  }, [snapshot]);
  return null;
}
function ReactBoard({ initial }: { initial: number[] }) {
  const [ids, updateIds] = useState(initial);
  setReactIds = updateIds;
  return <><div className="board">{ids.map((id) => <ReactEntity key={id} id={id} />)}</div><ReactCommitMarker /></>;
}

const sourceFor = (id: number) => {
  let sources = sourceById.get(id);
  if (!sources) {
    const value = records.get(id) ?? stateFor(id, currentFrame);
    sources = {
      x: new ScalarSource(id * 3, value.x),
      y: new ScalarSource(id * 3 + 1, value.y),
      rotation: new ScalarSource(id * 3 + 2, value.rotation),
    };
    sourceById.set(id, sources);
  }
  return sources;
};
const runtimeTree = (ids: number[]): RuntimeNode => jsx("div", { className: "board" }, ids.map((id) => {
  const sources = sourceFor(id);
  return jsx("i", {
    key: id,
    className: "entity",
    "data-id": id,
    style: {
      left: bind(sources.x, (value) => `${value}px`),
      top: bind(sources.y, (value) => `${value}px`),
      transform: bindSources([sources.rotation], ([rotation]) => `rotate(${rotation}deg)`),
    },
  });
}));

document.getElementById("root")!.innerHTML = `
  <main class="app">
    <header><div><p>Research pilot · ${arm} arm</p><h1>Mixed real-time workload</h1>
    <p>Every animation frame updates three declarative props on every entity. Every 30 measured frames, the keyed collection removes, inserts, and reorders entities.</p></div>
    <div class="meta"><b>${entityCount}</b><span>entities</span><b>${measuredFrames}</b><span>measured frames</span></div></header>
    <section class="board-shell"><div id="mount"></div></section>
    <p id="status">Warming up…</p><pre id="record">No record yet.</pre>
    <button id="download" disabled>Download raw record</button>
  </main>`;
const mount = document.getElementById("mount")!;
const status = document.getElementById("status")!;
const recordNode = document.getElementById("record")!;
const entityIds = [...initialIds];
store = new EntityStore(entityIds);
let reactRoot: Root | null = null;
let runtimeRoot: VDOMSnapshotRoot<Node, Node> | null = null;
const mountStartedAt = performance.now();
if (arm === "react") {
  reactRoot = createRoot(mount);
  flushSync(() => reactRoot!.render(<ReactBoard initial={entityIds} />));
} else {
  runtimeRoot = new VDOMSnapshotRoot(new DOMVDOMHost(), mount);
  runtimeRoot.commit(runtimeTree(entityIds), null, true);
}
const mountMs = performance.now() - mountStartedAt;
let warmFrame = 0;
let previousRaf: number | null = null;
let samples: Sample[] = [];
let pendingSample: Omit<Sample, "commitMs"> | null = null;
let lastStructureNodes = new Map<number, Element>();
let structureIdentityPass = true;
let outputParity = true;
let stableNodeCount = true;
let finalRecord: Record<string, unknown> | null = null;

const changeTopology = (ids: number[]) => {
  const oldNodes = new Map<number, Element>();
  mount.querySelectorAll<HTMLElement>(".entity").forEach((node) => oldNodes.set(Number(node.dataset.id), node));
  const survivors = ids.slice(8);
  const inserted = Array.from({ length: 8 }, () => nextId++);
  for (const id of inserted) {
    const value = stateFor(id, currentFrame);
    records.set(id, value);
    store.snapshots.set(id, { ...value, frame: currentFrame });
    store.listeners.set(id, new Set());
    sourceFor(id);
  }
  const next = [...survivors, ...inserted];
  const offset = Math.min(13, next.length - 1);
  const reordered = [...next.slice(offset), ...next.slice(0, offset)];
  mount.querySelectorAll<HTMLElement>(".entity").forEach((node) => lastStructureNodes.set(Number(node.dataset.id), node));
  if (arm === "react") {
    flushSync(() => setReactIds?.(reordered));
  } else {
    runtimeRoot!.commit(runtimeTree(reordered), null);
  }
  const newNodes = new Map<number, Element>();
  mount.querySelectorAll<HTMLElement>(".entity").forEach((node) => newNodes.set(Number(node.dataset.id), node));
  for (const [id, node] of oldNodes) if (reordered.includes(id) && newNodes.get(id) !== node) structureIdentityPass = false;
  if (newNodes.size !== entityCount) stableNodeCount = false;
  return reordered;
};

const verifyOutput = (ids: number[], frame: number) => {
  const nodes = [...mount.querySelectorAll<HTMLElement>(".entity")];
  if (nodes.length !== ids.length) return false;
  const byId = new Map(nodes.map((node) => [Number(node.dataset.id), node]));
  return ids.every((id) => {
    const node = byId.get(id);
    if (!node) return false;
    const expected = stateFor(id, frame);
    return Math.abs(parseFloat(node.style.left) - expected.x) < 0.02 &&
      Math.abs(parseFloat(node.style.top) - expected.y) < 0.02 &&
      node.style.transform === `rotate(${expected.rotation}deg)`;
  });
};

const finish = () => {
  outputParity = verifyOutput(entityIds, currentFrame);
  const completeCommitCoverage = samples.every((sample) => sample.commitMs !== null);
  const percentile = (values: number[], p: number) => {
    const sorted = [...values].sort((a, b) => a - b);
    return sorted[Math.max(0, Math.ceil(p * sorted.length) - 1)];
  };
  const summarize = (subset: Sample[]) => {
    const values = subset.map((sample) => sample.commitMs).filter((value): value is number => value !== null);
    return values.length ? { count: values.length, medianMs: percentile(values, 0.5), p95Ms: percentile(values, 0.95) } : null;
  };
  const record = {
    schemaVersion: "mixed-realtime-browser-v1",
    status: outputParity && stableNodeCount && structureIdentityPass && completeCommitCoverage ? "PASS" : "FAIL",
    trialId,
    collection,
    sequence: scheduledPage?.sequence ?? null,
    replication: scheduledPage?.replication ?? null,
    arm,
    entityCount,
    measuredFrames: samples.length,
    warmupFrames,
    topologyEveryMeasuredFrames: mixedRealtimeTopologyEvery,
    mountMs,
    reactVersion,
    buildMode: import.meta.env.MODE,
    browser: { userAgent: navigator.userAgent, visibilityState: document.visibilityState, hardwareConcurrency: navigator.hardwareConcurrency ?? null },
    outputParity,
    stableNodeCount,
    structureIdentityPass,
    structuralSamples: samples.filter((sample) => sample.structural).length,
    completeCommitCoverage,
    commitLatencySummary: {
      all: summarize(samples),
      ordinaryFrames: summarize(samples.filter((sample) => !sample.structural)),
      structuralFrames: summarize(samples.filter((sample) => sample.structural)),
    },
    updateCpuSummary: {
      medianMs: percentile(samples.map((sample) => sample.updateCpuMs), 0.5),
      p95Ms: percentile(samples.map((sample) => sample.updateCpuMs), 0.95),
    },
    rafIntervalP95Ms: percentile(samples.map((sample) => sample.intervalMs), 0.95),
    samples,
  };
  finalRecord = record;
  recordNode.textContent = JSON.stringify(record, null, 2);
  const allLatency = record.commitLatencySummary.all!;
  const structuralLatency = record.commitLatencySummary.structuralFrames!;
  status.textContent = `${record.status}: update→commit median/p95 ${allLatency.medianMs.toFixed(2)}/${allLatency.p95Ms.toFixed(2)} ms; structural median/p95 ${structuralLatency?.medianMs.toFixed(2) ?? "n/a"}/${structuralLatency?.p95Ms.toFixed(2) ?? "n/a"} ms; RAF interval p95 ${record.rafIntervalP95Ms.toFixed(2)} ms.`;
  (document.getElementById("download") as HTMLButtonElement).disabled = false;
  (window as any).__mixedRealtimeRecord = record;
  if (record.status === "PASS") {
    void fetch("/__benchmark/save-mixed-realtime", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(record),
    }).then(async (response) => {
      if (!response.ok) throw new Error(await response.text());
      const saved = await response.json();
      status.textContent += ` Saved ${saved.filename}.`;
      if (collection === "mixed-v1") {
        const next = pages[sequence + 1];
        if (next) {
          const query = new URLSearchParams({
            collection: "mixed-v1",
            sequence: String(next.sequence),
            arm: next.arm,
          });
          status.textContent += ` Starting ${next.sequence + 1}/${pages.length}.`;
          location.assign(`/mixed-realtime-benchmark.html?${query}`);
        } else {
          status.textContent += " Study schedule complete.";
        }
      }
    }).catch((error) => {
      status.textContent += ` Save failed: ${String(error)}.`;
    });
  }
};
document.getElementById("download")!.addEventListener("click", () => {
  if (!finalRecord) return;
  const blob = new Blob([JSON.stringify(finalRecord, null, 2)], { type: "application/json" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `mixed-realtime-${arm}-${trialId}.json`;
  link.click();
  URL.revokeObjectURL(link.href);
});

const raf = (time: number) => {
  const frame = ++warmFrame;
  const intervalMs = previousRaf === null ? 0 : time - previousRaf;
  previousRaf = time;
  if (pendingSample) {
    const commitMs = arm === "runtime"
      ? pendingSample.updateCpuMs
      : store.completed.get(pendingSample.frame) ?? null;
    if (commitMs !== null || frame - pendingSample.frame >= 2) {
      samples.push({ ...pendingSample, commitMs });
      pendingSample = null;
    }
  }
  if (samples.length >= measuredFrames) {
    requestAnimationFrame(() => requestAnimationFrame(finish));
    return;
  }
  currentFrame = frame;
  currentStartedAt = performance.now();
  const start = currentStartedAt;
  startedAtByFrame.set(frame, start);
  const structural = frame > warmupFrames && (frame - warmupFrames) % mixedRealtimeTopologyEvery === 0;
  currentStructural = structural;
  const nextIds = structural ? changeTopology(entityIds) : entityIds;
  if (structural) entityIds.splice(0, entityIds.length, ...nextIds);
  const updates: Array<readonly [ScalarSource, number]> = [];
  for (const id of entityIds) {
    const value = stateFor(id, frame);
    records.set(id, value);
    if (arm === "runtime") {
      const sources = sourceFor(id);
      updates.push([sources.x, value.x], [sources.y, value.y], [sources.rotation, value.rotation]);
    }
  }
  if (arm === "react") {
    if (structural) flushSync(() => store.publish(entityIds, frame));
    else store.publish(entityIds, frame);
  } else {
    runtimeRoot!.setSources(updates);
  }
  const updateCpuMs = performance.now() - start;
  const withinMeasurement = frame > warmupFrames;
  if (withinMeasurement) {
    if (!pendingSample) pendingSample = { frame, intervalMs, updateCpuMs, structural, entityCount: entityIds.length };
  }
  requestAnimationFrame(raf);
};
requestAnimationFrame(raf);

declare global { interface Window { __mixedRealtimeRecord?: Record<string, unknown>; } }
