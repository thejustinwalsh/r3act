import { bind, bindSources, jsx, ScalarSource } from "./jsx_binding_runtime.ts";
import {
  type MemoryNode,
  MemoryVDOMHost,
  VDOMSnapshotRoot,
} from "./vdom_snapshot_runtime.ts";

const equal = (actual: unknown, expected: unknown, message: string) => {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(
      `${message}: expected ${JSON.stringify(expected)}, got ${
        JSON.stringify(actual)
      }`,
    );
  }
};

const harness = (
  directBindingWrites = false,
  counters?: Array<Record<string, number>>,
  host = new MemoryVDOMHost(),
) => {
  const container = host.createContainer();
  const root = new VDOMSnapshotRoot(
    host,
    container,
    undefined,
    counters ? (values) => counters.push({ ...values }) : undefined,
  );
  return { root, host, container, directBindingWrites };
};

const region = (
  key: string,
  source: ScalarSource,
  other: ScalarSource,
  title: string,
  includeBindings = true,
  ref?: unknown,
) =>
  jsx(
    "section",
    {
      key,
      title,
      ...(ref ? { ref } : {}),
    },
    jsx("i", {
      key: `${key}-value`,
      ...(includeBindings
        ? {
          style: { left: bind(source, (value) => value * 2) },
          "data-sum": bindSources([source, other], ([a, b]) => a + b),
        }
        : { "data-value": title }),
    }),
  );

Deno.test("prepared keyed regions update shared ordinary and direct bindings", () => {
  for (const direct of [false, true]) {
    const a = new ScalarSource(direct ? 10 : 1, 2);
    const b = new ScalarSource(direct ? 11 : 2, 5);
    const { root, container } = harness(direct);
    root.commit(
      jsx("main", {}, [
        region("left", a, b, "before-left"),
        region("right", a, b, "before-right"),
        jsx("aside", { key: "unrelated", title: "steady" }),
      ]),
      null,
      direct,
    );

    const leftRef = { current: null as unknown };
    const left = region("left", b, a, "after-left", true, leftRef);
    const right = region("right", a, b, "after-right", false);
    const prepared = root.prepareKeyedRegions([
      { key: "left", tree: left },
      { key: "right", tree: right },
    ]);
    if (!prepared) throw new Error("Expected disjoint regions to prepare");
    prepared.commit();
    equal(leftRef.current, null, "refs stay staged until publication");
    equal(
      root.hasBoundSource(a),
      true,
      "shared source remains bound by left compound prop",
    );
    equal(
      root.hasBoundSource(b),
      true,
      "switched source remains bound by left style",
    );

    root.flushRefs();
    const leftHost = container.children[0].children[0];
    if (leftRef.current !== leftHost) {
      throw new Error("ref publishes the region host node");
    }
    root.setSources([[a, 7], [b, 13]]);
    equal(
      leftHost.children[0].props["data-sum"],
      20,
      "left compound binding updates",
    );
    equal(
      leftHost.children[0].props.style,
      { left: 26 },
      "left direct/ordinary style updates",
    );

    const removeEveryA = root.prepareKeyedRegions([
      {
        key: "left",
        tree: jsx(
          "section",
          { key: "left", title: "remove-a" },
          jsx("i", {
            key: "left-value",
            style: { left: bind(b, (value) => value * 3) },
          }),
        ),
      },
      { key: "right", tree: region("right", a, b, "right-clean", false) },
    ]);
    if (!removeEveryA) throw new Error("Expected binding removal to prepare");
    removeEveryA.commit();
    equal(
      root.hasBoundSource(a),
      false,
      "removed source groups detach across regions",
    );
    let oldSourceRejected = false;
    try {
      root.setSource(a, 99);
    } catch {
      oldSourceRejected = true;
    }
    equal(oldSourceRejected, true, "removed source has no stale writer");
    root.dispose();
  }
});

Deno.test("prepared regions reject stale, overlapping, and colliding candidates before writes", () => {
  const { root, host, container } = harness();
  root.commit(jsx("main", {}, [
    jsx("section", { key: "parent", title: "old" }, [
      jsx("i", { key: "child", title: "child" }),
    ]),
    jsx("section", { key: "other", title: "other" }),
  ]));

  equal(
    root.prepareKeyedRegions([
      {
        key: "parent",
        tree: jsx("section", { key: "parent" }, jsx("i", { key: "other" })),
      },
    ]),
    null,
    "collision with a surviving key returns null",
  );
  equal(
    root.prepareKeyedRegions([
      {
        key: "parent",
        tree: jsx("section", { key: "parent" }, jsx("i", { key: "child" })),
      },
      { key: "child", tree: jsx("i", { key: "child" }) },
    ]),
    null,
    "nested targets are not disjoint",
  );

  const stale = root.prepareKeyedRegions([
    {
      key: "parent",
      tree: jsx(
        "section",
        { key: "parent", title: "prepared" },
        jsx("i", { key: "child" }),
      ),
    },
  ]);
  if (!stale) throw new Error("Expected candidate to prepare");
  const competing = root.prepareKeyedRegions([
    { key: "other", tree: jsx("section", { key: "other", title: "newer" }) },
  ]);
  if (!competing) throw new Error("Expected competing candidate to prepare");
  competing.commit();
  const writes = host.writeCount;
  let staleRejected = false;
  try {
    stale.commit();
  } catch (error) {
    staleRejected = error instanceof Error && error.message.includes("stale");
  }
  equal(staleRejected, true, "root version rejects stale candidate");
  equal(host.writeCount, writes, "stale candidate performs no host writes");
  equal(
    container.children[0].children[0].props.title,
    "old",
    "stale region remains untouched",
  );
  root.dispose();
});

Deno.test("prepared region work counts target subtrees, not unrelated siblings", () => {
  const counters: Array<Record<string, number>> = [];
  const source = new ScalarSource(30, 1);
  const other = new ScalarSource(31, 2);
  const { root } = harness(false, counters);
  root.commit(jsx("main", {}, [
    region("target", source, other, "before"),
    ...Array.from(
      { length: 40 },
      (_, index) =>
        jsx("aside", { key: `outside-${index}`, title: "unchanged" }),
    ),
  ]));
  counters.length = 0;
  const prepared = root.prepareKeyedRegions([
    { key: "target", tree: region("target", source, other, "after") },
  ]);
  if (!prepared) throw new Error("Expected target candidate to prepare");
  prepared.commit();
  const counts = Object.assign({}, ...counters);
  equal(
    counts["vdom.prepared-keyed-regions.old-subtree-visits"],
    2,
    "old target nodes checked",
  );
  equal(
    counts["vdom.prepared-keyed-regions.validation-node-visits"],
    2,
    "candidate target nodes checked",
  );
  equal(
    counts["vdom.prepared-keyed-regions.new-candidate-key-visits"],
    2,
    "candidate target keys checked",
  );
  equal(
    counts["vdom.key-index.incremental-old-visits"],
    0,
    "props-only update detaches no keys",
  );
  root.dispose();
});

Deno.test("disposing before ref publication abandons staged refs", () => {
  const source = new ScalarSource(40, 1);
  const other = new ScalarSource(41, 2);
  const { root } = harness();
  const oldInstances: unknown[] = [];
  const newInstances: unknown[] = [];
  const oldRef = (value: unknown) => oldInstances.push(value);
  const newRef = (value: unknown) => newInstances.push(value);
  root.commit(
    jsx("main", {}, region("left", source, other, "old", false, oldRef)),
  );
  const prepared = root.prepareKeyedRegions([
    { key: "left", tree: region("left", source, other, "new", false, newRef) },
  ]);
  if (!prepared) throw new Error("Expected ref candidate to prepare");
  prepared.commit();
  equal(newInstances.length, 0, "new callback has not published");
  root.dispose();
  equal(oldInstances.length, 2, "published ref is detached on dispose");
  equal(oldInstances[1], null, "published ref receives null");
  equal(newInstances.length, 0, "unpublished callback is abandoned");
});

Deno.test("host failure repairs binding ownership and retains original error", () => {
  class FailingHost extends MemoryVDOMHost {
    fail = false;
    override setProp(
      node: MemoryNode,
      name: string,
      value: unknown,
      previous: unknown,
    ) {
      if (this.fail && name === "title") {
        this.fail = false;
        throw new Error("prepared-region host failure");
      }
      super.setProp(node, name, value, previous);
    }
  }
  const source = new ScalarSource(50, 1);
  const other = new ScalarSource(51, 2);
  const candidateSource = new ScalarSource(52, 3);
  const host = new FailingHost();
  const { root } = harness(false, undefined, host);
  root.commit(jsx("main", {}, region("left", source, other, "old")));
  const prepared = root.prepareKeyedRegions([
    { key: "left", tree: region("left", candidateSource, other, "new") },
  ]);
  if (!prepared) throw new Error("Expected candidate to prepare");
  host.fail = true;
  let failure: unknown;
  try {
    prepared.commit();
  } catch (error) {
    failure = error;
  }
  equal(
    failure instanceof Error &&
      failure.message.includes("prepared-region host failure"),
    true,
    "original host failure propagates",
  );
  equal(
    root.hasBoundSource(source),
    true,
    "pre-commit source index is repaired",
  );
  equal(
    root.hasBoundSource(candidateSource),
    false,
    "partial candidate source is not retained",
  );
  equal(
    root.hasBoundSource(other),
    true,
    "existing compound source remains indexed",
  );
  root.dispose();
});
