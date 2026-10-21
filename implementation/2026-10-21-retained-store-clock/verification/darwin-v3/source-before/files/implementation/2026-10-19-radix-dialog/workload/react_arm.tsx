import { Suspense, startTransition, use, useState, useSyncExternalStore } from "react";
import { flushSync } from "react-dom";
import { createRoot } from "react-dom/client";
import { ReactRadixDialog } from "@r3act/react-bridge/radix-dialog";
import { DialogBody, createDialogTrace, type DialogObserver } from "./dialog_body.tsx";

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(done => { resolve = done; });
  return { promise, resolve };
}
function externalStore<T>(initial: T) {
  let value = initial;
  const listeners = new Set<() => void>();
  return { getSnapshot: () => value,
    subscribe(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener); }; },
    publish(next: T) { value = next; for (const listener of [...listeners]) listener(); } };
}
type AppProps = { label: string; order: readonly string[]; portalContainer: HTMLElement;
  observer: DialogObserver; openStore: ReturnType<typeof externalStore<boolean>>;
  pointStore: ReturnType<typeof externalStore<number>>; onOpenChange: (open: boolean) => void;
  gate?: Promise<string> };
function ReactApp(props: AppProps) {
  if (props.gate) use(props.gate);
  const open = useSyncExternalStore(props.openStore.subscribe, props.openStore.getSnapshot);
  const point = useSyncExternalStore(props.pointStore.subscribe, props.pointStore.getSnapshot);
  const [nativeCount, setNativeCount] = useState(0);
  return <section data-native-label={props.label} data-native-count={nativeCount}>
    <button data-native-action="true" onClick={() => setNativeCount(current => current + 1)}>Native count</button>
    {props.order.map(id => <div key={id} data-row={id}>{id === "dialog" ?
      <ReactRadixDialog open={open} onOpenChange={props.onOpenChange}
        title="Settings" description="Edit your dialog note" triggerLabel="Open settings"
        closeLabel="Close settings" portalContainer={props.portalContainer}>
        <DialogBody label={props.label} point={point} nativeCount={nativeCount} observer={props.observer} />
      </ReactRadixDialog> : <output data-other="stable" />}</div>)}
  </section>;
}
export function mountReact(host: HTMLElement, portal: HTMLElement) {
  const root = createRoot(host), { trace, observer } = createDialogTrace();
  const openStore = externalStore(false), pointStore = externalStore(1);
  const pending = deferred<string>();
  let callbackCount = 0, callbackOpen = false;
  const onOpenChange = (open: boolean) => { callbackCount++; callbackOpen = open;
    openStore.publish(open); };
  const tree = (label: string, order: readonly string[], gate = false) =>
    <Suspense fallback={null}><ReactApp label={label} order={order} portalContainer={portal}
      observer={observer} openStore={openStore} pointStore={pointStore}
      onOpenChange={onOpenChange} gate={gate ? pending.promise : undefined} /></Suspense>;
  flushSync(() => root.render(tree("accepted", ["dialog", "other"])));
  return {
    trace, host, portal,
    externalOpen() { openStore.publish(true); },
    externalClose() { openStore.publish(false); },
    updatePoint() { pointStore.publish(7); },
    reorder() { flushSync(() => root.render(tree("accepted", ["other", "dialog"]))); },
    discard() {},
    pending() { startTransition(() => root.render(tree("next", ["other", "dialog"], true))); return { status: "pending" }; },
    settle() { pending.resolve("ready"); },
    replaceReady() { flushSync(() => root.render(tree("fresh", ["other", "dialog"]))); },
    remove() { flushSync(() => root.render(tree("fresh", ["other"]))); },
    reinsert() { flushSync(() => root.render(tree("fresh", ["other", "dialog"]))); },
    state() { return { callbackCount, callbackOpen, groupedCallback: null,
      open: openStore.getSnapshot(), version: null, trace: structuredClone(trace) }; },
    dispose() { flushSync(() => root.unmount()); return { disposed: true }; },
  };
}
