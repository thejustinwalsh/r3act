import { assert, assertEquals, assertStrictEquals } from "jsr:@std/assert";
import { createAsyncStore } from "./async_store_runtime.ts";
import {
  ComponentStateRoot, defineComponent, useEffectAt, useStateAt, useStoreAt,
} from "./component_state_runtime.ts";
import { registerCompiledSemanticPlan } from "./compiled_semantic_plan.ts";
import { jsx, type RuntimeNode } from "./jsx_binding_runtime.ts";
import { MemoryVDOMHost, type MemoryNode } from "./vdom_snapshot_runtime.ts";

Deno.test("closed Store wrapper updates props while retaining an independently changing child", () => {
  const sourceFile = "retained-store-child/motion.tsx";
  const revision = "retained-store-child-v1";
  registerCompiledSemanticPlan({
    schema_version: 1, source_file: sourceFile, module_revision: revision,
    owners: [], sources: [], sinks: [], operations: [],
    graph: { coverage: "proven-sinks-only", source_to_sinks: {}, execution_order: [] },
  });
  const clock = createAsyncStore(0, (_old: number, next: number) => next);
  const motionSite = `${sourceFile}#component:Motion`;
  const childSite = `${sourceFile}#component:Child`;
  const storeSite = `${motionSite}#store:0`;
  let motionRenders = 0;
  let childRenders = 0;
  let childCleanup = 0;
  let setChild: ((next: number) => void) | undefined;
  const Child = defineComponent(childSite, () => {
    childRenders++;
    const [value, set] = useStateAt(`${childSite}#state:0`, 1);
    useEffectAt(`${childSite}#effect:0`, () => {
      setChild = set;
      return () => { childCleanup++; setChild = undefined; };
    });
    return jsx("mesh", { key: "resource", x: value });
  });
  const Motion = defineComponent(motionSite,
    (props: { clock: typeof clock; children: RuntimeNode }) => {
      motionRenders++;
      const phase = useStoreAt(storeSite, props.clock);
      return jsx("group", { key: "motion", "rotation-y": phase }, props.children);
    }, { propOnlySites: [], closedStoreHostProgram: {
      schemaVersion: 6, componentProgramId: motionSite, moduleRevision: revision,
      retainedChildProp: "children",
      inputs: [{ storeUseSiteId: storeSite, storeProp: "clock", paths: [[]] }],
      host: { tag: "group", key: "motion", child: null,
        props: [["rotation-y", { kind: "input", index: 0 }]] },
    } });
  class ReentrantHost extends MemoryVDOMHost {
    onWrite: (() => void) | undefined;
    override setProp(node: MemoryNode, name: string, value: unknown,
      previous?: unknown) {
      super.setProp(node, name, value, previous);
      if (name === "rotation-y") this.onWrite?.();
    }
  }
  const host = new ReentrantHost();
  const container = host.createContainer();
  const root = new ComponentStateRoot(host, container,
    { rootId: "retained-store-child", scheduleCommit() {} });
  try {
    root.mount(jsx(Motion, { key: "motion-owner", clock,
      children: jsx(Child, { key: "child-owner" }) }));
    const group = container.children[0];
    const child = group.children[0];
    assertEquals(motionRenders, 1);
    assertEquals(childRenders, 1);
    clock.dispatch(1);
    root.flush();
    assertEquals(group.props["rotation-y"], 1);
    assertEquals(motionRenders, 1,
      "ordinary Store flush rerendered the retained wrapper");
    assertEquals(childRenders, 1,
      "ordinary Store flush rerendered its retained child");
    clock.dispatch(2);
    const cut = root.prepareStores([clock]);
    assert(cut, "retained-child Store cut declined");
    assert(cut.validate());
    cut.commitHost();
    assert(cut.validatePostHost());
    cut.preparePublication(); cut.publish(); cut.runEffects();
    assertStrictEquals(container.children[0], group);
    assertStrictEquals(group.children[0], child);
    assertEquals(group.props["rotation-y"], 2);
    assertEquals(motionRenders, 1);
    assertEquals(childRenders, 1);
    assertEquals(childCleanup, 0);
    assert(setChild);
    setChild(3);
    root.flush();
    assertStrictEquals(group.children[0], child);
    assertEquals(child.props.x, 3);
    clock.dispatch(4);
    root.flush();
    assertStrictEquals(group.children[0], child);
    assertEquals(child.props.x, 3);
    assertEquals(group.props["rotation-y"], 4);
    assertEquals(childCleanup, 0);
    clock.dispatch(5);
    const stale = root.prepareStores([clock]);
    assert(stale, "interleaving setup cut declined");
    assert(setChild);
    setChild(6);
    root.flush();
    assert(!stale.validate(), "child publication did not stale the wrapper cut");
    stale.discard();
    assertStrictEquals(group.children[0], child);
    assertEquals(child.props.x, 6);
    host.onWrite = () => { host.onWrite = undefined; clock.dispatch(8); };
    clock.dispatch(7);
    const reentrant = root.prepareStores([clock]);
    assert(reentrant, "reentrant setup cut declined");
    assert(reentrant.validate());
    reentrant.commitHost();
    assert(reentrant.validatePostHost());
    reentrant.preparePublication(); reentrant.publish(); reentrant.runEffects();
    assertEquals(group.props["rotation-y"], 7);
    assertEquals(clock.getState(), 8);
    root.flush();
    assertEquals(group.props["rotation-y"], 8,
      "newer host-time action was acknowledged by an older Store cut");
  } finally {
    root.dispose();
  }
  assertEquals(childCleanup, 1);
});

Deno.test("retained Store proof declines caller-owned and nested Store children", () => {
  for (const kind of ["caller-owned", "proxy-child", "nested-reader"] as const) {
    const sourceFile = `retained-store-child/${kind}.tsx`;
    const revision = `retained-store-${kind}-v1`;
    registerCompiledSemanticPlan({
      schema_version: 1, source_file: sourceFile, module_revision: revision,
      owners: [], sources: [], sinks: [], operations: [],
      graph: { coverage: "proven-sinks-only", source_to_sinks: {}, execution_order: [] },
    });
    const clock = createAsyncStore(0, (_old: number, next: number) => next);
    const motionSite = `${sourceFile}#component:Motion`;
    const storeSite = `${motionSite}#store:0`;
    let renders = 0;
    const Motion = defineComponent(motionSite,
      (props: { clock: typeof clock; children: RuntimeNode }) => {
        renders++;
        const phase = useStoreAt(storeSite, props.clock);
        return jsx("group", { key: "motion", "rotation-y": phase }, props.children);
      }, { propOnlySites: [], closedStoreHostProgram: {
        schemaVersion: 6, componentProgramId: motionSite, moduleRevision: revision,
        retainedChildProp: "children",
        inputs: [{ storeUseSiteId: storeSite, storeProp: "clock", paths: [[]] }],
        host: { tag: "group", key: "motion", child: null,
          props: [["rotation-y", { kind: "input", index: 0 }]] },
      } });
    const childSite = `${sourceFile}#component:Child`;
    const childStoreSite = `${childSite}#store:0`;
    const Child = defineComponent(childSite,
      (props: { clock: typeof clock }) =>
        jsx("mesh", { key: "child", x: useStoreAt(childStoreSite, props.clock) }),
      { propOnlySites: [], closedStoreHostProgram: {
        schemaVersion: 1, componentProgramId: childSite, moduleRevision: revision,
        storeUseSiteId: childStoreSite, storeProp: "clock",
        host: { tag: "mesh", key: "child", child: null,
          props: [["x", { kind: "input", index: 0 }]] },
      } });
    const callerChild = Object.freeze({ type: "mesh",
      props: Object.freeze({ key: "child", x: 0 }) });
    const child = kind === "caller-owned" ? callerChild :
      kind === "proxy-child" ? new Proxy(jsx("mesh", { key: "child", x: 0 }), {}) :
      jsx(Child, { key: "child-owner", clock });
    const host = new MemoryVDOMHost();
    const container = host.createContainer();
    const root = new ComponentStateRoot(host, container,
      { rootId: kind, scheduleCommit() {} });
    try {
      root.mount(jsx(Motion, { key: "motion-owner", clock,
        children: child as RuntimeNode }));
      clock.dispatch(1);
      assertEquals(root.prepareStores([clock]), null,
        `${kind} gained a retained-child Store cut`);
      root.flush();
      assertEquals(container.children[0].props["rotation-y"], 1);
      assert(renders > 1, `${kind} skipped generic owner rendering`);
    } finally {
      root.dispose();
    }
  }
});
