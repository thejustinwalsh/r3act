import { mountNative, life as nativeLife } from "../fixture/native_arm.tsx";
import { mountReact, life as reactLife } from "./react_arm.tsx";

type Arm = "native" | "react";
type Controller = ReturnType<typeof mountNative> | ReturnType<typeof mountReact>;
const frame = () => new Promise<void>((done) => requestAnimationFrame(() => done()));
function assert(value: unknown, message: string): asserts value { if (!value) throw new Error(message); }
async function waitFor(predicate: () => boolean, message: string) {
  const deadline = performance.now() + 5000;
  while (!predicate()) {
    if (performance.now() >= deadline) throw new Error(message);
    await frame();
  }
}
function observer(host: Element, predicate: () => boolean) {
  let stop!: () => void;
  const promise = new Promise<number>((resolve, reject) => {
    const watcher = new MutationObserver(() => { if (predicate()) { stop(); resolve(performance.now()); } });
    const timer = window.setTimeout(() => { stop(); reject(new Error("final recovery observation timed out")); }, 5000);
    stop = () => { watcher.disconnect(); clearTimeout(timer); };
    watcher.observe(host, { attributes: true, childList: true, characterData: true, subtree: true });
  });
  return { promise, stop };
}
async function digest(value: string) {
  const bytes = new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)));
  return [...bytes].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}
async function run(arm: Arm, options?: { measure?: boolean }) {
  const host = document.createElement("section"); document.body.append(host);
  const life = arm === "native" ? nativeLife : reactLife;
  let controller: Controller | null = null, disposed = false;
  let earlyHost: HTMLElement | null = null, early: Controller | null = null, earlyDisposed = false;
  let primaryError: unknown = null;
  try {
    controller = arm === "native" ? mountNative(host) : mountReact(host);
    await waitFor(() => host.querySelector('[data-value="accepted"]') !== null, `${arm}: initial accepted view missing`);
    const initial = host.querySelector('[data-value="accepted"]');
    const first = controller.replace();
    await frame();
    assert(host.querySelector('[data-value="accepted"]') === initial, `${arm}: pending replacement lost accepted view`);
    controller.urgent(1);
    await waitFor(() => host.querySelector('[data-urgent="1"]') !== null, `${arm}: urgent progress stalled`);
    first.provider.reject("provider-failed");
    await waitFor(() => host.querySelector('[data-error="provider-failed"]') !== null, `${arm}: rejected resource did not render error`);
    const error = host.querySelector('[data-error="provider-failed"]');
    assert(error && !host.querySelector('[data-value="accepted"]'), `${arm}: error kept obsolete ready view`);
    const stale = controller.replace();
    await frame();
    assert(host.querySelector('[data-error="provider-failed"]') === error,
      `${arm}: queued retry lost accepted error while pending`);
    stale.handle.cancel("explicit replacement");
    const retry = controller.replace();
    controller.urgent(2);
    await waitFor(() => host.querySelector('[data-urgent="2"]') !== null, `${arm}: urgent retry progress stalled`);
    stale.provider.resolve({ label: "stale", x: 99 });
    await frame(); await frame();
    assert(!host.querySelector('[data-value="stale"]'), `${arm}: cancelled late provider published`);
    assert(host.querySelector('[data-error="provider-failed"]') === error,
      `${arm}: late provider displaced accepted error`);
    const watch = observer(host, () => host.querySelector('[data-value="recovered"]') !== null);
    const started = options?.measure === true ? performance.now() : null;
    retry.provider.resolve({ label: "recovered", x: 7 });
    const observed = await watch.promise;
    const settlementToMutationObserverMs = started === null ? null : observed - started;
    const ready = host.querySelector('[data-value="recovered"]');
    assert(ready?.getAttribute("data-x") === "7" && !host.querySelector('[data-error="provider-failed"]'),
      `${arm}: retry did not replace error with recovered view`);
    assert(first.handle.status === "committed" && stale.handle.status === "cancelled" &&
      retry.handle.status === "committed", `${arm}: operation statuses differ from recovery contract`);
    assert(host.querySelector('[data-urgent="2"]') !== null, `${arm}: urgent state was lost`);
    const output = JSON.stringify({ value: ready.getAttribute("data-value"), x: ready.getAttribute("data-x"),
      urgent: host.querySelector('[data-urgent]')?.getAttribute("data-urgent"), staleVisible: Boolean(host.querySelector('[data-value="stale"]')) });
    const outputSha256 = await digest(output);
    const lifeBeforeDisposal = { ...life };
    const disposal = controller.dispose(); disposed = true;
    assert(host.childNodes.length === 0, `${arm}: host nodes remain after disposal`);
    const lifeAfterDisposal = { ...life };
    assert(lifeAfterDisposal.readyMounts === lifeAfterDisposal.readyCleanups &&
      lifeAfterDisposal.errorMounts === lifeAfterDisposal.errorCleanups,
      `${arm}: ready/error lifecycle did not balance`);
    if (arm === "native") {
      const diagnostics = disposal as { ownerCount?: number; pendingChangeCount?: number };
      assert(diagnostics.ownerCount === 0 && diagnostics.pendingChangeCount === 0,
        "native: owners or pending changes remain after disposal");
    } else {
      const reactDisposal = disposal as { listenerCount?: number; caught?: string[] };
      assert(reactDisposal.listenerCount === 0, "react: urgent subscriptions remain after disposal");
      assert(reactDisposal.caught?.length === 1 && reactDisposal.caught[0] === "provider-failed",
        "react: expected rejection was not caught exactly once");
    }
    earlyHost = document.createElement("section"); document.body.append(earlyHost);
    early = arm === "native" ? mountNative(earlyHost) : mountReact(earlyHost);
    const earlyWork = early.replace();
    const earlyDisposal = early.dispose(); earlyDisposed = true;
    earlyWork.provider.resolve({ label: "post-disposal", x: 100 });
    await frame(); await frame();
    assert(earlyHost.childNodes.length === 0, `${arm}: late settlement remounted disposed root`);
    if (arm === "native") {
      const diagnostics = earlyDisposal as { ownerCount?: number; pendingChangeCount?: number };
      assert(diagnostics.ownerCount === 0 && diagnostics.pendingChangeCount === 0,
        "native: early disposal retained owners or work");
    } else assert((earlyDisposal as { listenerCount?: number }).listenerCount === 0,
      "react: early disposal retained urgent subscription");
    assert(life.readyMounts === life.readyCleanups && life.errorMounts === life.errorCleanups,
      `${arm}: early disposal left lifecycle entries active`);
    earlyHost.remove();
    return { status: "PASS", arm, output, outputSha256, settlementToMutationObserverMs,
      firstStatus: first.handle.status, staleStatus: stale.handle.status, retryStatus: retry.handle.status,
      lifeBeforeDisposal, lifeAfterDisposal, disposal, earlyDisposal,
      remainingChildren: host.childNodes.length, urgentWhilePending: true, acceptedErrorRetained: true,
      cancelledLateDiscarded: true };
  } catch (error) { primaryError = error; }
  finally {
    const cleanupErrors: unknown[] = [];
    if (early && !earlyDisposed) {
      try { early.dispose(); } catch (error) { cleanupErrors.push(error); }
    }
    try { earlyHost?.remove(); } catch (error) { cleanupErrors.push(error); }
    if (controller && !disposed) {
      try { controller.dispose(); } catch (error) { cleanupErrors.push(error); }
    }
    try { host.remove(); } catch (error) { cleanupErrors.push(error); }
    if (primaryError || cleanupErrors.length) throw new AggregateError(
      [...(primaryError ? [primaryError] : []), ...cleanupErrors], `${arm} async recovery failed`);
  }
  throw new Error("Recovery run ended without a result");
}
declare global { interface Window { __asyncRecoveryPair?: {
  run(arm: Arm, options?: { measure?: boolean }): Promise<unknown>
} } }
window.__asyncRecoveryPair = { run };
