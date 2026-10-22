import {
  ComponentStateRoot,
  defineComponent,
  renderCollectionAt,
  useEffectAt,
  useStateAt,
} from "./component_state_runtime.ts";
import { createKeyedCollection } from "./keyed_collection.ts";
import { jsx } from "./jsx_binding_runtime.ts";
import { MemoryVDOMHost } from "./vdom_snapshot_runtime.ts";

const assert = (condition: unknown, message: string) => {
  if (!condition) throw new Error(message);
};

Deno.test("collection owner skip admits only the accepted owned parent input", () => {
  const collection = createKeyedCollection([
    { id: "a" }, { id: "b" },
  ], (row) => row.id);
  const Row = defineComponent<{ row: { id: string } }>(
    "collection-boundary-row",
    ({ row }) => jsx("li", { "data-id": row.id }, row.id),
  );
  let renders = 0;
  let capturedProps: Record<string, unknown> | undefined;
  const site = "collection-boundary#component:List#collection:0";
  const List = defineComponent<{ collection: typeof collection }>(
    "collection-boundary#component:List",
    (props) => {
      renders++;
      capturedProps = props;
      return jsx("ul", {}, renderCollectionAt(
        site, props.collection, (row) => jsx(Row, { row }),
      ));
    },
    { propOnlySites: [], closedCollectionSites: [site] },
  );
  const host = new MemoryVDOMHost();
  const container = host.createContainer();
  const root = new ComponentStateRoot(host, container, { scheduleCommit() {} });
  try {
    root.mount(jsx(List, { collection }));
    assert(renders === 1 && Object.isFrozen(capturedProps),
      "owned parent private props were not frozen before invocation");
    assert(collection.apply(collection.version, [{
      type: "move", key: "b", beforeKey: "a",
    }]).ok, "owned move failed");
    assert(root.flush(), "owned collection change did not flush");
    assert(renders === 1, "eligible owned parent rerendered");
    assert(container.children[0].children[0].props["data-id"] === "b",
      "owned sparse row move did not publish");

    const rawProps = { collection };
    root.update({ type: List, props: rawProps });
    const afterRaw = renders;
    assert(afterRaw > 1 && !Object.isFrozen(capturedProps),
      "unowned parent did not take generic render");
    if (capturedProps) Object.freeze(capturedProps);
    assert(collection.apply(collection.version, [{
      type: "insert", key: "c", value: { id: "c" }, beforeKey: null,
    }]).ok, "unowned insert failed");
    assert(root.flush(), "unowned collection change did not flush");
    assert(renders > afterRaw,
      "late-frozen unowned private props upgraded collection owner skip");
    assert(container.children[0].children.length === 3,
      "generic unowned row insert did not publish");
  } finally {
    root.dispose();
  }
});

Deno.test("generic collection fallback preserves same-key incarnation lifetime", () => {
  const collection = createKeyedCollection([{ id: "a", value: 1, hostKey: "one" }],
    (row) => row.id);
  const setups: number[] = [];
  const cleanups: number[] = [];
  const Row = defineComponent<{ row: { id: string; value: number; hostKey: string } }>(
    "collection-incarnation#component:Row",
    ({ row }) => {
      const [count, setCount] = useStateAt("collection-incarnation#state:0", 0);
      useEffectAt("collection-incarnation#effect:0", () => {
        setups.push(row.value);
        return () => cleanups.push(row.value);
      });
      return jsx("li", {
        key: row.hostKey,
        "data-count": count,
        onClick: () => setCount((value) => value + 1),
      }, `${row.value}:${count}`);
    },
  );
  const site = "collection-incarnation#component:List#collection:0";
  const List = defineComponent<{ collection: typeof collection }>(
    "collection-incarnation#component:List",
    ({ collection: source }) => jsx("ul", {}, renderCollectionAt(
      site, source, (row) => jsx(Row, { row }),
    )),
    { propOnlySites: [], closedCollectionSites: [site] },
  );
  const host = new MemoryVDOMHost();
  const container = host.createContainer();
  const root = new ComponentStateRoot(host, container, { scheduleCommit() {} });
  try {
    root.mount(jsx(List, { collection }));
    const oldNode = container.children[0].children[0];
    (oldNode.props.onClick as () => void)();
    assert(root.flush(), "initial row state did not flush");
    assert(oldNode.props["data-count"] === 1, "initial row state was not accepted");
    assert(collection.apply(collection.version, [
      { type: "remove", key: "a" },
      { type: "insert", key: "a", value: { id: "a", value: 2, hostKey: "one" }, beforeKey: null },
    ]).ok, "same-key replacement batch failed");
    assert(root.flush(), "generic replacement did not flush");
    const nextNode = container.children[0].children[0];
    assert(nextNode !== oldNode && nextNode.props["data-count"] === 0,
      "generic fallback reused a retired host or row state");
    assert(setups.join(",") === "1,2" && cleanups.join(",") === "1",
      "generic replacement did not retire the old effect lifetime once");
    (nextNode.props.onClick as () => void)();
    assert(root.flush() && container.children[0].children[0] === nextNode &&
      nextNode.props["data-count"] === 1,
      "new owner state rerender changed its scoped explicit host key");
    assert(collection.apply(collection.version, [{
      type: "replace", key: "a", value: { id: "a", value: 3, hostKey: "one" },
    }]).ok && root.flush(), "generic row value replacement failed");
    assert(container.children[0].children[0] === nextNode,
      "unchanged authored host key remounted on a generic prop update");
    assert(collection.apply(collection.version, [{
      type: "replace", key: "a", value: { id: "a", value: 4, hostKey: "two" },
    }]).ok && root.flush(), "authored host key change failed");
    assert(container.children[0].children[0] !== nextNode,
      "changed authored host key failed to remount the host");
  } finally {
    root.dispose();
  }
});

Deno.test("generic parent mutation before mapping captures a fresh row incarnation", () => {
  const collection = createKeyedCollection([{ id: "a" }], (row) => row.id);
  let replaceBeforeMap = false;
  const Row = defineComponent<{ row: { id: string } }>("collection-parent-mutation-row", ({ row }) => {
    const [count, setCount] = useStateAt("collection-parent-mutation-count", 0);
    return jsx("li", { key: row.id, "data-count": count,
      onClick: () => setCount((value) => value + 1) });
  });
  const List = defineComponent("collection-parent-mutation-list", () => {
    if (replaceBeforeMap) {
      replaceBeforeMap = false;
      assert(collection.apply(collection.version, [
        { type: "remove", key: "a" },
        { type: "insert", key: "a", value: { id: "a" }, beforeKey: null },
      ]).ok, "parent replacement failed");
    }
    return jsx("ul", {}, renderCollectionAt("collection-parent-mutation-rows",
      collection, (row) => jsx(Row, { row }), { requiresOwnerRender: true }));
  }, { propOnlySites: [], closedCollectionSites: [] });
  const host = new MemoryVDOMHost();
  const container = host.createContainer();
  const root = new ComponentStateRoot(host, container, { scheduleCommit() {} });
  try {
    root.mount(jsx(List, {}));
    const original = container.children[0].children[0];
    const oldClick = original.props.onClick as () => boolean;
    oldClick();
    assert(root.flush() && original.props["data-count"] === 1,
      "original row state was not accepted");
    replaceBeforeMap = true;
    root.update(jsx(List, { invalidate: 1 }));
    const replacement = container.children[0].children[0];
    assert(replacement !== original && replacement.props["data-count"] === 0,
      "parent's fresh collection snapshot reused the old incarnation");
    let staleError: unknown;
    try { oldClick(); } catch (error) { staleError = error; }
    assert(staleError instanceof Error && /Owner \d+ is not alive/.test(staleError.message),
      "generic retired-row setter did not preserve the dead-owner exception");
    assert(replacement.props["data-count"] === 0 && root.diagnostics().pendingChangeCount === 0,
      "retired row setter changed accepted or pending state");
  } finally {
    root.dispose();
  }
});

Deno.test("expired collection history retains surviving rows and replaces reinserted rows", () => {
  const collection = createKeyedCollection([
    { id: "a", value: 1 }, { id: "b", value: 2 },
  ], (row) => row.id, { maxRetainedBatches: 1 });
  const Row = defineComponent<{ row: { id: string; value: number } }>(
    "collection-expired#component:Row",
    ({ row }) => {
      const [count, setCount] = useStateAt("collection-expired#state:0", 0);
      return jsx("li", {
        "data-id": row.id,
        "data-count": count,
        onClick: () => setCount((value) => value + 1),
      }, `${row.value}:${count}`);
    },
  );
  const site = "collection-expired#component:List#collection:0";
  const List = defineComponent<{ collection: typeof collection }>(
    "collection-expired#component:List",
    ({ collection: source }) => jsx("ul", {}, renderCollectionAt(
      site, source, (row) => jsx(Row, { row }),
    )),
    { propOnlySites: [], closedCollectionSites: [site] },
  );
  const host = new MemoryVDOMHost();
  const container = host.createContainer();
  const root = new ComponentStateRoot(host, container, { scheduleCommit() {} });
  try {
    root.mount(jsx(List, { collection }));
    const oldA = container.children[0].children[0];
    const oldB = container.children[0].children[1];
    (oldB.props.onClick as () => void)();
    assert(root.flush() && oldB.props["data-count"] === 1,
      "surviving row state was not accepted");
    assert(collection.apply(collection.version, [
      { type: "remove", key: "a" },
      { type: "insert", key: "a", value: { id: "a", value: 3 }, beforeKey: null },
    ]).ok, "expired-history replacement failed");
    assert(collection.apply(collection.version, [
      { type: "move", key: "b", beforeKey: "a" },
    ]).ok, "history-expiring move failed");
    assert(root.flush(), "expired-history fallback did not flush");
    const children = container.children[0].children;
    assert(children[0] === oldB && children[0].props["data-count"] === 1,
      "surviving row lost host or state after history expiry");
    assert(children[1] !== oldA && children[1].props["data-count"] === 0,
      "reinserted row reused retired host or state after history expiry");
  } finally {
    root.dispose();
  }
});

Deno.test("collection owner source proxy getter remains observable on invalidation", () => {
  const collection = createKeyedCollection([{ id: "a" }], (row) => row.id);
  const Row = defineComponent<{ row: { id: string } }>(
    "collection-getter-row",
    ({ row }) => jsx("li", {}, row.id),
  );
  const site = "collection-getter#component:List#collection:0";
  let renders = 0;
  const List = defineComponent<{ collection: typeof collection }>(
    "collection-getter#component:List",
    ({ collection: source }) => {
      renders++;
      return jsx("ul", {}, renderCollectionAt(
        site, source, (row) => jsx(Row, { row }),
      ));
    },
    { propOnlySites: [], closedCollectionSites: [site] },
  );
  let getterReads = 0;
  const source = new Proxy({ collection }, {
    get(target, key, receiver) {
      if (key === "collection") getterReads++;
      return Reflect.get(target, key, receiver);
    },
  });
  const host = new MemoryVDOMHost();
  const root = new ComponentStateRoot(host, host.createContainer(), {
    scheduleCommit() {},
  });
  try {
    root.mount({ type: List, props: source });
    assert(renders === 1 && getterReads > 0, "source getter was not read");
    assert(collection.apply(collection.version, [{
      type: "insert", key: "b", value: { id: "b" }, beforeKey: null,
    }]).ok, "proxy insert failed");
    assert(root.flush(), "proxy collection change did not flush");
    assert(renders === 2 && getterReads > 1,
      "unowned proxy parent was skipped on collection invalidation");
  } finally {
    root.dispose();
  }
});

Deno.test("changed canonical collection API forces generic parent rendering", () => {
  for (const changed of ["snapshot", "version"] as const) {
    const collection = createKeyedCollection([
      { id: "a" }, { id: "b" },
    ], (row) => row.id);
    const Row = defineComponent<{ row: { id: string } }>(
      `collection-api-${changed}-row`,
      ({ row }) => jsx("li", { "data-id": row.id }, row.id),
    );
    const site = `collection-api-${changed}#component:List#collection:0`;
    let renders = 0;
    const List = defineComponent<{ collection: typeof collection }>(
      `collection-api-${changed}#component:List`,
      ({ collection: source }) => {
        renders++;
        return jsx("ul", {}, renderCollectionAt(
          site, source, (row) => jsx(Row, { row }),
        ));
      },
      { propOnlySites: [], closedCollectionSites: [site] },
    );
    const host = new MemoryVDOMHost();
    const container = host.createContainer();
    const root = new ComponentStateRoot(host, container, { scheduleCommit() {} });
    try {
      root.mount(jsx(List, { collection }));
      let publicReads = 0;
      if (changed === "snapshot") {
        const original = collection.snapshot;
        collection.snapshot = () => {
          publicReads++;
          return original();
        };
      } else {
        const original = Object.getOwnPropertyDescriptor(collection, "version")!.get!;
        Object.defineProperty(collection, "version", { configurable: true,
          enumerable: true, get() {
            publicReads++;
            return original.call(collection);
          } });
      }
      assert(collection.apply(0, [{
        type: "move", key: "b", beforeKey: "a",
      }]).ok, "canonical move failed");
      assert(root.flush(), "changed canonical API did not flush");
      assert(renders === 2 && publicReads > 0,
        `${changed} replacement was skipped instead of observed generically`);
      assert(container.children[0].children[0].props["data-id"] === "b",
        "generic canonical move did not publish");
    } finally {
      root.dispose();
    }
  }
});
