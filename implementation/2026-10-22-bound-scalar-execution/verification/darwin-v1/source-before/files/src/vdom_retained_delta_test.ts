import {
  bind,
  bindSources,
  jsx,
  NumericColumn,
  ScalarSource,
} from "./jsx_binding_runtime.ts";
import { MemoryVDOMHost, VDOMSnapshotRoot } from "./vdom_snapshot_runtime.ts";

const equal = (actual: unknown, expected: unknown, message: string) => {
  if (!Object.is(actual, expected)) {
    throw new Error(
      `${message}: expected ${String(expected)}, got ${String(actual)}`,
    );
  }
};

const unary = (source: ScalarSource, sinkId: string) =>
  bindSources([source], ([value]) => value, {
    schemaVersion: 1,
    sinkId,
    sourceSites: [sinkId],
    closedExpression: { kind: "input", index: 0 },
  });

Deno.test("retained scalar delta accepts an unrelated publication and rejects output overlap", () => {
  const x = new ScalarSource(1, 1);
  const health = new ScalarSource(2, 4);
  const host = new MemoryVDOMHost();
  const container = host.createContainer();
  const root = new VDOMSnapshotRoot(host, container);
  root.commit(
    jsx("output", {
      x: unary(x, "x"),
      health: unary(health, "health"),
    }),
    null,
    true,
  );
  x.value = 2;
  const xDelta = root.prepareRetainedSourceDelta([[x, 2]]);
  equal(!!xDelta, true, "x cut prepared");
  equal(xDelta!.readSources.length, 1, "one captured input");
  equal(xDelta!.readSources[0], x, "x captured");
  health.value = 5;
  const healthDelta = root.prepareRetainedSourceDelta([[health, 5]]);
  equal(!!healthDelta, true, "health cut prepared");
  root.beginPublication();
  root.applyRetainedSourceDelta(healthDelta!);
  equal(
    root.isRetainedSourceDeltaCurrent(healthDelta!, { afterHost: true }),
    true,
    "applied cut remains current before acceptance",
  );
  root.publishAccepted();
  equal(
    root.isRetainedSourceDeltaCurrent(xDelta!),
    true,
    "unrelated commit permits x",
  );
  root.beginPublication();
  equal(root.applyRetainedSourceDelta(xDelta!), true, "x writer changed");
  root.publishAccepted();
  equal(container.children[0].props.x, 2, "x reached host");
  equal(container.children[0].props.health, 5, "health reached host");

  const stale = root.prepareRetainedSourceDelta([[x, 2]]);
  equal(!!stale, true, "equal-value cut prepared");
  root.beginPublication();
  equal(
    root.applyRetainedSourceDelta(stale!),
    false,
    "equal output skips host",
  );
  root.publishAccepted();
  equal(
    root.isRetainedSourceDeltaCurrent(stale!),
    false,
    "accepted overlap revokes old cut",
  );
  root.dispose();
});

Deno.test("retained derived delta captures every input and declines stale source or structure", () => {
  const x = new ScalarSource(3, 1);
  const camera = new ScalarSource(4, 10);
  const host = new MemoryVDOMHost();
  const container = host.createContainer();
  const root = new VDOMSnapshotRoot(host, container);
  const derived = bindSources([x, camera], ([a, b]) => a + b, {
    schemaVersion: 2,
    ownerProgramId: "scene",
    sinkId: "joint",
    sourceSites: ["x", "camera"],
    closedExpression: {
      kind: "binary",
      operator: "+",
      left: { kind: "input", index: 0 },
      right: { kind: "input", index: 1 },
    },
  });
  root.commit(jsx("output", { joint: derived }), null, true);
  x.value = 2;
  const delta = root.prepareRetainedSourceDelta([[x, 2]]);
  equal(!!delta, true, "joint cut prepared");
  equal(delta!.readSources.length, 2, "joint cut has both dependencies");
  camera.value = 11;
  equal(
    root.isRetainedSourceDeltaCurrent(delta!),
    false,
    "other input invalidates cut",
  );
  const fresh = root.prepareRetainedSourceDelta([[x, 2]]);
  equal(!!fresh, true, "fresh joint cut prepared");
  root.commit(jsx("output", { joint: unary(x, "replacement") }), null, true);
  equal(
    root.isRetainedSourceDeltaCurrent(fresh!),
    false,
    "structure revokes cut",
  );
  root.dispose();
});

Deno.test("retained scalar delta declines opaque and aggregate outputs", () => {
  const x = new ScalarSource(5, 1);
  const host = new MemoryVDOMHost();
  const container = host.createContainer();
  const root = new VDOMSnapshotRoot(host, container);
  const opaque = Object.assign(bindSources([x], ([value]) => [value]), {
    numericProgram: {
      schemaVersion: 1 as const,
      sinkId: "tuple",
      sourceSites: ["x"],
    },
  });
  root.commit(jsx("output", { tuple: opaque }), null, true);
  x.value = 2;
  equal(
    root.prepareRetainedSourceDelta([[x, 2]]),
    null,
    "aggregate cut declines",
  );
  root.dispose();
});

Deno.test("retained cut requires a runtime-owned data binding and uses it for initial output", () => {
  const forgedSource = new ScalarSource(6, 1);
  const forgedHost = new MemoryVDOMHost();
  const forgedContainer = forgedHost.createContainer();
  const forgedRoot = new VDOMSnapshotRoot(forgedHost, forgedContainer);
  const forged = Object.assign(bind(forgedSource, (value) => value * 2), {
    numericProgram: {
      schemaVersion: 2 as const,
      ownerProgramId: "forged",
      sinkId: "value",
      sourceSites: ["value"],
      closedExpression: { kind: "input" as const, index: 0 },
    },
  });
  forgedRoot.commit(jsx("output", { value: forged }), null, true);
  equal(
    forgedContainer.children[0].props.value,
    2,
    "ordinary forged binding uses projector",
  );
  forgedSource.value = 3;
  equal(
    forgedRoot.prepareRetainedSourceDelta([[forgedSource, 3]]),
    null,
    "copied public metadata does not grant retained execution",
  );
  forgedRoot.dispose();

  const source = new ScalarSource(7, 1);
  const host = new MemoryVDOMHost();
  const container = host.createContainer();
  const root = new VDOMSnapshotRoot(host, container);
  let authoredCalls = 0;
  const binding = bindSources([source], () => {
    authoredCalls++;
    throw new Error("authored callback must not run for a closed data binding");
  }, {
    schemaVersion: 2,
    ownerProgramId: "scene",
    sinkId: "value",
    sourceSites: ["value"],
    closedExpression: { kind: "input", index: 0 },
  });
  root.commit(jsx("output", { value: binding }), null, true);
  equal(
    container.children[0].props.value,
    1,
    "initial output uses closed data expression",
  );
  source.value = 5;
  const delta = root.prepareRetainedSourceDelta([[source, 5]]);
  equal(!!delta, true, "runtime-owned data binding prepares");
  root.beginPublication();
  equal(
    root.applyRetainedSourceDelta(delta!),
    true,
    "retained host output changes",
  );
  root.publishAccepted();
  equal(
    container.children[0].props.value,
    5,
    "retained output uses same data expression",
  );
  equal(authoredCalls, 0, "neither path invoked authored callback");
  root.dispose();
});

Deno.test("retained source history composes with prepared numeric cell execution", () => {
  const source = new ScalarSource(30, 1);
  const column = new NumericColumn(30, 0, new Float64Array([1]));
  const host = new MemoryVDOMHost();
  const container = host.createContainer();
  const root = new VDOMSnapshotRoot(host, container);
  root.commit(jsx("output", { value: unary(source, "value") }), null, true);
  const cell = root.prepareNumericCellProgram(source, column, 0);
  if (!cell) throw new Error("Missing numeric cell capability");
  root.executePreparedNumericCells([cell], [1], 1);
  source.value = 4;
  const delta = root.prepareRetainedSourceDelta([[source, 4]]);
  if (!delta) throw new Error("Missing retained delta");
  root.beginPublication();
  root.applyRetainedSourceDelta(delta);
  root.publishAccepted();
  equal(container.children[0].props.value, 4, "retained value accepted");
  equal(
    root.executePreparedNumericCells([cell], [1], 1),
    true,
    "prior source value writes again",
  );
  equal(
    container.children[0].props.value,
    1,
    "numeric cell did not skip old input",
  );
  root.dispose();
});
