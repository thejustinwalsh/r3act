/** @jsxImportSource react */
import { useLayoutEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { flushSync } from "react-dom";
import { Group, Scene } from "three";
import { use as readCustom, originCalls } from "../../fake/native_runtime_api";
import { use as readSubstring, substringCalls } from "../../substring_native_runtime_api";

function OriginProbe() {
  "use no memo";
  const value = `${readCustom("shared")}|${readSubstring("shared")}`;
  return <output data-origin={value}>{value}</output>;
}

type Deferred = { promise: Promise<string>; resolve(value: string): void };
const deferred = (): Deferred => {
  let resolve!: (value: string) => void;
  const promise = new Promise<string>(done => { resolve = done; });
  return { promise, resolve };
};
const providers = { A: deferred(), B: deferred(), C: deferred(), urgent: deferred() };
const started: string[] = ["A"], settled: string[] = [];
const statuses = { A: "pending", B: null as string | null, C: null as string | null, urgent: null as string | null };
let request = "A", accepted = "old", urgentValue: string | null = null, disposed = false;
const scene = new Scene(), sceneRoot = new Group(), sceneValue = new Group();
sceneValue.name = "old"; sceneRoot.add(sceneValue); scene.add(sceneRoot);
const trace = { mounts: {} as Record<string, number>, cleanups: {} as Record<string, number> };

function Result({ value }: { value: string }) {
  useLayoutEffect(() => {
    trace.mounts[value] = (trace.mounts[value] ?? 0) + 1;
    return () => { trace.cleanups[value] = (trace.cleanups[value] ?? 0) + 1; };
  }, [value]);
  return <output data-result={value} data-request={value === "old" ? "none" : "C"}>{value}</output>;
}
function Hot({ value }: { value: string }) {
  return <main data-shared="shared"><OriginProbe /><Result value={value} /></main>;
}
function App({ value }: { value: string }) {
  return <Hot value={value} />;
}
const root = createRoot(document.getElementById("app")!);
const fork = createRoot(document.getElementById("fork")!);
const urgentRoot = createRoot(document.getElementById("urgent")!);
const render = () => flushSync(() => {
  root.render(<App value={accepted} />);
  fork.render(<App value={accepted} />);
  urgentRoot.render(urgentValue === null ? null :
    <output data-urgent={urgentValue}>{urgentValue}</output>);
});
render();
const completion = new Map<string, Promise<{ status: string }>>();
const resolvers = new Map<string, (value: { status: string }) => void>();
for (const label of ["A", "B", "C", "urgent"]) completion.set(label,
  new Promise(resolve => resolvers.set(label, resolve)));
const finish = (label: "A" | "B" | "C" | "urgent", status: string) => {
  statuses[label] = status;
  settled.push(`${label}:${status}`);
  resolvers.get(label)?.({ status });
};
for (const label of ["A", "B", "C"] as const) void providers[label].promise.then(value => {
  if (statuses[label] !== "pending" || request !== label || disposed) return;
  accepted = value; sceneValue.name = value; finish(label, "committed"); render();
});
void providers.urgent.promise.then(value => {
  if (statuses.urgent !== "pending" || disposed) return;
  urgentValue = value; finish("urgent", "committed"); render();
});
const snapshot = () => ({
  origin: document.querySelector("#app [data-origin]")?.getAttribute("data-origin") ?? null,
  originCalls: originCalls(), substringCalls: substringCalls(),
  request,
  accepted: document.querySelector("[data-result]")?.getAttribute("data-result") ?? null,
  fork: document.getElementById("fork")?.querySelector("[data-result]")?.getAttribute("data-result") ?? null,
  scene: sceneRoot.children[0]?.name ?? null,
  urgent: document.querySelector("[data-urgent]")?.getAttribute("data-urgent") ?? null,
  statuses: { ...statuses }, started: [...started], settled: [...settled],
  mounts: { ...trace.mounts }, cleanups: { ...trace.cleanups }, disposed,
});
(window as Window & { replacementProof?: unknown }).replacementProof = {
  snapshot,
  replace() {
    request = "B"; statuses.B = "pending";
    finish("A", "cancelled");
    request = "C"; statuses.C = "pending"; started.push("C");
    finish("B", "cancelled");
    return "cancelled";
  },
  startUrgent() { statuses.urgent = "pending"; started.push("urgent"); },
  settle(label: keyof typeof providers, value: string) { providers[label].resolve(value); },
  async wait(label: "A" | "B" | "C" | "urgent") { return await completion.get(label); },
  dispose() {
    if (disposed) return;
    disposed = true;
    flushSync(() => { root.unmount(); fork.unmount(); urgentRoot.unmount(); });
    sceneRoot.remove(sceneValue);
  },
};
