import { mountNative } from "./native_arm.tsx";
import { mountReact } from "./react_arm.tsx";

type Controller = ReturnType<typeof mountNative> | ReturnType<typeof mountReact>;
function assert(value: unknown, message: string): asserts value { if (!value) throw new Error(message); }
const frame = () => new Promise<void>(done => requestAnimationFrame(() => done()));
async function waitFor(predicate: () => boolean, message: string, timeout = 5000) {
  const deadline = performance.now() + timeout;
  while (!predicate()) { if (performance.now() >= deadline) throw new Error(message); await frame(); }
}
function timerQuantum() {
  let previous = performance.now(), minimum = Infinity;
  for (let index = 0; index < 2048; index++) {
    const now = performance.now(); if (now > previous) minimum = Math.min(minimum, now - previous); previous = now;
  }
  return Number.isFinite(minimum) ? minimum : null;
}
async function digest(value: string) {
  return [...new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)))]
    .map(byte => byte.toString(16).padStart(2, "0")).join("");
}
function observeDialog(portal: HTMLElement, label: string) {
  let observer: MutationObserver, timer: number, finished = false;
  let resolve!: (at: number) => void, reject!: (error: Error) => void;
  const promise = new Promise<number>((yes, no) => { resolve = yes; reject = no; });
  const finish = (run: () => void) => { if (finished) return; finished = true; observer.disconnect(); clearTimeout(timer); run(); };
  observer = new MutationObserver(() => {
    if (portal.querySelector(`[data-dialog-body="${label}"]`)) finish(() => resolve(performance.now()));
  });
  observer.observe(portal, { subtree: true, childList: true, attributes: true, characterData: true });
  timer = window.setTimeout(() => finish(() => reject(new Error("dialog observer timed out"))), 5000);
  return { promise, cancel() { finish(() => reject(new Error("observation cancelled"))); } };
}
function dialog(portal: Element) { return portal.querySelector<HTMLElement>('[role="dialog"]'); }
function body(portal: Element) { return portal.querySelector<HTMLElement>("[data-dialog-body]"); }
function trigger(host: Element) { return [...host.querySelectorAll("button")].find(node => node.textContent === "Open settings") as HTMLButtonElement | undefined; }
function close(portal: Element) { return [...portal.querySelectorAll("button")].find(node => node.textContent === "Close settings") as HTMLButtonElement | undefined; }
declare global { interface Window { __radixDialogStage?: string;
  __radixDialogPair?: { run(arm: "native" | "react"): Promise<unknown> } } }

export async function run(arm: "native" | "react") {
  const host = document.createElement("div"), portal = document.createElement("div"), unrelated = document.createElement("p");
  unrelated.textContent = "unrelated host"; unrelated.setAttribute("data-unrelated", "true");
  unrelated.tabIndex = 0;
  const sentinel = document.createElement("span"); sentinel.setAttribute("data-portal-sentinel", "true");
  portal.append(sentinel);
  document.body.append(host, portal, unrelated);
  const baseline = { bodyCssText: document.body.style.cssText,
    scrollLocked: document.body.getAttribute("data-scroll-locked"),
    unrelatedAria: unrelated.getAttribute("aria-hidden"),
    focusGuards: document.querySelectorAll("[data-radix-focus-guard]").length };
  let controller: Controller | null = null, disposed = false, cancel: (() => void) | null = null;
  let result: unknown, primaryError: unknown, failed = false;
  try {
    const mountAt = performance.now(); controller = arm === "native" ? mountNative(host, portal) : mountReact(host, portal);
    const setupReturnMs = performance.now() - mountAt;
    await waitFor(() => Boolean(trigger(host)), "dialog trigger missing");
    const mountToMatchingOutputObservedMs = performance.now() - mountAt;
    const timerResolutionMs = timerQuantum();
    const initialTrigger = trigger(host)!;
    assert(!dialog(portal) && unrelated.parentElement === document.body, "initial closed portal or unrelated node differs");
    host.querySelector<HTMLButtonElement>('[data-native-action="true"]')?.click();
    await waitFor(() => host.querySelector("[data-native-label]")?.getAttribute("data-native-count") === "1",
      "closed native-side action did not publish local state");
    const opening = observeDialog(portal, "accepted"); cancel = opening.cancel;
    void opening.promise.catch(() => {});
    const openStarted = performance.now(); controller.externalOpen();
    const openObservedAt = await opening.promise;
    await waitFor(() => Boolean(dialog(portal) && body(portal)), "external controlled open did not render portal");
    const modal = dialog(portal)!;
    assert(portal.contains(modal) && !host.contains(modal), "portal was not outside private root");
    const title = document.getElementById(modal.getAttribute("aria-labelledby") ?? "");
    const description = document.getElementById(modal.getAttribute("aria-describedby") ?? "");
    assert(title?.textContent === "Settings" && description?.textContent === "Edit your dialog note",
      "Radix Title/Description aria links missing");
    await waitFor(() => unrelated.getAttribute("aria-hidden") === "true" &&
      document.body.getAttribute("data-scroll-locked") !== baseline.scrollLocked &&
      document.querySelectorAll("[data-radix-focus-guard]").length > baseline.focusGuards,
      "Radix modal aria hiding, scroll lock or focus guards missing");
    window.__radixDialogStage = "await-escape";
    await waitFor(() => !dialog(portal), "Escape did not close controlled dialog");
    await waitFor(() => document.activeElement === initialTrigger &&
      unrelated.getAttribute("aria-hidden") === baseline.unrelatedAria &&
      document.body.style.cssText === baseline.bodyCssText &&
      document.body.getAttribute("data-scroll-locked") === baseline.scrollLocked &&
      document.querySelectorAll("[data-radix-focus-guard]").length === baseline.focusGuards,
      "focus, aria, scroll or focus guards did not restore after Escape");
    assert(controller.state().callbackCount === 1 && controller.state().callbackOpen === false,
      "Escape did not call controlled onOpenChange(false) exactly once");
    trigger(host)?.click();
    await waitFor(() => Boolean(body(portal)), "Trigger did not reopen modal");
    assert(controller.state().callbackCount === 2 && controller.state().callbackOpen === true,
      "Trigger did not call controlled onOpenChange(true) exactly once");
    const input = portal.querySelector<HTMLInputElement>('input[aria-label="Dialog note"]')!;
    const local = portal.querySelector<HTMLButtonElement>("[data-dialog-local]")!;
    const content = dialog(portal)!;
    input.value = "edited note"; input.setSelectionRange(2, 6); local.click();
    await waitFor(() => local.getAttribute("data-dialog-local") === "1", "React dialog local state missing");
    controller.updatePoint();
    await waitFor(() => body(portal)?.getAttribute("data-point") === "7" &&
      body(portal)?.getAttribute("data-native-count") === "1", "native props did not reach dialog body");
    controller.reorder();
    await waitFor(() => [...host.querySelectorAll("[data-row]")].map(node => node.getAttribute("data-row")).join() === "other,dialog",
      "keyed dialog row did not move");
    assert(dialog(portal) === content && portal.querySelector('input[aria-label="Dialog note"]') === input &&
      portal.querySelector("[data-dialog-local]") === local && input.value === "edited note" &&
      input.selectionStart === 2 && input.selectionEnd === 6 && local.getAttribute("data-dialog-local") === "1",
      "accepted props or keyed move lost dialog/form identity, selection or React state");
    controller.discard(); await frame();
    assert(!controller.trace.props.some(value => value.startsWith("discarded:")) && dialog(portal) === content,
      "discarded native candidate changed portal");
    const acceptedBeforePending = body(portal)?.getAttribute("data-dialog-body");
    const versionBeforePending = arm === "native" ? (controller as ReturnType<typeof mountNative>).state().version : null;
    const work = controller.pending(); await frame(); await frame();
    assert(body(portal)?.getAttribute("data-dialog-body") === acceptedBeforePending && dialog(portal) === content,
      "pending resource or transition changed accepted modal");
    const observation = observeDialog(portal, "next"); cancel = observation.cancel; void observation.promise.catch(() => {});
    controller.settle(); await observation.promise;
    if (arm === "native") assert(work.status === "committed" &&
      (controller as ReturnType<typeof mountNative>).state().groupedCallback === 1 &&
      (controller as ReturnType<typeof mountNative>).state().version > versionBeforePending!,
      "native pending publication did not accept before callback");
    assert(dialog(portal) === content && portal.querySelector('input[aria-label="Dialog note"]') === input &&
      input.value === "edited note" && input.selectionStart === 2 && input.selectionEnd === 6,
      "pending settlement remounted accepted modal or lost uncontrolled selection");
    controller.replaceReady();
    await waitFor(() => body(portal)?.getAttribute("data-dialog-body") === "fresh", "fresh props missing");
    assert(!controller.trace.props.some(value => value.startsWith("stale:")), "stale candidate delivered portal props");
    close(portal)?.click();
    await waitFor(() => !dialog(portal), "Close button did not close modal");
    assert(controller.state().callbackCount === 3 && controller.state().callbackOpen === false,
      "Close button controlled callback differed");
    trigger(host)?.click();
    await waitFor(() => Boolean(dialog(portal)), "Trigger did not reopen for remove test");
    assert(controller.state().callbackCount === 4 && controller.state().callbackOpen === true,
      "reopen controlled callback differed");
    controller.remove();
    await waitFor(() => !dialog(portal) && controller!.trace.cleanups >= 3,
      "removing open dialog did not retire portal/body");
    assert(controller.state().open === true && controller.state().callbackCount === 4,
      "removal silently changed controlled open state or fired onOpenChange");
    controller.externalClose();
    assert(controller.state().open === false && controller.state().callbackCount === 4,
      "external close while absent changed callback count");
    controller.reinsert();
    await waitFor(() => Boolean(trigger(host)), "reinserted dialog trigger missing");
    trigger(host)?.click();
    await waitFor(() => Boolean(dialog(portal) && body(portal)), "reinserted dialog did not open");
    assert(controller.state().callbackCount === 5 && controller.trace.mounts === controller.trace.cleanups + 1 &&
      portal.querySelector<HTMLInputElement>('input[aria-label="Dialog note"]')?.value === "seed" &&
      portal.querySelector("[data-dialog-local]")?.getAttribute("data-dialog-local") === "0",
      "reinserted dialog retained retired form or React state");
    const definedOutput = JSON.stringify({ label: body(portal)?.getAttribute("data-dialog-body"),
      point: body(portal)?.getAttribute("data-point"), nativeCount: body(portal)?.getAttribute("data-native-count"),
      formValue: portal.querySelector<HTMLInputElement>('input[aria-label="Dialog note"]')?.value,
      callbackCount: controller.state().callbackCount, open: controller.state().open,
      mounts: controller.trace.mounts, cleanupsBeforeDisposal: controller.trace.cleanups });
    const outputSha256 = await digest(definedOutput);
    disposed = true; const diagnostics = controller.dispose();
    await waitFor(() => !dialog(portal) && portal.childNodes.length === 1 && portal.firstChild === sentinel &&
      host.childNodes.length === 0 &&
      unrelated.getAttribute("aria-hidden") === baseline.unrelatedAria &&
      document.body.style.cssText === baseline.bodyCssText &&
      document.body.getAttribute("data-scroll-locked") === baseline.scrollLocked &&
      document.querySelectorAll("[data-radix-focus-guard]").length === baseline.focusGuards,
      "open disposal left portal, host, aria, scroll or focus guards");
    unrelated.focus();
    assert(document.activeElement === unrelated && portal.parentElement === document.body &&
      unrelated.parentElement === document.body && controller.trace.mounts === controller.trace.cleanups,
      "disposal removed unrelated node or leaked React body lifetime");
    if (arm === "native") assert((diagnostics as { ownerCount?: number }).ownerCount === 0,
      "native owners remained after disposal");
    result = { status: "PASS", arm, definedOutput, outputSha256, setupReturnMs,
      mountToMatchingOutputObservedMs, timerResolutionMs,
      openToMutationObserverMs: openObservedAt - openStarted,
      observation: "external controlled Store open to matching portal MutationObserver; excludes paint",
      callbacks: controller.state().callbackCount, diagnostics,
      baselineRestored: true, portalOutsidePrivateRoot: true, keyboardEscape: true };
  } catch (error) { primaryError = error; failed = true; }
  const cleanupErrors: unknown[] = [];
  window.__radixDialogStage = "done";
  try { cancel?.(); } catch (error) { cleanupErrors.push(error); }
  if (controller && !disposed) try { controller.dispose(); } catch (error) { cleanupErrors.push(error); }
  for (const node of [host, portal, unrelated]) try { node.remove(); } catch (error) { cleanupErrors.push(error); }
  if (failed || cleanupErrors.length) {
    const errors = [...(failed ? [primaryError] : []), ...cleanupErrors];
    const describe = (error: unknown) => error instanceof Error ? error.stack ?? String(error) : String(error);
    throw new AggregateError(errors,
      `Radix ${arm} workload or cleanup failed: ${errors.map(describe).join(" | ")}`);
  }
  return result;
}
window.__radixDialogPair = { run };
