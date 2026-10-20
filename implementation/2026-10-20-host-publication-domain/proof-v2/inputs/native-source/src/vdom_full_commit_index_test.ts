import {
  jsx,
  keyedOwnerChildren,
  type RuntimeNode,
} from "./jsx_binding_runtime.ts";
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

const hostShape = (node: MemoryNode): unknown => ({
  tag: node.tag,
  text: node.text,
  props: node.props,
  children: node.children.map(hostShape),
});

const treeFor = (
  seed: number,
  leftKeys: readonly string[],
  rightKeys: readonly string[],
  leftRegion = "left-rows",
  rightRegion = "right-rows",
): RuntimeNode =>
  jsx("main", {}, [
    jsx(
      "section",
      { key: "branch-left", "data-seed": seed },
      keyedOwnerChildren(
        leftRegion,
        leftKeys.map((key) => jsx("i", { key, "data-seed": seed }, key)),
      ),
    ),
    jsx(
      "section",
      { key: "branch-right", "data-seed": seed },
      keyedOwnerChildren(
        rightRegion,
        rightKeys.map((key) => jsx("i", { key, "data-seed": seed }, key)),
      ),
    ),
  ]);

const makeRoot = (
  mode: "delta" | "rebuild",
  counters?: Array<Record<string, number>>,
) => {
  const host = new MemoryVDOMHost();
  const container = host.createContainer();
  const root = new VDOMSnapshotRoot(
    host,
    container,
    undefined,
    counters ? (values) => counters.push({ ...values }) : undefined,
    mode,
  );
  return { root, host, container };
};

Deno.test("full commits maintain key indexes incrementally and match rebuild reference", () => {
  const deltaCounters: Array<Record<string, number>> = [];
  const delta = makeRoot("delta", deltaCounters);
  const rebuild = makeRoot("rebuild");
  let seed = 17;
  let left = ["row-0", "row-1", "duplicate"];
  let right = ["row-1", "duplicate", "row-2"];
  let leftRegion = "left-rows";
  let rightRegion = "right-rows";
  let lastFullCommitCounters: Record<string, number> | undefined;
  const keyIsUnique = (key: string) =>
    [...left, ...right].filter((candidate) => candidate === key).length === 1 ||
    key === "branch-left" || key === "branch-right";
  const checkIndexes = () => {
    // Probe row keys before branch keys: a probe performs an ordinary keyed
    // commit, so branch probes preserve the current row set below.
    for (
      const key of [
        "row-0",
        "row-1",
        "row-2",
        "duplicate",
        "removed",
      ]
    ) {
      const expected = keyIsUnique(key);
      const leftLookup = delta.root.commitKeyedRegion(
        key,
        jsx("i", { key }, key),
      );
      const rightLookup = rebuild.root.commitKeyedRegion(
        key,
        jsx("i", { key }, key),
      );
      equal(leftLookup, expected, `delta key lookup ${key}`);
      equal(rightLookup, expected, `rebuild key lookup ${key}`);
      equal(leftLookup, rightLookup, `reference parity for ${key}`);
    }
    for (
      const [key, region, rows] of [
        ["branch-left", leftRegion, left],
        ["branch-right", rightRegion, right],
      ] as const
    ) {
      const probe = jsx(
        "section",
        { key },
        keyedOwnerChildren(
          region,
          rows.map((row) => jsx("i", { key: row }, row)),
        ),
      );
      const leftLookup = delta.root.commitKeyedRegion(key, probe);
      const rightLookup = rebuild.root.commitKeyedRegion(key, probe);
      equal(leftLookup, true, `delta branch lookup ${key}`);
      equal(rightLookup, true, `rebuild branch lookup ${key}`);
    }
    equal(
      delta.root.commitKeyedRegionDelta("branch-left", leftRegion, []),
      true,
      "left keyed region lookup",
    );
    equal(
      rebuild.root.commitKeyedRegionDelta("branch-left", leftRegion, []),
      true,
      "rebuild left keyed region lookup",
    );
    equal(
      delta.root.commitKeyedRegionDelta("branch-right", rightRegion, []),
      true,
      "right keyed region lookup",
    );
    equal(
      rebuild.root.commitKeyedRegionDelta("branch-right", rightRegion, []),
      true,
      "rebuild right keyed region lookup",
    );
  };
  const commit = () => {
    const tree = treeFor(seed, left, right, leftRegion, rightRegion);
    delta.root.commit(tree);
    lastFullCommitCounters = deltaCounters.findLast((values) =>
      "vdom.key-index.incremental-old-visits" in values
    );
    rebuild.root.commit(tree);
    equal(
      delta.container.children.map(hostShape),
      rebuild.container.children.map(hostShape),
      `host parity after seed ${seed}`,
    );
    checkIndexes();
  };

  commit();
  deltaCounters.length = 0;
  // Same topology updates exercise the full reconciliation path without any
  // key attach/detach work; it must not rescan the mounted key tree.
  seed++;
  commit();
  equal(
    lastFullCommitCounters,
    {
      "vdom.key-index.incremental-old-visits": 0,
      "vdom.key-index.incremental-new-visits": 0,
    },
    "unchanged topology key-index visits",
  );

  // Deterministic edits include replacements, removals, additions, duplicate
  // keys across distinct parents, and keyed-region metadata changes.
  let random = 0x51f15e;
  const nextRandom = () => {
    random = (Math.imul(random, 1664525) + 1013904223) >>> 0;
    return random;
  };
  for (let edit = 0; edit < 18; edit++) {
    seed++;
    const side = nextRandom() & 1;
    const rows = side ? right : left;
    const operation = nextRandom() % 3;
    if (operation === 0 && rows.length > 0) {
      rows.splice(nextRandom() % rows.length, 1);
    } else if (operation === 1) {
      rows.push(`edit-${edit}`);
    } else if (rows.length > 0) {
      rows[nextRandom() % rows.length] = `edit-${edit}`;
    }
    if (edit === 5) leftRegion = "left-rows-v2";
    if (edit === 11) rightRegion = "right-rows-v2";
    commit();
  }
  delta.root.dispose();
  rebuild.root.dispose();
});

Deno.test("incremental full-commit counters visit only changed mounted subtrees", () => {
  const samples: Array<Record<string, number>> = [];
  const { root } = makeRoot("delta", samples);
  root.commit(jsx("main", {}, [
    jsx("section", { key: "stable" }, [
      jsx("i", { key: "stable-child" }, "same"),
    ]),
    jsx("section", { key: "replace" }, [
      jsx("i", { key: "old-child" }, "old"),
    ]),
  ]));
  samples.length = 0;
  root.commit(jsx("main", {}, [
    jsx("section", { key: "stable", "data-v": 1 }, [
      jsx("i", { key: "stable-child" }, "same"),
    ]),
    jsx("section", { key: "replace" }, [
      jsx("b", { key: "new-child" }, "new"),
    ]),
  ]));
  equal(
    samples.findLast((values) =>
      "vdom.key-index.incremental-old-visits" in values
    ),
    {
      "vdom.key-index.incremental-old-visits": 2,
      "vdom.key-index.incremental-new-visits": 2,
    },
    "replacement changed only old/new subtrees",
  );
  equal(
    samples.some((values) =>
      "vdom.binding-index.full-rebuild-visits" in values
    ),
    false,
    "plain binding index does not rebuild the mounted tree",
  );
  equal(
    samples.findLast((values) =>
      "vdom.binding-index.incremental-group-attaches" in values
    ),
    {
      "vdom.binding-index.incremental-group-detaches": 0,
      "vdom.binding-index.incremental-group-attaches": 0,
    },
    "unbound replacements perform no binding registration",
  );
  root.dispose();
});

Deno.test("keyed-region metadata changes detach and reattach only their owner", () => {
  const samples: Array<Record<string, number>> = [];
  const { root } = makeRoot("delta", samples);
  const tree = (region: string) =>
    jsx(
      "section",
      { key: "owner" },
      keyedOwnerChildren(region, [jsx("i", { key: "child" }, "same")]),
    );
  root.commit(tree("region-a"));
  samples.length = 0;
  root.commit(tree("region-b"));
  equal(
    samples.findLast((values) =>
      "vdom.key-index.incremental-old-visits" in values
    ),
    {
      "vdom.key-index.incremental-old-visits": 1,
      "vdom.key-index.incremental-new-visits": 1,
    },
    "only metadata owner is detached and reattached",
  );
  equal(
    root.commitKeyedRegionDelta("owner", "region-a", []),
    false,
    "old region id is detached",
  );
  equal(
    root.commitKeyedRegionDelta("owner", "region-b", []),
    true,
    "new region id is attached",
  );
  root.dispose();
});

Deno.test("duplicate global keys remain indexed as sets through attach and detach", () => {
  const { root } = makeRoot("delta");
  root.commit(treeFor(0, ["shared"], ["shared"]));
  equal(
    root.commitKeyedRegion("shared", jsx("i", { key: "shared" })),
    false,
    "global duplicate rejects unique keyed fast path",
  );
  root.commit(treeFor(1, [], ["shared"]));
  equal(
    root.commitKeyedRegion("shared", jsx("i", { key: "shared" })),
    true,
    "removing one duplicate retains the other index entry",
  );
  root.commit(treeFor(2, ["shared"], ["shared"]));
  equal(
    root.commitKeyedRegion("shared", jsx("i", { key: "shared" })),
    false,
    "reattaching duplicate restores duplicate rejection",
  );
  root.dispose();
});

Deno.test("failed removal cleanup never reindexes disposed keyed nodes", () => {
  class FailingHost extends MemoryVDOMHost {
    failNextDispose = false;
    dispose(_node: MemoryNode) {
      if (this.failNextDispose) {
        this.failNextDispose = false;
        throw new Error("injected dispose failure");
      }
    }
  }
  const deltaHost = new FailingHost();
  const deltaContainer = deltaHost.createContainer();
  const delta = new VDOMSnapshotRoot(deltaHost, deltaContainer);
  const rebuildHost = new FailingHost();
  const rebuildContainer = rebuildHost.createContainer();
  const rebuild = new VDOMSnapshotRoot(
    rebuildHost,
    rebuildContainer,
    undefined,
    undefined,
    "rebuild",
  );
  const initial = jsx("main", {}, [jsx("i", { key: "old" }, "old")]);
  delta.commit(initial);
  rebuild.commit(initial);
  deltaHost.failNextDispose = true;
  rebuildHost.failNextDispose = true;
  const replacement = jsx("main", {}, [jsx("b", { key: "new" }, "new")]);
  let failed = false;
  try {
    delta.commit(replacement);
  } catch (error) {
    failed = error instanceof AggregateError &&
      error.errors.some((item) =>
        String(item).includes("injected dispose failure")
      );
  }
  try {
    rebuild.commit(replacement);
  } catch {
    // Both maintenance modes retain their prior mounted tree after failure.
  }
  equal(failed, true, "host failure was propagated");
  equal(
    delta.commitKeyedRegion("old", jsx("i", { key: "old" })),
    false,
    "disposed old handle is absent from keyed lookup",
  );
  equal(
    delta.commitKeyedRegion("new", jsx("b", { key: "new" })),
    false,
    "failed replacement does not leak the unattached key entry",
  );
  equal(
    rebuild.commitKeyedRegion("old", jsx("i", { key: "old" })),
    false,
    "rebuild reference also excludes disposed old handle",
  );
  delta.dispose();
  rebuild.dispose();
});
