import { mountNative } from "./native_arm.tsx";
import { mountReact } from "./react_arm.tsx";

type Arm = ReturnType<typeof mountNative> | ReturnType<typeof mountReact>;
const assert = (condition: unknown, message: string): asserts condition => {
  if (!condition) throw new Error(message);
};
const nextFrame = () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
const text = (node: Element | null) => node?.textContent ?? "";
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
const contains = (node: Node, selector: string) => node instanceof Element &&
  (node.matches(selector) || node.querySelector(selector) !== null);
const visible = (node: Element | null) => {
  if (!node?.isConnected || node.getClientRects().length === 0) return false;
  for (let current: Element | null = node; current; current = current.parentElement) {
    const style = getComputedStyle(current);
    if (current.hasAttribute("hidden") || style.display === "none" ||
      style.visibility === "hidden" || style.visibility === "collapse" ||
      style.opacity === "0") return false;
  }
  return true;
};

function observeLatest(root: Element, timeoutMs: number, onMutation: (records: MutationRecord[]) => void) {
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
  const matches = () => {
    const primary = root.querySelector('[data-primary="yes"]');
    return primary?.getAttribute("data-label") === "latest" &&
      text(primary.querySelector('[data-value="yes"]')) === "latest value";
  };
  observer = new MutationObserver((records) => {
    const matched = matches();
    const observedAt = matched ? performance.now() : null;
    onMutation(records);
    if (observedAt !== null) finish(() => resolve(observedAt));
  });
  observer.observe(root, { subtree: true, childList: true, characterData: true,
    attributes: true, attributeOldValue: true });
  timer = window.setTimeout(() => finish(() => reject(new Error("timed out waiting for latest label and value"))), timeoutMs);
  return { promise, cancel() { finish(() => reject(new Error("latest observation cancelled"))); } };
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
  let stopLatest: (() => void) | null = null;
  try {
    controller = arm === "native" ? mountNative(host) : mountReact(host);
    const mountDurationMs = controller.mountDurationMs;
    const timerResolutionMs = timerQuantum();
    await waitFor(() => {
      const primary = host.querySelector('[data-primary="yes"]');
      return primary?.getAttribute("data-label") === "initial" &&
        text(primary.querySelector('[data-value="yes"]')) === "initial value";
    }, `${arm}: initial primary was not accepted`, performance.now() + 5000);
    const primary = host.querySelector('[data-primary="yes"]');
    assert(primary, `${arm}: initial primary host missing`);
    const button = primary.querySelector('[data-counter="yes"]');
    assert(button, `${arm}: local-state button missing`);
    button.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    await waitFor(() => text(primary.querySelector('[data-counter="yes"]')) === "1",
      `${arm}: local state did not reach one`, performance.now() + 5000);
    const originalValue = text(primary.querySelector('[data-value="yes"]'));
    assert(visible(primary), `${arm}: initial primary was not visible`);
    const visibilitySamples = [{ phase: "initial", visible: true }];
    let hiddenSeen = false;
    const sampleVisibility = (phase: string) => {
      const nowVisible = visible(primary);
      visibilitySamples.push({ phase, visible: nowVisible });
      if (!nowVisible) hiddenSeen = true;
      return nowVisible;
    };
    const noteHiddenStyle = (records: MutationRecord[]) => {
      for (const record of records) {
        if (record.type !== "attributes" || !(record.target instanceof Element)) continue;
        if (!record.target.contains(primary) && record.target !== primary) continue;
        if (record.attributeName === "style" &&
          /(?:display\s*:\s*none|visibility\s*:\s*(?:hidden|collapse)|opacity\s*:\s*0(?:\s|;|$))/i.test(record.oldValue ?? "")) hiddenSeen = true;
        if (record.attributeName === "hidden" && record.oldValue !== null) hiddenSeen = true;
      }
    };
    let fallbackSeen = false;
    let obsoleteSeen = false;
    const inspectRecords = (records: MutationRecord[], phase: string) => {
      noteHiddenStyle(records);
      for (const record of records) {
        if ([...record.addedNodes].some((node) => contains(node, '[data-fallback="yes"]'))) fallbackSeen = true;
        if ([...record.addedNodes].some((node) => contains(node, '[data-label="obsolete"]'))) obsoleteSeen = true;
        if (record.type === "attributes" && record.attributeName === "data-label" &&
          (record.oldValue === "obsolete" || (record.target as Element).getAttribute("data-label") === "obsolete")) obsoleteSeen = true;
      }
      if (host.querySelector('[data-fallback="yes"]')) fallbackSeen = true;
      if (host.querySelector('[data-label="obsolete"]')) obsoleteSeen = true;
      sampleVisibility(phase);
    };
    transitionObserver = new MutationObserver((records) => inspectRecords(records, "mutation"));
    transitionObserver.observe(host, { subtree: true, childList: true, characterData: true,
      attributes: true, attributeOldValue: true });
    controller.beginRequests();
    await nextFrame();
    await nextFrame();
    assert(sampleVisibility("pending-two-frames"), `${arm}: accepted primary hidden while pending`);
    assert(host.querySelector('[data-primary="yes"]') === primary, `${arm}: primary host replaced while requests pending`);
    assert(primary.getAttribute("data-label") === "initial" &&
      text(primary.querySelector('[data-value="yes"]')) === originalValue,
      `${arm}: accepted output changed before settlement`);
    assert(text(primary.querySelector('[data-counter="yes"]')) === "1", `${arm}: local state changed while pending`);
    controller.settleObsolete();
    await nextFrame();
    await nextFrame();
    assert(sampleVisibility("obsolete-two-frames"), `${arm}: accepted primary hidden after obsolete settlement`);
    assert(host.querySelector('[data-primary="yes"]') === primary, `${arm}: obsolete settlement replaced host`);
    assert(primary.getAttribute("data-label") === "initial" &&
      text(primary.querySelector('[data-value="yes"]')) === originalValue,
      `${arm}: obsolete request published`);
    assert(!fallbackSeen && !obsoleteSeen, `${arm}: obsolete label or fallback appeared`);

    inspectRecords(transitionObserver.takeRecords(), "before-timed-settlement");
    transitionObserver.disconnect();
    const observation = observeLatest(host, 5000, (records) => inspectRecords(records, "timed-mutation"));
    stopLatest = observation.cancel;
    void observation.promise.catch(() => {});
    const settledAt = performance.now();
    controller.settleLatest();
    const observedAt = await observation.promise;
    const settlementToMutationObserverMs = observedAt - settledAt;
    assert(sampleVisibility("final"), `${arm}: final primary hidden`);
    assert(!hiddenSeen, `${arm}: retained primary became hidden`);
    assert(!fallbackSeen && !obsoleteSeen, `${arm}: obsolete label or fallback flashed`);
    assert(host.querySelector('[data-primary="yes"]') === primary, `${arm}: final request replaced host`);
    assert(primary.getAttribute("data-label") === "latest", `${arm}: latest label missing`);
    assert(text(primary.querySelector('[data-value="yes"]')) === "latest value", `${arm}: latest value missing`);
    assert(text(primary.querySelector('[data-counter="yes"]')) === "1", `${arm}: local state was reset`);
    const finalOutput = JSON.stringify({ label: primary.getAttribute("data-label"),
      count: text(primary.querySelector('[data-counter="yes"]')),
      value: text(primary.querySelector('[data-value="yes"]')),
      fallback: host.querySelector('[data-fallback="yes"]') !== null });
    const outputSha256 = await digest(finalOutput);
    const disposeStart = performance.now();
    disposed = true;
    const disposal = controller.dispose();
    const disposeDurationMs = performance.now() - disposeStart;
    const remainingChildren = host.childNodes.length;
    host.remove();
    assert(remainingChildren === 0, `${arm}: disposal left DOM children`);
    if (arm === "native") {
      assert((disposal as { ownerCount?: number }).ownerCount === 0, "native disposal retained owners");
      assert((disposal as { pendingChangeCount?: number }).pendingChangeCount === 0, "native disposal retained changes");
    }
    return { status: "PASS", arm, settlementToMutationObserverMs,
      observerMeasurement: "final resource and control settlement to first MutationObserver callback with latest label/value; delivery included, before paint",
      timerResolutionMs, mountDurationMs, disposeDurationMs, finalOutput, outputSha256,
      retainedHostIdentity: true, retainedLocalState: true, obsoleteNeverPublished: true,
      hiddenSeen, visibilitySamples,
      fallbackSeen, obsoleteSeen, disposal: { remainingChildren, ...(arm === "native" ? disposal : {}) } };
  } catch (error) {
    primaryError = error;
  } finally {
    stopLatest?.();
    transitionObserver?.disconnect();
    if (controller && !disposed) {
      disposed = true;
      try { controller.dispose(); } catch (error) { cleanupErrors.push(error); }
    }
    try { host.remove(); } catch (error) { cleanupErrors.push(error); }
  }
  if (primaryError && cleanupErrors.length) throw new AggregateError([primaryError, ...cleanupErrors], `${arm} intent and cleanup failed`);
  if (primaryError) throw primaryError;
  if (cleanupErrors.length) throw new AggregateError(cleanupErrors, `${arm} cleanup failed`);
  throw new Error(`${arm}: ended without a result`);
}

declare global { interface Window { __directIntent?: { run(arm: "native" | "react"): Promise<unknown> } } }
window.__directIntent = { run };
