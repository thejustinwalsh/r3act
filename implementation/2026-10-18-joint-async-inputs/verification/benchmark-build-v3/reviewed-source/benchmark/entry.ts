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
function observeJoint(host: Element, timeoutMs: number) {
  let observer: MutationObserver, timer: number;
  let settled = false;
  let resolve!: (value: { at: number; records: MutationRecord[] }) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<{ at: number; records: MutationRecord[] }>((yes, no) => { resolve = yes; reject = no; });
  const records: MutationRecord[] = [];
  const finish = (action: () => void) => {
    if (settled) return;
    settled = true; observer.disconnect(); clearTimeout(timer); action();
  };
  observer = new MutationObserver((batch) => {
    const at = performance.now(); records.push(...batch);
    const ready = host.querySelector<HTMLElement>('[data-joint="ready"]');
    if (ready?.getAttribute("data-value") === "6" && ready.style.opacity === "0.3" &&
      ready.style.transform === "translateX(6px)" && ready.querySelector('[data-label="sum"]')?.textContent === "6" &&
      ready.querySelector('[data-model="sum"]')?.textContent === "50") finish(() => resolve({ at, records }));
  });
  observer.observe(host, { attributes: true, childList: true, characterData: true, subtree: true });
  timer = window.setTimeout(() => finish(() => reject(new Error("joint async reveal timed out"))), timeoutMs);
  return { promise, cancel() { finish(() => reject(new Error("joint observation cancelled"))); } };
}

async function run(arm: "native" | "react") {
  const host = document.createElement("section"); host.dataset.arm = arm; document.body.append(host);
  let controller: Arm | null = null, disposed = false;
  let stopObservation: (() => void) | null = null;
  let primaryError: unknown;
  const cleanupErrors: unknown[] = [];
  try {
    controller = arm === "native" ? mountNative(host) : mountReact(host);
    const mountDurationMs = controller.mountDurationMs, timerResolutionMs = timerQuantum();
    await waitFor(() => host.querySelector('[data-health="fallback"]')?.textContent === "health waiting" &&
      host.querySelector('[data-joint="fallback"]')?.textContent === "joint waiting" && Boolean(host.querySelector('[data-row="local"]')),
    `${arm}: initial joint fallback scene did not mount`, performance.now() + 5000);
    const healthNode = host.querySelector('[data-health="fallback"]');
    const fallback = host.querySelector('[data-joint="fallback"]');
    const row = host.querySelector<HTMLElement>('[data-row="local"]');
    assert(healthNode && fallback && row, `${arm}: initial identities absent`);
    row.click();
    await waitFor(() => row.getAttribute("data-local") === "1", `${arm}: independent urgent row did not update`, performance.now() + 5000);
    controller.settleSecond(); await nextFrame(); await nextFrame();
    assert(!host.querySelector('[data-joint="ready"]') && host.querySelector('[data-joint="fallback"]') === fallback,
      `${arm}: joint output revealed before first resource`);
    assert(controller.fallbackLife().mounts === 1 && controller.fallbackLife().cleanups === 0,
      `${arm}: pending joint fallback lifetime changed`);
    const observation = observeJoint(host, 5000); stopObservation = observation.cancel;
    void observation.promise.catch(() => {});
    const start = performance.now(); controller.settleFirst();
    const observed = await observation.promise;
    const settlementToMutationObserverMs = observed.at - start;
    const ready = host.querySelector<HTMLElement>('[data-joint="ready"]');
    const label = ready?.querySelector('[data-label="sum"]'), model = ready?.querySelector('[data-model="sum"]');
    assert(ready && label && model && ready !== fallback && !host.querySelector('[data-joint="fallback"]'),
      `${arm}: ready joint tree did not retire fallback`);
    assert(host.querySelector('[data-health="fallback"]') === healthNode && visible(healthNode), `${arm}: independent health changed`);
    assert(host.querySelector('[data-row="local"]') === row && row.getAttribute("data-local") === "1", `${arm}: row identity/state lost`);
    assert(controller.fallbackLife().mounts === 1 && controller.fallbackLife().cleanups === 1, `${arm}: fallback cleanup was not exact`);
    const labelText = label.firstChild, modelText = model.firstChild;
    const definedOutput = JSON.stringify({ value: ready.getAttribute("data-value"), label: label.textContent,
      model: model.textContent, opacity: ready.style.opacity, transform: ready.style.transform,
      health: healthNode.textContent, row: row.getAttribute("data-local"), fallbackCleanups: controller.fallbackLife().cleanups });
    const outputSha256 = await digest(definedOutput);
    controller.updatePosition();
    await waitFor(() => ready.getAttribute("data-value") === "12" && label.textContent === "12" && ready.style.opacity === "0.6" &&
      ready.style.transform === "translateX(12px)", `${arm}: live Store update after reveal did not commit`, performance.now() + 5000);
    assert(host.querySelector('[data-joint="ready"]') === ready && label.firstChild === labelText && model.firstChild === modelText,
      `${arm}: live Store update replaced joint host/text identity`);
    controller.settleHealth();
    await waitFor(() => host.querySelector('[data-health="ready"]')?.textContent === "health ready", `${arm}: later health did not reveal`, performance.now() + 5000);
    assert(host.querySelector('[data-joint="ready"]') === ready && ready.querySelector('[data-label="sum"]') === label &&
      label.firstChild === labelText && model.firstChild === modelText && label.textContent === "12" && model.textContent === "50" &&
      host.querySelector('[data-row="local"]') === row && row.getAttribute("data-local") === "1", `${arm}: generic retry resurrected old joint content`);
    const disposeStart = performance.now(); disposed = true;
    const disposal = controller.dispose(), disposeDurationMs = performance.now() - disposeStart;
    const remainingChildren = host.childNodes.length; host.remove();
    assert(remainingChildren === 0 && disposal.fallbackLife.mounts === 1 && disposal.fallbackLife.cleanups === 1, `${arm}: teardown/lifetime mismatch`);
    if (arm === "native") {
      const native = disposal as { ownerCount?: number; store?: { readers?: number; listeners?: number; roots?: number } };
      assert(native.ownerCount === 0 && native.store?.readers === 0 && native.store.listeners === 0 && native.store.roots === 0,
        "native owners or Store interests remained");
    }
    return { status: "PASS", arm, settlementToMutationObserverMs, timerResolutionMs, mountDurationMs, disposeDurationMs,
      definedOutput, outputSha256, retainedHealthIdentity: true, retainedRowIdentity: true, retainedRowState: 1,
      noPrematureJointReveal: true, fallbackRetired: true, laterStoreUpdated: true, laterHealthRevealed: true,
      disposal: { remainingChildren, ...disposal } };
  } catch (error) { primaryError = error; }
  finally {
    stopObservation?.();
    if (controller && !disposed) { try { controller.dispose(); } catch (error) { cleanupErrors.push(error); } }
    host.remove();
    if (controller) {
      try { controller.settleFirst(); controller.settleSecond(); controller.settleHealth(); } catch (error) { cleanupErrors.push(error); }
    }
  }
  if (primaryError && cleanupErrors.length) throw new AggregateError([primaryError, ...cleanupErrors], `${arm} joint async run and cleanup failed`);
  if (primaryError) throw primaryError;
  if (cleanupErrors.length) throw new AggregateError(cleanupErrors, `${arm} cleanup failed`);
  throw new Error(`${arm}: ended without result`);
}
declare global { interface Window { __jointAsyncInputsPair?: { run(arm: "native" | "react"): Promise<unknown> } } }
window.__jointAsyncInputsPair = { run };
