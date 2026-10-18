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

function observeNextMatch(root: Element, selector: string, predicate: (node: Element) => boolean, timeoutMs: number) {
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
  observer = new MutationObserver(() => {
    const node = root.querySelector(selector);
    if (node && predicate(node)) finish(() => resolve(performance.now()));
  });
  observer.observe(root, { subtree: true, childList: true, characterData: true, attributes: true });
  timer = window.setTimeout(() => finish(() => reject(new Error(`timed out waiting for ${selector} mutation`))), timeoutMs);
  return { promise, cancel() { finish(() => reject(new Error(`cancelled while waiting for ${selector}`))); } };
}

async function run(arm: "native" | "react") {
  const host = document.createElement("section");
  host.dataset.arm = arm;
  document.body.append(host);
  let controller: Arm | null = null;
  let disposed = false;
  let primaryError: unknown;
  let cleanupError: unknown;
  let transitionObserver: MutationObserver | null = null;
  let stopBObservation: (() => void) | null = null;
  try {
    controller = arm === "native" ? mountNative(host) : mountReact(host);
    const mountDurationMs = controller.mountDurationMs;
    const timerResolutionMs = timerQuantum();
    await waitFor(() => visibleText(host.querySelector('[data-a="primary"]')) === "A ready" &&
      visibleText(host.querySelector('[data-b="fallback"]')) === "B waiting", `${arm}: initial fallback/revealed view did not mount`, performance.now() + 5000);
    const aNode = host.querySelector('[data-a="primary"]');
    assert(aNode, `${arm}: initial A primary missing`);
    const initialText = aNode.textContent;
    const fallbackSelector = '[data-a="fallback"]';
    let aFallbackInserted = false;
    const aVisibilitySamples = [visibility(aNode)];
    transitionObserver = new MutationObserver((records) => {
      if (records.some((item) => [...item.addedNodes].some((node) => containsSelector(node, fallbackSelector)))) {
        aFallbackInserted = true;
      }
      aVisibilitySamples.push(visibility(aNode));
    });
    transitionObserver.observe(host, { subtree: true, childList: true, attributes: true });
    controller.beginPendingA();
    await nextFrame();
    await nextFrame();
    assert(host.querySelector('[data-a="primary"]') === aNode, `${arm}: A's accepted primary element was replaced while its new resource is pending`);
    assert(aNode.textContent === initialText, `${arm}: A's accepted text changed while its new resource is pending`);
    assert(!host.querySelector('[data-a="fallback"]'), `${arm}: A showed fallback during a retained update`);
    assert(visibleText(host.querySelector('[data-b="fallback"]')) === "B waiting", `${arm}: B was not still at its accepted fallback before settlement`);

    const waitForB = observeNextMatch(host, '[data-b="primary"]', (node) => node.textContent === "B ready", 5000);
    stopBObservation = waitForB.cancel;
    void waitForB.promise.catch(() => {});
    const settledAt = performance.now();
    controller.settleB();
    let observedAt: number;
    try { observedAt = await waitForB.promise; }
    catch (error) { waitForB.cancel(); transitionObserver.disconnect(); throw error; }
    const settlementToMutationObserverMs = observedAt - settledAt;
    transitionObserver.disconnect();
    aVisibilitySamples.push(visibility(aNode));
    assert(!aFallbackInserted, `${arm}: A fallback was inserted during B reveal`);
    assert(aVisibilitySamples.every((sample) => sample.visible), `${arm}: retained A primary was hidden during the transition`);
    assert(host.querySelector('[data-a="primary"]') === aNode, `${arm}: B reveal replaced A's retained host element`);
    assert(aNode.textContent === initialText, `${arm}: B reveal changed A's retained accepted text`);
    assert(!host.querySelector('[data-a="fallback"]'), `${arm}: A fallback flashed during B reveal`);
    const bNode = host.querySelector('[data-b="primary"]');
    assert(bNode?.tagName === "DIV" && bNode.getAttribute("data-b") === "primary", `${arm}: B primary host shape differs`);
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
      assert((disposal as { ownerCount?: number }).ownerCount === 0,
        "native disposal retained component owners");
      assert((disposal as { pendingChangeCount?: number }).pendingChangeCount === 0,
        "native disposal retained pending owner changes");
    }
    controller.settlePendingA();
    return { status: "PASS", arm, settlementToMutationObserverMs, observerMeasurement: "settlement to first matching MutationObserver callback; includes observer delivery delay and stops before paint",
      timerResolutionMs, mountDurationMs, disposeDurationMs, finalText, outputSha256,
      retainedAIdentity: true, retainedAText: initialText, boundaryAStayedPrimary: true, boundaryBRevealed: true,
      aFallbackInserted, aVisibilitySamples, disposal: { remainingChildren, ...(arm === "native" ? disposal : {}) } };
  } catch (error) {
    primaryError = error;
  } finally {
    stopBObservation?.();
    transitionObserver?.disconnect();
    if (controller && !disposed) {
      disposed = true;
      try { controller.dispose(); } catch (error) { cleanupError = error; }
    }
    host.remove();
    if (controller) {
      try { controller.settlePendingA(); } catch (error) { cleanupError ??= error; }
    }
  }
  if (primaryError && cleanupError) throw new AggregateError([primaryError, cleanupError], `${arm} reveal and cleanup failed`);
  if (primaryError) throw primaryError;
  if (cleanupError) throw cleanupError;
  throw new Error(`${arm}: ended without a result`);
}

declare global { interface Window { __hostReveal?: { run(arm: "native" | "react"): Promise<unknown> } } }
window.__hostReveal = { run };
