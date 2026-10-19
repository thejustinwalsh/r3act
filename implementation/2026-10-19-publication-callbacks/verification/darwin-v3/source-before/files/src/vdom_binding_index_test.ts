import {
  bind,
  bindSources,
  jsx,
  keyedOwnerChildren,
  ScalarSource,
} from "./jsx_binding_runtime.ts";
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

const totals = (samples: Array<Record<string, number>>) =>
  Object.assign({}, ...samples);
const bindingTotals = (samples: Array<Record<string, number>>) => {
  const all = totals(samples);
  return {
    "vdom.binding-index.incremental-group-detaches":
      all["vdom.binding-index.incremental-group-detaches"] ?? 0,
    "vdom.binding-index.incremental-group-attaches":
      all["vdom.binding-index.incremental-group-attaches"] ?? 0,
  };
};

const harness = (
  bindingMaintenance: "delta" | "rebuild",
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
    "delta",
    bindingMaintenance,
  );
  return {
    root,
    host,
    container,
    commit(tree: Parameters<typeof root.commit>[0]) {
      root.commit(tree, null, directBindingWrites);
    },
  };
};

Deno.test("delta and rebuild binding indexes agree across source, style, and removal changes", () => {
  const execute = (mode: "delta" | "rebuild") => {
    const a = new ScalarSource(1, 2);
    const b = new ScalarSource(2, 5);
    const c = new ScalarSource(3, 10);
    let reads = 0;
    const state = { switched: false, includeLeft: true };
    const makeTree = () => {
      const opacitySource = state.switched ? c : a;
      return jsx("output", {
        key: "output",
        style: {
          opacity: bind(opacitySource, (value) => value / 10),
          ...(state.includeLeft ? { left: bind(a, (value) => value + 1) } : {}),
          top: bind(b, (value) => value * 2),
        },
        "data-sum": bindSources([b, c], ([left, right]) => {
          reads++;
          return left + right;
        }),
      });
    };
    const root = harness(mode, true);
    root.commit(makeTree());
    equal(root.root.hasBoundSource(a), true, `${mode}: initial a group`);
    equal(root.root.hasBoundSource(b), true, `${mode}: initial b group`);
    equal(root.root.hasBoundSource(c), true, `${mode}: initial c group`);
    const output = root.container.children[0];
    root.root.setSources([[a, 3], [b, 6], [c, 11]]);
    equal(output.props.style, {
      opacity: 0.3,
      left: 4,
      top: 12,
    }, `${mode}: direct style updates`);
    equal(
      output.props["data-sum"],
      17,
      `${mode}: compound multi-source update`,
    );

    state.includeLeft = false;
    state.switched = true;
    root.commit(makeTree());
    equal(
      root.root.hasBoundSource(a),
      false,
      `${mode}: removed a source groups`,
    );
    equal(
      root.root.hasBoundSource(b),
      true,
      `${mode}: retained b source groups`,
    );
    equal(root.root.hasBoundSource(c), true, `${mode}: switched opacity group`);
    let rejectedOldSource = false;
    try {
      root.root.setSource(a, 99);
    } catch {
      rejectedOldSource = true;
    }
    equal(rejectedOldSource, true, `${mode}: removed source has no writers`);
    root.root.setSources([[b, 7], [c, 12]]);
    equal(output.props.style, {
      opacity: 1.2,
      top: 14,
    }, `${mode}: switched style updates`);
    equal(output.props["data-sum"], 19, `${mode}: refreshed compound group`);

    state.includeLeft = true;
    state.switched = false;
    root.commit(makeTree());
    equal(root.root.hasBoundSource(a), true, `${mode}: reattached a group`);
    root.root.setSource(a, 4);
    const outputStyle = output.props.style as Record<string, unknown>;
    equal(outputStyle.opacity, 0.4, `${mode}: reattached opacity`);
    equal(outputStyle.left, 5, `${mode}: reattached left writer`);
    root.root.dispose();
    return { shape: output.props, reads };
  };

  const delta = execute("delta");
  const rebuild = execute("rebuild");
  equal(delta.shape, rebuild.shape, "host props match reference index");
  equal(
    delta.reads,
    rebuild.reads,
    "derived readers run equally in both modes",
  );
});

Deno.test("delta binding registration changes only groups with changed source membership", () => {
  const samples: Array<Record<string, number>> = [];
  const root = harness("delta", true, samples);
  const a = new ScalarSource(10, 1);
  const b = new ScalarSource(11, 2);
  const view = (source: ScalarSource) =>
    jsx("div", {
      key: "view",
      style: {
        opacity: bind(source, (value) => value),
        left: bind(source, (value) => value * 2),
      },
    });
  // Establish the direct-write mode before measuring incremental attachment.
  root.commit(jsx("section", {}));
  samples.length = 0;
  root.commit(view(a));
  equal(bindingTotals(samples), {
    "vdom.binding-index.incremental-group-detaches": 0,
    "vdom.binding-index.incremental-group-attaches": 2,
  }, "two direct style groups registered");

  samples.length = 0;
  a.value = 3;
  root.commit(view(a));
  equal(bindingTotals(samples), {
    "vdom.binding-index.incremental-group-detaches": 0,
    "vdom.binding-index.incremental-group-attaches": 0,
  }, "value-only update keeps source registrations");
  equal(root.root.hasBoundSource(a), true, "same source remains bound");

  samples.length = 0;
  root.commit(view(b));
  equal(bindingTotals(samples), {
    "vdom.binding-index.incremental-group-detaches": 2,
    "vdom.binding-index.incremental-group-attaches": 2,
  }, "source switch replaces both property groups");
  equal(root.root.hasBoundSource(a), false, "old source removed from index");
  equal(root.root.hasBoundSource(b), true, "new source added to index");
  root.root.dispose();
});

Deno.test("cleanup failure does not retain bindings for a disposed host node", () => {
  class FailingDisposeHost extends MemoryVDOMHost {
    failDispose = true;
    dispose(_node: Parameters<MemoryVDOMHost["setProp"]>[0]) {
      if (this.failDispose) {
        this.failDispose = false;
        throw new Error("binding cleanup failed");
      }
    }
  }
  for (const mode of ["delta", "rebuild"] as const) {
    const source = new ScalarSource(mode === "delta" ? 20 : 21, 1);
    const host = new FailingDisposeHost();
    const root = harness(mode, false, undefined, host);
    root.commit(jsx(
      "div",
      {},
      jsx("i", {
        key: "bound",
        "data-value": bind(source),
      }),
    ));
    let failure: unknown;
    try {
      root.commit(jsx("div", {}, []));
    } catch (error) {
      failure = error;
    }
    equal(
      failure instanceof AggregateError,
      true,
      `${mode}: cleanup failure propagated`,
    );
    equal(
      (failure as AggregateError).errors.some((error) =>
        error instanceof Error &&
        error.message.includes("binding cleanup failed")
      ),
      true,
      `${mode}: original host failure remains visible`,
    );
    equal(
      root.root.hasBoundSource(source),
      false,
      `${mode}: disposed writer removed`,
    );
    let rejected = false;
    try {
      root.root.setSource(source, 2);
    } catch {
      rejected = true;
    }
    equal(rejected, true, `${mode}: disposed writer cannot receive updates`);
    root.root.dispose();
  }
});

Deno.test("plain scalar binding metadata stays sparse-ineligible when compiler tags differ", () => {
  const root = harness("delta");
  const source = new ScalarSource(30, 1);
  const makeBinding = (bindingId: number) => ({
    ...bind(source),
    bindingId,
    sourceSlot: 0,
  });
  const tree = (value: unknown) =>
    jsx(
      "div",
      { key: "parent" },
      keyedOwnerChildren("rows", [jsx("i", { key: "binding", value })]),
    );
  root.commit(tree(makeBinding(1)));
  equal(
    root.root.commitKeyedRegionDelta("parent", "rows", []),
    false,
    "compiler-tagged plain binding disables sparse binding path",
  );
  root.commit(tree(bind(source)));
  equal(
    root.root.commitKeyedRegionDelta("parent", "rows", []),
    true,
    "removing compiler tags restores sparse eligibility",
  );
  equal(
    root.root.hasBoundSource(source),
    true,
    "plain fallback keeps source available",
  );
  root.root.dispose();
});

Deno.test("direct scalar styles retain CSR/column fallback after rebuild and incremental metadata changes", () => {
  const h = harness("delta", true);
  const source = new ScalarSource(777, 1);
  const view = (tagged: boolean) => jsx("div", { key: "parent" }, keyedOwnerChildren("rows", [jsx("i", { key: "binding", style: { opacity: tagged ? {...bind(source), bindingId: 1, sourceSlot: 0} : bind(source) } })]));
  h.commit(view(true));
  equal(h.root.commitKeyedRegionDelta("parent", "rows", []), false, "mode-change rebuild marks direct CSR metadata incompatible");
  h.commit(view(false));
  equal(h.root.commitKeyedRegionDelta("parent", "rows", []), true, "plain direct bindings regain delta eligibility");
  h.commit(view(true));
  equal(h.root.commitKeyedRegionDelta("parent", "rows", []), false, "incremental direct metadata changes retain the guard");
  h.commit(view(false));
  const writes = h.host.writeCount;
  equal(h.root.commitKeyedRegionDelta("parent", "rows", [{type:"insert",key:"invalid",beforeKey:null,tree:jsx("i",{key:"invalid",style:{opacity:{...bind(source),bindingId:3}}})}]), false, "candidate metadata is rejected before mutation even if malformed");
  equal(h.host.writeCount, writes, "invalid candidate wrote no host props");
  h.root.dispose();
});

Deno.test("indexed direct region updates attach introduced bindings and detach removed style writers", () => {
  const h = harness("delta", true);
  const source = new ScalarSource(778, 1);
  h.commit(jsx("main", {}, jsx("i", {key:"target",style:{color:"navy"}}), jsx("aside",{key:"sibling"})));
  const target = h.container.children[0].children[0];
  const sibling = h.container.children[0].children[1];
  equal(h.root.commitKeyedRegion("target", jsx("i", {key:"target",style:{color:"navy",opacity:bind(source)}})), true, "indexed region accepts a newly bound style");
  equal(h.root.hasBoundSource(source), true, "new writer is indexed");
  h.root.setSource(source, 2);
  equal(target.props.style, {color:"navy",opacity:2}, "new direct writer updates target");
  equal(h.container.children[0].children[1] === sibling, true, "sibling identity remains");
  equal(h.root.commitKeyedRegions([{key:"target",tree:jsx("i",{key:"target",style:{color:"red"}})}]), true, "batched region removes bound property");
  equal(h.root.hasBoundSource(source), false, "removed writer is detached");
  equal(target.props.style, {color:"red"}, "removed style value disappears");
  h.root.dispose();
});

Deno.test("mode and graph transitions rebuild before plain delta maintenance resumes", () => {
  const samples: Array<Record<string, number>> = [];
  const root = harness("delta", true, samples);
  const source = new ScalarSource(30, 2);
  const graph = {
    sourceCount: 0,
    sourcePaths: [],
    sourceBindingOffsets: [0],
    bindingIds: [],
  } as const;
  const bound = () => jsx("i", { key: "bound", "data-value": bind(source) });

  root.commit(bound());
  root.root.commit(jsx("section", { key: "plain" }), null, false);
  equal(
    root.root.hasBoundSource(source),
    false,
    "false direct mode detaches source",
  );
  equal(
    samples.some((sample) =>
      "vdom.binding-index.full-rebuild-visits" in sample
    ),
    true,
    "direct-write mode change uses rebuild fallback",
  );

  samples.length = 0;
  root.root.commit(jsx("section", { key: "compiled-mode" }), graph, false);
  equal(
    samples.some((sample) =>
      "vdom.binding-index.full-rebuild-visits" in sample
    ),
    true,
    "compiled graph transition uses rebuild fallback",
  );
  root.root.commit(jsx("section", { key: "plain-again" }), null, true);

  samples.length = 0;
  root.commit(bound());
  equal(
    root.root.hasBoundSource(source),
    true,
    "plain binding reattaches after graph removal",
  );
  equal(
    bindingTotals(samples),
    {
      "vdom.binding-index.incremental-group-detaches": 0,
      "vdom.binding-index.incremental-group-attaches": 1,
    },
    "delta maintenance resumes after graph removal",
  );
  root.commit(jsx("section", { key: "removed" }));
  equal(
    root.root.hasBoundSource(source),
    false,
    "resumed delta removal detaches source",
  );
  root.root.dispose();
});
