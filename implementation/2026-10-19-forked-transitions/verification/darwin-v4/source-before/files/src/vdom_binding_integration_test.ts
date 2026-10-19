import {
  bind,
  bindCompiled,
  jsx,
  ScalarSource,
} from "./jsx_binding_runtime.ts";
import {
  type MemoryNode,
  MemoryVDOMHost,
  VDOMSnapshotRoot,
} from "./vdom_snapshot_runtime.ts";

const equal = (actual: unknown, expected: unknown, label: string) => {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(
      `${label}: ${JSON.stringify(actual)} != ${JSON.stringify(expected)}`,
    );
  }
};

Deno.test("seeded structural bindings match independent values and rebuild reference", () => {
  for (const seed of [17, 83, 191]) {
    const states = ["delta", "rebuild"].map((mode) => {
      const host = new MemoryVDOMHost(), container = host.createContainer();
      const sources = [new ScalarSource(0, 1), new ScalarSource(1, 2)];
      const root = new VDOMSnapshotRoot(
        host,
        container,
        undefined,
        undefined,
        "delta",
        mode as "delta" | "rebuild",
      );
      return { root, container, sources, prior: new Map<number, MemoryNode>() };
    });
    let rows = [{ id: 0, source: 0, style: true }, {
      id: 1,
      source: 1,
      style: true,
    }];
    let random = seed, nextId = 2;
    const next =
      () => (random = (Math.imul(random, 1664525) + 1013904223) >>> 0);
    for (let step = 0; step < 30; step++) {
      if (step) {
        const index = next() % rows.length;
        switch (next() % 4) {
          case 0:
            rows.splice(index, 0, {
              id: nextId++,
              source: next() % 2,
              style: true,
            });
            break;
          case 1:
            if (rows.length > 1) rows.splice(index, 1);
            break;
          case 2:
            rows[index] = {
              ...rows[index],
              source: 1 - rows[index].source,
              style: !rows[index].style,
            };
            break;
          case 3:
            rows.push(rows.splice(index, 1)[0]);
            break;
        }
      }
      const projections: unknown[] = [];
      for (const { root, container, sources, prior } of states) {
        root.commit(
          jsx(
            "section",
            {},
            rows.map((row) =>
              jsx("i", {
                key: row.id,
                "data-id": row.id,
                value: bind(sources[row.source], (value) => value + row.id),
                ...(row.style
                  ? {
                    style: {
                      left: bind(sources[row.source], (value) => value * 2),
                      opacity: bind(
                        sources[1 - row.source],
                        (value) => value / 100,
                      ),
                    },
                  }
                  : {}),
              })
            ),
          ),
          null,
          true,
        );
        const values = [step + 3, step + 7];
        root.setSources(
          sources.flatMap((source, index) =>
            root.hasBoundSource(source)
              ? [[source, values[index]] as const]
              : []
          ),
        );
        const actual = container.children[0].children;
        for (let index = 0; index < rows.length; index++) {
          const row = rows[index], node = actual[index];
          equal(
            node.props.value,
            values[row.source] + row.id,
            "independent value oracle",
          );
          if (row.style) {
            equal(node.props.style, {
              left: values[row.source] * 2,
              opacity: values[1 - row.source] / 100,
            }, "independent style oracle");
          } else equal(node.props.style, undefined, "removed style writers");
          if (prior.has(row.id) && prior.get(row.id) !== node) {
            throw new Error("surviving key lost identity");
          }
        }
        prior.clear();
        for (const node of actual) {
          prior.set(node.props["data-id"] as number, node);
        }
        projections.push(actual.map((node) => node.props));
      }
      equal(projections[0], projections[1], "delta/rebuild host parity");
    }
    for (const state of states) state.root.dispose();
  }
});

Deno.test("actual compiled graph bindings survive graph-to-direct fallback and resumed delta", () => {
  const host = new MemoryVDOMHost(), container = host.createContainer();
  const root = new VDOMSnapshotRoot(host, container);
  const source = new ScalarSource(0, 2);
  const graph = {
    sourceCount: 1,
    sourcePaths: ["value"],
    sourceBindingOffsets: [0, 1],
    bindingIds: [4],
  };
  root.commit(
    jsx("i", { key: "same", value: bindCompiled(source, 4, 0) }),
    graph,
  );
  const node = container.children[0];
  root.setSource(source, 3);
  equal(node.props.value, 3, "compiled source write");
  root.commit(
    jsx("i", { key: "same", value: bind(source, (value) => value * 2) }),
    null,
    true,
  );
  root.setSource(source, 4);
  equal(node.props.value, 8, "direct fallback source write");
  root.commit(
    jsx("i", { key: "same", value: bind(source, (value) => value * 3) }),
    null,
    true,
  );
  root.setSource(source, 5);
  equal(node.props.value, 15, "resumed delta projector write");
  if (container.children[0] !== node) {
    throw new Error("graph/mode transition lost host identity");
  }
  root.commit(jsx("i", { key: "same" }), null, true);
  equal(root.hasBoundSource(source), false, "direct group detached");
  root.dispose();
});

Deno.test("index repair failure preserves the host error and clears unsafe binding ownership", () => {
  class FailingHost extends MemoryVDOMHost {
    override createElement(tag: string) {
      if (tag === "fail") throw new Error("creation interrupted");
      return super.createElement(tag);
    }
  }
  const host = new FailingHost(), container = host.createContainer();
  const root = new VDOMSnapshotRoot(host, container);
  const source = new ScalarSource(0, 1);
  const graph = (bindingId: number) => ({
    sourceCount: 1,
    sourcePaths: ["value"],
    sourceBindingOffsets: [0, 1],
    bindingIds: [bindingId],
  });
  const view = (bindingId: number, fail = false) =>
    jsx("section", {}, [
      ...(fail ? [jsx("fail", { key: "new" })] : []),
      jsx("i", { key: "stable", value: bindCompiled(source, bindingId, 0) }),
    ]);
  root.commit(view(4), graph(4));
  let failure: unknown;
  try {
    root.commit(view(9, true), graph(9));
  } catch (error) {
    failure = error;
  }
  if (!(failure instanceof AggregateError)) {
    throw new Error("repair failure must preserve multiple causes");
  }
  const messages = failure.errors.map((error) =>
    error instanceof Error ? error.message : String(error)
  );
  if (!messages.includes("creation interrupted")) {
    throw new Error("original host exception was lost");
  }
  if (
    !messages.some((message) => message.includes("absent from source slot"))
  ) throw new Error("repair exception missing");
  equal(
    root.hasBoundSource(source),
    false,
    "unsafe graph writer ownership cleared",
  );
  root.dispose();
});
