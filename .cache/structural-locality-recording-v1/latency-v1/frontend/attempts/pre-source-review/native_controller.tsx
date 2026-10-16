import { createDOMRoot, type KeyedCollection } from "../../../../src/native_runtime_api.ts";
import { NativeCollectionBoard, makeRows, type Life, type Row } from "../../../structural-locality-protocol-v1/eligibility/native_collection.tsx";
import { NativeGenericBoard } from "../../../structural-locality-protocol-v1/eligibility/native_generic.tsx";

type Operation = { type: "insert"; key: string; value: Row; beforeKey: string | null } |
  { type: "remove"; key: string } | { type: "move"; key: string; beforeKey: string | null };

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

const clickRow = (container: HTMLElement, id: string) => {
  const node = [...container.querySelectorAll<HTMLLIElement>("li[data-id]")]
    .find((item) => item.dataset.id === id);
  if (!node) throw Error(`missing click target ${id}`);
  node.click();
};

export function mountNativeCollection(container: HTMLElement, initialIds: string[], life: Life) {
  const root = createDOMRoot(container, { scheduleCommit: () => {} });
  const rows = makeRows(initialIds);
  try { root.mount(<NativeCollectionMount rows={rows} life={life} />); root.flush(); }
  catch (error) { root.dispose(); throw error; }
  return {
    click(id: string) { clickRow(container, id); root.flush(); },
    reset(operations: readonly Operation[]) {
      if (!operations.length) return;
      const result = rows.apply(rows.version, operations);
      if (!result.ok || root.flush() !== true) throw Error("native reset failed");
    },
    edit(operations: readonly Operation[]) {
      const expectedVersion = rows.version;
      const before = rows.stats();
      const start = performance.now();
      const applied = rows.apply(expectedVersion, operations);
      const flushed = root.flush();
      const end = performance.now();
      const after = rows.stats();
      const pendingChangeCount = root.diagnostics().pendingChangeCount;
      if (!applied.ok || applied.version !== expectedVersion + 1 ||
          rows.version !== applied.version || flushed !== true || pendingChangeCount !== 0 ||
          before.readerCount !== 1 || after.readerCount !== 1 ||
          before.retainedBatches !== 0 || after.retainedBatches !== 0 ||
          after.listenerErrors !== before.listenerErrors)
        throw Error("native edit did not settle");
      return { start, end, expectedVersion, appliedVersion: applied.version,
        afterVersion: rows.version, flushed, pendingChangeCount };
    },
    dispose() {
      root.dispose();
      return { ownerCount: root.diagnostics().ownerCount,
        readerCount: rows.stats().readerCount };
    },
  };
}

export function mountNativeGeneric(container: HTMLElement, initialIds: string[], life: Life) {
  const root = createDOMRoot(container, { scheduleCommit: () => {} });
  let setter: ((ids: string[]) => void) | null = null;
  const registerIdsSetter = (next: (ids: string[]) => void) => {
    if (setter) throw Error("duplicate generic setter");
    setter = next;
    return () => { if (setter !== next) throw Error("generic setter cleanup mismatch"); setter = null; };
  };
  try {
    root.mount(<NativeGenericMount initialIds={initialIds} life={life}
      registerIdsSetter={registerIdsSetter} />);
    root.flush();
    if (!setter) throw Error("generic setter absent after mount");
  } catch (error) { root.dispose(); throw error; }
  return {
    click(id: string) { clickRow(container, id); root.flush(); },
    reset(ids: readonly string[]) {
      if (!setter) throw Error("generic setter absent at reset");
      setter([...ids]);
      if (root.flush() !== true) throw Error("generic reset did not flush");
    },
    edit(ids: readonly string[]) {
      if (!setter) throw Error("generic setter absent at edit");
      setter([...ids]);
      if (root.flush() !== true || root.diagnostics().pendingChangeCount !== 0)
        throw Error("generic edit did not settle");
      return { start: null, end: null };
    },
    dispose() {
      root.dispose();
      if (setter) throw Error("generic setter retained after disposal");
      return { ownerCount: root.diagnostics().ownerCount, readerCount: null };
    },
  };
}
