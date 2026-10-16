import { createDOMRoot, type KeyedCollection } from "../snapshot/src/native_runtime_api.ts";
import { beginStructuralCountWindow, endStructuralCountWindow,
  configureStructuralCountProbe } from "../snapshot/src/structural_count_probe.ts";
import { NativeCollectionBoard, makeRows, type Life, type Row } from "../../../structural-locality-protocol-v1/eligibility/native_collection.tsx";
import { NativeGenericBoard } from "../../../structural-locality-protocol-v1/eligibility/native_generic.tsx";

type Operation = { type: "insert"; key: string; value: Row; beforeKey: string | null } |
  { type: "remove"; key: string } | { type: "move"; key: string; beforeKey: string | null };

function describeThrown(value: unknown) {
  const kind = value === null ? "null" : typeof value;
  try { return { kind, message: String(value) }; }
  catch { return { kind, message: "<unprintable thrown value>" }; }
}

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
      const expectedVersion = rows.version;
      let applyResult: ReturnType<typeof rows.apply> | null = null;
      let flushResult: boolean | null = null;
      let receipt: unknown = null;
      let editThrew = false;
      let editThrown: unknown;
      let receiptThrew = false;
      let receiptThrown: unknown;
      if (countMode) beginStructuralCountWindow(root, label);
      try {
        applyResult = rows.apply(expectedVersion, operations);
        if (!applyResult.ok) throw new Error(`edit rejected ${applyResult.reason}`);
        flushResult = root.flush();
        if (flushResult !== true) throw new Error("edit lacked synchronous commit");
      } catch (error) { editThrew = true; editThrown = error; }
      finally {
        if (countMode) try { receipt = endStructuralCountWindow(root); }
        catch (error) { receiptThrew = true; receiptThrown = error; }
      }
      const afterCollectionVersion = rows.version;
      const statsAfter = rows.stats();
      const pendingChangeCount = root.diagnostics().pendingChangeCount;
      if (editThrew || receiptThrew) {
        const failure = new Error(`native edit failed: edit=${editThrew ?
          JSON.stringify(describeThrown(editThrown)) : "none"}; receipt=${receiptThrew ?
          JSON.stringify(describeThrown(receiptThrown)) : "none"}`);
        Object.assign(failure, { editThrew, editThrown, receiptThrew, receiptThrown, receipt });
        throw failure;
      }
      return { receipt, statsBefore, statsAfter, expectedVersion, applyResult,
        afterCollectionVersion, flushResult, pendingChangeCount };
    },
    dispose() {
      root.dispose();
      return { readerCount: rows.stats().readerCount,
        ownerCount: root.diagnostics().ownerCount };
    },
  };
}
