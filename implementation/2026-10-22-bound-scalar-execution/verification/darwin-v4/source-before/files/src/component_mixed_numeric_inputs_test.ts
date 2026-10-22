import { assert, assertEquals, assertStrictEquals, assertThrows } from "jsr:@std/assert";
import { createAsyncStore } from "./async_store_runtime.ts";
import {
  closedStoreHostValueCount, normalizeClosedStoreHostProgram,
} from "./closed_store_host_program.ts";
import { normalizeClosedStoreNumericKernel } from "./closed_store_numeric_kernel.ts";
import {
  ComponentStateRoot, defineComponent, useEffectAt, useStateAt, useStoreAt,
  renderCollectionAt,
} from "./component_state_runtime.ts";
import { registerCompiledSemanticPlan } from "./compiled_semantic_plan.ts";
import { jsx, type RuntimeNode } from "./jsx_binding_runtime.ts";
import { createKeyedCollection } from "./keyed_collection.ts";
import { MemoryVDOMHost, type MemoryNode } from "./vdom_snapshot_runtime.ts";

const plan = (file: string, revision: string) => registerCompiledSemanticPlan({
  schema_version: 1, source_file: file, module_revision: revision,
  owners: [], sources: [], sinks: [], operations: [],
  graph: { coverage: "proven-sinks-only", source_to_sinks: {}, execution_order: [] },
});

Deno.test("mixed metadata freezes lexical Store and local sites and rejects incomplete kernels", () => {
  const raw = {
    schemaVersion: 7, componentProgramId: "mixed#component:Leaf",
    moduleRevision: "mixed-v1", retainedChildProp: null,
    inputs: [{ storeUseSiteId: "mixed#store:0", storeProp: "clock",
      paths: [["phase"], ["epoch"]] }],
    stateSites: ["mixed#state:0"], effectSites: ["mixed#effect:0"],
    host: { tag: "group", key: "mixed", child: null, props: [
      ["position-x", { kind: "input", index: 2 }],
    ] },
  };
  const program = normalizeClosedStoreHostProgram(raw);
  assert(program);
  assertEquals(closedStoreHostValueCount(program), 3);
  raw.stateSites[0] = "changed";
  assertEquals(program.schemaVersion === 7 && program.stateSites[0], "mixed#state:0");
  assertEquals(normalizeClosedStoreNumericKernel({
    schemaVersion: 1, componentProgramId: program.componentProgramId,
    moduleRevision: program.moduleRevision, inputCount: 2,
    propNames: ["position-x"], executeRange() { return 1; },
  }, program), null);
  assertEquals(normalizeClosedStoreHostProgram({ ...raw, stateSites: [] }), null);
  assertEquals(normalizeClosedStoreHostProgram({ ...raw,
    effectSites: ["mixed#effect:0", "mixed#effect:0"] }), null);
  const shifting = { ...raw, stateSites: ["mixed#state:0"],
    effectSites: ["mixed#effect:0"], host: raw.host };
  shifting.host = new Proxy(raw.host, {
    getPrototypeOf(target) {
      shifting.stateSites[0] = "mutated-state";
      shifting.effectSites[0] = "mutated-effect";
      return Object.getPrototypeOf(target);
    },
  });
  const copied = normalizeClosedStoreHostProgram(shifting);
  assert(copied && copied.schemaVersion === 7);
  assertEquals(copied.stateSites, ["mixed#state:0"]);
  assertEquals(copied.effectSites, ["mixed#effect:0"]);
  assertEquals(closedStoreHostValueCount(copied), 3);
});

Deno.test("mixed numeric owner captures Store and local inputs once without rerendering activation", () => {
  const file = "mixed-numeric/direct.tsx", revision = "mixed-numeric-v1";
  plan(file, revision);
  const left = createAsyncStore(2, (_: number, action: number) => action);
  const right = createAsyncStore(3, (_: number, action: number) => action);
  const site = `${file}#component:Motion`;
  const stateSite = `${site}#state:0`, effectSite = `${site}#effect:0`;
  const leftUse = `${site}#store:0`, rightUse = `${site}#store:1`;
  let setOffset!: (next: number) => boolean;
  let renders = 0, setups = 0, cleanups = 0;
  const calls: number[][] = [];
  const Motion = defineComponent(site,
    (props: { left: typeof left; right: typeof right; children: RuntimeNode }) => {
      renders++;
      const a = useStoreAt(leftUse, props.left);
      const b = useStoreAt(rightUse, props.right);
      const [offset, set] = useStateAt(stateSite, 4);
      useEffectAt(effectSite, () => {
        setups++; setOffset = set;
        return () => { cleanups++; };
      });
      return jsx("group", { key: "motion", "position-x": a + b + offset },
        props.children);
    }, { propOnlySites: [], closedStoreHostProgram: {
      schemaVersion: 7, componentProgramId: site, moduleRevision: revision,
      inputs: [
        { storeUseSiteId: leftUse, storeProp: "left", paths: [[]] },
        { storeUseSiteId: rightUse, storeProp: "right", paths: [[]] },
      ], stateSites: [stateSite], effectSites: [effectSite],
      retainedChildProp: "children",
      host: { tag: "group", key: "motion", child: null, props: [
        ["position-x", { kind: "binary", operator: "+",
          left: { kind: "binary", operator: "+",
            left: { kind: "input", index: 0 }, right: { kind: "input", index: 1 } },
          right: { kind: "input", index: 2 } }],
      ] },
    }, closedStoreNumericKernel: {
      schemaVersion: 1, componentProgramId: site, moduleRevision: revision,
      inputCount: 3, propNames: ["position-x"],
      executeRange(input, start, rows, output, offset) {
        for (let row = 0; row < rows; row++) {
          const base = start + row * 3;
          calls.push([input[base], input[base + 1], input[base + 2]]);
          output[offset + row] = input[base] + input[base + 1] + input[base + 2];
        }
        return rows;
      },
    } });
  class InterleavingHost extends MemoryVDOMHost {
    onWrite: (() => void) | undefined;
    fail = false;
    override setProp(node: MemoryNode, name: string, value: unknown,
      previous?: unknown) {
      super.setProp(node, name, value, previous);
      if (name === "position-x") {
        const callback = this.onWrite;
        this.onWrite = undefined;
        callback?.();
        if (this.fail) throw new Error("partial mixed host write");
      }
    }
  }
  const host = new InterleavingHost(), container = host.createContainer();
  const root = new ComponentStateRoot(host, container,
    { rootId: "mixed-numeric-direct", scheduleCommit() {} });
  try {
    root.mount(jsx(Motion, { key: "owner", left, right,
      children: jsx("mesh", { key: "child", "position-y": 7 }) }));
    const group = container.children[0], child = group.children[0];
    const rootOwner = root.world.findOwner(null, `@component-root:${root.rootId}`);
    assert(rootOwner !== undefined);
    const owner = root.world.findOwner(rootOwner, site, "owner");
    assert(owner !== undefined);
    const handle = root.world.cellHandle(owner, stateSite);
    assert(handle);
    assertEquals([renders, setups, cleanups], [1, 1, 0]);
    assertEquals(group.props["position-x"], 9);

    assert(setOffset(5));
    const local = root.prepareRetained([handle]);
    assert(local, "local-only joint cut declined");
    assert(local.validate());
    local.commitHost(); local.preparePublication(); local.publish(); local.runEffects();
    assertEquals(calls.at(-1), [2, 3, 5]);
    assertEquals(group.props["position-x"], 10);
    assertStrictEquals(group.children[0], child);

    left.dispatch(6);
    const store = root.prepareStores([left]);
    assert(store, "Store-only joint cut declined");
    store.commitHost(); store.preparePublication(); store.publish(); store.runEffects();
    assertEquals(calls.at(-1), [6, 3, 5]);
    assertEquals(group.props["position-x"], 14);

    assert(setOffset(8)); right.dispatch(7);
    assertEquals(root.prepareRetained([handle]), null,
      "unselected pending Store joined a local-only cut");
    assertEquals(root.prepareStores([right]), null,
      "unselected pending cell joined a Store-only cut");
    const joint = root.prepareTransaction({ cells: [handle], collections: [], stores: [right] });
    assert(joint, "joint input cut declined");
    joint.commitHost(); joint.preparePublication(); joint.publish(); joint.runEffects();
    assertEquals(calls.at(-1), [6, 7, 8]);
    assertEquals(group.props["position-x"], 21);
    assertEquals([renders, setups, cleanups], [1, 1, 0]);

    const releaseLocal = root.holdTransactionPublications({
      resources: [], cells: [handle],
    });
    try {
      left.dispatch(9);
      const blocked = root.prepareStores([left]);
      assert(blocked?.blocked, "held unchanged local input entered a Store cut");
      assertEquals(blocked.validate(), false);
      blocked.discard();
      assertEquals(group.props["position-x"], 21);
    } finally { releaseLocal(); }

    let releaseAtHost: (() => void) | undefined;
    host.onWrite = () => {
      assert(setOffset(9));
      releaseAtHost = root.holdTransactionPublications({
        resources: [], cells: [handle],
      });
    };
    left.dispatch(10);
    const interleaved = root.prepareStores([left]);
    assert(interleaved);
    interleaved.commitHost();
    assert(interleaved.validatePostHost(),
      "new host-time hold or local action invalidated accepted Store cut");
    interleaved.preparePublication(); interleaved.publish(); interleaved.runEffects();
    assertEquals(group.props["position-x"], 25);
    releaseAtHost?.();
    root.flush();
    assertEquals(group.props["position-x"], 26,
      "the Store cut consumed a newer host-time local action");
    assertEquals([renders, setups, cleanups], [1, 1, 0]);

    const accepted = JSON.stringify(root.snapshot);
    const version = root.publicationVersion;
    host.fail = true;
    assert(setOffset(11));
    const failed = root.prepareRetained([handle]);
    assert(failed);
    assertThrows(() => failed.commitHost(), Error, "partial mixed host write");
    assertEquals(root.publicationVersion, version);
    assertEquals(JSON.stringify(root.snapshot), accepted);
    assertEquals([renders, setups, cleanups], [1, 1, 0]);
  } finally { root.dispose(); }
  assertEquals(cleanups, 1);
});

Deno.test("same-owner collection replacement and mixed inputs fall back coherently", () => {
  const file = "mixed-numeric/collection.tsx", revision = "mixed-collection-v1";
  plan(file, revision);
  const clock = createAsyncStore(2, (_: number, action: number) => action);
  const rows = createKeyedCollection([{ id: "a", marker: 1 }], (row) => row.id);
  const rowSite = `${file}#component:Row`, stateSite = `${rowSite}#state:0`;
  const storeSite = `${rowSite}#store:0`, effectSite = `${rowSite}#effect:0`;
  let setOffset!: (next: number) => boolean;
  let renders = 0;
  const Row = defineComponent(rowSite,
    (props: { row: { id: string; marker: number }; clock: typeof clock }) => {
      renders++;
      const phase = useStoreAt(storeSite, props.clock);
      const [offset, set] = useStateAt(stateSite, 1);
      useEffectAt(effectSite, () => { setOffset = set; });
      return jsx("group", { key: "row-host", "position-x": phase + offset });
    }, { propOnlySites: [], closedStoreHostProgram: {
      schemaVersion: 7, componentProgramId: rowSite, moduleRevision: revision,
      inputs: [{ storeUseSiteId: storeSite, storeProp: "clock", paths: [[]] }],
      stateSites: [stateSite], effectSites: [effectSite], retainedChildProp: null,
      host: { tag: "group", key: "row-host", child: null, props: [
        ["position-x", { kind: "binary", operator: "+",
          left: { kind: "input", index: 0 }, right: { kind: "input", index: 1 } }],
      ] },
    }, closedStoreNumericKernel: {
      schemaVersion: 1, componentProgramId: rowSite, moduleRevision: revision,
      inputCount: 2, propNames: ["position-x"],
      executeRange(input, start, count, output, offset) {
        for (let index = 0; index < count; index++) {
          const at = start + index * 2;
          output[offset + index] = input[at] + input[at + 1];
        }
        return count;
      },
    } });
  const List = defineComponent(`${file}#component:List`, () =>
    jsx("div", {}, renderCollectionAt(`${file}#collection:0`, rows,
      (row) => jsx(Row, { key: row.id, row, clock }))));
  const host = new MemoryVDOMHost(), container = host.createContainer();
  const root = new ComponentStateRoot(host, container, {
    rootId: "mixed-collection-fallback", scheduleCommit() {},
    renderPreparation: "repeatable",
  });
  try {
    root.mount(jsx(List, {}));
    assertEquals(container.children[0].children[0].props["position-x"], 3);
    assert(setOffset(8));
    const change = root.world.pendingChanges()[0];
    assert(change);
    const handle = root.world.cellHandle(change.owner, stateSite);
    assert(handle);
    assert(rows.apply(rows.version, [{ type: "replace", key: "a",
      value: { id: "a", marker: 2 } }]).ok);
    clock.dispatch(5);
    assertEquals(root.prepareTransaction({ cells: [handle], collections: [rows],
      stores: [clock] }), null,
    "same owner must not publish both a rendered row and closed output");
    assert(root.flush(), "generic fallback did not publish the combined inputs");
    assertEquals(container.children[0].children[0].props["position-x"], 13);
    assert(renders >= 2);
    assertEquals(root.diagnostics().pendingChangeCount, 0);
  } finally { root.dispose(); }
});

Deno.test("unrelated pending Store does not block a local mixed control", () => {
  const file = "mixed-numeric/independent.tsx", revision = "mixed-independent-v1";
  plan(file, revision);
  const clock = createAsyncStore(2, (_: number, action: number) => action);
  const health = createAsyncStore(0, (_: number, action: number) => action);
  const site = `${file}#component:Motion`, storeSite = `${site}#store:0`;
  const stateSite = `${site}#state:0`, effectSite = `${site}#effect:0`;
  let setOffset!: (next: number) => boolean;
  let motionRenders = 0;
  const Motion = defineComponent(site, (props: { clock: typeof clock }) => {
    motionRenders++;
    const phase = useStoreAt(storeSite, props.clock);
    const [offset, set] = useStateAt(stateSite, 1);
    useEffectAt(effectSite, () => { setOffset = set; });
    return jsx("group", { key: "motion", "position-x": phase + offset });
  }, { propOnlySites: [], closedStoreHostProgram: {
    schemaVersion: 7, componentProgramId: site, moduleRevision: revision,
    inputs: [{ storeUseSiteId: storeSite, storeProp: "clock", paths: [[]] }],
    stateSites: [stateSite], effectSites: [effectSite], retainedChildProp: null,
    host: { tag: "group", key: "motion", child: null, props: [
      ["position-x", { kind: "binary", operator: "+",
        left: { kind: "input", index: 0 }, right: { kind: "input", index: 1 } }],
    ] },
  }, closedStoreNumericKernel: {
    schemaVersion: 1, componentProgramId: site, moduleRevision: revision,
    inputCount: 2, propNames: ["position-x"],
    executeRange(input, start, count, output, offset) {
      for (let index = 0; index < count; index++) {
        const at = start + index * 2;
        output[offset + index] = input[at] + input[at + 1];
      }
      return count;
    },
  } });
  const Health = defineComponent(`${file}#component:Health`, () =>
    jsx("output", { key: "health", "data-value": useStoreAt(
      `${file}#component:Health#store:0`, health,
    ) }));
  const host = new MemoryVDOMHost(), container = host.createContainer();
  const root = new ComponentStateRoot(host, container,
    { rootId: "mixed-independent", scheduleCommit() {} });
  try {
    root.mount([jsx(Motion, { key: "motion-owner", clock }), jsx(Health, {})]);
    health.dispatch(4);
    assert(setOffset(5));
    const change = root.world.pendingChanges()[0];
    assert(change);
    const handle = root.world.cellHandle(change.owner, stateSite);
    assert(handle);
    const local = root.prepareRetained([handle]);
    assert(local, "independent pending Store blocked local mixed cut");
    local.commitHost(); local.preparePublication(); local.publish(); local.runEffects();
    assertEquals(container.children[0].props["position-x"], 7);
    assertEquals(container.children[1].props["data-value"], 0,
      "local cut consumed independent Store history");
    assertEquals(motionRenders, 1);
    root.flush();
    assertEquals(container.children[1].props["data-value"], 4);
  } finally { root.dispose(); }
});
