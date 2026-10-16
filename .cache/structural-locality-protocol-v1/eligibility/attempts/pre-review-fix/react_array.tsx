import { useLayoutEffect, useState } from "react";
import type { Life } from "./native_collection.tsx";

function ReactRow({ id, life }: { id: string; life: Life }) {
  const [selected, setSelected] = useState(false);
  useLayoutEffect(() => {
    life.mounted(id);
    return () => life.cleaned(id);
  }, [id, life]);
  return <li data-id={id} data-selected={String(selected)} onClick={() => setSelected((prior) => !prior)}>{id}</li>;
}

export function ReactArrayBoard({
  initialIds,
  life,
  registerIdsSetter,
}: {
  initialIds: readonly string[];
  life: Life;
  registerIdsSetter(setter: (ids: string[]) => void): () => void;
}) {
  const [ids, setIds] = useState<string[]>(() => [...initialIds]);
  useLayoutEffect(() => {
    return registerIdsSetter(setIds);
  }, [registerIdsSetter]);
  return <ul data-list="rows">{ids.map((id) => <ReactRow key={id} id={id} life={life} />)}</ul>;
}
