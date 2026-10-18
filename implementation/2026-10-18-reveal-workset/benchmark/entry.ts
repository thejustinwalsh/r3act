import { mountNative } from "./native_arm.tsx";
import { mountReact } from "./react_arm.tsx";

type Arm = ReturnType<typeof mountNative> | ReturnType<typeof mountReact>;
const assert = (condition: unknown, message: string): asserts condition => {
  if (!condition) throw new Error(message);
};
const nextFrame = () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
const visibleText = (node: Element | null) => node?.textContent ?? "";
const visibility = (node: Element) => {
  const style = getComputedStyle(node);
  return { display: style.display, visibility: style.visibility, opacity: style.opacity,
    hiddenAttribute: node.closest("[hidden]") !== null,
    visible: style.display !== "none" && style.visibility !== "hidden" && style.visibility !== "collapse" &&
      style.opacity !== "0" && node.closest("[hidden]") === null };
};
const containsSelector = (node: Node, selector: string) => node instanceof Element &&
  (node.matches(selector) || node.querySelector(selector) !== null);
const timerQuantum = () => {
  let previous = performance.now();
  let minimum = Infinity;
  for (let index = 0; index < 2048; index++) {
    const current = performance.now();
    if (current > previous) minimum = Math.min(minimum, current - previous);
    previous = current;
  }
  return Number.isFinite(minimum) ? minimum : null;
};
const digest = async (value: string) => {
  const bytes = new TextEncoder().encode(value);
  return [...new Uint8Array(await crypto.subtle.digest("SHA-256", bytes))]
    .map((part) => part.toString(16).padStart(2, "0")).join("");
};

async function waitFor(predicate: () => boolean, message: string, deadlineAt: number) {
  while (!predicate()) {
    if (performance.now() >= deadlineAt) throw new Error(message);
    await nextFrame();
  }
}

function observeNextReadySet(root: Element, timeoutMs: number) {
  let observer: MutationObserver;
  let timer: number;
  let settled = false;
  let resolve!: (value: number) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<number>((yes, no) => { resolve = yes; reject = no; });
  const finish = (callback: () => void) => {
    if (settled) return;
    settled = true;
    observer.disconnect();
    clearTimeout(timer);
    callback();
  };
  const bothReady = () => visibleText(root.querySelector('[data-b="primary"]')) === "B ready" &&
    visibleText(root.querySelector('[data-c="primary"]')) === "C ready";
  observer = new MutationObserver(() => {
    if (bothReady()) finish(() => resolve(performance.now()));
  });
  observer.observe(root, { subtree: true, childList: true, characterData: true, attributes: true });
  timer = window.setTimeout(() => finish(() => reject(new Error("timed out waiting for both B and C primaries"))), timeoutMs);
  return { promise, cancel() { finish(() => reject(new Error("cancelled while waiting for B and C"))); } };
}

async function run(arm: "native" | "react") {
  const host = document.createElement("section");
  host.dataset.arm = arm;
  document.body.append(host);
  let controller: Arm | null = null;
  let disposed = false;
  let primaryError: unknown;
  const cleanupErrors: unknown[] = [];
  let transitionObserver: MutationObserver | null = null;
  let stopBCObservation: (() => void) | null = null;
  try {
    controller = arm === "native" ? mountNative(host) : mountReact(host);
    const mountDurationMs = controller.mountDurationMs;
    const timerResolutionMs = timerQuantum();
    await waitFor(() => visibleText(host.querySelector('[data-a="primary"]')) === "A ready" &&
      visibleText(host.querySelector('[data-b="fallback"]')) === "B waiting" &&
      visibleText(host.querySelector('[data-c="fallback"]')) === "C waiting",
      `${arm}: initial A primary/B+C fallbacks did not mount`, performance.now() + 5000);
    const aNode = host.querySelector('[data-a="primary"]');
    assert(aNode, `${arm}: initial A primary missing`);
    const initialText = aNode.textContent;
    let aFallbackInserted = false;
    const aVisibilitySamples = [visibility(aNode)];
    transitionObserver = new MutationObserver((records) => {
      if (records.some((item) => [...item.addedNodes].some((node) => containsSelector(node, '[data-a="fallback"]')))) {
        aFallbackInserted = true;
      }
      aVisibilitySamples.push(visibility(aNode));
    });
    transitionObserver.observe(host, { subtree: true, childList: true, attributes: true });
    controller.beginPendingA();
    await nextFrame();
    await nextFrame();
    assert(host.querySelector('[data-a="primary"]') === aNode, `${arm}: A's accepted primary was replaced while pending`);
    assert(aNode.textContent === initialText, `${arm}: A's accepted text changed while pending`);
    assert(!host.querySelector('[data-a="fallback"]'), `${arm}: A showed fallback during retained update`);
    assert(visibleText(host.querySelector('[data-b="fallback"]')) === "B waiting" &&
      visibleText(host.querySelector('[data-c="fallback"]')) === "C waiting",
      `${arm}: B or C left its accepted fallback before settlement`);

    const waitForBoth = observeNextReadySet(host, 5000);
    stopBCObservation = waitForBoth.cancel;
    void waitForBoth.promise.catch(() => {});
    const settledAt = performance.now();
    controller.settleBC();
    let observedAt: number;
    try { observedAt = await waitForBoth.promise; }
    catch (error) { waitForBoth.cancel(); transitionObserver.disconnect(); throw error; }
    const settlementToMutationObserverMs = observedAt - settledAt;
    transitionObserver.disconnect();
    aVisibilitySamples.push(visibility(aNode));
    assert(!aFallbackInserted, `${arm}: A fallback was inserted during B/C reveal`);
    assert(aVisibilitySamples.every((sample) => sample.visible), `${arm}: retained A was hidden during reveal`);
    assert(host.querySelector('[data-a="primary"]') === aNode, `${arm}: B/C reveal replaced A's host node`);
    assert(aNode.textContent === initialText, `${arm}: B/C reveal changed A's accepted text`);
    assert(!host.querySelector('[data-a="fallback"]'), `${arm}: A fallback flashed during reveal`);
    const bNode = host.querySelector('[data-b="primary"]');
    const cNode = host.querySelector('[data-c="primary"]');
    assert(bNode?.tagName === "DIV" && bNode.textContent === "B ready", `${arm}: B primary host shape differs`);
    assert(cNode?.tagName === "DIV" && cNode.textContent === "C ready", `${arm}: C primary host shape differs`);
    const finalText = host.textContent ?? "";
    const outputSha256 = await digest(finalText);

    const disposeStart = performance.now();
    disposed = true;
    const disposal = controller.dispose();
    const disposeDurationMs = performance.now() - disposeStart;
    const remainingChildren = host.childNodes.length;
    host.remove();
    assert(remainingChildren === 0, `${arm}: disposal left DOM children`);
    if (arm === "native") {
      assert((disposal as { ownerCount?: number }).ownerCount === 0, "native disposal retained owners");
      assert((disposal as { pendingChangeCount?: number }).pendingChangeCount === 0, "native disposal retained pending changes");
    }
    controller.settlePendingA();
    return { status: "PASS", arm, settlementToMutationObserverMs,
      observerMeasurement: "same-task B/C settlement to first MutationObserver callback with both primaries; delivery included, before paint",
      timerResolutionMs, mountDurationMs, disposeDurationMs, finalText, outputSha256,
      retainedAIdentity: true, retainedAText: initialText, boundaryAStayedPrimary: true,
      boundaryBRevealed: true, boundaryCRevealed: true, aFallbackInserted, aVisibilitySamples,
      disposal: { remainingChildren, ...(arm === "native" ? disposal : {}) } };
  } catch (error) {
    primaryError = error;
  } finally {
    stopBCObservation?.();
    transitionObserver?.disconnect();
    if (controller && !disposed) {
      disposed = true;
      try { controller.dispose(); } catch (error) { cleanupErrors.push(error); }
    }
    try { host.remove(); } catch (error) { cleanupErrors.push(error); }
    if (controller) {
      try { controller.settlePendingA(); } catch (error) { cleanupErrors.push(error); }
    }
  }
  if (primaryError && cleanupErrors.length) throw new AggregateError([primaryError, ...cleanupErrors], `${arm} reveal and cleanup failed`);
  if (primaryError) throw primaryError;
  if (cleanupErrors.length) throw new AggregateError(cleanupErrors, `${arm} cleanup failed`);
  throw new Error(`${arm}: ended without a result`);
}

declare global { interface Window { __revealWorkset?: { run(arm: "native" | "react"): Promise<unknown> } } }
window.__revealWorkset = { run };
