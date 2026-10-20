import {
  bind,
  bindCompiledColumn,
  jsx,
  NumericColumn,
  ScalarSource,
} from "./jsx_binding_runtime.ts";
import {
  DOMVDOMHost,
  type MemoryNode,
  MemoryVDOMHost,
  VDOMSnapshotRoot,
} from "./vdom_snapshot_runtime.ts";
import { ComponentStateRoot } from "./component_state_runtime.ts";

const equal = (actual: unknown, expected: unknown, label: string) => {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(
      `${label}: ${JSON.stringify(actual)} != ${JSON.stringify(expected)}`,
    );
  }
};

Deno.test("inherited DOM preparation declines an overridden established setter", () => {
  class CustomDOMHost extends DOMVDOMHost {
    override setStyleProp(_node: Node, _name: string, _value: unknown) {}
  }
  // Declining must happen before touching DOM globals or the supplied handle.
  equal(new CustomDOMHost().prepareStyleProp(null as unknown as Node, "left"), undefined,
    "subclass setter semantics remain authoritative");
});

Deno.test("throwing writer activation keeps native host-failure policy and permits disposal", () => {
  const sentinel = new Error("style activation failed");
  class FailingHost extends MemoryVDOMHost {
    prepareStyleProp(_node: MemoryNode, _name: string): undefined {
      throw sentinel;
    }
  }
  const host = new FailingHost();
  const container = host.createContainer();
  const root = new ComponentStateRoot(host, container, { scheduleCommit() {} });
  let thrown: unknown;
  try {
    root.mount(jsx("i", { style: { width: bind(new ScalarSource(99, 1)) } }));
  } catch (error) {
    thrown = error;
  }
  equal(thrown === sentinel, true, "host activation error reaches caller");
  let retryRejected = false;
  try {
    root.flush();
  } catch {
    retryRejected = true;
  }
  equal(retryRejected, true, "native root rejects publication after a host failure");
  root.dispose();
  equal(container.children.length, 0, "disposal removes partially mounted host nodes");
  equal(root.diagnostics().ownerCount, 0, "disposal releases native owners");
});

const numeric = <T>(binding: T, sinkId: string) =>
  Object.assign(binding as object, {
    numericProgram: {
      schemaVersion: 1 as const,
      sinkId,
      sourceSites: ["value"],
    },
  }) as T;

class PreparedHost extends MemoryVDOMHost {
  prepared: Array<{ node: MemoryNode; name: string }> = [];
  writes: Array<[MemoryNode, string, unknown, unknown]> = [];
  decline = false;
  fail = false;

  prepareStyleProp(node: MemoryNode, name: string) {
    this.prepared.push({ node, name });
    if (this.decline) return undefined;
    return (next: unknown, previous: unknown) => {
      this.writes.push([node, name, next, previous]);
      if (this.fail) throw new Error("prepared style writer failed");
      const style = { ...(node.props.style as Record<string, unknown> ?? {}) };
      if (next == null) delete style[name];
      else style[name] = next;
      node.props.style = style;
    };
  }
}

Deno.test("prepared style writers activate once and survive retained refreshes and keyed moves", () => {
  const a = new ScalarSource(1, 1), b = new ScalarSource(2, 2), c = new ScalarSource(3, 3);
  const host = new PreparedHost(), container = host.createContainer();
  const root = new VDOMSnapshotRoot(host, container);
  const tree = (items: Array<{ key: string; source: ScalarSource }>) =>
    jsx("section", {}, items.map(({ key, source }) =>
      jsx("i", {
        key,
        "data-key": key,
        style: { width: numeric(bind(source, (value) => `${value}px`), `width-${key}`) },
      })
    ));

  root.commit(tree([{ key: "a", source: a }, { key: "b", source: b }]), null, true);
  const first = container.children[0].children[0];
  const second = container.children[0].children[1];
  equal(host.prepared.map(({ name }) => name), ["width", "width"], "activation prepares each style group");
  equal(first.props.style, { width: "1px" }, "initial first style");
  equal(second.props.style, { width: "2px" }, "initial second style");

  root.commit(tree([{ key: "b", source: b }, { key: "a", source: a }]), null, true);
  equal(container.children[0].children.map((node) => node.props["data-key"]), ["b", "a"], "keyed move reorders retained handles");
  equal(container.children[0].children[0] === second && container.children[0].children[1] === first, true, "keyed move retains both handles");
  equal(host.prepared.length, 2, "same-membership refresh and move reuse prepared writers");
  root.executeSourceProgram([a], [4], 1);
  equal(first.props.style, { width: "4px" }, "sparse numeric cut uses the prepared writer");
  root.executeSourceProgram([a, b], [5, 6], 2);
  equal(first.props.style, { width: "5px" }, "dense cut updates first retained writer");
  equal(second.props.style, { width: "6px" }, "dense cut updates second retained writer");

  root.commit(tree([{ key: "b", source: b }, { key: "a", source: c }]), null, true);
  equal(host.prepared.length, 3, "source replacement activates a fresh writer");
  let oldSourceRejected = false;
  try {
    root.setSource(a, 9);
  } catch {
    oldSourceRejected = true;
  }
  equal(oldSourceRejected, true, "old source loses its writer membership");
  equal(first.props.style, { width: "3px" }, "detached source no longer writes replaced group");
  root.setSource(c, 7);
  equal(first.props.style, { width: "7px" }, "replacement source reaches newly activated writer");

  root.commit(tree([{ key: "a", source: c }]), null, true);
  let removedSourceRejected = false;
  try {
    root.setSource(b, 10);
  } catch {
    removedSourceRejected = true;
  }
  equal(removedSourceRejected, true, "removed row source is unbound");
  equal(second.parent, null, "removed keyed host is detached");
  equal(root.hasBoundSource(b), false, "removed writer is released from its source index");
  root.dispose();
});

Deno.test("declined preparation uses the existing style field or aggregate fallback", () => {
  const source = new ScalarSource(11, 1);
  const fieldHost = new PreparedHost();
  fieldHost.decline = true;
  const fieldContainer = fieldHost.createContainer();
  const fieldRoot = new VDOMSnapshotRoot(fieldHost, fieldContainer);
  fieldRoot.commit(jsx("i", { style: { width: bind(source), color: "red" } }), null, true);
  fieldRoot.setSource(source, 2);
  equal(fieldHost.prepared.length, 1, "declined writer is queried once");
  equal(fieldContainer.children[0].props.style, { width: 2, color: "red" }, "existing setStyleProp capability remains the fallback");
  fieldRoot.dispose();

  const aggregateSource = new ScalarSource(12, 1);
  class AggregateHost extends PreparedHost {
    constructor() {
      super();
      Object.defineProperty(this, "setStyleProp", { value: undefined });
      this.decline = true;
    }
  }
  const aggregateHost = new AggregateHost(), aggregateContainer = aggregateHost.createContainer();
  const aggregateRoot = new VDOMSnapshotRoot(aggregateHost, aggregateContainer);
  aggregateRoot.commit(
    jsx("i", { style: { width: bind(aggregateSource), color: "blue" } }),
    null,
    true,
  );
  equal(aggregateRoot.hasSourceProgram(aggregateSource), false, "no prepared or field writer declines numeric fast path");
  aggregateRoot.setSource(aggregateSource, 3);
  equal(aggregateContainer.children[0].props.style, { width: 3, color: "blue" }, "aggregate style fallback preserves the other fields");
  equal(aggregateHost.prepared.length, 0, "factory alone does not enable per-property splitting");
  aggregateRoot.dispose();
});

Deno.test("prepared writer preserves nested-write guards and propagates host errors", () => {
  const source = new ScalarSource(21, 1);
  let root!: VDOMSnapshotRoot<MemoryNode>;
  let attemptNested = false;
  let nestedError: unknown;
  class GuardHost extends PreparedHost {
    override prepareStyleProp(node: MemoryNode, name: string) {
      this.prepared.push({ node, name });
      return (next: unknown, previous: unknown) => {
        if (attemptNested) {
          attemptNested = false;
          try {
            root.setSource(source, 99);
          } catch (error) {
            nestedError = error;
          }
        }
        if (this.fail) throw new Error("prepared style writer failed");
        const style = { ...(node.props.style as Record<string, unknown> ?? {}) };
        style[name] = next;
        node.props.style = style;
        this.writes.push([node, name, next, previous]);
      };
    }
  }
  const host = new GuardHost(), container = host.createContainer();
  root = new VDOMSnapshotRoot(host, container);
  root.commit(jsx("i", { style: { width: numeric(bind(source), "width") } }), null, true);
  attemptNested = true;
  root.executeSourceProgram([source], [2], 1);
  equal(nestedError instanceof Error && nestedError.message === "Nested numeric VDOM writes are not supported", true, "nested source write remains guarded");
  equal(container.children[0].props.style, { width: 2 }, "outer prepared write completes its captured value");

  host.fail = true;
  let thrown: unknown;
  try {
    root.executeSourceProgram([source], [3], 1);
  } catch (error) {
    thrown = error;
  }
  equal(thrown instanceof Error && thrown.message === "prepared style writer failed", true, "prepared host error propagates");
  equal(container.children[0].props.style, { width: 2 }, "throwing writer does not claim the new host value");
  equal(root.diagnostics().numericProgramScratchRetained, 0, "numeric scratch clears after prepared writer error");
  root.dispose();
});

Deno.test("compiled column style writes use the activated prepared writer", () => {
  const column = new NumericColumn(41, 0, new Float64Array([2]));
  const host = new PreparedHost(), container = host.createContainer();
  const root = new VDOMSnapshotRoot(host, container);
  const graph = {
    sourceCount: 1,
    sourcePaths: ["width"],
    sourceBindingOffsets: [0, 1],
    bindingIds: [41],
  };
  root.commit(
    jsx("i", {
      style: { width: bindCompiledColumn(column, 0, 41, (value) => `${value}px`) },
    }),
    graph,
  );
  equal(host.prepared.length, 1, "compiled style activates one writer");
  column.values[0] = 7;
  root.setColumns([column]);
  equal(container.children[0].props.style, { width: "7px" }, "column batch uses prepared style writer");
  equal(host.writes.at(-1)?.slice(1), ["width", "7px", "2px"], "column writer receives staged previous and next values");
  root.dispose();
});

Deno.test("ref callbacks observe style updates committed before publication", () => {
  const source = new ScalarSource(31, 1);
  const host = new PreparedHost(), container = host.createContainer();
  const root = new VDOMSnapshotRoot(host, container);
  let observed: unknown;
  const firstRef = () => {};
  root.commit(jsx("i", { style: { width: bind(source) }, ref: firstRef }), null, true);
  const node = container.children[0];
  source.value = 8;
  root.commit(
    jsx("i", {
      style: { width: bind(source) },
      ref: (instance: unknown) => {
        if (instance) observed = (instance as MemoryNode).props.style;
      },
    }),
    null,
    true,
  );
  equal(observed, { width: 8 }, "ref publication observes the committed style value");
  equal(host.prepared.length, 1, "retained binding reuses its activated writer");
  root.dispose();
});
