import { startTransition, Suspense, useLayoutEffect } from "react";
import { createRoot } from "react-dom/client";
import { flushSync } from "react-dom";
import {
  bindCompiledAsyncTasks,
  type CompiledAsyncTaskPlan,
} from "../async_task_plan.ts";
import { AsyncVDOMTransitionRuntime } from "../async_vdom_transition_runtime.ts";
import { jsx } from "../jsx_binding_runtime.ts";
import { compiledAsyncTaskPlan } from "./generated_async_task_plan.ts";
import { DOMVDOMHost, VDOMSnapshotRoot } from "../vdom_snapshot_runtime.ts";

type Dashboard = {
  title: string;
  items: readonly { id: string; label: string }[];
};
type Resource = { read(): Dashboard };
type Arm = "react" | "runtime";
type Sample = {
  pair: number;
  timerDelayMs: { profile: number; feed: number };
  startOrder: readonly [Arm, Arm];
  milliseconds: Record<Arm, number>;
  pendingVisible: Record<Arm, boolean>;
  retainedKeys: Record<Arm, boolean>;
  outputParity: boolean;
  runtimeTaskOrder: string[];
};
type Result = {
  schemaVersion: "async-suspense-browser-v1";
  status: "PASS" | "FAIL";
  collectedAt: string;
  browser: { userAgent: string; platform: string; hardwareConcurrency: number };
  timerSchedule: {
    profile: { baseMs: number; stepMs: number; cyclePairs: number };
    feed: { baseMs: number; stepMs: number; cyclePairs: number };
  };
  compilerOrder: string[];
  reactStrategy: string;
  runtimeStrategy: string;
  samples: Sample[];
  medianMs: Record<Arm, number>;
  p95Ms: Record<Arm, number>;
  allPendingUiRetained: boolean;
  allKeysRetained: boolean;
  allOutputsEqual: boolean;
  limitations: string[];
};

const reactContainer = document.querySelector<HTMLDivElement>("#react-root")!;
const runtimeContainer = document.querySelector<HTMLDivElement>(
  "#runtime-root",
)!;
const statusNode = document.querySelector<HTMLPreElement>("#status")!;
const runButton = document.querySelector<HTMLButtonElement>("#run")!;
const exportButton = document.querySelector<HTMLButtonElement>("#export")!;
const reactRoot = createRoot(reactContainer);
let latest: Result | null = null;

const compiledPlan = compiledAsyncTaskPlan as CompiledAsyncTaskPlan;
const compilerOrder = compiledPlan.task_order.map((index) =>
  compiledPlan.tasks[index].id
);

const delay = (milliseconds: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, milliseconds));

const makeResource = (profileMs: number, feedMs: number): Resource => {
  let status: "pending" | "ready" = "pending";
  let result: Dashboard;
  let error: unknown;
  const profile = delay(profileMs).then(() => ({ name: "Ada 2" }));
  const feed = delay(feedMs).then(() => [{ id: "one", label: "First item 2" }]);
  const promise = Promise.all([profile, feed]).then(([person, items]) => {
    result = { title: `Hello, ${person.name}`, items };
    status = "ready";
  }).catch((reason) => {
    error = reason;
    status = "ready";
  });
  return {
    read() {
      if (status === "pending") throw promise;
      if (error) throw error;
      return result!;
    },
  };
};

const dashboardTree = (model: Dashboard) =>
  jsx("main", { "data-version": "2" }, [
    jsx("h3", { key: "title", "data-node": "title" }, model.title),
    jsx(
      "p",
      { key: "item-one", "data-node": "item-one" },
      model.items[0].label,
    ),
  ]);

const initialModel: Dashboard = {
  title: "Hello, Ada 1",
  items: [{ id: "one", label: "First item 1" }],
};
const initialResource: Resource = { read: () => initialModel };

function DashboardView({
  resource,
  committed,
}: {
  resource: Resource;
  committed?: () => void;
}) {
  const model = resource.read();
  useLayoutEffect(() => committed?.(), [model, committed]);
  return (
    <main data-version="2">
      <h3 key="title" data-node="title">{model.title}</h3>
      <p key="item-one" data-node="item-one">{model.items[0].label}</p>
    </main>
  );
}

const renderReact = (resource: Resource, committed?: () => void) => (
  <Suspense fallback={<p data-node="fallback">Loading…</p>}>
    <DashboardView resource={resource} committed={committed} />
  </Suspense>
);

flushSync(() => reactRoot.render(renderReact(initialResource)));

const quantile = (values: number[], p: number) => {
  const sorted = [...values].sort((left, right) => left - right);
  return sorted[Math.max(0, Math.ceil(p * sorted.length) - 1)];
};

const nodePair = (container: ParentNode) => ({
  title: container.querySelector<HTMLElement>('[data-node="title"]'),
  item: container.querySelector<HTMLElement>('[data-node="item-one"]'),
});

const sameOldContent = (
  container: ParentNode,
  before: ReturnType<typeof nodePair>,
) => {
  const now = nodePair(container);
  return now.title === before.title && now.item === before.item &&
    now.title?.textContent === "Hello, Ada 1" &&
    now.item?.textContent === "First item 1" &&
    !container.querySelector('[data-node="fallback"]');
};

const nextFrame = () =>
  new Promise<void>((resolve) => {
    requestAnimationFrame(() => resolve());
  });

const startReact = (resource: Resource) => {
  let resolveCommit!: () => void;
  const committed = new Promise<void>((resolve) => resolveCommit = resolve);
  const startedAt = performance.now();
  startTransition(() => reactRoot.render(renderReact(resource, resolveCommit)));
  const completedAt = committed.then(() => performance.now());
  return { completedAt, startedAt };
};

const runRuntime = (
  runtime: AsyncVDOMTransitionRuntime<Node, Node>,
  profileMs: number,
  feedMs: number,
) => {
  const events: string[] = [];
  const tasks = bindCompiledAsyncTasks(compiledPlan, {
    profile: async () => {
      events.push("start:profile");
      await delay(profileMs);
      events.push("finish:profile");
      return { name: "Ada 2" };
    },
    feed: async () => {
      events.push("start:feed");
      await delay(feedMs);
      events.push("finish:feed");
      return [{ id: "one", label: "First item 2" }];
    },
    header: async (values) => {
      events.push("start:header");
      const person = values.get("profile") as { name: string };
      events.push("finish:header");
      return `Hello, ${person.name}`;
    },
    "page-model": async (values) => {
      events.push("start:page-model");
      const model = {
        title: values.get("header") as string,
        items: values.get("feed") as Dashboard["items"],
      };
      events.push("finish:page-model");
      return model;
    },
  });
  const startedAt = performance.now();
  const committed = runtime.run({
    rootIds: ["dashboard"],
    tasks,
    maxConcurrency: 2,
    buildTree: (_rootId, values) =>
      dashboardTree(values.get("page-model") as Dashboard),
  });
  const completedAt = committed.then(() => performance.now());
  return { committed, completedAt, startedAt, events };
};

const run = async () => {
  runButton.disabled = true;
  exportButton.disabled = true;
  const samples: Sample[] = [];
  try {
    for (let pair = 0; pair < 20; pair++) {
      const profileMs = 54 + (pair % 3) * 2;
      const feedMs = 82 + (pair % 4) * 2;
      const runtimeHost = document.createElement("div");
      runtimeContainer.replaceChildren(runtimeHost);
      const runtimeRoot = new VDOMSnapshotRoot(
        new DOMVDOMHost(),
        runtimeHost,
      );
      runtimeRoot.commit(dashboardTree(initialModel));
      const runtime = new AsyncVDOMTransitionRuntime(
        new Map([["dashboard", runtimeRoot]]),
      );
      const reactBefore = nodePair(reactContainer);
      const runtimeBefore = nodePair(runtimeContainer);
      const startOrder: readonly [Arm, Arm] = pair % 2 === 0
        ? ["react", "runtime"]
        : ["runtime", "react"];
      let reactRun: ReturnType<typeof startReact> | undefined;
      let runtimeRun: ReturnType<typeof runRuntime> | undefined;
      for (const arm of startOrder) {
        if (arm === "react") {
          reactRun = startReact(makeResource(profileMs, feedMs));
        } else runtimeRun = runRuntime(runtime, profileMs, feedMs);
      }
      await nextFrame();
      const pendingVisible = {
        react: sameOldContent(reactContainer, reactBefore),
        runtime: sameOldContent(runtimeContainer, runtimeBefore),
      };
      const [reactCompletedAt, runtimeCompletedAt, runtimeCommit] =
        await Promise.all([
          reactRun!.completedAt,
          runtimeRun!.completedAt,
          runtimeRun!.committed,
        ]);
      const milliseconds = {
        react: reactCompletedAt - reactRun!.startedAt,
        runtime: runtimeCompletedAt - runtimeRun!.startedAt,
      };
      const reactAfter = nodePair(reactContainer);
      const runtimeAfter = nodePair(runtimeContainer);
      const retainedKeys = {
        react: reactAfter.title === reactBefore.title &&
          reactAfter.item === reactBefore.item,
        runtime: runtimeAfter.title === runtimeBefore.title &&
          runtimeAfter.item === runtimeBefore.item,
      };
      const outputParity = reactAfter.title?.textContent ===
          runtimeAfter.title?.textContent &&
        reactAfter.item?.textContent === runtimeAfter.item?.textContent &&
        reactAfter.title?.textContent === "Hello, Ada 2" &&
        reactAfter.item?.textContent === "First item 2" &&
        runtimeCommit.resolution.status === "committed";
      if (!pendingVisible.react || !pendingVisible.runtime || !outputParity) {
        throw new Error(
          `Contract failed in pair ${pair}: ${
            JSON.stringify({ pendingVisible, outputParity, runtimeCommit })
          }`,
        );
      }
      samples.push({
        pair,
        timerDelayMs: { profile: profileMs, feed: feedMs },
        startOrder,
        milliseconds,
        pendingVisible,
        retainedKeys,
        outputParity,
        runtimeTaskOrder: runtimeRun!.events.filter((event) =>
          event.startsWith("start:")
        ).map((event) => event.slice("start:".length)),
      });
      flushSync(() => reactRoot.render(renderReact(initialResource)));
      await nextFrame();
      statusNode.textContent = `Completed ${pair + 1}/20 paired transitions…`;
    }
    const times = (arm: Arm) =>
      samples.map((sample) => sample.milliseconds[arm]);
    latest = {
      schemaVersion: "async-suspense-browser-v1",
      status: "PASS",
      collectedAt: new Date().toISOString(),
      browser: {
        userAgent: navigator.userAgent,
        platform: navigator.platform,
        hardwareConcurrency: navigator.hardwareConcurrency,
      },
      timerSchedule: {
        profile: { baseMs: 54, stepMs: 2, cyclePairs: 3 },
        feed: { baseMs: 82, stepMs: 2, cyclePairs: 4 },
      },
      compilerOrder,
      reactStrategy:
        "React 19 startTransition + one Suspense boundary; profile and feed promises are prewarmed together and the boundary retains old content while pending.",
      runtimeStrategy:
        "OXC-emitted DAG + bounded async task scheduler + prepared keyed VDOM commit after the full model is ready.",
      samples,
      medianMs: {
        react: quantile(times("react"), 0.5),
        runtime: quantile(times("runtime"), 0.5),
      },
      p95Ms: {
        react: quantile(times("react"), 0.95),
        runtime: quantile(times("runtime"), 0.95),
      },
      allPendingUiRetained: samples.every((sample) =>
        sample.pendingVisible.react && sample.pendingVisible.runtime
      ),
      allKeysRetained: samples.every((sample) =>
        sample.retainedKeys.react && sample.retainedKeys.runtime
      ),
      allOutputsEqual: samples.every((sample) => sample.outputParity),
      limitations: [
        "synthetic timers; no network, hydration, layout, paint, or frame-presentation measurement",
        "one root and one Suspense boundary; no partial reveal or nested boundaries",
        "React promises are prewarmed concurrently, representing an optimized no-waterfall Suspense usage",
        "timings include async waiting and scheduler/commit overhead; they do not isolate CPU cost",
        "single browser/device until repeated on a second device",
      ],
    };
    (window as typeof window & { __asyncSuspenseResult?: Result })
      .__asyncSuspenseResult = latest;
    exportButton.disabled = false;
    let archivedAs = "download-only; server archive route unavailable";
    try {
      const archiveResponse = await fetch("/__benchmark/save-async-suspense", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(latest),
      });
      if (archiveResponse.ok) {
        const archive = await archiveResponse.json() as { filename: string };
        archivedAs = archive.filename;
      }
    } catch {
      // Keep the client-side result downloadable when an older dev server is running.
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
  link.download = "async-suspense-browser-v1.json";
  link.click();
  URL.revokeObjectURL(url);
});
