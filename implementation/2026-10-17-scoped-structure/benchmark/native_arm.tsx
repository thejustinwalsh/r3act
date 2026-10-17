import {
  createDOMRoot,
  createKeyedCollection,
  renderCollectionAt,
  useEffect,
  useState,
  type KeyedCollection,
  type KeyedCollectionOperation,
} from "../../../src/native_runtime_api.ts";

type Row = { id: string };
type Life = { mount(id: string): void; cleanup(id: string): void };

function NativeRow({ id, life }: { id: string; life: Life; key?: string }) {
  const [selected, setSelected] = useState(false);
  useEffect(() => {
    life.mount(id);
    return () => life.cleanup(id);
  });
  return <li data-id={id} data-selected={String(selected)} onClick={() => setSelected((value) => !value)}>{id}</li>;
}

function NativeList({ rows, life }: { rows: KeyedCollection<Row>; life: Life }) {
  return <ul>{renderCollectionAt("scoped-structure-rows", rows, (row) => <NativeRow key={row.id} id={row.id} life={life} />)}</ul>;
}

export function mountNative(host: HTMLElement, ids: readonly string[], life: Life) {
  const rows = createKeyedCollection(ids.map((id) => ({ id })), (row) => row.id);
  const root = createDOMRoot(host, { scheduleCommit: () => {} });
  root.mount(<NativeList rows={rows} life={life} />);
  root.flush();
  const moveTail: readonly KeyedCollectionOperation<Row>[] = Object.freeze([{ type: "move", key: "row-0", beforeKey: null }]);
  const moveHead: readonly KeyedCollectionOperation<Row>[] = Object.freeze([{ type: "move", key: "row-0", beforeKey: "row-1" }]);
  const removeMiddle: readonly KeyedCollectionOperation<Row>[] = Object.freeze([{ type: "remove", key: "row-512" }]);
  const restoreMiddle: readonly KeyedCollectionOperation<Row>[] = Object.freeze([{ type: "insert", key: "row-512", value: { id: "row-512" }, beforeKey: "row-513" }]);
  const accept = (operations: readonly KeyedCollectionOperation<Row>[]) => {
    const result = rows.apply(rows.version, operations);
    if (!result.ok) throw new Error(`native collection edit rejected: ${JSON.stringify(result)}`);
    const candidate = root.prepareCollections([rows]);
    if (!candidate) throw new Error("native scoped collection candidate declined");
    if (!candidate.validate()) throw new Error("native scoped collection candidate became stale before host commit");
    candidate.commitHost();
    if (!candidate.validatePostHost()) throw new Error("native scoped collection candidate became stale after host commit");
    candidate.preparePublication();
    candidate.publish();
    candidate.installSubscriptions();
    candidate.runEffects();
    return candidate;
  };
  const resetInsert = (operations: readonly KeyedCollectionOperation<Row>[]) => {
    const result = rows.apply(rows.version, operations);
    if (!result.ok || !root.flush()) throw new Error(`native untimed insertion reset failed: ${JSON.stringify(result)}`);
  };
  return {
    click(id: string) {
      const node = [...host.querySelectorAll<HTMLLIElement>("li[data-id]")].find((item) => item.dataset.id === id);
      if (!node) throw new Error(`missing row ${id}`);
      node.click();
      root.flush();
    },
    moveTail() { return accept(moveTail); },
    moveHead() { return accept(moveHead); },
    removeMiddle() { return accept(removeMiddle); },
    restoreMiddle() { resetInsert(restoreMiddle); },
    scopeState() { return { rootId: root.rootId, publicationVersion: root.publicationVersion }; },
    dispose() { root.dispose(); return { ownerCount: root.diagnostics().ownerCount, readerCount: rows.stats().readerCount }; },
  };
}
