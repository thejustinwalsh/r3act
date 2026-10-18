import { mountNative } from "./native_arm.tsx";
import { mountReact } from "./react_arm.tsx";

type Arm = ReturnType<typeof mountNative> | ReturnType<typeof mountReact>;
function assert(value: unknown, message: string): asserts value { if (!value) throw new Error(message); }
const nextFrame = () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
const timerQuantum = () => {
  let previous = performance.now(), minimum = Infinity;
  for (let index = 0; index < 2048; index++) {
    const current = performance.now();
    if (current > previous) minimum = Math.min(minimum, current - previous);
    previous = current;
  }
  return Number.isFinite(minimum) ? minimum : null;
};
const digest = async (value: string) => [...new Uint8Array(await crypto.subtle.digest(
  "SHA-256", new TextEncoder().encode(value)))].map((part) => part.toString(16).padStart(2, "0")).join("");
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
function observeSubtree(host: Element, timeoutMs: number) {
  let observer: MutationObserver;
  let timer: number;
  let settled = false;
  let resolve!: (value: { at: number; records: MutationRecord[] }) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<{ at: number; records: MutationRecord[] }>((yes, no) => {
    resolve = yes; reject = no;
  });
  const records: MutationRecord[] = [];
  const finish = (callback: () => void) => {
    if (settled) return;
    settled = true;
    observer.disconnect();
    clearTimeout(timer);
    callback();
  };
  observer = new MutationObserver((batch) => {
    const callbackAt = performance.now();
    records.push(...batch);
    const ready = host.querySelector('[data-b="ready"]');
    const label = ready?.querySelector('[data-label="ready"]');
    const output = ready?.querySelector('[data-count="8"]');
    if (ready && label?.textContent === "7" && output?.textContent === "7" &&
      ready.children.length === 2) finish(() => resolve({ at: callbackAt, records }));
  });
  observer.observe(host, { attributes: true, childList: true, characterData: true, subtree: true });
  timer = window.setTimeout(() => finish(() => reject(new Error("resource subtree reveal timed out"))), timeoutMs);
  return { promise, cancel() { finish(() => reject(new Error("resource subtree observation cancelled"))); } };
}

async function run(arm: "native" | "react") {
  const host = document.createElement("section");
  host.dataset.arm = arm;
  document.body.append(host);
  let controller: Arm | null = null;
  let disposed = false;
  let stopObservation: (() => void) | null = null;
  let primaryError: unknown;
  const cleanupErrors: unknown[] = [];
  try {
    controller = arm === "native" ? mountNative(host) : mountReact(host);
    const mountDurationMs = controller.mountDurationMs;
    const timerResolutionMs = timerQuantum();
    await waitFor(() => host.querySelector('[data-a="primary"]')?.textContent === "A ready" &&
      host.querySelector('[data-b="fallback"]')?.textContent === "B waiting" &&
      Boolean(host.querySelector('[data-row="local"]')),
    `${arm}: initial accepted A/B fallback scene did not mount`, performance.now() + 5000);
    const aNode = host.querySelector('[data-a="primary"]');
    const bFallback = host.querySelector('[data-b="fallback"]');
    const row = host.querySelector('[data-row="local"]');
    assert(aNode && bFallback && row, `${arm}: initial host identities missing`);
    (row as HTMLElement).click();
    await waitFor(() => row.getAttribute("data-local") === "1",
      `${arm}: untimed local row interaction did not commit`, performance.now() + 5000);
    controller.beginPendingA();
    await nextFrame(); await nextFrame();
    assert(host.querySelector('[data-a="primary"]') === aNode && aNode.textContent === "A ready",
      `${arm}: pending A did not retain accepted host/text`);
    assert(host.querySelector('[data-b="fallback"]') === bFallback && visible(bFallback),
      `${arm}: B fallback changed before timed settlement`);
    const observation = observeSubtree(host, 5000);
    stopObservation = observation.cancel;
    void observation.promise.catch(() => {});
    const settledAt = performance.now();
    controller.settleB();
    const observed = await observation.promise;
    const settlementToMutationObserverMs = observed.at - settledAt;
    const ready = host.querySelector('[data-b="ready"]');
    const label = ready?.querySelector('[data-label="ready"]');
    const output = ready?.querySelector('[data-count="8"]');
    assert(ready && label && output && ready !== bFallback, `${arm}: B subtree did not replace fallback`);
    const aFallbackInserted = observed.records.some((record) => [...record.addedNodes].some((node) =>
      node instanceof Element && (node.matches('[data-a="fallback"]') ||
        node.querySelector('[data-a="fallback"]') !== null)));
    assert(!aFallbackInserted && host.querySelector('[data-a="primary"]') === aNode &&
      aNode.textContent === "A ready" && visible(aNode), `${arm}: A changed during independent reveal`);
    assert(host.querySelector('[data-row="local"]') === row && row.getAttribute("data-local") === "1",
      `${arm}: retained local row state changed during B reveal`);
    assert(!host.querySelector('[data-b="fallback"]'), `${arm}: old fallback remained mounted`);
    const fallbackLife = controller.fallbackLife();
    assert(fallbackLife.mounts === 1 && fallbackLife.cleanups === 1,
      `${arm}: fallback effect was not mounted and retired exactly once at B reveal`);
    const definedOutput = JSON.stringify({ a: "A ready", label: label.textContent,
      count: output.getAttribute("data-count"), outputText: output.textContent, row: row.getAttribute("data-local") });
    const outputSha256 = await digest(definedOutput);
    controller.settlePendingA();
    await waitFor(() => host.querySelector('[data-a="primary"]')?.textContent === "A next",
      `${arm}: later A settlement did not reveal`, performance.now() + 5000);
    assert(host.querySelector('[data-b="ready"]') === ready &&
      ready.querySelector('[data-label="ready"]') === label &&
      ready.querySelector('[data-count="8"]') === output &&
      host.querySelector('[data-row="local"]') === row && row.getAttribute("data-local") === "1",
      `${arm}: later A retry resurrected old B subtree or lost local state`);
    const disposeStart = performance.now();
    disposed = true;
    const disposal = controller.dispose();
    const disposeDurationMs = performance.now() - disposeStart;
    const remainingChildren = host.childNodes.length;
    host.remove();
    assert(remainingChildren === 0, `${arm}: disposal left DOM children`);
    assert(disposal.fallbackLife.mounts === 1 && disposal.fallbackLife.cleanups === 1,
      `${arm}: fallback effect cleanup changed after teardown`);
    if (arm === "native") {
      assert((disposal as { ownerCount?: number }).ownerCount === 0, "native owners remained");
      assert((disposal as { store?: { readers?: number; listeners?: number } }).store?.readers === 0 &&
        (disposal as { store?: { listeners?: number } }).store?.listeners === 0,
      "native Store readers/listeners remained");
    }
    return { status: "PASS", arm, settlementToMutationObserverMs, timerResolutionMs,
      mountDurationMs, disposeDurationMs, definedOutput, outputSha256,
      retainedAIdentity: true, retainedRowIdentity: true, retainedRowState: 1,
      subtreeHosts: 3, aFallbackInserted, bFallbackRetired: true,
      laterARevealed: true, disposal: { remainingChildren, ...disposal } };
  } catch (error) { primaryError = error; }
  finally {
    stopObservation?.();
    if (controller && !disposed) { try { controller.dispose(); } catch (error) { cleanupErrors.push(error); } }
    try { host.remove(); } catch (error) { cleanupErrors.push(error); }
    if (controller) { try { controller.settlePendingA(); } catch (error) { cleanupErrors.push(error); } }
  }
  if (primaryError && cleanupErrors.length) throw new AggregateError([primaryError, ...cleanupErrors], `${arm} reveal and cleanup failed`);
  if (primaryError) throw primaryError;
  if (cleanupErrors.length) throw new AggregateError(cleanupErrors, `${arm} cleanup failed`);
  throw new Error(`${arm}: ended without result`);
}

declare global { interface Window { __resourceSubtreePair?: { run(arm: "native" | "react"): Promise<unknown> } } }
window.__resourceSubtreePair = { run };
