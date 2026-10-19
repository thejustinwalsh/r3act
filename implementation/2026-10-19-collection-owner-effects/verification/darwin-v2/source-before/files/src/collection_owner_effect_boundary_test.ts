import {
  ComponentStateRoot,
  defineComponent,
  renderCollectionAt,
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
