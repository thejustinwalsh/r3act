import {
  ComponentStateRoot,
  defineComponent,
  useEffectAt,
  useStateAt,
} from "./component_state_runtime.ts";
import { jsx } from "./jsx_binding_runtime.ts";
import {
  type MemoryNode,
  MemoryVDOMHost,
  VDOMSnapshotRoot,
} from "./vdom_snapshot_runtime.ts";

const equal = (actual: unknown, expected: unknown, label: string) => {
  if (!Object.is(actual, expected)) {
    throw new Error(
      `${label}: expected ${String(expected)}, got ${String(actual)}`,
    );
  }
};

Deno.test("host reentry defers root teardown until application exits", () => {
  let root!: ComponentStateRoot<MemoryNode, MemoryNode>;
  let setLocal!: (value: number) => boolean;
  let armed = false;
  let insideHost = false;
  let insideDisposed = true;
  let insideVersion = -1;
  let insideOwnerCount = 0;
  let insideRemovals = 0;
  const host = new class extends MemoryVDOMHost {
    override setProp(
      node: MemoryNode,
      name: string,
      value: unknown,
      previous?: unknown,
    ) {
      if (!armed || name !== "data-value") {
        super.setProp(node, name, value, previous);
        return;
      }
      armed = false;
      insideHost = true;
      try {
        equal(setLocal(9), true, "reentrant setter accepted");
        equal(root.flush(), false, "nested flush deferred");
        root.dispose();
        insideVersion = root.version;
        insideDisposed = root.diagnostics().disposed;
        insideOwnerCount = root.diagnostics().ownerCount;
        super.setProp(node, name, value, previous);
      } finally {
        insideHost = false;
      }
    }
    override remove(parent: MemoryNode, node: MemoryNode) {
      if (insideHost) insideRemovals++;
      super.remove(parent, node);
    }
  }();
  const container = host.createContainer();
  root = new ComponentStateRoot(host, container, {
    rootId: "publication-lifecycle-disposal",
    scheduleCommit() {},
  });
  const View = defineComponent(
    "publication-lifecycle-disposal-view",
    ({ value }: { value: number }) => {
      const [, set] = useStateAt("local", 0);
      setLocal = set;
      return jsx("output", { "data-value": value });
    },
  );
  let failed = false;
  try {
    root.mount(jsx(View, { value: 0 }));
    const candidate = root.prepare(jsx(View, { value: 2 }));
    armed = true;
    let commitError: unknown;
    try {
      candidate.commitHost();
    } catch (error) {
      commitError = error;
    }
    equal(commitError instanceof Error, true, "cancelled candidate rejects");
    equal(insideDisposed, false, "root remains alive during host callback");
    equal(
      insideVersion,
      1,
      "accepted version remains stable during host application",
    );
    equal(insideOwnerCount > 0, true, "owners remain during host callback");
    equal(insideRemovals, 0, "host removal waits for callback exit");
    equal(root.diagnostics().disposed, true, "teardown follows host exit");
  } catch (error) {
    failed = true;
    throw error;
  } finally {
    try {
      root.dispose();
    } catch (error) {
      if (failed) console.error("Disposal cleanup failed", error);
      else throw error;
    }
  }
});

Deno.test("effect failure follows publication without terminal host quarantine", () => {
  const host = new MemoryVDOMHost();
  const root = new ComponentStateRoot(host, host.createContainer(), {
    rootId: "publication-lifecycle-effect",
    scheduleCommit() {},
  });
  const View = defineComponent(
    "publication-lifecycle-effect-view",
    ({ value }: { value: number }) => {
      if (value === 2) {
        useEffectAt("fault", () => {
          throw new Error("effect fault");
        });
      }
      return jsx("output", { "data-value": value });
    },
  );
  let failed = false;
  try {
    root.mount(jsx(View, { value: 0 }));
    const candidate = root.prepare(jsx(View, { value: 2 }));
    candidate.commitHost();
    candidate.publish();
    let effectError: unknown;
    try {
      candidate.runEffects();
    } catch (error) {
      effectError = error;
    }
    equal(
      effectError instanceof AggregateError,
      true,
      "effect failure reported",
    );
    equal(root.version, 2, "host publication remains accepted");
    const recovery = root.prepare(jsx(View, { value: 3 }));
    recovery.commitHost();
    recovery.publish();
    recovery.runEffects();
    equal(root.version, 3, "root can publish after effect failure");
  } catch (error) {
    failed = true;
    throw error;
  } finally {
    try {
      root.dispose();
    } catch (error) {
      if (failed) console.error("Effect cleanup failed", error);
      else throw error;
    }
  }
});

Deno.test("newer host callback state survives exact candidate acknowledgement", () => {
  let setLocal!: (value: number) => boolean;
  let armed = false;
  const host = new class extends MemoryVDOMHost {
    override setProp(
      node: MemoryNode,
      name: string,
      value: unknown,
      previous?: unknown,
    ) {
      if (armed && name === "data-value") {
        armed = false;
        equal(setLocal(9), true, "newer state action accepted");
      }
      super.setProp(node, name, value, previous);
    }
  }();
  const container = host.createContainer();
  const root = new ComponentStateRoot(host, container, {
    rootId: "publication-lifecycle-newer-action",
    scheduleCommit() {},
  });
  const View = defineComponent(
    "publication-lifecycle-newer-action-view",
    ({ value }: { value: number }) => {
      const [local, set] = useStateAt("local", 0);
      setLocal = set;
      return jsx("output", { "data-value": value, "data-local": local });
    },
  );
  let failed = false;
  try {
    root.mount(jsx(View, { value: 0 }));
    const candidate = root.prepare(jsx(View, { value: 2 }));
    armed = true;
    candidate.commitHost();
    candidate.publish();
    candidate.runEffects();
    equal(
      root.diagnostics().pendingChangeCount > 0,
      true,
      "newer action pending",
    );
    root.flush();
    equal(
      container.children[0].props["data-local"],
      9,
      "newer action rendered",
    );
  } catch (error) {
    failed = true;
    throw error;
  } finally {
    try {
      root.dispose();
    } catch (error) {
      if (failed) console.error("Newer action cleanup failed", error);
      else throw error;
    }
  }
});

Deno.test("accepted structural snapshot remains visible through partial host failure", () => {
  let root!: ComponentStateRoot<MemoryNode, MemoryNode>;
  let armed = false;
  let observedDuringApply = "";
  const host = new class extends MemoryVDOMHost {
    override setProp(
      node: MemoryNode,
      name: string,
      value: unknown,
      previous?: unknown,
    ) {
      if (armed && name === "data-value") {
        armed = false;
        observedDuringApply = JSON.stringify(root.snapshot);
        super.setProp(node, name, value, previous);
        throw new Error("host application fault");
      }
      super.setProp(node, name, value, previous);
    }
  }();
  root = new ComponentStateRoot(host, host.createContainer(), {
    rootId: "publication-lifecycle-accepted-snapshot",
    scheduleCommit() {},
  });
  let failed = false;
  try {
    root.mount(jsx("section", {}, [
      jsx("output", { key: "a", "data-value": "old" }),
    ]));
    const accepted = JSON.stringify(root.snapshot);
    const candidate = root.prepare(jsx("section", {}, [
      jsx("output", { key: "a", "data-value": "new" }),
      jsx("output", { key: "b", "data-value": "added" }),
    ]));
    armed = true;
    let commitError: unknown;
    try {
      candidate.commitHost();
    } catch (error) {
      commitError = error;
    }
    equal(commitError instanceof Error, true, "host fault surfaced");
    equal(observedDuringApply, accepted, "old snapshot during host apply");
    equal(
      JSON.stringify(root.snapshot),
      accepted,
      "old snapshot after partial failure",
    );
  } catch (error) {
    failed = true;
    throw error;
  } finally {
    try {
      root.dispose();
    } catch (error) {
      if (failed) console.error("Snapshot cleanup failed", error);
      else throw error;
    }
  }
});

Deno.test("dirty accepted keyed snapshot is reconstructed on inspection", () => {
  let vdom!: VDOMSnapshotRoot<MemoryNode, MemoryNode>;
  let armed = false;
  let during: string[] = [];
  const rows = () => {
    const tree = vdom.snapshot as readonly {
      children: readonly { key: string; props: Record<string, unknown> }[];
    }[];
    return tree[0].children.map((child) =>
      `${child.key}:${String(child.props["data-value"])}`
    );
  };
  const host = new class extends MemoryVDOMHost {
    override setProp(
      node: MemoryNode,
      name: string,
      value: unknown,
      previous?: unknown,
    ) {
      if (armed && name === "data-value") {
        armed = false;
        during = rows();
        super.setProp(node, name, value, previous);
        throw new Error("partial host failure");
      }
      super.setProp(node, name, value, previous);
    }
  }();
  vdom = new VDOMSnapshotRoot(host, host.createContainer());
  let failed = false;
  try {
    vdom.commit(jsx("section", { key: "root" }, [
      jsx("output", { key: "a", "data-value": "old" }),
    ]));
    equal(
      vdom.commitKeyedRegion(
        "root",
        jsx("section", { key: "root" }, [
          jsx("output", { key: "a", "data-value": "middle" }),
          jsx("output", { key: "b", "data-value": "added" }),
        ]),
      ),
      true,
      "first keyed update",
    );
    vdom.beginPublication();
    armed = true;
    let commitError: unknown;
    try {
      vdom.commitKeyedRegion(
        "root",
        jsx("section", { key: "root" }, [
          jsx("output", { key: "a", "data-value": "new" }),
          jsx("output", { key: "b", "data-value": "added" }),
          jsx("output", { key: "c", "data-value": "new" }),
        ]),
      );
    } catch (error) {
      commitError = error;
      vdom.failPublication();
    }
    equal(commitError instanceof Error, true, "partial host failure surfaced");
    equal(during.join(","), "a:middle,b:added", "accepted rows during apply");
    equal(rows().join(","), "a:middle,b:added", "accepted rows after failure");
  } catch (error) {
    failed = true;
    throw error;
  } finally {
    try {
      vdom.dispose();
    } catch (error) {
      if (failed) console.error("VDOM cleanup failed", error);
      else throw error;
    }
  }
});
