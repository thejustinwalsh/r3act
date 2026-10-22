import { mountNative } from "./native_arm.tsx";
import { mountReact } from "./react_arm.tsx";

type Controller = ReturnType<typeof mountNative> | ReturnType<typeof mountReact>;
function assert(value: unknown, message: string): asserts value { if (!value) throw new Error(message); }
const frame = () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
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
  "SHA-256", new TextEncoder().encode(value)))].map((byte) => byte.toString(16).padStart(2, "0")).join("");
async function waitFor(predicate: () => boolean, message: string, deadline: number) {
  while (!predicate()) {
    if (performance.now() >= deadline) throw new Error(message);
    await frame();
  }
}
function observePair(host: Element) {
  let observer: MutationObserver, timer: number, complete = false;
  let resolve!: (at: number) => void, reject!: (error: Error) => void;
  const promise = new Promise<number>((yes, no) => { resolve = yes; reject = no; });
  const finish = (action: () => void) => {
    if (complete) return;
    complete = true; observer.disconnect(); clearTimeout(timer); action();
  };
  observer = new MutationObserver(() => {
    const at = performance.now();
    if (host.querySelector('[data-ready="a"]')?.getAttribute("data-value") === "10" &&
      host.querySelector('[data-ready="b"]')?.getAttribute("data-value") === "5")
      finish(() => resolve(at));
  });
  observer.observe(host, { attributes: true, childList: true, characterData: true, subtree: true });
  timer = window.setTimeout(() => finish(() => reject(new Error("pair reveal timed out"))), 5000);
  return { promise, cancel() { finish(() => reject(new Error("observation cancelled"))); } };
}
async function run(arm: "native" | "react") {
  const host = document.createElement("section"); document.body.append(host);
  let controller: Controller | null = null, disposed = false, stop: (() => void) | null = null;
  try {
    controller = arm === "native" ? mountNative(host) : mountReact(host);
    const mountDurationMs = controller.mountMs, timerResolutionMs = timerQuantum();
    await waitFor(() => Boolean(host.querySelector('[data-waiting="a"]') &&
      host.querySelector('[data-waiting="b"]') && host.querySelector('[data-health="waiting"]') &&
      host.querySelector('[data-urgent="1"]')), `${arm}: initial view missing`, performance.now() + 5000);
    const fallbackA = host.querySelector('[data-waiting="a"]');
    const fallbackB = host.querySelector('[data-waiting="b"]');
    const urgent = host.querySelector('[data-urgent="1"]');
    const healthFallback = host.querySelector('[data-health="waiting"]');
    assert(fallbackA && fallbackB && urgent && healthFallback, `${arm}: initial identities missing`);
    controller.settleA();
    await frame(); await frame();
    assert(!host.querySelector('[data-ready="a"]') && !host.querySelector('[data-ready="b"]') &&
      host.querySelector('[data-waiting="a"]') === fallbackA &&
      host.querySelector('[data-waiting="b"]') === fallbackB,
      `${arm}: A revealed before B`);
    controller.updateUrgent();
    await waitFor(() => urgent.getAttribute("data-urgent") === "7", `${arm}: urgent Store update stalled`, performance.now() + 5000);
    assert(host.querySelector('[data-urgent="7"]') === urgent, `${arm}: urgent host identity changed`);
    controller.settleHealth();
    await waitFor(() => host.querySelector('[data-health="healthy"]')?.tagName === "SPAN",
      `${arm}: independent health remained pending`, performance.now() + 5000);
    assert(!host.querySelector('[data-ready="a"]') && !host.querySelector('[data-ready="b"]'),
      `${arm}: selected pair revealed before B`);
    const healthReady = host.querySelector('[data-health="healthy"]');
    const before = controller.state();
    assert(before.life.a.mounts === 1 && before.life.b.mounts === 1 &&
      before.life.a.cleanups === 0 && before.life.b.cleanups === 0,
      `${arm}: fallback lifetime before B differs`);
    const observation = observePair(host); stop = observation.cancel;
    void observation.promise.catch(() => {});
    const started = performance.now(); controller.settleB();
    const observedAt = await observation.promise;
    const settlementToMutationObserverMs = observedAt - started;
    const readyA = host.querySelector('[data-ready="a"]');
    const readyB = host.querySelector('[data-ready="b"]');
    assert(readyA && readyB && !host.querySelector('[data-waiting="a"]') &&
      !host.querySelector('[data-waiting="b"]'), `${arm}: pair did not replace fallbacks`);
    assert(host.querySelector('[data-health="healthy"]') === healthReady &&
      host.querySelector('[data-urgent="7"]') === urgent, `${arm}: unrelated identity changed`);
    const after = controller.state();
    assert(after.life.a.cleanups === 1 && after.life.b.cleanups === 1,
      `${arm}: fallback cleanup count differs`);
    if (arm === "native") assert(after.callbackCount === 1 && after.callbackView === "10:5" &&
      after.queueStatus === "committed", "native: accepted pointers were absent before callback");
    const definedOutput = JSON.stringify({ a: [readyA.getAttribute("data-value"), readyA.textContent],
      b: [readyB.getAttribute("data-value"), readyB.textContent],
      urgent: urgent.getAttribute("data-urgent"), health: healthReady?.getAttribute("data-health"),
      life: after.life });
    const outputSha256 = await digest(definedOutput);
    const disposeStart = performance.now(); disposed = true;
    const disposal = controller.dispose();
    const disposeDurationMs = performance.now() - disposeStart;
    const remainingChildren = host.childNodes.length;
    assert(remainingChildren === 0, `${arm}: disposal left host nodes`);
    if (arm === "native") assert((disposal as { ownerCount?: number }).ownerCount === 0,
      "native: owners remained after disposal");
    return { status: "PASS", arm, definedOutput, outputSha256,
      settlementToMutationObserverMs, timerResolutionMs, mountDurationMs, disposeDurationMs,
      noEarlyPairReveal: true, urgentWhilePending: true, healthWhilePending: true,
      fallbackLifetimes: after.life, callbackCount: after.callbackCount,
      disposal: { ...disposal, remainingChildren } };
  } finally {
    stop?.();
    if (controller && !disposed) controller.dispose();
    host.remove();
    if (controller) { controller.settleA(); controller.settleB(); controller.settleHealth(); }
  }
}
declare global { interface Window { __resourceTransactionPair?: { run(arm: "native" | "react"): Promise<unknown> } } }
window.__resourceTransactionPair = { run };
