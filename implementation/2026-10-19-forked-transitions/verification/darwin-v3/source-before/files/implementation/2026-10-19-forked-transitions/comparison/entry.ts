import { mountNative } from "../../../examples/forked-transitions/main.tsx";
import { mountReact } from "./react_arm.tsx";

type Arm = "native" | "react";
type Controller = ReturnType<typeof mountNative> | ReturnType<typeof mountReact>;
const frame = () => new Promise<void>(done => requestAnimationFrame(() => done()));
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
    const timer = window.setTimeout(() => { stop(); reject(new Error("final query C observation timed out")); }, 5000);
    stop = () => { watcher.disconnect(); clearTimeout(timer); };
    watcher.observe(host, { attributes: true, childList: true, characterData: true, subtree: true });
  });
  return { promise, stop };
}
async function digest(value: string) {
  const bytes = new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)));
  return [...bytes].map(byte => byte.toString(16).padStart(2, "0")).join("");
}
type View = { primary: { query: string | null; urgent: string | null; result: string | null; detail: string | null;
    pending: string | null; queryText: string | null; urgentText: string | null; resultText: string | null };
  fork: { query: string | null; urgent: string | null; result: string | null; detail: string | null;
    pending: string | null; queryText: string | null; urgentText: string | null; resultText: string | null };
  three: { query: string | null; urgent: string | null; result: string | null;
    resultPosition: number | null; children: number } };
function view(controller: Controller, host: HTMLElement): View {
  const snapshot = controller.snapshot();
  const text = (root: string, field: string) =>
    host.querySelector(`[data-root="${root}"] [data-${field}]`)?.textContent ?? null;
  return { primary: { query: snapshot.primary.query, urgent: snapshot.primary.urgent,
      result: snapshot.primary.result, detail: snapshot.primary.detail, pending: snapshot.primary.pending,
      queryText: text("primary", "query"), urgentText: text("primary", "urgent"),
      resultText: text("primary", "result") },
    fork: { query: snapshot.fork.query, urgent: snapshot.fork.urgent,
      result: snapshot.fork.result, detail: snapshot.fork.detail, pending: snapshot.fork.pending,
      queryText: text("fork", "query"), urgentText: text("fork", "urgent"),
      resultText: text("fork", "result") },
    three: { query: snapshot.three.query, urgent: snapshot.three.urgent, result: snapshot.three.result,
      resultPosition: snapshot.three.resultPosition, children: snapshot.three.children } };
}
function expected(stage: View, primary: string, fork: string, urgent: number, result: string, detail: string) {
  assert(stage.primary.query === primary && stage.fork.query === fork &&
    stage.three.query === `query-${primary}` && stage.primary.urgent === String(urgent) &&
    stage.fork.urgent === String(urgent) && stage.three.urgent === `urgent-${urgent}` &&
    stage.primary.result === result && stage.fork.result === result && stage.three.result === `result-${result}` &&
    stage.three.resultPosition === (result === "A" ? 1 : result === "B" ? 2 : 3) &&
    stage.three.children === 1 &&
    stage.primary.detail === detail && stage.fork.detail === detail &&
    stage.primary.pending === (primary === result ? null : "detail") &&
    stage.fork.pending === (fork === result ? null : "detail") &&
    stage.primary.queryText === primary && stage.fork.queryText === fork &&
    stage.primary.urgentText === String(urgent) && stage.fork.urgentText === String(urgent) &&
    stage.primary.resultText === `${result}: ${detail} · shared-catalog` &&
    stage.fork.resultText === `${result}: ${detail} · shared-catalog`,
    `unexpected view: ${JSON.stringify(stage)}; wanted ${primary}/${fork}/${urgent}/${result}/${detail}`);
}
function completeC(stage: View) {
  return stage.primary.query === "C" && stage.fork.query === "C" &&
    stage.primary.urgent === "2" && stage.fork.urgent === "2" &&
    stage.primary.result === "C" && stage.fork.result === "C" &&
    stage.primary.detail === "ready-C" && stage.fork.detail === "ready-C" &&
    stage.primary.pending === null && stage.fork.pending === null &&
    stage.primary.queryText === "C" && stage.fork.queryText === "C" &&
    stage.primary.urgentText === "2" && stage.fork.urgentText === "2" &&
    stage.primary.resultText === "C: ready-C · shared-catalog" &&
    stage.fork.resultText === "C: ready-C · shared-catalog" &&
    stage.three.query === "query-C" && stage.three.urgent === "urgent-2" &&
    stage.three.result === "result-C" && stage.three.resultPosition === 3 &&
    stage.three.children === 1;
}
function nativeProof(snapshot: ReturnType<ReturnType<typeof mountNative>["snapshot"]>) {
  const events = snapshot.providerTrace;
  const count = (query: string, event: string) => events.filter(item => item.query === query && item.event === event).length;
  assert(count("A", "start") === 1 && count("A", "abort") === 1,
    "native: diverged fork A was not started and cancelled exactly once");
  assert(count("B", "start") === 1 && count("B", "abort") === 1,
    "native: shared B execution restarted or was not cancelled by C");
  assert(count("C", "start") === 1 && count("C", "resolve") === 1,
    "native: final C provider did not start and settle once");
  assert(snapshot.detail?.status === "committed", "native: final task did not commit");
}
function reactProof(snapshot: ReturnType<ReturnType<typeof mountReact>["snapshot"]>) {
  const count = (query: string, event: string) => snapshot.providerTrace.filter(item =>
    item.query === query && item.event === event).length;
  assert(["A", "B", "C"].every(query => count(query, "start") === 1),
    "react: providers were not each preloaded once");
  assert(["A", "B", "C"].every(query => count(query, "resolve") === 1),
    "react: providers were not each settled once");
  assert(snapshot.logicalRetirements.join(",") === "A,B",
    "react: superseded A/B work was not retired in order");
}
function mountCounts(arm: Arm, controller: Controller) {
  if (arm === "native") {
    const { starts, cleanups } = (controller as ReturnType<typeof mountNative>).snapshot().life;
    return { starts, cleanups };
  }
  const { primaryMounts, primaryCleanups, forkMounts, forkCleanups } =
    (controller as ReturnType<typeof mountReact>).snapshot().life;
  return { primaryMounts, primaryCleanups, forkMounts, forkCleanups };
}
function nativeDisposal(disposal: ReturnType<ReturnType<typeof mountNative>["dispose"]>) {
  assert(disposal.life.starts > 0 && disposal.life.starts === disposal.life.cleanups,
    "native: effect lifetime absent or unbalanced");
  for (const root of Object.values(disposal.roots)) assert(root.ownerCount === 0 && root.pendingChangeCount === 0 && root.disposed,
    "native: root ownership or pending changes survived disposal");
  assert(disposal.three.diagnostics.liveHandles === 0 && disposal.three.diagnostics.liveResources === 0,
    "native: Three host handles/resources survived disposal");
  assert(disposal.three.diagnostics.createdResources === disposal.three.diagnostics.disposedResources &&
    disposal.three.diagnostics.createdResources > 0,
    "native: owned result resources did not balance across A/C reveal");
  assert(disposal.borrowedAtHostDisposal?.geometry === 0 && disposal.borrowedAtHostDisposal.material === 0 &&
    disposal.borrowedDisposed.geometry === 1 && disposal.borrowedDisposed.material === 1,
    "native: borrowed geometry/material ownership was not respected");
  for (const store of Object.values(disposal.stores))
    assert(store.listeners === 0 && store.readers === 0 && store.roots === 0,
      "native: store subscriptions survived disposal");
}
function reactDisposal(disposal: ReturnType<ReturnType<typeof mountReact>["dispose"]>) {
  const life = disposal.life;
  assert(life.primaryMounts > 0 && life.forkMounts > 0 && life.effectRuns > 0 &&
    life.primaryMounts === life.primaryCleanups && life.forkMounts === life.forkCleanups &&
    life.effectRuns === life.effectCleanups, "react: component/effect lifetime absent or unbalanced");
  assert(disposal.owned.createdGeometry === disposal.owned.disposedGeometry &&
    disposal.owned.createdMaterial === disposal.owned.disposedMaterial &&
    disposal.owned.createdGeometry > 0,
    "react: owned Three result resources did not balance across A/C reveal");
  assert(disposal.borrowedAtHostDisposal?.geometry === 0 && disposal.borrowedAtHostDisposal.material === 0 &&
    disposal.borrowedDisposed.geometry === 1 && disposal.borrowedDisposed.material === 1,
    "react: borrowed geometry/material ownership was not respected");
  assert(disposal.listenerCount === 0 && disposal.sceneChildren === 0 && disposal.hostChildren === 0,
    "react: listener, Three group or DOM host survived disposal");
}
async function run(arm: Arm, options?: { measure?: boolean }) {
  const host = document.createElement("section"); document.body.append(host);
  let controller: Controller | null = null, disposed = false;
  let earlyHost: HTMLElement | null = null, early: Controller | null = null, earlyDisposed = false;
  let immediateHost: HTMLElement | null = null, immediate: Controller | null = null, immediateDisposed = false;
  let fallbackWatcher: MutationObserver | null = null, fallbackInsertions = 0;
  let primaryError: unknown = null;
  try {
    controller = arm === "native" ? mountNative(host) : mountReact(host);
    await waitFor(() => view(controller!, host).primary.result === "A" && view(controller!, host).fork.result === "A",
      `${arm}: initial accepted A missing`);
    fallbackWatcher = new MutationObserver(records => {
      for (const record of records) for (const node of record.addedNodes) {
        if (!(node instanceof Element)) continue;
        if (node.matches('[data-pending="startup"],[data-startup]') ||
          node.querySelector('[data-pending="startup"],[data-startup]')) fallbackInsertions++;
      }
    });
    fallbackWatcher.observe(host, { childList: true, subtree: true });
    const stages: Record<string, View> = {};
    stages.initial = view(controller, host); expected(stages.initial, "A", "A", 0, "A", "ready-A");
    const initialThree = controller.snapshot().three;
    const retainedIds = [initialThree.resultHandleId, initialThree.resultGeometryId,
      initialThree.resultMaterialId];
    assert(retainedIds.every(value => typeof value === "string" && value.length > 0),
      `${arm}: accepted Three result identity unavailable`);
    const assertRetainedThree = () => {
      const current = controller!.snapshot().three;
      assert(current.resultHandleId === retainedIds[0] &&
        current.resultGeometryId === retainedIds[1] && current.resultMaterialId === retainedIds[2],
        `${arm}: accepted Three mesh or owned resource identity changed`);
    };
    const retainedPrimary = host.querySelector('[data-root="primary"] [data-result="A"]');
    const retainedFork = host.querySelector('[data-root="fork"] [data-result="A"]');
    assert(retainedPrimary && retainedFork, `${arm}: accepted DOM result identity unavailable`);
    const initialMountCounts = mountCounts(arm, controller);
    await controller.beginB();
    await waitFor(() => view(controller!, host).primary.query === "B" && view(controller!, host).three.query === "query-B",
      `${arm}: primary/Three B projection did not publish`);
    stages.divergedB = view(controller, host); expected(stages.divergedB, "B", "A", 0, "A", "ready-A");
    assertRetainedThree();
    await controller.catchUpFork();
    await waitFor(() => view(controller!, host).fork.query === "B", `${arm}: fork B catch-up did not publish`);
    stages.convergedB = view(controller, host); expected(stages.convergedB, "B", "B", 0, "A", "ready-A");
    assertRetainedThree();
    assert(host.querySelector('[data-root="primary"] [data-result="A"]') === retainedPrimary &&
      host.querySelector('[data-root="fork"] [data-result="A"]') === retainedFork,
      `${arm}: pending B displaced accepted result nodes`);
    controller.urgent(); controller.urgent();
    await waitFor(() => view(controller!, host).primary.urgent === "2" && view(controller!, host).fork.urgent === "2" &&
      view(controller!, host).three.urgent === "urgent-2", `${arm}: urgent counter waited on pending providers`);
    stages.urgentPending = view(controller, host); expected(stages.urgentPending, "B", "B", 2, "A", "ready-A");
    await controller.beginC();
    await waitFor(() => view(controller!, host).primary.query === "C" && view(controller!, host).fork.query === "C" &&
      view(controller!, host).three.query === "query-C", `${arm}: C group projection did not publish`);
    stages.pendingC = view(controller, host); expected(stages.pendingC, "C", "C", 2, "A", "ready-A");
    assertRetainedThree();
    controller.resolveA(); controller.resolveB();
    await frame(); await frame();
    stages.staleSettled = view(controller, host); expected(stages.staleSettled, "C", "C", 2, "A", "ready-A");
    assertRetainedThree();
    const watch = observer(host, () => completeC(view(controller!, host)));
    const started = options?.measure === true ? performance.now() : null;
    controller.resolveC();
    const observed = await watch.promise;
    const settlementToMutationObserverMs = started === null ? null : observed - started;
    stages.finalC = view(controller, host); expected(stages.finalC, "C", "C", 2, "C", "ready-C");
    assertRetainedThree();
    assert(host.querySelector('[data-root="primary"] [data-result="C"]') === retainedPrimary &&
      host.querySelector('[data-root="fork"] [data-result="C"]') === retainedFork,
      `${arm}: accepted DOM result nodes changed across A to C`);
    assert(JSON.stringify(mountCounts(arm, controller)) === JSON.stringify(initialMountCounts),
      `${arm}: accepted component mount/activation lifetime changed across A to C`);
    fallbackWatcher.disconnect(); fallbackWatcher = null;
    assert(fallbackInsertions === 0, `${arm}: startup fallback reappeared after first reveal`);
    const beforeDisposal = controller.snapshot();
    if (arm === "native") nativeProof(beforeDisposal as ReturnType<ReturnType<typeof mountNative>["snapshot"]>);
    else reactProof(beforeDisposal as ReturnType<ReturnType<typeof mountReact>["snapshot"]>);
    const output = JSON.stringify(stages);
    const outputSha256 = await digest(output);
    const disposal = controller.dispose(); disposed = true;
    assert(host.childNodes.length === 0, `${arm}: DOM nodes survived disposal`);
    if (arm === "native") nativeDisposal(disposal as ReturnType<ReturnType<typeof mountNative>["dispose"]>);
    else reactDisposal(disposal as ReturnType<ReturnType<typeof mountReact>["dispose"]>);
    earlyHost = document.createElement("section"); document.body.append(earlyHost);
    early = arm === "native" ? mountNative(earlyHost) : mountReact(earlyHost);
    await waitFor(() => view(early!, earlyHost!).primary.result === "A", `${arm}: early controller not ready`);
    await early.beginB();
    early.cancel();
    await frame();
    early.resolveB();
    await frame(); await frame();
    assert(view(early, earlyHost!).primary.result === "A", `${arm}: cancelled B revealed after settlement`);
    const earlyDisposal = early.dispose(); earlyDisposed = true;
    assert(earlyHost.childNodes.length === 0, `${arm}: early disposal left DOM nodes`);
    if (arm === "native") nativeDisposal(earlyDisposal as ReturnType<ReturnType<typeof mountNative>["dispose"]>);
    else reactDisposal(earlyDisposal as ReturnType<ReturnType<typeof mountReact>["dispose"]>);
    earlyHost.remove();
    immediateHost = document.createElement("section"); document.body.append(immediateHost);
    immediate = arm === "native" ? mountNative(immediateHost) : mountReact(immediateHost);
    await waitFor(() => view(immediate!, immediateHost!).primary.result === "A" && view(immediate!, immediateHost!).fork.result === "A",
      `${arm}: immediate-disposal controller not ready`);
    const starting = immediate.beginB();
    const immediateDisposal = immediate.dispose(); immediateDisposed = true;
    await starting;
    const retiredView = JSON.stringify(view(immediate, immediateHost!));
    const retiredLife = JSON.stringify(immediate.snapshot().life);
    immediate.resolveA(); immediate.resolveB();
    await frame(); await frame();
    assert(immediateHost.childNodes.length === 0 && JSON.stringify(view(immediate, immediateHost!)) === retiredView &&
      JSON.stringify(immediate.snapshot().life) === retiredLife,
      `${arm}: late provider wrote into a disposed root`);
    if (arm === "native") nativeDisposal(immediateDisposal as ReturnType<ReturnType<typeof mountNative>["dispose"]>);
    else reactDisposal(immediateDisposal as ReturnType<ReturnType<typeof mountReact>["dispose"]>);
    immediateHost.remove();
    return { status: "PASS", arm, output, outputSha256, settlementToMutationObserverMs,
      stages, beforeDisposal, disposal, earlyDisposal, immediateDisposal,
      remainingChildren: host.childNodes.length,
      divergentFork: true, sharedBProvider: true, urgentWhilePending: true, staleDiscarded: true,
      earlyCancellation: true, immediateDisposalStable: true, fallbackInsertions };
  } catch (error) { primaryError = error; }
  finally {
    fallbackWatcher?.disconnect();
    const cleanupErrors: unknown[] = [];
    if (immediate && !immediateDisposed) try { immediate.dispose(); } catch (error) { cleanupErrors.push(error); }
    try { immediateHost?.remove(); } catch (error) { cleanupErrors.push(error); }
    if (early && !earlyDisposed) try { early.dispose(); } catch (error) { cleanupErrors.push(error); }
    try { earlyHost?.remove(); } catch (error) { cleanupErrors.push(error); }
    if (controller && !disposed) try { controller.dispose(); } catch (error) { cleanupErrors.push(error); }
    try { host.remove(); } catch (error) { cleanupErrors.push(error); }
    if (primaryError || cleanupErrors.length) throw new AggregateError(
      [...(primaryError ? [primaryError] : []), ...cleanupErrors], `${arm} forked transition comparison failed`);
  }
  throw new Error("Forked transition run ended without a result");
}
declare global { interface Window { __forkedTransitionsPair?: {
  run(arm: Arm, options?: { measure?: boolean }): Promise<unknown>
} } }
window.__forkedTransitionsPair = { run };
