import { assert, assertEquals, assertStrictEquals } from "jsr:@std/assert";
import { AsyncResource } from "./async_resource_runtime.ts";
import { createAsyncStore } from "./async_store_runtime.ts";
import { ComponentStateRoot, Suspense, defineComponent, useAt, useStoreAt } from "./component_state_runtime.ts";
import { invalidateCompiledSemanticPlan, registerCompiledSemanticPlan } from "./compiled_semantic_plan.ts";
import { jsx } from "./jsx_binding_runtime.ts";
import { MemoryVDOMHost } from "./vdom_snapshot_runtime.ts";

const revision = "store-subtree-source-v1";

Deno.test("closed Store subtree updates nested style and text beside pending health", () => {
  const sourceFile = "store-subtree/source.tsx";
  registerCompiledSemanticPlan({
    schema_version: 1, source_file: sourceFile, module_revision: revision,
    owners: [], sources: [], sinks: [], operations: [],
    graph: { coverage: "proven-sinks-only", source_to_sinks: {}, execution_order: [] },
  });
  const position = createAsyncStore(1, (_old: number, next: number) => next);
  const camera = createAsyncStore(2, (_old: number, next: number) => next);
  const status = createAsyncStore(1, (_old: number, next: number) => next);
  const health = new AsyncResource(new Promise<string>(() => {}));
  const id = `${sourceFile}#component:Scene`;
  let renders = 0;
  const Scene = defineComponent(id, (props: { position: typeof position; camera: typeof camera }) => {
    renders++;
    const x = useStoreAt(`${id}#store:0`, props.position);
    const y = useStoreAt(`${id}#store:1`, props.camera);
    return jsx("div", { key: "scene" }, [
      jsx("output", { key: "label", style: { opacity: (x + y) / 10 } }, x + y),
      jsx("group", { key: "group" }, [
        jsx("mesh", { key: "mesh", position: Object.freeze([x, 0, 0]) }),
        jsx("mesh", { key: "outline", position: Object.freeze([x, y, 0]) }),
      ]),
    ]);
  }, { propOnlySites: [], closedStoreHostProgram: {
    schemaVersion: 4, componentProgramId: id, moduleRevision: revision,
    inputs: [
      { storeUseSiteId: `${id}#store:0`, storeProp: "position" },
      { storeUseSiteId: `${id}#store:1`, storeProp: "camera" },
    ],
    host: { tag: "div", key: "scene", props: [], children: [
      { kind: "host", host: { tag: "output", key: "label", props: [["style", {
        kind: "style", entries: [["opacity", { kind: "binary", operator: "/",
          left: { kind: "binary", operator: "+", left: { kind: "input", index: 0 },
            right: { kind: "input", index: 1 } }, right: { kind: "literal", value: 10 } }]],
      }]], children: [{ kind: "text", expression: { kind: "binary", operator: "+",
        left: { kind: "input", index: 0 }, right: { kind: "input", index: 1 } } }] } },
      { kind: "host", host: { tag: "group", key: "group", props: [], children: [
        { kind: "host", host: { tag: "mesh", key: "mesh", props: [["position", {
          kind: "tuple", items: [{ kind: "input", index: 0 },
            { kind: "literal", value: 0 }, { kind: "literal", value: 0 }],
        }]], children: [] } },
        { kind: "host", host: { tag: "mesh", key: "outline", props: [["position", {
          kind: "tuple", items: [{ kind: "input", index: 0 },
            { kind: "input", index: 1 }, { kind: "literal", value: 0 }],
        }]], children: [] } },
      ] } },
    ] },
  } });
  const Pending = defineComponent(`${sourceFile}#component:Pending`, () =>
    jsx("span", { key: "pending" }, useAt(`${sourceFile}#resource:0`, health)));
  const statusId = `${sourceFile}#component:Status`;
  const Status = defineComponent(statusId, (props: { store: typeof status }) =>
    jsx("output", { key: "status-host", "data-status":
      useStoreAt(`${statusId}#store:0`, props.store) }), {
    propOnlySites: [], closedStoreHostProgram: {
      schemaVersion: 1, componentProgramId: statusId, moduleRevision: revision,
      storeUseSiteId: `${statusId}#store:0`, storeProp: "store",
      host: { tag: "output", key: "status-host", child: null,
        props: [["data-status", { kind: "input", index: 0 }]] },
    },
  });
  class ReentrantHost extends MemoryVDOMHost {
    onText: (() => void) | null = null;
    override setText(node: ReturnType<MemoryVDOMHost["createContainer"]>, text: string) {
      super.setText(node, text);
      if (text === "9") this.onText?.();
    }
  }
  const host = new ReentrantHost();
  const container = host.createContainer();
  const root = new ComponentStateRoot(host, container, { rootId: "store-subtree", scheduleCommit() {} });
  root.mount(jsx("section", {}, [
    jsx(Scene, { key: "scene-owner", position, camera }),
    jsx(Status, { key: "status-owner", store: status }),
    jsx(Suspense, { key: "pending-boundary", __nativeBoundarySite: `${sourceFile}#boundary:0`,
      fallback: jsx("span", { key: "waiting" }, "waiting"),
      children: jsx(Pending, { key: "pending-owner" }) }),
  ]));
  try {
    const scene = container.children[0].children[0];
    const label = scene.children[0];
    const labelText = label.children[0];
    const group = scene.children[1];
    const mesh = group.children[0];
    const outline = group.children[1];
    const statusHost = container.children[0].children[1];
    const before = renders;
    position.dispatch(4);
    const stale = root.prepareStores([position]);
    assert(stale, "joint subtree did not prepare");
    camera.dispatch(5);
    assertEquals(stale.validate(), false, "joint input changed without invalidating subtree");
    stale.discard();
    const candidate = root.prepareStores([position]);
    assert(candidate, "closed subtree declined");
    status.dispatch(2);
    const other = root.prepareStores([status]);
    assert(other, "unrelated sibling cut declined");
    other.commitHost();
    assert(other.validatePostHost());
    other.preparePublication(); other.publish(); other.runEffects();
    assertEquals(statusHost.props["data-status"], 2);
    assert(candidate.validate(), "unrelated accepted sibling invalidated fixed subtree");
    host.onText = () => { host.onText = null; position.dispatch(7); };
    candidate.commitHost();
    assert(candidate.validatePostHost());
    candidate.preparePublication(); candidate.publish(); candidate.runEffects();
    assertStrictEquals(container.children[0].children[0], scene);
    assertStrictEquals(scene.children[0], label);
    assertStrictEquals(label.children[0], labelText);
    assertStrictEquals(scene.children[1], group);
    assertStrictEquals(group.children[0], mesh);
    assertStrictEquals(group.children[1], outline);
    assertEquals(labelText.text, "9");
    assertEquals(label.props.style, { opacity: 0.9 });
    assertEquals(mesh.props.position, [4, 0, 0]);
    assertEquals(outline.props.position, [4, 5, 0]);
    assertEquals(renders, before);
    assertStrictEquals(container.children[0].children[1], statusHost);
    assertEquals(statusHost.props["data-status"], 2);
    assertEquals(container.children[0].children[2].children[0].text, "waiting");
    assertEquals(position.getState(), 7, "newer host-time action was lost");
    assertEquals(root.flush(), true);
    assertEquals(labelText.text, "12");
    assertEquals(outline.props.position, [7, 5, 0]);
    assertEquals(renders, before);
    position.dispatch(8);
    const revoked = root.prepareStores([position]);
    assert(revoked, "code-revision setup declined");
    invalidateCompiledSemanticPlan(sourceFile, revision);
    assertEquals(revoked.validate(), false, "changed module kept a prepared subtree");
    revoked.discard();
  } finally { root.dispose(); }
  assertEquals(position.diagnostics().roots, 0);
  assertEquals(camera.diagnostics().roots, 0);
  assertEquals(status.diagnostics().roots, 0);
});

Deno.test("closed Store subtree declines an authored child-index getter without invoking it", () => {
  const sourceFile = "store-subtree/accessor.tsx";
  registerCompiledSemanticPlan({
    schema_version: 1, source_file: sourceFile, module_revision: revision,
    owners: [], sources: [], sinks: [], operations: [],
    graph: { coverage: "proven-sinks-only", source_to_sinks: {}, execution_order: [] },
  });
  const store = createAsyncStore(1, (_old: number, next: number) => next);
  const id = `${sourceFile}#component:Host`;
  let authoredChildren: (string | number)[] = [];
  const Host = defineComponent(id, (props: { store: typeof store }) => {
    const value = useStoreAt(`${id}#store:0`, props.store);
    authoredChildren = [value, value + 1];
    return { type: "div", props: { key: "host", children: authoredChildren } };
  }, { propOnlySites: [], closedStoreHostProgram: {
    schemaVersion: 4, componentProgramId: id, moduleRevision: revision,
    inputs: [{ storeUseSiteId: `${id}#store:0`, storeProp: "store" }],
    host: { tag: "div", key: "host", props: [], children: [
      { kind: "text", expression: { kind: "input", index: 0 } },
      { kind: "text", expression: { kind: "binary", operator: "+",
        left: { kind: "input", index: 0 }, right: { kind: "literal", value: 1 } } },
    ] },
  } });
  const host = new MemoryVDOMHost();
  const container = host.createContainer();
  const root = new ComponentStateRoot(host, container, { rootId: "subtree-accessor", scheduleCommit() {} });
  root.mount(jsx(Host, { key: "owner", store }));
  let calls = 0;
  Object.defineProperty(authoredChildren, "0", { configurable: true, enumerable: true,
    get() { calls++; return 1; } });
  try {
    store.dispatch(2);
    assertEquals(root.prepareStores([store]), null);
    assertEquals(calls, 0, "closed preparation invoked authored array getter");
    Object.defineProperty(authoredChildren, "0", { configurable: true,
      enumerable: true, writable: true, value: 1 });
    const removed = root.prepareStores([store]);
    assert(removed, "removed-owner setup declined");
    root.update(jsx("span", { key: "replacement" }, "gone"));
    assertEquals(removed.validate(), false, "removed owner kept a prepared subtree");
    removed.discard();
  } finally { root.dispose(); }
});
