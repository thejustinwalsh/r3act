import {
  bindStatePropAt,
  ComponentStateRoot,
  defineComponent,
  useStateAt,
} from "./component_state_runtime.ts";
import { jsx } from "./jsx_binding_runtime.ts";
import { OwnerStateWorld, type StateAction } from "./owner_state_world.ts";
import { type MemoryNode, MemoryVDOMHost, VDOMSnapshotRoot } from "./vdom_snapshot_runtime.ts";

const equal = (actual: unknown, expected: unknown, message: string) => {
  if (!Object.is(actual, expected)) {
    throw new Error(`${message}: expected ${String(expected)}, got ${String(actual)}`);
  }
};

const metadata = () => ({
  propOnlySites: ["value"],
  stateLayout: {
    schemaVersion: 1 as const,
    slots: [{ siteId: "value", slot: 0 }],
  },
});
const numericProgram = (sinkId: string) => ({
  schemaVersion: 1 as const,
  sinkId,
  sourceSites: ["value"],
});

Deno.test("prepared cell cuts preserve the captured value across host reentry", () => {
  let root!: ComponentStateRoot<MemoryNode>;
  let setter!: (action: StateAction<number>) => boolean;
  let reenter = false;
  const scheduled: Array<() => void> = [];
  class Host extends MemoryVDOMHost {
    override setProp(node: MemoryNode, name: string, value: unknown, previous?: unknown) {
      super.setProp(node, name, value, previous);
      if (reenter && name === "value") {
        reenter = false;
        setter(9);
        equal(root.flush(), false, "reentrant flush must respect the active cut barrier");
      }
    }
  }
  const host = new Host();
  const container = host.createContainer();
  root = new ComponentStateRoot(host, container, {
    scheduleCommit: (commit) => scheduled.push(commit),
  });
  const Output = defineComponent("prepared-cut.reentry", () => {
    [, setter] = useStateAt("value", 1);
    return jsx("output", {
      value: bindStatePropAt("value", (value) => value, numericProgram("reentry.value")),
    });
  }, metadata());
  try {
    root.mount(jsx(Output, {}));
    const scheduledBefore = scheduled.length;
    setter(4);
    reenter = true;
    root.flush();
    equal(container.children[0].props.value, 4, "outer cut must use its captured value");
    equal(root.diagnostics().pendingChangeCount, 1, "newer reentrant write remains pending");
    equal(scheduled.length > scheduledBefore, true, "newer write is scheduled after the cut");
    root.flush();
    equal(container.children[0].props.value, 9, "next cut commits the newer value");
    equal(root.diagnostics().pendingChangeCount, 0, "both exact versions are eventually acknowledged");
  } finally {
    root.dispose();
  }
});

Deno.test("prepared cell tokens refresh after binding changes and decline after removal", () => {
  let setter!: (value: number) => boolean;
  let prepareCalls = 0;
  let currentChecks = 0;
  let executeCalls = 0;
  let preflightDeclines = 0;
  let scalarFallbackCalls = 0;
  const originalPrepare = VDOMSnapshotRoot.prototype.prepareNumericCellProgram;
  const originalCurrent = VDOMSnapshotRoot.prototype.isPreparedNumericCellProgramCurrent;
  const originalExecute = VDOMSnapshotRoot.prototype.executePreparedNumericCells;
  const originalScalarExecute = VDOMSnapshotRoot.prototype.executeSourceProgram;
  VDOMSnapshotRoot.prototype.prepareNumericCellProgram = function (...args) {
    prepareCalls++;
    return originalPrepare.apply(this, args);
  };
  VDOMSnapshotRoot.prototype.isPreparedNumericCellProgramCurrent = function (token) {
    currentChecks++;
    return originalCurrent.call(this, token);
  };
  VDOMSnapshotRoot.prototype.executePreparedNumericCells = function (...args) {
    executeCalls++;
    const result = originalExecute.apply(this, args);
    if (result === null) preflightDeclines++;
    return result;
  };
  VDOMSnapshotRoot.prototype.executeSourceProgram = function (...args) {
    scalarFallbackCalls++;
    return originalScalarExecute.apply(this, args);
  };
  const host = new MemoryVDOMHost();
  const container = host.createContainer();
  const root = new ComponentStateRoot(host, container, { scheduleCommit() {} });
  const Output = defineComponent<{ first: boolean; second: boolean }>(
    "prepared-cut.refresh",
    ({ first, second }) => {
      const [, set] = useStateAt("value", 1);
      setter = set;
      return jsx("output", {
        ...(first
          ? { first: bindStatePropAt("value", (value) => value, numericProgram("refresh.first")) }
          : {}),
        ...(second
          ? { second: bindStatePropAt("value", (value) => value * 2, numericProgram("refresh.second")) }
          : {}),
      });
    },
    metadata(),
  );
  try {
    root.mount(jsx(Output, { first: true, second: false }));
    setter(2);
    root.flush();
    equal(executeCalls, 1, "the initial cut executes once");
    equal(preflightDeclines, 0, "the initial token passes VDOM preflight");
    equal(container.children[0].props.first, 2, "first prepared writer updates");

    root.update(jsx(Output, { first: true, second: true }));
    setter(3);
    root.flush();
    equal(executeCalls, 3, "stale cached token is preflighted then retried once");
    equal(preflightDeclines, 1, "binding refresh is detected by VDOM preflight");
    equal(container.children[0].props.first, 3, "retained writer uses refreshed fanout");
    equal(container.children[0].props.second, 6, "new writer is included after refresh");

    root.update(jsx(Output, { first: true, second: false }));
    setter(4);
    root.flush();
    equal(executeCalls, 5, "writer removal refreshes by one preflight retry");
    equal(preflightDeclines, 2, "removing one writer invalidates the old token");
    equal(container.children[0].props.first, 4, "writer removal refreshes surviving fanout");
    equal("second" in container.children[0].props, false, "removed writer is absent");

    root.update(jsx(Output, { first: false, second: false }));
    setter(5);
    const beforeFallback = root.publicationVersion;
    root.flush();
    equal(executeCalls, 6, "unbound refresh gets one declined preflight");
    equal(preflightDeclines, 3, "removed final writer leaves cached token stale");
    equal(scalarFallbackCalls, 0, "removing every writer does not run a scalar program");
    equal(root.publicationVersion, beforeFallback + 1, "the existing root fallback publishes once after decline");
    equal("first" in container.children[0].props, false, "no-writer state falls back cleanly");
    equal(root.diagnostics().pendingChangeCount, 0, "fallback retires the exact dirty version");
    equal(prepareCalls, 4, "first use and each stale edge prepare or attempt to prepare");
    equal(currentChecks, 0, "Root relies on execution preflight instead of a duplicate query");
  } finally {
    VDOMSnapshotRoot.prototype.prepareNumericCellProgram = originalPrepare;
    VDOMSnapshotRoot.prototype.isPreparedNumericCellProgramCurrent = originalCurrent;
    VDOMSnapshotRoot.prototype.executePreparedNumericCells = originalExecute;
    VDOMSnapshotRoot.prototype.executeSourceProgram = originalScalarExecute;
    root.dispose();
  }
});

Deno.test("prepared cut null preflight retries once and publishes only the accepted retry", () => {
  let setter!: (value: number) => boolean;
  let decline = false;
  let prepareCalls = 0;
  let executeCalls = 0;
  let scalarFallbackCalls = 0;
  const originalPrepare = VDOMSnapshotRoot.prototype.prepareNumericCellProgram;
  const originalExecute = VDOMSnapshotRoot.prototype.executePreparedNumericCells;
  const originalScalarExecute = VDOMSnapshotRoot.prototype.executeSourceProgram;
  VDOMSnapshotRoot.prototype.prepareNumericCellProgram = function (...args) {
    prepareCalls++;
    return originalPrepare.apply(this, args);
  };
  VDOMSnapshotRoot.prototype.executePreparedNumericCells = function (...args) {
    executeCalls++;
    if (decline) {
      decline = false;
      return null;
    }
    return originalExecute.apply(this, args);
  };
  VDOMSnapshotRoot.prototype.executeSourceProgram = function (...args) {
    scalarFallbackCalls++;
    return originalScalarExecute.apply(this, args);
  };
  const host = new MemoryVDOMHost();
  const container = host.createContainer();
  const root = new ComponentStateRoot(host, container, { scheduleCommit() {} });
  const Output = defineComponent("prepared-cut.decline", () => {
    [, setter] = useStateAt("value", 1);
    return jsx("output", {
      value: bindStatePropAt("value", (value) => value, numericProgram("decline.value")),
    });
  }, metadata());
  try {
    root.mount(jsx(Output, {}));
    setter(2);
    root.flush();
    const callsBeforeRetry = executeCalls;
    const before = root.publicationVersion;
    setter(6);
    decline = true;
    root.flush();
    equal(container.children[0].props.value, 6, "accepted retry publishes the captured value");
    equal(executeCalls, callsBeforeRetry + 2, "one null preflight is followed by one retry");
    equal(prepareCalls, 2, "the null-only path refreshes preparation before retry");
    equal(scalarFallbackCalls, 0, "successful retry does not invoke generic fallback");
    equal(root.publicationVersion, before + 1, "the retry publishes exactly once");
    equal(root.diagnostics().pendingChangeCount, 0, "acknowledgement follows the accepted retry");
  } finally {
    VDOMSnapshotRoot.prototype.prepareNumericCellProgram = originalPrepare;
    VDOMSnapshotRoot.prototype.executePreparedNumericCells = originalExecute;
    VDOMSnapshotRoot.prototype.executeSourceProgram = originalScalarExecute;
    root.dispose();
  }
});

Deno.test("two prepared preflight declines fall back without early publication or acknowledgement", () => {
  let root!: ComponentStateRoot<MemoryNode>;
  let setter!: (value: number) => boolean;
  let declineCount = 0;
  let executeCalls = 0;
  let fallbackCalls = 0;
  let beforeDeclinedCut = 0;
  const originalExecute = VDOMSnapshotRoot.prototype.executePreparedNumericCells;
  const originalScalarExecute = VDOMSnapshotRoot.prototype.executeSourceProgram;
  VDOMSnapshotRoot.prototype.executePreparedNumericCells = function (...args) {
    executeCalls++;
    if (declineCount > 0) {
      equal(root.publicationVersion, beforeDeclinedCut, "a declined attempt must not publish");
      equal(root.diagnostics().pendingChangeCount, 1, "a declined attempt must not acknowledge");
      declineCount--;
      return null;
    }
    return originalExecute.apply(this, args);
  };
  VDOMSnapshotRoot.prototype.executeSourceProgram = function (...args) {
    fallbackCalls++;
    return originalScalarExecute.apply(this, args);
  };
  const host = new MemoryVDOMHost();
  const container = host.createContainer();
  root = new ComponentStateRoot(host, container, { scheduleCommit() {} });
  const Output = defineComponent("prepared-cut.double-decline", () => {
    [, setter] = useStateAt("value", 1);
    return jsx("output", {
      value: bindStatePropAt("value", (value) => value, numericProgram("double-decline.value")),
    });
  }, metadata());
  try {
    root.mount(jsx(Output, {}));
    setter(2);
    root.flush();
    const callsBeforeDeclinedCut = executeCalls;
    beforeDeclinedCut = root.publicationVersion;
    setter(7);
    declineCount = 2;
    root.flush();
    equal(executeCalls, callsBeforeDeclinedCut + 2, "both prepared attempts decline before fallback");
    equal(fallbackCalls, 1, "generic scalar fallback runs once after both declines");
    equal(container.children[0].props.value, 7, "fallback publishes the latest committed value");
    equal(root.publicationVersion, beforeDeclinedCut + 1, "only fallback advances publication");
    equal(root.diagnostics().pendingChangeCount, 0, "fallback acknowledges after its successful commit");
  } finally {
    VDOMSnapshotRoot.prototype.executePreparedNumericCells = originalExecute;
    VDOMSnapshotRoot.prototype.executeSourceProgram = originalScalarExecute;
    root.dispose();
  }
});

Deno.test("accepted prepared false result is acknowledged without retry", () => {
  let setter!: (value: number) => boolean;
  let prepareCalls = 0;
  let executeCalls = 0;
  const originalPrepare = VDOMSnapshotRoot.prototype.prepareNumericCellProgram;
  const originalExecute = VDOMSnapshotRoot.prototype.executePreparedNumericCells;
  VDOMSnapshotRoot.prototype.prepareNumericCellProgram = function (...args) {
    prepareCalls++;
    return originalPrepare.apply(this, args);
  };
  VDOMSnapshotRoot.prototype.executePreparedNumericCells = function (...args) {
    executeCalls++;
    return originalExecute.apply(this, args);
  };
  const host = new MemoryVDOMHost();
  const container = host.createContainer();
  const root = new ComponentStateRoot(host, container, { scheduleCommit() {} });
  const Output = defineComponent("prepared-cut.accepted-false", () => {
    [, setter] = useStateAt("value", 0);
    return jsx("output", {
      value: bindStatePropAt(
        "value",
        (value) => value % 2,
        numericProgram("accepted-false.value"),
      ),
    });
  }, metadata());
  try {
    root.mount(jsx(Output, {}));
    const before = root.publicationVersion;
    setter(2);
    root.flush();
    equal(container.children[0].props.value, 0, "equal projected value keeps the host prop unchanged");
    equal(executeCalls, 1, "the first supported cut executes once");
    equal(prepareCalls, 1, "the first cut prepares one token");
    equal(root.publicationVersion, before + 1, "accepted no-write cut advances logical publication");
    equal(root.diagnostics().pendingChangeCount, 0, "accepted no-write cut is acknowledged");

    setter(4);
    root.flush();
    equal(executeCalls, 2, "accepted false is not retried as stale");
    equal(prepareCalls, 1, "cached token is reused on the second cut");
    equal(root.publicationVersion, before + 2, "second accepted no-write cut advances logical publication");
    equal(root.diagnostics().pendingChangeCount, 0, "second accepted no-write cut is acknowledged");
  } finally {
    VDOMSnapshotRoot.prototype.prepareNumericCellProgram = originalPrepare;
    VDOMSnapshotRoot.prototype.executePreparedNumericCells = originalExecute;
    root.dispose();
  }
});

Deno.test("prepared cell tokens remain isolated across roots sharing one World", () => {
  const world = new OwnerStateWorld();
  const host = new MemoryVDOMHost();
  const firstContainer = host.createContainer();
  const secondContainer = host.createContainer();
  const first = new ComponentStateRoot(host, firstContainer, {
    world,
    rootId: "prepared-cut-first",
    scheduleCommit() {},
  });
  const second = new ComponentStateRoot(host, secondContainer, {
    world,
    rootId: "prepared-cut-second",
    scheduleCommit() {},
  });
  let setFirst!: (value: number) => boolean;
  let setSecond!: (value: number) => boolean;
  const Output = defineComponent<{ value: number; save: (set: (value: number) => boolean) => void }>(
    "prepared-cut.shared",
    ({ value, save }) => {
      const [, set] = useStateAt("value", value);
      save(set);
      return jsx("output", {
        value: bindStatePropAt("value", (current) => current, numericProgram("shared.value")),
      });
    },
    metadata(),
  );
  try {
    first.mount(jsx(Output, {
      value: 1,
      save: (set: (value: number) => boolean) => setFirst = set,
    }));
    second.mount(jsx(Output, {
      value: 2,
      save: (set: (value: number) => boolean) => setSecond = set,
    }));
    setFirst(5);
    setSecond(8);
    first.flush();
    equal(firstContainer.children[0].props.value, 5, "first root commits its own prepared writer");
    equal(secondContainer.children[0].props.value, 2, "first root did not run second root's token");
    equal(second.diagnostics().pendingChangeCount, 1, "second root retains its dirty cut");
    second.flush();
    equal(secondContainer.children[0].props.value, 8, "second root prepares and commits independently");
    equal(world.hasPendingChanges(), false, "both roots acknowledge their own exact versions");
  } finally {
    first.dispose();
    second.dispose();
  }
});

Deno.test("prepared cut host failure stays terminal with the dirty version pending", () => {
  let setter!: (value: number) => boolean;
  let fail = false;
  class Host extends MemoryVDOMHost {
    override setProp(node: MemoryNode, name: string, value: unknown, previous?: unknown) {
      if (fail && name === "value") throw new Error("prepared writer failed");
      super.setProp(node, name, value, previous);
    }
  }
  const host = new Host();
  const container = host.createContainer();
  const root = new ComponentStateRoot(host, container, { scheduleCommit() {} });
  const Output = defineComponent("prepared-cut.failure", () => {
    [, setter] = useStateAt("value", 0);
    return jsx("output", {
      value: bindStatePropAt("value", (value) => value, numericProgram("failure.value")),
    });
  }, metadata());
  try {
    root.mount(jsx(Output, {}));
    setter(3);
    fail = true;
    let threw = false;
    try {
      root.flush();
    } catch (error) {
      threw = error instanceof Error && error.message === "prepared writer failed";
    }
    equal(threw, true, "host writer exception propagates");
    equal(root.diagnostics().pendingChangeCount, 1, "failed cut is not acknowledged");
    equal(worldHasPending(root), true, "World cut remains dirty after host failure");
    let terminal = false;
    try {
      root.flush();
    } catch {
      terminal = true;
    }
    equal(terminal, true, "host failure remains terminal");
  } finally {
    root.dispose();
  }
});

Deno.test("disposal inside a prepared writer waits for the host batch and clears token buffers", () => {
  let root!: ComponentStateRoot<MemoryNode>;
  let setter!: (value: number) => boolean;
  let disposeDuringWrite = false;
  const writes: string[] = [];
  class Host extends MemoryVDOMHost {
    override setProp(node: MemoryNode, name: string, value: unknown, previous?: unknown) {
      super.setProp(node, name, value, previous);
      if (disposeDuringWrite && name === "first") {
        writes.push(name);
        root.dispose();
      } else if (disposeDuringWrite) writes.push(name);
    }
  }
  const host = new Host();
  const container = host.createContainer();
  root = new ComponentStateRoot(host, container, { scheduleCommit() {} });
  const Output = defineComponent("prepared-cut.dispose", () => {
    [, setter] = useStateAt("value", 1);
    return jsx("output", {
      first: bindStatePropAt("value", (value) => value, numericProgram("dispose.first")),
      second: bindStatePropAt("value", (value) => value * 2, numericProgram("dispose.second")),
    });
  }, metadata());
  root.mount(jsx(Output, {}));
  disposeDuringWrite = true;
  setter(4);
  let failure = "";
  try { root.flush(); } catch (error) { failure = String(error); }
  equal(failure.includes("Root disposal was requested during host application"), true,
    "disposal rejects the batch after host application");
  equal(writes.join(","), "first,second", "admitted writers finish before teardown");
  equal(root.diagnostics().pendingChangeCount, 0, "disposal drops the root cut");
  equal(root.diagnostics().ownerCount, 0, "disposal releases owner state");
});

function worldHasPending(root: ComponentStateRoot<MemoryNode>) {
  return root.world.hasPendingChanges();
}
