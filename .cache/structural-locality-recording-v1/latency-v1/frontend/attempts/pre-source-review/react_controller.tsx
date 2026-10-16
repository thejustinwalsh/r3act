import { createRoot } from "react-dom/client";
import { flushSync } from "react-dom";
import { ReactArrayBoard } from "../../../structural-locality-protocol-v1/eligibility/react_array.tsx";
import type { Life } from "../../../structural-locality-protocol-v1/eligibility/native_collection.tsx";

const clickRow = (container: HTMLElement, id: string) => {
  const node = [...container.querySelectorAll<HTMLLIElement>("li[data-id]")]
    .find((item) => item.dataset.id === id);
  if (!node) throw Error(`missing click target ${id}`);
  node.click();
};

export function mountReactArray(container: HTMLElement, initialIds: string[], life: Life) {
  const root = createRoot(container);
  let setter: ((ids: string[]) => void) | null = null;
  const registerIdsSetter = (next: (ids: string[]) => void) => {
    if (setter) throw Error("duplicate React setter");
    setter = next;
    return () => { if (setter !== next) throw Error("React setter cleanup mismatch"); setter = null; };
  };
  try {
    flushSync(() => root.render(<ReactArrayBoard initialIds={initialIds} life={life}
      registerIdsSetter={registerIdsSetter} />));
    if (!setter) throw Error("React setter absent after mount");
  } catch (error) { root.unmount(); throw error; }
  return {
    click(id: string) { flushSync(() => clickRow(container, id)); },
    reset(ids: readonly string[]) {
      if (!setter) throw Error("React setter absent at reset");
      const nextIds = [...ids];
      flushSync(() => setter!(nextIds));
    },
    edit(nextIds: string[]) {
      if (!setter) throw Error("React setter absent at edit");
      const start = performance.now();
      flushSync(() => setter!(nextIds));
      const end = performance.now();
      return { start, end };
    },
    dispose() {
      root.unmount();
      if (setter) throw Error("React setter retained after disposal");
      return { ownerCount: null, readerCount: null };
    },
  };
}
