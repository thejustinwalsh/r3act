/** @jsxRuntime classic */
/** @jsx jsx */
/** @jsxFrag Fragment */
// @native-ui
import {
  type AsyncStore,
  createAsyncStore,
  type StoreRenderSnapshot,
} from "../async_store_runtime.ts";
import { asyncTask } from "../async_task_plan.ts";
import { executeAsyncTaskPlan } from "../async_task_scheduler.ts";
import { type RootWorkHandle, RootWorkQueue } from "../root_work_queue.ts";
import { Fragment, jsx, type RuntimeNode } from "../jsx_binding_runtime.ts";
import {
  DOMVDOMHost,
  type PreparedVDOMCommit,
  VDOMSnapshotRoot,
} from "../vdom_snapshot_runtime.ts";

type FeedItem = {
  id: string;
  text: string;
  kind: "initial" | "remote" | "user";
};
type State = { items: readonly FeedItem[]; likes: readonly string[] };
type TransitionRequest = {
  id: string;
  target: "workspace" | "inspector" | "both";
  nextId: number;
  delayMs: number;
};
type TransitionContent = { text: string; nextId: number };
type Action =
  | { type: "publish"; item: FeedItem }
  | { type: "remove-item"; id: string }
  | { type: "set-like"; id: string; active: boolean };

const reduce = (state: State, action: Action): State => {
  if (action.type === "publish") {
    if (state.items.some((item) => item.id === action.item.id)) return state;
    return { ...state, items: [...state.items, action.item].slice(-30) };
  }
  if (action.type === "remove-item") {
    return {
      ...state,
      items: state.items.filter((item) => item.id !== action.id),
    };
  }
  const hasLike = state.likes.includes(action.id);
  if (hasLike === action.active) return state;
  return {
    ...state,
    likes: action.active
      ? [...state.likes, action.id]
      : state.likes.filter((id) => id !== action.id),
  };
};

const startup = document.querySelector<HTMLElement>("#startup")!;
const app = document.querySelector<HTMLElement>("#app")!;
const status = document.querySelector<HTMLElement>("#status")!;
const likeButton = document.querySelector<HTMLButtonElement>("#like")!;
const transitionButton = document.querySelector<HTMLButtonElement>(
  "#transition",
)!;
const forkButton = document.querySelector<HTMLButtonElement>(
  "#fork-transition",
)!;
const autoButton = document.querySelector<HTMLButtonElement>("#auto")!;
const composeForm = document.querySelector<HTMLFormElement>("#compose-form")!;
const composeInput = document.querySelector<HTMLInputElement>(
  "#compose-input",
)!;
const pendingCount = document.querySelector<HTMLElement>("#pending-count")!;

const startupDelay = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));

const taskDelay = (ms: number, signal: AbortSignal) =>
  new Promise<void>((resolve, reject) => {
    const abort = () => {
      clearTimeout(timer);
      signal.removeEventListener("abort", abort);
      reject(signal.reason ?? new DOMException("Cancelled", "AbortError"));
    };
    const timer = setTimeout(() => {
      signal.removeEventListener("abort", abort);
      resolve();
    }, ms);
    signal.addEventListener("abort", abort, { once: true });
    if (signal.aborted) abort();
  });

// These bodies are the executable source and the compiler input. Rust infers
// each task edge from the literal Map.get reads, including the external request.
const transitionTasks = [
  asyncTask("load-content", async (values, signal) => {
    const request = values.get("$request") as TransitionRequest;
    await taskDelay(Math.round(request.delayMs * 0.58), signal);
    return {
      text: `Background update ${request.nextId}`,
      nextId: request.nextId,
    } satisfies TransitionContent;
  }),
  asyncTask("load-target", async (values, signal) => {
    const request = values.get("$request") as TransitionRequest;
    await taskDelay(Math.round(request.delayMs * 0.38), signal);
    return request.target;
  }),
  asyncTask("compose-update", async (values) => {
    const content = values.get("load-content") as TransitionContent;
    const target = values.get("load-target") as TransitionRequest["target"];
    return {
      id: `remote-${content.nextId}`,
      text:
        `${content.text} finished for ${target} after its async work. The room stayed interactive while it worked.`,
      kind: "remote",
    } satisfies FeedItem;
  }),
];
const compiledTaskDagLabel = transitionTasks.map((task) =>
  `${task.id} ← ${task.dependsOn.join(" + ")}`
).join(" · ");

const lifecycle = new AbortController();
const observers: MutationObserver[] = [];
const scheduledTimers = new Set<number>();
let disposed = false;
const schedule = (callback: () => void, delayMs: number) => {
  const timer = window.setTimeout(() => {
    scheduledTimers.delete(timer);
    if (!disposed) callback();
  }, delayMs);
  scheduledTimers.add(timer);
  return timer;
};
let store: AsyncStore<State, Action>;
const roots = new Map<string, VDOMSnapshotRoot<Node, Node>>();
type Candidate = {
  snapshot: StoreRenderSnapshot<State, Action>;
  hostCommit: PreparedVDOMCommit;
};
const workQueue = new RootWorkQueue<Candidate>(
  new Map([
    ["workspace", 0],
    ["inspector", 0],
    ["progress", 0],
  ]),
);
const workHandles = new Map<string, RootWorkHandle>();
const controllers = new Map<string, AbortController>();
const transitionTrace: {
  id: string;
  phase: string;
  at: number;
  roots: readonly string[];
}[] = [];
let transitionFailures = 0;
const trace = (id: string, phase: string, rootIds: readonly string[]) => {
  transitionTrace.push({
    id,
    phase,
    at: performance.now(),
    roots: [...rootIds],
  });
  if (transitionTrace.length > 200) transitionTrace.shift();
};
let nextId = 0;
let nextTransition = 0;
let nextLike = 0;
let nextPost = 0;
let autoTimer: number | undefined;
let autoEnabled = false;
let commits = 0;
let optimisticRollbacks = 0;
let transitionCompletions = 0;
let afterBootFallbacks = 0;
let inputLatencies: number[] = [];
const pending = new Map<string, { roots: string[]; durationMs: number }>();

const p95 = (values: readonly number[]) => {
  if (values.length === 0) return 0;
  const ordered = [...values].sort((a, b) => a - b);
  return ordered[Math.ceil(ordered.length * 0.95) - 1];
};

const noteInput = (startedAt: number) => {
  requestAnimationFrame(() => {
    inputLatencies.push(performance.now() - startedAt);
    if (inputLatencies.length > 80) inputLatencies.shift();
    renderStatus();
  });
};

const makeAvatar = (kind: FeedItem["kind"]) =>
  kind === "remote" ? "SY" : kind === "user" ? "AL" : "MK";

const buildActivityTree = (state: State): RuntimeNode => (
  <div data-root-view="workspace">
    <ul className="feed-list" data-node="items">
      {[...state.items].reverse().map((item, index) => {
        const kindLabel = item.kind === "remote"
          ? "Background update"
          : item.kind === "user"
          ? "Just posted"
          : "Earlier";
        const liked = state.likes.includes(item.id);
        return (
          <li
            key={item.id}
            className="feed-item"
            data-item-id={item.id}
            data-kind={item.kind}
          >
            <div className="avatar" aria-hidden="true">
              {makeAvatar(item.kind)}
            </div>
            <div className="feed-content">
              <p className="feed-meta">
                <span className="feed-name">
                  {item.kind === "user"
                    ? "Alex Lee"
                    : item.kind === "remote"
                    ? "Sync service"
                    : "Mika K."}
                </span>
                <span>·</span>
                <span>
                  {index === 0
                    ? "just now"
                    : item.kind === "initial"
                    ? "earlier"
                    : "moments ago"}
                </span>
                <span
                  className={`kind-chip ${
                    item.kind === "user" ? "optimistic" : item.kind
                  }`}
                >
                  {kindLabel}
                </span>
              </p>
              <p className="feed-copy">{item.text}</p>
              <div className="feed-actions">
                <button
                  className={`icon-button ${liked ? "liked" : ""}`}
                  type="button"
                  data-like-item={item.id}
                  aria-label={liked
                    ? "Remove appreciation"
                    : "Appreciate this update"}
                >
                  {liked ? "♥ Appreciated" : "♡ Appreciate"}
                </button>
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  </div>
);

const buildInspectorTree = (state: State): RuntimeNode => {
  const recent = [...state.items].slice(-4).reverse();
  return (
    <div data-root-view="inspector">
      <div className="inspector-summary">
        <div className="metric">
          <span className="metric-value" data-node="item-count">
            {state.items.length}
          </span>
          <span className="metric-label">shared entries</span>
        </div>
        <div className="metric">
          <span className="metric-value like" data-node="likes">
            {state.likes.length}
          </span>
          <span className="metric-label">live reactions</span>
        </div>
      </div>
      <div className="inspector-list">
        {recent.map((item) => (
          <div
            key={`inspect-${item.id}`}
            className="inspector-row"
            data-inspector-item={item.id}
          >
            <span className="inspector-avatar">{makeAvatar(item.kind)}</span>
            <span className="inspector-copy">
              <strong>
                {item.kind === "remote"
                  ? "Async result"
                  : item.kind === "user"
                  ? "Optimistic post"
                  : "Room update"}
              </strong>
              <span>{item.text}</span>
            </span>
            <span className="kind-chip">B</span>
          </div>
        ))}
      </div>
    </div>
  );
};

const buildProgressTree = (): RuntimeNode => (
  <div className="jobs" data-root-view="progress">
    <p className="compiled-plan-note">
      Rust compiler DAG · {compiledTaskDagLabel}
    </p>
    {[...pending.entries()].length
      ? [...pending.entries()].map(([id, entry]) => (
        <div key={id} className="job" data-transition-id={id}>
          <div className="job-top">
            <span>{id} · syncing room update</span>
            <button
              type="button"
              className="icon-button"
              data-cancel-transition={id}
              onClick={() =>
                workHandles.get(id)?.cancel("User cancelled")}
            >
              Cancel
            </button>
            <span className="job-root">
              {entry.roots.includes("inspector") ? "A + B" : "A"}
            </span>
          </div>
          <div className="progress-track" aria-label={`${id} in progress`}>
            <div
              className="progress-fill"
              style={{ animationDuration: `${entry.durationMs}ms` }}
            />
          </div>
        </div>
      ))
      : (
        <div className="no-jobs">
          <span className="no-jobs-mark" aria-hidden="true" />All caught up · no
          pending saves
        </div>
      )}
  </div>
);

const buildRootTree = (rootId: string, state: State) => {
  if (rootId === "workspace") return buildActivityTree(state);
  if (rootId === "inspector") return buildInspectorTree(state);
  return buildProgressTree();
};

const renderRoot = (rootId: string) => {
  const root = roots.get(rootId);
  if (!root || !store || disposed) return;
  const snapshot = store.beginRender(rootId);
  const tree = buildRootTree(rootId, snapshot.state);
  if (!snapshot.validate()) return;
  root.commit(tree);
  snapshot.commitAfterValidatedRender();
  workQueue.recordUrgentCommit(rootId);
  commits++;
};

const renderRoots = (rootIds: readonly string[]) => {
  for (const rootId of new Set(rootIds)) renderRoot(rootId);
  renderStatus();
};

const renderStatus = () => {
  if (!store || disposed) return;
  const active = pending.size;
  const mean = inputLatencies.length
    ? inputLatencies.reduce((sum, value) => sum + value, 0) /
      inputLatencies.length
    : 0;
  pendingCount.textContent = String(active);
  status.textContent = [
    `pending transitions: ${active} · completed: ${transitionCompletions}`,
    `optimistic rollbacks: ${optimisticRollbacks} · root commits: ${commits}`,
    `input → next frame: mean ${mean.toFixed(1)} ms · p95 ${
      p95(inputLatencies).toFixed(1)
    } ms`,
    `fallbacks after startup: ${afterBootFallbacks} · failed transitions: ${transitionFailures}`,
    `active: ${[...pending.keys()].join(", ") || "none"}`,
  ].join("\n");
};

const startTransition = (target: "workspace" | "inspector" | "both") => {
  if (disposed) return;
  const id = `T${++nextTransition}`;
  const rootIds = target === "both" ? ["workspace", "inspector"] : [target];
  const delayMs = 850 + ((nextTransition * 613) % 2850);
  const request: TransitionRequest = { id, target, nextId: ++nextId, delayMs };
  const controller = new AbortController();
  controllers.set(id, controller);
  store.beginTransition(id, rootIds);
  pending.set(id, { roots: rootIds, durationMs: Math.round(delayMs * 0.58) });
  trace(id, "started", rootIds);
  const handle = workQueue.enqueue({
    id,
    roots: rootIds,
    pending: ["result"],
    prepare: ({ versions, attempt }) => {
      trace(id, `prepare:${attempt}`, rootIds);
      return rootIds.map((rootId) => {
        const snapshot = store.beginRender(rootId, { transitions: [id] });
        const root = roots.get(rootId)!;
        const baseVersion = versions.get(rootId)!;
        return {
          rootId,
          baseVersion,
          targetVersion: baseVersion + 1,
          validate: () => snapshot.validate(),
          value: {
            snapshot,
            hostCommit: root.prepareCommit(
              buildRootTree(rootId, snapshot.state),
            ),
          },
        };
      });
    },
    commit: (candidates) => {
      // Apply every host before publishing reader histories or store observers.
      for (const candidate of candidates) candidate.value.hostCommit.commit();
      for (const candidate of candidates) {
        candidate.value.snapshot.commitAfterValidatedRender();
      }
      commits += candidates.length;
      trace(id, "hosts-committed", rootIds);
    },
    onSettled: (resolution) => {
      trace(id, resolution.status, rootIds);
      if (resolution.status === "committed") {
        store.commitTransitionRoots(id, rootIds, { finish: true });
        transitionCompletions++;
      } else {
        controller.abort(new DOMException("Cancelled", "AbortError"));
        if (store.hasTransition(id)) {
          store.finishTransition(id);
          for (const rootId of rootIds) {
            if (store.hasTransition(id)) store.releaseTransition(id, rootId);
          }
        }
        if (resolution.status === "failed" || resolution.status === "stale") {
          transitionFailures++;
        }
      }
      pending.delete(id);
      workHandles.delete(id);
      controllers.delete(id);
      // Settled root candidates already rendered the current lane. Progress
      // and roots outside the group can now catch up to the published store.
      if (resolution.status === "committed") {
        renderRoots(
          [...roots.keys()].filter((rootId) => !rootIds.includes(rootId)),
        );
      } else if (resolution.status === "cancelled") {
        renderRoots([...roots.keys()]);
      } else {
        renderRoots(["progress"]);
      }
      renderStatus();
    },
  });
  workHandles.set(id, handle);
  renderRoots(["progress"]);
  void executeAsyncTaskPlan(transitionTasks, { "$request": request }, {
    signal: controller.signal,
  }).then(({ status: executionStatus, values }) => {
    if (executionStatus !== "complete" || handle.status !== "pending") return;
    trace(id, "resources-ready", rootIds);
    const item = values.get("compose-update") as FeedItem;
    store.dispatch({ type: "publish", item }, {
      kind: "transition",
      transitionId: id,
    });
    handle.resolve("result");
  }).catch((error: unknown) => {
    if (handle.status !== "pending") return;
    trace(
      id,
      error instanceof Error
        ? `resource-error:${error.message}`
        : "resource-error",
      rootIds,
    );
    transitionFailures++;
    handle.cancel("Resource failed");
  });
};

/** Read-only observations for browser contract checks and trace inspection. */
export const getStressSnapshot = () => ({
  disposed,
  attachedRoots: [...roots.keys()],
  pending: [...pending.keys()],
  work: [...workHandles.values()].map((handle) => ({
    id: handle.id,
    status: handle.status,
  })),
  completed: transitionCompletions,
  failures: transitionFailures,
  afterBootFallbacks,
  trace: [...transitionTrace],
  workspace: store?.getStateForRoot("workspace"),
  inspector: store?.getStateForRoot("inspector"),
});

const startLike = () => {
  const startedAt = performance.now();
  const id = `like-${++nextLike}`;
  const fails = nextLike % 5 === 0;
  store.dispatch({ type: "set-like", id, active: true });
  renderRoots([...roots.keys()]);
  noteInput(startedAt);
  const settles = 450 + ((nextLike * 277) % 850);
  schedule(() => {
    if (fails) {
      store.dispatch({ type: "set-like", id, active: false });
      optimisticRollbacks++;
      renderRoots([...roots.keys()]);
    }
  }, settles);
};

composeForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const text = composeInput.value.trim();
  if (!text) {
    composeInput.focus();
    return;
  }
  const startedAt = performance.now();
  const id = `post-${++nextPost}`;
  const item: FeedItem = { id, text, kind: "user" };
  store.dispatch({ type: "publish", item });
  renderRoots([...roots.keys()]);
  composeInput.value = "";
  composeInput.focus();
  noteInput(startedAt);
  // Every seventh optimistic post demonstrates rollback without disrupting
  // the app shell or discarding a newer edit from the composer.
  const fails = nextPost % 7 === 0;
  schedule(() => {
    if (fails) {
      store.dispatch({ type: "remove-item", id });
      optimisticRollbacks++;
      renderRoots([...roots.keys()]);
    }
  }, 1700 + ((nextPost * 281) % 1100));
}, { signal: lifecycle.signal });

likeButton.addEventListener("click", () => startLike(), {
  signal: lifecycle.signal,
});
document.addEventListener("click", (event) => {
  const button = (event.target as Element | null)?.closest<HTMLButtonElement>(
    "[data-like-item]",
  );
  if (!button) return;
  const itemId = button.dataset.likeItem;
  if (!itemId) return;
  const startedAt = performance.now();
  const snapshot = store.beginRender("workspace");
  const liked = snapshot.state.likes.includes(itemId);
  store.dispatch({ type: "set-like", id: itemId, active: !liked });
  renderRoots([...roots.keys()]);
  noteInput(startedAt);
}, { signal: lifecycle.signal });

transitionButton.addEventListener("click", () => startTransition("both"), {
  signal: lifecycle.signal,
});
forkButton.addEventListener("click", () => startTransition("inspector"), {
  signal: lifecycle.signal,
});
autoButton.addEventListener("click", () => {
  autoEnabled = !autoEnabled;
  autoButton.textContent = autoEnabled ? "Stop timer loop" : "Start timer loop";
  if (autoEnabled) {
    const tick = () => {
      if (!autoEnabled) return;
      startTransition(nextTransition % 3 === 0 ? "both" : "workspace");
      autoTimer = schedule(tick, 820);
    };
    tick();
  } else if (autoTimer !== undefined) {
    clearTimeout(autoTimer);
    scheduledTimers.delete(autoTimer);
  }
}, { signal: lifecycle.signal });

await startupDelay(500);
store = createAsyncStore<State, Action>({
  items: [
    {
      id: "seed-1",
      text: "The new release candidate is ready for a quick review.",
      kind: "initial",
    },
    {
      id: "seed-2",
      text:
        "Async checks are running. You can keep posting while their updates resolve.",
      kind: "initial",
    },
  ],
  likes: [],
}, reduce);
for (const rootId of ["workspace", "inspector", "progress"]) {
  const containerId = rootId === "progress"
    ? "#progress-root"
    : `#${rootId}-root`;
  const container = document.querySelector<HTMLElement>(containerId)!;
  roots.set(rootId, new VDOMSnapshotRoot(new DOMVDOMHost(), container));
  renderRoot(rootId);
  const observer = new MutationObserver((records) => {
    if (
      records.some((record) =>
        Array.from(record.addedNodes).some((node) => {
          if (!(node instanceof Element)) return false;
          return node.matches("[data-fallback]") ||
            Boolean(node.querySelector("[data-fallback]"));
        })
      )
    ) {
      afterBootFallbacks++;
      renderStatus();
    }
  });
  observer.observe(container, { childList: true, subtree: true });
  observers.push(observer);
}
startup.hidden = true;
app.hidden = false;
renderStatus();

/** Release roots, holds, listeners, and pending work as one app lifecycle. */
export const disposeStress = () => {
  if (disposed) return;
  disposed = true;
  const diagnostics = globalThis as typeof globalThis & {
    __nativeStress?: { dispose: () => void };
  };
  if (diagnostics.__nativeStress?.dispose === disposeStress) {
    delete diagnostics.__nativeStress;
  }
  lifecycle.abort();
  autoEnabled = false;
  for (const timer of scheduledTimers) clearTimeout(timer);
  scheduledTimers.clear();
  for (const handle of [...workHandles.values()]) handle.cancel("App disposed");
  for (const controller of controllers.values()) controller.abort();
  controllers.clear();
  for (const observer of observers) observer.disconnect();
  observers.length = 0;
  for (const [rootId, root] of roots) {
    workQueue.detachRoot(rootId);
    store.detachRoot(rootId);
    root.dispose();
  }
  roots.clear();
  pending.clear();
  workHandles.clear();
};
window.addEventListener("pagehide", disposeStress, {
  once: true,
  signal: lifecycle.signal,
});

// Browser diagnostics observe the mounted instance without importing this
// side-effectful entry module again through an HMR-stamped URL.
Object.assign(globalThis, {
  __nativeStress: Object.freeze({
    getSnapshot: getStressSnapshot,
    dispose: disposeStress,
  }),
});
type NativeImportMeta = ImportMeta & {
  hot?: { accept(): void; dispose(callback: () => void): void };
};
// Vite recognizes direct import.meta.hot.accept calls after TS lowering.
if ((import.meta as NativeImportMeta).hot) {
  (import.meta as NativeImportMeta).hot!.accept();
  (import.meta as NativeImportMeta).hot!.dispose(disposeStress);
}
