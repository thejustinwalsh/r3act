import {
  asyncTask,
  createDOMRoot,
  createStore,
  createWorld,
  NativeTaskTransitionQueue,
  Suspense,
  use,
  useEffect,
  useState,
} from "../native_runtime_api.ts";
import type { NativeTaskExecution } from "../native_runtime_api.ts";
import {
  createOptimisticFeedStore,
  optimisticFeedActions,
  optimisticLikeCount,
  type OptimisticFeedStore,
} from "../optimistic_feed.ts";

type Request = { id: string; delay: number; label: string; fail?: boolean };
type SearchResult = { query: string; hits: number; label: string };
type PanelModel = {
  profile: string;
  catalog: string;
  search: SearchResult;
  assembledAt: number;
};
type TaskRequest = { operationId: string; label: string; lane: string };
type TaskRequestState = { requests: readonly TaskRequest[] };
type TaskRequestAction =
  | { type: "append"; request: TaskRequest }
  | { type: "remove"; operationId: string };
type TaskInfo = { id: string; status: string; generation: number; started: string[]; completed: string[]; reused: string[] };
type WorkRecord = {
  id: string;
  lane: string;
  duration: number;
  startedAt: number;
  endedAt?: number;
  status: string;
  handle?: ReturnType<NativeTaskTransitionQueue["enqueue"]>;
  taskInfo: TaskInfo;
  execution?: NativeTaskExecution<any>;
  likeIds: [string, string];
  scopeId: string;
  scopeRoots: readonly string[];
  settled: boolean;
};
type ScopeOwner = { operationId: string; roots: readonly string[] };

const ROOTS = ["task-transition-main", "task-transition-fork"] as const;
const world = createWorld();
const queue = new NativeTaskTransitionQueue();
const queryStore = createStore("field notes");
const scoreStore = createStore(18);
const failNextStore = createStore(false);
const requestStore = createStore<TaskRequestState, TaskRequestAction>(
  { requests: [] },
  (state, action) => {
    if (action.type === "append") {
      if (state.requests.some((request) => request.operationId === action.request.operationId)) return state;
      return { requests: [...state.requests, action.request].slice(-32) };
    }
    const requests = state.requests.filter((request) => request.operationId !== action.operationId);
    return requests.length === state.requests.length ? state : { requests };
  },
);
const feedStore = createOptimisticFeedStore([{
  id: "seed-1",
  text: "Small field note: the river path is open again.",
  confirmedLikes: 3,
}]);
const clock = createStore(Date.now());
const roots = new Map<string, ReturnType<typeof createDOMRoot>>();
const providers = new Map<string, { id: string; operationId: string; taskId: string; startedAt: number; endedAt?: number; duration: number; status: string; timer?: number }>();
const scopeOwners = new Map<string, ScopeOwner>();
const operations: WorkRecord[] = [];
let providerSequence = 0;
let operationSequence = 0;
let effectCount = 0;
let effectStarts = 0;
let effectCleanups = 0;
let pulse = 0;
let disposed = false;
let disposedRoots: readonly unknown[] = [];
const latest = () => operations.findLast((entry) => entry.status === "pending");
const activeProviders = () => [...providers.values()].filter((entry) => entry.status === "pending");
const operationResourceStatus = (entry: WorkRecord) => {
  try {
    return entry.execution?.resource("panel").status.status ?? "unstarted";
  } catch {
    return entry.status === "pending" ? "released" : `released/${entry.status}`;
  }
};
const readTaskInfo = (record: WorkRecord) => {
  if (!record.handle) return;
  const snapshot = record.handle.snapshot();
  record.taskInfo = {
    id: record.handle.id,
    status: snapshot.status,
    generation: snapshot.generation,
    started: [...snapshot.started],
    completed: [...snapshot.completed],
    reused: [...snapshot.reused],
  };
};

function delayFor(request: Request, taskId: string, multiplier: number, signal: AbortSignal): Promise<void> {
  const id = `provider-${++providerSequence}`;
  const duration = Math.max(120, Math.round(request.delay * multiplier));
  const record: { id: string; operationId: string; taskId: string; startedAt: number; endedAt?: number; duration: number; status: string; timer?: number } = { id, operationId: request.id, taskId, startedAt: Date.now(), duration, status: "pending" };
  providers.set(id, record);
  return new Promise((resolve, reject) => {
    const finish = (status: "completed" | "aborted") => {
      if (record.status !== "pending") return;
      record.status = status;
      record.endedAt = Date.now();
      record.timer = undefined;
      signal.removeEventListener("abort", onAbort);
      if (status === "completed") resolve();
      else reject(signal.reason ?? new DOMException("Task cancelled", "AbortError"));
      pruneProviders();
    };
    const onAbort = () => {
      if (record.timer !== undefined) window.clearTimeout(record.timer);
      finish("aborted");
    };
    record.timer = window.setTimeout(() => finish("completed"), duration);
    signal.addEventListener("abort", onAbort, { once: true });
    if (signal.aborted) onAbort();
  });
}

function pruneProviders() {
  const keep = new Set(activeProviders().map((entry) => entry.id));
  for (const [id, provider] of providers) {
    if (!keep.has(id) && Date.now() - provider.startedAt > 12_000) providers.delete(id);
  }
  while (operations.length > 12) {
    const settledIndex = operations.findIndex((entry) => entry.status !== "pending");
    if (settledIndex < 0) break;
    operations.splice(settledIndex, 1);
  }
}

function beginRequestScope(scopeId: string, record: WorkRecord, label: string) {
  requestStore.beginTransition(scopeId, record.scopeRoots);
  scopeOwners.set(scopeId, { operationId: record.id, roots: record.scopeRoots });
  requestStore.dispatch({
    type: "append",
    request: { operationId: record.id, label, lane: record.lane },
  }, { kind: "transition", transitionId: scopeId });
}

function finishRequestScope(scopeId: string, removeOwnRequest: boolean, releaseParticipants: boolean) {
  const owner = scopeOwners.get(scopeId);
  if (!owner) return;
  if (removeOwnRequest) {
    requestStore.dispatch({ type: "remove", operationId: owner.operationId });
  }
  if (requestStore.hasTransition(scopeId)) {
    if (releaseParticipants) {
      const registered = requestStore.transitionRoots(scopeId);
      for (const rootId of registered) requestStore.releaseTransition(scopeId, rootId);
    }
    requestStore.finishTransition(scopeId);
  }
  scopeOwners.delete(scopeId);
}

const taskGraph = [
  asyncTask("profile", async (values, signal) => {
    const request = values.get("$request") as Request;
    await delayFor(request, "profile", 0.56, signal);
    return `${request.label} · Mira Chen`;
  }),
  asyncTask("catalog", async (values, signal) => {
    const request = values.get("$request") as Request;
    await delayFor(request, "catalog", 0.72, signal);
    return `${request.label} · 24 saved notes`;
  }),
  asyncTask("search", async (values, signal) => {
    const request = values.get("$request") as Request;
    const query = String(values.get("$query") ?? "");
    await delayFor(request, "search", 1, signal);
    if (request.fail) throw new Error(`${request.label} intentionally failed during search`);
    return { query, hits: query.trim() ? Math.max(1, query.length * 3) : 0, label: `Search “${query || "everything"}”` } satisfies SearchResult;
  }),
  asyncTask("panel", async (values) => {
    const profile = values.get("profile") as string;
    const catalog = values.get("catalog") as string;
    const search = values.get("search") as SearchResult;
    return { profile, catalog, search, assembledAt: Date.now() } satisfies PanelModel;
  }),
] as const;

function ResourcePanel({ resource, lane }: { resource: any; lane: string }) {
  const model = use(resource) as PanelModel;
  return <section className="result-card" data-panel-lane={lane}>
    <div className="result-top"><span className="eyebrow">GROUPED RESULT</span><span className="ready-dot">READY</span></div>
    <h3>{model.search.label}</h3>
    <p>{model.profile}</p><p>{model.catalog}</p>
    <div className="hit-count"><strong>{model.search.hits}</strong><span>matching passages</span></div>
    <small>Panel assembled after profile + catalog + search resolved.</small>
  </section>;
}

function TaskError({ reason }: { reason: unknown }) {
  const detail = (reason as { reason?: unknown })?.reason ?? reason;
  const message = detail instanceof Error ? detail.message : String(detail ?? "Task failed");
  return <section className="error-card"><span className="eyebrow">TASK ERROR</span><p>{message}</p><small>Retry builds a new operation; the failed operation’s optimistic likes were compensated.</small><button className="retry-button" onClick={() => startWorkload(900, "Local retry")}>Retry this result</button></section>;
}

function RootProjection({ rootId, resource }: { rootId: string; resource?: any }) {
  useEffect(() => {
    effectCount++;
    effectStarts++;
    return () => { effectCount--; effectCleanups++; };
  });
  const query = use(queryStore) as string;
  const score = use(scoreStore) as number;
  const feed = use(feedStore) as ReturnType<typeof feedStore.getState>;
  const requestState = use(requestStore) as TaskRequestState;
  const projectedRequest = requestState.requests.findLast((request) =>
    request.lane === "main + fork" || rootId.endsWith("fork")
  );
  const seed = feed.items.find((item) => item.id === "seed-1")!;
  const pendingWork = operations.filter((entry) => entry.status === "pending");
  // Store subscriptions re-render native owners; this lightweight state tick is
  // also refreshed by the ledger pulse to expose task snapshots as they evolve.
  const now = use(clock) as number;
  void now;
  return <div className="root-surface" data-native-root={rootId}>
    <div className="root-heading"><div><span className="eyebrow">{rootId.endsWith("fork") ? "FORK ROOT" : "MAIN ROOT"}</span><h2>{rootId.endsWith("fork") ? "Sidecar view" : "Workspace view"}</h2><small className="projected-request">{projectedRequest ? `${projectedRequest.label} · ${projectedRequest.lane}` : "No projected request"}</small></div><span className="root-live">LIVE</span></div>
    <div className="interactive-row"><label>Live query<input value={query} onInput={(event: Event) => queryStore.dispatch((event.target as HTMLInputElement).value)} /></label><div className="score"><span>Urgent score</span><button onClick={() => scoreStore.dispatch((value) => value + 1)}>+ {score}</button></div></div>
    <div className="draft-row"><label>Local draft<input defaultValue={rootId.endsWith("fork") ? "Sidecar draft stays here" : "Draft stays editable while work runs"} /></label><span>Editing stays outside the resource boundary.</span></div>
    <div className="boundary-label"><span>RESOURCE BOUNDARY</span><span>{pendingWork.length ? `${pendingWork.length} workload${pendingWork.length === 1 ? "" : "s"} preparing` : "latest grouped read"}</span></div>
    {resource ? <Suspense fallback={<div className="fallback-card"><div className="spinner"/><div><strong>Preparing grouped result</strong><span>Profile, catalog, and search settle independently.</span></div></div>} error={(reason: unknown) => <TaskError reason={reason} />}><ResourcePanel resource={resource} lane={rootId} /></Suspense> : <div className="fallback-card idle"><div className="idle-mark">○</div><div><strong>Run a task graph</strong><span>Both roots share the live query and independent profile/catalog work.</span></div></div>}
    <div className="feed-card"><div className="feed-title"><span className="eyebrow">OPTIMISTIC FEED</span><span className="like-count">♥ {optimisticLikeCount(seed)}</span></div><p>{seed.text}</p><small>{seed.pendingLikeOperationIds.length ? `${seed.pendingLikeOperationIds.length} pending like contribution${seed.pendingLikeOperationIds.length === 1 ? "" : "s"}` : "confirmed count plus operation-owned pending likes"}</small></div>
    <div className="root-foot"><span>{pendingWork.length} shared/fork operation(s) pending</span><span>clock sample {new Date(now).toLocaleTimeString()}</span></div>
  </div>;
}

function Workbench() {
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    effectCount++;
    effectStarts++;
    const timer = window.setInterval(() => {
      pulse++;
      clock.dispatch(Date.now());
      for (const entry of operations) readTaskInfo(entry);
      setRevision((current) => current + 1);
    }, 80);
    return () => {
      window.clearInterval(timer);
      effectCount--;
      effectCleanups++;
    };
  });
  void revision;
  const launch = (delay: number, label: string) => startWorkload(delay, label);
  const cancelLatest = () => latest()?.handle?.cancel("Cancelled by user");
  const query = use(queryStore) as string;
  const feed = use(feedStore) as ReturnType<typeof feedStore.getState>;
  const failNext = use(failNextStore) as boolean;
  return <main className="workbench">
    <header className="hero"><div><span className="eyebrow">NATIVE TASK TRANSITIONS / 04</span><h1>Work stays concurrent.<br/><em>Results arrive together.</em></h1><p>Independent task resources feed a grouped publication across two roots. Live query changes restart search while completed profile and catalog work can be reused.</p></div><div className="hero-stat"><span>ROOTS</span><strong>02</strong><small>one shared query</small></div></header>
    <section className="control-strip"><div className="control-copy"><span className="eyebrow">START OVERLAPPING WORK</span><strong>Each run queues a main + fork group and a fork-only result.</strong><small>Duration controls each independent provider timer.</small></div><div className="button-row"><button onClick={() => launch(600, "Quick refresh")}>Quick <small>600 ms</small></button><button onClick={() => launch(1200, "Steady refresh")}>Steady <small>1,200 ms</small></button><button onClick={() => launch(1800, "Deep refresh")}>Deep <small>1,800 ms</small></button><button className="quiet-button" onClick={() => failNextStore.dispatch(true)}>{failNext ? "Failure armed" : "Fail next"}</button><button className="quiet-button" onClick={cancelLatest} disabled={!latest()}>Cancel latest</button></div></section>
    <section className="roots-grid">{ROOTS.map((rootId) => <div className="root-slot" data-root-mount={rootId} key={rootId} />)}</section>
    <section className="ledger"><div className="section-head"><div><span className="eyebrow">OPERATION LEDGER</span><h2>Task and domain ownership</h2></div><span className="pulse">PULSE {pulse}</span></div><div className="ledger-grid"><div className="ledger-panel"><div className="panel-head"><strong>Queue operations</strong><span>{operations.filter((entry) => entry.status === "pending").length} active</span></div>{operations.slice(-7).reverse().map((entry) => <div className="operation-row" key={entry.id}><div><strong>{entry.lane}</strong><small>{entry.id} · {entry.duration} ms · likes {entry.likeIds.join(" / ")}</small><small className="task-line">{entry.taskInfo.status} · resource {operationResourceStatus(entry)} · g{entry.taskInfo.generation} · start {entry.taskInfo.started.join(",") || "—"} · done {entry.taskInfo.completed.join(",") || "—"} · reused {entry.taskInfo.reused.join(",") || "—"}</small></div><div className={`status-pill ${entry.status}`}>{entry.status}<small>{Math.round(((entry.endedAt ?? Date.now()) - entry.startedAt))} ms</small></div><button className="row-cancel" disabled={entry.status !== "pending"} onClick={() => entry.handle?.cancel("Cancelled from operation row")}>Cancel</button></div>)}</div><div className="ledger-panel"><div className="panel-head"><strong>Provider timers</strong><span>{activeProviders().length} active</span></div><div className="provider-list">{[...providers.values()].slice(-8).reverse().map((entry) => <div className="provider-row" key={entry.id}><span className={entry.status === "pending" ? "provider-dot active" : "provider-dot"}/><div><strong>{entry.taskId}</strong><small>{entry.operationId} · {entry.status}</small></div><span>{entry.duration} ms</span></div>)}</div><div className="ownership-note"><b>Caller-owned optimistic actions</b><p>Each queue op owns two like IDs on the same seed. Success confirms one and compensates one simulated rejection; cancel/error compensates only that op’s pending IDs.</p></div></div></div></section>
    <footer className="footer"><span>Native authored TSX · runtime resource discovery · grouped root publication</span><span>Feed version {feedStore.version} · query version {queryStore.version} · score {scoreStore.getState()} · effects {effectCount} active / {effectStarts} started / {effectCleanups} cleaned</span></footer>
  </main>;
}

function startWorkload(delay: number, label: string) {
  if (disposed || operations.filter((entry) => entry.status === "pending").length + 2 > 6) return;
  const serial = ++operationSequence;
  const id = `run-${serial}`;
  const fail = failNextStore.getState();
  if (fail) failNextStore.dispatch(false);
  const feedIds = [`${id}-like-confirm`, `${id}-like-reject`] as const;
  optimisticFeedActions.beginLike(feedStore, feedIds[0], "seed-1");
  optimisticFeedActions.beginLike(feedStore, feedIds[1], "seed-1");
  const sharedScope = `${id}-shared-scope`;
  const shared = makeRecord(`${id}-shared`, "main + fork", delay, feedIds, sharedScope, ROOTS);
  beginRequestScope(shared.scopeId, shared, label);
  let sharedExecution: NativeTaskExecution<any> | undefined;
  try {
    shared.handle = queue.enqueue(taskGraph, [
      { root: roots.get(ROOTS[0])!, buildTree: (execution) => { sharedExecution = execution; return rootTree(execution, ROOTS[0]); } },
      { root: roots.get(ROOTS[1])!, buildTree: (execution) => rootTree(execution, ROOTS[1]) },
    ], {
      id: shared.id,
      renderPreparation: "repeatable",
      inputs: { "$request": { id, delay, label, fail } satisfies Request },
      liveInputs: { "$query": queryStore },
      transitions: [shared.scopeId],
      finishTransitions: true,
      maxConcurrency: 3,
      onSettled: (resolution) => settleDomain(shared, resolution.status, sharedExecution, feedIds),
    });
  } catch {
    settleDomain(shared, "failed", sharedExecution, feedIds);
  }
  const forkDelay = Math.round(delay * 0.7);
  const forkLikes = [`${id}-fork-like-confirm`, `${id}-fork-like-reject`] as const;
  optimisticFeedActions.beginLike(feedStore, forkLikes[0], "seed-1");
  optimisticFeedActions.beginLike(feedStore, forkLikes[1], "seed-1");
  const forkScope = `${id}-fork-only-scope`;
  const fork = makeRecord(`${id}-fork-only`, "fork-only", forkDelay, forkLikes, forkScope, [ROOTS[1]]);
  beginRequestScope(fork.scopeId, fork, `${label} sidecar`);
  try {
    fork.handle = queue.enqueue(taskGraph, [{
      root: roots.get(ROOTS[1])!,
      buildTree: (execution) => { fork.execution = execution; return rootTree(execution, ROOTS[1]); },
    }], {
      id: fork.id,
      renderPreparation: "repeatable",
      inputs: { "$request": { id: `${id}-fork`, delay: forkDelay, label: `${label} sidecar`, fail } satisfies Request },
      liveInputs: { "$query": queryStore },
      transitions: [fork.scopeId],
      finishTransitions: true,
      maxConcurrency: 3,
      onSettled: (resolution) => settleDomain(fork, resolution.status, fork.execution, fork.likeIds),
    });
  } catch {
    settleDomain(fork, "failed", fork.execution, fork.likeIds);
  }
  shared.execution = sharedExecution;
}

function makeRecord(id: string, lane: string, duration: number, likeIds: readonly [string, string], scopeId: string, scopeRoots: readonly string[]): WorkRecord {
  const record: WorkRecord = {
    id, lane, duration, startedAt: Date.now(), status: "pending",
    taskInfo: { id, status: "pending", generation: 0, started: [], completed: [], reused: [] },
    likeIds: [...likeIds], scopeId, scopeRoots: [...scopeRoots], settled: false,
  };
  operations.push(record);
  return record;
}

function settleDomain(record: WorkRecord, status: string, execution: NativeTaskExecution<any> | undefined, likeIds: readonly [string, string]) {
  if (record.settled) return;
  record.settled = true;
  record.execution = execution;
  readTaskInfo(record);
  let fulfilled = false;
  if (status === "committed" && execution) {
    try {
      fulfilled = execution.resource("panel").status.status === "fulfilled";
    } catch {
      // If a host already disposed this execution, keep the domain rollback local.
    }
  }
  if (status === "committed" && fulfilled) {
    optimisticFeedActions.confirmLike(feedStore, likeIds[0], `receipt-${record.id}`);
    // A second contribution intentionally models a server rejection.
    optimisticFeedActions.compensate(feedStore, likeIds[1]);
    record.status = "committed";
    finishRequestScope(record.scopeId, false, false);
  } else {
    optimisticFeedActions.compensate(feedStore, likeIds[0]);
    optimisticFeedActions.compensate(feedStore, likeIds[1]);
    record.status = status === "cancelled" ? "cancelled" : "failed";
    finishRequestScope(record.scopeId, true, true);
  }
  record.endedAt = Date.now();
  pruneProviders();
}

function rootTree(execution: NativeTaskExecution<any>, rootId: string) {
  return <RootProjection rootId={rootId} resource={execution.resource("panel")} />;
}

const appRoot = createDOMRoot(document.querySelector<HTMLElement>("#app")!, { world, rootId: "native-task-workbench" });
appRoot.mount(<Workbench />);
// The workbench first commits the shell and mount slots, then the independent
// native roots attach to those slots.
for (const rootId of ROOTS) {
  const mount = document.querySelector<HTMLElement>(`[data-root-mount="${rootId}"]`);
  if (!mount) throw new Error(`Workbench did not create root mount ${rootId}`);
  const root = createDOMRoot(mount, { world, rootId });
  roots.set(rootId, root);
  root.mount(<RootProjection rootId={rootId} />);
}

function disposeDemo() {
  if (disposed) return;
  disposed = true;
  window.removeEventListener("pagehide", disposeDemo);
  queue.dispose();
  for (const scopeId of [...scopeOwners.keys()]) finishRequestScope(scopeId, true, true);
  if (!appRoot.diagnostics().disposed) appRoot.dispose();
  for (const root of roots.values()) if (!root.diagnostics().disposed) root.dispose();
  disposedRoots = [...roots.values()].map((root) => ({ ...root.diagnostics(), rootId: root.rootId }));
  roots.clear();
  for (const entry of activeProviders()) if (entry.timer !== undefined) window.clearTimeout(entry.timer);
  providers.clear();
  operations.length = 0;
  for (const rootId of ROOTS) {
    queryStore.detachRoot(rootId);
    requestStore.detachRoot(rootId);
    feedStore.detachRoot(rootId);
    scoreStore.detachRoot(rootId);
    clock.detachRoot(rootId);
  }
  for (const store of [queryStore, feedStore, failNextStore]) store.detachRoot(appRoot.rootId);
  if (window.__nativeTaskTransitionDiagnostics === diagnostics) delete window.__nativeTaskTransitionDiagnostics;
}
window.addEventListener("pagehide", disposeDemo, { once: true });

const diagnostics = Object.freeze({ snapshot: () => Object.freeze({
  disposed,
  pulse,
  roots: Object.freeze([...disposedRoots, ...[...roots.values(), appRoot].map((root) => Object.freeze({ ...root.diagnostics(), rootId: root.rootId, publicationVersion: root.publicationVersion }))]),
  stores: Object.freeze({ query: { version: queryStore.version, value: queryStore.getState(), ...queryStore.diagnostics() }, requests: { version: requestStore.version, value: requestStore.getState(), projectedLabels: Object.freeze(requestStore.getState().requests.map((request) => request.label)), activeScopes: scopeOwners.size, ...requestStore.diagnostics() }, failNext: { value: failNextStore.getState(), version: failNextStore.version, ...failNextStore.diagnostics() }, score: { version: scoreStore.version, value: scoreStore.getState(), ...scoreStore.diagnostics() }, feed: { version: feedStore.version, state: feedStore.getState(), ...feedStore.diagnostics() }, clock: { version: clock.version, ...clock.diagnostics() } }),
  operations: Object.freeze(operations.map((entry) => Object.freeze({ id: entry.id, lane: entry.lane, scopeId: entry.scopeId, scopeRoots: entry.scopeRoots, status: entry.status, resourceStatus: operationResourceStatus(entry), elapsedMs: (entry.endedAt ?? Date.now()) - entry.startedAt, task: entry.handle?.snapshot() ?? entry.taskInfo, likeIds: entry.likeIds }))),
  providers: Object.freeze([...providers.values()].map((entry) => Object.freeze({ ...entry, elapsedMs: (entry.endedAt ?? Date.now()) - entry.startedAt }))),
  activeProviderTimers: activeProviders().length,
  effects: Object.freeze({ active: effectCount, started: effectStarts, cleanups: effectCleanups }),
}) });
window.__nativeTaskTransitionDiagnostics = diagnostics;
if (import.meta.hot) {
  import.meta.hot.accept();
  import.meta.hot.dispose(disposeDemo);
}

declare global {
  interface ImportMeta { hot?: { accept(): void; dispose(callback: () => void): void } }
  interface Window { __nativeTaskTransitionDiagnostics?: { snapshot(): Readonly<Record<string, unknown>> } }
}
