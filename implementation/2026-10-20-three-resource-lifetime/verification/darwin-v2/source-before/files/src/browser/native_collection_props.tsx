// @native-ui
/** @jsxRuntime classic @jsx jsx */
import {
  createDOMRoot,
  createKeyedCollection,
  jsx,
  useEffect,
  useState,
} from "../native_runtime_api.ts";

type CollectionRowData = { id: string; label: string; revision: number };
type TickAction = number | ((previous: number) => number);
type TickWriter = (action: TickAction) => boolean;

const makeRecord = (number: number): CollectionRowData => ({
  id: `record-${String(number).padStart(3, "0")}`,
  label: `Record ${String(number).padStart(3, "0")}`,
  revision: 0,
});

const rows = createKeyedCollection(
  Array.from({ length: 32 }, (_, index) => makeRecord(index + 1)),
  (row) => row.id,
);
const activeRowEffects = new Set<string>();
const rowTickWriters = new Map<string, TickWriter>();
let nextRecordNumber = 33;
let operationCount = 0;
let tickWriterUpdates = 0;
let root: ReturnType<typeof createDOMRoot>;

const applyOperations = (
  operations: readonly (
    | { type: "insert"; key: string; value: CollectionRowData; beforeKey: string | null }
    | { type: "remove"; key: string }
    | { type: "move"; key: string; beforeKey: string | null }
    | { type: "replace"; key: string; value: CollectionRowData }
  )[],
) => {
  const result = rows.apply(rows.version, operations);
  if (!result.ok) throw new Error(`Collection edit failed: ${result.reason}`);
  operationCount += operations.length;
};

function CollectionRow({ row }: { row: CollectionRowData; key?: string | number }) {
  const [tick, setTick] = useState(0);
  const [draft, setDraft] = useState(row.label);

  useEffect(() => {
    activeRowEffects.add(row.id);
    rowTickWriters.set(row.id, setTick);
    let frame = 0;
    let frameNumber = 0;
    let active = true;
    const animate = () => {
      if (!active) return;
      frameNumber += 1;
      if (frameNumber % 10 === 0) {
        const writer = rowTickWriters.get(row.id);
        if (writer) {
          tickWriterUpdates += 1;
          writer((previous) => previous + 1);
        }
      }
      frame = requestAnimationFrame(animate);
    };
    if (row.id === "record-001") frame = requestAnimationFrame(animate);

    return () => {
      active = false;
      if (frame !== 0) cancelAnimationFrame(frame);
      activeRowEffects.delete(row.id);
      if (rowTickWriters.get(row.id) === setTick) rowTickWriters.delete(row.id);
    };
  });

  return (
    <article
      className="collection-row"
      data-row-id={row.id}
      data-tick={tick}
      style={{ "--row-shift": tick % 4 }}
    >
      <span className="row-id">{row.id}</span>
      <input
        aria-label={`Edit ${row.id}`}
        value={draft}
        onInput={(event: Event) => setDraft((event.currentTarget as HTMLInputElement).value)}
      />
      <span className="badge">rev {row.revision}</span>
      <output className="tick-output" aria-label={`${row.id} tick`} value={tick} />
    </article>
  );
}

function Rows() {
  return (
    <section className="panel collection-panel">
      <div className="panel-heading">
        <div>
          <h2>Keyed collection</h2>
          <p className="muted">32 rows start here. Edit a draft, then move or replace its record to see keyed state follow the identity.</p>
        </div>
        <span className="badge">Versioned rows</span>
      </div>
      <div className="collection-list">
        {rows.map((row) => <CollectionRow key={row.id} row={row} />)}
      </div>
    </section>
  );
}

function CollectionControls() {
  const insertRow = () => {
    const row = makeRecord(nextRecordNumber++);
    applyOperations([{ type: "insert", key: row.id, value: row, beforeKey: rows.firstKey }]);
  };

  const removeLast = () => {
    const lastKey = rows.lastKey;
    const removableKey = lastKey === "record-001"
      ? rows.previousKey(lastKey)
      : lastKey;
    if (removableKey) applyOperations([{ type: "remove", key: removableKey }]);
  };

  const moveFirstToEnd = () => {
    const firstKey = rows.firstKey;
    if (firstKey && firstKey !== rows.lastKey) {
      applyOperations([{ type: "move", key: firstKey, beforeKey: null }]);
    }
  };

  const replaceFirst = () => {
    const firstKey = rows.firstKey;
    const previous = firstKey && rows.get(firstKey);
    if (!firstKey || !previous) return;
    applyOperations([{
      type: "replace",
      key: firstKey,
      value: {
        ...previous,
        label: `${previous.label} · updated`,
        revision: previous.revision + 1,
      },
    }]);
  };

  return (
    <section className="panel">
      <h2>Collection operations</h2>
      <p className="muted">Each button submits a version-checked operation batch. The specialized form is a direct one-argument row map; controls select targets through keyed neighbor lookups.</p>
      <div className="controls">
        <button onClick={insertRow}>Insert before first</button>
        <button onClick={removeLast}>Remove last</button>
        <button onClick={moveFirstToEnd}>Move first to end</button>
        <button onClick={replaceFirst}>Replace first</button>
      </div>
      <pre id="native-collection-runtime-counters">Reading runtime counters…</pre>
    </section>
  );
}

function NativeCollectionDemo() {
  return (
    <div className="demo-root">
      <h1>Native collection playground</h1>
      <p className="lede">Keyed row deltas, local component state, and effect lifetimes in authored TSX.</p>
      <div className="collection-layout">
        <Rows />
        <CollectionControls />
      </div>
    </div>
  );
}

declare global {
  interface ImportMeta {
    hot?: {
      accept(): void;
      dispose(callback: () => void): void;
    };
  }
  interface Window {
    __nativeCollectionDemoDiagnostics?: {
      snapshot(): Readonly<Record<string, unknown>>;
    };
  }
}

root = createDOMRoot(document.querySelector("#app")!, {
  profileCounter(counters) {
    const output = document.querySelector<HTMLElement>("#native-collection-runtime-counters");
    if (output) {
      output.textContent = JSON.stringify({
        runtime: counters,
        root: root.diagnostics(),
        collection: {
          size: rows.size,
          version: rows.version,
          operationCount,
          ...rows.stats(),
        },
        activeEffectCount: activeRowEffects.size,
        registeredWriterCount: rowTickWriters.size,
        tickWriterUpdates,
      }, null, 2);
    }
  },
});
root.mount(<NativeCollectionDemo />);

const diagnosticsFacade = Object.freeze({
  snapshot: () => Object.freeze({
    root: Object.freeze({ ...root.diagnostics(), rootId: root.rootId }),
    collection: Object.freeze({
      size: rows.size,
      version: rows.version,
      ...rows.stats(),
    }),
    activeEffectCount: activeRowEffects.size,
    registeredWriterCount: rowTickWriters.size,
    tickWriterUpdates,
    operationCount,
  }),
});
Object.defineProperty(window, "__nativeCollectionDemoDiagnostics", {
  configurable: true,
  value: diagnosticsFacade,
});

let disposed = false;
const teardown = () => {
  if (disposed) return;
  disposed = true;
  window.removeEventListener("pagehide", teardown);
  root.dispose();
  if (window.__nativeCollectionDemoDiagnostics === diagnosticsFacade) {
    delete window.__nativeCollectionDemoDiagnostics;
  }
};
window.addEventListener("pagehide", teardown, { once: true });

if (import.meta.hot) {
  import.meta.hot.accept();
  import.meta.hot.dispose(teardown);
}
