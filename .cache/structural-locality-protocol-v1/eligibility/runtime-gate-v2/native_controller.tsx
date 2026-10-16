import { createDOMRoot, type KeyedCollection } from "../../../../src/native_runtime_api.ts";
import { NativeCollectionBoard, makeRows, type Life, type Row } from "../native_collection.tsx";
import { NativeGenericBoard } from "../native_generic.tsx";

type Edit = { kind: "move" | "insert" | "remove" | "edge"; key?: string };
type Session = { click(id: string): void; edit(edit: Edit, next: string[]): Record<string, number>;
  dispose(): { readerCount: number | null; ownerCount: number; setterRegistered: boolean } };

function NativeCollectionMount({ rows, life }: { rows: KeyedCollection<Row>; life: Life }) {
  return <NativeCollectionBoard rows={rows} life={life} />;
}

function NativeGenericMount({ initialIds, life, registerIdsSetter }: {
  initialIds: string[]; life: Life;
  registerIdsSetter: (setter: (ids: string[]) => void) => () => void;
}) {
  return <NativeGenericBoard initialIds={initialIds} life={life}
    registerIdsSetter={registerIdsSetter} />;
}

export function mountNative(
  arm: "collection" | "generic", container: HTMLElement, initialIds: string[], life: Life,
  record: (values: Readonly<Record<string, number>>) => void,
): Session {
  const root = createDOMRoot(container, { scheduleCommit: () => {}, profileCounter: record });
  const rows: KeyedCollection<Row> | null = arm === "collection" ? makeRows(initialIds) : null;
  let setIds: ((ids: string[]) => void) | null = null;
  const registerIdsSetter = (setter: (ids: string[]) => void) => {
    if (setIds !== null) throw new Error("duplicate generic setter");
    setIds = setter;
    return () => { if (setIds === setter) setIds = null; };
  };
  try {
    if (rows) root.mount(<NativeCollectionMount rows={rows} life={life} />);
    else root.mount(<NativeGenericMount initialIds={initialIds} life={life}
      registerIdsSetter={registerIdsSetter} />);
    root.flush();
  } catch (error) {
    try { root.dispose(); } catch (disposeError) {
      throw new Error(`native mount failed: ${String(error)}; disposal failed: ${String(disposeError)}`);
    }
    throw error;
  }
  return {
    click(id) {
      const node = [...container.querySelectorAll<HTMLLIElement>("li[data-id]")]
        .find((item) => item.dataset.id === id);
      if (!node) throw new Error(`missing click target ${id}`);
      node.click();
      root.flush();
    },
    edit(edit, next) {
      if (rows) {
        const operations = edit.kind === "move"
          ? [{ type: "move" as const, key: "row-0", beforeKey: null }]
          : edit.kind === "insert"
          ? [{ type: "insert" as const, key: "fresh-head", value: { id: "fresh-head" }, beforeKey: "row-1" }]
          : edit.kind === "remove"
          ? [{ type: "remove" as const, key: "fresh-head" }]
          : [{ type: "remove" as const, key: "row-127" },
            { type: "insert" as const, key: "edge-new", value: { id: "edge-new" }, beforeKey: "row-1" }];
        const applied = rows.apply(rows.version, operations);
        if (!applied.ok) throw new Error(`collection ${edit.kind} rejected: ${applied.reason}`);
      } else {
        if (!setIds) throw new Error("generic setter unregistered");
        setIds(next);
      }
      if (!root.flush()) throw new Error(`${arm} ${edit.kind}: no native commit`);
      return rows ? { ...rows.stats() } : {};
    },
    dispose() {
      root.dispose();
      const diagnostics = root.diagnostics();
      return { readerCount: rows?.stats().readerCount ?? null,
        ownerCount: diagnostics.ownerCount, setterRegistered: setIds !== null };
    },
  };
}
