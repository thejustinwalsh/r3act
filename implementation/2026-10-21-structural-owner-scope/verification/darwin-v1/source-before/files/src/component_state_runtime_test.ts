import {
  ComponentStateRoot,
  defineComponent,
  useEffectAt,
  useStateAt,
} from "./component_state_runtime.ts";
import { componentStateSitesPlan } from "./browser/generated_component_state_sites.ts";
import {
  ConditionalPanel,
  Counter as CompiledCounter,
  EffectProbe,
  KeyedRow,
} from "./browser/generated_component_state_transform.tsx";
import {
  createKeyedOwnerVersion,
  Fragment,
  jsx,
  keyedOwnerChildren,
} from "./jsx_binding_runtime.ts";
import { type MemoryNode, MemoryVDOMHost } from "./vdom_snapshot_runtime.ts";
import { OwnerStateWorld } from "./owner_state_world.ts";

const assertEquals = (
  actual: unknown,
  expected: unknown,
  message = "Values differ",
) => {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(
      `${message}: expected ${JSON.stringify(expected)}, received ${
        JSON.stringify(actual)
      }`,
    );
  }
};
const assertSame = (actual: unknown, expected: unknown, message: string) => {
  if (actual !== expected) throw new Error(message);
};
const assertNotSame = (actual: unknown, expected: unknown, message: string) => {
  if (actual === expected) throw new Error(message);
};
const textContent = (node: MemoryNode): string =>
  (node.text ?? "") + node.children.map(textContent).join("");

Deno.test("component keys are scoped by intrinsic parents and survive keyed host moves", () => {
  const setters = new Map<string, (value: number) => boolean>();
  const lifecycle: string[] = [];
  const Child = defineComponent<{ label: string }>("fixture.host-scope.child", ({ label }) => {
    const [count, setCount] = useStateAt("fixture.host-scope.count", 0);
    setters.set(label, setCount);
    useEffectAt("fixture.host-scope.effect", () => {
      lifecycle.push(`mount:${label}`);
      return () => lifecycle.push(`cleanup:${label}`);
    });
    return jsx("span", { key: "same-leaf", "data-label": label }, `${label}:${count}`);
  });
  const App = defineComponent<{ order: string[]; replacement?: string; tag?: string }>(
    "fixture.host-scope.app",
    ({ order, replacement, tag }) => jsx("section", {}, order.map((label) =>
      jsx(label === "right" ? (tag ?? "div") : "div", {
        key: label === "right" ? (replacement ?? label) : label,
      }, jsx(Child, { key: "same", label }))
    )),
  );
  const host = new MemoryVDOMHost();
  const container = host.createContainer();
  const paths: string[] = [];
  const root = new ComponentStateRoot(host, container, {
    renderPreparation: "repeatable",
    profile: phase => paths.push(phase),
  });
  const tree = (order: string[], replacement?: string, tag?: string) =>
    jsx(App, { order, replacement, tag });
  root.mount(tree(["left", "right"]));
  assertEquals(lifecycle, ["mount:left", "mount:right"]);
  const section = container.children[0];
  const left = section.children[0];
  const right = section.children[1];
  setters.get("left")!(1);
  root.flush();
  assertEquals(paths.includes("dispatch.path.partial-owner"), true,
    "state update did not exercise partial-owner publication");
  setters.get("right")!(2);
  root.flush();
  assertEquals(section.children.map(textContent), ["left:1", "right:2"]);
  root.update(tree(["right", "left"]));
  assertSame(section.children[0], right, "keyed right host moved with its child");
  assertSame(section.children[1], left, "keyed left host moved with its child");
  assertEquals(section.children.map(textContent), ["right:2", "left:1"]);
  root.update(tree(["right", "left"], "right-new"));
  assertEquals(section.children.map(textContent), ["right:0", "left:1"]);
  assertEquals(lifecycle.slice(-2), ["cleanup:right", "mount:right"]);
  root.update(tree(["right", "left"], "right-new", "article"));
  assertEquals(section.children.map(textContent), ["right:0", "left:1"]);
  assertEquals(lifecycle.slice(-2), ["cleanup:right", "mount:right"]);
  root.dispose();
});

Deno.test("nested arrays and Fragments separate component owners without changing direct root slots", () => {
  const world = new OwnerStateWorld();
  const setters = new Map<string, (value: number) => boolean>();
  const Child = defineComponent<{ label: string }>("fixture.container-scope.child", ({ label }) => {
    const [count, setCount] = useStateAt("fixture.container-scope.count", 0);
    setters.set(label, setCount);
    return jsx("span", { "data-label": label }, `${label}:${count}`);
  });
  const host = new MemoryVDOMHost();
  const container = host.createContainer();
  const root = new ComponentStateRoot(host, container, { world, rootId: "container-scope" });
  root.mount(jsx(Child, { key: "direct", label: "direct" }));
  const rootOwner = world.findOwner(null, "@component-root:container-scope");
  if (rootOwner === undefined) throw new Error("missing root owner");
  assertSame(world.findOwner(rootOwner, "fixture.container-scope.child", "direct") !== undefined,
    true, "direct root component changed World slot");
  root.update(jsx("section", {}, [
    [jsx(Child, { key: "same", label: "array-a" })],
    [jsx(Child, { key: "same", label: "array-b" })],
    jsx(Fragment, {}, jsx(Child, { key: "same", label: "fragment-a" })),
    jsx(Fragment, {}, jsx(Child, { key: "same", label: "fragment-b" })),
  ]));
  assertEquals(container.children[0].children.map(textContent),
    ["array-a:0", "array-b:0", "fragment-a:0", "fragment-b:0"]);
  setters.get("array-a")!(1);
  setters.get("fragment-b")!(2);
  root.flush();
  assertEquals(container.children[0].children.map(textContent),
    ["array-a:1", "array-b:0", "fragment-a:0", "fragment-b:2"]);
  root.dispose();
});

Deno.test("keyed Fragments move owners while unkeyed host positions remount", () => {
  const setters = new Map<string, (value: number) => boolean>();
  const Child = defineComponent<{ label: string }>("fixture.fragment-scope.child", ({ label }) => {
    const [count, setCount] = useStateAt("fixture.fragment-scope.count", 0);
    setters.set(label, setCount);
    return jsx("span", { "data-label": label }, `${label}:${count}`);
  });
  const host = new MemoryVDOMHost();
  const container = host.createContainer();
  const root = new ComponentStateRoot(host, container);
  const fragments = (labels: string[]) => jsx("section", {}, labels.map(label =>
    jsx(Fragment, { key: label }, jsx(Child, { key: "same", label }))));
  root.mount(fragments(["a", "b"]));
  setters.get("b")!(5);
  root.flush();
  root.update(fragments(["b", "a"]));
  assertEquals(container.children[0].children.map(textContent), ["b:5", "a:0"]);
  const hosts = (labels: string[]) => jsx("section", {}, labels.map(label =>
    jsx("div", {}, jsx(Child, { key: "same", label }))));
  root.update(hosts(["a", "b"]));
  setters.get("b")!(7);
  root.flush();
  assertEquals(container.children[0].children.map(textContent), ["a:0", "b:7"]);
  root.update(hosts(["b"]));
  assertEquals(container.children[0].children.map(textContent), ["b:0"],
    "unkeyed host movement retained a positional owner");
  root.dispose();
});

Deno.test("authored component sites reserve NUL while host keys safely contain separators", () => {
  let rejected = false;
  try {
    defineComponent("fixture.separator.child\u0000structural:[\"x\"]", () => null);
  } catch (error) {
    rejected = error instanceof Error && error.message.includes("cannot contain NUL");
  }
  assertEquals(rejected, true, "NUL site ID entered the runtime identity namespace");
  const setters = new Map<string, (value: number) => boolean>();
  const Child = defineComponent<{ label: string }>(
    "fixture.separator.child", ({ label }) => {
      const [count, setCount] = useStateAt("fixture.separator.count", 0);
      setters.set(label, setCount);
      return jsx("span", {}, `${label}:${count}`);
    },
  );
  const host = new MemoryVDOMHost();
  const container = host.createContainer();
  const root = new ComponentStateRoot(host, container);
  root.mount(jsx("main", {}, [
    jsx("div", { key: "left\u0000structural:[\"x\"]" },
      jsx(Child, { key: "same", label: "left" })),
    jsx("div", { key: "right:[\"x\"]" },
      jsx(Child, { key: "same", label: "right" })),
  ]));
  setters.get("left")!(3);
  root.flush();
  assertEquals(container.children[0].children.map(textContent), ["left:3", "right:0"]);
  root.dispose();
});

Deno.test("deep host scopes stay bounded and retain the innermost owner", () => {
  let setCount: ((value: number) => boolean) | undefined;
  const Child = defineComponent("fixture.deep-host-scope.child", () => {
    const [count, set] = useStateAt("fixture.deep-host-scope.count", 0);
    setCount = set;
    return jsx("span", {}, String(count));
  });
  const tree = () => {
    let node = jsx(Child, { key: "same" });
    for (let depth = 0; depth < 64; depth++) {
      node = jsx("div", { key: `\\\\:${depth}\u0000[\"scope\"]` }, node);
    }
    return node;
  };
  const host = new MemoryVDOMHost();
  const container = host.createContainer();
  const root = new ComponentStateRoot(host, container,
    { renderPreparation: "repeatable" });
  root.mount(tree());
  assertEquals(textContent(container.children[0]), "0");
  setCount!(4);
  root.flush();
  assertEquals(textContent(container.children[0]), "4");
  root.update(tree());
  assertEquals(textContent(container.children[0]), "4");
  root.dispose();
});

Deno.test("OXC-lowered state sites execute through VDOM and survive conditional activation", async () => {
  const panelPlan = componentStateSitesPlan.components.find((component) =>
    component.name === "ConditionalPanel"
  );
  if (!panelPlan || panelPlan.state_sites.length !== 2) {
    throw new Error("Missing OXC ConditionalPanel site plan");
  }
  const host = new MemoryVDOMHost();
  const container = host.createContainer();
  const root = new ComponentStateRoot(host, container);
  const tree = (show: boolean) => jsx(ConditionalPanel, { show });

  root.mount(tree(false));
  assertEquals(textContent(container.children[0]), "hidden:tail");
  root.update(tree(true));
  assertEquals(textContent(container.children[0]), "0:tail+");
  const incrementButton = container.children[0].children.find((node) =>
    node.props["data-action"] === "increment"
  );
  if (!incrementButton) {
    throw new Error(
      "Compiled ConditionalPanel did not emit its increment button",
    );
  }
  const increment = incrementButton.props.onClick as () => void;
  for (let click = 0; click < 7; click++) increment();
  await new Promise<void>((resolve) => queueMicrotask(resolve));
  assertEquals(textContent(container.children[0]), "7:tail+");
  root.update(tree(false));
  assertEquals(textContent(container.children[0]), "hidden:tail");
  root.update(tree(true));
  assertEquals(
    textContent(container.children[0]),
    "7:tail+",
    "Skipped state site lost its owner/site value",
  );
  root.dispose();
});

Deno.test("OXC-lowered keyed components preserve state and host nodes through reorder and removal", async () => {
  const rowPlan = componentStateSitesPlan.components.find((component) =>
    component.name === "KeyedRow"
  );
  if (!rowPlan || rowPlan.state_sites.length !== 1) {
    throw new Error("Missing OXC KeyedRow site plan");
  }
  const host = new MemoryVDOMHost();
  const container = host.createContainer();
  const root = new ComponentStateRoot(host, container);
  const tree = (ids: string[]) =>
    jsx("ul", {}, ids.map((id) => jsx(KeyedRow, { key: id, id })));

  root.mount(tree(["a", "b", "c"]));
  const list = container.children[0];
  const initialNodes = new Map(
    list.children.map((node) => [String(node.props["data-id"]), node]),
  );
  (list.children[1].props.onClick as () => void)();
  await new Promise<void>((resolve) => queueMicrotask(resolve));
  root.update(tree(["c", "a", "b"]));
  assertEquals(list.children.map((node) => node.props["data-id"]), [
    "c",
    "a",
    "b",
  ]);
  assertSame(
    list.children[0],
    initialNodes.get("c"),
    "Keyed component c lost host identity",
  );
  assertSame(
    list.children[1],
    initialNodes.get("a"),
    "Keyed component a lost host identity",
  );
  assertSame(
    list.children[2],
    initialNodes.get("b"),
    "Keyed component b lost host identity",
  );
  assertEquals(
    list.children[2].props["data-selected"],
    "true",
    "Keyed state did not follow row b",
  );

  const removedB: MemoryNode = list.children[2];
  root.update(tree(["c", "a"]));
  assertEquals(removedB.parent, null);
  root.update(tree(["b", "c", "a"]));
  assertNotSame(
    list.children[0],
    removedB,
    "Reinserted component reused its removed host node",
  );
  assertEquals(
    list.children[0].props["data-selected"],
    "false",
    "Reinserted owner reused destroyed state",
  );
  root.dispose();
});

Deno.test("failed component candidate removes new owner state and preserves committed output", () => {
  let setValue: ((action: string) => boolean) | undefined;
  const Flaky = defineComponent<{ fail: boolean }>(
    "fixture.flaky",
    ({ fail }) => {
      const [value, set] = useStateAt("fixture.flaky.value", "fresh");
      setValue = set;
      if (fail) throw new Error("candidate failed");
      return jsx("output", {}, value);
    },
  );
  const host = new MemoryVDOMHost();
  const container = host.createContainer();
  const root = new ComponentStateRoot(host, container);
  const tree = (key: string, fail: boolean) =>
    jsx("section", {}, jsx(Flaky, { key, fail }));
  root.mount(tree("stable", false));
  const rootOwner = root.world.resolveOwner(null, "@component-root");
  const committedNode = container.children[0];
  setValue!("updated");
  try {
    root.update(tree("candidate", true));
    throw new Error("Expected candidate render to fail");
  } catch (error) {
    if (!(error instanceof Error) || error.message !== "candidate failed") {
      throw error;
    }
  }
  assertSame(
    container.children[0],
    committedNode,
    "Failed component candidate changed committed host output",
  );
  assertEquals(
    root.world.findOwner(rootOwner, "fixture.flaky", "candidate"),
    undefined,
    "Failed candidate leaked a component owner",
  );
  assertEquals(
    root.flush(),
    true,
    "Prior committed owner work should remain flushable after a failed candidate",
  );
  assertSame(
    container.children[0],
    committedNode,
    "Flushing the previous tree replaced its compatible host node",
  );
  assertEquals(
    container.children[0].children[0].children[0].text,
    "updated",
    "Failed candidate replaced the root's committed input tree",
  );
  root.dispose();
});

Deno.test("compiled component event writes automatically coalesce into one scheduled VDOM commit", async () => {
  const host = new MemoryVDOMHost();
  const container = host.createContainer();
  const root = new ComponentStateRoot(host, container);
  root.mount(jsx(CompiledCounter, {}));
  const click = container.children[0].props.onClick as () => void;
  click();
  click();
  click();
  await new Promise<void>((resolve) => queueMicrotask(resolve));

  assertEquals(
    root.version,
    2,
    "Multiple writes to one owner/site should produce one committed update",
  );
  assertEquals(container.children[0].props["data-count"], 3);
  assertEquals(container.children[0].children[0].text, "3");
  assertEquals(
    root.flush(),
    false,
    "The automatic scheduler should consume the pending journal",
  );
  root.dispose();
});

Deno.test("state updates rerun only the owning component and match a forced full render", () => {
  let setCount:
    | ((action: number | ((previous: number) => number)) => boolean)
    | undefined;
  let counterRenders = 0;
  let siblingRenders = 0;
  const Counter = defineComponent<Record<string, never>>(
    "fixture.incremental.counter",
    () => {
      counterRenders++;
      const [count, set] = useStateAt("fixture.incremental.count", 0);
      setCount = set;
      return jsx("output", { "data-count": count }, String(count));
    },
  );
  const Sibling = defineComponent<Record<string, never>>(
    "fixture.incremental.sibling",
    () => {
      siblingRenders++;
      return jsx("aside", { "data-stable": true }, "unchanged");
    },
  );
  const host = new MemoryVDOMHost();
  const container = host.createContainer();
  const root = new ComponentStateRoot(host, container, { renderPreparation: "repeatable" });
  const tree = () => jsx("section", {}, [jsx(Counter, {}), jsx(Sibling, {})]);

  root.mount(tree());
  const initialCounter = container.children[0].children[0];
  const initialSibling = container.children[0].children[1];
  assertEquals([counterRenders, siblingRenders], [1, 1]);

  setCount!(1);
  assertEquals(root.flush(), true);
  assertEquals(
    [counterRenders, siblingRenders],
    [2, 1],
    "A local state update should skip a clean sibling component",
  );
  assertSame(
    container.children[0].children[1],
    initialSibling,
    "Clean sibling host identity should survive the update",
  );
  assertSame(
    container.children[0].children[0],
    initialCounter,
    "Compatible counter host identity should survive the update",
  );
  assertEquals(container.children[0].children[0].children[0].text, "1");
  assertEquals(
    root.partialCommitCount,
    1,
    "A unique stable component root should commit through the indexed region path",
  );

  root.update(tree());
  assertEquals(
    [counterRenders, siblingRenders],
    [3, 2],
    "Explicit tree replacement is the full-render oracle",
  );
  assertEquals(
    textContent(container.children[0]),
    "1unchanged",
    "Incremental output must agree with full recomputation",
  );
  root.dispose();
});

Deno.test("component partial commit falls back without rendering a structural update twice", () => {
  let setExpanded: ((value: boolean) => boolean) | undefined;
  let renders = 0;
  const Switch = defineComponent<Record<string, never>>(
    "fixture.partial.switch",
    () => {
      renders++;
      const [expanded, set] = useStateAt("fixture.partial.expanded", false);
      setExpanded = set;
      return expanded
        ? jsx("article", {}, "expanded")
        : jsx("section", {}, "compact");
    },
  );
  const host = new MemoryVDOMHost();
  const container = host.createContainer();
  const root = new ComponentStateRoot(host, container);

  root.mount(jsx("main", {}, jsx(Switch, {})));
  setExpanded!(true);
  root.flush();

  assertEquals(
    renders,
    2,
    "Structural fallback rendered the state owner more than once",
  );
  assertEquals(container.children[0].children[0].tag, "article");
  assertEquals(container.children[0].children[0].children[0].text, "expanded");
  assertEquals(
    root.partialCommitCount,
    0,
    "A changed host root should use full reconciliation",
  );
  root.dispose();
});

Deno.test("structural owner updates reconcile one keyed region and preserve child state", () => {
  let setIds:
    | ((action: string[] | ((previous: string[]) => string[])) => boolean)
    | undefined;
  const rowSetters = new Map<
    string,
    (action: boolean | ((previous: boolean) => boolean)) => boolean
  >();
  const rowRenders = new Map<string, number>();
  const lifecycle: string[] = [];
  let appRenders = 0;
  let siblingRenders = 0;
  const Row = defineComponent<{ id: string }>(
    "fixture.structural.row",
    ({ id }) => {
      rowRenders.set(id, (rowRenders.get(id) ?? 0) + 1);
      const [selected, setSelected] = useStateAt(
        "fixture.structural.selected",
        false,
      );
      rowSetters.set(id, setSelected);
      useEffectAt("fixture.structural.effect", () => {
        lifecycle.push(`setup:${id}`);
        return () => lifecycle.push(`cleanup:${id}`);
      });
      return jsx("li", {
        key: id,
        "data-id": id,
        "data-selected": String(selected),
      }, id);
    },
  );
  const App = defineComponent<{ initialIds: string[] }>(
    "fixture.structural.app",
    ({ initialIds }) => {
      appRenders++;
      const [ids, updateIds] = useStateAt("fixture.structural.ids", initialIds);
      setIds = updateIds;
      return jsx("section", {}, [
        jsx("ul", {}, ids.map((id) => jsx(Row, { key: id, id }))),
      ]);
    },
  );
  const Sibling = defineComponent<Record<string, never>>(
    "fixture.structural.sibling",
    () => {
      siblingRenders++;
      return jsx("aside", { "data-sibling": "stable" }, "outside region");
    },
  );
  const host = new MemoryVDOMHost();
  const container = host.createContainer();
  const root = new ComponentStateRoot(host, container, { renderPreparation: "repeatable" });
  root.mount(jsx("main", {}, [
    jsx(App, { key: "app", initialIds: ["a", "b", "c"] }),
    jsx(Sibling, {}),
  ]));

  const main = container.children[0];
  const section = main.children[0];
  const aside = main.children[1];
  const list = section.children[0];
  const initialRows = new Map(
    list.children.map((node) => [String(node.props["data-id"]), node]),
  );
  assertEquals([appRenders, siblingRenders], [1, 1]);
  assertEquals(lifecycle, ["setup:a", "setup:b", "setup:c"]);

  rowSetters.get("b")!(true);
  root.flush();
  assertEquals(list.children[1].props["data-selected"], "true");
  const partialCommitsAfterLeafWrite = root.partialCommitCount;

  setIds!(["b", "c", "a"]);
  root.flush();
  assertEquals(appRenders, 2, "The structural owner should render once");
  assertEquals(
    siblingRenders,
    1,
    "A component outside the keyed region should not rerender",
  );
  assertEquals(
    [...rowRenders.entries()].sort(),
    [["a", 1], ["b", 2], ["c", 1]],
    "Unchanged keyed children should reuse their component output",
  );
  assertSame(
    main.children[0],
    section,
    "The structural region host root should retain identity",
  );
  assertSame(
    main.children[1],
    aside,
    "An unrelated sibling host node should retain identity",
  );
  assertEquals(list.children.map((node) => node.props["data-id"]), [
    "b",
    "c",
    "a",
  ]);
  for (const node of list.children) {
    assertSame(
      node,
      initialRows.get(String(node.props["data-id"])),
      "A keyed row host node should survive reorder",
    );
  }
  assertEquals(
    list.children[0].props["data-selected"],
    "true",
    "Child state should follow its keyed owner through reorder",
  );
  assertEquals(
    lifecycle,
    ["setup:a", "setup:b", "setup:c"],
    "Reorder should not rerun keyed child effects",
  );
  assertEquals(
    root.partialCommitCount,
    partialCommitsAfterLeafWrite + 1,
    "The parent should commit only its keyed host region",
  );

  setIds!(["c", "a"]);
  root.flush();
  assertEquals(
    lifecycle,
    ["setup:a", "setup:b", "setup:c", "cleanup:b"],
    "Removing a keyed child should clean up its effect",
  );
  setIds!(["b", "c", "a"]);
  root.flush();
  const remountedB = list.children[0];
  assertNotSame(
    remountedB,
    initialRows.get("b")!,
    "A removed key should receive a fresh host node when reinserted",
  );
  assertEquals(
    remountedB.props["data-selected"],
    "false",
    "A reinserted key should receive fresh component state",
  );
  assertEquals(
    lifecycle.at(-1),
    "setup:b",
    "A reinserted key should run a fresh effect setup",
  );
  assertEquals(siblingRenders, 1);
  root.dispose();
  assertEquals([...lifecycle.slice(-3)].sort(), [
    "cleanup:a",
    "cleanup:b",
    "cleanup:c",
  ]);
});

Deno.test("compiled invalidation edges select the state-owning component region", () => {
  let setCount:
    | ((action: number | ((previous: number) => number)) => boolean)
    | undefined;
  let counterRenders = 0;
  let siblingRenders = 0;
  const Counter = defineComponent<Record<string, never>>(
    "fixture.graph.counter",
    () => {
      counterRenders++;
      const [count, set] = useStateAt("fixture.graph.count", 0);
      setCount = set;
      return jsx("output", { "data-count": count }, String(count));
    },
  );
  const Sibling = defineComponent<Record<string, never>>(
    "fixture.graph.sibling",
    () => {
      siblingRenders++;
      return jsx("aside", {}, "steady");
    },
  );
  const host = new MemoryVDOMHost();
  const container = host.createContainer();
  const root = new ComponentStateRoot(host, container, {
    invalidationPlan: {
      source_count: 1,
      source_paths: ["fixture.graph.count"],
      source_region_offsets: [0, 1],
      region_ids: [0],
      region_component_site_ids: [
        "fixture.graph.counter",
        "fixture.graph.sibling",
      ],
    },
  });
  root.mount(jsx("section", {}, [jsx(Counter, {}), jsx(Sibling, {})]));
  const siblingNode = container.children[0].children[1];
  setCount!(1);

  assertEquals(root.flush(), true);
  assertEquals(
    [counterRenders, siblingRenders],
    [2, 1],
    "Compiled graph edge should select Counter and skip Sibling",
  );
  assertSame(
    container.children[0].children[1],
    siblingNode,
    "Graph dispatch should preserve the independent sibling node",
  );
  assertEquals(container.children[0].children[0].children[0].text, "1");
  root.dispose();
});

Deno.test("nested dirty descendants reuse clean component subtrees without dropping effects", () => {
  let setValue: ((value: number) => boolean) | undefined;
  let parentRenders = 0;
  let childRenders = 0;
  let stableRenders = 0;
  const effects: string[] = [];
  const Child = defineComponent<Record<string, never>>(
    "fixture.nested.child",
    () => {
      childRenders++;
      const [value, set] = useStateAt("fixture.nested.value", 0);
      setValue = set;
      return jsx("output", { "data-value": value }, String(value));
    },
  );
  const Stable = defineComponent<Record<string, never>>(
    "fixture.nested.stable",
    () => {
      stableRenders++;
      useEffectAt("fixture.nested.stable.effect", () => {
        effects.push("setup");
        return () => effects.push("cleanup");
      });
      return jsx("aside", {}, jsx("span", {}, "retained"));
    },
  );
  const Parent = defineComponent<Record<string, never>>(
    "fixture.nested.parent",
    () => {
      parentRenders++;
      return jsx("section", {}, [jsx(Child, {}), jsx(Stable, {})]);
    },
  );
  const host = new MemoryVDOMHost();
  const container = host.createContainer();
  const root = new ComponentStateRoot(host, container);
  root.mount(jsx(Parent, {}));
  const stableNode = container.children[0].children[1];

  setValue!(1);
  root.flush();

  assertEquals([parentRenders, childRenders, stableRenders], [1, 2, 1]);
  assertSame(
    container.children[0].children[1],
    stableNode,
    "Clean nested subtree lost its host object",
  );
  assertEquals(
    effects,
    ["setup"],
    "Reusing the clean component cache must preserve its live effect",
  );
  assertEquals(container.children[0].children[0].children[0].text, "1");

  root.update(jsx(Parent, {}));
  assertEquals(
    [parentRenders, childRenders, stableRenders],
    [2, 3, 2],
    "Full-render oracle should rerun nested components",
  );
  assertEquals(
    effects,
    ["setup"],
    "Full tree recomputation must retain mount-only effect lifecycle",
  );
  root.dispose();
  assertEquals(
    effects,
    ["setup", "cleanup"],
    "Disposal should clean the retained effect exactly once",
  );
});

Deno.test("indexed leaf updates remain local beneath Fragment-only component groups", () => {
  let targetSet: ((value: number) => boolean) | undefined;
  let leafRenders = 0;
  let groupRenders = 0;
  const Leaf = defineComponent<{ id: number }>(
    "fixture.tree-shape.leaf",
    ({ id }) => {
      leafRenders++;
      const [value, set] = useStateAt("fixture.tree-shape.value", 0);
      if (id === 99) targetSet = set;
      return jsx("span", { "data-id": id, "data-value": value }, String(value));
    },
  );
  const Group = defineComponent("fixture.tree-shape.group", ({ children }) => {
    groupRenders++;
    return jsx(Fragment, { children });
  });
  const host = new MemoryVDOMHost();
  const container = host.createContainer();
  const root = new ComponentStateRoot(host, container, {
    invalidationPlan: componentStateSitesPlan.invalidation_graph,
    renderPreparation: "repeatable",
  });
  const tree = () =>
    jsx(
      "main",
      {},
      Array.from({ length: 10 }, (_, group) =>
        jsx(
          Group,
          { key: "group-" + group },
          Array.from(
            { length: 10 },
            (_, offset) =>
              jsx(Leaf, { key: group * 10 + offset, id: group * 10 + offset }),
          ),
        )),
    );
  root.mount(tree());
  const main = container.children[0];
  const stableSiblings = [...main.children];
  assertEquals(
    main.children.length,
    100,
    "Fragments should preserve a flat host child list",
  );
  if (!targetSet) throw new Error("Target leaf state setter was not captured");
  targetSet(1);
  root.flush();
  assertEquals(
    [leafRenders, groupRenders],
    [101, 10],
    "Only the dirty leaf should execute",
  );
  assertEquals(
    root.partialCommitCount,
    1,
    "Nested component ownership should retain the indexed host-region path",
  );
  for (let index = 0; index < main.children.length; index++) {
    if (index === 99) continue;
    assertSame(
      main.children[index],
      stableSiblings[index],
      "Updating a grouped leaf replaced a clean host sibling",
    );
  }
  assertEquals(main.children[99].props["data-value"], 1);
  root.dispose();
});

Deno.test("batched state writes update multiple owner regions in one indexed commit", () => {
  const setters: Array<((value: number) => boolean) | undefined> = [];
  let leafRenders = 0;
  const Leaf = defineComponent<{ id: number }>(
    "compiler/fixtures/component_state_sites.tsx#component:BenchmarkItem",
    ({ id }) => {
      leafRenders++;
      const [value, set] = useStateAt(
        "compiler/fixtures/component_state_sites.tsx#component:BenchmarkItem#state:0",
        0,
      );
      setters[id] = set;
      return jsx("span", { "data-id": id, "data-value": value }, String(value));
    },
  );
  const host = new MemoryVDOMHost();
  const container = host.createContainer();
  const root = new ComponentStateRoot(host, container, {
    invalidationPlan: componentStateSitesPlan.invalidation_graph,
    renderPreparation: "repeatable",
  });
  root.mount(
    jsx(
      "main",
      {},
      Array.from({ length: 4 }, (_, id) => jsx(Leaf, { key: id, id })),
    ),
  );
  const main = container.children[0];
  const originalNodes = [...main.children];
  assertEquals(leafRenders, 4);
  if (!setters[0] || !setters[2]) {
    throw new Error("Leaf owner setters were not registered");
  }

  setters[0](1);
  setters[2](1);
  assertEquals(root.flush(), true);
  assertEquals(
    leafRenders,
    6,
    "Only the two dirty owner components should execute",
  );
  assertEquals(main.children.map((node) => node.props["data-value"]), [
    1,
    0,
    1,
    0,
  ]);
  for (let index = 0; index < originalNodes.length; index++) {
    assertSame(
      main.children[index],
      originalNodes[index],
      "Batched owner update replaced a keyed host node",
    );
  }
  assertEquals(
    root.partialCommitCount,
    2,
    "One leaf region should be patched per dirty owner",
  );
  assertEquals(
    root.partialCommitBatchCount,
    1,
    "Both leaf regions should be committed in one batch",
  );

  setters[1]!(1);
  setters[3]!(1);
  assertEquals(root.flush(), true);
  assertEquals(
    leafRenders,
    8,
    "Subsequent owner batch should not require a full component render",
  );
  assertEquals(main.children.map((node) => node.props["data-value"]), [
    1,
    1,
    1,
    1,
  ]);
  assertEquals(root.partialCommitCount, 4);
  assertEquals(root.partialCommitBatchCount, 2);
  root.dispose();
});

Deno.test("effect sites run after successful activation and clean up on site or owner removal", async () => {
  const lifecycle: string[] = [];
  const host = new MemoryVDOMHost();
  const container = host.createContainer();
  const root = new ComponentStateRoot(host, container);
  const tree = (active: boolean, label: string, fail = false) =>
    jsx(EffectProbe, {
      active,
      label,
      fail,
      onSetup: (value: string) => lifecycle.push(`setup:${value}`),
      onCleanup: (value: string) => lifecycle.push(`cleanup:${value}`),
    });

  root.mount(tree(true, "first"));
  assertEquals(
    lifecycle,
    ["setup:first"],
    "Effect should set up after the initial commit",
  );
  root.update(tree(true, "changed"));
  (container.children[0].props.onClick as () => void)();
  await new Promise<void>((resolve) => queueMicrotask(resolve));
  assertEquals(
    lifecycle,
    ["setup:first"],
    "Prop and state updates must not rerun mount-only effects",
  );

  try {
    root.update(tree(true, "failed", true));
    throw new Error("Expected the effect candidate to fail");
  } catch (error) {
    if (
      !(error instanceof Error) || error.message !== "effect candidate failed"
    ) throw error;
  }
  assertEquals(
    lifecycle,
    ["setup:first"],
    "A failed candidate must not change committed effect lifetimes",
  );

  root.update(tree(false, "changed"));
  assertEquals(
    lifecycle,
    ["setup:first", "cleanup:first"],
    "Skipping an active effect site should clean it up",
  );
  root.update(tree(true, "third"));
  assertEquals(lifecycle, ["setup:first", "cleanup:first", "setup:third"]);
  root.update(null);
  assertEquals(lifecycle, [
    "setup:first",
    "cleanup:first",
    "setup:third",
    "cleanup:third",
  ], "Owner removal should clean up active effects");
  root.dispose();
  assertEquals(lifecycle, [
    "setup:first",
    "cleanup:first",
    "setup:third",
    "cleanup:third",
  ], "Disposed owner should not clean up twice");

  const disposeContainer = host.createContainer();
  const disposeRoot = new ComponentStateRoot(host, disposeContainer);
  disposeRoot.mount(tree(true, "dispose"));
  disposeRoot.dispose();
  assertEquals(lifecycle, [
    "setup:first",
    "cleanup:first",
    "setup:third",
    "cleanup:third",
    "setup:dispose",
    "cleanup:dispose",
  ], "Root disposal should clean up every still-active effect exactly once");
});

Deno.test("compiled keyed-owner reuse skips generic expansion for same-key reorder and falls back safely", () => {
  let setIds:
    | ((action: string[] | ((previous: string[]) => string[])) => boolean)
    | undefined;
  const setters = new Map<
    string,
    (action: boolean | ((previous: boolean) => boolean)) => boolean
  >();
  const rowRenders = new Map<string, number>();
  const lifecycle: string[] = [];
  const Row = defineComponent<{ id: string }>(
    "fixture.keyed-owner.row",
    ({ id }) => {
      rowRenders.set(id, (rowRenders.get(id) ?? 0) + 1);
      const [selected, setSelected] = useStateAt(
        "fixture.keyed-owner.selected",
        false,
      );
      setters.set(id, setSelected);
      useEffectAt("fixture.keyed-owner.effect", () => {
        lifecycle.push(`setup:${id}`);
        return () => lifecycle.push(`cleanup:${id}`);
      });
      return jsx("li", {
        key: id,
        "data-id": id,
        "data-selected": String(selected),
      }, id);
    },
  );
  let appRenders = 0;
  const App = defineComponent<{ initialIds: string[] }>(
    "fixture.keyed-owner.app",
    ({ initialIds }) => {
      appRenders++;
      const [ids, updateIds] = useStateAt(
        "fixture.keyed-owner.ids",
        initialIds,
      );
      setIds = updateIds;
      return jsx("section", {}, [
        jsx("ul", {}, keyedOwnerChildren("fixture.keyed-owner.row", ids.map((id) =>
          jsx(Row, { key: id, id })
        ))),
      ]);
    },
  );
  const host = new MemoryVDOMHost();
  const container = host.createContainer();
  const observed: Record<string, number> = {};
  const paths: string[] = [];
  const root = new ComponentStateRoot(host, container, {
    keyedOwnerReuse: true,
    renderPreparation: "repeatable",
    profile: (phase) => paths.push(phase),
    profileCounter: (counters) => Object.assign(observed, counters),
  });
  root.mount(jsx(App, { initialIds: ["a", "b", "c"] }));
  const list = container.children[0].children[0];
  const originalRows = new Map(
    list.children.map((node) => [String(node.props["data-id"]), node]),
  );
  setters.get("b")!(true);
  root.flush();
  setIds!(["b", "c", "a"]);
  root.flush();

  assertEquals(appRenders, 2, "App renders once for the structural reorder");
  assertEquals([...rowRenders.entries()].sort(), [["a", 1], ["b", 2], ["c", 1]]);
  assertEquals(list.children.map((node) => node.props["data-id"]), ["b", "c", "a"]);
  for (const node of list.children) {
    assertSame(node, originalRows.get(String(node.props["data-id"])), "Retained row host identity survives reorder");
  }
  assertEquals(list.children[0].props["data-selected"], "true");
  assertEquals(lifecycle, ["setup:a", "setup:b", "setup:c"]);
  assertEquals(observed["owner.keyed-region.visits"], 3);
  assertEquals(observed["owner.keyed-region.cache-hits"], 3);
  assertEquals(observed["owner.component-visits"], undefined);
  assertEquals(paths.includes("dispatch.path.keyed-owner-reuse"), true);

  setIds!(["b", "c"]);
  root.flush();
  assertEquals(list.children.map((node) => node.props["data-id"]), ["b", "c"]);
  assertEquals(lifecycle.at(-1), "cleanup:a");
  assertEquals(paths.includes("dispatch.path.structural-owner"), true);

  setIds!(["b", "c", "d"]);
  root.flush();
  assertEquals(list.children.map((node) => node.props["data-id"]), ["b", "c", "d"]);
  assertEquals(rowRenders.get("d"), 1);
  root.dispose();
});

Deno.test("token keyed-owner reuse skips eligibility rows and mismatches before fallback", () => {
  type Sequence = { ids: string[]; version: ReturnType<typeof createKeyedOwnerVersion> };
  let setSequence: ((action: Sequence | ((previous: Sequence) => Sequence)) => boolean) | undefined;
  const rowRenders = new Map<string, number>();
  const setters = new Map<
    string,
    (action: boolean | ((previous: boolean) => boolean)) => boolean
  >();
  const Row = defineComponent<{ id: string }>("fixture.token-owner.row", ({ id }) => {
    rowRenders.set(id, (rowRenders.get(id) ?? 0) + 1);
    const [selected, setSelected] = useStateAt("fixture.token-owner.selected", false);
    setters.set(id, setSelected);
    return jsx("li", {
      key: id,
      "data-id": id,
      "data-selected": String(selected),
    }, id);
  });
  const App = defineComponent<{ initial: Sequence }>("fixture.token-owner.app", ({ initial }) => {
    const [sequence, updateSequence] = useStateAt("fixture.token-owner.sequence", initial);
    setSequence = updateSequence;
    return jsx("section", {}, jsx("ul", {}, keyedOwnerChildren(
      "fixture.token-owner.row",
      sequence.ids.map((id) => jsx(Row, { key: id, id })),
      sequence.version,
    )));
  });
  const host = new MemoryVDOMHost();
  const container = host.createContainer();
  const observed: Record<string, number> = {};
  const root = new ComponentStateRoot(host, container, {
    keyedOwnerReuseMode: "token",
    renderPreparation: "repeatable",
    profileCounter: (counters) => Object.assign(observed, counters),
  });
  const version1 = createKeyedOwnerVersion();
  root.mount(jsx(App, { initial: { ids: ["a", "b", "c"], version: version1 } }));
  const list = container.children[0].children[0];
  setters.get("b")!(true);
  root.flush();
  assertEquals(list.children[1].props["data-selected"], "true");
  const componentVisitsBeforeReorder = observed["owner.component-visits"] ?? 0;
  const originalRows = new Map(list.children.map((node) => [String(node.props["data-id"]), node]));

  setSequence!((previous) => ({ ids: ["b", "c", "a"], version: previous.version }));
  root.flush();
  assertEquals(list.children.map((node) => node.props["data-id"]), ["b", "c", "a"]);
  for (const node of list.children) {
    assertSame(node, originalRows.get(String(node.props["data-id"])), "Token reorder lost retained host identity");
  }
  assertEquals(list.children[0].props["data-selected"], "true", "Token reorder restored stale child state");
  assertEquals(observed["owner.component-visits"] ?? 0, componentVisitsBeforeReorder, "Token reorder unexpectedly rerendered child components");
  assertEquals(observed["owner.keyed-region.token-hits"], 3);
  assertEquals(observed["owner.keyed-region.token-output-reuses"], 3);
  assertEquals(observed["owner.keyed-region.token-mismatches"], undefined);
  assertEquals(observed["owner.keyed-region.eligibility-visits"], undefined);
  assertEquals(observed["owner.component-visits"], undefined);

  const version2 = createKeyedOwnerVersion();
  setSequence!({ ids: ["b", "c", "d"], version: version2 });
  root.flush();
  assertEquals(list.children.map((node) => node.props["data-id"]), ["b", "c", "d"]);
  assertEquals(observed["owner.keyed-region.token-mismatches"], 1);
  assertEquals(observed["owner.keyed-region.token-eligibility-visits"], undefined);
  assertEquals(observed["owner.component-visits"], 3);
  assertEquals(rowRenders.get("d"), 1);
  root.dispose();
});
