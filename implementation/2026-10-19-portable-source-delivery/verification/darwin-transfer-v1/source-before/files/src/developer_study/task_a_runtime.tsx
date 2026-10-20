import { StatefulOwner } from "./generated_task_a_runtime.tsx";
import { jsx } from "../jsx_binding_runtime.ts";

export type TaskAOwner = Readonly<{ id: "A" | "B"; active: boolean }>;
export type TaskALifecycle = Readonly<{
  onSetup: (id: TaskAOwner["id"]) => void;
  onCleanup: (id: TaskAOwner["id"]) => void;
}>;

/** Participant-style task fixture: owner identity is keyed; activity is a conditional region. */
export const taskATree = (owners: readonly TaskAOwner[], lifecycle: TaskALifecycle) =>
  jsx(
    "ul",
    { "aria-label": "Settings owners" },
    owners.map((owner) =>
      jsx(StatefulOwner, {
        ...lifecycle,
        ...owner,
        key: owner.id,
      })
    ),
  );
