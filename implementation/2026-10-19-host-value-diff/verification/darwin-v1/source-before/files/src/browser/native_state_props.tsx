// @native-ui
/** @jsxRuntime classic @jsx jsx */
import {
  createDOMRoot,
  createStore,
  createStoreSelector,
  createWorld,
  jsx,
  use,
  useEffect,
  useState,
} from "../native_runtime_api.ts";

const sharedCounter = createStore(0);
const selectedCounter = createStoreSelector<number>(
  [sharedCounter],
  ([value]) => value as number,
);
const sharedWorld = createWorld();
const rootIds = ["native-state-main", "native-state-fork"] as const;
const activeTransitionTimers = new Map<string, number>();
const activeTransitions = new Map<string, readonly string[]>();
let nextTransitionId = 1;
let disposed = false;
let root: ReturnType<typeof createDOMRoot>;
let forkRoot: ReturnType<typeof createDOMRoot>;

const commitHeldTransition = (transitionId: string) => {
  const roots = activeTransitions.get(transitionId);
  if (!roots || !sharedCounter.hasTransition(transitionId)) return;
  sharedCounter.commitTransitionRoots(transitionId, roots, { finish: true });
  activeTransitions.delete(transitionId);
  const timer = activeTransitionTimers.get(transitionId);
  if (timer !== undefined) window.clearTimeout(timer);
  activeTransitionTimers.delete(transitionId);
};

type RowProps = { id: string; key?: string | number };

declare global {
  interface ImportMeta {
    hot?: {
      accept(): void;
      dispose(callback: () => void): void;
    };
  }
}

function EditableRow({ id }: RowProps) {
  const [draft, setDraft] = useState(id === "alpha" ? "Alpha draft" : "Beta draft");
  return (
    <label className="row">
      <span>{id}</span>
      <input
        aria-label={`Edit ${id}`}
        value={draft}
        onInput={(event: Event) => setDraft((event.currentTarget as HTMLInputElement).value)}
      />
      <span className="badge">keyed</span>
    </label>
  );
}

function MovingDot() {
  const [x, setX] = useState(18);
  const [y, setY] = useState(28);
  const [tint, setTint] = useState(158);
  const [moving, setMoving] = useState(true);

  if (moving) {
    useEffect(() => {
      let frame = 0;
      let phase = 0;
      const animate = () => {
        phase += 1;
        setX((value) => (value + 1) % 250);
        setY((value) => 88 + Math.round(Math.sin(phase / 32) * 48));
        frame = requestAnimationFrame(animate);
      };
      frame = requestAnimationFrame(animate);
      return () => cancelAnimationFrame(frame);
    });
  }

  return (
    <section className="panel">
      <h2>State drives ordinary DOM props</h2>
      <div className="stage">
        <div
          className="orb"
          aria-label="Moving state dot"
          data-x={x}
          data-y={y}
          style={{ "--dot-x": x, "--dot-y": y, "--dot-tint": tint }}
        />
      </div>
      <div className="controls">
        <button onClick={() => setX((value) => (value + 18) % 250)}>Nudge right</button>
        <button onClick={() => setY((value) => (value + 16) % 250)}>Nudge down</button>
        <button onClick={() => setMoving((value) => !value)}>{moving ? "Pause effect" : "Resume effect"}</button>
      </div>
      <p className="muted">Numeric cells are read only by compiled style and attribute expressions; the effect moves the dot each frame.</p>
      <label>
        Tint
        <input type="range" min="0" max="359" value={tint} onInput={(event: Event) => setTint(Number((event.currentTarget as HTMLInputElement).value))} />
      </label>
    </section>
  );
}

function KeyedRows() {
  const [showRows, setShowRows] = useState(true);
  const [order, setOrder] = useState(["alpha", "beta"]);
  const moveFirstToEnd = () => setOrder((previous) => [...previous.slice(1), previous[0]]);
  const rows = order.map((id) => <EditableRow key={id} id={id} />);
  return (
    <section className="panel">
      <h2>Keyed editable rows</h2>
      <p className="muted">Reorder to see each draft follow its key. Hide and show to remove owners and start fresh.</p>
      <div className="controls">
        <button onClick={() => setShowRows((value) => !value)}>{showRows ? "Remove rows" : "Mount rows"}</button>
        <button onClick={moveFirstToEnd}>Reorder keys</button>
      </div>
      {showRows ? <div className="rows">{rows}</div> : <p className="muted">Rows are unmounted.</p>}
    </section>
  );
}

function GeneralBranch() {
  const [showFallback, setShowFallback] = useState(false);
  const [message, setMessage] = useState("Ready");
  return (
    <section className="panel" style={{ marginTop: "18px" }}>
      <h2>General render fallback</h2>
      <p className="muted">This branch reads current state as ordinary JSX, exercising the general render path.</p>
      <button onClick={() => setShowFallback((value) => !value)}>Toggle branch</button>
      <button onClick={() => setMessage((value) => value === "Ready" ? "Updated" : "Ready")}>Change message</button>
      {showFallback
        ? <p className="badge">State branch is visible: {message}.</p>
        : <p className="muted">The default branch is active: {message}.</p>}
      <pre id="diagnostics">Reading runtime counters…</pre>
    </section>
  );
}

function SharedStoreHud({ fork = false }: { fork?: boolean }) {
  const count = use(selectedCounter);
  const [pending, setPending] = useState(false);
  const incrementUrgently = () => sharedCounter.dispatch((value) => value + 1);
  const replaceValue = () => sharedCounter.dispatch(0);
  const beginHeldTransition = () => {
    if (pending || disposed) return;
    const transitionId = `native-state-transition-${nextTransitionId++}`;
    const participatingRoots = [...rootIds];
    sharedCounter.beginTransition(transitionId, participatingRoots);
    activeTransitions.set(transitionId, participatingRoots);
    sharedCounter.dispatch(
      (value) => value + 100,
      { kind: "transition", transitionId },
    );
    setPending(true);
    const timer = window.setTimeout(() => {
      activeTransitionTimers.delete(transitionId);
      commitHeldTransition(transitionId);
      if (!disposed) setPending(false);
    }, 3200);
    activeTransitionTimers.set(transitionId, timer);
  };

  return (
    <section className="panel" style={{ marginTop: fork ? "0" : "18px" }}>
      <h2>{fork ? "Fork root · shared store" : "Shared store · main root"}</h2>
      <p className="muted">Both roots read one stable selector. The held update waits while urgent edits stay visible.</p>
      <p className="badge">Shared count: <output aria-label={`${fork ? "Fork" : "Main"} shared count`}>{count}</output></p>
      <div className="controls">
        <button onClick={incrementUrgently}>Urgent +1</button>
        <button onClick={replaceValue}>Replace with zero</button>
        {!fork && <button disabled={pending} onClick={beginHeldTransition}>{pending ? "Held +100 pending…" : "Hold +100 for 3 seconds"}</button>}
      </div>
      {!fork && <p className="muted" aria-live="polite">{pending ? "The two roots still show their previous store value. Urgent +1 and replace remain active." : "Start a held transition, then use an urgent store update before it commits."}</p>}
    </section>
  );
}

function NativeStateDemo() {
  return (
    <div className="demo-root">
      <h1>Native state playground</h1>
      <p className="lede">Authored TSX with native state, effects, props, keyed lifetimes, and a general render fallback.</p>
      <div className="grid"><MovingDot /><KeyedRows /></div>
      <SharedStoreHud />
      <GeneralBranch />
    </div>
  );
}

root = createDOMRoot(document.querySelector("#app")!, {
  world: sharedWorld,
  rootId: rootIds[0],
  profileCounter(counters) {
    const diagnostics = document.querySelector<HTMLElement>("#diagnostics");
    if (diagnostics) diagnostics.textContent = JSON.stringify(counters, null, 2);
  },
});
forkRoot = createDOMRoot(document.querySelector("#fork-app")!, {
  world: sharedWorld,
  rootId: rootIds[1],
});
root.mount(<NativeStateDemo />);
forkRoot.mount(<SharedStoreHud fork />);

const diagnosticsFacade = Object.freeze({
  snapshot: () => Object.freeze({
    ...root.diagnostics(),
    mainRoot: Object.freeze({ ...root.diagnostics(), rootId: root.rootId }),
    forkRoot: Object.freeze({ ...forkRoot.diagnostics(), rootId: forkRoot.rootId }),
    store: Object.freeze({ value: sharedCounter.getState(), version: sharedCounter.version, ...sharedCounter.diagnostics() }),
    pendingTransitionCount: activeTransitions.size,
  }),
});
Object.defineProperty(window, "__nativeStateDemoDiagnostics", {
  configurable: true,
  value: diagnosticsFacade,
});

const demoWindow = window as Window & {
  __nativeStateDemoDiagnostics?: typeof diagnosticsFacade;
};
const teardown = () => {
  if (disposed) return;
  disposed = true;
  window.removeEventListener("pagehide", teardown);
  for (const timer of activeTransitionTimers.values()) window.clearTimeout(timer);
  activeTransitionTimers.clear();
  for (const [transitionId, participatingRoots] of activeTransitions) {
    if (!sharedCounter.hasTransition(transitionId)) continue;
    for (const rootId of participatingRoots) {
      if (sharedCounter.transitionRoots(transitionId).includes(rootId)) {
        sharedCounter.releaseTransition(transitionId, rootId);
      }
    }
    sharedCounter.finishTransition(transitionId);
  }
  activeTransitions.clear();
  root.dispose();
  forkRoot.dispose();
  if (demoWindow.__nativeStateDemoDiagnostics === diagnosticsFacade) {
    delete demoWindow.__nativeStateDemoDiagnostics;
  }
};
window.addEventListener("pagehide", teardown, { once: true });

if (import.meta.hot) {
  import.meta.hot.accept();
  import.meta.hot.dispose(teardown);
}
