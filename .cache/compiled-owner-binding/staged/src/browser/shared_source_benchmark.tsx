import { useCallback, useSyncExternalStore } from "react";
import { createRoot, type Root } from "react-dom/client";
import { flushSync } from "react-dom";
import { mountRepeatedHostPlan, mountRepeatedHostPlanCsr, type RepeatedPlanSource } from "../compiled_plan_runtime.ts";
import {
  bindingParticlesPlan as sharedPlan,
  mountGeneratedBindingParticles,
} from "./generated_shared_source_plan.ts";
import "./style.css";

type Arm = "react" | "csr" | "dense" | "generated" | "scan" | "scanGuarded";
type Mode = "local" | "shared" | "mixed";
type Pair = { pair: number; order: Arm[]; timingsMs: Record<Arm, number>; valuesMatch: boolean; repeats: number };
const ARMS: Arm[] = ["react", "csr", "dense", "generated", "scan", "scanGuarded"];
const MODES: Mode[] = ["local", "shared", "mixed"];

class SharedStore {
  readonly x: Float64Array;
  readonly xListeners: Array<Set<() => void>>;
  alpha = 0.4;
  readonly alphaListeners = new Set<() => void>();

  constructor(count: number) {
    this.x = new Float64Array(count);
    this.xListeners = Array.from({ length: count }, () => new Set());
  }
  getX = (id: number) => this.x[id];
  getAlpha = () => this.alpha;
  subscribeX = (id: number, listener: () => void) => {
    this.xListeners[id].add(listener);
    return () => this.xListeners[id].delete(listener);
  };
  subscribeAlpha = (listener: () => void) => {
    this.alphaListeners.add(listener);
    return () => this.alphaListeners.delete(listener);
  };
  setX(id: number, value: number) {
    if (Object.is(this.x[id], value)) return;
    this.x[id] = value;
    for (const listener of this.xListeners[id]) listener();
  }
  setAlpha(value: number) {
    if (Object.is(this.alpha, value)) return;
    this.alpha = value;
    for (const listener of this.alphaListeners) listener();
  }
}

function ReactNode({ id, store }: { id: number; store: SharedStore }) {
  const subscribeX = useCallback((listener: () => void) => store.subscribeX(id, listener), [id, store]);
  const getX = useCallback(() => store.getX(id), [id, store]);
  const x = useSyncExternalStore(subscribeX, getX, getX);
  const alpha = useSyncExternalStore(store.subscribeAlpha, store.getAlpha, store.getAlpha);
  return <span
    className="scene-node"
    style={{ left: `${x}px`, transform: `translateX(${x}px)`, opacity: alpha }}
  />;
}

function balancedOrders(random: () => number, blocks: number): Arm[][] {
  const out: Arm[][] = [];
  const seen = new Set<string>();
  while (out.length < blocks * ARMS.length) {
    const base = [...ARMS];
    for (let i = base.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [base[i], base[j]] = [base[j], base[i]];
    }
    const rotations = base.map((_, offset) => [...base.slice(offset), ...base.slice(0, offset)]);
    if (rotations.some((order) => seen.has(order.join(",")))) continue;
    for (const order of rotations) {
      seen.add(order.join(","));
      out.push(order);
    }
  }
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

const percentile = (values: number[], p: number) => {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.max(0, Math.ceil(p * sorted.length) - 1)];
};
const freshSeed = () => crypto.getRandomValues(new Uint32Array(1))[0] || 1;
const storageKey = "shared-source-ui-benchmark-v3";
const pageLoadId = crypto.randomUUID();
const readResults = (): unknown[] => {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(storageKey) ?? "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch { return []; }
};

const rootNode = document.getElementById("root")!;
rootNode.innerHTML = `
  <main>
    <header>
      <p class="eyebrow">Research prototype · OXC local + shared source plan</p>
      <h1>One shared input, many hosts</h1>
      <p>Every leaf reads local <code>x</code> for <code>left</code>/<code>transform</code> and shared <code>alpha</code> for <code>opacity</code>. Compare React subscriptions, CSR, a dense plan interpreter, compiler-generated property writers, and eager/guarded full scans. This measures synchronous update plus host commit; paint is excluded.</p>
    </header>
    <section class="controls" aria-label="Benchmark controls">
      <label>Entities <select id="count"><option value="1000">1,000</option><option value="5000">5,000</option><option value="10000" selected>10,000</option></select></label>
      <label>Local change fraction <select id="fraction"><option value="0.01">1%</option><option value="0.1" selected>10%</option><option value="1">100%</option></select></label>
      <label>Update pattern <select id="mode"><option value="local">Local only</option><option value="shared">Shared only</option><option value="mixed" selected>Local + shared</option></select></label>
      <label>Order seed <input id="seed" type="number" min="1" max="4294967295" step="1" placeholder="random"></label>
      <button id="run" type="button">Run paired six-arm study</button>
      <button id="export" type="button">Export saved records</button>
    </section>
    <p id="result" class="result" aria-live="polite">Mounting six equivalent fields…</p>
    <details><summary>Latest raw timing record</summary><pre id="record">Run a scenario to populate paired samples.</pre></details>
    <div class="prototype-fields">
      <section><h2>React · local + shared subscriptions</h2><div id="react-field" class="field"></div></section>
      <section><h2>Generated plan · CSR</h2><div id="csr-field" class="field"></div></section>
      <section><h2>Plan interpreter · dense</h2><div id="dense-field" class="field"></div></section>
      <section><h2>Compiler-generated writers</h2><div id="generated-field" class="field"></div></section>
      <section><h2>Eager full scan</h2><div id="scan-field" class="field"></div></section>
      <section><h2>Guarded full scan</h2><div id="scanGuarded-field" class="field"></div></section>
    </div>
    <aside><strong>Graph:</strong> <code>node.x → left, transform</code>; <code>props.alpha → opacity on every repeated host</code>. The guarded scan still visits every host and derives every output, but it calls a style setter only when the string changes.</aside>
  </main>`;

const resultNode = document.getElementById("result")!;
const countNode = document.getElementById("count") as HTMLSelectElement;
const fractionNode = document.getElementById("fraction") as HTMLSelectElement;
const modeNode = document.getElementById("mode") as HTMLSelectElement;
const fields = Object.fromEntries(ARMS.map((arm) => [arm, document.getElementById(`${arm}-field`) as HTMLElement])) as Record<Arm, HTMLElement>;
let reactRoot: Root | null = null;
let store: SharedStore | null = null;
let rows: RepeatedPlanSource[] = [];
let csrMount: ReturnType<typeof mountRepeatedHostPlanCsr> | null = null;
let denseMount: ReturnType<typeof mountRepeatedHostPlan> | null = null;
let generatedMount: ReturnType<typeof mountGeneratedBindingParticles> | null = null;
let targets: Record<Arm, HTMLElement[]> = { react: [], csr: [], dense: [], generated: [], scan: [], scanGuarded: [] };
let scanX = new Float64Array(0);
let scanAlpha = 0.4;
let guardedScanX = new Float64Array(0);
let guardedScanAlpha = 0.4;
let setupMs: Record<Arm, number> = { react: 0, csr: 0, dense: 0, generated: 0, scan: 0, scanGuarded: 0 };

function mount(count: number) {
  csrMount?.dispose(); denseMount?.dispose(); generatedMount?.dispose();
  if (reactRoot) flushSync(() => reactRoot!.unmount());
  for (const field of Object.values(fields)) field.replaceChildren();
  const freshStore = new SharedStore(count);
  const freshRows = Array.from({ length: count }, (_, id) => ({ id, values: [id % 320] }));
  for (const row of freshRows) freshStore.x[row.id] = row.values[0];
  const startedReact = performance.now();
  const freshRoot = createRoot(fields.react);
  flushSync(() => freshRoot.render(
    <section className="scene">
      {freshRows.map(({ id }) => <ReactNode key={id} id={id} store={freshStore} />)}
    </section>,
  ));
  const reactMs = performance.now() - startedReact;
  const startedCsr = performance.now();
  const freshCsr = mountRepeatedHostPlanCsr(freshRows, fields.csr, sharedPlan, [freshStore.alpha]);
  const csrMs = performance.now() - startedCsr;
  const startedDense = performance.now();
  const freshDense = mountRepeatedHostPlan(freshRows, fields.dense, sharedPlan, [freshStore.alpha]);
  const denseMs = performance.now() - startedDense;
  const startedGenerated = performance.now();
  const freshGenerated = mountGeneratedBindingParticles(freshRows, fields.generated, [freshStore.alpha]);
  const generatedMs = performance.now() - startedGenerated;
  const startedScan = performance.now();
  const scanRoot = document.createElement("section");
  scanRoot.className = "scene";
  for (const row of freshRows) {
    const node = document.createElement("span");
    node.className = "scene-node";
    node.style.left = `${row.values[0]}px`;
    node.style.transform = `translateX(${row.values[0]}px)`;
    node.style.opacity = String(freshStore.alpha);
    scanRoot.appendChild(node);
  }
  fields.scan.replaceChildren(scanRoot);
  const scanMs = performance.now() - startedScan;
  const startedGuardedScan = performance.now();
  const guardedRoot = document.createElement("section");
  guardedRoot.className = "scene";
  for (const row of freshRows) {
    const node = document.createElement("span");
    node.className = "scene-node";
    node.style.left = String(row.values[0]) + "px";
    node.style.transform = "translateX(" + row.values[0] + "px)";
    node.style.opacity = String(freshStore.alpha);
    guardedRoot.appendChild(node);
  }
  fields.scanGuarded.replaceChildren(guardedRoot);
  const scanGuardedMs = performance.now() - startedGuardedScan;
  reactRoot = freshRoot;
  store = freshStore;
  rows = freshRows;
  csrMount = freshCsr;
  denseMount = freshDense;
  generatedMount = freshGenerated;
  scanX = Float64Array.from(freshRows, (row) => row.values[0]);
  scanAlpha = freshStore.alpha;
  guardedScanX = Float64Array.from(freshRows, (row) => row.values[0]);
  guardedScanAlpha = freshStore.alpha;
  targets = Object.fromEntries(ARMS.map((arm) => [arm, Array.from(fields[arm].querySelectorAll<HTMLElement>(".scene-node"))])) as Record<Arm, HTMLElement[]>;
  setupMs = { react: reactMs, csr: csrMs, dense: denseMs, generated: generatedMs, scan: scanMs, scanGuarded: scanGuardedMs };
}

function run() {
  const count = Number(countNode.value);
  const fraction = Number(fractionNode.value);
  const mode = modeNode.value as Mode;
  if (!MODES.includes(mode)) throw new Error("Unknown update mode");
  if (targets.react.length !== count) mount(count);
  const changedCount = Math.max(1, Math.floor(count * fraction));
  const changedIds = Uint32Array.from({ length: changedCount }, (_, index) => Math.floor(index * count / changedCount));
  const seedInput = (document.getElementById("seed") as HTMLInputElement).value.trim();
  const seed = seedInput === "" ? freshSeed() : Number(seedInput);
  if (!Number.isInteger(seed) || seed < 1 || seed > 0xffff_ffff) throw new RangeError("Order seed must be an integer from 1 to 4294967295");
  let randomState = seed;
  const random = () => {
    randomState ^= randomState << 13; randomState ^= randomState >>> 17; randomState ^= randomState << 5;
    return (randomState >>> 0) / 0x1_0000_0000;
  };
  const warmups = 24;
  const timedPairs = 120;
  const orders = [...balancedOrders(random, warmups / ARMS.length), ...balancedOrders(random, timedPairs / ARMS.length)];
  const repeats = mode === "local" && fraction < 1 ? fraction < 0.1 ? 16 : 6 : 1;
  const pairs: Pair[] = [];

  const updateReact = (frame: number) => flushSync(() => {
    if (mode !== "shared") for (const id of changedIds) store!.setX(id, (frame * 7 + id) % 320);
    if (mode !== "local") store!.setAlpha((frame % 99 + 1) / 100);
  });
  const updateCompiled = (mountPlan: NonNullable<typeof csrMount> | NonNullable<typeof denseMount>, frame: number) => {
    if (mode !== "shared") for (const id of changedIds) mountPlan.set(id, (frame * 7 + id) % 320, 0);
    if (mode !== "local") mountPlan.setShared(0, (frame % 99 + 1) / 100);
    mountPlan.flush();
  };
  const updateScan = (frame: number) => {
    if (mode !== "shared") for (const id of changedIds) scanX[id] = (frame * 7 + id) % 320;
    if (mode !== "local") scanAlpha = (frame % 99 + 1) / 100;
    for (let id = 0; id < count; id++) {
      const node = targets.scan[id];
      const x = scanX[id];
      node.style.left = `${x}px`;
      node.style.transform = `translateX(${x}px)`;
      node.style.opacity = String(scanAlpha);
    }
  };
  const updateGuardedScan = (frame: number) => {
    if (mode !== "shared") for (const id of changedIds) guardedScanX[id] = (frame * 7 + id) % 320;
    if (mode !== "local") guardedScanAlpha = (frame % 99 + 1) / 100;
    for (let id = 0; id < count; id++) {
      const node = targets.scanGuarded[id];
      const x = guardedScanX[id];
      const left = String(x) + "px";
      const transform = "translateX(" + x + "px)";
      const opacity = String(guardedScanAlpha);
      if (node.style.left !== left) node.style.left = left;
      if (node.style.transform !== transform) node.style.transform = transform;
      if (node.style.opacity !== opacity) node.style.opacity = opacity;
    }
  };
  const updateFns: Record<Arm, (frame: number) => void> = {
    react: updateReact,
    csr: (frame) => updateCompiled(csrMount!, frame),
    dense: (frame) => updateCompiled(denseMount!, frame),
    generated: (frame) => updateCompiled(generatedMount!, frame),
    scan: updateScan,
    scanGuarded: updateGuardedScan,
  };
  for (let pairIndex = 0; pairIndex < warmups + timedPairs; pairIndex++) {
    const order = orders[pairIndex];
    const timingsMs = { react: 0, csr: 0, dense: 0, generated: 0, scan: 0, scanGuarded: 0 };
    for (const arm of order) {
      const start = performance.now();
      for (let repeat = 0; repeat < repeats; repeat++) updateFns[arm](pairIndex * repeats + repeat + 1);
      timingsMs[arm] = (performance.now() - start) / repeats;
    }
    const valuesMatch = targets.react.every((reactTarget, id) => ARMS.slice(1).every((arm) => {
      const expected = reactTarget.style;
      const actual = targets[arm][id].style;
      return expected.left === actual.left && expected.opacity === actual.opacity && expected.transform === actual.transform;
    }));
    if (pairIndex >= warmups) pairs.push({ pair: pairIndex - warmups + 1, order, timingsMs, valuesMatch, repeats });
  }

  const summaries = Object.fromEntries(ARMS.map((arm) => [arm, {
    medianMs: percentile(pairs.map((pair) => pair.timingsMs[arm]), 0.5),
    p95Ms: percentile(pairs.map((pair) => pair.timingsMs[arm]), 0.95),
  }])) as Record<Arm, { medianMs: number; p95Ms: number }>;
  const record = {
    schemaVersion: 3,
    arms: ARMS,
    experiment: "shared-source OXC runtime vs React external-store subscriptions and eager/guarded full scans",
    timestamp: new Date().toISOString(),
    pageLoadId,
    seed,
    mode,
    entities: count,
    localChangedFraction: fraction,
    localChangedEntitiesPerBatch: mode === "shared" ? 0 : changedCount,
    sharedInputsChangedPerBatch: mode === "local" ? 0 : 1,
    hostPropsChangedPerBatch: mode === "shared" ? count : mode === "local" ? changedCount * 2 : count + changedCount * 2,
    warmupPairs: warmups,
    timedPairs,
    repeatsPerPair: repeats,
    orderProtocol: "seeded shuffle of unique cyclic six-arm blocks; 120 timed orders with each arm appearing 20 times in each position; warmups use four blocks",
    reactBaseline: "React 19.3 + React Compiler; one component per entity; useSyncExternalStore subscriptions to local x and shared alpha; flushSync",
    scanBaselines: {
      scan: "Eager full scan: visits every host and writes left, transform, and opacity on every batch",
      scanGuarded: "Guarded full scan: visits every host and derives all outputs, but skips unchanged style setters",
    },
    compilerPlan: {
      frontend: "OXC Rust frontend",
      schemaVersion: 5,
      localSourcePaths: [...(sharedPlan.dependencyGraph.sourcePaths ?? [])],
      localOffsets: [...sharedPlan.dependencyGraph.sourceBindingOffsets],
      localBindingIds: [...sharedPlan.dependencyGraph.bindingIds],
      sharedSourcePaths: [...(sharedPlan.dependencyGraph.sharedSourcePaths ?? [])],
      sharedOffsets: [...(sharedPlan.dependencyGraph.sharedSourceBindingOffsets ?? [])],
      sharedBindingIds: [...(sharedPlan.dependencyGraph.sharedBindingIds ?? [])],
    },
    setupMs,
    summaries,
    pairedWins: Object.fromEntries(ARMS.slice(1).map((arm) => [arm, pairs.filter((pair) => pair.timingsMs[arm] < pair.timingsMs.react).length])),
    parityFailures: pairs.filter((pair) => !pair.valuesMatch).length,
    measurementDisposition: pairs.some((pair) => !pair.valuesMatch) ? "excluded-parity-failures" : "included",
    environment: {
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      hardwareConcurrency: navigator.hardwareConcurrency,
      devicePixelRatio: window.devicePixelRatio,
      visibilityState: document.visibilityState,
      react: "19.3.0",
      reactCompiler: "1.0.0",
      build: "Vite production",
      timing: "performance.now; input loop plus synchronous update and host commit; paint excluded",
    },
    pairs,
  };
  localStorage.setItem(storageKey, JSON.stringify([...readResults(), record].slice(-60)));
  (document.getElementById("record")!).textContent = JSON.stringify(record, null, 2);
  const fmt = (arm: Arm) => `${summaries[arm].medianMs.toFixed(3)} / ${summaries[arm].p95Ms.toFixed(3)}`;
  resultNode.textContent = `${mode} · React ${fmt("react")} · CSR ${fmt("csr")} · dense interpreter ${fmt("dense")} · generated ${fmt("generated")} · eager scan ${fmt("scan")} · guarded scan ${fmt("scanGuarded")} ms median/p95 · parity failures ${record.parityFailures}`;
}

function exportResults() {
  const blobUrl = URL.createObjectURL(new Blob([JSON.stringify(readResults(), null, 2)], { type: "application/json" }));
  const link = document.createElement("a");
  link.href = blobUrl;
  link.download = `shared-source-ui-benchmark-${new Date().toISOString().replaceAll(":", "-")}.json`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
}

document.getElementById("run")!.addEventListener("click", run);
document.getElementById("export")!.addEventListener("click", exportResults);
countNode.addEventListener("change", () => mount(Number(countNode.value)));
mount(Number(countNode.value));
