import {
  bindStatePropsAt,
  ComponentStateRoot,
  defineComponent,
  renderCollectionAt,
  useEffectAt,
  useStateAt,
  useStoreAt,
} from "./component_state_runtime.ts";
import { createAsyncStore } from "./async_store_runtime.ts";
import { createKeyedCollection } from "./keyed_collection.ts";
import { Fragment, jsx } from "./jsx_binding_runtime.ts";
import { type MemoryNode, MemoryVDOMHost } from "./vdom_snapshot_runtime.ts";

const equal = (actual: unknown, expected: unknown, message: string) => {
  if (!Object.is(actual, expected)) {
    throw new Error(`${message}: expected ${String(expected)}, got ${String(actual)}`);
  }
};

Deno.test("native style bindings use the whole property contract when the host lacks style field writes", () => {
  const host = new MemoryVDOMHost();
  Object.defineProperty(host, "setStyleProp", { value: undefined });
  const container = host.createContainer();
  const root = new ComponentStateRoot(host, container, { scheduleCommit() {} });
  let set!: (value: number) => boolean;
  const View = defineComponent("direct-no-style-capability", () => {
    const [, update] = useStateAt("x", 1);
    set = update;
    return jsx("i", { style: { color: "navy", left: bindStatePropsAt(["x"], ([x]) => `${x}px`) } });
  }, { propOnlySites: ["x"] });
  root.mount(jsx(View, {}));
  set(4);
  root.flush();
  equal(JSON.stringify(container.children[0].props.style), JSON.stringify({color:"navy",left:"4px"}), "whole-style host retains static fields");
  root.dispose();
});

Deno.test("native roots write changed bound style properties without replacing static styles", () => {
  let setOpacity!: (value: number) => boolean;
  const host = new class extends MemoryVDOMHost {
    styleWrites: Array<[string, unknown]> = [];
    aggregateStyleWrites = 0;
    override setStyleProp(node: MemoryNode, name: string, value: unknown, previous?: unknown) {
      this.styleWrites.push([name, value]);
      super.setStyleProp(node, name, value);
    }
    override setProp(node: MemoryNode, name: string, value: unknown, previous?: unknown) {
      if (name === "style") this.aggregateStyleWrites++;
      super.setProp(node, name, value, previous);
    }
  }();
  const container = host.createContainer();
  const root = new ComponentStateRoot(host, container, { scheduleCommit() {} });
  const Styled = defineComponent("direct-writer-style", () => {
    const [opacity, set] = useStateAt("opacity", 0.25);
    setOpacity = set;
    return jsx("div", {
      style: {
        color: "navy",
        opacity: bindStatePropsAt(["opacity"], ([next]) => next),
      },
    });
  }, { propOnlySites: ["opacity"] });

  root.mount(jsx(Styled, {}));
  host.styleWrites.length = 0;
  host.aggregateStyleWrites = 0;
  setOpacity(0.75);
  root.flush();

  equal(host.styleWrites.length, 1, "only the changed bound style property is written");
  equal(host.styleWrites[0][0], "opacity", "writer targets the bound property");
  equal(host.styleWrites[0][1], 0.75, "writer carries the new property value");
  equal(host.aggregateStyleWrites, 0, "numeric update does not replace the style aggregate");
  equal(JSON.stringify(container.children[0].props.style), JSON.stringify({ color: "navy", opacity: 0.75 }), "static style survives the direct write");
  root.dispose();
});

Deno.test("native roots batch compounded bindings on store and structural candidates before effects", () => {
  const store = createAsyncStore(0, (state: number, amount: number) => state + amount);
  let setX!: (value: number) => boolean;
  let setY!: (value: number) => boolean;
  let show!: (value: boolean) => boolean;
  const seen: number[] = [];
  const writes: unknown[] = [];
  const host = new class extends MemoryVDOMHost {
    override setProp(node: MemoryNode, name: string, value: unknown, previous?: unknown) {
      if (name === "data-total") writes.push(value);
      super.setProp(node, name, value, previous);
    }
  }();
  const container = host.createContainer();
  const root = new ComponentStateRoot(host, container, { scheduleCommit() {} });
  const Values = defineComponent("direct-writer-values", () => {
    const [, x] = useStateAt("x", 1);
    const [, y] = useStateAt("y", 2);
    setX = x;
    setY = y;
    return jsx("output", {
      "data-total": bindStatePropsAt(["x", "y"], ([a, b]) => a + b),
    });
  }, { propOnlySites: ["x", "y"] });
  const Observer = defineComponent("direct-writer-observer", () => {
    useEffectAt("observe", () => {
      const output = container.children[0];
      if (output) seen.push(output.props["data-total"] as number);
    });
    return jsx("i", {});
  });
  const ShapeAndStore = defineComponent("direct-writer-shape-store", () => {
    const [visible, setVisible] = useStateAt("visible", false);
    show = setVisible;
    const version = useStoreAt("version", store);
    return jsx(Fragment, {}, [
      jsx("span", {}, String(version)),
      visible ? jsx(Observer, {}) : null,
    ]);
  });

  root.mount(jsx(Fragment, {}, [jsx(Values, {}), jsx(ShapeAndStore, {})]));
  writes.length = 0;
  setX(4);
  setY(7);
  show(true);
  store.dispatch(1);
  root.flush();

  equal(writes.length, 1, "compound prop is written once for the candidate");
  equal(writes[0], 11, "compound writer sees the complete source tuple");
  equal(seen.join(","), "11", "effect sees the staged numeric result after host commit");
  root.dispose();
  equal(store.diagnostics().roots, 0, "store reader is released on disposal");
});

Deno.test("native direct writer keeps a reentrant state write for the next flush", () => {
  let setValue!: (value: number) => boolean;
  let reenter = false;
  const writes: number[] = [];
  const host = new class extends MemoryVDOMHost {
    override setProp(node: MemoryNode, name: string, value: unknown, previous?: unknown) {
      if (name === "data-value") {
        writes.push(value as number);
        if (reenter) {
          reenter = false;
          setValue(9);
        }
      }
      super.setProp(node, name, value, previous);
    }
  }();
  const container = host.createContainer();
  const root = new ComponentStateRoot(host, container, { scheduleCommit() {} });
  const Direct = defineComponent("direct-writer-reentrant", () => {
    const [, set] = useStateAt("value", 0);
    setValue = set;
    return jsx("output", {
      "data-value": bindStatePropsAt(["value"], ([next]) => next),
    });
  }, { propOnlySites: ["value"] });

  root.mount(jsx(Direct, {}));
  writes.length = 0;
  setValue(2);
  reenter = true;
  root.flush();
  equal(writes.join(","), "2", "first host pass uses its captured value");
  equal(root.diagnostics().pendingChangeCount, 1, "reentrant value remains queued");
  root.flush();
  equal(writes.join(","), "2,9", "next pass writes the reentrant value");
  equal(container.children[0].props["data-value"], 9, "host contains the newest value");
  root.dispose();
});

type Row = { id: string; initial: number };
Deno.test("native direct bindings retain keyed hosts across insert and move and release removed sources", () => {
  const collection = createKeyedCollection<Row>([
    { id: "a", initial: 1 },
    { id: "b", initial: 2 },
  ], (row) => row.id);
  const setters = new Map<string, (value: number) => boolean>();
  const writes: unknown[] = [];
  const counters: Array<Readonly<Record<string, number>>> = [];
  const host = new class extends MemoryVDOMHost {
    override setProp(node: MemoryNode, name: string, value: unknown, previous?: unknown) {
      if (name === "data-value") writes.push(value);
      super.setProp(node, name, value, previous);
    }
  }();
  const container = host.createContainer();
  const root = new ComponentStateRoot(host, container, {
    scheduleCommit() {},
    profileCounter: (values) => counters.push(values),
  });
  const Item = defineComponent<{ row: Row }>("direct-writer-keyed-row", ({ row }) => {
    const [value, set] = useStateAt("value", row.initial);
    setters.set(row.id, set);
    return jsx("li", {
      "data-id": row.id,
      "data-value": bindStatePropsAt(["value"], ([next]) => next),
    });
  }, { propOnlySites: ["value"] });
  const List = defineComponent<{ collection: typeof collection }>("direct-writer-keyed-list", ({ collection: rows }) =>
    jsx("ul", {}, renderCollectionAt("direct-writer-keyed-region", rows, (row) => jsx(Item, { row })))
  );

  root.mount(jsx(List, { collection }));
  const list = container.children[0];
  const initialA = list.children[0];
  const initialB = list.children[1];
  const removeSetter = setters.get("a")!;
  writes.length = 0;
  collection.apply(collection.version, [
    { type: "insert", key: "c", value: { id: "c", initial: 3 }, beforeKey: "b" },
    { type: "move", key: "b", beforeKey: null },
  ]);
  root.flush();
  equal(list.children.map((node) => node.props["data-id"]).join(","), "a,c,b", "keyed insert and move order");
  equal(list.children[0], initialA, "unmoved keyed node keeps its identity");
  equal(list.children[2], initialB, "moved keyed node keeps its identity");
  const delta = counters.at(-1) ?? {};
  equal(delta["vdom.keyed-region-delta.operations"], 2, "keyed delta path handles the changes");
  equal(delta["owner.full-expand"] ?? 0, 0, "keyed candidate avoids full owner expansion");

  writes.length = 0;
  collection.apply(collection.version, [{ type: "remove", key: "a" }]);
  root.flush();
  const writesAfterRemoval = writes.length;
  let removedSourceRejected = false;
  try {
    removeSetter(9);
  } catch {
    removedSourceRejected = true;
  }
  equal(removedSourceRejected, true, "removed row source is no longer live");
  root.flush();
  equal(writes.length, writesAfterRemoval, "removed row has no registered writer");
  equal(list.children.map((node) => node.props["data-id"]).join(","), "c,b", "remove updates the keyed order");
  equal(list.children[1], initialB, "surviving moved row keeps its identity after removal");
  root.dispose();
  equal(collection.stats().readerCount, 0, "keyed collection reader is released");
});

Deno.test("empty-start roots use direct style writers after keyed schema discovery", () => {
  const collection = createKeyedCollection<Row>([], (row) => row.id);
  const setters = new Map<string, (value: number) => boolean>();
  let rowRenders = 0;
  const counters: Array<Readonly<Record<string, number>>> = [];
  const host = new class extends MemoryVDOMHost {
    styleWrites: Array<[string, unknown]> = [];
    aggregateStyleWrites = 0;
    override setStyleProp(node: MemoryNode, name: string, value: unknown, previous?: unknown) {
      this.styleWrites.push([name, value]);
      super.setStyleProp(node, name, value);
    }
    override setProp(node: MemoryNode, name: string, value: unknown, previous?: unknown) {
      if (name === "style") this.aggregateStyleWrites++;
      super.setProp(node, name, value, previous);
    }
  }();
  const container = host.createContainer();
  const root = new ComponentStateRoot(host, container, {
    scheduleCommit() {},
    profileCounter: (values) => counters.push(values),
  });
  const StyledRow = defineComponent<{ row: Row }>("direct-writer-first-keyed-row", ({ row }) => {
    rowRenders++;
    const [value, set] = useStateAt("value", row.initial);
    setters.set(row.id, set);
    return jsx("li", {
      "data-id": row.id,
      style: {
        color: "teal",
        opacity: bindStatePropsAt(["value"], ([next]) => next),
      },
    });
  }, { propOnlySites: ["value"], hostLeafOutput: true });
  const List = defineComponent<{ collection: typeof collection }>("direct-writer-first-keyed-list", ({ collection: rows }) =>
    jsx("ul", {}, renderCollectionAt("direct-writer-first-keyed-region", rows, (row) => jsx(StyledRow, { row })))
  );

  root.mount(jsx(List, { collection }));
  equal(rowRenders, 0, "empty collection has no row owner");
  collection.apply(collection.version, [{ type: "insert", key: "first", value: { id: "first", initial: 0.2 }, beforeKey: null }]);
  root.flush();
  const list = container.children[0];
  const insertedRow = list.children[0];
  equal(rowRenders, 1, "insert renders the new row once");

  collection.apply(collection.version, [{ type: "insert", key: "second", value: { id: "second", initial: 0.4 }, beforeKey: null }]);
  root.flush();
  const deltaCounters = counters.at(-1) ?? {};
  equal(deltaCounters["collection.delta-operations"], 1, "keyed delta stays active after the first rendered row establishes its component site");
  equal(list.children[0], insertedRow, "existing row keeps its host identity through keyed insertion");
  equal(rowRenders, 2, "keyed insertion renders only the new row");

  host.styleWrites.length = 0;
  host.aggregateStyleWrites = 0;
  setters.get("first")!(0.8);
  root.flush();

  equal(rowRenders, 2, "numeric update does not rerender either row");
  equal(host.styleWrites.length, 1, "numeric update uses one style-field writer");
  equal(host.styleWrites[0][0], "opacity", "style-field writer targets the bound property");
  equal(host.styleWrites[0][1], 0.8, "style-field writer sends the updated value");
  equal(host.aggregateStyleWrites, 0, "numeric update does not replace the full style object");
  equal(JSON.stringify(insertedRow.props.style), JSON.stringify({ color: "teal", opacity: 0.8 }), "static style remains intact");
  root.dispose();
  equal(collection.stats().readerCount, 0, "empty-start collection reader is released");
});
