import { useLayoutEffect, useState } from "react";

export type IslandProps = {
  id: string;
  label: string;
  point: number;
  nativeClicks: number;
  onNativeAction: () => void;
  trace: { mounts: Record<string, number>; cleanups: Record<string, number>; props: string[] };
};

export function ReactLeaf({ id, label, point, nativeClicks, onNativeAction, trace }: IslandProps) {
  const [clicks, setClicks] = useState(0);
  useLayoutEffect(() => {
    trace.mounts[id] = (trace.mounts[id] ?? 0) + 1;
    return () => { trace.cleanups[id] = (trace.cleanups[id] ?? 0) + 1; };
  }, [id, trace]);
  useLayoutEffect(() => { trace.props.push(`${id}:${label}:${point}:${nativeClicks}`); }, [id, label, point, nativeClicks, trace]);
  return <button data-island={id} data-label={label} data-point={point} data-clicks={clicks}
    data-native-clicks={nativeClicks}
    onClick={() => { setClicks(current => current + 1); onNativeAction(); }}>{id}</button>;
}
