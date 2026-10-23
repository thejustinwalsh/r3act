import { assertEquals, assertStrictEquals } from "jsr:@std/assert";
import {
  bindStatePropAt,
  ComponentStateRoot,
  defineComponent,
  useStateAt,
} from "./component_state_runtime.ts";
import { jsx } from "./jsx_binding_runtime.ts";
import { NativeRootWorkQueue } from "./native_root_work_queue.ts";
import { OwnerStateWorld, type StateCellHandle } from "./owner_state_world.ts";
import { MemoryVDOMHost } from "./vdom_snapshot_runtime.ts";

function retainedRoot(
  id: string,
  world: OwnerStateWorld,
  site = "position",
) {
  const host = new MemoryVDOMHost();
  const container = host.createContainer();
  const root = new ComponentStateRoot(host, container, {
    rootId: id,
    world,
    scheduleCommit() {},
  });
  let setValue!: (value: number) => boolean;
  const programId = `${id}:view`;
  const View = defineComponent(programId, () => {
    const [, set] = useStateAt(site, 0);
    setValue = set;
    return jsx("output", {
      [site]: bindStatePropAt(site, (value) => value, {
        schemaVersion: 2,
        ownerProgramId: programId,
        sinkId: site,
        sourceSites: [site],
        closedExpression: { kind: "input", index: 0 },
      }),
    });
  }, {
    propOnlySites: [site],
    stateLayout: {
      schemaVersion: 1,
      programId,
      slots: [{ siteId: site, slot: 0 }],
    },
  });
  root.mount(jsx(View, {}));
  return {
    root,
    container,
    setValue: (value: number) => setValue(value),
  };
}

Deno.test("declared retained group waits, then publishes both bound props", () => {
  const world = new OwnerStateWorld();
  const mesh = retainedRoot("retained-mesh", world);
  const outline = retainedRoot("retained-outline", world);
  const health = retainedRoot("retained-health", world, "health");
  const queue = new NativeRootWorkQueue();
  const dirty: StateCellHandle[] = [];
  const unsubscribe = world.subscribeDirtyCells((handle) => dirty.push(handle));
  try {
    assertEquals(mesh.setValue(4), true);
    assertEquals(outline.setValue(4), true);
    assertEquals(health.setValue(9), true);
    assertEquals(dirty.length, 3);
    const meshCells = [dirty[0]];
    const outlineCells = [dirty[1]];
    const healthWork = queue.enqueueTransaction({
      id: "health-transaction",
      roots: [{ root: health.root, cells: [dirty[2]] }],
      pending: ["health-resource"],
    });
    const settled: string[] = [];
    const group = queue.enqueueTransaction({
      id: "position-transaction",
      roots: [
        { root: mesh.root, cells: meshCells },
        { root: outline.root, cells: outlineCells },
      ],
      pending: ["frame"],
      onSettled: (resolution) => settled.push(resolution.status),
    });
    meshCells.length = 0;
    outlineCells.length = 0;
    assertEquals(group.status, "pending");
    assertEquals(mesh.container.children[0].props.position, 0);
    assertEquals(outline.container.children[0].props.position, 0);
    assertEquals(health.container.children[0].props.health, 0);

    group.resolve("frame");
    assertEquals(group.status, "committed");
    assertEquals(mesh.container.children[0].props.position, 4);
    assertEquals(outline.container.children[0].props.position, 4);
    assertEquals(healthWork.status, "pending");
    assertEquals(health.container.children[0].props.health, 0);
    assertEquals(settled, ["committed"]);
    assertEquals(mesh.root.diagnostics().pendingChangeCount, 0);
    assertEquals(outline.root.diagnostics().pendingChangeCount, 0);
  } finally {
    unsubscribe();
    queue.dispose();
    mesh.root.dispose();
    outline.root.dispose();
    health.root.dispose();
  }
});

Deno.test("retained preparation declines opaque projectors without invoking them", () => {
  const world = new OwnerStateWorld();
  const host = new MemoryVDOMHost();
  const container = host.createContainer();
  const root = new ComponentStateRoot(host, container, {
    rootId: "retained-opaque",
    world,
    scheduleCommit() {},
  });
  const programId = "retained-opaque:view";
  let setter!: (value: number) => boolean;
  let projectorCalls = 0;
  const View = defineComponent(programId, () => {
    [, setter] = useStateAt("value", 0);
    return jsx("output", {
      value: bindStatePropAt("value", (value) => {
        projectorCalls++;
        return value;
      }, {
        schemaVersion: 2,
        ownerProgramId: programId,
        sinkId: "value",
        sourceSites: ["value"],
      }),
    });
  }, {
    propOnlySites: ["value"],
    stateLayout: {
      schemaVersion: 1,
      programId,
      slots: [{ siteId: "value", slot: 0 }],
    },
  });
  root.mount(jsx(View, {}));
  let handle: StateCellHandle | undefined;
  const unsubscribe = world.subscribeDirtyCells((next) => handle = next);
  try {
    assertEquals(setter(3), true);
    const before = projectorCalls;
    const work = new NativeRootWorkQueue();
    try {
      const result = work.enqueueTransaction({
        id: "opaque-projector",
        roots: [{ root, cells: [handle!] }],
      });
      assertStrictEquals(result.status, "failed");
      assertEquals(projectorCalls, before);
      assertEquals(root.diagnostics().pendingChangeCount, 1);
    } finally {
      work.dispose();
    }
  } finally {
    unsubscribe();
    root.dispose();
  }
});

Deno.test("retained work does not fall back to a whole-tree candidate", () => {
  const world = new OwnerStateWorld();
  const host = new MemoryVDOMHost();
  const container = host.createContainer();
  const root = new ComponentStateRoot(host, container, {
    rootId: "retained-unsupported",
    world,
    scheduleCommit() {},
  });
  let setValue!: (value: number) => boolean;
  const View = defineComponent("retained-unsupported-view", () => {
    const [value, set] = useStateAt("value", 0);
    setValue = set;
    return jsx("output", {}, String(value));
  });
  root.mount(jsx(View, {}));
  const queue = new NativeRootWorkQueue();
  let handle: StateCellHandle | undefined;
  const unsubscribe = world.subscribeDirtyCells((next) => handle = next);
  try {
    assertEquals(setValue(3), true);
    const work = queue.enqueueTransaction({
      id: "unsupported-retained",
      roots: [{ root, cells: [handle!] }],
    });
    assertStrictEquals(work.status, "failed");
    assertEquals(container.children[0].children[0].text, "0");
    assertEquals(root.diagnostics().pendingChangeCount, 1);
  } finally {
    unsubscribe();
    queue.dispose();
    root.dispose();
  }
});
