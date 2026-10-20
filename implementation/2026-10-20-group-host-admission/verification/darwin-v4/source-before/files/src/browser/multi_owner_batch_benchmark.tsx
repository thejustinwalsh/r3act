import { createElement, useSyncExternalStore } from "react";
import { createRoot, type Root } from "react-dom/client";
import { flushSync } from "react-dom";
import {
  ComponentStateRoot,
  defineComponent,
  useStateAt,
} from "../component_state_runtime.ts";
import { jsx, type RuntimeNode } from "../jsx_binding_runtime.ts";
import { DOMVDOMHost } from "../vdom_snapshot_runtime.ts";
import { componentStateSitesPlan } from "./generated_component_state_sites.ts";
import "./style.css";

type Arm = "react" | "runtime";
type Sample = {
  pair: number;
  order: readonly [Arm, Arm];
  millisecondsPerBatch: Record<Arm, number>;
};
type Scenario = {
  fanout: number;
  samples: Sample[];
  medianMs: Record<Arm, number>;
  p95Ms: Record<Arm, number>;
  medianMsPerOwner: Record<Arm, number>;
  renderedRowsPerBatch: Record<Arm, number>;
  runtimeRegionsPerBatch: number;
  runtimeCommitBatchesPerPair: number;
  outputParity: boolean;
  stableIdentity: boolean;
};
type RecordResult = {
  schemaVersion: "multi-owner-batch-browser-v1";
  status: "PASS" | "FAIL";
  collectedAt: string;
  seed: number;
  count: number;
  fanoutOrder: number[];
  warmupPairs: number;
  measuredPairs: number;
  browser: {
    userAgent: string;
    platform: string;
    hardwareConcurrency: number;
    devicePixelRatio: number;
  };
  mountMs: Record<Arm, number>;
  reactBaseline: string;
  runtimeStrategy: string;
  scenarios: Scenario[];
  archivedAs: string | null;
  limitations: string[];
};

class SelectedStore {
  readonly values: Uint8Array;
  readonly listeners: Array<Set<() => void>>;

  constructor(count: number) {
    this.values = new Uint8Array(count);
    this.listeners = Array.from({ length: count }, () => new Set());
  }

  get = (id: number) => this.values[id] !== 0;

  subscribe = (id: number, listener: () => void) => {
    this.listeners[id].add(listener);
    return () => this.listeners[id].delete(listener);
  };

  toggleMany(ids: readonly number[]) {
    for (const id of ids) {
      this.values[id] ^= 1;
      for (const listener of this.listeners[id]) listener();
    }
  }
}

const rootElement = document.querySelector<HTMLElement>("#root")!;
rootElement.innerHTML = `
  <main>
    <header>
      <p class="eyebrow">Gate B · multiple dirty owners</p>
      <h1>One batch updates several keyed leaves</h1>
      <p>Each event toggles the same seeded set of leaf values in React and the compiled runtime. React uses per-row <code>useSyncExternalStore</code> subscriptions with React Compiler; the runtime uses OXC owner/site state and a batched keyed-region commit. Mount is timed separately. Update timing ends after synchronous host output is committed.</p>
    </header>
    <section class="controls" aria-label="Study controls">
      <label>Leaves <select id="count"><option selected>10000</option></select></label>
      <label>Seed <input id="seed" type="number" value="82005001" min="1" max="4294967295" step="1"></label>
      <button id="run" type="button">Run paired fanout study</button>
      <button id="export" type="button" disabled>Export JSON</button>
    </section>
    <p id="result" class="result" aria-live="polite">Ready.</p>
    <details><summary>Latest raw record</summary><pre id="record">Run the study to populate samples and environment metadata.</pre></details>
    <div class="prototype-fields">
      <section><h2>React + React Compiler + selector subscriptions</h2><div id="react-field" class="field"></div></section>
      <section><h2>OXC owner graph + multi-region partial commit</h2><div id="runtime-field" class="field"></div></section>
    </div>
    <aside><strong>Contract:</strong> both arms begin with 10,000 keyed rows, toggle the same unique IDs in one event, preserve every host node, and produce matching values. Fanout ranges from 1 to 256 dirty leaves per event. React receives one store notification per changed row inside one React event; the runtime coalesces owner/site writes into one scheduler flush and commits the selected keyed regions together. The test excludes layout, paint, and display presentation.</aside>
  </main>`;

const countNode = document.querySelector<HTMLSelectElement>("#count")!;
const seedNode = document.querySelector<HTMLInputElement>("#seed")!;
const runButton = document.querySelector<HTMLButtonElement>("#run")!;
const exportButton = document.querySelector<HTMLButtonElement>("#export")!;
const resultNode = document.querySelector<HTMLElement>("#result")!;
const recordNode = document.querySelector<HTMLElement>("#record")!;
const reactField = document.querySelector<HTMLElement>("#react-field")!;
const runtimeField = document.querySelector<HTMLElement>("#runtime-field")!;
const urlParams = new URLSearchParams(location.search);
const autoSeed = Number(urlParams.get("seed"));
if (
  urlParams.get("autorun") === "1" && Number.isSafeInteger(autoSeed) &&
  autoSeed > 0
) {
  seedNode.value = String(autoSeed);
}

let reactRoot: Root | null = null;
let runtimeRoot: ComponentStateRoot<Node, Node> | null = null;
let latest: RecordResult | null = null;

const percentile = (values: number[], p: number) => {
  const ordered = [...values].sort((a, b) => a - b);
  return ordered[Math.max(0, Math.ceil(p * ordered.length) - 1)];
};

const shuffle = <T,>(values: T[], random: () => number) => {
  const result = [...values];
  for (let index = result.length - 1; index > 0; index--) {
    const other = Math.floor(random() * (index + 1));
    [result[index], result[other]] = [result[other], result[index]];
  }
  return result;
};

const makeRandom = (initial: number) => {
  let state = initial >>> 0 || 1;
  return () => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    return (state >>> 0) / 0x1_0000_0000;
  };
};

const waitForCommit = () =>
  new Promise<void>((resolve) => queueMicrotask(resolve));

const runStudy = async () => {
  runButton.disabled = true;
  exportButton.disabled = true;
  resultNode.className = "result";
  resultNode.textContent = "Mounting both 10,000-row trees…";
  if (reactRoot) flushSync(() => reactRoot!.unmount());
  runtimeRoot?.dispose();
  reactField.replaceChildren();
  runtimeField.replaceChildren();

  const count = Number(countNode.value);
  const seed = Number(seedNode.value) >>> 0;
  if (
    count !== 10_000 || seed === 0 ||
    !Number.isSafeInteger(seedNode.valueAsNumber)
  ) {
    throw new RangeError("Use 10,000 leaves and a nonzero uint32 seed");
  }
  const warmupPairs = 8;
  const measuredPairs = 40;
  const fanouts = [1, 4, 16, 64, 256];
  const random = makeRandom(seed);
  const fanoutOrder = shuffle(fanouts, random);
  const selected = new Uint8Array(count);
  const reactStore = new SelectedStore(count);
  const reactActions: Array<(() => void) | undefined> = Array(count);
  const runtimeActions: Array<
    | ((action: boolean | ((previous: boolean) => boolean)) => boolean)
    | undefined
  > = Array(count);
  const reactRenders = new Uint32Array(count);
  const runtimeRenders = new Uint32Array(count);
  let activeIds: readonly number[] = [];

  function ReactRow({ id, store }: { id: number; store: SelectedStore }) {
    const value = useSyncExternalStore(
      (listener: () => void) => store.subscribe(id, listener),
      () => store.get(id),
      () => store.get(id),
    );
    reactRenders[id]++;
    return createElement("span", {
      "data-id": id,
      "data-selected": String(value),
    }, String(value));
  }

  const ReactAction = () =>
    createElement("button", {
      "data-action": "toggle",
      onClick: () => reactStore.toggleMany(activeIds),
    }, "Toggle selected rows");
  const reactTree = () =>
    createElement(
      "main",
      { className: "row-tree" },
      createElement(ReactAction),
      ...Array.from(
        { length: count },
        (_, id) => createElement(ReactRow, { key: id, id, store: reactStore }),
      ),
    );

  const RuntimeRow = defineComponent<{ id: number }>(
    "compiler/fixtures/component_state_sites.tsx#component:BenchmarkItem",
    ({ id }) => {
      runtimeRenders[id]++;
      const [value, set] = useStateAt<boolean>(
        "compiler/fixtures/component_state_sites.tsx#component:BenchmarkItem#state:0",
        false,
      );
      runtimeActions[id] = set;
      return jsx(
        "span",
        { "data-id": id, "data-selected": String(value) },
        String(value),
      );
    },
  );
  const runtimeFire = () => {
    for (const id of activeIds) {
      const set = runtimeActions[id];
      if (!set) throw new Error(`Runtime row ${id} has no state setter`);
      set((previous) => !previous);
    }
  };
  const runtimeTree = (): RuntimeNode =>
    jsx("main", { className: "row-tree" }, [
      jsx(
        "button",
        { "data-action": "toggle", onClick: runtimeFire },
        "Toggle selected rows",
      ),
      ...Array.from(
        { length: count },
        (_, id) => jsx(RuntimeRow, { key: id, id }),
      ),
    ]);

  const reactStarted = performance.now();
  reactRoot = createRoot(reactField);
  flushSync(() => reactRoot!.render(reactTree()));
  const reactMountMs = performance.now() - reactStarted;
  const runtimeStarted = performance.now();
  runtimeRoot = new ComponentStateRoot(new DOMVDOMHost(), runtimeField, {
    invalidationPlan: componentStateSitesPlan.invalidation_graph,
  });
  runtimeRoot.mount(runtimeTree());
  const runtimeMountMs = performance.now() - runtimeStarted;
  const reactButton = reactField.querySelector<HTMLButtonElement>(
    "[data-action='toggle']",
  )!;
  const runtimeButton = runtimeField.querySelector<HTMLButtonElement>(
    "[data-action='toggle']",
  )!;
  const reactNodes = Array.from(
    reactField.querySelectorAll<HTMLElement>("[data-id]"),
  );
  const runtimeNodes = Array.from(
    runtimeField.querySelectorAll<HTMLElement>("[data-id]"),
  );
  const originalReactNodes = [...reactNodes];
  const originalRuntimeNodes = [...runtimeNodes];
  let allStableIdentity = reactNodes.length === count &&
    runtimeNodes.length === count;
  let allOutputParity = allStableIdentity;
  const scenarios: Scenario[] = [];

  const renderTotals = (values: Uint32Array) =>
    values.reduce((sum, value) => sum + value, 0);
  const checkBatch = (ids: readonly number[]) => {
    for (const id of ids) {
      const expected = String(!selected[id]);
      if (
        reactNodes[id]?.dataset.selected !== expected ||
        runtimeNodes[id]?.dataset.selected !== expected ||
        reactNodes[id]?.textContent !== expected ||
        runtimeNodes[id]?.textContent !== expected
      ) {
        return false;
      }
      if (
        reactNodes[id] !== originalReactNodes[id] ||
        runtimeNodes[id] !== originalRuntimeNodes[id]
      ) {
        allStableIdentity = false;
      }
    }
    return true;
  };

  for (const fanout of fanoutOrder) {
    resultNode.textContent = `Running fanout ${fanout}…`;
    const beforeRenders = {
      react: renderTotals(reactRenders),
      runtime: renderTotals(runtimeRenders),
    };
    const beforeRegions = runtimeRoot!.partialCommitCount;
    const beforeBatches = runtimeRoot!.partialCommitBatchCount;
    const samples: Sample[] = [];
    const totalPairs = warmupPairs + measuredPairs;
    const orders = shuffle(
      Array.from({ length: totalPairs }, (_, pair) => ({
        pair,
        order:
          (pair % 2 === 0 ? ["react", "runtime"] : ["runtime", "react"]) as [
            Arm,
            Arm,
          ],
      })),
      random,
    );
    let scenarioParity = true;

    for (const { pair, order } of orders) {
      const chosen = new Set<number>();
      while (chosen.size < fanout) chosen.add(Math.floor(random() * count));
      activeIds = [...chosen];
      const millisecondsPerBatch: Record<Arm, number> = {
        react: 0,
        runtime: 0,
      };
      for (const arm of order) {
        const started = performance.now();
        if (arm === "react") reactButton.click();
        else runtimeButton.click();
        await waitForCommit();
        millisecondsPerBatch[arm] = performance.now() - started;
      }
      // Both implementations now reflect this pair's toggle. Checking inside
      // the arm loop would compare one updated tree against the other tree's
      // intentionally stale value and report a false mismatch.
      if (!checkBatch(activeIds)) scenarioParity = false;
      for (const id of activeIds) selected[id] ^= 1;
      if (pair >= warmupPairs) {
        samples.push({ pair: pair - warmupPairs, order, millisecondsPerBatch });
      }
    }

    const renderedRowsPerBatch = {
      react: (renderTotals(reactRenders) - beforeRenders.react -
        warmupPairs * fanout) / measuredPairs,
      runtime: (renderTotals(runtimeRenders) - beforeRenders.runtime -
        warmupPairs * fanout) / measuredPairs,
    };
    const runtimeRegionsPerBatch =
      (runtimeRoot!.partialCommitCount - beforeRegions - warmupPairs * fanout) /
      measuredPairs;
    const runtimeCommitBatchesPerPair =
      (runtimeRoot!.partialCommitBatchCount - beforeBatches - warmupPairs) /
      measuredPairs;
    const medianMs = {
      react: percentile(
        samples.map((sample) => sample.millisecondsPerBatch.react),
        0.5,
      ),
      runtime: percentile(
        samples.map((sample) => sample.millisecondsPerBatch.runtime),
        0.5,
      ),
    };
    const p95Ms = {
      react: percentile(
        samples.map((sample) => sample.millisecondsPerBatch.react),
        0.95,
      ),
      runtime: percentile(
        samples.map((sample) => sample.millisecondsPerBatch.runtime),
        0.95,
      ),
    };
    scenarioParity &&= renderedRowsPerBatch.runtime === fanout &&
      runtimeRegionsPerBatch === fanout && runtimeCommitBatchesPerPair === 1;
    allOutputParity &&= scenarioParity;
    scenarios.push({
      fanout,
      samples,
      medianMs,
      p95Ms,
      medianMsPerOwner: {
        react: medianMs.react / fanout,
        runtime: medianMs.runtime / fanout,
      },
      renderedRowsPerBatch,
      runtimeRegionsPerBatch,
      runtimeCommitBatchesPerPair,
      outputParity: scenarioParity,
      stableIdentity: allStableIdentity,
    });
  }

  for (let id = 0; id < count; id++) {
    const expected = String(selected[id] !== 0);
    if (
      reactNodes[id]?.dataset.selected !== expected ||
      runtimeNodes[id]?.dataset.selected !== expected ||
      reactNodes[id]?.textContent !== expected ||
      runtimeNodes[id]?.textContent !== expected
    ) allOutputParity = false;
    if (
      reactNodes[id] !== originalReactNodes[id] ||
      runtimeNodes[id] !== originalRuntimeNodes[id]
    ) allStableIdentity = false;
  }
  const status = allOutputParity && allStableIdentity &&
      scenarios.every((scenario) =>
        scenario.outputParity && scenario.stableIdentity &&
        scenario.runtimeCommitBatchesPerPair === 1
      )
    ? "PASS"
    : "FAIL";
  const result: RecordResult = {
    schemaVersion: "multi-owner-batch-browser-v1",
    status,
    collectedAt: new Date().toISOString(),
    seed,
    count,
    fanoutOrder,
    warmupPairs,
    measuredPairs,
    browser: {
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      hardwareConcurrency: navigator.hardwareConcurrency,
      devicePixelRatio,
    },
    mountMs: { react: reactMountMs, runtime: runtimeMountMs },
    reactBaseline:
      "React 19.3.0 + React Compiler; each row uses useSyncExternalStore against a per-row selector subscription; one React click notifies the selected rows and lets React batch their updates.",
    runtimeStrategy:
      "OXC-emitted state-site graph selects the changed owner site; the scheduler coalesces writes and commits all selected stable keyed host regions in one validated partial-commit batch.",
    scenarios,
    archivedAs: null,
    limitations: [
      "One Chrome profile/device and one flat 10,000-row DOM tree.",
      "Programmatic click events; mount is reported separately; layout, paint, and display presentation are excluded.",
      "Fanout is limited to independent boolean leaves with stable keyed host roots; structural edits, nested dirty owners, and lifecycle churn are outside this study.",
      "The React arm uses per-row external-store selectors and the React Compiler, not application-specific memoized context or a custom selector library.",
    ],
  };
  latest = result;
  recordNode.textContent = JSON.stringify(result, null, 2);
  resultNode.className = status === "PASS" ? "result pass" : "result fail";
  resultNode.textContent = JSON.stringify(
    {
      status,
      fanouts: scenarios.map((
        {
          fanout,
          medianMs,
          p95Ms,
          renderedRowsPerBatch,
          runtimeCommitBatchesPerPair,
        },
      ) => ({
        fanout,
        medianMs,
        p95Ms,
        renderedRowsPerBatch,
        runtimeCommitBatchesPerPair,
      })),
      mountMs: result.mountMs,
    },
    null,
    2,
  );
  exportButton.disabled = false;
  if (status === "PASS") {
    try {
      const response = await fetch("/__benchmark/save-multi-owner-batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(result),
      });
      if (response.ok) {
        result.archivedAs = (await response.json()).filename ?? null;
      } else {result.archivedAs =
          `archive failed: HTTP ${response.status} ${await response.text()}`;}
      recordNode.textContent = JSON.stringify(result, null, 2);
    } catch (error) {
      result.archivedAs = `archive failed: ${
        error instanceof Error ? error.message : String(error)
      }`;
      recordNode.textContent = JSON.stringify(result, null, 2);
    }
  }
  runButton.disabled = false;
};

const saveExport = () => {
  if (!latest) return;
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(latest, null, 2)], { type: "application/json" }),
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = `multi-owner-batch-${latest.seed}.json`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};

runButton.addEventListener("click", () =>
  void runStudy().catch((error) => {
    resultNode.className = "result fail";
    resultNode.textContent = error instanceof Error
      ? error.stack ?? error.message
      : String(error);
    runButton.disabled = false;
  }));
exportButton.addEventListener("click", saveExport);

if (urlParams.get("autorun") === "1") {
  setTimeout(() =>
    void runStudy().catch((error) => {
      resultNode.className = "result fail";
      resultNode.textContent = error instanceof Error
        ? error.stack ?? error.message
        : String(error);
      runButton.disabled = false;
    }), 100);
}
