import { useState } from "react";

export type TaskAOwner = Readonly<{ id: "A" | "B"; active: boolean }>;
export type TaskALifecycle = Readonly<{
  onSetup: (id: TaskAOwner["id"]) => void;
  onCleanup: (id: TaskAOwner["id"]) => void;
}>;

function Owner({ id, active, onSetup, onCleanup }: TaskAOwner & TaskALifecycle) {
  const [draft, setDraft] = useState(0);

  return (
    <li data-owner={id}>
      <output data-draft={draft}>{draft}</output>
      {/* TODO: add the conditional settings region and its subscription effect. */}
    </li>
  );
}

export function ParticipantTaskA({
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
}
