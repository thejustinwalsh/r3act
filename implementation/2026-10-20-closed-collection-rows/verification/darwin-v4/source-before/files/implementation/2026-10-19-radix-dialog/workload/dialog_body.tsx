import { useLayoutEffect, useState } from "react";

export function createDialogTrace() {
  const trace = { mounts: 0, cleanups: 0, props: [] as string[] };
  const observer = Object.freeze({
    activate() { trace.mounts++; return () => { trace.cleanups++; }; },
    observe(label: string, point: number, nativeCount: number) {
      trace.props.push(`${label}:${point}:${nativeCount}`);
    },
  });
  return { trace, observer };
}
export type DialogObserver = ReturnType<typeof createDialogTrace>["observer"];
export type DialogBodyProps = { label: string; point: number; nativeCount: number; observer: DialogObserver };

export function DialogBody({ label, point, nativeCount, observer }: DialogBodyProps) {
  const [clicks, setClicks] = useState(0);
  useLayoutEffect(observer.activate, [observer]);
  useLayoutEffect(() => observer.observe(label, point, nativeCount),
    [label, point, nativeCount, observer]);
  return <div data-dialog-body={label} data-point={point} data-native-count={nativeCount}>
    <input aria-label="Dialog note" defaultValue="seed" />
    <button data-dialog-local={clicks} onClick={() => setClicks(current => current + 1)}>Count</button>
  </div>;
}
