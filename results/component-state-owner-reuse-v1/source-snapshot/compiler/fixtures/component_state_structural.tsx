import { useState } from "react";

export function StructuralApp({
  initialIds,
  applyNext,
}: {
  initialIds: string[];
  applyNext: (previous: string[]) => string[];
}) {
  const [ids, setIds] = useState(initialIds);
  return (
    <section data-app="structural">
      <button data-action="toggle-structure" onClick={() => setIds(applyNext)}>
        Apply structural update
      </button>
      <ul data-list="rows">
        {__uiKeyedOwnerChildren(
          "compiler/fixtures/component_state_structural.tsx#component:StructuralRow",
          ids.map((id) => <StructuralRow key={id} id={id} />),
        )}
      </ul>
    </section>
  );
}

export function StructuralRow({ id }: { id: string }) {
  const [selected, setSelected] = useState(false);
  return (
    <li
      data-id={id}
      data-selected={String(selected)}
      onClick={() => setSelected((previous) => !previous)}
    >
      {id}
    </li>
  );
}
