/** @jsxRuntime classic */
/** @jsx jsx */
/** @jsxFrag Fragment */
import { defineComponent as __uiDefineComponent, useStateAt as __uiUseStateAt, useEffectAt as __uiUseEffectAt } from "../component_state_runtime.ts";
import { jsx, Fragment } from "../jsx_binding_runtime.ts";

export type TaskAOwner = Readonly<{ id: "A" | "B"; active: boolean }>;
export type TaskALifecycle = Readonly<{
  onSetup: (id: TaskAOwner["id"]) => void;
  onCleanup: (id: TaskAOwner["id"]) => void;
}>;

const Owner = __uiDefineComponent("developer-study/starter/runtime/task-a.tsx#component:Owner", function Owner({ id, active, onSetup, onCleanup }: TaskAOwner & TaskALifecycle) {
  const [draft, setDraft] = __uiUseStateAt("developer-study/starter/runtime/task-a.tsx#component:Owner#state:0", 0);

  return (
    <li data-owner={id}>
      <output data-draft={draft}>{draft}</output>
      {/* TODO: add the conditional settings region and its subscription effect. */}
    </li>
  );
});

export const ParticipantTaskA = __uiDefineComponent("developer-study/starter/runtime/task-a.tsx#component:ParticipantTaskA", function ParticipantTaskA({
  owners,
  lifecycle,
}: {
  owners: readonly TaskAOwner[];
  lifecycle: TaskALifecycle;
}) {
  return (
    <ul aria-label="Settings owners">
      {owners.map((owner) => (
        <Owner key={owner.id} {...owner} {...lifecycle} />
      ))}
    </ul>
  );
});
