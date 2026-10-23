import { executeNumericRowCut } from "./prepared_numeric_row_cut_test_support.ts";
import {
  bindSources,
  jsx,
  NumericColumn,
  ScalarSource,
} from "./jsx_binding_runtime.ts";
import {
  MemoryVDOMHost,
  type PreparedNumericRowProgram,
  VDOMSnapshotRoot,
} from "./vdom_snapshot_runtime.ts";
import type { CompiledStateLayout } from "./compiled_state_layout.ts";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function same(actual: unknown, expected: unknown, message: string) {
  if (!Object.is(actual, expected)) {
    throw new Error(`${message}: expected ${String(expected)}, got ${String(actual)}`);
  }
}

const layout = Object.freeze({
  schemaVersion: 1 as const,
  programId: "AdjacentRows",
  slots: Object.freeze([
    Object.freeze({ siteId: "x", slot: 0 }),
    Object.freeze({ siteId: "y", slot: 1 }),
  ]),
}) satisfies CompiledStateLayout;

function makePreparedRow(
  owner: number,
  id: number,
) {
  const x = new ScalarSource(id, 1);
  const y = new ScalarSource(id + 1, 2);
  const sinkId = `owner-${owner}.sum`;
  const bound = Object.assign(bindSources([x, y], (values) => values[0] + values[1], {
    schemaVersion: 2,
    ownerProgramId: "AdjacentRows",
    sinkId,
    sourceSites: ["x", "y"],
  }), {
    numericProgram: Object.freeze({
      schemaVersion: 2 as const,
      ownerProgramId: "AdjacentRows",
      sinkId,
      sourceSites: Object.freeze(["x", "y"]),
    }),
    numericOwner: Object.freeze({
      owner,
      programId: "AdjacentRows",
      layout,
      sourceSlots: Object.freeze([0, 1]),
    }),
  });
  const sources: (ScalarSource | undefined)[] = [x, y];
  const columns = [
    new NumericColumn(id + 10, 0, new Float64Array([1])),
    new NumericColumn(id + 11, 1, new Float64Array([2])),
  ];
  return {
    owner,
    bound,
    x,
    y,
    sources,
    columns,
    prepare(root: VDOMSnapshotRoot<import("./vdom_snapshot_runtime.ts").MemoryNode>) {
      const token = root.prepareNumericRowProgram({
        owner,
        layout,
        rowIdentity: {},
        row: 0,
        generation: 1,
        sources,
        columns,
      });
      assert(token, "row token prepares");
      return token;
    },
  };
}

function countWeakMapGets(keys: readonly object[], run: () => unknown): number {
  const original = WeakMap.prototype.get;
  let count = 0;
  WeakMap.prototype.get = function (key: object) {
    if (keys.includes(key)) count++;
    return original.call(this, key);
  };
  try {
    run();
  } finally {
    WeakMap.prototype.get = original;
  }
  return count;
}

Deno.test("consecutive aliases share the immediately prior row record lookup", () => {
  const host = new MemoryVDOMHost();
  const container = host.createContainer();
  const root = new VDOMSnapshotRoot(host, container);
  const row = makePreparedRow(1001, 1010);
  root.commit(jsx("output", { "value-1001": row.bound }), undefined, true);
  const token = row.prepare(root);
  row.columns[0].values[0] = 5;
  row.columns[1].values[0] = 7;
  let result: boolean | null = null;
  const lookupCount = countWeakMapGets([token], () => {
    result = executeNumericRowCut(root,
      [token],
      new Uint32Array([0, 0, 0]),
      new Uint32Array([0, 1, 0]),
      [5, 7, 5],
      3,
    );
  });
  same(result, true, "consecutive token entries execute as one valid cut");
  same(container.children[0].props["value-1001"], 12, "row publishes its combined value");
  same(lookupCount, 7,
    "preflight and admitted recheck are linear; execution reuses adjacent aliases");
  root.dispose();
});

Deno.test("malformed, proxy, and foreign tokens still decline", () => {
  const firstHost = new MemoryVDOMHost();
  const firstRoot = new VDOMSnapshotRoot(firstHost, firstHost.createContainer());
  const first = makePreparedRow(1002, 1020);
  firstRoot.commit(jsx("output", { "value-1002": first.bound }), undefined, true);
  const firstToken = first.prepare(firstRoot);
  const secondHost = new MemoryVDOMHost();
  const secondRoot = new VDOMSnapshotRoot(secondHost, secondHost.createContainer());
  const foreign = makePreparedRow(1003, 1030);
  secondRoot.commit(jsx("output", { "value-1003": foreign.bound }), undefined, true);
  const foreignToken = foreign.prepare(secondRoot);
  const rows = [
    [{}, "malformed"],
    [new Proxy(firstToken, {}), "proxy"],
    [foreignToken, "foreign"],
  ] as const;
  for (const [token, label] of rows) {
    same(executeNumericRowCut(firstRoot,
      [token as PreparedNumericRowProgram],
      new Uint32Array([0]),
      new Uint32Array([0]),
      [9],
      1,
    ), null, `${label} token declines`);
    same(first.x.value, 1, `${label} token leaves source unchanged`);
    same(firstHost instanceof MemoryVDOMHost, true, "host remains available after decline");
  }
  firstRoot.dispose();
  secondRoot.dispose();
});

Deno.test("nonconsecutive row tokens require a fresh lookup", () => {
  const host = new MemoryVDOMHost();
  const container = host.createContainer();
  const root = new VDOMSnapshotRoot(host, container);
  const first = makePreparedRow(1004, 1040);
  const second = makePreparedRow(1005, 1050);
  root.commit(jsx("output", {
    "value-1004": first.bound,
    "value-1005": second.bound,
  }), undefined, true);
  const firstToken = first.prepare(root);
  const secondToken = second.prepare(root);
  first.columns[0].values[0] = 4;
  second.columns[0].values[0] = 6;
  let result: boolean | null = null;
  const lookupCount = countWeakMapGets([firstToken, secondToken], () => {
    result = executeNumericRowCut(root,
      [firstToken, secondToken],
      new Uint32Array([0, 1, 0]),
      new Uint32Array([0, 0, 1]),
      [4, 6, 7],
      3,
    );
  });
  same(result, true, "interleaved tokens execute the generic row plan");
  same(lookupCount, 9,
    "nonconsecutive execution retains its per-input lookups after rechecks");
  root.dispose();
});
