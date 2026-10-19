import { Suspense, startTransition, use, useState } from "react";
import { createRoot, type Root } from "react-dom/client";
import { flushSync } from "react-dom";
import { ReactLeaf } from "./react_leaf.tsx";

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(done => { resolve = done; });
  return { promise, resolve };
}
type Props = { id: 0 | 1; label: string; order: readonly string[]; point: number;
  gate?: Promise<string>; trace: Parameters<typeof ReactLeaf>[0]["trace"]; onNativeAction: () => void };
function ReactApp(props: Props) {
  const gate = props.gate ? use(props.gate) : null;
  const [nativeClicks, setNativeClicks] = useState(0);
  return <section data-native-label={props.label} data-native-clicks={nativeClicks}>
    <button data-native-action="true" onClick={() => setNativeClicks(current => current + 1)}>native</button>
    {props.order.map(id => <ReactLeaf key={id} id={id} label={props.label} point={props.point}
      nativeClicks={nativeClicks}
      trace={props.trace} onNativeAction={props.onNativeAction} />)}
    {gate ? <output data-gate={gate} /> : null}
  </section>;
}
export function mountReact(hosts: readonly [HTMLElement, HTMLElement]) {
  const trace = { mounts: {} as Record<string, number>, cleanups: {} as Record<string, number>, props: [] as string[] };
  const roots = hosts.map(host => createRoot(host)) as [Root, Root];
  const gate = deferred<string>();
  let nativeActions = 0;
  const render = (id: 0 | 1, label: string, order: readonly string[], point: number, pending = false) =>
    <Suspense fallback={null}><ReactApp id={id} label={label} order={order} point={point}
      gate={pending ? gate.promise : undefined} trace={trace}
      onNativeAction={() => { nativeActions++; }} /></Suspense>;
  flushSync(() => { roots[0].render(render(0, "accepted", ["a", "b"], 1)); roots[1].render(render(1, "accepted", ["c"], 1)); });
  return {
    trace, hosts,
    updatePoints() { flushSync(() => { roots[0].render(render(0, "accepted", ["a", "b"], 7));
      roots[1].render(render(1, "accepted", ["c"], 9)); }); },
    reorder() { flushSync(() => roots[0].render(render(0, "accepted", ["b", "a"], 7))); },
    remove() { flushSync(() => roots[0].render(render(0, "accepted", ["b"], 7))); },
    reinsert() { flushSync(() => roots[0].render(render(0, "accepted", ["b", "a"], 7))); },
    discard() {},
    enqueuePending() { startTransition(() => { roots[0].render(render(0, "next", ["a", "b"], 7, true));
      roots[1].render(render(1, "next", ["c"], 9, true)); }); return { status: "pending" }; },
    settle() { gate.resolve("ready"); },
    replaceReady() { flushSync(() => roots[0].render(render(0, "fresh", ["a", "b"], 7))); },
    state() { return { nativeActions, callbacks: null, callbackVersions: null, versions: null, trace: structuredClone(trace) }; },
    dispose() { flushSync(() => { roots[0].unmount(); roots[1].unmount(); }); return [{ disposed: true }, { disposed: true }]; },
  };
}
