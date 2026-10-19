/** @jsxRuntime classic */
/** @jsx jsx */
/** @jsxFrag Fragment */
import { defineComponent as __uiDefineComponent, useStateAt as __uiUseStateAt, useEffectAt as __uiUseEffectAt } from "../component_state_runtime.ts";
import { jsx, Fragment } from "../jsx_binding_runtime.ts";

type OwnerProps = Readonly<{
  id: "A" | "B";
  active: boolean;
  onSetup: (id: "A" | "B") => void;
  onCleanup: (id: "A" | "B") => void;
}>;

export const StatefulOwner = __uiDefineComponent("compiler/fixtures/developer_study_task_a.tsx#component:StatefulOwner", function StatefulOwner({
  id,
  active,
  onSetup,
  onCleanup,
}: OwnerProps) {
  const [draft, setDraft] = __uiUseStateAt("compiler/fixtures/developer_study_task_a.tsx#component:StatefulOwner#state:0", 0);
  if (active) {
    __uiUseEffectAt("compiler/fixtures/developer_study_task_a.tsx#component:StatefulOwner#effect:0", () => {
      onSetup(id);
      return () => onCleanup(id);
    });
  }

  return (
    <li data-owner={id}>
      <output data-draft={draft}>{draft}</output>
      {active && (
        <section data-region="settings">
          <button data-action="increment" onClick={() => setDraft((value) => value + 1)}>
            Increment
          </button>
        </section>
      )}
    </li>
  );
});
