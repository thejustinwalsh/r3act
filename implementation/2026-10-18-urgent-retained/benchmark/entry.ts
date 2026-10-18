import { mountNative } from "./native_arm.tsx";
import { mountReact } from "./react_arm.tsx";

type Controller = ReturnType<typeof mountNative> | ReturnType<typeof mountReact>;
const assert = (condition: unknown, message: string): asserts condition => {
  if (!condition) throw new Error(message);
};
const nextFrame = () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
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
const visible = (node: Element) => {
  const style = getComputedStyle(node);
  return style.display !== "none" && style.visibility !== "hidden" && style.visibility !== "collapse" &&
    style.opacity !== "0" && node.closest("[hidden]") === null;
};
const containsSelector = (node: Node, selector: string) => node instanceof Element &&
  (node.matches(selector) || node.querySelector(selector) !== null);

async function waitFor(predicate: () => boolean, message: string, deadlineAt: number) {
  while (!predicate()) {
    if (performance.now() >= deadlineAt) throw new Error(message);
    await nextFrame();
  }
}

function observeClickCommit(button: HTMLButtonElement, timeoutMs: number) {
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
    if (button.isConnected && button.dataset.x === "2" && button.style.opacity === "0.2") {
      finish(() => resolve(performance.now()));
    }
  });
  observer.observe(button, { attributes: true, attributeFilter: ["data-x", "style"] });
  timer = window.setTimeout(() => finish(() => reject(new Error("timed out waiting for button data-x=2 and opacity=0.2"))), timeoutMs);
  return { promise, cancel() { finish(() => reject(new Error("cancelled while waiting for click commit"))); } };
}

async function run(arm: "native" | "react") {
  const host = document.createElement("section");
  host.dataset.arm = arm;
  document.body.append(host);
  let controller: Controller | null = null;
  let disposed = false;
  let primaryError: unknown;
  const cleanupErrors: unknown[] = [];
  let retentionObserver: MutationObserver | null = null;
  let stopClickObserver: (() => void) | null = null;
  try {
    controller = arm === "native" ? mountNative(host) : mountReact(host);
    const mountDurationMs = controller.mountDurationMs;
    const timerResolutionMs = timerQuantum();
    await waitFor(() => {
      const a = host.querySelector('[data-a="primary"]');
      const button = host.querySelector("button[data-x]") as HTMLButtonElement | null;
      return a?.textContent === "A ready" && button?.dataset.x === "1" && button.style.opacity === "0.1";
    }, `${arm}: initial A primary and x=1 button did not mount`, performance.now() + 5000);

    const aNode = host.querySelector('[data-a="primary"]');
    const button = host.querySelector("button[data-x]") as HTMLButtonElement | null;
    assert(aNode, `${arm}: A primary missing`);
    assert(button, `${arm}: numeric button missing`);
    const aText = aNode.textContent;
    const buttonText = button.textContent;
    let aFallbackInserted = false;
    const aVisibilitySamples = [visible(aNode)];
    retentionObserver = new MutationObserver((records) => {
      if (records.some((record) => [...record.addedNodes].some((node) => containsSelector(node, '[data-a="fallback"]')))) {
        aFallbackInserted = true;
      }
      aVisibilitySamples.push(visible(aNode));
    });
    retentionObserver.observe(host, { subtree: true, childList: true, attributes: true });

    controller.beginPendingA();
    await nextFrame();
    await nextFrame();
    assert(host.querySelector('[data-a="primary"]') === aNode, `${arm}: A accepted host identity changed while pending`);
    assert(aNode.textContent === aText, `${arm}: A accepted text changed while pending`);
    assert(!host.querySelector('[data-a="fallback"]'), `${arm}: A showed fallback while pending`);
    assert(visible(aNode), `${arm}: A accepted primary is hidden while pending`);
    assert(button.isConnected && button.dataset.x === "1" && button.style.opacity === "0.1",
      `${arm}: unrelated numeric control changed before the click`);

    const click = observeClickCommit(button, 5000);
    stopClickObserver = click.cancel;
    void click.promise.catch(() => {});
    const dispatchedAt = performance.now();
    const clickEvent = new MouseEvent("click", { bubbles: true, cancelable: true });
    const dispatched = button.dispatchEvent(clickEvent);
    assert(dispatched, `${arm}: synthetic click was cancelled`);
    let observedAt: number;
    try { observedAt = await click.promise; }
    catch (error) { click.cancel(); throw error; }
    const clickToMutationObserverMs = observedAt - dispatchedAt;
    retentionObserver.disconnect();
    aVisibilitySamples.push(visible(aNode));

    assert(host.querySelector('[data-a="primary"]') === aNode, `${arm}: click replaced A's host node`);
    assert(aNode.textContent === aText, `${arm}: click changed A's retained text`);
    assert(!aFallbackInserted && !host.querySelector('[data-a="fallback"]'), `${arm}: A fallback appeared`);
    assert(aVisibilitySamples.every(Boolean), `${arm}: A became hidden during the interaction`);
    assert(host.querySelector("button[data-x]") === button, `${arm}: click replaced the button host node`);
    assert(button.dataset.x === "2" && button.style.opacity === "0.2", `${arm}: expected numeric props were not committed`);
    assert(button.textContent === buttonText, `${arm}: button label changed with state`);
    const finalText = host.textContent ?? "";
    const definedOutput = JSON.stringify({ a: aText, aData: aNode.getAttribute("data-a"),
      button: buttonText, dataX: button.getAttribute("data-x"), opacity: button.style.opacity });
    const outputSha256 = await digest(definedOutput);

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
    return { status: "PASS", arm, clickToMutationObserverMs,
      timingMeaning: "synthetic bubbling click dispatch to first MutationObserver callback with data-x=2 and opacity=0.2; scheduling and observer delivery included, before paint",
      timerResolutionMs, mountDurationMs, disposeDurationMs, finalText, definedOutput, outputSha256,
      retainedAIdentity: true, retainedAText: aText, retainedButtonIdentity: true,
      aFallbackInserted, aVisibilitySamples,
      interaction: { kind: "synthetic DOM MouseEvent", bubbles: true, defaultPrevented: clickEvent.defaultPrevented },
      finalProps: { dataX: button.dataset.x, opacity: button.style.opacity, buttonText },
      disposal: { remainingChildren, ...(arm === "native" ? disposal : {}) } };
  } catch (error) {
    primaryError = error;
  } finally {
    stopClickObserver?.();
    retentionObserver?.disconnect();
    if (controller && !disposed) {
      disposed = true;
      try { controller.dispose(); } catch (error) { cleanupErrors.push(error); }
    }
    try { host.remove(); } catch (error) { cleanupErrors.push(error); }
    if (controller) {
      try { controller.settlePendingA(); } catch (error) { cleanupErrors.push(error); }
    }
  }
  if (primaryError && cleanupErrors.length) throw new AggregateError([primaryError, ...cleanupErrors], `${arm} urgent update and cleanup failed`);
  if (primaryError) throw primaryError;
  if (cleanupErrors.length) throw new AggregateError(cleanupErrors, `${arm} cleanup failed`);
  throw new Error(`${arm}: ended without a result`);
}

declare global { interface Window { __urgentRetained?: { run(arm: "native" | "react"): Promise<unknown> } } }
window.__urgentRetained = { run };
