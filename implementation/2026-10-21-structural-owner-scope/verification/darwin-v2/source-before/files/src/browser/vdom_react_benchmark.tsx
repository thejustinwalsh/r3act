import { useCallback, useSyncExternalStore } from "react";
import { createRoot, type Root } from "react-dom/client";
import { flushSync } from "react-dom";
import { bind, bindCompiled, jsx, ScalarSource, type RuntimeNode } from "../jsx_binding_runtime.ts";
import { bindingParticlesPlan } from "./generated_multi_trait_plan.ts";
import { DOMVDOMHost, VDOMSnapshotRoot, type CompiledVDOMBindingGraph } from "../vdom_snapshot_runtime.ts";
import "./style.css";

type Pair = {
  pair: number;
  order: Arm[];
  timingsMs: Record<Arm, number>;
  valuesMatch: boolean;
  repeats: number;
};
type Arm = "react" | "retainedVDOM";
type Snapshot = Readonly<{ x: number; opacity: number }>;

class ParticleStore {
  readonly snapshots: Snapshot[];
  readonly listeners: Array<Set<() => void>>;

  constructor(values: readonly Snapshot[]) {
    this.snapshots = values.map(({ x, opacity }) => ({ x, opacity }));
    this.listeners = values.map(() => new Set());
  }

  getSnapshot = (id: number) => this.snapshots[id];
  subscribe = (id: number, listener: () => void) => {
    this.listeners[id].add(listener);
    return () => this.listeners[id].delete(listener);
  };
  set(id: number, x: number, opacity: number) {
    const old = this.snapshots[id];
    if (Object.is(old.x, x) && Object.is(old.opacity, opacity)) return;
    this.snapshots[id] = { x, opacity };
    for (const listener of this.listeners[id]) listener();
  }
}

function ReactParticle({ id, store }: { id: number; store: ParticleStore }) {
  const subscribe = useCallback((listener: () => void) => store.subscribe(id, listener), [id, store]);
  const getSnapshot = useCallback(() => store.getSnapshot(id), [id, store]);
  const { x, opacity } = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  return <span className="scene-node" style={{ left: `${x}px`, opacity, transform: `translateX(${x}px)` }} />;
}

const percentile = (values: number[], p: number) => {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.max(0, Math.ceil(p * sorted.length) - 1)];
};
const freshSeed = () => crypto.getRandomValues(new Uint32Array(1))[0] || 1;
const ordersFor = (count: number, random: () => number) => {
  const orders: Arm[][] = [];
  for (let index = 0; index < count; index += 2) {
    const first: Arm[] = random() < 0.5 ? ["react", "retainedVDOM"] : ["retainedVDOM", "react"];
    orders.push(first, [...first].reverse());
  }
  return orders.slice(0, count);
};
const resultsKey = "retained-vdom-react-paired-benchmark-v2";
const readResults = (): unknown[] => {
  try {
    const saved: unknown = JSON.parse(localStorage.getItem(resultsKey) ?? "[]");
    return Array.isArray(saved) ? saved : [];
  } catch { return []; }
};
const exportResults = () => {
  const blob = new Blob([JSON.stringify(readResults(), null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `retained-vdom-react-${new Date().toISOString().replaceAll(":", "-")}.json`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};

const pageLoadId = crypto.randomUUID();
const params = new URLSearchParams(location.search);
const dispatchMode = params.get("dispatch") === "compiled"
  ? "compiled"
  : params.get("dispatch") === "runtime-direct" ? "runtime-direct" : "runtime-discovered";
const dispatchLabel = dispatchMode === "compiled" ? "OXC compiled CSR and direct props"
  : dispatchMode === "runtime-direct" ? "runtime-discovered direct props" : "runtime-discovered style object";
document.getElementById("root")!.innerHTML = `
  <main>
    <header>
      <p class="eyebrow">Research gate A · retained VDOM comparison</p>
      <h1>Declarative leaf updates: React vs retained VDOM</h1>
      <p>Both arms mount the same keyed span tree and update the same 3 inline style properties per changed entity. React uses React 19.3, React Compiler, one atomic external-store snapshot per leaf, and <code>flushSync</code>. The VDOM arm uses ${dispatchMode === "compiled" ? "the OXC-emitted source-slot-to-binding CSR table, resolved to retained host props at mount" : dispatchMode === "runtime-direct" ? "a source-to-individual-style-field index discovered by walking the retained VDOM at mount" : "a source-to-style-object index discovered by walking the retained VDOM at mount"}. This compares update plus host commit; paint is excluded.</p>
    </header>
    <section class="controls" aria-label="Benchmark controls">
      <label>Entities <select id="count"><option value="1000">1,000</option><option value="5000">5,000</option><option value="10000" selected>10,000</option></select></label>
      <label>Changed per batch <select id="fraction"><option value="0.01">1%</option><option value="0.1">10%</option><option value="1" selected>100%</option></select></label>
      <label>Seed <input id="seed" type="number" min="1" max="4294967295" placeholder="random"></label>
      <button id="run" type="button">Run paired study</button>
      <button id="export" type="button">Export saved samples</button>
    </section>
    <p id="result" class="result" aria-live="polite">Mounting equivalent trees…</p>
    <details><summary>Latest raw record</summary><pre id="record">Run the paired study to populate samples and environment metadata.</pre></details>
    <div class="prototype-fields">
      <section><h2>React 19.3 + React Compiler</h2><div id="react-field" class="field"></div></section>
      <section><h2>Retained keyed VDOM + ${dispatchLabel}</h2><div id="vdom-field" class="field"></div></section>
    </div>
    <aside><strong>Validity:</strong> both arms begin with the same values, keyed topology, host tags, class names, and target style properties. Setup/mount is recorded separately. ${dispatchMode === "compiled" ? "OXC emits source-slot adjacency; mount validates binding IDs and resolves them to host props. Updates use that CSR adjacency and field-level host writes, with no component execution or VDOM walk." : dispatchMode === "runtime-direct" ? "The VDOM source index is runtime-built; each bound style field is updated directly, with no component execution or VDOM walk." : "The VDOM source index is runtime-built; updates materialize and diff each bound style object, with no component execution or VDOM walk."} Measurements exclude paint/presentation and do not establish general React superiority.</aside>
  </main>`;

const countNode = document.getElementById("count") as HTMLSelectElement;
const fractionNode = document.getElementById("fraction") as HTMLSelectElement;
const seedNode = document.getElementById("seed") as HTMLInputElement;
const resultNode = document.getElementById("result")!;
const recordNode = document.getElementById("record")!;
const reactField = document.getElementById("react-field") as HTMLElement;
const vdomField = document.getElementById("vdom-field") as HTMLElement;
let reactRoot: Root | null = null;
let vdomRoot: VDOMSnapshotRoot<Node, Node> | null = null;
let store: ParticleStore | null = null;
let targets: Record<Arm, HTMLElement[]> = { react: [], retainedVDOM: [] };
let vdomSources: Array<{ x: ScalarSource; opacity: ScalarSource }> = [];
let setupMs = { react: 0, retainedVDOM: 0 };
let mountedCount = 0;
let saved = readResults();
if (["1000", "5000", "10000"].includes(params.get("count") ?? "")) countNode.value = params.get("count")!;
if (["0.01", "0.1", "1"].includes(params.get("fraction") ?? "")) fractionNode.value = params.get("fraction")!;
if (params.has("seed")) seedNode.value = params.get("seed")!;

const initialValues = (count: number) => Array.from({ length: count }, (_, id) => ({
  x: id % 320,
  opacity: (id % 100) / 100,
}));

function mount(count: number) {
  if (reactRoot) flushSync(() => reactRoot!.unmount());
  vdomRoot?.dispose();
  reactField.replaceChildren();
  vdomField.replaceChildren();
  const initial = initialValues(count);
  const freshStore = new ParticleStore(initial);

  const reactStarted = performance.now();
  const freshReactRoot = createRoot(reactField);
  flushSync(() => freshReactRoot.render(<div className="particle-layer">
    {initial.map((_, id) => <ReactParticle key={id} id={id} store={freshStore} />)}
  </div>));
  const reactMs = performance.now() - reactStarted;

  const sources = initial.map(({ x, opacity }, id) => ({
    x: new ScalarSource(id * 2, x),
    opacity: new ScalarSource(id * 2 + 1, opacity),
  }));
  vdomSources = sources;
  const tree: RuntimeNode = jsx("div", { className: "particle-layer" }, sources.map(({ x, opacity }, id) =>
    jsx("span", {
      key: id,
      className: "scene-node",
      style: {
        left: dispatchMode === "compiled" ? bindCompiled(x, 0, 0, (value) => `${value}px`) : bind(x, (value) => `${value}px`),
        opacity: dispatchMode === "compiled" ? bindCompiled(opacity, 1, 1) : bind(opacity),
        transform: dispatchMode === "compiled" ? bindCompiled(x, 2, 0, (value) => `translateX(${value}px)`) : bind(x, (value) => `translateX(${value}px)`),
      },
    })
  ));
  const vdomStarted = performance.now();
  const freshVdomRoot = new VDOMSnapshotRoot(new DOMVDOMHost(), vdomField);
  freshVdomRoot.commit(tree, dispatchMode === "compiled"
    ? bindingParticlesPlan.dependencyGraph as CompiledVDOMBindingGraph
    : null, dispatchMode === "runtime-direct");
  const retainedVDOMMs = performance.now() - vdomStarted;

  reactRoot = freshReactRoot;
  vdomRoot = freshVdomRoot;
  store = freshStore;
  targets = {
    react: Array.from(reactField.querySelectorAll<HTMLElement>(".scene-node")),
    retainedVDOM: Array.from(vdomField.querySelectorAll<HTMLElement>(".scene-node")),
  };
  setupMs = { react: reactMs, retainedVDOM: retainedVDOMMs };
  mountedCount = count;
}

function runStudy() {
  const count = Number(countNode.value);
  const fraction = Number(fractionNode.value);
  if (mountedCount !== count) mount(count);
  const changedCount = Math.max(1, Math.floor(count * fraction));
  const changedIds = Array.from({ length: changedCount }, (_, index) => Math.floor(index * count / changedCount));
  const warmups = 12;
  const timedPairs = 36;
  const repeats = fraction >= 1 ? 1 : fraction >= 0.1 ? 6 : 24;
  const seed = seedNode.value.trim() === "" ? freshSeed() : Number(seedNode.value);
  if (!Number.isInteger(seed) || seed < 1 || seed > 0xffff_ffff) throw new RangeError("Seed must be an integer from 1 to 4294967295");
  let randomState = seed;
  const random = () => {
    randomState ^= randomState << 13;
    randomState ^= randomState >>> 17;
    randomState ^= randomState << 5;
    return (randomState >>> 0) / 0x1_0000_0000;
  };
  const orders = ordersFor(warmups + timedPairs, random);
  const pairs: Pair[] = [];
  const valuesFor = (id: number, targetFrame: number) => ({ x: ((targetFrame * 7 + id) % 320), opacity: ((targetFrame * 5 + id) % 100) / 100 });
  const updateReact = (targetFrame: number) => flushSync(() => {
    for (const id of changedIds) {
      const next = valuesFor(id, targetFrame);
      store!.set(id, next.x, next.opacity);
    }
  });
  const updateVdom = (targetFrame: number) => {
    for (const id of changedIds) {
      const next = valuesFor(id, targetFrame);
      const sources = (vdomSources as Array<{ x: ScalarSource; opacity: ScalarSource }>)[id];
      vdomRoot!.setSource(sources.x, next.x);
      vdomRoot!.setSource(sources.opacity, next.opacity);
    }
  };
  const updateFns: Record<Arm, (targetFrame: number) => void> = { react: updateReact, retainedVDOM: updateVdom };
  for (let pairIndex = 0; pairIndex < warmups + timedPairs; pairIndex++) {
    const order = orders[pairIndex];
    const timingsMs: Record<Arm, number> = { react: 0, retainedVDOM: 0 };
    for (const arm of order) {
      const started = performance.now();
      for (let repeat = 0; repeat < repeats; repeat++) updateFns[arm](pairIndex * repeats + repeat + 1);
      timingsMs[arm] = (performance.now() - started) / repeats;
    }
    const valuesMatch = targets.react.every((target, id) => {
      const actual = targets.retainedVDOM[id].style;
      return target.style.left === actual.left && target.style.opacity === actual.opacity &&
        target.style.transform === actual.transform;
    });
    if (pairIndex >= warmups) pairs.push({ pair: pairIndex - warmups + 1, order, timingsMs, valuesMatch, repeats });
  }
  const summaries = Object.fromEntries(((["react", "retainedVDOM"] as Arm[]).map((arm) => [arm, {
    medianMs: percentile(pairs.map((pair) => pair.timingsMs[arm]), 0.5),
    p95Ms: percentile(pairs.map((pair) => pair.timingsMs[arm]), 0.95),
  }]))) as Record<Arm, { medianMs: number; p95Ms: number }>;
  const record = {
    schemaVersion: 2,
    dispatchMode,
    experiment: "React 19.3 + React Compiler vs retained keyed VDOM scalar-prop updates",
    timestamp: new Date().toISOString(),
    pageLoadId,
    seed,
    entities: count,
    changedFraction: fraction,
    changedEntitiesPerBatch: changedCount,
    hostPropsPerEntity: 3,
    warmupPairs: warmups,
    timedPairs,
    repeatsPerPair: repeats,
    orderProtocol: "seeded balanced randomized pair order, independently sampled per pair",
    react: {
      version: "19.3.0",
      compiler: "babel-plugin-react-compiler target 19",
      update: "stable per-entity useSyncExternalStore snapshot, listener notification, leaf function execution, React diff and flushSync host commit",
      setupMs: setupMs.react,
    },
    retainedVDOM: {
      update: dispatchMode === "compiled"
        ? "source mutations, OXC-emitted CSR lookup plus mount-resolved VDOM prop handles, affected style-field patches; no component execution or VDOM tree walk"
        : dispatchMode === "runtime-direct"
        ? "source mutations, runtime-discovered binding lookup, affected style-field patches; no component execution or VDOM tree walk"
        : "source mutations, runtime-built source-to-style-prop index lookup, affected style-object patches; no component execution or VDOM tree walk",
      bindingIndex: dispatchMode === "compiled"
        ? "OXC emits the source-slot-to-binding CSR table; mount resolves binding IDs to retained VDOM host props and validates every edge"
        : dispatchMode === "runtime-direct" ? "built at mount by walking the retained keyed VDOM and recording each bound style field"
        : "built at mount by walking the retained keyed VDOM and recording each bound style object",
      setupMs: setupMs.retainedVDOM,
    },
    browser: { userAgent: navigator.userAgent, hardwareConcurrency: navigator.hardwareConcurrency, devicePixelRatio: devicePixelRatio },
    summaries,
    pairedWins: {
      retainedVDOM: pairs.filter((pair) => pair.timingsMs.retainedVDOM < pair.timingsMs.react).length,
      react: pairs.filter((pair) => pair.timingsMs.react < pair.timingsMs.retainedVDOM).length,
      ties: pairs.filter((pair) => pair.timingsMs.react === pair.timingsMs.retainedVDOM).length,
    },
    allParityChecksPassed: pairs.every((pair) => pair.valuesMatch),
    pairs,
    finalParity: targets.react.length === count && targets.retainedVDOM.length === count && targets.react.every((target, id) => {
      const actual = targets.retainedVDOM[id].style;
      return target.style.left === actual.left && target.style.opacity === actual.opacity && target.style.transform === actual.transform;
    }),
    validity: dispatchMode === "compiled"
      ? "Update plus synchronous host commit. Mount measured separately. Paint/presentation excluded. Single browser/device session. OXC CSR adjacency is compiler-emitted; binding-to-host handles are resolved during VDOM mount. Compiled bindings update only their declared style fields."
      : dispatchMode === "runtime-direct"
      ? "Update plus synchronous host commit. Mount measured separately. Paint/presentation excluded. Single browser/device session. Source-to-binding index and per-field writer are runtime-discovered."
      : "Update plus synchronous host commit. Mount measured separately. Paint/presentation excluded. Single browser/device session. Retained VDOM index is runtime-built, not compiler-emitted. Style objects are materialized and diffed as whole props.",
  };
  saved.push(record);
  localStorage.setItem(resultsKey, JSON.stringify(saved));
  const compactRecord = {
    schemaVersion: 2,
    dispatchMode,
    pageLoadId,
    seed,
    entities: count,
    changedFraction: fraction,
    setupMs,
    summaries,
    pairedWins: record.pairedWins,
    parity: record.allParityChecksPassed && record.finalParity,
    browser: record.browser,
    ...(params.get("includeSamples") === "1" ? {
      samples: pairs.map((pair) => ({ order: pair.order[0] === "react" ? 0 : 1, reactMs: pair.timingsMs.react, retainedVdomMs: pair.timingsMs.retainedVDOM })),
    } : {}),
  };
  history.replaceState(null, "", `${location.pathname}${location.search}#record=${encodeURIComponent(JSON.stringify(compactRecord))}`);
  recordNode.textContent = JSON.stringify(record, null, 2);
  resultNode.textContent = `${count.toLocaleString()} entities · ${changedCount.toLocaleString()} updates/batch · React ${summaries.react.medianMs.toFixed(3)} ms median / ${summaries.react.p95Ms.toFixed(3)} ms p95 · retained VDOM (${dispatchMode}) ${summaries.retainedVDOM.medianMs.toFixed(3)} ms median / ${summaries.retainedVDOM.p95Ms.toFixed(3)} ms p95 · parity ${record.allParityChecksPassed && record.finalParity ? "PASS" : "FAIL"}`;
  if (pairs.some((pair) => !pair.valuesMatch) || !record.finalParity) resultNode.setAttribute("data-failed", "true");
  else resultNode.removeAttribute("data-failed");
}

document.getElementById("run")!.addEventListener("click", () => {
  try { runStudy(); }
  catch (error) { resultNode.textContent = `Study failed: ${String(error)}`; resultNode.setAttribute("data-failed", "true"); }
});
document.getElementById("export")!.addEventListener("click", exportResults);
mount(Number(countNode.value));
resultNode.textContent = "Equivalent trees mounted. Choose a scenario and run the paired study.";
if (params.get("autorun") === "1") setTimeout(runStudy, 0);
