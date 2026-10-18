import { mountNative } from "./native_arm.tsx";
import { mountReact } from "./react_arm.tsx";

type Controller = ReturnType<typeof mountNative> | ReturnType<typeof mountReact>;
function assert(value: unknown, message: string): asserts value { if (!value) throw new Error(message); }
const nextFrame = () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
const timerQuantum = () => {
  let previous = performance.now(), minimum = Infinity;
  for (let i = 0; i < 2048; i++) {
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
function observeJoint(host: Element, position: HTMLElement, joint: HTMLElement, world: Element, firstRow: Element, outline: Element, camera: Element, timeoutMs: number) {
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
    const list = firstRow.parentElement;
    if (joint.isConnected && world.isConnected && firstRow.isConnected &&
      position.getAttribute("data-position") === "7" && position.style.transform === "translateX(7px)" &&
      joint.style.opacity === "0.9" && joint.getAttribute("data-joint") === "9" && world.getAttribute("data-world") === "5" &&
      position.textContent === "7" && joint.textContent === "9" && outline.textContent === "14" && camera.textContent === "2" &&
      outline.getAttribute("data-outline") === "14" && camera.getAttribute("data-camera") === "2" &&
      list?.lastElementChild === firstRow) {
      finish(() => resolve({ at: callbackAt, records }));
    }
  });
  observer.observe(host, { attributes: true, childList: true, characterData: true, subtree: true });
  timer = window.setTimeout(() => finish(() => reject(new Error("joint transaction timed out"))), timeoutMs);
  return { promise, cancel() { finish(() => reject(new Error("joint observation cancelled"))); } };
}

async function run(arm: "native" | "react") {
  const host = document.createElement("section");
  host.dataset.arm = arm;
  document.body.append(host);
  let controller: Controller | null = null;
  let disposed = false;
  let stopObservation: (() => void) | null = null;
  let primaryError: unknown;
  const cleanupErrors: unknown[] = [];
  try {
    controller = arm === "native" ? mountNative(host) : mountReact(host);
    const mountDurationMs = controller.mountDurationMs;
    const timerResolutionMs = timerQuantum();
    await waitFor(() => host.querySelector('[data-health="fallback"]')?.textContent === "health waiting" &&
      Boolean(host.querySelector('[data-position="1"]')) &&
      Boolean(host.querySelector('[data-joint="3"]')) && Boolean(host.querySelector('[data-world="0"]')) &&
      host.querySelectorAll("li[data-id]").length === 64,
    `${arm}: initial joint scene did not mount`, performance.now() + 5000);
    const fallback = host.querySelector('[data-health="fallback"]');
    const positionNode = host.querySelector<HTMLElement>('[data-position="1"]');
    const joint = host.querySelector<HTMLElement>('[data-joint="3"]');
    const world = host.querySelector('[data-world="0"]');
    const firstRow = host.querySelector('[data-id="row-0"]');
    const outline = host.querySelector('[data-outline="2"]');
    const camera = host.querySelector('[data-camera="2"]');
    assert(outline && camera && positionNode?.textContent === "1" && joint?.textContent === "3" &&
      outline.textContent === "2" && camera.textContent === "2", `${arm}: initial text nodes absent`);
    const positionText = positionNode.firstChild;
    const jointText = joint.firstChild;
    const outlineText = outline.firstChild;
    const cameraText = camera.firstChild;
    const positionParent = positionNode.parentElement;
    const jointParent = joint.parentElement;
    assert(fallback && positionNode && joint && world && firstRow, `${arm}: initial nodes absent`);
    (firstRow as HTMLElement).click();
    await waitFor(() => firstRow.getAttribute("data-local") === "1",
      `${arm}: untimed row-0 state interaction did not commit`, performance.now() + 5000);
    const visibilitySamples = [visible(fallback)];
    await nextFrame(); await nextFrame();
    assert(host.querySelector('[data-health="fallback"]') === fallback && visible(fallback),
      `${arm}: pending health fallback changed before transaction`);
    const observation = observeJoint(host, positionNode, joint, world, firstRow, outline, camera, 5000);
    stopObservation = observation.cancel;
    void observation.promise.catch(() => {});
    const dispatchedAt = performance.now();
    controller.transact();
    const observed = await observation.promise;
    const dispatchToMutationObserverMs = observed.at - dispatchedAt;
    const containsReady = (node: Node) => node instanceof Element &&
      (node.matches('[data-health="ready"]') || node.querySelector('[data-health="ready"]') !== null);
    const healthReadyBeforeTiming = observed.records.some((record) =>
      [...record.addedNodes].some(containsReady));
    const fallbackRemoved = observed.records.some((record) =>
      [...record.removedNodes].some((node) => node === fallback ||
        (node instanceof Element && node.contains(fallback))));
    const fallbackMutated = observed.records.some((record) =>
      record.type === "attributes" && record.target instanceof Element &&
      (record.target === fallback || record.target.contains(fallback)));
    visibilitySamples.push(visible(fallback));
    assert(host.querySelector('[data-position]') === positionNode &&
      host.querySelector('[data-joint]') === joint && host.querySelector('[data-world]') === world &&
      host.querySelector('[data-id="row-0"]') === firstRow, `${arm}: retained host identity changed`);
    assert(firstRow.parentElement?.lastElementChild === firstRow &&
      firstRow.getAttribute("data-local") === "1", `${arm}: keyed move lost row state`);
    assert(host.querySelector('[data-health="fallback"]') === fallback && !healthReadyBeforeTiming &&
      !fallbackRemoved && !fallbackMutated && visibilitySamples.every(Boolean),
      `${arm}: pending health fallback changed during transaction`);
    assert(positionNode.getAttribute("data-position") === "7" &&
      positionNode.style.transform === "translateX(7px)" && joint.style.opacity === "0.9" &&
      joint.getAttribute("data-joint") === "9" && world.getAttribute("data-world") === "5",
      `${arm}: joint numeric outputs mismatch`);
    assert(positionNode.firstChild === positionText && joint.firstChild === jointText &&
      outline.firstChild === outlineText && camera.firstChild === cameraText &&
      positionNode.parentElement === positionParent && joint.parentElement === jointParent &&
      host.querySelector('[data-outline]') === outline && host.querySelector('[data-camera]') === camera,
      `${arm}: subtree or text identity changed`);
    const order = [...host.querySelectorAll("li[data-id]")].map((node) => node.getAttribute("data-id"));
    assert(order.length === 64 && order[0] === "row-1" && order[63] === "row-0", `${arm}: keyed order mismatch`);
    const definedOutput = JSON.stringify({ fallback: fallback.textContent, position: "7", transform: positionNode.style.transform,
      opacity: joint.style.opacity, joint: "9", world: "5", text: [positionNode.textContent, joint.textContent, outline.textContent, camera.textContent], order });
    const outputSha256 = await digest(definedOutput);
    controller.settleHealth();
    await waitFor(() => host.querySelector('[data-health="ready"]')?.textContent === "health ready",
      `${arm}: health did not reveal after untimed settlement`, performance.now() + 5000);
    assert(host.querySelector('[data-position]') === positionNode &&
      host.querySelector('[data-joint]') === joint && host.querySelector('[data-world]') === world &&
      host.querySelector('[data-id="row-0"]') === firstRow && firstRow.getAttribute("data-local") === "1",
      `${arm}: retained scene or local state changed on health reveal`);
    const disposeStart = performance.now();
    disposed = true;
    const disposal = controller.dispose();
    const disposeDurationMs = performance.now() - disposeStart;
    const remainingChildren = host.childNodes.length;
    host.remove();
    assert(remainingChildren === 0, `${arm}: disposal left DOM children`);
    if (arm === "native") {
      assert((disposal as { ownerCount?: number }).ownerCount === 0, "native owners remained");
      assert((disposal as { position?: { readers?: number } }).position?.readers === 0, "position readers remained");
      assert((disposal as { camera?: { readers?: number } }).camera?.readers === 0, "camera readers remained");
    } else {
      assert((disposal as { position?: { listeners?: number } }).position?.listeners === 0, "React position listeners remained");
      assert((disposal as { camera?: { listeners?: number } }).camera?.listeners === 0, "React camera listeners remained");
    }
    return { status: "PASS", arm, dispatchToMutationObserverMs, timerResolutionMs,
      mountDurationMs, disposeDurationMs, definedOutput, outputSha256, retainedHostIdentity: true,
      retainedRowIdentity: true, retainedTextIdentity: true, retainedSubtreeIdentity: true, retainedRowState: 1, fallbackVisible: true, visibilitySamples,
      healthReadyBeforeTiming, healthRevealedAfterTiming: true,
      finalProps: { position: positionNode.getAttribute("data-position"),
        transform: positionNode.style.transform, opacity: joint.style.opacity, joint: joint.getAttribute("data-joint"), world: world.getAttribute("data-world") },
      order, disposal: { remainingChildren, ...disposal } };
  } catch (error) { primaryError = error; }
  finally {
    stopObservation?.();
    if (controller && !disposed) { try { controller.dispose(); } catch (error) { cleanupErrors.push(error); } }
    try { host.remove(); } catch (error) { cleanupErrors.push(error); }
    if (controller) { try { controller.settleHealth(); } catch (error) { cleanupErrors.push(error); } }
  }
  if (primaryError && cleanupErrors.length) throw new AggregateError([primaryError, ...cleanupErrors], `${arm} transaction and cleanup failed`);
  if (primaryError) throw primaryError;
  if (cleanupErrors.length) throw new AggregateError(cleanupErrors, `${arm} cleanup failed`);
  throw new Error(`${arm}: ended without result`);
}

declare global { interface Window { __storeSubtreesPair?: { run(arm: "native" | "react"): Promise<unknown> } } }
window.__storeSubtreesPair = { run };
