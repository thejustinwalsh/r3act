// @native-ui
/** @jsxRuntime classic @jsx jsx */
import {
  createDOMRoot,
  createStore,
  createWorld,
  jsx,
  NativeRootWorkQueue,
  use,
  useEffect,
  useState,
} from "../native_runtime_api.ts";

type OperationStatus =
  | "pending"
  | "ready"
  | "committed"
  | "cancelled"
  | "failed";
type Operation = {
  id: string;
  label: string;
  scope: "main + fork" | "fork";
  rootIds: readonly string[];
  delta: number;
  duration: number;
  startedAt: number;
  endedAt?: number;
  status: OperationStatus;
};
type QueueState = { now: number; operations: readonly Operation[] };
type TransitionStoreScope = {
  hasTransition(transitionId: string): boolean;
  transitionRoots(transitionId: string): readonly string[];
  releaseTransition(transitionId: string, rootId: string): void;
  finishTransition(transitionId: string): void;
};

const MAIN_ROOT_ID = "native-queue-main";
const FORK_ROOT_ID = "native-queue-fork";
const rootIds = [MAIN_ROOT_ID, FORK_ROOT_ID] as const;
const sharedWorld = createWorld();
const counter = createStore(0);
const forkCounter = createStore(0);
const queueState = createStore<QueueState>({ now: Date.now(), operations: [] });
const queue = new NativeRootWorkQueue();
const activeOperations = new Map<string, {
  handle: ReturnType<NativeRootWorkQueue["enqueue"]>;
  timer: number;
  transitionId: string;
  store: TransitionStoreScope;
  rootIds: readonly string[];
  resourceId: string;
}>();
const activeTransitionScopes = new Map<
  string,
  { store: TransitionStoreScope; rootIds: readonly string[] }
>();
let nextBatch = 1;
let nextTransition = 1;
let disposed = false;
let clockTimer = 0;
let pagehideListener: (() => void) | null = null;
let mainRoot: ReturnType<typeof createDOMRoot>;
let forkRoot: ReturnType<typeof createDOMRoot>;

declare global {
  interface ImportMeta {
    hot?: { accept(): void; dispose(callback: () => void): void };
  }
  interface Window {
    __nativeRootQueueDemoDiagnostics?: {
      snapshot(): Readonly<Record<string, unknown>>;
    };
  }
}

function updateOperation(
  id: string,
  update: (operation: Operation) => Operation,
) {
  queueState.dispatch((state) => ({
    ...state,
    operations: state.operations.map((operation) => {
      if (operation.id !== id) return operation;
      const next = update(operation);
      return next.status !== "pending" && next.status !== "ready"
        ? { ...next, endedAt: next.endedAt ?? Date.now() }
        : next;
    }),
  }));
}

function releaseTransition(
  transitionId: string,
  store: TransitionStoreScope,
  participants: readonly string[],
) {
  activeTransitionScopes.delete(transitionId);
  if (!store.hasTransition(transitionId)) return;
  const liveRoots = store.transitionRoots(transitionId);
  for (const rootId of participants) {
    if (liveRoots.includes(rootId)) {
      store.releaseTransition(transitionId, rootId);
    }
  }
  store.finishTransition(transitionId);
}

function cancelOperation(id: string) {
  const active = activeOperations.get(id);
  if (!active) return;
  window.clearTimeout(active.timer);
  activeOperations.delete(id);
  active.handle.cancel("Cancelled from the workbench");
  releaseTransition(active.transitionId, active.store, active.rootIds);
  updateOperation(id, (operation) => ({ ...operation, status: "cancelled" }));
}

function startBatch() {
  if (disposed) return;
  const batch = nextBatch++;
  const now = Date.now();
  const specs = [
    {
      label: "Shared group · slower resource",
      suffix: "group-slow",
      roots: rootIds,
      scope: "main + fork" as const,
      delta: 100,
      duration: 1800,
    },
    {
      label: "Fork only · middle resource",
      suffix: "fork-only",
      roots: [FORK_ROOT_ID] as const,
      scope: "fork" as const,
      delta: 10,
      duration: 1000,
    },
    {
      label: "Shared group · fast resource",
      suffix: "group-fast",
      roots: rootIds,
      scope: "main + fork" as const,
      delta: 1000,
      duration: 500,
    },
  ];
  const operations = specs.map((spec) => ({
    ...spec,
    id: `batch-${batch}-${spec.suffix}`,
    rootIds: spec.roots,
    startedAt: now,
    status: "pending" as OperationStatus,
  }));

  queueState.dispatch((state) => {
    const settled = state.operations.filter((operation) =>
      operation.status !== "pending" && operation.status !== "ready"
    );
    const inFlight = state.operations.filter((operation) =>
      operation.status === "pending" || operation.status === "ready"
    );
    return {
      ...state,
      now,
      operations: [...inFlight, ...settled.slice(-9), ...operations],
    };
  });
  for (const operation of operations) {
    const transitionId = `native-queue-transition-${nextTransition++}`;
    const resourceId = `${operation.id}-resource`;
    const store = operation.scope === "fork" ? forkCounter : counter;
    store.beginTransition(transitionId, operation.rootIds);
    activeTransitionScopes.set(transitionId, {
      store,
      rootIds: operation.rootIds,
    });
    (store as typeof counter).dispatch(
      (value: number) => value + operation.delta,
      { kind: "transition", transitionId },
    );
    const participatingRoots = operation.scope === "main + fork"
      ? [mainRoot, forkRoot]
      : [forkRoot];
    const handle = queue.enqueue({
      id: operation.id,
      renderPreparation: "repeatable",
      roots: participatingRoots.map((root) => ({
        root,
        tree: root.rootId === MAIN_ROOT_ID
          ? <Workbench />
          : <RootProjection fork={true} />,
      })),
      pending: [resourceId],
      transitions: [transitionId],
      finishTransitions: true,
      onSettled(resolution) {
        const status = resolution.status === "committed"
          ? "committed"
          : resolution.status === "cancelled"
          ? "cancelled"
          : "failed";
        if (status !== "committed") {
          releaseTransition(transitionId, store, operation.rootIds);
        } else activeTransitionScopes.delete(transitionId);
        const active = activeOperations.get(operation.id);
        if (active) window.clearTimeout(active.timer);
        if (!disposed) {
          updateOperation(operation.id, (current) => ({ ...current, status }));
        }
        activeOperations.delete(operation.id);
      },
    });
    const timer = window.setTimeout(() => {
      activeOperations.delete(operation.id);
      updateOperation(
        operation.id,
        (current) => ({ ...current, status: "ready" }),
      );
      handle.resolve(resourceId);
    }, operation.duration);
    activeOperations.set(operation.id, {
      handle,
      timer,
      transitionId,
      store,
      rootIds: operation.rootIds,
      resourceId,
    });
  }
}

function RootProjection({ fork = false }: { fork?: boolean }) {
  const value = use(counter);
  const forkValue = fork ? use(forkCounter) : 0;
  const queueData = use(queueState);
  const [draft, setDraft] = useState(fork ? "Fork note" : "Main draft");
  const pendingCount =
    queueData.operations.filter((operation) =>
      operation.status === "pending" || operation.status === "ready"
    ).length;
  return (
    <section
      className={`root-panel${fork ? " fork-panel" : ""}`}
      data-root={fork ? FORK_ROOT_ID : MAIN_ROOT_ID}
    >
      <div className="panel-heading">
        <div>
          <p className="eyebrow">
            {fork ? "FORK ROOT" : "MAIN ROOT"}{" "}
            <span className="root-state">
              {pendingCount > 0 ? "· work in flight" : "· current publication"}
            </span>
          </p>
          <h2>{fork ? "Fork projection" : "Main projection"}</h2>
        </div>
        <span className="root-chip">{fork ? "fork" : "main"}</span>
      </div>
      <div className="value-line">
        <span>Committed store value</span>
        <output aria-label={`${fork ? "Fork" : "Main"} committed value`}>
          {value}
        </output>
      </div>
      {fork && (
        <div className="fork-value-line">
          <span>Fork-owned value</span>
          <output aria-label="Fork-owned committed value">{forkValue}</output>
        </div>
      )}
      <label className="draft-label">
        <span>{fork ? "Fork-local draft" : "Main-local draft"}</span>
        <input
          aria-label={`${fork ? "Fork" : "Main"} editable draft`}
          value={draft}
          onInput={(event: Event) =>
            setDraft((event.currentTarget as HTMLInputElement).value)}
        />
      </label>
      <div className="root-actions">
        <button
          className="urgent-button"
          onClick={() => counter.dispatch((previous) => previous + 1)}
        >
          Urgent +1
        </button>
        {fork && (
          <button
            className="local-button"
            onClick={() => forkCounter.dispatch((previous) => previous + 1)}
          >
            Fork local +1
          </button>
        )}
      </div>
      {!fork && (
        <p className="pending-note" aria-live="polite">
          Held transition actions stay out of this committed value until their
          root work publishes. Draft editing and urgent updates remain live.
        </p>
      )}
    </section>
  );
}

function OperationLedger() {
  const state = use(queueState);
  const active = state.operations.filter((operation) =>
    operation.status === "pending" || operation.status === "ready"
  );
  return (
    <section className="ledger-panel">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">PUBLICATION LEDGER</p>
          <h2>Resource readiness → root commit</h2>
        </div>
        <span className="count-chip">{active.length} active</span>
      </div>
      <p className="ledger-intro">
        Timers resolve independent resources; the queue publishes each root
        group when its work is ready. This is a local timing demo, not a network
        dependency graph.
      </p>
      {state.operations.length === 0
        ? (
          <div className="empty-ledger">
            <span className="empty-mark">↳</span>
            <span>Start a batch to watch three overlapping publications.</span>
          </div>
        )
        : (
          <div className="operation-list">
            {state.operations.map((operation) => {
              const elapsed = Math.max(
                0,
                Math.min(
                  operation.duration,
                  (operation.endedAt ?? state.now) - operation.startedAt,
                ),
              );
              const elapsedPercent = Math.round(
                elapsed / operation.duration * 100,
              );
              const ready = operation.status === "ready" ||
                operation.status === "committed";
              const label = operation.status === "committed"
                ? "Committed"
                : operation.status === "ready"
                ? "Ready · publishing"
                : operation.status === "cancelled"
                ? "Cancelled · action retained"
                : operation.status === "failed"
                ? "Failed"
                : "Waiting on resource";
              return (
                <article
                  className={`operation${ready ? " is-ready" : ""}${
                    operation.status === "cancelled" ? " is-cancelled" : ""
                  }`}
                  key={operation.id}
                >
                  <div className="operation-topline">
                    <span className="operation-name">{operation.label}</span>
                    <span className="operation-status">{label}</span>
                  </div>
                  <div className="operation-meta">
                    <span>{operation.scope}</span>
                    <span>+{operation.delta} · {operation.duration} ms</span>
                  </div>
                  <progress
                    aria-label={`${operation.label} elapsed`}
                    max={operation.duration}
                    value={elapsed}
                  />
                  <div className="operation-foot">
                    <span>
                      {ready
                        ? "Resource ready · 100%"
                        : operation.status === "cancelled"
                        ? `Timer cancelled at ${elapsedPercent}% · action retained`
                        : operation.status === "failed"
                        ? "Publication did not complete"
                        : `${elapsedPercent}% · ${elapsed} / ${operation.duration} ms elapsed`}
                    </span>
                    {operation.status === "pending" && (
                      <button
                        className="cancel-button"
                        onClick={() => cancelOperation(operation.id)}
                      >
                        Cancel wait
                      </button>
                    )}
                  </div>
                  {operation.status === "cancelled" && (
                    <p className="cancel-explainer">
                      Queue work was cancelled; its dispatched action was
                      retained and its store scope was explicitly finished. No
                      rollback was run.
                    </p>
                  )}
                </article>
              );
            })}
          </div>
        )}
      <div className="ledger-footer">
        <span className="legend">
          <i className="legend-ready" />Published / ready
        </span>
        <span className="legend">
          <i className="legend-pending" />Waiting · pending resource
        </span>
      </div>
      <p className="signature-note">
        <strong>Read the two signals:</strong>{" "}
        readiness belongs to each timer; the commit marker belongs to the
        participating root set. The fork-only row never waits for main.
      </p>
    </section>
  );
}

function Workbench() {
  useEffect(() => {
    clockTimer = window.setInterval(() => {
      if (disposed) return;
      queueState.dispatch((state) => ({ ...state, now: Date.now() }));
    }, 80);
    pagehideListener = () => disposeDemo();
    window.addEventListener("pagehide", pagehideListener, { once: true });
    return () => {
      if (pagehideListener) {
        window.removeEventListener("pagehide", pagehideListener);
      }
      pagehideListener = null;
      disposeDemo();
    };
  });
  return (
    <div className="workbench">
      <header className="page-heading">
        <div>
          <p className="eyebrow">NATIVE RUNTIME / PUBLICATION RESEARCH</p>
          <h1>Root work queue</h1>
        </div>
        <span className="version-tag">
          AUTHORED TSX <b>·</b> SHARED STORE
        </span>
      </header>
      <p className="lede">
        Watch independent resource timers feed one main root and one fork. A
        committed projection stays visible while each next tree is held.
      </p>
      <div className="main-layout">
        <div className="main-column">
          <RootProjection />
          <OperationLedger />
        </div>
        <aside className="control-rail">
          <div className="batch-card">
            <p className="eyebrow">CONTROL</p>
            <h2>Overlap three transitions</h2>
            <p>
              Start all resources together. Their local timers finish in reverse
              order: 500, 1,000, then 1,800 ms.
            </p>
            <button className="start-button" onClick={startBatch}>
              Start overlapping batch <span aria-hidden="true">↗</span>
            </button>
            <div className="batch-specs">
              <span>2 × main + fork</span>
              <span>1 × fork only</span>
              <span>3 distinct scopes</span>
            </div>
          </div>
          <div className="semantics-card">
            <p className="eyebrow">QUEUE SEMANTICS</p>
            <div className="semantic-row">
              <span className="semantic-dot mint" />
              <p>
                <strong>Committed</strong>
                <br />Current projection from a completed root publication.
              </p>
            </div>
            <div className="semantic-row">
              <span className="semantic-dot amber" />
              <p>
                <strong>Pending</strong>
                <br />Muted amber marks work whose resource timer has not
                resolved.
              </p>
            </div>
            <div className="semantic-row">
              <span className="semantic-dot slate" />
              <p>
                <strong>Cancel work</strong>
                <br />Cancels queue publication only; the action stays in the
                store.
              </p>
            </div>
          </div>
        </aside>
      </div>
      <footer className="page-footer">
        <span>Two DOM roots · one shared store · local component drafts</span>
        <span>Publication order follows readiness, not enqueue order.</span>
      </footer>
    </div>
  );
}

function disposeDemo() {
  if (disposed) return;
  disposed = true;
  if (pagehideListener) {
    window.removeEventListener("pagehide", pagehideListener);
  }
  pagehideListener = null;
  if (clockTimer !== 0) window.clearInterval(clockTimer);
  clockTimer = 0;
  for (const active of activeOperations.values()) {
    window.clearTimeout(active.timer);
    active.handle.cancel("Demo disposed");
    releaseTransition(active.transitionId, active.store, active.rootIds);
  }
  activeOperations.clear();
  for (const [transitionId, scope] of activeTransitionScopes) {
    releaseTransition(transitionId, scope.store, scope.rootIds);
  }
  activeTransitionScopes.clear();
  queue.dispose();
  if (mainRoot && !mainRoot.diagnostics().disposed) mainRoot.dispose();
  if (forkRoot && !forkRoot.diagnostics().disposed) forkRoot.dispose();
  if (window.__nativeRootQueueDemoDiagnostics === diagnosticsFacade) {
    delete window.__nativeRootQueueDemoDiagnostics;
  }
}

mainRoot = createDOMRoot(document.querySelector("#app")!, {
  world: sharedWorld,
  rootId: MAIN_ROOT_ID,
});
forkRoot = createDOMRoot(document.querySelector("#fork-app")!, {
  world: sharedWorld,
  rootId: FORK_ROOT_ID,
});
mainRoot.mount(<Workbench />);
forkRoot.mount(<RootProjection fork />);

const diagnosticsFacade = Object.freeze({
  snapshot: () =>
    Object.freeze({
      mainRoot: Object.freeze({
        ...mainRoot.diagnostics(),
        rootId: mainRoot.rootId,
        publicationVersion: mainRoot.publicationVersion,
      }),
      forkRoot: Object.freeze({
        ...forkRoot.diagnostics(),
        rootId: forkRoot.rootId,
        publicationVersion: forkRoot.publicationVersion,
      }),
      store: Object.freeze({
        value: counter.getState(),
        version: counter.version,
        ...counter.diagnostics(),
      }),
      forkStore: Object.freeze({
        value: forkCounter.getState(),
        version: forkCounter.version,
        ...forkCounter.diagnostics(),
      }),
      queueStore: Object.freeze({
        version: queueState.version,
        ...queueState.diagnostics(),
      }),
      transitions: Object.freeze(activeTransitionScopes.size),
      operations: Object.freeze(
        queueState.getState().operations.map((
          { id, status, scope, rootIds, duration, startedAt, endedAt },
        ) => ({
          id,
          status,
          scope,
          rootIds,
          duration,
          elapsedMs: Math.max(
            0,
            Math.min(
              duration,
              (endedAt ?? queueState.getState().now) - startedAt,
            ),
          ),
        })),
      ),
      storeRootVersions: Object.freeze({
        sharedMain: counter.getRootVersion(MAIN_ROOT_ID),
        sharedFork: counter.getRootVersion(FORK_ROOT_ID),
        forkOwnedFork: forkCounter.getRootVersion(FORK_ROOT_ID),
      }),
      transitionScopes: Object.freeze(
        [...activeTransitionScopes].map(([transitionId, scope]) => ({
          transitionId,
          store: scope.store === forkCounter ? "fork-owned" : "shared",
          rootIds: scope.rootIds,
        })),
      ),
      activeResourceTimers: activeOperations.size,
      clockTimerActive: clockTimer !== 0,
      disposed,
    }),
});
Object.defineProperty(window, "__nativeRootQueueDemoDiagnostics", {
  configurable: true,
  value: diagnosticsFacade,
});

if (import.meta.hot) {
  import.meta.hot.accept();
  import.meta.hot.dispose(disposeDemo);
}
