import { PendingStateChanges } from "./pending_state_changes.ts";
import {
  bindStatePropAt,
  ComponentStateRoot,
  defineComponent,
  useStateAt,
} from "./component_state_runtime.ts";
import { jsx } from "./jsx_binding_runtime.ts";
import {
  type MemoryNode,
  MemoryVDOMHost,
} from "./vdom_snapshot_runtime.ts";

type StateAction<T> = T | ((previous: T) => T);

const equal = (actual: unknown, expected: unknown, message: string) => {
  if (!Object.is(actual, expected)) {
    throw new Error(`${message}: expected ${String(expected)}, got ${String(actual)}`);
  }
};

const layout = (site: string) => ({
  propOnlySites: ["value"],
  stateLayout: {
    schemaVersion: 1 as const,
    programId: site,
    slots: [{ siteId: "value", slot: 0 }],
  },
});

const program = (site: string) => ({
  schemaVersion: 2 as const,
  ownerProgramId: site,
  sinkId: `${site}.value`,
  sourceSites: ["value"],
});

Deno.test("Root acknowledges accepted native cuts with reusable cut keys and scrubs them", () => {
  const originalCapture = PendingStateChanges.prototype.captureNativeWithKeys;
  const originalAck = PendingStateChanges.prototype.clearNativeThroughKeys;
  let captureCalls = 0;
  let keyedAckCalls = 0;
  let capturedKeys: Array<unknown> | undefined;
  let setter!: (action: StateAction<number>) => boolean;
  const host = new MemoryVDOMHost();
  const container = host.createContainer();
  const root = new ComponentStateRoot<MemoryNode>(host, container, {
    scheduleCommit() {},
  });
  const site = "root.direct-key-ack";
  const Output = defineComponent(site, () => {
    [, setter] = useStateAt("value", 1);
    return jsx("output", {
      value: bindStatePropAt(
        "value",
        (value) => value,
        program(site),
      ),
    });
  }, layout(site));

  PendingStateChanges.prototype.captureNativeWithKeys = function (
    handles,
    versions,
    keys,
  ) {
    captureCalls++;
    capturedKeys = keys;
    return originalCapture.call(this, handles, versions, keys);
  };
  PendingStateChanges.prototype.clearNativeThroughKeys = function (
    keys,
    handles,
    versions,
    count,
  ) {
    keyedAckCalls++;
    equal(keys, capturedKeys, "Root acknowledged with a different key buffer");
    return originalAck.call(this, keys, handles, versions, count);
  };

  try {
    root.mount(jsx(Output, {}));
    setter(3);
    root.flush();
    equal(container.children[0].props.value, 3, "native cut published the value");
    equal(captureCalls, 1, "Root did not capture one native cut");
    equal(keyedAckCalls, 1, "accepted native cut did not use keyed acknowledgement");
    equal(capturedKeys?.[0], undefined, "Root retained a captured key after commit");
    equal(root.diagnostics().pendingChangeCount, 0, "accepted cut remained pending");
  } finally {
    PendingStateChanges.prototype.captureNativeWithKeys = originalCapture;
    PendingStateChanges.prototype.clearNativeThroughKeys = originalAck;
    root.dispose();
  }
});

Deno.test("Root disposal clears retained cut-key scratch buffers", () => {
  const originalCapture = PendingStateChanges.prototype.captureNativeWithKeys;
  let capturedKeys: Array<unknown> | undefined;
  let setter!: (action: StateAction<number>) => boolean;
  let disposeOnWrite = false;
  let root!: ComponentStateRoot<MemoryNode>;
  class DisposingHost extends MemoryVDOMHost {
    override setProp(
      node: MemoryNode,
      name: string,
      value: unknown,
      previous?: unknown,
    ) {
      super.setProp(node, name, value, previous);
      if (disposeOnWrite && name === "value") {
        disposeOnWrite = false;
        root.dispose();
      }
    }
  }
  const host = new DisposingHost();
  const container = host.createContainer();
  root = new ComponentStateRoot(host, container, { scheduleCommit() {} });
  const site = "root.direct-key-dispose";
  const Output = defineComponent(site, () => {
    [, setter] = useStateAt("value", 1);
    return jsx("output", {
      value: bindStatePropAt("value", (value) => value, program(site)),
    });
  }, layout(site));

  PendingStateChanges.prototype.captureNativeWithKeys = function (
    handles,
    versions,
    keys,
  ) {
    capturedKeys = keys;
    return originalCapture.call(this, handles, versions, keys);
  };
  try {
    root.mount(jsx(Output, {}));
    disposeOnWrite = true;
    setter(5);
    root.flush();
    equal(capturedKeys?.length, 0, "dispose retained the key scratch buffer");
  } finally {
    PendingStateChanges.prototype.captureNativeWithKeys = originalCapture;
    root.dispose();
  }
});
