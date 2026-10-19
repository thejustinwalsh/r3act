import { useLayoutEffect, useState } from "react";

export type IslandProps = {
  id: string;
  label: string;
  point: number;
  nativeClicks: number;
  onNativeAction: () => void;
  observer: IslandObserver;
};

export function createIslandTrace() {
  const trace = { mounts: {} as Record<string, number>, cleanups: {} as Record<string, number>,
    props: [] as string[] };
  const observer = Object.freeze({
    activate(id: string) {
      trace.mounts[id] = (trace.mounts[id] ?? 0) + 1;
      return () => { trace.cleanups[id] = (trace.cleanups[id] ?? 0) + 1; };
    },
    observe(id: string, label: string, point: number, nativeClicks: number) {
      trace.props.push(`${id}:${label}:${point}:${nativeClicks}`);
    },
  });
  return { trace, observer };
}
export type IslandObserver = ReturnType<typeof createIslandTrace>["observer"];

export function ReactLeaf({ id, label, point, nativeClicks, onNativeAction, observer }: IslandProps) {
  const [clicks, setClicks] = useState(0);
  useLayoutEffect(() => observer.activate(id), [id, observer]);
  useLayoutEffect(() => observer.observe(id, label, point, nativeClicks),
    [id, label, point, nativeClicks, observer]);
  return <button data-island={id} data-label={label} data-point={point} data-clicks={clicks}
    data-native-clicks={nativeClicks}
    onClick={() => { setClicks(current => current + 1); onNativeAction(); }}>{id}</button>;
}
