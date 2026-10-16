import { assertEquals, assertThrows } from "jsr:@std/assert";
import {
  bindStatePropAt,
  ComponentStateRoot,
  defineComponent,
  useStateAt,
} from "./component_state_runtime.ts";
import { jsx } from "./jsx_binding_runtime.ts";
import {
  OwnerStateWorld,
  type StateAction,
  type StateCellHandle,
} from "./owner_state_world.ts";
import { PendingStateChanges } from "./pending_state_changes.ts";
import {
  type MemoryNode,
  MemoryVDOMHost,
  VDOMSnapshotRoot,
} from "./vdom_snapshot_runtime.ts";

const metadata = () => ({
  propOnlySites: ["value"],
  stateLayout: {
    schemaVersion: 1 as const,
    slots: [{ siteId: "value", slot: 0 }],
  },
});
const program = {
  schemaVersion: 1 as const,
  sinkId: "out.value",
  sourceSites: ["value"],
};

Deno.test("native lane cuts retain newer reentrant writes without scalar snapshots", () => {
  let root!: ComponentStateRoot<MemoryNode>;
  let setter!: (action: StateAction<number>) => boolean;
  let reenter = false;
  class Host extends MemoryVDOMHost {
    override setProp(
      node: MemoryNode,
      name: string,
      value: unknown,
      previous?: unknown,
    ) {
      super.setProp(node, name, value, previous);
      if (reenter && name === "value") {
        reenter = false;
        setter(9);
        assertEquals(root.flush(), false);
      }
    }
  }
  const host = new Host();
  const container = host.createContainer();
  const counters: Record<string, number>[] = [];
  root = new ComponentStateRoot(host, container, {
    scheduleCommit() {},
    profileCounter: (event) => counters.push(event),
  });
  const Output = defineComponent("lane.reentry", () => {
    [, setter] = useStateAt("value", 1);
    return jsx("output", {
      value: bindStatePropAt("value", (value) => value, program),
    });
  }, metadata());
  const capture = PendingStateChanges.prototype.capture;
  try {
    root.mount(jsx(Output, {}));
    PendingStateChanges.prototype.capture = function () {
      if (this.size) throw new Error("numeric snapshot used");
      return capture.call(this);
    };
    setter(4);
    reenter = true;
    root.flush();
    assertEquals(container.children[0].props.value, 4);
    assertEquals(root.diagnostics().pendingChangeCount, 1);
    root.flush();
    assertEquals(container.children[0].props.value, 9);
    assertEquals(root.diagnostics().pendingChangeCount, 0);
    assertEquals(
      counters.filter((event) => event["numeric.lane-batches"] === 1).length,
      2,
    );
  } finally {
    PendingStateChanges.prototype.capture = capture;
    root.dispose();
  }
});

Deno.test("compiled lane promotion renders general values and never reallocates a lane", () => {
  let setter!: (action: StateAction<unknown>) => boolean;
  let handle: StateCellHandle | undefined;
  const host = new MemoryVDOMHost();
  const container = host.createContainer();
  const root = new ComponentStateRoot(host, container, { scheduleCommit() {} });
  const Output = defineComponent("lane.promotion", () => {
    [, setter] = useStateAt<unknown>("value", 1);
    return jsx("output", {
      value: bindStatePropAt("value", (value) => String(value), program),
    });
  }, metadata());
  const unsubscribe = root.world.subscribeDirtyCells((next) => handle = next);
  try {
    root.mount(jsx(Output, {}));
    setter(2);
    root.flush();
    assertEquals(!!root.world.numericLane(handle!.owner, "value"), true);
    setter("general");
    root.flush();
    assertEquals(container.children[0].props.value, "general");
    assertEquals(root.world.numericLane(handle!.owner, "value"), null);
    setter(undefined);
    root.flush();
    assertEquals(container.children[0].props.value, "undefined");
    setter(7);
    root.flush();
    assertEquals(container.children[0].props.value, "7");
    assertEquals(root.world.numericLane(handle!.owner, "value"), null);
  } finally {
    unsubscribe();
    root.dispose();
  }
});

Deno.test("lane roots share column storage but acknowledge independent owner cuts", () => {
  const world = new OwnerStateWorld();
  const host = new MemoryVDOMHost();
  const firstContainer = host.createContainer();
  const secondContainer = host.createContainer();
  const first = new ComponentStateRoot(host, firstContainer, {
    world,
    rootId: "lane-first",
    scheduleCommit() {},
  });
  const second = new ComponentStateRoot(host, secondContainer, {
    world,
    rootId: "lane-second",
    scheduleCommit() {},
  });
  const setters = new Map<string, (action: StateAction<number>) => boolean>();
  const handles = new Map<string, StateCellHandle>();
  const Output = defineComponent("lane.shared", ({ id }: { id: string }) => {
    const [, set] = useStateAt("value", 0);
    setters.set(id, set);
    return jsx("output", {
      value: bindStatePropAt("value", (value) => value, program),
    });
  }, metadata());
  const unsubscribe = world.subscribeDirtyCells((handle) =>
    handles.set(
      world.numericLane(handle.owner, "value")?.row === 0 ? "a" : "b",
      handle,
    )
  );
  try {
    first.mount(jsx(Output, { id: "a" }));
    second.mount(jsx(Output, { id: "b" }));
    setters.get("a")!(5);
    setters.get("b")!(8);
    const a = world.numericLane(handles.get("a")!.owner, "value")!;
    const b = world.numericLane(handles.get("b")!.owner, "value")!;
    assertEquals(a.column, b.column);
    assertEquals(a.row !== b.row, true);
    first.flush();
    assertEquals(firstContainer.children[0].props.value, 5);
    assertEquals(secondContainer.children[0].props.value, 0);
    assertEquals(second.diagnostics().pendingChangeCount, 1);
    second.flush();
    assertEquals(secondContainer.children[0].props.value, 8);
  } finally {
    unsubscribe();
    first.dispose();
    second.dispose();
  }
});

Deno.test("lane host failure remains terminal and disposal releases owners", () => {
  let setter!: (action: StateAction<number>) => boolean;
  let fail = false;
  class Host extends MemoryVDOMHost {
    override setProp(
      node: MemoryNode,
      name: string,
      value: unknown,
      previous?: unknown,
    ) {
      if (fail && name === "value") throw new Error("lane host failure");
      super.setProp(node, name, value, previous);
    }
  }
  const host = new Host();
  const container = host.createContainer();
  const root = new ComponentStateRoot(host, container, { scheduleCommit() {} });
  const Output = defineComponent("lane.failure", () => {
    [, setter] = useStateAt("value", 0);
    return jsx("output", {
      value: bindStatePropAt("value", (value) => value, program),
    });
  }, metadata());
  root.mount(jsx(Output, {}));
  setter(3);
  fail = true;
  assertThrows(() => root.flush(), Error, "lane host failure");
  assertEquals(root.diagnostics().pendingChangeCount, 1);
  assertThrows(() => root.flush());
  root.dispose();
  assertEquals(root.diagnostics().ownerCount, 0);
});

Deno.test("disposal inside a lane writer releases captured column buffers", () => {
  let root!: ComponentStateRoot<MemoryNode>;
  let setter!: (action: StateAction<number>) => boolean;
  let disposeOnWrite = false;
  class Host extends MemoryVDOMHost {
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
  const host = new Host();
  const container = host.createContainer();
  root = new ComponentStateRoot(host, container, { scheduleCommit() {} });
  const Output = defineComponent("lane.dispose", () => {
    [, setter] = useStateAt("value", 0);
    return jsx("output", {
      value: bindStatePropAt("value", (value) => value, program),
    });
  }, metadata());
  const original = VDOMSnapshotRoot.prototype.executePreparedNumericCells;
  let buffers: readonly { readonly length: number }[] | undefined;
  VDOMSnapshotRoot.prototype.executePreparedNumericCells = function (
    tokens,
    values,
    count,
  ) {
    buffers = [tokens, values];
    return original.call(this, tokens, values, count);
  };
  try {
    root.mount(jsx(Output, {}));
    setter(4);
    disposeOnWrite = true;
    assertEquals(root.flush(), true);
    assertEquals(container.children.length, 0);
    assertEquals(root.diagnostics().ownerCount, 0);
    assertEquals(root.diagnostics().pendingChangeCount, 0);
    assertEquals(buffers?.map((buffer) => buffer.length), [0, 0]);
    assertThrows(() => setter(5));
  } finally {
    VDOMSnapshotRoot.prototype.executePreparedNumericCells = original;
    root.dispose();
  }
});
