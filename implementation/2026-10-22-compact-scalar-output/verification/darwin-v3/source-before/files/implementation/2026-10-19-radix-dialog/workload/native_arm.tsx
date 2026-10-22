import { AsyncResource, createDOMRoot, jsx, NativeRootWorkQueue, storeRecord, Suspense } from "@r3act/core";
import { NativeRadixApp, createOpenStore, createPointStore,
  type NativeRadixProps } from "../../../compiler/fixtures/native-radix-dialog.tsx";
import { createDialogTrace } from "./dialog_body.tsx";

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(done => { resolve = done; });
  return { promise, resolve };
}
function NativeRootView(props: NativeRadixProps) {
  return <Suspense fallback={<output data-native-waiting="true" />}><NativeRadixApp {...props} /></Suspense>;
}
export function mountNative(host: HTMLElement, portal: HTMLElement) {
  const root = createDOMRoot(host), queue = new NativeRootWorkQueue();
  const { trace, observer } = createDialogTrace();
  const openStore = createOpenStore(), pointStore = createPointStore();
  const pending = deferred<string>(), resource = new AsyncResource(pending.promise);
  let callbackCount = 0, callbackOpen = false, groupedCallback = 0;
  const onOpenChange = (open: boolean) => {
    callbackCount++;
    callbackOpen = open;
    openStore.dispatch(storeRecord({ open }));
  };
  const tree = (label: string, order: readonly string[], gate = false) =>
    <NativeRootView openStore={openStore} pointStore={pointStore} label={label} order={order}
      portalContainer={portal} observer={observer} onOpenChange={onOpenChange}
      gate={gate ? resource : undefined} />;
  root.mount(tree("accepted", ["dialog", "other"]));
  return {
    trace, host, portal, root,
    externalOpen() { openStore.dispatch(storeRecord({ open: true })); },
    externalClose() { openStore.dispatch(storeRecord({ open: false })); },
    updatePoint() { pointStore.dispatch(storeRecord({ point: 7 })); },
    reorder() { root.update(tree("accepted", ["other", "dialog"])); },
    discard() { const candidate = root.prepare(tree("discarded", ["other", "dialog"])); candidate.discard(); },
    pending() { return queue.enqueue({ id: "radix-dialog-pending", roots: [
      { root, tree: tree("next", ["other", "dialog"], true) },
    ], onSettled(outcome) {
      if (outcome.status !== "committed") throw new Error(`pending dialog ${outcome.status}`);
      groupedCallback++;
      if (host.querySelector('[data-native-label="next"]') === null)
        throw new Error("native dialog callback preceded accepted root");
    } }); },
    settle() { pending.resolve("ready"); },
    replaceReady() {
      const stale = root.prepare(tree("stale", ["other", "dialog"]));
      root.update(tree("fresh", ["other", "dialog"]));
      if (stale.validate()) throw new Error("stale dialog candidate validated after newer publication");
      stale.discard();
    },
    remove() { root.update(<NativeRootView openStore={openStore} pointStore={pointStore}
      label="fresh" order={["other"]} portalContainer={portal} observer={observer}
      onOpenChange={onOpenChange} />); },
    reinsert() { root.update(tree("fresh", ["other", "dialog"])); },
    state() { return { callbackCount, callbackOpen, groupedCallback,
      open: openStore.getState().open, version: root.publicationVersion, trace: structuredClone(trace) }; },
    dispose() { queue.dispose(); root.dispose(); return root.diagnostics(); },
  };
}
