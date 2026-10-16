import { flushSync } from "react-dom";
import { createRoot } from "react-dom/client";
import type { Life } from "../native_collection.tsx";
import { ReactArrayBoard } from "../react_array.tsx";

export function mountReact(container: HTMLElement, initialIds: string[], life: Life) {
  const root = createRoot(container);
  let setIds: ((ids: string[]) => void) | null = null;
  const registerIdsSetter = (setter: (ids: string[]) => void) => {
    if (setIds !== null) throw new Error("duplicate React setter");
    setIds = setter;
    return () => { if (setIds === setter) setIds = null; };
  };
  flushSync(() => root.render(<ReactArrayBoard initialIds={initialIds} life={life}
    registerIdsSetter={registerIdsSetter} />));
  return {
    click(id: string) {
      const node = [...container.querySelectorAll<HTMLLIElement>("li[data-id]")]
        .find((item) => item.dataset.id === id);
      if (!node) throw new Error(`missing click target ${id}`);
      flushSync(() => node.click());
    },
    edit(_edit: { kind: string }, next: string[]) {
      if (!setIds) throw new Error("React setter unregistered");
      flushSync(() => setIds!(next));
      return {};
    },
    dispose() {
      flushSync(() => root.unmount());
      return { readerCount: null, ownerCount: null, setterRegistered: setIds !== null };
    },
  };
}
