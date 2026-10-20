// @native-ui
/** @jsxRuntime classic @jsx jsx */
import {
  type AsyncResource,
  AsyncResourceTable,
  createDOMRoot,
  createStore,
  createWorld,
  jsx,
  NativeRootWorkQueue,
  Suspense,
  use,
  useEffect,
  useState,
} from "../native_runtime_api.ts";

const ROOT_IDS = [
  "resource-boundary-main",
  "resource-boundary-sidecar",
] as const;
type RequestRecord = {
  readonly id: string;
  readonly label: string;
  readonly startedAt: number;
  readonly duration: number;
  readonly timer: number;
  readonly resource: AsyncResource<string>;
  readonly cancelProvider: () => void;
};
type Operation = {
  readonly id: string;
  readonly transitionId: string;
  readonly providerIds: readonly string[];
  readonly startedAt: number;
  readonly duration: number;
  readonly endedAt?: number;
  readonly status:
    | "pending"
    | "committed"
    | "rejected"
    | "cancelled"
    | "failed";
};
type WorkbenchState = { readonly operations: readonly Operation[] };
type TransitionStore = {
  beginTransition(id: string, roots: readonly string[]): void;
  detachRoot(rootId: string): void;
  hasTransition(id: string): boolean;
  transitionRoots(id: string): readonly string[];
  releaseTransition(id: string, rootId: string): void;
  finishTransition(id: string): void;
};

const world = createWorld();
const queue = new NativeRootWorkQueue();
const resourceTable = new AsyncResourceTable();
const profileRequest = createStore<AsyncResource<string>>(
  resourceTable.from(Promise.resolve("")),
);
const briefRequest = createStore<AsyncResource<string>>(
  resourceTable.from(Promise.resolve("")),
);
const urgentScore = createStore(18);
const workbench = createStore<WorkbenchState>({ operations: [] });
const clock = createStore(Date.now());
const roots = new Map<string, ReturnType<typeof createDOMRoot>>();
const stores: readonly TransitionStore[] = [profileRequest, briefRequest];
const providers = new Map<string, RequestRecord>();
const providerTimers = new Set<number>();
const activeWork = new Map<
  string,
  ReturnType<NativeRootWorkQueue["enqueue"]>
>();
const ownedScopes = new Set<string>();
let transitionSequence = 1;
let requestSequence = 1;
let pulseTimer = 0;
let disposed = false;
let disposedRoots: readonly Readonly<Record<string, unknown>>[] = [];
let activeEffects = 0;
let effectStarts = 0;
let effectCleanups = 0;
let pagehideHandler: (() => void) | null = null;

declare global {
  interface ImportMeta {
    hot?: { accept(): void; dispose(callback: () => void): void };
  }
  interface Window {
    __nativeResourceBoundaryDiagnostics?: {
      snapshot(): Readonly<Record<string, unknown>>;
    };
  }
}

function provider(
  label: string,
  duration: number,
  value: string,
  reject = false,
) {
  let resolve!: (value: string) => void;
  let fail!: (reason: unknown) => void;
  const promise = new Promise<string>((yes, no) => {
    resolve = yes;
    fail = no;
  });
  const resource = resourceTable.from(promise);
  const startedAt = Date.now();
  const timer = window.setTimeout(() => {
    providerTimers.delete(timer);
    if (reject) fail(new Error(`${label} could not be loaded`));
    else resolve(value);
  }, duration);
  providerTimers.add(timer);
  const record: RequestRecord = {
    id: `provider-${requestSequence++}`,
    label,
    startedAt,
    duration,
    timer,
    resource,
    cancelProvider() {
      if (!providerTimers.delete(timer)) return;
      window.clearTimeout(timer);
      // Provider cancellation belongs to this domain owner. The resource is
      // rejected so its one-shot lifecycle settles even after queue work stops.
      fail(
        new DOMException("Provider cancelled by the workbench", "AbortError"),
      );
    },
  };
  providers.set(record.id, record);
  return record;
}

// Startup owns these two providers. Their resources are installed in stores
// before rendering; component render never creates or starts provider work.
const initialProfile = provider(
  "Initial profile",
  620,
  "Mira Chen · Field notes",
);
const initialBrief = provider(
  "Initial brief",
  1120,
  "Three observations · 2 min read",
);
profileRequest.dispatch(initialProfile.resource);
briefRequest.dispatch(initialBrief.resource);

function setOperation(id: string, status: Operation["status"]) {
  workbench.dispatch((state) => ({
    ...state,
    operations: state.operations.map((operation) =>
      operation.id === id
        ? {
          ...operation,
          status,
          endedAt: status === "pending"
            ? operation.endedAt
            : operation.endedAt ?? Date.now(),
        }
        : operation
    ),
  }));
  pruneProviders();
}

function pruneProviders() {
  const activeProviderIds = new Set(
    workbench.getState().operations
      .filter((operation) => operation.status === "pending")
      .flatMap((operation) => operation.providerIds),
  );
  const recent = [...providers.keys()].slice(-6);
  for (const [id, record] of providers) {
    if (
      activeProviderIds.has(id) || recent.includes(id) ||
      providerTimers.has(record.timer)
    ) continue;
    if (record.resource.status.status !== "pending") providers.delete(id);
  }
}

function releaseDomainScope(
  transitionId: string,
  participantIds: readonly string[],
) {
  for (const store of stores) {
    if (!store.hasTransition(transitionId)) continue;
    const live = store.transitionRoots(transitionId);
    for (const rootId of participantIds) {
      if (live.includes(rootId)) store.releaseTransition(transitionId, rootId);
    }
    store.finishTransition(transitionId);
  }
  ownedScopes.delete(transitionId);
}

function startReplacement(kind: "normal" | "reject" = "normal") {
  if (
    disposed ||
    workbench.getState().operations.filter((operation) =>
        operation.status === "pending"
      ).length >= 3
  ) return;
  const sequence = requestSequence;
  const duration = kind === "reject" ? 1300 : 2100;
  // Provider creation is event-owned. The two independent resources settle
  // together here, but automatic boundary discovery also works for siblings
  // that settle at different times.
  const nextProfile = provider(
    `Profile revision ${sequence}`,
    duration,
    `Mira Chen · Revision ${sequence}`,
    kind === "reject",
  );
  const nextBrief = provider(
    `Brief revision ${sequence}`,
    Math.round(duration * 0.72),
    `Updated observations · revision ${sequence}`,
  );
  const operationId = `load-${sequence}`;
  const transitionId = `resource-refresh-${transitionSequence++}`;
  const startedAt = Date.now();
  const participantIds = [...ROOT_IDS];
  for (const store of stores) {
    store.beginTransition(transitionId, participantIds);
  }
  ownedScopes.add(transitionId);
  profileRequest.dispatch(nextProfile.resource, {
    kind: "transition",
    transitionId,
  });
  briefRequest.dispatch(nextBrief.resource, {
    kind: "transition",
    transitionId,
  });
  workbench.dispatch((state) => ({
    ...state,
    operations: [
      ...state.operations.filter((operation) => operation.status === "pending")
        .slice(-2),
      ...state.operations.filter((operation) => operation.status !== "pending")
        .slice(-5),
      {
        id: operationId,
        transitionId,
        providerIds: [nextProfile.id, nextBrief.id],
        startedAt,
        duration,
        status: "pending",
      },
    ],
  }));
  pruneProviders();

  const rootWork = [...roots.values()].map((root) => ({
    root,
    tree: <RootProjection rootId={root.rootId} />,
  }));
  try {
    const handle = queue.enqueue({
      id: operationId,
      renderPreparation: "repeatable",
      roots: rootWork,
      transitions: [transitionId],
      finishTransitions: true,
      onSettled(result) {
        const status = result.status === "committed"
          ? nextProfile.resource.status.status === "rejected"
            ? "rejected"
            : "committed"
          : result.status === "cancelled"
          ? "cancelled"
          : "failed";
        releaseDomainScope(transitionId, participantIds);
        activeWork.delete(operationId);
        if (!disposed) setOperation(operationId, status);
      },
    });
    activeWork.set(operationId, handle);
  } catch (error) {
    releaseDomainScope(transitionId, participantIds);
    setOperation(operationId, "failed");
    console.error("Could not queue the resource replacement", error);
  }
}

function cancelLatestWait() {
  const current = [...workbench.getState().operations].reverse().find((
    operation,
  ) => operation.status === "pending");
  if (!current) return;
  // Queue cancellation abandons root candidates. This page's domain layer
  // separately stops its provider timers and releases/finishes store scopes.
  activeWork.get(current.id)?.cancel("Cancelled by the workbench");
  activeWork.delete(current.id);
  for (const providerId of current.providerIds) {
    providers.get(providerId)?.cancelProvider();
  }
  releaseDomainScope(current.transitionId, ROOT_IDS);
  setOperation(current.id, "cancelled");
}

function ProfileRead() {
  const resource = use(profileRequest);
  const profile = use(resource);
  return (
    <div className="resource-line">
      <span>Profile</span>
      <strong>{profile}</strong>
    </div>
  );
}

function BriefRead() {
  const resource = use(briefRequest);
  const brief = use(resource);
  return (
    <div className="resource-line">
      <span>Field brief</span>
      <strong>{brief}</strong>
    </div>
  );
}

function RootProjection({ rootId }: { rootId: string }) {
  const isMain = rootId === ROOT_IDS[0];
  const score = use(urgentScore);
  const state = use(workbench);
  const [draft, setDraft] = useState(
    isMain ? "Keep this note" : "Sidecar note",
  );
  const pending = state.operations.some((operation) =>
    operation.status === "pending"
  );
  return (
    <section
      className={`root-panel${isMain ? "" : " sidecar-panel"}`}
      data-root={rootId}
    >
      <div className="panel-heading">
        <div>
          <p className="eyebrow">
            {isMain ? "MAIN ROOT" : "SIDECAR ROOT"}{" "}
            <span className="root-state">
              · {pending ? "replacement held" : "current publication"}
            </span>
          </p>
          <h2>{isMain ? "Research desk" : "Review mirror"}</h2>
        </div>
        <span className="root-chip">{isMain ? "main" : "sidecar"}</span>
      </div>
      <div className="score-line">
        <span>Urgent review score</span>
        <output
          aria-label={`${isMain ? "Main" : "Sidecar"} urgent review score`}
        >
          {score}
        </output>
        <button
          className="urgent-button"
          onClick={() => urgentScore.dispatch((value) => value + 1)}
        >
          Urgent +1
        </button>
      </div>
      <label className="draft-label">
        <span>{isMain ? "Working note" : "Sidecar note"}</span>
        <input
          aria-label={`${isMain ? "Main" : "Sidecar"} working note`}
          value={draft}
          onInput={(event: Event) =>
            setDraft((event.currentTarget as HTMLInputElement).value)}
        />
      </label>
      <Suspense
        fallback={
          <div className="resource-fallback" role="status">
            <span className="loader-mark" />Loading profile and field brief…
          </div>
        }
        error={(reason) => {
          const failure = reason instanceof Error && "reason" in reason
            ? (reason as Error & { reason: unknown }).reason
            : reason;
          return (
            <div className="resource-error" role="alert">
              <strong>Resource rejected</strong>
              <span>
                {failure instanceof Error ? failure.message : String(failure)}
              </span>
              <button onClick={() => startReplacement("normal")}>
                Retry with a new resource
              </button>
            </div>
          );
        }}
      >
        <div className="resource-stack">
          <ProfileRead />
          <BriefRead />
        </div>
      </Suspense>
      <p className="root-caption">
        Local draft and urgent score stay editable while the boundary
        replacement waits.
      </p>
    </section>
  );
}

function ResourceLedger() {
  const state = use(workbench);
  const now = use(clock);
  const pending = state.operations.filter((operation) =>
    operation.status === "pending"
  );
  return (
    <section className="ledger-panel">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">RESOURCE → ROOT PUBLICATION</p>
          <h2>Boundary work</h2>
        </div>
        <span className="count-chip">{pending.length} active</span>
      </div>
      <p className="ledger-intro">
        Each replacement creates two domain-owned resources. The queue discovers
        reads during candidate preparation and publishes both roots together
        after the boundary can reveal.
      </p>
      {state.operations.length === 0
        ? (
          <div className="empty-ledger">
            <span className="empty-mark">↳</span>
            <span>
              Start a replacement to watch the boundary hold both roots.
            </span>
          </div>
        )
        : (
          <div className="operation-list">
            {state.operations.map((operation) => {
              const elapsed = Math.max(
                0,
                Math.min(
                  operation.duration,
                  (operation.endedAt ?? now) - operation.startedAt,
                ),
              );
              const percent = operation.status === "committed" ||
                  operation.status === "rejected"
                ? 100
                : Math.round(elapsed / operation.duration * 100);
              const label = operation.status === "pending"
                ? "Waiting on resources"
                : operation.status === "committed"
                ? "Group published"
                : operation.status === "rejected"
                ? "Rejected · boundary rendered"
                : operation.status === "cancelled"
                ? "Cancelled · owners released"
                : "Queue failed";
              return (
                <article
                  className={`operation${
                    operation.status === "committed"
                      ? " is-ready"
                      : operation.status === "cancelled"
                      ? " is-cancelled"
                      : ""
                  }`}
                  key={operation.id}
                >
                  <div className="operation-topline">
                    <span className="operation-name">
                      {operation.id.replace("load-", "Replacement ")}
                    </span>
                    <span className="operation-status">{label}</span>
                  </div>
                  <div className="operation-meta">
                    <span>main + sidecar</span>
                    <span>{operation.duration} ms domain timer</span>
                  </div>
                  <progress
                    aria-label={`${operation.id} elapsed`}
                    max={operation.duration}
                    value={elapsed}
                  />
                  <div className="operation-foot">
                    <span>
                      {operation.status === "committed"
                        ? "Grouped root publication complete"
                        : operation.status === "rejected"
                        ? "Local error branch published to both roots"
                        : operation.status === "cancelled"
                        ? "Queue, provider timers, and store scopes released"
                        : `${percent}% · ${elapsed} / ${operation.duration} ms elapsed`}
                    </span>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      <div className="ledger-footer">
        <span className="legend">
          <i className="legend-ready" />Published
        </span>
        <span className="legend">
          <i className="legend-pending" />Waiting · resource pending
        </span>
      </div>
      <p className="signature-note">
        <strong>Ownership is visible:</strong>{" "}
        cancellation stops the wait and its provider timers, then finishes its
        store scopes. Dispatched replacements remain in the store; retry creates
        a new request. Later replacements can make an older provider unnecessary
        for publication.
      </p>
    </section>
  );
}

function Workbench() {
  const state = use(workbench);
  useEffect(() => {
    activeEffects++;
    effectStarts++;
    pulseTimer = window.setInterval(() => {
      if (!disposed) clock.dispatch(Date.now());
    }, 80);
    pagehideHandler = () => disposeDemo();
    window.addEventListener("pagehide", pagehideHandler, { once: true });
    return () => {
      if (pagehideHandler) {
        window.removeEventListener("pagehide", pagehideHandler);
      }
      pagehideHandler = null;
      activeEffects = Math.max(0, activeEffects - 1);
      effectCleanups++;
      disposeDemo();
    };
  });
  const activeCount =
    state.operations.filter((operation) => operation.status === "pending")
      .length;
  const active = activeCount > 0;
  return (
    <div className="workbench">
      <div className="main-layout">
        <ResourceLedger />
        <aside className="control-rail">
          <section className="batch-card">
            <p className="eyebrow">CONTROL</p>
            <h2>Replace both resources</h2>
            <p>
              Start up to three overlapping profile and brief replacements. Each
              root group publishes when its own boundary reads are ready.
            </p>
            <button
              className="start-button"
              disabled={activeCount >= 3}
              onClick={() => startReplacement("normal")}
            >
              {activeCount >= 3
                ? "Three replacements active"
                : `Start replacement · ${activeCount}/3 active`}
              <span aria-hidden="true">↗</span>
            </button>
            <button
              className="reject-button"
              disabled={activeCount >= 3}
              onClick={() => startReplacement("reject")}
            >
              Load a rejected profile
            </button>
            <button
              className="cancel-button full-button"
              disabled={!active}
              onClick={cancelLatestWait}
            >
              Cancel latest wait
            </button>
            <div className="batch-specs">
              <span>2 sibling resource readers</span>
              <span>2 roots · grouped publication</span>
              <span>80 ms ledger pulse · stable providers</span>
            </div>
          </section>
          <section className="semantics-card">
            <p className="eyebrow">WHAT TO WATCH</p>
            <div className="semantic-row">
              <span className="semantic-dot mint" />
              <p>
                <strong>Local boundary</strong>
                <br />The initial fallback covers both sibling reads. Rejection
                renders retry inside each root.
              </p>
            </div>
            <div className="semantic-row">
              <span className="semantic-dot amber" />
              <p>
                <strong>Retained primary</strong>
                <br />While replacement work is queued, edit either note or add
                an urgent score point.
              </p>
            </div>
            <div className="semantic-row">
              <span className="semantic-dot slate" />
              <p>
                <strong>Explicit owners</strong>
                <br />The queue owns candidate publication; event-created
                providers and store scopes stay domain-owned.
              </p>
            </div>
          </section>
        </aside>
      </div>
      <footer className="page-footer">
        <span>
          Two native roots · shared request stores · independent local drafts
        </span>
        <span>Timers illustrate readiness only; no performance claim.</span>
      </footer>
    </div>
  );
}

function disposeDemo() {
  if (disposed) return;
  disposed = true;
  if (pagehideHandler) window.removeEventListener("pagehide", pagehideHandler);
  pagehideHandler = null;
  if (pulseTimer) window.clearInterval(pulseTimer);
  pulseTimer = 0;
  queue.dispose();
  if (!appRoot.diagnostics().disposed) appRoot.dispose();
  for (const root of roots.values()) {
    if (!root.diagnostics().disposed) root.dispose();
  }
  disposedRoots = [...roots.values()].map((root) =>
    Object.freeze({
      ...root.diagnostics(),
      rootId: root.rootId,
      publicationVersion: root.publicationVersion,
    })
  );
  roots.clear();
  activeWork.clear();
  for (const record of providers.values()) record.cancelProvider();
  providers.clear();
  for (const timer of providerTimers) window.clearTimeout(timer);
  providerTimers.clear();
  // The bounded UI history is not the ownership registry for domain scopes.
  for (const id of [...ownedScopes]) releaseDomainScope(id, ROOT_IDS);
  // This domain explicitly registered both IDs in each request store. An
  // error branch may never read one of them, so release those registrations
  // as well as the subscriptions owned by each renderer.
  for (const store of stores) {
    for (const rootId of ROOT_IDS) store.detachRoot(rootId);
  }
  if (window.__nativeResourceBoundaryDiagnostics === diagnostics) {
    delete window.__nativeResourceBoundaryDiagnostics;
  }
}

for (const rootId of ROOT_IDS) {
  const element = document.querySelector<HTMLElement>(
    `[data-root-mount="${rootId}"]`,
  );
  if (!element) throw new Error(`Missing root mount for ${rootId}`);
  const root = createDOMRoot(element, { world, rootId });
  roots.set(rootId, root);
  root.mount(<RootProjection rootId={rootId} />);
}
const appRoot = createDOMRoot(document.querySelector<HTMLElement>("#app")!, {
  world,
  rootId: "resource-boundary-workbench",
});
appRoot.mount(<Workbench />);

const diagnostics = Object.freeze({
  snapshot: () =>
    Object.freeze({
      roots: Object.freeze([
        ...disposedRoots,
        ...[...roots.values(), appRoot].map((root) =>
          Object.freeze({
            ...root.diagnostics(),
            rootId: root.rootId,
            publicationVersion: root.publicationVersion,
          })
        ),
      ]),
      stores: Object.freeze({
        profile: Object.freeze({
          resourceStatus: profileRequest.getState().status.status,
          resourceVersion: profileRequest.getState().version,
          version: profileRequest.version,
          ...profileRequest.diagnostics(),
        }),
        brief: Object.freeze({
          resourceStatus: briefRequest.getState().status.status,
          resourceVersion: briefRequest.getState().version,
          version: briefRequest.version,
          ...briefRequest.diagnostics(),
        }),
        urgentScore: Object.freeze({
          value: urgentScore.getState(),
          version: urgentScore.version,
          ...urgentScore.diagnostics(),
        }),
        workbench: Object.freeze({
          version: workbench.version,
          ...workbench.diagnostics(),
        }),
        clock: Object.freeze({
          value: clock.getState(),
          version: clock.version,
          ...clock.diagnostics(),
        }),
      }),
      queue: Object.freeze({
        disposed,
        activeWork: Object.freeze(
          [...activeWork].map(([id, handle]) => ({
            id,
            status: handle.status,
          })),
        ),
        activeResources: [...providers.values()].filter((record) =>
          record.resource.status.status === "pending"
        ).length,
      }),
      providers: Object.freeze([...providers.values()].map((record) =>
        Object.freeze({
          id: record.id,
          label: record.label,
          status: record.resource.status.status,
          elapsedMs: Math.max(
            0,
            Math.min(record.duration, Date.now() - record.startedAt),
          ),
          duration: record.duration,
        })
      )),
      operations: Object.freeze(
        workbench.getState().operations.map((operation) =>
          Object.freeze({
            ...operation,
            elapsedMs: Math.max(
              0,
              Math.min(
                operation.duration,
                (operation.endedAt ?? clock.getState()) - operation.startedAt,
              ),
            ),
          })
        ),
      ),
      activeProviderTimers: providerTimers.size,
      pulseTimerActive: pulseTimer !== 0,
      effects: Object.freeze({
        active: activeEffects,
        starts: effectStarts,
        cleanups: effectCleanups,
      }),
      queueScopes: Object.freeze(
        [...ownedScopes].map((transitionId) => ({
          transitionId,
          rootIds: ROOT_IDS,
        })),
      ),
      disposed,
    }),
});
Object.defineProperty(window, "__nativeResourceBoundaryDiagnostics", {
  configurable: true,
  value: diagnostics,
});

if (import.meta.hot) {
  import.meta.hot.accept();
  import.meta.hot.dispose(disposeDemo);
}
