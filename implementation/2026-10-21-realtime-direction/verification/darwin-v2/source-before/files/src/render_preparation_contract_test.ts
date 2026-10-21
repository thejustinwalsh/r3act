import { assertEquals, assertThrows } from "jsr:@std/assert";
import { AsyncResource } from "./async_resource_runtime.ts";
import {
  ComponentStateRoot,
  defineComponent,
  renderCollectionAt,
  Suspense,
  useAt,
  useStateAt,
} from "./component_state_runtime.ts";
import { createKeyedCollection } from "./keyed_collection.ts";
import { jsx } from "./jsx_binding_runtime.ts";
import { type MemoryNode, MemoryVDOMHost } from "./vdom_snapshot_runtime.ts";

const text = (node: MemoryNode): string =>
  (node.text ?? "") + node.children.map(text).join("");

Deno.test("isolated generic preparation requires a declaration before rendering", () => {
  const host = new MemoryVDOMHost();
  const root = new ComponentStateRoot(host, host.createContainer(), {
    scheduleCommit() {},
  });
  let calls = 0;
  const View = defineComponent("render-preparation-default", () => {
    calls++;
    return jsx("output", {}, "ready");
  });
  try {
    assertEquals(root.renderPreparation, undefined);
    assertThrows(() => root.prepare(jsx(View, {})), Error,
      "renderPreparation: repeatable");
    assertEquals(calls, 0);
    root.mount(jsx(View, {}));
    assertEquals(calls, 1);
  } finally {
    root.dispose();
  }
});

Deno.test("explicit preparation may discard and rebuild generic output", () => {
  const host = new MemoryVDOMHost();
  const root = new ComponentStateRoot(host, host.createContainer(), {
    scheduleCommit() {},
  });
  let calls = 0;
  const View = defineComponent("render-preparation-declared", () => {
    calls++;
    return jsx("output", {}, String(calls));
  });
  try {
    const first = root.prepare(jsx(View, {}), {
      renderPreparation: "repeatable",
    });
    first.discard();
    const second = root.prepare(jsx(View, {}), {
      renderPreparation: "repeatable",
    });
    assertEquals(calls, 2);
    second.discard();
    assertEquals(root.version, 0);
  } finally {
    root.dispose();
  }
});

Deno.test("root declaration permits preparation and rejects invalid call flags", () => {
  const host = new MemoryVDOMHost();
  const root = new ComponentStateRoot(host, host.createContainer(), {
    renderPreparation: "repeatable",
    scheduleCommit() {},
  });
  let calls = 0;
  const View = defineComponent("render-preparation-root-capability", () => {
    calls++;
    return jsx("output", {}, "ready");
  });
  try {
    assertEquals(root.renderPreparation, "repeatable");
    assertThrows(() => root.prepare(jsx(View, {}), {
      renderPreparation: "unknown" as "repeatable",
    }), TypeError, "Unknown render preparation capability");
    assertEquals(calls, 0);
    const candidate = root.prepare(jsx(View, {}));
    assertEquals(calls, 1);
    candidate.discard();
  } finally {
    root.dispose();
  }
});

Deno.test("an opaque direct render is not replayed in its stale attempt", () => {
  const host = new MemoryVDOMHost();
  const container = host.createContainer();
  const root = new ComponentStateRoot(host, container, {
    scheduleCommit() {},
  });
  let calls = 0;
  let acceptedSetLocal!: (value: number) => boolean;
  let invalidateDuringRender = false;
  const View = defineComponent("render-preparation-direct-stale", () => {
    const [value, set] = useStateAt("local", 0);
    calls++;
    if (calls === 1) acceptedSetLocal = set;
    if (invalidateDuringRender) {
      invalidateDuringRender = false;
      acceptedSetLocal(value + 1);
    }
    return jsx("output", {}, String(value));
  });
  try {
    root.mount(jsx(View, {}));
    assertEquals(calls, 1);
    invalidateDuringRender = true;
    root.update(jsx(View, {}));
    assertEquals(calls, 2);
    assertEquals(root.version, 1);
    assertEquals(text(container.children[0]), "0");
    root.flush();
    assertEquals(calls, 3);
    assertEquals(text(container.children[0]), "1");
  } finally {
    root.dispose();
  }
});

Deno.test("declared direct render can retry after its own stale preparation", () => {
  const host = new MemoryVDOMHost();
  const container = host.createContainer();
  const root = new ComponentStateRoot(host, container, {
    renderPreparation: "repeatable",
    scheduleCommit() {},
  });
  let calls = 0;
  let acceptedSetLocal!: (value: number) => boolean;
  let invalidateDuringRender = false;
  const View = defineComponent("render-preparation-repeatable-stale", () => {
    const [value, set] = useStateAt("local", 0);
    calls++;
    if (calls === 1) acceptedSetLocal = set;
    if (invalidateDuringRender) {
      invalidateDuringRender = false;
      acceptedSetLocal(value + 1);
    }
    return jsx("output", {}, String(value));
  });
  try {
    root.mount(jsx(View, {}));
    invalidateDuringRender = true;
    root.update(jsx(View, {}));
    assertEquals(calls, 3);
    assertEquals(text(container.children[0]), "1");
  } finally {
    root.dispose();
  }
});

Deno.test("a later resource wake can rerender an opaque direct boundary", async () => {
  let resolve!: (value: string) => void;
  const resource = new AsyncResource(new Promise<string>((yes) => resolve = yes));
  const host = new MemoryVDOMHost();
  const container = host.createContainer();
  const root = new ComponentStateRoot(host, container, {
    scheduleCommit() {},
  });
  let calls = 0;
  const View = defineComponent("render-preparation-resource", () => {
    calls++;
    return jsx("output", { key: "result" }, useAt("resource", resource));
  });
  const tree = jsx(Suspense, {
    key: "boundary",
    __nativeBoundarySite: "render-preparation-resource-boundary",
    fallback: jsx("output", { key: "result" }, "loading"),
    children: jsx(View, {}),
  });
  try {
    root.mount(tree);
    assertEquals(calls, 1);
    assertEquals(text(container.children[0]), "loading");
    resolve("ready");
    await Promise.resolve();
    root.flush();
    assertEquals(calls, 2);
    assertEquals(text(container.children[0]), "ready");
  } finally {
    root.dispose();
  }
});

Deno.test("key-changing owner fallback renders an unmarked component once", () => {
  const host = new MemoryVDOMHost();
  const container = host.createContainer();
  const root = new ComponentStateRoot(host, container, {
    scheduleCommit() {},
  });
  let calls = 0;
  let setLocal!: (value: number) => boolean;
  const Row = defineComponent("render-preparation-keyed-row", () => {
    const [value, set] = useStateAt("local", 0);
    setLocal = set;
    calls++;
    return jsx("li", { key: `row-${value}` }, String(value));
  });
  try {
    root.mount(jsx("ul", {}, jsx(Row, { key: "row" })));
    assertEquals(calls, 1);
    setLocal(1);
    root.flush();
    assertEquals(calls, 2);
    assertEquals(text(container.children[0]), "1");
  } finally {
    root.dispose();
  }
});

Deno.test("unmarked collection insert declines row staging before generic render", () => {
  const rows = createKeyedCollection([{ id: "a" }], (row) => row.id);
  let listCalls = 0;
  let rowCalls = 0;
  const Row = defineComponent("render-preparation-collection-row",
    ({ row }: { row: { id: string } }) => {
      rowCalls++;
      return jsx("li", {}, row.id);
    });
  const site = "render-preparation-collection-list#collection:0";
  const List = defineComponent("render-preparation-collection-list", () => {
    listCalls++;
    return jsx("ul", {}, renderCollectionAt(site, rows,
      (row) => jsx(Row, { row })));
  }, { propOnlySites: [], closedCollectionSites: [site] });
  const host = new MemoryVDOMHost();
  const container = host.createContainer();
  const root = new ComponentStateRoot(host, container, {
    scheduleCommit() {},
  });
  try {
    root.mount(jsx(List, {}));
    assertEquals(listCalls, 1);
    assertEquals(rowCalls, 1);
    assertEquals(rows.apply(rows.version, [{
      type: "insert", key: "b", value: { id: "b" }, beforeKey: null,
    }]).ok, true);
    root.flush();
    assertEquals(listCalls, 2);
    assertEquals(rowCalls, 2);
    assertEquals(text(container.children[0]), "ab");
  } finally {
    root.dispose();
  }
});
