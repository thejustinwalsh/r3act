import {
  bindStatePropsAt,
  ComponentStateRoot,
  defineComponent,
  useStateAt,
  useStoreAt,
} from "./component_state_runtime.ts";
import { createAsyncStore } from "./async_store_runtime.ts";
import { Fragment, jsx } from "./jsx_binding_runtime.ts";
import { OwnerStateWorld } from "./owner_state_world.ts";
import { type MemoryNode, MemoryVDOMHost } from "./vdom_snapshot_runtime.ts";

const equal = (actual: unknown, expected: unknown, message: string) => {
  if (!Object.is(actual, expected)) {
    throw new Error(`${message}: expected ${String(expected)}, got ${String(actual)}`);
  }
};
const textContent = (node: MemoryNode): string =>
  (node.text ?? "") + node.children.map(textContent).join("");

const makeRoot = (
  options: { world?: OwnerStateWorld; rootId?: string; counters?: Array<Record<string, number>> } = {},
) => {
  const host = new MemoryVDOMHost();
  const container = host.createContainer();
  const root = new ComponentStateRoot(host, container, {
    ...(options.world ? { world: options.world } : {}),
    ...(options.rootId ? { rootId: options.rootId } : {}),
    scheduleCommit() {},
    ...(options.counters
      ? { profileCounter: (counters: Record<string, number>) => options.counters!.push(counters) }
      : {}),
  });
  return { root, host, container };
};

Deno.test("compiled prop eligibility is interpreted once per reused committed cache", () => {
  const frames: Array<Record<string, number>> = [];
  let setValue!: (value: number) => boolean;
  let renders = 0;
  const Counter = defineComponent("compiled-eligibility-reused", () => {
    renders++;
    const [value, set] = useStateAt("value", 1);
    setValue = set;
    return jsx("output", {
      "data-value": bindStatePropsAt(["value"], ([next]) => next),
    });
  }, { propOnlySites: ["value"] });
  const { root, container } = makeRoot({ counters: frames });
  root.mount(jsx(Counter, {}));
  for (const value of [2, 3, 4]) {
    setValue(value);
    root.flush();
    equal(container.children[0].props["data-value"], value, "numeric prop value");
  }
  equal(renders, 1, "compiled numeric updates should reuse component output");
  equal(
    frames.reduce((sum, frame) => sum + (frame["numeric.compiled-site-cache-constructions"] ?? 0), 0),
    1,
    "the committed cache gets one interpreted eligibility set",
  );
  equal(
    frames.reduce((sum, frame) => sum + (frame["numeric.compiled-site-metadata-inspections"] ?? 0), 0),
    1,
    "metadata sites are inspected once for the committed cache",
  );
  for (const frame of frames.slice(1)) {
    equal(frame["numeric.compiled-site-cache-constructions"] ?? 0, 0, "reused cache construction count");
    equal(frame["numeric.compiled-site-metadata-inspections"] ?? 0, 0, "reused cache metadata inspections");
  }
  root.dispose();
});

Deno.test("generic owners do not allocate an empty eligibility cache each render", () => {
  const frames: Array<Record<string, number>> = [];
  let setValue!: (value: number) => boolean;
  const Generic = defineComponent("compiled-eligibility-generic", () => {
    const [value, set] = useStateAt("value", 0);
    setValue = set;
    return jsx("output", {}, String(value));
  });
  const { root, container } = makeRoot({ counters: frames });
  try {
    root.mount(jsx(Generic, {}));
    for (const value of [1, 2, 3]) {
      setValue(value);
      root.flush();
      equal(textContent(container), String(value), "generic output remains correct");
    }
    equal(frames.reduce((sum, frame) => sum + (frame["numeric.compiled-site-cache-constructions"] ?? 0), 0), 0, "no empty per-cache Set is constructed");
  } finally {
    root.dispose();
  }
});

Deno.test("conditional committed bindings are removed and reapproved on cache replacement", () => {
  let setValue!: (value: number) => boolean;
  let setBound!: (value: boolean) => boolean;
  let renders = 0;
  const Conditional = defineComponent("compiled-eligibility-conditional", () => {
    renders++;
    const [value, changeValue] = useStateAt("value", 1);
    const [bound, changeBound] = useStateAt("bound", true);
    setValue = changeValue;
    setBound = changeBound;
    return jsx("output", {
      "data-value": bound
        ? bindStatePropsAt(["value"], ([next]) => next)
        : value,
    });
  }, { propOnlySites: ["value"] });
  const { root, container } = makeRoot();
  root.mount(jsx(Conditional, {}));
  setBound(false);
  root.flush();
  const beforeUnboundUpdate = renders;
  setValue(7);
  root.flush();
  equal(container.children[0].props["data-value"], 7, "unbound state uses generic render");
  equal(renders, beforeUnboundUpdate + 1, "removed binding loses numeric eligibility");
  setBound(true);
  root.flush();
  const beforeReapprovedUpdate = renders;
  setValue(8);
  root.flush();
  equal(container.children[0].props["data-value"], 8, "rebound state updates the sink");
  equal(renders, beforeReapprovedUpdate, "replacement cache reapproves the active sink");
  root.dispose();
});

Deno.test("compiled eligibility stays isolated between roots sharing one world", () => {
  const world = new OwnerStateWorld();
  const setters: Array<(value: number) => boolean> = [];
  const Counter = defineComponent("compiled-eligibility-shared-world", () => {
    const [value, set] = useStateAt("value", 0);
    setters.push(set);
    return jsx("output", {
      "data-value": bindStatePropsAt(["value"], ([next]) => next),
    });
  }, { propOnlySites: ["value"] });
  const left = makeRoot({ world, rootId: "compiled-eligibility-left" });
  const right = makeRoot({ world, rootId: "compiled-eligibility-right" });
  left.root.mount(jsx(Counter, {}));
  right.root.mount(jsx(Counter, {}));
  setters[0](5);
  left.root.flush();
  equal(left.container.children[0].props["data-value"], 5, "left root update");
  equal(right.container.children[0].props["data-value"], 0, "right root remains unchanged");
  setters[1](9);
  right.root.flush();
  equal(right.container.children[0].props["data-value"], 9, "right root update");
  left.root.dispose();
  right.root.dispose();
});

Deno.test("mixed state and store work keeps generic candidate numeric writes coherent", () => {
  const store = createAsyncStore(0, (state: number, amount: number) => state + amount);
  let setValue!: (value: number) => boolean;
  let directRenders = 0;
  const Direct = defineComponent("compiled-eligibility-mixed-direct", () => {
    directRenders++;
    const [value, set] = useStateAt("value", 2);
    setValue = set;
    return jsx("output", {
      "data-value": bindStatePropsAt(["value"], ([next]) => next),
    });
  }, { propOnlySites: ["value"] });
  const Reader = defineComponent("compiled-eligibility-mixed-reader", () => {
    const version = useStoreAt("version", store);
    return jsx("span", {}, String(version));
  });
  const { root, container } = makeRoot();
  root.mount(jsx(Fragment, {}, [jsx(Direct, {}), jsx(Reader, {})]));
  setValue(11);
  store.dispatch(1);
  root.flush();
  equal(container.children[0].props["data-value"], 11, "numeric value commits with mixed work");
  equal(textContent(container.children[1]), "1", "store reader candidate commits");
  equal(directRenders, 1, "candidate writes the direct sink without rerendering it");
  root.dispose();
});

Deno.test("destroyed owners preserve validation errors and dispose cleans up", () => {
  const world = new OwnerStateWorld();
  let setValue!: (value: number) => boolean;
  let changedOwner = 0;
  const Child = defineComponent("compiled-eligibility-destroyed-child", () => {
    const [value, set] = useStateAt("value", 0);
    setValue = set;
    return jsx("output", {
      "data-value": bindStatePropsAt(["value"], ([next]) => next),
    });
  }, { propOnlySites: ["value"] });
  const { root } = makeRoot({ world, rootId: "compiled-eligibility-destroyed-root" });
  root.mount(jsx(Child, {}));
  const unsubscribe = world.subscribeChanges((change) => {
    changedOwner = change.owner;
  });
  setValue(4);
  unsubscribe();
  equal(world.destroyOwner(changedOwner), true, "state owner is destroyed");
  let message = "";
  try {
    root.flush();
  } catch (error) {
    message = String(error);
  }
  equal(message.includes("is not alive"), true, "source validation preserves dead-owner failure");
  root.dispose();
});

Deno.test("reentrant writes preserve the newer version while restoring numeric sources", () => {
  let setA!: (value: number) => boolean;
  let setB!: (value: number) => boolean;
  class ReentrantHost extends MemoryVDOMHost {
    reenter = false;
    override setProp(node: MemoryNode, name: string, value: unknown, previous?: unknown) {
      super.setProp(node, name, value, previous);
      if (this.reenter && name === "data-a") {
        this.reenter = false;
        setB(9);
      }
    }
  }
  const host = new ReentrantHost();
  const container = host.createContainer();
  const root = new ComponentStateRoot(host, container, { scheduleCommit() {} });
  const Output = defineComponent("compiled-eligibility-reentrant", () => {
    const [, a] = useStateAt("a", 1);
    const [, b] = useStateAt("b", 1);
    setA = a;
    setB = b;
    return jsx("output", {
      "data-a": bindStatePropsAt(["a"], ([value]) => value),
      "data-b": bindStatePropsAt(["b"], ([value]) => value),
    });
  }, { propOnlySites: ["a", "b"] });
  root.mount(jsx(Output, {}));
  setA(2);
  setB(3);
  host.reenter = true;
  root.flush();
  const node = container.children[0];
  equal(node.props["data-a"], 2, "first captured value");
  equal(node.props["data-b"], 3, "first captured cut value");
  root.flush();
  equal(node.props["data-b"], 9, "reentrant newer value survives restore");
  root.dispose();
});
