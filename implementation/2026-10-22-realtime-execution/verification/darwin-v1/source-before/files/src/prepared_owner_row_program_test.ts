import { executeNumericRowCut } from "./prepared_numeric_row_cut_test_support.ts";
import {
  bind,
  bindSources,
  jsx,
  NumericColumn,
  ScalarSource,
} from "./jsx_binding_runtime.ts";
import {
  type MemoryNode,
  MemoryVDOMHost,
  PreparedNumericRowProgram,
  VDOMSnapshotRoot,
} from "./vdom_snapshot_runtime.ts";
import type { CompiledStateLayout } from "./compiled_state_layout.ts";

const assert = (condition: unknown, message: string) => {
  if (!condition) throw new Error(message);
};
const same = (actual: unknown, expected: unknown, message: string) => {
  if (!Object.is(actual, expected)) {
    throw new Error(`${message}: expected ${String(expected)}, got ${String(actual)}`);
  }
};
const throws = (operation: () => unknown, message: string) => {
  let threw = false;
  try {
    operation();
  } catch {
    threw = true;
  }
  assert(threw, message);
};
const mustToken = (
  token: PreparedNumericRowProgram | null,
): PreparedNumericRowProgram => {
  if (!token) throw new Error("Expected prepared owner-row token");
  return token;
};

const layout: CompiledStateLayout = Object.freeze({
  schemaVersion: 1,
  programId: "Board",
  slots: Object.freeze([
    Object.freeze({ siteId: "x", slot: 0 }),
    Object.freeze({ siteId: "y", slot: 1 }),
  ]),
});

const owned = <T>(
  value: object,
  owner: number,
  sites: readonly string[],
  sinkId: string,
) => {
  const metadata = Object.freeze({
    owner,
    programId: "Board",
    layout,
    sourceSlots: Object.freeze(sites.map((site) =>
      layout.slots.findIndex((entry) => entry.siteId === site)
    )),
  });
  return Object.assign(value, {
    numericProgram: Object.freeze({
      schemaVersion: 2 as const,
      ownerProgramId: "Board",
      sinkId,
      sourceSites: Object.freeze([...sites]),
    }),
    numericOwner: metadata,
  }) as T;
};

const rowTree = (
  sources: readonly [ScalarSource, ScalarSource],
  owner: number,
  project: (values: readonly number[]) => unknown,
  trackUnary?: (value: number) => void,
) => {
  const binding = owned(
    bindSources(sources, project, {
      schemaVersion: 2,
      ownerProgramId: "Board",
      sinkId: `row-${owner}.sum`,
      sourceSites: ["x", "y"],
    }),
    owner,
    ["x", "y"],
    `row-${owner}.sum`,
  );
  const unary = owned(
    bind(sources[0], (value) => {
      trackUnary?.(value);
      return value;
    }),
    owner,
    ["x"],
    `row-${owner}.x`,
  );
  return jsx("output", {
    key: `row-${owner}`,
    "data-total": binding,
    "data-x": unary,
  });
};

Deno.test("prepared owner rows project multi-source sinks from sparse captured cuts", () => {
  const projected: number[] = [];
  let assertAllProjectedBeforeWrite = false;
  let expectedProjectionsBeforeWrite = 0;
  let inCut = false;
  class Host extends MemoryVDOMHost {
    override setProp(node: MemoryNode, name: string, value: unknown, previous: unknown) {
      if (inCut && name === "data-total" && assertAllProjectedBeforeWrite) {
        same(projected.length, expectedProjectionsBeforeWrite, "all row projectors run before the first host write");
      }
      super.setProp(node, name, value, previous);
    }
  }
  const host = new Host();
  const container = host.createContainer();
  const root = new VDOMSnapshotRoot(host, container);
  const x0 = new ScalarSource(10, 1);
  const y0 = new ScalarSource(11, 2);
  const x1 = new ScalarSource(12, 3);
  const y1 = new ScalarSource(13, 4);
  const xColumn = new NumericColumn(20, 0, new Float64Array([1, 3]));
  const yColumn = new NumericColumn(21, 1, new Float64Array([2, 4]));
  let mutateDuringProjection = false;
  const sum = (values: readonly number[]) => {
    projected.push(values[0] + values[1]);
    if (mutateDuringProjection && values[0] === 7) {
      yColumn.values[1] = 200;
      y1.value = 500;
    }
    return values[0] + values[1];
  };
  root.commit(jsx("div", {}, [
    rowTree([x0, y0], 100, sum, (value) => projected.push(value)),
    rowTree([x1, y1], 101, sum, (value) => projected.push(value)),
  ]), undefined, true);
  const identity0 = {};
  const identity1 = {};
  const token0 = mustToken(root.prepareNumericRowProgram({
    owner: 100,
    layout,
    rowIdentity: identity0,
    row: 0,
    generation: 1,
    sources: [x0, y0],
    columns: [xColumn, yColumn],
  }));
  const token1 = mustToken(root.prepareNumericRowProgram({
    owner: 101,
    layout,
    rowIdentity: identity1,
    row: 1,
    generation: 4,
    sources: [x1, y1],
    columns: [xColumn, yColumn],
  }));

  xColumn.values[0] = 5;
  yColumn.values[1] = 9;
  projected.length = 0;
  assertAllProjectedBeforeWrite = true;
  expectedProjectionsBeforeWrite = 3;
  inCut = true;
  const writes = host.writeCount;
  const changed = executeNumericRowCut(root,
    [token0, token1],
    new Uint32Array([0, 1]),
    new Uint32Array([0, 1]),
    [5, 9],
    2,
  );
  inCut = false;
  same(changed, true, "a changed sparse row cut writes host props");
  same(container.children[0].children[0].props["data-total"], 7, "row zero uses captured x and unchanged y");
  same(container.children[0].children[1].props["data-total"], 12, "row one uses captured y and unchanged x");
  same(container.children[0].children[0].props["data-x"], 5, "unary fanout updates the changed source");
  same(host.writeCount - writes, 3, "fanout updates each affected sink once");

  projected.length = 0;
  assertAllProjectedBeforeWrite = false;
  same(executeNumericRowCut(root,
    [token0, token1], new Uint32Array([0, 1]), new Uint32Array([0, 1]), [5, 9], 2,
  ), false, "unchanged primitive outputs are suppressed");
  same(projected.length, 3, "explicit captured dirty fanouts still project once per affected sink");

  // Dense updates touch both slots on both rows. The first projector mutates
  // the second row's column/source; later projection must still use its cut.
  xColumn.values[0] = 7;
  yColumn.values[0] = 8;
  xColumn.values[1] = 6;
  yColumn.values[1] = 10;
  mutateDuringProjection = true;
  projected.length = 0;
  assertAllProjectedBeforeWrite = true;
  expectedProjectionsBeforeWrite = 4;
  inCut = true;
  const denseResult = executeNumericRowCut(root,
    [token0, token1],
    new Uint32Array([0, 0, 1, 1]),
    new Uint32Array([0, 1, 0, 1]),
    [7, 8, 6, 10],
    4,
  );
  inCut = false;
  assertAllProjectedBeforeWrite = false;
  same(denseResult, true, "dense owner-row cut is accepted");
  same(container.children[0].children[0].props["data-total"], 15, "dense first row projection is correct");
  same(container.children[0].children[1].props["data-total"], 16, "later projection uses the captured vector after callback mutation");
  same(projected.length, 4, "multi-source sink is deduplicated across changed slots");

  // A derived mutable binding keeps its forced write when dependencies change
  // but the projected primitive happens to compare equal.
  mutateDuringProjection = false;
  xColumn.values[0] = 6;
  yColumn.values[0] = 9;
  projected.length = 0;
  const beforeForcedWrite = host.writeCount;
  same(executeNumericRowCut(root,
    [token0], new Uint32Array([0, 0]), new Uint32Array([0, 1]), [6, 9], 2,
  ), true, "derived binding retains its forced-write behavior");
  same(container.children[0].children[0].props["data-total"], 15, "same derived primitive remains correct");
  same(host.writeCount - beforeForcedWrite, 1, "primitive derived output is suppressed while unary output changes");

  const sourceBeforeConflict = x0.value;
  projected.length = 0;
  same(executeNumericRowCut(root,
    [token0], new Uint32Array([0, 0]), new Uint32Array([0, 0]), [7, 8], 2,
  ), null, "conflicting duplicate values decline the entire cut");
  same(x0.value, sourceBeforeConflict, "declined duplicate does not change sources");
  same(projected.length, 0, "declined duplicate does not project");

  const refreshed = rowTree([x0, y0], 100, (values) => values[0] + values[1] + 1);
  root.commit(jsx("div", {}, [refreshed, rowTree([x1, y1], 101, sum)]), undefined, true);
  same(executeNumericRowCut(root,
    [token0], new Uint32Array([0]), new Uint32Array([0]), [6], 1,
  ), null, "binding refresh invalidates its prepared row token");
  root.dispose();
});

Deno.test("prepared owner rows reject duplicate source leases and reprepare after refresh", () => {
  const host = new MemoryVDOMHost();
  const container = host.createContainer();
  const root = new VDOMSnapshotRoot(host, container);
  const x = new ScalarSource(45, 1);
  const y = new ScalarSource(46, 2);
  const xColumn = new NumericColumn(47, 0, new Float64Array([1]));
  const yColumn = new NumericColumn(48, 1, new Float64Array([2]));
  root.commit(jsx("div", {}, rowTree([x, y], 450, (values) => values[0] + values[1])), undefined, true);
  const firstIdentity = {};
  const first = mustToken(root.prepareNumericRowProgram({
    owner: 450, layout, rowIdentity: firstIdentity, row: 0, generation: 1,
    sources: [x, y], columns: [xColumn, yColumn],
  }));
  same(root.prepareNumericRowProgram({
    owner: 450, layout, rowIdentity: {}, row: 0, generation: 1,
    sources: [x, y], columns: [xColumn, yColumn],
  }), null, "one mounted source set cannot belong to two prepared row records");

  root.commit(jsx("div", {}, rowTree([x, y], 450, (values) => values[0] + values[1] + 1)), undefined, true);
  same(executeNumericRowCut(root,
    [first], new Uint32Array([0]), new Uint32Array([0]), [3], 1,
  ), null, "refresh invalidates the prior prepared row");
  const refreshed = mustToken(root.prepareNumericRowProgram({
    owner: 450, layout, rowIdentity: {}, row: 0, generation: 1,
    sources: [x, y], columns: [xColumn, yColumn],
  }));
  xColumn.values[0] = 3;
  same(executeNumericRowCut(root,
    [refreshed], new Uint32Array([0]), new Uint32Array([0]), [3], 1,
  ), true, "the refreshed binding can prepare and execute a new row record");
  same(container.children[0].children[0].props["data-total"], 6, "reprepared row uses refreshed projector");
  root.dispose();
});

Deno.test("prepared owner row guard rejects reentry and disposal cancels later sinks", () => {
  let root!: VDOMSnapshotRoot<MemoryNode, MemoryNode>;
  let token!: PreparedNumericRowProgram;
  let nestedRejected = false;
  let disposeOnFirst = false;
  const writes: string[] = [];
  class Host extends MemoryVDOMHost {
    override setProp(node: MemoryNode, name: string, value: unknown, previous: unknown) {
      super.setProp(node, name, value, previous);
      if (!disposeOnFirst || !name.startsWith("data-")) return;
      writes.push(name);
      if (name === "data-first") {
        try {
          executeNumericRowCut(root,
            [token], new Uint32Array([0]), new Uint32Array([0]), [3], 1,
          );
        } catch {
          nestedRejected = true;
        }
        root.dispose();
      }
    }
  }
  const host = new Host();
  const container = host.createContainer();
  root = new VDOMSnapshotRoot(host, container);
  const x = new ScalarSource(50, 1);
  const y = new ScalarSource(51, 2);
  const xColumn = new NumericColumn(52, 0, new Float64Array([1]));
  const yColumn = new NumericColumn(53, 1, new Float64Array([2]));
  const one = (source: ScalarSource, site: string, sink: string) => owned(
    bind(source, (value) => value),
    500,
    [site],
    sink,
  );
  root.commit(jsx("output", {
    "data-first": one(x, "x", "first"),
    "data-second": one(x, "x", "second"),
    "data-third": one(y, "y", "third"),
  }), undefined, true);
  token = mustToken(root.prepareNumericRowProgram({
    owner: 500,
    layout,
    rowIdentity: {},
    row: 0,
    generation: 1,
    sources: [x, y],
    columns: [xColumn, yColumn],
  }));
  xColumn.values[0] = 3;
  disposeOnFirst = true;
  throws(() => executeNumericRowCut(root,
    [token], new Uint32Array([0]), new Uint32Array([0]), [3], 1,
  ), "disposal after the first writer is terminal");
  same(nestedRejected, true, "nested prepared row execution is rejected");
  same(writes.join(","), "data-first", "disposal prevents subsequent sink writes");
});

Deno.test("prepared owner row projector failure occurs before any host write", () => {
  const host = new MemoryVDOMHost();
  const container = host.createContainer();
  const root = new VDOMSnapshotRoot(host, container);
  const x = new ScalarSource(30, 1);
  const y = new ScalarSource(31, 2);
  const xColumn = new NumericColumn(32, 0, new Float64Array([1]));
  const yColumn = new NumericColumn(33, 1, new Float64Array([2]));
  let fail = false;
  const binding = owned(
    bindSources([x, y], (values) => {
      if (fail) throw new Error("projector failed");
      return values[0] + values[1];
    }, {
      schemaVersion: 2,
      ownerProgramId: "Board",
      sinkId: "throwing.sum",
      sourceSites: ["x", "y"],
    }),
    300,
    ["x", "y"],
    "throwing.sum",
  );
  root.commit(jsx("output", { "data-total": binding }), undefined, true);
  const token = mustToken(root.prepareNumericRowProgram({
    owner: 300,
    layout,
    rowIdentity: {},
    row: 0,
    generation: 1,
    sources: [x, y],
    columns: [xColumn, yColumn],
  }));
  const writes = host.writeCount;
  xColumn.values[0] = 8;
  fail = true;
  throws(() => executeNumericRowCut(root,
    [token], new Uint32Array([0]), new Uint32Array([0]), [8], 1,
  ), "projector errors propagate");
  same(host.writeCount, writes, "no host write runs before all projections succeed");
  root.dispose();
});

Deno.test("prepared owner rows preserve forced writes for stable mutable outputs", () => {
  const host = new MemoryVDOMHost();
  const container = host.createContainer();
  const root = new VDOMSnapshotRoot(host, container);
  const x = new ScalarSource(60, 1);
  const y = new ScalarSource(61, 2);
  const xColumn = new NumericColumn(62, 0, new Float64Array([1]));
  const yColumn = new NumericColumn(63, 1, new Float64Array([2]));
  const tuple: number[] = [1, 2];
  const binding = owned(bindSources([x, y], (values) => {
    tuple[0] = values[0];
    tuple[1] = values[1];
    return tuple;
  }, {
    schemaVersion: 2,
    ownerProgramId: "Board",
    sinkId: "mutable.vector",
    sourceSites: ["x", "y"],
  }), 600, ["x", "y"], "mutable.vector");
  root.commit(jsx("output", { position: binding }), undefined, true);
  const token = mustToken(root.prepareNumericRowProgram({
    owner: 600,
    layout,
    rowIdentity: {},
    row: 0,
    generation: 1,
    sources: [x, y],
    columns: [xColumn, yColumn],
  }));
  const output = container.children[0].props.position;
  const writes = host.writeCount;
  xColumn.values[0] = 2;
  yColumn.values[0] = 1;
  same(executeNumericRowCut(root,
    [token], new Uint32Array([0, 0]), new Uint32Array([0, 1]), [2, 1], 2,
  ), true, "mutable projection is force-written after dependencies change");
  same(container.children[0].props.position, output, "stable mutable object identity is preserved");
  same(tuple.join(","), "2,1", "stable object receives the new captured values");
  same(host.writeCount - writes, 1, "one host write is made for the mutable sink");
  root.dispose();
});

Deno.test("prepared owner rows reject v1 and unassociated bindings", () => {
  const host = new MemoryVDOMHost();
  const container = host.createContainer();
  const root = new VDOMSnapshotRoot(host, container);
  const source = new ScalarSource(40, 1);
  const column = new NumericColumn(41, 0, new Float64Array([1]));
  const v1 = Object.assign(bind(source, (value) => value), {
    numericProgram: { schemaVersion: 1 as const, sinkId: "legacy", sourceSites: ["x"] },
  });
  root.commit(jsx("output", { value: v1 }), undefined, true);
  same(root.prepareNumericRowProgram({
    owner: 400,
    layout: Object.freeze({
      schemaVersion: 1,
      programId: "Board",
      slots: Object.freeze([Object.freeze({ siteId: "x", slot: 0 })]),
    }),
    rowIdentity: {},
    row: 0,
    generation: 1,
    sources: [source],
    columns: [column],
  }), null, "schema-v1 bindings cannot enter the owner-row path");
  root.dispose();
});


Deno.test("owner-row first dirty cut survives preparation after the column write", () => {
  const host = new MemoryVDOMHost();
  const container = host.createContainer();
  const root = new VDOMSnapshotRoot(host, container);
  const x = new ScalarSource(700, 1);
  const y = new ScalarSource(701, 2);
  const xColumn = new NumericColumn(702, 0, new Float64Array([1]));
  const yColumn = new NumericColumn(703, 1, new Float64Array([2]));
  let projections = 0;
  const binding = owned(bindSources([x, y], (values) => {
    projections++;
    return values[0] + values[1];
  }, {
    schemaVersion: 2,
    ownerProgramId: "Board",
    sinkId: "lazy.sum",
    sourceSites: ["x", "y"],
  }), 700, ["x", "y"], "lazy.sum");
  root.commit(jsx("output", { value: binding }), undefined, true);
  const base = projections;
  // Root can construct the token after World has already updated its lane.
  xColumn.values[0] = 9;
  const sources = [x, y];
  const columns = [xColumn, yColumn];
  const token = mustToken(root.prepareNumericRowProgram({
    owner: 700, layout, rowIdentity: {}, row: 0, generation: 1, sources, columns,
  }));
  same(executeNumericRowCut(root,
    [token], new Uint32Array([0]), new Uint32Array([0]), [9], 1,
  ), true, "the explicit dirty cut executes after lazy preparation");
  same(container.children[0].props.value, 11, "projection sees new x and unchanged y");
  same(projections, base + 1, "first dirty event reaches the sink");
  root.dispose();
});

Deno.test("owner-row dirty fanouts preserve packed source and row order", () => {
  const writes: string[] = [];
  let capture = false;
  class Host extends MemoryVDOMHost {
    override setProp(node: MemoryNode, name: string, value: unknown, previous: unknown) {
      super.setProp(node, name, value, previous);
      if (capture && name.startsWith("data-")) {
        writes.push(`${String(node.props["data-row"])}:${name}`);
      }
    }
  }
  const host = new Host();
  const container = host.createContainer();
  const root = new VDOMSnapshotRoot(host, container);
  const xs = [new ScalarSource(710, 1), new ScalarSource(711, 3)];
  const ys = [new ScalarSource(712, 2), new ScalarSource(713, 4)];
  const xColumn = new NumericColumn(714, 0, new Float64Array([1, 3]));
  const yColumn = new NumericColumn(715, 1, new Float64Array([2, 4]));
  const trees = xs.map((x, row) => {
    const owner = 710 + row;
    const unary = (source: ScalarSource, site: string, sink: string) => owned(
      bind(source, (value) => value), owner, [site], sink,
    );
    const total = owned(bindSources([x, ys[row]], (values) => values[0] + values[1], {
      schemaVersion: 2, ownerProgramId: "Board", sinkId: `row-${row}.total`,
      sourceSites: ["x", "y"],
    }), owner, ["x", "y"], `row-${row}.total`);
    return jsx("output", {
      key: `row-${row}`,
      "data-row": `r${row}`,
      "data-x": unary(x, "x", `row-${row}.x`),
      "data-y": unary(ys[row], "y", `row-${row}.y`),
      "data-total": total,
    });
  });
  root.commit(jsx("div", {}, trees), undefined, true);
  const tokens = [0, 1].map((row) => mustToken(root.prepareNumericRowProgram({
    owner: 710 + row,
    layout,
    rowIdentity: {},
    row,
    generation: row + 1,
    sources: [xs[row], ys[row]],
    columns: [xColumn, yColumn],
  })));
  xColumn.values[0] = 5;
  yColumn.values[1] = 9;
  xColumn.values[1] = 6;
  writes.length = 0;
  capture = true;
  executeNumericRowCut(root,
    tokens,
    new Uint32Array([1, 0, 1]),
    new Uint32Array([1, 0, 0]),
    [9, 5, 6],
    3,
  );
  capture = false;
  same(writes.join(","),
    "r1:data-y,r1:data-total,r0:data-x,r0:data-total,r1:data-x",
    "first-touch fanouts follow packed row/slot order and each source's retained group order",
  );
  root.dispose();
});

Deno.test("owner-row stale untouched lease dependencies decline atomically", () => {
  const host = new MemoryVDOMHost();
  const container = host.createContainer();
  const root = new VDOMSnapshotRoot(host, container);
  const x = new ScalarSource(720, 1);
  const y = new ScalarSource(721, 2);
  const xColumn = new NumericColumn(722, 0, new Float64Array([1]));
  const yColumn = new NumericColumn(723, 1, new Float64Array([2]));
  let projections = 0;
  const binding = owned(bindSources([x, y], (values) => {
    projections++;
    return values[0] + values[1];
  }, {
    schemaVersion: 2, ownerProgramId: "Board", sinkId: "lease.sum",
    sourceSites: ["x", "y"],
  }), 720, ["x", "y"], "lease.sum");
  root.commit(jsx("output", { value: binding }), undefined, true);
  const sources: (ScalarSource | undefined)[] = [x, y];
  const columns = [xColumn, yColumn];
  const token = mustToken(root.prepareNumericRowProgram({
    owner: 720, layout, rowIdentity: {}, row: 0, generation: 1, sources, columns,
  }));
  const sourceX = x.value;
  const baseProjections = projections;
  same(executeNumericRowCut(root,
    [token], new Uint32Array([1]), new Uint32Array([0]), [8], 1,
  ), null, "an invalid first token index declines before record scratch is used");
  same(x.value, sourceX, "invalid first token index leaves sources untouched");
  same(projections, baseProjections, "invalid first token index leaves sinks untouched");
  xColumn.values[0] = 8;
  sources[1] = undefined; // World promotion revokes the untouched y dependency.
  same(executeNumericRowCut(root,
    [token], new Uint32Array([0]), new Uint32Array([0]), [8], 1,
  ), null, "stale untouched source lease declines the cut");
  same(x.value, sourceX, "decline happens before source mirroring");
  same(projections, baseProjections, "decline happens before projection");
  same(container.children[0].props.value, 3, "decline leaves host state untouched");

  sources[1] = y;
  columns.length = 1; // Retiring the shared World column vector also revokes it.
  same(executeNumericRowCut(root,
    [token], new Uint32Array([0]), new Uint32Array([0]), [8], 1,
  ), null, "retired untouched column lease declines the cut");
  same(x.value, sourceX, "retired lease still declines before source mirroring");
  same(projections, baseProjections, "retired lease still declines before projection");
  columns.push(yColumn);
  same(executeNumericRowCut(root,
    [token], new Uint32Array([0]), new Uint32Array([0]), [8], 1,
  ), true, "a valid cut succeeds after later lease-validation failure");
  same(container.children[0].props.value, 10, "later valid cut publishes after lease failure");
  root.dispose();
});

Deno.test("owner-row record scratch clears after early decline and repeated cuts", () => {
  const host = new MemoryVDOMHost();
  const container = host.createContainer();
  const root = new VDOMSnapshotRoot(host, container);
  const source = new ScalarSource(725, 1);
  const column = new NumericColumn(726, 0, new Float64Array([1]));
  const binding = owned(bind(source, (value) => value), 725, ["x"], "scratch.x");
  root.commit(jsx("output", { value: binding }), undefined, true);
  const token = mustToken(root.prepareNumericRowProgram({
    owner: 725,
    layout,
    rowIdentity: {},
    row: 0,
    generation: 1,
    sources: [source, undefined],
    columns: [column, new NumericColumn(727, 1, new Float64Array([0]))],
  }));

  same(executeNumericRowCut(root,
    [token], new Uint32Array([1]), new Uint32Array([0]), [2], 1,
  ), null, "invalid first input declines");
  same(executeNumericRowCut(root,
    [token], new Uint32Array([0]), new Uint32Array([0]), [2], 1,
  ), true, "first valid cut succeeds after early decline");
  same(executeNumericRowCut(root,
    [token], new Uint32Array([0, 0]), new Uint32Array([0, 0]), [4, 5], 2,
  ), null, "later conflicting input declines after retaining only scratch references");
  same(source.value, 2, "conflict after a valid prefix does not mirror that prefix");
  same(executeNumericRowCut(root,
    [token], new Uint32Array([0]), new Uint32Array([0]), [2], 1,
  ), false, "scratch cleanup survives a late conflict without another host write");
  same(executeNumericRowCut(root,
    [token], new Uint32Array([0]), new Uint32Array([0]), [3], 1,
  ), true, "reused scratch accepts a second cut");
  same(executeNumericRowCut(root,
    [token], new Uint32Array([0]), new Uint32Array([0]), [3], 1,
  ), false, "unchanged cut completes without a write");
  same(source.value, 3, "source mirror follows the latest accepted cut");
  same(container.children[0].props.value, 3, "host value follows the latest accepted cut");
  root.dispose();
});

Deno.test("numeric cut owns captured inputs and can be consumed only once", () => {
  const host = new MemoryVDOMHost();
  const container = host.createContainer();
  const root = new VDOMSnapshotRoot(host, container);
  const source = new ScalarSource(728, 1);
  const column = new NumericColumn(729, 0, new Float64Array([1]));
  root.commit(jsx("output", {
    value: owned(bind(source, (value) => value), 728, ["x"], "cut.x"),
  }), undefined, true);
  const token = mustToken(root.prepareNumericRowProgram({
    owner: 728, layout, rowIdentity: {}, row: 0, generation: 1,
    sources: [source, undefined],
    columns: [column, new NumericColumn(730, 1, new Float64Array([0]))],
  }));
  const rows = new Uint32Array([0]);
  const slots = new Uint32Array([0]);
  const values = [2];
  const cut = root.prepareNumericRowCut([token], rows, slots, values, 1);
  assert(cut, "valid cut prepares before publication");
  assert(!("rows" in cut) && !("slots" in cut) && !("values" in cut) &&
    !Reflect.ownKeys(Object.getPrototypeOf(cut)).some((name) =>
      name === "rows" || name === "slots" || name === "values"),
  "captured numeric buffers have no public instance or prototype accessor");
  rows[0] = 9;
  slots[0] = 9;
  values[0] = 9;
  same(root.isPreparedNumericRowCutCurrent(cut), true,
    "caller buffer mutation cannot rewrite captured cut");
  same(root.executePreparedNumericRowCut(cut), true,
    "the captured cut applies its original value");
  same(source.value, 2, "captured source value is mirrored");
  same(container.children[0].props.value, 2, "captured host value is written");
  same(root.isPreparedNumericRowCutCurrent(cut), false,
    "consumed cut loses its lease");
  throws(() => root.executePreparedNumericRowCut(cut),
    "consumed cut cannot write twice");
  root.discardNumericRowCut(cut);

  const spareTokens: (PreparedNumericRowProgram | undefined)[] = [token];
  spareTokens.length = 4096;
  Object.defineProperty(spareTokens, 4095, {
    get() { throw new Error("unreached spare token was read"); },
  });
  const sparse = root.prepareNumericRowCut(spareTokens,
    new Uint32Array([0]), new Uint32Array([0]), [3], 1);
  assert(sparse, "sparse cut ignores unused peak token capacity");
  root.discardNumericRowCut(sparse);

  const abandoned = root.prepareNumericRowCut([token], new Uint32Array([0]),
    new Uint32Array([0]), [3], 1);
  assert(abandoned, "second cut prepares");
  root.discardNumericRowCut(abandoned);
  root.discardNumericRowCut(abandoned);
  same(root.isPreparedNumericRowCutCurrent(abandoned), false,
    "discarded cut loses its lease");
  throws(() => root.executePreparedNumericRowCut(abandoned),
    "discarded cut cannot write");
  root.dispose();
});

Deno.test("owner-row work visits grow linearly across one thousand rows", () => {
  const host = new MemoryVDOMHost();
  const container = host.createContainer();
  const root = new VDOMSnapshotRoot(host, container, undefined, () => {});
  const oneSlotLayout: CompiledStateLayout = Object.freeze({
    schemaVersion: 1,
    programId: "Rows",
    slots: Object.freeze([Object.freeze({ siteId: "value", slot: 0 })]),
  });
  const rowCount = 1000;
  const sources: ScalarSource[] = [];
  const columns = [new NumericColumn(730, 0, new Float64Array(rowCount))];
  const trees = [];
  for (let row = 0; row < rowCount; row++) {
    const source = new ScalarSource(10000 + row, row);
    sources.push(source);
    const binding = Object.assign(bind(source, (value) => value), {
      numericProgram: Object.freeze({
        schemaVersion: 2 as const, ownerProgramId: "Rows", sinkId: `row-${row}`,
        sourceSites: Object.freeze(["value"]),
      }),
      numericOwner: Object.freeze({
        owner: 10000 + row, programId: "Rows", layout: oneSlotLayout,
        sourceSlots: Object.freeze([0]),
      }),
    });
    trees.push(jsx("output", { key: `row-${row}`, value: binding }));
  }
  root.commit(jsx("div", {}, trees), undefined, true);
  const tokens: PreparedNumericRowProgram[] = [];
  for (let row = 0; row < rowCount; row++) {
    tokens.push(mustToken(root.prepareNumericRowProgram({
      owner: 10000 + row, layout: oneSlotLayout, rowIdentity: {}, row,
      generation: 1, sources: [sources[row]], columns,
    })));
    columns[0].values[row] = row + 1;
  }
  const originalWeakMapGet = WeakMap.prototype.get;
  let weakMapGets = 0;
  WeakMap.prototype.get = function (key) {
    weakMapGets++;
    return originalWeakMapGet.call(this, key);
  };
  try {
    same(executeNumericRowCut(root,
      tokens,
      Uint32Array.from({ length: rowCount }, (_, row) => row),
      new Uint32Array(rowCount).fill(0),
      Array.from({ length: rowCount }, (_, row) => row + 1),
      rowCount,
    ), true, "all row sinks are reached");
  } finally {
    WeakMap.prototype.get = originalWeakMapGet;
  }
  same(weakMapGets, rowCount * 3,
    "preflight, admitted recheck and execution each resolve one record per input");
  const visits = root.diagnostics().preparedNumericRowWorkVisits;
  same(visits, 6000, "dependency lease validation and capture share one slot pass");
  same(container.children[0].children[999].props.value, 1000, "last row projects correctly");
  root.dispose();
});

Deno.test("owner-row unused absent slots are accepted and v2 unary stays eligible", () => {
  const host = new MemoryVDOMHost();
  const container = host.createContainer();
  const root = new VDOMSnapshotRoot(host, container);
  const x = new ScalarSource(740, 1);
  const column = new NumericColumn(741, 0, new Float64Array([1]));
  const unary = owned(bind(x, (value) => value), 740, ["x"], "v2.unary");
  root.commit(jsx("output", { value: unary }), undefined, true);
  assert(root.bindSourceColumn(x, column, 0), "v2 unary descriptor is admitted to the shared eligibility path");
  assert(root.prepareNumericCellProgram(x, column, 0), "v2 unary cell preparation succeeds");

  const twoSlotRow = mustToken(root.prepareNumericRowProgram({
    owner: 740,
    layout,
    rowIdentity: {},
    row: 0,
    generation: 1,
    sources: [x, undefined],
    columns: [column, new NumericColumn(742, 1, new Float64Array([0]))],
  }));
  same(executeNumericRowCut(root,
    [twoSlotRow], new Uint32Array([0]), new Uint32Array([0]), [4], 1,
  ), true, "unused missing layout slots do not reject an otherwise valid cut");
  same(container.children[0].props.value, 4, "unary v2 sink receives the captured value");
  root.dispose();
});


Deno.test("owner-row projector disposal cancels safely after the final projection", () => {
  const host = new MemoryVDOMHost();
  const container = host.createContainer();
  const root = new VDOMSnapshotRoot(host, container);
  const source = new ScalarSource(750, 1);
  const column = new NumericColumn(751, 0, new Float64Array([1]));
  let disposeDuringProjection = false;
  const oneLayout: CompiledStateLayout = Object.freeze({
    schemaVersion: 1,
    programId: "Board",
    slots: Object.freeze([Object.freeze({ siteId: "x", slot: 0 })]),
  });
  const oneOwner = <T extends object>(value: T, sinkId: string) => Object.assign(value, {
    numericProgram: Object.freeze({
      schemaVersion: 2 as const, ownerProgramId: "Board", sinkId,
      sourceSites: Object.freeze(["x"]),
    }),
    numericOwner: Object.freeze({
      owner: 750, programId: "Board", layout: oneLayout,
      sourceSlots: Object.freeze([0]),
    }),
  });
  const binding = oneOwner(bind(source, (value) => {
    if (disposeDuringProjection) root.dispose();
    return value;
  }), "dispose.projector");
  root.commit(jsx("output", { value: binding }), undefined, true);
  const token = mustToken(root.prepareNumericRowProgram({
    owner: 750,
    layout: oneLayout,
    rowIdentity: {}, row: 0, generation: 1,
    sources: [source], columns: [column],
  }));
  column.values[0] = 2;
  disposeDuringProjection = true;
  throws(() => executeNumericRowCut(root,
    [token], new Uint32Array([0]), new Uint32Array([0]), [2], 1,
  ), "disposal from the last projector is terminal before host writes");
});

Deno.test("single-source v2 derived projectors use the captured cut vector", () => {
  const host = new MemoryVDOMHost();
  const container = host.createContainer();
  const root = new VDOMSnapshotRoot(host, container);
  const source = new ScalarSource(760, 1);
  const column = new NumericColumn(761, 0, new Float64Array([1]));
  let mutate = false;
  const oneLayout: CompiledStateLayout = Object.freeze({
    schemaVersion: 1,
    programId: "Board",
    slots: Object.freeze([Object.freeze({ siteId: "x", slot: 0 })]),
  });
  const oneOwner = <T extends object>(value: T, sinkId: string) => Object.assign(value, {
    numericProgram: Object.freeze({
      schemaVersion: 2 as const, ownerProgramId: "Board", sinkId,
      sourceSites: Object.freeze(["x"]),
    }),
    numericOwner: Object.freeze({
      owner: 760, programId: "Board", layout: oneLayout,
      sourceSlots: Object.freeze([0]),
    }),
  });
  const first = oneOwner(bind(source, (value) => {
    if (mutate) source.value = 999;
    return value;
  }), "first.mutator");
  const derived = oneOwner(bindSources([source], (values) => values[0] * 10, {
    schemaVersion: 2,
    ownerProgramId: "Board",
    sinkId: "single.derived",
    sourceSites: ["x"],
  }), "single.derived");
  root.commit(jsx("output", { first, derived }), undefined, true);
  const token = mustToken(root.prepareNumericRowProgram({
    owner: 760,
    layout: oneLayout,
    rowIdentity: {}, row: 0, generation: 1,
    sources: [source], columns: [column],
  }));
  column.values[0] = 5;
  mutate = true;
  executeNumericRowCut(root,
    [token], new Uint32Array([0]), new Uint32Array([0]), [5], 1,
  );
  same(container.children[0].props.derived, 50,
    "one-source v2 derive receives captured value even after another projector mutates source.value");
  root.dispose();
});
