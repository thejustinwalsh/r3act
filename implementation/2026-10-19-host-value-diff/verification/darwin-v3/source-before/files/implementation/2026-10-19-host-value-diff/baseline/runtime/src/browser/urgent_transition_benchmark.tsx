import { startTransition, Suspense, useLayoutEffect, useState } from "react";
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

type Model = { title: string; feed: string; version: number };
type Resource = { read(): Model };
type Arm = "react" | "runtime";
type Pair = {
  pair: number;
  timerDelayMs: { profile: number; feed: number };
  startOrder: readonly [Arm, Arm];
  urgentLatencyMs: Record<Arm, number>;
  transitionLatencyMs: Record<Arm, number>;
  pendingViewRetained: Record<Arm, boolean>;
  urgentValueCommittedBeforeData: Record<Arm, boolean>;
  rootCommit: { scene: boolean; hud: boolean };
  keyedIdentity: Record<Arm, boolean>;
  outputParity: boolean;
  taskStartOrder: string[];
};
type RecordResult = {
  schemaVersion: "urgent-multiroot-transition-browser-v2";
  status: "PASS" | "FAIL";
  collectedAt: string;
  reactCompilerEnabled: true;
  browser: { userAgent: string; platform: string; hardwareConcurrency: number };
  compilerOrder: string[];
  pairCount: number;
  pairs: Pair[];
  medianUrgentLatencyMs: Record<Arm, number>;
  medianTransitionLatencyMs: Record<Arm, number>;
  allContractsPass: boolean;
  limitations: string[];
};

const reactContainer = document.querySelector<HTMLDivElement>("#react-root")!;
const runtimeUrgentContainer = document.querySelector<HTMLDivElement>(
  "#runtime-urgent",
)!;
const runtimeSceneContainer = document.querySelector<HTMLDivElement>(
  "#runtime-scene",
)!;
const runtimeHudContainer = document.querySelector<HTMLDivElement>(
  "#runtime-hud",
)!;
const statusNode = document.querySelector<HTMLPreElement>("#status")!;
const runButton = document.querySelector<HTMLButtonElement>("#run")!;
const exportButton = document.querySelector<HTMLButtonElement>("#export")!;
const reactRoot = createRoot(reactContainer);

const compiledPlan = compiledAsyncTaskPlan as CompiledAsyncTaskPlan;
const compilerOrder = compiledPlan.task_order.map((index) =>
  compiledPlan.tasks[index].id
);
const initialModel: Model = { title: "Scene v1", feed: "Feed v1", version: 1 };
let setReactModel!: (resource: Resource) => void;
let setReactUrgent!: (value: string) => void;
let resolveReactCommit: (() => void) | null = null;

const delay = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));
const makeResource = (pair: number): Resource => {
  let ready = false;
  let result: Model;
  const profile = delay(74 + pair % 3 * 2).then(() => ({ name: "Ada" }));
  const feed = delay(112 + pair % 4 * 2).then(() => "Feed v2");
  const promise = Promise.all([profile, feed]).then(([person, feedValue]) => {
    result = {
      title: `Scene v2 (${person.name})`,
      feed: feedValue,
      version: 2,
    };
    ready = true;
  });
  return {
    read() {
      if (!ready) throw promise;
      return result!;
    },
  };
};

function ReactPanels({ resource }: { resource: Resource }) {
  const model = resource.read();
  useLayoutEffect(() => {
    if (model.version === 2) {
      resolveReactCommit?.();
      resolveReactCommit = null;
    }
  }, [model]);
  return (
    <div className="panels">
      <div className="panel" data-root="scene">
        <strong key="scene">{model.title}</strong>
      </div>
      <div className="panel" data-root="hud">
        <strong key="hud">{model.feed}</strong>
      </div>
    </div>
  );
}

function ReactApp() {
  const [resource, updateResource] = useState<Resource>({
    read: () => initialModel,
  });
  const [urgent, updateUrgent] = useState("");
  setReactModel = updateResource;
  setReactUrgent = updateUrgent;
  return (
    <>
      <div className="urgent">
        <label htmlFor="react-urgent">Urgent input</label>
        <input
          id="react-urgent"
          value={urgent}
          onInput={(event) => updateUrgent(event.currentTarget.value)}
        />
        <output data-node="urgent">{urgent || "idle"}</output>
      </div>
      <Suspense fallback={<p data-node="fallback">Loading…</p>}>
        <ReactPanels resource={resource} />
      </Suspense>
    </>
  );
}

flushSync(() => reactRoot.render(<ReactApp />));

const renderUrgent = (value: string, onInput: (event: Event) => void) =>
  jsx("div", { className: "urgent" }, [
    jsx("label", { htmlFor: "runtime-urgent-input" }, "Urgent input"),
    jsx("input", {
      key: "urgent-input",
      id: "runtime-urgent-input",
      value,
      onInput,
    }),
    jsx(
      "output",
      { key: "urgent-output", "data-node": "urgent" },
      value || "idle",
    ),
  ]);
const renderScene = (title: string) =>
  jsx(
    "div",
    { className: "panel", "data-root": "scene" },
    jsx("strong", { key: "scene", "data-node": "scene" }, title),
  );
const renderHud = (feed: string) =>
  jsx(
    "div",
    { className: "panel", "data-root": "hud" },
    jsx("strong", { key: "hud", "data-node": "hud" }, feed),
  );

const quantile = (values: number[], p: number) => {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.max(0, Math.ceil(p * sorted.length) - 1)];
};
const nextFrame = () =>
  new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
const setInputValue = (input: HTMLInputElement, value: string) => {
  const setter = Object.getOwnPropertyDescriptor(
    HTMLInputElement.prototype,
    "value",
  )!.set!;
  setter.call(input, value);
};

const createRuntimeRoots = (urgentValue: { value: string }) => {
  runtimeUrgentContainer.replaceChildren();
  runtimeSceneContainer.replaceChildren();
  runtimeHudContainer.replaceChildren();
  const host = new DOMVDOMHost();
  const urgentRoot = new VDOMSnapshotRoot(host, runtimeUrgentContainer);
  const sceneRoot = new VDOMSnapshotRoot(host, runtimeSceneContainer);
  const hudRoot = new VDOMSnapshotRoot(host, runtimeHudContainer);
  const inputHandler = (event: Event) => {
    urgentValue.value = (event.currentTarget as HTMLInputElement).value;
    urgentRoot.commit(renderUrgent(urgentValue.value, inputHandler));
  };
  urgentRoot.commit(renderUrgent(urgentValue.value, inputHandler));
  sceneRoot.commit(renderScene(initialModel.title));
  hudRoot.commit(renderHud(initialModel.feed));
  const transition = new AsyncVDOMTransitionRuntime(
    new Map([
      ["scene", sceneRoot],
      ["hud", hudRoot],
    ]),
  );
  return { urgentRoot, sceneRoot, hudRoot, transition, inputHandler };
};

const runRuntimeTransition = (
  transition: AsyncVDOMTransitionRuntime<Node, Node>,
  pair: number,
) => {
  const events: string[] = [];
  const tasks = bindCompiledAsyncTasks(compiledPlan, {
    profile: async () => {
      events.push("start:profile");
      await delay(74 + pair % 3 * 2);
      events.push("finish:profile");
      return { name: "Ada" };
    },
    feed: async () => {
      events.push("start:feed");
      await delay(112 + pair % 4 * 2);
      events.push("finish:feed");
      return "Feed v2";
    },
    header: async (values) => {
      events.push("start:header");
      events.push("finish:header");
      return `Scene v2 (${(values.get("profile") as { name: string }).name})`;
    },
    "page-model": async (values) => {
      events.push("start:page-model");
      const model = {
        title: values.get("header") as string,
        feed: values.get("feed") as string,
      };
      events.push("finish:page-model");
      return model;
    },
  });
  const startedAt = performance.now();
  const committed = transition.run({
    rootIds: ["scene", "hud"],
    tasks,
    maxConcurrency: 2,
    buildTree: (rootId, values) => {
      const model = values.get("page-model") as { title: string; feed: string };
      return rootId === "scene"
        ? renderScene(model.title)
        : renderHud(model.feed);
    },
  });
  const completedAt = committed.then(() => performance.now());
  return { startedAt, committed, completedAt, events };
};

const runStudy = async () => {
  runButton.disabled = true;
  exportButton.disabled = true;
  const pairs: Pair[] = [];
  try {
    for (let pair = 0; pair < 20; pair++) {
      const urgentValue = { value: "" };
      const runtimeRoots = createRuntimeRoots(urgentValue);
      const reactSceneBefore = reactContainer.querySelector(
        '[data-root="scene"] strong',
      );
      const reactHudBefore = reactContainer.querySelector(
        '[data-root="hud"] strong',
      );
      const runtimeSceneBefore = runtimeSceneContainer.querySelector(
        '[data-node="scene"]',
      );
      const runtimeHudBefore = runtimeHudContainer.querySelector(
        '[data-node="hud"]',
      );
      const order: readonly [Arm, Arm] = pair % 2 === 0
        ? ["react", "runtime"]
        : ["runtime", "react"];
      let reactStartedAt = 0;
      let reactCommit!: Promise<number>;
      let runtimeRun!: ReturnType<typeof runRuntimeTransition>;
      for (const arm of order) {
        if (arm === "react") {
          const resource = makeResource(pair);
          let resolve!: () => void;
          const committed = new Promise<void>((done) => resolve = done);
          resolveReactCommit = resolve;
          reactStartedAt = performance.now();
          startTransition(() => setReactModel(resource));
          reactCommit = committed.then(() => performance.now());
        } else runtimeRun = runRuntimeTransition(runtimeRoots.transition, pair);
      }
      await nextFrame();
      const pendingBeforeUrgent = {
        react: reactSceneBefore?.textContent === "Scene v1" &&
          reactHudBefore?.textContent === "Feed v1" &&
          !reactContainer.querySelector('[data-node="fallback"]'),
        runtime: runtimeSceneBefore?.textContent === "Scene v1" &&
          runtimeHudBefore?.textContent === "Feed v1",
      };
      const inputValue = `typed-${pair}`;
      let start = performance.now();
      const reactInput = reactContainer.querySelector<HTMLInputElement>(
        "#react-urgent",
      )!;
      setInputValue(reactInput, inputValue);
      reactInput.dispatchEvent(new Event("input", { bubbles: true }));
      const reactUrgentLatency = performance.now() - start;
      start = performance.now();
      const runtimeInput = runtimeUrgentContainer.querySelector<
        HTMLInputElement
      >("#runtime-urgent-input")!;
      setInputValue(runtimeInput, inputValue);
      runtimeInput.dispatchEvent(new Event("input", { bubbles: true }));
      const runtimeUrgentLatency = performance.now() - start;
      const urgentValueCommittedBeforeData = {
        react:
          reactContainer.querySelector('[data-node="urgent"]')?.textContent ===
            inputValue,
        runtime: runtimeUrgentContainer.querySelector('[data-node="urgent"]')
          ?.textContent === inputValue,
      };
      const [reactCompletedAt, runtimeCompletedAt, runtimeResult] =
        await Promise.all([
          reactCommit,
          runtimeRun.completedAt,
          runtimeRun.committed,
        ]);
      const transitionLatencyMs = {
        react: reactCompletedAt - reactStartedAt,
        runtime: runtimeCompletedAt - runtimeRun.startedAt,
      };
      const reactSceneAfter = reactContainer.querySelector(
        '[data-root="scene"] strong',
      );
      const reactHudAfter = reactContainer.querySelector(
        '[data-root="hud"] strong',
      );
      const runtimeSceneAfter = runtimeSceneContainer.querySelector(
        '[data-node="scene"]',
      );
      const runtimeHudAfter = runtimeHudContainer.querySelector(
        '[data-node="hud"]',
      );
      const rootCommit = {
        scene: runtimeResult.resolution.status === "committed" &&
          runtimeSceneAfter?.textContent === "Scene v2 (Ada)",
        hud: runtimeResult.resolution.status === "committed" &&
          runtimeHudAfter?.textContent === "Feed v2",
      };
      const keyedIdentity = {
        react: reactSceneAfter === reactSceneBefore &&
          reactHudAfter === reactHudBefore,
        runtime: runtimeSceneAfter === runtimeSceneBefore &&
          runtimeHudAfter === runtimeHudBefore,
      };
      const outputParity =
        reactSceneAfter?.textContent === runtimeSceneAfter?.textContent &&
        reactHudAfter?.textContent === runtimeHudAfter?.textContent &&
        reactContainer.querySelector('[data-node="urgent"]')?.textContent ===
          runtimeUrgentContainer.querySelector('[data-node="urgent"]')
            ?.textContent;
      const pairResult: Pair = {
        pair,
        timerDelayMs: {
          profile: 74 + (pair % 3) * 2,
          feed: 112 + (pair % 4) * 2,
        },
        startOrder: order,
        urgentLatencyMs: {
          react: reactUrgentLatency,
          runtime: runtimeUrgentLatency,
        },
        transitionLatencyMs,
        pendingViewRetained: pendingBeforeUrgent,
        urgentValueCommittedBeforeData,
        rootCommit,
        keyedIdentity,
        outputParity,
        taskStartOrder: runtimeRun.events.filter((event) =>
          event.startsWith("start:")
        ).map((event) => event.slice(6)),
      };
      if (
        !pendingBeforeUrgent.react || !pendingBeforeUrgent.runtime ||
        !urgentValueCommittedBeforeData.react ||
        !urgentValueCommittedBeforeData.runtime ||
        !rootCommit.scene || !rootCommit.hud || !keyedIdentity.react ||
        !keyedIdentity.runtime || !outputParity
      ) {
        throw new Error(
          `Priority/atomicity contract failed: ${JSON.stringify(pairResult)}`,
        );
      }
      pairs.push(pairResult);
      flushSync(() => {
        setReactModel({ read: () => initialModel });
        setReactUrgent("");
      });
      await nextFrame();
      statusNode.textContent = `Completed ${pair + 1}/20 pairs…`;
    }
    const values = (
      arm: Arm,
      field: "urgentLatencyMs" | "transitionLatencyMs",
    ) => pairs.map((pair) => pair[field][arm]);
    const result: RecordResult = {
      schemaVersion: "urgent-multiroot-transition-browser-v2",
      status: "PASS",
      collectedAt: new Date().toISOString(),
      reactCompilerEnabled: true,
      browser: {
        userAgent: navigator.userAgent,
        platform: navigator.platform,
        hardwareConcurrency: navigator.hardwareConcurrency,
      },
      compilerOrder,
      pairCount: pairs.length,
      pairs,
      medianUrgentLatencyMs: {
        react: quantile(values("react", "urgentLatencyMs"), 0.5),
        runtime: quantile(values("runtime", "urgentLatencyMs"), 0.5),
      },
      medianTransitionLatencyMs: {
        react: quantile(values("react", "transitionLatencyMs"), 0.5),
        runtime: quantile(values("runtime", "transitionLatencyMs"), 0.5),
      },
      allContractsPass: pairs.length === 20,
      limitations: [
        "programmatic input event, one browser and device; not trusted user input or frame-presentation latency",
        "one resource boundary and two transition roots; urgent input is explicitly kept outside that batch",
        "synthetic timers dominate transition completion; timing is descriptive only",
        "does not implement rebasing an urgent write that targets a root inside the pending transition",
      ],
    };
    (window as typeof window & { __urgentTransitionResult?: RecordResult })
      .__urgentTransitionResult = result;
    exportButton.disabled = false;
    statusNode.textContent = JSON.stringify(result, null, 2);
  } catch (error) {
    statusNode.textContent = `Study failed: ${String(error)}`;
  } finally {
    runButton.disabled = false;
  }
};

runButton.addEventListener("click", () => void runStudy());
exportButton.addEventListener("click", () => {
  const text = statusNode.textContent ?? "";
  const url = URL.createObjectURL(
    new Blob([text], { type: "application/json" }),
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = "urgent-multiroot-transition-browser-v2.json";
  link.click();
  URL.revokeObjectURL(url);
});
