import { assertEquals } from "jsr:@std/assert";
import {
  createAsyncStore,
  type StoreRenderSnapshot,
} from "./async_store_runtime.ts";
import { RootWorkQueue } from "./root_work_queue.ts";

Deno.test("store and queue publish reverse-ready groups without tearing observers", () => {
  const store = createAsyncStore("", (state, action: string) => state + action);
  const queue = new RootWorkQueue<StoreRenderSnapshot<string, string>>(
    new Map([["a", 0], ["b", 0]]),
  );
  const host = new Map([["a", ""], ["b", ""]]);
  const observed: string[][] = [];
  for (const rootId of ["a", "b"]) {
    store.beginRender(rootId);
    store.subscribe(rootId, () => {
      observed.push([
        host.get("a")!,
        host.get("b")!,
        store.getStateForRoot("a"),
        store.getStateForRoot("b"),
      ]);
    });
  }
  const launch = (id: string, action: string) => {
    store.beginTransition(id, ["a", "b"]);
    store.dispatch(action, { kind: "transition", transitionId: id });
    return queue.enqueue({
      id,
      roots: ["a", "b"],
      pending: ["ready"],
      prepare: ({ versions }) =>
        ["a", "b"].map((rootId) => {
          const value = store.beginRender(rootId, { transitions: [id] });
          return {
            rootId,
            baseVersion: versions.get(rootId)!,
            targetVersion: versions.get(rootId)! + 1,
            value,
            validate: () => value.validate(),
          };
        }),
      commit: (candidates) => {
        for (const item of candidates) host.set(item.rootId, item.value.state);
        for (const item of candidates) item.value.commitAfterValidatedRender();
      },
      onSettled: ({ status }) => {
        if (status === "committed") {
          store.commitTransitionRoots(id, ["a", "b"], { finish: true });
        }
      },
    });
  };
  const a = launch("A", "A");
  const b = launch("B", "B");
  observed.length = 0;
  assertEquals(b.resolve("ready").status, "committed");
  assertEquals(host.get("a"), "B");
  assertEquals(a.status, "pending");
  assertEquals(observed, [["B", "B", "B", "B"], ["B", "B", "B", "B"]]);
  observed.length = 0;
  assertEquals(a.resolve("ready").status, "committed");
  assertEquals(observed, [["AB", "AB", "AB", "AB"], ["AB", "AB", "AB", "AB"]]);
});
