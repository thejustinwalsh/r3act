import {
  bindStatePropsAt,
  ComponentStateRoot,
  defineComponent,
  useEffectAt,
  useStateAt,
} from "./component_state_runtime.ts";
import { Fragment, jsx } from "./jsx_binding_runtime.ts";
import { type MemoryNode, MemoryVDOMHost } from "./vdom_snapshot_runtime.ts";
import { OwnerStateWorld } from "./owner_state_world.ts";
import {
  jsx as nativeClassicJsx,
  useEffect,
  useState,
} from "./native_runtime_api.ts";
import { jsx as automaticJsx } from "./native_jsx_runtime.ts";

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
const textContent = (node: MemoryNode): string =>
  (node.text ?? "") + node.children.map(textContent).join("");
const byProp = (
  node: MemoryNode,
  name: string,
  value: unknown,
): MemoryNode | undefined => {
  if (Object.is(node.props[name], value)) return node;
  for (const child of node.children) {
    const found = byProp(child, name, value);
    if (found) return found;
  }
  return undefined;
};
const manualRoot = (world?: OwnerStateWorld, rootId?: string, renderPreparation?: "repeatable") => {
  const host = new MemoryVDOMHost();
  const container = host.createContainer();
  const scheduled: Array<() => void> = [];
  const root = new ComponentStateRoot(host, container, {
    ...(world ? { world } : {}),
    ...(rootId ? { rootId } : {}),
    scheduleCommit: (commit) => scheduled.push(commit),
    renderPreparation,
  });
  return { root, host, container, scheduled };
};

Deno.test("compiler-approved numeric prop state updates without component execution", () => {
  let setValue!: (value: number) => boolean;
  let renders = 0;
  const Counter = defineComponent("numeric-counter", () => {
    renders++;
    const [value, set] = useStateAt("value", 2);
    setValue = set;
    return jsx("output", {
      "data-value": bindStatePropsAt(["value"], ([next]) => next * 3),
    });
  }, { propOnlySites: ["value"] });
  const { root, container, scheduled } = manualRoot();
  root.mount(jsx(Counter, {}));
  const node = container.children[0];
  assertEquals(node.props["data-value"], 6);
  assertEquals(renders, 1);
  setValue(5);
  scheduled.shift()?.();
  assertEquals(node.props["data-value"], 15);
  assertEquals(
    renders,
    1,
    "Numeric prop-only update re-executed the component",
  );
  assertEquals(
    root.diagnostics().sourceValueSyncVisits,
    1,
    "Numeric update scanned the committed source cache",
  );
  root.dispose();
});

Deno.test("one keyed numeric update does not rescan the source cache", () => {
  const setters = new Map<string, (value: number) => boolean>();
  let renders = 0;
  const Row = defineComponent("scan-counter-row", ({ id }: { id: string }) => {
    renders++;
    const [value, set] = useStateAt("value", 0);
    setters.set(id, set);
    return jsx("li", {
      "data-id": id,
      "data-value": bindStatePropsAt(["value"], ([next]) => next),
    });
  }, { propOnlySites: ["value"] });
  const ids = Array.from({ length: 64 }, (_, index) => String(index));
  const { root } = manualRoot();
  root.mount(jsx("ul", {}, ids.map((id) => jsx(Row, { key: id, id }))));
  const initialVisits = root.diagnostics().sourceValueSyncVisits;
  assertEquals(initialVisits, ids.length);
  setters.get("37")!(5);
  root.flush();
  assertEquals(root.diagnostics().sourceValueSyncVisits, initialVisits);
  assertEquals(renders, ids.length);
  root.dispose();
});

Deno.test("public hook spellings explain that native compilation is required", () => {
  let stateMessage = "";
  let effectMessage = "";
  try {
    useState(0);
  } catch (error) {
    stateMessage = String(error);
  }
  try {
    useEffect(() => {});
  } catch (error) {
    effectMessage = String(error);
  }
  if (!stateMessage.includes("native compiled hook")) {
    throw new Error(`Unexpected uncompiled useState error: ${stateMessage}`);
  }
  if (!effectMessage.includes("native compiled hook")) {
    throw new Error(`Unexpected uncompiled useEffect error: ${effectMessage}`);
  }
});

Deno.test("classic and automatic JSX factories keep separate child and key ABIs", () => {
  const onClick = () => {};
  const classic = nativeClassicJsx(
    "button",
    { key: "classic-key", onClick },
    "classic",
    " child",
  );
  assertEquals(classic.props.key, "classic-key");
  const { root, container } = manualRoot();
  root.mount(classic);
  assertEquals(textContent(container.children[0]), "classic child");
  assertEquals(container.children[0].props.onClick, onClick);
  assertEquals((root.snapshot[0] as { key: string }).key, "classic-key");
  root.dispose();

  const automatic = automaticJsx(
    "button",
    { children: ["automatic", " child"], onClick },
    "automatic-key",
  );
  assertEquals(automatic.props.key, "automatic-key");
  assertEquals(automatic.props.children, ["automatic", " child"]);
  const autoRoot = manualRoot();
  autoRoot.root.mount(automatic);
  assertEquals(textContent(autoRoot.container.children[0]), "automatic child");
  assertEquals(autoRoot.container.children[0].props.onClick, onClick);
  assertEquals(
    (autoRoot.root.snapshot[0] as { key: string }).key,
    "automatic-key",
  );
  autoRoot.root.dispose();
});

Deno.test("derived numeric prop reads multiple live state cells as one batch", () => {
  let setX!: (value: number) => boolean;
  let setY!: (value: number) => boolean;
  let renders = 0;
  const Total = defineComponent("numeric-total", () => {
    renders++;
    const [x, writeX] = useStateAt("x", 1);
    const [y, writeY] = useStateAt("y", 4);
    setX = writeX;
    setY = writeY;
    return jsx("output", {
      "data-total": bindStatePropsAt(
        ["x", "y"],
        ([left, right]) => left + right,
      ),
    });
  }, { propOnlySites: ["x", "y"] });
  const { root, container, scheduled } = manualRoot();
  root.mount(jsx(Total, {}));
  const node = container.children[0];
  assertEquals(node.props["data-total"], 5);
  setX(8);
  setY(9);
  scheduled.shift()?.();
  assertEquals(node.props["data-total"], 17);
  assertEquals(renders, 1);
  root.dispose();
});

Deno.test("generic owner commits refresh numeric bound props from the prior host value", () => {
  let setCount!: (value: number) => boolean;
  let renders = 0;
  const Generic = defineComponent("generic-bound-counter", () => {
    renders++;
    const [count, set] = useStateAt("count", 0);
    setCount = set;
    return jsx("output", {
      "data-count": bindStatePropsAt(["count"], ([value]) => value),
    }, String(count));
  });
  const { root, container } = manualRoot();
  root.mount(jsx(Generic, {}));
  const node = container.children[0];
  assertEquals(node.props["data-count"], 0);
  setCount(3);
  root.flush();
  assertEquals(node.props["data-count"], 3);
  assertEquals(textContent(node), "3");
  assertEquals(renders, 2);
  root.dispose();
});

Deno.test("numeric batch validates every source before rewinding any source value", () => {
  const world = new OwnerStateWorld();
  let setX!: (value: number) => boolean;
  let setY!: (value: number) => boolean;
  const Pair = defineComponent("preflight-pair", () => {
    const [x, writeX] = useStateAt("x", 1);
    const [y, writeY] = useStateAt("y", 2);
    setX = writeX;
    setY = writeY;
    return jsx("output", {
      "data-x": bindStatePropsAt(["x"], ([value]) => value),
      "data-y": bindStatePropsAt(["y"], ([value]) => value),
    });
  }, { propOnlySites: ["x", "y"] });
  const { root, container } = manualRoot(world, "preflight");
  root.mount(jsx(Pair, {}));
  const owner = world.findOwner(
    world.findOwner(null, "@component-root:preflight")!,
    "preflight-pair",
    "@slot:preflight-pair:0",
  );
  if (owner === undefined) throw new Error("Missing owner for preflight pair");
  const originalScalarSource = world.scalarSource.bind(world);
  let yReads = 0;
  world.scalarSource = (ownerId, site) => {
    if (ownerId === owner && site === "y" && ++yReads === 2) return null;
    return originalScalarSource(ownerId, site);
  };
  setX(10);
  setY(20);
  root.flush();
  assertEquals(container.children[0].props["data-x"], 10);
  assertEquals(container.children[0].props["data-y"], 20);
  assertEquals(originalScalarSource(owner, "x")?.value, 10);
  root.dispose();
});

Deno.test("numeric source identity survives an invalid value and recovers cached bindings", () => {
  let setValue!: (value: number) => boolean;
  let renders = 0;
  const Counter = defineComponent("numeric-source-recovery", () => {
    renders++;
    const [value, set] = useStateAt("value", 3);
    setValue = set;
    return jsx("output", {
      "data-value": bindStatePropsAt(["value"], ([next]) => next * 2),
    });
  }, { propOnlySites: ["value"] });
  const world = new OwnerStateWorld();
  const { root, container } = manualRoot(world, "source-recovery", "repeatable");
  root.mount(jsx(Counter, {}));
  const owner = world.findOwner(
    world.findOwner(null, "@component-root:source-recovery")!,
    "numeric-source-recovery",
    "@slot:numeric-source-recovery:0",
  );
  if (owner === undefined) throw new Error("Missing source recovery owner");
  const originalSource = world.scalarSource(owner, "value");
  if (!originalSource) throw new Error("Missing initial numeric source");

  setValue("invalid" as unknown as number);
  let invalidMessage = "";
  try {
    root.flush();
  } catch (error) {
    invalidMessage = String(error);
  }
  assertEquals(invalidMessage.includes("not a numeric state cell"), true);
  assertEquals(container.children[0].props["data-value"], 6);
  assertEquals(world.scalarSource(owner, "value"), null);

  setValue(9);
  assertEquals(world.scalarSource(owner, "value"), originalSource);
  root.flush();
  assertEquals(container.children[0].props["data-value"], 18);
  assertEquals(renders, 2, "Restoring a number re-executed the cached owner");
  root.dispose();
});

Deno.test("numeric host writer errors propagate without generic rerender fallback", () => {
  class ThrowingHost extends MemoryVDOMHost {
    throwOnValue: unknown = undefined;
    override setProp(
      node: MemoryNode,
      name: string,
      value: unknown,
      previous?: unknown,
    ) {
      if (Object.is(value, this.throwOnValue)) {
        throw new Error("numeric host writer failed");
      }
      super.setProp(node, name, value);
    }
  }
  const host = new ThrowingHost();
  const container = host.createContainer();
  let renderCount = 0;
  let setValue!: (value: number) => boolean;
  const Counter = defineComponent("throwing-counter", () => {
    renderCount++;
    const [value, set] = useStateAt("value", 1);
    setValue = set;
    return jsx("output", {
      "data-value": bindStatePropsAt(["value"], ([next]) => next),
    });
  }, { propOnlySites: ["value"] });
  const root = new ComponentStateRoot(host, container, {
    scheduleCommit() {},
  });
  root.mount(jsx(Counter, {}));
  host.throwOnValue = 2;
  setValue(2);
  let message = "";
  try {
    root.flush();
  } catch (error) {
    message = String(error);
  }
  assertEquals(message.includes("numeric host writer failed"), true);
  assertEquals(
    renderCount,
    1,
    "Host exception fell through to generic rendering",
  );
  assertEquals(root.diagnostics().pendingChangeCount, 1);
  root.dispose();
});

Deno.test("mixed numeric and generic work keeps direct owners cached and defers writes until commit", () => {
  let setDirect!: (value: number) => boolean;
  let setGeneric!: (value: string) => boolean;
  let directRenders = 0;
  let genericRenders = 0;
  let failGeneric = false;
  const Direct = defineComponent("mixed-direct", () => {
    directRenders++;
    const [value, set] = useStateAt("value", 1);
    setDirect = set;
    return jsx("output", {
      "data-direct": bindStatePropsAt(["value"], ([next]) => next),
    });
  }, { propOnlySites: ["value"] });
  const Generic = defineComponent("mixed-generic", () => {
    genericRenders++;
    const [label, set] = useStateAt("label", "old");
    setGeneric = set;
    if (failGeneric && label === "new") throw new Error("candidate rejected");
    return jsx("span", { "data-generic": label }, label);
  });
  const { root, container } = manualRoot();
  root.mount(jsx(Fragment, { children: [jsx(Direct, {}), jsx(Generic, {})] }));
  const output = byProp(container, "data-direct", 1)!;
  const generic = byProp(container, "data-generic", "old")!;
  setDirect(7);
  setGeneric("new");
  failGeneric = true;
  let threw = false;
  try {
    root.flush();
  } catch {
    threw = true;
  }
  assertEquals(threw, true);
  assertEquals(
    output.props["data-direct"],
    1,
    "Direct host write escaped a failed candidate",
  );
  assertEquals(
    root.diagnostics().pendingChangeCount,
    2,
    "Failed candidate dropped pending changes",
  );
  failGeneric = false;
  root.flush();
  assertEquals(output.props["data-direct"], 7);
  assertEquals(textContent(generic), "new");
  assertEquals(
    directRenders,
    1,
    "Direct-only component reran during mixed generic work",
  );
  assertEquals(genericRenders, 3);
  root.dispose();
});

Deno.test("key removal destroys numeric state lifetime before the same key is mounted again", () => {
  let setRow!: (value: number) => boolean;
  const Row = defineComponent("numeric-keyed-row", () => {
    const [value, set] = useStateAt("value", 0);
    setRow = set;
    return jsx("li", { "data-row": "row" }, String(value));
  });
  const { root, container, scheduled } = manualRoot();
  const tree = (present: boolean) =>
    jsx("ul", {}, present ? [jsx(Row, { key: "same" })] : []);
  root.mount(tree(true));
  const old = container.children[0].children[0];
  setRow(4);
  scheduled.shift()?.();
  assertEquals(textContent(old), "4");
  root.update(tree(false));
  root.update(tree(true));
  assertEquals(textContent(container.children[0].children[0]), "0");
  root.dispose();
});

Deno.test("reentrant effect writes survive captured-version clearing and schedule another flush", () => {
  let setValue!: (value: number) => boolean;
  let wroteFromEffect = false;
  const Probe = defineComponent("reentrant-probe", () => {
    const [value, set] = useStateAt("value", 0);
    setValue = set;
    if (value === 1) {
      useEffectAt("late-effect", () => {
        if (!wroteFromEffect) {
          wroteFromEffect = true;
          set(2);
        }
      });
    }
    return jsx("output", { "data-value": value });
  });
  const { root, container, scheduled } = manualRoot();
  root.mount(jsx(Probe, {}));
  setValue(1);
  scheduled.shift()?.();
  assertEquals(container.children[0].props["data-value"], 1);
  assertEquals(root.diagnostics().pendingChangeCount, 1);
  assertEquals(
    scheduled.length,
    1,
    "Reentrant write was not scheduled after commit",
  );
  scheduled.shift()?.();
  assertEquals(container.children[0].props["data-value"], 2);
  assertEquals(root.diagnostics().pendingChangeCount, 0);
  root.dispose();
});

Deno.test("unmount cleanup writes for a retiring owner are purged", () => {
  let cleanupSet!: (value: number) => boolean;
  const Effectful = defineComponent("cleanup-write-owner", () => {
    const [value, set] = useStateAt("value", 0);
    cleanupSet = set;
    useEffectAt("cleanup", () => () => cleanupSet(value + 1));
    return jsx("span", {}, String(value));
  });
  const { root } = manualRoot();
  root.mount(jsx(Effectful, {}));
  root.update(null);
  assertEquals(root.diagnostics().pendingChangeCount, 0);
  assertEquals(root.flush(), false);
  root.dispose();
});

Deno.test("shared world changes and cleanup are isolated by root namespace", () => {
  const world = new OwnerStateWorld();
  let setA!: (value: number) => boolean;
  let setB!: (value: number) => boolean;
  let rendersA = 0;
  let rendersB = 0;
  const ViewA = defineComponent("shared-view-a", () => {
    rendersA++;
    const [value, set] = useStateAt("value", 0);
    setA = set;
    return jsx("output", { "data-value": value });
  });
  const ViewB = defineComponent("shared-view-b", () => {
    rendersB++;
    const [value, set] = useStateAt("value", 10);
    setB = set;
    return jsx("output", { "data-value": value });
  });
  const a = manualRoot(world, "a");
  const b = manualRoot(world, "b");
  a.root.mount(jsx(ViewA, {}));
  b.root.mount(jsx(ViewB, {}));
  const ownerA = world.findOwner(
    world.findOwner(null, "@component-root:a")!,
    "shared-view-a",
    "@slot:shared-view-a:0",
  )!;
  const ownerB = world.findOwner(
    world.findOwner(null, "@component-root:b")!,
    "shared-view-b",
    "@slot:shared-view-b:0",
  )!;
  assertEquals(
    world.scalarSource(ownerA, "value") === world.scalarSource(ownerB, "value"),
    false,
  );
  setA(3);
  assertEquals(a.root.diagnostics().pendingChangeCount, 1);
  assertEquals(b.root.diagnostics().pendingChangeCount, 0);
  a.scheduled.shift()?.();
  assertEquals(a.container.children[0].props["data-value"], 3);
  assertEquals(b.container.children[0].props["data-value"], 10);
  assertEquals(rendersA, 2);
  assertEquals(rendersB, 1);
  a.root.dispose();
  assertEquals(world.isAlive(ownerA), false);
  assertEquals(world.isAlive(ownerB), true);
  setB(12);
  b.scheduled.shift()?.();
  assertEquals(b.container.children[0].props["data-value"], 12);
  b.root.dispose();
  assertEquals(world.hasPendingChanges(), false);
});
