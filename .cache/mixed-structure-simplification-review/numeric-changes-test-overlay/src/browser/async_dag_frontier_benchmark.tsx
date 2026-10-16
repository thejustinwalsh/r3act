import { startTransition, Suspense, use, useLayoutEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { flushSync } from "react-dom";
import { bindCompiledAsyncTasks, type CompiledAsyncTaskPlan } from "../async_task_plan.ts";
import { AsyncVDOMTransitionRuntime } from "../async_vdom_transition_runtime.ts";
import { compiledAsyncTaskPlan } from "./generated_async_dag_frontier_plan.ts";
import { jsx } from "../jsx_binding_runtime.ts";
import { DOMVDOMHost, VDOMSnapshotRoot } from "../vdom_snapshot_runtime.ts";

type Profile = { name: string };
type Feed = { label: string };
type Recommendations = { label: string };
type PageModel = { title: string; feedLabel: string; recommendation: string };
type Arm = "serial" | "reactPreload" | "dag";
type Event = { arm: Arm; node: string; phase: "start" | "finish"; atMs: number };
type ArmResult = { arm: Arm; durationMs: number; pendingRetained: boolean; pendingDetails: { sameNodes: boolean; nodesVisible: Record<string, boolean>; fallbackExists: boolean; fallbackVisible: boolean }; retainedKeys: boolean; model: PageModel; events: Event[]; taskOrder: string[]; independentStartGapMs: number; maxDependentStartLagMs: number; dependentTasksWithinFrame: boolean; dependencyOrderPass: boolean; committed: boolean; commitCount: number };
type PageResult = { schemaVersion: "async-dag-frontier-browser-v2"; collection: "async-dag-frontier-v2"; status: "PASS" | "FAIL"; replication: number; armOrder: Arm[]; collectedAt: string; browser: { userAgent: string; platform: string; hardwareConcurrency: number; visibilityState: string; buildMode: string }; requestDelayMs: { profile: number; feed: number; recommendations: number }; arms: Record<Arm, ArmResult>; outputParity: boolean; allPendingRetained: boolean; allKeyIdentityRetained: boolean; allDependenciesValid: boolean; commitCount: Record<Arm, number>; failure?: string; complete: boolean };

const plan = compiledAsyncTaskPlan as CompiledAsyncTaskPlan;
const order = new URLSearchParams(location.search).get("order")?.split(",") as Arm[] | undefined;
const replication = Number(new URLSearchParams(location.search).get("replication") ?? 0);
const isCollection = new URLSearchParams(location.search).get("collection") === "async-dag-frontier-v2";
const orderForPage: Arm[] = order?.length === 3 ? order : ["serial", "reactPreload", "dag"];
const reactContainer = document.querySelector<HTMLElement>("#react-view")!;
const runtimeContainer = document.querySelector<HTMLElement>("#runtime-view")!;
const statusNode = document.querySelector<HTMLElement>("#status")!;
const runButton = document.querySelector<HTMLButtonElement>("#run")!;
const reactRoot = createRoot(reactContainer);
const targetDelays = { profile: 90, feed: 130, recommendations: 110 };
const dataSuffix = `r${replication}`;
const time = () => performance.now();
const frame = () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));

const initial: PageModel = { title: "Hello, Ada", feedLabel: "Latest item · for Ada", recommendation: "Recommended for Ada" };
const initialPromise = Promise.resolve(initial);
let resolveInitialReady: () => void = () => {};
const initialReady = new Promise<void>((resolve) => { resolveInitialReady = resolve; });
const initialCandidate: ReactCandidate = { promise: initialPromise, committed: () => resolveInitialReady() };
const tree = (model: PageModel) => jsx("main", { "data-view": "dashboard" },
  jsx("h2", { key: "title", "data-node": "title" }, model.title),
  jsx("p", { key: "feed", "data-node": "feed" }, model.feedLabel),
  jsx("p", { key: "recommendation", "data-node": "recommendation" }, model.recommendation),
);
const reactTree = (model: PageModel) => <main data-view="dashboard">
  <h2 key="title" data-node="title">{model.title}</h2>
  <p key="feed" data-node="feed">{model.feedLabel}</p>
  <p key="recommendation" data-node="recommendation">{model.recommendation}</p>
</main>;

function PromiseView({ promise, committed }: { promise: Promise<PageModel>; committed: () => void }) {
  const model = use(promise);
  useLayoutEffect(() => committed(), [model, committed]);
  return reactTree(model);
}
const suspenseView = (promise: Promise<PageModel>, committed: () => void) => <Suspense fallback={<p data-node="fallback">Loading candidate…</p>}><PromiseView promise={promise} committed={committed} /></Suspense>;
type ReactCandidate = { promise: Promise<PageModel>; committed: () => void };
let updateReactCandidate: (candidate: ReactCandidate) => void = () => {};
function ReactHarness() {
  const [candidate, setCandidate] = useState<ReactCandidate>(initialCandidate);
  updateReactCandidate = setCandidate;
  return suspenseView(candidate.promise, candidate.committed);
}

const nodeSnapshot = (host: ParentNode) => Object.fromEntries(["title", "feed", "recommendation"].map((name) => [name, host.querySelector(`[data-node="${name}"]`)]));
const hasSameNodes = (host: ParentNode, before: Record<string, Element | null>) => Object.entries(before).every(([name, node]) => host.querySelector(`[data-node="${name}"]`) === node);
const visible = (node: Element | null) => !!node && node.isConnected && node.getClientRects().length > 0 && getComputedStyle(node).visibility !== "hidden";
const pendingStillVisible = (host: ParentNode, before: Record<string, Element | null>) =>
  hasSameNodes(host, before) && Object.values(before).every(visible) && !visible(host.querySelector('[data-node="fallback"]'));
const pendingDetails = (host: ParentNode, before: Record<string, Element | null>) => ({
  sameNodes: hasSameNodes(host, before),
  nodesVisible: Object.fromEntries(Object.entries(before).map(([name, node]) => [name, visible(node)])),
  fallbackExists: !!host.querySelector('[data-node="fallback"]'),
  fallbackVisible: visible(host.querySelector('[data-node="fallback"]')),
});
const record = (events: Event[], arm: Arm, node: string, phase: Event["phase"], t0: number) => events.push({ arm, node, phase, atMs: time() - t0 });

const request = async <T,>(arm: Arm, node: string, events: Event[], t0: number): Promise<T> => {
  record(events, arm, node, "start", t0);
  const params = new URLSearchParams({ resource: node, delay: String(targetDelays[node as keyof typeof targetDelays]), id: `${dataSuffix}-${arm}-${node}` });
  const response = await fetch(`/__benchmark/async-dag-resource?${params}`, { cache: "no-store" });
  if (!response.ok) throw new Error(`Resource ${node} returned HTTP ${response.status}`);
  const value = await response.json() as T;
  record(events, arm, node, "finish", t0);
  return value;
};

const note = async <T,>(events: Event[], arm: Arm, node: string, promise: Promise<T>, t0: number) => {
  const value = await promise;
  record(events, arm, node, "start", t0);
  record(events, arm, node, "finish", t0);
  return value;
};

const makeModel = async (arm: Arm, events: Event[], t0: number, profilePromise: Promise<Profile>, feedPromise: Promise<Feed>, recPromise: Promise<Recommendations>) => {
  const summary = note(events, arm, "profile-summary", profilePromise.then((profile) => `Hello, ${profile.name}`), t0);
  const annotations = note(events, arm, "feed-annotations", Promise.all([profilePromise, feedPromise]).then(([profile, feed]) => `${feed.label} · for ${profile.name}`), t0);
  const [title, feedLabel, recommendation] = await Promise.all([summary, annotations, recPromise]);
  record(events, arm, "page-model", "start", t0);
  record(events, arm, "page-model", "finish", t0);
  return { title, feedLabel, recommendation: recommendation.label };
};

const fetchAllKnown = (arm: Arm, events: Event[], t0: number) => {
  const profile = request<Profile>(arm, "profile", events, t0);
  const feed = request<Feed>(arm, "feed", events, t0);
  const recommendations = request<Recommendations>(arm, "recommendations", events, t0);
  return { profile, feed, recommendations };
};

const reactTrial = async (arm: "serial" | "reactPreload"): Promise<ArmResult> => {
  flushSync(() => updateReactCandidate({ promise: initialPromise, committed: () => {} }));
  await frame();
  const before = nodeSnapshot(reactContainer);
  const events: Event[] = [];
  const t0 = time();
  const modelPromise = arm === "serial"
    ? (async () => {
      const profile = await request<Profile>(arm, "profile", events, t0);
      const title = await note(events, arm, "profile-summary", Promise.resolve(`Hello, ${profile.name}`), t0);
      const feed = await request<Feed>(arm, "feed", events, t0);
      const feedLabel = await note(events, arm, "feed-annotations", Promise.resolve(`${feed.label} · for ${profile.name}`), t0);
      const recommendations = await request<Recommendations>(arm, "recommendations", events, t0);
      record(events, arm, "page-model", "start", t0);
      record(events, arm, "page-model", "finish", t0);
      return { title, feedLabel, recommendation: recommendations.label };
    })()
    : (() => { const tasks = fetchAllKnown(arm, events, t0); return makeModel(arm, events, t0, tasks.profile, tasks.feed, tasks.recommendations); })();
  let commitDuration = 0;
  let commitCount = 0;
  const committed = new Promise<void>((resolve) => {
    const commit = () => { commitCount++; record(events, arm, "host-commit", "start", t0); record(events, arm, "host-commit", "finish", t0); commitDuration = time() - t0; resolve(); };
    startTransition(() => updateReactCandidate({ promise: modelPromise, committed: commit }));
  });
  await frame();
  const details = pendingDetails(reactContainer, before);
  const pendingRetained = pendingStillVisible(reactContainer, before);
  await committed;
  const after = nodeSnapshot(reactContainer);
  const model = await modelPromise;
  const starts = events.filter((event) => event.phase === "start" && ["profile", "feed", "recommendations"].includes(event.node)).map((event) => event.atMs);
  const maxDependentStartLagMs = dependentStartLag(events);
  return { arm, durationMs: commitDuration, pendingRetained, pendingDetails: details, retainedKeys: Object.entries(before).every(([name, node]) => after[name] === node), model, events, taskOrder: events.filter((e) => e.phase === "start").map((e) => e.node), independentStartGapMs: Math.max(...starts) - Math.min(...starts), maxDependentStartLagMs, dependentTasksWithinFrame: maxDependentStartLagMs <= 1000 / 60, dependencyOrderPass: dependencyPass(events), committed: true, commitCount };
};

const dependencyPass = (events: Event[]) => {
  const starts = new Map(events.filter((event) => event.phase === "start").map((event) => [event.node, event.atMs]));
  const finishes = new Map(events.filter((event) => event.phase === "finish").map((event) => [event.node, event.atMs]));
  for (const resource of ["profile", "feed", "recommendations"]) if (!starts.has(resource)) return false;
  if (!(starts.get("profile-summary")! >= finishes.get("profile")!)) return false;
  if (!(starts.get("feed-annotations")! >= Math.max(finishes.get("profile")!, finishes.get("feed")!))) return false;
  if (!(starts.get("page-model")! >= Math.max(finishes.get("profile-summary")!, finishes.get("feed-annotations")!, finishes.get("recommendations")!))) return false;
  return starts.get("host-commit")! >= finishes.get("page-model")!;
};
const dependentStartLag = (events: Event[]) => {
  const starts = new Map(events.filter((event) => event.phase === "start").map((event) => [event.node, event.atMs]));
  const finishes = new Map(events.filter((event) => event.phase === "finish").map((event) => [event.node, event.atMs]));
  return Math.max(
    starts.get("profile-summary")! - finishes.get("profile")!,
    starts.get("feed-annotations")! - Math.max(finishes.get("profile")!, finishes.get("feed")!),
  );
};

const dagTrial = async (): Promise<ArmResult> => {
  const host = new DOMVDOMHost();
  const runtimeHost = runtimeContainer;
  runtimeHost.replaceChildren();
  const root = new VDOMSnapshotRoot(host, runtimeHost);
  root.commit(tree(initial));
  const before = Object.fromEntries(["title", "feed", "recommendation"].map((name) => [name, runtimeHost.querySelector(`[data-node="${name}"]`)]));
  const events: Event[] = [];
  const t0 = time();
  const tasks = bindCompiledAsyncTasks(plan, {
    profile: (values, _signal) => request<Profile>("dag", "profile", events, t0),
    feed: (values, _signal) => request<Feed>("dag", "feed", events, t0),
    recommendations: (values, _signal) => request<Recommendations>("dag", "recommendations", events, t0),
    "profile-summary": async (values) => { record(events, "dag", "profile-summary", "start", t0); const profile = values.get("profile") as Profile; const value = `Hello, ${profile.name}`; record(events, "dag", "profile-summary", "finish", t0); return value; },
    "feed-annotations": async (values) => { record(events, "dag", "feed-annotations", "start", t0); const profile = values.get("profile") as Profile; const feed = values.get("feed") as Feed; const value = `${feed.label} · for ${profile.name}`; record(events, "dag", "feed-annotations", "finish", t0); return value; },
    "page-model": async (values) => { record(events, "dag", "page-model", "start", t0); const model = { title: values.get("profile-summary") as string, feedLabel: values.get("feed-annotations") as string, recommendation: (values.get("recommendations") as Recommendations).label }; record(events, "dag", "page-model", "finish", t0); return model; },
  });
  const runtime = new AsyncVDOMTransitionRuntime(new Map([["dashboard", root]]));
  const run = runtime.run({ rootIds: ["dashboard"], tasks, maxConcurrency: 3, buildTree: (_id, values) => tree(values.get("page-model") as PageModel) });
  await frame();
  const details = pendingDetails(runtimeHost, before);
  const pendingRetained = Object.entries(before).every(([name, node]) => runtimeHost.querySelector(`[data-node="${name}"]`) === node);
  const result = await run;
  record(events, "dag", "host-commit", "start", t0);
  record(events, "dag", "host-commit", "finish", t0);
  const after = Object.fromEntries(["title", "feed", "recommendation"].map((name) => [name, runtimeHost.querySelector(`[data-node="${name}"]`)]));
  const model = await Promise.resolve(result.resolution.status === "committed" ? {
    title: runtimeHost.querySelector('[data-node="title"]')?.textContent ?? "",
    feedLabel: runtimeHost.querySelector('[data-node="feed"]')?.textContent ?? "",
    recommendation: runtimeHost.querySelector('[data-node="recommendation"]')?.textContent ?? "",
  } : { title: "", feedLabel: "", recommendation: "" });
  const starts = events.filter((event) => event.phase === "start" && ["profile", "feed", "recommendations"].includes(event.node)).map((event) => event.atMs);
  const maxDependentStartLagMs = dependentStartLag(events);
  return { arm: "dag", durationMs: time() - t0, pendingRetained, pendingDetails: details, retainedKeys: Object.entries(before).every(([name, node]) => after[name] === node), model, events, taskOrder: result.startedTasks, independentStartGapMs: Math.max(...starts) - Math.min(...starts), maxDependentStartLagMs, dependentTasksWithinFrame: maxDependentStartLagMs <= 1000 / 60, dependencyOrderPass: dependencyPass(events), committed: result.resolution.status === "committed", commitCount: result.resolution.status === "committed" ? 1 : 0 };
};

const runPage = async () => {
  runButton.disabled = true;
  const results: Partial<Record<Arm, ArmResult>> = {};
  try {
    await initialReady;
    for (const arm of orderForPage) {
      statusNode.textContent = `Replication ${replication}: running ${arm}…`;
      if (arm === "dag") results.dag = await dagTrial();
      else results[arm] = await reactTrial(arm);
      if (arm === "dag") {
        runtimeContainer.replaceChildren();
      }
    }
    const arms = results as Record<Arm, ArmResult>;
    const values = Object.values(arms);
    const outputParity = values.every((x) => JSON.stringify(x.model) === JSON.stringify(initial));
    // Each request is tagged with the same route data, so exact view output is stable by design.
    const allPendingRetained = values.every((x) => x.pendingRetained);
    const allKeyIdentityRetained = values.every((x) => x.retainedKeys);
    const allDependenciesValid = values.every((x) => x.dependencyOrderPass);
    const recordValue: PageResult = {
      schemaVersion: "async-dag-frontier-browser-v2", collection: "async-dag-frontier-v2", status: outputParity && allPendingRetained && allKeyIdentityRetained && allDependenciesValid && values.every((x) => x.committed && x.commitCount === 1 && x.dependentTasksWithinFrame) ? "PASS" : "FAIL",
      replication, armOrder: orderForPage, collectedAt: new Date().toISOString(),
      browser: { userAgent: navigator.userAgent, platform: navigator.platform, hardwareConcurrency: navigator.hardwareConcurrency, visibilityState: document.visibilityState, buildMode: import.meta.env.PROD ? "production" : "development" },
      requestDelayMs: targetDelays, arms, outputParity, allPendingRetained, allKeyIdentityRetained, allDependenciesValid,
      commitCount: Object.fromEntries(values.map((value) => [value.arm, value.commitCount])) as Record<Arm, number>,
      complete: true,
    };
    const query = new URLSearchParams(location.search);
    if (isCollection) {
      const response = await fetch("/__benchmark/save-async-dag-frontier", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(recordValue) });
      if (!response.ok) throw new Error(`Archive failed: ${await response.text()}`);
      statusNode.textContent = `${recordValue.status}: replication ${replication + 1}/30 saved.\nSerial ${arms.serial.durationMs.toFixed(1)} ms · React preload ${arms.reactPreload.durationMs.toFixed(1)} ms · DAG ${arms.dag.durationMs.toFixed(1)} ms\nIndependent start gap: React ${arms.reactPreload.independentStartGapMs.toFixed(2)} ms · DAG ${arms.dag.independentStartGapMs.toFixed(2)} ms`;
      if (replication < 29) {
        const next = new URL(location.href);
        next.searchParams.set("replication", String(replication + 1));
        next.searchParams.set("order", window.__frontierSchedule[replication + 1].join(","));
        setTimeout(() => location.assign(next), 250);
      } else statusNode.textContent += "\nSchedule complete.";
    } else {
      statusNode.textContent = `${recordValue.status}: one pilot page block.\nSerial ${arms.serial.durationMs.toFixed(1)} ms · React preload ${arms.reactPreload.durationMs.toFixed(1)} ms · DAG ${arms.dag.durationMs.toFixed(1)} ms\nIndependent start gap: React ${arms.reactPreload.independentStartGapMs.toFixed(2)} ms · DAG ${arms.dag.independentStartGapMs.toFixed(2)} ms\n${values.map((x) => `${x.arm}: pending retained=${x.pendingRetained}, keys retained=${x.retainedKeys}, dependencies=${x.dependencyOrderPass}, dependent lag=${x.maxDependentStartLagMs.toFixed(2)} ms/${x.dependentTasksWithinFrame}; ${JSON.stringify(x.pendingDetails)}`).join("\n")}`;
      console.log(recordValue);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    statusNode.textContent = `FAIL: ${message}`;
    if (isCollection) {
      const failureRecord = {
        schemaVersion: "async-dag-frontier-browser-v2", collection: "async-dag-frontier-v2", status: "FAIL", replication,
        armOrder: orderForPage, collectedAt: new Date().toISOString(), complete: false,
        failure: message,
        browser: { userAgent: navigator.userAgent, platform: navigator.platform, hardwareConcurrency: navigator.hardwareConcurrency, visibilityState: document.visibilityState, buildMode: import.meta.env.PROD ? "production" : "development" },
      };
      try {
        const archiveResponse = await fetch("/__benchmark/save-async-dag-frontier", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(failureRecord) });
        if (!archiveResponse.ok) throw new Error(`Failure archive rejected: ${await archiveResponse.text()}`);
        statusNode.textContent += `\nFailed block ${replication + 1}/30 archived.`;
        if (replication < 29) {
          const next = new URL(location.href);
          next.searchParams.set("replication", String(replication + 1));
          next.searchParams.set("order", window.__frontierSchedule[replication + 1].join(","));
          setTimeout(() => location.assign(next), 250);
        }
      } catch (archiveError) {
        statusNode.textContent += `\nFailure archive failed: ${archiveError instanceof Error ? archiveError.message : String(archiveError)}`;
      }
    }
  } finally {
    runButton.disabled = false;
  }
};

declare global { interface Window { __frontierSchedule: Arm[][] } }
window.__frontierSchedule = window.__frontierSchedule ?? Array.from({ length: 30 }, (_, i) => {
  const permutations: Arm[][] = [["serial", "reactPreload", "dag"], ["serial", "dag", "reactPreload"], ["reactPreload", "serial", "dag"], ["reactPreload", "dag", "serial"], ["dag", "serial", "reactPreload"], ["dag", "reactPreload", "serial"]];
  return permutations[i % permutations.length];
});
runButton.addEventListener("click", () => void runPage());
flushSync(() => reactRoot.render(<ReactHarness />));
if (isCollection) void runPage();
