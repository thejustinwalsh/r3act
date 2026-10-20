import { createRoot, type Root } from "react-dom/client";
import { flushSync } from "react-dom";
import { jsx, type RuntimeNode } from "../jsx_binding_runtime.ts";
import { DOMVDOMHost, VDOMSnapshotRoot } from "../vdom_snapshot_runtime.ts";
import { DerivedRegionDispatcher } from "../derived_region_runtime.ts";
import { keyedFilterRegionPlan } from "./generated_keyed_filter_region.ts";
import { parseGateAAutoRun } from "../keyed_filter_protocol.ts";
import "./style.css";

type Row = Readonly<{ id: number; label: string; group: number; score: number }>;
type Arm = "react" | "handwritten" | "compiled";
type Retention = { preserved: number; shared: number };
type Pair = { pair: number; order: Arm[]; millisecondsPerChange: Record<Arm, number>; sameOutput: boolean; transitionsCompared: number; keyRetention: Record<Arm, Retention> };

const queries = ["", "group:0", "group:7", "even", "odd", "score:80", "group:3", ""];
const autoRunConfig = parseGateAAutoRun(location.search);
const selectRows = (rows: readonly Row[], query: string) => rows.filter((row) => query === "" ||
  (query === "even" && row.id % 2 === 0) ||
  (query === "odd" && row.id % 2 !== 0) ||
  (query.startsWith("group:") && row.group === Number(query.slice(6))) ||
  (query.startsWith("score:") && row.score >= Number(query.slice(6))) ||
  (!query.startsWith("group:") && !query.startsWith("score:") &&
    query !== "even" && query !== "odd" && row.label.includes(query.toLowerCase()))
);

function ReactList({ rows, query }: { rows: readonly Row[]; query: string }) {
  const visible = selectRows(rows, query);
  return <ul className="keyed-list">{visible.map((row) =>
    <li key={row.id} data-id={row.id}>{row.label} · group {row.group} · score {row.score}</li>
  )}</ul>;
}

const runtimeTree = (rows: readonly Row[], query: string): RuntimeNode => {
  const visible = selectRows(rows, query);
  return jsx("ul", { className: "keyed-list" }, visible.map((row) =>
    jsx("li", { key: row.id, "data-id": row.id }, `${row.label} · group ${row.group} · score ${row.score}`)
  ));
};

const percentile = (values: number[], p: number) => {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.max(0, Math.ceil(p * sorted.length) - 1)];
};
const freshSeed = () => crypto.getRandomValues(new Uint32Array(1))[0] || 1;
const resultsKey = "keyed-filter-react-runtime-v5";
const readResults = (): unknown[] => {
  return readResultsFrom(resultsKey);
};
const readResultsFrom = (key: string): unknown[] => {
  try {
    const saved: unknown = JSON.parse(localStorage.getItem(key) ?? "[]");
    return Array.isArray(saved) ? saved : [];
  } catch { return []; }
};
const exportResults = () => {
  const legacy = readResultsFrom("keyed-filter-react-runtime-v3").map((record: any) => ({ ...record, exportedFromStore: "v3" }));
  const current = readResults().map((record: any) => ({ ...record, exportedFromStore: "v5" }));
  const unique = new Map<string, unknown>();
  for (const record of [...legacy, ...current] as Array<{ pageLoadId?: string; seed?: number; entityCount?: number }>) {
    unique.set(`${record.pageLoadId}:${record.entityCount}:${record.seed}`, record);
  }
  const url = URL.createObjectURL(new Blob([JSON.stringify([...unique.values()], null, 2)], { type: "application/json" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = `keyed-filter-${new Date().toISOString().replaceAll(":", "-")}.json`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};

const pageLoadId = crypto.randomUUID();
const urlParams = new URLSearchParams(location.search);
const studySessionId = autoRunConfig.kind === "ready"
  ? autoRunConfig.sessionId
  : urlParams.get("session")?.trim() || null;
document.getElementById("root")!.innerHTML = `
  <main>
    <header>
      <p class="eyebrow">Research gate A · state-derived keyed structure</p>
      <h1>Filter a keyed list: React, direct invalidation, and compiled graph</h1>
      <p>Each query derives a different visible set from the same stable rows. All three arms build declarative keyed output and commit it to separate DOM containers. The timed path includes filtering, element creation, reconciliation, and synchronous DOM commit.</p>
    </header>
    <section class="controls" aria-label="Study controls">
      <label>Rows <select id="count"><option value="1000">1,000</option><option value="5000">5,000</option><option value="10000" selected>10,000</option></select></label>
      <label>Seed <input id="seed" type="number" min="1" max="4294967295" placeholder="random"></label>
      <button id="run" type="button">Run paired study</button>
      <button id="export" type="button">Export saved samples</button>
    </section>
    <p id="result" class="result" aria-live="polite">Mounting equivalent initial lists…</p>
    <details><summary>Latest raw record</summary><pre id="record">Run the paired study to populate samples and environment metadata.</pre></details>
    <div class="prototype-fields">
      <section><h2>React 19.3 + React Compiler</h2><div id="react-field" class="field keyed-field"></div></section>
      <section><h2>Retained keyed VDOM + handwritten invalidation</h2><div id="runtime-field" class="field keyed-field"></div></section>
      <section><h2>Retained keyed VDOM + OXC region graph</h2><div id="compiled-field" class="field keyed-field"></div></section>
    </div>
    <aside><strong>Validity:</strong> all three arms use the same filter predicate, rows, and stable row IDs. The OXC plan maps both <code>query</code> and <code>rows</code> to the keyed list region. Timings exclude paint/presentation. React uses <code>flushSync</code> for comparable synchronous commit boundaries; both VDOM arms reconcile and commit the same keyed output. The compiled arm dispatches the compiler-emitted source-to-region CSR graph before deriving the affected region.</aside>
  </main>`;

const countNode = document.querySelector<HTMLSelectElement>("#count")!;
const seedNode = document.querySelector<HTMLInputElement>("#seed")!;
const resultNode = document.querySelector<HTMLElement>("#result")!;
const recordNode = document.querySelector<HTMLElement>("#record")!;
const reactField = document.querySelector<HTMLElement>("#react-field")!;
const runtimeField = document.querySelector<HTMLElement>("#runtime-field")!;
const compiledField = document.querySelector<HTMLElement>("#compiled-field")!;
const requestedCount = urlParams.get("count");
if (autoRunConfig.kind === "ready") {
  countNode.value = String(autoRunConfig.count);
  seedNode.value = String(autoRunConfig.seed);
} else if (["1000", "5000", "10000"].includes(requestedCount ?? "")) {
  countNode.value = requestedCount!;
}
let reactRoot: Root | null = null;
let runtimeRoot: VDOMSnapshotRoot<Node, Node> | null = null;
let compiledRoot: VDOMSnapshotRoot<Node, Node> | null = null;
let runtimeRegions: DerivedRegionDispatcher | null = null;
const querySourceSlot = keyedFilterRegionPlan.dependency_graph.source_paths.indexOf("query");
if (querySourceSlot < 0) throw new Error("Compiled keyed-filter plan is missing the query dependency");
let rows: Row[] = [];
let mountedCount = 0;
let mountTimings: Record<Arm, number> = { react: 0, handwritten: 0, compiled: 0 };
let saved = readResults();

const makeRows = (count: number): Row[] => Array.from({ length: count }, (_, id) => ({
  id,
  label: `item ${String(id).padStart(5, "0")}`,
  group: id % 100,
  score: (id * 37 + 11) % 101,
}));

function mount(count: number) {
  if (reactRoot) flushSync(() => reactRoot!.unmount());
  runtimeRoot?.dispose();
  compiledRoot?.dispose();
  reactField.replaceChildren();
  runtimeField.replaceChildren();
  compiledField.replaceChildren();
  rows = makeRows(count);
  const reactStarted = performance.now();
  const react = createRoot(reactField);
  flushSync(() => react.render(<ReactList rows={rows} query={queries[0]} />));
  const reactMountMs = performance.now() - reactStarted;
  const runtimeStarted = performance.now();
  const nextRuntime = new VDOMSnapshotRoot(new DOMVDOMHost(), runtimeField);
  nextRuntime.commit(runtimeTree(rows, queries[0]));
  const runtimeMountMs = performance.now() - runtimeStarted;
  const compiledStarted = performance.now();
  runtimeRegions = new DerivedRegionDispatcher(keyedFilterRegionPlan.dependency_graph);
  const nextCompiled = new VDOMSnapshotRoot(new DOMVDOMHost(), compiledField);
  nextCompiled.commit(runtimeTree(rows, queries[0]));
  const compiledMountMs = performance.now() - compiledStarted;
  reactRoot = react;
  runtimeRoot = nextRuntime;
  compiledRoot = nextCompiled;
  mountTimings = { react: reactMountMs, handwritten: runtimeMountMs, compiled: compiledMountMs };
  mountedCount = count;
}

const keyedNodes = (container: HTMLElement) => {
  const result = new Map<number, Element>();
  for (const element of container.querySelectorAll<HTMLElement>("li[data-id]")) result.set(Number(element.dataset.id), element);
  return result;
};
const countPreserved = (before: Map<number, Element>, after: Map<number, Element>) => {
  let count = 0;
  for (const [id, element] of before) if (after.get(id) === element) count++;
  return count;
};
const listDigest = (container: HTMLElement) => {
  let first = 0x811c9dc5;
  let second = 0x9e3779b9;
  let count = 0;
  for (const node of container.querySelectorAll<HTMLElement>("li[data-id]")) {
    const value = `${node.dataset.id}:${node.textContent}\n`;
    for (let index = 0; index < value.length; index++) {
      const code = value.charCodeAt(index);
      first = Math.imul(first ^ code, 0x01000193);
      second = Math.imul(second ^ code, 0x85ebca6b);
    }
    count++;
  }
  return `${count}:${first >>> 0}:${second >>> 0}`;
};
const outputSignature = (container: HTMLElement) => Array.from(container.querySelectorAll("li[data-id]"), (node) =>
  `${(node as HTMLElement).dataset.id}:${node.textContent}`
).join("\n");

function runStudy() {
  const count = Number(countNode.value);
  if (mountedCount !== count) mount(count);
  const warmups = 6;
  const timedPairs = 24;
  const seed = seedNode.value.trim() === "" ? freshSeed() : Number(seedNode.value);
  if (!Number.isInteger(seed) || seed < 1 || seed > 0xffff_ffff) throw new RangeError("Seed must be an integer from 1 to 4294967295");
  let randomState = seed;
  const random = () => {
    randomState ^= randomState << 13;
    randomState ^= randomState >>> 17;
    randomState ^= randomState << 5;
    return (randomState >>> 0) / 0x1_0000_0000;
  };
  const balancedOrders = (length: number) => {
    const permutations: Arm[][] = [
      ["react", "handwritten", "compiled"],
      ["react", "compiled", "handwritten"],
      ["handwritten", "react", "compiled"],
      ["handwritten", "compiled", "react"],
      ["compiled", "react", "handwritten"],
      ["compiled", "handwritten", "react"],
    ];
    const orders = Array.from({ length }, (_, index) => [...permutations[index % permutations.length]]);
    for (let index = orders.length - 1; index > 0; index--) {
      const swap = Math.floor(random() * (index + 1));
      [orders[index], orders[swap]] = [orders[swap], orders[index]];
    }
    return orders;
  };
  const orders = [...balancedOrders(warmups), ...balancedOrders(timedPairs)];
  const pairs: Pair[] = [];
  const update = (arm: Arm, query: string) => {
    if (arm === "react") flushSync(() => reactRoot!.render(<ReactList rows={rows} query={query} />));
    else if (arm === "handwritten") runtimeRoot!.commit(runtimeTree(rows, query));
    else {
      runtimeRegions!.invalidateSourceSlot(querySourceSlot);
      runtimeRegions!.flush((regionId) => {
        if (regionId !== keyedFilterRegionPlan.region_id) throw new Error(`Unknown compiled region ${regionId}`);
        compiledRoot!.commit(runtimeTree(rows, query));
      });
    }
  };
  const runSequence = (arm: Arm) => {
    const field = arm === "react" ? reactField : arm === "handwritten" ? runtimeField : compiledField;
    let elapsed = 0;
    let preserved = 0;
    let shared = 0;
    const digests: string[] = [];
    for (const query of queries.slice(1)) {
      const before = keyedNodes(field);
      const started = performance.now();
      update(arm, query);
      elapsed += performance.now() - started;
      const after = keyedNodes(field);
      const transitionPreserved = countPreserved(before, after);
      let transitionShared = 0;
      for (const id of before.keys()) if (after.has(id)) transitionShared++;
      if (transitionPreserved !== transitionShared) {
        throw new Error(`${arm} replaced keyed DOM nodes that should have survived this transition`);
      }
      preserved += transitionPreserved;
      shared += transitionShared;
      digests.push(listDigest(field));
    }
    return { millisecondsPerChange: elapsed / (queries.length - 1), retention: { preserved, shared }, digests };
  };
  for (let index = 0; index < warmups + timedPairs; index++) {
    const order = orders[index];
    const timingsMs: Record<Arm, number> = { react: 0, handwritten: 0, compiled: 0 };
    const keyRetention: Record<Arm, Retention> = {
      react: { preserved: 0, shared: 0 },
      handwritten: { preserved: 0, shared: 0 },
      compiled: { preserved: 0, shared: 0 },
    };
    const sequenceDigests: Partial<Record<Arm, string[]>> = {};
    for (const arm of order) {
      const result = runSequence(arm);
      timingsMs[arm] = result.millisecondsPerChange;
      keyRetention[arm] = result.retention;
      sequenceDigests[arm] = result.digests;
    }
    const sameOutput = (["handwritten", "compiled"] as Arm[]).every((arm) =>
      JSON.stringify(sequenceDigests.react) === JSON.stringify(sequenceDigests[arm])
    );
    if (!sameOutput) throw new Error(`DOM output diverged during a keyed transition in paired sequence ${index + 1}`);
    if (index >= warmups) pairs.push({ pair: index - warmups + 1, order, millisecondsPerChange: timingsMs, sameOutput, transitionsCompared: queries.length - 1, keyRetention });
  }
  const summaries = Object.fromEntries(((["react", "handwritten", "compiled"] as Arm[]).map((arm) => [arm, {
    medianMs: percentile(pairs.map((pair) => pair.millisecondsPerChange[arm]), 0.5),
    p95Ms: percentile(pairs.map((pair) => pair.millisecondsPerChange[arm]), 0.95),
  }]))) as Record<Arm, { medianMs: number; p95Ms: number }>;
  const record = {
    schemaVersion: 3,
    protocolVersion: "gate-a-balanced-v2",
    experiment: "state-derived keyed list filter: React 19.3 + React Compiler vs handwritten and OXC-compiled retained VDOM",
    timestamp: new Date().toISOString(),
    sessionId: studySessionId,
    pageLoadId,
    seed,
    entityCount: count,
    querySequence: queries,
    warmupPairs: warmups,
    timedPairs,
    armOrderCounts: {
      reactFirst: pairs.filter((pair) => pair.order[0] === "react").length,
      handwrittenFirst: pairs.filter((pair) => pair.order[0] === "handwritten").length,
      compiledFirst: pairs.filter((pair) => pair.order[0] === "compiled").length,
    },
    updatePath: "filter stable rows, construct keyed declarative children, reconcile membership, synchronously commit DOM; compare direct and graph invalidation",
    react: { version: "19.3.0", compiler: "babel-plugin-react-compiler target 19", update: "root render, filtered component output, keyed diff, flushSync commit" },
    handwritten: { update: "direct query-to-region invalidation, filtered RuntimeElement output, retained keyed VDOM diff, DOM commit", compilerGraph: false },
    compiled: { update: "OXC source-to-keyed-region CSR dispatch, filtered RuntimeElement output, retained keyed VDOM diff, DOM commit", compilerGraph: true, compiler: "OXC 0.153.0", graph: keyedFilterRegionPlan.dependency_graph },
    browser: { userAgent: navigator.userAgent, hardwareConcurrency: navigator.hardwareConcurrency, devicePixelRatio },
    mountMs: { ...mountTimings, samplesPerArm: 1, includes: "root and dispatcher creation, JSX/RuntimeElement construction, first keyed-list commit; excludes shared row-data creation and unmount", compilerBuildTimeIncluded: false },
    summaries,
    outputParity: pairs.every((pair) => pair.sameOutput),
    finalParity: outputSignature(reactField) === outputSignature(runtimeField) && outputSignature(reactField) === outputSignature(compiledField),
    pairs,
    validity: "All arms receive identical row data, query sequences, and filter predicates. Update includes filtering, declarative element creation, keyed structural diff, and synchronous DOM commit; compiled updates also include CSR graph dispatch. Every intermediate visible list is digest-compared outside timing; each of the six arm orders is balanced. Mount includes region-dispatcher setup for the compiled arm and is one descriptive sample per arm/page load. Paint/presentation excluded. The graph invalidates one derived region for query updates; the rows edge is validated in runtime tests."
  };
  saved.push(record);
  localStorage.setItem(resultsKey, JSON.stringify(saved));
  recordNode.textContent = JSON.stringify(record, null, 2);
  resultNode.textContent = `${count.toLocaleString()} rows · React ${summaries.react.medianMs.toFixed(2)} ms · handwritten ${summaries.handwritten.medianMs.toFixed(2)} ms · compiled ${summaries.compiled.medianMs.toFixed(2)} ms · parity ${record.outputParity && record.finalParity ? "PASS" : "FAIL"}`;
  if (!record.outputParity || !record.finalParity) resultNode.setAttribute("data-failed", "true");
  else resultNode.removeAttribute("data-failed");
}

document.querySelector("#run")!.addEventListener("click", () => {
  try { runStudy(); }
  catch (error) { resultNode.textContent = `Study failed: ${String(error)}`; resultNode.setAttribute("data-failed", "true"); }
});
document.querySelector("#export")!.addEventListener("click", exportResults);
countNode.addEventListener("change", () => mount(Number(countNode.value)));
mount(Number(countNode.value));
if (autoRunConfig.kind === "invalid") {
  resultNode.textContent = `Invalid auto-run URL: ${autoRunConfig.message}.`;
  resultNode.setAttribute("data-failed", "true");
} else if (autoRunConfig.kind === "ready") {
  resultNode.textContent = `Equivalent ${autoRunConfig.count.toLocaleString()}-row lists mounted · auto-running ${autoRunConfig.sessionId}`;
  window.setTimeout(() => document.querySelector<HTMLButtonElement>("#run")!.click(), 0);
} else {
  resultNode.textContent = "Equivalent keyed lists mounted. Run the three-arm paired study.";
}
