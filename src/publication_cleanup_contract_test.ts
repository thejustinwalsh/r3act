import { ComponentStateRoot } from "./component_state_runtime.ts";
import { jsx } from "./jsx_binding_runtime.ts";
import { NativeRootWorkQueue } from "./native_root_work_queue.ts";
import { type MemoryNode, MemoryVDOMHost } from "./vdom_snapshot_runtime.ts";

const assert = (condition: unknown, message: string) => {
  if (!condition) throw new Error(message);
};
const errorMessages = (error: unknown): string[] => {
  if (error instanceof AggregateError) {
    return [error.message, ...error.errors.flatMap(errorMessages)];
  }
  return [error instanceof Error ? error.message : String(error)];
};

Deno.test("candidate host failure retains original error and deferred disposal errors", () => {
  let root!: ComponentStateRoot<MemoryNode, MemoryNode>;
  let armed = false;
  let disposeAttempts = 0;
  const host = new class extends MemoryVDOMHost {
    override setProp(
      node: MemoryNode,
      name: string,
      value: unknown,
      previous?: unknown,
    ) {
      if (armed && name === "data-value") {
        armed = false;
        root.dispose();
        super.setProp(node, name, value, previous);
        throw new Error("primary host failure");
      }
      super.setProp(node, name, value, previous);
    }
    dispose(_node: MemoryNode) {
      disposeAttempts++;
      throw new Error(`dispose failure ${disposeAttempts}`);
    }
  }();
  root = new ComponentStateRoot(host, host.createContainer(), {
    rootId: "cleanup-contract-single",
    scheduleCommit() {},
  });
  root.mount(jsx("section", { "data-value": "old" }, [
    jsx("i", {}), jsx("b", {}),
  ]));
  const candidate = root.prepare(jsx("section", { "data-value": "new" }, [
    jsx("i", {}), jsx("b", {}),
  ]), { renderPreparation: "repeatable" });
  armed = true;
  let failure: unknown;
  try {
    candidate.commitHost();
  } catch (error) {
    failure = error;
  }
  const messages = errorMessages(failure);
  assert(messages.includes("primary host failure"), "original host error was masked");
  assert(
    messages.some((message) => message.includes("dispose failure")),
    "deferred disposal error was lost",
  );
  assert(disposeAttempts === 3, "disposal stopped after the first failing node");
  assert(root.diagnostics().disposed, "deferred root disposal did not complete");
});

Deno.test("group failure continues cleanup after another member cleanup throws", () => {
  let first!: ComponentStateRoot<MemoryNode, MemoryNode>;
  let second!: ComponentStateRoot<MemoryNode, MemoryNode>;
  let armed = false;
  let firstDisposals = 0;
  let secondDisposals = 0;
  const firstHost = new class extends MemoryVDOMHost {
    dispose(_node: MemoryNode) {
      firstDisposals++;
      throw new Error("first cleanup failure");
    }
  }();
  const secondHost = new class extends MemoryVDOMHost {
    override setProp(
      node: MemoryNode,
      name: string,
      value: unknown,
      previous?: unknown,
    ) {
      if (armed && name === "data-value") {
        armed = false;
        first.dispose();
        second.dispose();
        super.setProp(node, name, value, previous);
        throw new Error("second host failure");
      }
      super.setProp(node, name, value, previous);
    }
    dispose(_node: MemoryNode) {
      secondDisposals++;
      throw new Error("second cleanup failure");
    }
  }();
  first = new ComponentStateRoot(firstHost, firstHost.createContainer(), {
    rootId: "cleanup-contract-first",
    scheduleCommit() {},
  });
  second = new ComponentStateRoot(secondHost, secondHost.createContainer(), {
    rootId: "cleanup-contract-second",
    scheduleCommit() {},
  });
  first.mount(jsx("output", { "data-value": "old" }));
  second.mount(jsx("output", { "data-value": "old" }));
  const queue = new NativeRootWorkQueue();
  armed = true;
  const handle = queue.enqueue({ renderPreparation: "repeatable",
    id: "cleanup-contract-group",
    roots: [
      { root: first, tree: jsx("output", { "data-value": "new" }) },
      { root: second, tree: jsx("output", { "data-value": "new" }) },
    ],
  });
  assert(handle.status === "failed", "group failure did not settle");
  const messages = errorMessages(handle.resolution?.error);
  assert(messages.includes("second host failure"), "group lost host failure");
  assert(
    messages.includes("first cleanup failure"),
    "group lost earlier member cleanup failure",
  );
  assert(
    messages.includes("second cleanup failure"),
    "group lost later member cleanup failure",
  );
  assert(firstDisposals === 1, "first member cleanup was skipped");
  assert(secondDisposals === 1, "second member cleanup was skipped");
  assert(first.diagnostics().disposed, "first root teardown did not complete");
  assert(second.diagnostics().disposed, "second root teardown did not complete");
  queue.dispose();
});
