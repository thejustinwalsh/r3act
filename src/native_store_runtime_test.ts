import {
  bindStatePropsAt,
  ComponentStateRoot,
  defineComponent,
  useEffectAt,
  useStateAt,
  useStoreAt,
} from "./component_state_runtime.ts";
import { createAsyncStore } from "./async_store_runtime.ts";
import { jsx } from "./jsx_binding_runtime.ts";
import { type MemoryNode, MemoryVDOMHost } from "./vdom_snapshot_runtime.ts";

const assertEquals = (actual: unknown, expected: unknown, message = "") => {
  if (actual !== expected) {
    throw new Error(
      `${message ? `${message}: ` : ""}expected ${String(expected)}, received ${
        String(actual)
      }`,
    );
  }
};

const textContent = (node: MemoryNode): string =>
  (node.text ?? "") + node.children.map(textContent).join("");

const rootHarness = (rootId?: string) => {
  const host = new MemoryVDOMHost();
  const container = host.createContainer();
  const scheduled: Array<() => void> = [];
  const root = new ComponentStateRoot(host, container, {
    rootId,
    scheduleCommit: (commit) => scheduled.push(commit),
  });
  return { root, container, scheduled };
};

Deno.test("native useStoreAt renders stores and selector history commits per root", () => {
  const store = createAsyncStore(
    0,
    (state: number, action: number) => state + action,
  );
  const previousValues: unknown[] = [];
  const selection = store.select<number>(
    (state, previous: number | undefined) => {
      previousValues.push(previous);
      return (previous ?? 0) + 1;
    },
  );
  const Counter = defineComponent(
    "native-store-counter",
    () => jsx("span", {}, String(useStoreAt("selected", selection))),
  );
  const a = rootHarness("native-store-root-a");
  const b = rootHarness("native-store-root-b");
  a.root.mount(jsx(Counter, {}));
  b.root.mount(jsx(Counter, {}));
  assertEquals(textContent(a.container.children[0]), "1");
  assertEquals(textContent(b.container.children[0]), "1");

  store.dispatch(1);
  a.root.flush();
  assertEquals(textContent(a.container.children[0]), "2");
  assertEquals(textContent(b.container.children[0]), "1");
  b.root.flush();
  assertEquals(textContent(b.container.children[0]), "2");
  assertEquals(previousValues[0], undefined);
  assertEquals(previousValues[1], undefined);
  assertEquals(previousValues[2], 1);
  assertEquals(previousValues[3], 1);

  a.root.dispose();
  b.root.dispose();
  assertEquals(store.diagnostics().listeners, 0, "root subscriptions leaked");
  assertEquals(store.diagnostics().readers, 0, "reader history leaked");
});

Deno.test("native store candidate failures do not publish selector history or host output", () => {
  const store = createAsyncStore(
    0,
    (state: number, action: number) => state + action,
  );
  const previousValues: unknown[] = [];
  const selection = store.select<number>(
    (_state, previous: number | undefined) => {
      previousValues.push(previous);
      return (previous ?? 0) + 1;
    },
  );
  let fail = false;
  const Counter = defineComponent("native-store-failure", () => {
    const value = useStoreAt("selected", selection);
    if (fail) throw new Error("controlled render failure");
    return jsx("span", {}, String(value));
  });
  const { root, container } = rootHarness("native-store-failure-root");
  root.mount(jsx(Counter, {}));
  fail = true;
  try {
    root.update(jsx(Counter, {}));
    throw new Error("Expected candidate render to fail");
  } catch (error) {
    if (
      !(error instanceof Error) || error.message !== "controlled render failure"
    ) {
      throw error;
    }
  }
  assertEquals(
    textContent(container.children[0]),
    "1",
    "failed candidate mutated host",
  );
  fail = false;
  root.update(jsx(Counter, {}));
  assertEquals(textContent(container.children[0]), "2");
  assertEquals(previousValues[0], undefined);
  assertEquals(previousValues[1], 1);
  assertEquals(
    previousValues[2],
    1,
    "failed candidate advanced selector history",
  );
  root.dispose();
});

Deno.test("native store transaction rebuilds a stale read cut before host publication", () => {
  const first = createAsyncStore(
    1,
    (state: number, action: number) => state + action,
  );
  const second = createAsyncStore(
    10,
    (state: number, action: number) => state + action,
  );
  let reenter = false;
  let speculativeEffects = 0;
  const Pair = defineComponent("native-store-pair", () => {
    const left = useStoreAt("left", first);
    if (reenter) {
      useEffectAt("speculative", () => {
        speculativeEffects++;
      });
      reenter = false;
      first.dispatch(1);
      second.dispatch(1);
    }
    const right = useStoreAt("right", second);
    return jsx("span", {}, `${left},${right}`);
  });
  const writes: string[] = [];
  class RecordingHost extends MemoryVDOMHost {
    override setText(node: MemoryNode, value: string) {
      writes.push(value);
      super.setText(node, value);
    }
  }
  const host = new RecordingHost();
  const container = host.createContainer();
  const root = new ComponentStateRoot(host, container, {
    rootId: "native-store-reentrant-root",
    scheduleCommit: () => {},
    renderPreparation: "repeatable",
  });
  root.mount(jsx(Pair, {}));
  reenter = true;
  root.update(jsx(Pair, {}));
  assertEquals(textContent(container.children[0]), "2,11");
  assertEquals(writes.join("|"), "2,11", "stale candidate reached the host");
  assertEquals(speculativeEffects, 0, "stale candidate activated an effect");
  root.dispose();
});

Deno.test("native store values keep promises ordinary and retired owners release readers", () => {
  let resolvePromise!: (value: string) => void;
  const promise = new Promise<string>((resolve) => resolvePromise = resolve);
  const store = createAsyncStore<Promise<string> | string>(promise);
  let show = true;
  const Value = defineComponent("native-store-promise", () => {
    const value = useStoreAt("value", store);
    return jsx("span", {}, value instanceof Promise ? "pending-value" : value);
  });
  const host = new MemoryVDOMHost();
  const container = host.createContainer();
  const scheduled: Array<() => void> = [];
  const root = new ComponentStateRoot(host, container, {
    rootId: "native-store-promise-root",
    scheduleCommit: (commit) => scheduled.push(commit),
  });
  const tree = () => jsx("div", {}, show ? jsx(Value, {}) : null);
  root.mount(tree());
  assertEquals(textContent(container.children[0]), "pending-value");
  resolvePromise("resolved");
  store.dispatch("ready");
  root.flush();
  assertEquals(textContent(container.children[0]), "ready");

  show = false;
  root.update(tree());
  assertEquals(
    store.diagnostics().readers,
    0,
    "retired owner reader history leaked",
  );
  assertEquals(
    store.diagnostics().listeners,
    0,
    "retired owner subscription leaked",
  );
  root.dispose();
});

Deno.test("mixed store roots keep numeric prop updates on the no-render path", () => {
  const store = createAsyncStore(
    "A",
    (_state: string, action: string) => action,
  );
  const history: unknown[] = [];
  const selection = store.select<string>(
    (state, previous: string | undefined) => {
      history.push(previous);
      return state;
    },
  );
  let setHot!: (value: number) => boolean;
  let hotRenders = 0;
  let committedOutput: MemoryNode | undefined;
  const effectValues: unknown[] = [];
  const PublishedProbe = defineComponent("native-store-mixed-publication-probe", () => {
    useEffectAt("observe", () => {
      effectValues.push(committedOutput?.props["data-value"]);
    });
    return null;
  });
  const Badge = defineComponent(
    "native-store-mixed-badge",
    () => {
      const value = useStoreAt("label", selection);
      return jsx("label", {}, value, value === "B" ? jsx(PublishedProbe, {}) : null);
    },
  );
  const Hot = defineComponent("native-store-mixed-hot", () => {
    hotRenders++;
    const [_value, set] = useStateAt("value", 0);
    setHot = set;
    return jsx("output", {
      "data-value": bindStatePropsAt(["value"], ([value]) => value),
    });
  }, { propOnlySites: ["value"] });
  const { root, container } = rootHarness("native-store-mixed-root");
  assertEquals(root.rootId, "native-store-mixed-root");
  root.mount(jsx("div", {}, [jsx(Badge, {}), jsx(Hot, {})]));
  const output = container.children[0].children[1];
  committedOutput = output;
  assertEquals(output.props["data-value"], 0);
  assertEquals(hotRenders, 1);
  assertEquals(history.length, 1);

  setHot(1);
  root.flush();
  assertEquals(output.props["data-value"], 1);
  assertEquals(hotRenders, 1, "local numeric update re-executed the hot owner");
  assertEquals(history.length, 1, "local numeric update reran store selectors");

  store.dispatch("B");
  setHot(2);
  root.flush();
  assertEquals(textContent(container.children[0]), "B");
  assertEquals(output.props["data-value"], 2);
  assertEquals(
    hotRenders,
    1,
    "coordinated store/local update stages numeric props without rerunning the hot owner",
  );
  assertEquals(effectValues.length, 1, "new store branch effect did not activate");
  assertEquals(effectValues[0], 2, "effect observed stale numeric props after store publication");
  assertEquals(history.length, 2, "coordinated candidate lost or duplicated selector history");
  root.dispose();
});

Deno.test("failed store publication remains pending for a later flush retry", () => {
  const store = createAsyncStore(
    0,
    (state: number, action: number) => state + action,
  );
  let fail = false;
  const Value = defineComponent("native-store-retry", () => {
    const value = useStoreAt("value", store);
    if (fail) throw new Error("retry after failure");
    return jsx("span", {}, String(value));
  });
  const { root, container } = rootHarness("native-store-retry-root");
  root.mount(jsx(Value, {}));
  store.dispatch(1);
  fail = true;
  try {
    root.flush();
    throw new Error("Expected store candidate to fail");
  } catch (error) {
    if (!(error instanceof Error) || error.message !== "retry after failure") {
      throw error;
    }
  }
  assertEquals(textContent(container.children[0]), "0");
  fail = false;
  assertEquals(
    root.flush(),
    true,
    "failed notification was cleared before publication",
  );
  assertEquals(textContent(container.children[0]), "1");
  root.dispose();
});

Deno.test("switching or retiring a native store read releases old root readers", () => {
  const first = createAsyncStore("first");
  const second = createAsyncStore("second");
  let selected = first;
  let visible = true;
  const Reader = defineComponent(
    "native-store-switch",
    () => jsx("span", {}, visible ? useStoreAt("value", selected) : "hidden"),
  );
  const { root, container } = rootHarness("native-store-switch-root");
  const tree = () => jsx(Reader, {});
  root.mount(tree());
  assertEquals(textContent(container.children[0]), "first");
  selected = second;
  root.update(tree());
  assertEquals(textContent(container.children[0]), "second");
  assertEquals(first.diagnostics().listeners, 0);
  assertEquals(first.diagnostics().readers, 0);
  assertEquals(second.diagnostics().listeners, 1);
  visible = false;
  root.update(tree());
  assertEquals(textContent(container.children[0]), "hidden");
  assertEquals(second.diagnostics().listeners, 0);
  assertEquals(second.diagnostics().readers, 0);
  root.dispose();
});
