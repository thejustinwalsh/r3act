import { bind, bindSources, jsx, ScalarSource } from "./jsx_binding_runtime.ts";
import { MemoryVDOMHost, VDOMSnapshotRoot } from "./vdom_snapshot_runtime.ts";

const equal = (actual: unknown, expected: unknown, message: string) => {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(
      `${message}: expected ${JSON.stringify(expected)}, got ${
        JSON.stringify(actual)
      }`,
    );
  }
};
const program = (sinkId: string, sourceSites: readonly string[]) => ({
  schemaVersion: 1 as const,
  sinkId,
  sourceSites,
});
const compiled = <T>(binding: T, descriptor: ReturnType<typeof program>): T =>
  Object.assign(binding as object, { numericProgram: descriptor }) as T;

Deno.test("program fanout detaches an old source when the retained prop switches source", () => {
  const oldSource = new ScalarSource(801, 1);
  const newSource = new ScalarSource(802, 7);
  for (const maintenance of ["delta", "rebuild"] as const) {
    const host = new MemoryVDOMHost();
    const container = host.createContainer();
    const root = new VDOMSnapshotRoot(
      host,
      container,
      undefined,
      undefined,
      "delta",
      maintenance,
    );
    const tree = (source: ScalarSource) =>
      jsx("output", {
        key: "retained",
        value: compiled(bind(source), program("value", ["value"])),
      });
    root.commit(tree(oldSource), null, true);
    const retained = container.children[0];
    root.commit(tree(newSource), null, true);
    equal(
      container.children[0] === retained,
      true,
      "source switch retains host identity",
    );
    equal(
      root.hasSourceProgram(oldSource),
      false,
      "old source loses all program membership",
    );
    equal(
      root.hasSourceProgram(newSource),
      true,
      "new source activates fanout",
    );
    let rejected = false;
    try {
      root.executeSourceProgram([oldSource], [3], 1);
    } catch {
      rejected = true;
    }
    equal(rejected, true, "old source cannot write retained host");
    equal(oldSource.value, 1, "rejected old source remains unchanged");
    root.executeSourceProgram([newSource], [8], 1);
    equal(retained.props.value, 8, "new source reaches retained host");
    root.dispose();
  }
});

Deno.test("missing style capability retains the general batch path and static style fields", () => {
  const source = new ScalarSource(803, 1);
  const host = new MemoryVDOMHost();
  Object.defineProperty(host, "setStyleProp", { value: undefined });
  const container = host.createContainer();
  const root = new VDOMSnapshotRoot(host, container);
  root.commit(
    jsx("div", {
      style: {
        left: compiled(
          bind(source, (value) => `${value}px`),
          program("left", ["value"]),
        ),
        width: "7px",
      },
    }),
    null,
    true,
  );
  equal(
    root.hasSourceProgram(source),
    false,
    "whole-style writer is an explicit capability fallback",
  );
  root.setSources([[source, 5]]);
  equal(
    container.children[0].props.style,
    { left: "5px", width: "7px" },
    "general batch preserves static fields",
  );
  root.dispose();
});

Deno.test("numeric programs reject nested batches before mutation and release guard after host failure", () => {
  const source = new ScalarSource(999, 1);
  let root!: VDOMSnapshotRoot<ReturnType<MemoryVDOMHost["createContainer"]>>;
  class Host extends MemoryVDOMHost {
    nested = false;
    fail = false;
    override setProp(
      node: Parameters<MemoryVDOMHost["setProp"]>[0],
      name: string,
      value: unknown,
      previous?: unknown,
    ) {
      if (this.nested && name === "first") {
        let rejected = false;
        try {
          root.executeSourceProgram([source], [99], 1);
        } catch {
          rejected = true;
        }
        equal(
          rejected,
          true,
          "nested program rejects before overwriting scratch",
        );
        equal(
          source.value,
          value,
          "nested program does not change the outer source cut",
        );
      }
      if (this.fail && name === "second") throw new Error("host failed");
      super.setProp(node, name, value, previous);
    }
  }
  const host = new Host();
  const container = host.createContainer();
  root = new VDOMSnapshotRoot(host, container);
  root.commit(
    jsx("output", {
      first: compiled(bind(source), program("first", ["v"])),
      second: compiled(
        bind(source, (value) => value * 2),
        program("second", ["v"]),
      ),
    }),
    null,
    true,
  );
  host.nested = true;
  root.executeSourceProgram([source], [2], 1);
  equal(
    [container.children[0].props.first, container.children[0].props.second],
    [2, 4],
    "outer outputs remain coherent",
  );
  host.fail = true;
  let failed = false;
  try {
    root.executeSourceProgram([source], [3], 1);
  } catch {
    failed = true;
  }
  equal(failed, true, "host failure propagates");
  equal(
    root.diagnostics().numericProgramScratchRetained,
    0,
    "host failure releases scratch refs",
  );
  host.fail = false;
  root.executeSourceProgram([source], [4], 1);
  equal(
    [container.children[0].props.first, container.children[0].props.second],
    [4, 8],
    "raw numeric guard is reusable after host error",
  );
  root.dispose();
});

Deno.test("numeric source programs batch sparse and dense compound sinks once", () => {
  const a = new ScalarSource(1, 2);
  const b = new ScalarSource(2, 3);
  let unaryRuns = 0;
  let compoundRuns = 0;
  const host = new MemoryVDOMHost();
  const container = host.createContainer();
  const root = new VDOMSnapshotRoot(host, container);
  const unary = compiled(
    bind(a, (value) => {
      unaryRuns++;
      return value * 2;
    }),
    program("u", ["a"]),
  );
  const compound = compiled(
    bindSources([a, b], ([x, y]) => {
      compoundRuns++;
      return x + y;
    }),
    program("c", ["a", "b"]),
  );
  root.commit(jsx("output", { value: unary, total: compound }), null, true);
  equal(root.hasSourceProgram(a), true, "a has program groups");
  equal(root.hasSourceProgram(b), true, "b has program groups");
  unaryRuns = 0;
  compoundRuns = 0;
  equal(root.executeSourceProgram([a], [4], 1), true, "sparse cut changes a");
  equal(unaryRuns, 1, "unary projected once");
  equal(compoundRuns, 1, "compound projected once on sparse cut");
  equal(container.children[0].props.value, 8, "unary output");
  equal(container.children[0].props.total, 7, "compound output");
  unaryRuns = 0;
  compoundRuns = 0;
  root.executeSourceProgram([a, b], [5, 6], 2);
  equal(unaryRuns, 1, "dense unary projected once");
  equal(compoundRuns, 1, "dense compound deduplicated");
  equal(container.children[0].props.total, 11, "dense output is coherent");
  root.dispose();
});

Deno.test("numeric program validates duplicate and stale sources before mutation; setSources keeps last-write semantics", () => {
  const source = new ScalarSource(3, 1);
  const host = new MemoryVDOMHost();
  const container = host.createContainer();
  const root = new VDOMSnapshotRoot(host, container);
  root.commit(
    jsx("output", {
      value: compiled(bind(source, (value) => value), program("v", ["v"])),
    }),
    null,
    true,
  );
  let duplicateRejected = false;
  try {
    root.executeSourceProgram([source, source], [2, 3], 2);
  } catch {
    duplicateRejected = true;
  }
  equal(duplicateRejected, true, "duplicate rejected");
  equal(source.value, 1, "duplicate validation precedes mutation");
  equal(
    root.diagnostics().numericProgramScratchRetained,
    0,
    "validation throw clears scratch",
  );
  equal(root.executeSourceProgram([source], [1], 1), false, "equal no-op cut");
  equal(
    root.diagnostics().numericProgramScratchRetained,
    0,
    "no-op clears source slot scratch",
  );
  equal(
    root.executeSourceProgram([source], [2], 1),
    true,
    "epoch advances after failed batch",
  );
  root.setSources([[source, 2], [source, 4]]);
  equal(source.value, 4, "public setSources retains last-write Map semantics");
  const removed = new ScalarSource(4, 0);
  let staleRejected = false;
  try {
    root.executeSourceProgram([removed], [1], 1);
  } catch {
    staleRejected = true;
  }
  equal(staleRejected, true, "stale source rejected");
  equal(removed.value, 0, "stale source left unchanged");
  root.dispose();
});

Deno.test("numeric program source validation scales to dense cuts and sink slots reuse on churn", () => {
  const count = 700;
  const sources = Array.from(
    { length: count },
    (_, index) => new ScalarSource(index + 20, index),
  );
  const tree = (include: boolean) => {
    const props: Record<string, unknown> = {};
    if (include) {
      for (let index = 0; index < count; index++) {
        props[`p${index}`] = compiled(
          bind(sources[index], (value) => value + 1),
          program(`sink-${index}`, [`site-${index}`]),
        );
      }
    }
    return jsx("output", props);
  };
  for (const maintenance of ["delta", "rebuild"] as const) {
    const host = new MemoryVDOMHost();
    const container = host.createContainer();
    const root = new VDOMSnapshotRoot(
      host,
      container,
      undefined,
      undefined,
      "delta",
      maintenance,
    );
    root.commit(tree(true), null, true);
    const denseValues = sources.map((source) => source.value + 10);
    equal(
      root.executeSourceProgram(sources, denseValues, count),
      true,
      `${maintenance}: dense source cut updates`,
    );
    equal(
      root.diagnostics().numericProgramScratchRetained,
      0,
      `${maintenance}: dense completion clears scratch`,
    );
    const scratchCapacity = root.diagnostics().numericProgramScratchCapacity;
    equal(
      root.executeSourceProgram(sources, denseValues, count),
      false,
      `${maintenance}: equal dense cut is a no-op`,
    );
    equal(
      root.diagnostics().numericProgramScratchCapacity,
      scratchCapacity,
      `${maintenance}: no-op retains scratch high-water storage`,
    );
    equal(
      root.diagnostics().numericProgramScratchRetained,
      0,
      `${maintenance}: no-op clears active references`,
    );
    const peakCapacity = root.diagnostics().numericProgramSinkSlotCapacity;
    for (let iteration = 0; iteration < 8; iteration++) {
      root.commit(tree(false), null, true);
      root.commit(tree(true), null, true);
    }
    equal(
      root.diagnostics().numericProgramSinkSlots,
      count,
      `${maintenance}: active sink count remains exact`,
    );
    equal(
      root.diagnostics().numericProgramSinkSlotCapacity,
      peakCapacity,
      `${maintenance}: sink slot capacity stays bounded by peak active sinks`,
    );
    equal(
      root.diagnostics().numericProgramFreeSinkSlots,
      0,
      `${maintenance}: reattached sinks reuse released slots`,
    );
    equal(
      root.diagnostics().numericProgramScratchCapacity,
      scratchCapacity,
      `${maintenance}: batches reuse scratch high-water storage`,
    );
    root.dispose();
  }
});

Deno.test("numeric program indices follow detach and projection failure stages no host writes", () => {
  const source = new ScalarSource(5, 2);
  const other = new ScalarSource(6, 4);
  let active = true;
  const host = new MemoryVDOMHost();
  const container = host.createContainer();
  const root = new VDOMSnapshotRoot(host, container);
  const makeTree = () =>
    jsx("output", {
      ...(active
        ? {
          value: compiled(
            bind(source, (value) => value + 1),
            program("v", ["v"]),
          ),
        }
        : {}),
      total: compiled(
        bindSources([source, other], ([a, b]) => {
          if (a === 9) throw new Error("projection failed");
          return a + b;
        }),
        program("sum", ["v", "w"]),
      ),
    });
  root.commit(makeTree(), null, true);
  active = false;
  root.commit(makeTree(), null, true);
  equal(
    root.hasSourceProgram(source),
    true,
    "remaining compound sink supports source",
  );
  let projectionFailed = false;
  try {
    root.executeSourceProgram([source, other], [9, 7], 2);
  } catch {
    projectionFailed = true;
  }
  equal(projectionFailed, true, "projection error propagated");
  equal(
    container.children[0].props.total,
    6,
    "projection failure makes no host writes",
  );
  equal(
    root.executeSourceProgram([source], [10], 1),
    true,
    "guard released after projection error",
  );
  equal(
    container.children[0].props.total,
    17,
    "subsequent projection succeeds after throw",
  );
  root.dispose();
  equal(root.hasSourceProgram(source), false, "dispose clears program index");
});
