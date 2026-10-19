import { mountNative } from "./native_arm.tsx";
import { mountReact } from "./react_arm.tsx";

type Controller = ReturnType<typeof mountNative> | ReturnType<typeof mountReact>;
function assert(value: unknown, message: string): asserts value { if (!value) throw new Error(message); }
const frame = () => new Promise<void>(done => requestAnimationFrame(() => done()));
function timerQuantum() {
  let previous = performance.now(), minimum = Infinity;
  for (let index = 0; index < 2048; index++) {
    const current = performance.now();
    if (current > previous) minimum = Math.min(minimum, current - previous);
    previous = current;
  }
  return Number.isFinite(minimum) ? minimum : null;
}
async function waitFor(predicate: () => boolean, message: string, timeout = 5000) {
  const deadline = performance.now() + timeout;
  while (!predicate()) { if (performance.now() >= deadline) throw new Error(message); await frame(); }
}
function island(host: Element, id: string) { return host.querySelector(`[data-island="${id}"]`); }
function nodeState(hosts: readonly [HTMLElement, HTMLElement]) {
  return ["a", "b"].map(id => {
    const node = island(hosts[0], id);
    return [id, node?.getAttribute("data-label"), node?.getAttribute("data-point"),
      node?.getAttribute("data-clicks"), node?.getAttribute("data-native-clicks")];
  }).concat([["c", island(hosts[1], "c")?.getAttribute("data-label"),
    island(hosts[1], "c")?.getAttribute("data-point"), island(hosts[1], "c")?.getAttribute("data-clicks"),
    island(hosts[1], "c")?.getAttribute("data-native-clicks")]]);
}
function observeLabels(hosts: readonly [HTMLElement, HTMLElement], label: string) {
  let observer: MutationObserver, timer: number, finished = false;
  let resolve!: (at: number) => void, reject!: (error: Error) => void;
  const promise = new Promise<number>((yes, no) => { resolve = yes; reject = no; });
  const finish = (run: () => void) => { if (finished) return; finished = true; observer.disconnect(); clearTimeout(timer); run(); };
  observer = new MutationObserver(() => {
    if (hosts.every(host => host.querySelector(`[data-native-label="${label}"]`)) &&
      ["a", "b", "c"].every((id, index) => island(hosts[index === 2 ? 1 : 0], id)?.getAttribute("data-label") === label))
      finish(() => resolve(performance.now()));
  });
  for (const host of hosts) observer.observe(host, { subtree: true, attributes: true, childList: true, characterData: true });
  timer = window.setTimeout(() => finish(() => reject(new Error("island label observation timed out"))), 5000);
  return { promise, cancel() { finish(() => reject(new Error("observation cancelled"))); } };
}
async function sha(value: string) {
  const bytes = new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)));
  return [...bytes].map(byte => byte.toString(16).padStart(2, "0")).join("");
}
export async function run(arm: "native" | "react") {
  const hosts = [document.createElement("div"), document.createElement("div")] as [HTMLElement, HTMLElement];
  for (const host of hosts) document.body.append(host);
  let controller: Controller | null = null, disposed = false, cancel: (() => void) | null = null;
  try {
    const mountAt = performance.now(); controller = arm === "native" ? mountNative(hosts) : mountReact(hosts);
    const setupReturnMs = performance.now() - mountAt;
    await waitFor(() => ["a", "b", "c"].every((id, index) => island(hosts[index === 2 ? 1 : 0], id)), "initial islands missing");
    const mountToMatchingOutputObservedMs = performance.now() - mountAt;
    const timerResolutionMs = timerQuantum();
    const a = island(hosts[0], "a")!, b = island(hosts[0], "b")!, c = island(hosts[1], "c")!;
    const containers = [a.parentElement, b.parentElement, c.parentElement];
    assert(containers.every(Boolean), "private island containers missing");
    a.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    await waitFor(() => a.getAttribute("data-clicks") === "1" && controller!.state().nativeActions === 1,
      "React event did not update React and native callback");
    hosts[0].querySelector('[data-native-action="true"]')?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    await waitFor(() => a.getAttribute("data-native-clicks") === "1" &&
      hosts[0].querySelector("[data-native-label]")?.getAttribute("data-native-clicks") === "1",
      "native local event/state did not reach React island props");
    controller.updatePoints();
    await waitFor(() => a.getAttribute("data-point") === "7" && c.getAttribute("data-point") === "9",
      "Store-derived native props did not reach React islands");
    assert(island(hosts[0], "a") === a && island(hosts[1], "c") === c &&
      a.parentElement === containers[0] && b.parentElement === containers[1] &&
      c.parentElement === containers[2], "ready prop update remounted React or replaced its container");
    controller.reorder();
    await waitFor(() => [...hosts[0].querySelectorAll("[data-island]")].map(node => node.getAttribute("data-island")).join() === "b,a",
      "keyed reorder missing");
    assert(island(hosts[0], "a") === a && island(hosts[0], "b") === b &&
      a.getAttribute("data-clicks") === "1", "keyed reorder lost React state or node identity");
    controller.discard();
    await frame();
    assert(!controller.trace.props.some(value => value.includes(":discarded:")), "discarded candidate delivered React props");
    controller.remove();
    await waitFor(() => !island(hosts[0], "a") && controller!.trace.cleanups.a === 1, "removed island did not unmount");
    controller.reinsert();
    await waitFor(() => Boolean(island(hosts[0], "a")) && controller!.trace.mounts.a === 2,
      "reinserted island did not mount afresh");
    assert(island(hosts[0], "a") !== a && island(hosts[0], "a")?.getAttribute("data-clicks") === "0",
      "reinserted island retained retired React state");
    const beforePending = nodeState(hosts);
    const beforeVersions = arm === "native" ? [...(controller as ReturnType<typeof mountNative>).state().versions] : null;
    const work = controller.enqueuePending();
    await frame(); await frame();
    assert(JSON.stringify(nodeState(hosts)) === JSON.stringify(beforePending) &&
      hosts.every(host => host.querySelector('[data-native-label="accepted"]')),
      "pending native resource or React transition changed accepted island props");
    const observation = observeLabels(hosts, "next"); cancel = observation.cancel;
    void observation.promise.catch(() => {});
    const started = performance.now(); controller.settle();
    const observedAt = await observation.promise;
    if (arm === "native") {
      const native = controller as ReturnType<typeof mountNative>;
      assert(work.status === "committed" && native.state().callbacks === 1 &&
        native.state().callbackVersions.every((version, index) => version > beforeVersions![index]),
        "native grouped roots were absent before accepted callback");
    }
    assert(island(hosts[0], "b") === b && island(hosts[1], "c") === c &&
      island(hosts[0], "a") !== a &&
      b.parentElement === containers[1] && c.parentElement === containers[2],
      "persistent React roots or retired container identity changed");
    controller.replaceReady();
    await waitFor(() => island(hosts[0], "a")?.getAttribute("data-label") === "fresh",
      "newer accepted native props did not reach React island");
    assert(!controller.trace.props.some(value => value.includes(":stale:")), "stale candidate delivered React props");
    const definedOutput = JSON.stringify({ islands: nodeState(hosts),
      mounts: controller.trace.mounts, cleanups: controller.trace.cleanups,
      nativeActions: controller.state().nativeActions });
    const outputSha256 = await sha(definedOutput);
    disposed = true; const diagnostics = controller.dispose();
    await waitFor(() => hosts.every(host => host.childNodes.length === 0), "disposal left host children");
    assert(controller.trace.cleanups.a === 2 && controller.trace.cleanups.b === 1 &&
      controller.trace.cleanups.c === 1, "React roots did not unmount exactly once on retirement/disposal");
    if (arm === "native") assert((diagnostics as { ownerCount?: number }[]).every(item => item.ownerCount === 0),
      "native owners remained after disposal");
    return { status: "PASS", arm, definedOutput, outputSha256,
      setupReturnMs, mountToMatchingOutputObservedMs, timerResolutionMs,
      settlementToMutationObserverMs: observedAt - started, observation: "React DOM mutation after native publication",
      callbackCount: controller.state().callbacks, diagnostics };
  } finally {
    cancel?.();
    if (controller && !disposed) controller.dispose();
    hosts.forEach(host => host.remove());
  }
}
declare global { interface Window { __reactIslandPair?: { run: typeof run } } }
window.__reactIslandPair = { run };
