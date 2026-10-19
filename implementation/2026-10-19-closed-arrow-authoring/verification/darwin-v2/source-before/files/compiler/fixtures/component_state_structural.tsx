import { useState } from "react";
import type { KeyedOwnerVersion } from "../../src/jsx_binding_runtime.ts";

export function StructuralApp({
  initialIds,
  applyNext,
  initialVersion,
}: {
  initialIds: string[];
  applyNext: (previous: string[], version?: KeyedOwnerVersion) => string[] | {
    ids: string[];
    version?: KeyedOwnerVersion;
  };
  initialVersion?: KeyedOwnerVersion;
}) {
  const [sequence, setSequence] = useState({ ids: initialIds, version: initialVersion });
  return (
    <section data-app="structural">
      <button data-action="toggle-structure" onClick={() => setSequence((previous) => {
        const next = applyNext(previous.ids, previous.version);
        return Array.isArray(next)
          ? { ...previous, ids: next }
          : { ids: next.ids, version: next.version };
      })}>
        Apply structural update
      </button>
      <ul data-list="rows">
        {__uiKeyedOwnerChildren(
          "compiler/fixtures/component_state_structural.tsx#component:StructuralRow",
          sequence.ids.map((id) => <StructuralRow key={id} id={id} />),
          sequence.version,
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
