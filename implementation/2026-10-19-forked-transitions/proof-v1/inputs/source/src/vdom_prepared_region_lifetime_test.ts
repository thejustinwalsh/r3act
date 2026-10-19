import { jsx } from "./jsx_binding_runtime.ts";
import { MemoryVDOMHost, VDOMSnapshotRoot } from "./vdom_snapshot_runtime.ts";

Deno.test("prepared region detects a root change during candidate normalization", () => {
  const host = new MemoryVDOMHost(), container = host.createContainer();
  const root = new VDOMSnapshotRoot(host, container);
  root.commit(jsx("i", { key: "target", title: "initial" }));
  const Reentrant = () => {
    root.commit(jsx("i", { key: "target", title: "fresh" }));
    return jsx("i", { key: "target", title: "stale" });
  };
  const candidate = root.prepareKeyedRegions([{
    key: "target",
    tree: jsx(Reentrant, {}),
  }]);
  if (candidate !== null) {
    throw new Error("Reentrant preparation endorsed a stale target");
  }
  if (container.children[0].props.title !== "fresh") {
    throw new Error("Candidate changed the fresh host projection");
  }
  root.dispose();
});

Deno.test("prepared region rejects disposed target before touching its host", () => {
  class TrackingHost extends MemoryVDOMHost {
    writes = 0;
    override setProp(...args: Parameters<MemoryVDOMHost["setProp"]>) {
      this.writes++;
      super.setProp(...args);
    }
  }
  const host = new TrackingHost(), container = host.createContainer();
  const root = new VDOMSnapshotRoot(host, container);
  root.commit(jsx("i", { key: "target", title: "initial" }));
  const candidate = root.prepareKeyedRegions([{
    key: "target",
    tree: jsx("i", { key: "target", title: "stale" }),
  }]);
  if (!candidate) throw new Error("Expected a prepared region");
  root.dispose();
  const before = host.writes;
  let rejected = false;
  try {
    candidate.commit();
  } catch (error) {
    rejected = error instanceof Error && error.message.includes("stale");
  }
  if (!rejected || host.writes !== before) {
    throw new Error("Disposed prepared region reached a host writer");
  }
});
