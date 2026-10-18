import { flushSync } from "react-dom";
import { createRoot } from "react-dom/client";
import { useLayoutEffect, useState } from "react";

type RowSetter = (value: number) => void;
function ReactRow({ id, register }: { id: string; register(id: string, setter: RowSetter | undefined): void }) {
  const [value, setValue] = useState(0);
  useLayoutEffect(() => {
    register(id, setValue);
    return () => { register(id, undefined); };
  }, [id, register, setValue]);
  return <li data-id={id} data-value={value}>{id}</li>;
}
function ReactList({ ids, register }: { ids: readonly string[]; register(id: string, setter: RowSetter | undefined): void }) {
  return <ul>{ids.map((id) => <ReactRow key={id} id={id} register={register} />)}</ul>;
}
function ReactApp({ ids, register, bindOrder }: {
  ids: readonly string[];
  register(id: string, setter: RowSetter | undefined): void;
  bindOrder(setter: (ids: readonly string[]) => void): void;
}) {
  const [current, setIds] = useState(ids);
  useLayoutEffect(() => { bindOrder(setIds); }, [bindOrder, setIds]);
  return <ReactList ids={current} register={register} />;
}

export function mountReact(host: HTMLElement, ids: readonly string[], selected: readonly string[]) {
  const root = createRoot(host);
  const setters = new Map<string, RowSetter>();
  const mounts = new Map<string, number>();
  const cleanups = new Map<string, number>();
  let setOrder: ((ids: readonly string[]) => void) | null = null;
  const register = (id: string, setter: RowSetter | undefined) => {
    if (setter) {
      setters.set(id, setter);
      mounts.set(id, (mounts.get(id) ?? 0) + 1);
    } else {
      setters.delete(id);
      cleanups.set(id, (cleanups.get(id) ?? 0) + 1);
    }
  };
  const bindOrder = (setter: (ids: readonly string[]) => void) => { setOrder = setter; };
  const canonical = [...ids];
  const mountStart = performance.now();
  flushSync(() => root.render(<ReactApp ids={canonical} register={register} bindOrder={bindOrder} />));
  const mountDurationMs = performance.now() - mountStart;
  flushSync(() => { for (const id of selected) setters.get(id)?.(1); });
  const tail = [...canonical.slice(1), canonical[0]];
  const head = canonical;
  if (!setOrder) throw new Error("React order setter is not registered after mount");
  const selectedSetters = selected.map((id) => {
    const setter = setters.get(id);
    if (!setter) throw new Error(`selected React setter is missing for ${id}`);
    return setter;
  });
  return {
    mountDurationMs,
    lifecycle() { return { mounts: Object.fromEntries(mounts), cleanups: Object.fromEntries(cleanups) }; },
    transact(step: number, moveTail: boolean) {
      flushSync(() => {
        for (const [index, setter] of selectedSetters.entries()) setter(step * 1000 + index + 2);
        setOrder!(moveTail ? tail : head);
      });
      return null;
    },
    dispose() { flushSync(() => root.unmount()); return { ownerCount: null, readerCount: null }; },
  };
}
