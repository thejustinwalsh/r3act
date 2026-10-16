import {
  bindStatePropAt,
  ComponentStateRoot,
  defineComponent,
  useStateAt,
  useStoreAt,
} from "./component_state_runtime.ts";
import { createAsyncStore } from "./async_store_runtime.ts";
import { jsx } from "./jsx_binding_runtime.ts";
import { PendingStateChanges } from "./pending_state_changes.ts";
import { type MemoryNode, MemoryVDOMHost } from "./vdom_snapshot_runtime.ts";
import { OwnerStateWorld } from "./owner_state_world.ts";
import type { StateCellHandle } from "./owner_state_world.ts";

const equal = (actual: unknown, expected: unknown, message: string) => {
  if (!Object.is(actual, expected)) {
    throw new Error(`${message}: expected ${String(expected)}, got ${String(actual)}`);
  }
};

const numericProgram = (sinkId: string, sourceSites: readonly string[]) => ({
  schemaVersion: 1 as const,
  sinkId,
  sourceSites,
});

Deno.test("native numeric cut bypasses StateChange capture and defers reentrant flush", () => {
  let root!: ComponentStateRoot<MemoryNode, MemoryNode>;
  let setValue!: (value: number) => boolean;
  let reenter = false;
  const scheduled: (() => void)[] = [];
  class Host extends MemoryVDOMHost {
    override setProp(node: MemoryNode, name: string, value: unknown, previous?: unknown) {
      super.setProp(node, name, value, previous);
      if (reenter && name === "data-value") {
        reenter = false;
        setValue(9);
        root.flush();
      }
    }
  }
  const host = new Host();
  const container = host.createContainer();
  root = new ComponentStateRoot(host, container, {
    scheduleCommit: (commit) => scheduled.push(commit),
  });
  const Output = defineComponent("native-cell-cut-reentry", () => {
    const [, set] = useStateAt("value", 1);
    setValue = set;
    return jsx("output", {
      "data-value": bindStatePropAt("value", (value) => value, numericProgram("out.value", ["value"])),
    });
  }, { propOnlySites: ["value"] });

  const originalCapture = PendingStateChanges.prototype.capture;
  let captures = 0;
  PendingStateChanges.prototype.capture = function () {
    captures++;
    return originalCapture.call(this);
  };
  try {
    root.mount(jsx(Output, {}));
    captures = 0;
    const scheduledBeforeUpdate = scheduled.length;
    setValue(4);
    reenter = true;
    root.flush();
    equal(container.children[0].props["data-value"], 4, "outer cut uses its captured value");
    equal(root.diagnostics().pendingChangeCount, 1, "newer reentrant value stays pending");
    equal(captures, 0, "eligible native cut does not allocate StateChange snapshots");
    equal(scheduled.length > scheduledBeforeUpdate, true, "newer cut is scheduled after the outer writer finishes");
    root.flush();
    equal(container.children[0].props["data-value"], 9, "next cut commits newer value");
    equal(captures, 0, "both eligible cuts avoid capture");
  } finally {
    PendingStateChanges.prototype.capture = originalCapture;
    root.dispose();
  }
});

Deno.test("native numeric cuts stay scoped to roots sharing one World", () => {
  const world = new OwnerStateWorld();
  const host = new MemoryVDOMHost();
  const firstContainer = host.createContainer();
  const secondContainer = host.createContainer();
  const first = new ComponentStateRoot(host, firstContainer, { world, rootId: "cell-cut-first", scheduleCommit() {} });
  const second = new ComponentStateRoot(host, secondContainer, { world, rootId: "cell-cut-second", scheduleCommit() {} });
  let setFirst!: (value: number) => boolean;
  let setSecond!: (value: number) => boolean;
  const First = defineComponent("native-cell-cut-first", () => {
    const [, set] = useStateAt("value", 1);
    setFirst = set;
    return jsx("output", { value: bindStatePropAt("value", (value) => value, numericProgram("first.value", ["value"])) });
  }, { propOnlySites: ["value"] });
  const Second = defineComponent("native-cell-cut-second", () => {
    const [, set] = useStateAt("value", 2);
    setSecond = set;
    return jsx("output", { value: bindStatePropAt("value", (value) => value, numericProgram("second.value", ["value"])) });
  }, { propOnlySites: ["value"] });
  try {
    first.mount(jsx(First, {}));
    second.mount(jsx(Second, {}));
    setFirst(5);
    setSecond(8);
    first.flush();
    equal(firstContainer.children[0].props.value, 5, "first root commits its private cell");
    equal(second.diagnostics().pendingChangeCount, 1, "second root queue is untouched");
    equal(world.hasPendingChanges(), true, "shared world retains the second root's dirty cell");
    second.flush();
    equal(secondContainer.children[0].props.value, 8, "second root commits independently");
    equal(world.hasPendingChanges(), false, "both exact root cuts are acknowledged");
  } finally {
    first.dispose();
    second.dispose();
  }
});

Deno.test("native numeric cut leaves state pending after a host writer throws", () => {
  let setValue!: (value: number) => boolean;
  class Host extends MemoryVDOMHost {
    fail = false;
    override setProp(node: MemoryNode, name: string, value: unknown, previous?: unknown) {
      if (this.fail && name === "data-value") throw new Error("host writer failed");
      super.setProp(node, name, value, previous);
    }
  }
  const host = new Host();
  const container = host.createContainer();
  const root = new ComponentStateRoot(host, container, { scheduleCommit() {} });
  const Output = defineComponent("native-cell-cut-host-error", () => {
    const [, set] = useStateAt("value", 1);
    setValue = set;
    return jsx("output", {
      "data-value": bindStatePropAt("value", (value) => value, numericProgram("error.value", ["value"])),
    });
  }, { propOnlySites: ["value"] });
  const originalCapture = PendingStateChanges.prototype.capture;
  let captures = 0;
  PendingStateChanges.prototype.capture = function () {
    captures++;
    return originalCapture.call(this);
  };
  try {
    root.mount(jsx(Output, {}));
    captures = 0;
    setValue(6);
    host.fail = true;
    let failed = false;
    try {
      root.flush();
    } catch (error) {
      failed = error instanceof Error && error.message === "host writer failed";
    }
    equal(failed, true, "host failure propagates");
    equal(root.diagnostics().pendingChangeCount, 1, "root queue is not acknowledged");
    equal(worldPending(root), true, "world dirty cell is not acknowledged");
    equal(captures, 0, "failure came through native route without capture");
  } finally {
    PendingStateChanges.prototype.capture = originalCapture;
    root.dispose();
  }
});

Deno.test("disposing during a native cell writer clears its queued cut", () => {
  let root!: ComponentStateRoot<MemoryNode, MemoryNode>;
  let setValue!: (value: number) => boolean;
  const writes: string[] = [];
  class Host extends MemoryVDOMHost {
    disposeDuringWrite = false;
    override setProp(node: MemoryNode, name: string, value: unknown, previous?: unknown) {
      super.setProp(node, name, value, previous);
      if (this.disposeDuringWrite && name === "first") {
        writes.push(name);
        root.dispose();
      } else if (this.disposeDuringWrite) {
        writes.push(name);
      }
    }
  }
  const host = new Host();
  const container = host.createContainer();
  root = new ComponentStateRoot(host, container, { scheduleCommit() {} });
  const Output = defineComponent("native-cell-cut-dispose", () => {
    const [, set] = useStateAt("value", 1);
    setValue = set;
    return jsx("output", {
      first: bindStatePropAt("value", (value) => value, numericProgram("dispose.first", ["value"])),
      second: bindStatePropAt("value", (value) => value * 2, numericProgram("dispose.second", ["value"])),
    });
  }, { propOnlySites: ["value"] });
  root.mount(jsx(Output, {}));
  host.disposeDuringWrite = true;
  setValue(4);
  root.flush();
  equal(writes.join(","), "first", "disposed host receives no later writer");
  equal(root.diagnostics().pendingChangeCount, 0, "disposal drops the root queue");
  equal(root.diagnostics().ownerCount, 0, "disposal releases the owner graph");
});

Deno.test("mixed store work keeps the independent captured-change path", () => {
  const store = createAsyncStore(0, (state: number, action: number) => state + action);
  let setValue!: (value: number) => boolean;
  const host = new MemoryVDOMHost();
  const container = host.createContainer();
  const root = new ComponentStateRoot(host, container, { scheduleCommit() {} });
  const Output = defineComponent("native-cell-cut-mixed", () => {
    const [, set] = useStateAt("value", 1);
    const storeValue = useStoreAt("store", store);
    setValue = set;
    return jsx("output", {
      "data-value": bindStatePropAt("value", (value) => value, numericProgram("mixed.value", ["value"])),
      "data-store": storeValue,
    });
  }, { propOnlySites: ["value"] });
  const originalCapture = PendingStateChanges.prototype.capture;
  let captures = 0;
  PendingStateChanges.prototype.capture = function () {
    captures++;
    return originalCapture.call(this);
  };
  try {
    root.mount(jsx(Output, {}));
    captures = 0;
    setValue(3);
    store.dispatch(1);
    root.flush();
    equal(container.children[0].props["data-value"], 3, "mixed frame commits state");
    equal(container.children[0].props["data-store"], 1, "mixed frame commits store");
    equal(captures >= 1, true, "mixed frame uses the independent capture path");
  } finally {
    PendingStateChanges.prototype.capture = originalCapture;
    root.dispose();
  }
});

Deno.test("unsupported numeric fallback does not add a redundant scheduled flush", () => {
  let setValue!: (value: number) => boolean;
  const scheduled: (() => void)[] = [];
  const host = new MemoryVDOMHost();
  const container = host.createContainer();
  const root = new ComponentStateRoot(host, container, {
    scheduleCommit: (commit) => scheduled.push(commit),
  });
  const Output = defineComponent("native-cell-cut-generic", () => {
    const [value, set] = useStateAt("value", 1);
    setValue = set;
    // Deliberately omit the compiler numeric descriptor and prop-only proof.
    return jsx("output", { "data-value": value });
  });
  try {
    root.mount(jsx(Output, {}));
    const scheduledBeforeUpdate = scheduled.length;
    setValue(7);
    equal(scheduled.length, scheduledBeforeUpdate + 1, "setter schedules one callback");
    root.flush();
    equal(container.children[0].props["data-value"], 7, "generic fallback updates output");
    equal(scheduled.length, scheduledBeforeUpdate + 1, "ineligible native preflight adds no callback");
  } finally {
    root.dispose();
  }
});

Deno.test("version mismatch declines native cut and preserves the newer write", () => {
  let setValue!: (value: number) => boolean;
  const counters: Record<string, number>[] = [];
  const host = new MemoryVDOMHost();
  const container = host.createContainer();
  const root = new ComponentStateRoot(host, container, {
    scheduleCommit() {},
    profileCounter: (next) => counters.push(next),
  });
  const Output = defineComponent("native-cell-cut-version-mismatch", () => {
    const [, set] = useStateAt("value", 1);
    setValue = set;
    return jsx("output", {
      "data-value": bindStatePropAt("value", (value) => value, numericProgram("mismatch.value", ["value"])),
    });
  }, { propOnlySites: ["value"] });
  const originalCaptureNative = PendingStateChanges.prototype.captureNativeWithKeys;
  const originalCapture = PendingStateChanges.prototype.capture;
  let advanceAfterNativeCapture = false;
  let advanceAfterSnapshot = false;
  PendingStateChanges.prototype.captureNativeWithKeys = function (
    this: PendingStateChanges,
    handles,
    versions,
    keys,
  ) {
    const count = originalCaptureNative.call(this, handles, versions, keys);
    if (advanceAfterNativeCapture) {
      advanceAfterNativeCapture = false;
      advanceAfterSnapshot = true;
      setValue(9);
    }
    return count;
  };
  PendingStateChanges.prototype.capture = function (this: PendingStateChanges) {
    const snapshot = originalCapture.call(this);
    if (advanceAfterSnapshot) {
      advanceAfterSnapshot = false;
      setValue(11);
    }
    return snapshot;
  };
  try {
    root.mount(jsx(Output, {}));
    setValue(4);
    advanceAfterNativeCapture = true;
    counters.length = 0;
    root.flush();
    equal(container.children[0].props["data-value"], 11, "generic reconciliation reads the latest value");
    equal(root.diagnostics().pendingChangeCount, 1, "write after the independent snapshot remains pending");
    equal(counters[0]?.["numeric.program-source-buffer-capacity"], undefined, "declined native cut records no program execution metric");
    root.flush();
    equal(container.children[0].props["data-value"], 11, "next native cut keeps the committed value");
    equal(root.diagnostics().pendingChangeCount, 0, "next exact cut acknowledges the newer version");
  } finally {
    PendingStateChanges.prototype.captureNativeWithKeys = originalCaptureNative;
    PendingStateChanges.prototype.capture = originalCapture;
    root.dispose();
  }
});

Deno.test("native host writers cannot update or prepare the root reentrantly", () => {
  let root!: ComponentStateRoot<MemoryNode, MemoryNode>;
  let setValue!: (value: number) => boolean;
  let attemptStructuralCalls = false;
  const rejected: string[] = [];
  class Host extends MemoryVDOMHost {
    override setProp(node: MemoryNode, name: string, value: unknown, previous?: unknown) {
      if (attemptStructuralCalls && name === "data-value") {
        try {
          root.update(null);
        } catch (error) {
          rejected.push(String(error));
        }
        try {
          root.preparePending();
        } catch (error) {
          rejected.push(String(error));
        }
      }
      super.setProp(node, name, value, previous);
    }
  }
  const host = new Host();
  const container = host.createContainer();
  root = new ComponentStateRoot(host, container, { scheduleCommit() {} });
  const Output = defineComponent("native-cell-cut-structural-reentry", () => {
    const [, set] = useStateAt("value", 1);
    setValue = set;
    return jsx("output", {
      "data-value": bindStatePropAt("value", (value) => value, numericProgram("structural.value", ["value"])),
    });
  }, { propOnlySites: ["value"] });
  try {
    root.mount(jsx(Output, {}));
    const initialVersion = root.version;
    setValue(4);
    attemptStructuralCalls = true;
    root.flush();
    equal(rejected.length, 2, "update and prepare are both rejected");
    equal(rejected.every((message) => message.includes("native numeric cell cut")), true, "rejections name the active cut");
    equal(root.version, initialVersion, "rejected calls do not mutate VDOM structure");
    equal(container.children.length, 1, "existing host structure remains mounted");
    equal(container.children[0].props["data-value"], 4, "outer native write completes after caught rejections");
  } finally {
    root.dispose();
  }
});

Deno.test("propagated structural reentry remains a terminal host failure", () => {
  let root!: ComponentStateRoot<MemoryNode, MemoryNode>;
  let setValue!: (value: number) => boolean;
  let reenter = false;
  class Host extends MemoryVDOMHost {
    override setProp(node: MemoryNode, name: string, value: unknown, previous?: unknown) {
      if (reenter && name === "data-value") root.update(null);
      super.setProp(node, name, value, previous);
    }
  }
  const host = new Host();
  const container = host.createContainer();
  root = new ComponentStateRoot(host, container, { scheduleCommit() {} });
  const Output = defineComponent("native-cell-cut-terminal-reentry", () => {
    const [, set] = useStateAt("value", 1);
    setValue = set;
    return jsx("output", {
      "data-value": bindStatePropAt("value", (value) => value, numericProgram("terminal.value", ["value"])),
    });
  }, { propOnlySites: ["value"] });
  try {
    root.mount(jsx(Output, {}));
    setValue(4);
    reenter = true;
    let hostError: unknown;
    try {
      root.flush();
    } catch (error) {
      hostError = error;
    }
    equal(hostError instanceof Error && hostError.message.includes("native numeric cell cut"), true, "reentrant update rejection propagates through the host writer");
    let terminal = false;
    try {
      root.update(null);
    } catch (error) {
      terminal = error instanceof Error && error.message.includes("host commit failure");
    }
    equal(terminal, true, "propagated writer failure leaves the root terminal");
    equal(container.children.length, 1, "failed structural reentry leaves host tree intact");
  } finally {
    root.dispose();
  }
});

const worldPending = (root: ComponentStateRoot<MemoryNode, MemoryNode>) =>
  root.world.hasPendingChanges();
