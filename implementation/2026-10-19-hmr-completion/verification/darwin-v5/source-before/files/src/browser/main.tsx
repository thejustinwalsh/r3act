import React, { useCallback, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { createRoot } from "react-dom/client";
import { flushSync } from "react-dom";
import { CompiledBindings, type BindingEdge } from "../compiled_bindings.ts";
import "./style.css";

type Mode = "react" | "graph";
type PairSample = {
  pair: number;
  order: [Mode, Mode];
  reactMs: number;
  graphMs: number;
  valuesMatch: boolean;
  repeats: number;
};

class ReactValueStore {
  readonly values: Float64Array;
  readonly listeners: Array<Set<() => void>>;

  constructor(count: number) {
    this.values = new Float64Array(count);
    this.listeners = Array.from({ length: count }, () => new Set());
  }

  get(id: number) {
    return this.values[id];
  }

  subscribe(id: number, listener: () => void) {
    this.listeners[id].add(listener);
    return () => this.listeners[id].delete(listener);
  }

  set(id: number, value: number) {
    if (Object.is(this.values[id], value)) return;
    this.values[id] = value;
    for (const listener of this.listeners[id]) listener();
  }
}

const RESULTS_KEY = "ui-runtime-research-paired-results-v6";
const WARMUP_PAIRS = 8;
const TIMED_PAIRS = 41;

const readSavedResults = (): unknown[] => {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(RESULTS_KEY) ?? "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const percentile = (values: number[], p: number) => {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.max(0, Math.ceil(p * sorted.length) - 1)];
};

const summarize = (values: number[]) => ({
  medianMs: percentile(values, 0.5),
  p95Ms: percentile(values, 0.95),
});

const createBalancedOrders = (count: number, nextRandom: () => number): Array<[Mode, Mode]> => {
  const orders = Array.from({ length: count }, (_, index) =>
    index % 2 === 0 ? ["react", "graph"] as [Mode, Mode] : ["graph", "react"] as [Mode, Mode]
  );
  for (let index = orders.length - 1; index > 0; index--) {
    const other = Math.floor(nextRandom() * (index + 1));
    [orders[index], orders[other]] = [orders[other], orders[index]];
  }
  return orders;
};

const recordResult = (count: number, fraction: number, pairs: PairSample[], randomizationSeed: number) => {
  const reactStats = summarize(pairs.map((pair) => pair.reactMs));
  const graphStats = summarize(pairs.map((pair) => pair.graphMs));
  const pairedRatios = pairs.filter((pair) => pair.graphMs > 0).map((pair) => pair.reactMs / pair.graphMs);
  const result = {
    schemaVersion: 6,
    experiment: "randomized paired React external store vs compiled binding graph with repeated updates per timing sample",
    randomizationSeed,
    orderProtocol: "xorshift32 Fisher-Yates shuffle; separately balanced warmup and timed arms",
    reactBaseline: "per-entity useSyncExternalStore subscriptions with scalar snapshots",
    timestamp: new Date().toISOString(),
    entityCount: count,
    changedFraction: fraction,
    changedCount: Math.max(1, Math.floor(count * fraction)),
    warmupPairs: WARMUP_PAIRS,
    timedPairs: pairs.length,
    repeatsPerPair: pairs[0]?.repeats ?? 1,
    pairs,
    summary: {
      react: reactStats,
      graph: graphStats,
      medianPairedDifferenceMs: percentile(pairs.map((pair) => pair.reactMs - pair.graphMs), 0.5),
      medianPairedRatio: pairedRatios.length > 0 ? percentile(pairedRatios, 0.5) : null,
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
      reactBaseline: "per-entity useSyncExternalStore; stable scalar snapshots; React Compiler",
      graphPath: "compiled bindings; diagnostics disabled during timed flush",
      build: "Vite production",
      timing: "performance.now; synchronous update plus host commit; paint excluded",
    },
  };
  const saved = [...readSavedResults(), result].slice(-50);
  localStorage.setItem(RESULTS_KEY, JSON.stringify(saved));
  console.info("[ui-research-paired-benchmark]", JSON.stringify(result));
  return result;
};

const exportResults = () => {
  const contents = JSON.stringify(readSavedResults(), null, 2);
  const url = URL.createObjectURL(new Blob([contents], { type: "application/json" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = `ui-runtime-paired-results-${new Date().toISOString().replaceAll(":", "-")}.json`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};

const createIds = (count: number, changedCount: number) => {
  const ids = new Uint32Array(changedCount);
  const stride = Math.max(1, Math.floor(count / changedCount));
  for (let i = 0; i < changedCount; i++) ids[i] = (i * stride) % count;
  return ids;
};

function ReactLeaf({
  id,
  store,
  registerTarget,
}: {
  id: number;
  store: ReactValueStore;
  registerTarget: (id: number, node: HTMLDivElement | null) => void;
}) {
  const subscribe = useCallback((listener: () => void) => store.subscribe(id, listener), [id, store]);
  const getSnapshot = useCallback(() => store.get(id), [id, store]);
  const x = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  return (
    <div
      className="particle"
      ref={(node) => registerTarget(id, node)}
      style={{ transform: `translate3d(${x % 320}px, 0, 0)` }}
    />
  );
}

function App() {
  const targets = useRef<Array<HTMLDivElement | null>>([]);
  const [report, setReport] = useState("Run a randomized paired comparison to collect browser timings.");
  const [count, setCount] = useState(1_000);
  const [fraction, setFraction] = useState(0.1);
  const ids = useMemo(() => createIds(count, Math.max(1, Math.floor(count * fraction))), [count, fraction]);
  const parityIds = useMemo(
    () => Array.from(ids).filter((_, index) => index % Math.max(1, Math.ceil(ids.length / 32)) === 0),
    [ids],
  );
  const graph = useMemo(() => {
    const edges: BindingEdge[] = Array.from({ length: count }, (_, id) => [id, id] as const);
    return new CompiledBindings(count, count, edges);
  }, [count]);
  const reactStore = useMemo(() => new ReactValueStore(count), [count]);
  const repeatsPerPair = fraction >= 1 ? 1 : fraction >= 0.1 ? 8 : 32;

  const registerTarget = useCallback((id: number, node: HTMLDivElement | null) => {
    targets.current[id] = node;
  }, []);

  const updateReact = (frame: number) => {
    flushSync(() => {
      for (const id of ids) reactStore.set(id, frame + id);
    });
  };

  const updateGraph = (frame: number) => {
    for (const id of ids) graph.set(id, frame + id);
    graph.flush((target, value) => {
      const node = targets.current[target];
      if (node) node.style.transform = `translate3d(${value % 320}px, 0, 0)`;
    }, false);
  };

  const run = () => {
    const pairs: PairSample[] = [];
    const totalPairs = WARMUP_PAIRS + TIMED_PAIRS;
    const randomizationSeed = crypto.getRandomValues(new Uint32Array(1))[0] || 1;
    let randomState = randomizationSeed;
    const nextRandom = () => {
      randomState ^= randomState << 13;
      randomState ^= randomState >>> 17;
      randomState ^= randomState << 5;
      return (randomState >>> 0) / 0x1_0000_0000;
    };
    const orders = [
      ...createBalancedOrders(WARMUP_PAIRS, nextRandom),
      ...createBalancedOrders(TIMED_PAIRS, nextRandom),
    ];
    for (let pair = 1; pair <= totalPairs; pair++) {
      const order = orders[pair - 1];
      let reactMs = 0;
      let graphMs = 0;
      let firstOutput: string[] = [];
      for (const mode of order) {
        const start = performance.now();
        for (let repeat = 0; repeat < repeatsPerPair; repeat++) {
          const frame = (pair - 1) * repeatsPerPair + repeat + 1;
          if (mode === "react") updateReact(frame);
          else updateGraph(frame);
        }
        const elapsed = (performance.now() - start) / repeatsPerPair;
        if (mode === "react") reactMs = elapsed;
        else graphMs = elapsed;
        if (mode === order[0]) firstOutput = parityIds.map((id) => targets.current[id]?.style.transform ?? "");
      }

      if (pair > WARMUP_PAIRS) {
        const finalOutput = parityIds.map((id) => targets.current[id]?.style.transform ?? "");
        const valuesMatch = firstOutput.length === finalOutput.length && firstOutput.every((value, index) => value === finalOutput[index]);
        pairs.push({ pair: pair - WARMUP_PAIRS, order, reactMs, graphMs, valuesMatch, repeats: repeatsPerPair });
      }
    }

    const result = recordResult(count, fraction, pairs, randomizationSeed);
    const { react, graph: graphSummary, medianPairedDifferenceMs, medianPairedRatio, parityFailures } = result.summary;
    setReport(
      `paired median ${medianPairedDifferenceMs >= 0 ? "React +" : "graph +"}${Math.abs(medianPairedDifferenceMs).toFixed(3)} ms · ` +
      `React ${react.medianMs.toFixed(3)} / ${react.p95Ms.toFixed(3)} ms p95 · ` +
      `graph ${graphSummary.medianMs.toFixed(3)} / ${graphSummary.p95Ms.toFixed(3)} ms p95 · ` +
      `${parityFailures} parity failures · median paired ratio ${medianPairedRatio?.toFixed(2) ?? "below timer floor"}×`,
    );
  };

  return (
    <main>
      <header>
        <p className="eyebrow">Research prototype · React 19.3 + React Compiler</p>
        <h1>Paired declarative update study</h1>
        <p>Each pair applies the same sequence of updates to the same DOM nodes. Order is randomized per pair; sparse workloads repeat inside each timing sample to rise above the browser timer floor. Timing ends after synchronous host commit and excludes paint.</p>
        <a className="game-link" href="/snake-game.html">Play the per-frame Snake demo <span aria-hidden="true">↗</span></a>
      </header>
      <section className="controls" aria-label="Benchmark controls">
        <label>Entities <select value={count} onChange={(event) => setCount(Number(event.target.value))}>
          <option value={1_000}>1,000</option><option value={5_000}>5,000</option><option value={10_000}>10,000</option>
        </select></label>
        <label>Changed each update <select value={fraction} onChange={(event) => setFraction(Number(event.target.value))}>
          <option value={0.01}>1%</option><option value={0.1}>10%</option><option value={1}>100%</option>
        </select></label>
        <button type="button" onClick={run}>Run paired study</button>
        <button type="button" onClick={exportResults}>Export paired samples</button>
      </section>
      <section className="benchmark" aria-label="Benchmark run">
        <button type="button" onClick={run}>Run paired study</button>
        <p className="result" aria-live="polite">{report}</p>
        <div className="field" style={{ height: Math.min(640, Math.ceil(count / 200) * 12 + 8) }}>
          {Array.from({ length: count }, (_, id) => <ReactLeaf key={id} id={id} store={reactStore} registerTarget={registerTarget} />)}
        </div>
      </section>
      <aside>
        <strong>Interpretation:</strong> React updates a per-entity external store, notifies subscribers, runs the compiled component path, diffs props, and commits. The graph path updates precompiled scalar bindings and uses a ref-based style adapter. Both touch the same changed nodes and output values; the graph still lacks JSX compilation and general ecosystem compatibility. Every timed pair and its randomized order is saved with environment metadata.
      </aside>
    </main>
  );
}

createRoot(document.getElementById("root")!).render(<App />);
