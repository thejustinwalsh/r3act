import { useCallback, useSyncExternalStore } from "react";
import { createRoot, type Root } from "react-dom/client";
import { flushSync } from "react-dom";
import { mountRepeatedHostPlanCsr, type RepeatedPlanSource } from "../compiled_plan_runtime.ts";
import {
  bindingParticlesPlan as multiTraitPlan,
  mountGeneratedBindingParticles,
} from "./generated_multi_trait_plan.ts";
import "./style.css";

type Arm = "react" | "csr" | "dense";
type Pair = {
  pair: number;
  order: Arm[];
  timingsMs: Record<Arm, number>;
  valuesMatch: boolean;
  repeats: number;
};

class TraitStore {
  readonly snapshots: Array<{ readonly x: number; readonly y: number }>;
  readonly listeners: Array<Set<() => void>>;

  constructor(initial: readonly { x: number; y: number }[]) {
    this.snapshots = initial.map(({ x, y }) => ({ x, y }));
    this.listeners = Array.from({ length: initial.length }, () => new Set());
  }
  getSnapshot = (id: number) => this.snapshots[id];
  subscribe = (id: number, listener: () => void) => {
    this.listeners[id].add(listener);
    return () => this.listeners[id].delete(listener);
  };
  set(id: number, x: number, y: number) {
    const previous = this.snapshots[id];
    if (Object.is(previous.x, x) && Object.is(previous.y, y)) return;
    this.snapshots[id] = { x, y };
    for (const listener of this.listeners[id]) listener();
  }
}

function ReactSceneNode({ id, store }: { id: number; store: TraitStore }) {
  const subscribe = useCallback((listener: () => void) => store.subscribe(id, listener), [id, store]);
  const getSnapshot = useCallback(() => store.getSnapshot(id), [id, store]);
  const { x, y } = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  return <span
    className="scene-node"
    style={{ left: `${x}px`, opacity: y, transform: `translateX(${x}px)` }}
  />;
}

const permutations = (): Arm[][] => {
  const out: Arm[][] = [];
  const visit = (prefix: Arm[], remaining: Arm[]) => {
    if (!remaining.length) { out.push(prefix); return; }
    for (let index = 0; index < remaining.length; index++) {
      visit([...prefix, remaining[index]], [...remaining.slice(0, index), ...remaining.slice(index + 1)]);
    }
  };
  visit([], ["react", "csr", "dense"]);
  return out;
};

const balancedOrders = (count: number, random: () => number): Arm[][] => {
  const all = permutations();
  const result: Arm[][] = [];
  while (result.length < count) {
    const block = [...all];
    for (let i = block.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [block[i], block[j]] = [block[j], block[i]];
    }
    result.push(...block);
  }
  return result.slice(0, count);
};

const percentile = (values: number[], p: number) => {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.max(0, Math.ceil(p * sorted.length) - 1)];
};
const freshSeed = () => crypto.getRandomValues(new Uint32Array(1))[0] || 1;
const resultsKey = "multi-source-compiled-ui-benchmark-v2-react-atomic";
const pageLoadId = crypto.randomUUID();
const readResults = (): unknown[] => {
  try {
    const saved: unknown = JSON.parse(localStorage.getItem(resultsKey) ?? "[]");
    return Array.isArray(saved) ? saved : [];
  } catch { return []; }
};
const exportResults = () => {
  const blobUrl = URL.createObjectURL(new Blob([JSON.stringify(readResults(), null, 2)], { type: "application/json" }));
  const link = document.createElement("a");
  link.href = blobUrl;
  link.download = `multi-source-ui-benchmark-${new Date().toISOString().replaceAll(":", "-")}.json`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
};

const appRoot = document.getElementById("root")!;
appRoot.innerHTML = `
  <main>
    <header>
      <p class="eyebrow">Research prototype · OXC-generated multi-source plan</p>
      <h1>Two traits, one declarative host</h1>
      <p>React uses one atomic per-entity snapshot and subscription. The generated graph routes <code>x → {left, transform}</code> and <code>y → opacity</code>. All arms update the same entities, values, and three host properties; paint is excluded.</p>
    </header>
    <section class="controls" aria-label="Benchmark controls">
      <label>Entities <select id="count"><option value="1000">1,000</option><option value="5000">5,000</option><option value="10000" selected>10,000</option></select></label>
      <label>Changed each update <select id="fraction"><option value="0.01">1%</option><option value="0.1" selected>10%</option><option value="1">100%</option></select></label>
      <label>Order seed <input id="seed" type="number" min="1" max="4294967295" step="1" placeholder="random"></label>
      <button id="run" type="button">Run paired three-way study</button>
      <button id="export" type="button">Export saved samples</button>
    </section>
    <p id="result" class="result" aria-live="polite">Preparing equivalent React, CSR, and dense host trees…</p>
    <details><summary>Latest raw timing record</summary><pre id="record">Run the study to populate paired samples and environment metadata.</pre></details>
    <div class="prototype-fields">
      <section><h2>React JSX · one atomic subscription</h2><div id="react-field" class="field"></div></section>
      <section><h2>Generated plan · CSR</h2><div id="csr-field" class="field"></div></section>
      <section><h2>Generated plan · dense</h2><div id="dense-field" class="field"></div></section>
    </div>
    <aside><strong>Update graph:</strong> <code>node.x → left, transform</code>; <code>node.y → opacity</code>. One timed batch writes both source slots for each selected entity. React receives one stable snapshot notification per changed entity and renders that leaf; graph arms dispatch the two dirty slots through compiled adjacency. Each path commits the same three changed style properties per changed entity.</aside>
  </main>`;

const resultNode = document.getElementById("result")!;
const countNode = document.getElementById("count") as HTMLSelectElement;
const fractionNode = document.getElementById("fraction") as HTMLSelectElement;
const fields = {
  react: document.getElementById("react-field") as HTMLElement,
  csr: document.getElementById("csr-field") as HTMLElement,
  dense: document.getElementById("dense-field") as HTMLElement,
};
let root: Root | null = null;
let store: TraitStore | null = null;
let sources: RepeatedPlanSource[] = [];
let csrMount: ReturnType<typeof mountRepeatedHostPlanCsr> | null = null;
let denseMount: ReturnType<typeof mountGeneratedBindingParticles> | null = null;
let targets: Record<Arm, HTMLElement[]> = { react: [], csr: [], dense: [] };
let setup = { reactMs: 0, csrMs: 0, denseMs: 0 };

function mount(count: number) {
  csrMount?.dispose();
  denseMount?.dispose();
  if (root) flushSync(() => root!.unmount());
  root = null;
  for (const field of Object.values(fields)) field.replaceChildren();

  const rows = Array.from({ length: count }, (_, id) => ({
    id,
    values: [id % 320, (id % 100) / 100],
  }));
  const freshStore = new TraitStore(rows.map(({ values }) => ({ x: values[0], y: values[1] })));
  const freshRoot = createRoot(fields.react);
  const reactStarted = performance.now();
  const reactChildren = rows.map(({ id }) => <ReactSceneNode key={id} id={id} store={freshStore} />);
  flushSync(() => freshRoot.render(<section className="scene">{reactChildren}</section>));
  const reactMs = performance.now() - reactStarted;

  const csrStarted = performance.now();
  const freshCsr = mountRepeatedHostPlanCsr(rows, fields.csr, multiTraitPlan);
  const csrMs = performance.now() - csrStarted;
  const denseStarted = performance.now();
  const freshDense = mountGeneratedBindingParticles(rows, fields.dense);
  const denseMs = performance.now() - denseStarted;

  root = freshRoot;
  store = freshStore;
  sources = rows;
  csrMount = freshCsr;
  denseMount = freshDense;
  targets = {
    react: Array.from(fields.react.querySelectorAll<HTMLElement>(".scene-node")),
    csr: Array.from(fields.csr.querySelectorAll<HTMLElement>(".scene-node")),
    dense: Array.from(fields.dense.querySelectorAll<HTMLElement>(".scene-node")),
  };
  setup = { reactMs, csrMs, denseMs };
}

function run() {
  const count = Number(countNode.value);
  const fraction = Number(fractionNode.value);
  if (targets.react.length !== count) mount(count);
  const changedCount = Math.max(1, Math.floor(count * fraction));
  const changedIds = new Uint32Array(changedCount);
  for (let index = 0; index < changedCount; index++) changedIds[index] = Math.floor(index * count / changedCount);
  const parityIds = Array.from(changedIds).filter((_, index) => index % Math.max(1, Math.ceil(changedCount / 64)) === 0);
  const warmups = 24;
  const timedPairs = 48;
  const repeats = fraction >= 1 ? 1 : fraction >= 0.1 ? 8 : 32;
  const seedText = (document.getElementById("seed") as HTMLInputElement).value.trim();
  const seed = seedText === "" ? freshSeed() : Number(seedText);
  if (!Number.isInteger(seed) || seed < 1 || seed > 0xffff_ffff) throw new RangeError("Order seed must be an integer from 1 to 4294967295");
  let randomState = seed;
  const random = () => {
    randomState ^= randomState << 13;
    randomState ^= randomState >>> 17;
    randomState ^= randomState << 5;
    return (randomState >>> 0) / 0x1_0000_0000;
  };
  const orders = [...balancedOrders(warmups, random), ...balancedOrders(timedPairs, random)];
  const pairs: Pair[] = [];

  const valuesAt = (frame: number, id: number) => [
    ((frame * 7 + id) % 320),
    (((frame * 5 + id) % 100) / 100),
  ] as const;
  const updateReact = (frame: number) => flushSync(() => {
    for (const id of changedIds) {
      const [x, y] = valuesAt(frame, id);
      store!.set(id, x, y);
    }
  });
  const updateCsr = (frame: number) => {
    for (const id of changedIds) {
      const [x, y] = valuesAt(frame, id);
      csrMount!.set(id, x, 0);
      csrMount!.set(id, y, 1);
    }
    csrMount!.flush();
  };
  const updateDense = (frame: number) => {
    for (const id of changedIds) {
      const [x, y] = valuesAt(frame, id);
      denseMount!.set(id, x, 0);
      denseMount!.set(id, y, 1);
    }
    denseMount!.flush();
  };
  const updateFns: Record<Arm, (frame: number) => void> = { react: updateReact, csr: updateCsr, dense: updateDense };

  for (let pairIndex = 0; pairIndex < warmups + timedPairs; pairIndex++) {
    const order = orders[pairIndex];
    const timingsMs: Record<Arm, number> = { react: 0, csr: 0, dense: 0 };
    for (const arm of order) {
      const started = performance.now();
      for (let repeat = 0; repeat < repeats; repeat++) {
        updateFns[arm](pairIndex * repeats + repeat + 1);
      }
      timingsMs[arm] = (performance.now() - started) / repeats;
    }
    const valuesMatch = parityIds.every((id) => {
      const react = targets.react[id].style;
      return (["csr", "dense"] as const).every((arm) => {
        const actual = targets[arm][id].style;
        return actual.left === react.left && actual.opacity === react.opacity && actual.transform === react.transform;
      });
    });
    if (pairIndex >= warmups) pairs.push({
      pair: pairIndex - warmups + 1,
      order,
      timingsMs,
      valuesMatch,
      repeats,
    });
  }

  // The per-pair sample checks a bounded subset to keep parity work out of the
  // timed path. This final full scan verifies every host after the last update.
  const finalStateValuesMatch = targets.react.every((reactTarget, id) =>
    (["csr", "dense"] as const).every((arm) => {
      const expected = reactTarget.style;
      const actual = targets[arm][id].style;
      return actual.left === expected.left && actual.opacity === expected.opacity && actual.transform === expected.transform;
    })
  );

  const summaries = Object.fromEntries(((["react", "csr", "dense"] as Arm[]).map((arm) => [arm, {
    medianMs: percentile(pairs.map((pair) => pair.timingsMs[arm]), 0.5),
    p95Ms: percentile(pairs.map((pair) => pair.timingsMs[arm]), 0.95),
  }]))) as Record<Arm, { medianMs: number; p95Ms: number }>;
  const result = {
    schemaVersion: 2,
    experiment: "JSX React Compiler two-trait subscriptions vs OXC multi-source CSR and dense dependency dispatch",
    timestamp: new Date().toISOString(),
    pageLoadId,
    seed,
    entities: count,
    changedFraction: fraction,
    changedEntitiesPerBatch: changedCount,
    sourceSlotsChangedPerBatch: changedCount * 2,
    hostPropsChangedPerBatch: changedCount * 3,
    warmupPairs: warmups,
    timedPairs,
    repeatsPerPair: repeats,
    orderProtocol: "balanced blocks over all six three-arm permutations; seeded xorshift32",
    reactBaseline: "React 19.3 + React Compiler; JSX-authored one component per entity; one useSyncExternalStore subscription to a stable {x,y} snapshot; atomic x/y writes in flushSync",
    reactAuthoring: "JSX in TSX compiled by the Vite React Compiler plugin",
    graphPlan: {
      compiler: "OXC Rust frontend, schema v4",
      sourceCount: multiTraitPlan.dependencyGraph.sourceCount,
      sourcePaths: [...(multiTraitPlan.dependencyGraph.sourcePaths ?? [])],
      sourceBindingOffsets: [...multiTraitPlan.dependencyGraph.sourceBindingOffsets],
      bindingIds: [...multiTraitPlan.dependencyGraph.bindingIds],
      bindings: multiTraitPlan.bindings.map((binding, id) => ({ id, property: binding.property, sourceSlot: binding.sourceSlot })),
    },
    setupMs: setup,
    summaries,
    pairedWins: {
      denseVsCsr: pairs.filter((pair) => pair.timingsMs.dense < pair.timingsMs.csr).length,
      denseVsReact: pairs.filter((pair) => pair.timingsMs.dense < pair.timingsMs.react).length,
      csrVsReact: pairs.filter((pair) => pair.timingsMs.csr < pair.timingsMs.react).length,
    },
    parityFailures: pairs.filter((pair) => !pair.valuesMatch).length + (finalStateValuesMatch ? 0 : 1),
    finalStateValuesMatch,
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
  localStorage.setItem(resultsKey, JSON.stringify([...readResults(), result].slice(-30)));
  (document.getElementById("record")!).textContent = JSON.stringify(result, null, 2);
  const format = (arm: Arm) => `${summaries[arm].medianMs.toFixed(3)} / ${summaries[arm].p95Ms.toFixed(3)}`;
  resultNode.textContent = `React ${format("react")} ms median/p95 · CSR ${format("csr")} · dense ${format("dense")} · ` +
    `setup ${setup.reactMs.toFixed(1)} / ${setup.csrMs.toFixed(1)} / ${setup.denseMs.toFixed(1)} ms · ${result.parityFailures} parity failures`;
}

document.getElementById("run")!.addEventListener("click", run);
document.getElementById("export")!.addEventListener("click", exportResults);
countNode.addEventListener("change", () => mount(Number(countNode.value)));
mount(Number(countNode.value));
