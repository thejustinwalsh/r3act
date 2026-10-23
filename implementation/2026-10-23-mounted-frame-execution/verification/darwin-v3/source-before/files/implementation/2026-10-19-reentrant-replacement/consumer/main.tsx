/** @jsxImportSource @r3act/core */
// @native-ui
import { NativeRootWorkQueue, NativeTaskTransitionQueue, Suspense, asyncTask, createStore, createWorld, use, useEffect } from "@r3act/core";
import type { AsyncResource, NativeTaskTransitionHandle } from "@r3act/core";
import { createDOMRoot } from "@r3act/host-dom";
import { createThreeNativeRoot } from "@r3act/host-three";
import { Scene } from "three";
import { SceneApp } from "./scene";

const shared = createStore("shared");
type Deferred = { promise: Promise<string>; resolve(value: string): void };
const deferred = (): Deferred => {
  let resolve!: (value: string) => void;
  const promise = new Promise<string>(done => { resolve = done; });
  return { promise, resolve };
};
const providers = { A: deferred(), B: deferred(), C: deferred(), urgent: deferred() };
const started: string[] = [], settled: string[] = [];
const loadTasks = [asyncTask("load", async (values) => {
  const label = values.get("$label") as "A" | "B" | "C";
  started.push(label);
  return await providers[label].promise;
})] as const;
const urgentTasks = [asyncTask("urgent", async (_values) => {
  started.push("urgent");
  return await providers.urgent.promise;
})] as const;
const trace = { mounts: {} as Record<string, number>, cleanups: {} as Record<string, number> };
const countMount = (label: string) => {
  trace.mounts[label] = (trace.mounts[label] ?? 0) + 1;
  return () => { trace.cleanups[label] = (trace.cleanups[label] ?? 0) + 1; };
};
let a: NativeTaskTransitionHandle | null = null;
let b: NativeTaskTransitionHandle | null = null;
let c: NativeTaskTransitionHandle | null = null;
let urgent: NativeTaskTransitionHandle | null = null;

function Result(props: { resource: AsyncResource<string>; label: string }) {
  const value = use(props.resource);
  useEffect(() => countMount(value));
  return <output key="result" data-result={value} data-request={props.label}>{value}</output>;
}
function App(props: { resource: AsyncResource<string>; label: string }) {
  const sharedValue = use(shared);
  return <main key="main" data-shared={sharedValue}>
    <Suspense fallback={<output key="result" data-result="waiting" data-request={props.label}>waiting</output>}>
      <Result key="result-owner" resource={props.resource} label={props.label} />
    </Suspense>
  </main>;
}
function Old() {
  useEffect(() => countMount("old"));
  return <main key="main" data-shared="shared"><output key="result" data-result="old" data-request="none">old</output></main>;
}
function Urgent(props: { resource: AsyncResource<string> }) {
  const value = use(props.resource);
  return <output key="urgent" data-urgent={value}>{value}</output>;
}

export function mountReplacement(host: HTMLElement, forkHost: HTMLElement, urgentHost: HTMLElement) {
  const world = createWorld(), scene = new Scene();
  const dom = createDOMRoot(host, { world, rootId: "replacement-dom" });
  const three = createThreeNativeRoot(scene, { rootOptions: { world, rootId: "replacement-three" } });
  const fork = createDOMRoot(forkHost, { world, rootId: "replacement-fork" });
  const urgentRoot = createDOMRoot(urgentHost, { world, rootId: "replacement-urgent" });
  const work = new NativeRootWorkQueue();
  const queue = new NativeTaskTransitionQueue({ queue: work });
  dom.mount(<Old />);
  three.root.mount(<SceneApp label="none" />);
  fork.mount(<Old />);
  const roots = (label: "A" | "B" | "C") => [
    { root: dom, buildTree: (execution: any) => <App resource={execution.resource("load")} label={label} /> },
    { root: three.root, buildTree: (execution: any) => <SceneApp resource={execution.resource("load")} label={label} /> },
    { root: fork, buildTree: (execution: any) => <App resource={execution.resource("load")} label={label} /> },
  ] as const;
  const submit = (label: "A" | "B" | "C", onSettled?: (status: string) => void) => queue.enqueue(
    loadTasks,
    roots(label),
    { id: label, key: "route", inputs: { "$label": label }, onSettled: resolution => {
      settled.push(`${label}:${resolution.status}`);
      onSettled?.(resolution.status);
    } },
  );
  a = submit("A", status => { if (status === "cancelled") c = submit("C"); });
  let disposed = false;
  const snapshot = () => ({
    request: c ? "C" : b ? "B" : "A",
    accepted: host.querySelector("[data-result]")?.getAttribute("data-result") ?? null,
    fork: forkHost.querySelector("[data-result]")?.getAttribute("data-result") ?? null,
    scene: scene.children[0]?.children[0]?.name ?? null,
    urgent: urgentHost.querySelector("[data-urgent]")?.getAttribute("data-urgent") ?? null,
    statuses: { A: a?.status ?? null, B: b?.status ?? null, C: c?.status ?? null, urgent: urgent?.status ?? null },
    started: [...started], settled: [...settled], mounts: { ...trace.mounts }, cleanups: { ...trace.cleanups },
    dom: dom.diagnostics(), three: three.root.diagnostics(), forkDiagnostics: fork.diagnostics(),
    urgentDiagnostics: urgentRoot.diagnostics(), threeHost: three.host.diagnostics, disposed,
  });
  return {
    snapshot,
    replace() { b = submit("B"); return b.resolution.status; },
    startUrgent() {
      urgent = queue.enqueue(urgentTasks, [{ root: urgentRoot, buildTree: (execution: any) =>
        <Suspense fallback={<output key="urgent" data-urgent="waiting">waiting</output>}>
          <Urgent key="urgent-owner" resource={execution.resource("urgent")} />
        </Suspense> }], { id: "urgent", key: "independent", onSettled: resolution =>
        settled.push(`urgent:${resolution.status}`) });
    },
    settle(label: keyof typeof providers, value: string) { providers[label].resolve(value); },
    async wait(label: "A" | "B" | "C" | "urgent") {
      return await ({ A: a, B: b, C: c, urgent })[label]?.completion;
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      queue.dispose(); work.dispose(); dom.dispose(); three.dispose(); fork.dispose(); urgentRoot.dispose();
    },
  };
}

(window as Window & { replacementProof?: ReturnType<typeof mountReplacement> }).replacementProof =
  mountReplacement(document.getElementById("app")!, document.getElementById("fork")!, document.getElementById("urgent")!);
