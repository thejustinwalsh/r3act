import { assert, assertEquals, assertStrictEquals } from "jsr:@std/assert";
import { createAsyncStore } from "./async_store_runtime.ts";
import {
  ComponentStateRoot, defineComponent, useEffectAt, useStateAt, useStoreAt,
} from "./component_state_runtime.ts";
import {
  normalizeClosedStoreHostProgram,
} from "./closed_store_host_program.ts";
import {
  normalizeClosedStoreNumericKernel,
} from "./closed_store_numeric_kernel.ts";
import {
  invalidateCompiledSemanticPlan, registerCompiledSemanticPlan,
} from "./compiled_semantic_plan.ts";
import { jsx, type RuntimeNode } from "./jsx_binding_runtime.ts";
import { MemoryVDOMHost, type MemoryNode } from "./vdom_snapshot_runtime.ts";

const registerPlan = (sourceFile: string, revision: string) =>
  registerCompiledSemanticPlan({
    schema_version: 1, source_file: sourceFile, module_revision: revision,
    owners: [], sources: [], sinks: [], operations: [],
    graph: { coverage: "proven-sinks-only", source_to_sinks: {}, execution_order: [] },
  });

Deno.test("numeric Store kernel metadata matches the complete normalized leaf", () => {
  const host = normalizeClosedStoreHostProgram({
    schemaVersion: 6, componentProgramId: "numeric-kernel#component:Motion",
    moduleRevision: "numeric-kernel-v1", retainedChildProp: "children",
    inputs: [{ storeUseSiteId: "clock", storeProp: "clock",
      paths: [[], ["phase"]] }],
    host: { tag: "group", key: "motion", child: null, props: [
      ["position-x", { kind: "input", index: 0 }],
      ["position-y", { kind: "binary", operator: "+",
        left: { kind: "input", index: 0 },
        right: { kind: "input", index: 1 } }],
    ] },
  });
  assert(host);
  const executeRange = (
    _inputs: readonly number[], _start: number, rows: number,
    _outputs: number[], _outputStart: number,
  ) => rows * 2;
  const kernel = {
    schemaVersion: 1, componentProgramId: host.componentProgramId,
    moduleRevision: host.moduleRevision, inputCount: 2,
    propNames: ["position-x", "position-y"], executeRange,
  };
  const normalized = normalizeClosedStoreNumericKernel(kernel, host);
  assert(normalized);
  assertStrictEquals(normalized.executeRange, executeRange);
  assertEquals(normalized.propNames, kernel.propNames);
  assertEquals(normalizeClosedStoreNumericKernel({ ...kernel, inputCount: 1 }, host), null);
  assertEquals(normalizeClosedStoreNumericKernel({ ...kernel,
    propNames: ["position-y", "position-x"] }, host), null);
  assertEquals(normalizeClosedStoreNumericKernel({ ...kernel,
    moduleRevision: "wrong" }, host), null);
  const accessor = Object.defineProperty({ ...kernel }, "executeRange", {
    get() { throw new Error("getter must not run"); },
  });
  assertEquals(normalizeClosedStoreNumericKernel(accessor, host), null);
  const aggregate = normalizeClosedStoreHostProgram({
    schemaVersion: 6, componentProgramId: host.componentProgramId,
    moduleRevision: host.moduleRevision, retainedChildProp: "children",
    inputs: [{ storeUseSiteId: "clock", storeProp: "clock", paths: [[]] }],
    host: { tag: "group", key: "motion", child: null, props: [
      ["position", { kind: "tuple", items: [
        { kind: "input", index: 0 },
        { kind: "input", index: 0 },
        { kind: "input", index: 0 },
      ] }],
    ] },
  });
  assert(aggregate);
  assertEquals(normalizeClosedStoreNumericKernel({ ...kernel,
    inputCount: 1, propNames: ["position"] }, aggregate), null);
});

Deno.test("numeric Store ranges preserve original owner order, offsets and newer reentry", () => {
  const sourceFile = "numeric-store-range/motion.tsx";
  const revision = "numeric-store-range-v1";
  registerPlan(sourceFile, revision);
  const clock = createAsyncStore(1, (_old: number, next: number) => next);
  const motionSite = `${sourceFile}#component:Motion`;
  const otherSite = `${sourceFile}#component:Other`;
  const motionUse = `${motionSite}#store:0`;
  const otherUse = `${otherSite}#store:0`;
  const calls: Array<readonly [number, number, number]> = [];
  let motionRenders = 0;
  let otherRenders = 0;
  const Motion = defineComponent(motionSite,
    (props: { clock: typeof clock; children: RuntimeNode }) => {
      motionRenders++;
      const phase = useStoreAt(motionUse, props.clock);
      return jsx("group", { key: "motion", "position-x": phase,
        "position-y": phase * 2 }, props.children);
    }, { propOnlySites: [], closedStoreHostProgram: {
      schemaVersion: 6, componentProgramId: motionSite, moduleRevision: revision,
      retainedChildProp: "children",
      inputs: [{ storeUseSiteId: motionUse, storeProp: "clock", paths: [[]] }],
      host: { tag: "group", key: "motion", child: null, props: [
        ["position-x", { kind: "input", index: 0 }],
        ["position-y", { kind: "binary", operator: "*",
          left: { kind: "input", index: 0 },
          right: { kind: "literal", value: 2 } }],
      ] },
    }, closedStoreNumericKernel: {
      schemaVersion: 1, componentProgramId: motionSite, moduleRevision: revision,
      inputCount: 1, propNames: ["position-x", "position-y"],
      executeRange(inputs, inputStart, rowCount, outputs, outputStart) {
        calls.push([inputStart, rowCount, outputStart]);
        for (let row = 0; row < rowCount; row++) {
          const phase = inputs[inputStart + row];
          outputs[outputStart + row * 2] = phase;
          outputs[outputStart + row * 2 + 1] = phase * 2;
        }
        return rowCount * 2;
      },
    } });
  const Other = defineComponent(otherSite, (props: { clock: typeof clock }) => {
    otherRenders++;
    return jsx("group", { key: "other", "position-z": useStoreAt(otherUse, props.clock) });
  }, { propOnlySites: [], closedStoreHostProgram: {
    schemaVersion: 1, componentProgramId: otherSite, moduleRevision: revision,
    storeUseSiteId: otherUse, storeProp: "clock",
    host: { tag: "group", key: "other", child: null, props: [
      ["position-z", { kind: "input", index: 0 }],
    ] },
  } });
  class ReentrantHost extends MemoryVDOMHost {
    onWrite: (() => void) | undefined;
    override setProp(node: MemoryNode, name: string, value: unknown,
      previous?: unknown) {
      super.setProp(node, name, value, previous);
      if (name === "position-x") this.onWrite?.();
    }
  }
  const host = new ReentrantHost();
  const container = host.createContainer();
  const root = new ComponentStateRoot(host, container,
    { rootId: "numeric-store-range", scheduleCommit() {} });
  const tree = () => jsx("section", {}, [
    ...["a", "b"].map(label => jsx("div", { key: label },
      jsx(Motion, { key: "same", clock,
        children: jsx("mesh", { key: `child:${label}` }) }))),
    jsx("div", { key: "other-parent" }, jsx(Other, { clock })),
    jsx("div", { key: "c" }, jsx(Motion, { key: "same", clock,
      children: jsx("mesh", { key: "child:c" }) })),
  ]);
  try {
    root.mount(tree());
    const parents = container.children[0].children;
    const motionHosts = [parents[0].children[0], parents[1].children[0],
      parents[3].children[0]];
    const children = motionHosts.map(node => node.children[0]);
    clock.dispatch(3);
    const first = root.prepareStores([clock]);
    assert(first, "numeric Store cut declined");
    assert(first.validate());
    first.commitHost();
    assert(first.validatePostHost());
    first.preparePublication(); first.publish(); first.runEffects();
    assertEquals(calls, [[0, 2, 0], [2, 1, 4]]);
    assertEquals(motionHosts.map(node => node.props["position-x"]), [3, 3, 3]);
    assertEquals(motionHosts.map(node => node.props["position-y"]), [6, 6, 6]);
    assertEquals(parents[2].children[0].props["position-z"], 3);
    assertEquals(motionRenders, 3);
    assertEquals(otherRenders, 1);
    motionHosts.forEach((node, index) =>
      assertStrictEquals(node.children[0], children[index]));

    host.onWrite = () => { host.onWrite = undefined; clock.dispatch(5); };
    clock.dispatch(4);
    const reentrant = root.prepareStores([clock]);
    assert(reentrant);
    assert(reentrant.validate());
    reentrant.commitHost();
    assert(reentrant.validatePostHost());
    reentrant.preparePublication(); reentrant.publish(); reentrant.runEffects();
    assertEquals(motionHosts.map(node => node.props["position-x"]), [4, 4, 4]);
    assertEquals(clock.getState(), 5);
    root.flush();
    assertEquals(motionHosts.map(node => node.props["position-x"]), [5, 5, 5]);

    clock.dispatch(6);
    const stale = root.prepareStores([clock]);
    assert(stale);
    assert(invalidateCompiledSemanticPlan(sourceFile, revision));
    assertEquals(stale.validate(), false);
    stale.discard();
  } finally {
    root.dispose();
  }
});

Deno.test("numeric Store kernel gathers a multi-use owner only once", () => {
  const sourceFile = "numeric-store-range/two-inputs.tsx";
  const revision = "numeric-store-two-inputs-v1";
  registerPlan(sourceFile, revision);
  const left = createAsyncStore(1, (_old: number, next: number) => next);
  const right = createAsyncStore(2, (_old: number, next: number) => next);
  const site = `${sourceFile}#component:Pair`;
  const leftUse = `${site}#store:0`;
  const rightUse = `${site}#store:1`;
  const calls: Array<readonly [number, number, number]> = [];
  let renders = 0;
  const Pair = defineComponent(site,
    (props: { left: typeof left; right: typeof right }) => {
      renders++;
      const x = useStoreAt(leftUse, props.left);
      const y = useStoreAt(rightUse, props.right);
      return jsx("output", { key: "pair", "data-value": x + y });
    }, { propOnlySites: [], closedStoreHostProgram: {
      schemaVersion: 2, componentProgramId: site, moduleRevision: revision,
      inputs: [
        { storeUseSiteId: leftUse, storeProp: "left" },
        { storeUseSiteId: rightUse, storeProp: "right" },
      ],
      host: { tag: "output", key: "pair", child: null, props: [
        ["data-value", { kind: "binary", operator: "+",
          left: { kind: "input", index: 0 },
          right: { kind: "input", index: 1 } }],
      ] },
    }, closedStoreNumericKernel: {
      schemaVersion: 1, componentProgramId: site, moduleRevision: revision,
      inputCount: 2, propNames: ["data-value"],
      executeRange(inputs, inputStart, rowCount, outputs, outputStart) {
        calls.push([inputStart, rowCount, outputStart]);
        for (let row = 0; row < rowCount; row++) {
          const base = inputStart + row * 2;
          outputs[outputStart + row] = inputs[base] + inputs[base + 1];
        }
        return rowCount;
      },
    } });
  const host = new MemoryVDOMHost();
  const container = host.createContainer();
  const root = new ComponentStateRoot(host, container,
    { rootId: "numeric-store-two-inputs", scheduleCommit() {} });
  try {
    root.mount(jsx(Pair, { left, right }));
    left.dispatch(3);
    right.dispatch(4);
    const candidate = root.prepareStores([left, right]);
    assert(candidate, "multi-use owner was captured twice or declined");
    assert(candidate.validate());
    candidate.commitHost();
    assert(candidate.validatePostHost());
    candidate.preparePublication(); candidate.publish(); candidate.runEffects();
    assertEquals(calls, [[0, 1, 0]]);
    assertEquals(container.children[0].props["data-value"], 7);
    assertEquals(renders, 1);
  } finally {
    root.dispose();
  }
});

Deno.test("bad numeric output declines before host publication and uses generic fallback", () => {
  const sourceFile = "numeric-store-range/nonfinite.tsx";
  const revision = "numeric-store-nonfinite-v1";
  registerPlan(sourceFile, revision);
  const clock = createAsyncStore(1, (_old: number, next: number) => next);
  const site = `${sourceFile}#component:Value`;
  const useSite = `${site}#store:0`;
  let renders = 0;
  const Value = defineComponent(site, (props: { clock: typeof clock }) => {
    renders++;
    return jsx("output", { key: "value", "data-value":
      useStoreAt(useSite, props.clock) });
  }, { propOnlySites: [], closedStoreHostProgram: {
    schemaVersion: 1, componentProgramId: site, moduleRevision: revision,
    storeUseSiteId: useSite, storeProp: "clock",
    host: { tag: "output", key: "value", child: null, props: [
      ["data-value", { kind: "input", index: 0 }],
    ] },
  }, closedStoreNumericKernel: {
    schemaVersion: 1, componentProgramId: site, moduleRevision: revision,
    inputCount: 1, propNames: ["data-value"],
    executeRange(_inputs, _start, rows, outputs, outputStart) {
      for (let row = 0; row < rows; row++) outputs[outputStart + row] = Infinity;
      return rows;
    },
  } });
  const host = new MemoryVDOMHost();
  const container = host.createContainer();
  const root = new ComponentStateRoot(host, container,
    { rootId: "numeric-store-nonfinite", scheduleCommit() {} });
  try {
    root.mount(jsx(Value, { clock }));
    clock.dispatch(2);
    assertEquals(root.prepareStores([clock]), null);
    assertEquals(container.children[0].props["data-value"], 1);
    root.flush();
    assertEquals(container.children[0].props["data-value"], 2);
    assert(renders > 1, "generic fallback skipped the authored component");
  } finally {
    root.dispose();
  }
});

Deno.test("owned Store data evaluates in one passive batch and retains host identity", () => {
  const sourceFile = "owned-store-data/passive.tsx", revision = "owned-store-data-v1";
  registerPlan(sourceFile, revision);
  const clock = createAsyncStore(1, (_old: number, next: number) => next);
  const site = `${sourceFile}#component:Motion`, useSite = `${site}#store:0`;
  let renders = 0;
  const Motion = defineComponent(site, (props: { clock: typeof clock }) => {
    renders++;
    return jsx("group", { key: "motion", "position-x": useStoreAt(useSite, props.clock) });
  }, { propOnlySites: [], closedStoreHostProgram: {
    schemaVersion: 1, componentProgramId: site, moduleRevision: revision,
    storeUseSiteId: useSite, storeProp: "clock",
    host: { tag: "group", key: "motion", child: null,
      props: [["position-x", { kind: "input", index: 0 }]] },
  }, closedStoreExecution: { schemaVersion: 1, kind: "owned-data",
    componentProgramId: site, moduleRevision: revision } });
  const host = new MemoryVDOMHost(), container = host.createContainer();
  const observed: Record<string, number> = {};
  const root = new ComponentStateRoot(host, container, { rootId: "owned-store-data",
    scheduleCommit() {}, profileCounter: (counters) => Object.assign(observed, counters) });
  try {
    root.mount(jsx(Motion, { clock }));
    const retained = container.children[0];
    clock.dispatch(3);
    const candidate = root.prepareStores([clock]);
    assert(candidate);
    assert(candidate.validate());
    candidate.commitHost();
    assert(candidate.validatePostHost());
    candidate.preparePublication(); candidate.publish(); candidate.runEffects();
    assertStrictEquals(container.children[0], retained);
    assertEquals(retained.props["position-x"], 3);
    assertEquals(renders, 1);
    clock.dispatch(5);
    root.flush();
    assertEquals(retained.props["position-x"], 5);
    assertEquals(observed["store.owned-data.rows"], 1);
    assertEquals(observed["store.owned-data.batches"], 1);
  } finally { root.dispose(); }
});

Deno.test("schema-7 metadata rejects simultaneous data and callback execution", () => {
  const sourceFile = "owned-store-data/dual.tsx", revision = "owned-store-dual-v1";
  registerPlan(sourceFile, revision);
  const site = `${sourceFile}#component:Dual`, useSite = `${site}#store:0`;
  const host = {
    schemaVersion: 7 as const, componentProgramId: site, moduleRevision: revision,
    inputs: [{ storeUseSiteId: useSite, storeProp: "clock", paths: [[]] }],
    stateSites: [`${site}#state:0`], effectSites: [], retainedChildProp: null,
    host: { tag: "output", key: "dual", child: null, props: [
      ["data-value", { kind: "binary", operator: "+",
        left: { kind: "input", index: 0 },
        right: { kind: "input", index: 1 } }],
    ] },
  } as const;
  const render = (_props: Record<string, unknown>) => jsx("output", { key: "dual" });
  let rejected = false;
  try {
    defineComponent(site, render, { propOnlySites: [], closedStoreHostProgram: host,
      closedStoreExecution: { schemaVersion: 1, kind: "owned-data",
        componentProgramId: site, moduleRevision: revision },
      closedStoreNumericKernel: { schemaVersion: 1, componentProgramId: site,
        moduleRevision: revision, inputCount: 2, propNames: ["data-value"],
        executeRange(_inputs, _start, rows) { return rows; } },
    });
  } catch { rejected = true; }
  assert(rejected);
});

Deno.test("mixed owned data and callback kernel keep original owner order", () => {
  const sourceFile = "owned-store-data/mixed.tsx", revision = "owned-store-mixed-v1";
  registerPlan(sourceFile, revision);
  const clock = createAsyncStore(1, (_old: number, next: number) => next);
  const observed: string[] = [];
  const make = (name: string, legacy: boolean) => {
    const site = `${sourceFile}#component:${name}`, useSite = `${site}#store:0`;
    return defineComponent(site, (props: { clock: typeof clock }) =>
      jsx("output", { key: name, "data-value": useStoreAt(useSite, props.clock) }),
    { propOnlySites: [], closedStoreHostProgram: {
      schemaVersion: 1, componentProgramId: site, moduleRevision: revision,
      storeUseSiteId: useSite, storeProp: "clock",
      host: { tag: "output", key: name, child: null,
        props: [["data-value", { kind: "input", index: 0 }]] },
    }, ...(legacy ? { closedStoreNumericKernel: {
      schemaVersion: 1 as const, componentProgramId: site, moduleRevision: revision,
      inputCount: 1, propNames: ["data-value"],
      executeRange(inputs: readonly number[], start: number, rows: number,
        outputs: number[], outputStart: number) {
        observed.push(name);
        for (let row = 0; row < rows; row++) outputs[outputStart + row] = inputs[start + row];
        return rows;
      },
    } } : { closedStoreExecution: {
      schemaVersion: 1 as const, kind: "owned-data" as const,
      componentProgramId: site, moduleRevision: revision,
    } }) });
  };
  const First = make("First", false), Legacy = make("Legacy", true);
  const Last = make("Last", false);
  const host = new MemoryVDOMHost(), container = host.createContainer();
  const observedCounters: Record<string, number> = {};
  const root = new ComponentStateRoot(host, container, { rootId: "owned-store-mixed",
    scheduleCommit() {}, profileCounter: (counters) =>
      Object.assign(observedCounters, counters) });
  try {
    root.mount(jsx("section", {}, [jsx(First, { clock }), jsx(Legacy, { clock }),
      jsx(Last, { clock })]));
    clock.dispatch(4);
    const candidate = root.prepareStores([clock]);
    assert(candidate);
    assert(candidate.validate());
    candidate.commitHost();
    assert(candidate.validatePostHost());
    candidate.preparePublication(); candidate.publish(); candidate.runEffects();
    assertEquals(observed, ["Legacy"]);
    assertEquals(container.children[0].children.map((node) => node.props["data-value"]),
      [4, 4, 4]);
    clock.dispatch(6);
    root.flush();
    assertEquals(observed, ["Legacy", "Legacy"]);
    assertEquals(container.children[0].children.map((node) => node.props["data-value"]),
      [6, 6, 6]);
    assertEquals(observedCounters["store.owned-data.rows"], 2);
    assertEquals(observedCounters["store.owned-data.batches"] ?? 0, 0);
  } finally { root.dispose(); }
});

Deno.test("late World publication overrides cannot run after Store acceptance", () => {
  const sourceFile = "owned-store-data/late-world.tsx", revision = "late-world-v1";
  registerPlan(sourceFile, revision);
  const clock = createAsyncStore(1, (_old: number, next: number) => next);
  const site = `${sourceFile}#component:Motion`, useSite = `${site}#store:0`;
  const Motion = defineComponent(site, (props: { clock: typeof clock }) =>
    jsx("group", { key: "motion", "position-x": useStoreAt(useSite, props.clock) }),
  { propOnlySites: [], closedStoreHostProgram: {
    schemaVersion: 1, componentProgramId: site, moduleRevision: revision,
    storeUseSiteId: useSite, storeProp: "clock",
    host: { tag: "group", key: "motion", child: null,
      props: [["position-x", { kind: "input", index: 0 }]] },
  }, closedStoreExecution: { schemaVersion: 1, kind: "owned-data",
    componentProgramId: site, moduleRevision: revision } });
  const host = new MemoryVDOMHost(), container = host.createContainer();
  const root = new ComponentStateRoot(host, container,
    { rootId: "late-world-publication", scheduleCommit() {} });
  let lineageCalls = 0, acknowledgementCalls = 0;
  try {
    root.mount(jsx(Motion, { clock }));
    clock.dispatch(3);
    const candidate = root.prepareStores([clock]);
    assert(candidate);
    assert(candidate.validate());
    candidate.commitHost();
    assert(candidate.validatePostHost());
    candidate.preparePublication();
    Object.defineProperty(root.world, "ownerLineage", { configurable: true,
      value() { lineageCalls++; throw new Error("late lineage override"); } });
    Object.defineProperty(root.world, "clearCellChangesThrough", { configurable: true,
      value() { acknowledgementCalls++; throw new Error("late acknowledgement override"); } });
    candidate.publish();
    assertEquals(container.children[0].props["position-x"], 3);
    assertEquals(lineageCalls, 0);
    assertEquals(acknowledgementCalls, 0);
    candidate.runEffects();
  } finally {
    Reflect.deleteProperty(root.world, "ownerLineage");
    Reflect.deleteProperty(root.world, "clearCellChangesThrough");
    root.dispose();
  }
});

Deno.test("owned mixed cut acknowledges its old cell version and retains host-time action", () => {
  const sourceFile = "owned-store-data/newer-cell.tsx", revision = "newer-cell-v1";
  registerPlan(sourceFile, revision);
  const clock = createAsyncStore(1, (_old: number, next: number) => next);
  const site = `${sourceFile}#component:Motion`, useSite = `${site}#store:0`;
  const stateSite = `${site}#state:0`, effectSite = `${site}#effect:0`;
  let setOffset!: (value: number) => boolean;
  let renders = 0;
  const Motion = defineComponent(site, (props: { clock: typeof clock }) => {
    renders++;
    const phase = useStoreAt(useSite, props.clock);
    const [offset, set] = useStateAt(stateSite, 2);
    useEffectAt(effectSite, () => { setOffset = set; });
    return jsx("group", { key: "motion", "position-x": phase + offset });
  }, { propOnlySites: [], closedStoreHostProgram: {
    schemaVersion: 7, componentProgramId: site, moduleRevision: revision,
    inputs: [{ storeUseSiteId: useSite, storeProp: "clock", paths: [[]] }],
    stateSites: [stateSite], effectSites: [effectSite], retainedChildProp: null,
    host: { tag: "group", key: "motion", child: null, props: [
      ["position-x", { kind: "binary", operator: "+",
        left: { kind: "input", index: 0 }, right: { kind: "input", index: 1 } }],
    ] },
  }, closedStoreExecution: { schemaVersion: 1, kind: "owned-data",
    componentProgramId: site, moduleRevision: revision } });
  class InterleavingHost extends MemoryVDOMHost {
    onWrite: (() => void) | undefined;
    override setProp(node: MemoryNode, name: string, value: unknown,
      previous?: unknown) {
      super.setProp(node, name, value, previous);
      if (name === "position-x") {
        const callback = this.onWrite;
        this.onWrite = undefined;
        callback?.();
      }
    }
  }
  const host = new InterleavingHost(), container = host.createContainer();
  const root = new ComponentStateRoot(host, container,
    { rootId: "owned-newer-cell", scheduleCommit() {} });
  try {
    root.mount(jsx(Motion, { key: "owner", clock }));
    const rootOwner = root.world.findOwner(null, `@component-root:${root.rootId}`);
    assert(rootOwner !== undefined);
    const owner = root.world.findOwner(rootOwner, site, "owner");
    assert(owner !== undefined);
    const handle = root.world.cellHandle(owner, stateSite);
    assert(handle);
    assert(setOffset(3));
    clock.dispatch(4);
    host.onWrite = () => { assert(setOffset(5)); };
    const candidate = root.prepareTransaction({ cells: [handle], collections: [],
      stores: [clock] });
    assert(candidate);
    assert(candidate.validate());
    candidate.commitHost();
    assert(candidate.validatePostHost());
    candidate.preparePublication(); candidate.publish(); candidate.runEffects();
    assertEquals(container.children[0].props["position-x"], 7);
    root.flush();
    assertEquals(container.children[0].props["position-x"], 9);
    assertEquals(renders, 1);
  } finally { root.dispose(); }
});
