import { AsyncResource, createDOMRoot, jsx, NativeRootWorkQueue, storeRecord, Suspense } from "@r3act/core";
import { NativeIslandApp, createPointStore } from "../../../compiler/fixtures/native-react-island.tsx";

function NativeRootView(props: Parameters<typeof NativeIslandApp>[0]) {
  return <Suspense fallback={<output data-native-waiting="true" />}><NativeIslandApp {...props} /></Suspense>;
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(done => { resolve = done; });
  return { promise, resolve };
}

export function mountNative(hosts: readonly [HTMLElement, HTMLElement]) {
  const trace = { mounts: {} as Record<string, number>, cleanups: {} as Record<string, number>, props: [] as string[] };
  const points = [createPointStore(), createPointStore()] as const;
  const roots = hosts.map(host => createDOMRoot(host)) as [ReturnType<typeof createDOMRoot>, ReturnType<typeof createDOMRoot>];
  const orders = [["a", "b"], ["c"]] as const;
  const gate = deferred<string>();
  const resource = new AsyncResource(gate.promise);
  const queue = new NativeRootWorkQueue();
  let nativeActions = 0, callbacks = 0, callbackVersions: number[] = [];
  const tree = (index: 0 | 1, label: string, pending = false) =>
    <NativeRootView label={label} order={orders[index]} point={points[index]}
      gate={pending ? resource : undefined} trace={trace} onNativeAction={() => { nativeActions++; }} />;
  roots[0].mount(tree(0, "accepted"));
  roots[1].mount(tree(1, "accepted"));
  const initialVersions = roots.map(root => root.publicationVersion);
  return {
    trace, roots, hosts, initialVersions,
    updatePoints() {
      points[0].dispatch(storeRecord({ point: 7 }));
      points[1].dispatch(storeRecord({ point: 9 }));
    },
    reorder() { roots[0].update(<NativeRootView label="accepted" order={["b", "a"]} point={points[0]}
      trace={trace} onNativeAction={() => { nativeActions++; }} />); },
    remove() { roots[0].update(<NativeRootView label="accepted" order={["b"]} point={points[0]}
      trace={trace} onNativeAction={() => { nativeActions++; }} />); },
    reinsert() { roots[0].update(<NativeRootView label="accepted" order={["b", "a"]} point={points[0]}
      trace={trace} onNativeAction={() => { nativeActions++; }} />); },
    discard() {
      const candidate = roots[0].prepare(tree(0, "discarded"));
      candidate.discard();
    },
    enqueuePending() {
      return queue.enqueue({ id: "react-island-pending", roots: [
        { root: roots[0], tree: tree(0, "next", true) },
        { root: roots[1], tree: tree(1, "next", true) },
      ], onSettled(outcome) {
        if (outcome.status !== "committed") throw new Error(`native group ${outcome.status}`);
        callbacks++;
        callbackVersions = roots.map(root => root.publicationVersion);
        if (hosts.some(host => host.querySelector('[data-native-label="next"]') === null))
          throw new Error("native group callback preceded accepted roots");
      } });
    },
    settle() { gate.resolve("ready"); },
    replaceReady() {
      const stale = roots[0].prepare(tree(0, "stale"));
      roots[0].update(tree(0, "fresh"));
      if (stale.validate()) throw new Error("stale native candidate validated after newer commit");
      stale.discard();
    },
    state() { return { nativeActions, callbacks, callbackVersions,
      versions: roots.map(root => root.publicationVersion), trace: structuredClone(trace) }; },
    dispose() { queue.dispose(); const diagnostics = roots.map(root => { root.dispose(); return root.diagnostics(); }); return diagnostics; },
  };
}
