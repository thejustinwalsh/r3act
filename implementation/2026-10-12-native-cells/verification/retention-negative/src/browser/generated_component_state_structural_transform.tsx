/** @jsxRuntime classic */
/** @jsx jsx */
/** @jsxFrag Fragment */
import { defineComponent as __uiDefineComponent, useStateAt as __uiUseStateAt, useEffectAt as __uiUseEffectAt } from "../component_state_runtime.ts";
import { jsx, Fragment, keyedOwnerChildren as __uiKeyedOwnerChildren } from "../jsx_binding_runtime.ts";
import type { KeyedOwnerVersion } from "../../src/jsx_binding_runtime.ts";

export const StructuralApp = __uiDefineComponent("compiler/fixtures/component_state_structural.tsx#component:StructuralApp", function StructuralApp({
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
  const [sequence, setSequence] = __uiUseStateAt("compiler/fixtures/component_state_structural.tsx#component:StructuralApp#state:0", { ids: initialIds, version: initialVersion });
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
});

export const StructuralRow = __uiDefineComponent("compiler/fixtures/component_state_structural.tsx#component:StructuralRow", function StructuralRow({ id }: { id: string }) {
  const [selected, setSelected] = __uiUseStateAt("compiler/fixtures/component_state_structural.tsx#component:StructuralRow#state:0", false);
  return (
    <li
      data-id={id}
      data-selected={String(selected)}
      onClick={() => setSelected((previous) => !previous)}
    >
      {id}
    </li>
  );
});
