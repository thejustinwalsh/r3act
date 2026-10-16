import { useEffect, useState } from "../../../src/native_runtime_api.ts";
import type { Life } from "./native_collection.tsx";

function GenericRow({ id, life }: { id: string; life: Life; key?: string }) {
  const [selected, setSelected] = useState(false);
  useEffect(() => {
    life.mounted(id);
    return () => life.cleaned(id);
  });
  return <li data-id={id} data-selected={String(selected)} onClick={() => setSelected((prior) => !prior)}>{id}</li>;
}

export function NativeGenericBoard({
  initialIds,
  life,
  registerIdsSetter,
}: {
  initialIds: readonly string[];
  life: Life;
  registerIdsSetter(setter: (ids: string[]) => void): () => void;
}) {
  const [ids, setIds] = useState([...initialIds]);
  useEffect(() => {
    return registerIdsSetter(setIds);
  });
  return <ul data-list="rows">{ids.map((id) => <GenericRow key={id} id={id} life={life} />)}</ul>;
}
