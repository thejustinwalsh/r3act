import {
  createKeyedCollection,
  type KeyedCollection,
  useEffect,
  useState,
} from "../../../src/native_runtime_api.ts";

export type Row = { id: string };
export type Life = {
  mounted(id: string): void;
  cleaned(id: string): void;
};

export const makeRows = (ids: readonly string[]) =>
  createKeyedCollection(ids.map((id) => ({ id })), (row) => row.id);

function NativeRow({ id, life }: { id: string; life: Life; key?: string }) {
  const [selected, setSelected] = useState(false);
  useEffect(() => {
    life.mounted(id);
    return () => life.cleaned(id);
  });
  return (
    <li
      data-id={id}
      data-selected={String(selected)}
      onClick={() => setSelected((prior) => !prior)}
    >
      {id}
    </li>
  );
}

export function NativeCollectionBoard({
  rows,
  life,
}: {
  rows: KeyedCollection<Row>;
  life: Life;
}) {
  return <ul data-list="rows">{rows.map((row) => <NativeRow key={row.id} id={row.id} life={life} />)}</ul>;
}
