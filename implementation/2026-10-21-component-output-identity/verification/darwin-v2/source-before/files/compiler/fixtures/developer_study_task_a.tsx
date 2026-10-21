import { useEffect, useState } from "react";

type OwnerProps = Readonly<{
  id: "A" | "B";
  active: boolean;
  onSetup: (id: "A" | "B") => void;
  onCleanup: (id: "A" | "B") => void;
}>;

export function StatefulOwner({
  id,
  active,
  onSetup,
  onCleanup,
}: OwnerProps) {
  const [draft, setDraft] = useState(0);
  if (active) {
    useEffect(() => {
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
}
