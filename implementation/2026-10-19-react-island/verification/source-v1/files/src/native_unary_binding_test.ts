import {
  bindStatePropAt,
  bindStatePropsAt,
  ComponentStateRoot,
  defineComponent,
  useStateAt,
  useStoreAt,
} from "./component_state_runtime.ts";
import { createAsyncStore } from "./async_store_runtime.ts";
import { Fragment, jsx } from "./jsx_binding_runtime.ts";
import { MemoryNode, MemoryVDOMHost } from "./vdom_snapshot_runtime.ts";

const equal = (actual: unknown, expected: unknown, label: string) => {
  if (!Object.is(actual, expected)) {
    throw new Error(`${label}: expected ${String(expected)}, got ${String(actual)}`);
  }
};

class CountingHost extends MemoryVDOMHost {
  writes: Array<{ name: string; value: unknown }> = [];
  override setProp(
    node: MemoryNode,
    name: string,
    value: unknown,
    previous?: unknown,
  ) {
    this.writes.push({ name, value });
    super.setProp(node, name, value, previous);
  }
}

const rootFor = (host = new CountingHost()) => {
  const container = host.createContainer();
  const root = new ComponentStateRoot(host, container, { scheduleCommit() {} });
  return { root, container, host };
};

Deno.test("unary state projection suppresses unchanged primitive host values", () => {
  let setValue!: (value: number) => boolean;
  let renders = 0;
  const Direct = defineComponent("unary-primitive-direct", () => {
    renders++;
    const [value, set] = useStateAt("value", 1);
    setValue = set;
    return jsx("output", {
      "data-value": bindStatePropAt("value", (next) => Math.floor(next / 10)),
    });
  }, { propOnlySites: ["value"] });
  const { root, container, host } = rootFor();
  root.mount(jsx(Direct, {}));
  host.writes.length = 0;
  setValue(2);
  root.flush();
  equal(renders, 1, "prop-only state update skips component render");
  equal(host.writes.length, 0, "same projected primitive is suppressed");
  setValue(11);
  root.flush();
  equal((container.children[0] as MemoryNode).props["data-value"], 1, "new projected value");
  equal(host.writes.filter((write) => write.name === "data-value").length, 1, "single projected write");
  root.dispose();
});

Deno.test("unary state projection conservatively writes stable mutable objects", () => {
  let setValue!: (value: number) => boolean;
  const stable = { value: 0 };
  const Direct = defineComponent("unary-mutable-direct", () => {
    const [value, set] = useStateAt("value", 1);
    setValue = set;
    return jsx("output", {
      payload: bindStatePropAt("value", (next) => {
        stable.value = next;
        return stable;
      }),
    });
  }, { propOnlySites: ["value"] });
  const { root, container, host } = rootFor();
  root.mount(jsx(Direct, {}));
  host.writes.length = 0;
  setValue(2);
  root.flush();
  equal(host.writes.filter((write) => write.name === "payload").length, 1, "mutable binding forces a host write");
  equal((container.children[0] as MemoryNode).props.payload, stable, "stable object identity");
  equal(stable.value, 2, "mutable projection refreshed");
  root.dispose();
});

Deno.test("unary bindings recapture sources across owner removal and recreation", () => {
  let setVisible!: (value: boolean) => boolean;
  let setValue!: (value: number) => boolean;
  const Child = defineComponent("unary-lifetime-child", () => {
    const [value, set] = useStateAt("value", 3);
    setValue = set;
    return jsx("output", {
      "data-value": bindStatePropAt("value", (next) => next * 2),
    });
  }, { propOnlySites: ["value"] });
  const Parent = defineComponent("unary-lifetime-parent", () => {
    const [visible, set] = useStateAt("visible", true);
    setVisible = set;
    return visible ? jsx(Child, {}) : null;
  });
  const { root, container } = rootFor();
  root.mount(jsx(Parent, {}));
  equal((container.children[0] as MemoryNode).props["data-value"], 6, "initial captured binding");
  setVisible(false);
  root.flush();
  equal(container.children.length, 0, "old owner output removed");
  setVisible(true);
  root.flush();
  setValue(7);
  root.flush();
  equal((container.children[0] as MemoryNode).props["data-value"], 14, "new owner source captured");
  root.dispose();
});

Deno.test("published structural candidate canonicalizes a new unary source", () => {
  let setVisible!: (value: boolean) => boolean;
  let setValue!: (value: number) => boolean;
  const Child = defineComponent("unary-canonical-child", () => {
    const [value, set] = useStateAt("value", 3);
    setValue = set;
    return jsx("output", {
      "data-value": bindStatePropAt("value", (next) => next * 2),
    });
  }, { propOnlySites: ["value"] });
  const Parent = defineComponent("unary-canonical-parent", () => {
    const [visible, set] = useStateAt("visible", false);
    setVisible = set;
    return visible ? jsx(Child, {}) : null;
  });
  const { root, container } = rootFor();
  root.mount(jsx(Parent, {}));
  setVisible(true);
  root.flush();
  equal((container.children[0] as MemoryNode).props["data-value"], 6, "structural candidate output");
  setValue(9);
  root.flush();
  equal((container.children[0] as MemoryNode).props["data-value"], 18, "direct update reads canonical source after publish");
  root.dispose();
});

Deno.test("compound plural bindings remain on their existing fallback path", () => {
  let setLeft!: (value: number) => boolean;
  let setRight!: (value: number) => boolean;
  const Direct = defineComponent("unary-compound-direct", () => {
    const [left, setL] = useStateAt("left", 2);
    const [right, setR] = useStateAt("right", 5);
    setLeft = setL;
    setRight = setR;
    return jsx("output", {
      "data-value": bindStatePropsAt(["left", "right"], ([a, b]) => a + b),
    });
  }, { propOnlySites: ["left", "right"] });
  const { root, container } = rootFor();
  root.mount(jsx(Direct, {}));
  setLeft(4);
  setRight(8);
  root.flush();
  equal((container.children[0] as MemoryNode).props["data-value"], 12, "plural projection result");
  root.dispose();
});

Deno.test("reentrant state setter keeps the newest unary binding version", () => {
  const first = createAsyncStore(0, (state: number, action: number) => state + action);
  const second = createAsyncStore(0, (state: number, action: number) => state + action);
  let setValue!: (value: number) => boolean;
  let reenter = false;
  const selection = first.select((state) => {
    if (reenter) {
      reenter = false;
      setValue(6);
      second.dispatch(1);
    }
    return state;
  });
  const Direct = defineComponent("unary-reentrant-direct", () => {
    const [value, set] = useStateAt("value", 0);
    setValue = set;
    return jsx("output", {
      "data-value": bindStatePropAt("value", (next) => next),
    });
  }, { propOnlySites: ["value"] });
  const Reader = defineComponent("unary-reentrant-reader", () => {
    const left = useStoreAt("left", selection);
    const right = useStoreAt("right", second);
    return jsx("span", {}, `${left}:${right}`);
  });
  const { root, host } = rootFor();
  root.mount(jsx(Fragment, {}, [jsx(Direct, {}), jsx(Reader, {})]));
  host.writes.length = 0;
  reenter = true;
  setValue(4);
  first.dispatch(1);
  root.flush();
  root.flush();
  equal(host.writes.filter((write) => write.name === "data-value").map((write) => write.value).join(","), "6", "retry writes newest state once");
  root.dispose();
});

Deno.test("unary binding validates active owner, state site, and projector", () => {
  for (const invoke of [
    () => bindStatePropAt("value", (value) => value),
  ]) {
    let message = "";
    try { invoke(); } catch (error) { message = String(error); }
    equal(message.includes("while an owner-aware component is rendering"), true, "active owner validation");
  }
  const Invalid = defineComponent("unary-invalid-site", () => {
    useStateAt("value", "not numeric");
    return jsx("output", { value: bindStatePropAt("value", (value) => value) });
  });
  const { root } = rootFor();
  let message = "";
  try { root.mount(jsx(Invalid, {})); } catch (error) { message = String(error); }
  equal(message.includes("is not a numeric state cell"), true, "numeric site validation");
  root.dispose();
});
