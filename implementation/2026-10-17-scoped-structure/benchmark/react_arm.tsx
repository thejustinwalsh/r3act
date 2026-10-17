import { flushSync } from "react-dom";
import { createRoot } from "react-dom/client";
import { useLayoutEffect, useState } from "react";

type Life = { mount(id: string): void; cleanup(id: string): void };
type IdSetter = (ids: readonly string[]) => void;

function ReactRow({ id, life }: { id: string; life: Life }) {
  const [selected, setSelected] = useState(false);
  useLayoutEffect(() => {
    life.mount(id);
    return () => life.cleanup(id);
  }, [id, life]);
  return <li data-id={id} data-selected={String(selected)} onClick={() => setSelected((value) => !value)}>{id}</li>;
}

function ReactList({ ids, life }: { ids: readonly string[]; life: Life }) {
  return <ul>{ids.map((id) => <ReactRow key={id} id={id} life={life} />)}</ul>;
}

function ReactRoot({ initialIds, life, registerIdsSetter }: {
  initialIds: readonly string[]; life: Life; registerIdsSetter(setter: IdSetter): () => void;
}) {
  const [current, setIds] = useState<readonly string[]>(() => [...initialIds]);
  useLayoutEffect(() => registerIdsSetter(setIds), [registerIdsSetter]);
  return <ReactList ids={current} life={life} />;
}

export function mountReact(host: HTMLElement, ids: readonly string[], life: Life) {
  const root = createRoot(host);
  const canonical = [...ids];
  const toTail = [...canonical.slice(1), canonical[0]];
  const toHead = canonical;
  const withoutMiddle = canonical.filter((id) => id !== "row-512");
  const restoreMiddle = [...withoutMiddle.slice(0, 512), "row-512", ...withoutMiddle.slice(512)];
  let setIds: IdSetter | null = null;
  const registerIdsSetter = (setter: IdSetter) => {
    if (setIds) throw new Error("duplicate React setter registration");
    setIds = setter;
    return () => { if (setIds === setter) setIds = null; };
  };
  flushSync(() => root.render(<ReactRoot initialIds={canonical} life={life} registerIdsSetter={registerIdsSetter} />));
  const update = (next: readonly string[]) => {
    if (!setIds) throw new Error("React setter is unavailable");
    flushSync(() => setIds!(next));
  };
  return {
    click(id: string) {
      const node = [...host.querySelectorAll<HTMLLIElement>("li[data-id]")].find((item) => item.dataset.id === id);
      if (!node) throw new Error(`missing row ${id}`);
      flushSync(() => node.click());
    },
    moveTail() { update(toTail); },
    moveHead() { update(toHead); },
    removeMiddle() { update(withoutMiddle); },
    restoreMiddle() { update(restoreMiddle); },
    dispose() { flushSync(() => root.unmount()); return { ownerCount: null, readerCount: null }; },
  };
}
