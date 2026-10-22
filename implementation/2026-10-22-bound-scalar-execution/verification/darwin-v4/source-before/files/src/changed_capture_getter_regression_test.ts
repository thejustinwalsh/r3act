import {
  bindSources,
  jsx,
  NumericColumn,
  ScalarSource,
} from "./jsx_binding_runtime.ts";
import {
  MemoryVDOMHost,
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
  programId: "GetterRegression",
  slots: Object.freeze([
    Object.freeze({ siteId: "x", slot: 0 }),
    Object.freeze({ siteId: "y", slot: 1 }),
  ]),
}) satisfies CompiledStateLayout;

function rowBinding(
  owner: number,
  sources: readonly [ScalarSource, ScalarSource],
  sinkId: string,
  project: (values: readonly number[]) => number,
) {
  const value = bindSources(sources, project, {
    schemaVersion: 2,
    ownerProgramId: "GetterRegression",
    sinkId,
    sourceSites: ["x", "y"],
  });
  return Object.assign(value, {
    numericProgram: Object.freeze({
      schemaVersion: 2 as const,
      ownerProgramId: "GetterRegression",
      sinkId,
      sourceSites: Object.freeze(["x", "y"]),
    }),
    numericOwner: Object.freeze({
      owner,
      programId: "GetterRegression",
      layout,
      sourceSlots: Object.freeze([0, 1]),
    }),
  });
}

function rowFixture(
  owner: number,
  baseSourceId: number,
  hostValue: number,
  prefix: string,
) {
  const x = new ScalarSource(baseSourceId, hostValue - 1);
  const y = new ScalarSource(baseSourceId + 1, 1);
  let projections = 0;
  const value = rowBinding(owner, [x, y], `${prefix}.sum`, (values) => {
    projections++;
    return values[0] + values[1];
  });
  const sources: (ScalarSource | undefined)[] = [x, y];
  const columns = [
    new NumericColumn(baseSourceId + 20, 0, new Float64Array([x.value])),
    new NumericColumn(baseSourceId + 21, 1, new Float64Array([y.value])),
  ];
  return { owner, value, x, y, sources, columns, projections: () => projections };
}

Deno.test("later value getters cannot revoke a previously checked changed lease", () => {
  const host = new MemoryVDOMHost();
  const container = host.createContainer();
  const root = new VDOMSnapshotRoot(host, container);
  const row = rowFixture(901, 910, 2, "changed");
  root.commit(jsx("output", { value: row.value }), undefined, true);
  const token = root.prepareNumericRowProgram({
    owner: row.owner, layout, rowIdentity: {}, row: 0, generation: 1,
    sources: row.sources, columns: row.columns,
  });
  assert(token, "row program prepares");
  const startProjectionCount = row.projections();
  let writes = 0;
  const originalSetProp = host.setProp.bind(host);
  host.setProp = (node, name, value, previous) => {
    if (name === "value") writes++;
    originalSetProp(node, name, value, previous);
  };
  const initialWrites = writes;
  row.columns[0].values[0] = 5;
  row.columns[1].values[0] = 7;
  const values = new Array<number>(2);
  Object.defineProperty(values, "0", { get: () => 5 });
  Object.defineProperty(values, "1", {
    get: () => {
      row.sources[0] = undefined;
      return 7;
    },
  });

  same(root.executePreparedNumericRows(
    [token], new Uint32Array([0, 0]), new Uint32Array([0, 1]), values, 2,
  ), null, "stale changed-slot lease declines after the later getter");
  same(row.x.value, 1, "decline leaves the earlier source mirror untouched");
  same(row.y.value, 1, "decline leaves the later source mirror untouched");
  same(row.projections(), startProjectionCount, "decline calls no projector");
  same(container.children[0].props.value, 2, "decline leaves host output unchanged");
  same(writes, initialWrites, "decline performs no host writes");
  root.dispose();
});

Deno.test("later value getters cannot revoke an untouched peer row lease", () => {
  const host = new MemoryVDOMHost();
  const container = host.createContainer();
  const root = new VDOMSnapshotRoot(host, container);
  const first = rowFixture(902, 920, 2, "first");
  const second = rowFixture(903, 930, 2, "second");
  root.commit(jsx("output", { first: first.value, second: second.value }), undefined, true);
  const firstToken = root.prepareNumericRowProgram({
    owner: first.owner, layout, rowIdentity: {}, row: 0, generation: 1,
    sources: first.sources, columns: first.columns,
  });
  const secondToken = root.prepareNumericRowProgram({
    owner: second.owner, layout, rowIdentity: {}, row: 0, generation: 1,
    sources: second.sources, columns: second.columns,
  });
  assert(firstToken && secondToken, "both row programs prepare");
  const firstProjectionCount = first.projections();
  const secondProjectionCount = second.projections();
  let writes = 0;
  const originalSetProp = host.setProp.bind(host);
  host.setProp = (node, name, value, previous) => {
    writes++;
    originalSetProp(node, name, value, previous);
  };
  const initialWrites = writes;
  first.columns[0].values[0] = 5;
  second.columns[0].values[0] = 8;
  const values = new Array<number>(2);
  Object.defineProperty(values, "0", { get: () => 5 });
  Object.defineProperty(values, "1", {
    get: () => {
      first.sources[1] = undefined;
      return 8;
    },
  });

  same(root.executePreparedNumericRows(
    [firstToken, secondToken],
    new Uint32Array([0, 1]),
    new Uint32Array([0, 0]),
    values,
    2,
  ), null, "stale untouched peer lease declines after the later getter");
  same(first.x.value, 1, "decline leaves first row mirror untouched");
  same(second.x.value, 1, "decline leaves second row mirror untouched");
  same(first.projections(), firstProjectionCount, "decline calls no first-row projector");
  same(second.projections(), secondProjectionCount, "decline calls no second-row projector");
  same(container.children[0].props.first, 2, "decline leaves first host output unchanged");
  same(container.children[0].props.second, 2, "decline leaves second host output unchanged");
  same(writes, initialWrites, "decline performs no host writes");
  root.dispose();
});

Deno.test("later value getter exceptions clean the cut without mirror or writes", () => {
  const host = new MemoryVDOMHost();
  const container = host.createContainer();
  const root = new VDOMSnapshotRoot(host, container);
  const row = rowFixture(904, 940, 2, "throwing");
  root.commit(jsx("output", { value: row.value }), undefined, true);
  const token = root.prepareNumericRowProgram({
    owner: row.owner, layout, rowIdentity: {}, row: 0, generation: 1,
    sources: row.sources, columns: row.columns,
  });
  assert(token, "row program prepares");
  const startProjectionCount = row.projections();
  let writes = 0;
  const originalSetProp = host.setProp.bind(host);
  host.setProp = (node, name, value, previous) => {
    writes++;
    originalSetProp(node, name, value, previous);
  };
  const initialWrites = writes;
  row.columns[0].values[0] = 5;
  row.columns[1].values[0] = 7;
  const values = new Array<number>(2);
  Object.defineProperty(values, "0", { get: () => 5 });
  Object.defineProperty(values, "1", {
    get: () => {
      throw new Error("caller supplied values getter");
    },
  });
  let threw = false;
  try {
    root.executePreparedNumericRows(
      [token], new Uint32Array([0, 0]), new Uint32Array([0, 1]), values, 2,
    );
  } catch {
    threw = true;
  }
  assert(threw, "caller getter error propagates");
  same(row.x.value, 1, "getter error leaves earlier mirror untouched");
  same(row.y.value, 1, "getter error leaves later mirror untouched");
  same(row.projections(), startProjectionCount, "getter error calls no projector");
  same(container.children[0].props.value, 2, "getter error leaves host output unchanged");
  same(writes, initialWrites, "getter error performs no host writes");
  root.dispose();
});

Deno.test("later value getters observe row retirement through a cached token", () => {
  const host = new MemoryVDOMHost();
  const container = host.createContainer();
  const root = new VDOMSnapshotRoot(host, container);
  const row = rowFixture(905, 950, 2, "retired");
  root.commit(jsx("output", { value: row.value }), undefined, true);
  const token = root.prepareNumericRowProgram({
    owner: row.owner, layout, rowIdentity: {}, row: 0, generation: 1,
    sources: row.sources, columns: row.columns,
  });
  assert(token, "row program prepares");
  const startProjectionCount = row.projections();
  let writes = 0;
  const originalSetProp = host.setProp.bind(host);
  host.setProp = (node, name, value, previous) => {
    if (name === "value") writes++;
    originalSetProp(node, name, value, previous);
  };
  const initialWrites = writes;
  row.columns[0].values[0] = 5;
  row.columns[1].values[0] = 7;
  const values = new Array<number>(2);
  Object.defineProperty(values, "0", { get: () => 5 });
  Object.defineProperty(values, "1", {
    get: () => {
      root.dispose();
      return 7;
    },
  });

  same(root.executePreparedNumericRows(
    [token], new Uint32Array([0, 0]), new Uint32Array([0, 1]), values, 2,
  ), null, "retired prepared row declines");
  same(row.x.value, 1, "retirement leaves source mirror untouched");
  same(row.y.value, 1, "retirement leaves peer mirror untouched");
  same(row.projections(), startProjectionCount, "retirement calls no projector");
  same(writes, initialWrites, "retirement causes no bound host write");
  same(container.children.length, 0, "getter-triggered disposal retires the rendered node");
});
