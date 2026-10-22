import { createElement, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { flushSync } from "react-dom";
import { ComponentStateRoot } from "../component_state_runtime.ts";
import { jsx } from "../jsx_binding_runtime.ts";
import { DOMVDOMHost } from "../vdom_snapshot_runtime.ts";
import { Counter, EffectProbe, KeyedRow } from "./generated_component_state_transform.tsx";

const reactContainer = document.querySelector("#react-root");
const runtimeContainer = document.querySelector("#runtime-root");
const resultNode = document.querySelector("#result");
if (!(reactContainer instanceof HTMLElement) || !(runtimeContainer instanceof HTMLElement) ||
  !(resultNode instanceof HTMLElement)) throw new Error("Page is missing a required test container");
window.addEventListener("error", (event) => {
  resultNode.className = "fail";
  resultNode.textContent = `Browser error: ${event.message}\n${event.error?.stack ?? ""}`;
});
window.addEventListener("unhandledrejection", (event) => {
  resultNode.className = "fail";
  resultNode.textContent = `Unhandled rejection: ${String(event.reason)}\n${event.reason?.stack ?? ""}`;
});

const reactRoot = createRoot(reactContainer);
const runtimeRoot = new ComponentStateRoot(new DOMVDOMHost(), runtimeContainer);

function ReactCounter() {
  const [count, setCount] = useState(0);
  return createElement("button", { "data-counter": "", "data-count": count, onClick: () => setCount((value) => value + 1) }, count);
}

function ReactRow({ id }: { id: string }) {
  const [selected, setSelected] = useState(false);
  return createElement("li", {
    "data-id": id,
    "data-selected": String(selected),
    onClick: () => setSelected((value) => !value),
  }, id);
}

const reactEffectEvents: string[] = [];
const runtimeEffectEvents: string[] = [];
function ReactEffectProbe({ label }: { label: string }) {
  useEffect(() => {
    reactEffectEvents.push(`setup:${label}`);
    return () => { reactEffectEvents.push(`cleanup:${label}`); };
  }, []);
  return createElement("output", { "data-effect-probe": "" }, label);
}

const reactRows = (ids: string[]) => createElement("ul", { "data-rows": "" },
  ...ids.map((id) => createElement(ReactRow, { key: id, id })));
const runtimeRows = (ids: string[]) => jsx("ul", { "data-rows": "" },
  ids.map((id) => jsx(KeyedRow, { key: id, id })));
const settleRuntime = () => new Promise<void>((resolve) => queueMicrotask(resolve));
const settleEffects = () => new Promise<void>((resolve) => setTimeout(resolve, 0));
const reactTree = (ids: string[], effectLabel: string, effectActive: boolean) => createElement("main", {},
  createElement(ReactCounter), reactRows(ids), effectActive ? createElement(ReactEffectProbe, { label: effectLabel }) : null);
const runtimeTree = (ids: string[], effectLabel: string, effectActive: boolean) => jsx("main", {},
  jsx(Counter, {}), runtimeRows(ids), jsx(EffectProbe, {
    active: effectActive,
    label: effectLabel,
    onSetup: (label: string) => runtimeEffectEvents.push(`setup:${label}`),
    onCleanup: (label: string) => runtimeEffectEvents.push(`cleanup:${label}`),
  }));

flushSync(() => reactRoot.render(reactTree(["a", "b", "c"], "first", true)));
runtimeRoot.mount(runtimeTree(["a", "b", "c"], "first", true));
await settleEffects();

const reactCounter = reactContainer.querySelector<HTMLButtonElement>("[data-counter]");
const runtimeCounter = runtimeContainer.querySelector<HTMLButtonElement>("[data-count]");
if (!reactCounter || !runtimeCounter) throw new Error("Counter mount failed");
for (let click = 1; click <= 3; click++) {
  flushSync(() => reactCounter.click());
  runtimeCounter.click();
  await settleRuntime();
  if (reactCounter.dataset.count !== String(click) || runtimeCounter.dataset.count !== String(click) ||
    reactCounter.textContent !== String(click) || runtimeCounter.textContent !== String(click)) {
    throw new Error(`Counter output diverged after click ${click}`);
  }
}
const threeNativeCounterClicksMatch = reactCounter.dataset.count === "3" &&
  runtimeCounter.dataset.count === "3" && reactCounter.textContent === "3" && runtimeCounter.textContent === "3";

const findRows = (container: HTMLElement) => Array.from(container.querySelectorAll<HTMLLIElement>("li"));
const reactList = reactContainer.querySelector<HTMLUListElement>("ul");
const runtimeList = runtimeContainer.querySelector<HTMLUListElement>("ul");
if (!reactList || !runtimeList) throw new Error("Keyed row mount failed");
const originalReactRows = new Map(findRows(reactContainer).map((node) => [node.dataset.id!, node]));
const originalRuntimeRows = new Map(findRows(runtimeContainer).map((node) => [node.dataset.id!, node]));
findRows(reactContainer)[1].click();
findRows(runtimeContainer)[1].click();
await settleRuntime();
flushSync(() => reactRoot.render(reactTree(["c", "a", "b"], "changed", true)));
runtimeRoot.update(runtimeTree(["c", "a", "b"], "changed", true));
const reorderedReactRows = findRows(reactContainer);
const reorderedRuntimeRows = findRows(runtimeContainer);
const reorderStateAndIdentity = reorderedReactRows.map((node) => node.dataset.id).join() === "c,a,b" &&
  reorderedRuntimeRows.map((node) => node.dataset.id).join() === "c,a,b" &&
  reorderedReactRows[2] === originalReactRows.get("b") && reorderedRuntimeRows[2] === originalRuntimeRows.get("b") &&
  reorderedReactRows[2].dataset.selected === "true" && reorderedRuntimeRows[2].dataset.selected === "true";
if (!reorderStateAndIdentity) throw new Error("Keyed state or host identity diverged after reorder");

const removedReactB = reorderedReactRows[2];
const removedRuntimeB = reorderedRuntimeRows[2];
flushSync(() => reactRoot.render(reactTree(["c", "a"], "changed", true)));
runtimeRoot.update(runtimeTree(["c", "a"], "changed", true));
flushSync(() => reactRoot.render(reactTree(["b", "c", "a"], "changed", true)));
runtimeRoot.update(runtimeTree(["b", "c", "a"], "changed", true));
const reinsertedReactB = findRows(reactContainer)[0];
const reinsertedRuntimeB = findRows(runtimeContainer)[0];
const reinsertedStateResets = reinsertedReactB !== removedReactB && reinsertedRuntimeB !== removedRuntimeB &&
  reinsertedReactB.dataset.selected === "false" && reinsertedRuntimeB.dataset.selected === "false";
if (!reinsertedStateResets) throw new Error("Reinserted keyed row did not receive fresh state and host identity");

const removedNodeVersion = runtimeRoot.version;
removedReactB.click();
removedRuntimeB.click();
await settleRuntime();
const detachedEventIsInert = runtimeRoot.version === removedNodeVersion && !removedRuntimeB.isConnected;
if (!detachedEventIsInert) throw new Error("Detached generated component event changed committed runtime state");

flushSync(() => reactRoot.render(reactTree(["b", "c", "a"], "changed", false)));
runtimeRoot.update(runtimeTree(["b", "c", "a"], "changed", false));
await settleEffects();
const effectSiteCleanupMatches = JSON.stringify(reactEffectEvents) === JSON.stringify(["setup:first", "cleanup:first"]) &&
  JSON.stringify(runtimeEffectEvents) === JSON.stringify(reactEffectEvents);
flushSync(() => reactRoot.render(reactTree(["b", "c", "a"], "second", true)));
runtimeRoot.update(runtimeTree(["b", "c", "a"], "second", true));
await settleEffects();
const effectSiteReactivationMatches = JSON.stringify(reactEffectEvents) === JSON.stringify([
  "setup:first", "cleanup:first", "setup:second",
]) && JSON.stringify(runtimeEffectEvents) === JSON.stringify(reactEffectEvents);

reactRoot.unmount();
runtimeRoot.dispose();
const effectRootCleanupMatches = JSON.stringify(reactEffectEvents) === JSON.stringify([
  "setup:first", "cleanup:first", "setup:second", "cleanup:second",
]) && JSON.stringify(runtimeEffectEvents) === JSON.stringify(reactEffectEvents);

resultNode.className = "pass";
resultNode.textContent = JSON.stringify({
  status: "PASS",
  reactBaseline: "react/react-dom 19.3.0",
  compilerOutput: "OXC-generated TSX with lexical state-site IDs",
  collectedAt: new Date().toISOString(),
  browser: {
    userAgent: navigator.userAgent,
    platform: navigator.platform,
    hardwareConcurrency: navigator.hardwareConcurrency,
    devicePixelRatio: window.devicePixelRatio,
  },
  checks: {
    threeNativeCounterClicksMatch,
    reorderStateAndIdentity,
    reinsertedStateResets,
    detachedEventIsInert,
    effectSiteCleanupMatches,
    effectSiteReactivationMatches,
    effectRootCleanupMatches,
  },
  reactEffectEvents,
  runtimeEffectEvents,
  timing: "not measured",
}, null, 2);
