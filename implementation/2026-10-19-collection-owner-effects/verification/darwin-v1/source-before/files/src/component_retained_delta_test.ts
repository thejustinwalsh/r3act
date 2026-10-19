import {
  assert,
  assertEquals,
  assertStrictEquals,
  assertThrows,
} from "jsr:@std/assert";
import {
  bindStatePropAt,
  bindStatePropsAt,
  ComponentStateRoot,
  defineComponent,
  useStateAt,
} from "./component_state_runtime.ts";
import { jsx } from "./jsx_binding_runtime.ts";
import { NativeRootWorkQueue } from "./native_root_work_queue.ts";
import { OwnerStateWorld, type StateCellHandle } from "./owner_state_world.ts";
import { type MemoryNode, MemoryVDOMHost } from "./vdom_snapshot_runtime.ts";
import {
  type CompiledSemanticPlan,
  invalidateCompiledSemanticPlan,
  registerCompiledSemanticPlan,
} from "./compiled_semantic_plan.ts";

function identityProgram(programId: string, site: string) {
  return {
    schemaVersion: 2 as const,
    ownerProgramId: programId,
    sinkId: site,
    sourceSites: [site],
    closedExpression: { kind: "input" as const, index: 0 },
  };
}

function retainedFixture(
  id: string,
  sites: readonly string[],
  host: MemoryVDOMHost = new MemoryVDOMHost(),
  world = new OwnerStateWorld(),
) {
  const container = host.createContainer();
  const root = new ComponentStateRoot(host, container, {
    rootId: id,
    world,
    scheduleCommit() {},
  });
  const setters = new Map<string, (value: number) => boolean>();
  const handles = new Map<string, StateCellHandle>();
  const unsubscribe = world.subscribeDirtyCells((handle) => {
    if (sites.includes(handle.site)) handles.set(handle.site, handle);
  });
  const programId = `${id}:view`;
  const View = defineComponent(programId, () => {
    const props: Record<string, unknown> = {};
    for (const site of sites) {
      const [, setter] = useStateAt(site, 0);
      setters.set(site, setter);
      props[site] = bindStatePropAt(
        site,
        (value) => value,
        identityProgram(programId, site),
      );
    }
    return jsx("output", props);
  }, {
    propOnlySites: sites,
    stateLayout: {
      schemaVersion: 1,
      programId,
      slots: sites.map((siteId, slot) => ({ siteId, slot })),
    },
  });
  const tree = () => jsx(View, {});
  root.mount(tree());
  return {
    root,
    host,
    container,
    tree,
    set(site: string, value: number) {
      const setter = setters.get(site);
      assert(setter);
      assertEquals(setter(value), true);
      const handle = handles.get(site);
      assert(handle);
      return handle;
    },
    setter(site: string) {
      const setter = setters.get(site);
      assert(setter);
      return setter;
    },
    handle(site: string) {
      const handle = handles.get(site);
      assert(handle);
      return handle;
    },
    dispose() {
      unsubscribe();
      root.dispose();
    },
  };
}

function publish(
  candidate: NonNullable<
    ReturnType<ComponentStateRoot<MemoryNode, MemoryNode>["prepareRetained"]>
  >,
) {
  assert(candidate.validate());
  candidate.commitHost();
  assert(candidate.validatePostHost());
  candidate.publish();
  candidate.runEffects();
}

Deno.test("retained cuts on independent props survive intervening publication", () => {
  const f = retainedFixture("retained-independent", ["position", "health"]);
  try {
    const position = f.set("position", 4);
    const positionCut = f.root.prepareRetained([position]);
    assert(positionCut);
    const health = f.set("health", 9);
    const healthCut = f.root.prepareRetained([health]);
    assert(healthCut);
    publish(healthCut);
    assert(positionCut.validate());
    publish(positionCut);
    assertEquals(f.container.children[0].props.position, 4);
    assertEquals(f.container.children[0].props.health, 9);
    assertEquals(f.root.diagnostics().pendingChangeCount, 0);
  } finally {
    f.dispose();
  }
});

Deno.test("joint retained expression declines an incomplete input cut", () => {
  const world = new OwnerStateWorld();
  const host = new MemoryVDOMHost();
  const container = host.createContainer();
  const root = new ComponentStateRoot(host, container, {
    rootId: "retained-joint",
    world,
    scheduleCommit() {},
  });
  const programId = "retained-joint:view";
  let setPosition!: (value: number) => boolean;
  const handles = new Map<string, StateCellHandle>();
  const unsubscribe = world.subscribeDirtyCells((handle) =>
    handles.set(handle.site, handle)
  );
  const View = defineComponent(programId, () => {
    [, setPosition] = useStateAt("position", 0);
    useStateAt("camera", 0);
    return jsx("output", {
      screen: bindStatePropsAt(
        ["position", "camera"],
        ([position, camera]) => position + camera,
        {
          schemaVersion: 2,
          ownerProgramId: programId,
          sinkId: "screen",
          sourceSites: ["position", "camera"],
          closedExpression: {
            kind: "binary",
            operator: "+",
            left: { kind: "input", index: 0 },
            right: { kind: "input", index: 1 },
          },
        },
      ),
    });
  }, {
    propOnlySites: ["position", "camera"],
    stateLayout: {
      schemaVersion: 1,
      programId,
      slots: [{ siteId: "position", slot: 0 }, { siteId: "camera", slot: 1 }],
    },
  });
  root.mount(jsx(View, {}));
  try {
    assertEquals(setPosition(4), true);
    const position = handles.get("position");
    assert(position);
    const camera = world.cellHandle(position.owner, "camera");
    assert(camera);
    assertStrictEquals(world.cellHandle(position.owner, "camera"), camera);
    assertStrictEquals(root.prepareRetained([position]), null);
    assertEquals(root.diagnostics().pendingChangeCount, 1);
    const complete = root.prepareRetained([position, camera]);
    assert(complete);
    publish(complete);
    assertEquals(container.children[0].props.screen, 4);
    assertEquals(root.diagnostics().pendingChangeCount, 0);
  } finally {
    unsubscribe();
    root.dispose();
  }
});

Deno.test("overlapping retained candidates stale after a value-equal accepted write", () => {
  const f = retainedFixture("retained-overlap", ["position"]);
  try {
    const handle = f.set("position", 4);
    const first = f.root.prepareRetained([handle]);
    const second = f.root.prepareRetained([handle]);
    assert(first && second);
    publish(first);
    assertEquals(f.container.children[0].props.position, 4);
    assertEquals(second.validate(), false);
    second.discard();
  } finally {
    f.dispose();
  }
});

Deno.test("same-value source ABA cannot revive an old retained cut", () => {
  const f = retainedFixture("retained-aba", ["position"]);
  try {
    const handle = f.set("position", 4);
    const cut = f.root.prepareRetained([handle]);
    assert(cut);
    f.set("position", 8);
    f.set("position", 4);
    assertEquals(cut.validate(), false);
    cut.discard();
    assertEquals(f.root.diagnostics().pendingChangeCount, 1);
  } finally {
    f.dispose();
  }
});

Deno.test("host reentry keeps a newer action pending after exact retained acknowledgement", () => {
  let reenter = false;
  let f!: ReturnType<typeof retainedFixture>;
  class Host extends MemoryVDOMHost {
    override setProp(
      node: MemoryNode,
      name: string,
      value: unknown,
      previous?: unknown,
    ) {
      super.setProp(node, name, value, previous);
      if (reenter && name === "position") {
        reenter = false;
        f.set("position", 9);
        assertEquals(f.root.flush(), false);
      }
    }
  }
  f = retainedFixture("retained-reentry", ["position"], new Host());
  try {
    const handle = f.set("position", 4);
    const first = f.root.prepareRetained([handle]);
    assert(first);
    reenter = true;
    publish(first);
    assertEquals(f.container.children[0].props.position, 4);
    assertEquals(f.root.diagnostics().pendingChangeCount, 1);
    const newer = f.root.prepareRetained([f.handle("position")]);
    assert(newer);
    publish(newer);
    assertEquals(f.container.children[0].props.position, 9);
    assertEquals(f.root.diagnostics().pendingChangeCount, 0);
  } finally {
    f.dispose();
  }
});

Deno.test("second host failure quarantines a retained group without accepting either root", () => {
  let armed = false;
  class FailingHost extends MemoryVDOMHost {
    override setProp(
      node: MemoryNode,
      name: string,
      value: unknown,
      previous?: unknown,
    ) {
      super.setProp(node, name, value, previous);
      if (armed && name === "position") throw new Error("second host failed");
    }
  }
  const first = retainedFixture("retained-failure-first", ["position"]);
  const second = retainedFixture(
    "retained-failure-second",
    ["position"],
    new FailingHost(),
  );
  const queue = new NativeRootWorkQueue();
  try {
    const firstVersion = first.root.publicationVersion;
    const secondVersion = second.root.publicationVersion;
    const firstCell = first.set("position", 4);
    const secondCell = second.set("position", 4);
    armed = true;
    const work = queue.enqueueRetained({
      id: "retained-second-host-failure",
      roots: [
        { root: first.root, cells: [firstCell] },
        { root: second.root, cells: [secondCell] },
      ],
    });
    assertEquals(work.status, "failed");
    assertEquals(first.root.publicationVersion, firstVersion);
    assertEquals(second.root.publicationVersion, secondVersion);
    assertEquals(first.root.diagnostics().pendingChangeCount, 1);
    assertEquals(second.root.diagnostics().pendingChangeCount, 1);
    assertThrows(
      () => first.root.prepareRetained([firstCell]),
      Error,
      "host commit failure",
    );
    assertThrows(
      () => second.root.prepareRetained([secondCell]),
      Error,
      "host commit failure",
    );
  } finally {
    armed = false;
    queue.dispose();
    first.dispose();
    second.dispose();
  }
});

Deno.test("a full-tree candidate remains stale after an unrelated retained publication", () => {
  const f = retainedFixture("retained-full-tree", ["position", "health"]);
  try {
    const liveHealthSetter = f.setter("health");
    const full = f.root.prepare(f.tree());
    assertEquals(liveHealthSetter(9), true);
    const health = f.handle("health");
    const retained = f.root.prepareRetained([health]);
    assert(retained);
    publish(retained);
    assertEquals(full.validate(), false);
    full.discard();
  } finally {
    f.dispose();
  }
});

Deno.test("removed and reinserted owner cannot reuse a retained cut", () => {
  const f = retainedFixture("retained-owner-reinsert", ["position"]);
  try {
    const oldHandle = f.set("position", 4);
    const oldCut = f.root.prepareRetained([oldHandle]);
    assert(oldCut);
    f.root.update(jsx("section", {}));
    f.root.update(f.tree());
    assertEquals(oldCut.validate(), false);
    oldCut.discard();
    assertStrictEquals(
      f.root.world.cellHandle(oldHandle.owner, "position"),
      null,
    );
    assertStrictEquals(f.root.prepareRetained([oldHandle]), null);
    const newHandle = f.set("position", 7);
    assert(
      newHandle.owner !== oldHandle.owner ||
        newHandle.cellIdentity !== oldHandle.cellIdentity,
    );
    const newCut = f.root.prepareRetained([newHandle]);
    assert(newCut);
    publish(newCut);
    assertEquals(f.container.children[0].props.position, 7);
  } finally {
    f.dispose();
  }
});

Deno.test("sparse and dense retained cuts span keyed owners without rerendering them", () => {
  const world = new OwnerStateWorld();
  const host = new MemoryVDOMHost();
  const container = host.createContainer();
  const root = new ComponentStateRoot(host, container, {
    rootId: "retained-keyed-scene",
    world,
    scheduleCommit() {},
  });
  const setters: Array<(value: number) => boolean> = [];
  const handles = new Map<number, StateCellHandle>();
  let renders = 0;
  let dispatchingIndex = -1;
  const unsubscribe = world.subscribeDirtyCells((handle) => {
    if (dispatchingIndex >= 0) handles.set(dispatchingIndex, handle);
  });
  const set = (index: number, value: number) => {
    dispatchingIndex = index;
    try {
      assertEquals(setters[index](value), true);
    } finally {
      dispatchingIndex = -1;
    }
    const handle = handles.get(index);
    assert(handle);
    return handle;
  };
  const programId = "retained-keyed-scene:item";
  const Item = defineComponent(programId, ({ index }: { index: number }) => {
    renders++;
    const [, setter] = useStateAt("value", 0);
    setters[index] = setter;
    return jsx("output", {
      value: bindStatePropAt(
        "value",
        (value) => value,
        identityProgram(programId, "value"),
      ),
    });
  }, {
    propOnlySites: ["value"],
    stateLayout: {
      schemaVersion: 1,
      programId,
      slots: [{ siteId: "value", slot: 0 }],
    },
  });
  root.mount(
    jsx(
      "section",
      {},
      Array.from(
        { length: 32 },
        (_, index) => jsx(Item, { key: index, index }),
      ),
    ),
  );
  try {
    assertEquals(renders, 32);
    const first = set(0, 4);
    const seventeenth = set(17, 8);
    const sparse = root.prepareRetained([first, seventeenth]);
    assert(sparse);
    publish(sparse);
    assertEquals(container.children[0].children[0].props.value, 4);
    assertEquals(container.children[0].children[17].props.value, 8);
    assertEquals(container.children[0].children[31].props.value, 0);
    assertEquals(renders, 32);
    for (let index = 0; index < 32; index++) {
      set(index, index + 100);
    }
    const dense = root.prepareRetained(
      Array.from({ length: 32 }, (_, index) => handles.get(index)!),
    );
    assert(dense);
    publish(dense);
    for (let index = 0; index < 32; index++) {
      assertEquals(
        container.children[0].children[index].props.value,
        index + 100,
      );
    }
    assertEquals(renders, 32);
    assertEquals(root.diagnostics().pendingChangeCount, 0);
  } finally {
    unsubscribe();
    root.dispose();
  }
});

Deno.test("compiled module invalidation stales a prepared retained cut", () => {
  const sourceFile = "retained-revision/view.tsx";
  const plan: CompiledSemanticPlan = {
    schema_version: 1,
    source_file: sourceFile,
    module_revision: "revision-a",
    owners: [],
    sources: [],
    sinks: [],
    operations: [],
    graph: {
      coverage: "proven-sinks-only",
      source_to_sinks: {},
      execution_order: [],
    },
  };
  registerCompiledSemanticPlan(plan);
  const world = new OwnerStateWorld();
  const host = new MemoryVDOMHost();
  const container = host.createContainer();
  const root = new ComponentStateRoot(host, container, {
    rootId: "retained-revision",
    world,
    scheduleCommit() {},
  });
  const programId = `${sourceFile}#component:View`;
  let setter!: (value: number) => boolean;
  let handle: StateCellHandle | undefined;
  const unsubscribe = world.subscribeDirtyCells((next) => handle = next);
  const View = defineComponent(programId, () => {
    [, setter] = useStateAt("value", 0);
    return jsx("output", {
      value: bindStatePropAt(
        "value",
        (value) => value,
        identityProgram(programId, "value"),
      ),
    });
  }, {
    propOnlySites: ["value"],
    stateLayout: {
      schemaVersion: 1,
      programId,
      slots: [{ siteId: "value", slot: 0 }],
    },
  });
  try {
    root.mount(jsx(View, {}));
    assertEquals(setter(4), true);
    assert(handle);
    const candidate = root.prepareRetained([handle]);
    assert(candidate);
    assertEquals(candidate.validate(), true);
    assertEquals(
      invalidateCompiledSemanticPlan(sourceFile, "revision-a"),
      true,
    );
    assertEquals(candidate.validate(), false);
    assertEquals(container.children[0].props.value, 0);
    candidate.discard();
  } finally {
    unsubscribe();
    root.dispose();
    invalidateCompiledSemanticPlan(sourceFile);
  }
});

Deno.test("disposal during retained host application cancels publication", () => {
  let armed = false;
  let insideDisposed = true;
  let f!: ReturnType<typeof retainedFixture>;
  class Host extends MemoryVDOMHost {
    override setProp(
      node: MemoryNode,
      name: string,
      value: unknown,
      previous?: unknown,
    ) {
      super.setProp(node, name, value, previous);
      if (armed && name === "position") {
        armed = false;
        f.root.dispose();
        insideDisposed = f.root.diagnostics().disposed;
      }
    }
  }
  f = retainedFixture("retained-dispose-host", ["position"], new Host());
  try {
    const acceptedVersion = f.root.publicationVersion;
    const handle = f.set("position", 4);
    const candidate = f.root.prepareRetained([handle]);
    assert(candidate);
    armed = true;
    let failed = false;
    try {
      candidate.commitHost();
    } catch {
      failed = true;
    }
    assertEquals(failed, true);
    assertEquals(insideDisposed, false);
    assertEquals(f.root.diagnostics().disposed, true);
    assertEquals(f.root.publicationVersion, acceptedVersion);
    assertEquals(f.container.children.length, 0);
  } finally {
    armed = false;
    f.dispose();
  }
});

Deno.test("retained acceptance updates history used by later ordinary numeric flushes", () => {
  const f = retainedFixture("retained-numeric-history", ["position"]);
  try {
    f.set("position", 1);
    f.root.flush();
    assertEquals(f.container.children[0].props.position, 1);
    const cell = f.set("position", 4);
    const cut = f.root.prepareRetained([cell]);
    assert(cut);
    publish(cut);
    assertEquals(f.container.children[0].props.position, 4);
    f.set("position", 1);
    f.root.flush();
    assertEquals(f.container.children[0].props.position, 1);
    assertEquals(f.root.diagnostics().pendingChangeCount, 0);
  } finally {
    f.dispose();
  }
});
