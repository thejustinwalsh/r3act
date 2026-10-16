/** @jsxRuntime classic */
/** @jsx jsx */
/** @jsxFrag Fragment */
import { defineComponent as __uiDefineComponent, useStateAt as __uiUseStateAt, useEffectAt as __uiUseEffectAt } from "../component_state_runtime.ts";
import { jsx, Fragment, keyedOwnerChildren as __uiKeyedOwnerChildren } from "../jsx_binding_runtime.ts";

export const StructuralApp = __uiDefineComponent("compiler/fixtures/component_state_structural.tsx#component:StructuralApp", function StructuralApp({
  initialIds,
  applyNext,
}: {
  initialIds: string[];
  applyNext: (previous: string[]) => string[];
}) {
  const [ids, setIds] = __uiUseStateAt("compiler/fixtures/component_state_structural.tsx#component:StructuralApp#state:0", initialIds);
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
