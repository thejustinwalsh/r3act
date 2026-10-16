import { bindStatePropAt, bindStatePropsAt, ComponentStateRoot, defineComponent, useStateAt } from "./component_state_runtime.ts";
import { jsx } from "./jsx_binding_runtime.ts";
import { type MemoryNode, MemoryVDOMHost, VDOMSnapshotRoot } from "./vdom_snapshot_runtime.ts";

function equal(actual: unknown, expected: unknown, label: string) {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(`${label}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}

function fixture(host = new MemoryVDOMHost()) {
  const site = "prepared-row.fixture";
  const controls: Array<(value: number) => boolean> = [];
  let renders = 0;
  const descriptor = (sinkId: string, sourceSites: string[]) => ({
    schemaVersion: 2 as const, ownerProgramId: site, sinkId, sourceSites,
  });
  const Output = defineComponent(site, () => {
    renders++;
    [, controls[0]] = useStateAt("x", 1);
    [, controls[1]] = useStateAt("y", 2);
    [, controls[2]] = useStateAt("z", 3);
    return jsx("mesh", {
      position: bindStatePropsAt(["x", "y", "z"], ([x, y, z]) => [z, x, y], descriptor("position", ["x", "y", "z"])),
      repeat: bindStatePropAt("x", (x) => x + x, descriptor("repeat", ["x"])),
    });
  }, {
    propOnlySites: ["x", "y", "z"],
    stateLayout: { schemaVersion: 1, programId: site, slots: ["x", "y", "z"].map((siteId, slot) => ({ siteId, slot })) },
  });
  const container = host.createContainer();
  const root = new ComponentStateRoot(host, container, { scheduleCommit() {} });
  root.mount(jsx(Output, {}));
  return { root, container, controls, renders: () => renders };
}

Deno.test("owner-row Root cuts use captured sparse and dense inputs without rerender", () => {
  const calls: number[] = [];
  let scalarFallbacks = 0;
  const execute = VDOMSnapshotRoot.prototype.executePreparedNumericRows;
  const scalar = VDOMSnapshotRoot.prototype.executeSourceProgram;
  VDOMSnapshotRoot.prototype.executePreparedNumericRows = function (...args) {
    calls.push(args[4]);
    return execute.apply(this, args);
  };
  VDOMSnapshotRoot.prototype.executeSourceProgram = function (...args) {
    scalarFallbacks++;
    return scalar.apply(this, args);
  };
  let f: ReturnType<typeof fixture> | undefined;
  try {
    f = fixture();
    f.controls[0](8); f.root.flush();
    equal(f.container.children[0].props.position, [3, 8, 2], "sparse vector keeps untouched inputs");
    f.controls[0](11); f.controls[1](12); f.controls[2](13); f.root.flush();
    equal(f.container.children[0].props.position, [13, 11, 12], "dense vector source order");
    equal(f.container.children[0].props.repeat, 22, "repeated source expression");
    equal(calls, [1, 3], "all eligible cuts take row execution");
    equal(scalarFallbacks, 0, "row execution avoids generic source program");
    equal(f.renders(), 1, "per-frame props avoid component rerender");
    equal(f.root.diagnostics().pendingChangeCount, 0, "accepted versions acknowledged");
  } finally {
    VDOMSnapshotRoot.prototype.executePreparedNumericRows = execute;
    VDOMSnapshotRoot.prototype.executeSourceProgram = scalar;
    f?.root.dispose();
  }
});

Deno.test("owner-row null retry cannot publish or acknowledge before acceptance", () => {
  const execute = VDOMSnapshotRoot.prototype.executePreparedNumericRows;
  let f!: ReturnType<typeof fixture>;
  let declines = 0;
  let calls = 0;
  let publication = 0;
  VDOMSnapshotRoot.prototype.executePreparedNumericRows = function (...args) {
    calls++;
    if (declines) {
      declines--;
      equal(f.root.publicationVersion, publication, "decline leaves publication untouched");
      equal(f.root.diagnostics().pendingChangeCount, 1, "decline leaves state pending");
      return null;
    }
    return execute.apply(this, args);
  };
  try {
    f = fixture();
    publication = f.root.publicationVersion;
    declines = 1; f.controls[0](8); f.root.flush();
    equal(calls, 2, "one bounded refresh retry");
    equal(f.root.publicationVersion, publication + 1, "accepted retry publishes once");
    equal(f.root.diagnostics().pendingChangeCount, 0, "accepted retry acknowledges");
    publication = f.root.publicationVersion;
    declines = 2; f.controls[1](9); f.root.flush();
    equal(calls, 4, "second decline falls back after one retry");
    equal(f.container.children[0].props.position, [3, 8, 9], "fallback retains authored vector");
    equal(f.root.publicationVersion, publication + 1, "fallback alone publishes");
  } finally {
    VDOMSnapshotRoot.prototype.executePreparedNumericRows = execute;
    f?.root.dispose();
  }
});

Deno.test("owner-row host reentry leaves newer work pending and preserves outer outputs", () => {
  let f!: ReturnType<typeof fixture>;
  let reenter = false;
  class Host extends MemoryVDOMHost {
    override setProp(node: MemoryNode, name: string, value: unknown, previous?: unknown) {
      super.setProp(node, name, value, previous);
      if (reenter && name === "position") {
        reenter = false;
        f.controls[0](99); f.controls[1](98);
        equal(f.root.flush(), false, "reentrant flush respects cut barrier");
      }
    }
  }
  f = fixture(new Host());
  try {
    reenter = true; f.controls[0](8); f.root.flush();
    equal(f.container.children[0].props.position, [3, 8, 2], "outer vector captured before writes");
    equal(f.container.children[0].props.repeat, 16, "later writer keeps captured x");
    equal(f.root.diagnostics().pendingChangeCount, 2, "newer exact versions remain pending");
    f.root.flush();
    equal(f.container.children[0].props.position, [3, 99, 98], "next cut sees newer vector");
    equal(f.container.children[0].props.repeat, 198, "next cut sees newer repeated input");
    equal(f.root.diagnostics().pendingChangeCount, 0, "both later versions acknowledged");
  } finally { f.root.dispose(); }
});

Deno.test("owner-row host failure is terminal and never acknowledges the failed cut", () => {
  let throwing = false;
  class Host extends MemoryVDOMHost {
    override setProp(node: MemoryNode, name: string, value: unknown, previous?: unknown) {
      if (throwing && name === "position") throw new Error("row writer failed");
      super.setProp(node, name, value, previous);
    }
  }
  const f = fixture(new Host());
  try {
    const publication = f.root.publicationVersion;
    throwing = true; f.controls[0](8);
    let error = "";
    try { f.root.flush(); } catch (caught) { error = String(caught); }
    equal(error.includes("row writer failed"), true, "writer failure propagates");
    equal(f.root.publicationVersion, publication, "failed host commit does not publish");
    equal(f.root.diagnostics().pendingChangeCount, 1, "failed version remains pending");
    throwing = false;
    let retried = "";
    try { f.root.flush(); } catch (caught) { retried = String(caught); }
    equal(retried.includes("host commit failure"), true, "terminal failure prevents retry");
  } finally { f.root.dispose(); }
});

Deno.test("owner-row accepted no-write cut acknowledges and advances logical publication", () => {
  const site = "prepared-row.noop";
  let setter!: (value: number) => boolean;
  let calls = 0;
  const execute = VDOMSnapshotRoot.prototype.executePreparedNumericRows;
  VDOMSnapshotRoot.prototype.executePreparedNumericRows = function (...args) {
    calls++;
    return execute.apply(this, args);
  };
  const host = new MemoryVDOMHost();
  const container = host.createContainer();
  const root = new ComponentStateRoot(host, container, { scheduleCommit() {} });
  try {
    const Output = defineComponent(site, () => {
      [, setter] = useStateAt("x", 0);
      return jsx("output", { value: bindStatePropAt("x", (x) => x % 2, {
        schemaVersion: 2, ownerProgramId: site, sinkId: "parity", sourceSites: ["x"],
      }) });
    }, { propOnlySites: ["x"], stateLayout: {
      schemaVersion: 1, programId: site, slots: [{ siteId: "x", slot: 0 }],
    } });
    root.mount(jsx(Output, {}));
    const publication = root.publicationVersion;
    setter(2); root.flush(); setter(4); root.flush();
    equal(calls, 2, "two accepted cuts never retry");
    equal(container.children[0].props.value, 0, "stable primitive skips writer");
    equal(root.publicationVersion, publication + 2, "each accepted no-write cut advances logical publication");
    equal(root.diagnostics().pendingChangeCount, 0, "both no-write versions acknowledged");
  } finally {
    VDOMSnapshotRoot.prototype.executePreparedNumericRows = execute;
    root.dispose();
  }
});

Deno.test("owner-row disposal waits for admitted writers and releases cut", () => {
  let f!: ReturnType<typeof fixture>;
  let dispose = false;
  const writes: string[] = [];
  class Host extends MemoryVDOMHost {
    override setProp(node: MemoryNode, name: string, value: unknown, previous?: unknown) {
      super.setProp(node, name, value, previous);
      if (dispose) {
        writes.push(name);
        dispose = false;
        f.root.dispose();
      } else if (writes.length) writes.push(name);
    }
  }
  f = fixture(new Host());
  try {
    dispose = true; f.controls[0](8);
    let failure = "";
    try { f.root.flush(); } catch (error) { failure = String(error); }
    equal(failure.includes("Root disposal was requested during host application"), true,
      "disposal rejects after the host batch");
    equal(writes, ["position", "repeat"], "admitted repeated-input writer finishes before teardown");
    equal(f.container.children.length, 0, "disposed host root is empty");
    equal(f.root.diagnostics().pendingChangeCount, 0, "disposal releases pending cut");
  } finally { f.root.dispose(); }
});
