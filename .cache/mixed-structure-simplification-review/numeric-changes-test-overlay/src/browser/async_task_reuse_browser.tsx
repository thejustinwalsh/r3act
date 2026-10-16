import {
  startTransition,
  Suspense,
  useCallback,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { createRoot, type Root } from "react-dom/client";
import { flushSync } from "react-dom";
import {
  bindCompiledAsyncTasks,
  type CompiledAsyncTaskPlan,
} from "../async_task_plan.ts";
import { AsyncVDOMTransitionRuntime } from "../async_vdom_transition_runtime.ts";
import { OwnerStateWorld } from "../owner_state_world.ts";
import { jsx } from "../jsx_binding_runtime.ts";
import { compiledAsyncTaskPlan } from "./generated_async_task_state_input_plan.ts";
import { componentStateSitesPlan } from "./generated_component_state_sites.ts";
import {
  createVDOMSnapshotRoot,
  DOMVDOMHost,
} from "../vdom_snapshot_runtime.ts";

type Arm = "react" | "fullRestart" | "reuseCompleted";
type Query = "old" | "stale" | "fresh";
type SearchRecord = {
  status: "pending" | "ready";
  promise: Promise<string>;
  value?: string;
};
type BrowserSample = {
  pair: number;
  workIterations: number;
  startOrder: readonly Arm[];
  updateToCommitMs: Record<Arm, number>;
  catalogRuns: Record<Arm, number>;
  restartCount: Record<Arm, number>;
  reusedCatalog: Record<Arm, boolean>;
  invalidationRestart: Record<Arm, boolean>;
  pendingUiRetained: Record<Arm, boolean>;
  keyedIdentityRetained: Record<Arm, boolean>;
  outputParity: boolean;
  staleResultIgnored: Record<Arm, boolean>;
};
type TrialOutcome = {
  updateToCommitMs: number;
  catalogRuns: number;
  restartCount: number;
  reusedCatalog: boolean;
  correctAbort: boolean;
  pendingUiRetained: boolean;
  keyedIdentityRetained: boolean;
  output: string;
  freshOutput: boolean;
  staleResultIgnored: boolean;
};
type Result = {
  schemaVersion: "async-task-reuse-browser-v1";
  status: "PASS" | "FAIL";
  collectedAt: string;
  browser: {
    userAgent: string;
    platform: string;
    hardwareConcurrency: number;
    devicePixelRatio: number;
  };
  workIterations: readonly number[];
  measuredPairsPerWorkload: number;
  freshSearchTimerMs: number;
  staleSearchResolution: string;
  reactStrategy: string;
  runtimeStrategy: string;
  samples: BrowserSample[];
  medianMs: Record<string, Record<Arm, number>>;
  p95Ms: Record<string, Record<Arm, number>>;
  catalogRunsPerSample: Record<string, Record<Arm, number>>;
  allContractsPass: boolean;
  limitations: string[];
};

const stateSiteId = componentStateSitesPlan.components.find((component) =>
  component.name === "Counter"
)?.state_sites[0]?.site_id;
if (!stateSiteId) throw new Error("Counter state site is missing");

const reactContainer = document.querySelector<HTMLDivElement>("#react-root")!;
const fullContainer = document.querySelector<HTMLDivElement>("#full-root")!;
const reuseContainer = document.querySelector<HTMLDivElement>("#reuse-root")!;
const statusNode = document.querySelector<HTMLPreElement>("#status")!;
const runButton = document.querySelector<HTMLButtonElement>("#run")!;
const exportButton = document.querySelector<HTMLButtonElement>("#export")!;
let latest: Result | null = null;

const deferred = <T,>() => {
  let resolve!: (value: T | PromiseLike<T>) => void;
  const promise = new Promise<T>((yes) => resolve = yes);
  return { promise, resolve };
};

const makeSearchResources = () => {
  const stale = deferred<string>();
  const staleStarted = deferred<void>();
  const records = new Map<Query, SearchRecord>();
  records.set("old", {
    status: "ready",
    promise: Promise.resolve("old result"),
    value: "old result",
  });
  let staleWasStarted = false;
  const ensure = (query: Query): SearchRecord => {
    const existing = records.get(query);
    if (existing) return existing;
    if (query === "stale") {
      const record: SearchRecord = {
        status: "pending",
        promise: stale.promise,
      };
      void stale.promise.then((value) => {
        record.status = "ready";
        record.value = value;
      });
      records.set(query, record);
      if (!staleWasStarted) {
        staleWasStarted = true;
        staleStarted.resolve();
      }
      return record;
    }
    let record!: SearchRecord;
    const promise = new Promise<string>((resolve) => {
      setTimeout(() => resolve("fresh result"), 3);
    }).then((value) => {
      record.status = "ready";
      record.value = value;
      return value;
    });
    record = { status: "pending", promise };
    records.set(query, record);
    return record;
  };
  return {
    ensure,
    start(query: Query) {
      return ensure(query).promise;
    },
    read(query: Query) {
      const record = ensure(query);
      if (record.status === "pending") throw record.promise;
      return record.value!;
    },
    staleStarted: staleStarted.promise,
    resolveStale() {
      stale.resolve("stale result");
    },
  };
};

const runCatalogWork = (iterations: number) => {
  let value = 0x1234;
  for (let index = 0; index < iterations; index++) {
    value = Math.imul(value ^ (index + 31), 1664525) + 1013904223 | 0;
  }
  return `catalog:${value}`;
};

const nextFrame = () =>
  new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));

const withTimeout = <T,>(promise: Promise<T>, label: string) =>
  new Promise<T>((resolve, reject) => {
    const timeout = window.setTimeout(
      () => reject(new Error(`${label} timed out`)),
      2_000,
    );
    promise.then(
      (value) => {
        window.clearTimeout(timeout);
        resolve(value);
      },
      (error) => {
        window.clearTimeout(timeout);
        reject(error);
      },
    );
  });

const quantile = (values: number[], probability: number) => {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.max(0, Math.ceil(sorted.length * probability) - 1)];
};

const makeTree = (query: Query, result: string) =>
  jsx(
    "section",
    { "data-query": query },
    jsx("input", { key: "query", "data-node": "query", value: query }),
    jsx("strong", { key: "result", "data-node": "result" }, result),
  );

function ReactResult({
  query,
  resources,
  catalog,
  onCommit,
}: {
  query: Query;
  resources: ReturnType<typeof makeSearchResources>;
  catalog: string;
  onCommit: (query: Query) => void;
}) {
  const search = resources.read(query);
  const model = `${search}|${catalog}`;
  useLayoutEffect(() => onCommit(query), [model, onCommit, query]);
  return <strong data-node="result">{model}</strong>;
}

type ReactController = { update(query: Query): Promise<number> };

function ReactTrial({
  resources,
  catalog,
  onReady,
}: {
  resources: ReturnType<typeof makeSearchResources>;
  catalog: string;
  onReady: (controller: ReactController) => void;
}) {
  const [inputQuery, setInputQuery] = useState<Query>("old");
  const [dataQuery, setDataQuery] = useState<Query>("old");
  const waiters = useRef(new Map<Query, (time: number) => void>());
  const onCommit = useCallback((query: Query) => {
    const resolve = waiters.current.get(query);
    if (!resolve) return;
    waiters.current.delete(query);
    resolve(performance.now());
  }, []);
  const update = useCallback((query: Query) => {
    resources.start(query);
    flushSync(() => setInputQuery(query));
    if (query === "stale") return Promise.resolve(performance.now());
    const committed = new Promise<number>((resolve) => {
      waiters.current.set(query, resolve);
    });
    startTransition(() => setDataQuery(query));
    return committed;
  }, [resources]);
  useLayoutEffect(() => {
    onReady({ update });
  }, [onReady, update]);
  return (
    <div>
      <input aria-label="React query" value={inputQuery} readOnly />
      <Suspense fallback={<strong data-node="fallback">Loading</strong>}>
        <ReactResult
          query={dataQuery}
          resources={resources}
          catalog={catalog}
          onCommit={onCommit}
        />
      </Suspense>
    </div>
  );
}

const probe = (container: ParentNode) => ({
  input: container.querySelector<HTMLInputElement>('[data-node="query"]') ??
    container.querySelector<HTMLInputElement>(
      'input[aria-label="React query"]',
    ),
  result: container.querySelector<HTMLElement>('[data-node="result"]'),
});

const queryIsPending = (
  container: ParentNode,
  query: Query,
  oldResult: string,
  resultNode: HTMLElement | null,
) => {
  const now = probe(container);
  return now.input?.value === query && now.result === resultNode &&
    now.result?.textContent === oldResult &&
    !container.querySelector('[data-node="fallback"]');
};

const runReactTrial = async (workIterations: number) => {
  reactContainer.replaceChildren();
  const resources = makeSearchResources();
  const catalogRuns = 1;
  const catalog = runCatalogWork(workIterations);
  const root = createRoot(reactContainer);
  let controller!: ReactController;
  const onReady = (ready: ReactController) => controller = ready;
  flushSync(() =>
    root.render(
      <ReactTrial resources={resources} catalog={catalog} onReady={onReady} />,
    )
  );
  statusNode.textContent = "React trial mounted; requesting stale search…";
  const before = probe(reactContainer);
  const oldText = `old result|${catalog}`;
  const stalePending = controller.update("stale");
  await withTimeout(resources.staleStarted, "React stale request start");
  statusNode.textContent =
    "React stale search pending; requesting fresh search…";
  await nextFrame();
  const stalePendingVisible = queryIsPending(
    reactContainer,
    "stale",
    oldText,
    before.result,
  );
  const startedAt = performance.now();
  const freshCommitted = controller.update("fresh");
  statusNode.textContent = "React fresh search requested; waiting for commit…";
  const freshPendingVisible = queryIsPending(
    reactContainer,
    "fresh",
    oldText,
    before.result,
  );
  const commitTime = await withTimeout(freshCommitted, "React fresh commit");
  const updateToCommitMs = commitTime - startedAt;
  resources.resolveStale();
  await nextFrame();
  const after = probe(reactContainer);
  const freshOutput = after.result?.textContent === `fresh result|${catalog}`;
  const staleResultIgnored = freshOutput &&
    after.result === before.result &&
    !reactContainer.textContent?.includes("stale result");
  root.unmount();
  await stalePending.catch(() => undefined);
  return {
    updateToCommitMs,
    catalogRuns,
    restartCount: 0,
    reusedCatalog: true,
    correctAbort: true,
    pendingUiRetained: stalePendingVisible && freshPendingVisible,
    keyedIdentityRetained: after.result === before.result,
    output: after.result?.textContent ?? "",
    freshOutput,
    staleResultIgnored,
  };
};

const runRuntimeTrial = async (
  container: HTMLDivElement,
  workIterations: number,
  reuseCompleted: boolean,
) => {
  container.replaceChildren();
  const resources = makeSearchResources();
  const world = new OwnerStateWorld();
  const owner = world.resolveOwner(null, "async-task-reuse-browser");
  const [, setQueryCount] = world.useState(owner, stateSiteId, 0);
  const readQueryCount = () => world.useState(owner, stateSiteId, 0)[0];
  const root = createVDOMSnapshotRoot(new DOMVDOMHost(), container);
  const oldText = "old result|catalog:old";
  root.commit(makeTree("old", oldText));
  const before = probe(container);
  const catalogReady = deferred<void>();
  let catalogRuns = 0;
  let staleAbortCount = 0;
  let pageModelRuns = 0;
  const implementations = {
    search: (inputs: ReadonlyMap<string, unknown>, signal: AbortSignal) => {
      const stale = Number(inputs.get(stateSiteId)) === 0;
      if (stale) {
        signal.addEventListener("abort", () => staleAbortCount++, {
          once: true,
        });
      }
      return resources.start(stale ? "stale" : "fresh");
    },
    catalog: () => {
      catalogRuns++;
      const value = runCatalogWork(workIterations);
      if (catalogRuns === 1) catalogReady.resolve();
      return value;
    },
    "page-model": (inputs: ReadonlyMap<string, unknown>) => {
      pageModelRuns++;
      return {
        search: inputs.get("search"),
        catalog: inputs.get("catalog"),
      };
    },
  };
  const tasks = bindCompiledAsyncTasks(
    compiledAsyncTaskPlan as CompiledAsyncTaskPlan,
    implementations,
  );
  const runtime = new AsyncVDOMTransitionRuntime(new Map([["root", root]]));
  const unwatch = runtime.watchStateWorld("root", world);
  const running = runtime.run({
    rootIds: ["root"],
    initialValues: { [stateSiteId]: 0 },
    tasks,
    maxInputRestarts: 1,
    reuseCompletedTasks: reuseCompleted,
    refreshInputs: (changedInputs) =>
      Object.fromEntries(
        changedInputs.map((input) => [input, readQueryCount()]),
      ),
    buildTree: (_rootId, values) => {
      const model = values.get("page-model") as {
        search: string;
        catalog: string;
      };
      const query = readQueryCount() === 0 ? "stale" : "fresh";
      return makeTree(query, `${model.search}|${model.catalog}`);
    },
  });
  const failed = running.then(
    () => new Promise<never>(() => {}),
    (error) => Promise.reject(error),
  );
  await withTimeout(
    Promise.race([
      Promise.all([resources.staleStarted, catalogReady.promise]),
      failed,
    ]),
    `runtime ${reuseCompleted ? "reuse" : "full restart"} task start`,
  );
  await nextFrame();
  const stalePendingVisible = queryIsPending(
    container,
    "old",
    oldText,
    before.result,
  );
  const startedAt = performance.now();
  setQueryCount(1);
  runtime.commitUrgent("root", makeTree("fresh", oldText));
  const freshPendingVisible = queryIsPending(
    container,
    "fresh",
    oldText,
    before.result,
  );
  const transition = await withTimeout(running, "runtime fresh commit");
  const updateToCommitMs = performance.now() - startedAt;
  resources.resolveStale();
  await nextFrame();
  const after = probe(container);
  const expectedCatalog = runCatalogWork(workIterations);
  const expectedText = `fresh result|${expectedCatalog}`;
  const freshOutput = after.result?.textContent === expectedText &&
    transition.resolution.status === "committed" && pageModelRuns === 1;
  const staleResultIgnored = freshOutput &&
    !container.textContent?.includes("stale result");
  const reusedCatalog = reuseCompleted && catalogRuns === 1 &&
    transition.reusedTasks.includes("catalog");
  const correctRestartPolicy = reuseCompleted
    ? reusedCatalog
    : catalogRuns === 2 && transition.reusedTasks.length === 0;
  const correctAbort = staleAbortCount === 1 && transition.restartCount === 1;
  unwatch();
  root.dispose();
  return {
    updateToCommitMs,
    catalogRuns,
    restartCount: transition.restartCount,
    reusedCatalog,
    correctAbort: correctAbort && correctRestartPolicy,
    pendingUiRetained: stalePendingVisible && freshPendingVisible,
    keyedIdentityRetained: after.result === before.result,
    output: after.result?.textContent ?? "",
    freshOutput,
    staleResultIgnored,
  };
};

const run = async () => {
  runButton.disabled = true;
  exportButton.disabled = true;
  statusNode.textContent = "Running two workloads × 20 paired browser trials…";
  const samples: BrowserSample[] = [];
  try {
    const workloads = [0, 250_000] as const;
    const pairs = 20;
    for (let pair = 0; pair < pairs; pair++) {
      for (const workloadIndex of pair % 2 === 0 ? [0, 1] : [1, 0]) {
        const workIterations = workloads[workloadIndex];
        const arms: Arm[] = ["react", "fullRestart", "reuseCompleted"];
        const startOrder = arms.map((_, index) =>
          arms[(index + pair) % arms.length]
        ) as unknown as readonly Arm[];
        const outcomes = new Map<Arm, TrialOutcome>();
        for (const arm of startOrder) {
          statusNode.textContent = `Pair ${
            pair + 1
          }/20 · ${workIterations} catalog iterations · ${arm}`;
          const outcome = arm === "react"
            ? await runReactTrial(workIterations)
            : await runRuntimeTrial(
              arm === "fullRestart" ? fullContainer : reuseContainer,
              workIterations,
              arm === "reuseCompleted",
            );
          outcomes.set(arm, outcome);
        }
        const react = outcomes.get("react")!;
        const full = outcomes.get("fullRestart")!;
        const reuse = outcomes.get("reuseCompleted")!;
        const sameOutput = react.output === full.output &&
          full.output === reuse.output;
        const sample: BrowserSample = {
          pair,
          workIterations,
          startOrder,
          updateToCommitMs: {
            react: react.updateToCommitMs,
            fullRestart: full.updateToCommitMs,
            reuseCompleted: reuse.updateToCommitMs,
          },
          catalogRuns: {
            react: react.catalogRuns,
            fullRestart: full.catalogRuns,
            reuseCompleted: reuse.catalogRuns,
          },
          restartCount: {
            react: 0,
            fullRestart: full.restartCount,
            reuseCompleted: reuse.restartCount,
          },
          reusedCatalog: {
            react: true,
            fullRestart: full.reusedCatalog,
            reuseCompleted: reuse.reusedCatalog,
          },
          invalidationRestart: {
            react: true,
            fullRestart: full.correctAbort,
            reuseCompleted: reuse.correctAbort,
          },
          pendingUiRetained: {
            react: react.pendingUiRetained,
            fullRestart: full.pendingUiRetained,
            reuseCompleted: reuse.pendingUiRetained,
          },
          keyedIdentityRetained: {
            react: react.keyedIdentityRetained,
            fullRestart: full.keyedIdentityRetained,
            reuseCompleted: reuse.keyedIdentityRetained,
          },
          outputParity: sameOutput && react.freshOutput && full.freshOutput &&
            reuse.freshOutput,
          staleResultIgnored: {
            react: react.staleResultIgnored,
            fullRestart: full.staleResultIgnored,
            reuseCompleted: reuse.staleResultIgnored,
          },
        };
        samples.push(sample);
        if (
          !sample.outputParity ||
          !Object.values(sample.pendingUiRetained).every(Boolean) ||
          !Object.values(sample.keyedIdentityRetained).every(Boolean) ||
          !Object.values(sample.staleResultIgnored).every(Boolean) ||
          !sample.reusedCatalog.react || sample.reusedCatalog.fullRestart ||
          !sample.reusedCatalog.reuseCompleted ||
          !Object.values(sample.invalidationRestart).every(Boolean) ||
          sample.restartCount.fullRestart !== 1 ||
          sample.restartCount.reuseCompleted !== 1 ||
          sample.catalogRuns.react !== 1 ||
          sample.catalogRuns.fullRestart !== 2 ||
          sample.catalogRuns.reuseCompleted !== 1
        ) {
          throw new Error(
            `Browser retry contract failed: ${JSON.stringify(sample)}`,
          );
        }
      }
      statusNode.textContent = `Completed ${pair + 1}/${pairs} paired sets…`;
    }

    const armTimes = (work: number, arm: Arm) =>
      samples.filter((sample) => sample.workIterations === work).map((sample) =>
        sample.updateToCommitMs[arm]
      );
    const medianMs: Result["medianMs"] = {};
    const p95Ms: Result["p95Ms"] = {};
    const catalogRunsPerSample: Result["catalogRunsPerSample"] = {};
    for (const work of workloads) {
      const key = String(work);
      medianMs[key] = Object.fromEntries(
        (["react", "fullRestart", "reuseCompleted"] as const).map((
          arm,
        ) => [arm, quantile(armTimes(work, arm), 0.5)]),
      ) as Record<Arm, number>;
      p95Ms[key] = Object.fromEntries(
        (["react", "fullRestart", "reuseCompleted"] as const).map((
          arm,
        ) => [arm, quantile(armTimes(work, arm), 0.95)]),
      ) as Record<Arm, number>;
      catalogRunsPerSample[key] = {
        react: 1,
        fullRestart: 2,
        reuseCompleted: 1,
      };
    }
    const allContractsPass = samples.length === workloads.length * pairs &&
      samples.every((sample) =>
        sample.outputParity &&
        Object.values(sample.pendingUiRetained).every(Boolean) &&
        Object.values(sample.keyedIdentityRetained).every(Boolean) &&
        Object.values(sample.staleResultIgnored).every(Boolean) &&
        Object.values(sample.invalidationRestart).every(Boolean) &&
        sample.reusedCatalog.reuseCompleted &&
        !sample.reusedCatalog.fullRestart
      );
    latest = {
      schemaVersion: "async-task-reuse-browser-v1",
      status: allContractsPass ? "PASS" : "FAIL",
      collectedAt: new Date().toISOString(),
      browser: {
        userAgent: navigator.userAgent,
        platform: navigator.platform,
        hardwareConcurrency: navigator.hardwareConcurrency,
        devicePixelRatio: window.devicePixelRatio,
      },
      workIterations: workloads,
      measuredPairsPerWorkload: pairs,
      freshSearchTimerMs: 3,
      staleSearchResolution: "released only after the fresh result commits",
      reactStrategy:
        "React 19 with the React Compiler, a cached catalog result, one Suspense boundary, and startTransition for query data; urgent query input is flushed first.",
      runtimeStrategy:
        "OXC-inferred state-input edge, watched ECS state, urgent same-root VDOM commit, one bounded restart; full mode reruns the graph while reuse mode carries completed independent outputs.",
      samples,
      medianMs,
      p95Ms,
      catalogRunsPerSample,
      allContractsPass,
      limitations: [
        "programmatic state updates, synthetic deferred resources, one Chrome session/device",
        "catalog work is a deterministic integer-loop proxy, not a representative application transform",
        "measurement ends after the host commit and excludes layout, paint, and frame presentation",
        "React has an application-level cached catalog; runtime reuse is DAG-selected, so this compares equivalent reuse outcomes with different mechanisms",
        "this fixture isolates completed-result reuse; independent in-flight task preservation remains untested",
      ],
    };
    (window as typeof window & { __asyncTaskReuseBrowserResult?: Result })
      .__asyncTaskReuseBrowserResult = latest;
    exportButton.disabled = false;
    let archivedAs = "download-only; server archive route unavailable";
    try {
      const response = await fetch(
        "/__benchmark/save-async-task-reuse-browser",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(latest),
        },
      );
      if (response.ok) {
        const archive = await response.json() as { filename: string };
        archivedAs = archive.filename;
      } else {
        archivedAs = `archive failed: HTTP ${response.status}`;
      }
    } catch {
      // Keep the browser-side JSON export available without the archive hook.
    }
    statusNode.textContent = JSON.stringify({ ...latest, archivedAs }, null, 2);
  } catch (error) {
    statusNode.textContent = `Study failed: ${String(error)}`;
  } finally {
    runButton.disabled = false;
  }
};

runButton.addEventListener("click", () => void run());
exportButton.addEventListener("click", () => {
  if (!latest) return;
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(latest, null, 2)], { type: "application/json" }),
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = "async-task-reuse-browser-v1.json";
  link.click();
  URL.revokeObjectURL(url);
});
