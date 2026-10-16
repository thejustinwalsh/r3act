import {
  createDOMRoot,
  createKeyedCollection,
  type KeyedCollection,
  useEffect,
  useState,
} from "../native_runtime_api.ts";
import type {
  ProductMixedController,
  ProductMixedDiagnostics,
  ProductMixedEdit,
  ProductMixedFactory,
} from "./product_mixed_contract.ts";
import { productMixedState } from "./product_mixed_contract.ts";

type ProductMixedRowData = { id: number };
type FrameSetter = (frame: number) => void;
type ProductMixedSession = {
  rows: KeyedCollection<ProductMixedRowData> | null;
  rowSetters: Map<number, FrameSetter>;
  currentIds: number[];
  mounts: number;
  cleanups: number;
};

function ProductMixedRow({
  id,
  session,
}: {
  id: number;
  session: ProductMixedSession;
  key?: string | number;
}) {
  const [x, setX] = useState(0);
  const [y, setY] = useState(0);
  const [rotation, setRotation] = useState(0);

  useEffect(() => {
    const setFrame: FrameSetter = (frame) => {
      const state = productMixedState(id, frame);
      setX(state.x);
      setY(state.y);
      setRotation(state.rotation);
    };
    session.mounts++;
    session.rowSetters.set(id, setFrame);
    return () => {
      session.cleanups++;
      if (session.rowSetters.get(id) === setFrame) {
        session.rowSetters.delete(id);
      }
    };
  });

  return (
    <i
      className="entity"
      data-id={id}
      style={{
        left: `${x}px`,
        top: `${y}px`,
        transform: `rotate(${rotation}deg)`,
      }}
    />
  );
}

function ProductMixedBoard({ rows, session }: { rows: KeyedCollection<ProductMixedRowData>; session: ProductMixedSession }) {
  return (
    <div className="board">
      {rows.map((row) => (
        <ProductMixedRow key={row.id} id={row.id} session={session} />
      ))}
    </div>
  );
}

const applyEdit = (
  session: ProductMixedSession,
  edit: ProductMixedEdit,
) => {
  const rows = session.rows;
  if (!rows) throw new Error("Cannot edit a disposed product mixed collection");
  const removed = new Set(edit.removed);
  const retained = session.currentIds.filter((id) => !removed.has(id));
  const beforeMove = [...retained, ...edit.inserted];
  const movedPrefix = beforeMove.slice(0, 13);
  const target = [...beforeMove.slice(13), ...movedPrefix];

  const operations: Array<
    | { type: "remove"; key: string }
    | {
      type: "insert";
      key: string;
      value: ProductMixedRowData;
      beforeKey: string | null;
    }
    | { type: "move"; key: string; beforeKey: string | null }
  > = [];
  for (const id of edit.removed) {
    operations.push({ type: "remove", key: String(id) });
  }
  for (const id of edit.inserted) {
    operations.push({
      type: "insert",
      key: String(id),
      value: { id },
      beforeKey: null,
    });
  }
  for (const id of movedPrefix) {
    operations.push({ type: "move", key: String(id), beforeKey: null });
  }

  if (operations.length > 0) {
    const result = rows.apply(rows.version, operations);
    if (!result.ok) {
      throw new Error(`Product mixed collection edit failed: ${result.reason}`);
    }
  }
  session.currentIds = target;
};

export const createProductMixedNative: ProductMixedFactory = (
  container,
  ids,
): ProductMixedController => {
  const initialIds = [...ids];
  let rows: KeyedCollection<ProductMixedRowData> | null = createKeyedCollection(
    initialIds.map((id) => ({ id })),
    (row) => String(row.id),
  );
  const session: ProductMixedSession = {
    rows,
    rowSetters: new Map(),
    currentIds: initialIds,
    mounts: 0,
    cleanups: 0,
  };
  let root: ReturnType<typeof createDOMRoot> | null = createDOMRoot(container, {
    scheduleCommit: () => {},
  });
  let disposed = false;
  let finalRootDiagnostics: Readonly<Record<string, unknown>> = {};
  let finalCollectionStats: ReturnType<KeyedCollection<ProductMixedRowData>["stats"]> | null = null;

  root.mount(<ProductMixedBoard rows={rows} session={session} />);
  root.flush();
  for (const setFrame of session.rowSetters.values()) setFrame(0);
  root.flush();

  return {
    step(frame, edit) {
      if (disposed || !root) {
        throw new Error("Cannot step a disposed product mixed controller");
      }
      if (!edit) {
        for (const setFrame of session.rowSetters.values()) {
          setFrame(frame);
        }
        root.flush();
        return;
      }

      const removed = new Set(edit.removed);
      for (const [id, setFrame] of session.rowSetters) {
        if (removed.has(id)) continue;
        setFrame(frame);
      }
      applyEdit(session, edit);
      root.flush();

      let insertedRowsNeedFrame = false;
      for (const id of edit.inserted) {
        const setFrame = session.rowSetters.get(id);
        if (setFrame) {
          setFrame(frame);
          insertedRowsNeedFrame = true;
        }
      }
      if (insertedRowsNeedFrame) root.flush();
    },
    diagnostics(): ProductMixedDiagnostics {
      return {
        renders: -1,
        mounts: session.mounts,
        cleanups: session.cleanups,
        writers: session.rowSetters.size,
        extra: {
          root: root?.diagnostics() ?? finalRootDiagnostics,
          collection: rows?.stats() ?? finalCollectionStats,
          collectionSize: rows?.size ?? 0,
          collectionVersion: rows?.version ?? null,
          registeredSetters: session.rowSetters.size,
        },
      };
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      if (root) {
        root.dispose();
        finalRootDiagnostics = root.diagnostics();
        finalCollectionStats = rows?.stats() ?? null;
        root = null;
      }
      session.rowSetters.clear();
      session.currentIds = [];
      session.rows = null;
      rows = null;
    },
  };
};
