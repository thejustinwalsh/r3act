import { createDOMRoot, type KeyedCollection } from "../snapshot/src/native_runtime_api.ts";
import { beginStructuralCountWindow, endStructuralCountWindow,
  configureStructuralCountProbe } from "../snapshot/src/structural_count_probe.ts";
import { NativeCollectionBoard, makeRows, type Life, type Row } from "../../../structural-locality-protocol-v1/eligibility/native_collection.tsx";
import { NativeGenericBoard } from "../../../structural-locality-protocol-v1/eligibility/native_generic.tsx";

type Operation = { type: "insert"; key: string; value: Row; beforeKey: string | null } |
  { type: "remove"; key: string } | { type: "move"; key: string; beforeKey: string | null };

function NativeCollectionMount({ rows, life }: { rows: KeyedCollection<Row>; life: Life }) {
  return <NativeCollectionBoard rows={rows} life={life} />;
}

export function NativeGenericMount({ initialIds, life, registerIdsSetter }: {
  initialIds: string[]; life: Life;
  registerIdsSetter: (setter: (ids: string[]) => void) => () => void;
}) {
  return <NativeGenericBoard initialIds={initialIds} life={life}
    registerIdsSetter={registerIdsSetter} />;
}

export function mountNativeCount(container: HTMLElement, initialIds: string[], life: Life,
  countMode: boolean, profileCounter: (values: Readonly<Record<string, number>>) => void) {
  configureStructuralCountProbe(countMode);
  const root = createDOMRoot(container, { scheduleCommit: () => {}, profileCounter });
  const rows = makeRows(initialIds);
  try {
    root.mount(<NativeCollectionMount rows={rows} life={life} />);
    root.flush();
  } catch (error) {
    try { root.dispose(); } catch (disposal) {
      throw new Error(`mount ${String(error)}; disposal ${String(disposal)}`);
    }
    throw error;
  }
  return {
    click(id: string) {
      const node = [...container.querySelectorAll<HTMLLIElement>("li[data-id]")]
        .find((item) => item.dataset.id === id);
      if (!node) throw new Error(`missing click target ${id}`);
      node.click();
      root.flush();
    },
    reset(operations: readonly Operation[]) {
      if (operations.length === 0) return null;
      const applied = rows.apply(rows.version, operations);
      if (!applied.ok) throw new Error(`reset rejected ${applied.reason}`);
      if (!root.flush()) throw new Error("reset lacked synchronous commit");
      return applied.version;
    },
    edit(label: string, operations: readonly Operation[]) {
      const statsBefore = rows.stats();
      let receipt: unknown = null;
      let editError: unknown = null;
      let receiptError: unknown = null;
      if (countMode) beginStructuralCountWindow(root, label);
      try {
        const applied = rows.apply(rows.version, operations);
        if (!applied.ok) throw new Error(`edit rejected ${applied.reason}`);
        if (!root.flush()) throw new Error("edit lacked synchronous commit");
      } catch (error) { editError = error; }
      finally {
        if (countMode) try { receipt = endStructuralCountWindow(root); }
        catch (error) { receiptError = error; }
      }
      const statsAfter = rows.stats();
      if (editError || receiptError) throw new Error(JSON.stringify({
        editError: editError ? String(editError) : null,
        receiptError: receiptError ? String(receiptError) : null, receipt,
      }));
      return { receipt, statsBefore, statsAfter };
    },
    dispose() {
      root.dispose();
      return { readerCount: rows.stats().readerCount,
        ownerCount: root.diagnostics().ownerCount };
    },
  };
}
