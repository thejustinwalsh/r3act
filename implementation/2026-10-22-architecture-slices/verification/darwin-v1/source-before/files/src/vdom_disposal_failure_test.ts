import { bind, jsx, ScalarSource } from "./jsx_binding_runtime.ts";
import {
  type MemoryNode,
  MemoryVDOMHost,
  VDOMSnapshotRoot,
} from "./vdom_snapshot_runtime.ts";

const assert = (condition: unknown, message: string) => {
  if (!condition) throw new Error(message);
};

Deno.test("VDOM disposal releases ownership despite listener and removal failures", () => {
  const listenerError = new Error("listener cleanup failed");
  const removalError = new Error("first removal failed");
  const listenerAttempts: string[] = [];
  const removalAttempts: string[] = [];
  class FailingHost extends MemoryVDOMHost {
    override setProp(node: MemoryNode, name: string, value: unknown) {
      if (value === undefined && /^on[A-Z]/.test(name)) {
        listenerAttempts.push(`${node.tag}:${name}`);
        if (node.tag === "button" && name === "onClick") {
          throw listenerError;
        }
      }
      super.setProp(node, name, value);
    }

    override remove(parent: MemoryNode, node: MemoryNode) {
      removalAttempts.push(node.tag ?? "text");
      if (node.tag === "article") throw removalError;
      super.remove(parent, node);
    }
  }

  const host = new FailingHost();
  const container = host.createContainer();
  const root = new VDOMSnapshotRoot(host, container);
  const source = new ScalarSource(0, 3);
  root.commit([
    jsx("article", { onClick: () => {}, value: bind(source) }, [
      jsx("button", { onClick: () => {}, onFocus: () => {} }),
    ]),
    jsx("aside", { onClick: () => {} }),
  ]);
  assert(
    root.snapshot.length === 2,
    "Expected mounted snapshot before disposal",
  );
  assert(
    root.diagnostics().scalarBindingGroups === 1,
    "Expected binding ownership before disposal",
  );

  let caught: unknown;
  try {
    root.dispose();
  } catch (error) {
    caught = error;
  }

  assert(
    caught instanceof AggregateError,
    "Disposal should aggregate host errors",
  );
  const aggregate = caught as AggregateError;
  assert(
    aggregate.errors.length === 2,
    "Both original host errors should be reported",
  );
  assert(
    aggregate.errors[0] === listenerError,
    "Listener error identity should be preserved",
  );
  assert(
    aggregate.errors[1] === removalError,
    "Removal error identity should be preserved",
  );
  assert(
    listenerAttempts.join(",") ===
      "article:onClick,button:onClick,button:onFocus,aside:onClick",
    "Listener cleanup should continue through descendants and later top-level nodes",
  );
  assert(
    removalAttempts.join(",") === "article,aside",
    "Removal should be attempted for every top-level node",
  );
  assert(
    root.diagnostics().mountedNodes === 0,
    "Mounted nodes should be released",
  );
  assert(
    root.diagnostics().scalarBindingGroups === 0,
    "Scalar bindings should be released",
  );
  assert(root.snapshot.length === 0, "Snapshot should be cleared");

  root.dispose();
  assert(
    listenerAttempts.length === 4,
    "Repeated disposal must not retry listeners",
  );
  assert(
    removalAttempts.length === 2,
    "Repeated disposal must not retry removals",
  );
});
