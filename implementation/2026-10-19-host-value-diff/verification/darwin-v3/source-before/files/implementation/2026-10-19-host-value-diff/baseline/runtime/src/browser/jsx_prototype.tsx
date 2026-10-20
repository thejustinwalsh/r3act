import React from "react";
import { createRoot, type Root } from "react-dom/client";
import { flushSync } from "react-dom";
import { createJSXBindingRuntime, type ScalarSource } from "../jsx_binding_runtime.ts";
import { mountGeneratedBindingParticles } from "./generated_binding_particles.ts";
import { mountRepeatedHostPlanCsr } from "../compiled_plan_runtime.ts";
import { bindingParticlesPlan } from "./generated_binding_particles.ts";
import { ReactParticle } from "./react_baseline.tsx";
import { BindingParticles } from "./jsx_binding_view.tsx";
import "./style.css";

type Arm = "react" | "jsxBinding" | "compiledCsr" | "compiledPlan";
type Pair = {
  pair: number;
  order: Arm[];
  timingsMs: Record<Arm, number>;
  valuesMatch: boolean;
  repeats: number;
};

class ReactStore {
  readonly values: Float64Array;
  readonly listeners: Array<Set<() => void>>;
  constructor(count: number) {
    this.values = new Float64Array(count);
    this.listeners = Array.from({ length: count }, () => new Set());
  }
  get = (id: number) => this.values[id];
  subscribe = (id: number, listener: () => void) => {
    this.listeners[id].add(listener);
    return () => this.listeners[id].delete(listener);
  };
  set(id: number, value: number) {
    if (Object.is(this.values[id], value)) return;
    this.values[id] = value;
    for (const listener of this.listeners[id]) listener();
  }
}

const percentile = (values: number[], p: number) => {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.max(0, Math.ceil(p * sorted.length) - 1)];
};

const balancedOrders = (count: number, random: () => number): Arm[][] => {
  const permutations: Arm[][] = [];
  const visit = (prefix: Arm[], remaining: Arm[]) => {
    if (remaining.length === 0) {
      permutations.push(prefix);
      return;
    }
    for (let i = 0; i < remaining.length; i++) {
      visit([...prefix, remaining[i]], [...remaining.slice(0, i), ...remaining.slice(i + 1)]);
    }
  };
  visit([], ["react", "jsxBinding", "compiledCsr", "compiledPlan"]);
  const orders: Arm[][] = [];
  while (orders.length < count) {
    const block = [...permutations];
    for (let i = block.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [block[i], block[j]] = [block[j], block[i]];
    }
    orders.push(...block);
  }
  return orders.slice(0, count);
};

const createChangedIds = (count: number, changedCount: number) => {
  const ids = new Uint32Array(changedCount);
  for (let i = 0; i < changedCount; i++) ids[i] = Math.floor(i * count / changedCount);
  return ids;
};

const storageKey = "jsx-binding-runtime-paired-v4";
const readResults = () => {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(storageKey) ?? "[]");
    return Array.isArray(value) ? value : [];
  } catch { return []; }
};

const saveResult = (result: unknown) => {
  localStorage.setItem(storageKey, JSON.stringify([...readResults(), result].slice(-50)));
};

const exportResults = () => {
  const url = URL.createObjectURL(new Blob([JSON.stringify(readResults(), null, 2)], { type: "application/json" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = `jsx-binding-paired-v4-${new Date().toISOString().replaceAll(":", "-")}.json`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};

const root = document.getElementById("root")!;
root.innerHTML = `
  <main>
    <header>
      <p class="eyebrow">Research prototype · TSX + pure JavaScript binding runtime</p>
      <h1>JSX props, compiled to host plans</h1>
      <p>This page compares four paths: React, mount-time JSX binding discovery, a generic CSR graph instantiated from OXC-emitted adjacency, and its identity-layout specialization. Every source updates two style outputs on each host. Setup and repeated updates are measured separately; paint is excluded.</p>
    </header>
    <section class="controls" aria-label="Benchmark controls">
      <label>Entities <select id="count"><option value="1000">1,000</option><option value="5000">5,000</option><option value="10000" selected>10,000</option></select></label>
      <label>Changed each update <select id="fraction"><option value="0.01">1%</option><option value="0.1" selected>10%</option><option value="1">100%</option></select></label>
      <label>Order seed <input id="seed" type="number" min="1" max="4294967295" step="1" placeholder="random" inputmode="numeric"></label>
      <button id="run" type="button">Run paired four-way study</button>
      <button id="export" type="button">Export saved samples</button>
    </section>
    <p id="result" class="result" aria-live="polite">Preparing four equivalent host trees…</p>
    <details><summary>Latest raw timing record</summary><pre id="latest-record">Run the study to populate the paired samples and environment metadata.</pre></details>
    <div class="prototype-fields">
      <section><h2>React</h2><div id="react-field" class="field"></div></section>
      <section><h2>Mount-time JSX</h2><div id="jsx-field" class="field"></div></section>
      <section><h2>Generated plan · CSR</h2><div id="csr-field" class="field"></div></section>
      <section><h2>Generated plan</h2><div id="compiled-field" class="field"></div></section>
    </div>
    <aside><strong>Scope:</strong> OXC emits one repeated-host plan and a CSR dependency template with source-binding offsets and binding IDs. The generic arm expands that template into per-source target tuples, a runtime CSR index, and per-property closures. The specialized arm uses the same template and outputs but stores the identity graph in dense typed arrays, then evaluates both properties for each dirty source. The paired graph arms isolate that runtime representation.</aside>
  </main>`;

const resultNode = document.getElementById("result")!;
const countSelect = document.getElementById("count") as HTMLSelectElement;
const fractionSelect = document.getElementById("fraction") as HTMLSelectElement;
const reactField = document.getElementById("react-field") as HTMLElement;
const jsxField = document.getElementById("jsx-field") as HTMLElement;
const csrField = document.getElementById("csr-field") as HTMLElement;
const compiledField = document.getElementById("compiled-field") as HTMLElement;
let reactRoot: Root | null = null;
let reactStore: ReactStore | null = null;
let jsxRuntime: ReturnType<typeof createJSXBindingRuntime> | null = null;
let jsxMounted: ReturnType<ReturnType<typeof createJSXBindingRuntime>["mount"]> | null = null;
let csrMounted: ReturnType<typeof mountRepeatedHostPlanCsr> | null = null;
let compiledMounted: ReturnType<typeof mountGeneratedBindingParticles> | null = null;
let reactTargets: HTMLElement[] = [];
let jsxTargets: HTMLElement[] = [];
let csrTargets: HTMLElement[] = [];
let compiledTargets: HTMLElement[] = [];
let signals: ScalarSource[] = [];
let setup = { reactMs: 0, jsxBindingMs: 0, compiledCsrMs: 0, compiledPlanMs: 0, bindingCount: 0 };

const mountComparison = (count: number) => {
  if (jsxMounted) jsxMounted.dispose();
  if (csrMounted) csrMounted.dispose();
  if (compiledMounted) compiledMounted.dispose();
  if (reactRoot) {
    flushSync(() => reactRoot!.unmount());
    reactRoot = null;
  }
  reactField.replaceChildren();
  jsxField.replaceChildren();
  csrField.replaceChildren();
  compiledField.replaceChildren();
  let store!: ReactStore;
  let runtime!: ReturnType<typeof createJSXBindingRuntime>;
  let sources!: ScalarSource[];

  const makeReactTree = () => {
    store = new ReactStore(count);
    const children = Array.from({ length: count }, (_, id) =>
      React.createElement(ReactParticle, { key: id, id, store })
    );
    return React.createElement("div", { className: "particle-layer" }, children);
  };
  const makeJSXTree = () => {
    runtime = createJSXBindingRuntime();
    sources = Array.from({ length: count }, () => runtime.signal(0));
    return BindingParticles({ sources });
  };

  // Alternate setup order to avoid consistently favoring one runtime's cache state.
  const jsxFirst = count % 2 === 0;
  let reactMs = 0;
  let jsxBindingMs = 0;
  const mountReact = () => {
    const started = performance.now();
    reactRoot = createRoot(reactField);
    const tree = makeReactTree();
    flushSync(() => reactRoot!.render(tree));
    reactMs = performance.now() - started;
  };
  const mountJSX = () => {
    const started = performance.now();
    const tree = makeJSXTree();
    const mounted = runtime.mount(tree, jsxField);
    jsxMounted = mounted;
    jsxBindingMs = performance.now() - started;
  };
  let compiledPlanMs = 0;
  let compiledCsrMs = 0;
  const mountCompiledCsr = () => {
    const started = performance.now();
    csrMounted = mountRepeatedHostPlanCsr(sources, csrField, bindingParticlesPlan);
    compiledCsrMs = performance.now() - started;
  };
  const mountCompiledPlan = () => {
    const started = performance.now();
    compiledMounted = mountGeneratedBindingParticles(sources, compiledField);
    compiledPlanMs = performance.now() - started;
  };
  if (jsxFirst) { mountJSX(); mountReact(); }
  else { mountReact(); mountJSX(); }
  if (count % 2 === 0) { mountCompiledCsr(); mountCompiledPlan(); }
  else { mountCompiledPlan(); mountCompiledCsr(); }

  reactStore = store;
  jsxRuntime = runtime;
  signals = sources;
  reactTargets = Array.from(reactField.querySelectorAll<HTMLElement>(".particle"));
  jsxTargets = Array.from(jsxField.querySelectorAll<HTMLElement>(".particle"));
  csrTargets = Array.from(csrField.querySelectorAll<HTMLElement>(".particle"));
  compiledTargets = Array.from(compiledField.querySelectorAll<HTMLElement>(".particle"));
  setup = { reactMs, jsxBindingMs, compiledCsrMs, compiledPlanMs, bindingCount: compiledMounted!.bindingCount };
};

const runStudy = () => {
  const count = Number(countSelect.value);
  const fraction = Number(fractionSelect.value);
  if (reactTargets.length !== count || signals.length !== count) mountComparison(count);
  const changedCount = Math.max(1, Math.floor(count * fraction));
  const bindingsPerSource = bindingParticlesPlan.bindings.length;
  const ids = createChangedIds(count, changedCount);
  const parityIds = Array.from(ids).filter((_, index) => index % Math.max(1, Math.ceil(ids.length / 64)) === 0);
  const repeats = fraction >= 1 ? 1 : fraction >= 0.1 ? 8 : 32;
  const warmups = 24;
  const pairsCount = 48;
  const seedText = (document.getElementById("seed") as HTMLInputElement).value.trim();
  const requestedSeed = seedText === "" ? null : Number(seedText);
  if (requestedSeed !== null && (!Number.isInteger(requestedSeed) || requestedSeed < 1 || requestedSeed > 0xffff_ffff)) {
    throw new RangeError("Order seed must be an integer from 1 to 4294967295");
  }
  const seed = requestedSeed ?? (crypto.getRandomValues(new Uint32Array(1))[0] || 1);
  let state = seed;
  const random = () => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    return (state >>> 0) / 0x1_0000_0000;
  };
  const orders = [...balancedOrders(warmups, random), ...balancedOrders(pairsCount, random)];
  const pairs: Pair[] = [];
  const totalPairs = warmups + pairsCount;
  const updateReact = (frame: number) => flushSync(() => {
    for (const id of ids) reactStore!.set(id, frame + id);
  });
  const updateJSX = (frame: number) => {
    for (const id of ids) jsxRuntime!.set(signals[id], frame + id);
    jsxMounted!.flush();
  };
  const updateCompiledCsr = (frame: number) => {
    for (const id of ids) csrMounted!.set(id, frame + id);
    csrMounted!.flush();
  };
  const updateCompiledPlan = (frame: number) => {
    for (const id of ids) compiledMounted!.set(id, frame + id);
    compiledMounted!.flush();
  };

  for (let pair = 0; pair < totalPairs; pair++) {
    const order = orders[pair];
    const timingsMs: Record<Arm, number> = { react: 0, jsxBinding: 0, compiledCsr: 0, compiledPlan: 0 };
    for (const arm of order) {
      const start = performance.now();
      for (let repeat = 0; repeat < repeats; repeat++) {
        const frame = pair * repeats + repeat + 1;
        if (arm === "react") updateReact(frame);
        else if (arm === "jsxBinding") updateJSX(frame);
        else if (arm === "compiledCsr") updateCompiledCsr(frame);
        else updateCompiledPlan(frame);
      }
      const elapsed = (performance.now() - start) / repeats;
      timingsMs[arm] = elapsed;
    }
    const valuesMatch = parityIds.every((id) =>
      reactTargets[id].style.transform === jsxTargets[id].style.transform &&
      reactTargets[id].style.transform === csrTargets[id].style.transform &&
      reactTargets[id].style.transform === compiledTargets[id].style.transform &&
      reactTargets[id].style.opacity === jsxTargets[id].style.opacity &&
      reactTargets[id].style.opacity === csrTargets[id].style.opacity &&
      reactTargets[id].style.opacity === compiledTargets[id].style.opacity
    );
    if (pair >= warmups) pairs.push({ pair: pair - warmups + 1, order, timingsMs, valuesMatch, repeats });
  }

  const summaries = Object.fromEntries(([
    "react", "jsxBinding", "compiledCsr", "compiledPlan",
  ] as Arm[]).map((arm) => [arm, {
    medianMs: percentile(pairs.map((pair) => pair.timingsMs[arm]), 0.5),
    p95Ms: percentile(pairs.map((pair) => pair.timingsMs[arm]), 0.95),
  }])) as Record<Arm, { medianMs: number; p95Ms: number }>;
  const result = {
    schemaVersion: 5,
    experiment: "Four-way paired React, TSX mount-time bindings, OXC CSR dependency template, and specialized identity plan with two outputs per source",
    timestamp: new Date().toISOString(),
    randomizationSeed: seed,
    entities: count,
    changedFraction: fraction,
    changedCount,
    bindingsPerSource,
    changedHostPropsPerUpdate: changedCount * bindingsPerSource,
    warmupPairs: warmups,
    timedPairs: pairsCount,
    repeatsPerPair: repeats,
    reactBaseline: "React 19.3 + React Compiler + per-leaf useSyncExternalStore + flushSync",
    jsxBindingPath: "Vite-transformed custom JSX, mount-time binding discovery, CompiledBindings, native style setter",
    compiledCsrPath: "OXC-emitted source-to-binding CSR template expanded to per-edge tuples, runtime CSR index, target closures, and native style setter",
    compiledPlanPath: "OXC-emitted dependency template specialized to an identity layout with a dense JavaScript typed-array dirty scheduler and native style setter",
    compilerPlan: {
      schemaVersion: 3,
      sourceCount: bindingParticlesPlan.dependencyGraph.sourceCount,
      sourceBindingOffsets: [...bindingParticlesPlan.dependencyGraph.sourceBindingOffsets],
      bindingIds: [...bindingParticlesPlan.dependencyGraph.bindingIds],
      bindings: bindingParticlesPlan.bindings.map((binding, id) => ({ id, property: binding.property })),
    },
    setup,
    summary: {
      arms: summaries,
      compiledCsrFasterThanSpecializedPairs: pairs.filter((pair) => pair.timingsMs.compiledCsr < pair.timingsMs.compiledPlan).length,
      specializedFasterThanCsrPairs: pairs.filter((pair) => pair.timingsMs.compiledPlan < pair.timingsMs.compiledCsr).length,
      specializedFasterThanReactPairs: pairs.filter((pair) => pair.timingsMs.compiledPlan < pair.timingsMs.react).length,
      specializedFasterThanMountJsxPairs: pairs.filter((pair) => pair.timingsMs.compiledPlan < pair.timingsMs.jsxBinding).length,
      parityFailures: pairs.filter((pair) => !pair.valuesMatch).length,
    },
    environment: {
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      hardwareConcurrency: navigator.hardwareConcurrency,
      devicePixelRatio: window.devicePixelRatio,
      visibilityState: document.visibilityState,
      react: "19.3.0",
      reactCompiler: "1.0.0",
      build: "Vite production",
      timing: "performance.now; synchronous update plus host commit; paint excluded",
    },
    pairs,
  };
  saveResult(result);
  document.getElementById("latest-record")!.textContent = JSON.stringify(result, null, 2);
  const format = (arm: Arm) => `${summaries[arm].medianMs.toFixed(3)} / ${summaries[arm].p95Ms.toFixed(3)}`;
  resultNode.textContent = `React ${format("react")} ms med/p95 · JSX ${format("jsxBinding")} · CSR ${format("compiledCsr")} · specialized ${format("compiledPlan")} · ` +
    `setup React ${setup.reactMs.toFixed(1)} ms, JSX ${setup.jsxBindingMs.toFixed(1)} ms, CSR ${setup.compiledCsrMs.toFixed(1)} ms, specialized ${setup.compiledPlanMs.toFixed(1)} ms · ${result.summary.parityFailures} parity failures`;
};

document.getElementById("run")!.addEventListener("click", runStudy);
document.getElementById("export")!.addEventListener("click", exportResults);
countSelect.addEventListener("change", () => mountComparison(Number(countSelect.value)));
fractionSelect.addEventListener("change", () => runStudy());
mountComparison(Number(countSelect.value));
