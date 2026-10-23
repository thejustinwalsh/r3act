import {
  bind,
  jsx,
  NumericColumn,
  ScalarSource,
} from "./jsx_binding_runtime.ts";
import {
  MemoryVDOMHost,
  type MemoryNode,
  VDOMSnapshotRoot,
} from "./vdom_snapshot_runtime.ts";

const assert: (condition: unknown, message: string) => asserts condition = (condition, message) => {
  if (!condition) throw new Error(message);
};
const equal = (actual: unknown, expected: unknown, message = "Values differ") => {
  if (!Object.is(actual, expected)) {
    throw new Error(`${message}: expected ${String(expected)}, received ${String(actual)}`);
  }
};

const unary = <T>(
  source: ScalarSource,
  sinkId: string,
  project: (value: number) => T,
) => ({
  ...bind(source, project),
  numericProgram: {
    schemaVersion: 1 as const,
    sinkId,
    sourceSites: [`site:${sinkId}`],
  },
});

Deno.test("prepared cell cuts retain unary fanout, reject conflicting duplicates, and invalidate on refresh", () => {
  const host = new MemoryVDOMHost();
  const container = host.createContainer();
  const root = new VDOMSnapshotRoot(host, container);
  const column = new NumericColumn(0, 0, new Float64Array([1]));
  const source = new ScalarSource(0, 1);
  const tree = (project: (value: number) => string, descriptor = true) =>
    jsx("output", {
      first: descriptor
        ? unary(source, "first", project)
        : bind(source, project),
      second: unary(source, "second", (value) => `${value * 2}px`),
    });
  root.commit(tree((value) => `${value}px`), null, true);

  const token = root.prepareNumericCellProgram(source, column, 0);
  assert(token, "eligible unary source should prepare a token");
  assert(root.isPreparedNumericCellProgramCurrent(token), "new token must be current");
  const output = container.children[0];
  const writes = host.writeCount;
  equal(root.executePreparedNumericCells([token], [4], 1), true);
  equal(output.props.first, "4px");
  equal(output.props.second, "8px");
  equal(source.value, 4);
  equal(host.writeCount - writes, 2, "prepared token should fan out to both host writers");
  equal(root.executePreparedNumericCells([token], [4], 1), false, "unchanged values skip host writes");

  const beforeConflictWrites = host.writeCount;
  equal(root.executePreparedNumericCells([token, token], [7, 8], 2), null);
  equal(source.value, 4, "conflicting duplicates must not mutate the source");
  equal(host.writeCount, beforeConflictWrites, "conflicting duplicates must not write hosts");
  equal(root.executePreparedNumericCells([token, token], [7, 7], 2), true);
  equal(source.value, 7);

  root.commit(tree((value) => `${value * 3}px`), null, true);
  equal(root.isPreparedNumericCellProgramCurrent(token), false, "same-membership prop refresh invalidates token");
  const beforeStaleWrites = host.writeCount;
  equal(root.executePreparedNumericCells([token], [9], 1), null);
  equal(source.value, 7, "stale token preflight must not mutate its source");
  equal(host.writeCount, beforeStaleWrites, "stale token preflight must not write hosts");
  const refreshed = root.prepareNumericCellProgram(source, column, 0);
  assert(refreshed && refreshed !== token, "refresh should issue a fresh token");
  equal(root.executePreparedNumericCells([refreshed], [9], 1), true);
  equal(output.props.first, "27px");
  equal(output.props.second, "18px");

  root.commit(tree((value) => `${value}px`, false), null, true);
  equal(root.isPreparedNumericCellProgramCurrent(refreshed), false, "unsupported writer refresh invalidates token");
  equal(root.prepareNumericCellProgram(source, column, 0), null);
  root.dispose();
});

Deno.test("prepared cell cuts validate all token provenance before projection and mirror all sources", () => {
  const events: string[] = [];
  class Host extends MemoryVDOMHost {
    override setProp(node: MemoryNode, name: string, value: unknown, previous?: unknown) {
      events.push(`host:${name}`);
      super.setProp(node, name, value, previous);
    }
  }
  const host = new Host();
  const container = host.createContainer();
  const root = new VDOMSnapshotRoot(host, container);
  const column = new NumericColumn(0, 0, new Float64Array([1, 2]));
  const a = new ScalarSource(0, 1);
  const b = new ScalarSource(1, 2);
  const firstBinding = unary(a, "a", (value: number) => {
      events.push("project:a");
      return `${value}/${b.value}`;
    });
  const secondBinding = unary(b, "b", (value: number) => {
    events.push("project:b");
    return `${value}`;
  });
  root.commit(jsx("output", { a: firstBinding, b: secondBinding }), null, true);
  const tokenA = root.prepareNumericCellProgram(a, column, 0)!;
  const tokenB = root.prepareNumericCellProgram(b, column, 1)!;
  events.length = 0;

  const otherHost = new MemoryVDOMHost();
  const otherRoot = new VDOMSnapshotRoot(otherHost, otherHost.createContainer());
  const otherSource = new ScalarSource(3, 0);
  otherRoot.commit(jsx("i", { value: unary(otherSource, "other", (value) => value) }), null, true);
  const otherToken = otherRoot.prepareNumericCellProgram(
    otherSource,
    new NumericColumn(2, 2, new Float64Array([0])),
    0,
  )!;
  equal(root.executePreparedNumericCells([tokenA, otherToken], [5, 6], 2), null);
  equal(a.value, 1, "foreign token must reject the whole cut before source mutation");
  equal(b.value, 2);
  equal(events.length, 0, "foreign token must reject before any projector or host write");

  equal(root.executePreparedNumericCells([tokenA, tokenB], [5, 6], 2), true);
  equal(container.children[0].props.a, "5/6", "projector should observe all mirrored values");
  equal(container.children[0].props.b, "6");
  const firstHost = events.findIndex((event) => event.startsWith("host:"));
  assert(firstHost >= 0, "host writes should occur");
  assert(events.slice(0, firstHost).every((event) => event.startsWith("project:")), "all projections must precede host writes");

  root.commit(jsx("output", {
    a: unary(a, "a", (value) => `${value}-changed`),
    b: secondBinding,
  }), null, true);
  equal(root.isPreparedNumericCellProgramCurrent(tokenA), false, "refresh invalidates only the changed source slot");
  equal(root.isPreparedNumericCellProgramCurrent(tokenB), true, "unrelated source token survives a local refresh");
  equal(root.executePreparedNumericCells([tokenB], [7], 1), true);
  equal(container.children[0].props.b, "7");
  otherRoot.dispose();
  root.dispose();
});

Deno.test("prepared token is invalidated by removal, rebuild, and disposal; disposal cancels an active cut", () => {
  let root!: VDOMSnapshotRoot<MemoryNode>;
  class Host extends MemoryVDOMHost {
    disposeOnWrite = false;
    override setProp(node: MemoryNode, name: string, value: unknown, previous?: unknown) {
      super.setProp(node, name, value, previous);
      if (this.disposeOnWrite) {
        this.disposeOnWrite = false;
        root.dispose();
      }
    }
  }
  const host = new Host();
  const container = host.createContainer();
  root = new VDOMSnapshotRoot(host, container);
  const column = new NumericColumn(0, 0, new Float64Array([1, 2]));
  const first = new ScalarSource(0, 1);
  const second = new ScalarSource(1, 2);
  const firstBinding = unary(first, "first", (value: number) => `${value}`);
  root.commit(jsx("output", {
    first: firstBinding,
    second: unary(second, "second", (value) => `${value}`),
  }), null, true);
  const firstToken = root.prepareNumericCellProgram(first, column, 0)!;
  const secondToken = root.prepareNumericCellProgram(second, column, 1)!;

  // A stale last token must prevent writes from an earlier valid token.
  root.commit(jsx("output", { first: firstBinding }), null, true);
  const writes = host.writeCount;
  equal(root.isPreparedNumericCellProgramCurrent(firstToken), true, "retained source token survives unrelated removal");
  equal(root.isPreparedNumericCellProgramCurrent(secondToken), false, "removed source token becomes stale");
  equal(root.executePreparedNumericCells([firstToken, secondToken], [8, 9], 2), null);
  equal(first.value, 1);
  equal(host.writeCount, writes);

  const current = firstToken;
  host.disposeOnWrite = true;
  equal(root.executePreparedNumericCells([current], [10], 1), false, "dispose during host write cancels remaining publication");
  equal(root.isPreparedNumericCellProgramCurrent(current), false);
  equal(root.executePreparedNumericCells([current], [11], 1), null);
  equal(root.diagnostics().columnRowsScratchRetained, 0);
  equal(root.diagnostics().columnRowsScratchCapacity, 0);
});

Deno.test("prepared tokens from a rebuilt binding index are stale and can be rebound", () => {
  const host = new MemoryVDOMHost();
  const container = host.createContainer();
  const root = new VDOMSnapshotRoot(host, container, undefined, undefined, "delta", "rebuild");
  const source = new ScalarSource(0, 1);
  const column = new NumericColumn(0, 0, new Float64Array([1]));
  root.commit(jsx("i", { value: unary(source, "value", (value) => value) }), null, true);
  const old = root.prepareNumericCellProgram(source, column, 0)!;
  root.commit(jsx("i", { value: unary(source, "value", (value) => value * 2) }), null, true);
  equal(root.isPreparedNumericCellProgramCurrent(old), false);
  equal(root.executePreparedNumericCells([old], [5], 1), null);
  equal(source.value, 1);
  const fresh = root.prepareNumericCellProgram(source, column, 0);
  assert(fresh && fresh !== old, "rebuilt index should provide a new token");
  equal(root.executePreparedNumericCells([fresh], [5], 1), true);
  equal(container.children[0].props.value, 10);
  root.dispose();
});

Deno.test("prepared projector failures write no hosts and leave the cut retryable", () => {
  const host = new MemoryVDOMHost();
  const container = host.createContainer();
  const root = new VDOMSnapshotRoot(host, container);
  const column = new NumericColumn(0, 0, new Float64Array([1, 2]));
  const first = new ScalarSource(0, 1);
  const second = new ScalarSource(1, 2);
  let fail = false;
  root.commit(jsx("output", {
    first: unary(first, "first", (value) => `${value}`),
    second: unary(second, "second", (value) => {
      if (fail) throw new Error("prepared projector failed");
      return `${value}`;
    }),
  }), null, true);
  const firstToken = root.prepareNumericCellProgram(first, column, 0)!;
  const secondToken = root.prepareNumericCellProgram(second, column, 1)!;
  const baseline = host.writeCount;
  fail = true;
  let error: unknown;
  try {
    root.executePreparedNumericCells([firstToken, secondToken], [8, 9], 2);
  } catch (caught) {
    error = caught;
  }
  assert(error instanceof Error && error.message === "prepared projector failed", "projector error should propagate");
  equal(first.value, 8, "all source values are mirrored before projector execution");
  equal(second.value, 9);
  equal(host.writeCount, baseline, "projection stage must finish before host writes");
  fail = false;
  equal(root.executePreparedNumericCells([firstToken, secondToken], [8, 9], 2), true);
  equal(container.children[0].props.first, "8");
  equal(container.children[0].props.second, "9");
  root.dispose();
});

Deno.test("prepared tokens reject out-of-root values and preserve nested-write guard", () => {
  const source = new ScalarSource(0, 1);
  const column = new NumericColumn(0, 0, new Float64Array([1]));
  let root!: VDOMSnapshotRoot<MemoryNode>;
  let nestedError = false;
  class ReentrantHost extends MemoryVDOMHost {
    override setProp(node: MemoryNode, name: string, value: unknown, previous?: unknown) {
      super.setProp(node, name, value, previous);
      if (name === "value" && !nestedError) {
        try {
          root.executePreparedNumericCells([], [], 0);
        } catch (error) {
          nestedError = error instanceof Error && error.message.includes("Nested numeric VDOM writes");
        }
      }
    }
  }
  const reentrantHost = new ReentrantHost();
  const reentrantContainer = reentrantHost.createContainer();
  root = new VDOMSnapshotRoot(reentrantHost, reentrantContainer);
  root.commit(jsx("i", { value: unary(source, "value", (value) => value) }), null, true);
  const token = root.prepareNumericCellProgram(source, column, 0)!;
  equal(root.executePreparedNumericCells([token], [3], 1), true);
  assert(nestedError, "prepared cuts should retain the nested numeric-write barrier");
  root.dispose();
});
