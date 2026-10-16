import { useEffect, useState } from "react";
import type { TaskAOwner, TaskALifecycle } from "./task_a_runtime.tsx";

function StatefulOwner({
  id,
  active,
  onSetup,
  onCleanup,
}: TaskAOwner & TaskALifecycle) {
  const [draft, setDraft] = useState(0);
  useEffect(() => {
    if (!active) return;
    onSetup(id);
    return () => onCleanup(id);
  }, [active, id, onSetup, onCleanup]);

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
}

/** Public-API React comparison fixture with the same outputs and keyed owners. */
export function TaskAReactTree({
  owners,
  lifecycle,
}: {
  owners: readonly TaskAOwner[];
  lifecycle: TaskALifecycle;
}) {
  return (
    <ul aria-label="Settings owners">
      {owners.map((owner) => (
        <StatefulOwner key={owner.id} {...owner} {...lifecycle} />
      ))}
    </ul>
  );
}
