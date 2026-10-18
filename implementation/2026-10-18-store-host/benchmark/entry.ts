import { mountNative } from "./native_arm.tsx";
import { mountReact } from "./react_arm.tsx";

type Controller = ReturnType<typeof mountNative> | ReturnType<typeof mountReact>;
function assert(value: unknown, message: string): asserts value {
  if (!value) throw new Error(message);
}
const nextFrame = () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
const timerQuantum = () => {
  let previous = performance.now();
  let minimum = Infinity;
  for (let i = 0; i < 2048; i++) {
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
  if (!node.isConnected || node.getClientRects().length === 0) return false;
  for (let current: Element | null = node; current; current = current.parentElement) {
    const style = getComputedStyle(current);
    if (style.display === "none" || style.visibility === "hidden" ||
      style.visibility === "collapse" || style.opacity === "0" || current.hasAttribute("hidden")) return false;
  }
  return true;
};
async function waitFor(predicate: () => boolean, message: string, deadlineAt: number) {
  while (!predicate()) {
    if (performance.now() >= deadlineAt) throw new Error(message);
    await nextFrame();
  }
}
function observeBoth(host: Element, first: Element, second: Element, timeoutMs: number) {
  let observer: MutationObserver;
  let timer: number;
  let settled = false;
  let resolve!: (value: { at: number; records: MutationRecord[] }) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<{ at: number; records: MutationRecord[] }>((yes, no) => { resolve = yes; reject = no; });
  const allRecords: MutationRecord[] = [];
  const finish = (callback: () => void) => {
    if (settled) return;
    settled = true;
    observer.disconnect();
    clearTimeout(timer);
    callback();
  };
  observer = new MutationObserver((records) => {
    const callbackAt = performance.now();
    allRecords.push(...records);
    if (first.isConnected && second.isConnected && first.getAttribute("data-x") === "7" &&
      second.getAttribute("data-double") === "14") {
      finish(() => resolve({ at: callbackAt, records: allRecords }));
    }
  });
  observer.observe(host, { attributes: true, childList: true, subtree: true });
  timer = window.setTimeout(() => finish(() => reject(new Error("timed out waiting for both Store outputs"))), timeoutMs);
  return { promise, cancel() { finish(() => reject(new Error("cancelled Store output observation"))); } };
}

async function run(arm: "native" | "react") {
  const host = document.createElement("section");
  host.dataset.arm = arm;
  document.body.append(host);
  let controller: Controller | null = null;
  let disposed = false;
  let primaryError: unknown;
  const cleanupErrors: unknown[] = [];
  let stopObservation: (() => void) | null = null;
  try {
    controller = arm === "native" ? mountNative(host) : mountReact(host);
    const mountDurationMs = controller.mountDurationMs;
    const timerResolutionMs = timerQuantum();
    await waitFor(() => host.querySelector('[data-health="fallback"]')?.textContent === "health waiting" &&
      Boolean(host.querySelector('[data-x="1"]')) && Boolean(host.querySelector('[data-double="2"]')),
    `${arm}: initial fallback and Store outputs did not mount`, performance.now() + 5000);
    const fallback = host.querySelector('[data-health="fallback"]');
    const first = host.querySelector('[data-x="1"]');
    const second = host.querySelector('[data-double="2"]');
    assert(fallback && first && second, `${arm}: initial nodes absent`);
    const visibilitySamples = [visible(fallback)];
    await nextFrame();
    await nextFrame();
    assert(host.querySelector('[data-health="fallback"]') === fallback && visible(fallback),
      `${arm}: pending health fallback changed before Store action`);

    const observation = observeBoth(host, first, second, 5000);
    stopObservation = observation.cancel;
    void observation.promise.catch(() => {});
    const dispatchedAt = performance.now();
    controller.updatePosition();
    const observed = await observation.promise;
    const dispatchToMutationObserverMs = observed.at - dispatchedAt;
    const containsHealthReady = (node: Node) => node instanceof Element &&
      (node.matches('[data-health="ready"]') || node.querySelector('[data-health="ready"]') !== null);
    const healthReadyBeforeTiming = observed.records.some((record) =>
      [...record.addedNodes].some(containsHealthReady));
    const fallbackRemoved = observed.records.some((record) =>
      [...record.removedNodes].some((node) => node === fallback ||
        (node instanceof Element && node.contains(fallback))));
    const fallbackMutated = observed.records.some((record) =>
      record.type === "attributes" && record.target instanceof Element &&
      (record.target === fallback || record.target.contains(fallback)));
    visibilitySamples.push(visible(fallback));
    assert(host.querySelector('[data-x]') === first && host.querySelector('[data-double]') === second,
      `${arm}: Store host identities changed`);
    assert(host.querySelector('[data-health="fallback"]') === fallback && !healthReadyBeforeTiming &&
      !fallbackRemoved && !fallbackMutated,
      `${arm}: health revealed during the Store interval`);
    assert(visibilitySamples.every(Boolean), `${arm}: pending fallback became hidden`);
    assert(first.getAttribute("data-x") === "7" && second.getAttribute("data-double") === "14",
      `${arm}: Store outputs mismatch`);
    const definedOutput = JSON.stringify({ fallback: fallback.textContent, x: first.getAttribute("data-x"),
      doubled: second.getAttribute("data-double") });
    const outputSha256 = await digest(definedOutput);

    controller.settleHealth();
    await waitFor(() => host.querySelector('[data-health="ready"]')?.textContent === "health ready",
      `${arm}: health did not reveal after untimed settlement`, performance.now() + 5000);
    assert(host.querySelector('[data-x]') === first && host.querySelector('[data-double]') === second,
      `${arm}: Store hosts changed during health settlement`);
    const disposeStart = performance.now();
    disposed = true;
    const disposal = controller.dispose();
    const disposeDurationMs = performance.now() - disposeStart;
    const remainingChildren = host.childNodes.length;
    host.remove();
    assert(remainingChildren === 0, `${arm}: disposal left DOM children`);
    if (arm === "native") {
      assert((disposal as { ownerCount?: number }).ownerCount === 0, "native owners remained");
      assert((disposal as { pendingChangeCount?: number }).pendingChangeCount === 0, "native changes remained");
      assert((disposal as { store?: { readers?: number; listeners?: number } }).store?.readers === 0, "native Store readers remained");
      assert((disposal as { store?: { readers?: number; listeners?: number } }).store?.listeners === 0, "native Store listeners remained");
    } else {
      assert((disposal as { listeners?: number }).listeners === 0, "React external Store listeners remained");
    }
    return { status: "PASS", arm, dispatchToMutationObserverMs, timerResolutionMs,
      mountDurationMs, disposeDurationMs, definedOutput, outputSha256,
      retainedFirstIdentity: true, retainedSecondIdentity: true, fallbackVisible: true,
      visibilitySamples, healthReadyBeforeTiming, healthRevealedAfterTiming: true,
      finalProps: { x: first.getAttribute("data-x"), doubled: second.getAttribute("data-double") },
      disposal: { remainingChildren, ...disposal } };
  } catch (error) {
    primaryError = error;
  } finally {
    stopObservation?.();
    if (controller && !disposed) {
      try { controller.dispose(); } catch (error) { cleanupErrors.push(error); }
    }
    try { host.remove(); } catch (error) { cleanupErrors.push(error); }
    if (controller) {
      try { controller.settleHealth(); } catch (error) { cleanupErrors.push(error); }
    }
  }
  if (primaryError && cleanupErrors.length) throw new AggregateError([primaryError, ...cleanupErrors], `${arm} Store update and cleanup failed`);
  if (primaryError) throw primaryError;
  if (cleanupErrors.length) throw new AggregateError(cleanupErrors, `${arm} cleanup failed`);
  throw new Error(`${arm}: ended without a result`);
}

declare global { interface Window { __storeHostPair?: { run(arm: "native" | "react"): Promise<unknown> } } }
window.__storeHostPair = { run };
