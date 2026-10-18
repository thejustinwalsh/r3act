import {
  createDOMRoot,
  createKeyedCollection,
  renderCollectionAt,
  useEffect,
  useState,
  type KeyedCollection,
  type KeyedCollectionOperation,
  type StateCellHandle,
} from "../../../src/native_runtime_api.ts";

type RowValue = { id: string };
type Registry = { setters: Map<string, (value: number) => boolean>; mounts: Map<string, number>; cleanups: Map<string, number> };
function NativeRow({ id, registry }: { id: string; registry: Registry; key?: string }) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    registry.setters.set(id, setValue);
    registry.mounts.set(id, (registry.mounts.get(id) ?? 0) + 1);
    return () => {
      registry.setters.delete(id);
      registry.cleanups.set(id, (registry.cleanups.get(id) ?? 0) + 1);
    };
  });
  return <li data-id={id} data-value={value}>{id}</li>;
}
function NativeList({ rows, registry }: { rows: KeyedCollection<RowValue>; registry: Registry }) {
  return <ul>{renderCollectionAt("first-pass-joint-rows", rows, (row) => <NativeRow key={row.id} id={row.id} registry={registry} />)}</ul>;
}

export function mountNative(host: HTMLElement, ids: readonly string[], selected: readonly string[]) {
  const rows = createKeyedCollection(ids.map((id) => ({ id })), (row) => row.id);
  const registry: Registry = { setters: new Map(), mounts: new Map(), cleanups: new Map() };
  const root = createDOMRoot(host, { scheduleCommit() {} });
  const mountStart = performance.now();
  root.mount(<NativeList rows={rows} registry={registry} />);
  root.flush();
  const mountDurationMs = performance.now() - mountStart;
  const dirty: StateCellHandle[] = [];
  const unsubscribe = root.world.subscribeDirtyCells((handle) => dirty.push(handle));
  const handles: StateCellHandle[] = [];
  for (const id of selected) {
    const before = dirty.length;
    const setter = registry.setters.get(id);
    if (!setter || !setter(1)) throw new Error(`cannot prime selected row ${id}`);
    const handle = dirty.slice(before).find((item) => item.site.endsWith("#state:0"));
    if (!handle) throw new Error(`no state handle captured for ${id}`);
    handles.push(handle);
  }
  unsubscribe();
  if (!root.flush()) throw new Error("native baseline update failed");
  if (new Set(handles.map((handle) => handle.owner)).size !== selected.length) throw new Error("selected row handles are not unique");
  const selectedSetters = selected.map((id) => {
    const setter = registry.setters.get(id);
    if (!setter) throw new Error(`selected row setter is missing for ${id}`);
    return setter;
  });

  const toTail: readonly KeyedCollectionOperation<RowValue>[] = Object.freeze([{ type: "move", key: "row-0", beforeKey: null }]);
  const toHead: readonly KeyedCollectionOperation<RowValue>[] = Object.freeze([{ type: "move", key: "row-0", beforeKey: "row-1" }]);
  const transact = (step: number, move: readonly KeyedCollectionOperation<RowValue>[]) => {
    for (const [index, setter] of selectedSetters.entries()) setter(step * 1000 + index + 2);
    const applied = rows.apply(rows.version, move);
    if (!applied.ok) throw new Error(`collection apply rejected: ${JSON.stringify(applied)}`);
    const candidate = root.prepareTransaction({ cells: handles, collections: [rows] });
    if (!candidate || !candidate.validate()) throw new Error("joint transaction preparation or validation failed");
    candidate.commitHost();
    if (!candidate.validatePostHost()) throw new Error("joint transaction became stale after host commit");
    candidate.preparePublication();
    candidate.publish();
    candidate.installSubscriptions();
    candidate.runEffects();
    return candidate;
  };
  return {
    mountDurationMs,
    lifecycle() { return { mounts: Object.fromEntries(registry.mounts), cleanups: Object.fromEntries(registry.cleanups) }; },
    transact(step: number, tail: boolean) { return transact(step, tail ? toTail : toHead); },
    scopeState() { return { rootId: root.rootId, publicationVersion: root.publicationVersion }; },
    dispose() { root.dispose(); return { ownerCount: root.diagnostics().ownerCount, readerCount: rows.stats().readerCount }; },
  };
}
