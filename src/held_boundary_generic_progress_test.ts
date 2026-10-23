import { assert, assertEquals, assertStrictEquals, assertThrows } from "jsr:@std/assert";
import { AsyncResource } from "./async_resource_runtime.ts";
import { createAsyncStore } from "./async_store_runtime.ts";
import {
  ComponentStateRoot, defineComponent, Suspense, useAt, useEffectAt, useStateAt, useStoreAt,
} from "./component_state_runtime.ts";
import { invalidateCompiledSemanticPlan, registerCompiledSemanticPlan } from "./compiled_semantic_plan.ts";
import { jsx } from "./jsx_binding_runtime.ts";
import { NativeRootWorkQueue } from "./native_root_work_queue.ts";
import { OwnerStateWorld } from "./owner_state_world.ts";
import { type MemoryNode, MemoryVDOMHost } from "./vdom_snapshot_runtime.ts";

const deferred = <T>() => {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => { resolve = done; });
  return { promise, resolve };
};
const text = (node: MemoryNode): string =>
  (node.text ?? "") + node.children.map(text).join("");

function fixture(id: string, leftHost = new MemoryVDOMHost()) {
  const sourceFile = `held-boundary/${id}.tsx`;
  const shellSourceFile = `held-boundary/${id}-shell.tsx`;
  const revision = "held-boundary-v1";
  const registerSource = (source: string) => registerCompiledSemanticPlan({
    schema_version: 1, source_file: source,
    module_revision: revision, owners: [], sources: [], sinks: [], operations: [],
    graph: { coverage: "proven-sinks-only", source_to_sinks: {}, execution_order: [] } });
  registerSource(sourceFile);
  registerSource(shellSourceFile);
  const detailWait = deferred<string>(), signalWait = deferred<string>();
  const detail = new AsyncResource(detailWait.promise);
  const signal = new AsyncResource(signalWait.promise);
  const open = createAsyncStore(false, (_old: boolean, next: boolean) => next);
  const world = new OwnerStateWorld();
  const rightHost = new MemoryVDOMHost();
  const leftContainer = leftHost.createContainer();
  const rightContainer = rightHost.createContainer();
  const scheduled: Array<() => void> = [];
  const options = (side: string) => ({ world, rootId: `${id}-${side}`,
    scheduleCommit(commit: () => void) { scheduled.push(commit); } });
  const left = new ComponentStateRoot(leftHost, leftContainer, options("left"));
  const right = new ComponentStateRoot(rightHost, rightContainer, options("right"));
  const queue = new NativeRootWorkQueue();
  let activeGroup: ReturnType<NativeRootWorkQueue["enqueueTransaction"]> | null = null;
  const trace = { effects: 0, cleanups: 0, attaches: 0, detaches: 0, callbacks: 0,
    observations: [] as Array<[string, string]> };
  let setLocal: ((value: number) => boolean) | null = null;
  const onRef = (node: MemoryNode | null) => {
    if (node) trace.attaches++;
    else trace.detaches++;
  };
  const Island = defineComponent(`${id}:Island`, () => {
    const [local, setter] = useStateAt("local", 0);
    setLocal = setter;
    useEffectAt("lifetime", () => {
      trace.effects++;
      return () => { trace.cleanups++; };
    });
    return jsx("button", { key: "island-button" }, `local:${local}`);
  });
  const DialogSlot = defineComponent(`${id}:DialogSlot`, () => {
    const visible = useStoreAt("open", open);
    return jsx("div", { key: "dialog-host", "data-dialog-slot": "true",
      "data-open": visible, ref: onRef },
      visible ? jsx(Island, { key: "island-owner" }) : null);
  });
  const closedResource = (name: "detail" | "signal") => {
    const programId = `${sourceFile}#component:${name}`;
    const siteId = `${programId}#resource:0`;
    return defineComponent(programId, (props: { resource: AsyncResource<string> }) =>
      jsx("div", { key: `${name}-host`, [`data-${name}`]: "ready" },
        useAt(siteId, props.resource) as string), {
      propOnlySites: [],
      closedResourceHostProgram: { schemaVersion: 1, componentProgramId: programId,
        moduleRevision: revision, resourceUseSiteId: siteId, resourceProp: "resource",
        host: { tag: "div", key: `${name}-host`, props: [[`data-${name}`, "ready"]],
          child: "resource-value" } },
    });
  };
  const Detail = closedResource("detail");
  const Signal = closedResource("signal");
  const Shell = defineComponent(`${shellSourceFile}#component:Shell`,
    (props: { showDialog: boolean; resource: AsyncResource<string> }) => jsx("main", {}, [
      jsx(Suspense, { key: "detail-boundary", __nativeBoundarySite: "detail-boundary",
        fallback: jsx("div", { key: "detail-host", "data-detail": "waiting" }, "detail-waiting"),
        children: jsx(Detail, { key: "detail-owner", resource: props.resource }) }),
      props.showDialog ? jsx(DialogSlot, { key: "dialog-owner" }) : null,
    ]));
  const leftTree = (showDialog = true, resource = detail) =>
    jsx(Shell, { key: "shell-owner", showDialog, resource });
  const rightTree = () => jsx("section", {}, jsx(Suspense, {
    key: "signal-boundary", __nativeBoundarySite: "signal-boundary",
    fallback: jsx("div", { key: "signal-host", "data-signal": "waiting" }, "signal-waiting"),
    children: jsx(Signal, { key: "signal-owner", resource: signal }),
  }));
  left.mount(leftTree());
  right.mount(rightTree());
  const detailNode = () => leftContainer.children[0].children[0];
  const signalNode = () => rightContainer.children[0].children[0];
  const dialogNode = () => leftContainer.children[0].children.find((node) =>
    node.props["data-dialog-slot"] === "true") ?? null;
  const drain = (limit = 20) => {
    for (let turn = 0; turn < limit && scheduled.length; turn++) scheduled.shift()!();
    assertEquals(scheduled.length, 0, "generic work did not quiesce");
  };
  const group = () => {
    const work = queue.enqueueTransaction({ id: `${id}-detail-signal`, roots: [
      { root: left, resources: [detail] }, { root: right, resources: [signal] },
    ], onSettled(outcome) {
      if (outcome.status === "cancelled") return;
      if (outcome.status !== "committed") {
        throw outcome.error instanceof Error ? outcome.error :
          new Error(`Resource group ${outcome.status}: ${String(outcome.reason ?? outcome.error)}`);
      }
      trace.callbacks++;
      trace.observations.push([text(detailNode()), text(signalNode())]);
    } });
    assertEquals(work.status, "pending", "closed resource group was not admitted");
    activeGroup = work;
    return work;
  };
  return {
    left, right, queue, open, detail, signal, trace, leftTree, sourceFile,
    detailNode, signalNode, dialogNode, drain, group,
    localSetter: () => setLocal,
    resolveDetailNow(value = "detail-ready") { detailWait.resolve(value); },
    resolveSignalNow(value = "signal-ready") { signalWait.resolve(value); },
    async settleDetail(value = "detail-ready") {
      detailWait.resolve(value);
      await Promise.resolve();
      drain();
    },
    async settleSignal(value = "signal-ready") {
      signalWait.resolve(value);
      for (let turn = 0; turn < 12 && activeGroup?.status === "pending"; turn++) {
        await Promise.resolve();
        drain();
      }
      assertEquals(activeGroup?.status, "committed", "resource group did not settle");
    },
    dispose() {
      queue.dispose();
      left.dispose();
      right.dispose();
      invalidateCompiledSemanticPlan(sourceFile);
      invalidateCompiledSemanticPlan(shellSourceFile);
    },
  };
}

Deno.test("held DOM and second root permit generic Store and owner progress before joint reveal", async () => {
  const f = fixture("held-generic-progress");
  try {
    const oldDetail = f.detailNode(), oldSignal = f.signalNode();
    const leftVersion = f.left.publicationVersion, rightVersion = f.right.publicationVersion;
    const work = f.group();
    f.open.dispatch(true);
    f.drain();
    assertEquals(work.status, "pending");
    assert(f.left.publicationVersion > leftVersion);
    assertEquals(f.right.publicationVersion, rightVersion);
    assertEquals(f.open.getStateForRoot(f.left.rootId), true);
    assertStrictEquals(f.detailNode(), oldDetail);
    assertStrictEquals(f.signalNode(), oldSignal);
    assertEquals(f.dialogNode()?.props["data-open"], true);
    assertEquals(text(f.dialogNode()!), "local:0");
    assertEquals(f.trace.effects - f.trace.cleanups, 1);
    assertEquals(f.trace.callbacks, 0);
    await f.settleDetail();
    assertEquals(work.status, "pending");
    assertEquals(f.right.publicationVersion, rightVersion);
    assertStrictEquals(f.detailNode(), oldDetail);
    assertStrictEquals(f.signalNode(), oldSignal);
    assertEquals(f.trace.callbacks, 0);
    await f.settleSignal();
    assertEquals(work.status, "committed");
    assertEquals(f.trace.observations, [["detail-ready", "signal-ready"]]);
    assertEquals(text(f.dialogNode()!), "local:0");
  } finally {
    f.dispose();
    assertEquals(f.trace.effects, f.trace.cleanups);
    assertEquals(f.trace.attaches, f.trace.detaches);
    assertEquals(f.left.diagnostics().ownerCount, 0);
    assertEquals(f.right.diagnostics().ownerCount, 0);
  }
});

Deno.test("resource resolution from a generic host write preserves the independent Store commit", async () => {
  class ResolvingHost extends MemoryVDOMHost {
    action: (() => void) | null = null;
    override setProp(node: MemoryNode, name: string, value: unknown, previous?: unknown) {
      super.setProp(node, name, value, previous);
      if (name === "data-open" && value === true) {
        const action = this.action;
        this.action = null;
        action?.();
      }
    }
  }
  const host = new ResolvingHost();
  const f = fixture("held-host-resolution", host);
  try {
    const oldDetail = f.detailNode(), oldSignal = f.signalNode();
    const leftVersion = f.left.publicationVersion, rightVersion = f.right.publicationVersion;
    const work = f.group();
    let resolvedInHost = false;
    host.action = () => { resolvedInHost = true; f.resolveDetailNow(); };
    f.open.dispatch(true);
    f.drain();
    assert(resolvedInHost);
    assert(f.left.publicationVersion > leftVersion);
    assertEquals(f.right.publicationVersion, rightVersion);
    assertEquals(f.dialogNode()?.props["data-open"], true);
    assertEquals(f.trace.effects - f.trace.cleanups, 1);
    const retiredSetter = f.localSetter();
    assert(retiredSetter);
    assertStrictEquals(f.detailNode(), oldDetail);
    assertStrictEquals(f.signalNode(), oldSignal);
    assertEquals(work.status, "pending");
    await Promise.resolve();
    f.drain();
    assertEquals(f.detail.status.status, "fulfilled");
    assertEquals(work.status, "pending");
    assertStrictEquals(f.detailNode(), oldDetail);
    assertStrictEquals(f.signalNode(), oldSignal);
    assertEquals(f.right.publicationVersion, rightVersion);
    const beforeClose = f.left.publicationVersion;
    f.open.dispatch(false);
    f.drain();
    assert(f.left.publicationVersion > beforeClose);
    assertEquals(f.open.getStateForRoot(f.left.rootId), false);
    assertEquals(f.trace.effects, f.trace.cleanups);
    assertThrows(() => retiredSetter(1), Error, "not alive");
    assertEquals(work.status, "pending");
    assertStrictEquals(f.detailNode(), oldDetail);
    assertStrictEquals(f.signalNode(), oldSignal);
    assertEquals(f.right.publicationVersion, rightVersion);
    await f.settleSignal();
    assertEquals(work.status, "committed");
    assertEquals(f.trace.observations, [["detail-ready", "signal-ready"]]);
    f.open.dispatch(true);
    f.drain();
    assertEquals(f.open.getStateForRoot(f.left.rootId), true);
  } finally { f.dispose(); }
});

Deno.test("HMR retires a pending child source hidden inside a generic shell result", async () => {
  const f = fixture("held-nested-hmr");
  try {
    const oldDetail = f.detailNode(), oldSignal = f.signalNode();
    const work = f.group();
    f.open.dispatch(true);
    f.drain();
    const accepted = JSON.stringify(f.left.snapshot);
    const versions = [f.left.publicationVersion, f.right.publicationVersion];
    assertEquals(work.status, "pending");
    assertEquals(f.trace.effects - f.trace.cleanups, 1);
    assert(f.open.diagnostics().readers > 0);
    assertEquals(invalidateCompiledSemanticPlan(f.sourceFile, "held-boundary-v1"), true);
    assertEquals(f.left.retired, true);
    assertEquals(work.status, "cancelled");
    assertEquals(f.trace.callbacks, 0);
    assertEquals(f.trace.effects, f.trace.cleanups);
    assertEquals(f.open.diagnostics().roots, 0);
    assertEquals(f.open.diagnostics().readers, 0);
    assertEquals(f.open.diagnostics().listeners, 0);
    assertEquals(JSON.stringify(f.left.snapshot), accepted);
    assertStrictEquals(f.detailNode(), oldDetail);
    assertStrictEquals(f.signalNode(), oldSignal);
    assertThrows(() => f.left.flush(), Error, "Compiled module changed");
    f.resolveDetailNow();
    f.resolveSignalNow();
    for (let turn = 0; turn < 4; turn++) {
      await Promise.resolve();
      f.drain();
    }
    assertEquals(f.detail.status.status, "fulfilled");
    assertEquals(f.signal.status.status, "fulfilled");
    assertEquals(work.status, "cancelled");
    assertEquals(f.trace.callbacks, 0);
    assertEquals([f.left.publicationVersion, f.right.publicationVersion], versions);
    assertEquals(JSON.stringify(f.left.snapshot), accepted);
    assertStrictEquals(f.detailNode(), oldDetail);
    assertStrictEquals(f.signalNode(), oldSignal);
  } finally {
    f.dispose();
    assertEquals(f.left.diagnostics().ownerCount, 0);
    assertEquals(f.right.diagnostics().ownerCount, 0);
  }
});

Deno.test("direct generic remove and reinsert retire only island lifetime while resource group waits", async () => {
  const f = fixture("held-generic-reinsert");
  try {
    const oldDetail = f.detailNode(), oldSignal = f.signalNode();
    const work = f.group();
    f.open.dispatch(true);
    f.drain();
    const oldSetter = f.localSetter();
    assert(oldSetter);
    assert(oldSetter(7));
    f.drain();
    assertEquals(text(f.dialogNode()!), "local:7");
    f.left.update(f.leftTree(false));
    f.drain();
    assertEquals(work.status, "pending");
    assertStrictEquals(f.detailNode(), oldDetail);
    assertStrictEquals(f.signalNode(), oldSignal);
    assertEquals(f.dialogNode(), null);
    assertEquals(f.trace.effects, f.trace.cleanups);
    assertThrows(() => oldSetter(8), Error, "not alive");
    f.left.update(f.leftTree(true));
    f.drain();
    assertEquals(f.dialogNode()?.props["data-open"], true);
    assertEquals(text(f.dialogNode()!), "local:0");
    assertEquals(f.trace.effects - f.trace.cleanups, 1);
    assertEquals(f.trace.callbacks, 0);
    await f.settleDetail();
    assertEquals(work.status, "pending");
    await f.settleSignal();
    assertEquals(work.status, "committed");
    assertEquals(f.trace.observations, [["detail-ready", "signal-ready"]]);
  } finally {
    f.dispose();
    assertEquals(f.trace.effects, f.trace.cleanups);
    assertEquals(f.trace.attaches, f.trace.detaches);
  }
});

Deno.test("changing a held resource boundary parks direct intent and never leaves old reveal as final tree", async () => {
  const f = fixture("held-boundary-overlap");
  const replacementWait = deferred<string>();
  const replacement = new AsyncResource(replacementWait.promise);
  try {
    const oldDetail = f.detailNode(), version = f.left.publicationVersion;
    const work = f.group();
    f.left.update(f.leftTree(true, replacement));
    f.drain();
    assertEquals(work.status, "pending");
    assertStrictEquals(f.detailNode(), oldDetail);
    assertEquals(f.left.publicationVersion, version);
    await f.settleDetail();
    assertEquals(work.status, "pending");
    await f.settleSignal();
    assertEquals(work.status, "committed");
    f.drain();
    assertEquals(text(f.detailNode()), "detail-ready");
    assertEquals(f.detailNode().props["data-detail"], "ready");
    replacementWait.resolve("replacement-ready");
    await Promise.resolve();
    f.drain();
    assertEquals(text(f.detailNode()), "replacement-ready");
    assertEquals(f.right.diagnostics().pendingChangeCount, 0);
  } finally { f.dispose(); }
});

Deno.test("generic host failure retains accepted fallback; newer reentrant Store action survives reveal", async () => {
  const fault = new Error("dialog-host-fault");
  class FailingHost extends MemoryVDOMHost {
    armed = false;
    override setProp(node: MemoryNode, name: string, value: unknown, previous?: unknown) {
      super.setProp(node, name, value, previous);
      if (this.armed && name === "data-open" && value === true) throw fault;
    }
  }
  const failingHost = new FailingHost();
  const failed = fixture("held-generic-failure", failingHost);
  try {
    const work = failed.group();
    const accepted = JSON.stringify(failed.left.snapshot);
    const version = failed.left.publicationVersion;
    failingHost.armed = true;
    failed.open.dispatch(true);
    const thrown = assertThrows(() => failed.drain());
    assert(thrown === fault || (thrown instanceof AggregateError && thrown.errors[0] === fault));
    assertEquals(JSON.stringify(failed.left.snapshot), accepted);
    assertEquals(failed.left.publicationVersion, version);
    assertEquals(work.status, "pending");
    assertEquals(failed.trace.effects, failed.trace.cleanups);
  } finally { failed.dispose(); }

  class ReentrantHost extends MemoryVDOMHost {
    action: (() => void) | null = null;
    override setText(node: MemoryNode, value: string) {
      super.setText(node, value);
      if (value === "detail-ready") {
        const action = this.action;
        this.action = null;
        action?.();
      }
    }
  }
  const reentrantHost = new ReentrantHost();
  const f = fixture("held-generic-reentry", reentrantHost);
  try {
    const work = f.group();
    f.open.dispatch(true);
    f.drain();
    reentrantHost.action = () => { f.open.dispatch(false); };
    await f.settleDetail();
    assertEquals(work.status, "pending");
    assertEquals(f.dialogNode()?.props["data-open"], true);
    await f.settleSignal();
    assertEquals(work.status, "committed");
    f.drain();
    assertEquals(f.dialogNode()?.props["data-open"], undefined);
    assertEquals(text(f.dialogNode()!), "");
    assertEquals(f.open.getStateForRoot(f.left.rootId), false);
    assertEquals(f.left.diagnostics().pendingChangeCount, 0);
    assertEquals(f.trace.effects, f.trace.cleanups);
  } finally { f.dispose(); }
});
