import { createNativeRoot, createStore, jsx } from "./native_runtime_api.ts";
import { MemoryVDOMHost } from "./vdom_snapshot_runtime.ts";

const equal = (a: unknown, b: unknown) => {
  if (a !== b) throw new Error(`Expected ${String(b)}, received ${String(a)}`);
};

Deno.test("declared task store holds copy membership and release independently", () => {
  const host = new MemoryVDOMHost();
  const root = createNativeRoot(host, host.createContainer(), {
    scheduleCommit() {},
  });
  root.mount(jsx("p", {}, "No store reader"));
  const store = createStore(1);
  const declared = new Set([store]);
  const releaseFirst = root.holdStoreDependencies(declared);
  const releaseSecond = root.holdStoreDependencies(declared);
  declared.clear();
  root.update(jsx("p", {}, "Still no store reader"));
  equal(store.diagnostics().roots, 1);
  equal(store.diagnostics().listeners, 1);
  releaseFirst();
  releaseFirst();
  equal(store.diagnostics().roots, 1);
  releaseSecond();
  equal(store.diagnostics().roots, 0);
  equal(store.diagnostics().listeners, 0);
  root.dispose();
});

Deno.test("root disposal releases unread task dependencies before late lease release", () => {
  const host = new MemoryVDOMHost();
  const root = createNativeRoot(host, host.createContainer());
  const store = createStore(1);
  const release = root.holdStoreDependencies([store]);
  root.dispose();
  equal(store.diagnostics().roots, 0);
  equal(store.diagnostics().listeners, 0);
  release();
  release();
  equal(store.diagnostics().roots, 0);
});
