import { useEffect, useState } from "react";

export function ConditionalPanel({ show }: { show: boolean }) {
  let conditional = "hidden";
  let increment: JSX.Element | null = null;
  if (show) {
    const [count, setCount] = useState(0);
    conditional = String(count);
    increment = <button data-action="increment" onClick={() => setCount((previous) => previous + 1)}>+</button>;
  }
  const [label] = useState("tail");
  return <output>{conditional}:{label}{increment}</output>;
}

export function Counter() {
  const [count, setCount] = useState(0);
  return <button data-count={count} onClick={() => setCount((previous) => previous + 1)}>{count}</button>;
}

export function BenchmarkItem({ id, onRender }: { id: number; onRender: () => void }) {
  onRender();
  const [selected, setSelected] = useState(false);
  return <span data-id={id} data-selected={String(selected)} onClick={() => setSelected((previous) => !previous)}>{String(selected)}</span>;
}

export function KeyedRow({ id }: { id: string }) {
  const [selected, setSelected] = useState(false);
  return <li data-id={id} data-selected={String(selected)} onClick={() => setSelected((previous) => !previous)}>{id}</li>;
}

export function EffectProbe({
  active,
  label,
  onSetup,
  onCleanup,
  fail = false,
}: {
  active: boolean;
  label: string;
  onSetup: (label: string) => void;
  onCleanup: (label: string) => void;
  fail?: boolean;
}) {
  const [count, setCount] = useState(0);
  if (active) {
    useEffect(() => {
      onSetup(label);
      return () => onCleanup(label);
    });
  }
  if (fail) throw new Error("effect candidate failed");
  return <button onClick={() => setCount((previous) => previous + 1)}>{count}</button>;
}
