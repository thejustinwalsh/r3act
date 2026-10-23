import { createElement, useSyncExternalStore } from "react";
import { createRoot } from "react-dom/client";
import { flushSync } from "react-dom";
import { bind, jsx, ScalarSource } from "../jsx_binding_runtime.ts";
import { DOMVDOMHost, VDOMSnapshotRoot } from "../vdom_snapshot_runtime.ts";

type PhaseResult = {
  click: number;
  reactCount: string | null;
  vdomCount: string | null;
  reactWidth: string;
  vdomWidth: string;
  parity: boolean;
};

const reactContainer = document.querySelector("#react-root");
const vdomContainer = document.querySelector("#vdom-root");
const resultNode = document.querySelector("#result");
if (!(reactContainer instanceof HTMLElement) || !(vdomContainer instanceof HTMLElement) || !(resultNode instanceof HTMLElement)) {
  throw new Error("Event differential page is missing a required container");
}

let reactStoreValue = 0;
const reactStoreListeners = new Set<() => void>();
const subscribe = (listener: () => void) => {
  reactStoreListeners.add(listener);
  return () => reactStoreListeners.delete(listener);
};
const getSnapshot = () => reactStoreValue;
const increment = () => {
  reactStoreValue++;
  for (const listener of reactStoreListeners) listener();
};

function ReactCounter({ showButton = true }: { showButton?: boolean }) {
  const value = useSyncExternalStore(subscribe, getSnapshot);
  return createElement("section", { "data-count": value },
    showButton ? createElement("button", { type: "button", onClick: increment }, "Increment") : null,
    createElement("div", {
      "data-meter": "react",
      "data-count": value,
      style: { width: `${value + 1}px` },
    }),
  );
}

const reactRoot = createRoot(reactContainer);
flushSync(() => reactRoot.render(createElement(ReactCounter)));

const source = new ScalarSource(0, 0);
const vdomRoot = new VDOMSnapshotRoot(new DOMVDOMHost(), vdomContainer);
const makeVDOMTree = (showButton = true) => jsx("section", { "data-count": bind(source) }, [
  ...(showButton ? [jsx("button", {
    type: "button",
    onClick: () => vdomRoot.setSource(source, source.value + 1),
  }, "Increment")] : []),
  jsx("div", {
    "data-meter": "vdom",
    "data-count": bind(source),
    style: { width: bind(source, (value) => `${value + 1}px`) },
  }),
]);
vdomRoot.commit(makeVDOMTree());

const phases: PhaseResult[] = [];
for (let click = 1; click <= 3; click++) {
  const reactButton = reactContainer.querySelector("button");
  const vdomButton = vdomContainer.querySelector("button");
  if (!(reactButton instanceof HTMLButtonElement) || !(vdomButton instanceof HTMLButtonElement)) {
    throw new Error("Expected one button in each renderer");
  }
  flushSync(() => reactButton.click());
  vdomButton.click();

  const reactMeter = reactContainer.querySelector<HTMLElement>("[data-meter]");
  const vdomMeter = vdomContainer.querySelector<HTMLElement>("[data-meter]");
  const reactCount = reactContainer.querySelector("section")?.getAttribute("data-count") ?? null;
  const vdomCount = vdomContainer.querySelector("section")?.getAttribute("data-count") ?? null;
  const reactWidth = reactMeter?.style.width ?? "";
  const vdomWidth = vdomMeter?.style.width ?? "";
  const parity = reactCount === String(click) && vdomCount === String(click) &&
    reactMeter?.dataset.count === String(click) && vdomMeter?.dataset.count === String(click) &&
    reactWidth === `${click + 1}px` && vdomWidth === `${click + 1}px`;
  phases.push({ click, reactCount, vdomCount, reactWidth, vdomWidth, parity });
  if (!parity) throw new Error(`Click ${click}: event-driven state/output parity failed`);
}

const oldReactButton = reactContainer.querySelector("button");
const oldVDOMButton = vdomContainer.querySelector("button");
if (!(oldReactButton instanceof HTMLButtonElement) || !(oldVDOMButton instanceof HTMLButtonElement)) {
  throw new Error("Expected buttons before listener cleanup check");
}
flushSync(() => reactRoot.render(createElement(ReactCounter, { showButton: false })));
vdomRoot.commit(makeVDOMTree(false));
const valueBeforeDetachedClick = source.value;
oldReactButton.click();
oldVDOMButton.click();
const detachedClickNoop = reactStoreValue === valueBeforeDetachedClick && source.value === valueBeforeDetachedClick;
if (!detachedClickNoop) throw new Error("A detached button callback changed its source after removal");

resultNode.className = "pass";
resultNode.textContent = JSON.stringify({
  status: "PASS",
  reactBaseline: "react/react-dom 19.3.0",
  collectedAt: new Date().toISOString(),
  browser: {
    userAgent: navigator.userAgent,
    platform: navigator.platform,
    hardwareConcurrency: navigator.hardwareConcurrency,
    devicePixelRatio: window.devicePixelRatio,
    viewport: { width: window.innerWidth, height: window.innerHeight },
  },
  contract: "A native click increments one state source and both declarative outputs reflect every update",
  vdomPath: "native click listener → ScalarSource → retained source-to-prop/style index → host writes",
  reactPath: "click handler → external store notification → useSyncExternalStore → React render and commit",
  removedButtonListenerCleanup: detachedClickNoop,
  timing: "not measured",
  phases,
}, null, 2);

reactRoot.unmount();
vdomRoot.dispose();
