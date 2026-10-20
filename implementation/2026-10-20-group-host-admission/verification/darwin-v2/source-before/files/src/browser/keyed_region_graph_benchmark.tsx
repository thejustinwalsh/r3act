import { createRoot, type Root } from "react-dom/client";
import { flushSync } from "react-dom";
import { memo } from "react";
import { jsx, type RuntimeNode } from "../jsx_binding_runtime.ts";
import { DOMVDOMHost, VDOMSnapshotRoot } from "../vdom_snapshot_runtime.ts";
import { DerivedRegionDispatcher } from "../derived_region_runtime.ts";
import { keyedFilterRegionsPlan } from "./generated_keyed_filter_regions.ts";
import { parseGateAAutoRun } from "../keyed_filter_protocol.ts";
import "./style.css";

type Row = Readonly<
  { id: number; label: string; group: number; score: number }
>;
type Arm = "react" | "handwritten" | "compiled";
type Region = 0 | 1;
type QuerySource = "queryA" | "queryB";
type QueryState = Record<QuerySource, string>;
type QueryUpdate = Readonly<{ source: QuerySource; value: string }>;
type Retention = { preserved: number; shared: number };
type Pair = {
  pair: number;
  order: Arm[];
  millisecondsPerChange: Record<Arm, number>;
  sameOutput: boolean;
  transitionsCompared: number;
  keyRetention: Record<Arm, Retention>;
};

const updates: readonly QueryUpdate[] = [
  { source: "queryA", value: "7" },
  { source: "queryB", value: "80" },
  { source: "queryA", value: "3" },
  { source: "queryB", value: "50" },
  { source: "queryA", value: "1" },
  { source: "queryB", value: "95" },
  { source: "queryA", value: "0" },
  { source: "queryB", value: "0" },
];
const initialQueries = (): QueryState => ({ queryA: "0", queryB: "0" });
const regionNames = ["groups", "scores"] as const;
const autoRunConfig = parseGateAAutoRun(location.search);

const selectRegion = (rows: readonly Row[], query: string, region: Region) => {
  if (region === 0) {
    const group = Number(query);
    return rows.filter((row) => row.group === group);
  }
  const minimum = Number(query);
  return rows.filter((row) => row.score >= minimum);
};

const regionList = (
  rows: readonly Row[],
  query: string,
  region: Region,
): RuntimeNode => {
  const visible = selectRegion(rows, query, region);
  return jsx(
    "ul",
    { className: "keyed-list" },
    visible.map((row) =>
      jsx(
        "li",
        { key: row.id, "data-id": row.id },
        `${row.label} · group ${row.group} · score ${row.score}`,
      )
    ),
  );
};

const runtimeTree = (rows: readonly Row[], queries: QueryState): RuntimeNode =>
  jsx(
    "main",
    { className: "keyed-regions" },
    jsx(
      "section",
      { "data-region": "groups" },
      regionList(rows, queries.queryA, 0),
    ),
    jsx(
      "section",
      { "data-region": "scores" },
      regionList(rows, queries.queryB, 1),
    ),
  );

const ReactRegion = memo(
  function ReactRegion(
    { rows, query, region }: {
      rows: readonly Row[];
      query: string;
      region: Region;
    },
  ) {
    const visible = selectRegion(rows, query, region);
    return (
      <section data-region={regionNames[region]}>
        <ul className="keyed-list">
          {visible.map((row) => (
            <li key={row.id} data-id={row.id}>
              {row.label} · group {row.group} · score {row.score}
            </li>
          ))}
        </ul>
      </section>
    );
  },
);

function ReactLists(
  { rows, queries }: { rows: readonly Row[]; queries: QueryState },
) {
  return (
    <main className="keyed-regions">
      <ReactRegion rows={rows} query={queries.queryA} region={0} />
      <ReactRegion rows={rows} query={queries.queryB} region={1} />
    </main>
  );
}

const percentile = (values: number[], p: number) => {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.max(0, Math.ceil(p * sorted.length) - 1)];
};
const freshSeed = () => crypto.getRandomValues(new Uint32Array(1))[0] || 1;
const resultsKey = "keyed-region-graph-react-v6";
const frameResultsKey = "keyed-region-frame-pacing-v1";
const readResultsFrom = (key: string): unknown[] => {
  try {
    const saved: unknown = JSON.parse(localStorage.getItem(key) ?? "[]");
    return Array.isArray(saved) ? saved : [];
  } catch {
    return [];
  }
};
const readResults = () => readResultsFrom(resultsKey);
const exportResults = () => {
  const previous = [
    "keyed-filter-react-runtime-v3",
    "keyed-filter-react-runtime-v4",
    "keyed-filter-react-runtime-v5",
  ]
    .flatMap((key) =>
      readResultsFrom(key).map((record: any) => ({
        ...record,
        exportedFromStore: key,
      }))
    );
  const current = readResults().map((record: any) => ({
    ...record,
    exportedFromStore: resultsKey,
  }));
  const all = [...previous, ...current];
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(all, null, 2)], { type: "application/json" }),
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = `keyed-region-graph-${
    new Date().toISOString().replaceAll(":", "-")
  }.json`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};

const plan = keyedFilterRegionsPlan;
if (plan.schema_version !== 2 || plan.regions.length !== 2) {
  throw new Error("Expected the two-region OXC keyed-filter plan");
}
const graph = plan.dependency_graph;
const sourceSlots = new Map(
  graph.source_paths.map((source, slot) => [source, slot]),
);
const queryASlot = sourceSlots.get("queryA");
const queryBSlot = sourceSlots.get("queryB");
if (queryASlot === undefined || queryBSlot === undefined) {
  throw new Error("Compiled region graph is missing a query edge");
}

const pageLoadId = crypto.randomUUID();
const urlParams = new URLSearchParams(location.search);
const studySessionId = autoRunConfig.kind === "ready"
  ? autoRunConfig.sessionId
  : urlParams.get("session")?.trim() || null;
document.getElementById("root")!.innerHTML = `
  <main>
    <header>
      <p class="eyebrow">Research gate A · compiler-derived keyed regions</p>
      <h1>Update one derived region in a keyed VDOM</h1>
      <p>Two independently filtered keyed lists share the same rows. Each transition changes one query. The test asks whether the compiler graph can rebuild only the dependent region while preserving the other list.</p>
    </header>
    <section class="controls" aria-label="Study controls">
      <label>Rows <select id="count"><option value="1000">1,000</option><option value="5000">5,000</option><option value="10000" selected>10,000</option></select></label>
      <label>Seed <input id="seed" type="number" min="1" max="4294967295" placeholder="random"></label>
      <button id="run" type="button">Run paired study</button>
      <button id="run-frames" type="button">Run frame pacing study</button>
      <button id="run-frame-attribution" type="button">Run frame + LoAF attribution</button>
      <button id="export-frames" type="button">Export frame samples</button>
      <button id="save-frames" type="button">Save latest frame run</button>
      <button id="export" type="button">Export saved samples</button>
    </section>
    <p id="result" class="result" aria-live="polite">Mounting equivalent two-region lists…</p>
    <details><summary>Latest raw record</summary><pre id="record">Run the paired study to populate samples and environment metadata.</pre></details>
    <div class="prototype-fields">
      <section><h2>React 19.3 + React Compiler</h2><div id="react-field" class="field keyed-field"></div></section>
      <section><h2>Retained keyed VDOM + whole-tree derivation</h2><div id="handwritten-field" class="field keyed-field"></div></section>
      <section><h2>Retained keyed VDOM + OXC region DAG</h2><div id="compiled-field" class="field keyed-field"></div></section>
    </div>
    <aside><strong>Plan:</strong> <code>queryA</code> invalidates region 0, <code>queryB</code> invalidates region 1, and shared <code>rows</code> invalidates both. The React arm uses memoized region components with stable row inputs. The handwritten VDOM arm recomputes both regions; the compiled arm dispatches and commits only the changed region. All arms verify each intermediate list and retained keyed-node identity. The separate frame study records requestAnimationFrame callback intervals around one update per frame; it estimates missed frame opportunities, not actual display presentation.</aside>
  </main>`;

const countNode = document.querySelector<HTMLSelectElement>("#count")!;
const seedNode = document.querySelector<HTMLInputElement>("#seed")!;
const resultNode = document.querySelector<HTMLElement>("#result")!;
const recordNode = document.querySelector<HTMLElement>("#record")!;
const reactField = document.querySelector<HTMLElement>("#react-field")!;
const handwrittenField = document.querySelector<HTMLElement>(
  "#handwritten-field",
)!;
const compiledField = document.querySelector<HTMLElement>("#compiled-field")!;
const frameFields: Record<Arm, HTMLElement> = {
  react: reactField,
  handwritten: handwrittenField,
  compiled: compiledField,
};
const framePlaceholders = Object.fromEntries(
  Object.entries(frameFields).map(([arm, field]) => {
    const placeholder = document.createElement("div");
    placeholder.className = field.className;
    placeholder.setAttribute("aria-hidden", "true");
    return [arm, placeholder];
  }),
) as Record<Arm, HTMLElement>;
const framePanels = Object.fromEntries(
  Object.entries(frameFields).map((
    [arm, field],
  ) => [arm, field.parentElement!]),
) as Record<Arm, HTMLElement>;
const requestedCount = urlParams.get("count");
if (autoRunConfig.kind === "ready") {
  countNode.value = String(autoRunConfig.count);
  seedNode.value = String(autoRunConfig.seed);
} else if (["1000", "5000", "10000"].includes(requestedCount ?? "")) {
  countNode.value = requestedCount!;
}

let reactRoot: Root | null = null;
let handwrittenRoot: VDOMSnapshotRoot<Node, Node> | null = null;
let compiledRoots: Array<VDOMSnapshotRoot<Node, Node>> = [];
let regions: DerivedRegionDispatcher | null = null;
let rows: Row[] = [];
let mountedCount = 0;
let mountTimings: Record<Arm, number> = {
  react: 0,
  handwritten: 0,
  compiled: 0,
};
let saved = readResults();

const makeRows = (count: number): Row[] =>
  Array.from({ length: count }, (_, id) => ({
    id,
    label: `item ${String(id).padStart(5, "0")}`,
    group: id % 100,
    score: (id * 37 + 11) % 101,
  }));

const makeCompiledShell = (container: HTMLElement) => {
  const main = document.createElement("main");
  main.className = "keyed-regions";
  const sections = regionNames.map((name) => {
    const section = document.createElement("section");
    section.dataset.region = name;
    main.append(section);
    return section;
  });
  container.replaceChildren(main);
  return sections;
};

function mount(count: number) {
  if (reactRoot) flushSync(() => reactRoot!.unmount());
  handwrittenRoot?.dispose();
  for (const root of compiledRoots) root.dispose();
  reactField.replaceChildren();
  handwrittenField.replaceChildren();
  compiledField.replaceChildren();
  rows = makeRows(count);
  const initial = initialQueries();

  const reactStarted = performance.now();
  const nextReact = createRoot(reactField);
  flushSync(() =>
    nextReact.render(<ReactLists rows={rows} queries={initial} />)
  );
  const reactMountMs = performance.now() - reactStarted;

  const handwrittenStarted = performance.now();
  const nextHandwritten = new VDOMSnapshotRoot(
    new DOMVDOMHost(),
    handwrittenField,
  );
  nextHandwritten.commit(runtimeTree(rows, initial));
  const handwrittenMountMs = performance.now() - handwrittenStarted;

  const compiledStarted = performance.now();
  regions = new DerivedRegionDispatcher(graph);
  const sections = makeCompiledShell(compiledField);
  compiledRoots = sections.map((section, index) => {
    const root = new VDOMSnapshotRoot(new DOMVDOMHost(), section);
    root.commit(
      regionList(
        rows,
        initial[index === 0 ? "queryA" : "queryB"],
        index as Region,
      ),
    );
    return root;
  });
  const compiledMountMs = performance.now() - compiledStarted;

  reactRoot = nextReact;
  handwrittenRoot = nextHandwritten;
  mountTimings = {
    react: reactMountMs,
    handwritten: handwrittenMountMs,
    compiled: compiledMountMs,
  };
  mountedCount = count;
}

const listNodes = (container: HTMLElement) => {
  const result = new Map<string, Element>();
  for (
    const section of container.querySelectorAll<HTMLElement>(
      "section[data-region]",
    )
  ) {
    for (
      const element of section.querySelectorAll<HTMLElement>("li[data-id]")
    ) {
      result.set(`${section.dataset.region}:${element.dataset.id}`, element);
    }
  }
  return result;
};
const listDigest = (container: HTMLElement) => {
  let first = 0x811c9dc5;
  let second = 0x9e3779b9;
  let count = 0;
  for (
    const section of container.querySelectorAll<HTMLElement>(
      "section[data-region]",
    )
  ) {
    for (const node of section.querySelectorAll<HTMLElement>("li[data-id]")) {
      const value =
        `${section.dataset.region}:${node.dataset.id}:${node.textContent}\n`;
      for (let index = 0; index < value.length; index++) {
        const code = value.charCodeAt(index);
        first = Math.imul(first ^ code, 0x01000193);
        second = Math.imul(second ^ code, 0x85ebca6b);
      }
      count++;
    }
  }
  return `${count}:${first >>> 0}:${second >>> 0}`;
};
const outputSignature = (container: HTMLElement) =>
  Array.from(
    container.querySelectorAll<HTMLElement>("section[data-region]"),
    (section) =>
      `${section.dataset.region}[${
        Array.from(
          section.querySelectorAll<HTMLElement>("li[data-id]"),
          (node) => `${node.dataset.id}:${node.textContent}`,
        ).join("|")
      }]`,
  ).join("\n");

function runStudy() {
  const count = Number(countNode.value);
  if (mountedCount !== count) mount(count);
  const warmups = 6;
  const timedPairs = 24;
  const seed = seedNode.value.trim() === ""
    ? freshSeed()
    : Number(seedNode.value);
  if (!Number.isInteger(seed) || seed < 1 || seed > 0xffff_ffff) {
    throw new RangeError("Seed must be an integer from 1 to 4294967295");
  }
  let randomState = seed;
  const random = () => {
    randomState ^= randomState << 13;
    randomState ^= randomState >>> 17;
    randomState ^= randomState << 5;
    return (randomState >>> 0) / 0x1_0000_0000;
  };
  const permutations: Arm[][] = [
    ["react", "handwritten", "compiled"],
    ["react", "compiled", "handwritten"],
    ["handwritten", "react", "compiled"],
    ["handwritten", "compiled", "react"],
    ["compiled", "react", "handwritten"],
    ["compiled", "handwritten", "react"],
  ];
  const balancedOrders = (length: number) => {
    const orders = Array.from(
      { length },
      (_, index) => [...permutations[index % permutations.length]],
    );
    for (let index = orders.length - 1; index > 0; index--) {
      const swap = Math.floor(random() * (index + 1));
      [orders[index], orders[swap]] = [orders[swap], orders[index]];
    }
    return orders;
  };
  const orders = [...balancedOrders(warmups), ...balancedOrders(timedPairs)];
  const pairs: Pair[] = [];

  const update = (arm: Arm, queries: QueryState, change: QueryUpdate) => {
    if (arm === "react") {
      flushSync(() =>
        reactRoot!.render(<ReactLists rows={rows} queries={queries} />)
      );
    } else if (arm === "handwritten") {
      handwrittenRoot!.commit(runtimeTree(rows, queries));
    } else {
      const slot = change.source === "queryA" ? queryASlot! : queryBSlot!;
      regions!.invalidateSourceSlot(slot);
      let dispatched = 0;
      regions!.flush((regionId) => {
        const region = plan.regions[regionId];
        if (!region) throw new Error(`Unknown compiled region ${regionId}`);
        const query = regionId === 0 ? queries.queryA : queries.queryB;
        compiledRoots[regionId].commit(
          regionList(rows, query, regionId as Region),
        );
        dispatched++;
      });
      if (dispatched !== 1) {
        throw new Error(
          `Expected one affected region, dispatched ${dispatched}`,
        );
      }
    }
  };

  const fields: Record<Arm, HTMLElement> = {
    react: reactField,
    handwritten: handwrittenField,
    compiled: compiledField,
  };
  const runSequence = (arm: Arm) => {
    let queries = initialQueries();
    const field = fields[arm];
    let elapsed = 0;
    let preserved = 0;
    let shared = 0;
    const digests: string[] = [];
    for (const change of updates) {
      const before = listNodes(field);
      const started = performance.now();
      const nextQueries = { ...queries, [change.source]: change.value };
      update(arm, nextQueries, change);
      queries = nextQueries;
      elapsed += performance.now() - started;
      const after = listNodes(field);
      let transitionShared = 0;
      let transitionPreserved = 0;
      for (const [key, element] of before) {
        const next = after.get(key);
        if (next) {
          transitionShared++;
          if (next === element) transitionPreserved++;
        }
      }
      if (transitionPreserved !== transitionShared) {
        throw new Error(
          `${arm} replaced keyed nodes that should have survived`,
        );
      }
      shared += transitionShared;
      preserved += transitionPreserved;
      digests.push(listDigest(field));
    }
    return {
      millisecondsPerChange: elapsed / updates.length,
      retention: { preserved, shared },
      digests,
    };
  };

  for (let index = 0; index < warmups + timedPairs; index++) {
    const order = orders[index];
    const timings: Record<Arm, number> = {
      react: 0,
      handwritten: 0,
      compiled: 0,
    };
    const keyRetention: Record<Arm, Retention> = {
      react: { preserved: 0, shared: 0 },
      handwritten: { preserved: 0, shared: 0 },
      compiled: { preserved: 0, shared: 0 },
    };
    const digests: Partial<Record<Arm, string[]>> = {};
    for (const arm of order) {
      const result = runSequence(arm);
      timings[arm] = result.millisecondsPerChange;
      keyRetention[arm] = result.retention;
      digests[arm] = result.digests;
    }
    const sameOutput = (["handwritten", "compiled"] as Arm[]).every((arm) =>
      JSON.stringify(digests.react) === JSON.stringify(digests[arm])
    );
    if (!sameOutput) {
      throw new Error(
        `A derived region diverged in paired sequence ${index + 1}`,
      );
    }
    if (index >= warmups) {
      pairs.push({
        pair: index - warmups + 1,
        order,
        millisecondsPerChange: timings,
        sameOutput,
        transitionsCompared: updates.length,
        keyRetention,
      });
    }
  }

  const summaries = Object.fromEntries(
    (["react", "handwritten", "compiled"] as Arm[]).map((arm) => [arm, {
      medianMs: percentile(
        pairs.map((pair) => pair.millisecondsPerChange[arm]),
        0.5,
      ),
      p95Ms: percentile(
        pairs.map((pair) => pair.millisecondsPerChange[arm]),
        0.95,
      ),
    }]),
  ) as Record<Arm, { medianMs: number; p95Ms: number }>;
  const record = {
    schemaVersion: 4,
    protocolVersion: "gate-a-regions-v1",
    experiment:
      "two independently derived keyed regions: React Compiler vs whole-tree VDOM vs OXC region DAG",
    timestamp: new Date().toISOString(),
    sessionId: studySessionId,
    pageLoadId,
    seed,
    entityCount: count,
    updates,
    warmupPairs: warmups,
    timedPairs,
    armOrderCounts: {
      reactFirst: pairs.filter((pair) => pair.order[0] === "react").length,
      handwrittenFirst:
        pairs.filter((pair) => pair.order[0] === "handwritten").length,
      compiledFirst:
        pairs.filter((pair) => pair.order[0] === "compiled").length,
    },
    react: {
      version: "19.3.0",
      compiler: "babel-plugin-react-compiler target 19",
      isolation: "memoized region components; only changed query prop differs",
    },
    handwritten: {
      update: "rederive and reconcile both keyed regions on every query update",
      compilerGraph: false,
    },
    compiled: {
      update:
        "dispatch query source through OXC CSR graph; derive and reconcile only affected keyed region",
      compilerGraph: true,
      plan,
    },
    browser: {
      userAgent: navigator.userAgent,
      hardwareConcurrency: navigator.hardwareConcurrency,
      devicePixelRatio,
    },
    mountMs: {
      ...mountTimings,
      samplesPerArm: 1,
      includes:
        "root, generated shell, and dispatcher setup plus initial lists; excludes shared row-data creation and OXC build time",
    },
    summaries,
    outputParity: pairs.every((pair) => pair.sameOutput),
    finalParity: [handwrittenField, compiledField].every((field) =>
      outputSignature(field) === outputSignature(reactField)
    ),
    pairs,
    validity:
      "Each timed transition changes exactly one query source. React uses memoized child regions with stable rows; the handwritten VDOM rebuilds both regions; the compiled path rebuilds only the region reached by the changed source. The graph's shared rows source fans out to both regions and is tested separately. Every intermediate output and retained keyed-node identity is checked outside timing. Six arm orders are balanced. Mount is reported separately; paint/presentation and compiler build time are excluded.",
  };
  saved.push(record);
  localStorage.setItem(resultsKey, JSON.stringify(saved));
  recordNode.textContent = JSON.stringify(record, null, 2);
  resultNode.textContent = `${count.toLocaleString()} rows · React ${
    summaries.react.medianMs.toFixed(2)
  } ms · whole tree ${summaries.handwritten.medianMs.toFixed(2)} ms · graph ${
    summaries.compiled.medianMs.toFixed(2)
  } ms · parity ${record.outputParity && record.finalParity ? "PASS" : "FAIL"}`;
  if (!record.outputParity || !record.finalParity) {
    resultNode.setAttribute("data-failed", "true");
  } else resultNode.removeAttribute("data-failed");
}

const nextAnimationFrame = () =>
  new Promise<number>((resolve) => requestAnimationFrame(resolve));
const frameQuantile = (values: number[], p: number) => {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.max(0, Math.ceil(p * sorted.length) - 1)];
};

function setFrameArm(arm: Arm | "all" | null) {
  for (const name of ["react", "handwritten", "compiled"] as const) {
    const field = frameFields[name];
    const placeholder = framePlaceholders[name];
    const panel = framePanels[name];
    const next = arm === "all" || name === arm ? field : placeholder;
    const current = panel.querySelector<HTMLElement>(".keyed-field") ??
      panel.querySelector<HTMLElement>("[aria-hidden='true']");
    if (current !== next) current?.replaceWith(next);
  }
}

async function runFrameStudy(captureLongFrames = false) {
  const count = Number(countNode.value);
  if (mountedCount !== count) mount(count);
  const warmups = 6;
  const timedPairs = 24;
  const baselineIntervals: number[] = [];
  type LoafScript = {
    duration: number;
    executionStart: number;
    forcedStyleAndLayoutDuration: number;
    invoker: string;
    invokerType: string;
    sourceCharPosition: number;
    sourceFunctionName: string;
    sourceURL: string;
    startTime: number;
  };
  type LoafFrame = {
    blockingDuration: number;
    duration: number;
    firstUIEventTimestamp: number;
    renderStart: number;
    startTime: number;
    styleAndLayoutStart: number;
    scripts: LoafScript[];
  };
  const longFrameRecords: LoafFrame[] = [];
  const longFrameWindows: Array<{
    pair: number;
    arm: Arm;
    transition: number;
    before: number;
    after: number;
  }> = [];
  const supportedEntryTypes =
    (PerformanceObserver as unknown as { supportedEntryTypes?: string[] })
      .supportedEntryTypes ?? [];
  const longAnimationFramesSupported = supportedEntryTypes.includes(
    "long-animation-frame",
  );
  if (captureLongFrames && !longAnimationFramesSupported) {
    throw new Error(
      "Long Animation Frames API is not supported in this browser",
    );
  }
  const collectLongFrames = (entries: PerformanceEntry[]) => {
    for (const entry of entries) {
      const loaf = entry as PerformanceEntry & Record<string, any>;
      longFrameRecords.push({
        startTime: loaf.startTime,
        duration: loaf.duration,
        blockingDuration: loaf.blockingDuration,
        renderStart: loaf.renderStart,
        styleAndLayoutStart: loaf.styleAndLayoutStart,
        firstUIEventTimestamp: loaf.firstUIEventTimestamp,
        scripts: (loaf.scripts ?? []).map((script: Record<string, any>) => ({
          startTime: script.startTime,
          duration: script.duration,
          executionStart: script.executionStart,
          forcedStyleAndLayoutDuration: script.forcedStyleAndLayoutDuration,
          invoker: script.invoker ?? script.name ?? "",
          invokerType: script.invokerType ?? "",
          sourceURL: script.sourceURL ?? "",
          sourceFunctionName: script.sourceFunctionName ?? "",
          sourceCharPosition: script.sourceCharPosition ?? -1,
        })),
      });
    }
  };
  const longFrameObserver = captureLongFrames
    ? new PerformanceObserver((list) => collectLongFrames(list.getEntries()))
    : null;
  longFrameObserver?.observe({ type: "long-animation-frame" } as any);
  setFrameArm(null);
  let previous = await nextAnimationFrame();
  for (let index = 0; index < 120; index++) {
    const current = await nextAnimationFrame();
    baselineIntervals.push(current - previous);
    previous = current;
  }
  const baselineMedianMs = frameQuantile(baselineIntervals, 0.5);
  if (!(baselineMedianMs > 0)) {
    throw new Error("Could not measure an idle animation-frame interval");
  }
  const measurementStart = performance.now();

  const permutations: Arm[][] = [
    ["react", "handwritten", "compiled"],
    ["react", "compiled", "handwritten"],
    ["handwritten", "react", "compiled"],
    ["handwritten", "compiled", "react"],
    ["compiled", "react", "handwritten"],
    ["compiled", "handwritten", "react"],
  ];
  const orders = Array.from(
    { length: warmups + timedPairs },
    (_, index) => [...permutations[index % permutations.length]],
  );
  for (let index = orders.length - 1; index > 0; index--) {
    const swap = (index * 17 + 11) % (index + 1);
    [orders[index], orders[swap]] = [orders[swap], orders[index]];
  }
  const samples: Array<
    {
      pair: number;
      order: Arm[];
      sameOutput: boolean;
      transitionsCompared: number;
      isolationChecks: Record<Arm, string[]>;
      arms: Record<Arm, { updateMs: number[]; rAFIntervalMs: number[] }>;
    }
  > = [];
  const update = (arm: Arm, queries: QueryState, change: QueryUpdate) => {
    if (arm === "react") {
      flushSync(() =>
        reactRoot!.render(<ReactLists rows={rows} queries={queries} />)
      );
    } else if (arm === "handwritten") {
      handwrittenRoot!.commit(runtimeTree(rows, queries));
    } else {
      const slot = change.source === "queryA" ? queryASlot! : queryBSlot!;
      regions!.invalidateSourceSlot(slot);
      regions!.flush((regionId) => {
        const region = plan.regions[regionId];
        if (!region) throw new Error(`Unknown compiled region ${regionId}`);
        compiledRoots[regionId].commit(
          regionList(
            rows,
            regionId === 0 ? queries.queryA : queries.queryB,
            regionId as Region,
          ),
        );
      });
    }
  };
  const runSequence = async (arm: Arm, pair: number | null) => {
    setFrameArm(arm);
    const connectedArms = Object.entries(frameFields)
      .filter(([, field]) => field.isConnected)
      .map(([name]) => name);
    if (connectedArms.length !== 1 || connectedArms[0] !== arm) {
      throw new Error(
        `Expected only ${arm} frame arm connected; got ${
          connectedArms.join(", ")
        }`,
      );
    }
    await nextAnimationFrame();
    await nextAnimationFrame();
    let queries = initialQueries();
    const digests: string[] = [listDigest(frameFields[arm])];
    const updateMs: number[] = [];
    const rAFIntervalMs: number[] = [];
    for (const [transitionIndex, change] of updates.entries()) {
      const before = await nextAnimationFrame();
      const nextQueries = { ...queries, [change.source]: change.value };
      const started = performance.now();
      update(arm, nextQueries, change);
      updateMs.push(performance.now() - started);
      queries = nextQueries;
      const after = await nextAnimationFrame();
      rAFIntervalMs.push(after - before);
      if (captureLongFrames && pair !== null) {
        longFrameWindows.push({
          pair,
          arm,
          transition: transitionIndex + 1,
          before,
          after,
        });
      }
      digests.push(listDigest(frameFields[arm]));
    }
    return { digests, updateMs, rAFIntervalMs, connectedArms };
  };

  const button = document.querySelector<HTMLButtonElement>(
    captureLongFrames ? "#run-frame-attribution" : "#run-frames",
  )!;
  button.disabled = true;
  resultNode.textContent =
    `Measuring idle frame cadence, then one ${count.toLocaleString()}-row state update per animation frame…`;
  try {
    for (let index = 0; index < orders.length; index++) {
      const order = orders[index];
      const arms = {} as Record<
        Arm,
        {
          updateMs: number[];
          rAFIntervalMs: number[];
          digests: string[];
          connectedArms: string[];
        }
      >;
      for (const arm of order) {
        arms[arm] = await runSequence(
          arm,
          index >= warmups ? index - warmups + 1 : null,
        );
      }
      const sameOutput = (["handwritten", "compiled"] as Arm[]).every((arm) =>
        JSON.stringify(arms.react.digests) === JSON.stringify(arms[arm].digests)
      );
      if (!sameOutput) {
        throw new Error(`Frame study output diverged in pair ${index + 1}`);
      }
      if (index >= warmups) {
        samples.push({
          pair: index - warmups + 1,
          order,
          sameOutput,
          transitionsCompared: updates.length,
          isolationChecks: Object.fromEntries(
            (["react", "handwritten", "compiled"] as Arm[]).map((
              arm,
            ) => [arm, arms[arm].connectedArms]),
          ) as Record<Arm, string[]>,
          arms: Object.fromEntries(
            (["react", "handwritten", "compiled"] as Arm[]).map((
              arm,
            ) => [arm, {
              updateMs: arms[arm].updateMs,
              rAFIntervalMs: arms[arm].rAFIntervalMs,
            }]),
          ) as Record<Arm, { updateMs: number[]; rAFIntervalMs: number[] }>,
        });
      }
      resultNode.textContent = `Frame study ${
        Math.min(index + 1, orders.length)
      }/${orders.length} sequences · output parity PASS`;
    }
    if (captureLongFrames && longFrameObserver) {
      await nextAnimationFrame();
      collectLongFrames(longFrameObserver.takeRecords());
      longFrameObserver.disconnect();
    }
    const attributedLongFrames = longFrameRecords
      .filter((frame) => frame.startTime >= measurementStart)
      .map((frame, index) => ({
        id: index + 1,
        ...frame,
        matches: longFrameWindows.filter((window) =>
          frame.startTime < window.after &&
          frame.startTime + frame.duration > window.before
        ).map(({ pair, arm, transition }) => ({ pair, arm, transition })),
      }))
      .filter((frame) => frame.matches.length > 0);
    const armNames: Arm[] = ["react", "handwritten", "compiled"];
    const longFrameSummary = Object.fromEntries(armNames.map((arm) => {
      const frames = attributedLongFrames.filter((frame) =>
        frame.matches.some((match) => match.arm === arm)
      );
      const scripts = frames.flatMap((frame) =>
        frame.scripts.map((script) => ({
          key: `${script.sourceURL}#${
            script.sourceFunctionName || script.invoker
          }`,
          sourceURL: script.sourceURL,
          sourceFunctionName: script.sourceFunctionName,
          invoker: script.invoker,
          duration: script.duration,
        }))
      );
      const totals = new Map<string, typeof scripts[number]>();
      for (const script of scripts) {
        const prior = totals.get(script.key);
        totals.set(script.key, {
          ...script,
          duration: (prior?.duration ?? 0) + script.duration,
        });
      }
      const matchedWindowIds = new Set(
        frames.flatMap((frame) =>
          frame.matches.filter((match) => match.arm === arm).map((match) =>
            `${match.pair}:${match.transition}`
          )
        ),
      );
      return [arm, {
        measuredWindows: longFrameWindows.filter((window) => window.arm === arm)
          .length,
        windowsWithLoAF: matchedWindowIds.size,
        uniqueFrames: frames.length,
        durationMedianMs: frames.length
          ? frameQuantile(frames.map((frame) => frame.duration), 0.5)
          : null,
        durationP95Ms: frames.length
          ? frameQuantile(frames.map((frame) => frame.duration), 0.95)
          : null,
        durationMaxMs: frames.length
          ? Math.max(...frames.map((frame) => frame.duration))
          : null,
        blockingDurationP95Ms: frames.length
          ? frameQuantile(
            frames.map((frame) => frame.blockingDuration),
            0.95,
          )
          : null,
        topScripts: [...totals.values()].sort((a, b) => b.duration - a.duration)
          .slice(0, 8),
      }];
    })) as Record<Arm, Record<string, unknown>>;
    const summary = Object.fromEntries(armNames.map((arm) => {
      const updateMs = samples.flatMap((sample) => sample.arms[arm].updateMs);
      const rAFIntervalMs = samples.flatMap((sample) =>
        sample.arms[arm].rAFIntervalMs
      );
      const estimatedMissedSlots = rAFIntervalMs.reduce(
        (total, interval) =>
          total + Math.max(0, Math.round(interval / baselineMedianMs) - 1),
        0,
      );
      return [arm, {
        updateMedianMs: frameQuantile(updateMs, 0.5),
        updateP95Ms: frameQuantile(updateMs, 0.95),
        rAFIntervalMedianMs: frameQuantile(rAFIntervalMs, 0.5),
        rAFIntervalP95Ms: frameQuantile(rAFIntervalMs, 0.95),
        rAFIntervalMaxMs: Math.max(...rAFIntervalMs),
        intervalsOver1_5xBaseline: rAFIntervalMs.filter((interval) =>
          interval > baselineMedianMs * 1.5
        ).length,
        estimatedMissedSlots,
        intervalCount: rAFIntervalMs.length,
      }];
    })) as unknown as Record<Arm, Record<string, number>>;
    const record = {
      schemaVersion: captureLongFrames
        ? "keyed-region-frame-pacing-attribution-v1"
        : "keyed-region-frame-pacing-isolated-v1",
      status: samples.length === timedPairs && samples.every((sample) =>
          sample.sameOutput &&
          (["react", "handwritten", "compiled"] as Arm[]).every((arm) =>
            sample.isolationChecks[arm].length === 1 &&
            sample.isolationChecks[arm][0] === arm
          )
        )
        ? "PASS"
        : "FAIL",
      experiment:
        "one state-derived keyed-region update per animation frame; React Compiler vs whole-tree VDOM vs OXC region DAG",
      timestamp: new Date().toISOString(),
      pageLoadId,
      entityCount: count,
      warmupPairs: warmups,
      timedPairs,
      transitionsPerArmPerPair: updates.length,
      updateSequence: updates,
      browser: {
        userAgent: navigator.userAgent,
        hardwareConcurrency: navigator.hardwareConcurrency,
        devicePixelRatio,
        visibilityState: document.visibilityState,
        longAnimationFramesSupported,
      },
      idleFrameBaseline: {
        sampleCount: baselineIntervals.length,
        medianMs: baselineMedianMs,
        p95Ms: frameQuantile(baselineIntervals, 0.95),
        maxMs: Math.max(...baselineIntervals),
      },
      summary,
      longAnimationFrameCapture: captureLongFrames
        ? {
          supported: longAnimationFramesSupported,
          api: "PerformanceObserver long-animation-frame",
          definition:
            "LoAF entries represent UI-thread sequences over 50 ms; their duration excludes presentation. Entries are associated with measured rAF windows by timestamp overlap, so attribution to an arm is approximate.",
          matchedFrames: attributedLongFrames,
          summary: longFrameSummary,
        }
        : null,
      allOutputsEqual: samples.every((sample) =>
        sample.sameOutput
      ),
      isolationChecksPassed: samples.length * 3,
      samples,
      frameMeasurement:
        "rAF callback interval from the callback before a synchronous host update to the next callback. Intervals above 1.5x the same-page idle median are flagged; estimated missed slots use round(interval / idleMedian) - 1. This is a main-thread frame-cadence proxy, not proof of compositor/display presentation.",
      validity:
        "Each arm receives the same 8 alternating queryA/queryB changes. One update runs between adjacent animation-frame callbacks, allowing cadence observation around each synchronous render/commit and browser rendering opportunity. Warmups and arm order are balanced; intermediate DOM digests are compared. Before each sequence, the harness asserts and records that only the requested arm's list is connected to the document; the other panels retain equal-size empty placeholders. Inactive DOM trees remain retained in memory. Mount is outside the timed sequence. " +
        (captureLongFrames
          ? "The Long Animation Frames observer runs during the study; each >50 ms entry is associated with an update window by timestamp overlap, an approximate attribution that may include neighboring work. "
          : "") +
        "Synthetic deterministic rows and one Chrome/device limit generalization.",
    };
    const prior = readResultsFrom(frameResultsKey);
    prior.push(record);
    localStorage.setItem(frameResultsKey, JSON.stringify(prior));
    recordNode.textContent = JSON.stringify(record, null, 2);
    resultNode.textContent = captureLongFrames
      ? `Frame + LoAF study PASS · ${attributedLongFrames.length} matched long frames · graph ${longFrameSummary.compiled.uniqueFrames} attributed`
      : `Frame study PASS · idle rAF ${
        baselineMedianMs.toFixed(2)
      } ms · React ${
        summary.react.rAFIntervalP95Ms.toFixed(2)
      } ms p95 · whole tree ${
        summary.handwritten.rAFIntervalP95Ms.toFixed(2)
      } ms · graph ${summary.compiled.rAFIntervalP95Ms.toFixed(2)} ms`;
    if (record.status !== "PASS") {
      resultNode.setAttribute("data-failed", "true");
    }
  } finally {
    setFrameArm("all");
    button.disabled = false;
  }
}

document.querySelector("#run")!.addEventListener("click", () => {
  try {
    runStudy();
  } catch (error) {
    resultNode.textContent = `Study failed: ${String(error)}`;
    resultNode.setAttribute("data-failed", "true");
  }
});
document.querySelector("#run-frames")!.addEventListener("click", () => {
  void runFrameStudy().catch((error) => {
    resultNode.textContent = `Frame study failed: ${String(error)}`;
    resultNode.setAttribute("data-failed", "true");
  });
});
document.querySelector("#run-frame-attribution")!.addEventListener(
  "click",
  () => {
    void runFrameStudy(true).catch((error) => {
      resultNode.textContent = `Frame + LoAF study failed: ${String(error)}`;
      resultNode.setAttribute("data-failed", "true");
    });
  },
);
document.querySelector("#export")!.addEventListener("click", exportResults);
document.querySelector("#export-frames")!.addEventListener("click", () => {
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(readResultsFrom(frameResultsKey), null, 2)], {
      type: "application/json",
    }),
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = `keyed-region-frame-pacing-${
    new Date().toISOString().replaceAll(":", "-")
  }.json`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
});
document.querySelector("#save-frames")!.addEventListener("click", async () => {
  const record = readResultsFrom(frameResultsKey).at(-1);
  if (!record) {
    resultNode.textContent = "No frame run is available to save.";
    return;
  }
  const response = await fetch("/__benchmark/save-keyed-region-frame-pacing", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(record),
  });
  const outcome = await response.json();
  if (!response.ok) {
    throw new Error(outcome.error ?? "Could not save frame run");
  }
  resultNode.textContent = `Saved raw frame run to results/${outcome.filename}`;
});
countNode.addEventListener("change", () => mount(Number(countNode.value)));
mount(Number(countNode.value));
if (autoRunConfig.kind === "invalid") {
  resultNode.textContent = `Invalid auto-run URL: ${autoRunConfig.message}.`;
  resultNode.setAttribute("data-failed", "true");
} else if (autoRunConfig.kind === "ready") {
  resultNode.textContent =
    `Equivalent ${autoRunConfig.count.toLocaleString()}-row multi-region lists mounted · auto-running ${autoRunConfig.sessionId}`;
  window.setTimeout(
    () => document.querySelector<HTMLButtonElement>("#run")!.click(),
    0,
  );
} else {
  resultNode.textContent =
    "Equivalent multi-region lists mounted. Run the paired study.";
}
